import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { stencilEye } from '../art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GROUT, IRON, IRON_LIT, SLATE_DARK, STATE_A, STATE_A_LIT, STATE_B, STATE_B_LIT,
  STENCIL, WAX,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * One to a Plate — Enumerator Philippa Nack, of the census.
 *
 * The court counts its people the way it counts its houses: in states, and one to a state. In the
 * King's telling Nack is the enumerator who laid the brass census plates in the square and struck
 * off anyone found standing where somebody already stood — two in one state is not allowed, and
 * the one who came second does not exist.
 *
 * The rule: five brass plates lie in the yard. Whoever stands on one is **counted** — their blows
 * land harder and their cooldowns run quicker — and holds it. Step onto a plate somebody already
 * holds and you are **struck off**: thrown clear, hurt and briefly held. Whoever is counted on no
 * plate when the stamp comes round gets the census stamp brought down on them (a ring that fills,
 * then the stamp). Strike a plate and it slides a step away from you — slide your own plate under
 * the foe and *they* are the newcomer, thrown off it. Past half, the **recount**: a plate keeps a
 * holder only four seconds, then throws them and shuts for a moment, so nobody can sit.
 *
 * The bot runs for a free plate when a stamp falls on it, holds what it has, and slides plates at
 * you when it strikes them.
 */

const ID = fallenId('superposition', 'one-plate');
const PLATE_R = 44;
const SLIDE = 80;
const SLIDE_MS = 280;
const STAMP_R = 62;
const STAMP_WARN = 1050;
const HOLD_MAX = 4000;
const SHUT_MS = 2400;

interface Plate {
  x: number; y: number; n: number;
  holder: Fighter | null; heldSince: number;
  slideFrom: Pt; slideTo: Pt; slideAt: number;
  shutUntil: number; target: StrikeTarget | null;
}
interface Throw { f: Fighter; dx: number; dy: number; until: number; root: boolean }
interface Stamp { f: Fighter; x: number; y: number; at: number }
interface Scar { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const span = H - top;
  const spots: [number, number][] = [[0.18, 0.3], [0.5, 0.2], [0.82, 0.3], [0.32, 0.78], [0.68, 0.78]];
  const plates: Plate[] = spots.map(([fx, fy], i) => {
    const x = W * fx, y = top + span * fy;
    return { x, y, n: i + 1, holder: null, heldSince: 0, slideFrom: { x, y }, slideTo: { x, y }, slideAt: -1e9, shutUntil: 0, target: null };
  });
  const throws: Throw[] = [];
  const stamps: Stamp[] = [];
  const scars: Scar[] = [];
  const wasOn = new Map<Fighter, Plate | null>([[player, null], [npc, null]]);
  const immuneUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextStamp = 0;
  let started = false;
  let recount = false;

  const held = (f: Fighter) => plates.find((p) => p.holder === f) ?? null;
  const onPlate = (f: Fighter) => plates.find((p) => dist(p.x, p.y, f.x, f.y) < PLATE_R) ?? null;

  function hurt(f: Fighter, pAmt: number, nAmt: number, x: number, y: number): void {
    if (!alive(f)) return;
    if (f === player) tk.hitPlayer(pAmt, x, y); else ctx.hit(npc, nAmt, x, y);
  }

  function strikeOff(f: Fighter, p: Plate, time: number, heavy: boolean): void {
    let a = Math.atan2(f.y - p.y, f.x - p.x);
    if (dist(f.x, f.y, p.x, p.y) < 3) a = f.x < W / 2 ? 0 : Math.PI;
    throws.push({ f, dx: Math.cos(a), dy: Math.sin(a), until: time + 260, root: heavy });
    immuneUntil.set(f, time + 700);
    if (heavy) hurt(f, 16, 24, f.x, f.y); else hurt(f, 8, 12, f.x, f.y);
    ctx.sfx(heavy ? 'judgement' : 'snap-back');
    ctx.flash(f.x, f.y, WAX);
  }

  for (const p of plates) {
    p.target = ctx.target({
      x: p.x, y: p.y, r: 40, passThrough: true,
      onStruck: (by) => {
        const now = ctx.scene.time.now;
        if (now - p.slideAt < SLIDE_MS + 220) return;
        const s = by === 'player' ? player : npc;
        let a = Math.atan2(p.y - s.y, p.x - s.x);
        if (dist(p.x, p.y, s.x, s.y) < 4) a = Math.atan2(npc.y - p.y, npc.x - p.x);
        let tx = clamp(p.x + Math.cos(a) * SLIDE, 70, W - 70), ty = clamp(p.y + Math.sin(a) * SLIDE, top + 60, H - 50);
        for (const o of plates) {
          if (o === p || dist(o.x, o.y, tx, ty) > PLATE_R * 2 + 10) continue;
          const b = Math.atan2(ty - o.y, tx - o.x);
          tx = clamp(o.x + Math.cos(b) * (PLATE_R * 2 + 12), 70, W - 70); ty = clamp(o.y + Math.sin(b) * (PLATE_R * 2 + 12), top + 60, H - 50);
        }
        p.slideFrom = { x: p.x, y: p.y }; p.slideTo = { x: tx, y: ty }; p.slideAt = now;
        ctx.sfx('stone-rise');
      },
    });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextStamp = time + 3200; }
      if (!recount && npc.hp < npc.maxHp * 0.5) {
        recount = true;
        ctx.banner('THE RECOUNT', '#f4dc94');
        ctx.sfx('judgement');
      }
      // Slides.
      for (const p of plates) {
        const k = clamp((time - p.slideAt) / SLIDE_MS, 0, 1);
        if (k < 1 || p.x !== p.slideTo.x || p.y !== p.slideTo.y) {
          const e = 1 - (1 - k) * (1 - k);
          p.x = p.slideFrom.x + (p.slideTo.x - p.slideFrom.x) * e;
          p.y = p.slideFrom.y + (p.slideTo.y - p.slideFrom.y) * e;
          p.target?.moveTo(p.x, p.y);
        }
      }
      // Throws in flight.
      for (let i = throws.length - 1; i >= 0; i--) {
        const t = throws[i];
        if (time >= t.until) {
          if (t.root && alive(t.f)) ctx.root(t.f, 450);
          scars.push({ x: t.f.x, y: t.f.y, at: time });
          throws.splice(i, 1);
          continue;
        }
        ctx.nudge(t.f, t.dx * 620 * dt, t.dy * 620 * dt);
      }
      // Who stands where; who holds what.
      for (const f of [player, npc]) {
        if (!alive(f)) { const h = held(f); if (h) h.holder = null; wasOn.set(f, null); continue; }
        const p = onPlate(f);
        const before = wasOn.get(f) ?? null;
        const h = held(f);
        if (h && h !== p) h.holder = null;
        if (p && time >= p.shutUntil) {
          const other = f === player ? npc : player;
          if (!p.holder) { p.holder = f; p.heldSince = time; ctx.sfx('crystal-chime'); }
          else if (p.holder === other && before !== p && time >= (immuneUntil.get(f) ?? 0)) strikeOff(f, p, time, true);
        }
        wasOn.set(f, p);
      }
      // The recount: a plate throws a long holder and shuts.
      if (recount) {
        for (const p of plates) {
          if (p.holder && time - p.heldSince > HOLD_MAX) {
            const f = p.holder;
            p.holder = null; p.shutUntil = time + SHUT_MS;
            strikeOff(f, p, time, false);
          }
        }
      }
      // The stamp comes round for everyone counted nowhere.
      if (time >= nextStamp) {
        nextStamp = time + (recount ? 3500 : 4300);
        for (const f of [player, npc]) {
          if (!alive(f) || held(f)) continue;
          stamps.push({ f, x: f.x, y: f.y, at: time });
        }
        ctx.sfx('countdown-tick');
      }
      for (let i = stamps.length - 1; i >= 0; i--) {
        const s = stamps[i];
        if (time - s.at < STAMP_WARN) continue;
        ctx.sfx('stone-slam');
        for (const f of [player, npc]) if (dist(f.x, f.y, s.x, s.y) < STAMP_R) hurt(f, 22, 28, s.x, s.y);
        scars.push({ x: s.x, y: s.y, at: time });
        stamps.splice(i, 1);
      }
      for (let i = scars.length - 1; i >= 0; i--) if (time - scars[i].at > 1600) scars.splice(i, 1);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const free = plates.filter((p) => !p.holder && time >= p.shutUntil);
      const nearestFree = () => free.reduce<Plate | null>((b, p) => (!b || dist(p.x, p.y, npc.x, npc.y) < dist(b.x, b.y, npc.x, npc.y) ? p : b), null);
      const mine = held(npc);
      const stamp = stamps.find((s) => s.f === npc);
      if (stamp) {
        const p = nearestFree();
        const left = (STAMP_WARN - (time - stamp.at)) / 1000;
        if (p && dist(p.x, p.y, npc.x, npc.y) / 190 < left) return { x: p.x, y: p.y };
        const a = Math.atan2(npc.y - stamp.y, npc.x - stamp.x);
        return { x: clamp(stamp.x + Math.cos(a) * (STAMP_R + 50), 70, W - 70), y: clamp(stamp.y + Math.sin(a) * (STAMP_R + 50), top + 60, H - 50) };
      }
      if (mine && !(recount && time - mine.heldSince > HOLD_MAX - 700)) return { x: mine.x, y: mine.y };
      const p = nearestFree();
      if (p && p !== mine) return { x: p.x, y: p.y };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 220, 80, W - 80), y: clamp(player.y + Math.sin(a) * 220, top + 70, H - 60) };
    },

    playerCooldownRate() { return held(player) ? 1.3 : 1; },
    npcCooldownRate() { return held(npc) ? 1.3 : 1; },
    npcTakenMult() { return held(player) ? 1.3 : 1; },
    playerTakenMult() { return held(npc) ? 1.3 : 1; },

    drawGround(g, time) {
      for (const p of plates) {
        const sliding = time - p.slideAt < SLIDE_MS + 300;
        if (sliding) {
          g.lineStyle(2, GROUT, 0.6); g.lineBetween(p.slideFrom.x, p.slideFrom.y, p.x, p.y);
          g.lineStyle(1, BRASS, 0.3); g.lineBetween(p.slideFrom.x + 8, p.slideFrom.y + 6, p.x + 8, p.y + 6);
        }
        censusPlate(g, p, time, recount, p.holder ? (p.holder === player ? STATE_B : STATE_A) : null);
      }
      for (const s of stamps) {
        const k = clamp((time - s.at) / STAMP_WARN, 0, 1);
        g.fillStyle(WAX, 0.1 + k * 0.15); g.fillCircle(s.x, s.y, STAMP_R);
        g.lineStyle(2, WAX, 0.5 + k * 0.5); g.strokeCircle(s.x, s.y, STAMP_R);
        g.fillStyle(WAX, 0.25); g.slice(s.x, s.y, STAMP_R - 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        shadow(g, s.x, s.y, 60 + k * 40, 22 + k * 16, 0.15 + k * 0.3);
      }
      for (const sc of scars) {
        const k = clamp((time - sc.at) / 1600, 0, 1);
        g.lineStyle(3, WAX, 0.7 * (1 - k));
        g.strokeCircle(sc.x, sc.y, 26);
        g.lineBetween(sc.x - 18, sc.y - 18, sc.x + 18, sc.y + 18); g.lineBetween(sc.x - 18, sc.y + 18, sc.x + 18, sc.y - 18);
      }
    },

    drawAir(g, time) {
      for (const s of stamps) {
        const k = clamp((time - s.at) / STAMP_WARN, 0, 1);
        const drop = k < 0.82 ? 150 - k * 60 : 150 - 0.82 * 60 - ((k - 0.82) / 0.18) * 100;
        censusStamp(g, s.x, s.y - Math.max(0, drop), k);
      }
      for (const t of throws) {
        g.lineStyle(5, WAX, 0.4); g.lineBetween(t.f.x - t.dx * 60, t.f.y - t.dy * 60, t.f.x, t.f.y);
        g.lineStyle(2, 0xffffff, 0.6); g.lineBetween(t.f.x - t.dx * 30, t.f.y - t.dy * 30, t.f.x, t.f.y);
      }
      for (const p of plates) {
        if (!p.holder) continue;
        const col = p.holder === player ? STATE_B_LIT : STATE_A_LIT;
        const f = p.holder;
        // The tick of the count over the holder's head.
        g.lineStyle(3, col, 0.9);
        g.lineBetween(f.x - 7, f.y - 66, f.x - 2, f.y - 60); g.lineBetween(f.x - 2, f.y - 60, f.x + 8, f.y - 74);
        if (recount) {
          const k = clamp((time - p.heldSince) / HOLD_MAX, 0, 1);
          g.lineStyle(3, WAX, 0.9); g.beginPath(); g.arc(f.x, f.y - 66, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    drawHud(g, time) {
      const x0 = 16, y0 = H - 40;
      g.fillStyle(0x0c0b10, 0.72); g.fillRoundedRect(x0 - 6, y0 - 16, 176, 34, 6);
      g.lineStyle(1, BRASS_DARK, 1); g.strokeRoundedRect(x0 - 6, y0 - 16, 176, 34, 6);
      // Two census tags: you (cyan) and Nack (magenta), lit when counted.
      [[player, STATE_B], [npc, STATE_A]].forEach(([f, col], i) => {
        const x = x0 + 14 + i * 40;
        const on = held(f as Fighter) !== null;
        g.fillStyle(on ? (col as number) : GROUT, 1); g.fillRoundedRect(x - 12, y0 - 10, 24, 20, 3);
        g.lineStyle(1, BRASS, 1); g.strokeRoundedRect(x - 12, y0 - 10, 24, 20, 3);
        stencilEye(g, x, y0, 5, on ? STENCIL : (col as number), 0.9);
      });
      // The stamp's round: a dial sweeping to the next call.
      const cx = x0 + 120;
      g.fillStyle(SLATE_DARK, 1); g.fillCircle(cx, y0, 12);
      const k = clamp(1 - (nextStamp - time) / (recount ? 3500 : 4300), 0, 1);
      g.fillStyle(WAX, 0.85); g.slice(cx, y0, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
      g.lineStyle(1.5, BRASS, 1); g.strokeCircle(cx, y0, 12);
      g.fillStyle(IRON, 1); g.fillRect(cx + 18, y0 - 8, 18, 6); g.fillStyle(BRASS, 1); g.fillRect(cx + 21, y0 - 2, 12, 8);
    },

    destroy() { for (const p of plates) p.target?.remove(); },
  };
}

/** A census plate: bevelled brass, engraved rim, its number in tally notches, the court's eye at the hub. */
function censusPlate(g: G, p: Plate, time: number, recount: boolean, holderCol: number | null): void {
  const { x, y } = p;
  const shut = time < p.shutUntil;
  shadow(g, x, y + 4, PLATE_R * 2.1, PLATE_R * 0.7, 0.3);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y + 2, PLATE_R);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, PLATE_R);
  g.fillStyle(lit(BRASS, 0.18), 1); g.fillCircle(x - 6, y - 6, PLATE_R * 0.7);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, PLATE_R * 0.62);
  g.lineStyle(1.5, BRASS_DARK, 1); g.strokeCircle(x, y, PLATE_R - 6); g.strokeCircle(x, y, PLATE_R * 0.62);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.lineStyle(1, BRASS_DARK, 0.8);
    g.lineBetween(x + Math.cos(a) * (PLATE_R - 6), y + Math.sin(a) * (PLATE_R - 6), x + Math.cos(a) * (PLATE_R - 2), y + Math.sin(a) * (PLATE_R - 2));
  }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + Math.cos(a) * (PLATE_R - 12), y + Math.sin(a) * (PLATE_R - 12), 2); }
  // Its number, in tally notches across the lower rim.
  for (let i = 0; i < p.n; i++) {
    const nx = x - (p.n - 1) * 4 + i * 8;
    g.lineStyle(2, STENCIL, 0.8);
    if (i === 4) g.lineBetween(nx - 36, y + PLATE_R * 0.78 - 4, nx + 2, y + PLATE_R * 0.78 + 4);
    else g.lineBetween(nx, y + PLATE_R * 0.7, nx, y + PLATE_R * 0.86);
  }
  stencilEye(g, x, y, 9, STENCIL, 0.8);
  if (holderCol !== null) {
    glow(g, x, y, PLATE_R + 8, holderCol, 0.05, 3);
    g.lineStyle(3, holderCol, 0.85); g.strokeCircle(x, y, PLATE_R * 0.62);
    g.lineStyle(1.5, lit(holderCol, 0.4), 0.7 + 0.3 * Math.sin(time / 150)); g.strokeCircle(x, y, PLATE_R + 3);
  }
  if (shut) {
    g.fillStyle(IRON, 0.92); g.fillCircle(x, y, PLATE_R - 4);
    g.lineStyle(2, IRON_LIT, 1);
    for (let k = -3; k <= 3; k++) g.lineBetween(x + k * 10, y - Math.sqrt(Math.max(0, (PLATE_R - 6) ** 2 - (k * 10) ** 2)), x + k * 10, y + Math.sqrt(Math.max(0, (PLATE_R - 6) ** 2 - (k * 10) ** 2)));
    g.fillStyle(WAX, 1); g.fillCircle(x, y, 7);
  } else if (recount) {
    g.lineStyle(1, WAX, 0.35 + 0.25 * Math.sin(time / 200)); g.strokeCircle(x, y, PLATE_R + 5);
  }
}

/** Nack's census stamp: a turned wooden knob, an iron shaft, a heavy block with the court's eye cut in its face. */
function censusStamp(g: G, x: number, y: number, k: number): void {
  const a = 0.55 + k * 0.45;
  g.fillStyle(0x6a4a2a, a); g.fillCircle(x, y - 70, 10);
  g.fillStyle(0x8a6a44, a); g.fillCircle(x - 3, y - 73, 4);
  g.fillStyle(IRON, a); g.fillRect(x - 3, y - 62, 6, 34);
  g.fillStyle(IRON_LIT, a); g.fillRect(x - 3, y - 62, 2, 34);
  g.fillStyle(dim(IRON, 0.2), a); g.fillRect(x - 30, y - 30, 60, 22);
  g.fillStyle(IRON_LIT, a); g.fillRect(x - 30, y - 30, 60, 4);
  g.fillStyle(WAX, a); g.fillRect(x - 32, y - 10, 64, 8);
  stencilEye(g, x, y - 19, 7, WAX, a);
  glow(g, x, y - 6, 30, WAX, 0.04 * k, 2);
}

export const FALLEN_ONE_PLATE: GimmickDef = {
  id: ID,
  rules: 'On a census plate you are counted: harder blows, quicker cooldowns. Step on a held plate: struck off. Strike a plate to slide it from you.',
  make,
};
