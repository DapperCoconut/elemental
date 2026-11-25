import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { drawToad } from '../art';
import { CHALK } from '../palette';
import { alive, clamp, dist } from '../util';
import { dashedRing, pastHalf, progressArc, sideColor, slatePlate, type Side } from './common';

/**
 * Warts and All — Toad-Wife Gudule Bulrush of the familiar market, and her heron.
 *
 * Her toads hop about the floor. Now and then one swells its throat (a green ring shows how far
 * its croak will carry) and croaks: whoever is in reach is hexed into a toad for a few seconds —
 * slow, abilities locked, a warty glamour over them. And the heron that stalks the floor hunts
 * toads: it walks for the nearest hexed fighter (or, with none, a real toad), draws its neck back
 * over the spot, and spears it.
 *
 * Keep clear of swelling throats; hexed, keep walking away from the heron. Strike a toad and it
 * leaps far away from you — herd them at her, so the croak hexes *her* and the heron comes for her.
 * Strike the heron and it takes fright and stoops on your foe. Past half the toads multiply.
 */

const SLUG = 'toad';
const TOADS = 4;
const TOADS_HALF = 6;
const HOP = 60;
const HOP_MS = 300;
const KICK = 135;
const KICK_MS = 420;
const SWELL_MS = 1150;
const CROAK_R = 74;
const HEX_MS = 3600;
const HEX_SLOW = 0.7;
const HERON_SPEED = 72;
const HERON_REACH = 58;
const AIM_MS = 650;
const STAB_R = 36;
const STAB = 18;
const FLY_MS = 900;
const STARTLE_CD = 4000;
const SKIN = 0x7a8a3a;
const HEX = 0x7ad84a;
const HEX_LIT = 0xc8f88a;
const HERON = 0xb8bcc4;
const HERON_DARK = 0x6a707c;

interface Toad { x: number; y: number; fx: number; fy: number; tx: number; ty: number; moveAt: number; moveMs: number; nextHop: number; swellAt: number; nextCroak: number; target: StrikeTarget | null; gone: boolean }
type HeronState = 'stalk' | 'aim' | 'fly';
interface Heron { x: number; y: number; face: number; state: HeronState; at: number; aimX: number; aimY: number; fromX: number; fromY: number; toX: number; toY: number; flyAimSide: Side | null; rest: number; startleReady: number; target: StrikeTarget | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const fighter = (s: Side): Fighter => (s === 'player' ? player : npc);
  const now = (): number => ctx.scene.time.now;
  const hexUntil: Record<Side, number> = { player: 0, npc: 0 };
  let toads: Toad[] = [];
  let croaks: { x: number; y: number; at: number }[] = [];
  let stabs: { x: number; y: number; at: number }[] = [];
  let turned = false;
  let respawnAt = 0;

  const hexed = (s: Side): boolean => hexUntil[s] > now();

  function spawnToad(time: number): void {
    let x = W / 2, y = top + 200;
    for (let tries = 0; tries < 12; tries++) {
      x = 80 + ctx.rng() * (W - 160); y = top + 60 + ctx.rng() * (H - top - 120);
      if (dist(x, y, player.x, player.y) > 150 && dist(x, y, npc.x, npc.y) > 150) break;
    }
    const t: Toad = { x, y, fx: x, fy: y, tx: x, ty: y, moveAt: -9999, moveMs: HOP_MS, nextHop: time + 800 + ctx.rng() * 900, swellAt: -1, nextCroak: time + 2400 + ctx.rng() * 2600, target: null, gone: false };
    t.target = ctx.target({
      x, y, r: 16, passThrough: true,
      onStruck: (by) => {
        if (t.swellAt >= 0 && now() - t.swellAt > SWELL_MS * 0.7) return;
        const f = fighter(by);
        const a = Math.atan2(t.y - f.y, t.x - f.x);
        jump(t, t.x + Math.cos(a) * KICK, t.y + Math.sin(a) * KICK, KICK_MS, now());
        t.swellAt = -1; t.nextCroak = Math.max(t.nextCroak, now() + KICK_MS + 600);
        ctx.sfx('boing');
      },
    });
    toads.push(t);
  }

  function jump(t: Toad, x: number, y: number, ms: number, time: number): void {
    t.fx = t.x; t.fy = t.y; t.tx = tk.clampX(x, 50); t.ty = clamp(y, top + 40, H - 40); t.moveAt = time; t.moveMs = ms;
  }

  const heron: Heron = { x: W / 2, y: top + 90, face: 0, state: 'stalk', at: 0, aimX: 0, aimY: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, flyAimSide: null, rest: 0, startleReady: 0, target: null };
  heron.target = ctx.target({
    x: heron.x, y: heron.y - 30, r: 24,
    onStruck: (by) => {
      const time = now();
      if (heron.state === 'fly' || time < heron.startleReady) return;
      const foe = fighter(by === 'player' ? 'npc' : 'player');
      const striker = fighter(by);
      const a = Math.atan2(striker.y - foe.y, striker.x - foe.x);
      heron.state = 'fly'; heron.at = time; heron.fromX = heron.x; heron.fromY = heron.y;
      heron.toX = tk.clampX(foe.x + Math.cos(a) * 52, 50); heron.toY = clamp(foe.y + Math.sin(a) * 52, top + 40, H - 40);
      heron.flyAimSide = by === 'player' ? 'npc' : 'player';
      heron.startleReady = time + STARTLE_CD;
      ctx.sfx('wings');
    },
  });

  function startAim(x: number, y: number, time: number): void {
    heron.state = 'aim'; heron.at = time; heron.aimX = x; heron.aimY = y;
    heron.face = Math.atan2(y - heron.y, x - heron.x);
    ctx.sfx('beam-charge');
  }

  function stab(time: number): void {
    const x = heron.aimX, y = heron.aimY;
    stabs.push({ x, y, at: time });
    if (alive(player) && dist(player.x, player.y, x, y) < STAB_R + 18) tk.hitPlayer(STAB, x, y);
    if (alive(npc) && dist(npc.x, npc.y, x, y) < STAB_R + 18) ctx.hit(npc, STAB, x, y);
    for (const t of toads) if (!t.gone && dist(t.x, t.y, x, y) < STAB_R) { t.gone = true; t.target?.remove(); respawnAt = time + 2600; }
    ctx.sfx('stab');
    heron.state = 'stalk'; heron.rest = time + 900;
  }

  for (let i = 0; i < TOADS; i++) spawnToad(0);

  return {
    update(time, dt) {
      const step = clamp(dt, 0, 0.1);
      if (!turned && pastHalf(npc)) { turned = true; ctx.banner('THE TOADS MULTIPLY', '#c8f88a'); }
      toads = toads.filter((t) => !t.gone);
      if (toads.length < (turned ? TOADS_HALF : TOADS) && time >= respawnAt) { spawnToad(time); respawnAt = time + 1200; }
      // Toads: hop, swell, croak.
      for (const t of toads) {
        const k = clamp((time - t.moveAt) / t.moveMs, 0, 1);
        if (k < 1) { t.x = t.fx + (t.tx - t.fx) * k; t.y = t.fy + (t.ty - t.fy) * k; }
        else { t.x = t.tx; t.y = t.ty; }
        if (t.swellAt < 0 && k >= 1 && time >= t.nextHop) {
          const near = dist(t.x, t.y, player.x, player.y) < dist(t.x, t.y, npc.x, npc.y) ? player : npc;
          const a = ctx.rng() < 0.6 ? Math.atan2(near.y - t.y, near.x - t.x) + (ctx.rng() - 0.5) : ctx.rng() * Math.PI * 2;
          jump(t, t.x + Math.cos(a) * HOP, t.y + Math.sin(a) * HOP, HOP_MS, time);
          t.nextHop = time + 1300 + ctx.rng() * 600;
        }
        if (t.swellAt < 0 && k >= 1 && time >= t.nextCroak) { t.swellAt = time; ctx.sfx('bubble'); }
        if (t.swellAt >= 0 && time - t.swellAt >= SWELL_MS) {
          croaks.push({ x: t.x, y: t.y, at: time });
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighter(s);
            if (alive(f) && !ctx.isAirborne(f) && dist(f.x, f.y, t.x, t.y) < CROAK_R) {
              hexUntil[s] = time + HEX_MS;
              ctx.silence(f, HEX_MS);
              ctx.sfx('curse-cast');
            }
          }
          ctx.sfx('slime-splat');
          t.swellAt = -1; t.nextCroak = time + 3600 + ctx.rng() * 2200; t.nextHop = time + 500;
        }
        t.target?.moveTo(t.x, t.y - 6);
      }
      croaks = croaks.filter((c) => time - c.at < 600);
      stabs = stabs.filter((s) => time - s.at < 500);

      // The heron.
      if (heron.state === 'fly') {
        const k = clamp((time - heron.at) / FLY_MS, 0, 1);
        heron.x = heron.fromX + (heron.toX - heron.fromX) * k; heron.y = heron.fromY + (heron.toY - heron.fromY) * k;
        heron.face = Math.atan2(heron.toY - heron.fromY, heron.toX - heron.fromX);
        if (k >= 1) {
          const f = fighter(heron.flyAimSide ?? 'player');
          startAim(f.x, f.y, time);
        }
      } else if (heron.state === 'aim') {
        if (time - heron.at >= AIM_MS) stab(time);
      } else if (time >= heron.rest) {
        let goal: { x: number; y: number } | null = null, gd = Infinity;
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighter(s);
          if (hexed(s) && alive(f)) { const d = dist(f.x, f.y, heron.x, heron.y); if (d < gd) { gd = d; goal = f; } }
        }
        if (!goal) for (const t of toads) { const d = dist(t.x, t.y, heron.x, heron.y); if (d < gd) { gd = d; goal = t; } }
        if (goal) {
          if (gd < HERON_REACH) startAim(goal.x, goal.y, time);
          else {
            heron.face = Math.atan2(goal.y - heron.y, goal.x - heron.x);
            heron.x += Math.cos(heron.face) * HERON_SPEED * step; heron.y += Math.sin(heron.face) * HERON_SPEED * step;
          }
        }
      }
      heron.target?.moveTo(heron.x, heron.y - 30);
    },

    playerSpeedMult: () => (hexed('player') ? HEX_SLOW : 1),
    npcSpeedMult: () => (hexed('npc') ? HEX_SLOW : 1),

    npcSeek() {
      for (const toad of toads) {
        if (toad.swellAt < 0) continue;
        const d = dist(toad.x, toad.y, npc.x, npc.y);
        if (d < CROAK_R + 30) {
          const a = d > 1 ? Math.atan2(npc.y - toad.y, npc.x - toad.x) : 2;
          return { x: tk.clampX(toad.x + Math.cos(a) * (CROAK_R + 70)), y: tk.clampY(toad.y + Math.sin(a) * (CROAK_R + 70)) };
        }
      }
      const threatened = (heron.state === 'aim' && dist(heron.aimX, heron.aimY, npc.x, npc.y) < STAB_R + 50) || (hexed('npc') && dist(heron.x, heron.y, npc.x, npc.y) < 170);
      if (threatened) {
        const a = Math.atan2(npc.y - heron.y, npc.x - heron.x);
        return { x: tk.clampX(npc.x + Math.cos(a) * 140), y: tk.clampY(npc.y + Math.sin(a) * 140) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const t of toads) {
        if (t.swellAt < 0) continue;
        const k = clamp((time - t.swellAt) / SWELL_MS, 0, 1);
        g.fillStyle(HEX, 0.06 + k * 0.1); g.fillCircle(t.x, t.y, CROAK_R);
        dashedRing(g, t.x, t.y, CROAK_R, HEX_LIT, 0.5 + k * 0.4, 2, 26, 1, time / 700);
        progressArc(g, t.x, t.y, CROAK_R + 5, k, HEX, 0.9, 3);
      }
      for (const c of croaks) {
        const k = (time - c.at) / 600;
        for (let i = 0; i < 3; i++) { const r = CROAK_R * (0.4 + k * 0.7 + i * 0.15); g.lineStyle(3 * (1 - k), HEX_LIT, 0.7 * (1 - k)); g.strokeCircle(c.x, c.y, r); }
      }
      // The heron's mark, where its beak will go.
      if (heron.state === 'aim') {
        const k = clamp((time - heron.at) / AIM_MS, 0, 1);
        g.fillStyle(0xff6a48, 0.1 + k * 0.15); g.fillCircle(heron.aimX, heron.aimY, STAB_R);
        g.lineStyle(2, 0xffd0a0, 0.6 + k * 0.4); g.strokeCircle(heron.aimX, heron.aimY, STAB_R);
        g.lineStyle(1.2, 0xffd0a0, 0.7); g.lineBetween(heron.aimX - 10, heron.aimY, heron.aimX + 10, heron.aimY); g.lineBetween(heron.aimX, heron.aimY - 10, heron.aimX, heron.aimY + 10);
      }
      if (heron.state === 'fly') {
        dashedRing(g, heron.toX, heron.toY, 30, CHALK, 0.6, 1.5, 20);
        const k = clamp((time - heron.at) / FLY_MS, 0, 1);
        shadow(g, heron.x, heron.y + 10, 40 + Math.sin(k * Math.PI) * 20, 10, 0.18);
      }
      for (const s of stabs) {
        const k = (time - s.at) / 500;
        g.lineStyle(2, 0x2a2a20, 0.7 * (1 - k));
        for (let i = 0; i < 5; i++) { const a = i * 1.26; g.lineBetween(s.x, s.y, s.x + Math.cos(a) * (8 + k * 14), s.y + Math.sin(a) * (5 + k * 9)); }
      }
      for (const t of toads) {
        const k = clamp((time - t.moveAt) / t.moveMs, 0, 1);
        const hop = Math.sin(k * Math.PI) * (t.moveMs > HOP_MS ? 26 : 12);
        const gulp = t.swellAt >= 0 ? clamp((time - t.swellAt) / SWELL_MS, 0, 1) : 0;
        if (hop > 0.5) shadow(g, t.x, t.y + 1, 18, 5, 0.2);
        drawToad(g, t.x, t.y - hop, 1.25, SKIN, gulp);
        if (gulp > 0) { g.fillStyle(lit(SKIN, 0.55), 0.85); g.fillCircle(t.x, t.y - hop - 2, 3 + gulp * 7); g.lineStyle(1, dim(SKIN, 0.3), 0.8); g.strokeCircle(t.x, t.y - hop - 2, 3 + gulp * 7); }
      }
    },

    drawAir(g, time) {
      // The hexed wear a toad's glamour: a warty green dome, two bulging gold eyes on top.
      for (const s of ['player', 'npc'] as Side[]) {
        if (!hexed(s)) continue;
        const f = fighter(s);
        const fade = clamp((hexUntil[s] - time) / 400, 0, 1);
        const breathe = 1 + Math.sin(time / 180) * 0.05;
        g.fillStyle(HEX, 0.22 * fade); g.fillEllipse(f.x, f.y - 12, 54 * breathe, 46 * breathe);
        g.lineStyle(2, dim(HEX, 0.3), 0.6 * fade); g.strokeEllipse(f.x, f.y - 12, 54 * breathe, 46 * breathe);
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; g.fillStyle(dim(HEX, 0.35), 0.5 * fade); g.fillCircle(f.x + Math.cos(a) * 18, f.y - 12 + Math.sin(a) * 14, 1.8 + (i % 3) * 0.6); }
        for (const k of [-1, 1]) {
          g.fillStyle(HEX, 0.9 * fade); g.fillCircle(f.x + k * 11, f.y - 36, 7);
          g.fillStyle(0xf0c838, fade); g.fillCircle(f.x + k * 11, f.y - 37, 5);
          g.fillStyle(0x101008, fade); g.fillRect(f.x + k * 11 - 3, f.y - 38, 6, 2);
        }
        g.lineStyle(1.6, dim(HEX, 0.45), 0.8 * fade); g.beginPath(); g.arc(f.x, f.y - 22, 14, 0.25, Math.PI - 0.25, false); g.strokePath();
      }
      drawHeron(g, time);
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 4;
      slatePlate(g, cx, y, 200, 30);
      const yy = y + 19;
      for (const [s, hx] of [['player', cx - 60], ['npc', cx - 16]] as [Side, number][]) {
        const on = hexed(s);
        drawToad(g, hx, yy + 4, 0.75, on ? HEX : dim(SKIN, 0.35), on ? 0.6 + Math.sin(time / 150) * 0.4 : 0);
        g.lineStyle(1.4, sideColor(s), 1); g.strokeCircle(hx, yy - 3, 12);
        if (on) progressArc(g, hx, yy - 3, 12, (hexUntil[s] - time) / HEX_MS, HEX_LIT, 1, 2);
      }
      // The heron's head, beak toward whoever it is after.
      const hx = cx + 52, hy = y + 15;
      let goal: Side | null = null;
      if (heron.state === 'fly') goal = heron.flyAimSide;
      else if (hexed('player') || hexed('npc')) goal = hexed('player') && (!hexed('npc') || dist(player.x, player.y, heron.x, heron.y) < dist(npc.x, npc.y, heron.x, heron.y)) ? 'player' : 'npc';
      const dir = goal === 'player' ? -1 : 1;
      g.fillStyle(HERON, 1); g.fillCircle(hx, hy, 6);
      g.fillStyle(0x1a1a1a, 1); g.fillTriangle(hx - 2 * dir, hy - 5, hx - 10 * dir, hy - 8, hx - 4 * dir, hy - 3);
      g.fillStyle(0xe8c030, 1); g.fillTriangle(hx + 4 * dir, hy - 2, hx + 4 * dir, hy + 2, hx + 18 * dir, hy);
      g.fillStyle(0x101010, 1); g.fillCircle(hx + 2 * dir, hy - 1.5, 1.2);
      if (goal) { g.lineStyle(1.5, sideColor(goal), 1); g.strokeCircle(hx + 26 * dir, hy, 4); }
    },

    destroy() { for (const t of toads) t.target?.remove(); heron.target?.remove(); toads = []; },
  };

  /** The heron: stilt legs, a grey body under folded wings, an S-neck, a black crest and a dagger bill. */
  function drawHeron(g: G, time: number): void {
    const x = heron.x, y = heron.y;
    const d = Math.cos(heron.face) >= 0 ? 1 : -1;
    const flying = heron.state === 'fly';
    const lift = flying ? Math.sin(clamp((time - heron.at) / FLY_MS, 0, 1) * Math.PI) * 50 : 0;
    const by = y - 34 - lift;
    if (!flying) {
      shadow(g, x, y + 1, 30, 8, 0.25);
      const stride = heron.state === 'stalk' ? Math.sin(time / 160) * 6 : 0;
      for (const k of [-1, 1]) {
        const fx = x + k * 4 + stride * k, kx = x + k * 2 - d * 3;
        g.lineStyle(2, 0x5a5040, 1); g.lineBetween(x + k * 3, by + 8, kx, y - 14); g.lineBetween(kx, y - 14, fx, y);
        g.lineBetween(fx, y, fx + d * 6, y + 1); g.lineBetween(fx, y, fx - d * 4, y + 1);
      }
    } else {
      g.lineStyle(2, 0x5a5040, 1); g.lineBetween(x - d * 8, by + 4, x - d * 26, by + 8);
    }
    // Wings: folded, or spread in flight.
    if (flying) {
      const flap = Math.sin(time / 70) * 12;
      for (const k of [-1, 1]) {
        g.fillStyle(HERON_DARK, 1); g.fillTriangle(x, by - 2, x + k * 46, by - 14 - flap * k * 0.3 - flap, x + k * 40, by + 6);
        g.fillStyle(HERON, 1); g.fillTriangle(x, by - 2, x + k * 30, by - 10 - flap * 0.6, x + k * 26, by + 4);
      }
    }
    g.fillStyle(dim(HERON, 0.15), 1); g.fillEllipse(x, by, 34, 18);
    g.fillStyle(HERON, 1); g.fillEllipse(x - d * 2, by - 2, 32, 15);
    if (!flying) { g.fillStyle(HERON_DARK, 1); g.fillEllipse(x - d * 6, by - 1, 22, 10); g.fillTriangle(x - d * 10, by, x - d * 22, by + 6, x - d * 14, by - 4); }
    // The neck: coiled back while it aims, struck out at the stab, an easy S otherwise.
    const aimK = heron.state === 'aim' ? clamp((time - heron.at) / AIM_MS, 0, 1) : 0;
    const nb = { x: x + d * 12, y: by - 4 };
    const n1 = { x: nb.x + d * (6 - aimK * 10), y: nb.y - 12 };
    const n2 = { x: n1.x - d * (4 + aimK * 6), y: n1.y - 10 + aimK * 4 };
    const head = { x: n2.x + d * (8 - aimK * 6), y: n2.y - 6 };
    g.lineStyle(6, HERON, 1); g.lineBetween(nb.x, nb.y, n1.x, n1.y); g.lineBetween(n1.x, n1.y, n2.x, n2.y); g.lineBetween(n2.x, n2.y, head.x, head.y);
    g.lineStyle(1.2, 0x2a2a2a, 0.7); g.lineBetween(n1.x + d * 1, n1.y, n2.x + d * 1, n2.y);
    g.fillStyle(lit(HERON, 0.3), 1); g.fillCircle(head.x, head.y, 5);
    g.fillStyle(0x161616, 1); g.fillTriangle(head.x - d * 2, head.y - 3, head.x - d * 14, head.y - 7, head.x - d * 4, head.y);
    g.fillStyle(0x101010, 1); g.fillCircle(head.x + d * 1.5, head.y - 1, 1.3);
    // The bill points along its heading, or straight at the mark while it aims.
    const ba = heron.state === 'aim' ? Math.atan2(heron.aimY - head.y, heron.aimX - head.x) : d > 0 ? 0.15 : Math.PI - 0.15;
    const bl = 16 + aimK * 4;
    g.fillStyle(0xe8c030, 1);
    g.fillTriangle(head.x + Math.cos(ba + 1.4) * 2.5, head.y + Math.sin(ba + 1.4) * 2.5, head.x + Math.cos(ba - 1.4) * 2.5, head.y + Math.sin(ba - 1.4) * 2.5, head.x + Math.cos(ba) * bl, head.y + Math.sin(ba) * bl);
    if (aimK > 0.6) glow(g, head.x + Math.cos(ba) * bl, head.y + Math.sin(ba) * bl, 6, 0xfff0a0, 0.15, 2);
  }
}

export const FALLEN_TOAD: GimmickDef = {
  id: fallenId('arcane', SLUG),
  rules: 'A swelling toad croaks a hex: slow, locked, and the heron hunts you. Strike a toad to kick it away from you; strike the heron to send it at your foe.',
  make,
};
