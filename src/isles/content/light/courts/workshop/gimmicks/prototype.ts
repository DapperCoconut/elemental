import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, type G } from '../../../../../art/IsleArt';
import { gear, lens } from '../art';
import {
  BLUEPRINT, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, CYAN, GLASS, GLASS_LIT, IRON, IRON_DARK, IRON_LIT,
  LIME, LIME_DARK, LIME_LIT, MOLTEN, OAK, OAK_DARK, SIDE_NPC, SIDE_PLAYER, SOOT,
} from '../palette';
import { alive, clamp, dist, ease, lerp, stepDt } from '../util';

/**
 * Prototype — Tinker Gizmo.
 *
 * Gizmo's workbench stands at the head of the floor, its jointed arm never still. Every eight
 * seconds it turns out a prototype and flings it onto one of three brass pedestals: **spring boots**
 * (run half again as fast), a **lens-cannon** (it rides your shoulder and fires burning bolts at your
 * foe) or a **bubble ward** (a glass sphere that turns most of a blow). The first fighter to reach
 * the pedestal takes it.
 *
 * One prototype in three misfires — the boots throw you on your face, the cannon blows up in your
 * hands, the ward seals and cracks and holds you still. A bad one *smokes on the pedestal*. Gizmo
 * never looks; he grabs everything. Watch for the smoke, and let him have the duds.
 */

type Kind = 'boots' | 'cannon' | 'ward';
const KINDS: Kind[] = ['boots', 'cannon', 'ward'];
const NAMES: Record<Kind, string> = { boots: 'SPRING BOOTS', cannon: 'LENS-CANNON', ward: 'BUBBLE WARD' };

interface Proto {
  kind: Kind;
  dud: boolean;
  ped: number;
  /** Flung from the bench at this time; lands FLY_MS later. */
  at: number;
  seed: number;
}

interface Held { kind: Kind; until: number; nextShot: number; at: number }

const EVERY_MS = 8000;
const FLY_MS = 750;
const SIT_MS = 6500;
const GRAB_R = 40;
const HOLD_MS = 6000;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const bench: Pt = { x: W / 2, y: top + 46 };
  const peds: Pt[] = [{ x: 170, y: top + 250 }, { x: W / 2, y: H - 110 }, { x: W - 170, y: top + 250 }];
  let proto: Proto | null = null;
  let nextMake = 0;
  let lastPed = -1;
  let started = false;
  let dudsInRow = 0;
  const held = new Map<Fighter, Held>();
  const fx: { x: number; y: number; at: number; kind: 'pop' | 'boom' | 'crack' }[] = [];
  const SHOT_DMG = ctx.hard ? 9 : 8;

  const other = (f: Fighter) => (f === player ? npc : player);
  const landed = (p: Proto, time: number) => time - p.at >= FLY_MS;

  function turnOut(time: number): void {
    let ped = Math.floor(rng() * peds.length);
    if (ped === lastPed) ped = (ped + 1) % peds.length;
    lastPed = ped;
    // One in three is a dud — but never three in a row.
    let dud = rng() < 1 / 3;
    if (dudsInRow >= 2) dud = false;
    dudsInRow = dud ? dudsInRow + 1 : 0;
    proto = { kind: KINDS[Math.floor(rng() * KINDS.length)], dud, ped, at: time, seed: rng() * 10 };
    ctx.sfx('gear-turn');
  }

  function grab(f: Fighter, p: Proto, time: number): void {
    proto = null;
    const who = f === player ? 'You' : 'Gizmo';
    const at = peds[p.ped];
    if (p.dud) {
      ctx.float(at.x, at.y - 50, 'MISFIRE!', '#ffb070');
      switch (p.kind) {
        case 'boots': {
          // The springs let go all at once.
          const a = rng() * Math.PI * 2;
          ctx.stun(f, 900);
          ctx.nudge(f, Math.cos(a) * 120, Math.sin(a) * 120);
          ctx.hit(f, 8, f.x, f.y);
          ctx.sfx('boing');
          fx.push({ x: f.x, y: f.y, at: time, kind: 'pop' });
          break;
        }
        case 'cannon':
          ctx.hit(f, 14, f.x, f.y);
          ctx.stun(f, 450);
          ctx.flash(f.x, f.y, 0xffd27a);
          ctx.sfx('explosion-small');
          fx.push({ x: f.x, y: f.y, at: time, kind: 'boom' });
          break;
        case 'ward':
          // The sphere seals shut and cracks: stuck, and every blow comes through the cracks harder.
          ctx.root(f, 1400);
          held.set(f, { kind: 'ward', until: time + 3500, nextShot: 0, at: time });
          ctx.sfx('crystal-shatter');
          fx.push({ x: f.x, y: f.y, at: time, kind: 'crack' });
          break;
      }
      return;
    }
    ctx.float(at.x, at.y - 50, `${who}: ${NAMES[p.kind]}`, f === player ? '#9ad8ff' : '#ffb0a0');
    held.set(f, { kind: p.kind, until: time + (p.kind === 'ward' ? 5000 : HOLD_MS), nextShot: time + 600, at: time });
    ctx.sfx(p.kind === 'boots' ? 'boing' : p.kind === 'cannon' ? 'reload' : 'shield-block');
  }

  /** A cracked ward (a misfired one) has `nextShot` 0 — the tell for "misfired". */
  const cracked = (h: Held | undefined) => !!h && h.kind === 'ward' && h.nextShot === 0;

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextMake = time + 1600; }
      if (time >= nextMake) {
        nextMake = time + EVERY_MS;
        turnOut(time);
      }
      const p = proto;
      if (p && landed(p, time)) {
        const at = peds[p.ped];
        if (time - p.at > FLY_MS + SIT_MS) {
          proto = null;
          ctx.float(at.x, at.y - 40, 'fizzle', '#c8c0b0');
        } else {
          const dp = alive(player) ? dist(player.x, player.y, at.x, at.y) : Infinity;
          const dn = alive(npc) ? dist(npc.x, npc.y, at.x, at.y) : Infinity;
          if (Math.min(dp, dn) < GRAB_R) grab(dp <= dn ? player : npc, p, time);
        }
      }
      for (const [f, h] of held) {
        if (time >= h.until || !alive(f)) { held.delete(f); continue; }
        if (h.kind === 'cannon' && time >= h.nextShot) {
          h.nextShot = time + 1050;
          const o = other(f);
          if (!alive(o)) continue;
          const sx = f.x + 18, sy = f.y - 40;
          tk.spawnBullet({
            x: sx, y: sy, angle: Math.atan2(o.y - sy, o.x - sx), speed: 380, damage: SHOT_DMG, r: 6,
            color: 0xfff4c0, lifeMs: 2200, hits: [o],
          });
          ctx.sfx('light-beam');
        }
      }
      while (fx.length && time - fx[0].at > 700) fx.shift();
    },

    playerSpeedMult() {
      const h = held.get(player);
      return h?.kind === 'boots' ? 1.5 : 1;
    },
    npcSpeedMult() {
      const h = held.get(npc);
      return h?.kind === 'boots' ? 1.5 : 1;
    },
    playerTakenMult() {
      const h = held.get(player);
      if (!h || h.kind !== 'ward') return 1;
      return cracked(h) ? 1.45 : 0.35;
    },
    npcTakenMult() {
      const h = held.get(npc);
      if (!h || h.kind !== 'ward') return 1;
      return cracked(h) ? 1.45 : 0.35;
    },

    npcSeek() {
      // Gizmo grabs everything, duds and all.
      if (proto) {
        const at = peds[proto.ped];
        return { x: at.x, y: clamp(at.y + 6, top + 40, H - 40) };
      }
      const h = held.get(npc);
      if (h?.kind === 'cannon') {
        // Keep his distance and let the cannon work.
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 320, 60, W - 60), y: clamp(player.y + Math.sin(a) * 260, top + 50, H - 40) };
      }
      // Loiter between the pedestals, near the next one he guesses at.
      const guess = peds[(lastPed + 1) % peds.length];
      return { x: lerp(guess.x, player.x, 0.4), y: lerp(guess.y, player.y, 0.4) };
    },

    drawGround(g, time) {
      // The bench's chalk marks and the pedestals' footprints.
      for (let i = 0; i < peds.length; i++) {
        const at = peds[i];
        const live = proto && proto.ped === i && landed(proto, time);
        g.fillStyle(0x000000, 0.2); g.fillEllipse(at.x, at.y + 4, 56, 16);
        g.lineStyle(2, live ? CYAN : dim(CYAN, 0.4), live ? 0.6 + Math.sin(time / 150) * 0.2 : 0.3);
        g.strokeEllipse(at.x, at.y + 2, GRAB_R * 2 + 6, GRAB_R * 0.9);
      }
      // A dotted throw-arc from bench to the chosen pedestal as it flies.
      if (proto && !landed(proto, time)) {
        const at = peds[proto.ped];
        for (let k = 0; k <= 12; k++) {
          const x = lerp(bench.x, at.x, k / 12), y = lerp(bench.y + 20, at.y, k / 12) - Math.sin((k / 12) * Math.PI) * 120;
          g.fillStyle(CYAN, 0.35); g.fillCircle(x, y, 2);
        }
      }
    },

    drawAir(g, time) {
      drawBench(g, bench.x, bench.y, time, proto ? time - proto.at : 9999);
      for (let i = 0; i < peds.length; i++) drawPedestal(g, peds[i].x, peds[i].y);
      const p = proto;
      if (p) {
        const at = peds[p.ped];
        const k = clamp((time - p.at) / FLY_MS, 0, 1);
        const x = lerp(bench.x, at.x, ease(k)), y = lerp(bench.y + 10, at.y - 34, ease(k)) - Math.sin(k * Math.PI) * 120;
        drawProto(g, p.kind, x, y, k < 1 ? time / 80 : 0, time);
        if (k >= 1) {
          // Fresh off the bench: it hums. A dud smokes and sputters — that's the tell.
          if (p.dud) {
            for (let i = 0; i < 4; i++) {
              const ph = ((time / 900) + i / 4 + p.seed) % 1;
              g.fillStyle(SOOT, 0.35 * (1 - ph)); g.fillCircle(x + Math.sin(ph * 6 + i) * 6, y - 14 - ph * 34, 4 + ph * 7);
            }
            if (Math.sin(time / 60 + p.seed) > 0.6) { g.fillStyle(MOLTEN, 0.9); g.fillCircle(x + 8, y - 6, 1.8); }
          } else {
            glow(g, x, y, 22, CYAN, 0.04 + Math.sin(time / 200) * 0.02, 2);
          }
          // How long until it fizzles.
          const left = clamp(1 - (time - p.at - FLY_MS) / SIT_MS, 0, 1);
          g.lineStyle(2, BRASS_LIT, 0.8);
          g.beginPath(); g.arc(at.x, at.y - 34, 24, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        }
      }
      // What each fighter is carrying.
      for (const [f, h] of held) {
        const side = f === player ? SIDE_PLAYER : SIDE_NPC;
        const left = clamp((h.until - time) / (h.kind === 'ward' ? 5000 : HOLD_MS), 0, 1);
        if (h.kind === 'boots') {
          for (const s of [-1, 1]) {
            const bob = Math.abs(Math.sin(time / 90 + s)) * 4;
            g.lineStyle(1.5, IRON_LIT, 1);
            for (let c = 0; c < 3; c++) g.strokeEllipse(f.x + s * 8, f.y + 18 - c * 3 - bob * 0.3, 8, 3);
            g.fillStyle(BRASS, 1); g.fillRoundedRect(f.x + s * 8 - 6, f.y + 6 - bob, 12, 6, 2);
          }
        } else if (h.kind === 'cannon') {
          const o = other(f);
          const a = Math.atan2(o.y - (f.y - 40), o.x - (f.x + 18));
          const cx = f.x + 18, cy = f.y - 40;
          g.lineStyle(9, BRASS_DARK, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
          g.lineStyle(6, BRASS, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
          lens(g, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 5);
          gear(g, cx, cy, 6, 8, COPPER, 1, time / 150);
          const charge = clamp(1 - (h.nextShot - time) / 1050, 0, 1);
          if (charge > 0.6) { g.lineStyle(1, 0xfff4c0, (charge - 0.6) * 1.5); g.lineBetween(cx, cy, o.x, o.y); }
        } else {
          const bad = cracked(h);
          g.fillStyle(GLASS, bad ? 0.1 : 0.16); g.fillCircle(f.x, f.y - 6, 36);
          g.lineStyle(2, bad ? 0xffb070 : GLASS_LIT, 0.7); g.strokeCircle(f.x, f.y - 6, 36);
          g.fillStyle(GLASS_LIT, 0.5); g.fillEllipse(f.x - 14, f.y - 24, 14, 7);
          g.lineStyle(2, BRASS, 0.9); g.strokeEllipse(f.x, f.y + 22, 40, 8);
          if (bad) {
            g.lineStyle(1.5, 0xffffff, 0.8);
            g.lineBetween(f.x - 10, f.y - 40, f.x - 2, f.y - 20); g.lineBetween(f.x - 2, f.y - 20, f.x - 14, f.y - 6);
            g.lineBetween(f.x + 22, f.y - 26, f.x + 10, f.y - 10); g.lineBetween(f.x + 10, f.y - 10, f.x + 24, f.y + 2);
          }
        }
        // A thin timer ring in the holder's colour.
        g.lineStyle(2, side, 0.7);
        g.beginPath(); g.arc(f.x, f.y + 24, 18, Math.PI * 0.1, Math.PI * 0.1 + left * Math.PI * 0.8, false); g.strokePath();
      }
      for (const e of fx) {
        const k = clamp((time - e.at) / 700, 0, 1);
        if (e.kind === 'boom') {
          g.fillStyle(0xffd27a, 0.7 * (1 - k)); g.fillCircle(e.x, e.y - 20, 16 + k * 40);
          for (let i = 0; i < 6; i++) { const a = i * 1.05; gear(g, e.x + Math.cos(a) * k * 60, e.y - 20 + Math.sin(a) * k * 50 + k * k * 30, 4, 8, BRASS, 1 - k, k * 8); }
        } else if (e.kind === 'pop') {
          for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; g.lineStyle(1.5, IRON_LIT, 1 - k); g.strokeEllipse(e.x + Math.cos(a) * k * 50, e.y + Math.sin(a) * k * 40 - k * 30, 8, 4); }
        } else {
          for (let i = 0; i < 8; i++) { const a = i * 0.8; g.fillStyle(GLASS_LIT, 1 - k); g.fillTriangle(e.x + Math.cos(a) * (30 + k * 30), e.y - 6 + Math.sin(a) * (30 + k * 30), e.x + Math.cos(a + 0.1) * (36 + k * 30), e.y - 6 + Math.sin(a + 0.1) * (36 + k * 30), e.x + Math.cos(a) * (40 + k * 30), e.y - 6 + Math.sin(a) * (40 + k * 30)); }
        }
      }
    },

    drawHud(g, time) {
      // Bench clock: when the next prototype comes off.
      const k = clamp(1 - (nextMake - time) / EVERY_MS, 0, 1);
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 62, y - 6, 124, 12, 5);
      g.fillStyle(BRASS, 0.95); g.fillRoundedRect(x - 60, y - 4, 120 * k, 8, 4);
      gear(g, x - 72, y, 6, 8, BRASS, 1, time / 300);
    },
  };
}

/** Gizmo's bench: an oak top, a vice, a jointed arm with a claw, a rack of half-built things. */
function drawBench(g: G, x: number, y: number, time: number, sinceThrow: number): void {
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 26, 200, 22);
  g.fillStyle(OAK_DARK, 1); g.fillRect(x - 90, y, 180, 22);
  g.fillStyle(OAK, 1); g.fillRect(x - 92, y - 4, 184, 8);
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 86, y + 8, 8, 18); g.fillRect(x + 78, y + 8, 8, 18);
  // Rack of parts along the bench.
  for (let i = 0; i < 6; i++) gear(g, x - 70 + i * 14, y - 8, 4 + (i % 2) * 2, 8, i % 2 ? COPPER : BRASS, 1, time / 400 + i);
  g.fillStyle(BLUEPRINT, 1); g.fillRect(x + 30, y - 10, 34, 8);
  // The arm: shoulder on the bench, an elbow, a claw — it swings out when it throws.
  const throwK = sinceThrow < 500 ? Math.sin((sinceThrow / 500) * Math.PI) : 0;
  const idle = Math.sin(time / 400) * 0.25;
  const a1 = -Math.PI / 2 + idle + throwK * 0.9;
  const sx = x - 20, sy = y - 6;
  const ex = sx + Math.cos(a1) * 34, ey = sy + Math.sin(a1) * 34;
  const a2 = a1 + 0.9 - throwK * 1.6;
  const hx = ex + Math.cos(a2) * 28, hy = ey + Math.sin(a2) * 28;
  g.lineStyle(6, IRON_DARK, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, hx, hy);
  g.lineStyle(3, IRON_LIT, 1); g.lineBetween(sx, sy, ex, ey); g.lineBetween(ex, ey, hx, hy);
  gear(g, sx, sy, 6, 8, BRASS, 1, time / 200);
  gear(g, ex, ey, 4, 8, BRASS, 1, -time / 150);
  g.lineStyle(2, IRON, 1);
  g.lineBetween(hx, hy, hx + Math.cos(a2 - 0.5) * 8, hy + Math.sin(a2 - 0.5) * 8);
  g.lineBetween(hx, hy, hx + Math.cos(a2 + 0.5) * 8, hy + Math.sin(a2 + 0.5) * 8);
  // Sparks from the vice while it works.
  if (Math.sin(time / 130) > 0.4) for (let i = 0; i < 3; i++) { g.fillStyle(MOLTEN, 0.8); g.fillCircle(x + 50 + Math.sin(time / 40 + i) * 8, y - 12 - i * 4, 1.4); }
}

/** A brass pedestal with a limestone foot. */
function drawPedestal(g: G, x: number, y: number): void {
  g.fillStyle(LIME_DARK, 1); g.fillRect(x - 16, y - 8, 32, 8);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - 18, y - 11, 36, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 6, y - 26, 12, 16);
  g.fillStyle(BRASS, 1); g.fillRect(x - 4, y - 26, 5, 16);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y - 26, 34, 9);
  g.fillStyle(BRASS_LIT, 1); g.fillEllipse(x, y - 27, 30, 7);
  g.fillStyle(LIME, 1); g.fillRect(x - 2, y - 12, 4, 2);
}

/** A prototype, as it sits on a pedestal or flies. */
function drawProto(g: G, kind: Kind, x: number, y: number, spin: number, time: number): void {
  switch (kind) {
    case 'boots':
      for (const s of [-1, 1]) {
        g.lineStyle(1.5, IRON_LIT, 1);
        for (let c = 0; c < 3; c++) g.strokeEllipse(x + s * 7, y + 8 - c * 3, 8, 3);
        g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x + s * 7 - 6, y - 8, 12, 10, 3);
        g.fillStyle(BRASS, 1); g.fillRoundedRect(x + s * 7 - 5, y - 8, 10, 7, 3);
        g.fillStyle(COPPER, 1); g.fillRect(x + s * 7 - 6, y - 2, 12, 2);
      }
      break;
    case 'cannon': {
      const a = -0.4 + Math.sin(spin) * 0.3;
      g.lineStyle(10, BRASS_DARK, 1); g.lineBetween(x - 12, y + 2, x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      g.lineStyle(7, BRASS, 1); g.lineBetween(x - 12, y + 2, x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      lens(g, x + Math.cos(a) * 18, y + Math.sin(a) * 18, 5);
      gear(g, x - 10, y + 4, 6, 8, COPPER_DARK, 1, time / 200);
      break;
    }
    case 'ward':
      g.fillStyle(GLASS, 0.6); g.fillCircle(x, y - 2, 14);
      g.lineStyle(1.5, GLASS_LIT, 0.9); g.strokeCircle(x, y - 2, 14);
      g.fillStyle(GLASS_LIT, 0.7); g.fillEllipse(x - 5, y - 8, 7, 4);
      g.lineStyle(3, BRASS, 1); g.strokeEllipse(x, y + 8, 22, 6);
      g.fillStyle(CYAN, 0.5); g.fillCircle(x, y - 2, 4 + Math.sin(time / 150) * 1.5);
      break;
  }
}

export const PROTOTYPE_GIMMICK: GimmickDef = {
  id: 'workshop-prototype',
  rules: 'Every 8s Gizmo\'s bench flings a prototype onto a pedestal — spring boots, a lens-cannon or a bubble ward. First to it takes it. One in three misfires: a dud smokes.',
  make,
};
