import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { gavel } from '../art';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, GOLD, GOLD_LIT, MARBLE_LIT, MARBLE_SHADE, ROBE_DARK, SIDE_FOE, SIDE_YOU, WIG, WIG_SHADE } from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';

/**
 * Jury Box — Foreman Twelve.
 *
 * Twelve jurors sit in the box along the top of the floor, white-wigged and neutral. The jury is
 * not impressed by a hit — it is impressed by a hit with *flair*: one landed from long range, one
 * landed from behind, one landed while the other fighter was mid-cast. Each such blow turns a
 * juror to the striker's colour (a neutral one first, then the other side's).
 *
 * Every fifteen seconds Foreman Twelve rises and reads the verdict. The majority is healed and
 * empowered — the minority takes more from every blow for a while — and a bolt from the bench is
 * thrown at the minority: its mark follows them for a moment, then locks, then falls. A hung jury
 * hears nothing. Then the box clears and deliberates anew. Stay at range, get behind him, and hit
 * him as he casts; he will try the same.
 */

const RANGE = 300;
const MID_CAST_MS = 650;
const FLAIR_CD = 700;
const BOLT_TRACK = 650;
const BOLT_FALL = 1150;
const BOLT_R = 58;
const EMPOWER_MS = 5000;

type Side = 1 | -1;
interface Bolt { side: Side; x: number; y: number; at: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const jurors: number[] = new Array(12).fill(0);
  const flipAt: number[] = new Array(12).fill(-9999);
  const lastCast = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const lastFlair = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const every = ctx.hard ? 13000 : 15000;
  let nextVerdict = ctx.scene.time.now + every;
  let warned = false;
  let empowered: Side | 0 = 0;
  let empoweredUntil = 0;
  let bolt: Bolt | null = null;
  let readAt = -9999;
  let lastResult = '';
  /** Our own bench bolt must not count as a flair hit. */
  let internal = false;

  const BOX_X = W / 2, BOX_Y = top + 30;
  const seatX = (i: number) => BOX_X - 165 + (i % 6) * 66 + (i >= 6 ? 33 : 0);
  const seatY = (i: number) => BOX_Y + (i >= 6 ? 16 : 0);
  const sideOf = (f: Fighter): Side => (f === player ? 1 : -1);
  const fighterOf = (s: Side): Fighter => (s === 1 ? player : npc);
  const tally = (s: Side) => jurors.filter((j) => j === s).length;

  function flair(striker: Fighter, victim: Fighter): void {
    const time = ctx.scene.time.now;
    if (internal || !alive(striker) || !alive(victim)) return;
    if (time - (lastFlair.get(striker) ?? 0) < FLAIR_CD) return;
    let why = '';
    if (dist(striker.x, striker.y, victim.x, victim.y) > RANGE) why = 'FROM RANGE!';
    else if (Math.abs(wrapAngle(Math.atan2(striker.y - victim.y, striker.x - victim.x) - ctx.facing(victim))) > 2.0) why = 'FROM BEHIND!';
    else if (time - (lastCast.get(victim) ?? -9999) < MID_CAST_MS) why = 'MID-CAST!';
    if (!why) return;
    lastFlair.set(striker, time);
    const s = sideOf(striker);
    // A neutral juror first; failing that, one of the other side's.
    let idx = jurors.findIndex((j) => j === 0);
    if (idx < 0) idx = jurors.findIndex((j) => j === -s);
    if (idx < 0) return;
    jurors[idx] = s;
    flipAt[idx] = time;
    ctx.float(striker.x, striker.y - 52, why, s === 1 ? '#ffd860' : '#c8a0ff');
    ctx.sfx('sparkle');
  }

  function verdict(time: number): void {
    const you = tally(1), foe = tally(-1);
    readAt = time;
    if (you === foe) {
      lastResult = 'A HUNG JURY';
      ctx.banner('A HUNG JURY', '#f4f0e6');
      ctx.sfx('hush');
    } else {
      const win: Side = you > foe ? 1 : -1;
      const winner = fighterOf(win), loser = fighterOf(win === 1 ? -1 : 1);
      lastResult = win === 1 ? `THE JURY FINDS FOR YOU, ${you}–${foe}` : `THE JURY FINDS FOR THE FOREMAN, ${foe}–${you}`;
      ctx.banner(lastResult, win === 1 ? '#ffd860' : '#c8a0ff');
      ctx.sfx('judgement');
      if (alive(winner)) { ctx.heal(winner, ctx.hard ? 9 : 11); ctx.float(winner.x, winner.y - 50, 'UPHELD', '#fff0a8'); }
      empowered = win;
      empoweredUntil = time + EMPOWER_MS;
      if (alive(loser)) bolt = { side: (win === 1 ? -1 : 1) as Side, x: loser.x, y: loser.y, at: time, dealt: false };
    }
    for (let i = 0; i < 12; i++) { if (jurors[i] !== 0) flipAt[i] = time; jurors[i] = 0; }
  }

  return {
    update(time) {
      if (!warned && time >= nextVerdict - 2500) {
        warned = true;
        ctx.banner('THE FOREMAN RISES', '#e8c860');
        ctx.sfx('countdown-tick');
      }
      if (time >= nextVerdict) {
        nextVerdict = time + every;
        warned = false;
        verdict(time);
      }
      if (empowered && time >= empoweredUntil) empowered = 0;
      if (bolt && !bolt.dealt) {
        const target = fighterOf(bolt.side);
        // The mark follows its target, then locks; then the bolt falls.
        if (time - bolt.at < BOLT_TRACK && alive(target)) {
          bolt.x += (target.x - bolt.x) * 0.25;
          bolt.y += (target.y - bolt.y) * 0.25;
        }
        if (time - bolt.at >= BOLT_FALL) {
          bolt.dealt = true;
          ctx.sfx('thunder');
          ctx.flash(bolt.x, bolt.y, GOLD_LIT);
          if (alive(target) && dist(target.x, target.y, bolt.x, bolt.y) < BOLT_R) {
            internal = true;
            ctx.hit(target, ctx.hard ? 19 : 15, target.x, target.y);
            internal = false;
            ctx.float(target.x, target.y - 46, 'STRUCK FROM THE BENCH', '#fff0a8');
          }
        }
      }
      if (bolt && bolt.dealt && time - bolt.at > BOLT_FALL + 500) bolt = null;
    },

    onNpcHurt() { flair(player, npc); },
    onPlayerHurt() { flair(npc, player); },
    onPlayerCast() { lastCast.set(player, ctx.scene.time.now); },
    onNpcCast() { lastCast.set(npc, ctx.scene.time.now); },

    playerTakenMult: () => (empowered === -1 ? 1.25 : 1),
    npcTakenMult: () => (empowered === 1 ? 1.25 : 1),

    npcSeek() {
      // Out of the bolt's mark first.
      if (bolt && !bolt.dealt && bolt.side === -1) {
        const a = Math.atan2(npc.y - bolt.y, npc.x - bolt.x);
        return { x: clamp(bolt.x + Math.cos(a) * 140, 60, W - 60), y: clamp(bolt.y + Math.sin(a) * 140, top + 70, H - 40) };
      }
      // Then behind you, at long range: the two kinds of flair a bot can choose.
      const a = ctx.facing(player) + Math.PI;
      return { x: clamp(player.x + Math.cos(a) * 320, 60, W - 60), y: clamp(player.y + Math.sin(a) * 260, top + 80, H - 40) };
    },

    drawGround(g, time) {
      if (!bolt) return;
      const k = clamp((time - bolt.at) / BOLT_FALL, 0, 1);
      const locked = time - bolt.at >= BOLT_TRACK;
      const col = bolt.side === 1 ? SIDE_YOU : SIDE_FOE;
      if (!bolt.dealt) {
        g.fillStyle(col, 0.1 + k * 0.2); g.fillCircle(bolt.x, bolt.y, BOLT_R);
        g.lineStyle(locked ? 3 : 2, locked ? GOLD_LIT : col, 0.5 + k * 0.5); g.strokeCircle(bolt.x, bolt.y, BOLT_R);
        // A gavel-head square inside the ring, closing in.
        const s = BOLT_R * (1 - k * 0.6);
        g.lineStyle(2, GOLD, 0.6); g.strokeRect(bolt.x - s * 0.6, bolt.y - s * 0.6, s * 1.2, s * 1.2);
      } else {
        const f = clamp((time - bolt.at - BOLT_FALL) / 500, 0, 1);
        g.lineStyle(4 * (1 - f), GOLD_LIT, 1 - f); g.strokeCircle(bolt.x, bolt.y, BOLT_R * (1 + f * 0.6));
        g.fillStyle(GOLD, 0.3 * (1 - f)); g.fillCircle(bolt.x, bolt.y, BOLT_R * 0.7);
      }
    },

    drawAir(g, time) {
      // The jury box: a long bronze-railed box with two rows of wigged jurors.
      g.fillStyle(BRONZE_DARK, 1); g.fillRoundedRect(BOX_X - 214, BOX_Y - 30, 428, 66, 8);
      g.fillStyle(MARBLE_SHADE, 1); g.fillRoundedRect(BOX_X - 208, BOX_Y - 26, 416, 58, 6);
      for (let i = 0; i < 12; i++) {
        const x = seatX(i), y = seatY(i);
        const s = jurors[i];
        const col = s === 1 ? SIDE_YOU : s === -1 ? SIDE_FOE : 0xb8b4ac;
        const pop = clamp(1 - (time - flipAt[i]) / 400, 0, 1);
        const lift = pop * 6;
        if (s !== 0) glow(g, x, y - 12 - lift, 14, col, 0.05, 2);
        g.fillStyle(ROBE_DARK, 1); g.fillRoundedRect(x - 9, y - 16 - lift, 18, 18, 5);
        g.fillStyle(col, 1); g.fillRoundedRect(x - 8, y - 16 - lift, 16, 12, 5);
        g.fillStyle(0xe8c8a8, 1); g.fillCircle(x, y - 22 - lift, 5);
        g.fillStyle(WIG, 1); g.fillCircle(x, y - 25 - lift, 5.2);
        g.fillStyle(WIG_SHADE, 1); g.fillEllipse(x - 5, y - 20 - lift, 4, 9); g.fillEllipse(x + 5, y - 20 - lift, 4, 9);
        // A rosette on the chest in the juror's side's colour.
        g.fillStyle(s === 0 ? MARBLE_LIT : lit(col, 0.3), 1); g.fillCircle(x, y - 9 - lift, 2.6);
      }
      // The front rail.
      g.fillStyle(BRONZE, 1); g.fillRect(BOX_X - 214, BOX_Y + 28, 428, 6);
      g.fillStyle(BRONZE_LIT, 0.8); g.fillRect(BOX_X - 214, BOX_Y + 28, 428, 2);
      // The Foreman's gavel over the box, raised as the verdict nears.
      const toV = nextVerdict - time;
      const raise = clamp(1 - toV / 2500, 0, 1);
      const slam = clamp(1 - (time - readAt) / 300, 0, 1);
      gavel(g, BOX_X + 236, BOX_Y + 4, 0.9, -Math.PI / 2 - 0.4 - raise * 0.9 + slam * 1.2, ROBE_DARK);
      // The bolt coming down from the bench.
      if (bolt && bolt.dealt && time - bolt.at - BOLT_FALL < 220) {
        const k = (time - bolt.at - BOLT_FALL) / 220;
        let x = BOX_X + 236, y = BOX_Y;
        g.lineStyle(4 * (1 - k) + 1, GOLD_LIT, 1 - k);
        g.beginPath(); g.moveTo(x, y);
        for (let i = 1; i <= 7; i++) {
          const t = i / 7;
          x = BOX_X + 236 + (bolt.x - BOX_X - 236) * t + (i < 7 ? ((i * 37) % 30) - 15 : 0);
          y = BOX_Y + (bolt.y - BOX_Y) * t;
          g.lineTo(x, y);
        }
        g.strokePath();
      }
      // The empowered side shines.
      if (empowered) {
        const f = fighterOf(empowered);
        if (alive(f)) { g.lineStyle(2, empowered === 1 ? SIDE_YOU : SIDE_FOE, 0.5 + Math.sin(time / 100) * 0.3); g.strokeCircle(f.x, f.y - 6, 30); }
      }
    },

    drawHud(g, time) {
      // The tally under the box, and the time to the verdict.
      const you = tally(1), foe = tally(-1);
      const y = BOX_Y + 44;
      for (let i = 0; i < 12; i++) {
        const x = BOX_X - 132 + i * 24;
        const c = i < you ? SIDE_YOU : i >= 12 - foe ? SIDE_FOE : 0x6a6660;
        g.fillStyle(0x000000, 0.4); g.fillCircle(x, y, 6);
        g.fillStyle(c, 0.95); g.fillCircle(x, y, 4.5);
      }
      g.fillStyle(0x000000, 0.45); g.fillRect(BOX_X - 140, y + 9, 280, 5);
      const k = clamp(1 - (nextVerdict - time) / every, 0, 1);
      g.fillStyle(k > 0.83 ? GOLD_LIT : GOLD, 0.95); g.fillRect(BOX_X - 140, y + 9, 280 * k, 5);
    },
  };
}

export const JURY_BOX: GimmickDef = {
  id: 'tribunal-jury-box',
  rules: 'Hits with flair — from range, from behind, mid-cast — win jurors. Every 15s the verdict: majority healed and empowered, minority struck from the bench.',
  make,
};
