import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { GREEN, OBS, bellJar, greenLeaf, seatGlyph } from '../art';
import { WHO, type Who, alive, clamp, dist, fighterOf, inField, stepDt } from './util';

/**
 * Decree of the Bell Jar — Councilor Amaranth Vell, Seat of Green (life).
 *
 * The clause that put the sapling under glass: *what thrives is kept.* Every point of health a
 * fighter gains fills their jar — healing, lifesteal, regrowth, and (slowly) simply being in
 * full flower above three-quarters health. Full, the bell jar comes down out of the dark on them:
 * its shadow hunts them, then locks, then the glass drops. Caught, they are KEPT — rooted and
 * silenced under the glass. But the glass is thin: the first blow on a kept fighter shatters the
 * jar for 20 more. A jar that drops on nothing stands empty for a while, and an empty jar stops
 * shots dead — cover, for whoever is beside it.
 *
 * Life perfected heals constantly, so the jar hunts the councilor far more often than you —
 * unless you out-heal her. Make her heal; then make the glass land.
 */

const KEEP = 40;
const JAR_R = 50;
const FOLLOW_MS = 1300;
const LOCK_MS = 700;
const DROP_MS = 240;
const KEPT_MS = 2600;
const SHATTER = 20;
const EMPTY_MS = 6000;
const FLOURISH_PER_S = 2.2;

interface Falling { who: Who; x: number; y: number; at: number; phase: 'follow' | 'lock' | 'drop' }
interface Standing { x: number; y: number; until: number; kept: Who | null; shattered: number; born: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const keepAt = ctx.hard ? 34 : KEEP;
  const meter: Record<Who, number> = { player: 0, npc: 0 };
  const lastHp: Record<Who, number> = { player: -1, npc: -1 };
  const keptUntil: Record<Who, number> = { player: 0, npc: 0 };
  let falling: Falling | null = null;
  const jars: Standing[] = [];
  let shattering = false;
  const now = (): number => ctx.scene.time.now;

  const startJar = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    falling = { who: w, x: f.x, y: f.y, at: time + FOLLOW_MS * (ctx.hard ? 0.85 : 1), phase: 'follow' };
    meter[w] = 0;
    ctx.banner(w === 'npc' ? 'THE COUNCILOR THRIVES — THE JAR COMES DOWN' : 'YOU THRIVE — THE JAR COMES DOWN', '#b8ffb0');
    ctx.sfx('beam-charge');
  };

  const land = (time: number, j: Falling) => {
    ctx.sfx('crystal-chime');
    ctx.sfx('stone-slam');
    let kept: Who | null = null;
    for (const w of WHO) {
      const f = fighterOf(ctx, w);
      if (!alive(f) || dist(f.x, f.y, j.x, j.y) > JAR_R + 4) continue;
      // Both can be caught; the first one in the list owns the jar, the other is kept beside it.
      kept = kept ?? w;
      keptUntil[w] = time + KEPT_MS;
      ctx.root(f, KEPT_MS);
      ctx.silence(f, KEPT_MS);
      meter[w] = 0;
      ctx.float(f.x, f.y - 58, 'KEPT', '#d8ffd0');
    }
    jars.push({ x: j.x, y: j.y, until: time + (kept ? KEPT_MS : EMPTY_MS), kept, shattered: 0, born: time });
    if (!kept) ctx.float(j.x, j.y - 70, 'EMPTY JAR', '#cfe8ff');
  };

  const shatter = (w: Who) => {
    const jar = jars.find((j) => j.kept === w && j.shattered === 0);
    if (!jar) return;
    jar.shattered = now();
    jar.until = now() + 500;
    keptUntil[w] = 0;
    const f = fighterOf(ctx, w);
    shattering = true;
    ctx.hit(f, SHATTER, f.x, f.y - 20);
    shattering = false;
    ctx.float(f.x, f.y - 70, 'SHATTERED', '#ffffff');
    ctx.flash(f.x, f.y, 0xe8f4ff);
    ctx.sfx('crystal-shatter');
  };

  const hurt = (w: Who, amount: number) => {
    if (shattering || amount <= 0) return;
    if (now() < keptUntil[w]) shatter(w);
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        if (lastHp[w] < 0) lastHp[w] = f.hp;
        const gained = f.hp - lastHp[w];
        lastHp[w] = f.hp;
        const busy = (falling !== null && falling.who === w) || time < keptUntil[w];
        if (busy) continue;
        if (gained > 0 && gained < 200) meter[w] += gained;
        if (f.hp / f.maxHp > 0.75) meter[w] += FLOURISH_PER_S * dt;
        meter[w] = Math.min(keepAt, meter[w]);
      }
      const j = falling as Falling | null;
      if (j) {
        const f = fighterOf(ctx, j.who);
        if (j.phase === 'follow') {
          // The shadow hunts: it eases after its quarry, a step behind.
          const k = Math.min(1, dt * 4.5);
          j.x += (f.x - j.x) * k; j.y += (f.y - j.y) * k;
          if (time >= j.at) { j.phase = 'lock'; j.at = time + ctx.tk.warn(LOCK_MS); ctx.sfx('trap-set'); }
        } else if (j.phase === 'lock') {
          if (time >= j.at) { j.phase = 'drop'; j.at = time + DROP_MS; ctx.sfx('whoosh'); }
        } else if (time >= j.at) {
          falling = null;
          land(time, j);
        }
      } else {
        // Whoever is fuller goes first if both are ready.
        const ready = WHO.filter((w) => meter[w] >= keepAt && alive(fighterOf(ctx, w)) && time >= keptUntil[w]);
        if (ready.length) startJar(ready.sort((a, b) => meter[b] - meter[a])[0], time);
      }
      for (let i = jars.length - 1; i >= 0; i--) {
        const s = jars[i];
        if (time >= s.until) { jars.splice(i, 1); continue; }
        // An empty jar is a wall of glass: any shot that reaches it stops.
        if (!s.kept) for (const h of ctx.shotsNear(s.x, s.y - 20, JAR_R + 6)) h.block();
      }
    },

    onPlayerHurt(a) { hurt('player', a); },
    onNpcHurt(a) { hurt('npc', a); },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const j = falling as Falling | null;
      if (j && j.who === 'npc') {
        // Run from the glass: away from the shadow, and further once it locks.
        const a = Math.atan2(n.y - j.y, n.x - j.x) + (j.phase === 'follow' ? 0.9 : 0);
        return inField(ctx, n.x + Math.cos(a) * 180, n.y + Math.sin(a) * 180, 70);
      }
      // A kept player is a free shatter.
      if (now() < keptUntil.player) return { x: p.x, y: p.y };
      if (j && j.who === 'player' && j.phase === 'lock') return { x: p.x + (n.x - p.x) * 0.5, y: p.y + (n.y - p.y) * 0.5 };
      // Shelter behind an empty jar from the player's line of fire.
      const empty = jars.find((s) => !s.kept);
      if (empty) {
        const a = Math.atan2(empty.y - p.y, empty.x - p.x);
        return inField(ctx, empty.x + Math.cos(a) * (JAR_R + 34), empty.y + Math.sin(a) * (JAR_R + 34));
      }
      return null;
    },

    drawGround(g, time) {
      const j = falling as Falling | null;
      if (j) {
        const lock = j.phase !== 'follow';
        const k = j.phase === 'follow' ? 0.4 : j.phase === 'lock' ? clamp(1 - (j.at - time) / ctx.tk.warn(LOCK_MS), 0, 1) : 1;
        // The jar's shadow on the glass floor: dark, ringed, and tighter as it comes down.
        g.fillStyle(0x000000, 0.25 + k * 0.35); g.fillEllipse(j.x, j.y + 6, JAR_R * 2 * (1.3 - k * 0.3), JAR_R * 0.8 * (1.3 - k * 0.3));
        g.lineStyle(2, lock ? 0xffffff : GREEN.vineLit, lock ? 0.5 + 0.4 * Math.sin(time / 60) : 0.5);
        g.strokeEllipse(j.x, j.y + 6, JAR_R * 2, JAR_R * 0.8);
        if (lock) { g.lineStyle(1, OBS.seamLit, 0.6); g.strokeCircle(j.x, j.y, JAR_R + 8 - k * 8); }
      }
      for (const s of jars) {
        if (s.kept) continue;
        g.fillStyle(0x000000, 0.28); g.fillEllipse(s.x, s.y + 6, JAR_R * 2.1, JAR_R * 0.6);
      }
    },

    drawAir(g, time) {
      const j = falling as Falling | null;
      if (j) {
        // The jar itself, high up — sliding down out of the dark.
        const drop = j.phase === 'drop' ? clamp(1 - (j.at - time) / DROP_MS, 0, 1) : 0;
        const hover = j.phase === 'follow' ? 300 : j.phase === 'lock' ? 240 : 240 * (1 - drop * drop);
        bellJar(g, j.x, j.y - hover, JAR_R, 128, { alpha: 0.65 + drop * 0.35 });
        g.lineStyle(2, OBS.facet, 0.9); g.lineBetween(j.x, j.y - hover - 134, j.x, j.y - hover - 700);
      }
      for (const s of jars) {
        const age = time - s.born;
        if (s.shattered) {
          const k = clamp((time - s.shattered) / 500, 0, 1);
          for (let i = 0; i < 14; i++) {
            const a = i * 0.45 + 0.2;
            const d = 16 + k * (60 + (i % 4) * 18);
            g.fillStyle(0xe8f4ff, 0.85 * (1 - k));
            g.fillTriangle(s.x + Math.cos(a) * d, s.y - 50 + Math.sin(a) * d * 0.7 + k * k * 40, s.x + Math.cos(a + 0.12) * (d + 9), s.y - 50 + Math.sin(a + 0.12) * (d + 9) * 0.7 + k * k * 40, s.x + Math.cos(a) * (d + 4), s.y - 44 + Math.sin(a) * d * 0.7 + k * k * 40);
          }
          continue;
        }
        const fade = clamp((s.until - time) / 400, 0, 1);
        const crack = s.kept ? 0.15 : clamp(age / EMPTY_MS, 0, 1) * 0.8;
        if (s.kept) {
          // A specimen: green tendrils curling up the inside of the glass, a label on the rim.
          const k = clamp(age / KEPT_MS, 0, 1);
          for (let i = 0; i < 4; i++) {
            const sx = s.x - 30 + i * 20;
            const h = 20 + k * 60 * (0.6 + (i % 2) * 0.4);
            g.lineStyle(2, GREEN.vine, 0.8); g.lineBetween(sx, s.y, sx + Math.sin(time / 300 + i) * 5, s.y - h);
            greenLeaf(g, sx + Math.sin(time / 300 + i) * 5, s.y - h, -Math.PI / 2 + (i % 2 ? 0.7 : -0.7), 9, 0.9);
          }
          g.fillStyle(0xe8e0c8, 0.95); g.fillRect(s.x - 22, s.y - 10, 44, 13);
          g.lineStyle(1, OBS.glass, 0.6); g.strokeRect(s.x - 22, s.y - 10, 44, 13);
          seatGlyph(g, 'life', s.x - 14, s.y - 3.5, 4, GREEN.leafDark, 1);
          g.lineStyle(1, OBS.glass, 0.7); g.lineBetween(s.x - 6, s.y - 5, s.x + 16, s.y - 5); g.lineBetween(s.x - 6, s.y - 1, s.x + 10, s.y - 1);
        }
        bellJar(g, s.x, s.y + 4, JAR_R, 128, { alpha: fade, crack, tint: s.kept ? 0xd8ffd0 : 0xcfe8ff });
      }
    },

    drawHud(g, time) {
      // Two little jars at the top corners, filling green from the base: yours left, hers right.
      for (const w of WHO) {
        const x = w === 'player' ? 34 : ctx.W - 34, y = ctx.top + 52;
        const k = meter[w] / keepAt;
        const hot = k > 0.8 || (falling !== null && (falling as Falling).who === w);
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 20, y - 46, 40, 52, 8);
        g.fillStyle(GREEN.leaf, 0.75); g.fillRect(x - 13, y - 34 * k, 26, 34 * k);
        if (hot) { g.fillStyle(GREEN.glow, 0.25 + 0.2 * Math.sin(time / 90)); g.fillCircle(x, y - 18, 26); }
        bellJar(g, x, y, 14, 40, { alpha: 0.95 });
        g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(x - 15, y + 1, x + 15, y + 1);
      }
    },
  };
}

export const DECREE_BELL_JAR: GimmickDef = {
  id: 'bench-life-bell-jar',
  rules: 'Whoever thrives is kept: 40 health gained brings the bell jar down on them — rooted and silenced under glass, and the first blow shatters it for 20. An empty jar stops shots.',
  make,
};
