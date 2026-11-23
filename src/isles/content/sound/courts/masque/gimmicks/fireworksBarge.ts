import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { fireworkBurst, fireworksBarge } from '../art';
import { CANAL, CANAL_DEEP, FIREWORKS, FW_WHITE, ISTRIA, OAK_LIT, SEQ_GOLD } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Fireworks Barge — Pyrotechnist Gerbe.
 *
 * The fight is on the quay, and the barges are moored along the lagoon edge at the foot of the
 * floor. Every few seconds Gerbe sends a rocket up. Before it bursts, its pattern is chalked
 * onto the flagstones in coloured fire — a mask: the oval rim of a volto, a colombina's band and
 * feathers, Comedy's grin, Tragedy's frown and running tears. Every chalk mark explodes when the
 * rocket bursts. Find the gaps inside the mask — the cheeks, the forehead — and stand in them.
 *
 * A spent rocket's stick comes down burning where it burst. Walk over one to pick it up; your
 * next cast hurls it the way you are facing, and it bursts on the foe if it passes near. Gerbe
 * knows that too, and goes for the sticks.
 */

type Pattern = 'volto' | 'colombina' | 'comedy' | 'tragedy';
const PATTERNS: Pattern[] = ['volto', 'colombina', 'comedy', 'tragedy'];
const ZONE_R = 30;
const SCALE = 118;
const WARN_MS = 1700;
const ROCKET_EVERY = 4600;
const STICK_LIFE = 9000;
const STICK_DMG = 14;

/** A mask drawn as unit offsets: the zones that explode. */
function patternZones(p: Pattern): Pt[] {
  const out: Pt[] = [];
  const rim = (n: number, a0: number, a1: number) => {
    for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / Math.max(1, n - 1); out.push({ x: Math.cos(a), y: Math.sin(a) * 1.15 }); }
  };
  switch (p) {
    case 'volto':
      rim(12, 0, Math.PI * 2 * (11 / 12));
      out.push({ x: -0.42, y: -0.28 }, { x: 0.42, y: -0.28 }, { x: 0, y: 0.6 });
      break;
    case 'colombina':
      for (const x of [-1, -0.7, 0, 0.7, 1]) out.push({ x, y: -0.15 });
      out.push({ x: -0.35, y: 0.05 }, { x: 0.35, y: 0.05 }, { x: -0.35, y: -0.42 }, { x: 0.35, y: -0.42 });
      for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.5 + i * 0.28; out.push({ x: 0.75 + Math.cos(a) * 0.65, y: -0.35 + Math.sin(a) * 0.9 }); }
      break;
    case 'comedy':
      rim(7, Math.PI * 1.05, Math.PI * 1.95);
      for (let i = 0; i < 6; i++) { const a = 0.25 + (i / 5) * (Math.PI - 0.5); out.push({ x: Math.cos(a) * 0.72, y: 0.2 + Math.sin(a) * 0.55 }); }
      out.push({ x: -0.42, y: -0.32 }, { x: 0.42, y: -0.32 });
      break;
    case 'tragedy':
      rim(7, Math.PI * 1.05, Math.PI * 1.95);
      for (let i = 0; i < 5; i++) { const a = Math.PI + 0.35 + (i / 4) * (Math.PI - 0.7); out.push({ x: Math.cos(a) * 0.65, y: 1.05 + Math.sin(a) * 0.5 }); }
      out.push({ x: -0.42, y: -0.2 }, { x: 0.42, y: -0.2 });
      for (let i = 1; i <= 3; i++) out.push({ x: -0.52, y: -0.2 + i * 0.36 });
      break;
  }
  return out;
}

interface Rocket {
  pattern: Pattern;
  cx: number; cy: number;
  zones: Pt[];
  color: number;
  launchAt: number;
  burstAt: number;
  fromX: number;
  done: boolean;
}

interface Stick { x: number; y: number; at: number; color: number }
interface Thrown { x: number; y: number; vx: number; vy: number; at: number; by: Fighter; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const WATER_Y = H - 46;
  const barges = [W * 0.18, W * 0.5, W * 0.82];
  const rockets: Rocket[] = [];
  const sticks: Stick[] = [];
  const thrown: Thrown[] = [];
  const bursts: { x: number; y: number; at: number; color: number }[] = [];
  const holding = new Map<Fighter, number | null>([[player, null], [npc, null]]);
  let started = false;
  let nextRocket = 0;
  let pick = Math.floor(rng() * PATTERNS.length);

  function launch(time: number, around: Fighter): void {
    const pattern = PATTERNS[pick++ % PATTERNS.length];
    const cx = clamp(around.x + (rng() - 0.5) * 80, 140, W - 140);
    const cy = clamp(around.y + (rng() - 0.5) * 60, top + 150, WATER_Y - 150);
    rockets.push({
      pattern, cx, cy, zones: patternZones(pattern).map((z) => ({ x: cx + z.x * SCALE, y: cy + z.y * SCALE })),
      color: FIREWORKS[Math.floor(rng() * FIREWORKS.length)], launchAt: time, burstAt: time + WARN_MS,
      fromX: barges[Math.floor(rng() * barges.length)], done: false,
    });
    ctx.sfx('mortar-launch');
  }

  function burst(r: Rocket, time: number): void {
    r.done = true;
    ctx.sfx('explosion-medium');
    for (const z of r.zones) {
      bursts.push({ x: z.x, y: z.y, at: time, color: r.color });
      ctx.tk.explode(z.x, z.y, ZONE_R, 12, r.color);
    }
    if (alive(npc) && r.zones.some((z) => dist(z.x, z.y, npc.x, npc.y) < ZONE_R + 16)) ctx.hit(npc, 12, npc.x, npc.y);
    sticks.push({ x: r.cx + (rng() - 0.5) * 40, y: r.cy + (rng() - 0.5) * 30, at: time, color: r.color });
  }

  function throwStick(f: Fighter, time: number): void {
    if (holding.get(f) == null || !alive(f)) return;
    holding.set(f, null);
    const foe = f === player ? npc : player;
    // The player throws where they aim; Gerbe throws at you.
    const a = f === player ? ctx.facing(f) : Math.atan2(foe.y - f.y, foe.x - f.x);
    thrown.push({ x: f.x, y: f.y - 20, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, at: time, by: f, dealt: false });
    ctx.sfx('grenade-throw');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextRocket = time + 1600; }
      if (time >= nextRocket && alive(player)) {
        nextRocket = time + (ctx.hard ? 3900 : ROCKET_EVERY);
        launch(time, player);
        if (ctx.hard && rng() < 0.35 && alive(npc)) launch(time, npc);
      }
      for (const r of rockets) if (!r.done && time >= r.burstAt) burst(r, time);
      for (let i = rockets.length - 1; i >= 0; i--) if (rockets[i].done) rockets.splice(i, 1);
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 700) bursts.splice(i, 1);

      // Picking up a burning stick by walking over it.
      for (let i = sticks.length - 1; i >= 0; i--) {
        const s = sticks[i];
        if (time - s.at > STICK_LIFE) { sticks.splice(i, 1); continue; }
        if (time - s.at < 500) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || holding.get(f) != null) continue;
          if (dist(f.x, f.y, s.x, s.y) < 34) {
            holding.set(f, s.color);
            sticks.splice(i, 1);
            ctx.float(f.x, f.y - 46, f === player ? 'STICK! (cast to throw)' : 'GERBE HAS A STICK', '#ffd24a');
            ctx.sfx('reload');
            break;
          }
        }
      }

      for (let i = thrown.length - 1; i >= 0; i--) {
        const t = thrown[i];
        t.x += t.vx * dt; t.y += t.vy * dt;
        const foe = t.by === player ? npc : player;
        if (!t.dealt && alive(foe) && dist(t.x, t.y, foe.x, foe.y) < 34) {
          t.dealt = true;
          ctx.hit(foe, STICK_DMG, foe.x, foe.y);
          ctx.stun(foe, 500);
          bursts.push({ x: t.x, y: t.y, at: time, color: SEQ_GOLD });
          ctx.sfx('explosion-small');
        }
        if (t.dealt || t.x < 0 || t.x > W || t.y < top || t.y > H || time - t.at > 1600) thrown.splice(i, 1);
      }
    },

    onPlayerCast() { throwStick(player, ctx.scene.time.now); },
    onNpcCast() { throwStick(npc, ctx.scene.time.now); },

    npcSeek() {
      // Out of any chalk first — into a gap inside the mask, or clear of it.
      for (const r of rockets) {
        if (!r.zones.some((z) => dist(z.x, z.y, npc.x, npc.y) < ZONE_R + 20)) continue;
        const safe = [{ x: r.cx - SCALE * 0.45, y: r.cy + SCALE * 0.2 }, { x: r.cx + SCALE * 0.45, y: r.cy + SCALE * 0.2 }, { x: r.cx, y: r.cy - SCALE * 1.6 }];
        safe.sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y));
        const s = safe.find((p) => !r.zones.some((z) => dist(z.x, z.y, p.x, p.y) < ZONE_R + 14)) ?? safe[0];
        return { x: clamp(s.x, 60, W - 60), y: clamp(s.y, top + 50, WATER_Y - 30) };
      }
      // Then for a stick, if one is lying nearer him than you.
      if (holding.get(npc) == null) {
        for (const s of sticks) {
          if (time() - s.at < 500) continue;
          if (dist(s.x, s.y, npc.x, npc.y) < dist(s.x, s.y, player.x, player.y)) return { x: s.x, y: s.y };
        }
      }
      return null;
    },

    drawGround(g, time) {
      // The lagoon edge and the barges.
      g.fillStyle(CANAL_DEEP, 1); g.fillRect(0, WATER_Y, W, H - WATER_Y);
      g.fillStyle(CANAL, 0.8); g.fillRect(0, WATER_Y + 8, W, H - WATER_Y);
      g.fillStyle(ISTRIA, 1); g.fillRect(0, WATER_Y - 6, W, 8);
      for (let i = 0; i < 10; i++) {
        const x = ((i * 113 + time / 40) % (W + 40)) - 20;
        g.lineStyle(1, lit(CANAL, 0.3), 0.4); g.lineBetween(x, WATER_Y + 18 + (i % 3) * 8, x + 26, WATER_Y + 18 + (i % 3) * 8);
      }
      for (const bx of barges) fireworksBarge(g, bx, H - 6, 150);
      // The chalk-fire patterns: lines joining the zones, rings filling with the fuse.
      for (const r of rockets) {
        const k = clamp((time - r.launchAt) / WARN_MS, 0, 1);
        g.lineStyle(2, r.color, 0.25 + k * 0.35);
        for (let i = 0; i < r.zones.length - 1; i++) {
          const a = r.zones[i], b = r.zones[i + 1];
          if (dist(a.x, a.y, b.x, b.y) < SCALE * 0.75) g.lineBetween(a.x, a.y, b.x, b.y);
        }
        for (const z of r.zones) {
          g.fillStyle(r.color, 0.1 + k * 0.22); g.fillCircle(z.x, z.y, ZONE_R);
          g.lineStyle(2, r.color, 0.5 + k * 0.5); g.strokeCircle(z.x, z.y, ZONE_R);
          g.beginPath(); g.arc(z.x, z.y, ZONE_R - 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
      // Burning sticks on the flags.
      for (const s of sticks) {
        const k = (time - s.at) / STICK_LIFE;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x, s.y + 3, 36, 8);
        g.lineStyle(3, OAK_LIT, 1); g.lineBetween(s.x - 16, s.y + 2, s.x + 16, s.y - 4);
        g.fillStyle(s.color, 1); g.fillRect(s.x + 12, s.y - 8, 7, 7);
        g.fillStyle(SEQ_GOLD, 0.6 + Math.sin(time / 60) * 0.3); g.fillCircle(s.x + 18, s.y - 6, 3 + (1 - k) * 2);
        if (k > 0.75) { g.lineStyle(1.5, 0xffffff, (Math.sin(time / 70) + 1) * 0.3); g.strokeCircle(s.x, s.y, 22); }
      }
    },

    drawAir(g, time) {
      // Rockets climbing from the barges to their burst point.
      for (const r of rockets) {
        const k = clamp((time - r.launchAt) / WARN_MS, 0, 1);
        const x = r.fromX + (r.cx - r.fromX) * k;
        const y = (H - 50) + (r.cy - 160 - (H - 50)) * Math.sin(k * Math.PI / 2);
        for (let i = 1; i < 8; i++) {
          const kk = Math.max(0, k - i * 0.025);
          const tx = r.fromX + (r.cx - r.fromX) * kk, ty = (H - 50) + (r.cy - 160 - (H - 50)) * Math.sin(kk * Math.PI / 2);
          g.fillStyle(SEQ_GOLD, 0.5 - i * 0.06); g.fillCircle(tx, ty, 3 - i * 0.3);
        }
        g.fillStyle(r.color, 1); g.fillRect(x - 2, y - 6, 4, 10);
        g.fillStyle(FW_WHITE, 1); g.fillTriangle(x - 2, y - 6, x + 2, y - 6, x, y - 11);
      }
      for (const b of bursts) fireworkBurst(g, b.x, b.y - 10, ZONE_R * 1.4, (time - b.at) / 700, b.color, 10);
      for (const t of thrown) {
        const a = Math.atan2(t.vy, t.vx) + (time - t.at) / 40;
        g.lineStyle(3, OAK_LIT, 1); g.lineBetween(t.x - Math.cos(a) * 14, t.y - Math.sin(a) * 14, t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14);
        g.fillStyle(SEQ_GOLD, 0.9); g.fillCircle(t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14, 4);
        g.fillStyle(FW_WHITE, 0.5); g.fillCircle(t.x - t.vx * 0.03, t.y - t.vy * 0.03, 3);
      }
      // A stick in hand, sparking.
      for (const [f, c] of holding) {
        if (c == null || !alive(f)) continue;
        g.lineStyle(3, OAK_LIT, 1); g.lineBetween(f.x + 14, f.y - 10, f.x + 22, f.y - 40);
        g.fillStyle(c, 1); g.fillRect(f.x + 19, f.y - 48, 6, 8);
        for (let i = 0; i < 4; i++) { g.fillStyle(SEQ_GOLD, 0.8); g.fillCircle(f.x + 22 + Math.cos(time / 50 + i * 1.6) * 5, f.y - 50 + Math.sin(time / 50 + i * 1.6) * 5, 1.4); }
      }
    },
  };

  function time(): number { return ctx.scene.time.now; }
}

export const FIREWORKS_BARGE: GimmickDef = {
  id: 'masque-fireworks-barge',
  rules: 'Rockets burst over the quay in mask-shaped patterns chalked on the floor first — stand in the gaps. Walk over a fallen stick to pick it up; your next cast throws it.',
  make,
};
