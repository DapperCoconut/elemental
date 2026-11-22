import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import {
  CELADON, CHUN, COBALT, FLAMBE, OXBLOOD, OXBLOOD_LIT, TENMOKU, TENMOKU_EDGE, TIMBER_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Glaze Run — Glazier Celadon.
 *
 * Glaze drips off the trailing-rig overhead and splashes into pools on the floor — a shadow
 * swells where each drop will land. Three glazes: **celadon** slows you, **cobalt** hastens you,
 * **oxblood** burns. Walk from one into another, two colours, within a couple of seconds, and
 * they *mix* on you into a fired glaze with its own power:
 *
 * • celadon + cobalt = **chun**, milky blue — a hard coat: you take a third less;
 * • cobalt + oxblood = **flambé**, streaked purple — your blows land a third harder;
 * • celadon + oxblood = **tenmoku**, iron-black — you trail a running glaze that burns your foe.
 *
 * Celadon knows the glazes better than anyone and walks her mixes on purpose. Read her path: she
 * needs the second pool, and you can stand on it.
 */

type Glaze = 'celadon' | 'cobalt' | 'oxblood';
type Mix = 'chun' | 'flambe' | 'tenmoku';
const COLORS: Record<Glaze, number> = { celadon: CELADON, cobalt: COBALT, oxblood: OXBLOOD };
const MIX_COLORS: Record<Mix, number> = { chun: CHUN, flambe: FLAMBE, tenmoku: TENMOKU };
const MIX_NAMES: Record<Mix, string> = { chun: 'CHUN — HARD COAT', flambe: 'FLAMBÉ — HEAVY HAND', tenmoku: 'TENMOKU — IRON RUN' };
const MIX_CSS: Record<Mix, string> = { chun: '#b8c4f0', flambe: '#d86ad8', tenmoku: '#d88a4a' };

const POOL_R = 40;
const POOL_MS = 10000;
const DRIP_WARN = 900;
const MIX_WINDOW = 2500;
const MIX_MS = 5000;

interface Pool { x: number; y: number; r: number; glaze: Glaze; at: number }
interface Drip { x: number; y: number; glaze: Glaze; at: number }
interface Coat { last: Glaze | null; lastAt: number; mix: Mix | null; mixUntil: number; burnAt: number; trailAt: number }
interface Trail { x: number; y: number; at: number; owner: Fighter }

function mixOf(a: Glaze, b: Glaze): Mix | null {
  if (a === b) return null;
  const s = new Set([a, b]);
  if (s.has('celadon') && s.has('cobalt')) return 'chun';
  if (s.has('cobalt') && s.has('oxblood')) return 'flambe';
  return 'tenmoku';
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const pools: Pool[] = [];
  const drips: Drip[] = [];
  const trails: Trail[] = [];
  const coats = new Map<Fighter, Coat>([
    [player, { last: null, lastAt: -9999, mix: null, mixUntil: 0, burnAt: 0, trailAt: 0 }],
    [npc, { last: null, lastAt: -9999, mix: null, mixUntil: 0, burnAt: 0, trailAt: 0 }],
  ]);
  const order: Glaze[] = ['celadon', 'cobalt', 'oxblood'];
  let turn = 0;
  let nextDrip = 0;
  let started = false;
  const now = () => ctx.scene.time.now;
  const poolAt = (f: Fighter): Pool | null => {
    let best: Pool | null = null, bd = Infinity;
    for (const p of pools) { const d = dist(p.x, p.y, f.x, f.y); if (d < p.r && d < bd) { bd = d; best = p; } }
    return best;
  };
  const mixed = (f: Fighter, m: Mix) => { const c = coats.get(f); return !!c && c.mix === m && now() < c.mixUntil; };

  function touch(f: Fighter, gl: Glaze, time: number): void {
    const c = coats.get(f);
    if (!c) return;
    if (c.last && c.last !== gl && time - c.lastAt < MIX_WINDOW) {
      const m = mixOf(c.last, gl);
      if (m) {
        c.mix = m; c.mixUntil = time + MIX_MS; c.last = null; c.lastAt = -9999;
        ctx.float(f.x, f.y - 52, MIX_NAMES[m], MIX_CSS[m]);
        ctx.sfx('prism');
        return;
      }
    }
    if (c.last !== gl || time - c.lastAt > 300) { c.last = gl; }
    c.lastAt = time;
  }

  function drop(time: number): void {
    // Drops fall nearer the fighters than not, so the floor is always a choice.
    const near = rng() < 0.6 ? (rng() < 0.5 ? player : npc) : null;
    const x = near ? clamp(near.x + (rng() - 0.5) * 300, 60, W - 60) : 70 + rng() * (W - 140);
    const y = near ? clamp(near.y + (rng() - 0.5) * 240, top + 60, H - 50) : top + 70 + rng() * (H - top - 120);
    const glaze = order[turn++ % 3];
    drips.push({ x, y, glaze, at: time });
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextDrip = time + 600;
        for (let i = 0; i < 3; i++) pools.push({ x: 220 + i * 260, y: (top + H) / 2 + (i % 2 ? 90 : -90), r: POOL_R, glaze: order[i], at: time });
      }
      if (time >= nextDrip) { nextDrip = time + (ctx.hard ? 1100 : 1400); drop(time); }
      // Drops land.
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        if (time - d.at < DRIP_WARN) continue;
        drips.splice(i, 1);
        pools.push({ x: d.x, y: d.y, r: POOL_R * (0.85 + rng() * 0.35), glaze: d.glaze, at: time });
        if (pools.length > 10) pools.shift();
        ctx.sfx('slime-splat');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(d.x, d.y, f.x, f.y) > 34) continue;
          ctx.hit(f, 4, d.x, d.y);
          touch(f, d.glaze, time);
        }
      }
      for (let i = pools.length - 1; i >= 0; i--) if (time - pools[i].at > POOL_MS) pools.splice(i, 1);

      for (const [f, c] of coats) {
        if (!alive(f)) continue;
        const p = poolAt(f);
        if (p) {
          touch(f, p.glaze, time);
          if (p.glaze === 'oxblood' && time >= c.burnAt) { c.burnAt = time + 500; ctx.hit(f, 3, f.x, f.y); }
        }
        if (c.mix && time >= c.mixUntil) c.mix = null;
        // Tenmoku runs off the wearer as a trail.
        if (c.mix === 'tenmoku' && time >= c.trailAt) { c.trailAt = time + 110; trails.push({ x: f.x, y: f.y + 6, at: time, owner: f }); }
      }
      for (let i = trails.length - 1; i >= 0; i--) if (time - trails[i].at > 3000) trails.splice(i, 1);
      // The iron run burns the wearer's foe.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const c = coats.get(f);
        if (!c || time < c.burnAt) continue;
        if (trails.some((t) => t.owner !== f && time - t.at > 250 && dist(t.x, t.y, f.x, f.y) < 24)) {
          c.burnAt = time + 500;
          ctx.hit(f, 4, f.x, f.y);
        }
      }
    },

    playerSpeedMult() {
      const p = poolAt(player);
      return p?.glaze === 'celadon' ? 0.6 : p?.glaze === 'cobalt' ? 1.4 : 1;
    },
    npcSpeedMult() {
      const p = poolAt(npc);
      return p?.glaze === 'celadon' ? 0.6 : p?.glaze === 'cobalt' ? 1.4 : 1;
    },
    playerTakenMult() { return (mixed(player, 'chun') ? 0.67 : 1) * (mixed(npc, 'flambe') ? 1.33 : 1); },
    npcTakenMult() { return (mixed(npc, 'chun') ? 0.67 : 1) * (mixed(player, 'flambe') ? 1.33 : 1); },

    npcSeek() {
      // Celadon walks her mixes: having touched one glaze, she goes for the partner that makes
      // flambé (or chun when hurt); fresh, she starts with cobalt.
      const c = coats.get(npc);
      if (!c || pools.length === 0) return null;
      const time = now();
      if (c.mix && time < c.mixUntil) {
        // Mixed: flambé presses in, tenmoku circles you, chun stands its ground.
        if (c.mix === 'tenmoku') { const a = time / 900; return { x: clamp(player.x + Math.cos(a) * 130, 60, W - 60), y: clamp(player.y + Math.sin(a) * 110, top + 50, H - 40) }; }
        return c.mix === 'flambe' ? { x: player.x, y: player.y } : null;
      }
      const hurt = npc.hp < npc.maxHp * 0.45;
      let want: Glaze[];
      if (c.last && time - c.lastAt < MIX_WINDOW) {
        want = c.last === 'cobalt' ? (hurt ? ['celadon'] : ['oxblood']) : c.last === 'oxblood' ? ['cobalt', 'celadon'] : ['cobalt', 'oxblood'];
      } else want = hurt ? ['celadon', 'cobalt'] : ['cobalt'];
      let best: Pt | null = null, bd = Infinity;
      for (const p of pools) {
        if (!want.includes(p.glaze)) continue;
        if (c.last === p.glaze) continue;
        const d = dist(p.x, p.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = { x: p.x, y: p.y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Tenmoku runs: iron-black, rust at the edges.
      for (const t of trails) {
        const k = clamp(1 - (time - t.at) / 3000, 0, 1);
        g.fillStyle(TENMOKU_EDGE, 0.5 * k); g.fillCircle(t.x, t.y, 13);
        g.fillStyle(TENMOKU, 0.85 * k); g.fillCircle(t.x, t.y, 10);
      }
      // Pools: glossy, thick at the middle, a lit meniscus; fading as they dry.
      for (const p of pools) {
        const age = time - p.at;
        const fade = clamp((POOL_MS - age) / 1500, 0, 1);
        const grow = clamp(age / 220, 0, 1);
        const r = p.r * (0.5 + grow * 0.5);
        const c = COLORS[p.glaze];
        g.fillStyle(dim(c, 0.4), 0.6 * fade); g.fillEllipse(p.x + 2, p.y + 3, r * 2.1, r * 1.45);
        g.fillStyle(c, 0.85 * fade); g.fillEllipse(p.x, p.y, r * 2, r * 1.4);
        g.fillStyle(lit(c, 0.25), 0.5 * fade); g.fillEllipse(p.x - r * 0.15, p.y - r * 0.12, r * 1.2, r * 0.7);
        g.fillStyle(0xffffff, 0.45 * fade); g.fillEllipse(p.x - r * 0.4, p.y - r * 0.3, r * 0.45, r * 0.14);
        // A pinhole or two, and crawl at the edge.
        g.fillStyle(dim(c, 0.5), 0.6 * fade); g.fillCircle(p.x + r * 0.3, p.y + r * 0.1, 1.6); g.fillCircle(p.x - r * 0.1, p.y + r * 0.3, 1.2);
        if (p.glaze === 'oxblood') {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 700) + i / 3) % 1;
            g.fillStyle(OXBLOOD_LIT, 0.5 * (1 - ph) * fade); g.fillCircle(p.x + (i - 1) * r * 0.5, p.y - ph * 20, 2);
          }
        }
      }
      // Where drops will land: a shadow swelling, coloured at the heart.
      for (const d of drips) {
        const k = clamp((time - d.at) / DRIP_WARN, 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.2); g.fillEllipse(d.x, d.y, 20 + k * 50, 10 + k * 26);
        g.lineStyle(2, COLORS[d.glaze], 0.3 + k * 0.6); g.strokeEllipse(d.x, d.y, 24 + k * 54, 12 + k * 28);
      }
    },

    drawAir(g, time) {
      // The trailing-rig: a beam across the top with slip-trailers hanging from it.
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, top + 2, W, 7);
      for (let x = 40; x < W; x += 80) {
        const gl = order[(x / 80) % 3 | 0];
        g.lineStyle(1.5, 0x3a2a1a, 1); g.lineBetween(x, top + 9, x, top + 20);
        g.fillStyle(lit(COLORS[gl], 0.1), 1); g.fillEllipse(x, top + 24, 12, 10);
        g.fillStyle(COLORS[gl], 1); g.fillTriangle(x - 3, top + 28, x + 3, top + 28, x, top + 34);
      }
      // Falling drops: a bead with a streak, dropping as the shadow swells.
      for (const d of drips) {
        const k = clamp((time - d.at) / DRIP_WARN, 0, 1);
        const y = d.y - (1 - k * k) * 260;
        const c = COLORS[d.glaze];
        g.lineStyle(3, c, 0.5); g.lineBetween(d.x, y - 22, d.x, y - 4);
        g.fillStyle(c, 1); g.fillCircle(d.x, y, 6);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(d.x - 2, y - 2, 2);
      }
      // Each fighter's coat: the last glaze touched (and its window running out), or the mix.
      for (const [f, c] of coats) {
        if (!alive(f)) continue;
        if (c.mix && time < c.mixUntil) {
          const col = MIX_COLORS[c.mix];
          const left = (c.mixUntil - time) / MIX_MS;
          g.lineStyle(4, col, 0.85); g.strokeEllipse(f.x, f.y - 6, 50, 58);
          g.lineStyle(1.5, c.mix === 'tenmoku' ? TENMOKU_EDGE : lit(col, 0.4), 0.9);
          g.beginPath(); g.arc(f.x, f.y - 6, 32, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
          if (c.mix === 'flambe') for (let i = 0; i < 4; i++) { g.lineStyle(2, OXBLOOD_LIT, 0.6); g.lineBetween(f.x - 18 + i * 12, f.y - 30, f.x - 14 + i * 12, f.y + 10); }
          if (c.mix === 'chun') { g.fillStyle(lit(CHUN, 0.3), 0.25); g.fillEllipse(f.x, f.y - 6, 46, 54); }
        } else if (c.last && time - c.lastAt < MIX_WINDOW) {
          const left = 1 - (time - c.lastAt) / MIX_WINDOW;
          const col = COLORS[c.last];
          g.fillStyle(col, 0.5); g.fillEllipse(f.x, f.y + 6, 30, 10);
          g.lineStyle(2, col, 0.4 + left * 0.4); g.beginPath(); g.arc(f.x, f.y - 6, 28, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    drawHud(g) {
      // The mixing card, bottom left: three swatches and what each pair fires to.
      const x = 14, y = H - 70;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 4, y - 4, 140, 62, 6);
      const rows: [Glaze, Glaze, Mix][] = [['celadon', 'cobalt', 'chun'], ['cobalt', 'oxblood', 'flambe'], ['celadon', 'oxblood', 'tenmoku']];
      rows.forEach(([a, b, m], i) => {
        const ry = y + 8 + i * 18;
        g.fillStyle(COLORS[a], 1); g.fillCircle(x + 8, ry, 6);
        g.fillStyle(COLORS[b], 1); g.fillCircle(x + 26, ry, 6);
        g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(x + 38, ry, x + 54, ry); g.lineBetween(x + 50, ry - 3, x + 54, ry); g.lineBetween(x + 50, ry + 3, x + 54, ry);
        g.fillStyle(MIX_COLORS[m], 1); g.fillRoundedRect(x + 62, ry - 6, 64, 12, 5);
        if (m === 'tenmoku') { g.lineStyle(1.5, TENMOKU_EDGE, 1); g.strokeRoundedRect(x + 62, ry - 6, 64, 12, 5); }
      });
    },
  };
}

export const GLAZE_RUN: GimmickDef = {
  id: 'potter-glaze-run',
  rules: 'Glaze drips pool on the floor: celadon slows, cobalt hastens, oxblood burns. Walk two colours within 2.5s and they mix — chun guards, flambé hits harder, tenmoku trails fire.',
  make,
};
