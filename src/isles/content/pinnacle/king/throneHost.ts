import type Phaser from 'phaser';
import type { SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import type { Husk } from '../../../../invasion/Husk';
import { OBS, seam } from '../../../art/PinnacleArt';
import {
  BACK_DOORS, KIND_TINT, SIDE_DOORS, domeAzimuth, doorStep, drawAssassin, drawHound, drawWarrior, drawWreck,
} from './throneArt';
import {
  AEGIS, HALL, PLAYER_R, SEAT, aegisHeld, at, clampN, courtOf, dist, hallBanner, line, poly, rayToEdge, segDist, stagecraft,
  turnTo, wrapA, type Court, type Door, type Gfx, type Kind, type Soldier,
} from './throneCourt';

/**
 * THE HOST — the heart of Act I. The King does not rise; he sends his Host down the hall in
 * named waves, and while any of it stands the Aegis holds and he takes almost nothing. Break a
 * wave and the Aegis cracks: a window where the throne is open and every blow lands harder.
 *
 *  • Warriors — tower shields. Shots striking the shield's face are turned (blocked); blows of
 *    any kind from in front land at a third; from the flank or behind they land hard. The shield
 *    turns slower than you can circle. Get close and the wall bashes.
 *  • Assassins — fragile and fast. They circle, vanish, and reappear BEHIND you (behind the way
 *    you are moving — or away from the throne if you stand still), mark their stab on the floor,
 *    and lunge along it. Sidestep the mark; then they are spent and open.
 *  • Beasts — obsidian hounds. They mark a lane through you (tracking, then locked), run it,
 *    and shed glass caltrops behind them. A charge tramples any of the Host in its lane — bait
 *    the kennel through the shieldwall. A hound that runs into a wall is stunned for longer.
 *
 * Every soldier is a real husk (`tk.spawnAdd({ hidden: true })`): every element kit can hit,
 * burn, freeze, stun or auto-aim it. This signature runs them all (the stock brain is not used:
 * each is spawned speed-for-status only, harmless by itself) and draws their bodies.
 */

const AEGIS_HELD = 0.12;
const DOOR_MS = 950;
const MEND_MS = 1500;
const MAX_ALIVE = 9;

interface WaveDef { name: string; sub: string | null; w: number; a: number; b: number }
const ROUND_I: WaveDef[] = [
  { name: 'THE SHIELDWALL', sub: 'Shields turn shots and blunt blows. Strike from the flank.', w: 4, a: 0, b: 0 },
  { name: 'THE KNIVES', sub: 'They come from behind you. Step off the mark.', w: 0, a: 3, b: 0 },
  { name: 'THE KENNEL', sub: 'They run the lane they mark — and trample anything in it.', w: 0, a: 0, b: 3 },
  { name: 'THE HOST', sub: 'All of it. Break it, and the Aegis breaks.', w: 2, a: 2, b: 1 },
];
const ROUND_II: WaveDef[] = [
  { name: 'THE IRON RANK', sub: null, w: 5, a: 0, b: 1 },
  { name: 'THE QUIET KNIVES', sub: null, w: 1, a: 4, b: 0 },
  { name: 'THE WHOLE KENNEL', sub: null, w: 0, a: 1, b: 4 },
  { name: 'THE HOST ENTIRE', sub: null, w: 3, a: 2, b: 2 },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** Wave `i` (0-based, endless): its name, its ranks, and the tier that hardens it. */
function waveDef(i: number): WaveDef & { tier: number } {
  const tier = Math.floor(i / 4);
  const base = (tier === 0 ? ROUND_I : ROUND_II)[i % 4];
  if (tier < 2) return { ...base, tier };
  const more = Math.min(2, tier - 1);
  const grow = (n: number) => (n > 0 ? n + (base.w + base.a + base.b + more <= 8 ? 1 : 0) : 0);
  return { name: `${base.name} · ${ROMAN[Math.min(ROMAN.length - 1, tier)]}`, sub: null, w: grow(base.w), a: grow(base.a), b: grow(base.b), tier };
}

const STATS: Record<Kind, { hp: number; speed: number; size: number }> = {
  warrior: { hp: 150, speed: 34, size: 1.3 },
  assassin: { hp: 60, speed: 150, size: 0.9 },
  beast: { hp: 95, speed: 125, size: 1.15 },
};

const WARRIOR = { bashRange: 86, bashCone: 0.85, bashWarn: 560, bashCd: 1700, dmg: 13, front: 0.35, flank: 1.35, turn: 0.9, blockR: 34 };
const KNIFE = { orbit: 230, vanishMs: 360, goneMs: 520, markWarn: 640, stabMs: 170, stabLen: 120, spentMs: 1300, dmg: 15, halfW: 16 };
const HOUND = { prowlDist: 270, aimWarn: 820, speed: 640, maxRun: 760, skidMs: 1000, wallMs: 1700, dmg: 15, trample: 40, shardEvery: 30 };
const SHARD = { lifeMs: 2600, r: 9, dmg: 3, tickMs: 450 };

/** Spawn one of the Host at a door. */
function spawnSoldier(tk: BossToolkit, c: Court, kind: Kind, door: Door, slot: number, tier: number, time: number): void {
  const step = doorStep(door);
  const st = STATS[kind];
  const scale = (1 + 0.22 * tier) * (tk.hard ? 1.2 : 1);
  let husk: Husk | null = null;
  try {
    husk = tk.spawnAdd({
      x: step.x, y: step.y, hp: Math.round(st.hp * scale), speed: st.speed * (1 + 0.06 * tier), damage: 0,
      behavior: 'melee', size: st.size, hidden: true, biteMs: 99999, maxAlive: MAX_ALIVE,
    });
  } catch (e) { console.error('[throne] spawn', e); }
  if (!husk) return;
  const p = tk.player;
  c.soldiers.push({
    id: c.nextId++, kind, husk, face: Math.atan2(p.y - step.y, p.x - step.x),
    st: kind === 'warrior' ? 'march' : kind === 'assassin' ? 'stalk' : 'prowl',
    stAt: time, stUntil: time + (kind === 'assassin' ? 1300 + Math.random() * 900 : 800 + Math.random() * 700),
    slot: kind === 'assassin' ? (slot % 2 ? 1 : -1) : slot, walk: 0,
    ax: step.x, ay: step.y, aa: Math.atan2(step.y - p.y, step.x - p.x), tx: step.x, ty: step.y,
    hit: false, trampled: [], nextAct: time + 900, hurtAt: 0, lastHp: husk.hp, shed: 0, walled: false, born: time,
  });
}

/** Queue soldiers at doors (they glow, a shape steps out, then they are real). */
function queue(c: Court, kinds: Kind[], time: number, delay: number): void {
  let w = 0, a = 0, b = 0;
  kinds.forEach((kind, i) => {
    let door: Door;
    if (kind === 'warrior') { door = w < 4 ? BACK_DOORS[(w * 2 + (w > 1 ? 1 : 0)) % 4] : SIDE_DOORS[(w - 4) % 2]; w++; }
    else if (kind === 'assassin') { door = SIDE_DOORS[a % 4]; a++; }
    else { door = SIDE_DOORS[(2 + b) % 4]; b++; }
    c.pending.push({ door, kind, from: time, at: time + delay + i * 170, slot: i });
  });
}

/** Send the next wave: banner it, open its doors. */
function muster(tk: BossToolkit, c: Court, time: number, first: boolean): void {
  const w = waveDef(c.wave);
  c.stage = 'muster';
  c.stageAt = time;
  const kinds: Kind[] = [
    ...Array.from({ length: w.w }, (): Kind => 'warrior'),
    ...Array.from({ length: w.a }, (): Kind => 'assassin'),
    ...Array.from({ length: w.b }, (): Kind => 'beast'),
  ];
  queue(c, kinds, time, first ? 150 : DOOR_MS);
  // The first rank already stepped out during the entry cinematic: they arrive all but formed.
  if (first) for (const q of c.pending) q.from = time - 2000;
  hallBanner(tk, w.name, w.sub);
  tk.sfx('drum-hit');
  tk.sfx('stone-rise');
}

/**
 * THE LEVY's half of the Host: up to `n` more of the wave's own kinds out of the walls. False
 * when no wave is standing (the Aegis is cracked or mending) or the hall is full.
 */
export function reinforce(tk: BossToolkit, n: number): boolean {
  const c = courtOf(tk);
  if (c.stage !== 'battle' && c.stage !== 'muster') return false;
  const room = MAX_ALIVE - c.soldiers.length - c.pending.length;
  if (room <= 0) return false;
  const w = waveDef(c.wave);
  const pool: Kind[] = [];
  for (let i = 0; i < w.w; i++) pool.push('warrior');
  for (let i = 0; i < w.a; i++) pool.push('assassin');
  for (let i = 0; i < w.b; i++) pool.push('beast');
  const kinds: Kind[] = [];
  for (let i = 0; i < Math.min(n, room); i++) kinds.push(pool[Math.floor(Math.random() * pool.length)] ?? 'warrior');
  // Reinforcements come from the side walls, near the player's half of the hall.
  const now = tk.now;
  kinds.forEach((kind, i) => {
    const doors = kind === 'warrior' ? BACK_DOORS : SIDE_DOORS;
    const door = doors[Math.floor(Math.random() * doors.length)];
    c.pending.push({ door, kind, from: now, at: now + DOOR_MS + i * 200, slot: 10 + i });
  });
  return true;
}

/** Move a soldier bodily (clamped to the hall). */
function move(s: Soldier, dx: number, dy: number): void {
  const x = clampN(s.husk.x + dx, HALL.l, HALL.r);
  const y = clampN(s.husk.y + dy, HALL.t, HALL.b);
  s.husk.setPosition(x, y);
}

/** A soldier's footing speed this frame: 0 while frozen / stunned, slowed by every slow. */
function footing(s: Soldier, time: number, dt: number): number {
  let m = 1;
  try { m = s.husk.tickStatus(time, dt * 1000); } catch { m = 1; }
  // Knockbacks are spent, not kept: the brain that would zero a husk's velocity is not running.
  const body = s.husk.body as Phaser.Physics.Arcade.Body | null;
  if (body && body.velocity) { const d = Math.exp(-9 * dt); body.velocity.x *= d; body.velocity.y *= d; }
  return Number.isFinite(m) ? clampN(m, 0, 2) : 1;
}

const enter = (s: Soldier, st: Soldier['st'], time: number, ms: number): void => { s.st = st; s.stAt = time; s.stUntil = time + ms; };

// ── The three minds ─────────────────────────────────────────────────

function updateWarrior(tk: BossToolkit, c: Court, s: Soldier, time: number, dt: number, mult: number, marked: boolean): void {
  const p = tk.player, h = s.husk;
  const toP = Math.atan2(p.y - h.y, p.x - h.x);
  const d = dist(p.x, p.y, h.x, h.y);
  if (mult > 0) s.face = turnTo(s.face, toP, WARRIOR.turn * (marked ? 1.5 : 1) * dt);
  const inFront = Math.abs(wrapA(toP - s.face)) < 1.0;
  h.bossSigIncomingMult = inFront ? WARRIOR.front : WARRIOR.flank;

  if (s.st === 'bash') {
    if (mult === 0) { enter(s, 'march', time, 0); s.nextAct = time + 900; return; }
    if (time >= s.stUntil) {
      move(s, Math.cos(s.aa) * 18, Math.sin(s.aa) * 18);
      const a2 = Math.atan2(p.y - h.y, p.x - h.x);
      if (p.active && dist(p.x, p.y, h.x, h.y) < WARRIOR.bashRange + 10 && Math.abs(wrapA(a2 - s.aa)) < WARRIOR.bashCone) {
        tk.hitPlayer(WARRIOR.dmg, p.x, p.y);
        tk.slowPlayer(0.55, 700);
        tk.sfx('hit-heavy');
      } else tk.sfx('whoosh');
      enter(s, 'march', time, 0);
      s.nextAct = time + WARRIOR.bashCd;
    }
  } else {
    // The wall: each warrior holds its place in a line across the hall, centred on the player,
    // and steps down it toward them. Get behind the line and they turn and come straight on.
    const rank = c.soldiers.filter((o) => o.kind === 'warrior').sort((a, b) => a.slot - b.slot);
    const idx = rank.indexOf(s), n = rank.length;
    const behind = p.y < h.y - 12;
    const tx = behind ? p.x : clampN(p.x + (idx - (n - 1) / 2) * 72, HALL.l, HALL.r);
    const ty = behind ? p.y : Math.max(HALL.t, p.y - 66);
    const td = dist(tx, ty, h.x, h.y);
    const spd = STATS.warrior.speed * mult * (marked ? 1.7 : 1);
    if (td > 6 && spd > 0) {
      const step = Math.min(td, spd * dt);
      move(s, (tx - h.x) / td * step, (ty - h.y) / td * step);
      s.walk += step * 0.18;
    }
    for (const o of rank) {
      if (o === s) continue;
      const od = dist(o.husk.x, o.husk.y, h.x, h.y);
      if (od < 58 && od > 0.1) move(s, (h.x - o.husk.x) / od * 30 * dt, (h.y - o.husk.y) / od * 30 * dt);
    }
    if (mult > 0 && d < WARRIOR.bashRange && Math.abs(wrapA(toP - s.face)) < 0.8 && time >= s.nextAct) {
      enter(s, 'bash', time, tk.warn(WARRIOR.bashWarn));
      s.aa = s.face;
      tk.sfx('clang');
    }
  }

  // The shield's face: shots that strike it are turned.
  const sx = h.x + Math.cos(s.face) * 16, sy = h.y + Math.sin(s.face) * 12 - 8;
  for (const sh of tk.shotsNear(sx, sy, WARRIOR.blockR)) {
    if (sh.owner !== 'player') continue;
    if ((sh.x - h.x) * Math.cos(s.face) + (sh.y - h.y) * Math.sin(s.face) < 2) continue;
    sh.block();
    c.sparks.push({ x: sh.x, y: sh.y, at: time });
    if (time - c.lastBlockSfxAt > 110) { c.lastBlockSfxAt = time; tk.sfx('shield-block'); }
  }
}

function updateAssassin(tk: BossToolkit, c: Court, s: Soldier, time: number, dt: number, mult: number, marked: boolean, knivesOut: number, maxKnives: number): void {
  const p = tk.player, h = s.husk;
  h.bossSigIncomingMult = s.st === 'spent' ? 1.5 : 1;
  switch (s.st) {
    case 'stalk': {
      h.isInvincible = false;
      s.aa += s.slot * 0.62 * dt;
      const tx = clampN(p.x + Math.cos(s.aa) * KNIFE.orbit, HALL.l, HALL.r);
      const ty = clampN(p.y + Math.sin(s.aa) * KNIFE.orbit * 0.8, HALL.t, HALL.b);
      const td = dist(tx, ty, h.x, h.y);
      const step = Math.min(td, STATS.assassin.speed * mult * dt);
      if (td > 2) { move(s, (tx - h.x) / td * step, (ty - h.y) / td * step); s.walk += step * 0.25; }
      s.face = Math.atan2(p.y - h.y, p.x - h.x);
      if (mult > 0 && (time >= s.stUntil || marked) && knivesOut < maxKnives) {
        enter(s, 'vanish', time, KNIFE.vanishMs);
        h.isInvincible = true;
        tk.sfx('smoke');
      }
      break;
    }
    case 'vanish':
      if (time >= s.stUntil) enter(s, 'gone', time, KNIFE.goneMs);
      break;
    case 'gone': {
      if (time < s.stUntil) break;
      // Behind: against the way the player is moving; standing still, away from the throne.
      const sp = Math.hypot(c.pvx, c.pvy);
      let back = sp > 40 ? Math.atan2(-c.pvy, -c.pvx) : Math.atan2(p.y - SEAT.y, p.x - SEAT.x);
      let ax = p.x + Math.cos(back) * 78, ay = p.y + Math.sin(back) * 78;
      if (ax < HALL.l || ax > HALL.r || ay < HALL.t || ay > HALL.b) {
        back += Math.PI;
        ax = p.x + Math.cos(back) * 78; ay = p.y + Math.sin(back) * 78;
      }
      ax = clampN(ax, HALL.l, HALL.r); ay = clampN(ay, HALL.t, HALL.b);
      h.setPosition(ax, ay);
      s.ax = ax; s.ay = ay;
      s.aa = Math.atan2(p.y - ay, p.x - ax);
      s.face = s.aa;
      enter(s, 'mark', time, tk.warn(KNIFE.markWarn));
      tk.sfx('blink');
      break;
    }
    case 'mark': {
      // Solid again a third of the way in — turn and hit it and the stab is never thrown.
      if (time > s.stAt + (s.stUntil - s.stAt) * 0.35) h.isInvincible = false;
      if (mult === 0) { h.isInvincible = false; enter(s, 'spent', time, KNIFE.spentMs); break; }
      if (time >= s.stUntil) {
        h.isInvincible = false;
        s.tx = h.x; s.ty = h.y; s.hit = false;
        enter(s, 'stab', time, KNIFE.stabMs);
        tk.sfx('stab');
      }
      break;
    }
    case 'stab': {
      const k = clampN((time - s.stAt) / KNIFE.stabMs, 0, 1);
      h.setPosition(clampN(s.tx + Math.cos(s.aa) * KNIFE.stabLen * k, HALL.l, HALL.r), clampN(s.ty + Math.sin(s.aa) * KNIFE.stabLen * k, HALL.t, HALL.b));
      if (!s.hit && p.active && segDist(p.x, p.y, s.tx, s.ty, h.x, h.y) < KNIFE.halfW + PLAYER_R) {
        s.hit = true;
        tk.hitPlayer(KNIFE.dmg, p.x, p.y);
        tk.sfx('slash');
      }
      if (time >= s.stUntil) enter(s, 'spent', time, KNIFE.spentMs);
      break;
    }
    case 'spent':
      h.isInvincible = false;
      if (time >= s.stUntil && mult > 0) {
        enter(s, 'stalk', time, 1700 + Math.random() * 900);
        s.aa = Math.atan2(h.y - p.y, h.x - p.x);
      }
      break;
    default: break;
  }
}

function updateBeast(tk: BossToolkit, c: Court, s: Soldier, time: number, dt: number, mult: number, marked: boolean, houndsOut: number): void {
  const p = tk.player, h = s.husk;
  h.bossSigIncomingMult = s.st === 'skid' ? 1.4 : 1;
  switch (s.st) {
    case 'prowl': {
      const tx = clampN(p.x + Math.cos(s.aa) * HOUND.prowlDist, HALL.l, HALL.r);
      const ty = clampN(p.y + Math.sin(s.aa) * HOUND.prowlDist * 0.75, HALL.t + 20, HALL.b);
      const td = dist(tx, ty, h.x, h.y);
      const step = Math.min(td, STATS.beast.speed * mult * dt);
      if (td > 3) {
        move(s, (tx - h.x) / td * step, (ty - h.y) / td * step);
        s.face = turnTo(s.face, Math.atan2(ty - h.y, tx - h.x), 6 * dt);
        s.walk += step * 0.2;
      } else s.face = turnTo(s.face, Math.atan2(p.y - h.y, p.x - h.x), 4 * dt);
      if (mult > 0 && (time >= s.stUntil || marked) && houndsOut < (marked ? 3 : 2)) {
        enter(s, 'aim', time, tk.warn(HOUND.aimWarn));
        s.aa = Math.atan2(p.y - h.y, p.x - h.x);
        tk.sfx('roar');
      }
      break;
    }
    case 'aim': {
      if (mult === 0) { enter(s, 'skid', time, HOUND.skidMs); break; }
      // Tracks for the first 60 %, then the lane is set.
      if (time < s.stAt + (s.stUntil - s.stAt) * 0.6) s.aa = turnTo(s.aa, Math.atan2(p.y - h.y, p.x - h.x), 3 * dt);
      s.face = s.aa;
      const end = rayToEdge(h.x, h.y, s.aa, HALL.l, HALL.t, HALL.r, HALL.b);
      const run = Math.min(end.d, HOUND.maxRun);
      s.tx = h.x + Math.cos(s.aa) * run; s.ty = h.y + Math.sin(s.aa) * run;
      s.walled = end.d <= HOUND.maxRun;
      if (time >= s.stUntil) {
        s.ax = h.x; s.ay = h.y; s.hit = false; s.trampled = []; s.shed = 0;
        enter(s, 'charge', time, 99999);
        tk.sfx('dash');
      }
      break;
    }
    case 'charge': {
      if (mult === 0) { enter(s, 'skid', time, HOUND.skidMs); break; }
      const total = dist(s.ax, s.ay, s.tx, s.ty);
      const done = dist(s.ax, s.ay, h.x, h.y);
      const step = Math.min(HOUND.speed * Math.max(0.5, mult) * dt, Math.max(0, total - done));
      const ox = h.x, oy = h.y;
      move(s, Math.cos(s.aa) * step, Math.sin(s.aa) * step);
      s.walk += step * 0.12;
      s.shed += step;
      while (s.shed >= HOUND.shardEvery) {
        s.shed -= HOUND.shardEvery;
        c.shards.push({ x: h.x + (Math.random() - 0.5) * 16, y: h.y + (Math.random() - 0.5) * 12, at: time, a: Math.random() * Math.PI * 2 });
      }
      if (!s.hit && p.active && segDist(p.x, p.y, ox, oy, h.x, h.y) < 24 + PLAYER_R) {
        s.hit = true;
        tk.hitPlayer(HOUND.dmg, p.x, p.y);
        tk.slowPlayer(0.6, 600);
        tk.sfx('hit-heavy');
      }
      // The kennel does not care whose bones it runs over.
      for (const o of c.soldiers) {
        if (o === s || s.trampled.includes(o.id) || !o.husk.active) continue;
        if (dist(o.husk.x, o.husk.y, h.x, h.y) < 36) {
          s.trampled.push(o.id);
          try { o.husk.takeDamage(HOUND.trample); } catch { /* a husk already gone */ }
          c.sparks.push({ x: o.husk.x, y: o.husk.y - 10, at: time });
          tk.sfx('crit');
        }
      }
      if (done + step >= total - 0.5 || step <= 0) {
        enter(s, 'skid', time, s.walled ? HOUND.wallMs : HOUND.skidMs);
        if (s.walled) { tk.sfx('stone-slam'); tk.boom(h.x, h.y, 34, OBS.seam); }
      }
      break;
    }
    case 'skid':
      if (time >= s.stUntil && mult > 0) {
        enter(s, 'prowl', time, 900 + Math.random() * 900);
        // Pick a side to circle to: anywhere but straight up the hall behind the player.
        s.aa = Math.PI * (0.05 + Math.random() * 0.9) * (Math.random() < 0.5 ? 1 : -0.4);
      }
      break;
    default: break;
  }
}

// ── Drawing ─────────────────────────────────────────────────────────

function drawSoldier(g: Gfx, c: Court, s: Soldier, time: number): void {
  const h = s.husk;
  const hp = h.hp / Math.max(1, h.maxHp);
  const hurt = time - s.hurtAt < 110;
  const t = time / 1000;
  if (s.kind === 'warrior') {
    const windup = s.st === 'bash' ? clampN((time - s.stAt) / Math.max(1, s.stUntil - s.stAt), 0, 1) : 0;
    const lock = c.soldiers.some((o) => o !== s && o.kind === 'warrior' && dist(o.husk.x, o.husk.y, h.x, h.y) < 84) ? 1 : 0;
    drawWarrior(g, h.x, h.y, s.face, s.walk, { alpha: 1, hurt, hp, t, windup, lock });
  } else if (s.kind === 'assassin') {
    let alpha = 1, crouch = 0, blade = 0;
    if (s.st === 'vanish') alpha = 1 - clampN((time - s.stAt) / KNIFE.vanishMs, 0, 1);
    else if (s.st === 'gone') alpha = 0;
    else if (s.st === 'mark') { const k = clampN((time - s.stAt) / Math.max(1, s.stUntil - s.stAt), 0, 1); alpha = 0.25 + k * 0.75; crouch = k; blade = k; }
    else if (s.st === 'stab') { crouch = 0.4; blade = 1; }
    else if (s.st === 'spent') crouch = 0.6;
    drawAssassin(g, h.x, h.y, s.face, { alpha, hurt, hp, t, crouch, blade });
    if (s.st === 'vanish' || s.st === 'gone') {
      const k = s.st === 'gone' ? 1 : clampN((time - s.stAt) / KNIFE.vanishMs, 0, 1);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + t;
        g.fillStyle(0x07060d, 0.5 * (1 - k * 0.8));
        g.fillCircle(s.ax + Math.cos(a) * (8 + k * 20), s.ay - 14 + Math.sin(a) * (6 + k * 12) - k * 10, 7 - k * 3);
      }
    }
  } else {
    const hackles = s.st === 'aim' ? clampN((time - s.stAt) / Math.max(1, s.stUntil - s.stAt), 0, 1) : s.st === 'charge' ? 1 : 0;
    drawHound(g, h.x, h.y, s.face, s.walk, { alpha: 1, hurt, hp, t, hackles, charge: s.st === 'charge' });
    if (s.st === 'skid') {
      // Dazed: a slow ring of violet sparks over it.
      for (let i = 0; i < 4; i++) {
        const a = t * 4 + i * Math.PI / 2;
        g.fillStyle(OBS.seamLit, 0.8);
        g.fillCircle(h.x + Math.cos(a) * 14, h.y - 34 + Math.sin(a) * 4, 1.8);
      }
    }
  }
}

/** Telegraphs on the floor: the knives' marks and the kennel's lanes. */
function drawTells(g: Gfx, c: Court, time: number): void {
  for (const s of c.soldiers) {
    if (s.kind === 'assassin' && (s.st === 'mark' || s.st === 'stab')) {
      const k = s.st === 'stab' ? 1 : clampN((time - s.stAt) / Math.max(1, s.stUntil - s.stAt), 0, 1);
      const ex = s.ax + Math.cos(s.aa) * KNIFE.stabLen, ey = s.ay + Math.sin(s.aa) * KNIFE.stabLen;
      const A = at(s.ax, s.ay, s.aa, 0, -KNIFE.halfW), B = at(s.ax, s.ay, s.aa, 0, KNIFE.halfW);
      const tip = { x: ex + Math.cos(s.aa) * 14, y: ey + Math.sin(s.aa) * 14 };
      g.fillStyle(0xd27bff, 0.08 + k * 0.2);
      g.fillTriangle(A.x, A.y, B.x, B.y, tip.x, tip.y);
      line(g, [A, tip, B], 1.6, 0xd27bff, 0.5 + k * 0.5);
      // The mark itself: a dagger-rune where the stab will end.
      g.lineStyle(2, 0xd27bff, 0.4 + k * 0.6);
      g.strokeCircle(ex, ey, 18 - k * 6);
      g.lineBetween(ex - 10, ey, ex + 10, ey);
      g.lineBetween(ex, ey - 10, ex, ey + 10);
      if (k > 0.75 && Math.floor(time / 80) % 2 === 0) { g.fillStyle(0xffffff, 0.5); g.fillCircle(ex, ey, 3); }
    }
    if (s.kind === 'beast' && s.st === 'aim') {
      const k = clampN((time - s.stAt) / Math.max(1, s.stUntil - s.stAt), 0, 1);
      const locked = k >= 0.6;
      const h = s.husk;
      const L = dist(h.x, h.y, s.tx, s.ty);
      const A = at(h.x, h.y, s.aa, 0, -24), B = at(h.x, h.y, s.aa, 0, 24);
      const C = at(h.x, h.y, s.aa, L, 24), D = at(h.x, h.y, s.aa, L, -24);
      poly(g, [A, B, C, D], OBS.seam, 0.06 + k * 0.14);
      line(g, [A, D], locked ? 2 : 1, locked ? OBS.seamLit : OBS.seam, 0.4 + k * 0.5);
      line(g, [B, C], locked ? 2 : 1, locked ? OBS.seamLit : OBS.seam, 0.4 + k * 0.5);
      // Chevrons running down the lane, faster as it locks.
      const off = ((time / (locked ? 60 : 140)) % 40);
      for (let f = off; f < L; f += 40) {
        const m = at(h.x, h.y, s.aa, f, 0);
        const l1 = at(m.x, m.y, s.aa, -10, -12), l2 = at(m.x, m.y, s.aa, -10, 12);
        line(g, [l1, m, l2], 2, OBS.seamLit, (0.25 + k * 0.5) * (1 - f / (L + 1) * 0.5));
      }
      if (s.walled) {
        g.fillStyle(OBS.seamLit, 0.2 + k * 0.3);
        g.fillCircle(s.tx, s.ty, 10 + k * 6);
      }
    }
  }
}

/**
 * The Host's signature: never cast (it is not in the cycle) — it runs the waves, the soldiers,
 * the Aegis rule (`takenMult`) and the blows the Aegis turns (`onBossHurt`) for the whole act.
 */
export const hostDirector = (tk: BossToolkit): SignatureMove => {
  const c = courtOf(tk);
  stagecraft.entryP = 0;
  let lastT = 0;
  return {
    durationMs: 600,
    tell: 'THE HOST',
    cast() { reinforce(tk, 2); },
    update(time, dt) {
      if (tk.phase !== 0 || !tk.fighting) { lastT = time; return; }
      stagecraft.entryP = 1;
      const p = tk.player;
      // The player's heading, smoothed: what "behind you" means to a knife.
      if (dt > 0 && lastT > 0) {
        const vx = (p.x - c.plx) / dt, vy = (p.y - c.ply) / dt;
        const k = Math.min(1, dt * 6);
        if (Math.hypot(vx, vy) < 900) { c.pvx += (vx - c.pvx) * k; c.pvy += (vy - c.pvy) * k; }
      }
      c.plx = p.x; c.ply = p.y; lastT = time;
      if (!c.started) { c.started = true; muster(tk, c, time, true); }

      // Doors that are due open.
      const due = c.pending.filter((q) => time >= q.at);
      c.pending = c.pending.filter((q) => time < q.at);
      const tier = waveDef(c.wave).tier;
      for (const q of due) spawnSoldier(tk, c, q.kind, q.door, q.slot, tier, time);

      // The fallen break.
      for (const s of c.soldiers) {
        if (s.husk.active && s.husk.hp > 0) continue;
        c.wrecks.push({ x: s.husk.x, y: s.husk.y, kind: s.kind, at: time, face: s.face });
        tk.sfx('crystal-shatter');
      }
      c.soldiers = c.soldiers.filter((s) => s.husk.active && s.husk.hp > 0);

      const marked = time < c.markUntil;
      const knivesOut = c.soldiers.filter((s) => s.kind === 'assassin' && (s.st === 'vanish' || s.st === 'gone' || s.st === 'mark' || s.st === 'stab')).length;
      const houndsOut = c.soldiers.filter((s) => s.kind === 'beast' && (s.st === 'aim' || s.st === 'charge')).length;
      const maxKnives = marked ? 3 : tier >= 1 ? 2 : 1;
      for (const s of c.soldiers) {
        if (s.husk.hp < s.lastHp) s.hurtAt = time;
        s.lastHp = s.husk.hp;
        const mult = footing(s, time, dt);
        if (!s.husk.active || s.husk.hp <= 0) continue;
        if (s.kind === 'warrior') updateWarrior(tk, c, s, time, dt, mult, marked);
        else if (s.kind === 'assassin') updateAssassin(tk, c, s, time, dt, mult, marked, knivesOut, maxKnives);
        else updateBeast(tk, c, s, time, dt, mult, marked, houndsOut);
      }

      // Glass caltrops.
      c.shards = c.shards.filter((g) => time < g.at + SHARD.lifeMs).slice(-70);
      if (p.active && time - c.lastShardHitAt > SHARD.tickMs && c.shards.some((g) => time > g.at + 120 && dist(g.x, g.y, p.x, p.y) < SHARD.r + PLAYER_R * 0.7)) {
        c.lastShardHitAt = time;
        tk.hitPlayer(SHARD.dmg, p.x, p.y);
        tk.slowPlayer(0.7, 450);
      }
      c.wrecks = c.wrecks.filter((w) => time - w.at < 800);
      c.sparks = c.sparks.filter((s) => time - s.at < 260);
      c.ripples = c.ripples.filter((r) => time - r.at < 560);

      // The rule of the hall.
      if (c.stage === 'muster' && c.pending.length === 0) { c.stage = 'battle'; c.stageAt = time; }
      if (c.stage === 'battle' && c.soldiers.length === 0 && c.pending.length === 0) {
        c.stage = 'cracked';
        c.stageAt = time;
        c.crackUntil = time + (tk.hard ? 5400 : 6500);
        c.crackSeed = 1 + Math.floor(Math.random() * 1e6);
        hallBanner(tk, 'THE AEGIS CRACKS', c.wave === 0 ? 'The throne is open. Strike him now.' : null, '#ffe9b0');
        tk.sfx('shield-break');
        tk.sfx('crystal-shatter');
        tk.scene.cameras.main.shake(380, 0.006);
      } else if (c.stage === 'cracked' && time >= c.crackUntil) {
        c.stage = 'mending';
        c.stageAt = time;
        tk.sfx('crystal-chime');
      } else if (c.stage === 'mending' && time >= c.stageAt + MEND_MS) {
        c.wave++;
        muster(tk, c, time, false);
      }
    },
    takenMult() {
      if (tk.phase !== 0) return 1;
      return aegisHeld(c) ? AEGIS_HELD : tk.hard ? 1.45 : 1.6;
    },
    onBossHurt() {
      if (tk.phase !== 0) return;
      const now = tk.now;
      if (now - c.lastRippleAt < 90) return;
      c.lastRippleAt = now;
      const p = tk.player;
      const held = aegisHeld(c);
      c.ripples.push({ a: domeAzimuth(p.x, p.y), at: now, gold: !held });
      if (held && now - c.lastBlockSfxAt > 260) { c.lastBlockSfxAt = now; tk.sfx('crystal-chime'); }
    },
    drawGround(g, time) {
      if (tk.phase !== 0) return;
      const t = time / 1000;
      // Shed glass.
      for (const s of c.shards) {
        const k = clampN((time - s.at) / SHARD.lifeMs, 0, 1);
        const a = k > 0.8 ? (1 - k) / 0.2 : 1;
        const r = 5;
        g.fillStyle(OBS.facet, a);
        g.fillTriangle(s.x + Math.cos(s.a) * r, s.y + Math.sin(s.a) * r * 0.6, s.x + Math.cos(s.a + 2.2) * r, s.y + Math.sin(s.a + 2.2) * r * 0.6, s.x, s.y - 7);
        g.lineStyle(1, OBS.seamLit, 0.6 * a);
        g.lineBetween(s.x, s.y - 7, s.x + Math.cos(s.a) * r, s.y + Math.sin(s.a) * r * 0.6);
      }
      drawTells(g, c, time);
      // Tethers: each of the Host feeds a thread of violet back to its pip on the Aegis.
      const n = c.soldiers.length;
      c.soldiers.forEach((s, i) => {
        if (s.kind === 'assassin' && (s.st === 'gone' || s.st === 'vanish')) return;
        const phi = Math.PI * (0.18 + 0.64 * ((i + 0.5) / n));
        const px = AEGIS.x + AEGIS.rx * Math.cos(phi), py = AEGIS.y + AEGIS.ry * Math.sin(phi);
        const sx = s.husk.x, sy = s.husk.y - 18;
        const mx = (px + sx) / 2, my = Math.min(py, sy) - 30;
        const pts = [0, 0.25, 0.5, 0.75, 1].map((k) => ({
          x: (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * mx + k * k * px,
          y: (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * my + k * k * py,
        }));
        line(g, pts, 1, KIND_TINT[s.kind], 0.16);
        const b = (t * 0.7 + i * 0.31) % 1;
        const bx = (1 - b) * (1 - b) * sx + 2 * (1 - b) * b * mx + b * b * px;
        const by = (1 - b) * (1 - b) * sy + 2 * (1 - b) * b * my + b * b * py;
        g.fillStyle(OBS.seamLit, 0.55); g.fillCircle(bx, by, 1.6);
      });
      // Soldiers stepping out of the walls.
      for (const q of c.pending) {
        const k = clampN((time - q.from) / Math.max(1, q.at - q.from), 0, 1);
        const step = doorStep(q.door);
        const sx = q.door.side === 'back' ? step.x : q.door.side === 'left' ? 56 + k * (step.x - 56) : 904 + k * (step.x - 904);
        const sy = q.door.side === 'back' ? step.y - 14 + k * 14 : step.y;
        const opt = { alpha: k * 0.75, hurt: false, hp: 1, t };
        if (q.kind === 'warrior') drawWarrior(g, sx, sy, Math.PI / 2, k * 4, { ...opt, windup: 0, lock: 0 });
        else if (q.kind === 'assassin') drawAssassin(g, sx, sy, q.door.side === 'left' ? 0 : Math.PI, { ...opt, crouch: 0.5, blade: 0 });
        else drawHound(g, sx, sy, q.door.side === 'left' ? 0 : Math.PI, k * 6, { ...opt, hackles: 0.3, charge: false });
      }
      // Shieldwall links: neighbouring warriors' shields joined by a seam.
      const ws = c.soldiers.filter((s) => s.kind === 'warrior');
      for (let i = 0; i < ws.length; i++) {
        for (let j = i + 1; j < ws.length; j++) {
          const a = ws[i].husk, b = ws[j].husk;
          if (dist(a.x, a.y, b.x, b.y) > 84) continue;
          seam(g, [{ x: a.x + Math.cos(ws[i].face) * 14, y: a.y - 10 }, { x: b.x + Math.cos(ws[j].face) * 14, y: b.y - 10 }], 1, 0.5, 0.3 + 0.3 * Math.sin(t * 3));
        }
      }
      for (const s of [...c.soldiers].sort((a, b) => a.husk.y - b.husk.y)) drawSoldier(g, c, s, time);
      for (const w of c.wrecks) drawWreck(g, w.x, w.y, w.kind, w.face, time - w.at);
    },
    drawAir(g, time) {
      if (tk.phase !== 0) return;
      for (const s of c.sparks) {
        const k = (time - s.at) / 260;
        g.lineStyle(2, OBS.seamLit, 1 - k);
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + s.x * 0.1;
          g.lineBetween(s.x + Math.cos(a) * 3, s.y + Math.sin(a) * 3, s.x + Math.cos(a) * (6 + k * 14), s.y + Math.sin(a) * (6 + k * 14));
        }
      }
    },
    onPhaseEnd() {
      for (const s of c.soldiers) { try { s.husk.isInvincible = false; } catch { /* gone */ } }
      c.soldiers = [];
      c.pending = [];
      c.shards = [];
      c.wrecks = [];
      c.sparks = [];
      c.markUntil = 0;
    },
  };
};
