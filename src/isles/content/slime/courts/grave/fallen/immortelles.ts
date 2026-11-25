import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, mulberry, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { graveMound } from '../art';
import { BONE, BONE_DARK, BONE_LIT, CRAPE, CRAPE_LIT, GREY_LIT, LAMP, LILY, MOSS, MOSS_LIT, SLAB_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Everlasting — Ancilla Mourhouse, the immortelle-seller of the Grave Court.
 *
 * Immortelles are the wreaths that never die: porcelain lilies and jet beads wired into a ring and
 * set on a grave under a glass bell-jar, so the flowers outlast the mourners. Ancilla sells them.
 * In the King's telling she sold them to the Prince's tally-men as well: an immortelle hung on a
 * door meant the house had been chosen, and the porcelain lasted longer than the people inside.
 *
 * Five graves in the yard each keep a wreath under glass. Strike a jar and its wreath rises and
 * circles you, a ring of porcelain edges a pace out — it cuts the other fighter whenever it sweeps
 * through them. Wear two at once. A heavy blow taken shatters your newest wreath, and its shards
 * fly outward at your foe — so smashing a wreathed foe up close sprays you. Halfway down Ancilla's
 * wreaths spin faster and their circle breathes in and out. The bot fetches wreaths and closes in
 * to sweep you; the exploit is the same for you: wear two and walk into her.
 */

const ID = fallenId('grave', 'everlasting');
const MAX_WORN = 2;
const ORBIT = 70;
const CUT = 9;
const CUT_EVERY = 600;
const CUT_R = 32;
const HEAVY = 14;
const SHARDS = 8;
const SHARD_DMG = 5;
const FLY_MS = 360;

interface Wreath { born: number; from: Pt; lastCut: number; tint: number }
interface Wearer { f: Fighter; side: 'player' | 'npc'; wreaths: Wreath[]; brokeAt: number }
interface Jar { x: number; y: number; ready: boolean; regrowAt: number; takenAt: number; handle: StrikeTarget; seed: number }
interface Burst { x: number; y: number; at: number; tint: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const pw: Wearer = { f: player, side: 'player', wreaths: [], brokeAt: -9999 };
  const nw: Wearer = { f: npc, side: 'npc', wreaths: [], brokeAt: -9999 };
  const spots: Pt[] = [
    { x: 170, y: top + 110 }, { x: W - 170, y: top + 110 }, { x: W / 2, y: top + 235 },
    { x: 220, y: H - 110 }, { x: W - 220, y: H - 110 },
  ];
  const tints = [LILY, 0xf3e6ee, 0xe8eef2, 0xf4efe0, 0xeef0e4];
  const jars: Jar[] = [];
  const bursts: Burst[] = [];
  let wild = false;
  let started = false;

  const regrowMs = () => (wild ? 6500 : 9000);
  const spinRate = () => (wild ? 3.3 : 2.4);
  const radius = (time: number) => (wild ? ORBIT + Math.sin(time / 520) * 20 : ORBIT);
  const other = (w: Wearer): Wearer => (w === pw ? nw : pw);

  /** Where a worn wreath is now: two share the ring, opposite each other. */
  function wreathAt(w: Wearer, i: number, time: number): Pt {
    const wr = w.wreaths[i];
    const a = (time / 1000) * spinRate() + i * Math.PI + (w === nw ? 0.8 : 0);
    const r = radius(time);
    const to = { x: w.f.x + Math.cos(a) * r, y: w.f.y + Math.sin(a) * r * 0.82 };
    const k = clamp((time - wr.born) / FLY_MS, 0, 1);
    if (k >= 1) return to;
    const e = 1 - (1 - k) * (1 - k);
    return { x: wr.from.x + (to.x - wr.from.x) * e, y: wr.from.y + (to.y - wr.from.y) * e - Math.sin(k * Math.PI) * 40 };
  }

  for (const [i, p] of spots.entries()) {
    const jar: Jar = {
      x: p.x, y: p.y, ready: true, regrowAt: 0, takenAt: -9999, seed: 31 + i * 17,
      handle: ctx.target({
        x: p.x, y: p.y - 22, r: 24, passThrough: true,
        onStruck: (by) => {
          if (!jar.ready) return;
          const w = by === 'player' ? pw : nw;
          if (w.wreaths.length >= MAX_WORN || !alive(w.f)) return;
          const now = ctx.scene.time.now;
          jar.ready = false; jar.takenAt = now; jar.regrowAt = now + regrowMs();
          w.wreaths.push({ born: now, from: { x: jar.x, y: jar.y - 24 }, lastCut: -9999, tint: tints[i] });
          ctx.sfx('crystal-chime');
          ctx.flash(jar.x, jar.y - 24, BONE_LIT);
        },
      }),
    };
    jars.push(jar);
  }

  /** A heavy blow cracks the newest wreath: porcelain flies out from it, at the wearer's foe. */
  function shatter(w: Wearer): void {
    const now = ctx.scene.time.now;
    if (!w.wreaths.length || now - w.brokeAt < 400) return;
    const i = w.wreaths.length - 1;
    const at = wreathAt(w, i, now);
    const tint = w.wreaths[i].tint;
    w.wreaths.pop();
    w.brokeAt = now;
    bursts.push({ x: at.x, y: at.y, at: now, tint });
    const foe = other(w).f;
    const off = Math.atan2(foe.y - at.y, foe.x - at.x);
    for (let s = 0; s < SHARDS; s++) {
      tk.spawnBullet({
        x: at.x, y: at.y, angle: off + (s / SHARDS) * Math.PI * 2, speed: 250, damage: SHARD_DMG,
        lifeMs: 1500, r: 5, color: tint, hits: [foe],
      });
    }
    ctx.sfx('crystal-shatter');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('STRIKE A JAR: ITS WREATH CIRCLES YOU AND CUTS', '#e6dfc8'); }
      if (!wild && npc.hp < npc.maxHp * 0.5) {
        wild = true;
        ctx.banner('THE EVERLASTINGS SPIN WILD', '#f0e6ee');
        ctx.sfx('sparkle');
      }
      for (const j of jars) if (!j.ready && time >= j.regrowAt) { j.ready = true; ctx.sfx('crystal-chime'); }
      for (const w of [pw, nw]) {
        if (!alive(w.f)) { w.wreaths.length = 0; continue; }
        const victim = other(w).f;
        if (!alive(victim) || ctx.isAirborne(victim)) continue;
        for (const [i, wr] of w.wreaths.entries()) {
          if (time - wr.born < FLY_MS || time - wr.lastCut < CUT_EVERY) continue;
          const p = wreathAt(w, i, time);
          if (dist(p.x, p.y, victim.x, victim.y) > CUT_R) continue;
          wr.lastCut = time;
          ctx.hit(victim, CUT, p.x, p.y);
          ctx.sfx('slash');
        }
      }
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 700) bursts.splice(i, 1);
    },

    onPlayerHurt(amount) { if (amount >= HEAVY) shatter(pw); },
    onNpcHurt(amount) { if (amount >= HEAVY) shatter(nw); },

    npcSeek(): Pt | null {
      const now = ctx.scene.time.now;
      if (nw.wreaths.length < MAX_WORN) {
        let best: Jar | null = null, bd = nw.wreaths.length ? 300 : 520;
        for (const j of jars) {
          const d = dist(j.x, j.y, npc.x, npc.y);
          if (j.ready && d < bd) { bd = d; best = j; }
        }
        if (best) return { x: best.x, y: best.y + 14 };
      }
      if (nw.wreaths.length) {
        // Close to the wreath circle, and let the porcelain do the cutting.
        const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.sin(now / 900) * 0.6;
        const r = radius(now) - 6;
        return { x: clamp(player.x + Math.cos(a) * r, 50, W - 50), y: clamp(player.y + Math.sin(a) * r, top + 40, H - 40) };
      }
      if (pw.wreaths.length) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 170, 50, W - 50), y: clamp(player.y + Math.sin(a) * 170, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const j of jars) {
        graveMound(g, j.x, j.y + 22, 86, mulberry(j.seed));
        g.fillStyle(SLAB_DARK, 0.85); g.fillEllipse(j.x, j.y + 2, 46, 14);
      }
      // The wreaths' circle, chalked faintly round each wearer so you can read its reach.
      for (const w of [pw, nw]) {
        if (!w.wreaths.length || !alive(w.f)) continue;
        const r = radius(time);
        g.lineStyle(1.5, w === nw ? LAMP : GREY_LIT, 0.22);
        for (let s = 0; s < 24; s += 2) {
          const a0 = (s / 24) * Math.PI * 2 + time / 2000, a1 = ((s + 1) / 24) * Math.PI * 2 + time / 2000;
          g.lineBetween(w.f.x + Math.cos(a0) * r, w.f.y + Math.sin(a0) * r * 0.82, w.f.x + Math.cos(a1) * r, w.f.y + Math.sin(a1) * r * 0.82);
        }
      }
    },

    drawAir(g, time) {
      for (const j of jars) drawJar(g, j, time, regrowMs());
      for (const w of [pw, nw]) {
        for (const [i, wr] of w.wreaths.entries()) {
          const p = wreathAt(w, i, time);
          g.fillStyle(0x000000, 0.22); g.fillEllipse(p.x + 3, p.y + 16, 30, 8);
          drawWreath(g, p.x, p.y, 15, 1, time / 300 + i, wr.tint);
        }
      }
      for (const b of bursts) {
        const k = (time - b.at) / 700;
        g.lineStyle(3, b.tint, 1 - k); g.strokeCircle(b.x, b.y, 10 + k * 46);
        for (let s = 0; s < 10; s++) {
          const a = s * 0.63 + b.x;
          const px = b.x + Math.cos(a) * k * 60, py = b.y + Math.sin(a) * k * 40 + k * k * 30;
          g.fillStyle(s % 3 ? b.tint : CRAPE, 1 - k);
          g.fillTriangle(px, py - 3, px + 3, py + 2, px - 3, py + 2);
        }
      }
    },

    drawHud(g, time) {
      const y = top + 16;
      const plate = (x: number, w: Wearer, col: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 13, 92, 26, 7);
        g.fillStyle(col, 1); g.fillCircle(x, y, 5);
        for (let i = 0; i < MAX_WORN; i++) {
          if (i < w.wreaths.length) drawWreath(g, x + 26 + i * 28, y, 8, 1, time / 400 + i, w.wreaths[i].tint);
          else { g.lineStyle(1.5, 0x6a6470, 0.8); g.strokeCircle(x + 26 + i * 28, y, 8); }
        }
      };
      plate(W / 2 - 110, pw, GREY_LIT);
      plate(W / 2 + 28, nw, LAMP);
    },

    destroy() { for (const j of jars) j.handle.remove(); },
  };
}

/**
 * A porcelain immortelle: a ring of wired lilies and roses in glazed white, grey-green porcelain
 * leaves between them, a string of jet beads round the inside, and a crape bow at the foot.
 */
function drawWreath(g: G, x: number, y: number, r: number, a: number, spin: number, tint: number): void {
  g.lineStyle(r * 0.5, dim(MOSS, 0.2), a); g.strokeCircle(x, y, r);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const ang = spin + (i / n) * Math.PI * 2;
    const lx = x + Math.cos(ang + 0.3) * r, ly = y + Math.sin(ang + 0.3) * r;
    g.fillStyle(i % 2 ? MOSS_LIT : mixC(MOSS_LIT, GREY_LIT, 0.5), a);
    g.fillEllipse(lx, ly, r * 0.42, r * 0.22);
  }
  for (let i = 0; i < n; i++) {
    const ang = spin + (i / n) * Math.PI * 2;
    const fx = x + Math.cos(ang) * r, fy = y + Math.sin(ang) * r;
    const ps = r * 0.2;
    if (i % 2) {
      // A five-petalled porcelain rose with a glazed highlight.
      for (let p = 0; p < 5; p++) {
        const pa = ang + (p / 5) * Math.PI * 2;
        g.fillStyle(dim(tint, 0.08), a); g.fillCircle(fx + Math.cos(pa) * ps, fy + Math.sin(pa) * ps, ps * 0.9);
      }
      g.fillStyle(lit(tint, 0.5), a); g.fillCircle(fx - ps * 0.3, fy - ps * 0.3, ps * 0.55);
      g.fillStyle(BONE_DARK, a); g.fillCircle(fx, fy, ps * 0.3);
    } else {
      // A lily trumpet laid along the ring.
      const tx = Math.cos(ang + Math.PI / 2), ty = Math.sin(ang + Math.PI / 2);
      g.fillStyle(tint, a);
      g.fillTriangle(fx - tx * ps * 1.6, fy - ty * ps * 1.6, fx + tx * ps * 1.4 - ty * ps, fy + ty * ps * 1.4 + tx * ps, fx + tx * ps * 1.4 + ty * ps, fy + ty * ps * 1.4 - tx * ps);
      g.fillStyle(LAMP, a); g.fillCircle(fx + tx * ps * 1.2, fy + ty * ps * 1.2, ps * 0.25);
    }
  }
  // Jet beads round the inside.
  for (let i = 0; i < 14; i++) {
    const ang = -spin * 0.5 + (i / 14) * Math.PI * 2;
    g.fillStyle(CRAPE, a); g.fillCircle(x + Math.cos(ang) * r * 0.62, y + Math.sin(ang) * r * 0.62, Math.max(1, r * 0.09));
    g.fillStyle(CRAPE_LIT, a * 0.8); g.fillCircle(x + Math.cos(ang) * r * 0.62 - 0.5, y + Math.sin(ang) * r * 0.62 - 0.5, Math.max(0.5, r * 0.04));
  }
  // The crape bow, tails hanging.
  const by = y + r * 1.05;
  g.fillStyle(CRAPE, a);
  g.fillTriangle(x, by, x - r * 0.4, by - r * 0.22, x - r * 0.4, by + r * 0.22);
  g.fillTriangle(x, by, x + r * 0.4, by - r * 0.22, x + r * 0.4, by + r * 0.22);
  g.fillRect(x - r * 0.22, by, r * 0.12, r * 0.5); g.fillRect(x + r * 0.1, by, r * 0.12, r * 0.42);
}

/**
 * The bell-jar on its grave: a glass dome on a little slate plinth with a wreath inside. Taken, the
 * dome stands empty with a pale ghost of the next wreath glazing back in as it regrows.
 */
function drawJar(g: G, j: Jar, time: number, regrowMs: number): void {
  const x = j.x, y = j.y;
  shadow(g, x + 4, y + 2, 52, 12, 0.3);
  // Slate plinth, its edge chamfered.
  g.fillStyle(SLAB_DARK, 1); g.fillRect(x - 24, y - 8, 48, 10);
  g.fillStyle(dim(SLAB_DARK, 0.3), 1); g.fillRect(x - 24, y, 48, 3);
  g.fillStyle(lit(SLAB_DARK, 0.3), 1); g.fillRect(x - 24, y - 8, 48, 2);
  const k = j.ready ? 1 : clamp(1 - (j.regrowAt - time) / regrowMs, 0, 1);
  if (j.ready) drawWreath(g, x, y - 24, 14, 1, Math.sin(time / 1800 + j.seed) * 0.2, BONE);
  else drawWreath(g, x, y - 24, 14, 0.12 + k * 0.35, 0, BONE);
  // The dome: a pale outline, a long highlight, a knob.
  const lift = j.ready ? 0 : clamp((time - j.takenAt) / 300, 0, 1) * 6;
  g.fillStyle(0xdfeef2, 0.12); g.fillEllipse(x, y - 28 - lift, 44, 50); g.fillRect(x - 22, y - 28 - lift, 44, 22);
  g.lineStyle(1.6, 0xeaf6fa, 0.6);
  g.beginPath(); g.arc(x, y - 30 - lift, 22, Math.PI, 0); g.strokePath();
  g.lineBetween(x - 22, y - 30 - lift, x - 22, y - 7 - lift); g.lineBetween(x + 22, y - 30 - lift, x + 22, y - 7 - lift);
  g.lineStyle(3, 0xffffff, 0.35); g.beginPath(); g.arc(x, y - 30 - lift, 16, Math.PI * 1.1, Math.PI * 1.45); g.strokePath();
  g.fillStyle(BONE_DARK, 1); g.fillCircle(x, y - 53 - lift, 3);
  if (j.ready) glow(g, x, y - 24, 30, LILY, 0.04 + Math.sin(time / 400 + j.seed) * 0.02, 3);
}

export const FALLEN_EVERLASTING: GimmickDef = {
  id: ID,
  rules: 'Strike a bell-jar and its porcelain wreath circles you, cutting your foe as it sweeps. A heavy blow shatters your newest one: shards fly at your foe.',
  make,
};
