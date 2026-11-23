import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { candle } from '../art';
import { ECTO, ECTO_DEEP, SOUL_DARK, SOUL_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Astral Projection — Medium Séance.
 *
 * Every so often Séance sits down in the air, cross-legged, and her soul steps out of her: a tall
 * lilac shade on a silver cord, untouchable, that flies at you and strikes from above — it dives
 * (a ring shrinks on the floor where it will land) and it flings ectoplasm. All the while her body
 * hangs there empty, ringed by candles, eyes shut, unable to move or fight.
 *
 * Her body is the way in. Strike the empty body and the cord snaps tight: the soul is dragged back
 * into her, and she wakes stunned and dazed, taking more from every blow. Leave her be and the
 * séance runs its course — the soul comes home fed and she is a little restored. Fight the shade
 * and you fight a ghost; walk through its strikes to the body and you win the exchange.
 */

const PROJECT_MS = 6500;
const WARN_MS = 1000;
const DIVE_R = 58;

type State = 'body' | 'warn' | 'out' | 'back';

interface Dive { x: number; y: number; at: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const every = ctx.hard ? 9200 : 11000;
  let state: State = 'body';
  let stateAt = 0;
  let nextOut = 0;
  let started = false;
  let soul = { x: 0, y: 0, a: 0 };
  let nextStrike = 0;
  let strikeIdx = 0;
  let holdAt = 0;
  let dazedUntil = 0;
  let snapFx = 0;
  const dives: Dive[] = [];

  function begin(time: number): void {
    state = 'out';
    stateAt = time;
    soul = { x: npc.x, y: npc.y - 30, a: 0 };
    nextStrike = time + 900;
    strikeIdx = 0;
    ctx.banner('HER SOUL STEPS OUT', '#e4d8ff');
    ctx.sfx('portal');
  }

  function dragBack(time: number): void {
    state = 'back';
    stateAt = time;
    snapFx = time;
    dives.length = 0;
    ctx.stun(npc, ctx.hard ? 1400 : 1800);
    dazedUntil = time + 2600;
    ctx.float(npc.x, npc.y - 60, 'DRAGGED BACK', '#ffe2a0');
    ctx.sfx('snap-back');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextOut = time + 5500; }
      if (!alive(npc)) return;

      if (state === 'body' && time >= nextOut - WARN_MS) {
        state = 'warn';
        stateAt = time;
        ctx.float(npc.x, npc.y - 60, 'THE SÉANCE BEGINS', '#d8c8ff');
        ctx.sfx('curse-cast');
      }
      if (state === 'warn' && time - stateAt >= WARN_MS) begin(time);

      if (state === 'out') {
        // The body sits empty: held fast, hands still.
        if (time >= holdAt) { holdAt = time + 220; ctx.root(npc, 320); ctx.silence(npc, 320); }
        // The soul flies to hover over you, circling.
        soul.a += dt * 1.1;
        const hx = player.x + Math.cos(soul.a) * 120, hy = player.y - 40 + Math.sin(soul.a) * 60;
        const k = Math.min(1, dt * 2.2);
        soul.x += (clamp(hx, 40, W - 40) - soul.x) * k;
        soul.y += (clamp(hy, top + 20, H - 40) - soul.y) * k;
        // It strikes: a dive, then a fling of ectoplasm, in turn.
        if (time >= nextStrike && alive(player)) {
          nextStrike = time + (ctx.hard ? 1250 : 1500);
          if (strikeIdx++ % 2 === 0) {
            dives.push({ x: player.x, y: player.y, at: time + 850, dealt: false });
            ctx.sfx('whoosh');
          } else {
            const a = Math.atan2(player.y - soul.y, player.x - soul.x);
            for (const s of [-0.22, 0, 0.22]) tk.spawnBullet({ x: soul.x, y: soul.y, angle: a + s, speed: 230, damage: ctx.hard ? 8 : 7, r: 7, lifeMs: 3000, color: ECTO });
            ctx.sfx('chaos');
          }
        }
        if (time - stateAt >= PROJECT_MS) {
          state = 'body';
          nextOut = time + every;
          dives.length = 0;
          tk.healBoss(Math.round(npc.maxHp * 0.05));
          ctx.float(npc.x, npc.y - 60, 'THE SOUL COMES HOME FED', '#d8c8ff');
          ctx.sfx('heal');
        }
      }
      if (state === 'back' && time - stateAt > 600) { state = 'body'; nextOut = time + every; }

      for (const d of dives) {
        if (d.dealt || time < d.at) continue;
        d.dealt = true;
        tk.boom(d.x, d.y, DIVE_R, ECTO_DEEP);
        if (alive(player) && dist(player.x, player.y, d.x, d.y) < DIVE_R) tk.hitPlayer(ctx.hard ? 13 : 11, player.x, player.y);
      }
      for (let i = dives.length - 1; i >= 0; i--) if (dives[i].dealt && time > dives[i].at + 400) dives.splice(i, 1);
    },

    onNpcHurt() {
      const time = ctx.scene.time.now;
      if (state === 'out' && time - stateAt > 150) dragBack(time);
    },

    npcTakenMult: () => (ctx.scene.time.now < dazedUntil ? 1.35 : 1),

    npcSeek() {
      if (state === 'out' || state === 'warn') return null;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 230, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const t = time / 1000;
      // Candles round the sitting body.
      if (state === 'out' || state === 'warn') {
        const k = state === 'warn' ? clamp((time - stateAt) / WARN_MS, 0, 1) : 1;
        g.lineStyle(1.5, ECTO, 0.4 * k); g.strokeEllipse(npc.x, npc.y + 6, 120, 52);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          candle(g, npc.x + Math.cos(a) * 60 * k, npc.y + 8 + Math.sin(a) * 26 * k, 10, 4, true, t + i);
        }
        // A chalked ring of letters.
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          g.fillStyle(ECTO, 0.35 * k); g.fillRect(npc.x + Math.cos(a) * 46 - 1.5, npc.y + 6 + Math.sin(a) * 18, 3, 2);
        }
      }
      // The soul's dives: a shrinking ring of lilac where it will land.
      for (const d of dives) {
        if (d.dealt) continue;
        const k = clamp(1 - (d.at - time) / 850, 0, 1);
        g.fillStyle(ECTO_DEEP, 0.12 + k * 0.18); g.fillCircle(d.x, d.y, DIVE_R);
        g.lineStyle(2, ECTO, 0.5 + k * 0.4); g.strokeCircle(d.x, d.y, DIVE_R * (1.6 - k * 0.6));
        g.lineStyle(1, ECTO, 0.6); g.strokeCircle(d.x, d.y, DIVE_R);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      if (!alive(npc)) return;
      if (state === 'warn') {
        const k = clamp((time - stateAt) / WARN_MS, 0, 1);
        glow(g, npc.x, npc.y - 20, 40 + k * 30, ECTO, 0.05 + k * 0.06, 3);
        g.lineStyle(2, ECTO, k); g.strokeEllipse(npc.x, npc.y - 40 - k * 20, 30 + k * 20, 12);
      }
      if (state === 'out') {
        // The empty body: a grey veil over her, eyes shut, a little lift off the floor.
        g.fillStyle(0xdad6e4, 0.45); g.fillEllipse(npc.x, npc.y - 8, 52, 58);
        g.lineStyle(2, SOUL_DARK, 0.8); g.lineBetween(npc.x - 10, npc.y - 18, npc.x - 4, npc.y - 18); g.lineBetween(npc.x + 4, npc.y - 18, npc.x + 10, npc.y - 18);
        g.fillStyle(ECTO, 0.12 + Math.sin(time / 300) * 0.05); g.fillCircle(npc.x, npc.y - 10, 36);
        // The silver cord, slack, swaying between body and soul.
        const mx = (npc.x + soul.x) / 2 + Math.sin(t * 2) * 30, my = (npc.y + soul.y) / 2 + 40;
        g.lineStyle(2, 0xe8eef8, 0.7);
        g.beginPath(); g.moveTo(npc.x, npc.y - 30);
        for (let i = 1; i <= 12; i++) {
          const k = i / 12;
          const x = (1 - k) * (1 - k) * npc.x + 2 * (1 - k) * k * mx + k * k * soul.x;
          const y = (1 - k) * (1 - k) * (npc.y - 30) + 2 * (1 - k) * k * my + k * k * soul.y;
          g.lineTo(x, y);
        }
        g.strokePath();
        // The soul: a tall lilac shade in a veil, its hands raised, trailing mist.
        const sx = soul.x, sy = soul.y + Math.sin(t * 3) * 4;
        glow(g, sx, sy, 70, ECTO, 0.06, 4);
        for (let i = 4; i >= 1; i--) {
          g.fillStyle(ECTO, 0.12 + (4 - i) * 0.06);
          g.fillEllipse(sx + Math.sin(t * 4 + i) * 6, sy + 20 + i * 10, 34 - i * 4, 22);
        }
        g.fillStyle(ECTO, 0.7); g.fillEllipse(sx, sy, 40, 56);
        g.fillStyle(lit(ECTO, 0.5), 0.6); g.fillTriangle(sx - 24, sy - 10, sx + 24, sy - 10, sx, sy - 46);
        g.fillStyle(ECTO_DEEP, 0.85); g.fillEllipse(sx - 7, sy - 12, 6, 10); g.fillEllipse(sx + 7, sy - 12, 6, 10);
        for (const k of [-1, 1]) {
          g.lineStyle(5, ECTO, 0.6); g.lineBetween(sx + k * 16, sy, sx + k * 30, sy - 24 + Math.sin(t * 5 + k) * 4);
          g.fillStyle(SOUL_LIT, 0.8); g.fillCircle(sx + k * 30, sy - 26 + Math.sin(t * 5 + k) * 4, 5);
        }
        // A countdown round the shade: when it closes, she comes home fed.
        const left = clamp(1 - (time - stateAt) / PROJECT_MS, 0, 1);
        g.lineStyle(2, ECTO, 0.6);
        g.beginPath(); g.arc(sx, sy, 40, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
      if (time - snapFx < 600) {
        const k = (time - snapFx) / 600;
        g.lineStyle(4 * (1 - k), 0xffffff, 1 - k); g.lineBetween(npc.x, npc.y - 30, npc.x + (soul.x - npc.x) * (1 - k), npc.y - 30 + (soul.y - npc.y + 30) * (1 - k));
        g.lineStyle(3, ECTO, 1 - k); g.strokeCircle(npc.x, npc.y - 10, 20 + k * 50);
      }
      if (time < dazedUntil) {
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + (i / 3) * Math.PI * 2;
          g.fillStyle(ECTO, 0.9); g.fillCircle(npc.x + Math.cos(a) * 18, npc.y - 46 + Math.sin(a) * 6, 3);
        }
      }
    },
  };
}

export const ASTRAL_PROJECTION: GimmickDef = {
  id: 'lantern-astral-projection',
  rules: 'Séance\'s soul leaves her body and strikes from the air, untouchable. Strike her empty body to drag it back — she wakes stunned and dazed.',
  make,
};
