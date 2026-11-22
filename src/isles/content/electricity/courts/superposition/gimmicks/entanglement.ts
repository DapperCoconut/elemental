import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { bellPost } from '../art';
import { BOTH, BOTH_LIT, COPPER, COPPER_LIT, GROUT, SLATE, SLATE_LIT, STATE_A, STATE_B } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Entanglement — the Twins Bell.
 *
 * The floor is set with three pairs of entangled tiles, each pair in its own colour with a little
 * bell over each twin. Step onto a tile and you are standing on its twin — across the room, in the
 * same instant (step off before it will carry you again). And a pair shares what happens to it:
 * hurt while standing on one twin, and whoever stands on the other takes half of it off you.
 *
 * The Bells (two sisters, one fighter, finishing each other's sentences) step onto the tile you
 * are standing on, to arrive on its twin and share your pain the wrong way round — every blow you
 * land on them while you are both on the pair, half comes back to you. Step off, or make them
 * share yours. Every so often the pairs re-tie: the bells ring and the twins swap partners.
 */

const TILE_R = 34;
const PAIRS = 3;
const RETIE_MS = 9000;
const RETIE_WARN = 1400;
const COLORS = [STATE_A, STATE_B, BOTH];

interface Tile { x: number; y: number; twin: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const spots: Pt[] = [
    { x: 160, y: top + 110 }, { x: 800, y: H - 90 },
    { x: 800, y: top + 110 }, { x: 160, y: H - 90 },
    { x: 330, y: (top + H) / 2 }, { x: 630, y: (top + H) / 2 },
  ];
  const tiles: Tile[] = spots.map((p, i) => ({ x: p.x, y: p.y, twin: i ^ 1, color: COLORS[i >> 1] }));
  /** The tile a fighter arrived on and has not yet stepped off (it will not carry them back). */
  const lockedOn = new Map<Fighter, number>([[player, -1], [npc, -1]]);
  const jumps: { from: Pt; to: Pt; at: number; color: number }[] = [];
  const shares: { from: Pt; to: Pt; at: number; amount: number }[] = [];
  let sharing = false;
  let nextRetie = 0;
  let retieWarnAt = -1;
  let started = false;

  const tileUnder = (f: Fighter) => tiles.findIndex((t) => dist(t.x, t.y, f.x, f.y) < TILE_R);

  function retie(time: number): void {
    // Shuffle partners among the six tiles (never leave a tile its own twin).
    const order = [0, 1, 2, 3, 4, 5];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let k = 0; k < PAIRS; k++) {
      const a = order[k * 2], b = order[k * 2 + 1];
      tiles[a].twin = b; tiles[b].twin = a;
      tiles[a].color = tiles[b].color = COLORS[k];
    }
    ctx.banner('THE PAIRS RE-TIE', '#d2c0ff');
    ctx.sfx('crystal-chime');
    jumps.length = 0;
    void time;
  }

  /** Hurt on a tile with the other fighter on its twin: half is taken off you and dealt to them. */
  function share(hurt: Fighter, amount: number): void {
    if (sharing || amount <= 1) return;
    const other = hurt === player ? npc : player;
    if (!alive(hurt) || !alive(other)) return;
    const i = tileUnder(hurt);
    if (i < 0 || tileUnder(other) !== tiles[i].twin) return;
    const half = Math.round(amount / 2);
    sharing = true;
    ctx.heal(hurt, half);
    ctx.hit(other, half, other.x, other.y);
    sharing = false;
    shares.push({ from: { x: hurt.x, y: hurt.y }, to: { x: other.x, y: other.y }, at: ctx.scene.time.now, amount: half });
    ctx.float(other.x, other.y - 48, `SHARED ${half}`, other === player ? '#b4f6ff' : '#ff9ae0');
    ctx.sfx('sonic-pulse');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextRetie = time + RETIE_MS; }
      if (retieWarnAt < 0 && time >= nextRetie - RETIE_WARN) { retieWarnAt = time; ctx.sfx('countdown-tick'); }
      if (time >= nextRetie) { nextRetie = time + (ctx.hard ? RETIE_MS - 2000 : RETIE_MS); retieWarnAt = -1; retie(time); }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const i = tileUnder(f);
        const lock = lockedOn.get(f) ?? -1;
        if (i < 0) { if (lock >= 0) lockedOn.set(f, -1); continue; }
        if (i === lock) continue;
        // Carried to the twin.
        const t = tiles[tiles[i].twin];
        const from = { x: f.x, y: f.y };
        ctx.nudge(f, t.x - f.x, t.y - f.y);
        lockedOn.set(f, tiles[i].twin);
        jumps.push({ from, to: { x: t.x, y: t.y }, at: time, color: tiles[i].color });
        ctx.sfx('teleport');
      }
      for (let i = jumps.length - 1; i >= 0; i--) if (time - jumps[i].at > 600) jumps.splice(i, 1);
      for (let i = shares.length - 1; i >= 0; i--) if (time - shares[i].at > 700) shares.splice(i, 1);
    },

    onPlayerHurt(amount) { share(player, amount); },
    onNpcHurt(amount) { share(npc, amount); },

    npcSeek() {
      // Onto the tile the player stands on, to arrive on its twin.
      const pi = tileUnder(player);
      const ni = tileUnder(npc);
      if (pi >= 0) {
        if (ni === tiles[pi].twin) return { x: npc.x, y: npc.y };
        return { x: tiles[pi].x, y: tiles[pi].y };
      }
      // Otherwise hang by whichever tile is nearest the player, ready to follow.
      let best = tiles[0];
      let bd = Infinity;
      for (const t of tiles) { const d = dist(t.x, t.y, player.x, player.y); if (d < bd) { bd = d; best = t; } }
      const a = Math.atan2(best.y - player.y, best.x - player.x);
      return { x: clamp(best.x + Math.cos(a) * 70, 60, W - 60), y: clamp(best.y + Math.sin(a) * 70, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const warn = retieWarnAt >= 0 ? clamp((time - retieWarnAt) / RETIE_WARN, 0, 1) : 0;
      // The threads between twins, faint, rippling.
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        if (t.twin < i) continue;
        const u = tiles[t.twin];
        const n = 18;
        g.lineStyle(1.5, t.color, 0.12 + warn * 0.3);
        g.beginPath();
        for (let k = 0; k <= n; k++) {
          const f = k / n;
          const x = t.x + (u.x - t.x) * f, y = t.y + (u.y - t.y) * f + Math.sin(f * Math.PI * 4 + time / 200) * 6 * Math.sin(f * Math.PI);
          if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
      for (const [i, t] of tiles.entries()) {
        const on = [player, npc].some((f) => alive(f) && tileUnder(f) === i);
        g.fillStyle(GROUT, 1); g.fillCircle(t.x, t.y, TILE_R + 4);
        g.fillStyle(SLATE, 1); g.fillCircle(t.x, t.y, TILE_R);
        g.fillStyle(dim(t.color, 0.55), 0.8); g.fillCircle(t.x, t.y, TILE_R - 5);
        // An inlay of two interlocked rings.
        g.lineStyle(2.5, t.color, 0.75 + (on ? 0.25 : 0)); g.strokeCircle(t.x - 7, t.y, 12); g.strokeCircle(t.x + 7, t.y, 12);
        g.lineStyle(1, SLATE_LIT, 0.6); g.strokeCircle(t.x, t.y, TILE_R);
        if (on) glow(g, t.x, t.y, TILE_R + 10, t.color, 0.06, 3);
        if (warn > 0) { g.lineStyle(2, BOTH_LIT, warn * (0.5 + 0.5 * Math.sin(time / 60))); g.strokeCircle(t.x, t.y, TILE_R + 8); }
      }
    },

    drawAir(g, time) {
      // Bells over every tile; they swing when anyone lands.
      for (const [i, t] of tiles.entries()) {
        const landed = jumps.some((j) => dist(j.to.x, j.to.y, t.x, t.y) < 4 || dist(j.from.x, j.from.y, t.x, t.y) < TILE_R);
        const sw = landed ? Math.sin(time / 50) * 0.3 : retieWarnAt >= 0 ? Math.sin(time / 80) * 0.2 : 0;
        const bx = t.x + (i % 2 ? 26 : -26), by = t.y - 4;
        bellPost(g, bx, by, t.color);
        if (sw) { g.lineStyle(1.5, COPPER_LIT, 0.8); g.beginPath(); g.arc(bx, by - 68, 16, Math.PI * 0.3 + sw, Math.PI * 0.7 + sw, false); g.strokePath(); }
      }
      // Jumps: a streak from where you were to where you are.
      for (const j of jumps) {
        const k = clamp((time - j.at) / 600, 0, 1);
        g.lineStyle(6 * (1 - k), lit(j.color, 0.3), 0.7 * (1 - k)); g.lineBetween(j.from.x, j.from.y, j.to.x, j.to.y);
        g.lineStyle(2, 0xffffff, 1 - k); g.strokeCircle(j.from.x, j.from.y, 12 + k * 30);
        g.lineStyle(2, j.color, 1 - k); g.strokeCircle(j.to.x, j.to.y, 40 - k * 28);
      }
      // Shares: a bell-ring travelling down the thread.
      for (const s of shares) {
        const k = clamp((time - s.at) / 700, 0, 1);
        const x = s.from.x + (s.to.x - s.from.x) * k, y = s.from.y + (s.to.y - s.from.y) * k;
        g.fillStyle(COPPER, 1 - k * 0.5); g.fillCircle(x, y, 7);
        g.lineStyle(2, BOTH_LIT, 1 - k); g.strokeCircle(x, y, 10 + Math.sin(time / 40) * 3);
      }
    },
  };
}

export const ENTANGLEMENT: GimmickDef = {
  id: 'superposition-entangle',
  rules: 'Entangled tile pairs: step on one and you stand on its twin. Hurt on a twin while your foe stands on the other, and they take half of it off you.',
  make,
};
