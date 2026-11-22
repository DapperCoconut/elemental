import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { markSigil, venomSlick, vial } from '../art';
import { BRUISE, BRUISE_LIT, DRAUGHT, DRAUGHT_LIT, GREY, VENOM, VENOM_DARK, VENOM_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Mark — Dosekeeper Brine.
 *
 * Brine keeps the court's dose-book, and she fights the way the Draught House works. Both
 * fighters wear the Mark — two little scars on the wrist — and both Marks fill with venom, a
 * little every second and a little more with every blow taken. A full Mark *bursts*: it hurts
 * its owner, splashes anyone standing close, and leaves a puddle of venom behind.
 *
 * There is only ever one antidote vial on the floor. Whoever reaches it drinks it, and their
 * Mark runs clear. Brine has rationed doses all her life; she knows when to take one and when
 * to stand on it so you can't. Keep away from her when she is full — and drink before she does.
 */

const MAX = 100;
const BURST_SELF = 14;
const BURST_SPLASH = 8;
const SPLASH_R = 120;
const POOL_R = 66;
const POOL_MS = 4000;
const POOL_TICK = 600;
const POOL_DMG = 3;
const VIAL_RISE = 900;
const VIAL_GAP = 2300;

interface Mark { level: number; burstAt: number }
interface Pool { x: number; y: number; until: number; seed: number }
interface Vial { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const FILL = ctx.hard ? 7.6 : 6.2;
  const marks = new Map<Fighter, Mark>([[player, { level: 18, burstAt: -9999 }], [npc, { level: 30, burstAt: -9999 }]]);
  const pools: Pool[] = [];
  const poolTick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let vialNow: Vial | null = null;
  let nextVial = 0;
  let started = false;
  const other = (f: Fighter) => (f === player ? npc : player);

  function spawnVial(time: number): void {
    // Somewhere open, never right under either fighter, and never much nearer one than the other.
    let best: Pt = { x: W / 2, y: (top + H) / 2 }, bs = -Infinity;
    for (let i = 0; i < 14; i++) {
      const x = 90 + rng() * (W - 180), y = top + 70 + rng() * (H - top - 130);
      const dp = dist(x, y, player.x, player.y), dn = dist(x, y, npc.x, npc.y);
      if (Math.min(dp, dn) < 120) continue;
      const score = -Math.abs(dp - dn) + rng() * 60;
      if (score > bs) { bs = score; best = { x, y }; }
    }
    vialNow = { x: best.x, y: best.y, at: time };
    ctx.sfx('crystal-chime');
  }

  function burst(f: Fighter, time: number): void {
    const m = marks.get(f);
    if (!m) return;
    m.level = 0;
    m.burstAt = time;
    ctx.hit(f, BURST_SELF, f.x, f.y);
    const o = other(f);
    if (alive(o) && dist(o.x, o.y, f.x, f.y) < SPLASH_R) { ctx.hit(o, BURST_SPLASH, o.x, o.y); ctx.float(o.x, o.y - 40, 'SPLASHED', '#c8f060'); }
    pools.push({ x: f.x, y: f.y, until: time + POOL_MS, seed: rng() * 6 });
    ctx.float(f.x, f.y - 56, 'THE MARK BURSTS', '#b4e83c');
    ctx.flash(f.x, f.y, VENOM);
    ctx.sfx('slime-splat');
  }

  function fill(f: Fighter, amount: number): void {
    const m = marks.get(f);
    if (m && ctx.scene.time.now - m.burstAt > 500) m.level = clamp(m.level + amount, 0, MAX);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextVial = time + 1500; }
      for (const [f, m] of marks) {
        if (!alive(f)) continue;
        if (time - m.burstAt > 500) m.level = clamp(m.level + FILL * dt, 0, MAX);
        if (m.level >= MAX) burst(f, time);
      }
      // The vial: rises out of the floor, then whoever touches it drinks.
      if (!vialNow && time >= nextVial) spawnVial(time);
      if (vialNow && time - vialNow.at >= VIAL_RISE) {
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, vialNow.x, vialNow.y) > 34) continue;
          const m = marks.get(f);
          if (m) m.level = 0;
          ctx.heal(f, 5);
          ctx.float(vialNow.x, vialNow.y - 40, f === player ? 'YOU DRINK THE DRAUGHT' : 'BRINE DRINKS', '#bff6f0');
          ctx.sfx('heal');
          vialNow = null;
          nextVial = time + VIAL_GAP;
          break;
        }
      }
      // Burst puddles tick on whoever stands in them.
      for (let i = pools.length - 1; i >= 0; i--) if (time >= pools[i].until) pools.splice(i, 1);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (!pools.some((p) => dist(p.x, p.y, f.x, f.y) < POOL_R)) continue;
        if (time - (poolTick.get(f) ?? 0) < POOL_TICK) continue;
        poolTick.set(f, time);
        ctx.hit(f, POOL_DMG, f.x, f.y);
        fill(f, 3);
      }
    },

    onPlayerHurt(amount) { fill(player, amount * 0.35); },
    onNpcHurt(amount) { fill(npc, amount * 0.35); },

    npcSeek() {
      const mine = marks.get(npc)?.level ?? 0;
      const yours = marks.get(player)?.level ?? 0;
      // A full Mark nearby is a splash waiting: step out of reach of yours.
      if (yours > 86 && alive(player)) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 220, 60, W - 60), y: clamp(player.y + Math.sin(a) * 220, top + 50, H - 40) };
      }
      if (vialNow) {
        const dn = dist(npc.x, npc.y, vialNow.x, vialNow.y), dp = dist(player.x, player.y, vialNow.x, vialNow.y);
        // Drink when she needs it, or deny it when you are close to needing it and she can get there first.
        if (mine > 45 || (yours > 60 && dn < dp + 60)) return { x: vialNow.x, y: vialNow.y };
      }
      // Otherwise, out of any puddle.
      for (const p of pools) {
        if (dist(p.x, p.y, npc.x, npc.y) < POOL_R + 20) {
          const a = Math.atan2(npc.y - p.y, npc.x - p.x);
          return { x: clamp(p.x + Math.cos(a) * (POOL_R + 60), 60, W - 60), y: clamp(p.y + Math.sin(a) * (POOL_R + 60), top + 50, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of pools) {
        const fade = clamp((p.until - time) / 700, 0, 1);
        venomSlick(g, p.x, p.y, POOL_R, fade, time, p.seed);
      }
      if (vialNow) {
        const k = clamp((time - vialNow.at) / VIAL_RISE, 0, 1);
        // A ring of the Draught's blue where it rises; the queue-rope rings of the Draught House.
        g.lineStyle(2, DRAUGHT, 0.3 + k * 0.4); g.strokeEllipse(vialNow.x, vialNow.y + 2, 64, 24);
        g.lineStyle(1, DRAUGHT_LIT, 0.25 * k); g.strokeEllipse(vialNow.x, vialNow.y + 2, 84 + Math.sin(time / 200) * 4, 32);
      }
      // Splash reach round a fighter who is nearly full.
      for (const [f, m] of marks) {
        if (!alive(f) || m.level < 75) continue;
        const k = (m.level - 75) / 25;
        g.lineStyle(2, VENOM, 0.15 + k * 0.45 + Math.sin(time / 80) * 0.1 * k); g.strokeEllipse(f.x, f.y + 6, SPLASH_R * 2, SPLASH_R * 1.2);
      }
    },

    drawAir(g, time) {
      if (vialNow) {
        const k = clamp((time - vialNow.at) / VIAL_RISE, 0, 1);
        const bob = Math.sin(time / 260) * 3;
        vial(g, vialNow.x, vialNow.y - 6 - k * 10 + bob, 1.3, k, 0.05 + k * 0.05);
      }
      // Each fighter's Mark, over the head: two scars that fill with green, then glow and swell.
      for (const [f, m] of marks) {
        if (!alive(f)) continue;
        const x = f.x, y = f.y - 52;
        const k = m.level / MAX;
        const pulse = k > 0.75 ? Math.sin(time / (90 - k * 50)) * 0.5 + 0.5 : 0;
        if (k > 0.75) glow(g, x, y, 16 + pulse * 6, VENOM, 0.05 + pulse * 0.05, 3);
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 15, y - 7, 30, 14, 6);
        markSigil(g, x, y, 4.5, k > 0.75 ? BRUISE_LIT : BRUISE, 1);
        for (const s of [-1, 1]) {
          const cx = x + s * 5.8;
          g.fillStyle(VENOM_DARK, 0.9); g.fillCircle(cx, y, 3.8 * k);
          g.fillStyle(VENOM, 0.9); g.fillCircle(cx, y, 3.2 * k);
          g.lineStyle(1.5, VENOM_LIT, 0.8);
          g.beginPath(); g.arc(cx, y, 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        // Grey creeping up the wrist when it is nearly full.
        if (k > 0.6) { g.lineStyle(2, GREY, (k - 0.6) * 2); g.lineBetween(f.x - 18, f.y + 4, f.x - 18 + (k - 0.6) * 20, f.y - 8); }
      }
    },

    drawHud(g) {
      for (const [f, x, d] of [[player, 20, 1], [npc, W - 20, -1]] as [Fighter, number, number][]) {
        const m = marks.get(f);
        if (!m) continue;
        const w = 130, y = top + 10;
        const x0 = d > 0 ? x : x - w;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y - 2, w + 4, 12, 5);
        const fw = (w * m.level) / MAX;
        g.fillStyle(m.level > 75 ? VENOM_LIT : VENOM, 0.95);
        g.fillRoundedRect(d > 0 ? x0 : x0 + w - fw, y, Math.max(2, fw), 8, 4);
        markSigil(g, d > 0 ? x0 + w + 16 : x0 - 16, y + 4, 3.5, BRUISE, 1);
      }
    },
  };
}

export const THE_MARK: GimmickDef = {
  id: 'fang-the-mark',
  rules: 'Both Marks fill with venom; a full Mark bursts, splashing anyone near and leaving a puddle. One antidote vial at a time — whoever drinks it runs clear.',
  make,
};
