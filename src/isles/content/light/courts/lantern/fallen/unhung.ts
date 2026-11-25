import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { soulLantern } from '../art';
import { CREPE, IRON, IRON_LIT, SOUL, SOUL_DARK, SOUL_LIT } from '../palette';
import { alive, clamp, dist, segDist } from '../util';
import { THEM, wirePlate, YOU } from './common';

/**
 * Unhung — Ysembert Crouch, Catchpole.
 *
 * Some families never hung their dead. They hid them — a grandmother under the floor, a child laid
 * in the dark of a cellar — and Crouch is the catchpole who finds the souls that got away and brings
 * them in. In his yard one little un-hung soul wanders, a child with a white ribbon. It is afraid
 * of him, and it trusts you: when he comes near it runs to hide at your back.
 *
 * Touch it and Crouch begins to catch it in his hand-lantern — rooted where he stands, lantern held
 * up, for a long breath. Every few seconds he throws his soul-hook at it down a chained line; the
 * child cowers where it is while the line is shown. Stand on the line and the hook takes you
 * instead (it hurts, and the child is safe). Step off and the hook drags the child to him and he
 * starts the catch. Catching, he takes blows hard — hurt him enough and the catch breaks and he
 * staggers; let him finish and he is mended and his blows land harder for a while.
 *
 * Shield the child, or use it as bait. Past half his hook comes quicker and his catch is quicker.
 */

const SOUL_SPEED = 150;
const HOOK_WARN = 850;
const HOOK_DMG = 13;
const BREAK_AT = 16;
const LIT_MS = 8000;

type Mode = 'free' | 'hooked' | 'catch' | 'gone';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  let late = false;
  const child = { x: W / 2 - 120, y: H - 140, mode: 'free' as Mode, wander: { x: W / 2, y: H / 2 } as Pt, back: 0, bornAt: 0 };
  let hook: { x0: number; y0: number; x1: number; y1: number; at: number } | null = null;
  let drag: { t0: number; sx: number; sy: number } | null = null;
  let catching: { t0: number; dur: number; hurt: number } | null = null;
  let litUntil = 0;
  let nextHook = 0;
  let brokeAt = -1e9;
  let started = false;

  const catchMs = () => (late ? 1050 : 1300);
  const hookEvery = () => (late ? 4200 : 5500);

  function beginCatch(time: number): void {
    child.mode = 'catch';
    catching = { t0: time, dur: catchMs(), hurt: 0 };
    ctx.root(npc, catchMs());
    ctx.sfx('curse-cast');
  }

  function respawn(time: number): void {
    const edge = Math.floor(rng() * 4);
    child.x = edge === 0 ? 50 : edge === 1 ? W - 50 : 120 + rng() * (W - 240);
    child.y = edge === 2 ? top + 40 : edge === 3 ? H - 40 : top + 60 + rng() * (H - top - 120);
    child.mode = 'free';
    child.bornAt = time;
  }

  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (!started) { started = true; nextHook = time + 3000; child.bornAt = time; }
      if (!late && alive(npc) && npc.hp <= npc.maxHp * 0.5) { late = true; ctx.banner('THE CATCHPOLE HURRIES', '#e4f5ff'); ctx.sfx('boss-phase'); }

      if (child.mode === 'gone') { if (time >= child.back) respawn(time); }
      else if (child.mode === 'free' && !hook) {
        // Run from him, to your back; else drift.
        let goal: Pt;
        const dn = dist(child.x, child.y, npc.x, npc.y), dp = dist(child.x, child.y, player.x, player.y);
        if (alive(player) && (dp < 320 || dn < 200)) {
          const a = Math.atan2(player.y - npc.y, player.x - npc.x);
          goal = { x: player.x + Math.cos(a) * 48, y: player.y + Math.sin(a) * 48 };
        } else if (dn < 200) {
          const a = Math.atan2(child.y - npc.y, child.x - npc.x);
          goal = { x: child.x + Math.cos(a) * 100, y: child.y + Math.sin(a) * 100 };
        } else {
          if (dist(child.x, child.y, child.wander.x, child.wander.y) < 20) child.wander = { x: 100 + rng() * (W - 200), y: top + 60 + rng() * (H - top - 120) };
          goal = child.wander;
        }
        const d = dist(child.x, child.y, goal.x, goal.y);
        const sp = (dn < 200 || dp < 320 ? SOUL_SPEED : 45) * dt;
        if (d > 4) { child.x += (goal.x - child.x) / d * Math.min(sp, d); child.y += (goal.y - child.y) / d * Math.min(sp, d); }
        child.x = clamp(child.x, 40, W - 40); child.y = clamp(child.y, top + 30, H - 30);
        if (alive(npc) && dn < 40 && time - brokeAt > 1500) beginCatch(time);
      }

      // The soul-hook, thrown down a chained line at the child.
      if (!hook && child.mode === 'free' && time >= nextHook && alive(npc)) {
        const a = Math.atan2(child.y - npc.y, child.x - npc.x);
        hook = { x0: npc.x, y0: npc.y, x1: child.x + Math.cos(a) * 60, y1: child.y + Math.sin(a) * 60, at: time + HOOK_WARN };
        ctx.sfx('chain');
      }
      if (hook && time >= hook.at) {
        if (alive(player) && segDist(player.x, player.y, hook.x0, hook.y0, hook.x1, hook.y1) < 30) {
          ctx.hit(player, HOOK_DMG, player.x, player.y);
          ctx.sfx('stab');
        } else if (child.mode === 'free' && segDist(child.x, child.y, hook.x0, hook.y0, hook.x1, hook.y1) < 30) {
          child.mode = 'hooked';
          drag = { t0: time, sx: child.x, sy: child.y };
          ctx.sfx('whip');
        } else ctx.sfx('whoosh');
        hook = null;
        nextHook = time + hookEvery();
      }
      if (child.mode === 'hooked' && drag) {
        const k = clamp((time - drag.t0) / 500, 0, 1);
        child.x = drag.sx + (npc.x + 20 - drag.sx) * k;
        child.y = drag.sy + (npc.y - 20 - drag.sy) * k;
        if (k >= 1) { drag = null; beginCatch(time); }
      }
      if (catching) {
        child.x = npc.x + 22; child.y = npc.y - 26;
        if (catching.hurt >= BREAK_AT) {
          ctx.stun(npc, 600);
          brokeAt = time;
          const a = Math.atan2(player.y - npc.y, player.x - npc.x);
          child.x = clamp(npc.x + Math.cos(a) * 90, 40, W - 40); child.y = clamp(npc.y + Math.sin(a) * 90, top + 30, H - 30);
          child.mode = 'free';
          catching = null;
          ctx.sfx('crystal-shatter');
        } else if (time - catching.t0 >= catching.dur) {
          ctx.heal(npc, npc.maxHp * 0.08);
          litUntil = time + LIT_MS;
          child.mode = 'gone';
          child.back = time + 4000;
          catching = null;
          ctx.sfx('trap-snap');
        }
      }
    },

    onNpcHurt(n) { if (catching) catching.hurt += n; },
    npcTakenMult() { return catching ? 1.6 : 1; },
    playerTakenMult() { return ctx.scene.time.now < litUntil ? 1.25 : 1; },

    npcSeek() {
      if (catching) return null;
      if (child.mode === 'free' || child.mode === 'hooked') return { x: child.x, y: child.y };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 180, 60, W - 60), y: clamp(player.y + Math.sin(a) * 160, top + 40, H - 40) };
    },

    drawGround(g, time) {
      if (hook) {
        const k = clamp(1 - (hook.at - time) / HOOK_WARN, 0, 1);
        const L = dist(hook.x0, hook.y0, hook.x1, hook.y1) || 1, ux = (hook.x1 - hook.x0) / L, uy = (hook.y1 - hook.y0) / L;
        g.lineStyle(52, THEM, 0.05 + k * 0.12); g.lineBetween(hook.x0, hook.y0, hook.x1, hook.y1);
        // The chain laid out along the line, link by link, as far as it has paid out.
        for (let d = 0; d < L * (0.3 + k * 0.7); d += 9) {
          const x = hook.x0 + ux * d, y = hook.y0 + uy * d;
          g.lineStyle(1.6, IRON, 0.85);
          if ((d / 9) % 2 < 1) g.strokeEllipse(x, y, 7, 4); else g.strokeEllipse(x, y, 4, 7);
        }
      }
      // A shadow under the child, and the child's ribbon trailing on the flags.
      if (child.mode !== 'gone' && !catching) { g.fillStyle(0x000000, 0.18); g.fillEllipse(child.x, child.y + 2, 20, 6); }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // The barbed hook, flying at the end of the chain as the line lands.
      if (hook) {
        const k = clamp(1 - (hook.at - time) / HOOK_WARN, 0, 1);
        const x = hook.x0 + (hook.x1 - hook.x0) * Math.max(0, k * 1.2 - 0.2), y = hook.y0 + (hook.y1 - hook.y0) * Math.max(0, k * 1.2 - 0.2) - 30;
        g.lineStyle(3, IRON_LIT, 1);
        g.beginPath(); g.arc(x, y, 9, 0.2, Math.PI * 1.4, false); g.strokePath();
        g.lineBetween(x, y - 9, x, y - 20);
        g.fillStyle(IRON, 1); g.fillTriangle(x + 9, y + 2, x + 13, y - 6, x + 6, y - 3);
      }
      // The child: small, pale, a white ribbon at the throat. Cowering while the hook is out.
      if (child.mode !== 'gone') {
        const cower = !!hook || child.mode === 'hooked';
        const shiver = cower ? Math.sin(time / 30) * 1.4 : 0;
        const x = child.x + shiver, y = child.y - 22 + (cower ? 4 : Math.sin(t * 3) * 2);
        glow(g, x, y, 26, SOUL, 0.07, 3);
        g.fillStyle(SOUL_LIT, 0.75);
        g.fillTriangle(x - 9, y + 16, x + 9, y + 16, x, y - 2);
        g.fillCircle(x - 5, y + 16, 3.5); g.fillCircle(x + 1, y + 17, 3.5); g.fillCircle(x + 6, y + 16, 3);
        g.fillStyle(0xf2fbff, 0.95); g.fillCircle(x, y - 6, 7);
        g.fillStyle(SOUL_DARK, 0.9);
        g.fillEllipse(x - 2.6, y - 7, 2.2, cower ? 4 : 3); g.fillEllipse(x + 2.6, y - 7, 2.2, cower ? 4 : 3);
        if (cower) g.fillEllipse(x, y - 2.5, 2, 2.6);
        // Arms: up over the head when cowering, a hand out to you otherwise.
        g.lineStyle(1.8, SOUL_LIT, 0.8);
        if (cower) { g.lineBetween(x - 6, y + 2, x - 7, y - 12); g.lineBetween(x + 6, y + 2, x + 7, y - 12); }
        else { const a = Math.atan2(player.y - child.y, player.x - child.x); g.lineBetween(x, y + 3, x + Math.cos(a) * 11, y + 3 + Math.sin(a) * 6); }
        // The ribbon.
        g.fillStyle(CREPE, 1); g.fillTriangle(x - 1, y + 1, x - 8, y + 4 + Math.sin(t * 5) * 2, x - 6, y - 1);
        g.fillTriangle(x + 1, y + 1, x + 8, y + 5 + Math.sin(t * 5 + 1) * 2, x + 6, y - 1);
        g.fillStyle(YOU, 0.9); g.fillCircle(x, y + 1, 1.6);
      }
      // Crouch's hand-lantern raised during a catch: the child drawn in, the break meter round it.
      if (catching) {
        const k = clamp((time - catching.t0) / catching.dur, 0, 1);
        const lx = npc.x + 22, ly = npc.y - 74;
        g.lineStyle(2, IRON, 1); g.lineBetween(npc.x + 10, npc.y - 40, lx, ly);
        soulLantern(g, lx, ly, 1.2, k, t);
        for (let i = 0; i < 6; i++) {
          const ph = (t * 2 + i / 6) % 1;
          g.fillStyle(SOUL_LIT, 0.8 * (1 - ph)); g.fillCircle(lx + Math.cos(i) * 26 * (1 - ph), ly + 22 + Math.sin(i) * 20 * (1 - ph), 2);
        }
        g.lineStyle(3, THEM, 0.9); g.beginPath(); g.arc(lx, ly + 20, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        const b = clamp(catching.hurt / BREAK_AT, 0, 1);
        g.lineStyle(3, YOU, 0.95); g.beginPath(); g.arc(lx, ly + 20, 31, -Math.PI / 2, -Math.PI / 2 - b * Math.PI * 2, true); g.strokePath();
      }
      // Lit: the caught child glows in a lantern on his belt while his blows land harder.
      if (time < litUntil && alive(npc)) {
        soulLantern(g, npc.x - 18, npc.y - 36, 0.8, 1, t);
        glow(g, npc.x - 18, npc.y - 24, 24, THEM, 0.05, 2);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 8;
      wirePlate(g, cx, y, 180, 30);
      // The child's state: a small figure free, a hook if hunted, a lantern if caught.
      const ix = cx - 60;
      if (child.mode === 'gone') { soulLantern(g, ix, y + 6, 0.6, 1, time / 1000); }
      else {
        g.fillStyle(SOUL, 1); g.fillCircle(ix, y + 12, 4); g.fillTriangle(ix - 4, y + 23, ix + 4, y + 23, ix, y + 13);
        if (hook || catching) { g.lineStyle(1.6, THEM, 1); g.strokeCircle(ix + 12, y + 14, 4); }
      }
      // Next hook, filling.
      const k = hook ? 1 : clamp(1 - (nextHook - time) / hookEvery(), 0, 1);
      g.fillStyle(0xcfc6b0, 1); g.fillRect(cx - 30, y + 12, 60, 6);
      g.fillStyle(THEM, 1); g.fillRect(cx - 30, y + 12, 60 * k, 6);
      // His lit time.
      if (time < litUntil) {
        const l = (litUntil - time) / LIT_MS;
        g.fillStyle(THEM, 1); g.fillRect(cx + 40, y + 10, 34 * l, 10);
        g.lineStyle(1, IRON, 1); g.strokeRect(cx + 40, y + 10, 34, 10);
      }
    },
  };
}

export const FALLEN_UNHUNG: GimmickDef = {
  id: fallenId('lantern', 'unhung'),
  rules: 'An un-hung child hides at your back. Stand on his hook line to save it, or let him catch it: catching, he is rooted and hurts.',
  make,
};
