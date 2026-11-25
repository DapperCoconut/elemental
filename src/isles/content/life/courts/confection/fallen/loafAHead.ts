import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, CHERRY, ICING, IRON, LEMON, SALT, SALT_DARK, SUGAR, SYRUP_DEEP, dist, sugarLoaf } from '../art';
import { alive, clamp } from './util';

/**
 * A Loaf a Head — Tallyman Pomfrey Dredge, who in the King's telling sat at the Sweet-Tax counter
 * with the tally-sticks and rang the bell on whoever came up short.
 *
 * One sugar loaf in its blue paper lies somewhere on the floor. Walk over it and you carry it
 * (it rides on your shoulder). The tally-bell rings on a clock: whoever is holding no loaf when it
 * rings is *short* — a hard hit and a moment held at the counter; the holder pays it in, and a
 * fresh loaf is set down elsewhere. A carried loaf is not safe: take a real blow from the other
 * fighter and it is knocked out of your arms and rolls away.
 *
 * Halfway, the tally turns crooked: the bell comes quicker, and a second loaf in *grey* paper is
 * set down beside the true one — chalk under a skin of sugar. Carry that to the bell and you are
 * short twice over. The exploit is the whole fight: keep the loaf and the bell hurts Dredge, not
 * you; knock his loaf loose just before it rings. The bot runs for the loaf, and runs from you
 * when it has one.
 */

const ID = fallenId('confection', 'loaf-a-head');
const BELL_MS = 8000;
const BELL_TURN_MS = 6400;
const PICK_R = 32;
const KNOCK_MIN = 5;
const LOAF_H = 30;
const SHORT_PLAYER = 20;
const SHORT_NPC = 42;
const FRAUD_MULT = 2;

/** A loaf on the floor or in someone's arms. `false` loaves are chalk in grey paper. */
interface Loaf { x: number; y: number; holder: Fighter | null; real: boolean; bornAt: number; noPick: Fighter | null; noPickUntil: number; vx: number; vy: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let loaves: Loaf[] = [];
  let bellAt = 0;
  let crooked = false;
  let bellHurting = false;
  let rangAt = -1e9;
  const tallies = { player: 0, npc: 0 };
  const shortFlash = new Map<Fighter, number>();
  let lastT = 0;

  /** Somewhere open, clear of both fighters and any other loaf. */
  const spot = (): Pt => {
    let best: Pt = { x: W / 2, y: (top + H) / 2 }, bestS = -Infinity;
    for (let i = 0; i < 14; i++) {
      const p = { x: 90 + rng() * (W - 180), y: top + 70 + rng() * (H - top - 130) };
      const near = Math.min(dist(p.x, p.y, player.x, player.y), dist(p.x, p.y, npc.x, npc.y));
      const crowd = loaves.reduce((m, l) => Math.min(m, dist(p.x, p.y, l.x, l.y)), 999);
      const s = -Math.abs(near - 260) + Math.min(crowd, 200);
      if (s > bestS) { bestS = s; best = p; }
    }
    return best;
  };
  const setDown = (real: boolean, time: number, at?: Pt): void => {
    const p = at ?? spot();
    loaves.push({ x: p.x, y: p.y, holder: null, real, bornAt: time, noPick: null, noPickUntil: 0, vx: 0, vy: 0 });
  };
  const held = (f: Fighter): Loaf | undefined => loaves.find((l) => l.holder === f);

  /** A blow knocks the loaf out of `f`'s arms, rolling away from whoever struck. */
  const knock = (f: Fighter, time: number): void => {
    const l = held(f);
    if (!l) return;
    const o = f === player ? npc : player;
    const a = Math.atan2(f.y - o.y, f.x - o.x) + (rng() - 0.5) * 0.8;
    l.holder = null; l.x = f.x; l.y = f.y;
    l.vx = Math.cos(a) * 260; l.vy = Math.sin(a) * 260;
    l.noPick = f; l.noPickUntil = time + 700;
    ctx.float(f.x, f.y - 60, 'DROPPED', '#d8e4ff');
    ctx.sfx('boing');
  };

  /** The tally-bell rings: the short pay in pain, the holders pay in sugar. */
  const ring = (time: number): void => {
    rangAt = time;
    ctx.sfx('judgement');
    bellHurting = true;
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const l = held(f);
      const short = !l || !l.real;
      if (!short) {
        tallies[f === player ? 'player' : 'npc']++;
        ctx.float(f.x, f.y - 64, 'PAID', '#9ad0ff');
        continue;
      }
      const mult = l && !l.real ? FRAUD_MULT : 1;
      shortFlash.set(f, time);
      if (f === player) tk.hitPlayer(SHORT_PLAYER * mult, f.x, f.y);
      else ctx.hit(npc, SHORT_NPC * mult, f.x, f.y);
      ctx.root(f, 900);
      ctx.float(f.x, f.y - 64, mult > 1 ? 'CHALK! SHORT TWICE' : 'SHORT', '#ff8a8a');
    }
    bellHurting = false;
    // Paid and fraudulent loaves both go into the counter; new ones go down.
    loaves = loaves.filter((l) => !l.holder);
    const realLeft = loaves.some((l) => l.real);
    if (!realLeft) setDown(true, time + 600);
    if (crooked && !loaves.some((l) => !l.real)) setDown(false, time + 600);
    bellAt = time + tk.warn(crooked ? BELL_TURN_MS : BELL_MS);
  };

  return {
    update(time, dt) {
      lastT = time;
      if (!bellAt) { bellAt = time + tk.warn(BELL_MS); setDown(true, time); }
      if (!crooked && npc.hp < npc.maxHp * 0.5) {
        crooked = true;
        ctx.banner('THE TALLY TURNS CROOKED — MIND THE GREY PAPER', '#d8e4ff');
        ctx.sfx('curse-cast');
        const real = loaves.find((l) => l.real && !l.holder);
        const at = real ? { x: clamp(real.x + 90, 80, W - 80), y: real.y } : undefined;
        setDown(false, time, at);
        bellAt = Math.min(bellAt, time + tk.warn(BELL_TURN_MS));
      }
      for (const l of loaves) {
        if (l.holder) {
          if (!alive(l.holder)) { l.holder = null; continue; }
          l.x = l.holder.x; l.y = l.holder.y;
          continue;
        }
        // A knocked loaf rolls to a stop.
        if (l.vx || l.vy) {
          l.x = clamp(l.x + l.vx * dt, 60, W - 60); l.y = clamp(l.y + l.vy * dt, top + 50, H - 50);
          const k = Math.pow(0.04, dt);
          l.vx *= k; l.vy *= k;
          if (Math.hypot(l.vx, l.vy) < 12) { l.vx = 0; l.vy = 0; }
        }
        if (time < l.bornAt + 450) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || held(f)) continue;
          if (l.noPick === f && time < l.noPickUntil) continue;
          if (dist(f.x, f.y, l.x, l.y) < PICK_R + 12) {
            l.holder = f;
            ctx.sfx('crystal-chime');
            if (f === player) ctx.float(f.x, f.y - 60, l.real ? 'LOAF' : 'GREY PAPER…', l.real ? '#9ad0ff' : '#c8c8c0');
            break;
          }
        }
      }
      if (time >= bellAt) ring(time);
      else if (bellAt - time < 1600 && Math.floor((bellAt - time) / 400) !== Math.floor((bellAt - time + dt * 1000) / 400)) ctx.sfx('countdown-tick');
    },

    onPlayerHurt(amount) { if (!bellHurting && amount >= KNOCK_MIN) knock(player, lastT); },
    onNpcHurt(amount) { if (!bellHurting && amount >= KNOCK_MIN) knock(npc, lastT); },

    playerSpeedMult() { return crooked && held(player) ? 0.88 : 1; },
    npcSpeedMult() { return crooked && held(npc) ? 0.88 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const mine = held(npc);
      if (mine && mine.real) {
        // Run from the player, toward the far side of the floor.
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: tk.clampX(npc.x + Math.cos(a) * 160, 70), y: tk.clampY(npc.y + Math.sin(a) * 160, 70) };
      }
      const free = loaves.filter((l) => l.real && !l.holder && !(l.noPick === npc && lastT < l.noPickUntil));
      if (free.length) {
        free.sort((a, b) => dist(npc.x, npc.y, a.x, a.y) - dist(npc.x, npc.y, b.x, b.y));
        return { x: free[0].x, y: free[0].y };
      }
      return null; // the player has it: go and take it off them
    },

    drawGround(g, time) {
      drawCounter(g, W, top, time - rangAt);
      for (const l of loaves) {
        if (l.holder) continue;
        const k = clamp((time - l.bornAt) / 450, 0, 1);
        drawFloorLoaf(g, l, k, time);
      }
      for (const [f, at] of shortFlash) {
        const k = 1 - (time - at) / 900;
        if (k <= 0) continue;
        drawShortStamp(g, f.x, f.y + 14, k);
      }
    },

    drawAir(g, time) {
      for (const l of loaves) {
        if (!l.holder) continue;
        const bob = Math.sin(time / 140) * 2;
        const x = l.holder.x + 16, y = l.holder.y - 34 + bob;
        sugarLoaf(g, x, y, LOAF_H * 0.8, l.real ? 0x3a5ab0 : SALT_DARK);
        if (!l.real) chalkDust(g, x, y - 8, time);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, cy = top + 22;
      const span = crooked ? BELL_TURN_MS : BELL_MS;
      const k = clamp(1 - (bellAt - time) / tk.warn(span), 0, 1);
      drawBell(g, cx, cy, k, time - rangAt, time);
      drawTally(g, cx - 64, cy, tallies.player, 0x9ad0ff);
      drawTally(g, cx + 44, cy, tallies.npc, 0xffa040);
    },
  };
}

/** The Sweet-Tax counter painted along the north edge: a plank top, the brass scales, ledgers. */
function drawCounter(g: G, W: number, top: number, sinceRing: number): void {
  const y = top + 4, x0 = W / 2 - 150, x1 = W / 2 + 150;
  shadow(g, W / 2, y + 30, 320, 20, 0.3);
  g.fillStyle(SYRUP_DEEP, 1); g.fillRect(x0, y, x1 - x0, 26);
  g.fillStyle(lit(SYRUP_DEEP, 0.2), 1); g.fillRect(x0, y, x1 - x0, 6);
  for (let i = 0; i < 6; i++) { g.lineStyle(1, dim(SYRUP_DEEP, 0.4), 1); g.lineBetween(x0 + i * 60, y + 6, x0 + i * 60, y + 26); }
  // The scales, pan dipping toward the loaf when it rings.
  const tip = sinceRing < 900 ? Math.sin(sinceRing / 90) * 0.25 * (1 - sinceRing / 900) : 0.08;
  const sx = W / 2, sy = y + 2;
  g.lineStyle(3, BRASS, 1); g.lineBetween(sx, sy, sx, sy - 22);
  const ax = Math.cos(tip) * 34, ay = Math.sin(tip) * 34;
  g.lineBetween(sx - ax, sy - 22 - ay, sx + ax, sy - 22 + ay);
  for (const s of [-1, 1]) {
    const px = sx + ax * s, py = sy - 22 + ay * s;
    g.lineStyle(1, BRASS, 1); g.lineBetween(px, py, px - 8, py + 10); g.lineBetween(px, py, px + 8, py + 10);
    g.fillStyle(BRASS, 1); g.fillEllipse(px, py + 11, 20, 5);
  }
  sugarLoaf(g, sx + ax + 1, sy - 22 + ay + 9, 10);
  // Ledgers and a pot of tally-sticks.
  for (const lx of [x0 + 24, x1 - 40]) {
    g.fillStyle(0x6a2a2a, 1); g.fillRect(lx, y + 8, 22, 14);
    g.fillStyle(ICING, 1); g.fillRect(lx + 2, y + 9, 18, 3);
  }
  g.fillStyle(IRON, 1); g.fillRect(x0 + 70, y + 4, 12, 16);
  for (let i = 0; i < 5; i++) { g.lineStyle(1.5, 0xd8b888, 1); g.lineBetween(x0 + 72 + i * 2, y + 4, x0 + 70 + i * 3, y - 8); }
}

/** A loaf set down on the floor: settling in, with a ring chalked round it and a paper tag. */
function drawFloorLoaf(g: G, l: Loaf, k: number, time: number): void {
  g.lineStyle(1.5, l.real ? 0x9ad0ff : SALT, 0.5 * k);
  g.strokeCircle(l.x, l.y + 4, PICK_R + 4 + Math.sin(time / 300) * 2);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + time / 2000;
    g.lineStyle(2, ICING, 0.35 * k);
    g.lineBetween(l.x + Math.cos(a) * (PICK_R + 8), l.y + 4 + Math.sin(a) * (PICK_R + 8) * 0.6, l.x + Math.cos(a) * (PICK_R + 14), l.y + 4 + Math.sin(a) * (PICK_R + 14) * 0.6);
  }
  const drop = (1 - k) * 60;
  sugarLoaf(g, l.x, l.y + 6 - drop, LOAF_H, l.real ? 0x3a5ab0 : SALT_DARK, k);
  // The tag on its string: a crown stamp on the true loaf, a smudge on the chalk one.
  const tx = l.x + 12, ty = l.y - 6 - drop;
  g.lineStyle(1, 0xe8d8b0, k); g.lineBetween(l.x + 4, ty - 4, tx, ty);
  g.fillStyle(0xf0e6cc, k); g.fillRect(tx, ty - 4, 10, 8);
  if (l.real) { g.fillStyle(CHERRY, k); g.fillTriangle(tx + 2, ty + 2, tx + 5, ty - 3, tx + 8, ty + 2); }
  else { g.fillStyle(SALT, k); g.fillCircle(tx + 5, ty, 3); }
  if (!l.real) chalkDust(g, l.x, l.y - 6 - drop, time);
  else glow(g, l.x, l.y - 10, 26, SUGAR, 0.04 * k, 2);
}

/** A thin puff of chalk off a false loaf — the tell, if you are looking. */
function chalkDust(g: G, x: number, y: number, time: number): void {
  for (let i = 0; i < 5; i++) {
    const ph = ((time / 1400 + i / 5) % 1);
    g.fillStyle(SALT, 0.45 * (1 - ph));
    g.fillCircle(x + Math.sin(i * 2.1 + time / 500) * 6, y - ph * 22, 1.5 + ph * 3);
  }
}

/** "SHORT" stamped in red on the floor under whoever was caught empty-handed. */
function drawShortStamp(g: G, x: number, y: number, k: number): void {
  g.lineStyle(3, CHERRY, k * 0.8); g.strokeRoundedRect(x - 30, y - 10, 60, 20, 3);
  g.lineStyle(1.5, CHERRY, k * 0.6); g.strokeRoundedRect(x - 26, y - 7, 52, 14, 2);
  for (let i = 0; i < 4; i++) { g.lineStyle(2.5, CHERRY, k * 0.7); g.lineBetween(x - 18 + i * 12, y - 4, x - 12 + i * 12, y + 4); }
}

/** The tally-bell: a brass handbell whose rim fills as the count runs down, swinging when it rings. */
function drawBell(g: G, x: number, y: number, k: number, sinceRing: number, time: number): void {
  const swing = sinceRing < 800 ? Math.sin(sinceRing / 50) * 0.5 * (1 - sinceRing / 800) : k > 0.8 ? Math.sin(time / 40) * 0.12 * (k - 0.8) * 5 : 0;
  g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 19);
  g.lineStyle(3, LEMON, 0.9);
  g.beginPath(); g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
  const c = Math.cos(swing), s = Math.sin(swing);
  const P = (u: number, v: number) => ({ x: x + u * c - v * s, y: y - 8 + u * s + v * c });
  const pts = [P(-3, -2), P(3, -2), P(6, 4), P(10, 12), P(-10, 12), P(-6, 4)];
  g.fillStyle(dim(BRASS, 0.3), 1); g.fillPoints(pts, true);
  g.fillStyle(BRASS, 1); g.fillPoints([P(-2, -1), P(2, -1), P(5, 4), P(8, 11), P(-8, 11), P(-5, 4)], true);
  const h = P(0, -6); g.fillStyle(SYRUP_DEEP, 1); g.fillRoundedRect(h.x - 2, h.y - 6, 4, 8, 1);
  const cl = P(swing * 8, 15); g.fillStyle(IRON, 1); g.fillCircle(cl.x, cl.y, 2.5);
  if (sinceRing < 500) { g.lineStyle(2, LEMON, 1 - sinceRing / 500); g.strokeCircle(x, y, 20 + sinceRing / 20); }
}

/** Tally-sticks for loaves paid in: notches in fives, a slash through each gate. */
function drawTally(g: G, x: number, y: number, n: number, color: number): void {
  g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 4, y - 12, 28, 24, 4);
  g.fillStyle(0xd8b888, 1); g.fillRect(x, y - 2, 20, 4);
  const show = Math.min(n, 10);
  for (let i = 0; i < show; i++) {
    const gate = Math.floor(i / 5), j = i % 5;
    const nx = x + 2 + gate * 10 + j * 2;
    g.lineStyle(1.2, color, 1);
    if (j < 4) g.lineBetween(nx, y - 8, nx, y + 8);
    else g.lineBetween(nx - 9, y + 7, nx, y - 7);
  }
}

export const FALLEN_LOAF_A_HEAD: GimmickDef = {
  id: ID,
  rules: 'Carry the one sugar loaf: when the tally-bell rings, whoever holds none is short. A blow knocks it loose. Halfway, beware grey-paper chalk loaves.',
  make,
};
