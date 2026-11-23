import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { glint, sunburst } from '../art';
import { BRASS, BRASS_DARK, GOLD, GOLD_DARK, GOLD_LIT, IRON_DARK, MARBLE_LIT, MARBLE_DARK, MADDER, SUN } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * High Noon — Deputy Glint.
 *
 * It is always noon on Solmara, so the court rings its noon bell on a clock of its own: every
 * twelve seconds. Glint is the deputy who keeps the bell, and he settles every quarrel on the
 * plaza the old way. When the bell strikes, both fighters are held where they stand (rooted —
 * you can still turn and cast, you just can't walk), a hush falls, and after a beat that is
 * never quite the same length, "DRAW!".
 *
 * The first to cast after the call fires a heavy shot into the other. Cast *before* the call —
 * jump the gun — and you are stunned for it and out of that draw. Glint's hand is fast, but it
 * is twitchy: a patient player can let him jump, then take the draw unopposed.
 */

interface Gun { out: boolean; jumpedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const PERIOD = ctx.hard ? 10000 : 12000;
  const WARN = 2600;
  const DRAW_WINDOW = 2600;
  const BONUS = ctx.hard ? 28 : 24;
  const JUMP_STUN = 1400;
  let nextBell = 0;
  let started = false;
  let state: 'idle' | 'warn' | 'standoff' | 'draw' = 'idle';
  let stateAt = 0;
  let drawAt = 0;
  let lastTick = 0;
  let shot: { from: Fighter; to: Fighter; at: number; x0: number; y0: number; x1: number; y1: number } | null = null;
  const guns = new Map<Fighter, Gun>([[player, { out: false, jumpedAt: -9999 }], [npc, { out: false, jumpedAt: -9999 }]]);
  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function bell(time: number): void {
    state = 'standoff';
    stateAt = time;
    const hold = (ctx.hard ? 900 : 1100) + rng() * 800;
    drawAt = time + hold;
    for (const [f, g] of guns) { g.out = false; if (alive(f)) ctx.root(f, hold); }
    ctx.sfx('judgement');
    ctx.banner('HIGH NOON — HOLD YOUR FIRE', '#fff3c0');
  }

  function onCast(f: Fighter): void {
    const time = ctx.scene.time.now;
    const g = guns.get(f);
    if (!g || !alive(f)) return;
    if (state === 'standoff' && time < drawAt) {
      if (g.out) return;
      g.out = true;
      g.jumpedAt = time;
      ctx.stun(f, JUMP_STUN);
      ctx.float(f.x, f.y - 50, 'JUMPED THE GUN', '#ff9a7a');
      ctx.sfx('status-stun');
      return;
    }
    if (state === 'draw' && !g.out) {
      const o = other(f);
      state = 'idle';
      if (!alive(o)) return;
      ctx.hit(o, BONUS, o.x, o.y);
      shot = { from: f, to: o, at: time, x0: f.x, y0: f.y - 14, x1: o.x, y1: o.y - 14 };
      ctx.sfx('musket');
      ctx.float(f.x, f.y - 54, f === player ? 'QUICKEST DRAW' : 'GLINT DRAWS FIRST', '#ffe17a');
      ctx.flash(o.x, o.y, 0xffffff);
    }
  }

  return {
    update(time) {
      if (!started) { started = true; nextBell = time + 8500; }
      if (state === 'idle' && time >= nextBell - WARN) { state = 'warn'; stateAt = time; lastTick = 0; ctx.banner('THE NOON BELL IS ABOUT TO STRIKE', '#fff3c0'); }
      if (state === 'warn') {
        const left = nextBell - time;
        const sec = Math.ceil(left / 1000);
        if (sec !== lastTick && sec > 0) { lastTick = sec; ctx.sfx('clock-tick'); }
        if (left <= 0) { nextBell = time + PERIOD; bell(time); }
      }
      if (state === 'standoff' && time >= drawAt) {
        state = 'draw';
        stateAt = time;
        ctx.sfx('countdown-go');
        ctx.banner('DRAW!', '#ffffff');
        if ([...guns.values()].every((g) => g.out)) state = 'idle';
      }
      if (state === 'draw' && time - stateAt > DRAW_WINDOW) state = 'idle';
    },

    onPlayerCast() { onCast(player); },
    onNpcCast() { onCast(npc); },

    npcSeek() {
      // Square up at a duelling distance, across the plaza from you.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      const d = state === 'warn' || state === 'standoff' ? 300 : 230;
      return { x: clamp(player.x + Math.cos(a) * d, 70, W - 70), y: clamp(player.y + Math.sin(a) * d * 0.8, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // During the standoff: the duelling line chalked between them, each fighter's coin of a shadow.
      if (state === 'standoff' || state === 'draw' || state === 'warn') {
        const k = state === 'warn' ? clamp((time - stateAt) / WARN, 0, 1) : 1;
        if (alive(player) && alive(npc)) {
          const d = dist(player.x, player.y, npc.x, npc.y);
          const n = Math.floor(d / 18);
          for (let i = 1; i < n; i += 2) {
            const t0 = i / n, t1 = (i + 1) / n;
            g.lineStyle(2, state === 'draw' ? 0xffffff : GOLD_LIT, 0.25 + k * 0.45);
            g.lineBetween(player.x + (npc.x - player.x) * t0, player.y + (npc.y - player.y) * t0, player.x + (npc.x - player.x) * t1, player.y + (npc.y - player.y) * t1);
          }
        }
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          g.fillStyle(0x1a1410, 0.6); g.fillEllipse(f.x, f.y + 4, 12, 5);
          if (state === 'standoff') { g.lineStyle(2, GOLD, 0.6); g.strokeEllipse(f.x, f.y + 4, 46, 18); }
        }
      }
    },

    drawAir(g, time) {
      // Hands hovering over holsters in the standoff; a red cross over whoever jumped.
      for (const [f, gun] of guns) {
        if (!alive(f)) continue;
        if (time - gun.jumpedAt < JUMP_STUN) {
          const k = (time - gun.jumpedAt) / JUMP_STUN;
          g.lineStyle(4, MADDER, 1 - k);
          g.lineBetween(f.x - 12, f.y - 70, f.x + 12, f.y - 50); g.lineBetween(f.x + 12, f.y - 70, f.x - 12, f.y - 50);
        } else if (state === 'standoff') {
          const tw = Math.sin(time / 60 + (f === player ? 0 : 2)) * 2;
          g.fillStyle(MARBLE_LIT, 0.9); g.fillCircle(f.x + 20 + tw, f.y - 8, 5);
          g.lineStyle(1.5, MARBLE_DARK, 1); g.strokeCircle(f.x + 20 + tw, f.y - 8, 5);
          for (let i = 0; i < 3; i++) { g.fillStyle(MARBLE_LIT, 0.9); g.fillRect(f.x + 17 + tw + i * 2.5, f.y - 4, 1.8, 6); }
        } else if (state === 'draw' && !gun.out) {
          glint(g, f.x, f.y - 64, 10 + Math.sin(time / 50) * 3, 0.9);
        }
      }
      // The shot: a white streak and a puff where it lands.
      if (shot && time - shot.at < 450) {
        const k = (time - shot.at) / 450;
        g.lineStyle(6 * (1 - k), 0xffffff, 1 - k); g.lineBetween(shot.x0, shot.y0, shot.x1, shot.y1);
        g.lineStyle(14 * (1 - k), GOLD_LIT, 0.3 * (1 - k)); g.lineBetween(shot.x0, shot.y0, shot.x1, shot.y1);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(0xffffff, 1 - k); g.fillCircle(shot.x1 + Math.cos(a) * k * 30, shot.y1 + Math.sin(a) * k * 30, 3 * (1 - k)); }
        g.fillStyle(SUN, 0.7 * (1 - k)); g.fillCircle(shot.x0, shot.y0, 10 * (1 - k) + 4);
      }
    },

    drawHud(g, time) {
      // The bell clock: one hand sweeping to XII, the bell swinging when it strikes.
      const cx = W / 2, cy = top + 46;
      const toBell = state === 'idle' || state === 'warn' ? clamp(1 - (nextBell - time) / PERIOD, 0, 1) : 1;
      g.fillStyle(0x000000, 0.3); g.fillCircle(cx, cy + 2, 30);
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(cx, cy, 29);
      g.fillStyle(BRASS, 1); g.fillCircle(cx, cy - 1, 27);
      g.fillStyle(MARBLE_LIT, 1); g.fillCircle(cx, cy, 22);
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
        g.lineStyle(i === 0 ? 3 : 1, i === 0 ? GOLD_DARK : IRON_DARK, 1);
        g.lineBetween(cx + Math.cos(a) * (i === 0 ? 13 : 17), cy + Math.sin(a) * (i === 0 ? 13 : 17), cx + Math.cos(a) * 21, cy + Math.sin(a) * 21);
      }
      // The last stretch before the bell glows.
      g.fillStyle(GOLD_LIT, 0.35); g.slice(cx, cy, 21, -Math.PI / 2 - (WARN / PERIOD) * Math.PI * 2, -Math.PI / 2, false); g.fillPath();
      const ha = -Math.PI / 2 + toBell * Math.PI * 2;
      g.lineStyle(3, IRON_DARK, 1); g.lineBetween(cx, cy, cx + Math.cos(ha) * 18, cy + Math.sin(ha) * 18);
      g.fillStyle(GOLD, 1); g.fillCircle(cx, cy, 3);
      // The bell above it.
      const swing = state === 'standoff' ? Math.sin((time - stateAt) / 70) * 0.5 * Math.max(0, 1 - (time - stateAt) / 1200) : 0;
      const bx = cx + Math.sin(swing) * 6, by = cy - 40;
      if (state === 'standoff' || state === 'draw') glow(g, bx, by, 26, GOLD_LIT, 0.08, 3);
      g.fillStyle(GOLD_DARK, 1); g.fillTriangle(bx - 10, by + 8, bx + 10, by + 8, bx, by - 10);
      g.fillStyle(GOLD, 1); g.fillEllipse(bx, by - 2, 14, 14);
      g.fillStyle(GOLD_DARK, 1); g.fillEllipse(bx, by + 8, 22, 5);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(bx + Math.sin(swing) * 5, by + 11, 2.5);
      if (state === 'draw') sunburst(g, cx, cy, 34 + Math.sin(time / 60) * 3, 16, 0.25, GOLD_LIT);
    },
  };
}

export const HIGH_NOON: GimmickDef = {
  id: 'noon-high-noon',
  rules: 'Every 12s the noon bell roots you both — wait for "DRAW!": the first to cast after it fires a heavy shot. Cast too soon and you are stunned.',
  make,
};
