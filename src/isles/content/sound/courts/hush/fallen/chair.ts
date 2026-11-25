import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { ribbon, ribbonRow, stitchedMouth } from '../art';
import { fallenId } from '../../../../meteor/spec';
import {
  FELT_DARK, FELT_PLUM, FELT_PLUM_DARK, IRON, LAMP, LAMP_GLOW, PLASTER, PLASTER_DARK, SILK, SILK_SHADE, SNOW, SNOW_LIT,
  TIMBER, TIMBER_DARK, WARDEN, WARDEN_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Carried In — Osyth Quilliam, Chair-Warden.
 *
 * Nobody is marched to the Quiet House. Marching is loud. They are *carried*, in the padded chair —
 * a sedan box quilted inside and out, white silk at the window, two bearers in felt boots at the
 * poles — and they go in by the padded door and come out with a ribbon at the throat. Quilliam
 * keeps the chair. In the star's telling she has never once sent it out empty.
 *
 * The chair leaves the padded door at the top of the yard and **walks for you** (a white ribbon
 * streams from its window toward its quarry). It is slow, but it **takes whoever it reaches first**
 * — so put Quilliam between you and it. Taken, you are held inside and carried back to the door;
 * inside, the padding softens every blow. **Strike the chair three times to rock it off the
 * bearers' shoulders** and spill out. Reach the door inside it and you are **shut in** — a heavy
 * blow and a long stun on the step. A dash slips past the bearers' hands. Past half, they quicken.
 */

const SLUG = 'carried-in';
const SEEK = 92;
const CARRY = 104;
const RETURN = 150;
const REACH = 40;
const ROCKS = 3;
const SHUT_DMG = 26;
const SHUT_STUN = 1400;
const WAIT_MS = 2600;
const DROP_MS = 1800;
const PADDED = 0.6;

type State = 'waiting' | 'seeking' | 'carrying' | 'dropped' | 'returning';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const DOOR: Pt = { x: W / 2, y: top + 44 };
  let x = DOOR.x, y = DOOR.y;
  let ang = Math.PI / 2;
  let state: State = 'waiting';
  let until = 0;
  let cargo: Fighter | null = null;
  let rocks = 0;
  let rockAt = -9999;
  let rootAt = 0;
  let walk = 0;
  let quick = 1;
  let half = false;
  let started = false;
  let target: StrikeTarget | null = null;
  let shutAt = -9999;

  const gp = (a: Pt[]): Phaser.Geom.Point[] => a.map((p) => new Phaser.Geom.Point(p.x, p.y));

  function moveTo(px: number, py: number, speed: number, dt: number): boolean {
    const d = dist(x, y, px, py);
    if (d < 4) return true;
    const s = Math.min(d, speed * quick * dt);
    ang = Math.atan2(py - y, px - x);
    x += ((px - x) / d) * s; y += ((py - y) / d) * s;
    walk += s;
    return d - s < 4;
  }

  function take(f: Fighter, time: number): void {
    cargo = f;
    state = 'carrying';
    rocks = 0;
    rootAt = 0;
    ctx.root(f, 500);
    ctx.float(f.x, f.y - 56, 'TAKEN', '#f0e8ff');
    ctx.banner(f === player ? 'THE CHAIR HAS YOU — STRIKE IT TO GET OUT' : 'THE CHAIR HAS TAKEN QUILLIAM', '#f0e8ff');
    ctx.sfx('trap-snap');
    rootAt = time;
  }

  function spill(time: number): void {
    if (cargo) {
      const a = ang + Math.PI / 2;
      ctx.nudge(cargo, Math.cos(a) * 46, Math.sin(a) * 46);
      ctx.float(cargo.x, cargo.y - 52, 'SPILLED', '#f0e8ff');
    }
    cargo = null;
    state = 'dropped';
    until = time + DROP_MS;
    ctx.sfx('stone-slam');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        until = time + 2400;
        target = ctx.target({
          x, y, r: 34,
          onStruck: () => {
            const now = ctx.scene.time.now;
            if (state !== 'carrying' || now - rockAt < 220) return;
            rockAt = now;
            rocks++;
            ctx.sfx('hit-medium');
            if (rocks >= ROCKS) spill(now);
          },
        });
      }
      if (!half && npc.hp < npc.maxHp * 0.5) { half = true; quick = 1.25; ctx.banner('THE BEARERS QUICKEN', '#f0e8ff'); }
      if (cargo && !alive(cargo)) { cargo = null; state = 'returning'; }
      switch (state) {
        case 'waiting':
          if (time >= until && alive(player)) { state = 'seeking'; ctx.sfx('wings'); }
          break;
        case 'seeking': {
          moveTo(player.x, player.y, SEEK, dt);
          // Whoever the bearers reach first goes in.
          const near = [player, npc]
            .filter((f) => alive(f) && !ctx.isAirborne(f) && !ctx.dashing(f) && dist(f.x, f.y, x, y) < REACH)
            .sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y))[0];
          if (near) take(near, time);
          break;
        }
        case 'carrying': {
          const c = cargo!;
          const done = moveTo(DOOR.x, DOOR.y, CARRY, dt);
          ctx.nudge(c, x - c.x, y - c.y);
          if (time - rootAt > 380) { rootAt = time; ctx.root(c, 500); }
          if (done) {
            ctx.nudge(c, 0, 70);
            ctx.hit(c, SHUT_DMG, c.x, c.y);
            ctx.stun(c, SHUT_STUN);
            ctx.float(c.x, c.y - 56, 'SHUT IN', '#ffb0a0');
            ctx.sfx('gravity-slam');
            shutAt = time;
            cargo = null;
            state = 'waiting';
            until = time + WAIT_MS;
          }
          break;
        }
        case 'dropped':
          if (time >= until) state = 'returning';
          break;
        case 'returning':
          if (moveTo(DOOR.x, DOOR.y, RETURN, dt)) { state = 'waiting'; until = time + WAIT_MS; }
          break;
      }
      target?.moveTo(x, y);
    },

    playerTakenMult: () => (cargo === player ? PADDED : 1),
    npcTakenMult: () => (cargo === npc ? PADDED : 1),

    npcSeek() {
      if (!alive(npc) || cargo === npc) return null;
      if (state !== 'seeking' && state !== 'waiting') return null;
      // Keep the stranger between herself and the chair.
      const d = Math.max(1, dist(x, y, player.x, player.y));
      if (d > 520) return null;
      return { x: clamp(player.x + ((player.x - x) / d) * 170, 60, W - 60), y: clamp(player.y + ((player.y - y) / d) * 170, top + 60, H - 40) };
    },

    drawGround(g, time) {
      // The Quiet House's padded door at the top of the yard, the ribbon railing either side.
      const dx = DOOR.x, dy = DOOR.y - 8;
      g.fillStyle(PLASTER_DARK, 1); g.fillRect(dx - 70, dy - 40, 140, 44);
      g.fillStyle(PLASTER, 1); g.fillRect(dx - 66, dy - 40, 132, 40);
      g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 34, dy - 38, 68, 42);
      const open = state === 'carrying' && dist(x, y, DOOR.x, DOOR.y) < 120 ? 1 : time - shutAt < 600 ? 1 - (time - shutAt) / 600 : 0;
      g.fillStyle(0x14121a, 1); g.fillRect(dx - 30, dy - 36, 60, 40);
      g.fillStyle(FELT_PLUM, 1); g.fillRect(dx - 30, dy - 36, 60 * (1 - open * 0.8), 40);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const bx = dx - 22 + c * 20, by2 = dy - 28 + r * 13;
        if (bx > dx - 30 + 60 * (1 - open * 0.8)) continue;
        g.fillStyle(FELT_PLUM_DARK, 1); g.fillCircle(bx, by2, 2);
      }
      stitchedMouth(g, dx, dy - 50, 9, FELT_PLUM_DARK, 1);
      g.lineStyle(3, IRON, 1); g.lineBetween(dx - 200, dy - 6, dx - 72, dy - 6); g.lineBetween(dx + 72, dy - 6, dx + 200, dy - 6);
      ribbonRow(g, dx - 196, dx - 74, dy - 6, time / 1000, 3);
      ribbonRow(g, dx + 76, dx + 198, dy - 6, time / 1000, 9);
      g.fillStyle(SNOW_LIT, 1); g.fillEllipse(dx, dy - 41, 150, 6);
      // The step: snow trodden flat by the bearers.
      g.fillStyle(SNOW, 0.6); g.fillEllipse(dx, dy + 22, 120, 22);
      shadow(g, x, y + 22, 96, 22, 0.3);
    },

    drawAir(g, time) {
      const rocked = time - rockAt < 260 ? Math.sin(((time - rockAt) / 260) * Math.PI) * 0.18 * (rockAt % 2 ? 1 : -1) : 0;
      const down = state === 'dropped' || state === 'waiting';
      const tiltDrop = state === 'dropped' ? 0.22 : 0;
      const tilt = rocked + tiltDrop;
      const lift = down ? 0 : 6 + Math.sin(walk / 14) * 2;
      // The warrant: a white silk ribbon from the window toward its quarry.
      if (state === 'seeking' && alive(player)) {
        const a = Math.atan2(player.y - y, player.x - x);
        const len = Math.min(110, dist(x, y, player.x, player.y) - 20);
        for (let i = 0; i < 8; i++) {
          const k = i / 8, k2 = (i + 1) / 8;
          const w1 = Math.sin(time / 160 + i) * 5 * k, w2 = Math.sin(time / 160 + i + 1) * 5 * k2;
          g.lineStyle(3 - k * 1.5, SILK, 0.85);
          g.lineBetween(x + Math.cos(a) * len * k - Math.sin(a) * w1, y - 30 + Math.sin(a) * len * k + Math.cos(a) * w1,
            x + Math.cos(a) * len * k2 - Math.sin(a) * w2, y - 30 + Math.sin(a) * len * k2 + Math.cos(a) * w2);
        }
      }
      // Poles and bearers, front and back along the way it walks.
      const ca = Math.cos(ang), sa = Math.sin(ang);
      for (const s of [-1, 1]) {
        const bx = x + ca * 62 * s, by = y + sa * 30 * s + 6;
        const step = down ? 0 : Math.sin(walk / 10 + (s > 0 ? 0 : Math.PI)) * 4;
        const sit = state === 'dropped' ? 10 : 0;
        shadow(g, bx, by + 4, 26, 7);
        g.fillStyle(dim(WARDEN, 0.25), 1); g.fillRect(bx - 7, by - 12 + sit, 5, 12 - sit + step); g.fillRect(bx + 2, by - 12 + sit, 5, 12 - sit - step);
        g.fillStyle(FELT_DARK, 1); g.fillRect(bx - 8, by - 2 + step, 7, 4); g.fillRect(bx + 1, by - 2 - step, 7, 4);
        g.fillStyle(WARDEN, 1); g.fillRoundedRect(bx - 11, by - 40 + sit, 22, 30, 6);
        g.fillStyle(WARDEN_LIT, 1); g.fillRect(bx - 1, by - 38 + sit, 2, 24);
        g.fillStyle(0xe0c8b0, 1); g.fillCircle(bx, by - 47 + sit, 7);
        g.fillStyle(WARDEN, 1); g.fillEllipse(bx, by - 52 + sit, 18, 9);
        g.fillStyle(SILK, 1); g.fillRect(bx - 6, by - 41 + sit, 12, 3);
      }
      g.lineStyle(5, TIMBER_DARK, 1);
      for (const o of [-14, 14]) g.lineBetween(x - ca * 70 - sa * o * 0.4, y - 26 + lift - sa * 34 + ca * o * 0.3, x + ca * 70 - sa * o * 0.4, y - 26 + lift + sa * 34 + ca * o * 0.3);
      // The chair: a quilted box under a snow-capped dome, silk at the window, a lamp on the corner.
      const cx = x, cy = y - lift;
      const P = (px: number, py: number) => ({ x: cx + px * Math.cos(tilt) - py * Math.sin(tilt), y: cy + px * Math.sin(tilt) + py * Math.cos(tilt) });
      const box = [P(-26, -8), P(26, -8), P(26, -62), P(-26, -62)];
      g.fillStyle(FELT_PLUM_DARK, 1); g.fillPoints(gp(box.map((p) => ({ x: p.x + 2, y: p.y + 3 }))), true);
      g.fillStyle(FELT_PLUM, 1); g.fillPoints(gp(box), true);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const p = P(-17 + c * 17, -16 - r * 13);
        g.fillStyle(FELT_PLUM_DARK, 1); g.fillCircle(p.x, p.y, 1.8);
        g.fillStyle(lit(FELT_PLUM, 0.18), 0.5); g.fillCircle(p.x - 4, p.y - 4, 3);
      }
      const win = [P(-14, -34), P(14, -34), P(14, -54), P(-14, -54)];
      g.fillStyle(cargo ? 0x2a2230 : 0x1a1820, 1); g.fillPoints(gp(win), true);
      for (const k of [-1, 1]) {
        const a = P(k * 14, -54), b = P(k * 5, -34);
        g.fillStyle(SILK, 1); g.fillTriangle(a.x, a.y, P(k * 14, -34).x, P(k * 14, -34).y, b.x, b.y);
        g.fillStyle(SILK_SHADE, 1); g.fillTriangle(a.x, a.y, P(k * 9, -46).x, P(k * 9, -46).y, b.x, b.y);
      }
      if (cargo) { const e = P(0, -44); g.fillStyle(LAMP, 0.9); g.fillCircle(e.x - 4, e.y, 1.6); g.fillCircle(e.x + 4, e.y, 1.6); }
      const roof = P(0, -62);
      g.fillStyle(FELT_PLUM_DARK, 1); g.fillEllipse(roof.x, roof.y, 62, 18);
      g.fillStyle(SNOW, 1); g.fillEllipse(roof.x, roof.y - 6, 54, 16);
      g.fillStyle(SNOW_LIT, 1); g.fillEllipse(roof.x - 8, roof.y - 9, 24, 6);
      const knob = P(0, -76);
      g.fillStyle(TIMBER, 1); g.fillCircle(knob.x, knob.y, 4);
      const lampP = P(30, -52);
      g.lineStyle(1.5, IRON, 1); g.lineBetween(P(26, -60).x, P(26, -60).y, lampP.x, lampP.y - 6);
      g.fillStyle(IRON, 1); g.fillRect(lampP.x - 4, lampP.y - 6, 8, 11);
      g.fillStyle(LAMP, 1); g.fillRect(lampP.x - 2.5, lampP.y - 4, 5, 7);
      glow(g, lampP.x, lampP.y, 22, LAMP_GLOW, 0.05, 3);
      ribbon(g, P(-26, -60).x, P(-26, -60).y, 18, time / 1000, 4, SILK, 0.9, -1);
      // While someone is inside: three knocks drawn on the side — how close it is to being rocked off.
      if (state === 'carrying') {
        for (let i = 0; i < ROCKS; i++) {
          const p = P(-14 + i * 14, -86);
          g.fillStyle(i < rocks ? LAMP : 0x222222, 1); g.fillCircle(p.x, p.y, 4.5);
          g.lineStyle(1.5, SILK, 0.8); g.strokeCircle(p.x, p.y, 4.5);
        }
      }
    },

    drawHud(g, time) {
      // The chair's errand: how near it is to the door with someone in it.
      const x0 = W - 170, yy = top + 16;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 8, yy - 10, 156, 20, 8);
      const span = Math.max(1, H - DOOR.y);
      const k = clamp(1 - (y - DOOR.y) / span, 0, 1);
      g.fillStyle(state === 'carrying' ? (cargo === player ? 0xff8a7a : 0xd8b0ff) : FELT_PLUM, 1); g.fillRoundedRect(x0, yy - 4, 140 * k, 8, 4);
      g.fillStyle(SILK, 0.6 + Math.sin(time / 200) * 0.2); g.fillRect(x0 + 138, yy - 7, 3, 14);
    },

    destroy() { target?.remove(); },
  };
}

export const FALLEN_CARRIED_IN: GimmickDef = {
  id: fallenId('hush', SLUG),
  rules: 'The padded chair walks for you and takes whoever it reaches first, back to the door. Strike it thrice to spill out. A dash slips past it.',
  make,
};
