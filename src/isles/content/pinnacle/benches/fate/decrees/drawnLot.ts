import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { OBS } from '../../../../../art/PinnacleArt';
import { glow } from '../../../../../art/IsleArt';
import { drum, glyphs, lotBall } from '../art';
import { CSS_LOT, CSS_NPC, CSS_PLAYER, FELT_GLOW, IVORY, ROUGE, ROUGE_LIT, SIDE_NPC, SIDE_PLAYER } from '../palette';
import { type Who, alive, clamp, dist, other } from '../util';

/**
 * Seat of the Draw — Councilor Sortes Quill, who wrote the Lot itself.
 *
 * DECREE OF THE DRAWN LOT. The drum of the Draw stands at the head of the floor with both
 * fighters' lots tumbling in it — four of yours, one of the councilor's (the drum was always
 * rigged). On every turn of it, one lot is drawn and the glass cage of the Called comes down on
 * whoever it names: it follows them, locks, and drops. Caught: rooted, struck, and the other side
 * holds the stake (+30% damage). Every blow on the drum stuffs it with a lot for your foe — and
 * under the barrel is the false bottom, where the favourite's own lots are hidden. Strike that
 * three times and they spill into the drum.
 */

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const DX = ctx.W / 2, DY = ctx.top + 74, DR = 34;
  const FB_Y = DY + DR * 1.25 + 6;
  const SPIN_MS = 1500;
  const FOLLOW_MS = ctx.hard ? 700 : 800;
  const LOCK_MS = ctx.hard ? 380 : 460;
  const REST_MS = ctx.hard ? 4300 : 5400;
  const CAGE_R = 80;
  const CAUGHT_DMG = ctx.hard ? 22 : 18;
  const ROOT_MS = 1500;
  const STAKE_MS = 4000;
  const CAP = 9;

  const lots: Record<Who, number> = { player: 4, npc: 1 };
  let hidden = ctx.hard ? 4 : 3;
  let fbHits = 0;
  let state: 'idle' | 'spin' | 'follow' | 'lock' | 'rest' = 'idle';
  let at = 0;
  let called: Who = 'player';
  let cageX = 0, cageY = 0;
  let rot = 0;
  let flyFrom = 0;
  let caughtUntil = 0;
  let caughtWho: Who | null = null;
  const stakeUntil: Record<Who, number> = { player: 0, npc: 0 };
  const strikeCd: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who) => (w === 'player' ? ctx.player : ctx.npc);
  const now = () => ctx.scene.time.now;

  const stuff = (by: Who): void => {
    const t = now();
    if (t < strikeCd[by]) return;
    strikeCd[by] = t + 500;
    const foe = other(by);
    if (lots[foe] >= CAP) return;
    lots[foe]++;
    ctx.float(DX + (foe === 'player' ? -60 : 60), DY - 30, foe === 'player' ? '+1 LOT · YOURS' : '+1 LOT · THE COUNCILOR\'S', foe === 'player' ? CSS_PLAYER : CSS_NPC);
    ctx.sfx('dice');
  };

  const drumTarget: StrikeTarget = ctx.target({ x: DX, y: DY - 4, r: 38, onStruck: (by) => stuff(by) });
  let fbTarget: StrikeTarget | null = ctx.target({
    x: DX, y: FB_Y, r: 14,
    onStruck: (by) => {
      if (by !== 'player' || hidden <= 0) return;
      const t = now();
      if (t < strikeCd.player) return;
      strikeCd.player = t + 350;
      fbHits++;
      ctx.float(DX, FB_Y + 18, `FALSE BOTTOM ${fbHits}/3`, CSS_LOT);
      ctx.sfx('clang');
      if (fbHits >= 3) {
        lots.npc = Math.min(CAP + hidden, lots.npc + hidden);
        hidden = 0;
        ctx.banner('THE FALSE BOTTOM GIVES — THE FAVOURITE\'S LOTS SPILL INTO THE DRUM', CSS_LOT);
        ctx.sfx('jackpot');
        ctx.flash(DX, FB_Y, ROUGE_LIT);
        fbTarget?.remove();
        fbTarget = null;
      }
    },
  });

  const draw = (time: number): void => {
    if (lots.player + lots.npc < 2) {
      lots.player += 3; lots.npc += 1;
      ctx.banner('THE DRUM IS REFILLED — THE HOUSE\'S WAY: THREE OF YOURS, ONE OF THEIRS', CSS_LOT);
    }
    const total = lots.player + lots.npc;
    called = ctx.rng() * total < lots.player ? 'player' : 'npc';
    lots[called]--;
    const f = fighter(called);
    cageX = f.x; cageY = f.y;
    flyFrom = time;
    state = 'follow';
    at = time + ctx.tk.warn(FOLLOW_MS);
    ctx.banner(called === 'player' ? 'THE LOT FALLS ON YOU' : 'THE LOT FALLS ON THE COUNCILOR', called === 'player' ? CSS_PLAYER : CSS_NPC);
    ctx.sfx('countdown-go');
  };

  const slam = (time: number): void => {
    const f = fighter(called);
    ctx.sfx('anvil');
    ctx.tk.boom(cageX, cageY, CAGE_R, OBS.seam);
    if (alive(f) && dist(f.x, f.y, cageX, cageY) <= CAGE_R) {
      ctx.root(f, ROOT_MS);
      ctx.hit(f, CAUGHT_DMG, f.x, f.y);
      stakeUntil[other(called)] = time + STAKE_MS;
      caughtUntil = time + ROOT_MS;
      caughtWho = called;
      ctx.float(f.x, f.y - 52, 'CALLED', called === 'player' ? CSS_PLAYER : CSS_NPC);
      const o = fighter(other(called));
      if (alive(o)) ctx.float(o.x, o.y - 52, 'THE STAKE', CSS_LOT);
    } else {
      ctx.float(cageX, cageY - 40, 'THE CAGE IS EMPTY', '#d8d0f0');
    }
    state = 'rest';
    at = time + REST_MS;
  };

  return {
    update(time, dt) {
      rot += dt * (state === 'spin' ? 11 : 1.4);
      if (!alive(ctx.player) || !alive(ctx.npc)) return;
      if (state === 'idle') { if (at === 0) at = time + 3000; if (time >= at) { state = 'spin'; at = time + ctx.tk.warn(SPIN_MS); ctx.sfx('dice'); } return; }
      if (state === 'spin' && time >= at) { draw(time); return; }
      if (state === 'follow') {
        // The cage hunts its lot for a beat, then locks where they stand.
        const f = fighter(called);
        const k = clamp(dt * 7, 0, 1);
        cageX += (f.x - cageX) * k; cageY += (f.y - cageY) * k;
        if (time >= at) { state = 'lock'; at = time + ctx.tk.warn(LOCK_MS); ctx.sfx('trap-set'); }
        return;
      }
      if (state === 'lock' && time >= at) { slam(time); return; }
      if (state === 'rest' && time >= at) { state = 'spin'; at = time + ctx.tk.warn(SPIN_MS); ctx.sfx('dice'); }
    },
    playerTakenMult() { return now() < stakeUntil.npc ? 1.3 : 1; },
    npcTakenMult() { return now() < stakeUntil.player ? 1.3 : 1; },
    npcSeek() {
      const n = ctx.npc;
      if ((state === 'follow' || state === 'lock') && called === 'npc') {
        // Out from under the cage, the long way round.
        const dx = n.x - cageX, dy = n.y - cageY;
        const d = Math.hypot(dx, dy) || 1;
        return { x: clamp(cageX + (dx / d) * 170, 60, ctx.W - 60), y: clamp(cageY + (dy / d) * 170, ctx.top + 60, ctx.H - 50) };
      }
      // Its odds are poor: go and stuff the drum with your lots.
      const pNpc = lots.npc / Math.max(1, lots.npc + lots.player);
      if (pNpc > 0.34 && state !== 'lock') return { x: DX + (n.x < DX ? -78 : 78), y: DY + 70 };
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      const balls: number[] = [];
      for (let i = 0; i < Math.max(lots.player, lots.npc); i++) {
        if (i < lots.player) balls.push(SIDE_PLAYER);
        if (i < lots.npc) balls.push(SIDE_NPC);
      }
      const mouth = state === 'spin' ? clamp(1 - (at - time) / ctx.tk.warn(SPIN_MS), 0, 1) : 0;
      drum(g, DX, DY, DR, rot, balls, hidden, t, mouth);
      if (fbTarget && fbHits > 0) {
        // The hatch cracking where it has been struck.
        g.lineStyle(1.4, OBS.seamLit, 0.9);
        for (let i = 0; i < fbHits; i++) g.lineBetween(DX - 14 + i * 12, FB_Y - 6, DX - 8 + i * 12, FB_Y + 6);
      }
      // The cage's shadow: following (soft), locked (hard, flashing).
      if (state === 'follow' || state === 'lock') {
        const lock = state === 'lock';
        const k = lock ? clamp(1 - (at - time) / ctx.tk.warn(LOCK_MS), 0, 1) : 0;
        const col = called === 'player' ? SIDE_PLAYER : SIDE_NPC;
        g.fillStyle(0x000000, 0.25 + k * 0.35); g.fillEllipse(cageX, cageY + 6, CAGE_R * 2, CAGE_R * 1.5);
        g.lineStyle(lock ? 3 : 2, lock && Math.floor(time / 90) % 2 ? 0xffffff : col, 0.85); g.strokeEllipse(cageX, cageY + 6, CAGE_R * 2, CAGE_R * 1.5);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(col, 0.5); g.fillCircle(cageX + Math.cos(a) * CAGE_R, cageY + 6 + Math.sin(a) * CAGE_R * 0.75, 2.5);
        }
      }
    },
    drawAir(g, time) {
      // The drawn lot, flying from the mouth to whoever it names.
      if ((state === 'follow' || state === 'lock') && time - flyFrom < 650) {
        const k = (time - flyFrom) / 650;
        const f = fighter(called);
        const x = DX + (f.x - DX) * k, y = DY + DR + (f.y - 40 - DY - DR) * k - Math.sin(k * Math.PI) * 90;
        lotBall(g, x, y, 9, called === 'player' ? SIDE_PLAYER : SIDE_NPC, 8);
      }
      // The cage coming down: black glass bars, lowering as the lock runs out.
      if (state === 'lock' || time < caughtUntil) {
        const caught = time < caughtUntil && caughtWho;
        const cx = caught ? fighter(caughtWho!).x : cageX, cy = caught ? fighter(caughtWho!).y : cageY;
        const k = caught ? 1 : clamp(1 - (at - time) / ctx.tk.warn(LOCK_MS), 0, 1);
        const drop = (1 - k) * 160;
        const r = caught ? 40 : CAGE_R * 0.7;
        const topY = cy - 70 - drop, botY = cy + 18 - drop;
        g.fillStyle(OBS.glass, 0.95); g.fillEllipse(cx, topY, r * 2.2, r * 0.6);
        g.lineStyle(1.2, OBS.edge, 0.8); g.strokeEllipse(cx, topY, r * 2.2, r * 0.6);
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.05 + (i / 8) * 0.9);
          const bx = cx - Math.cos(a) * r;
          g.lineStyle(3, OBS.facet, 0.95); g.lineBetween(bx, topY, bx, botY);
          g.lineStyle(1, OBS.edge, 0.6); g.lineBetween(bx - 1, topY, bx - 1, botY);
        }
        g.lineStyle(3, OBS.facet, 1); g.strokeEllipse(cx, botY, r * 2.1, r * 0.55);
        g.fillStyle(OBS.seamLit, 1); g.fillCircle(cx, topY - 6, 4);
        if (caught) glow(g, cx, cy - 20, 40, OBS.seam, 0.04, 3);
      }
      // The stake: a stack of chips spinning over the holder's head.
      for (const w of ['player', 'npc'] as Who[]) {
        if (now() >= stakeUntil[w]) continue;
        const f = fighter(w);
        const s = Math.sin(time / 120);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i % 2 ? ROUGE : OBS.facet, 1); g.fillEllipse(f.x + 22, f.y - 40 - i * 4, 14 * Math.abs(s) + 3, 6);
          g.fillStyle(IVORY, 0.8); g.fillRect(f.x + 21, f.y - 41 - i * 4, 2, 2);
        }
      }
    },
    drawHud(g) {
      // The odds board: your lots against theirs, and the chance it is you next.
      const cx = ctx.W / 2, y = ctx.top + 4;
      const total = Math.max(1, lots.player + lots.npc);
      const pk = lots.player / total;
      g.fillStyle(0x07060d, 0.85); g.fillRoundedRect(cx - 170, y, 340, 22, 8);
      g.lineStyle(1.2, OBS.edge, 0.6); g.strokeRoundedRect(cx - 170, y, 340, 22, 8);
      g.fillStyle(SIDE_PLAYER, 0.85); g.fillRect(cx - 120, y + 7, 240 * pk, 8);
      g.fillStyle(SIDE_NPC, 0.85); g.fillRect(cx - 120 + 240 * pk, y + 7, 240 * (1 - pk), 8);
      lotBall(g, cx - 146, y + 11, 8, SIDE_PLAYER, lots.player);
      lotBall(g, cx + 146, y + 11, 8, SIDE_NPC, lots.npc);
      glyphs(g, String(lots.player), cx - 128, y + 11, 9, FELT_GLOW, 1, 1.4);
      glyphs(g, String(lots.npc), cx + 128, y + 11, 9, ROUGE_LIT, 1, 1.4);
    },
    destroy() {
      drumTarget.remove();
      fbTarget?.remove();
    },
  };
};

export const DECREE_DRAWN_LOT: GimmickDef = {
  id: 'bench-fate-drawn-lot',
  rules: 'Each turn of the drum draws a lot; the cage falls on the one it names. Strike the drum to add lots for your foe — or crack its false bottom.',
  make,
};
