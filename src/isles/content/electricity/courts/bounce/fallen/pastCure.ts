import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRICK, BRICK_DARK, BRICK_LIT, IRON, IRON_LIT, LATEX, LATEX_LIT, RUBBER, RUBBER_SHEEN, SULPHUR, SULPHUR_DARK, TOY_RED } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Past the Cure — Gudrun Retort, Cure-Mistress of the vulcanizing works: she read the steam
 * gauges on the autoclaves and called each batch done — raw, cured, or *over* — by pressing her
 * thumb into it. In the King's telling the Prince lent her the earthed to cure, and she cooked
 * the give out of them until they cracked like old tyres.
 *
 * Steam-cure ovens are set in the walls. Gudrun throws open the one nearest you: its locking wheel
 * spins, the door swings, and a cone of sulphur steam pours across the floor. Steam cures whoever
 * stands in it, and cure never comes back by itself: only the quench troughs draw it out (slow
 * wading), or a crack. Raw, you are tacky — slow, but blows sink in. Cured, you have bounce —
 * quick on your feet. Past the cure you are brittle: blows land hard, and a heavy one cracks you
 * (stunned, and the cracked skin falls back to cured).
 *
 * The same holds for her. Strike an oven's wheel to throw it open yourself — cook her past the
 * cure, then crack her. Past halfway the ovens open in pairs and her blows cure you as they land.
 * The bot keeps out of the steam, and wades a trough when it is running hot.
 */

const ID = fallenId('bounce', 'past-cure');
const CONE = 0.42;
const REACH = 380;
const OPEN_WARN = 950;
const BLAST_MS = 2400;
const CURE_RATE = 34;
const RAW = 34;
const BRITTLE = 67;

interface Oven { x: number; y: number; a: number; warnAt: number; openAt: number; shutAt: number; tgt: StrikeTarget }
interface Trough { x: number; y: number; w: number; h: number }
interface Cure { v: number; crackCd: number; crackAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const midY = (top + H) / 2;
  const mkOven = (x: number, y: number, a: number): Oven => {
    const o: Oven = { x, y, a, warnAt: -1, openAt: -1, shutAt: -1, tgt: null as unknown as StrikeTarget };
    o.tgt = ctx.target({ x, y, r: 30, onStruck: (by: Striker) => struck(o, by) });
    return o;
  };
  const ovens: Oven[] = [
    mkOven(34, midY, 0), mkOven(W - 34, midY, Math.PI), mkOven(W * 0.3, top + 26, Math.PI / 2), mkOven(W * 0.7, H - 22, -Math.PI / 2),
  ];
  const troughs: Trough[] = [{ x: W * 0.2, y: H - 92, w: 130, h: 40 }, { x: W * 0.8, y: top + 118, w: 130, h: 40 }];
  const cure = new Map<Fighter, Cure>([[player, { v: 20, crackCd: 0, crackAt: -1e9 }], [npc, { v: 20, crackCd: 0, crackAt: -1e9 }]]);
  let started = false;
  let half = false;
  let next = 0;

  const C = (f: Fighter) => cure.get(f) as Cure;
  const busy = (o: Oven, t: number) => o.warnAt >= 0 && t < o.shutAt;
  const blasting = (o: Oven, t: number) => o.openAt >= 0 && t >= o.openAt && t < o.shutAt;
  const inCone = (o: Oven, x: number, y: number, pad = 0) => {
    const d = dist(o.x, o.y, x, y);
    return d < REACH + pad && d > 10 && Math.abs(wrapAngle(Math.atan2(y - o.y, x - o.x) - o.a)) < CONE + pad / 400;
  };
  const inTrough = (f: Fighter) => troughs.some((t) => Math.abs(f.x - t.x) < t.w / 2 && Math.abs(f.y - t.y) < t.h / 2 + 6);
  const band = (v: number) => (v < RAW ? 0 : v < BRITTLE ? 1 : 2);

  function open(o: Oven, t: number, warn: number): void {
    o.warnAt = t; o.openAt = t + warn; o.shutAt = o.openAt + BLAST_MS;
    ctx.sfx('gear-turn');
  }
  function struck(o: Oven, _by: Striker): void {
    const t = tk.now;
    if (busy(o, t) || t - o.shutAt < 500) return;
    open(o, t, 520);
  }
  function hurt(f: Fighter, amount: number): void {
    const c = C(f);
    if (half && f === player) c.v = clamp(c.v + 5, 0, 100);
    if (band(c.v) !== 2 || amount < 12 || tk.now < c.crackCd) return;
    c.crackCd = tk.now + 2500; c.crackAt = tk.now; c.v = 50;
    ctx.stun(f, 550);
    ctx.sfx('crystal-shatter');
    ctx.float(f.x, f.y - 56, 'CRACKED', f === player ? '#ffb0a0' : '#ffe2a8');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; next = time + 1800; }
      if (!half && npc.hp < npc.maxHp * 0.5) { half = true; ctx.banner('THE OVENS OPEN IN PAIRS', '#e6d23a'); ctx.sfx('engine'); }
      if (time >= next && alive(player)) {
        next = time + (half ? 3100 : 3500);
        const free = ovens.filter((o) => !busy(o, time))
          .sort((a, b) => Math.abs(wrapAngle(Math.atan2(player.y - a.y, player.x - a.x) - a.a)) - Math.abs(wrapAngle(Math.atan2(player.y - b.y, player.x - b.x) - b.a)));
        for (const o of free.slice(0, half ? 2 : 1)) open(o, time, tk.warn(OPEN_WARN));
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const c = C(f);
        for (const o of ovens) if (blasting(o, time) && inCone(o, f.x, f.y)) c.v += CURE_RATE * dt;
        if (inTrough(f)) c.v -= 45 * dt;
        c.v = clamp(c.v, inTrough(f) ? 10 : 0, 100);
      }
    },

    onPlayerHurt(amount) { hurt(player, amount); },
    onNpcHurt(amount) { hurt(npc, amount); },
    playerSpeedMult() { const b = band(C(player).v); return (b === 0 ? 0.85 : b === 1 ? 1.12 : 1) * (inTrough(player) ? 0.8 : 1); },
    npcSpeedMult() { const b = band(C(npc).v); return (b === 0 ? 0.85 : b === 1 ? 1.12 : 1) * (inTrough(npc) ? 0.8 : 1); },
    playerTakenMult() { const b = band(C(player).v); return b === 0 ? 0.88 : b === 2 ? 1.35 : 1; },
    npcTakenMult() { const b = band(C(npc).v); return b === 0 ? 0.88 : b === 2 ? 1.35 : 1; },

    npcSeek() {
      const t = tk.now;
      for (const o of ovens) {
        if (!busy(o, t) || !inCone(o, npc.x, npc.y, 40)) continue;
        // Out of the cone, the short way across it.
        const side = wrapAngle(Math.atan2(npc.y - o.y, npc.x - o.x) - o.a) >= 0 ? 1 : -1;
        const a = o.a + side * (CONE + 0.5), r = clamp(dist(o.x, o.y, npc.x, npc.y), 120, 300);
        return { x: tk.clampX(o.x + Math.cos(a) * r), y: tk.clampY(o.y + Math.sin(a) * r) };
      }
      if (C(npc).v >= 58) {
        const tr = troughs.reduce((b, q) => (dist(npc.x, npc.y, q.x, q.y) < dist(npc.x, npc.y, b.x, b.y) ? q : b), troughs[0]);
        return { x: tr.x, y: tr.y };
      }
      return null;
    },

    drawGround(g, time) {
      for (const tr of troughs) drawTrough(g, tr, time);
      for (const o of ovens) {
        if (!busy(o, time)) continue;
        const k = time < o.openAt ? clamp((time - o.warnAt) / (o.openAt - o.warnAt), 0, 1) : 1;
        const on = blasting(o, time);
        const pts = [{ x: o.x, y: o.y }];
        for (let i = 0; i <= 10; i++) { const a = o.a - CONE + (2 * CONE * i) / 10; pts.push({ x: o.x + Math.cos(a) * REACH, y: o.y + Math.sin(a) * REACH }); }
        g.fillStyle(on ? SULPHUR : LATEX, on ? 0.12 : 0.04 + 0.08 * k);
        g.fillPoints(pts, true);
        g.lineStyle(2, on ? SULPHUR : LATEX_LIT, on ? 0.5 : 0.25 + 0.5 * k);
        for (const s of [-1, 1]) { const a = o.a + s * CONE; g.lineBetween(o.x, o.y, o.x + Math.cos(a) * REACH, o.y + Math.sin(a) * REACH); }
        g.beginPath(); g.arc(o.x, o.y, REACH, o.a - CONE, o.a + CONE, false); g.strokePath();
      }
      for (const f of [player, npc]) if (alive(f)) drawSkin(g, f, C(f), time);
    },

    drawAir(g, time) {
      for (const o of ovens) {
        if (blasting(o, time)) {
          // Billows of sulphur steam rolling out along the cone.
          for (let i = 0; i < 16; i++) {
            const ph = ((time / 900 + i / 16) % 1);
            const a = o.a + Math.sin(i * 2.3) * CONE * 0.85;
            const r = 30 + ph * (REACH - 30);
            const s = 10 + ph * 30;
            g.fillStyle(i % 3 ? 0xe8e4c8 : SULPHUR, 0.22 * (1 - ph * 0.7));
            g.fillCircle(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r - ph * 18, s);
          }
        }
        drawOven(g, o, time);
      }
    },

    drawHud(g) {
      durometer(g, W / 2 - 46, top + 22, C(player).v, 0x9ad0ff);
      durometer(g, W / 2 + 46, top + 22, C(npc).v, 0xffa040);
    },

    destroy() { for (const o of ovens) o.tgt.remove(); },
  };
}

/** The skin each fighter wears on the floor: milky and lumpy raw, black and glossy cured, grey and crazed past it. */
function drawSkin(g: G, f: Fighter, c: Cure, time: number): void {
  const b = c.v < RAW ? 0 : c.v < BRITTLE ? 1 : 2;
  const x = f.x, y = f.y + 4;
  if (b === 0) {
    g.fillStyle(LATEX, 0.5);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillCircle(x + Math.cos(a) * 20, y + Math.sin(a) * 7, 7); }
  } else if (b === 1) {
    g.lineStyle(5, RUBBER, 0.85); g.strokeEllipse(x, y, 50, 18);
    g.lineStyle(2, RUBBER_SHEEN, 0.9); g.beginPath(); g.arc(x, y, 24, Math.PI * 1.1, Math.PI * 1.6, false); g.strokePath();
  } else {
    g.lineStyle(5, 0x6a6670, 0.9); g.strokeEllipse(x, y, 50, 18);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + 0.3, px = x + Math.cos(a) * 25, py = y + Math.sin(a) * 9;
      g.lineStyle(1.2, 0x1a1716, 1); g.lineBetween(px, py, px + Math.cos(a + 0.6) * 7, py + Math.sin(a + 0.6) * 4);
    }
  }
  const k = (time - c.crackAt) / 600;
  if (k >= 0 && k < 1) {
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63, r = 14 + k * 40;
      g.fillStyle(i % 2 ? 0x6a6670 : RUBBER, 1 - k);
      g.fillTriangle(x + Math.cos(a) * r, y - 20 + Math.sin(a) * r * 0.6, x + Math.cos(a) * r + 5, y - 20 + Math.sin(a) * r * 0.6 + 2, x + Math.cos(a) * r + 1, y - 20 + Math.sin(a) * r * 0.6 + 6);
    }
  }
}

/** A quench trough: a plank box of cold water, ripples, a dipper hooked on its rim. */
function drawTrough(g: G, t: { x: number; y: number; w: number; h: number }, time: number): void {
  g.fillStyle(0x3a2a1e, 1); g.fillRoundedRect(t.x - t.w / 2 - 6, t.y - t.h / 2 - 6, t.w + 12, t.h + 12, 4);
  for (let i = 0; i < 5; i++) { g.lineStyle(1, 0x241a12, 1); g.lineBetween(t.x - t.w / 2 - 6, t.y - t.h / 2 - 6 + i * ((t.h + 12) / 4), t.x - t.w / 2, t.y - t.h / 2 - 6 + i * ((t.h + 12) / 4)); }
  g.fillStyle(0x2a5a7a, 1); g.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
  for (let i = 0; i < 4; i++) {
    const ph = ((time / 1400 + i / 4) % 1);
    g.lineStyle(1, 0x9ad0ff, 0.6 * (1 - ph)); g.strokeEllipse(t.x - 30 + i * 22, t.y, 8 + ph * 30, 4 + ph * 10);
  }
  g.fillStyle(IRON, 1); g.fillCircle(t.x + t.w / 2 - 8, t.y - t.h / 2 - 2, 6);
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(t.x + t.w / 2 - 8, t.y - t.h / 2 - 2, t.x + t.w / 2 + 10, t.y - t.h / 2 - 16);
}

/** A steam-cure oven in the wall: brick surround, a riveted iron door with its locking wheel, a gauge, and the hinge it swings on. */
function drawOven(g: G, o: Oven, time: number): void {
  const ux = Math.cos(o.a), uy = Math.sin(o.a), nx = -uy, ny = ux;
  const P = (u: number, n: number) => ({ x: o.x + ux * u + nx * n, y: o.y + uy * u + ny * n });
  const brick = [P(-30, -48), P(4, -48), P(4, 48), P(-30, 48)];
  g.fillStyle(BRICK_DARK, 1); g.fillPoints(brick, true);
  for (let i = -3; i <= 3; i++) { const a = P(-30, i * 13), b = P(4, i * 13); g.lineStyle(1, BRICK, 1); g.lineBetween(a.x, a.y, b.x, b.y); }
  const busyNow = o.warnAt >= 0 && time < o.shutAt;
  const opening = busyNow && time < o.openAt;
  const open = busyNow && time >= o.openAt;
  const c = P(4, 0);
  g.fillStyle(open ? SULPHUR_DARK : 0x1a1716, 1); g.fillCircle(c.x, c.y, 34);
  if (open) glow(g, c.x, c.y, 50, SULPHUR, 0.06, 3);
  // The door: swung aside on its hinge when open.
  const dc = open ? P(16, 44) : P(8, 0);
  g.fillStyle(IRON, 1); g.fillCircle(dc.x, dc.y, open ? 26 : 32);
  g.fillStyle(IRON_LIT, 1); g.fillCircle(dc.x - 4, dc.y - 4, open ? 20 : 26);
  g.fillStyle(IRON, 1); g.fillCircle(dc.x, dc.y, open ? 17 : 22);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle(BRICK_LIT, 1); g.fillCircle(dc.x + Math.cos(a) * (open ? 23 : 29), dc.y + Math.sin(a) * (open ? 23 : 29), 1.6); }
  // Locking wheel — spinning fast as it unlatches.
  const spin = opening ? time / 50 : open ? 0.4 : 0;
  g.lineStyle(3, TOY_RED, 1); g.strokeCircle(dc.x, dc.y, open ? 11 : 14);
  for (let i = 0; i < 4; i++) { const a = spin + (i * Math.PI) / 2; g.lineBetween(dc.x, dc.y, dc.x + Math.cos(a) * (open ? 11 : 14), dc.y + Math.sin(a) * (open ? 11 : 14)); }
  g.fillStyle(lit(TOY_RED, 0.3), 1); g.fillCircle(dc.x, dc.y, 3);
  // Pressure gauge.
  const gp = P(-14, -36);
  g.fillStyle(LATEX_LIT, 1); g.fillCircle(gp.x, gp.y, 7);
  g.lineStyle(1, IRON, 1); g.strokeCircle(gp.x, gp.y, 7);
  const na = Math.PI * 0.8 + (busyNow ? 1.3 + Math.sin(time / 40) * 0.1 : 0.2);
  g.lineStyle(1.5, TOY_RED, 1); g.lineBetween(gp.x, gp.y, gp.x + Math.cos(na) * 6, gp.y + Math.sin(na) * 6);
  if (opening) {
    for (let i = 0; i < 4; i++) {
      const ph = ((time / 300 + i / 4) % 1), s = P(8 + ph * 18, (i - 1.5) * 18);
      g.fillStyle(0xe8e4c8, 0.4 * (1 - ph)); g.fillCircle(s.x, s.y - ph * 8, 4 + ph * 6);
    }
  }
}

/** A durometer: the rubber-hardness dial, banded raw / cured / past the cure, with its presser foot. */
function durometer(g: G, x: number, y: number, v: number, rim: number): void {
  g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 20);
  g.fillStyle(LATEX_LIT, 1); g.fillCircle(x, y, 16);
  const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
  const arc = (from: number, to: number, c: number) => { g.lineStyle(4, c, 1); g.beginPath(); g.arc(x, y, 12, a0 + span * from, a0 + span * to, false); g.strokePath(); };
  arc(0, RAW / 100, LATEX); arc(RAW / 100, BRITTLE / 100, RUBBER); arc(BRITTLE / 100, 1, 0x8a6a6a);
  const na = a0 + span * clamp(v / 100, 0, 1);
  g.lineStyle(2, TOY_RED, 1); g.lineBetween(x, y, x + Math.cos(na) * 13, y + Math.sin(na) * 13);
  g.fillStyle(IRON, 1); g.fillCircle(x, y, 2.5);
  g.lineStyle(1.5, rim, 1); g.strokeCircle(x, y, 20);
  g.fillStyle(IRON, 1); g.fillRect(x - 3, y + 20, 6, 6);
}

export const FALLEN_PAST_CURE: GimmickDef = {
  id: ID,
  rules: 'Oven steam cures you: raw is slow, cured is quick, past the cure blows bite and heavy ones crack you. Troughs quench. Strike a wheel to steam her.',
  make,
};
