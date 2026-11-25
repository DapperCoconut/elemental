import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { blob, glow, mulberry, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { trefoil } from '../art';
import {
  AMBER, AMBER_LIT, CHEREN, CHEREN_LIT, COPPER, GLOW, GLOW_LIT, HAZARD_BLACK, IRON, IRON_DARK, IRON_LIT, LEAD, LEAD_DARK,
  LEAD_LIT, PITCH, PITCH_LIT, PITCH_SHEEN, SLAG, SLAG_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Daughter Line — Chain-Reader Bartholomew Daughtry, fate.
 *
 * At the assay table Daughtry reads a lump of ore down its decay chain: uranium to thorium,
 * protactinium, radium, radon, and at last lead — each daughter born with a different kick. In the
 * star's telling he read households the same way: every daughter pays her mother's debt.
 *
 * The rule: a lump sits in its cradle and steps down the chain on a clock (the chain on the HUD
 * shows where it is and what comes next). Each step fires its own emission, telegraphed the whole
 * wait: α — a short heavy ring round the lump; β — a fan of sparks at whoever stands *farther*
 * from it; γ — three long rays, one laid on the farther fighter; radon — a cloud that drifts out
 * toward the farther fighter. Then it is lead: dead and safe — strike it for a lead apron (blows
 * soften) before fresh ore is tipped in. Strike the lump any other time to hurry the next daughter
 * — catch him in the ring, or close in so the farther one is him. Past half, the chain branches.
 */

const SLUG = 'daughters';
const STEP_MS = 4000;
const LEAD_MS = 4600;
/** The aim of β and γ locks this long before the step lands. */
const LOCK_MS = 900;
const HURRY_MS = 700;
const ALPHA_R = 135;
const ALPHA_DMG = 18;
const BETA_DMG = 8;
const GAMMA_DMG = 15;
const GAMMA_HALF = 18;
const GAS_R = 78;
const GAS_DMG = 4;
const GAS_LIFE = 6500;
const APRON_MS = 6500;

/** The chain: 0 uranium … 5 lead. Arriving at step i fires EMIT[i]. */
type Emit = 'none' | 'alpha' | 'beta' | 'gamma' | 'gas';
const EMIT: Emit[] = ['none', 'alpha', 'beta', 'gamma', 'gas', 'none'];
/** Each isotope's glow in the cradle. */
const TINT = [GLOW, 0x9aff6a, CHEREN, 0xe8ffd0, 0xb48aff, LEAD_LIT];

interface Lump {
  x: number; y: number; step: number; nextAt: number; aim: number; aimLocked: boolean; target: StrikeTarget | null;
  struckAt: number;
}
interface Cloud { x: number; y: number; vx: number; vy: number; born: number; ticks: Map<Fighter, number>; }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const lumps: Lump[] = [];
  const clouds: Cloud[] = [];
  const firedFx: { x: number; y: number; kind: Emit; at: number; aim: number }[] = [];
  const apron = new Map<Fighter, number>([[player, -99999], [npc, -99999]]);
  let branched = false;
  let started = false;

  const farther = (l: Lump): Fighter => (dist(player.x, player.y, l.x, l.y) >= dist(npc.x, npc.y, l.x, l.y) ? player : npc);
  const waitFor = (step: number) => (step === 5 ? LEAD_MS : STEP_MS);

  const strike = (l: Lump, by: 'player' | 'npc') => {
    const now = ctx.scene.time.now;
    l.struckAt = now;
    if (l.step === 5) {
      // Dead lead: the striker breaks off an apron's worth, and the cradle is tipped fresh.
      apron.set(by === 'player' ? player : npc, now + APRON_MS);
      l.step = 0; l.nextAt = now + STEP_MS; l.aimLocked = false;
      tk.sfx('anvil');
      return;
    }
    if (l.nextAt - now > HURRY_MS) { l.nextAt = now + HURRY_MS; tk.sfx('dice'); }
  };
  const addLump = (x: number, y: number, step: number, at: number) => {
    const l: Lump = { x, y, step, nextAt: at, aim: 0, aimLocked: false, target: null, struckAt: -99999 };
    l.target = ctx.target({ x, y: y - 14, r: 30, onStruck: (by) => strike(l, by) });
    lumps.push(l);
  };

  const fire = (l: Lump, time: number) => {
    const kind = EMIT[l.step];
    firedFx.push({ x: l.x, y: l.y, kind, at: time, aim: l.aim });
    if (kind === 'alpha') {
      tk.sfx('explosion-medium');
      for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && dist(f.x, f.y, l.x, l.y) < ALPHA_R + 14) tk.hitFighter(f, ALPHA_DMG, f.x, f.y);
    } else if (kind === 'beta') {
      tk.sfx('zap');
      for (let i = -3; i <= 3; i++) {
        tk.spawnBullet({ x: l.x, y: l.y - 14, angle: l.aim + i * 0.15, speed: 330, damage: BETA_DMG, r: 6, color: CHEREN_LIT, hits: [player, npc], lifeMs: 2600 });
      }
    } else if (kind === 'gamma') {
      tk.sfx('beam-fire');
      for (const off of [0, (Math.PI * 2) / 3, (-Math.PI * 2) / 3]) {
        const a = l.aim + off;
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f)) continue;
          const dx = f.x - l.x, dy = f.y - l.y;
          const along = dx * Math.cos(a) + dy * Math.sin(a);
          const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
          if (along > 0 && across < GAMMA_HALF + 12) tk.hitFighter(f, GAMMA_DMG, f.x, f.y);
        }
      }
    } else if (kind === 'gas') {
      tk.sfx('smoke');
      clouds.push({ x: l.x, y: l.y, vx: Math.cos(l.aim) * 58, vy: Math.sin(l.aim) * 58, born: time, ticks: new Map() });
    }
  };

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; addLump(W / 2, (top + H) / 2 + 20, 0, time + 2500); }
      if (!branched && npc.hp <= npc.maxHp * 0.5) {
        branched = true;
        addLump(W - 170, H - 110, 3, time + 2600);
        ctx.banner('THE CHAIN BRANCHES', '#d8ffb0');
        tk.sfx('crystal-chime');
      }
      for (const l of lumps) {
        // Aim tracks the farther fighter until it locks.
        if (!l.aimLocked) {
          const f = farther(l);
          l.aim = Math.atan2(f.y - l.y, f.x - l.x);
          if (time >= l.nextAt - LOCK_MS) l.aimLocked = true;
        }
        if (time >= l.nextAt) {
          l.step = (l.step + 1) % 6;
          fire(l, time);
          l.nextAt = time + waitFor(l.step);
          l.aimLocked = false;
        }
      }
      for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < 40 || c.x > W - 40) c.vx = -c.vx;
        if (c.y < top + 30 || c.y > H - 30) c.vy = -c.vy;
        if (time - c.born > GAS_LIFE) { clouds.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, c.x, c.y) > GAS_R || time < (c.ticks.get(f) ?? 0)) continue;
          c.ticks.set(f, time + 500);
          tk.hitFighter(f, GAS_DMG, f.x, f.y);
        }
      }
      while (firedFx.length && time - firedFx[0].at > 700) firedFx.shift();
    },

    playerTakenMult: () => (ctx.scene.time.now < (apron.get(player) ?? 0) ? 0.65 : 1),
    npcTakenMult: () => (ctx.scene.time.now < (apron.get(npc) ?? 0) ? 0.65 : 1),

    npcSeek() {
      const now = ctx.scene.time.now;
      for (const c of clouds) if (dist(npc.x, npc.y, c.x, c.y) < GAS_R + 50) {
        const a = Math.atan2(npc.y - c.y, npc.x - c.x) + Math.PI / 3;
        return { x: clamp(c.x + Math.cos(a) * 190, 60, W - 60), y: clamp(c.y + Math.sin(a) * 190, top + 50, H - 50) };
      }
      let near: Lump | null = null;
      for (const l of lumps) if (!near || l.nextAt < near.nextAt) near = l;
      if (!near) return null;
      const l = near;
      if (l.step === 5) return { x: l.x + (npc.x < l.x ? -40 : 40), y: l.y + 10 };
      const next = EMIT[(l.step + 1) % 6];
      const soon = l.nextAt - now < 1800;
      const d = dist(npc.x, npc.y, l.x, l.y);
      if (next === 'alpha' && soon && d < ALPHA_R + 50) {
        const a = Math.atan2(npc.y - l.y, npc.x - l.x);
        return { x: clamp(l.x + Math.cos(a) * (ALPHA_R + 80), 60, W - 60), y: clamp(l.y + Math.sin(a) * (ALPHA_R + 80), top + 50, H - 50) };
      }
      if ((next === 'beta' || next === 'gamma' || next === 'gas') && soon) {
        // Be the nearer one, off the line to the player.
        const a = Math.atan2(player.y - l.y, player.x - l.x) + (Math.sin(l.x + l.step) > 0 ? Math.PI / 2 : -Math.PI / 2);
        return { x: clamp(l.x + Math.cos(a) * 100, 60, W - 60), y: clamp(l.y + Math.sin(a) * 100, top + 50, H - 50) };
      }
      return null;
    },

    destroy() { for (const l of lumps) l.target?.remove(); },

    drawGround(g, time) {
      for (const c of clouds) drawCloud(g, c, time);
      for (const l of lumps) {
        const next = EMIT[(l.step + 1) % 6];
        const k = clamp(1 - (l.nextAt - time) / waitFor(l.step), 0, 1);
        const hot = l.nextAt - time < LOCK_MS;
        if (next === 'alpha') {
          g.fillStyle(SLAG, 0.04 + k * 0.1); g.fillCircle(l.x, l.y, ALPHA_R);
          g.lineStyle(hot ? 4 : 2, hot ? SLAG_LIT : SLAG, 0.4 + k * 0.5); g.strokeCircle(l.x, l.y, ALPHA_R);
          g.lineStyle(2, AMBER_LIT, 0.6); g.strokeCircle(l.x, l.y, 20 + (ALPHA_R - 20) * k);
        } else if (next === 'beta') {
          for (let i = -3; i <= 3; i++) {
            const a = l.aim + i * 0.15;
            g.lineStyle(hot ? 3 : 1.5, CHEREN, 0.2 + k * 0.4);
            g.lineBetween(l.x + Math.cos(a) * 30, l.y + Math.sin(a) * 30, l.x + Math.cos(a) * (120 + k * 180), l.y + Math.sin(a) * (120 + k * 180));
          }
        } else if (next === 'gamma') {
          for (const off of [0, (Math.PI * 2) / 3, (-Math.PI * 2) / 3]) {
            const a = l.aim + off;
            const ex = l.x + Math.cos(a) * 1200, ey = l.y + Math.sin(a) * 1200;
            g.lineStyle(GAMMA_HALF * 2, 0xe8ffd0, hot ? 0.22 : 0.06 + k * 0.08); g.lineBetween(l.x, l.y, ex, ey);
            g.lineStyle(2, GLOW_LIT, hot ? 0.9 : 0.3 + k * 0.3); g.lineBetween(l.x, l.y, ex, ey);
          }
        } else if (next === 'gas') {
          const ax = l.x + Math.cos(l.aim) * 110, ay = l.y + Math.sin(l.aim) * 110;
          g.fillStyle(0xb48aff, 0.06 + k * 0.1); g.fillCircle(l.x, l.y, GAS_R * (0.4 + k * 0.6));
          g.lineStyle(4, 0xb48aff, 0.3 + k * 0.5); g.lineBetween(l.x, l.y, ax, ay);
          const ba = l.aim + Math.PI;
          g.fillStyle(0xb48aff, 0.3 + k * 0.5);
          g.fillTriangle(ax + Math.cos(l.aim) * 12, ay + Math.sin(l.aim) * 12, ax + Math.cos(ba + 0.5) * 12, ay + Math.sin(ba + 0.5) * 12, ax + Math.cos(ba - 0.5) * 12, ay + Math.sin(ba - 0.5) * 12);
        }
        drawCradle(g, l, time);
      }
      // The moment of each emission.
      for (const f of firedFx) {
        const k = clamp((time - f.at) / 700, 0, 1);
        if (f.kind === 'alpha') { g.lineStyle(10 * (1 - k), SLAG_LIT, 1 - k); g.strokeCircle(f.x, f.y, ALPHA_R * (0.7 + k * 0.3)); }
        if (f.kind === 'gamma') for (const off of [0, (Math.PI * 2) / 3, (-Math.PI * 2) / 3]) {
          const a = f.aim + off;
          g.lineStyle(GAMMA_HALF * 2 * (1 - k), 0xffffff, 0.8 * (1 - k)); g.lineBetween(f.x, f.y, f.x + Math.cos(a) * 1200, f.y + Math.sin(a) * 1200);
        }
      }
    },

    drawAir(g, time) {
      for (const f of [player, npc]) {
        if (!alive(f) || time >= (apron.get(f) ?? 0)) continue;
        // A lead apron, drawn hanging on the fighter.
        g.fillStyle(LEAD_DARK, 0.85); g.fillRoundedRect(f.x - 10, f.y - 18, 20, 22, 4);
        g.fillStyle(LEAD, 0.9); g.fillRoundedRect(f.x - 8, f.y - 17, 14, 18, 3);
        g.lineStyle(1.5, LEAD_LIT, 0.9); g.lineBetween(f.x - 8, f.y - 18, f.x - 4, f.y - 26); g.lineBetween(f.x + 8, f.y - 18, f.x + 4, f.y - 26);
      }
    },

    drawHud(g) {
      // The chain: six cells, uranium to lead, each with its kick drawn between.
      lumps.forEach((l, li) => {
        const x0 = 20, y = top + 18 + li * 30;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 8, y - 12, 6 * 26 + 6, 24, 6);
        for (let i = 0; i < 6; i++) {
          const x = x0 + i * 26 + 6;
          const on = i === l.step, nx = i === (l.step + 1) % 6;
          g.fillStyle(on ? TINT[i] : IRON_DARK, 1); g.fillCircle(x, y, on ? 8 : 6);
          if (nx) { g.lineStyle(2, AMBER_LIT, 1); g.strokeCircle(x, y, 9); }
          if (i === 5) { g.fillStyle(on ? LEAD : LEAD_DARK, 1); g.fillRect(x - 4, y - 4, 8, 8); }
          drawKick(g, x - 13, y, EMIT[i], on || nx);
        }
      });
    },
  };
}

/** The tiny pictogram for each kind of decay, drawn between the chain's cells. */
function drawKick(g: G, x: number, y: number, kind: Emit, lit: boolean): void {
  const a = lit ? 1 : 0.45;
  if (kind === 'alpha') { g.fillStyle(SLAG_LIT, a); g.fillCircle(x - 2, y, 2); g.fillCircle(x + 2, y, 2); }
  else if (kind === 'beta') { g.fillStyle(CHEREN_LIT, a); g.fillCircle(x + 2, y, 1.8); g.lineStyle(1, CHEREN_LIT, a); g.lineBetween(x - 4, y + 2, x + 1, y); }
  else if (kind === 'gamma') { g.lineStyle(1.5, GLOW_LIT, a); g.beginPath(); g.moveTo(x - 4, y); for (let i = 1; i <= 8; i++) g.lineTo(x - 4 + i, y + (i % 2 ? -2 : 2)); g.strokePath(); }
  else if (kind === 'gas') { g.fillStyle(0xb48aff, a); g.fillCircle(x - 2, y + 1, 2.2); g.fillCircle(x + 1, y - 1, 2.6); g.fillCircle(x + 3, y + 1, 2); }
}

/** The assay cradle: an iron tripod with a brass scale-pan, the lump sitting in it glowing its isotope. */
function drawCradle(g: G, l: Lump, time: number): void {
  const { x, y } = l;
  shadow(g, x, y + 6, 80, 22, 0.4);
  for (const k of [-1, 0, 1]) { g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x + k * 26, y + 4 - Math.abs(k) * 2, x + k * 10, y - 18); }
  g.fillStyle(COPPER, 1); g.fillEllipse(x, y - 18, 44, 12);
  g.fillStyle(IRON, 1); g.fillEllipse(x, y - 20, 38, 8);
  const tint = TINT[l.step];
  const leadNow = l.step === 5;
  if (!leadNow) glow(g, x, y - 26, 46, tint, 0.06, 4);
  // The lump: a knuckle of pitch-blende, veined with its daughter's light (dull grey once lead).
  const rng = mulberry(Math.floor(x) * 31 + l.step);
  blob(g, x, y - 28, 20, 14, leadNow ? LEAD_DARK : PITCH, 1, rng, 9);
  blob(g, x - 3, y - 31, 14, 9, leadNow ? LEAD : PITCH_LIT, 1, rng, 7);
  if (!leadNow) {
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + l.step;
      g.lineStyle(1.5, tint, 0.6 + Math.sin(time / 150 + i) * 0.3);
      g.lineBetween(x + Math.cos(a) * 4, y - 28 + Math.sin(a) * 3, x + Math.cos(a) * 15, y - 28 + Math.sin(a) * 9);
    }
    g.fillStyle(PITCH_SHEEN, 0.6); g.fillEllipse(x - 7, y - 36, 8, 3);
  } else {
    g.fillStyle(LEAD_LIT, 0.8); g.fillEllipse(x - 6, y - 35, 10, 3);
    const p = (time % 1400) / 1400;
    g.lineStyle(2, AMBER, 0.6 * (1 - p)); g.strokeCircle(x, y - 26, 22 + p * 16);
  }
  trefoil(g, x, y - 2, 5, HAZARD_BLACK, AMBER, 0.85);
  const sk = (time - l.struckAt) / 300;
  if (sk >= 0 && sk < 1) { g.lineStyle(3 * (1 - sk), IRON_LIT, 1 - sk); g.strokeCircle(x, y - 26, 20 + sk * 20); }
}

/** Radon: a violet, sinking cloud with heavier curls at its foot. */
function drawCloud(g: G, c: Cloud, time: number): void {
  const life = clamp((time - c.born) / GAS_LIFE, 0, 1);
  const a = life < 0.1 ? life * 10 : life > 0.8 ? (1 - life) * 5 : 1;
  g.fillStyle(0x6a4aa8, 0.14 * a); g.fillCircle(c.x, c.y, GAS_R);
  for (let i = 0; i < 7; i++) {
    const ang = i * 0.9 + time / 1400;
    const r = GAS_R * (0.35 + 0.35 * ((i * 37) % 10) / 10);
    g.fillStyle(0xb48aff, 0.1 * a); g.fillCircle(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r * 0.7, 22 + (i % 3) * 6);
  }
  g.lineStyle(1.5, 0xd8c0ff, 0.35 * a); g.strokeCircle(c.x, c.y, GAS_R);
}

export const FALLEN_DAUGHTERS: GimmickDef = {
  id: fallenId('halflife', SLUG),
  rules: 'The ore steps down its chain: ring, sparks, rays, radon — the last three at whoever is farther. Strike it to hurry it; strike the lead for an apron.',
  make,
};
