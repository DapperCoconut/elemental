import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { windsock, windStreak } from '../art';
import { CANVAS, CANVAS_SHADE, FLAG_DARK, ROPE, ROPE_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Loose Canvas — Dorcas Whipple, Sailmaker of Mill Row.
 *
 * Every mill in Galeward wears its canvas on lattice sails, and the cloths are cut and sewn in the
 * sail loft below the Millstone. In the star's telling Dorcas cut more than canvas: when the
 * collectors emptied a balloon for unpaid air, it was her shears that made its silk into sails
 * for the Prince's mills, and she sewed them in the debtor's own yard so he could watch.
 *
 * Her yard is a drying ground: four new sails stand on frames, stretched tight and facing the
 * wind. A sail stops every shot — both sides' — so the yard is a field of cover. Then a gust comes
 * in off the west (the windsocks stand out first, then the front runs across the floor), and as it
 * reaches each sail the lashings give and the canvas flies east down its own row, wrapping the
 * first fighter it meets (held, and hurt). A dash goes through it. Dorcas sews a new one on.
 *
 * The exploit is the lashings: strike one and its sail casts off at once. Stand behind a sail
 * with her in its row and cut it loose at her. Halfway down she goes to bare poles — the gusts
 * come quicker and harder, and she sews twice as fast.
 */

const ID = fallenId('galeward', 'sails');
const SH = 56;
const WARN_MS = 1050;
const FRONT_V = 250;
const FRONT_V_BARE = 320;
const FLY_V = 300;
const GUST_EVERY = 6200;
const GUST_EVERY_BARE = 4300;
const REHANG_MS = 5200;
const REHANG_BARE_MS = 2800;
const CAST_MS = 330;
const WRAP_MS = 1000;

interface Sail { x: number; y: number; hung: boolean; castAt: number; downAt: number; lash: StrikeTarget | null }
interface Flyer { x: number; y: number; born: number; hit: boolean }
interface Wrap { f: Fighter; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fy = (k: number) => top + (H - top) * k;
  const sails: Sail[] = [
    { x: W * 0.27, y: fy(0.28) }, { x: W * 0.4, y: fy(0.74) }, { x: W * 0.58, y: fy(0.3) }, { x: W * 0.71, y: fy(0.72) },
  ].map((p) => ({ ...p, hung: true, castAt: -1, downAt: -1e9, lash: null }));
  const flyers: Flyer[] = [];
  const wraps: Wrap[] = [];
  let warnAt = -1, frontAt = -1, frontX = -1, nextGust = 0, started = false, bare = false;
  let lastBlockSfx = 0;

  const inRow = (s: { y: number }, f: Fighter) => Math.abs(f.y - s.y) < SH * 0.9 + 16;
  const ahead = (s: Sail) => s.hung && (warnAt >= 0 || (frontAt >= 0 && frontX < s.x));

  function castOff(s: Sail, time: number): void {
    if (!s.hung) return;
    s.hung = false; s.castAt = -1; s.downAt = time;
    flyers.push({ x: s.x, y: s.y, born: time, hit: false });
    ctx.sfx('wings');
  }

  for (const s of sails) {
    s.lash = ctx.target({
      x: s.x, y: s.y - SH - 4, r: 20,
      onStruck() { if (s.hung && s.castAt < 0) { s.castAt = tk.now + CAST_MS; ctx.sfx('slash'); } },
    });
  }

  function wrap(f: Fighter, fl: Flyer, time: number): void {
    fl.hit = true;
    if (ctx.dashing(f)) { ctx.sfx('whoosh'); return; }
    if (f === player) tk.hitPlayer(9, f.x, f.y); else ctx.hit(npc, 14, f.x, f.y);
    ctx.root(f, WRAP_MS);
    wraps.push({ f, at: time });
    ctx.sfx('whip');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextGust = time + 3600; }
      if (!bare && npc.hp < npc.maxHp * 0.5) { bare = true; ctx.banner('BARE POLES', '#f1e8d2'); ctx.sfx('gust'); }

      // The gust: windsocks first, then the front across the floor.
      if (warnAt < 0 && frontAt < 0 && time >= nextGust) { warnAt = time; ctx.sfx('gust'); }
      if (warnAt >= 0 && time >= warnAt + tk.warn(WARN_MS)) { warnAt = -1; frontAt = time; frontX = 0; }
      if (frontAt >= 0) {
        frontX += (bare ? FRONT_V_BARE : FRONT_V) * dt;
        for (const s of sails) if (s.hung && frontX >= s.x) castOff(s, time);
        if (frontX > W + 40) { frontAt = -1; nextGust = time + (bare ? GUST_EVERY_BARE : GUST_EVERY); }
      }
      for (const s of sails) {
        if (s.hung && s.castAt >= 0 && time >= s.castAt) castOff(s, time);
        if (!s.hung && time - s.downAt > (bare ? REHANG_BARE_MS : REHANG_MS)) { s.hung = true; ctx.sfx('trap-set'); }
        s.lash?.moveTo(s.x, s.hung ? s.y - SH - 4 : -200);
      }

      // Flying canvas down its row; the first fighter it reaches is wrapped.
      for (const fl of flyers) {
        fl.x += FLY_V * dt;
        if (fl.hit) continue;
        for (const f of [player, npc]) {
          if (fl.hit || !alive(f) || !inRow(fl, f) || f.x < fl.x - 8 || f.x > fl.x + 24) continue;
          wrap(f, fl, time);
        }
      }
      for (let i = flyers.length - 1; i >= 0; i--) if (flyers[i].x > W + 60 || (flyers[i].hit && time - flyers[i].born > 4000)) flyers.splice(i, 1);
      for (let i = wraps.length - 1; i >= 0; i--) if (time - wraps[i].at > WRAP_MS) wraps.splice(i, 1);

      // Hung canvas stops shots on either side.
      for (const s of sails) {
        if (!s.hung) continue;
        for (const sh of ctx.shotsNear(s.x, s.y, SH + 14)) {
          if (Math.abs(sh.x - s.x) > 14 || Math.abs(sh.y - s.y) > SH) continue;
          sh.block();
          if (time - lastBlockSfx > 260) { lastBlockSfx = time; ctx.sfx('hit-light'); }
        }
      }
    },

    npcSeek(): Pt | null {
      if (!alive(npc) || !alive(player)) return null;
      // Out of any row the wind will clear — a flying sail's, or a hung sail's ahead of the front.
      for (const fl of flyers) if (!fl.hit && inRow(fl, npc) && npc.x > fl.x) return { x: npc.x, y: tk.clampY(fl.y + (npc.y < fl.y ? -1 : 1) * (SH + 60)) };
      for (const s of sails) {
        if (ahead(s) && inRow(s, npc) && npc.x > s.x) return { x: npc.x, y: tk.clampY(s.y + (npc.y < s.y ? -1 : 1) * (SH + 60)) };
      }
      // Otherwise behind a hung sail with you in its row — to cut it loose at you.
      for (const s of sails) {
        if (s.hung && inRow(s, player) && player.x > s.x + 40) return { x: tk.clampX(s.x - 40), y: s.y - SH + 6 };
      }
      return null;
    },

    drawGround(g, time) {
      // The drying ground's pegged-out lines, and each sail's row east of it, lit while the gust is coming.
      for (const s of sails) {
        g.lineStyle(1, FLAG_DARK, 0.35);
        g.lineBetween(s.x - 60, s.y - SH - 8, s.x - 90, s.y - SH - 30); g.lineBetween(s.x - 60, s.y + SH + 8, s.x - 90, s.y + SH + 30);
        if (!ahead(s) && !(s.hung && s.castAt >= 0)) continue;
        const k = s.castAt >= 0 ? 1 : warnAt >= 0 ? clamp((time - warnAt) / WARN_MS, 0, 1) * 0.7 : 0.8 + (s.x - frontX < 200 ? 0.2 : 0);
        g.fillStyle(CANVAS, 0.06 + k * 0.12); g.fillRect(s.x + 10, s.y - SH, W - s.x, SH * 2);
        for (let x = s.x + 30 + ((time / 3) % 60); x < W; x += 60) {
          g.lineStyle(2, CANVAS, 0.15 + k * 0.3);
          g.lineBetween(x - 10, s.y - 12, x, s.y); g.lineBetween(x - 10, s.y + 12, x, s.y);
        }
      }
      // The gust front running across the floor.
      if (frontAt >= 0) {
        for (let y = top; y < H; y += 26) windStreak(g, frontX - 20 + Math.sin(y * 0.07) * 10, y, 60, 0.6, 1);
        g.fillStyle(0xffffff, 0.08); g.fillRect(frontX - 60, top, 60, H - top);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      const strength = frontAt >= 0 ? 1 : warnAt >= 0 ? 0.85 : 0.25;
      for (const [x, y] of [[26, top + 70], [26, H - 30]] as [number, number][]) windsock(g, x, y, t, strength, 0);
      for (const s of sails) drawFrame(g, s, time, strength, bare ? REHANG_BARE_MS : REHANG_MS);
      for (const fl of flyers) if (!fl.hit) drawFlyer(g, fl, time);
      for (const w of wraps) drawWrap(g, w.f.x, w.f.y, (time - w.at) / WRAP_MS);
    },

    drawHud(g, time) {
      const x = 30, y = top + 28;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 12, y - 16, 128, 34, 8);
      sails.forEach((s, i) => {
        const sx = x + i * 26;
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(sx, y - 11, 2, 22);
        if (s.hung) { g.fillStyle(s.castAt >= 0 ? 0xe8642a : CANVAS, 1); g.fillRect(sx + 3, y - 9, 12, 18); }
        else {
          const k = clamp((time - s.downAt) / (bare ? REHANG_BARE_MS : REHANG_MS), 0, 1);
          g.fillStyle(CANVAS_SHADE, 0.8); g.fillRect(sx + 3, y - 9, 12, 18 * k);
        }
      });
      if (warnAt >= 0 && Math.floor(time / 120) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.9); g.strokeRoundedRect(x - 12, y - 16, 128, 34, 8); }
    },

    destroy() { for (const s of sails) s.lash?.remove(); },
  };
}

/** A sail frame: two posts and a yard, canvas stretched in seamed cloths, bellying east as the wind rises. */
function drawFrame(g: G, s: Sail, time: number, strength: number, rehangMs: number): void {
  const { x, y } = s;
  shadow(g, x + 6, y + SH + 4, 40, 10, 0.25);
  for (const py of [y - SH - 6, y + SH + 6]) {
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, py - 30, 8, 34);
    g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 4, py - 30, 2, 34);
  }
  g.fillStyle(TIMBER, 1); g.fillRect(x - 2, y - SH - 34, 5, SH * 2 + 6);
  const sewn = s.hung ? 1 : clamp((time - s.downAt) / rehangMs, 0, 1);
  if (!s.hung && sewn < 0.05) return;
  const h = SH * 2 * (s.hung ? 1 : sewn);
  const belly = s.hung ? (4 + strength * 18) * (s.castAt >= 0 ? 1.4 : 1) + Math.sin(time / 120 + x) * strength * 3 : 0;
  const yTop = y - SH - 28;
  // Four cloths, each a strip from the stile out to the belly and back.
  for (let c = 0; c < 4; c++) {
    const a = yTop + (h / 4) * c, b = yTop + (h / 4) * (c + 1);
    const m = (k: number) => Math.sin(((k - yTop) / Math.max(1, SH * 2)) * Math.PI) * belly;
    const pts = [{ x: x + 3, y: a }, { x: x + 3 + m(a) + 10, y: a }, { x: x + 3 + m(b) + 10, y: b }, { x: x + 3, y: b }];
    g.fillStyle(c % 2 ? CANVAS_SHADE : CANVAS, s.hung ? 1 : 0.6); g.fillPoints(pts, true);
    g.lineStyle(1, dim(CANVAS, 0.3), 0.7); g.lineBetween(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    // Reef points: little ties on each cloth.
    g.fillStyle(ROPE_DARK, 1); g.fillCircle(x + 8, (a + b) / 2, 1.5);
  }
  if (!s.hung) {
    // The needle, going down the last seam.
    const ny = yTop + h;
    g.lineStyle(1, 0xd8dde6, 1); g.lineBetween(x + 6, ny, x + 14, ny - 6);
    g.lineStyle(1, ROPE, 0.8); g.lineBetween(x + 14, ny - 6, x + 22, ny - 14 + Math.sin(time / 80) * 4);
    return;
  }
  // The lashing at the head of the yard — sawn through when struck.
  const lx = x, ly = y - SH - 32;
  g.lineStyle(2, s.castAt >= 0 ? 0xe8642a : ROPE, 1);
  for (let i = 0; i < 3; i++) g.strokeEllipse(lx + 1, ly + i * 3, 10, 4);
  g.fillStyle(lit(ROPE, 0.2), 1); g.fillCircle(lx + 6, ly + 7, 2);
}

/** A sail torn free: a billowing sheet streaming east, its lashings trailing behind. */
function drawFlyer(g: G, fl: Flyer, time: number): void {
  const flap = Math.sin(time / 50 + fl.y) * 8;
  const bulge = 26 + Math.sin(time / 90) * 6;
  const pts = [
    { x: fl.x - 6, y: fl.y - SH + flap * 0.3 }, { x: fl.x + bulge * 0.6, y: fl.y - SH * 0.5 }, { x: fl.x + bulge, y: fl.y },
    { x: fl.x + bulge * 0.6, y: fl.y + SH * 0.5 }, { x: fl.x - 6, y: fl.y + SH - flap * 0.3 }, { x: fl.x + 6, y: fl.y },
  ];
  g.fillStyle(0x000000, 0.14); g.fillEllipse(fl.x + 16, fl.y + SH + 10, 40, 10);
  g.fillStyle(CANVAS_SHADE, 1); g.fillPoints(pts, true);
  g.fillStyle(CANVAS, 1); g.fillPoints(pts.map((p) => ({ x: p.x - 4, y: p.y })), true);
  g.lineStyle(1, dim(CANVAS, 0.35), 0.8);
  for (let i = -1; i <= 1; i++) g.lineBetween(fl.x - 2, fl.y + i * SH * 0.45, fl.x + bulge - 6, fl.y + i * SH * 0.3);
  g.lineStyle(1.5, ROPE, 1);
  g.lineBetween(pts[0].x, pts[0].y, pts[0].x - 30, pts[0].y - 6 + flap); g.lineBetween(pts[4].x, pts[4].y, pts[4].x - 30, pts[4].y + 6 - flap);
}

/** Canvas swaddled round a held fighter, two turns of its lashing over it, loosening as they work free. */
function drawWrap(g: G, x: number, y: number, k: number): void {
  const a = 1 - k * 0.6;
  g.fillStyle(CANVAS_SHADE, a); g.fillEllipse(x, y - 14, 46, 52);
  g.fillStyle(CANVAS, a); g.fillEllipse(x - 3, y - 17, 38, 44);
  g.lineStyle(1, dim(CANVAS, 0.3), a);
  for (let i = 0; i < 3; i++) g.lineBetween(x - 18, y - 30 + i * 12, x + 18, y - 24 + i * 12);
  g.lineStyle(2, ROPE_DARK, a); g.strokeEllipse(x, y - 24 + k * 6, 44, 10); g.strokeEllipse(x, y - 6 + k * 6, 46, 10);
}

export const FALLEN_SAILS: GimmickDef = {
  id: ID,
  rules: 'Hung sails stop every shot. Each gust tears them loose to fly east down their row, wrapping whoever they meet. Strike a lashing to loose one at her.',
  make,
};
