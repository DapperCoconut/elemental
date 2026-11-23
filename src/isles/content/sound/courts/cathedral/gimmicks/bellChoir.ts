import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { handbell } from '../art';
import { BRONZE_LIT, GLASS_BLUE, GLASS_GOLD, GLASS_GREEN, GLASS_RED, GLASS_VIOLET, OAK, OAK_DARK, OAK_LIT, SURPLICE } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Bell Choir — Ringer Carol.
 *
 * A row of handbells stands across the nave on their felted table, six of them, lowest to
 * highest. Carol leads the bell choir, and the choir plays her tune: first it is *shown* — the
 * bells light one after another, each with its number — and then, a breath later, it is *rung*,
 * the same bells in the same order, each one bursting with a peal that hurts whoever stands
 * near it, her included.
 *
 * Learn the tune and stand where it isn't. Or spoil it: strike any bell yourself while the tune
 * is still being shown, and the choir loses its place — the tune is abandoned and Carol, who
 * cannot bear a wrong note, is stunned where she stands.
 */

const N = 6;
const BURST_R = 96;
const TONES = [GLASS_RED, 0xf07a2e, GLASS_GOLD, GLASS_GREEN, GLASS_BLUE, GLASS_VIOLET];

type Phase = 'rest' | 'show' | 'breath' | 'ring';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const ROW_Y = (top + H) / 2 + 10;
  const bells = Array.from({ length: N }, (_, i) => ({ x: 130 + (i * (W - 260)) / (N - 1), y: ROW_Y, ringAt: -9999, target: null as StrikeTarget | null }));
  const LEN = ctx.hard ? 5 : 4;
  const SHOW_STEP = ctx.hard ? 420 : 520;
  const BREATH = 900;
  const RING_STEP = ctx.hard ? 520 : 620;
  let phase: Phase = 'rest';
  let phaseAt = 0;
  let tune: number[] = [];
  let rung = 0;
  let spoiledAt = -9999;
  let started = false;

  function newTune(): number[] {
    const t: number[] = [];
    let last = -1;
    while (t.length < LEN) {
      const b = Math.floor(rng() * N);
      if (b === last) continue;
      t.push(b); last = b;
    }
    return t;
  }

  function spoil(bellIdx: number, time: number): void {
    phase = 'rest';
    phaseAt = time;
    spoiledAt = time;
    tune = [];
    bells[bellIdx].ringAt = time;
    ctx.banner('A WRONG NOTE — THE TUNE IS SPOILED', '#ffd870');
    ctx.sfx('clang');
    if (alive(npc)) { ctx.stun(npc, ctx.hard ? 1500 : 1900); ctx.float(npc.x, npc.y - 52, 'OUT OF TUNE!', '#ffb0b0'); }
  }

  /** Bell indices still to burst in this ring. */
  const pending = () => (phase === 'ring' ? tune.slice(rung) : phase === 'show' || phase === 'breath' ? tune : []);

  return {
    update(time) {
      if (!started) {
        started = true;
        phaseAt = time - 1800;
        bells.forEach((b, i) => {
          b.target = ctx.target({
            x: b.x, y: b.y - 14, r: 26, passThrough: true,
            onStruck: (by) => {
              const now = ctx.scene.time.now;
              if (by === 'player' && (phase === 'show' || phase === 'breath')) spoil(i, now);
              else b.ringAt = Math.max(b.ringAt, now - 300);
            },
          });
        });
      }
      const since = time - phaseAt;
      if (phase === 'rest' && since >= (ctx.hard ? 2600 : 3400)) {
        tune = newTune();
        phase = 'show';
        phaseAt = time;
        ctx.sfx('crystal-chime');
      } else if (phase === 'show') {
        const k = Math.floor(since / SHOW_STEP);
        if (k < LEN && bells[tune[k]].ringAt < phaseAt + k * SHOW_STEP) { bells[tune[k]].ringAt = time; ctx.sfx('crystal-chime'); }
        if (since >= LEN * SHOW_STEP) { phase = 'breath'; phaseAt = time; }
      } else if (phase === 'breath' && since >= BREATH) {
        phase = 'ring';
        phaseAt = time;
        rung = 0;
      } else if (phase === 'ring') {
        while (rung < LEN && since >= rung * RING_STEP) {
          const b = bells[tune[rung]];
          b.ringAt = time;
          tk.explode(b.x, b.y, BURST_R, 13, TONES[tune[rung]]);
          if (alive(npc) && dist(npc.x, npc.y, b.x, b.y) < BURST_R) ctx.hit(npc, 11, npc.x, npc.y);
          ctx.sfx('clang');
          rung++;
        }
        if (rung >= LEN && since >= LEN * RING_STEP + 300) { phase = 'rest'; phaseAt = time; }
      }
    },

    npcSeek() {
      // Through a tune she stands off the row on the far side from you, so you are the one near the bells.
      if (phase !== 'rest') {
        const side = player.y < ROW_Y ? 1 : -1;
        return { x: clamp(player.x, 80, W - 80), y: clamp(ROW_Y + side * 190, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The felted table the bells stand on.
      g.fillStyle(OAK_DARK, 1); g.fillRoundedRect(70, ROW_Y - 8, W - 140, 22, 6);
      g.fillStyle(0x2a3a5a, 1); g.fillRoundedRect(74, ROW_Y - 10, W - 148, 16, 5);
      g.fillStyle(lit(0x2a3a5a, 0.15), 1); g.fillRect(78, ROW_Y - 10, W - 156, 3);
      for (const x of [80, W - 80]) { g.fillStyle(OAK, 1); g.fillRect(x - 4, ROW_Y + 8, 8, 14); }
      // Burst rings on the floor: faint always, bright for the bells still to ring, numbered by order.
      const pend = pending();
      bells.forEach((b, i) => {
        const order = pend.indexOf(i);
        const due = phaseAt + (rung + order) * RING_STEP;
        const a = order >= 0 ? 0.25 + (phase === 'ring' ? 0.35 : 0.1) : 0.08;
        g.lineStyle(2, TONES[i], a); g.strokeCircle(b.x, b.y, BURST_R);
        if (order >= 0) { g.fillStyle(TONES[i], phase === 'ring' ? 0.12 : 0.05); g.fillCircle(b.x, b.y, BURST_R); }
        if (phase === 'ring' && order >= 0) {
          const k = clamp(1 - (due - time) / (RING_STEP * (order + 1)), 0, 1);
          g.lineStyle(3, lit(TONES[i], 0.3), 0.7); g.beginPath(); g.arc(b.x, b.y, BURST_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        // The burst itself.
        const age = time - b.ringAt;
        if (age >= 0 && age < 500 && phase !== 'show') {
          const k = age / 500;
          g.lineStyle(4 * (1 - k), TONES[i], 1 - k); g.strokeCircle(b.x, b.y, 20 + k * BURST_R);
        }
      });
    },

    drawAir(g, time) {
      const pend = pending();
      bells.forEach((b, i) => {
        const age = time - b.ringAt;
        const ring = age >= 0 && age < 700 ? 1 - age / 700 : 0;
        if (ring > 0) glow(g, b.x, b.y - 16, 30, TONES[i], 0.08 * ring, 3);
        handbell(g, b.x, b.y, 1.15, TONES[i], ring);
        // The tune's order, shown as pips over each bell while it is still to come.
        const shownUpTo = phase === 'show' ? Math.floor((time - phaseAt) / SHOW_STEP) : LEN;
        tune.forEach((t, k) => {
          if (t !== i || phase === 'rest') return;
          if (phase === 'show' && k > shownUpTo) return;
          if (phase === 'ring' && k < rung) return;
          const px = b.x - 10 + (k % 3) * 10, py = b.y - 56 - Math.floor(k / 3) * 10;
          g.fillStyle(0x14161c, 0.8); g.fillCircle(px, py, 5);
          g.fillStyle(TONES[i], 1);
          for (let d = 0; d <= k; d++) g.fillCircle(px - k * 1.5 + d * 3, py, 1.2);
        });
        if (pend.includes(i) && phase !== 'show') { g.lineStyle(1.5, BRONZE_LIT, 0.5 + Math.sin(time / 80) * 0.3); g.strokeCircle(b.x, b.y - 14, 22); }
      });
      // Carol's white gloves raised to conduct while the tune is shown.
      if ((phase === 'show' || phase === 'breath') && alive(npc)) {
        const sw = Math.sin(time / 120) * 6;
        for (const k of [-1, 1]) { g.fillStyle(SURPLICE, 1); g.fillCircle(npc.x + k * 16, npc.y - 34 + sw * k, 5); }
      }
      if (time - spoiledAt < 900) {
        const k = (time - spoiledAt) / 900;
        g.lineStyle(3, OAK_LIT, 1 - k); g.strokeCircle(npc.x, npc.y - 46, 10 + k * 20);
      }
    },

    destroy() { for (const b of bells) b.target?.remove(); },
  };
}

export const BELL_CHOIR: GimmickDef = {
  id: 'cathedral-bell-choir',
  rules: 'The choir shows a tune — bells lighting in order — then rings it, each bell bursting in turn. Strike a bell while it is shown to spoil it and stun Carol.',
  make,
};
