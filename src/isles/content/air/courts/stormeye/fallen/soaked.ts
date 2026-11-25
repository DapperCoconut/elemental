import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import { Clock, S, alive, clamp, dist, drawBolt, drawCloud, jit } from '../util';

/**
 * SOAKED THROUGH — Ignatius Brine, Slicker-Maker (cloth).
 *
 * Stormeye wears yellow oilskins because yellow is the only colour you can see in a squall, and
 * because a man soaked to the skin is a man the lightning likes. In the star's telling the
 * slicker-maker sells his oilskins only to the paid-up, and hangs the rest on a peg in the square
 * where the poor can look at them.
 *
 * Squall lines march across the yard — dark bands of rain with a ragged gap in each — and soak
 * whoever they cross (two droplet gauges at the foot of the screen). Out of the rain you slowly dry.
 * Every few seconds the sky picks the WETTEST fighter, marks the ground under them, and strikes
 * the mark: the wetter, the harder. A soaked fighter also carries the bolt on to the other if they
 * stand close and are wet too.
 *
 * The coats: walk to the rack in the middle of the yard and take an oilskin — while you wear it
 * the rain runs off and you dry fast, which leaves the other fighter the wettest. Brine wants the
 * same coat. Past half he hoards: one coat on the rack, and the squalls come crossing, one from
 * the north and one from the west.
 */

type Side = 'player' | 'npc';

interface Band { axis: 'y' | 'x'; dir: 1 | -1; pos: number; gap: number; gapDrift: number; seed: number }

interface Bolt { x: number; y: number; at: number; strikeAt: number; struck: boolean; seed: number; target: Side }

const BAND_HALF = 66;
const GAP_HALF = 130;
const BOLT_R = 56;
const COAT_MS = 7000;
const COAT_BACK_MS = 2600;

export const FALLEN_SOAKED: GimmickDef = {
  id: fallenId('stormeye', 'soaked'),
  rules: 'Squall lines soak whoever they cross; lightning strikes the wettest fighter, harder the wetter. Take an oilskin from the rack to stay dry.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const RACK = { x: W / 2, y: top + (H - top) / 2 + 20 };
    const soak: Record<Side, number> = { player: 0, npc: 0 };
    const coatUntil: Record<Side, number> = { player: 0, npc: 0 };
    let coatsBackAt: number[] = [0, 0];
    const bands: Band[] = [];
    const bolts: Bolt[] = [];
    const boltWarn = ctx.tk.warn(1300);
    let now = 0;
    let nextBand = -1;
    let nextBolt = -1;
    let bandTurn = 0;
    let hoard = false;

    const wearing = (s: Side): boolean => now < coatUntil[s];
    const coatsOnRack = (): number => coatsBackAt.filter((t) => now >= t).length;
    const inBand = (b: Band, f: Fighter): boolean => {
      const along = b.axis === 'y' ? f.y : f.x;
      const across = b.axis === 'y' ? f.x : f.y;
      return Math.abs(along - b.pos) < BAND_HALF && Math.abs(across - b.gap) > GAP_HALF;
    };
    const span = (b: Band): [number, number] => (b.axis === 'y' ? [top - 90, H + 90] : [-90, W + 90]);
    const crossLen = (b: Band): number => (b.axis === 'y' ? W : H - top);
    const crossMin = (b: Band): number => (b.axis === 'y' ? 0 : top);

    const launch = (axis: 'y' | 'x'): void => {
      const dir: 1 | -1 = bandTurn % 2 ? -1 : 1;
      const b: Band = { axis, dir, pos: 0, gap: 0, gapDrift: (rng() - 0.5) * 50, seed: rng() * 100 };
      const [a0, a1] = span(b);
      b.pos = dir > 0 ? a0 : a1;
      b.gap = crossMin(b) + GAP_HALF + rng() * (crossLen(b) - GAP_HALF * 2);
      bands.push(b);
      ctx.sfx('rain');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextBand < 0) { nextBand = time + 900; nextBolt = time + 3800; }
        if (dt === 0) return;
        if (!hoard && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          hoard = true;
          coatsBackAt = [coatsBackAt[0]];
          ctx.banner('Brine takes a coat off the peg — and the squalls cross', '#ffe08a');
          ctx.sfx('status-debuff');
        }
        if (time >= nextBand) {
          bandTurn++;
          launch('y');
          if (hoard) launch('x');
          nextBand = time + (hoard ? 5600 : 4600);
        }
        for (const b of bands) {
          b.pos += b.dir * (b.axis === 'y' ? 112 : 130) * dt;
          b.gap = clamp(b.gap + b.gapDrift * dt, crossMin(b) + GAP_HALF, crossMin(b) + crossLen(b) - GAP_HALF);
        }
        for (let i = bands.length - 1; i >= 0; i--) {
          const [a0, a1] = span(bands[i]);
          if (bands[i].pos < a0 - 1 || bands[i].pos > a1 + 1) bands.splice(i, 1);
        }

        for (const side of ['player', 'npc'] as Side[]) {
          const f = fighterOf(side);
          if (!alive(f)) continue;
          const wet = !wearing(side) && bands.some((b) => inBand(b, f));
          soak[side] = clamp(soak[side] + (wet ? 36 : wearing(side) ? -18 : -5) * dt, 0, 100);
          // Taking a coat off the rack.
          if (!wearing(side) && coatsOnRack() > 0 && dist(f.x, f.y, RACK.x, RACK.y) < 44) {
            const i = coatsBackAt.findIndex((t) => now >= t);
            coatsBackAt[i] = now + COAT_MS + COAT_BACK_MS;
            coatUntil[side] = now + COAT_MS;
            ctx.sfx('status-buff');
          }
        }

        // The sky picks the wettest.
        if (time >= nextBolt) {
          nextBolt = time + (hoard ? 4000 : 4800);
          const pick: Side = soak.player >= soak.npc ? 'player' : 'npc';
          if (soak[pick] >= 20) {
            const f = fighterOf(pick);
            bolts.push({ x: f.x, y: f.y, at: time, strikeAt: time + boltWarn, struck: false, seed: rng() * 100, target: pick });
            ctx.sfx('electric-charge');
          } else ctx.sfx('clang');
        }
        for (const bo of bolts) {
          if (bo.struck || time < bo.strikeAt) continue;
          bo.struck = true;
          ctx.sfx('thunder');
          for (const side of ['player', 'npc'] as Side[]) {
            const f = fighterOf(side);
            if (!alive(f) || dist(f.x, f.y, bo.x, bo.y) > BOLT_R) continue;
            ctx.hit(f, 8 + soak[side] * 0.14, f.x, f.y);
            ctx.flash(f.x, f.y, S.bolt);
            // Conducted on: the other fighter, close and wet too.
            const o: Side = side === 'player' ? 'npc' : 'player';
            const of = fighterOf(o);
            if (alive(of) && soak[o] >= 50 && dist(of.x, of.y, f.x, f.y) < 170 && dist(of.x, of.y, bo.x, bo.y) > BOLT_R) {
              ctx.hit(of, 5 + soak[o] * 0.08, of.x, of.y);
              ctx.flash(of.x, of.y, S.boltGlow);
              ctx.sfx('status-shock');
            }
            soak[side] *= 0.4;
          }
        }
        for (let i = bolts.length - 1; i >= 0; i--) if (bolts[i].struck && time - bolts[i].strikeAt > 400) bolts.splice(i, 1);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        for (const bo of bolts) {
          if (bo.struck || dist(n.x, n.y, bo.x, bo.y) > BOLT_R + 50) continue;
          const a = Math.atan2(n.y - bo.y, n.x - bo.x);
          return { x: clamp(bo.x + Math.cos(a) * (BOLT_R + 90), 60, W - 60), y: clamp(bo.y + Math.sin(a) * (BOLT_R + 90), top + 50, H - 50) };
        }
        if (!wearing('npc') && coatsOnRack() > 0 && (soak.npc > 30 || soak.npc >= soak.player)) return { x: RACK.x, y: RACK.y };
        // A squall about to reach him: slip toward its gap.
        for (const b of bands) {
          const along = b.axis === 'y' ? n.y : n.x;
          const ahead = (along - b.pos) * b.dir;
          if (ahead < -BAND_HALF || ahead > 220) continue;
          return b.axis === 'y' ? { x: b.gap, y: n.y } : { x: n.x, y: b.gap };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Under each squall: setts blackened with standing water, rings of rain on it, and the
        // cloud's shadow running ahead of the band.
        for (const b of bands) {
          const lo = crossMin(b), len = crossLen(b);
          const segs: [number, number][] = [[lo, b.gap - GAP_HALF], [b.gap + GAP_HALF, lo + len]];
          for (const [c0, c1] of segs) {
            if (c1 <= c0) continue;
            const ahead = b.pos + b.dir * (BAND_HALF + 30);
            if (b.axis === 'y') {
              g.fillStyle(0x000000, 0.14); g.fillRect(c0, ahead - 30, c1 - c0, 60);
              g.fillStyle(S.water, 0.3); g.fillRect(c0, b.pos - BAND_HALF, c1 - c0, BAND_HALF * 2);
            } else {
              g.fillStyle(0x000000, 0.14); g.fillRect(ahead - 30, c0, 60, c1 - c0);
              g.fillStyle(S.water, 0.3); g.fillRect(b.pos - BAND_HALF, c0, BAND_HALF * 2, c1 - c0);
            }
            for (let i = 0; i < 18; i++) {
              const u = jit(b.seed, i), v = jit(b.seed + 1, i);
              const ph = (time / 500 + jit(b.seed + 2, i)) % 1;
              const c = c0 + u * (c1 - c0), a = b.pos + (v - 0.5) * BAND_HALF * 2;
              const [x, y] = b.axis === 'y' ? [c, a] : [a, c];
              g.lineStyle(1, S.puddleLit, 0.5 * (1 - ph)); g.strokeEllipse(x, y, 4 + ph * 16, 2 + ph * 6);
            }
          }
        }
        // The lightning's mark on the wettest: a ring scorching in with forks, the cloud lowering.
        for (const bo of bolts) {
          if (bo.struck) { g.fillStyle(0x0c0e12, 0.5); g.fillEllipse(bo.x, bo.y, 60, 22); continue; }
          const k = clamp((time - bo.at) / (bo.strikeAt - bo.at), 0, 1);
          g.fillStyle(0x000000, 0.1 + 0.25 * k); g.fillCircle(bo.x, bo.y, BOLT_R);
          g.lineStyle(2.5, S.boltGlow, 0.5 + 0.4 * k); g.strokeCircle(bo.x, bo.y, BOLT_R);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + jit(bo.seed, i);
            const L = BOLT_R * (0.4 + 0.6 * k);
            g.lineStyle(1.5, S.bolt, 0.6 * k); g.lineBetween(bo.x + Math.cos(a) * BOLT_R, bo.y + Math.sin(a) * BOLT_R, bo.x + Math.cos(a + 0.3) * (BOLT_R - L * 0.5), bo.y + Math.sin(a + 0.3) * (BOLT_R - L * 0.5));
          }
          if (k > 0.75 && Math.floor(time / 70) % 2) { g.fillStyle(S.bolt, 0.18); g.fillCircle(bo.x, bo.y, BOLT_R); }
        }
        // The rack's shadow.
        g.fillStyle(0x000000, 0.32); g.fillEllipse(RACK.x, RACK.y + 2, 70, 16);
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The coat-rack: a turned post on a cross foot, a ring of pegs, and the yellow oilskins
        // hanging from them with sou'westers on top, dripping.
        const rx = RACK.x, ry = RACK.y;
        g.fillStyle(S.timber, 1); g.fillRect(rx - 26, ry - 4, 52, 6); g.fillRect(rx - 3, ry - 78, 6, 76);
        g.fillStyle(S.timberLit, 1); g.fillRect(rx - 1, ry - 78, 2, 76); g.fillCircle(rx, ry - 80, 5);
        for (const s of [-1, 1]) { g.lineStyle(3, S.timber, 1); g.lineBetween(rx, ry - 70, rx + s * 18, ry - 76); }
        const slots = hoard ? [0] : [-1, 1];
        slots.forEach((s, i) => {
          if (now < coatsBackAt[i]) return;
          const cx = rx + s * 16, cy = ry - 70;
          g.fillStyle(S.oilskinDark, 1); g.fillTriangle(cx - 4, cy, cx + 4, cy, cx + s * 2, cy + 6);
          g.fillStyle(S.oilskin, 1);
          g.fillPoints([{ x: cx - 6, y: cy + 2 }, { x: cx + 6, y: cy + 2 }, { x: cx + 12, y: cy + 46 }, { x: cx - 12, y: cy + 46 }], true);
          g.fillStyle(S.oilskinDark, 1); g.fillRect(cx - 1, cy + 4, 2, 40); g.fillRect(cx - 12, cy + 44, 24, 3);
          for (let b = 0; b < 3; b++) { g.fillStyle(S.brassDark, 1); g.fillCircle(cx + 3, cy + 12 + b * 10, 1.4); }
          g.fillStyle(S.oilskin, 1); g.fillEllipse(cx, cy - 6, 20, 6); g.fillEllipse(cx, cy - 10, 11, 8);
          g.fillStyle(0xfff0a0, 0.5); g.fillRect(cx - 8, cy + 8, 2, 30);
          const ph = (time / 700 + i * 0.5) % 1; g.fillStyle(S.rain, 0.8 * (1 - ph)); g.fillCircle(cx + 9, cy + 48 + ph * 18, 1.8);
        });
        // Whoever wears a coat wears it: a yellow cape and hood over their shoulders.
        for (const side of ['player', 'npc'] as Side[]) {
          if (!wearing(side)) continue;
          const f = fighterOf(side);
          const k = clamp((coatUntil[side] - now) / 1200, 0, 1);
          const blink = k < 1 && Math.floor(now / 110) % 2 ? 0.45 : 0.85;
          g.fillStyle(S.oilskin, blink); g.fillPoints([{ x: f.x - 14, y: f.y - 30 }, { x: f.x + 14, y: f.y - 30 }, { x: f.x + 22, y: f.y + 4 }, { x: f.x - 22, y: f.y + 4 }], true);
          g.fillStyle(S.oilskinDark, blink); g.fillEllipse(f.x, f.y - 40, 34, 9);
          g.fillStyle(S.oilskin, blink); g.fillEllipse(f.x, f.y - 44, 20, 12);
          for (let i = 0; i < 3; i++) { const ph = (now / 400 + i / 3) % 1; g.fillStyle(S.rain, 0.7 * (1 - ph)); g.fillCircle(f.x - 18 + i * 18, f.y + 6 + ph * 10, 1.6); }
        }
        // The squall lines: bruised cloud along the band, rain raking down out of it.
        for (const b of bands) {
          const lo = crossMin(b), len = crossLen(b);
          for (let i = 0; i < 12; i++) {
            const c = lo + ((i + 0.5) / 12) * len;
            if (Math.abs(c - b.gap) < GAP_HALF - 20) continue;
            const [x, y] = b.axis === 'y' ? [c, b.pos - 70] : [b.pos, c - 70];
            drawCloud(g, x, y, 44, 0.55, S.cloudDark, Math.floor(b.seed) + i);
            for (let r = 0; r < 6; r++) {
              const ph = (time / 260 + jit(b.seed + i, r)) % 1;
              const rx2 = x + (jit(b.seed + i, r + 9) - 0.5) * 80;
              g.lineStyle(1, S.rain, 0.55); g.lineBetween(rx2, y + 6 + ph * 70, rx2 + 4, y + 18 + ph * 70);
            }
          }
        }
        for (const bo of bolts) {
          if (!bo.struck) {
            const k = clamp((time - bo.at) / (bo.strikeAt - bo.at), 0, 1);
            drawCloud(g, bo.x, bo.y - 190 + k * 40, 40 + k * 14, 0.5 + 0.4 * k, k > 0.7 && Math.floor(time / 60) % 3 === 0 ? S.cloudLit : S.cloudDark, Math.floor(bo.seed));
          } else if (time - bo.strikeAt < 220) {
            drawBolt(g, bo.x + (jit(bo.seed, 2) - 0.5) * 50, bo.y - 220, bo.x, bo.y, Math.floor(bo.seed), 1 - (time - bo.strikeAt) / 220, 5, 26);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // Two droplet gauges, bottom centre — yours left, Brine's right — the wetter one ringed.
        const cy = H - 30;
        const drop = (x: number, side: Side): void => {
          const k = soak[side] / 100;
          g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 26, cy - 26, 52, 46, 8);
          // The drop: a round belly (r 13 at cy+6) drawn up to a point at cy-20; the water fills
          // it from the bottom in strips clipped to the drop's own width.
          const half = (yy: number): number => (yy >= cy + 6 ? Math.sqrt(Math.max(0, 169 - (yy - cy - 6) ** 2)) : 13 * ((yy - (cy - 20)) / 26));
          g.fillStyle(S.slateDark, 1); g.fillCircle(x, cy + 6, 13); g.fillTriangle(x - 12.5, cy + 3, x + 12.5, cy + 3, x, cy - 20);
          const lvl = cy + 19 - 39 * k;
          g.fillStyle(S.waterLit, 1);
          for (let yy = cy + 19; yy > lvl; yy -= 2) { const h = half(yy - 1); if (h > 0.5) g.fillRect(x - h, yy - 2, h * 2, 2); }
          g.lineStyle(2, wearing(side) ? S.oilskin : S.glass, 1);
          g.beginPath(); g.arc(x, cy + 6, 13, -0.3, Math.PI + 0.3, false); g.lineTo(x, cy - 20); g.closePath(); g.strokePath();
          g.fillStyle(0xffffff, 0.5); g.fillCircle(x - 5, cy + 2, 2);
          const wettest = soak[side] >= soak[side === 'player' ? 'npc' : 'player'] && soak[side] >= 20;
          if (wettest) { g.lineStyle(2, S.bolt, 0.9); g.strokeCircle(x, cy, 22); }
        };
        drop(W / 2 - 34, 'player');
        drop(W / 2 + 34, 'npc');
      },
    };
  },
};
