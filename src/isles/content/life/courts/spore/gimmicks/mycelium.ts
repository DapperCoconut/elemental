import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { live, SIDES } from './shared';
import { CSS_GLOW, CSS_WISP, GLOW, GLOW_DEEP, GLOW_WASH, STEM, WHITE } from '../palette';
import { along, distToSeg, dist, hyphaPoints, polyline, toadstool } from '../sporeArt';

/**
 * Mycelium — Netkeeper Hypha's fight.
 *
 * Seven glowcap mushrooms stand about the floor, and glowing threads run under the moss between
 * them — a net, every mushroom tied to its nearest neighbours. **Strike a mushroom** (cast
 * anything while standing at it) and it rings: a pulse of light leaves it down every thread and
 * on through the whole net, mushroom to mushroom. Anyone standing *on a thread* when the pulse
 * runs past is shocked — a sharp hit and a stagger. The mushrooms' own caps are safe ground: the
 * pulse jumps through them.
 *
 * Hypha mends the net and knows it by heart. He waits for you to stand on a thread, walks to a
 * mushroom and drums it; and every so often the net rings on its own, from a cap that glows
 * first. The net does not know whose side anyone is on. Stand on a cap, wait for Hypha to cross a
 * thread, and ring it under his feet.
 */

const NODES = 7;
const CAP_SAFE = 44;
const STRIKE_R = 66;
const THREAD_W = 17;
const PULSE_SPEED = 470;
const RING_DELAY = 260;

interface Edge { a: number; b: number; pts: Pt[]; len: number; seed: number }
interface Bead { edge: number; from: number; t0: number }
interface Pulse { src: number; at: number; beads: Bead[]; endAt: number; hit: Set<Side>; lit: number[] }

export const MYCELIUM: GimmickDef = {
  id: 'spore-mycelium',
  rules: 'Strike a glowcap and a pulse runs every thread of the net. Anyone standing on a thread when it passes is shocked; the caps are safe.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const shock = hard ? 12 : 9;
    const drumEvery = hard ? 3600 : 4600;
    const selfEvery = hard ? 6200 : 7800;

    // Lay the net: seven caps in a loose ring round the middle plus one off-centre.
    const nodes: Pt[] = [];
    const cx = W / 2, cy = (top + H) / 2 + 10;
    for (let i = 0; i < NODES - 1; i++) {
      const a = (i / (NODES - 1)) * Math.PI * 2 + ctx.rng() * 0.4;
      nodes.push({ x: Phaser.Math.Clamp(cx + Math.cos(a) * (300 + ctx.rng() * 70), 70, W - 70), y: Phaser.Math.Clamp(cy + Math.sin(a) * (175 + ctx.rng() * 40), top + 50, H - 50) });
    }
    nodes.push({ x: cx + (ctx.rng() - 0.5) * 120, y: cy + (ctx.rng() - 0.5) * 70 });
    const edges: Edge[] = [];
    const has = (a: number, b: number): boolean => edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => ({ j, d: dist(n.x, n.y, m.x, m.y) })).filter((q) => q.j !== i).sort((p, q) => p.d - q.d).slice(0, 2);
      for (const q of near) {
        if (has(i, q.j)) continue;
        const seed = i * 13 + q.j * 7;
        const pts = hyphaPoints(n, nodes[q.j], seed, 12);
        let len = 0;
        for (let k = 1; k < pts.length; k++) len += dist(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
        edges.push({ a: i, b: q.j, pts, len, seed });
      }
    });

    let pulses: Pulse[] = [];
    const flashAt: number[] = nodes.map(() => -99999);
    const nodeReady: number[] = nodes.map(() => 0);
    let warnNode = -1;
    let warnAt = 0;
    let selfAt = ctx.scene.time.now + selfEvery;
    let drumAt = ctx.scene.time.now + 2600;
    const seenPress = { p: Date.now(), n: Date.now() };
    const shockFx: { x: number; y: number; at: number }[] = [];
    const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);

    const onCap = (f: Fighter): boolean => nodes.some((n) => dist(f.x, f.y, n.x, n.y) < CAP_SAFE);
    const threadAt = (f: Fighter): number => {
      if (onCap(f)) return -1;
      for (let i = 0; i < edges.length; i++) {
        const pts = edges[i].pts;
        for (let k = 1; k < pts.length; k++) if (distToSeg(f.x, f.y, pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y) < THREAD_W) return i;
      }
      return -1;
    };
    const nearestNode = (x: number, y: number): number => {
      let best = 0, bd = Infinity;
      nodes.forEach((n, i) => { const d = dist(x, y, n.x, n.y); if (d < bd) { bd = d; best = i; } });
      return best;
    };

    /** Ring the net from one cap: arrival time at every cap, then a bead down every thread. */
    const ring = (src: number, time: number, who: string): void => {
      if (time < nodeReady[src]) return;
      nodeReady[src] = time + 1500;
      flashAt[src] = time;
      const start = time + RING_DELAY;
      const arr = nodes.map(() => Infinity);
      arr[src] = start;
      const done = new Set<number>();
      for (let it = 0; it < nodes.length; it++) {
        let u = -1;
        for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (u < 0 || arr[i] < arr[u])) u = i;
        if (u < 0 || arr[u] === Infinity) break;
        done.add(u);
        for (const e of edges) {
          const v = e.a === u ? e.b : e.b === u ? e.a : -1;
          if (v < 0) continue;
          arr[v] = Math.min(arr[v], arr[u] + (e.len / PULSE_SPEED) * 1000);
        }
      }
      const beads: Bead[] = [];
      let endAt = start;
      edges.forEach((e, i) => {
        const from = arr[e.a] <= arr[e.b] ? e.a : e.b;
        if (arr[from] === Infinity) return;
        beads.push({ edge: i, from, t0: arr[from] });
        endAt = Math.max(endAt, arr[from] + (e.len / PULSE_SPEED) * 1000);
      });
      pulses.push({ src, at: start, beads, endAt, hit: new Set(), lit: arr.map((a) => (a === Infinity ? -1 : a)) });
      ctx.sfx('electric-charge');
      if (who) ctx.float(nodes[src].x, nodes[src].y - 50, who, CSS_GLOW);
    };

    const beadPos = (b: Bead, time: number): Pt | null => {
      const e = edges[b.edge];
      const k = ((time - b.t0) / 1000) * PULSE_SPEED / e.len;
      if (k < 0 || k > 1) return null;
      return along(e.pts, b.from === e.a ? k : 1 - k);
    };

    return {
      update(time) {
        // Strikes: a cast made while standing at a cap rings it.
        for (const k of SIDES) {
          const f = fOf(k);
          const at = f.lastPressAt ?? 0;
          if (at <= seenPress[k]) continue;
          seenPress[k] = at;
          if (!live(f)) continue;
          const i = nearestNode(f.x, f.y);
          if (dist(f.x, f.y, nodes[i].x, nodes[i].y) < STRIKE_R) ring(i, time, k === 'p' ? 'RING!' : '');
        }
        // Hypha's drum: if he is at a cap and you are on a thread.
        const n = ctx.npc;
        if (time >= drumAt && live(n)) {
          const i = nearestNode(n.x, n.y);
          if (dist(n.x, n.y, nodes[i].x, nodes[i].y) < STRIKE_R && threadAt(ctx.player) >= 0) {
            drumAt = time + drumEvery;
            ring(i, time, 'HYPHA DRUMS THE NET');
          }
        }
        // The net rings on its own, from a cap that glows first.
        if (warnNode < 0 && time >= selfAt - 900) { warnNode = Math.floor(ctx.rng() * nodes.length); warnAt = time; }
        if (warnNode >= 0 && time >= selfAt) {
          ring(warnNode, time, '');
          warnNode = -1;
          selfAt = time + selfEvery;
        }
        // Shocks.
        for (const pu of pulses) {
          if (time < pu.at) continue;
          for (const k of SIDES) {
            if (pu.hit.has(k)) continue;
            const f = fOf(k);
            if (!live(f)) continue;
            const e = threadAt(f);
            if (e < 0) continue;
            for (const b of pu.beads) {
              if (b.edge !== e) continue;
              const q = beadPos(b, time);
              if (!q || dist(q.x, q.y, f.x, f.y) > 34) continue;
              pu.hit.add(k);
              ctx.hit(f, shock, f.x, f.y);
              ctx.stun(f, hard ? 380 : 300);
              shockFx.push({ x: f.x, y: f.y, at: time });
              ctx.sfx('zap');
              if (k === 'n') ctx.float(f.x, f.y - 46, 'HYPHA IS ON THE LINE', CSS_WISP);
              break;
            }
          }
        }
        pulses = pulses.filter((pu) => time < pu.endAt + 300);
        while (shockFx.length && time - shockFx[0].at > 420) shockFx.shift();
      },

      npcSeek() {
        const n = ctx.npc;
        const t = ctx.scene.time.now;
        const hot = pulses.some((pu) => t < pu.endAt) || warnNode >= 0;
        const i = nearestNode(n.x, n.y);
        // A pulse is out (or coming): off the threads, onto the nearest cap.
        if (hot && threadAt(n) >= 0) return nodes[i];
        // You are on a thread and his drum is ready: go and stand at a cap.
        if (t > drumAt - 800 && threadAt(ctx.player) >= 0) return nodes[i];
        return null;
      },

      drawGround(g, time) {
        // Threads: a dim teal net under the moss.
        for (const e of edges) {
          g.lineStyle(THREAD_W * 1.6, GLOW_DEEP, 0.08); polyline(g, e.pts);
          g.lineStyle(2, GLOW_DEEP, 0.75); polyline(g, e.pts);
          g.lineStyle(1, GLOW, 0.25 + 0.1 * Math.sin(time / 600 + e.seed)); polyline(g, e.pts);
        }
        // A live pulse lights the threads behind it and runs a bright bead along each.
        for (const pu of pulses) {
          for (const b of pu.beads) {
            const e = edges[b.edge];
            const k = Phaser.Math.Clamp(((time - b.t0) / 1000) * PULSE_SPEED / e.len, 0, 1);
            if (time < b.t0) continue;
            const pts = e.pts;
            const sub: Pt[] = [];
            const steps = 12;
            for (let s = 0; s <= steps; s++) {
              const q = (s / steps) * k;
              sub.push(along(pts, b.from === e.a ? q : 1 - q));
            }
            const fade = Phaser.Math.Clamp((pu.endAt + 300 - time) / 500, 0, 1);
            g.lineStyle(THREAD_W, GLOW, 0.18 * fade); polyline(g, sub);
            g.lineStyle(3, GLOW_WASH, 0.85 * fade); polyline(g, sub);
            const q = beadPos(b, time);
            if (q) {
              g.fillStyle(GLOW, 0.35); g.fillCircle(q.x, q.y, 18);
              g.fillStyle(WHITE, 1); g.fillCircle(q.x, q.y, 5);
            }
          }
        }
        // The cap that is about to ring on its own: a tightening ring.
        if (warnNode >= 0) {
          const nd = nodes[warnNode];
          const k = Phaser.Math.Clamp((time - warnAt) / 900, 0, 1);
          g.lineStyle(3, GLOW_WASH, 0.4 + 0.5 * k); g.strokeCircle(nd.x, nd.y, 80 - 40 * k);
        }
      },

      drawAir(g, time) {
        // The caps: tall glowcaps, the safe ground, flaring when struck.
        nodes.forEach((nd, i) => {
          const since = time - flashAt[i];
          const flare = since < 500 ? 1 - since / 500 : 0;
          const hum = 0.5 + 0.5 * Math.sin(time / 400 + i);
          g.fillStyle(GLOW, 0.06 + 0.05 * hum + flare * 0.3); g.fillCircle(nd.x, nd.y - 14, CAP_SAFE + flare * 26);
          g.lineStyle(1, GLOW, 0.25); g.strokeCircle(nd.x, nd.y, CAP_SAFE);
          toadstool(g, nd.x, nd.y + 6, 15, flare > 0 ? 0x9fffe6 : GLOW_DEEP, false, 1, i);
          g.fillStyle(GLOW, 0.5 + 0.4 * hum + flare * 0.5);
          g.fillEllipse(nd.x - 2, nd.y - 12, 20, 6);
          if (flare > 0) {
            for (let s = 0; s < 6; s++) {
              const a = (s / 6) * Math.PI * 2 + i;
              g.lineStyle(2, WHITE, flare); g.lineBetween(nd.x + Math.cos(a) * 18, nd.y - 10 + Math.sin(a) * 12, nd.x + Math.cos(a) * (30 + (1 - flare) * 18), nd.y - 10 + Math.sin(a) * (20 + (1 - flare) * 10));
            }
          }
        });
        // Shocked fighters: a jagged crackle round them.
        for (const s of shockFx) {
          const q = (time - s.at) / 420;
          g.lineStyle(2, GLOW_WASH, 1 - q);
          let px = s.x - 20, py = s.y - 6;
          for (let k = 1; k <= 6; k++) {
            const nx = s.x - 20 + k * 7, ny = s.y - 6 + ((k * 37 + Math.floor(time / 40)) % 3 - 1) * 9;
            g.lineBetween(px, py, nx, ny); px = nx; py = ny;
          }
        }
        // A fighter standing on a thread wears a faint teal ring at the feet — you are on the line.
        for (const k of SIDES) {
          const f = fOf(k);
          if (!live(f) || threadAt(f) < 0) continue;
          g.lineStyle(1.5, GLOW, 0.5 + 0.3 * Math.sin(time / 90)); g.strokeEllipse(f.x, f.y + 16, 34, 10);
        }
      },

      drawHud(g) {
        // Hypha's drum: a cap on a stick that rises toward his next strike.
        const t = ctx.scene.time.now;
        const k = Phaser.Math.Clamp(1 - (drumAt - t) / drumEvery, 0, 1);
        const x = W / 2, y = 112;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 64, y - 8, 128, 16, 6);
        g.fillStyle(GLOW_DEEP, 1); g.fillRoundedRect(x - 60, y - 4, 120, 8, 4);
        g.fillStyle(GLOW, 1); g.fillRoundedRect(x - 60, y - 4, 120 * k, 8, 4);
        g.fillStyle(STEM, 1); g.fillCircle(x - 60 + 120 * k, y, 5);
      },
    };
  },
};
