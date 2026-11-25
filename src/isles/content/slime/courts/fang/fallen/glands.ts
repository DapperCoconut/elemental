import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { risenCobra } from '../art';
import {
  COBRA, FANG_LIT, GLASS, TIMBER, TIMBER_DARK, TIMBER_LIT, VENIN_EYE, VENOM, VENOM_DARK, VENOM_LIT, VIPER, VIPER_BAND, WICKER, WICKER_DARK,
} from '../palette';
import { alive, arcPoint, clamp, dist, stepDt } from '../util';

/**
 * Crossed Glands — Milker Brisewyn Tallis, in the King's telling the milker who knew the oldest
 * thing in the shed and told it only to the crown: venom against venom.
 *
 * Two serpents stand yoked on milking frames along the north fence. The green viper's venom
 * numbs the nerves (cooldowns crawl, feet drag); the red cobra's thins the blood (every blow
 * lands harder). They spit at you in turn — a glob lobbed high, its ring on the floor. Take a
 * second dose of the same and it bites double. But take the *other* while you carry one and the
 * two eat each other: cured, and the milk mends you. So the glob you dodge is sometimes the one
 * you should step into.
 *
 * The exploit: strike a frame and that serpent spits at once at your foe. Give him the colour
 * he already carries; never the one that cures him. Halfway down the milker cuts the troughs:
 * every splash leaves a puddle of its venom that doses whoever wades in.
 */

const ID = fallenId('fang', 'glands');
type Venom = 'neuro' | 'haemo';
const FLY_MS = 1050;
const SPLASH_R = 54;
const DUR = 6000;
const DOSE = 8;
const DOUBLE = 6;
const CURE = 10;
const PERIOD = 3200;
const REYOKE = 2600;
const HAEMO = 0xd04848;
const HAEMO_LIT = 0xff9a8a;

/** A milking frame and its serpent. */
interface Frame { kind: Venom; x: number; next: number; ready: number; target: StrikeTarget | null; rear: number }
/** A glob in the air: where it lands and whom it was meant for. */
interface Glob { kind: Venom; fx: number; fy: number; x: number; y: number; at: number }
/** A puddle of spilt venom (after half). */
interface Puddle { kind: Venom; x: number; y: number; until: number; seed: number }
/** One fighter's doses. */
interface Doses { neuro: number; haemo: number; lastWade: number }

const col = (k: Venom): number => (k === 'neuro' ? VENOM : HAEMO);
const colLit = (k: Venom): number => (k === 'neuro' ? VENOM_LIT : HAEMO_LIT);

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const frames: Frame[] = [
    { kind: 'neuro', x: W * 0.3, next: 0, ready: 0, target: null, rear: 0 },
    { kind: 'haemo', x: W * 0.7, next: 0, ready: 0, target: null, rear: 0 },
  ];
  const fy = top + 36;
  const globs: Glob[] = [];
  const puddles: Puddle[] = [];
  const doses = new Map<Fighter, Doses>([[player, { neuro: 0, haemo: 0, lastWade: 0 }], [npc, { neuro: 0, haemo: 0, lastWade: 0 }]]);
  let started = false;
  let cut = false;
  const now = (): number => ctx.scene.time.now;
  const has = (f: Fighter, k: Venom): boolean => (doses.get(f)?.[k] ?? 0) > now();
  const foeOf = (f: Fighter): Fighter => (f === player ? npc : player);

  function spit(fr: Frame, at: Fighter, time: number): void {
    if (!alive(at)) return;
    globs.push({ kind: fr.kind, fx: fr.x + (fr.kind === 'neuro' ? 26 : -26), fy: fy - 62, x: clamp(at.x, 50, W - 50), y: clamp(at.y, top + 30, H - 30), at: time });
    fr.rear = time;
    ctx.sfx(fr.kind === 'neuro' ? 'slime-splat' : 'sizzle');
  }

  /** One dose of `k` on `f`: cures the other, doubles the same, else takes. */
  function dose(f: Fighter, k: Venom, dmg: number): void {
    const d = doses.get(f);
    if (!d || !alive(f)) return;
    const other: Venom = k === 'neuro' ? 'haemo' : 'neuro';
    if (dmg > 0) ctx.hit(f, dmg, f.x, f.y);
    if (d[other] > now()) {
      d.neuro = 0; d.haemo = 0;
      ctx.heal(f, CURE);
      ctx.float(f.x, f.y - 50, 'CROSSED — CURED', '#e8f0ff');
      ctx.sfx('heal');
    } else if (d[k] > now()) {
      d[k] = now() + DUR;
      ctx.hit(f, DOUBLE, f.x, f.y);
      ctx.float(f.x, f.y - 50, 'DOUBLED', k === 'neuro' ? '#c8f060' : '#ff8a7a');
      ctx.sfx('status-poison');
    } else {
      d[k] = now() + DUR;
      ctx.float(f.x, f.y - 50, k === 'neuro' ? 'NUMBED' : 'THINNED', k === 'neuro' ? '#c8f060' : '#ff8a7a');
      ctx.sfx(k === 'neuro' ? 'status-slow' : 'status-debuff');
    }
  }

  function strikeFrame(fr: Frame, by: 'player' | 'npc'): void {
    const time = now();
    if (time < fr.ready) return;
    fr.ready = time + REYOKE;
    fr.next = time + PERIOD;
    spit(fr, foeOf(by === 'player' ? player : npc), time);
    ctx.float(fr.x, fy - 90, 'MILKED', '#f0e8c0');
  }

  const cdRate = (f: Fighter): number => (has(f, 'neuro') ? 0.6 : 1);
  const speed = (f: Fighter): number => (has(f, 'neuro') ? 0.85 : 1);
  const taken = (f: Fighter): number => (has(f, 'haemo') ? 1.35 : 1);

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        frames[0].next = time + 1600; frames[1].next = time + 1600 + PERIOD / 2;
        for (const fr of frames) fr.target = ctx.target({ x: fr.x, y: fy - 20, r: 26, onStruck: (by) => strikeFrame(fr, by) });
      }
      if (!cut && npc.hp / npc.maxHp < 0.5) { cut = true; ctx.banner('The troughs are cut — every splash pools', '#e8f0c0'); ctx.sfx('splash'); }
      for (const fr of frames) if (time >= fr.next) { fr.next = time + PERIOD; spit(fr, player, time); }
      for (const gl of [...globs]) {
        if (time - gl.at < FLY_MS) continue;
        globs.splice(globs.indexOf(gl), 1);
        ctx.sfx('splash');
        for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, gl.x, gl.y) < SPLASH_R) dose(f, gl.kind, DOSE);
        if (cut) puddles.push({ kind: gl.kind, x: gl.x, y: gl.y, until: time + 4500, seed: rng() * 6 });
      }
      for (const p of [...puddles]) {
        if (time > p.until) { puddles.splice(puddles.indexOf(p), 1); continue; }
        for (const f of [player, npc]) {
          const d = doses.get(f);
          if (!d || !alive(f) || time - d.lastWade < 1200 || dist(f.x, f.y, p.x, p.y) > 40) continue;
          d.lastWade = time;
          dose(f, p.kind, 0);
        }
      }
    },

    playerCooldownRate: () => cdRate(player),
    npcCooldownRate: () => cdRate(npc),
    playerSpeedMult: () => speed(player),
    npcSpeedMult: () => speed(npc),
    playerTakenMult: () => taken(player),
    npcTakenMult: () => taken(npc),

    npcSeek() {
      if (!alive(player)) return null;
      // Carrying a dose: step into the other colour, glob or puddle, to be cured.
      for (const k of ['neuro', 'haemo'] as Venom[]) {
        if (!has(npc, k)) continue;
        const other: Venom = k === 'neuro' ? 'haemo' : 'neuro';
        const gl = globs.find((g) => g.kind === other && dist(g.x, g.y, npc.x, npc.y) < 260);
        if (gl) return { x: gl.x, y: gl.y };
        const p = puddles.find((q) => q.kind === other);
        if (p) return { x: p.x, y: p.y };
      }
      // The player carries one: milk the same serpent at them.
      for (const fr of frames) {
        if (has(player, fr.kind) && now() >= fr.ready && !globs.some((g) => g.kind !== fr.kind && dist(g.x, g.y, npc.x, npc.y) < SPLASH_R + 30)) {
          return { x: fr.x + (fr.x < W / 2 ? 40 : -40), y: fy + 18 };
        }
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 220, y = player.y + Math.sin(a) * 220;
      for (const g of globs) {
        if (dist(g.x, g.y, x, y) < SPLASH_R + 30) { const b = Math.atan2(y - g.y, x - g.x); x = g.x + Math.cos(b) * (SPLASH_R + 40); y = g.y + Math.sin(b) * (SPLASH_R + 40); }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 80, H - 40) };
    },

    drawGround(g, time) {
      for (const p of puddles) drawPuddle(g, p, time);
      for (const gl of globs) {
        const k = clamp((time - gl.at) / FLY_MS, 0, 1);
        g.fillStyle(col(gl.kind), 0.08 + k * 0.1); g.fillCircle(gl.x, gl.y, SPLASH_R);
        g.fillStyle(col(gl.kind), 0.18);
        g.slice(gl.x, gl.y, SPLASH_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        g.lineStyle(2, colLit(gl.kind), 0.45 + k * 0.45); g.strokeCircle(gl.x, gl.y, SPLASH_R);
        g.fillStyle(0x000000, 0.25 * k); g.fillEllipse(gl.x, gl.y, 10 + k * 14, 5 + k * 5);
      }
      for (const fr of frames) drawFrameBase(g, fr, time);
      // Doses worn on each fighter: a ring of nerve-sparks (green) or of blood-beads (red), its arc the time left.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const d = doses.get(f);
        if (!d) continue;
        let ring = 0;
        for (const k of ['neuro', 'haemo'] as Venom[]) {
          const left = d[k] - time;
          if (left <= 0) continue;
          const r = 30 + ring * 8; ring++;
          g.lineStyle(2, col(k), 0.7); g.beginPath(); g.arc(f.x, f.y + 6, r, -Math.PI / 2, -Math.PI / 2 + (left / DUR) * Math.PI * 2, false); g.strokePath();
          for (let i = 0; i < 6; i++) {
            const b = (i / 6) * Math.PI * 2 + time / (k === 'neuro' ? 300 : 900);
            const x = f.x + Math.cos(b) * r, y = f.y + 6 + Math.sin(b) * r * 0.5;
            if (k === 'neuro') { g.lineStyle(1.2, VENOM_LIT, 0.8); g.lineBetween(x - 3, y - 2, x, y + 1); g.lineBetween(x, y + 1, x + 3, y - 2); }
            else { g.fillStyle(HAEMO, 0.9); g.fillCircle(x, y, 2.2); g.fillStyle(HAEMO_LIT, 0.8); g.fillCircle(x - 0.6, y - 0.8, 0.8); }
          }
        }
      }
    },

    drawAir(g, time) {
      for (const fr of frames) drawSerpent(g, fr, time);
      for (const gl of globs) {
        const k = clamp((time - gl.at) / FLY_MS, 0, 1);
        const p = arcPoint(gl.fx, gl.fy, gl.x, gl.y, 150, k);
        const q = arcPoint(gl.fx, gl.fy, gl.x, gl.y, 150, Math.max(0, k - 0.06));
        g.lineStyle(4, col(gl.kind), 0.35); g.lineBetween(q.x, q.y, p.x, p.y);
        g.fillStyle(dim(col(gl.kind), 0.3), 1); g.fillCircle(p.x, p.y + 1, 7);
        g.fillStyle(col(gl.kind), 1); g.fillCircle(p.x, p.y, 6);
        g.fillStyle(colLit(gl.kind), 0.9); g.fillCircle(p.x - 2, p.y - 2, 2);
      }
    },

    drawHud(g, time) {
      // Bottom centre: each serpent's gland, filling toward its next spit; a tick when it is ready to be milked.
      for (const [i, fr] of frames.entries()) {
        const x = W / 2 - 46 + i * 92, y = H - 24;
        const k = clamp(1 - (fr.next - time) / PERIOD, 0, 1);
        g.fillStyle(0x0e140e, 0.7); g.fillRoundedRect(x - 36, y - 16, 72, 30, 8);
        g.fillStyle(dim(col(fr.kind), 0.6), 1); g.fillCircle(x - 16, y, 10);
        g.fillStyle(col(fr.kind), 1); g.fillRect(x - 26, y + 10 - 20 * k, 20, 20 * k);
        g.lineStyle(1.5, GLASS, 0.9); g.strokeCircle(x - 16, y, 10);
        const ready = time >= fr.ready;
        g.fillStyle(ready ? FANG_LIT : 0x3a3a30, 1); g.fillTriangle(x + 6, y - 6, x + 6, y + 6, x + 18, y);
        g.lineStyle(1.5, ready ? colLit(fr.kind) : 0x3a3a30, 1); g.strokeCircle(x + 22, y, 5);
      }
    },
  };

  /** The frame's footing: two posts in the mud, a wicker coil-basket, the milking glass below the yoke. */
  function drawFrameBase(g: G, fr: Frame, time: number): void {
    shadow(g, fr.x, fy + 6, 120, 20, 0.3);
    g.fillStyle(WICKER_DARK, 1); g.fillEllipse(fr.x, fy + 2, 54, 22);
    g.fillStyle(WICKER, 1); g.fillEllipse(fr.x, fy - 1, 50, 18);
    for (let i = 0; i < 9; i++) { g.lineStyle(1, WICKER_DARK, 0.8); g.lineBetween(fr.x - 22 + i * 5.5, fy - 9, fr.x - 24 + i * 5.5, fy + 8); }
    const mx = fr.x + (fr.kind === 'neuro' ? 28 : -28);
    // The milking glass: a squat jar with a skin stretched over its mouth, the milk at the bottom.
    g.fillStyle(dim(GLASS, 0.3), 0.6); g.fillRoundedRect(mx - 9, fy - 20, 18, 22, 4);
    g.fillStyle(col(fr.kind), 0.75); g.fillRect(mx - 8, fy - 6 - Math.sin(time / 800) * 1, 16, 7);
    g.lineStyle(1.5, lit(GLASS, 0.4), 0.9); g.strokeRoundedRect(mx - 9, fy - 20, 18, 22, 4);
    g.fillStyle(0xe8e0c8, 0.8); g.fillEllipse(mx, fy - 20, 20, 5);
  }

  /** The yoke and its serpent: a timber gallows, a collar on the crossbar, the neck, the gland glass. */
  function drawSerpent(g: G, fr: Frame, time: number): void {
    const dir = fr.kind === 'neuro' ? 1 : -1;
    const x0 = fr.x - 34, x1 = fr.x + 34, bar = fy - 78;
    for (const x of [x0, x1]) { g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 4, bar, 8, 80); g.fillStyle(TIMBER, 1); g.fillRect(x - 3, bar, 4, 80); }
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 - 8, bar - 6, 84, 9); g.fillStyle(TIMBER_LIT, 1); g.fillRect(x0 - 8, bar - 6, 84, 3);
    // Gland glass hung on the near post, filling as the next spit comes.
    const k = clamp(1 - (fr.next - time) / PERIOD, 0, 1);
    const gx = dir > 0 ? x0 : x1;
    g.fillStyle(dim(col(fr.kind), 0.7), 0.8); g.fillCircle(gx, bar + 26, 9);
    g.fillStyle(col(fr.kind), 0.9); g.fillRect(gx - 8, bar + 35 - 18 * k, 16, 18 * k);
    g.lineStyle(1.5, GLASS, 0.9); g.strokeCircle(gx, bar + 26, 9);
    if (k > 0.8) glow(g, gx, bar + 26, 16, colLit(fr.kind), 0.05, 3);
    const rear = clamp(1 - (time - fr.rear) / 500, 0, 1);
    if (fr.kind === 'haemo') {
      // The cobra, risen out of the basket and through the collar, hood spread.
      risenCobra(g, fr.x, fy - 6, 88 + rear * 6, Math.sin(time / 600) * 0.4 - 0.5, rear, 1);
      g.fillStyle(HAEMO, 0.8); g.fillCircle(fr.x - 8, fy - 98, 2 + rear * 2);
    } else {
      // The viper: a thick green neck in chevrons up through the collar, the head bent over the glass.
      const sway = Math.sin(time / 700) * 3;
      const pts = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return { x: fr.x + Math.sin(t * 4) * 6 + t * 18 + sway * t, y: fy - 4 - t * 86 }; });
      for (const [i, p] of pts.entries()) {
        g.fillStyle(dim(VIPER, 0.35), 1); g.fillCircle(p.x, p.y + 1, 7 - i * 0.2);
        g.fillStyle(VIPER, 1); g.fillCircle(p.x, p.y, 6 - i * 0.2);
        if (i % 2) { g.lineStyle(1.5, VIPER_BAND, 0.9); g.lineBetween(p.x - 4, p.y - 2, p.x, p.y + 2); g.lineBetween(p.x, p.y + 2, p.x + 4, p.y - 2); }
      }
      const h = pts[8];
      const hx = h.x + 10 + rear * 4, hy = h.y + 4 - rear * 6;
      g.fillStyle(dim(VIPER, 0.3), 1); g.fillTriangle(h.x - 4, h.y - 6, h.x - 4, h.y + 6, hx + 10, hy + 1);
      g.fillStyle(VIPER, 1); g.fillTriangle(h.x - 3, h.y - 5, h.x - 3, h.y + 5, hx + 8, hy);
      g.fillStyle(VENIN_EYE, 1); g.fillCircle(hx - 1, hy - 3, 1.6);
      if (rear > 0.2) { g.fillStyle(FANG_LIT, 1); g.fillTriangle(hx + 3, hy + 1, hx + 5, hy + 1, hx + 4, hy + 6); }
      g.fillStyle(VENOM_DARK, 0.9); g.fillCircle(hx + 4, hy + 8 + ((time / 200) % 1) * 30, 1.6);
    }
    // The collar on the crossbar.
    const cx = fr.x + (fr.kind === 'neuro' ? 14 : -2);
    g.lineStyle(4, TIMBER_DARK, 1); g.strokeEllipse(cx, bar + 2, 20, 10);
    g.lineStyle(1.5, COBRA, 0.8); g.strokeEllipse(cx, bar + 1, 20, 10);
    if (time < fr.ready) { g.lineStyle(2, 0xf0e8c0, 0.5); g.strokeCircle(fr.x, fy - 20, 26); }
  }

  /** A puddle of spilt venom in its own colour: lobes, a crusted rim, bubbles rising. */
  function drawPuddle(g: G, p: Puddle, time: number): void {
    const a = clamp((p.until - time) / 1200, 0, 1);
    for (let i = 0; i < 6; i++) {
      const b = p.seed + i * 1.05;
      g.fillStyle(dim(col(p.kind), 0.45), 0.5 * a); g.fillEllipse(p.x + Math.cos(b) * 16, p.y + Math.sin(b) * 9, 40, 24);
    }
    g.fillStyle(col(p.kind), 0.38 * a); g.fillEllipse(p.x, p.y, 74, 44);
    g.lineStyle(1.5, colLit(p.kind), 0.5 * a); g.strokeEllipse(p.x, p.y, 80, 48);
    for (let i = 0; i < 3; i++) {
      const ph = (time / 800 + i / 3 + p.seed) % 1;
      g.lineStyle(1, colLit(p.kind), 0.6 * a * (1 - ph)); g.strokeCircle(p.x + Math.cos(p.seed + i * 2) * 14, p.y + Math.sin(p.seed + i * 2) * 8, 2 + ph * 6);
    }
  }
}

export const FALLEN_GLANDS: GimmickDef = {
  id: ID,
  rules: 'Green venom numbs, red thins the blood; the same twice bites double, the other cures. Strike a frame and its serpent spits at your foe.',
  make,
};
