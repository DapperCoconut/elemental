import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  AMBER, CANDLE, GILT, GILT_DARK, GILT_LIT, OAK, OAK_DARK, OAK_LIT, SEQ_PINK, SEQ_TEAL, SEQ_VIOLET, SILK_WHITE, VELVET_LIT,
} from '../palette';
import { alive, clamp, dist, other, stepDt, wrapAngle } from '../util';

/**
 * The Giddy Waltz — Dancing-Mistress Fiammetta Volta, who taught the Prince to waltz as a boy, and
 * who in the King's telling taught the whole court to turn and turn so that nobody ever stood
 * still long enough to speak.
 *
 * Circling your foe is dancing. Each fighter winds up by their OWN steps round the other: step
 * round one way and you wind, step back the other way and you unwind. While you are turning
 * quickly you are in step and your blows land a third harder. But wind two full turns and you reel
 * — stunned where you stand. The dial at the top keeps both of you.
 *
 * Fiammetta pirouettes: her ribbons gather, then fly out in a ring with one gap, leading the way
 * she spins. Caught, you are spun a whole turn her way. Dodging round her for the gap winds you
 * too — mind which way. Her spin winds her as well; she walks it off by circling you back the other
 * way. The exploit: strike her while she gathers — every blow spins her further — and her own
 * pirouette carries her over two turns. Halfway down, she throws her ribbons twice.
 */

const ID = fallenId('masque', 'giddy');
const TURN = Math.PI * 2;
const REEL_AT = TURN * 2;
const STEP_OMEGA = 0.7;
const GATHER_MS = 1100;
const SPIN_EVERY = 6800;
const SPIN_HALF_EVERY = 5200;
const RING_SPEED = 300;
const RING_BAND = 16;
const GAP_HALF = 0.62;
const BLOW_SPIN = Math.PI * 0.75;

interface Dancer { f: Fighter; px: number; py: number; wind: number; omega: number; reelFlash: number }
interface Ring { x: number; y: number; r: number; dir: number; gap: number; at: number; done: boolean; colors: number[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const dancers = new Map<Fighter, Dancer>(
    [player, npc].map((f) => [f, { f, px: f.x, py: f.y, wind: 0, omega: 0, reelFlash: -9999 }]),
  );
  const rings: Ring[] = [];
  let gatherAt = -1;
  let gatherDir = 1;
  let nextSpin = 0;
  let lastBlow = 0;
  let twice = false;
  let started = false;
  let guard = false;

  const me = (f: Fighter): Dancer => dancers.get(f) as Dancer;
  const inStep = (f: Fighter): boolean => alive(f) && Math.abs(me(f).omega) >= STEP_OMEGA;

  function wind(f: Fighter, by: number, time: number): void {
    const d = me(f);
    d.wind += by;
    if (Math.abs(d.wind) < REEL_AT || !alive(f)) return;
    d.wind = 0;
    d.reelFlash = time;
    ctx.stun(f, twice ? 1500 : 1150);
    ctx.float(f.x, f.y - 54, f === npc ? 'OVERSPUN!' : 'REELING', '#ffd0f0');
    ctx.sfx('status-stun');
  }

  function bonus(victim: Fighter, amount: number): void {
    if (guard || !inStep(other(victim, player, npc))) return;
    guard = true;
    ctx.hit(victim, amount * 0.35, victim.x, victim.y);
    guard = false;
  }

  function throwRing(time: number, shift: number): void {
    const a = Math.atan2(player.y - npc.y, player.x - npc.x) + gatherDir * (0.75 + shift);
    const colors = [SEQ_PINK, SEQ_TEAL, SEQ_VIOLET, GILT, SILK_WHITE].sort(() => rng() - 0.5);
    rings.push({ x: npc.x, y: npc.y, r: 24, dir: gatherDir, gap: a, at: time, done: false, colors });
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSpin = time + 4000; }
      if (!twice && npc.hp <= npc.maxHp * 0.5) {
        twice = true;
        ctx.banner('The band plays faster: her ribbons fly twice.', '#ffd0f0');
        ctx.sfx('sparkle');
      }

      // Each fighter's own steps round the other wind them.
      for (const d of dancers.values()) {
        const o = other(d.f, player, npc);
        const rx = d.f.x - o.x, ry = d.f.y - o.y;
        const r2 = rx * rx + ry * ry;
        const mx = d.f.x - d.px, my = d.f.y - d.py;
        d.px = d.f.x; d.py = d.f.y;
        let dth = 0;
        if (r2 > 50 * 50 && dt > 0) dth = clamp((rx * my - ry * mx) / r2, -0.25, 0.25);
        if (Math.hypot(mx, my) > 120) dth = 0; // a shove or a carry is not a step
        d.omega += ((dt > 0 ? dth / dt : 0) - d.omega) * Math.min(1, dt * 6);
        d.wind -= Math.sign(d.wind) * Math.min(Math.abs(d.wind), 0.22 * dt);
        if (dth) wind(d.f, dth, time);
      }

      // Her pirouette: gather, then the ribbon ring.
      if (gatherAt < 0 && time >= nextSpin && alive(npc) && alive(player)) {
        gatherAt = time;
        const w = me(npc).wind;
        gatherDir = Math.abs(w) > 0.5 ? Math.sign(w) : rng() < 0.5 ? 1 : -1;
        ctx.sfx('beam-charge');
      }
      if (gatherAt >= 0 && time - gatherAt >= GATHER_MS) {
        gatherAt = -1;
        nextSpin = time + (twice ? SPIN_HALF_EVERY : SPIN_EVERY);
        throwRing(time, 0);
        if (twice) tk.schedule(420, () => { if (alive(npc)) throwRing(tk.now, 0.35); });
        wind(npc, gatherDir * TURN, time);
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.r += RING_SPEED * dt;
        if (g.r > 620) { rings.splice(i, 1); continue; }
        if (g.done || !alive(player) || ctx.dashing(player)) continue;
        const d = dist(g.x, g.y, player.x, player.y);
        if (Math.abs(d - g.r) > RING_BAND + 12) continue;
        const a = Math.atan2(player.y - g.y, player.x - g.x);
        if (Math.abs(wrapAngle(a - g.gap)) < GAP_HALF) continue;
        g.done = true;
        guard = true;
        tk.hitPlayer(9, player.x, player.y);
        guard = false;
        wind(player, g.dir * TURN, time);
        ctx.float(player.x, player.y - 50, 'SPUN', '#ffd0f0');
      }
    },

    onNpcHurt(amount) {
      bonus(npc, amount);
      // Struck while she gathers: every blow spins her further.
      const now = tk.now;
      if (gatherAt >= 0 && !guard && now - lastBlow > 120) {
        lastBlow = now;
        wind(npc, gatherDir * BLOW_SPIN, now);
        ctx.flash(npc.x, npc.y - 20, SEQ_PINK);
      }
    },
    onPlayerHurt(amount) { bonus(player, amount); },

    npcSeek() {
      // Walk her wind off: circle the player the other way round.
      const w = me(npc).wind;
      if (Math.abs(w) < 0.6) return null;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) - Math.sign(w) * 0.6;
      const r = clamp(dist(npc.x, npc.y, player.x, player.y), 150, 240);
      return { x: clamp(player.x + Math.cos(a) * r, 60, W - 60), y: clamp(player.y + Math.sin(a) * r, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The ballroom floor: a great inlaid rose of oak and gilt under the chandelier's pool of light.
      const cx = W / 2, cy = (top + H) / 2;
      glow(g, cx, cy, 300, CANDLE, 0.025, 5);
      g.fillStyle(OAK_DARK, 0.5); g.fillCircle(cx, cy, 210);
      for (let k = 0; k < 16; k++) {
        const a0 = (k / 16) * TURN, a1 = ((k + 1) / 16) * TURN;
        g.fillStyle(k % 2 ? OAK : OAK_LIT, 0.55);
        g.fillTriangle(cx, cy, cx + Math.cos(a0) * 200, cy + Math.sin(a0) * 200, cx + Math.cos(a1) * 200, cy + Math.sin(a1) * 200);
      }
      g.lineStyle(3, GILT_DARK, 0.6); g.strokeCircle(cx, cy, 200); g.strokeCircle(cx, cy, 120);
      g.lineStyle(1, GILT, 0.5); g.strokeCircle(cx, cy, 204); g.strokeCircle(cx, cy, 60);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TURN;
        g.fillStyle(GILT, 0.5);
        g.fillTriangle(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60, cx + Math.cos(a + 0.12) * 118, cy + Math.sin(a + 0.12) * 118, cx + Math.cos(a - 0.12) * 118, cy + Math.sin(a - 0.12) * 118);
      }
      // Each fighter's wind: a gilt spiral at their feet, reddening toward two turns.
      for (const d of dancers.values()) {
        if (!alive(d.f)) continue;
        const k = Math.abs(d.wind) / REEL_AT;
        const col = mixC(GILT_LIT, 0xff3a5a, clamp((k - 0.4) / 0.5, 0, 1));
        const sweep = k * TURN * 2;
        const pts = [];
        for (let s = 0; s <= 40; s++) {
          const t = s / 40;
          const a = Math.sign(d.wind || 1) * t * sweep + time / 900;
          pts.push({ x: d.f.x + Math.cos(a) * (12 + t * 18), y: d.f.y + 2 + Math.sin(a) * (5 + t * 7) });
        }
        if (sweep > 0.05) { g.lineStyle(2, col, 0.4 + 0.5 * k); g.strokePoints(pts, false); }
        if (inStep(d.f)) { g.fillStyle(SEQ_PINK, 0.5 + 0.3 * Math.sin(time / 90)); g.fillCircle(d.f.x + Math.cos(time / 120) * 26, d.f.y + Math.sin(time / 120) * 9, 2.5); }
        if (time - d.reelFlash < 1200) { g.lineStyle(2, 0xffd0f0, 1 - (time - d.reelFlash) / 1200); g.strokeEllipse(d.f.x, d.f.y - 60, 30, 10); }
      }
    },

    drawAir(g, time) {
      // Gathering: her ribbons wind in round her, faster and tighter.
      if (gatherAt >= 0 && alive(npc)) {
        const k = clamp((time - gatherAt) / GATHER_MS, 0, 1);
        drawRibbons(g, npc.x, npc.y - 24, 60 - k * 26, gatherDir * (time / (160 - k * 90)), k);
      }
      // The ring: five silk ribbons flying out, the gap leading her spin.
      for (const r of rings) {
        r.colors.forEach((c, i) => {
          const rr = r.r - 6 + i * 3;
          const wav = Math.sin(time / 70 + i) * 3;
          g.lineStyle(3, c, 0.85 - i * 0.08);
          g.beginPath();
          g.arc(r.x, r.y, Math.max(2, rr + wav), r.gap + GAP_HALF, r.gap - GAP_HALF + TURN, false);
          g.strokePath();
        });
        // Bows tied at the gap's edges so the opening reads.
        for (const s of [-1, 1]) {
          const a = r.gap + s * GAP_HALF;
          const bx = r.x + Math.cos(a) * r.r, by = r.y + Math.sin(a) * r.r;
          g.fillStyle(VELVET_LIT, 1); g.fillTriangle(bx, by, bx - 6, by - 5, bx - 6, by + 5); g.fillTriangle(bx, by, bx + 6, by - 5, bx + 6, by + 5);
        }
      }
    },

    drawHud(g, time) {
      // Two gilt dials, yours and hers: the needle winds round; two turns is the red mark.
      [player, npc].forEach((f, i) => {
        const d = me(f);
        const x = W / 2 - 40 + i * 80, y = top + 30;
        g.fillStyle(0x140c18, 0.75); g.fillCircle(x, y, 24);
        g.lineStyle(2, i === 0 ? SEQ_TEAL : VELVET_LIT, 0.9); g.strokeCircle(x, y, 24);
        const k = clamp(Math.abs(d.wind) / REEL_AT, 0, 1);
        g.lineStyle(5, mixC(GILT, 0xff3a5a, k), 0.9);
        g.beginPath(); g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.sign(d.wind || 1) * k * TURN, d.wind < 0); g.strokePath();
        g.fillStyle(0xff3a5a, 1); g.fillCircle(x, y - 17, 2.5);
        const na = -Math.PI / 2 + d.wind;
        g.lineStyle(2, GILT_LIT, 1); g.lineBetween(x, y, x + Math.cos(na) * 13, y + Math.sin(na) * 13);
        g.fillStyle(GILT_LIT, 1); g.fillCircle(x, y, 3);
        if (inStep(f)) { g.fillStyle(AMBER, 0.6 + 0.4 * Math.sin(time / 100)); g.fillCircle(x + 18, y + 18, 3); }
      });
    },

    destroy() { rings.length = 0; },
  };
}

/** Five silk ribbons wound round a centre: drawn as trailing arcs with a weighted, fluttering tail. */
function drawRibbons(g: G, x: number, y: number, r: number, spin: number, k: number): void {
  const cols = [SEQ_PINK, SEQ_TEAL, SEQ_VIOLET, GILT, SILK_WHITE];
  cols.forEach((c, i) => {
    const a0 = spin + (i / cols.length) * TURN;
    const pts = [];
    for (let s = 0; s <= 10; s++) {
      const t = s / 10;
      const a = a0 - t * 1.4;
      const rr = r * (1 - t * 0.25) + Math.sin(t * 8 + spin) * 3;
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.55 });
    }
    g.lineStyle(3, c, 0.6 + 0.4 * k); g.strokePoints(pts, false);
    g.fillStyle(c, 1); g.fillCircle(pts[0].x, pts[0].y, 2.5);
  });
}

export const FALLEN_GIDDY: GimmickDef = {
  id: ID,
  rules: 'Circle your foe to dance in step: blows land harder, but two full turns and you reel. Her ribbons spin you. Strike her mid-spin to spin her over.',
  make,
};
