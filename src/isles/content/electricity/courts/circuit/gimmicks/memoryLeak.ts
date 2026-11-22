import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { segText } from '../art';
import { COPPER, NIXIE, SILK } from '../palette';
import { alive, clamp, dist, hex, segDist, stepDt } from '../util';

/**
 * Memory Leak — Archivist Rom.
 *
 * Rom keeps the Core Store, where every Draw the Tabulator ever reckoned is held in rings of
 * ferrite, and the store leaks. Every cast made in her reading room is *remembered*: a ghost of
 * the caster stays where they stood and, a couple of seconds later, replays the cast down the
 * same line — a pale bolt from where they were, the way they were aiming. Both sides leak.
 *
 * A memory is fragile: when a fighter is struck, all their ghosts still waiting to replay are
 * wiped. Hit Rom and her replays vanish; let her hit you and yours do. And the room itself leaks —
 * every few seconds it replays where each fighter *stood*, a ghost at their old footprint loosing
 * a bolt at the other. Never stand still long enough to be remembered.
 */

const ROM = 0xc87aff;
const YOU = 0x8af0ff;

interface Ghost {
  owner: Fighter;
  victim: Fighter;
  ax: number; ay: number;
  /** Aim point (where the victim was). */
  vx: number; vy: number;
  born: number;
  fireAt: number;
  damage: number;
  fired: boolean;
  /** The bolt, once loosed. */
  bx: number; by: number; dx: number; dy: number; travelled: number;
  dealt: boolean;
  fadedAt: number;
  addr: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const REPLAY = ctx.hard ? 2200 : 2600;
  const LEAK_EVERY = ctx.hard ? 5200 : 6500;
  const LEAK_BACK = 3000;
  const BOLT_SPEED = 640;
  const CAST_DMG = ctx.hard ? 8 : 7;
  const ghosts: Ghost[] = [];
  const lastGhost = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  /** Position history, sampled every 100ms, for the room's own leak. */
  const trail = new Map<Fighter, { t: number; x: number; y: number }[]>([[player, []], [npc, []]]);
  let lastSample = 0;
  let nextLeak = 0;
  let started = false;
  let leaks = 0;

  const other = (f: Fighter) => (f === player ? npc : player);
  const tint = (f: Fighter) => (f === player ? YOU : ROM);

  function remember(owner: Fighter, victim: Fighter, ax: number, ay: number, vx: number, vy: number, damage: number, delay: number): void {
    if (ghosts.filter((g) => !g.fired && !g.fadedAt).length >= 10) return;
    const now = ctx.scene.time.now;
    const a = Math.atan2(vy - ay, vx - ax);
    ghosts.push({
      owner, victim, ax, ay, vx, vy, born: now, fireAt: now + delay, damage, fired: false,
      bx: ax, by: ay, dx: Math.cos(a), dy: Math.sin(a), travelled: 0, dealt: false, fadedAt: 0,
      addr: Math.floor(rng() * 0xffff),
    });
  }

  /** A struck fighter loses every replay of theirs still waiting. */
  function wipe(f: Fighter): void {
    const now = ctx.scene.time.now;
    let n = 0;
    for (const g of ghosts) if (g.owner === f && !g.fired && !g.fadedAt) { g.fadedAt = now; n++; }
    if (n) ctx.float(f.x, f.y - 50, n > 1 ? `${n} MEMORIES WIPED` : 'MEMORY WIPED', f === player ? '#8af0ff' : '#e0a0ff');
  }

  /** A cast is remembered: a ghost where the caster stood replays it down the line they aimed. */
  function cast(owner: Fighter): void {
    const now = ctx.scene.time.now;
    if (!alive(owner) || now - (lastGhost.get(owner) ?? 0) < 450) return;
    lastGhost.set(owner, now);
    const a = ctx.facing(owner);
    remember(owner, other(owner), owner.x, owner.y, owner.x + Math.cos(a) * 300, owner.y + Math.sin(a) * 300, CAST_DMG, REPLAY);
    ctx.sfx('time-warp');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLeak = time + LEAK_EVERY; }
      // Footprints for the leak.
      if (time - lastSample > 100) {
        lastSample = time;
        for (const f of [player, npc]) {
          const tr = trail.get(f);
          if (!tr) continue;
          tr.push({ t: time, x: f.x, y: f.y });
          while (tr.length && time - tr[0].t > LEAK_BACK + 600) tr.shift();
        }
      }
      // The room leaks: a ghost of each fighter at where they stood, firing at the other.
      if (time >= nextLeak) {
        nextLeak = time + LEAK_EVERY;
        leaks++;
        for (const f of [player, npc]) {
          const tr = trail.get(f);
          const o = other(f);
          if (!tr || !tr.length || !alive(f) || !alive(o)) continue;
          const old = tr.find((p) => time - p.t <= LEAK_BACK) ?? tr[0];
          remember(f, o, old.x, old.y, o.x, o.y, ctx.hard ? 7 : 6, 1000);
        }
        ctx.banner('THE STORE LEAKS', '#e0a0ff');
        ctx.sfx('glitch');
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const gh = ghosts[i];
        if (gh.fadedAt) { if (time - gh.fadedAt > 500) ghosts.splice(i, 1); continue; }
        if (!gh.fired && time >= gh.fireAt) { gh.fired = true; ctx.sfx('beam-fire'); }
        if (!gh.fired) continue;
        const step = BOLT_SPEED * dt;
        gh.bx += gh.dx * step; gh.by += gh.dy * step; gh.travelled += step;
        const v = gh.victim;
        if (!gh.dealt && alive(v) && segDist(v.x, v.y, gh.bx - gh.dx * step, gh.by - gh.dy * step, gh.bx, gh.by) < 24) {
          gh.dealt = true;
          ctx.hit(v, gh.damage, v.x, v.y);
          ctx.float(v.x, v.y - 34, 'REPLAYED', v === player ? '#e0a0ff' : '#8af0ff');
        }
        if (gh.travelled > 1100 || gh.bx < -40 || gh.bx > W + 40 || gh.by < top - 40 || gh.by > H + 40) ghosts.splice(i, 1);
      }
    },

    onPlayerCast() { cast(player); },
    onNpcCast() { cast(npc); },
    onPlayerHurt() { wipe(player); },
    onNpcHurt() { wipe(npc); },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      // Step off the line of any replay aimed at me.
      for (const gh of ghosts) {
        if (gh.victim !== npc || gh.fadedAt) continue;
        if (!gh.fired && gh.fireAt - ctx.scene.time.now > 1200) continue;
        const d = segDist(npc.x, npc.y, gh.ax, gh.ay, gh.ax + gh.dx * 1100, gh.ay + gh.dy * 1100);
        if (d < 60) {
          const px = -gh.dy, py = gh.dx;
          const s = (npc.x - gh.ax) * px + (npc.y - gh.ay) * py >= 0 ? 1 : -1;
          return { x: clamp(npc.x + px * s * 120, 60, W - 60), y: clamp(npc.y + py * s * 120, top + 50, H - 50) };
        }
      }
      // Keep moving — never be where I stood three seconds ago — at a duelling range.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.9;
      return { x: clamp(player.x + Math.cos(a) * 220, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 50) } as Pt;
    },

    drawGround(g, time) {
      // The reading room: a faint core-plane lattice in the floor, rings lit where a ghost waits.
      for (let x = 60; x < W; x += 80) { g.lineStyle(1, COPPER, 0.12); g.lineBetween(x, top, x, H); }
      for (let y = top + 40; y < H; y += 80) { g.lineStyle(1, COPPER, 0.12); g.lineBetween(0, y, W, y); }
      for (let x = 60; x < W; x += 80) for (let y = top + 40; y < H; y += 80) {
        const near = ghosts.some((gh) => !gh.fired && !gh.fadedAt && dist(gh.ax, gh.ay, x, y) < 70);
        g.lineStyle(2, near ? NIXIE : 0x3a2a24, near ? 0.7 : 0.4); g.strokeCircle(x, y, 5);
      }
      // Each waiting replay's line: dotted, brightening as it nears.
      for (const gh of ghosts) {
        if (gh.fired) continue;
        const fade = gh.fadedAt ? 1 - clamp((time - gh.fadedAt) / 500, 0, 1) : 1;
        const k = clamp((time - gh.born) / Math.max(1, gh.fireAt - gh.born), 0, 1);
        const c = tint(gh.owner);
        for (let d = 30; d < 1000; d += 22) {
          const px = gh.ax + gh.dx * d, py = gh.ay + gh.dy * d;
          if (px < 0 || px > W || py < top || py > H) break;
          g.fillStyle(c, (0.12 + k * 0.5) * fade);
          g.fillRect(px - 3, py - 1.5, 6, 3);
        }
        if (k > 0.75 && !gh.fadedAt) { g.lineStyle(2 + (k - 0.75) * 16, c, 0.15); g.lineBetween(gh.ax, gh.ay, gh.ax + gh.dx * 1000, gh.ay + gh.dy * 1000); }
      }
    },

    drawAir(g, time) {
      for (const gh of ghosts) {
        const c = tint(gh.owner);
        const fade = gh.fadedAt ? 1 - clamp((time - gh.fadedAt) / 500, 0, 1) : 1;
        if (!gh.fired) {
          // The ghost: a scan-lined silhouette of the striker, flickering, with its address tag.
          const fl = 0.5 + Math.sin(time / 37 + gh.addr) * 0.15;
          const a = fl * fade;
          for (let y = -44; y < 4; y += 3) {
            const w = y < -26 ? Math.sqrt(Math.max(0, 100 - (y + 35) * (y + 35))) : 14 - Math.abs(y + 10) * 0.2;
            g.fillStyle(c, a * (y % 6 === 0 ? 0.65 : 0.3));
            g.fillRect(gh.ax - w + (gh.fadedAt ? Math.sin(y + time / 20) * 6 * (1 - fade) : 0), gh.ay + y, w * 2, 2);
          }
          const k = clamp((time - gh.born) / Math.max(1, gh.fireAt - gh.born), 0, 1);
          g.lineStyle(2, c, 0.8 * fade);
          g.beginPath(); g.arc(gh.ax, gh.ay - 20, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          segText(g, gh.ax - 18, gh.ay + 8, hex(gh.addr), 8, c, 0.6 * fade);
          if (gh.fadedAt) {
            for (let i = 0; i < 6; i++) { g.fillStyle(c, fade); g.fillRect(gh.ax - 20 + ((i * 37 + time / 10) % 40), gh.ay - 40 + i * 7, 6, 2); }
          }
          continue;
        }
        // The replay: a pale streak with echo copies trailing it.
        for (let k = 0; k < 5; k++) {
          const px = gh.bx - gh.dx * k * 16, py = gh.by - gh.dy * k * 16;
          g.fillStyle(c, 0.5 - k * 0.09); g.fillCircle(px, py, 8 - k);
        }
        g.fillStyle(0xffffff, 0.9); g.fillCircle(gh.bx, gh.by, 4);
      }
    },

    drawHud(g) {
      // The leak counter and each side's pending memories, in the store's numerals.
      const y = top + 6;
      const pend = (f: Fighter) => ghosts.filter((gh) => gh.owner === f && !gh.fired && !gh.fadedAt).length;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(W / 2 - 90, y, 180, 18, 6);
      segText(g, W / 2 - 80, y + 4, `${pend(player)}`.padStart(2, '0'), 10, YOU, 1);
      segText(g, W / 2 - 22, y + 4, `L${leaks}`.slice(0, 3), 10, SILK, 0.7);
      segText(g, W / 2 + 64, y + 4, `${pend(npc)}`.padStart(2, '0'), 10, ROM, 1);
    },
  };
}

export const MEMORY_LEAK: GimmickDef = {
  id: 'circuit-memory-leak',
  rules: 'Every cast leaves a ghost that replays it 2.5s later, for both sides; a struck fighter\'s ghosts are wiped. The store also replays where you stood.',
  make,
};
