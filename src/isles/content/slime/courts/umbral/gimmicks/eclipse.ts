import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { MOON, MOON_DIM } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Eclipse — Astronomer Umbra.
 *
 * Umbra has the court's only window on the sky — the starglass through the canopy — and she has
 * worked out the eclipses to the second. She brings one down for you: up over the yard (in the
 * sky strip above the fight) the moon creeps across the sun, and the light on the floor slants
 * round with it, so both fighters' shadows lie at their feet, turning.
 *
 * As the moon goes over, its shadow runs across the yard in a band; under it the stars come out
 * and everyone's abilities come back faster. Then *totality*: the room goes black for a breath,
 * and each fighter's shadow stands up out of the floor and lunges at its owner's foe — a straight
 * line from where the shadow lay to where the foe stood. Put your shadow where its line runs
 * through the foe; step off the line theirs is drawing to you.
 */

const LUNGE_MS = 650;
const BLACK_MS = 1600;
const DIAMOND_MS = 1500;
const SHADOW_HIT_R = 44;

interface Riser { owner: Fighter; sx: number; sy: number; tx: number; ty: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const CYCLE = ctx.hard ? 12500 : 15000;
  let cycleStart = -1;
  let totalAt = 0;
  let risers: Riser[] = [];
  let phase: 'creep' | 'black' = 'creep';
  let diamondCalled = false;

  /** 0 → 1 as the moon crosses the sun. */
  const progress = (time: number) => clamp((time - cycleStart) / CYCLE, 0, 1);
  /** The light comes from the sun's place in the sky strip; shadows point away from it. */
  const sunX = (time: number) => W * (0.15 + progress(time) * 0.7);
  const shadowOf = (f: Fighter, time: number): Pt => {
    const sx = sunX(time), sy = top - 220;
    const d = Math.max(1, dist(sx, sy, f.x, f.y));
    const len = 56 + progress(time) * 64;
    return { x: f.x + ((f.x - sx) / d) * len, y: f.y + ((f.y - sy) / d) * len };
  };
  /** The moon's shadow band on the floor: a soft ellipse running left to right with the eclipse. */
  const band = (time: number): Pt => ({ x: -160 + progress(time) * (W + 320), y: top + (H - top) * (0.35 + 0.3 * Math.sin(progress(time) * Math.PI)) });
  const inBand = (f: Fighter, time: number) => {
    const b = band(time);
    const dx = (f.x - b.x) / 190, dy = (f.y - b.y) / 260;
    return phase === 'creep' && dx * dx + dy * dy < 1;
  };

  return {
    update(time) {
      if (cycleStart < 0) { cycleStart = time - CYCLE * 0.25; }
      if (phase === 'creep') {
        if (!diamondCalled && time >= cycleStart + CYCLE - DIAMOND_MS) {
          diamondCalled = true;
          ctx.banner('THE DIAMOND RING', '#c8d8ff');
          ctx.sfx('beam-charge');
        }
        if (time >= cycleStart + CYCLE) {
          phase = 'black';
          totalAt = time;
          ctx.sfx('hush');
          ctx.banner('TOTALITY', '#e8e0ff');
          risers = [player, npc].filter(alive).map((owner) => {
            const s = shadowOf(owner, time);
            const foe = owner === player ? npc : player;
            return { owner, sx: s.x, sy: s.y, tx: foe.x, ty: foe.y, dealt: false };
          });
        }
      } else {
        // The risen shadows run their lines.
        const k = clamp((time - totalAt - 250) / LUNGE_MS, 0, 1);
        for (const r of risers) {
          if (r.dealt || k <= 0) continue;
          const foe = r.owner === player ? npc : player;
          const x = r.sx + (r.tx - r.sx) * k, y = r.sy + (r.ty - r.sy) * k;
          if (alive(foe) && dist(foe.x, foe.y, x, y) < SHADOW_HIT_R) {
            r.dealt = true;
            ctx.hit(foe, ctx.hard ? 20 : 16, foe.x, foe.y);
            ctx.float(foe.x, foe.y - 50, r.owner === player ? 'YOUR SHADOW BITES' : 'HIS SHADOW BITES', '#e8e0ff');
            ctx.sfx('slash');
          }
          if (k >= 1) r.dealt = true;
        }
        if (time >= totalAt + BLACK_MS) {
          phase = 'creep';
          cycleStart = time;
          diamondCalled = false;
          risers = [];
          ctx.sfx('sparkle');
        }
      }
    },

    playerCooldownRate: () => (inBand(player, ctx.scene.time.now) ? 1.6 : 1),
    npcCooldownRate: () => (inBand(npc, ctx.scene.time.now) ? 1.6 : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      const k = progress(time);
      if (phase === 'black') return null;
      if (k > 0.82) {
        // Step off the line the player's shadow will draw to it, keeping its own line on the player.
        const ps = shadowOf(player, time);
        const nx = -(npc.y - ps.y), ny = npc.x - ps.x;
        const n = Math.max(1, Math.hypot(nx, ny));
        const side = (npc.x - W / 2) * nx + (npc.y - (top + H) / 2) * ny > 0 ? -1 : 1;
        return { x: clamp(npc.x + (side * nx / n) * 140, 60, W - 60), y: clamp(npc.y + (side * ny / n) * 140, top + 50, H - 40) };
      }
      // Otherwise stand in the moon's shadow, near the player.
      const b = band(time);
      return { x: clamp(b.x, 60, W - 60), y: clamp((b.y + player.y) / 2, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const k = progress(time);
      // The floor dims as the moon goes over.
      g.fillStyle(0x06040e, 0.08 + k * 0.28); g.fillRect(0, top, W, H - top);
      // The moon's shadow band, with stars in it.
      if (phase === 'creep') {
        const b = band(time);
        for (let i = 4; i >= 1; i--) { g.fillStyle(0x0a0820, 0.1); g.fillEllipse(b.x, b.y, 380 * (0.6 + i * 0.12), 520 * (0.6 + i * 0.12)); }
        for (let i = 0; i < 30; i++) {
          const x = b.x + Math.cos(i * 2.4) * ((i * 37) % 170), y = b.y + Math.sin(i * 2.4) * ((i * 53) % 240);
          g.fillStyle(MOON, 0.3 + Math.sin(time / 180 + i) * 0.3); g.fillCircle(x, y, i % 7 ? 1 : 1.8);
        }
      }
      // Each fighter's shadow, and (in the last breath before totality) the line it will run.
      for (const f of [player, npc]) {
        if (!alive(f) || phase === 'black') continue;
        const s = shadowOf(f, time);
        g.lineStyle(14, 0x020104, 0.35); g.lineBetween(f.x, f.y + 4, s.x, s.y);
        g.fillStyle(0x020104, 0.55); g.fillEllipse(s.x, s.y, 30, 24);
        const foe = f === player ? npc : player;
        const left = cycleStart + CYCLE - time;
        if (left < DIAMOND_MS && alive(foe)) {
          const w = 1 - left / DIAMOND_MS;
          g.lineStyle(2 + w * 3, f === player ? 0x9ac8ff : 0xff9a8a, 0.25 + w * 0.6); g.lineBetween(s.x, s.y, foe.x, foe.y);
          g.lineStyle(1, 0xffffff, 0.3 * w); g.strokeCircle(foe.x, foe.y, SHADOW_HIT_R);
        }
      }
    },

    drawAir(g, time) {
      // Totality: everything black, the risen shadows over it.
      if (phase === 'black') {
        const t = time - totalAt;
        const a = t < 180 ? t / 180 : t > BLACK_MS - 300 ? (BLACK_MS - t) / 300 : 1;
        g.fillStyle(0x010003, 0.88 * clamp(a, 0, 1)); g.fillRect(0, top, W, H - top);
        const k = clamp((t - 250) / LUNGE_MS, 0, 1);
        for (const r of risers) {
          const x = r.sx + (r.tx - r.sx) * k, y = r.sy + (r.ty - r.sy) * k;
          const up = clamp(t / 250, 0, 1);
          // A standing shadow: a tall figure rimmed in corona light, arms forward.
          g.fillStyle(0x000000, 1); g.fillEllipse(x, y - 20 * up, 22, 46 * up + 6); g.fillCircle(x, y - 48 * up, 10);
          g.lineStyle(2, r.owner === player ? 0x9ac8ff : 0xff9a8a, 0.9); g.strokeEllipse(x, y - 20 * up, 24, 48 * up + 8); g.strokeCircle(x, y - 48 * up, 11);
          const ang = Math.atan2(r.ty - r.sy, r.tx - r.sx);
          for (const s of [-1, 1]) { g.lineStyle(4, 0x000000, 1); g.lineBetween(x, y - 30 * up, x + Math.cos(ang + s * 0.3) * 26, y - 30 * up + Math.sin(ang + s * 0.3) * 26); }
          g.fillStyle(0xffffff, 0.95); g.fillCircle(x - 3, y - 50 * up, 1.6); g.fillCircle(x + 3, y - 50 * up, 1.6);
          // The trail it leaves.
          g.lineStyle(6, r.owner === player ? 0x9ac8ff : 0xff9a8a, 0.2); g.lineBetween(r.sx, r.sy, x, y);
        }
      }
    },

    drawHud(g, time) {
      // The sky strip: sun, moon, corona, the diamond ring.
      const k = phase === 'black' ? 1 : progress(time);
      const sx = sunX(time), sy = top + 28;
      const totality = phase === 'black';
      glow(g, sx, sy, 40, totality ? MOON : 0xfff2b0, totality ? 0.05 : 0.07 * (1 - k * 0.7), 4);
      if (totality) {
        // The corona: streamers round a black disc.
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + time / 3000;
          g.lineStyle(2, 0xe8e0ff, 0.5); g.lineBetween(sx + Math.cos(a) * 15, sy + Math.sin(a) * 15, sx + Math.cos(a) * (24 + (i % 3) * 6), sy + Math.sin(a) * (24 + (i % 3) * 6));
        }
      } else {
        g.fillStyle(0xfff2b0, 1); g.fillCircle(sx, sy, 14);
        g.fillStyle(0xffffff, 0.8); g.fillCircle(sx - 3, sy - 3, 6);
      }
      // The moon crossing it.
      const mx = sx - 30 + k * 30;
      g.fillStyle(0x0a0814, 1); g.fillCircle(mx, sy, 14.5);
      g.lineStyle(1, MOON_DIM, 0.5); g.strokeCircle(mx, sy, 14.5);
      if (!totality && cycleStart + CYCLE - time < DIAMOND_MS) {
        const d = 0.5 + Math.sin(time / 60) * 0.5;
        g.fillStyle(0xffffff, 0.7 + d * 0.3); g.fillCircle(sx + 12, sy - 6, 3 + d * 2);
      }
      // A thin progress arc under it: the count to totality.
      g.lineStyle(2, MOON, 0.6); g.beginPath(); g.arc(sx, sy, 22, Math.PI * 0.15, Math.PI * 0.15 + k * Math.PI * 0.7, false); g.strokePath();
    },
  };
}

export const ECLIPSE: GimmickDef = {
  id: 'umbral-eclipse',
  rules: 'The moon creeps over the sun: under its shadow band your abilities come back faster. At totality the room goes black and each shadow rises and lunges at its owner\'s foe.',
  make,
};
