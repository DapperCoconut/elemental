import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { BLOOM_PINK, LEAF, STEM, TIMBER_LIT, WILT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Graft — Grafter Ives.
 *
 * Ives grafts. Every blow that lands between the two of you binds a living vine from one to
 * the other, cut to the length you stood apart when it struck, with a little slack. A vine
 * stretched past its length pulls you both together; stretched much further it *tears* — and a
 * tearing graft wounds whoever was pulling away, not whoever stood still.
 *
 * Ives is a string-fighter and likes his distance, so his vines are his weakness: graft him up
 * close, then stand your ground while he backs off. Vines wither on their own after a while.
 * Up to three can hold at once; the shortest is always the one about to tear.
 */

const SLACK = 50;
const TEAR_AT = 150;
const MAX_VINES = 3;
const LIFE_MS = 9000;
const PULL_MAX = 70;

interface Vine {
  rest: number;
  bornAt: number;
  seed: number;
  /** Leaves along it: positions 0..1. */
  leaves: number[];
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, rng } = ctx;
  const vines: Vine[] = [];
  const tearDmg = ctx.hard ? 18 : 14;
  let lastGraft = 0;
  let lpx = player.x, lpy = player.y, lnx = npc.x, lny = npc.y;
  /** Each fighter's recent outward motion (px along the line away from the other). */
  let awayP = 0, awayN = 0;
  let tears: { x: number; y: number; at: number }[] = [];

  function graft(time: number): void {
    if (time - lastGraft < 500 || !alive(player) || !alive(npc)) return;
    lastGraft = time;
    const d = dist(player.x, player.y, npc.x, npc.y);
    if (vines.length >= MAX_VINES) vines.shift();
    vines.push({ rest: d + SLACK, bornAt: time, seed: rng() * 10, leaves: [0.2, 0.45, 0.7].map((k) => k + (rng() - 0.5) * 0.1) });
    ctx.float((player.x + npc.x) / 2, (player.y + npc.y) / 2 - 30, 'GRAFTED', '#a8f0a0');
    ctx.sfx('whip');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      const d = dist(player.x, player.y, npc.x, npc.y) || 1;
      const ux = (npc.x - player.x) / d, uy = (npc.y - player.y) / d;
      // Who is pulling away: each one's own motion along the line, away from the other.
      const mp = -((player.x - lpx) * ux + (player.y - lpy) * uy);
      const mn = (npc.x - lnx) * ux + (npc.y - lny) * uy;
      awayP = awayP * 0.85 + mp; awayN = awayN * 0.85 + mn;
      lpx = player.x; lpy = player.y; lnx = npc.x; lny = npc.y;

      for (let i = vines.length - 1; i >= 0; i--) {
        const v = vines[i];
        if (time - v.bornAt > LIFE_MS) { vines.splice(i, 1); continue; }
        const over = d - v.rest;
        if (over > TEAR_AT) {
          // Tear: whoever was moving away more takes it.
          const f = awayP >= awayN ? player : npc;
          if (alive(f)) {
            ctx.hit(f, tearDmg, f.x, f.y);
            ctx.float(f.x, f.y - 48, f === player ? 'TORN!' : 'IVES TORE IT', f === player ? '#ff9a7a' : '#a8f0a0');
          }
          tears.push({ x: (player.x + npc.x) / 2, y: (player.y + npc.y) / 2, at: time });
          ctx.sfx('snap-back');
          vines.splice(i, 1);
        }
      }
      // The tightest vine draws you both in.
      const tight = vines.reduce((m, v) => Math.max(m, d - v.rest), 0);
      if (tight > 0 && alive(player) && alive(npc)) {
        const s = Math.min(PULL_MAX, tight * 0.9) * dt;
        ctx.nudge(player, ux * s, uy * s);
        ctx.nudge(npc, -ux * s, -uy * s);
      }
      tears = tears.filter((t) => time - t.at < 600);
    },

    onNpcHurt(amount) { if (amount >= 3) graft(ctx.scene.time.now); },
    onPlayerHurt(amount) { if (amount >= 3) graft(ctx.scene.time.now); },

    npcSeek() {
      // A vine near tearing: step in so it is not him that tears it.
      const d = dist(player.x, player.y, npc.x, npc.y);
      if (vines.some((v) => d - v.rest > TEAR_AT * 0.4)) return { x: player.x, y: player.y };
      return null;
    },

    drawAir(g, time) {
      const d = dist(player.x, player.y, npc.x, npc.y);
      vines.forEach((v, i) => drawVine(g, v, i, d, time));
      for (const t of tears) {
        const k = (time - t.at) / 600;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(i % 2 ? LEAF : WILT, 1 - k); g.fillEllipse(t.x + Math.cos(a) * k * 40, t.y + Math.sin(a) * k * 30 + k * k * 20, 5, 3);
        }
      }
    },

    drawHud(g) {
      // One pip per vine: fill = how close it is to tearing.
      const d = dist(player.x, player.y, npc.x, npc.y);
      vines.forEach((v, i) => {
        const k = clamp((d - v.rest) / TEAR_AT, 0, 1);
        const x = W / 2 - 40 + i * 40, y = top + 14;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 16, y - 5, 32, 10, 4);
        g.fillStyle(k > 0.7 ? 0xff7a5a : k > 0 ? 0xf2b632 : 0x7fd67f, 1); g.fillRoundedRect(x - 15, y - 4, Math.max(3, 30 * k), 8, 3);
      });
    },
  };

  function drawVine(g: Phaser.GameObjects.Graphics, v: Vine, idx: number, d: number, time: number): void {
    const over = d - v.rest;
    const taut = clamp(over / TEAR_AT, 0, 1);
    const age = (time - v.bornAt) / LIFE_MS;
    const ax = player.x, ay = player.y - 8, bx = npc.x, by = npc.y - 8;
    // Slack vines sag; taut ones straighten and redden.
    const sag = over < 0 ? Math.min(60, -over * 0.6) + 8 : 8 * (1 - taut);
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag + idx * 6;
    const col = taut > 0.6 ? 0xa04a3a : age > 0.8 ? WILT : STEM;
    const shake = taut > 0.6 ? Math.sin(time / 30) * 2 * taut : 0;
    const pts: { x: number; y: number }[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx;
      const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by + Math.sin(t * 12 + v.seed) * 2 * (1 - taut) + shake;
      pts.push({ x, y });
    }
    g.lineStyle(5, 0x1e3a14, 0.8);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    g.lineStyle(3, col, 1);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
    // Leaves and a bud along it, and the graft-ties at each end.
    for (const lk of v.leaves) {
      const p = pts[Math.round(lk * 16)];
      g.fillStyle(age > 0.8 ? WILT : LEAF, 1); g.fillEllipse(p.x + 4, p.y - 3, 8, 4);
    }
    const mid = pts[8];
    g.fillStyle(BLOOM_PINK, 0.9 * (1 - taut)); g.fillCircle(mid.x, mid.y - 2, 3);
    for (const e of [pts[0], pts[16]]) {
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(e.x - 4, e.y - 2, 8, 4);
      g.lineStyle(1, 0x5a432c, 1); g.lineBetween(e.x - 4, e.y, e.x + 4, e.y);
    }
  }
}

export const GRAFT: GimmickDef = {
  id: 'bloom-graft',
  rules: 'Every landed hit grafts a vine between you, cut to your distance. Stretched, it pulls you together; stretched too far it tears and wounds whoever was pulling away. Up to 3 vines; they wither in 9s.',
  make,
};
