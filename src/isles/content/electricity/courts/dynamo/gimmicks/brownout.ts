import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { sparks, switchCabinet } from '../art';
import { FILAMENT, FILAMENT_DIM, IRON_DARK, IRON_LIT, OFF_RED } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Brownout — Switchman Gloam.
 *
 * The yard is wired in six lamp circuits, a hanging lamp over each. Gloam is the man who switches
 * houses off, and he does it to the yard: every few seconds a lit section's lamp flickers, browns,
 * and dies. In a dark section you can hardly be seen — the dark hides you from the eye (only a
 * glint of your eyes shows) and from Gloam's lantern — but you are also off the Grid's protection:
 * anyone in the dark takes a third more from every blow.
 *
 * Gloam's hooded lantern snaps open every couple of seconds and fires at you — where you are if
 * you are lit, where he last saw you if you are not. Each section's breaker stands on the wall:
 * strike it to throw it and the section comes back on with a surge that dazzles anyone standing
 * in it who didn't throw the switch. He lives in the dark. Find his section, and turn it on.
 */

const BREAKER_R = 22;
const DARK_MULT = 1.35;

interface Section { r: Rect; lit: boolean; flickerAt: number; darkAt: number; litAt: number; breaker: Pt; cooldown: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const cw = W / 3, ch = (H - top) / 2;
  const sections: Section[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const rect = { x: c * cw, y: top + r * ch, w: cw, h: ch };
      sections.push({
        r: rect, lit: true, flickerAt: -1, darkAt: 0, litAt: -9999, cooldown: 0,
        breaker: { x: rect.x + cw / 2 + (c === 1 ? 0 : c === 0 ? -60 : 60), y: r === 0 ? top + 30 : H - 26 },
      });
    }
  }
  const cutEvery = ctx.hard ? 2600 : 3200;
  const FLICKER = 1100;
  const maxDark = 4;
  const shotEvery = ctx.hard ? 1900 : 2400;
  let nextCut = -1;
  let nextShot = -1;
  let lastSeen: Pt = { x: player.x, y: player.y };
  let shotFlash = -9999;

  const sectionOf = (x: number, y: number) => sections.find((s) => x >= s.r.x && x < s.r.x + s.r.w && y >= s.r.y && y < s.r.y + s.r.h) ?? null;
  const inDark = (f: Fighter) => { const s = sectionOf(f.x, f.y); return !!s && !s.lit; };

  function cut(time: number): void {
    const dark = sections.filter((s) => !s.lit).length;
    if (dark >= maxDark) {
      // The Grid gives one back somewhere: Gloam can only hold so much of the yard.
      const back = sections.filter((s) => !s.lit)[Math.floor(rng() * dark)];
      back.lit = true; back.litAt = time;
      ctx.sfx('electric-charge');
      return;
    }
    const lit = sections.filter((s) => s.lit && s.flickerAt < 0);
    if (!lit.length) return;
    const ps = sectionOf(player.x, player.y);
    const pick = ps && ps.lit && ps.flickerAt < 0 && rng() < 0.5 ? ps : lit[Math.floor(rng() * lit.length)];
    pick.flickerAt = time;
    pick.darkAt = time + FLICKER;
    ctx.sfx('glitch');
  }

  /** A breaker thrown by `by`: the section relights with a surge that dazzles everyone else in it. */
  function throwBreaker(s: Section, by: Fighter): void {
    const time = tk.now;
    if (time < s.cooldown || (s.lit && s.flickerAt < 0)) return;
    s.lit = true; s.flickerAt = -1; s.litAt = time; s.cooldown = time + 1500;
    ctx.sfx('electric-charge');
    ctx.flash(s.r.x + s.r.w / 2, s.r.y + s.r.h / 2, FILAMENT);
    for (const o of [player, npc]) {
      if (o === by || !alive(o)) continue;
      if (sectionOf(o.x, o.y) === s) { ctx.stun(o, 650); ctx.float(o.x, o.y - 48, 'DAZZLED', '#ffe9a8'); }
    }
  }

  for (const s of sections) {
    ctx.target({ x: s.breaker.x, y: s.breaker.y, r: BREAKER_R, onStruck: (by) => throwBreaker(s, by === 'player' ? player : npc) });
  }

  return {
    update(time) {
      if (nextCut < 0) { nextCut = time + 1800; nextShot = time + 2200; }
      if (time >= nextCut) { nextCut = time + cutEvery; cut(time); }
      for (const s of sections) {
        if (s.flickerAt >= 0 && time >= s.darkAt) {
          s.flickerAt = -1; s.lit = false;
          ctx.sfx('hush');
        }
      }
      if (!inDark(player)) lastSeen = { x: player.x, y: player.y };
      // Gloam's lantern.
      if (time >= nextShot && alive(npc) && alive(player)) {
        nextShot = time + shotEvery;
        const aim = inDark(player) ? lastSeen : { x: player.x, y: player.y };
        const a = Math.atan2(aim.y - npc.y, aim.x - npc.x);
        for (const k of ctx.hard ? [-0.12, 0, 0.12] : [-0.08, 0.08]) {
          tk.spawnBullet({ x: npc.x + Math.cos(a) * 24, y: npc.y + Math.sin(a) * 24, angle: a + k, speed: 280, damage: 7, r: 5, lifeMs: 3000, color: FILAMENT });
        }
        shotFlash = time;
        ctx.sfx('zap');
      }
    },

    playerTakenMult: () => (inDark(player) ? DARK_MULT : 1),
    npcTakenMult: () => (inDark(npc) ? DARK_MULT : 1),

    npcSeek() {
      if (!alive(player)) return null;
      const ps = sectionOf(player.x, player.y);
      // The player hiding in a dark section whose breaker is close: strike it and dazzle them.
      if (ps && !ps.lit && ps.flickerAt < 0 && tk.now >= ps.cooldown && sectionOf(npc.x, npc.y) !== ps
        && dist(ps.breaker.x, ps.breaker.y, npc.x, npc.y) < 220) {
        return { x: ps.breaker.x, y: clamp(ps.breaker.y + (ps.breaker.y < H / 2 ? 30 : -30), top + 40, H - 40) };
      }
      const darkOthers = sections.filter((s) => !s.lit && s !== ps);
      if (darkOthers.length) {
        // The dark section nearest the player, at the edge nearest them.
        const best = darkOthers.sort((a, b) => dist(a.r.x + a.r.w / 2, a.r.y + a.r.h / 2, player.x, player.y) - dist(b.r.x + b.r.w / 2, b.r.y + b.r.h / 2, player.x, player.y))[0];
        return {
          x: clamp(player.x, best.r.x + 60, best.r.x + best.r.w - 60),
          y: clamp(player.y, best.r.y + 50, best.r.y + best.r.h - 40),
        };
      }
      // Nowhere dark: keep a lantern's distance.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 240, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Pools of filament light under each lit lamp.
      for (const s of sections) {
        const cx = s.r.x + s.r.w / 2, cy = s.r.y + s.r.h / 2;
        if (s.lit && s.flickerAt < 0) glow(g, cx, cy + 20, 150, FILAMENT, 0.035, 4);
        // Circuit boundaries: hazard tape painted on the setts.
        g.lineStyle(3, 0xe8c838, 0.35); g.strokeRect(s.r.x + 3, s.r.y + 3, s.r.w - 6, s.r.h - 6);
        for (let d = 0; d < s.r.w; d += 28) { g.lineStyle(3, 0x1a1a1a, 0.35); g.lineBetween(s.r.x + d, s.r.y + 3, s.r.x + d + 12, s.r.y + 3); }
        // Breaker and the cable from it to the lamp.
        const b = s.breaker;
        g.lineStyle(2, IRON_DARK, 0.6); g.lineBetween(b.x, b.y - 20, cx, cy - 60);
        switchCabinet(g, b.x, b.y + 14, 0.9, s.lit, s.lit ? 0.6 : 0.2);
        if (!s.lit) { g.lineStyle(1.5, OFF_RED, 0.5 + Math.sin(time / 200) * 0.3); g.strokeCircle(b.x, b.y, BREAKER_R + 10); }
      }
    },

    drawAir(g, time) {
      for (const s of sections) {
        const cx = s.r.x + s.r.w / 2, cy = s.r.y + s.r.h / 2;
        // Darkness: an almost-black veil over the section; it stutters while it browns out.
        let veil = s.lit ? 0 : 0.82;
        if (s.flickerAt >= 0) {
          const k = (time - s.flickerAt) / FLICKER;
          veil = Math.floor(time / 70) % 3 === 0 ? 0.6 * k : 0.25 * k;
        }
        if (s.lit && time - s.litAt < 400) { g.fillStyle(0xfff4d0, 0.25 * (1 - (time - s.litAt) / 400)); g.fillRect(s.r.x, s.r.y, s.r.w, s.r.h); }
        if (veil > 0) { g.fillStyle(0x04050a, veil); g.fillRect(s.r.x, s.r.y, s.r.w, s.r.h); }
        // The hanging lamp: alive, browning, or dead.
        const ly = cy - 60;
        g.lineStyle(1.5, IRON_LIT, 0.6); g.lineBetween(cx, s.r.y, cx, ly - 10);
        g.fillStyle(IRON_DARK, 1); g.fillTriangle(cx - 14, ly - 4, cx + 14, ly - 4, cx, ly - 14);
        const on = s.lit && s.flickerAt < 0;
        const brown = s.flickerAt >= 0;
        g.fillStyle(on ? FILAMENT : brown ? (Math.floor(time / 90) % 2 ? FILAMENT : FILAMENT_DIM) : 0x2a2418, 1);
        g.fillCircle(cx, ly + 2, 6);
        if (on) glow(g, cx, ly + 2, 26, FILAMENT, 0.06, 3);
        if (brown) sparks(g, cx, ly + 2, 10, time, 3, FILAMENT);
      }
      // Eye-glints of whoever is hidden in the dark.
      for (const f of [player, npc]) {
        if (!alive(f) || !inDark(f)) continue;
        const blink = Math.floor(time / 1700 + (f === npc ? 0.5 : 0)) % 4 === 0 && (time % 1700) < 140;
        if (blink) continue;
        const c = f === player ? 0xbff0ff : 0xffd06a;
        g.fillStyle(c, f === player ? 0.9 : 0.55); g.fillCircle(f.x - 5, f.y - 22, 1.8); g.fillCircle(f.x + 5, f.y - 22, 1.8);
        if (f === player) { g.lineStyle(1, c, 0.25); g.strokeCircle(f.x, f.y, 24); }
      }
      // The lantern snapping open.
      if (time - shotFlash < 160 && alive(npc)) { glow(g, npc.x, npc.y - 10, 50, FILAMENT, 0.1, 3); }
    },

    drawHud(g) {
      // A little circuit diagram: six squares, lit or dark.
      const x0 = W / 2 - 45, y0 = top + 6;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 6, y0 - 4, 102, 44, 5);
      sections.forEach((s, i) => {
        const x = x0 + (i % 3) * 32, y = y0 + Math.floor(i / 3) * 19;
        g.fillStyle(s.lit && s.flickerAt < 0 ? FILAMENT : s.flickerAt >= 0 ? FILAMENT_DIM : 0x14161c, 1);
        g.fillRect(x, y, 28, 15);
        g.lineStyle(1, 0x000000, 1); g.strokeRect(x, y, 28, 15);
      });
    },
  };
}

export const BROWNOUT: GimmickDef = {
  id: 'dynamo-brownout',
  rules: 'Lamp circuits brown out one by one. In the dark you are hidden but take a third more. Strike a breaker to relight its section and dazzle whoever is in it.',
  make,
};
