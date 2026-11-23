import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { roller } from '../art';
import { GOLD, LIME_DRY, LIME_SHADE, LIME_WET, STONE_DARK } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Whitewash — Censor Limewash.
 *
 * The Office of Clarity sends its censors through the yard with whitewash rollers as wide as a
 * cart, liming over everything — the flags, the stains, anyone too slow to get out of the way.
 * Each roller is chalked onto the floor first (its lane, an arrow at the wall it comes in by),
 * then a hooded censor shoves it through at a little under a walk. Caught, you are painted
 * white: slowed while the lime is wet, and *marked* for a while after — every blow on a
 * whitewashed fighter lands harder. Limewash is a censor of the dead kind: he likes his subjects
 * blank.
 *
 * But a censor is only a man with a pole. Strike a roller twice and he loses his footing: the
 * drum rolls back the way it came, over whoever is behind it — Limewash, with any luck.
 */

const BAND = 24;
const WET_MS = 3000;
const MARK_MS = 7000;
const MARK_MULT = 1.35;

interface Roller {
  /** Travels along x (a vertical drum) or along y (a horizontal drum). */
  alongX: boolean;
  /** Leading coordinate along the travel axis, and the centre across it. */
  pos: number; c: number; len: number;
  dir: 1 | -1;
  speed: number;
  warnAt: number; goAt: number;
  /** Where it entered, for the lime it lays behind it. */
  startPos: number;
  caught: Set<Fighter>;
  struck: number;
  reversedAt: number;
  target: StrikeTarget | null;
  /** Lime trail segments laid down: [from, to, at]. */
  trail: { a: number; b: number; at: number }[];
}

interface Paint { wetUntil: number; markUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const rollers: Roller[] = [];
  const paint = new Map<Fighter, Paint>([[player, { wetUntil: 0, markUntil: 0 }], [npc, { wetUntil: 0, markUntil: 0 }]]);
  const EVERY = ctx.hard ? 2700 : 3400;
  const WARN = 1100;
  const STRIKES = ctx.hard ? 3 : 2;
  let next = 0;
  let started = false;

  const drumAt = (r: Roller): Pt => (r.alongX ? { x: r.pos, y: r.c } : { x: r.c, y: r.pos });
  const inBand = (r: Roller, f: Fighter) => {
    const along = r.alongX ? f.x : f.y, across = r.alongX ? f.y : f.x;
    return Math.abs(along - r.pos) < BAND + 6 && Math.abs(across - r.c) < r.len / 2 + 8;
  };
  /** Will the roller's lane sweep across this point (ahead of it)? */
  const inLane = (r: Roller, x: number, y: number, pad = 30) => {
    const along = r.alongX ? x : y, across = r.alongX ? y : x;
    return Math.abs(across - r.c) < r.len / 2 + pad && (along - r.pos) * r.dir > -BAND;
  };

  function spawn(time: number): void {
    const alongX = rng() < 0.55;
    const len = ctx.hard ? 290 : 250;
    const lo = alongX ? top + len / 2 - 20 : len / 2 - 20, hi = alongX ? H - len / 2 + 20 : W - len / 2 + 20;
    const aim = alongX ? player.y : player.x;
    const c = clamp(aim + (rng() - 0.5) * 140, lo, hi);
    const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const start = dir > 0 ? -40 : (alongX ? W : H) + 40;
    const r: Roller = {
      alongX, pos: start, c, len, dir, speed: ctx.hard ? 185 : 160, warnAt: time, goAt: time + WARN,
      startPos: start, caught: new Set(), struck: 0, reversedAt: -1, target: null, trail: [],
    };
    r.target = ctx.target({
      ...drumAt(r), r: 30,
      onStruck: () => {
        const now = ctx.scene.time.now;
        if (now < r.goAt || now - r.reversedAt < 900) return;
        r.struck++;
        ctx.sfx('clang');
        if (r.struck >= STRIKES) {
          r.struck = 0;
          r.dir = r.dir > 0 ? -1 : 1;
          r.reversedAt = now;
          r.caught.clear();
          r.speed *= 1.15;
          const d = drumAt(r);
          ctx.float(d.x, d.y - 40, 'ROLLED BACK!', '#e8f4ff');
          ctx.sfx('boing');
        }
      },
    });
    rollers.push(r);
    ctx.sfx('trap-set');
  }

  function catchFighter(r: Roller, f: Fighter, time: number): void {
    r.caught.add(f);
    const p = paint.get(f);
    if (!p) return;
    p.wetUntil = time + WET_MS;
    p.markUntil = time + MARK_MS;
    ctx.hit(f, ctx.hard ? 8 : 6, f.x, f.y);
    const push = 34 * r.dir;
    ctx.nudge(f, r.alongX ? push : 0, r.alongX ? 0 : push);
    ctx.float(f.x, f.y - 46, f === player ? 'WHITEWASHED' : 'LIMEWASH LIMED!', '#f6f6f2');
    ctx.sfx('splash');
  }

  const marked = (f: Fighter) => ctx.scene.time.now < (paint.get(f)?.markUntil ?? 0);
  const wet = (f: Fighter) => ctx.scene.time.now < (paint.get(f)?.wetUntil ?? 0);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; next = time + 1200; }
      if (time >= next) {
        next = time + EVERY;
        if (rollers.filter((r) => r.target).length < 3) spawn(time);
      }
      for (let i = rollers.length - 1; i >= 0; i--) {
        const r = rollers[i];
        if (time < r.goAt) continue;
        const end = r.alongX ? W : H;
        if (r.target && (r.pos < -80 || r.pos > end + 80)) { r.target.remove(); r.target = null; }
        if (!r.target) {
          // Off the yard: leave the lime to dry, then forget the roller.
          r.trail = r.trail.filter((s) => time - s.at < 4000);
          if (!r.trail.length) rollers.splice(i, 1);
          continue;
        }
        const before = r.pos;
        r.pos += r.dir * r.speed * dt;
        r.trail.push({ a: before, b: r.pos, at: time });
        if (r.trail.length > 400) r.trail.shift();
        const d = drumAt(r);
        r.target.moveTo(d.x, d.y);
        for (const f of [player, npc]) {
          if (!alive(f) || r.caught.has(f) || ctx.isAirborne(f)) continue;
          if (inBand(r, f)) catchFighter(r, f, time);
        }
      }
    },

    playerSpeedMult() { return wet(player) ? 0.6 : 1; },
    npcSpeedMult() { return wet(npc) ? 0.6 : 1; },
    playerTakenMult() { return marked(player) ? MARK_MULT : 1; },
    npcTakenMult() { return marked(npc) ? MARK_MULT : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      // Out of any lane that is about to roll over him: step clear across it.
      for (const r of rollers) {
        if (r.pos < -60 && r.dir < 0) continue;
        if (!inLane(r, npc.x, npc.y)) continue;
        const across = r.alongX ? npc.y : npc.x;
        const out = across < r.c ? r.c - r.len / 2 - 70 : r.c + r.len / 2 + 70;
        const safe = r.alongX ? { x: npc.x, y: out } : { x: out, y: npc.y };
        if (safe.x > 50 && safe.x < W - 50 && safe.y > top + 40 && safe.y < H - 30) return safe;
        const other = across < r.c ? r.c + r.len / 2 + 70 : r.c - r.len / 2 - 70;
        return r.alongX ? { x: npc.x, y: clamp(other, top + 40, H - 30) } : { x: clamp(other, 50, W - 50), y: npc.y };
      }
      // A whitewashed foe is a soft foe: close in while the mark is on.
      const close = marked(player) ? 120 : 250;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.sin(now / 2000) * 0.4;
      return { x: clamp(player.x + Math.cos(a) * close, 60, W - 60), y: clamp(player.y + Math.sin(a) * close, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const r of rollers) {
        // The chalked lane and an arrow at the wall it comes in by.
        if (time < r.goAt + 400) {
          const k = clamp((time - r.warnAt) / WARN, 0, 1);
          const a = time < r.goAt ? 0.15 + k * 0.25 : 0.4 * (1 - (time - r.goAt) / 400);
          const x0 = r.alongX ? 0 : r.c - r.len / 2, y0 = r.alongX ? r.c - r.len / 2 : top;
          const w = r.alongX ? W : r.len, h = r.alongX ? r.len : H - top;
          g.fillStyle(LIME_WET, a * 0.5); g.fillRect(x0, y0, w, h);
          g.lineStyle(2, 0xffffff, a + 0.2);
          // Dashed chalk edges.
          for (let s = 0; s < (r.alongX ? W : H - top); s += 26) {
            if (r.alongX) { g.lineBetween(s, y0, s + 14, y0); g.lineBetween(s, y0 + h, s + 14, y0 + h); }
            else { g.lineBetween(x0, top + s, x0, top + s + 14); g.lineBetween(x0 + w, top + s, x0 + w, top + s + 14); }
          }
          // Chevrons pointing the way it will roll.
          for (let s = 0; s < 6; s++) {
            const along = (r.dir > 0 ? 60 : (r.alongX ? W : H) - 60) + r.dir * s * 70 + r.dir * ((time / 12) % 70);
            const cx = r.alongX ? along : r.c, cy = r.alongX ? r.c : along;
            const ax = r.alongX ? r.dir : 0, ay = r.alongX ? 0 : r.dir;
            g.lineStyle(3, 0xffffff, a + 0.15);
            g.lineBetween(cx - ax * 10 - ay * 14, cy - ay * 10 - ax * 14, cx + ax * 6, cy + ay * 6);
            g.lineBetween(cx - ax * 10 + ay * 14, cy - ay * 10 + ax * 14, cx + ax * 6, cy + ay * 6);
          }
        }
        // The lime it has laid: a broad wet stripe drying to chalk.
        for (const s of r.trail) {
          const age = time - s.at;
          if (age > 4000) continue;
          const wetness = clamp(1 - age / 1500, 0, 1);
          const fade = clamp(1 - (age - 2500) / 1500, 0, 1);
          const from = Math.min(s.a, s.b), span = Math.abs(s.b - s.a) + 1;
          g.fillStyle(wetness > 0 ? LIME_WET : LIME_DRY, 0.55 * fade);
          if (r.alongX) g.fillRect(from, r.c - r.len / 2, span, r.len);
          else g.fillRect(r.c - r.len / 2, from, r.len, span);
        }
      }
    },

    drawAir(g, time) {
      for (const r of rollers) {
        if (time < r.goAt) continue;
        const d = drumAt(r);
        // The censor behind the drum, leaning on the pole: hooded, white, faceless.
        const back = r.alongX ? { x: -r.dir, y: 0 } : { x: 0, y: -r.dir };
        const pole = 64;
        const cx = d.x + back.x * pole, cy = d.y + back.y * pole;
        const stagger = time - r.reversedAt < 900 ? Math.sin(time / 40) * 6 : 0;
        g.fillStyle(0x000000, 0.18); g.fillEllipse(cx, cy + 16, 26, 8);
        g.fillStyle(LIME_SHADE, 1); g.fillTriangle(cx - 12 + stagger, cy + 14, cx + 12 + stagger, cy + 14, cx + stagger, cy - 22);
        g.fillStyle(LIME_DRY, 1); g.fillTriangle(cx - 10 + stagger, cy + 12, cx + 10 + stagger, cy + 12, cx + stagger, cy - 20);
        g.fillStyle(LIME_DRY, 1); g.fillCircle(cx + stagger, cy - 24, 8);
        g.fillStyle(0x30343a, 1); g.fillEllipse(cx + stagger + back.x * -2, cy - 23, 8, 6);
        g.fillStyle(GOLD, 1); g.fillCircle(cx + stagger, cy - 6, 2.5);
        const ang = Math.atan2(cy - d.y, cx - d.x);
        roller(g, d.x, d.y, r.len, ang, true, pole - 10);
        // Drips off the drum.
        for (let i = 0; i < 6; i++) {
          const k = (i + 0.5) / 6 - 0.5;
          const px = r.alongX ? d.x - r.dir * 6 : d.x + k * r.len, py = r.alongX ? d.y + k * r.len : d.y - r.dir * 6;
          g.fillStyle(LIME_WET, 0.8); g.fillCircle(px, py + ((time / 8 + i * 13) % 10), 2);
        }
        // Struck once: a dent and a wobble.
        if (r.struck > 0) { g.lineStyle(2, STONE_DARK, 0.8); g.strokeCircle(d.x, d.y, 16 + Math.sin(time / 50) * 2); }
      }
      // Whitewashed fighters: a coat of lime running off them, a censor's stamp while marked.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const p = paint.get(f);
        if (!p || time > p.markUntil) continue;
        const w = time < p.wetUntil;
        g.fillStyle(w ? LIME_WET : LIME_DRY, w ? 0.55 : 0.3); g.fillEllipse(f.x, f.y - 4, 40, 46);
        if (w) for (let i = 0; i < 5; i++) { g.fillStyle(LIME_WET, 0.85); g.fillEllipse(f.x - 14 + i * 7, f.y + 10 + ((time / 10 + i * 17) % 14), 3, 6); }
        // The stamp: a white square with the Office's sun, over the head.
        const k = clamp((p.markUntil - time) / MARK_MS, 0, 1);
        g.fillStyle(LIME_DRY, 0.9); g.fillRect(f.x - 9, f.y - 62, 18, 14);
        g.lineStyle(1.5, GOLD, 1); g.strokeRect(f.x - 9, f.y - 62, 18, 14);
        g.fillStyle(GOLD, 1); g.fillCircle(f.x, f.y - 55, 3);
        g.lineStyle(2, GOLD, 0.8); g.beginPath(); g.arc(f.x, f.y - 55, 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    destroy() { for (const r of rollers) r.target?.remove(); rollers.length = 0; },
  };
}

export const WHITEWASH: GimmickDef = {
  id: 'mural-whitewash',
  rules: 'Censors roll whitewash across chalked lanes. Caught, you are slowed while wet and take 35% more for a while. Strike a roller twice to send it back.',
  make,
};
