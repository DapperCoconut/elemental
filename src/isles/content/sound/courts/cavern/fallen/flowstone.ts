import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FLOW, FLOW_DARK, FLOW_LIT, GLOW, ROCK_DARK, ROCK_DEEP, WET } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Set in Flowstone — Wendeline Gour, Drip-Mason, who in the King's telling "dressed" the doorways
 * of muted households: she led the roof's drip over them until the flowstone grew across and the
 * door was a wall.
 *
 * Two drip-lines — cracks in the roof hung with soda straws — creep across the floor, raining a
 * fine limewater. Stand under one and flowstone lays itself down on you, band by band: each band
 * is armour (you take less) and weight (you walk slower). A blow of seven or more knocks a band
 * off, and bands flake away slowly out of the drip. At the fourth band you are **set**: stunned
 * inside a stalagmite of your own — and the casing can be struck. Whoever breaks a set fighter's
 * casing breaks them with it.
 *
 * So the rule is a trade: wear a band or two for armour against her blows, never the fourth. The
 * exploit is the same casing: walk her through the drip, keep her there, and shatter her. At half
 * health the mason opens the roof wider — the lines creep faster and lay faster.
 */

const ID = fallenId('cavern', 'flowstone');
const LINE_LEN = 250;
const UNDER = 30;
const LAY_S = 0.85;
const FLAKE_S = 6;
const CRACK_AT = 7;
const MAX_BANDS = 4;
const SET_MS = 1700;
const SHATTER_DMG = 22;

/** One crack in the roof and the straws that rain from it; `a`→`b` is where its drip lands. */
interface DripLine { cx: number; cy: number; ang: number; vx: number; vy: number; spin: number; seeds: number[] }

/** A fighter's coat of flowstone: `bands` is fractional while it is being laid. */
interface Coat { bands: number; setUntil: number; casing: StrikeTarget | null; crackedAt: number; shatterAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const lines: DripLine[] = [0, 1].map((i) => ({
    cx: i ? W * 0.68 : W * 0.3,
    cy: top + (H - top) * (i ? 0.62 : 0.38),
    ang: (i ? -0.5 : 0.35) + (rng() - 0.5) * 0.3,
    vx: (i ? -1 : 1) * 30, vy: (i ? 1 : -1) * 18,
    spin: (i ? 1 : -1) * 0.05,
    seeds: Array.from({ length: 9 }, () => rng()),
  }));
  const coats = new Map<Fighter, Coat>([player, npc].map((f) => [f, { bands: 0, setUntil: 0, casing: null, crackedAt: -9999, shatterAt: -9999 }]));
  let started = false;
  let opened = false;
  let selfHit = false;

  const ends = (l: DripLine): [Pt, Pt] => {
    const dx = Math.cos(l.ang) * LINE_LEN / 2, dy = Math.sin(l.ang) * LINE_LEN / 2;
    return [{ x: l.cx - dx, y: l.cy - dy }, { x: l.cx + dx, y: l.cy + dy }];
  };
  const underLine = (f: Fighter): DripLine | null => {
    for (const l of lines) { const [a, b] = ends(l); if (segDist(f.x, f.y, a.x, a.y, b.x, b.y) < UNDER) return l; }
    return null;
  };
  const isSet = (f: Fighter, now: number) => (coats.get(f)?.setUntil ?? 0) > now;
  const foeOf = (f: Fighter): 'player' | 'npc' => (f === player ? 'npc' : 'player');

  function setFast(f: Fighter, now: number): void {
    const c = coats.get(f)!;
    c.setUntil = now + SET_MS;
    ctx.stun(f, SET_MS);
    ctx.sfx('stone-rise');
    c.casing = ctx.target({
      x: f.x, y: f.y, r: 34, passThrough: true,
      onStruck: (by) => { if (by === foeOf(f) && isSet(f, ctx.scene.time.now)) shatter(f, ctx.scene.time.now); },
    });
  }

  function release(f: Fighter): void {
    const c = coats.get(f)!;
    c.casing?.remove();
    c.casing = null;
    c.setUntil = 0;
  }

  function shatter(f: Fighter, now: number): void {
    const c = coats.get(f)!;
    release(f);
    c.bands = 0;
    c.shatterAt = now;
    ctx.sfx('crystal-shatter');
    ctx.flash(f.x, f.y, FLOW_LIT);
    selfHit = true; ctx.hit(f, SHATTER_DMG, f.x, f.y); selfHit = false;
  }

  function blow(f: Fighter, amount: number): void {
    if (selfHit || amount < CRACK_AT) return;
    const c = coats.get(f)!;
    const now = ctx.scene.time.now;
    if (c.bands < 1 || isSet(f, now)) return;
    c.bands = Math.max(0, Math.floor(c.bands) - 1);
    c.crackedAt = now;
    ctx.sfx('rock-throw');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('THE DRIP LAYS STONE ON YOU: ARMOUR, THEN WEIGHT, THEN A CASING. BREAK HERS.', '#e8dcc0'); }
      if (!opened && npc.hp < npc.maxHp * 0.5) {
        opened = true;
        ctx.banner('SHE OPENS THE ROOF: THE DRIP RUNS FASTER', '#e8dcc0');
        ctx.sfx('quake');
      }
      const pace = opened ? 1.45 : 1;
      for (const l of lines) {
        l.cx += l.vx * pace * dt; l.cy += l.vy * pace * dt; l.ang += l.spin * pace * dt;
        if (l.cx < 150 || l.cx > W - 150) { l.vx = -l.vx; l.cx = clamp(l.cx, 150, W - 150); }
        if (l.cy < top + 70 || l.cy > H - 70) { l.vy = -l.vy; l.cy = clamp(l.cy, top + 70, H - 70); }
      }
      for (const f of [player, npc]) {
        const c = coats.get(f)!;
        if (!alive(f)) { if (c.casing) release(f); continue; }
        if (c.setUntil) {
          c.casing?.moveTo(f.x, f.y);
          if (time >= c.setUntil) {
            // Not struck in time: the casing crumbles to half and lets them go.
            release(f);
            c.bands = 2;
            ctx.sfx('rock-throw');
          }
          continue;
        }
        if (underLine(f)) c.bands = Math.min(MAX_BANDS, c.bands + (dt / LAY_S) * pace);
        else c.bands = Math.max(0, c.bands - dt / FLAKE_S);
        if (c.bands >= MAX_BANDS) setFast(f, time);
      }
    },

    onPlayerHurt(amount) { blow(player, amount); },
    onNpcHurt(amount) { blow(npc, amount); },

    playerSpeedMult() { return 1 - 0.13 * Math.floor(coats.get(player)!.bands); },
    npcSpeedMult() { return 1 - 0.13 * Math.floor(coats.get(npc)!.bands); },
    playerTakenMult() { const c = coats.get(player)!; return c.setUntil ? 1 : 1 - 0.11 * Math.floor(c.bands); },
    npcTakenMult() { const c = coats.get(npc)!; return c.setUntil ? 1 : 1 - 0.11 * Math.floor(c.bands); },

    npcSeek() {
      const now = ctx.scene.time.now;
      const me = coats.get(npc)!, you = coats.get(player)!;
      if (me.setUntil) return null;
      // A set player is a free shatter: go and break the casing.
      if (isSet(player, now)) return { x: player.x, y: player.y };
      const mine = underLine(npc);
      // Heavy with stone: step out sideways from the drip before the fourth band.
      if (mine && me.bands >= 2.3) {
        const n = mine.ang + Math.PI / 2;
        const side = Math.sign(Math.cos(n) * (npc.x - mine.cx) + Math.sin(n) * (npc.y - mine.cy)) || 1;
        return { x: clamp(npc.x + Math.cos(n) * side * 120, 60, W - 60), y: clamp(npc.y + Math.sin(n) * side * 120, top + 40, H - 40) };
      }
      // Bare: take a band of armour from the nearer line if it is close.
      if (me.bands < 1.2 && you.bands < 3) {
        let best: Pt | null = null, bd = 220;
        for (const l of lines) {
          const d = dist(l.cx, l.cy, npc.x, npc.y);
          if (d < bd) { bd = d; best = { x: l.cx, y: l.cy }; }
        }
        if (best) return best;
      }
      // Otherwise stand off the player on the far side from the drip, so the player is the one under it.
      const l = lines.reduce((a, b) => (dist(a.cx, a.cy, player.x, player.y) < dist(b.cx, b.cy, player.x, player.y) ? a : b));
      const away = Math.atan2(player.y - l.cy, player.x - l.cx);
      return { x: clamp(player.x + Math.cos(away) * 140, 60, W - 60), y: clamp(player.y + Math.sin(away) * 140, top + 40, H - 40) };
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const l of lines) {
        const [a, b] = ends(l);
        // The wet strip the drip keeps soaked, darker at its heart.
        for (let i = 0; i <= 10; i++) {
          const k = i / 10, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
          g.fillStyle(WET, 0.16); g.fillEllipse(x, y, 74, 40);
          g.fillStyle(ROCK_DEEP, 0.12); g.fillEllipse(x, y, 40, 20);
        }
        // Fresh rimstone where it falls: little cream lips like the edge of a gour pool.
        g.lineStyle(2, FLOW, 0.45);
        for (let i = 0; i < 9; i++) {
          const k = (i + 0.5) / 9, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
          g.beginPath(); g.arc(x, y + 4, 12 + l.seeds[i] * 8, Math.PI * 0.1, Math.PI * 0.9, false); g.strokePath();
          // Splash rings from each straw's drop.
          const ph = (t * 1.3 + l.seeds[i]) % 1;
          g.lineStyle(1.5, FLOW_LIT, 0.55 * (1 - ph)); g.strokeEllipse(x, y, 6 + ph * 30, 3 + ph * 14);
          g.lineStyle(2, FLOW, 0.45);
        }
        g.lineStyle(1, FLOW_LIT, 0.25); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      // Lime dust and chips where a casing broke.
      for (const f of [player, npc]) {
        const c = coats.get(f)!;
        const k = (time - c.shatterAt) / 1400;
        if (k < 0 || k > 1) continue;
        for (let i = 0; i < 14; i++) {
          const a = i * 2.4, d = 14 + k * (30 + (i % 4) * 14);
          g.fillStyle(i % 3 ? FLOW : FLOW_LIT, 1 - k);
          g.fillTriangle(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.55, f.x + Math.cos(a + 0.25) * (d + 7), f.y + Math.sin(a + 0.25) * (d + 7) * 0.55, f.x + Math.cos(a) * (d + 4), f.y + Math.sin(a) * (d + 4) * 0.55 - 4);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const l of lines) {
        const [a, b] = ends(l);
        const lift = 150;
        // The roof crack itself, jagged, dark, with a cream lip of old flowstone.
        const pts: Pt[] = [];
        for (let i = 0; i <= 12; i++) {
          const k = i / 12, j = (((i * 37) % 11) - 5) * 1.6;
          pts.push({ x: a.x + (b.x - a.x) * k + Math.sin(l.ang) * j, y: a.y + (b.y - a.y) * k - lift - Math.cos(l.ang) * j });
        }
        g.lineStyle(14, ROCK_DARK, 0.55); g.strokePoints(pts, false);
        g.lineStyle(6, ROCK_DEEP, 0.9); g.strokePoints(pts, false);
        g.lineStyle(2, FLOW_DARK, 0.8); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y + 4 })), false);
        for (let i = 0; i < 9; i++) {
          const k = (i + 0.5) / 9, x = a.x + (b.x - a.x) * k, gy = a.y + (b.y - a.y) * k;
          const len = 18 + l.seeds[i] * 22, y0 = gy - lift + 2;
          // A soda straw: a thin translucent tube, banded, a bead of water at its tip.
          g.fillStyle(FLOW_DARK, 0.9); g.fillRect(x - 2.5, y0, 5, len);
          g.fillStyle(FLOW_LIT, 0.8); g.fillRect(x - 1, y0, 2, len);
          for (let r = 4; r < len; r += 6) { g.fillStyle(FLOW, 0.9); g.fillRect(x - 2.5, y0 + r, 5, 1.5); }
          g.fillStyle(GLOW, 0.85); g.fillCircle(x, y0 + len + 1.5, 2);
          // Its drop falling the whole way down to the floor.
          const ph = (t * 1.3 + l.seeds[i]) % 1;
          const dy = y0 + len + ph * (lift - len);
          g.fillStyle(lit(WET, 0.6), 0.85 * (1 - ph * 0.5)); g.fillEllipse(x, dy, 3, 5);
        }
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const c = coats.get(f)!;
        if (c.setUntil) drawCasing(g, f, clamp(1 - (c.setUntil - time) / SET_MS, 0, 1), time);
        else drawBands(g, f, c.bands, time - c.crackedAt);
      }
    },

    drawHud(g) {
      const rows: [Fighter, number][] = [[player, 20], [npc, 46]];
      for (const [f, y] of rows) {
        const c = coats.get(f)!;
        const x0 = f === player ? 24 : ctx.W - 24 - MAX_BANDS * 26;
        g.fillStyle(ROCK_DEEP, 0.7); g.fillRoundedRect(x0 - 8, ctx.top + y - 14, MAX_BANDS * 26 + 12, 26, 6);
        for (let i = 0; i < MAX_BANDS; i++) {
          const fill = clamp(c.bands - i, 0, 1);
          const x = x0 + i * 26;
          g.fillStyle(ROCK_DARK, 1); g.fillEllipse(x + 10, ctx.top + y, 20, 14);
          if (fill > 0) {
            g.fillStyle(i === MAX_BANDS - 1 ? lit(FLOW, 0.25) : FLOW, 0.4 + fill * 0.6); g.fillEllipse(x + 10, ctx.top + y, 20 * fill, 14 * fill);
            g.lineStyle(1, FLOW_DARK, 0.9); g.strokeEllipse(x + 10, ctx.top + y, 14 * fill, 9 * fill);
          }
          g.lineStyle(1.5, i === MAX_BANDS - 1 ? 0xff9a60 : FLOW_DARK, 0.9); g.strokeEllipse(x + 10, ctx.top + y, 20, 14);
        }
        if (c.setUntil) { g.lineStyle(2, FLOW_LIT, 1); g.strokeRoundedRect(x0 - 8, ctx.top + y - 14, MAX_BANDS * 26 + 12, 26, 6); }
      }
    },

    destroy() { for (const f of [player, npc]) release(f); },
  };
}

/** The bands laid on a fighter so far: cream rings climbing from the feet, rippled like flowstone. */
function drawBands(g: G, f: Fighter, bands: number, sinceCrack: number): void {
  const n = Math.floor(bands);
  const part = bands - n;
  for (let i = 0; i < Math.min(n + 1, MAX_BANDS); i++) {
    const k = i < n ? 1 : part;
    if (k <= 0.02) continue;
    const y = f.y + 14 - i * 9;
    const w = 46 - i * 5;
    g.fillStyle(i % 2 ? FLOW : FLOW_DARK, 0.75 * k); g.fillEllipse(f.x, y, w, 12);
    g.lineStyle(1.5, FLOW_LIT, 0.8 * k);
    g.beginPath();
    for (let s = 0; s <= 10; s++) {
      const a = Math.PI * (s / 10);
      const px = f.x - Math.cos(a) * w / 2, py = y + Math.sin(a) * 5 + Math.sin(s * 2.1 + i) * 1.4;
      if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
  }
  // A band just knocked off: chips spraying from the coat.
  const k = sinceCrack / 380;
  if (k >= 0 && k < 1) {
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI * (0.1 + 0.8 * (i / 7));
      g.fillStyle(FLOW_LIT, 1 - k); g.fillRect(f.x + Math.cos(a) * (20 + k * 30), f.y + Math.sin(a) * (16 + k * 26), 4, 3);
    }
  }
}

/** A set fighter: a stalagmite grown over them, banded, wet, cracking as the stun runs out. */
function drawCasing(g: G, f: Fighter, k: number, time: number): void {
  const x = f.x, base = f.y + 18, h = 70;
  g.fillStyle(dim(FLOW, 0.35), 0.95);
  g.fillTriangle(x - 30, base, x + 30, base, x, base - h);
  g.fillEllipse(x, base, 62, 18);
  g.fillStyle(FLOW, 0.92);
  g.fillTriangle(x - 24, base - 2, x + 22, base - 2, x - 1, base - h + 8);
  for (let i = 1; i < 7; i++) {
    const y = base - i * 10, w = 50 * (1 - i / 8);
    g.lineStyle(1.5, i % 2 ? FLOW_LIT : FLOW_DARK, 0.8); g.lineBetween(x - w / 2, y, x + w / 2, y - 1);
  }
  g.fillStyle(FLOW_LIT, 0.7); g.fillTriangle(x - 12, base - 6, x - 6, base - 6, x - 4, base - h + 18);
  glow(g, x, base - h + 6, 8, GLOW, 0.06, 2);
  // Cracks spreading as the casing weakens.
  g.lineStyle(1.5, ROCK_DEEP, 0.4 + k * 0.6);
  const n = Math.floor(2 + k * 6);
  for (let i = 0; i < n; i++) {
    const sx = x + Math.sin(i * 2.7) * 14, sy = base - 10 - (i * 13) % 46;
    g.lineBetween(sx, sy, sx + Math.sin(i * 1.3 + time / 900) * 8, sy - 9);
  }
}

export const FALLEN_FLOWSTONE: GimmickDef = {
  id: ID,
  rules: 'Under the drip, stone lays on you: armour, then weight. Four bands and you are set, and a blow breaks you. Hard hits knock bands off. Set her.',
  make,
};
