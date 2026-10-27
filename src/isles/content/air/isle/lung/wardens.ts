import type Phaser from 'phaser';
import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BREATH, CORK, IRON, LEATHER, OAK, OVERDUE, ROYAL, ROYAL_DEEP,
  aerionSigil, bellows, breathBottle, breathMeter, weathervane, windStreak,
} from './art';

/**
 * The Lung's three wardens — the King's works-masters, one at the head of each working.
 *
 * Each fight is the working it closes. The Bellowsmaster runs the great bellows that draw the
 * isle's air up the pipes; the Corkwarden stops it in glass; the Vanesmith decides which way it
 * blows. Every rule cuts both ways: a player who reads it turns it on the warden.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
/** The toolkit's telegraph stretch, defended against a host that cannot answer. */
const warnOf = (ctx: GimmickCtx, ms: number): number => {
  const v = ctx.tk.warn(ms) as unknown;
  return typeof v === 'number' && Number.isFinite(v) ? v : ms;
};
type Gfx = Phaser.GameObjects.Graphics;

// ── Warden 1: The Great Bellows ──────────────────────────────────────

/**
 * Two great bellows hang on the side walls and work in turn. The working bellows DRAWS for a few
 * seconds — air streams into its nozzle and drags anyone in front of it closer — then BLOWS: a
 * band of gale across the whole hall that throws everyone in it downwind. Whoever is thrown into
 * the far wall is PINNED (14 damage, stunned). Three iron breath-posts stand in the middle: the
 * calm in a post's lee (the downwind side) shelters you from the blow. Hide in the lee; leave the
 * Bellowsmaster in the band.
 */
const greatBellows = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const DRAW_MS = ctx.hard ? 2300 : 2800;
  const BLOW_MS = 700;
  const REST_MS = 900;
  const BAND = 104;
  const LEE_LEN = 150;
  const LEE_HALF = 34;
  const POST_R = 22;
  const PIN_DMG = 14;
  const BLOW_DMG = 6;

  interface Side { dir: 1 | -1; x: number; y: number }
  /** dir: the way its blow travels. The west bellows blows east. */
  const SIDES: Side[] = [
    { dir: 1, x: 34, y: top + 150 },
    { dir: -1, x: W - 34, y: top + 380 },
  ];
  const POSTS: Pt[] = [{ x: 330, y: top + 140 }, { x: 640, y: top + 205 }, { x: 330, y: top + 395 }, { x: 640, y: top + 360 }];

  let state: 'idle' | 'draw' | 'blow' | 'rest' = 'idle';
  let at = 0;
  let side = 0;
  let stateStart = 0;
  const pinned: Record<Who, boolean> = { player: false, npc: false };
  const blown: Record<Who, boolean> = { player: false, npc: false };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const cur = (): Side => SIDES[side];

  const inBand = (s: Side, y: number): boolean => Math.abs(y - s.y) <= BAND;
  /** In the calm behind a post, relative to the blow's direction. */
  const inLee = (s: Side, x: number, y: number): boolean => POSTS.some((p) => {
    const ahead = (x - p.x) * s.dir;
    return ahead > 0 && ahead < LEE_LEN && Math.abs(y - p.y) < LEE_HALF;
  });

  const startDraw = (time: number) => {
    state = 'draw';
    stateStart = time;
    at = time + warnOf(ctx, DRAW_MS);
    ctx.sfx('gust');
    ctx.float(cur().x + cur().dir * 60, cur().y - 50, 'DRAWING', '#d8f4ff');
  };
  const startBlow = (time: number) => {
    state = 'blow';
    stateStart = time;
    at = time + BLOW_MS;
    pinned.player = pinned.npc = false;
    blown.player = blown.npc = false;
    ctx.sfx('tornado');
    ctx.banner(cur().dir > 0 ? 'THE WEST BELLOWS BLOWS' : 'THE EAST BELLOWS BLOWS', '#e8fbff');
    ctx.scene.cameras.main.shake(200, 0.004);
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (state === 'idle') { if (at === 0) at = time + 2400; if (time >= at) startDraw(time); return; }
      const s = cur();
      if (state === 'draw') {
        // The draw: a cone in front of the nozzle pulls toward it, harder the nearer you are.
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f)) continue;
          const dx = s.x - f.x, dy = s.y - f.y;
          const d = Math.hypot(dx, dy);
          const ahead = -dx * s.dir;
          if (ahead <= 0 || Math.abs(dy) > BAND + ahead * 0.25 || d < 50) continue;
          const pull = 90 * (1 - clampN(d / (W * 0.9), 0, 0.8));
          ctx.nudge(f, (dx / d) * pull * step, (dy / d) * pull * step);
        }
        if (time >= at) startBlow(time);
      } else if (state === 'blow') {
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || !inBand(s, f.y) || inLee(s, f.x, f.y)) continue;
          if (!blown[w]) {
            blown[w] = true;
            ctx.hit(f, BLOW_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'BLOWN', '#e8fbff');
          }
          ctx.nudge(f, s.dir * 760 * step, 0);
          const farWall = s.dir > 0 ? W - 46 : 46;
          if (!pinned[w] && (s.dir > 0 ? f.x >= farWall - 6 : f.x <= farWall + 6)) {
            pinned[w] = true;
            ctx.hit(f, PIN_DMG, f.x, f.y);
            ctx.stun(f, 650);
            ctx.float(f.x, f.y - 60, 'PINNED', '#ff9a8a');
            ctx.flash(f.x, f.y, 0xffffff);
            ctx.sfx('stone-slam');
          }
        }
        if (time >= at) { state = 'rest'; stateStart = time; at = time + REST_MS; }
      } else if (state === 'rest' && time >= at) {
        side = 1 - side;
        startDraw(time);
      }
      // The breath-posts are iron: nobody stands inside one.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        for (const p of POSTS) {
          const d = dist(f.x, f.y, p.x, p.y);
          if (d < POST_R + 16 && d > 0.01) ctx.nudge(f, ((f.x - p.x) / d) * (POST_R + 16 - d), ((f.y - p.y) / d) * (POST_R + 16 - d));
        }
      }
    },
    npcSeek() {
      if (state !== 'draw' && state !== 'rest') return null;
      const n = ctx.npc;
      // The next blow is the current side's while drawing, the other side's while resting.
      const s = state === 'draw' ? cur() : SIDES[1 - side];
      if (!inBand(s, n.y) || inLee(s, n.x, n.y)) return null;
      // Into the nearest lee in the band.
      let best: Pt | null = null, bd = Infinity;
      for (const p of POSTS) {
        if (!inBand(s, p.y)) continue;
        const lx = p.x + s.dir * 60, ly = p.y;
        const d = dist(n.x, n.y, lx, ly);
        if (d < bd) { bd = d; best = { x: lx, y: ly }; }
      }
      // No lee within reach: just get out of the band.
      if (!best || bd > 320) return { x: n.x, y: n.y < s.y ? s.y - BAND - 40 : s.y + BAND + 40 };
      return best;
    },
    drawGround(g, time) {
      const s = cur();
      const charging = state === 'draw' ? clampN((time - stateStart) / Math.max(1, at - stateStart), 0, 1) : 0;
      const live = state === 'draw' || state === 'blow';
      // The band the blow will take, darkening as the bellows fill.
      if (live) {
        g.fillStyle(0xd8f4ff, state === 'blow' ? 0.22 : 0.04 + charging * 0.12);
        g.fillRect(0, s.y - BAND, W, BAND * 2);
        g.lineStyle(2, 0xffffff, 0.3 + charging * 0.4);
        g.lineBetween(0, s.y - BAND, W, s.y - BAND); g.lineBetween(0, s.y + BAND, W, s.y + BAND);
        if (state === 'draw' && charging > 0.78 && Math.floor(time / 100) % 2 === 0) {
          g.lineStyle(3, 0xff9a8a, 0.7); g.strokeRect(2, s.y - BAND, W - 4, BAND * 2);
        }
        // The far wall's pinning strip.
        const fx = s.dir > 0 ? W - 52 : 0;
        g.fillStyle(OVERDUE, 0.1 + charging * 0.18); g.fillRect(fx, s.y - BAND, 52, BAND * 2);
      }
      // Each post's lee: a calm wedge of still air, drawn as clean floor.
      for (const p of POSTS) {
        const inB = live && inBand(s, p.y);
        g.fillStyle(0x0a1420, 0.4); g.fillEllipse(p.x + 4, p.y + 6, POST_R * 2.4, POST_R * 0.9);
        if (inB) {
          const x0 = s.dir > 0 ? p.x : p.x - LEE_LEN;
          g.fillStyle(0x9ad8a8, 0.12 + charging * 0.12); g.fillRect(x0, p.y - LEE_HALF, LEE_LEN, LEE_HALF * 2);
          g.lineStyle(1.5, 0xc8f0d0, 0.5); g.strokeRect(x0, p.y - LEE_HALF, LEE_LEN, LEE_HALF * 2);
        }
      }
    },
    drawAir(g, time) {
      const s = cur();
      // The bellows on each wall.
      SIDES.forEach((sd, i) => {
        const working = i === side;
        let open = 0.55;
        if (working && state === 'draw') open = 0.3 + 0.7 * clampN((time - stateStart) / Math.max(1, at - stateStart), 0, 1);
        else if (working && state === 'blow') open = Math.max(0.05, 1 - (time - stateStart) / 260);
        else if (working && state === 'rest') open = 0.05;
        const shake = working && state === 'draw' && at - time < 500 ? Math.sin(time / 18) * 2.5 : 0;
        bellows(g, sd.x + shake, sd.y, 150, sd.dir > 0 ? 0 : Math.PI, open, 1);
        // A pressure gauge on its frame.
        breathMeter(g, sd.x + (sd.dir > 0 ? -8 : 8), sd.y - 70, 12, working ? open : 0.2, 1);
      });
      // The iron breath-posts.
      for (const p of POSTS) {
        g.fillStyle(dim(IRON, 0.3), 1); g.fillRect(p.x - POST_R * 0.6, p.y - 70, POST_R * 1.2, 72);
        g.fillStyle(IRON, 1); g.fillRect(p.x - POST_R * 0.5, p.y - 68, POST_R, 68);
        g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(p.x - POST_R * 0.5, p.y - 68, 3, 68);
        g.fillStyle(BRASS, 1); g.fillRect(p.x - POST_R * 0.7, p.y - 74, POST_R * 1.4, 6); g.fillRect(p.x - POST_R * 0.7, p.y - 4, POST_R * 1.4, 5);
      }
      // The air itself: streaming into the nozzle while it draws, a gale across the band while it blows.
      if (state === 'draw') {
        for (let i = 0; i < 18; i++) {
          const k = ((time / 900) + i / 18) % 1;
          const fromX = s.x + s.dir * (W * 0.9) * (1 - k);
          const y = s.y + Math.sin(i * 2.3) * BAND * (1 - k) * 0.9;
          windStreak(g, fromX, y, s.dir > 0 ? Math.PI : 0, 26, 0.35 + k * 0.4);
        }
      } else if (state === 'blow') {
        for (let i = 0; i < 40; i++) {
          const along = ((i * 61 + (time - stateStart) * 1.6) % W);
          const x = s.dir > 0 ? along : W - along;
          windStreak(g, x, s.y - BAND + ((i * 37) % (BAND * 2)), s.dir > 0 ? 0 : Math.PI, 40 + (i % 3) * 16, 0.75);
        }
      }
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f) || !pinned[w] || state !== 'blow') continue;
        g.lineStyle(3, 0xffffff, 0.7); g.strokeCircle(f.x, f.y, 26 + Math.sin(time / 40) * 3);
      }
    },
    drawHud(g, time) {
      if (state !== 'draw') return;
      const cx = ctx.W / 2, cy = top + 22;
      const k = clampN((at - time) / Math.max(1, at - stateStart), 0, 1);
      g.fillStyle(0x0c1420, 0.88); g.fillRoundedRect(cx - 130, cy - 12, 260, 24, 8);
      g.lineStyle(2, BRASS, 1); g.strokeRoundedRect(cx - 130, cy - 12, 260, 24, 8);
      const left = cur().dir > 0;
      // The bar fills toward the side that is about to blow.
      g.fillStyle(k < 0.25 ? 0xff9a8a : 0xd8f4ff, 1);
      const w = 240 * (1 - k);
      g.fillRoundedRect(left ? cx - 120 : cx + 120 - w, cy - 5, w, 10, 4);
      g.fillStyle(BRASS, 1);
      g.fillTriangle(left ? cx - 138 : cx + 138, cy, left ? cx - 128 : cx + 128, cy - 7, left ? cx - 128 : cx + 128, cy + 7);
    },
  };
};

// ── Warden 2: Corked ─────────────────────────────────────────────────

/**
 * Two belts cross the floor carrying corked breath, one each way; standing on a belt carries you.
 * Walk into a bottle and it bursts into a gust that throws everyone else near it outward (7
 * damage) — and you gulp a little of it (+3). Every few seconds the Corking Press stamps rings
 * under both fighters: caught in one, you are CORKED — silenced, your breath stopped in a bottle
 * set down on the far belt, across the room. Break your own bottle and you get it back (+10).
 * If your foe breaks it first, they drink it (+10 to them, 8 to you). Stopple drinks.
 */
const corked = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const BELT_H = 70;
  const SPEED = 70;
  const SPAWN_MS = ctx.hard ? 1150 : 1400;
  const PRESS_EVERY = ctx.hard ? 5600 : 6600;
  const PRESS_WARN = 1300;
  const PRESS_R = 62;
  const CORK_MS = 2800;
  const GUST_R = 120;
  const BREAK_R = 26;

  interface Belt { y: number; vx: number }
  const BELTS: Belt[] = [{ y: top + 150, vx: SPEED }, { y: top + 370, vx: -SPEED }];
  interface Bottle { x: number; belt: number; owner: Who | null; dead: boolean; born: number }
  let bottles: Bottle[] = [];
  let nextSpawn = [0, 0];
  interface Stamp { x: number; y: number; at: number; born: number; done: boolean }
  let stamps: Stamp[] = [];
  let nextPress = 0;
  const corkedUntil: Record<Who, number> = { player: 0, npc: 0 };
  let gusts: { x: number; y: number; at: number; own: boolean }[] = [];
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');
  const beltOf = (y: number): number => BELTS.findIndex((b) => Math.abs(y - (b.y + BELT_H / 2)) <= BELT_H / 2);
  const bottleY = (b: Bottle): number => BELTS[b.belt].y + BELT_H / 2 + 8;

  const burst = (b: Bottle, by: Who, time: number) => {
    b.dead = true;
    const x = b.x, y = bottleY(b);
    gusts.push({ x, y, at: time, own: b.owner !== null });
    ctx.sfx('crystal-shatter');
    ctx.sfx('gust');
    const breaker = fighter(by);
    if (b.owner === null) {
      ctx.heal(breaker, 3);
      const o = fighter(other(by));
      if (alive(o) && dist(o.x, o.y, x, y) < GUST_R) {
        const d = Math.max(1, dist(o.x, o.y, x, y));
        ctx.hit(o, 7, o.x, o.y);
        ctx.nudge(o, ((o.x - x) / d) * 90, ((o.y - y) / d) * 90);
        ctx.float(o.x, o.y - 48, 'GUSTED', '#d8f4ff');
      }
      return;
    }
    if (b.owner === by) {
      ctx.heal(breaker, 10);
      ctx.float(breaker.x, breaker.y - 56, 'BREATH BACK +10', '#9af0c8');
      ctx.sfx('heal');
    } else {
      const victim = fighter(b.owner);
      ctx.heal(breaker, 10);
      if (alive(victim)) ctx.hit(victim, 8, victim.x, victim.y);
      ctx.float(breaker.x, breaker.y - 56, by === 'npc' ? 'SHE DRINKS YOUR BREATH' : 'YOU DRINK HER BREATH', '#c8a8ff');
      ctx.sfx('curse-cast');
    }
  };

  const press = (time: number) => {
    stamps = [];
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      stamps.push({ x: clampN(f.x, 60, W - 60), y: clampN(f.y, top + 50, H - 50), at: time + warnOf(ctx, PRESS_WARN), born: time, done: false });
    }
    ctx.sfx('trap-set');
    ctx.float(W / 2, top + 40, 'THE PRESS', '#c8a8ff');
  };

  const stamp = (s: Stamp, time: number) => {
    s.done = true;
    ctx.sfx('anvil');
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f) || dist(f.x, f.y, s.x, s.y) > PRESS_R) continue;
      if (time < corkedUntil[w]) continue;
      corkedUntil[w] = time + CORK_MS;
      ctx.silence(f, CORK_MS);
      ctx.float(f.x, f.y - 60, 'CORKED', '#c8a8ff');
      ctx.flash(f.x, f.y, ROYAL);
      // Their breath, bottled, set down on the far belt across the room — a race to it.
      const belt = Math.abs(f.y - (BELTS[0].y + BELT_H / 2)) < Math.abs(f.y - (BELTS[1].y + BELT_H / 2)) ? 1 : 0;
      bottles.push({ x: clampN(W - f.x, 120, W - 120), belt, owner: w, dead: false, born: time });
    }
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (nextPress === 0) { nextPress = time + 3600; nextSpawn = [time + 300, time + 900]; }
      // Bottles come in at the upstream end of each belt.
      BELTS.forEach((b, i) => {
        if (time < nextSpawn[i]) return;
        nextSpawn[i] = time + SPAWN_MS * (0.8 + ctx.rng() * 0.4);
        bottles.push({ x: b.vx > 0 ? -10 : W + 10, belt: i, owner: null, dead: false, born: time });
      });
      for (const bt of bottles) {
        bt.x += BELTS[bt.belt].vx * step;
        if (bt.x < -30 || bt.x > W + 30) {
          bt.dead = true;
          if (bt.owner) ctx.float(clampN(bt.x, 40, W - 40), bottleY(bt) - 30, 'LOST TO THE LUNG', '#8a9ab8');
        }
      }
      // The belts carry whoever stands on them.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const bi = beltOf(f.y);
        if (bi >= 0) ctx.nudge(f, BELTS[bi].vx * step, 0);
      }
      // Walking into a bottle breaks it.
      for (const bt of bottles) {
        if (bt.dead || time - bt.born < 400) continue;
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f)) continue;
          if (dist(f.x, f.y, bt.x, bottleY(bt) - 10) < BREAK_R + 14) { burst(bt, w, time); break; }
        }
      }
      bottles = bottles.filter((b) => !b.dead);
      if (time >= nextPress) { nextPress = time + PRESS_EVERY; press(time); }
      for (const s of stamps) if (!s.done && time >= s.at) stamp(s, time);
      stamps = stamps.filter((s) => !s.done || time < s.at + 500);
      gusts = gusts.filter((gu) => time - gu.at < 600);
    },
    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc, p = ctx.player;
      // Out from under the press.
      for (const s of stamps) {
        if (s.done || dist(n.x, n.y, s.x, s.y) > PRESS_R + 10) continue;
        const a = Math.atan2(n.y - s.y, n.x - s.x);
        return { x: clampN(s.x + Math.cos(a) * (PRESS_R + 50), 50, W - 50), y: clampN(s.y + Math.sin(a) * (PRESS_R + 50), top + 40, H - 40) };
      }
      // A corked bottle on the belt: hers to get back, or the player's to drink.
      let best: Bottle | null = null, bd = Infinity;
      for (const b of bottles) {
        if (!b.owner) continue;
        const d = dist(n.x, n.y, b.x, bottleY(b));
        if (d < bd) { bd = d; best = b; }
      }
      if (best) return { x: best.x + BELTS[best.belt].vx * 0.4, y: bottleY(best) - 10 };
      // A loose bottle near the player: go and burst it in their face.
      if (now - corkedUntil.npc > 0) {
        for (const b of bottles) {
          if (b.owner) continue;
          const by = bottleY(b);
          if (dist(b.x, by, p.x, p.y) < GUST_R * 0.8 && dist(b.x, by, n.x, n.y) < 260) return { x: b.x, y: by - 10 };
        }
      }
      return null;
    },
    drawGround(g, time) {
      // The belts: rubber over rollers, the treads moving.
      for (const b of BELTS) {
        g.fillStyle(0x10141a, 1); g.fillRect(0, b.y - 6, W, BELT_H + 12);
        g.fillStyle(0x2a2e36, 1); g.fillRect(0, b.y, W, BELT_H);
        const off = ((time / 1000) * b.vx) % 24;
        g.lineStyle(2, 0x3e444e, 1);
        for (let x = off - 24; x < W + 24; x += 24) g.lineBetween(x, b.y + 2, x, b.y + BELT_H - 2);
        g.fillStyle(BRASS_DARK, 1); g.fillRect(0, b.y - 6, W, 3); g.fillRect(0, b.y + BELT_H + 3, W, 3);
        for (let x = 60; x < W; x += 180) {
          g.lineStyle(2, BRASS, 0.4);
          const d = Math.sign(b.vx);
          g.lineBetween(x - d * 8, b.y + BELT_H / 2 - 9, x + d * 4, b.y + BELT_H / 2); g.lineBetween(x + d * 4, b.y + BELT_H / 2, x - d * 8, b.y + BELT_H / 2 + 9);
        }
      }
      // The press's rings — a cork-shaped stamp coming down.
      for (const s of stamps) {
        if (s.done) continue;
        const k = clampN((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        g.fillStyle(ROYAL_DEEP, 0.12 + k * 0.22); g.fillCircle(s.x, s.y, PRESS_R);
        g.lineStyle(2.5, ROYAL, 0.5 + k * 0.5); g.strokeCircle(s.x, s.y, PRESS_R);
        aerionSigil(g, s.x, s.y, PRESS_R * 0.55 * k, lit(ROYAL, 0.4), 0.3 + k * 0.5);
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.6); g.strokeCircle(s.x, s.y, PRESS_R + 3); }
      }
    },
    drawAir(g, time) {
      const s = time / 1000;
      for (const b of bottles) {
        const y = bottleY(b);
        breathBottle(g, b.x, y, b.owner ? 1.05 : 0.8, s + b.x * 0.01, 1);
        if (b.owner) {
          // A corked breath: violet seal, the owner's mark, a glow you can see across the room.
          g.lineStyle(2, b.owner === 'player' ? 0x9af0c8 : 0xff9a8a, 0.6 + Math.sin(time / 120) * 0.3);
          g.strokeCircle(b.x, y - 14, 22);
          ownerTag(g, b.x, y - 52, b.owner === 'player' ? 0x9af0c8 : 0xff9a8a);
        }
      }
      // The press itself, hanging over each stamp as it comes down.
      for (const st of stamps) {
        const k = clampN((time - st.born) / Math.max(1, st.at - st.born), 0, 1);
        const lift = st.done ? Math.min(1, (time - st.at) / 400) * 80 : (1 - k * k) * 120;
        const y = st.y - 30 - lift;
        g.lineStyle(4, IRON, 1); g.lineBetween(st.x, y - 200, st.x, y);
        g.fillStyle(CORK, 1); g.fillRoundedRect(st.x - 34, y - 26, 68, 30, 6);
        g.fillStyle(dim(CORK, 0.3), 1); g.fillRect(st.x - 34, y - 4, 68, 6);
        g.fillStyle(ROYAL, 1); g.fillCircle(st.x, y - 12, 9);
      }
      for (const gu of gusts) {
        const k = (time - gu.at) / 600;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          windStreak(g, gu.x + Math.cos(a) * GUST_R * k, gu.y + Math.sin(a) * GUST_R * k * 0.8, a, 18, 0.8 * (1 - k));
        }
        g.fillStyle(gu.own ? 0xc8a8ff : BREATH, 0.4 * (1 - k)); g.fillCircle(gu.x, gu.y - 10, 20 + k * 30);
      }
      for (const w of WHO) {
        if (time >= corkedUntil[w]) continue;
        const f = fighter(w);
        if (!alive(f)) continue;
        // A cork jammed in over the mouth, the King's seal on it.
        g.fillStyle(CORK, 1); g.fillRoundedRect(f.x - 9, f.y - 6, 18, 12, 3);
        g.fillStyle(ROYAL, 1); g.fillCircle(f.x, f.y, 3.5);
        const k = (corkedUntil[w] - time) / CORK_MS;
        g.lineStyle(2, ROYAL, 0.8); g.beginPath(); g.arc(f.x, f.y - 44, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
    drawHud(g, time) {
      const cx = ctx.W / 2 + 140, cy = top + 22;
      const k = clampN((nextPress - time) / PRESS_EVERY, 0, 1);
      g.fillStyle(0x0c0c1a, 0.88); g.fillRoundedRect(cx - 70, cy - 12, 140, 24, 8);
      g.lineStyle(2, ROYAL, 1); g.strokeRoundedRect(cx - 70, cy - 12, 140, 24, 8);
      g.fillStyle(k < 0.2 ? 0xffffff : ROYAL, 1); g.fillRoundedRect(cx - 62, cy - 5, 124 * k, 10, 4);
      g.fillStyle(CORK, 1); g.fillRoundedRect(cx - 92, cy - 8, 16, 16, 3);
    },
  };
};

/** The owner's tag over a corked bottle: an arrow down at it, coloured for whose breath it is. */
function ownerTag(g: Gfx, x: number, y: number, col: number): void {
  g.fillStyle(col, 0.9);
  g.fillTriangle(x - 7, y, x + 7, y, x, y + 10);
  g.fillRect(x - 2, y - 12, 4, 12);
}

// ── Warden 3: The Great Vane ─────────────────────────────────────────

/**
 * A great weathervane turns on a hub in the middle of the floor, its arrowhead always pointing
 * into the wind. The wind comes from one of three tunnel mouths — west, east, or south — and
 * pushes everyone downwind. When the shutters of the next tunnel open, the vane SWINGS round to
 * face it: both its blades sweep the floor between the old heading and the new, and anything in
 * the way is cut (16). At rest, its edge still bites. The hub itself is the one place it cannot
 * reach: whoever is standing on the rose as the vane swings rides it round — WINDWARD, +20% damage.
 */
const greatVane = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const HUB: Pt = { x: W / 2, y: top + (H - top) * 0.5 };
  const ARROW = 250;
  const FIN = 205;
  const HALF = 13;
  const HUB_R = 36;
  const EVERY = ctx.hard ? 5000 : 6200;
  const WARN = 1800;
  const SWING_MS = 560;
  const WIND = 55;
  const WINDWARD_MS = 3000;

  interface Mouth { name: string; x: number; y: number }
  const MOUTHS: Mouth[] = [
    { name: 'WEST', x: 0, y: HUB.y },
    { name: 'EAST', x: W, y: HUB.y },
    { name: 'SOUTH', x: HUB.x, y: H },
  ];
  const heading = (m: number): number => Math.atan2(MOUTHS[m].y - HUB.y, MOUTHS[m].x - HUB.x);

  let mouth = 0;
  let next = 1;
  let angle = heading(0);
  let from = angle, to = angle;
  let state: 'rest' | 'warn' | 'swing' = 'rest';
  let at = 0;
  let warnStart = 0;
  const struck: Record<Who, boolean> = { player: false, npc: false };
  const lastBite: Record<Who, number> = { player: 0, npc: 0 };
  const windwardUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  /** The short way round from `a` to `b`, as a signed sweep. */
  const sweepOf = (a: number, b: number): number => {
    const d = wrap(b - a);
    return Math.abs(Math.abs(d) - Math.PI) < 0.01 ? (ctx.rng() < 0.5 ? Math.PI : -Math.PI) : d;
  };
  let sweep = 0;

  /** Would a blade at `a` with this length be over (x, y)? */
  const onBlade = (a: number, len: number, x: number, y: number, pad: number): boolean => {
    const dx = x - HUB.x, dy = y - HUB.y;
    const u = dx * Math.cos(a) + dy * Math.sin(a);
    const v = -dx * Math.sin(a) + dy * Math.cos(a);
    return u > HUB_R - 4 && u < len + pad && Math.abs(v) < HALF + pad;
  };
  /** Is (x, y) inside the floor a blade will sweep between `a0` and `a0 + s`? */
  const inSector = (a0: number, s: number, len: number, x: number, y: number): boolean => {
    const d = dist(x, y, HUB.x, HUB.y);
    if (d < HUB_R || d > len + 20) return false;
    const rel = wrap(Math.atan2(y - HUB.y, x - HUB.x) - a0);
    return s >= 0 ? rel >= -0.08 && rel <= s + 0.08 : rel <= 0.08 && rel >= s - 0.08;
  };
  const inSwing = (x: number, y: number): boolean =>
    inSector(from, sweep, ARROW, x, y) || inSector(from + Math.PI, sweep, FIN, x, y);

  const openShutters = (time: number) => {
    state = 'warn';
    warnStart = time;
    at = time + warnOf(ctx, WARN);
    from = angle;
    to = heading(next);
    sweep = sweepOf(from, to);
    ctx.sfx('gear-turn');
    ctx.banner(`THE WIND GOES ${MOUTHS[next].name}`, '#d8f4ff');
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (at === 0) at = time + 3000;
      if (state === 'rest' && time >= at) openShutters(time);
      else if (state === 'warn' && time >= at) {
        state = 'swing';
        at = time + SWING_MS;
        struck.player = struck.npc = false;
        ctx.sfx('slash');
        for (const w of WHO) {
          const f = fighter(w);
          if (alive(f) && dist(f.x, f.y, HUB.x, HUB.y) < HUB_R) {
            windwardUntil[w] = time + WINDWARD_MS;
            ctx.float(f.x, f.y - 56, 'WINDWARD', '#ffe08a');
            ctx.sfx('wings');
          }
        }
      } else if (state === 'swing') {
        const prev = angle;
        const k = clampN(1 - (at - time) / SWING_MS, 0, 1);
        angle = from + sweep * (1 - (1 - k) * (1 - k));
        // Anything the blades passed over this frame is cut.
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || struck[w]) continue;
          const d = dist(f.x, f.y, HUB.x, HUB.y);
          if (d < HUB_R) continue;
          const fa = Math.atan2(f.y - HUB.y, f.x - HUB.x);
          for (const [off, len] of [[0, ARROW], [Math.PI, FIN]] as [number, number][]) {
            if (d > len + 18) continue;
            const a0 = prev + off, a1 = angle + off;
            const span = wrap(a1 - a0);
            const rel = wrap(fa - a0);
            const pad = Math.atan2(18, Math.max(40, d));
            const crossed = span >= 0 ? rel >= -pad && rel <= span + pad : rel <= pad && rel >= span - pad;
            if (crossed) {
              struck[w] = true;
              ctx.hit(f, 16, f.x, f.y);
              const tan = fa + (sweep >= 0 ? Math.PI / 2 : -Math.PI / 2);
              ctx.nudge(f, Math.cos(tan) * 60, Math.sin(tan) * 60);
              ctx.float(f.x, f.y - 50, 'CUT', '#e8f0f8');
              ctx.sfx('clang');
              break;
            }
          }
        }
        if (time >= at) {
          angle = to;
          mouth = next;
          next = (mouth + 1 + Math.floor(ctx.rng() * (MOUTHS.length - 1))) % MOUTHS.length;
          state = 'rest';
          at = time + EVERY - warnOf(ctx, WARN) - SWING_MS;
        }
      }
      // The wind from the open mouth pushes everyone downwind; the resting blade bites.
      const m = MOUTHS[mouth];
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const dx = f.x - m.x, dy = f.y - m.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const push = WIND * (1.3 - clampN(d / 900, 0, 0.8));
        ctx.nudge(f, (dx / d) * push * step, (dy / d) * push * step);
        if (state !== 'swing' && time - lastBite[w] > 700) {
          if (onBlade(angle, ARROW, f.x, f.y, 14) || onBlade(angle + Math.PI, FIN, f.x, f.y, 14)) {
            lastBite[w] = time;
            ctx.hit(f, 6, f.x, f.y);
            const side = Math.sign(-(f.x - HUB.x) * Math.sin(angle) + (f.y - HUB.y) * Math.cos(angle)) || 1;
            ctx.nudge(f, -Math.sin(angle) * side * 34, Math.cos(angle) * side * 34);
          }
        }
      }
    },
    playerTakenMult() { return ctx.scene.time.now < windwardUntil.npc ? 1.2 : 1; },
    npcTakenMult() { return ctx.scene.time.now < windwardUntil.player ? 1.2 : 1; },
    npcSeek() {
      if (state !== 'warn') return null;
      const n = ctx.npc;
      const left = (at - ctx.scene.time.now) / 1000;
      // The rose if she can make it; otherwise anywhere the blades will not pass.
      if (dist(n.x, n.y, HUB.x, HUB.y) < left * 150) return HUB;
      if (!inSwing(n.x, n.y)) return null;
      let best: Pt | null = null, bd = Infinity;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        for (const r of [150, 290]) {
          const x = clampN(HUB.x + Math.cos(a) * r, 50, W - 50), y = clampN(HUB.y + Math.sin(a) * r, top + 40, H - 40);
          if (inSwing(x, y)) continue;
          const d = dist(n.x, n.y, x, y);
          if (d < bd) { bd = d; best = { x, y }; }
        }
      }
      return best;
    },
    drawGround(g, time) {
      // The rose under the hub, and the swing the vane is about to make.
      g.fillStyle(0x1a120a, 0.5); g.fillCircle(HUB.x, HUB.y, HUB_R + 6);
      g.lineStyle(3, BRASS, 0.8); g.strokeCircle(HUB.x, HUB.y, HUB_R);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.fillStyle(k % 2 ? BRASS_DARK : BRASS, 0.8);
        g.fillTriangle(HUB.x - Math.sin(a) * 5, HUB.y + Math.cos(a) * 5, HUB.x + Math.sin(a) * 5, HUB.y - Math.cos(a) * 5, HUB.x + Math.cos(a) * HUB_R * (k % 2 ? 0.6 : 0.95), HUB.y + Math.sin(a) * HUB_R * (k % 2 ? 0.6 : 0.95));
      }
      if (state === 'warn') {
        const k = clampN((time - warnStart) / Math.max(1, at - warnStart), 0, 1);
        for (const [off, len] of [[0, ARROW], [Math.PI, FIN]] as [number, number][]) {
          const a0 = from + off;
          const a1 = a0 + sweep;
          g.fillStyle(0xe8f0f8, 0.06 + k * 0.16);
          g.slice(HUB.x, HUB.y, len, Math.min(a0, a1), Math.max(a0, a1), false); g.fillPath();
          g.lineStyle(2, 0xffffff, 0.3 + k * 0.5);
          g.lineBetween(HUB.x, HUB.y, HUB.x + Math.cos(a1) * len, HUB.y + Math.sin(a1) * len);
          if (k > 0.78 && Math.floor(time / 100) % 2 === 0) {
            g.lineStyle(3, 0xff9a8a, 0.7);
            g.beginPath(); g.arc(HUB.x, HUB.y, len, Math.min(a0, a1), Math.max(a0, a1), false); g.strokePath();
          }
        }
        // The rose glows: the one safe place.
        g.lineStyle(3, 0xffe08a, 0.4 + Math.sin(time / 90) * 0.3); g.strokeCircle(HUB.x, HUB.y, HUB_R + 4);
      }
      // The tunnel mouths and their shutters: open, closing, or about to open.
      MOUTHS.forEach((m, i) => {
        const open = i === mouth;
        const opening = state === 'warn' && i === next;
        const k = opening ? clampN((time - warnStart) / Math.max(1, at - warnStart), 0, 1) : open ? 1 : 0;
        const horiz = m.y === H;
        const w = horiz ? 200 : 26, h = horiz ? 26 : 200;
        const x = horiz ? m.x - 100 : m.x === 0 ? 0 : W - 26;
        const y = horiz ? H - 26 : m.y - 100;
        g.fillStyle(0x0a0e14, 1); g.fillRect(x, y, w, h);
        g.lineStyle(3, OAK, 1);
        const n = 8;
        for (let j = 0; j < n; j++) {
          // Louvres: flat when shut, edge-on when open.
          const tilt = k * 0.9;
          if (horiz) { const lx = x + 12 + j * ((w - 24) / (n - 1)); g.lineBetween(lx - 10 * (1 - tilt), y + 13, lx + 10 * (1 - tilt), y + 13); }
          else { const ly = y + 12 + j * ((h - 24) / (n - 1)); g.lineBetween(x + 13, ly - 10 * (1 - tilt), x + 13, ly + 10 * (1 - tilt)); }
        }
        g.lineStyle(2, opening ? 0xffe08a : BRASS_DARK, 1); g.strokeRect(x, y, w, h);
      });
    },
    drawAir(g, time) {
      // The wind out of the open mouth.
      const m = MOUTHS[mouth];
      const a = Math.atan2(HUB.y - m.y, HUB.x - m.x);
      for (let i = 0; i < 22; i++) {
        const k = ((time / 1400) + i / 22) % 1;
        const spread = (((i * 37) % 21) - 10) / 10;
        const r = k * 900;
        const x = m.x + Math.cos(a) * r - Math.sin(a) * spread * 260 * k;
        const y = m.y + Math.sin(a) * r + Math.cos(a) * spread * 260 * k;
        if (y < top || y > H || x < 0 || x > W) continue;
        windStreak(g, x, y, a, 28, 0.45 * (1 - k * 0.6));
      }
      // The vane itself, on a tall brass post, its shadow under it.
      g.lineStyle(HALF * 1.6, 0x000000, 0.18);
      g.lineBetween(HUB.x + 10 - Math.cos(angle) * FIN, HUB.y + 14 - Math.sin(angle) * FIN, HUB.x + 10 + Math.cos(angle) * ARROW, HUB.y + 14 + Math.sin(angle) * ARROW);
      weathervane(g, HUB.x, HUB.y, angle, ARROW, 1, 0x3a4250);
      if (state === 'swing') {
        for (let k = 1; k <= 3; k++) {
          const ta = angle - Math.sign(sweep) * k * 0.08;
          g.lineStyle(3, 0xffffff, 0.3 / k);
          g.lineBetween(HUB.x, HUB.y, HUB.x + Math.cos(ta) * ARROW, HUB.y + Math.sin(ta) * ARROW);
        }
      }
      // A brass cockerel standing on the hub, turning with it.
      const ca = Math.cos(angle), sa = Math.sin(angle);
      g.fillStyle(BRASS, 1); g.fillEllipse(HUB.x, HUB.y - 14, 26, 16);
      g.fillCircle(HUB.x + ca * 10, HUB.y - 24 + sa * 2, 6);
      g.fillStyle(OVERDUE, 1); g.fillTriangle(HUB.x + ca * 10 - 3, HUB.y - 30, HUB.x + ca * 10 + 3, HUB.y - 30, HUB.x + ca * 10, HUB.y - 36);
      g.fillStyle(BRASS_DARK, 1); g.fillTriangle(HUB.x - ca * 12, HUB.y - 14, HUB.x - ca * 22, HUB.y - 30, HUB.x - ca * 18, HUB.y - 8);
      for (const w of WHO) {
        if (time >= windwardUntil[w]) continue;
        const f = fighter(w);
        if (!alive(f)) continue;
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 500) + i / 3) % 1;
          g.fillStyle(0xffe08a, 0.8 * (1 - ph)); g.fillTriangle(f.x - 6 + i * 6, f.y - 30 - ph * 20, f.x - 2 + i * 6, f.y - 38 - ph * 20, f.x + 2 + i * 6, f.y - 30 - ph * 20);
        }
      }
    },
    drawHud(g, time) {
      const cx = ctx.W / 2, cy = top + 22;
      // A little compass: where the wind is, where it goes next.
      g.fillStyle(0x0c1420, 0.88); g.fillCircle(cx, cy + 4, 20);
      g.lineStyle(2, BRASS, 1); g.strokeCircle(cx, cy + 4, 20);
      weathervane(g, cx, cy + 4, angle, 15, 1, 0xd8e4f0);
      if (state === 'warn') {
        const k = clampN((at - time) / Math.max(1, at - warnStart), 0, 1);
        g.lineStyle(3, k < 0.25 ? 0xff9a8a : 0xffe08a, 1);
        g.beginPath(); g.arc(cx, cy + 4, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const LUNG_GIMMICKS: GimmickDef[] = [
  {
    id: 'lung-great-bellows',
    rules: 'The wall bellows draw, then blow a gale across their band — thrown into the far wall, you are pinned. Hide in a post\'s lee.',
    make: greatBellows,
  },
  {
    id: 'lung-corked',
    rules: 'Belts carry you and burstable bottles. The Press corks whoever it stamps (silenced); break your own bottle back before she drinks it.',
    make: corked,
  },
  {
    id: 'lung-great-vane',
    rules: 'The wind pushes you downwind. When it changes, the vane swings and cuts the floor it crosses. Stand on the hub to ride it (+20%).',
    make: greatVane,
  },
];

export const LUNG_WARDENS: EncounterDef[] = [
  {
    id: 'lung-warden-1', court: 'lung', name: 'The Great Bellows',
    foeName: 'Bellowsmaster Ignatius Gasket', foeElement: 'pressure', difficulty: 5, hpMult: 1.2,
    gimmick: 'lung-great-bellows', at: { x: 900, y: 1790 }, coins: 125,
    look: { body: 0xd8a888, accent: LEATHER, hat: 'aviator', traits: ['apron', 'beard', 'tool'], size: 1.3, eye: 0xd8f4ff },
    challenge: [
      'One-and. Two-and. Three-and. You hear that? That is the isle breathing. In here. On my count.',
      'Every breath on Highspire comes up my pipes, and I decide how hard they pull.',
      'Stand there, then. Stand right in the band. I will show you what a full bellows does.',
    ],
    beaten: [
      'You stood in the lee of my own posts. Thirty years and I never once thought to stand behind them.',
      'Go on. I will let the bellows rest. Listen — the whole hall is breathing on its own.',
    ],
  },
  {
    id: 'lung-warden-2', court: 'lung', name: 'Corked',
    foeName: 'Corkwarden Seraphine Stopple', foeElement: 'soul', difficulty: 5, hpMult: 1.25,
    gimmick: 'lung-corked', at: { x: 900, y: 1105 }, coins: 125,
    look: { body: 0xe0c8b8, accent: ROYAL_DEEP, hat: 'veil', traits: ['apron', 'satchel', 'glasses'], size: 1.0, eye: 0xc8a8ff },
    challenge: [
      'Hold still. It is only air. You were going to let it go anyway.',
      'Forty thousand bottles on this floor, and I know whose breath is in every one. I tasted them.',
      'Let us cork you, dear, and see what you taste of.',
    ],
    beaten: [
      'You took it back. Out of the bottle, off my belt, out of my mouth. Nobody takes it back.',
      'I shall leave the press up. Go on to the gallery. Mind the vanes; Haske lets the wind choose.',
    ],
  },
  {
    id: 'lung-warden-3', court: 'lung', name: 'The Great Vane',
    foeName: 'Vanesmith Tobin Haske', foeElement: 'metal', difficulty: 5, hpMult: 1.3,
    gimmick: 'lung-great-vane', at: { x: 900, y: 440 }, coins: 125,
    look: { body: 0xb89878, accent: 0x3a4250, hat: 'helmet', traits: ['tool', 'scarf', 'eyepatch'], size: 1.2, eye: 0xffe08a },
    challenge: [
      'The King says where the wind blows. I make it so. I open a shutter, and the whole sky turns round.',
      'My vane has never pointed the wrong way once. It points at the wind, and it cuts whatever is in between.',
      'Pick a tunnel. Any tunnel. I will turn the sky to face it.',
    ],
    beaten: [
      'You stood on my rose and rode it round. Of course. The only still place on a vane is the middle.',
      'The hub is through there. He sits on the bellows and he breathes for all of us. Tell him I said enough.',
    ],
  },
];
