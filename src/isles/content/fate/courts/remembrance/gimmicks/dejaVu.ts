import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { photo } from '../art';
import { INK, PAPER, PAPER_DARK, RECALL, RECALL_LIT, SEPIA_DEEP, SEPIA_LIT, SEPIA_PALE } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Déjà Vu — Archivist Again.
 *
 * The Archivist files everything. Every cast either fighter makes is written down where it was
 * made and which way it was thrown — a page added to the ledger. Every few seconds the room has
 * *seen this before*: the last three casts of each fighter play again as long sepia ghosts from
 * exactly where they were first thrown, in exactly the direction they went, faint at first and
 * then solid. Again's replays strike you; yours strike Again. So the room rewards a fighter who
 * remembers: throw your blows from places your foe will walk back into, and step out of the
 * lines you saw the Archivist throw a moment ago.
 */

const KEEP_MS = 16000;
const REPLAYS = 3;
const RAY = 1000;
const HALF = 30;
const REPLAY_WARN = 1200;
const STAGGER = 260;

interface Page { who: 'player' | 'npc'; x: number; y: number; a: number; at: number }
interface Replay { who: 'player' | 'npc'; x: number; y: number; a: number; warnAt: number; fireAt: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const ledger: Page[] = [];
  const replays: Replay[] = [];
  const every = ctx.hard ? 6200 : 7600;
  const DV_WARN = 900;
  let nextDv = 0;
  let warned = false;
  let started = false;
  let now = 0;

  const fighterOf = (o: 'player' | 'npc'): Fighter => (o === 'player' ? player : npc);

  function file(who: 'player' | 'npc'): void {
    const f = fighterOf(who);
    if (!alive(f)) return;
    // Two casts a breath apart are one page.
    const last = ledger.filter((p) => p.who === who).slice(-1)[0];
    if (last && now - last.at < 350) return;
    // The bot throws at you, whatever way it is walking; the player throws where they aim.
    const a = who === 'npc' ? Math.atan2(player.y - npc.y, player.x - npc.x) : ctx.facing(f);
    ledger.push({ who, x: f.x, y: f.y, a, at: now });
    while (ledger.length > 40) ledger.shift();
  }

  function dejaVu(): void {
    let i = 0;
    for (const who of ['npc', 'player'] as const) {
      const pages = ledger.filter((p) => p.who === who && now - p.at < KEEP_MS).slice(-REPLAYS);
      // A fight that has thrown nothing yet still remembers the Archivist's opening page.
      if (!pages.length && who === 'npc' && alive(npc)) pages.push({ who, x: npc.x, y: npc.y, a: Math.atan2(player.y - npc.y, player.x - npc.x), at: now });
      for (const p of pages) {
        const warnAt = now + i * STAGGER;
        replays.push({ who, x: p.x, y: p.y, a: p.a, warnAt, fireAt: warnAt + ctx.tk.warn(REPLAY_WARN), dealt: false });
        i++;
      }
    }
    ctx.sfx('time-warp');
  }

  const inRay = (f: Fighter, r: Replay) => segDist(f.x, f.y, r.x, r.y, r.x + Math.cos(r.a) * RAY, r.y + Math.sin(r.a) * RAY) < HALF + 12;

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) { started = true; nextDv = time + every; }
      if (!warned && time >= nextDv - DV_WARN) { warned = true; ctx.banner('DÉJÀ VU — THE ROOM HAS SEEN THIS BEFORE', '#e8c890'); ctx.sfx('clock-tick'); }
      if (time >= nextDv) { nextDv = time + every; warned = false; dejaVu(); }
      for (const r of replays) {
        if (r.dealt || time < r.fireAt) continue;
        r.dealt = true;
        ctx.sfx('beam-fire');
        if (r.who === 'npc') { if (alive(player) && inRay(player, r)) ctx.tk.hitPlayer(12, player.x, player.y); }
        else if (alive(npc) && inRay(npc, r)) { ctx.hit(npc, 12, npc.x, npc.y); ctx.float(npc.x, npc.y - 44, 'SEEN IT', '#e8c890'); }
      }
      for (let i = replays.length - 1; i >= 0; i--) if (replays[i].dealt && time - replays[i].fireAt > 600) replays.splice(i, 1);
    },

    onPlayerCast() { file('player'); },
    onNpcCast() { file('npc'); },

    npcSeek() {
      // While the past is replaying, the Archivist steps out of your old lines.
      const live = replays.filter((r) => !r.dealt && r.who === 'player');
      const desire = (x: number, y: number) => -Math.abs(dist(x, y, player.x, player.y) - 230) * 0.5;
      if (live.length) {
        let best: Pt | null = null, bs = -Infinity;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const x = clamp(npc.x + Math.cos(a) * 140, 60, W - 60), y = clamp(npc.y + Math.sin(a) * 120, top + 60, H - 50);
          const clear = live.reduce((m, r) => Math.min(m, segDist(x, y, r.x, r.y, r.x + Math.cos(r.a) * RAY, r.y + Math.sin(r.a) * RAY)), 999);
          const s = Math.min(clear, 120) * 3 + desire(x, y);
          if (s > bs) { bs = s; best = { x, y }; }
        }
        return best;
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x) + 0.4;
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // Where every filed cast was made: a little page on the floor, curling as it ages.
      for (const p of ledger) {
        const age = (time - p.at) / KEEP_MS;
        if (age > 1) continue;
        photo(g, p.x, p.y + 10, 14, 10, p.a, 0.4 + age * 0.5, Math.round(p.x));
        g.lineStyle(1, p.who === 'npc' ? SEPIA_DEEP : RECALL, 0.4 * (1 - age));
        g.lineBetween(p.x, p.y + 10, p.x + Math.cos(p.a) * 26, p.y + 10 + Math.sin(p.a) * 26);
      }
      // Replays: a long sepia ghost along the old throw, dashed while faint, solid when it fires.
      for (const r of replays) {
        if (time < r.warnAt) continue;
        const ex = r.x + Math.cos(r.a) * RAY, ey = r.y + Math.sin(r.a) * RAY;
        const col = r.who === 'npc' ? SEPIA_DEEP : RECALL;
        if (r.dealt) {
          const e = clamp((time - r.fireAt) / 600, 0, 1);
          g.lineStyle(HALF * 2, r.who === 'npc' ? SEPIA_LIT : RECALL_LIT, 0.55 * (1 - e)); g.lineBetween(r.x, r.y, ex, ey);
          continue;
        }
        const k = clamp((time - r.warnAt) / Math.max(1, r.fireAt - r.warnAt), 0, 1);
        g.lineStyle(HALF * 2, col, 0.05 + k * 0.16); g.lineBetween(r.x, r.y, ex, ey);
        // Dashed edges, marching forward like a film running.
        const nx = -Math.sin(r.a), ny = Math.cos(r.a);
        for (let d = (time / 8) % 40; d < RAY; d += 40) {
          for (const sg of [-1, 1]) {
            const x1 = r.x + Math.cos(r.a) * d + nx * HALF * sg, y1 = r.y + Math.sin(r.a) * d + ny * HALF * sg;
            g.lineStyle(2, col, 0.3 + k * 0.6); g.lineBetween(x1, y1, x1 + Math.cos(r.a) * 18, y1 + Math.sin(r.a) * 18);
          }
        }
        // The ghost of the thrower, where they stood.
        g.fillStyle(SEPIA_PALE, 0.25 + k * 0.3); g.fillCircle(r.x, r.y, 16);
        g.lineStyle(1.5, col, 0.7); g.strokeCircle(r.x, r.y, 16); g.strokeCircle(r.x, r.y - 20, 8);
      }
    },

    drawAir(g, time) {
      // Sprocket-holed film frames over each live replay's origin, ticking.
      for (const r of replays) {
        if (r.dealt || time < r.warnAt) continue;
        const k = clamp((time - r.warnAt) / Math.max(1, r.fireAt - r.warnAt), 0, 1);
        const x = r.x, y = r.y - 44;
        g.fillStyle(0x1a1410, 0.75); g.fillRect(x - 18, y - 12, 36, 24);
        for (let i = 0; i < 4; i++) { g.fillStyle(PAPER, 0.8); g.fillRect(x - 15 + i * 9, y - 10, 4, 3); g.fillRect(x - 15 + i * 9, y + 7, 4, 3); }
        g.fillStyle(lit(SEPIA_LIT, k * 0.4), 0.9); g.fillRect(x - 12, y - 5, 24, 10);
        g.fillStyle(r.who === 'npc' ? SEPIA_DEEP : RECALL, 1); g.fillRect(x - 12, y - 5, 24 * k, 10);
      }
    },

    drawHud(g, time) {
      // The ledger page: a dog-eared sheet whose lines fill as the next déjà vu comes due.
      const x = W / 2 - 60, y = top + 4;
      const k = clamp(1 - (nextDv - time) / every, 0, 1);
      g.fillStyle(PAPER_DARK, 1); g.fillRect(x, y, 120, 20);
      g.fillStyle(PAPER, 1); g.fillRect(x + 1, y + 1, 118, 18);
      g.fillStyle(PAPER_DARK, 1); g.fillTriangle(x + 108, y + 1, x + 119, y + 1, x + 119, y + 11);
      for (let i = 0; i < 3; i++) {
        const lw = clamp(k * 3 - i, 0, 1) * 100;
        g.lineStyle(1.5, INK, 0.75); g.lineBetween(x + 8, y + 5 + i * 5, x + 8 + lw, y + 5 + i * 5);
      }
      if (warned) { g.lineStyle(2, RECALL, 0.6 + Math.sin(time / 70) * 0.3); g.strokeRect(x - 2, y - 2, 124, 24); }
    },
  };
}

export const DEJA_VU: GimmickDef = {
  id: 'remembrance-deja-vu',
  rules: 'Every cast is filed where it was thrown. Every few seconds the last three of each fighter replay in sepia from the same spot, same direction — Again\'s at you, yours at Again.',
  make,
};
