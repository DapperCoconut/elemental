import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { bandsman, musicStand, note, type BandPart } from '../art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, BRICK, BRICK_DARK, CREAM, FURNACE, SCARLET, SCARLET_DARK, SILVER, STONE_LIT, WOOD, WOOD_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Bandstand — Bandleader Baton.
 *
 * A bandstand stands in the middle of the lawn, and the band sits round the edges with their
 * music up. Whoever holds the bandstand — alone, for a moment — conducts, and the band plays
 * for them: on every beat one of the bandsmen sends a note flying at the other fighter. But
 * a conductor stands up there in front of everyone: they take more damage while they hold it.
 *
 * Both on the stand and it's contested: the band waits, instruments up, for someone to win it.
 * Baton will always want it back. Take it when he is weak, leave it when you are.
 */

const STAND_R = 86;
const TAKE_MS = 600;
const NOTE_R = 9;
const NOTE_SPEED = 300;
const NOTE_DMG = 7;

interface NoteShot { x: number; y: number; vx: number; vy: number; at: Fighter; bornAt: number; byPlayer: boolean; kind: number }

const SEATS: BandPart[] = ['cornet', 'trombone', 'tuba', 'drum', 'cornet', 'trombone', 'tuba', 'cornet'];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const BEAT = ctx.hard ? 560 : 660;
  const takenMult = ctx.hard ? 1.5 : 1.35;
  const cx = W / 2, cy = (top + H) / 2 + 12;
  const seats: Pt[] = [];
  for (let i = 0; i < 4; i++) seats.push({ x: 120 + i * ((W - 240) / 3), y: top + 30 });
  for (let i = 0; i < 4; i++) seats.push({ x: 120 + i * ((W - 240) / 3), y: H - 24 });
  const notes: NoteShot[] = [];
  let holder: Fighter | null = null;
  let onSince = new Map<Fighter, number>([[player, -1], [npc, -1]]);
  let contested = false;
  let nextBeat = 0;
  let beatN = 0;
  let seat = 0;
  let started = false;

  const onStand = (f: Fighter) => alive(f) && dist(f.x, f.y, cx, cy) < STAND_R;

  function play(time: number): void {
    if (!holder || !alive(holder)) return;
    const at = holder === player ? npc : player;
    if (!alive(at)) return;
    const shots = beatN % 4 === 0 ? 2 : 1;
    for (let k = 0; k < shots; k++) {
      // The seats take turns round the lawn.
      seat = (seat + 3) % seats.length;
      const s = seats[seat];
      const a = Math.atan2(at.y - s.y, at.x - s.x);
      notes.push({ x: s.x, y: s.y - 16, vx: Math.cos(a) * NOTE_SPEED, vy: Math.sin(a) * NOTE_SPEED, at, bornAt: time, byPlayer: holder === player, kind: (beatN + k) % 3 });
    }
    ctx.sfx(beatN % 4 === 0 ? 'drum-hit' : 'crystal-chime');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextBeat = time + BEAT; ctx.banner('HOLD THE BANDSTAND — THE BAND PLAYS FOR YOU', '#ffe2a8'); }
      // Who is on the stand, and for how long.
      for (const f of [player, npc]) {
        if (onStand(f)) { if ((onSince.get(f) ?? -1) < 0) onSince.set(f, time); }
        else onSince.set(f, -1);
      }
      const pOn = onStand(player), nOn = onStand(npc);
      contested = pOn && nOn;
      const prev = holder;
      if (contested || (!pOn && !nOn)) holder = null;
      else {
        const f = pOn ? player : npc;
        if (time - (onSince.get(f) ?? time) >= TAKE_MS) holder = f;
      }
      if (holder !== prev && holder) {
        ctx.float(holder.x, holder.y - 52, 'CONDUCTING', holder === player ? '#9ad0ff' : '#ffb08a');
        ctx.sfx('status-buff');
      }
      if (time >= nextBeat) {
        nextBeat += BEAT;
        if (nextBeat < time) nextBeat = time + BEAT;
        beatN++;
        play(time);
      }
      // The notes: a gentle homing on their mark.
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i];
        if (alive(n.at)) {
          const want = Math.atan2(n.at.y - n.y, n.at.x - n.x);
          const cur = Math.atan2(n.vy, n.vx);
          const turn = clamp(wrapAngle(want - cur), -1.3 * dt, 1.3 * dt);
          n.vx = Math.cos(cur + turn) * NOTE_SPEED; n.vy = Math.sin(cur + turn) * NOTE_SPEED;
        }
        n.x += n.vx * dt; n.y += n.vy * dt;
        let gone = time - n.bornAt > 3200 || n.x < -20 || n.x > W + 20 || n.y < top - 20 || n.y > H + 20;
        if (!gone && alive(n.at) && dist(n.x, n.y, n.at.x, n.at.y) < 22 + NOTE_R) {
          ctx.hit(n.at, NOTE_DMG, n.x, n.y);
          gone = true;
        }
        if (gone) notes.splice(i, 1);
      }
    },

    playerTakenMult() { return holder === player ? takenMult : 1; },
    npcTakenMult() { return holder === npc ? takenMult : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const mine = npc.hp / Math.max(1, npc.maxHp), yours = player.hp / Math.max(1, player.maxHp);
      // Hurt and you're conducting: keep off and out of the way of the band's line.
      if (holder === player && mine < yours * 0.6) {
        const a = Math.atan2(npc.y - cy, npc.x - cx);
        return { x: clamp(cx + Math.cos(a) * 280, 60, W - 60), y: clamp(cy + Math.sin(a) * 200, top + 60, H - 50) };
      }
      return { x: cx + (npc.x < cx ? -20 : 20), y: cy };
    },

    drawGround(g, time) {
      // The bandstand's plinth and deck, seen from above: brick octagon, boards, steps.
      const oct = (r: number): Pt[] => {
        const pts: Pt[] = [];
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
        return pts;
      };
      g.fillStyle(0x000000, 0.25); g.fillPoints(oct(STAND_R + 14).map((p) => ({ x: p.x + 4, y: p.y + 8 })), true);
      g.fillStyle(BRICK_DARK, 1); g.fillPoints(oct(STAND_R + 12), true);
      g.fillStyle(BRICK, 1); g.fillPoints(oct(STAND_R + 8), true);
      g.fillStyle(WOOD_LIT, 1); g.fillPoints(oct(STAND_R), true);
      g.lineStyle(1, WOOD, 0.6);
      for (let k = -STAND_R; k < STAND_R; k += 10) {
        const half = Math.sqrt(Math.max(0, STAND_R * STAND_R - k * k)) * 0.92;
        g.lineBetween(cx + k, cy - half, cx + k, cy + half);
      }
      // A painted lyre and a ring of stars in the boards.
      g.lineStyle(2, BRASS_DARK, 0.5); g.strokeCircle(cx, cy, STAND_R * 0.55);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(BRASS, 0.5); g.fillCircle(cx + Math.cos(a) * STAND_R * 0.55, cy + Math.sin(a) * STAND_R * 0.55, 3); }
      // The eight posts' feet and the canopy's shadow.
      for (const p of oct(STAND_R - 6)) { g.fillStyle(SCARLET_DARK, 1); g.fillCircle(p.x, p.y, 5); g.fillStyle(CREAM, 1); g.fillCircle(p.x, p.y - 1, 3.5); }
      g.fillStyle(0x000000, 0.08); g.fillPoints(oct(STAND_R + 20).map((p) => ({ x: p.x + 18, y: p.y + 14 })), true);
      // Steps to the south.
      for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? CREAM : STONE_LIT, 1); g.fillRect(cx - 24 - k * 5, cy + STAND_R + 6 + k * 6, 48 + k * 10, 6); }
      // Who holds it: the deck glows their colour; a contested deck flickers both.
      if (holder || contested) {
        const c = contested ? (Math.floor(time / 120) % 2 ? 0x9ad0ff : 0xffb08a) : holder === player ? 0x9ad0ff : 0xffb08a;
        g.lineStyle(4, c, 0.6 + Math.sin(time / 150) * 0.2); g.strokePoints(oct(STAND_R + 2), true);
      }
      // Someone taking it: an arc filling round them.
      for (const f of [player, npc]) {
        const since = onSince.get(f) ?? -1;
        if (since < 0 || holder === f || contested) continue;
        const k = clamp((time - since) / TAKE_MS, 0, 1);
        g.lineStyle(3, f === player ? 0x9ad0ff : 0xffb08a, 0.8);
        g.beginPath(); g.arc(f.x, f.y, 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },

    drawAir(g, time) {
      // The band round the edges, each behind a music stand.
      seats.forEach((s, i) => {
        const facing = (holder ?? player).x >= s.x ? 1 : -1;
        bandsman(g, s.x, s.y + 8, 0.92, SEATS[i], 0, facing, SCARLET, holder ? time : 0);
        musicStand(g, s.x + facing * 18, s.y + 14, 0.7);
      });
      // The conductor's baton: tracing the four-beat pattern over their head.
      if (holder && alive(holder)) {
        const b = (time % (BEAT * 4)) / BEAT;
        const pat: Pt[] = [{ x: 0, y: 14 }, { x: -14, y: 4 }, { x: 14, y: 4 }, { x: 0, y: -12 }];
        const i0 = Math.floor(b) % 4, i1 = (i0 + 1) % 4, f = b - Math.floor(b);
        const tx = holder.x + 10 + pat[i0].x + (pat[i1].x - pat[i0].x) * f;
        const ty = holder.y - 60 + pat[i0].y + (pat[i1].y - pat[i0].y) * f;
        g.lineStyle(2, SILVER, 1); g.lineBetween(holder.x + 8, holder.y - 36, tx, ty);
        g.fillStyle(0xffffff, 1); g.fillCircle(tx, ty, 2);
        glow(g, tx, ty, 10, BRASS_LIT, 0.08, 2);
      }
      // The notes in flight: quavers, crotchets and semiquavers with a short bright trail.
      for (const n of notes) {
        const c = n.byPlayer ? BRASS_LIT : FURNACE;
        const a = Math.atan2(n.vy, n.vx);
        for (let k = 1; k <= 3; k++) { g.fillStyle(c, 0.25 - k * 0.06); g.fillCircle(n.x - Math.cos(a) * k * 9, n.y - Math.sin(a) * k * 9, NOTE_R * (1 - k * 0.2)); }
        glow(g, n.x, n.y, 14, c, 0.06, 2);
        note(g, n.x - 4, n.y + 6, 6, n.byPlayer ? lit(BRASS, 0.2) : dim(FURNACE, 0.1), (['quaver', 'crotchet', 'semi'] as const)[n.kind], 1);
      }
    },

    drawHud(g, time) {
      const y = top + 14;
      const label = contested ? 2 : holder === player ? 0 : holder === npc ? 1 : -1;
      // A little baton icon over who conducts: left for you, right for the foe.
      for (const [k, x] of [[0, W / 2 - 50], [1, W / 2 + 50]] as [number, number][]) {
        const on = label === k || label === 2;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 22, y - 9, 44, 18, 6);
        g.lineStyle(2, on ? (k === 0 ? 0x9ad0ff : 0xffb08a) : 0x666666, on ? 1 : 0.6);
        g.lineBetween(x - 12, y + 4, x + 10, y - 4);
        g.fillStyle(on ? 0xffffff : 0x888888, 1); g.fillCircle(x + 10, y - 4, 2);
        if (on && label !== 2) { g.fillStyle(BRASS_LIT, 0.6 + Math.sin(time / 120) * 0.3); g.fillCircle(x - 14, y + 5, 3); }
      }
    },

    destroy() { notes.length = 0; onSince = new Map(); },
  };
}

export const BANDSTAND: GimmickDef = {
  id: 'brass-bandstand',
  rules: 'Hold the bandstand alone and you conduct: on every beat the band fires a note at the other fighter. The conductor takes more damage while up there.',
  make,
};
