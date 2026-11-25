import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { pot } from '../art';
import { CELADON, CELADON_DARK, CELADON_LIT, GOLD, GOLD_DARK, GOLD_LIT, MARL_DARK, SAGGAR, SAGGAR_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Back to the Pot — Gilder Rosamund Tey, who mended the Prince's ware in gold.
 *
 * Prince Glaze is "the Unbroken" because every crack in his ware is mended in gold. Rosamund
 * did the mending. In the King's telling she mended people too: whatever broke in the court she
 * put back in its place, exactly as it was, whether it wanted to go back or not.
 *
 * Here celadon urns stand on saggar plinths about the yard. Strike one and it cracks, then
 * bursts: its sherds fly straight out along spokes and lie where they stop, each tied back to the
 * plinth by a thread of wet gold. Then the pot *remembers*: every sherd flies home along its
 * thread and the urn stands whole again, a gold seam for each time it broke. Sherds cut whoever
 * they pass, going out and coming back. Every mend adds sherds.
 *
 * The bursts are spoked — stand between the spokes, or well clear. The threads show the way
 * home, so the clever player bursts an urn by Rosamund, or herds her inside a ring of threads
 * before the sherds return. Halfway down, the mended urns remember being broken and burst on
 * their own. The bot steps off threads and out of a cracking urn's reach, and stands so its shots
 * at you crack the urn beside you.
 */

const ID = fallenId('potter', 'mend');
const CRACK_MS = 650;
const OUT_SPEED = 300;
const BACK_SPEED = 340;
const REACH = 170;
const LIE_MS = 1600;
const CUT_R = 9;
const OUT_DMG = 8;
const BACK_DMG = 10;
const REST_MS = 1500;
const MAX_MENDS = 3;

type Phase = 'whole' | 'crack' | 'out' | 'lie' | 'back';
interface Sherd { a: number; r: number; spin: number; size: number; hit: Set<Fighter> }
interface Urn { x: number; y: number; phase: Phase; t0: number; mends: number; sherds: Sherd[]; tgt: StrikeTarget | null; readyAt: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const ym = (top + H) / 2;
  const spots = [
    { x: W * 0.2, y: top + 120 }, { x: W * 0.8, y: top + 120 }, { x: W * 0.5, y: ym + 10 },
    { x: W * 0.22, y: H - 100 }, { x: W * 0.78, y: H - 100 },
  ];
  const urns: Urn[] = spots.map((p, i) => ({ ...p, phase: 'whole', t0: 0, mends: 0, sherds: [], tgt: null, readyAt: 0, seed: i * 1.7 }));
  let half = false;
  let now = 0;
  let nextSelf = 0;

  function crack(u: Urn): void {
    if (u.phase !== 'whole' || now < u.readyAt) return;
    u.phase = 'crack';
    u.t0 = now;
    ctx.sfx('crystal-chime');
  }

  for (const u of urns) {
    u.tgt = ctx.target({ x: u.x, y: u.y - 20, r: 24, onStruck: () => crack(u) });
  }

  function burst(u: Urn): void {
    const n = 8 + u.mends * 2;
    const off = rng() * Math.PI * 2;
    u.sherds = [];
    for (let i = 0; i < n; i++) u.sherds.push({ a: off + (i / n) * Math.PI * 2, r: 14, spin: rng() * 6, size: 6 + rng() * 4, hit: new Set() });
    u.phase = 'out';
    u.t0 = now;
    u.tgt?.remove();
    u.tgt = null;
    ctx.flash(u.x, u.y - 16, CELADON_LIT);
    ctx.sfx('crystal-shatter');
  }

  function cut(u: Urn, s: Sherd, px: number, py: number, dmg: number): void {
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || s.hit.has(f)) continue;
      if (segDist(f.x, f.y, px, py, u.x + Math.cos(s.a) * s.r, u.y + Math.sin(s.a) * s.r) > CUT_R + 20) continue;
      s.hit.add(f);
      ctx.hit(f, dmg, f.x, f.y);
      ctx.sfx('slash');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        nextSelf = time + 2500;
        ctx.banner('The mended urns remember breaking.', '#ffd27a');
        ctx.sfx('holy-chord');
      }
      // Late on, the most-mended whole urn near the player breaks by itself.
      if (half && time >= nextSelf) {
        nextSelf = time + 6500;
        const pick = urns.filter((u) => u.phase === 'whole' && u.mends > 0)
          .sort((a, b) => b.mends - a.mends || dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
        if (pick) { pick.readyAt = 0; crack(pick); }
      }
      for (const u of urns) {
        if (u.phase === 'crack' && time - u.t0 >= CRACK_MS) burst(u);
        else if (u.phase === 'out') {
          let moving = false;
          for (const s of u.sherds) {
            if (s.r >= REACH) continue;
            const px = u.x + Math.cos(s.a) * s.r, py = u.y + Math.sin(s.a) * s.r;
            s.r = Math.min(REACH, s.r + OUT_SPEED * dt);
            moving = true;
            cut(u, s, px, py, OUT_DMG);
          }
          if (!moving) { u.phase = 'lie'; u.t0 = time; for (const s of u.sherds) s.hit.clear(); }
        } else if (u.phase === 'lie' && time - u.t0 >= LIE_MS) {
          u.phase = 'back';
          u.t0 = time;
          ctx.sfx('snap-back');
        } else if (u.phase === 'back') {
          let moving = false;
          for (const s of u.sherds) {
            if (s.r <= 12) continue;
            const px = u.x + Math.cos(s.a) * s.r, py = u.y + Math.sin(s.a) * s.r;
            s.r = Math.max(12, s.r - BACK_SPEED * dt);
            moving = true;
            cut(u, s, px, py, BACK_DMG);
          }
          if (!moving) {
            u.phase = 'whole';
            u.mends = Math.min(MAX_MENDS, u.mends + 1);
            u.readyAt = time + REST_MS;
            u.sherds = [];
            u.tgt = ctx.target({ x: u.x, y: u.y - 20, r: 24, onStruck: () => crack(u) });
            ctx.float(u.x, u.y - 64, 'MENDED IN GOLD', '#ffe08a');
            ctx.sfx('sparkle');
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // Off a burst urn's spokes and threads, out past its reach.
      for (const u of urns) {
        if (u.phase === 'whole') continue;
        const d = dist(npc.x, npc.y, u.x, u.y);
        if (d > REACH + 40) continue;
        const k = d || 1;
        return { x: clamp(u.x + (npc.x - u.x) / k * (REACH + 70), 60, W - 60), y: clamp(u.y + (npc.y - u.y) / k * (REACH + 70), top + 40, H - 40) };
      }
      if (!alive(player)) return null;
      // Stand so the urn beside the player sits between: its shots crack it.
      let best: Urn | null = null;
      for (const u of urns) if (u.phase === 'whole' && now >= u.readyAt && dist(u.x, u.y, player.x, player.y) < 150 && (!best || dist(u.x, u.y, player.x, player.y) < dist(best.x, best.y, player.x, player.y))) best = u;
      if (!best) return null;
      const d = dist(best.x, best.y, player.x, player.y) || 1;
      return { x: clamp(best.x + (best.x - player.x) / d * 220, 60, W - 60), y: clamp(best.y + (best.y - player.y) / d * 220, top + 40, H - 40) };
    },

    drawGround(g, time) {
      for (const u of urns) {
        drawPlinth(g, u.x, u.y);
        if (u.phase === 'crack') {
          // The reach it will burst to, drawn as a ring of fine cracks spreading in the clay.
          const k = clamp((time - u.t0) / CRACK_MS, 0, 1);
          g.lineStyle(1.5, MARL_DARK, 0.3 + 0.5 * k); g.strokeEllipse(u.x, u.y, REACH * 2 * k, REACH * 2 * k);
        }
        if (u.phase === 'out' || u.phase === 'lie' || u.phase === 'back') {
          // Threads of wet gold from each sherd back to the plinth: the way home.
          const tk = u.phase === 'lie' ? clamp((time - u.t0) / LIE_MS, 0, 1) : u.phase === 'back' ? 1 : 0.3;
          for (const s of u.sherds) {
            const sx = u.x + Math.cos(s.a) * s.r, sy = u.y + Math.sin(s.a) * s.r;
            g.lineStyle(4, GOLD_DARK, 0.15 + 0.25 * tk); g.lineBetween(u.x, u.y, sx, sy);
            g.lineStyle(1.5, mixC(GOLD, GOLD_LIT, tk), 0.4 + 0.5 * tk); g.lineBetween(u.x, u.y, sx, sy);
            const gp = ((time / 500) + s.spin) % 1;
            g.fillStyle(GOLD_LIT, 0.8 * tk); g.fillCircle(sx + (u.x - sx) * gp, sy + (u.y - sy) * gp, 1.8);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const u of urns) {
        if (u.phase === 'whole' || u.phase === 'crack') {
          const shake = u.phase === 'crack' ? Math.sin(time / 25) * 2 * clamp((time - u.t0) / CRACK_MS, 0, 1) : 0;
          drawUrn(g, u.x + shake, u.y - 14, u.mends, u.phase === 'crack' ? clamp((time - u.t0) / CRACK_MS, 0, 1) : 0, u.seed, time < u.readyAt);
          continue;
        }
        for (const s of u.sherds) drawSherd(g, u.x + Math.cos(s.a) * s.r, u.y + Math.sin(s.a) * s.r, s.size, s.spin + (u.phase === 'lie' ? 0 : time / 90));
      }
    },

    drawHud(g) {
      // Five urns along the top, each with its gold seams counted.
      urns.forEach((u, i) => {
        const x = W / 2 - 80 + i * 40, y = top + 22;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 15, y - 16, 30, 30, 6);
        const whole = u.phase === 'whole';
        g.fillStyle(whole ? CELADON : CELADON_DARK, whole ? 1 : 0.4); g.fillEllipse(x, y, 16, 20);
        g.fillStyle(whole ? CELADON : CELADON_DARK, whole ? 1 : 0.4); g.fillRect(x - 4, y - 14, 8, 5);
        for (let m = 0; m < u.mends; m++) { g.lineStyle(1.5, GOLD_LIT, 1); g.lineBetween(x - 7, y - 5 + m * 5, x + 6, y - 2 + m * 5); }
      });
    },

    destroy() { for (const u of urns) u.tgt?.remove(); },
  };
}

/** A plinth of two stacked saggars, the urn's ring worn into its top. */
function drawPlinth(g: G, x: number, y: number): void {
  shadow(g, x, y + 4, 52, 16, 0.3);
  g.fillStyle(SAGGAR_DARK, 1); g.fillRoundedRect(x - 24, y - 16, 48, 22, 5);
  g.fillStyle(SAGGAR, 1); g.fillRoundedRect(x - 22, y - 16, 44, 9, 4);
  g.lineStyle(1, SAGGAR_DARK, 0.8); g.lineBetween(x - 24, y - 5, x + 24, y - 5);
  g.fillStyle(SAGGAR_DARK, 0.6); g.fillEllipse(x, y - 14, 30, 7);
}

/**
 * A celadon urn on its plinth: crackled glaze, a gold seam for each mend (kintsugi rivers running
 * down the body), cracks spreading as it is about to burst, dull while it is still setting.
 */
function drawUrn(g: G, x: number, y: number, mends: number, crack: number, seed: number, setting: boolean): void {
  pot(g, x, y, 34, 'urn', 0xece6da, setting ? CELADON_DARK : CELADON);
  // Glaze crackle.
  g.lineStyle(0.5, CELADON_DARK, 0.5);
  for (let i = 0; i < 5; i++) { const yy = y - 12 - i * 5; g.lineBetween(x - 9 + (i % 2) * 3, yy, x - 3 + (i % 3) * 3, yy - 4); g.lineBetween(x + 3, yy - 1, x + 9 - (i % 2) * 2, yy - 3); }
  // Gold seams, one river per mend.
  for (let m = 0; m < mends; m++) {
    const sx = x - 8 + ((m * 7 + seed * 5) % 16);
    g.lineStyle(2, GOLD_DARK, 1); g.lineBetween(sx, y - 38, sx + 4, y - 26); g.lineBetween(sx + 4, y - 26, sx - 2, y - 14); g.lineBetween(sx - 2, y - 14, sx + 3, y - 4);
    g.lineStyle(1, GOLD_LIT, 1); g.lineBetween(sx, y - 38, sx + 4, y - 26); g.lineBetween(sx + 4, y - 26, sx - 2, y - 14); g.lineBetween(sx - 2, y - 14, sx + 3, y - 4);
  }
  if (mends > 0) glow(g, x, y - 20, 22, GOLD, 0.03 * mends, 2);
  if (crack > 0) {
    g.lineStyle(1.2, 0x1a1410, 0.9);
    const n = 3 + Math.floor(crack * 5);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + seed;
      const cx = x + Math.cos(a) * 4, cy = y - 22 + Math.sin(a) * 6;
      g.lineBetween(cx, cy, cx + Math.cos(a) * 12 * crack, cy + Math.sin(a) * 14 * crack);
    }
    glow(g, x, y - 20, 30, CELADON_LIT, 0.05 + 0.1 * crack, 3);
  }
}

/** A sherd of celadon ware: an angular shard, glazed face lit, a white body edge where it broke. */
function drawSherd(g: G, x: number, y: number, s: number, a: number): void {
  const p = (k: number, r: number) => ({ x: x + Math.cos(a + k) * r, y: y + Math.sin(a + k) * r * 0.8 });
  const p1 = p(0, s), p2 = p(2.1, s * 0.8), p3 = p(3.6, s * 1.1), p4 = p(5.0, s * 0.7);
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 2, y + 6, s * 1.6, s * 0.5);
  g.fillStyle(0xece6da, 1); g.fillPoints([p1, p2, p3, p4], true);
  g.fillStyle(CELADON, 1); g.fillPoints([{ x: p1.x * 0.85 + x * 0.15, y: p1.y * 0.85 + y * 0.15 }, { x: p2.x * 0.85 + x * 0.15, y: p2.y * 0.85 + y * 0.15 }, { x: p3.x * 0.85 + x * 0.15, y: p3.y * 0.85 + y * 0.15 }], true);
  g.lineStyle(1, GOLD, 0.8); g.lineBetween(p3.x, p3.y, p4.x, p4.y);
  g.fillStyle(CELADON_LIT, 0.8); g.fillCircle(x - s * 0.2, y - s * 0.2, 1.4);
}

export const FALLEN_MEND: GimmickDef = {
  id: ID,
  rules: 'Struck urns burst into sherds that fly out along spokes, then home along gold threads, cutting all they pass. Burst one by Rosamund.',
  make,
};
