import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { blackFlame, duskSigil, fungusShelf, moth } from './art';
import {
  BARK, BARK_DARK, BARK_LIT, BLACKFLAME_EDGE, CANDLE, CANDLE_LIT, CLOTH, CLOTH_SHEEN, CRESCENT, DUSK, DUSK_DARK,
  DUSK_LIT, FOXFIRE, HEART, HEART_DARK, IRON, IRON_LIT, LEAF, MOON, MOON_DIM, MOULD, MOULD_DARK, STONE_LIT,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Dusk, the Lamp-Snuffer — the Matriarch's broodling, governor of the Umbral Court.
 *
 * Dusk was the child who was afraid of the dark, so his mother gave him all of it. He closed the
 * last gaps in the canopy, licensed the black lamps, and taught the court that a thing which cannot
 * be seen cannot be informed on — and then hired every informer on the isle to sit in it. He is
 * gentle, soft-spoken, and he has never once in his life been seen in good light. He fights the
 * way the evening comes on:
 *
 * • **Long Shadows** (orbiting): the light is low and his shadow is enormous — it stretches across
 *   the floor and its hand closes where it lies, dragging you to him; he plants black pickets
 *   whose shadows swing round as his lamp swings; and he weaves the dark across the room in warp
 *   and weft, the knots bursting row by row like a shuttle passing.
 * • **Nightfall** (stalking, the room dark): he carries the only lantern. He is only solid in its
 *   light — so he hangs it and walks off into the black. Strike the lantern to knock it toward him.
 *   Moths come off it at you (but they cannot leave a hung lamp alone); and when he snuffs it, the
 *   only safe place in the room is where its light was.
 * • **Umbra** (hard, blinking): he becomes a shadow on the floor, solid only where the canopy lets
 *   a shaft of light through; and hands come up out of the floor round you.
 */

const TOP = 96;

/** Shared per fight: which phase the Prince is in (set from `drawDecor`, which runs every frame). */
let duskPhase = 0;

/** Nightfall's lantern, shared so `drawLit` can show what it lights. */
interface Lantern { x: number; y: number; held: boolean; lightR: number; snuffK: number }
let LANTERN: Lantern = { x: 480, y: 360, held: true, lightR: 150, snuffK: 0 };

/** Umbra's shafts of light, shared so `drawDecor` can show him solid or flat. */
interface Shaft { x: number; y: number; vx: number; vy: number; r: number; openAt: number }
let SHAFTS: Shaft[] = [];

const inShaft = (x: number, y: number) => SHAFTS.some((s) => dist(s.x, s.y, x, y) < s.r);

// ── Signature: Shadow Reach ──────────────────────────────────────────
// His shadow stretches out across the floor toward you, a long arm with fingers spread at its end.
// When it has reached its length, the whole shadow is struck solid along its line, and its hand
// closes — anyone in the hand is dragged toward him.

const reach = (tk: BossToolkit): SignatureMove => {
  let castAt = -1;
  let fireAt = 0;
  let fired = false;
  let a = 0;
  let len = 0;
  let ox = 0, oy = 0;
  const HALF = 28;
  const tip = () => ({ x: ox + Math.cos(a) * len, y: oy + Math.sin(a) * len });
  return {
    durationMs: 1700,
    windupMs: 500,
    gesture: 'point',
    tell: 'LONG SHADOW',
    cast(time) {
      castAt = time;
      fired = false;
      ox = tk.bossX; oy = tk.bossY + 20;
      a = tk.angleToPlayer(ox, oy);
      len = clamp(dist(ox, oy, tk.player.x, tk.player.y) + 70, 220, 640);
      fireAt = time + tk.warn(1050);
      tk.sfx('hush');
    },
    update(time) {
      if (castAt < 0 || fired || time < fireAt) return;
      fired = true;
      const p = tk.player;
      const t = tip();
      tk.sfx('whip');
      if (p.active && p.hp > 0) {
        if (dist(p.x, p.y, t.x, t.y) < 64) {
          tk.hitPlayer(15, p.x, p.y);
          tk.pull(tk.bossX, tk.bossY, 130, 700);
        } else if (segDist(p.x, p.y, ox, oy, t.x, t.y) < HALF + 12) {
          tk.hitPlayer(11, p.x, p.y);
          tk.slowPlayer(0.6, 700);
        }
      }
    },
    drawGround(g, time) {
      if (castAt < 0) return;
      const grow = clamp((time - castAt) / Math.max(1, fireAt - castAt), 0, 1);
      const after = fired ? clamp((time - fireAt) / 500, 0, 1) : 0;
      if (fired && after >= 1) return;
      const L = len * (fired ? 1 - after : grow);
      const px = -Math.sin(a), py = Math.cos(a);
      const ex = ox + Math.cos(a) * L, ey = oy + Math.sin(a) * L;
      // The arm: a long tapering silhouette.
      g.fillStyle(0x030108, fired ? 0.85 : 0.35 + grow * 0.35);
      g.fillTriangle(ox + px * 22, oy + py * 22, ox - px * 22, oy - py * 22, ex + px * 10, ey + py * 10);
      g.fillTriangle(ox - px * 22, oy - py * 22, ex - px * 10, ey - py * 10, ex + px * 10, ey + py * 10);
      // The hand: palm and five fingers spread, closing as it fires.
      const close = fired ? 1 : 0;
      g.fillStyle(0x030108, fired ? 0.9 : 0.4 + grow * 0.4); g.fillEllipse(ex, ey, 40, 40);
      for (let f = 0; f < 5; f++) {
        const fa = a + (f - 2) * (0.42 - close * 0.3);
        const fl = 46 - close * 26;
        g.lineStyle(9 - Math.abs(f - 2), 0x030108, fired ? 0.9 : 0.4 + grow * 0.4);
        g.lineBetween(ex, ey, ex + Math.cos(fa) * fl, ey + Math.sin(fa) * fl);
      }
      if (!fired) {
        g.lineStyle(2, DUSK_LIT, 0.25 + grow * 0.5); g.strokeCircle(ox + Math.cos(a) * len, oy + Math.sin(a) * len, 64);
        g.lineStyle(1, DUSK_LIT, 0.2 + grow * 0.3);
        g.lineBetween(ox + px * (HALF + 4), oy + py * (HALF + 4), ox + Math.cos(a) * len + px * (HALF + 4), oy + Math.sin(a) * len + py * (HALF + 4));
        g.lineBetween(ox - px * (HALF + 4), oy - py * (HALF + 4), ox + Math.cos(a) * len - px * (HALF + 4), oy + Math.sin(a) * len - py * (HALF + 4));
      }
    },
    onPhaseEnd() { castAt = -1; },
  };
};

// ── Signature: Shadow Pickets ────────────────────────────────────────
// He plants black pickets in a ring about you and lifts a low lamp. Each picket throws a long
// wedge of shadow away from the lamp; then the lamp swings, and the shadows swing with it. Shadow
// bites. Stand in the light between them and turn as they turn.

interface Picket { x: number; y: number }

const pickets = (tk: BossToolkit): SignatureMove => {
  let posts: Picket[] = [];
  let lampCx = 0, lampCy = 0;
  let castAt = -1;
  let liveAt = 0;
  let endAt = 0;
  let lastTick = 0;
  let spin = 1;
  const LEN = 280;
  const lampAt = (time: number) => {
    const k = clamp((time - liveAt) / Math.max(1, endAt - liveAt), 0, 1);
    const a = -Math.PI / 2 + spin * k * 1.3;
    return { x: lampCx + Math.cos(a) * 60, y: lampCy + Math.sin(a) * 40 };
  };
  const inShadow = (x: number, y: number, time: number) => {
    const L = lampAt(time);
    for (const p of posts) {
      const d = Math.max(1, dist(L.x, L.y, p.x, p.y));
      const ux = (p.x - L.x) / d, uy = (p.y - L.y) / d;
      const t = (x - p.x) * ux + (y - p.y) * uy;
      if (t < 0 || t > LEN) continue;
      const perp = Math.abs((x - p.x) * -uy + (y - p.y) * ux);
      if (perp < 8 + (t / LEN) * 30) return true;
    }
    return false;
  };
  return {
    durationMs: 2000,
    windupMs: 600,
    gesture: 'raise',
    tell: 'BLACK PICKETS',
    cast(time) {
      castAt = time;
      liveAt = time + tk.warn(1000);
      endAt = liveAt + (tk.hard ? 3200 : 2700);
      lampCx = tk.bossX; lampCy = tk.bossY;
      spin = Math.random() < 0.5 ? 1 : -1;
      const p = tk.player;
      const n = tk.hard ? 6 : 5;
      posts = [];
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        posts.push({ x: tk.clampX(p.x + Math.cos(a) * 130), y: tk.clampY(p.y + Math.sin(a) * 100) });
      }
      tk.sfx('stone-rise');
    },
    update(time) {
      if (castAt < 0) return;
      if (time > endAt + 300) { castAt = -1; posts = []; return; }
      if (time < liveAt || time > endAt) return;
      const p = tk.player;
      if (time - lastTick > 420 && p.active && p.hp > 0 && inShadow(p.x, p.y, time)) {
        lastTick = time;
        tk.hitPlayer(6, p.x, p.y);
        tk.slowPlayer(0.75, 500);
      }
    },
    drawGround(g, time) {
      if (castAt < 0) return;
      const L = lampAt(time);
      const live = time >= liveAt;
      const k = clamp((time - castAt) / Math.max(1, liveAt - castAt), 0, 1);
      for (const p of posts) {
        const d = Math.max(1, dist(L.x, L.y, p.x, p.y));
        const ux = (p.x - L.x) / d, uy = (p.y - L.y) / d;
        const px = -uy, py = ux;
        const ex = p.x + ux * LEN, ey = p.y + uy * LEN;
        g.fillStyle(0x030108, live ? 0.62 : 0.15 + k * 0.25);
        g.fillTriangle(p.x + px * 8, p.y + py * 8, p.x - px * 8, p.y - py * 8, ex + px * 38, ey + py * 38);
        g.fillTriangle(p.x - px * 8, p.y - py * 8, ex - px * 38, ey - py * 38, ex + px * 38, ey + py * 38);
        if (live) { g.lineStyle(1.5, DUSK_LIT, 0.4); g.lineBetween(p.x + px * 8, p.y + py * 8, ex + px * 38, ey + py * 38); g.lineBetween(p.x - px * 8, p.y - py * 8, ex - px * 38, ey - py * 38); }
      }
      // The lamp's warm patch on the floor.
      glow(g, L.x, L.y + 20, 70, CANDLE, live ? 0.05 : 0.025, 3);
    },
    drawAir(g, time) {
      if (castAt < 0) return;
      const rise = clamp((time - castAt) / 400, 0, 1);
      for (const p of posts) {
        const h = 46 * rise;
        g.fillStyle(0x0a0610, 1); g.fillRect(p.x - 3, p.y - h, 6, h);
        g.fillTriangle(p.x - 4, p.y - h, p.x + 4, p.y - h, p.x, p.y - h - 9);
        g.fillStyle(BLACKFLAME_EDGE, 0.6); g.fillRect(p.x - 3, p.y - h, 1.5, h);
        g.fillStyle(MOULD_DARK, 0.8); g.fillEllipse(p.x, p.y + 1, 14, 5);
      }
      // The lamp, lifted in his hand's place: a low lamp swinging on a short chain.
      const L = lampAt(time);
      g.lineStyle(1.5, IRON, 1); g.lineBetween(L.x, L.y - 28, L.x, L.y - 12);
      g.fillStyle(IRON, 1); g.fillRect(L.x - 7, L.y - 13, 14, 3); g.fillRect(L.x - 6, L.y + 4, 12, 3);
      g.fillStyle(CANDLE, 0.85); g.fillRect(L.x - 5, L.y - 10, 10, 14);
      g.fillStyle(CANDLE_LIT, 1); g.fillTriangle(L.x - 2, L.y + 2, L.x + 2, L.y + 2, L.x, L.y - 7);
      glow(g, L.x, L.y - 3, 26, CANDLE, 0.06, 3);
    },
    onPhaseEnd() { castAt = -1; posts = []; },
  };
};

// ── Signature: Weft of Night ─────────────────────────────────────────
// He works his hands like a weaver and black thread shoots across the room: three warp threads
// one way, three weft threads the other, crossed round you. The knots where they cross swell with
// dark — then burst row by row as an unseen shuttle passes, all but one knot of the nine.

interface Knot { x: number; y: number; row: number; burstAt: number; burst: boolean; spared: boolean }

const weft = (tk: BossToolkit): SignatureMove => {
  let knots: Knot[] = [];
  let xs: number[] = [];
  let ys: number[] = [];
  let castAt = -1;
  let doneAt = 0;
  const R = 56;
  return {
    durationMs: 2300,
    windupMs: 550,
    hold: 'conduct',
    tell: 'WEFT OF NIGHT',
    cast(time) {
      castAt = time;
      const p = tk.player;
      const gap = 120;
      xs = [-1, 0, 1].map((k) => tk.clampX(p.x + k * gap + (Math.random() - 0.5) * 30, 70));
      ys = [-1, 0, 1].map((k) => clamp(p.y + k * (gap * 0.8) + (Math.random() - 0.5) * 24, TOP + 50, tk.H - 50));
      const spare = Math.floor(Math.random() * 9);
      const fromTop = Math.random() < 0.5;
      knots = [];
      let i = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = fromTop ? r : 2 - r;
          knots.push({ x: xs[c], y: ys[r], row, burstAt: time + tk.warn(1250) + row * 340, burst: false, spared: i === spare });
          i++;
        }
      }
      doneAt = time + tk.warn(1250) + 3 * 340 + 600;
      tk.sfx('whip');
    },
    update(time) {
      if (castAt < 0) return;
      for (const k of knots) {
        if (k.burst || k.spared || time < k.burstAt) continue;
        k.burst = true;
        tk.explode(k.x, k.y, R, 13, DUSK_DARK);
        tk.sfx('slash');
      }
      if (time > doneAt) { castAt = -1; knots = []; }
    },
    drawGround(g, time) {
      if (castAt < 0) return;
      const shoot = clamp((time - castAt) / 300, 0, 1);
      // Threads: warp (vertical) and weft (horizontal), shooting out from the crossing.
      for (const x of xs) {
        const cy = ys[1];
        g.lineStyle(3, CLOTH, 0.9); g.lineBetween(x, cy - (cy - TOP) * shoot, x, cy + (tk.H - cy) * shoot);
        g.lineStyle(1, CLOTH_SHEEN, 0.6); g.lineBetween(x + 1, cy - (cy - TOP) * shoot, x + 1, cy + (tk.H - cy) * shoot);
      }
      for (const y of ys) {
        const cx = xs[1];
        g.lineStyle(3, CLOTH, 0.9); g.lineBetween(cx - cx * shoot, y, cx + (tk.W - cx) * shoot, y);
        g.lineStyle(1, CLOTH_SHEEN, 0.6); g.lineBetween(cx - cx * shoot, y + 1, cx + (tk.W - cx) * shoot, y + 1);
      }
      for (const k of knots) {
        if (k.burst) {
          const a = clamp((time - k.burstAt) / 400, 0, 1);
          // Frayed ends where it burst.
          for (let i = 0; i < 8; i++) { const b = (i / 8) * Math.PI * 2; g.lineStyle(2, CLOTH, 1 - a); g.lineBetween(k.x, k.y, k.x + Math.cos(b) * R * a, k.y + Math.sin(b) * R * a); }
          continue;
        }
        const w = clamp(1 - (k.burstAt - time) / 900, 0, 1);
        if (k.spared) {
          // The knot that holds: a little pale loop.
          g.lineStyle(2, MOON, 0.6); g.strokeCircle(k.x, k.y, 10);
          continue;
        }
        g.fillStyle(0x05020c, 0.3 + w * 0.5); g.fillCircle(k.x, k.y, 10 + w * 12);
        g.lineStyle(2, DUSK_LIT, 0.25 + w * 0.6); g.strokeCircle(k.x, k.y, R);
      }
    },
    drawAir(g, time) {
      if (castAt < 0) return;
      // The shuttle: a pale spindle running along the row about to burst.
      const next = knots.filter((k) => !k.burst && !k.spared).sort((a, b) => a.burstAt - b.burstAt)[0];
      if (!next) return;
      const k = clamp(1 - (next.burstAt - time) / 340, 0, 1);
      const sx = 30 + k * (tk.W - 60);
      g.fillStyle(lit(DUSK, 0.3), 0.9); g.fillEllipse(sx, next.y, 30, 8);
      g.fillStyle(CRESCENT, 0.9); g.fillEllipse(sx - 6, next.y - 1, 8, 3);
    },
    onPhaseEnd() { castAt = -1; knots = []; },
  };
};

// ── Signature: The Hung Lantern ──────────────────────────────────────
// Nightfall. He carries the only light in the room; he is solid only inside its light. He hangs
// it where he stands and walks off into the dark. Strike the lantern and it swings toward him.
// After a while he calls it home: it flies back to his hand along a line, burning what it crosses.

const lantern = (tk: BossToolkit): SignatureMove => {
  const L: Lantern = { x: tk.W / 2, y: tk.H / 2, held: true, lightR: 150, snuffK: 0 };
  LANTERN = L;
  let target: StrikeTarget | null = null;
  let hungAt = -1;
  let callAt = 0;
  let flyAt = 0;
  let flying = false;
  let flyFrom = { x: 0, y: 0 };
  const HUNG_MS = 6500;
  const CALL_WARN = 900;

  function home(): void {
    L.held = true;
    hungAt = -1;
    flying = false;
    target?.remove();
    target = null;
  }

  return {
    durationMs: 900,
    windupMs: 450,
    gesture: 'point',
    tell: 'HE HANGS THE LANTERN',
    cast(time) {
      if (duskPhase !== 1) return;
      if (!L.held) return;
      L.held = false;
      hungAt = time;
      callAt = time + HUNG_MS;
      flyAt = callAt + tk.warn(CALL_WARN);
      L.x = tk.clampX(tk.bossX + 24, 70); L.y = tk.clampY(tk.bossY - 6, 60);
      target = tk.spawnTarget({
        x: L.x, y: L.y, r: 22,
        onStruck: (by) => {
          if (by !== 'player' || L.held || flying) return;
          // Knocked: it swings a long step toward him.
          const d = Math.max(1, dist(L.x, L.y, tk.bossX, tk.bossY));
          const step = Math.min(d - 20, 130);
          if (step <= 0) return;
          L.x = tk.clampX(L.x + ((tk.bossX - L.x) / d) * step, 60);
          L.y = tk.clampY(L.y + ((tk.bossY - L.y) / d) * step, 50);
          target?.moveTo(L.x, L.y);
          tk.sfx('clang');
        },
      });
      tk.sfx('chain');
    },
    update(time) {
      if (duskPhase !== 1) {
        if (!L.held) home();
        return;
      }
      if (L.held) {
        L.x = tk.bossX + 26; L.y = tk.bossY - 8;
      } else if (!flying && time >= flyAt) {
        // Called home: it flies along the line to his hand.
        flying = true;
        flyFrom = { x: L.x, y: L.y };
        const p = tk.player;
        if (p.active && p.hp > 0 && segDist(p.x, p.y, flyFrom.x, flyFrom.y, tk.bossX, tk.bossY) < 34) tk.hitPlayer(13, p.x, p.y);
        tk.sfx('whoosh');
        tk.schedule(260, () => home());
      }
      L.lightR = tk.hard ? 130 : 150;
    },
    takenMult() {
      if (duskPhase !== 1) return 1;
      return dist(tk.bossX, tk.bossY, L.x, L.y) < L.lightR ? 1 : 0.15;
    },
    drawGround(g, time) {
      if (duskPhase !== 1 || L.held || flying) return;
      if (time >= callAt) {
        const k = clamp((time - callAt) / Math.max(1, flyAt - callAt), 0, 1);
        g.lineStyle(4 + k * 6, CANDLE, 0.2 + k * 0.5); g.lineBetween(L.x, L.y, tk.bossX, tk.bossY);
      }
      // The hook it hangs on: a crook driven into the floor.
      g.lineStyle(3, IRON, 1); g.lineBetween(L.x - 10, L.y + 30, L.x - 10, L.y - 18);
      g.beginPath(); g.arc(L.x - 2, L.y - 18, 8, Math.PI, 0, false); g.strokePath();
      if (hungAt >= 0) {
        const left = clamp(1 - (time - hungAt) / HUNG_MS, 0, 1);
        g.lineStyle(2, CANDLE, 0.5); g.beginPath(); g.arc(L.x, L.y + 30, 12, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (duskPhase !== 1) return;
      // The light: drawn above the dark, so it reads as the one lit place in the room.
      const r = L.lightR * (1 - L.snuffK * 0.85);
      for (let k = 6; k >= 1; k--) { g.fillStyle(CANDLE, 0.022 * (1 - L.snuffK)); g.fillCircle(L.x, L.y + 10, r * (0.3 + k * 0.12)); }
      g.lineStyle(1.5, CANDLE_LIT, 0.35 * (1 - L.snuffK)); g.strokeCircle(L.x, L.y + 10, r);
      // The lantern: a tall iron lantern with real glass, a warm flame.
      const fl = 1 + Math.sin(time / 80) * 0.08;
      g.fillStyle(IRON, 1); g.fillTriangle(L.x - 9, L.y - 12, L.x + 9, L.y - 12, L.x, L.y - 22);
      g.fillRect(L.x - 1, L.y - 28, 2, 7);
      g.fillStyle(CANDLE, 0.75 * (1 - L.snuffK * 0.7)); g.fillRect(L.x - 7, L.y - 12, 14, 18);
      g.lineStyle(1.5, IRON, 1); g.strokeRect(L.x - 7, L.y - 12, 14, 18); g.lineBetween(L.x, L.y - 12, L.x, L.y + 6);
      g.fillStyle(IRON, 1); g.fillRect(L.x - 9, L.y + 6, 18, 3);
      g.fillStyle(CANDLE_LIT, 1 - L.snuffK); g.fillTriangle(L.x - 2.5 * fl, L.y + 3, L.x + 2.5 * fl, L.y + 3, L.x, L.y - 8 * fl);
      glow(g, L.x, L.y - 2, 24, CANDLE, 0.08 * (1 - L.snuffK), 3);
    },
    onPhaseEnd() { home(); },
  };
};

// ── Signature: Moths ─────────────────────────────────────────────────
// Dusty moths pour off the lantern, circle it once, then dive at you, turning after you as they
// fly. They cannot leave a hung lantern alone: any that pass close to one are caught by it and
// circle it till they burn.

interface Moth { x: number; y: number; a: number; bornAt: number; diveAt: number; caught: number; dead: boolean; seed: number }

const moths = (tk: BossToolkit): SignatureMove => {
  let flock: Moth[] = [];
  return {
    durationMs: 1400,
    windupMs: 500,
    gesture: 'raise',
    tell: 'MOTHS',
    cast(time) {
      const n = tk.hard ? 12 : 10;
      for (let i = 0; i < n; i++) {
        flock.push({ x: LANTERN.x, y: LANTERN.y, a: (i / n) * Math.PI * 2, bornAt: time, diveAt: time + tk.warn(700) + i * 70, caught: -1, dead: false, seed: Math.random() * 9 });
      }
      tk.sfx('wings');
    },
    update(time, dt) {
      const p = tk.player;
      for (const m of flock) {
        if (m.dead) continue;
        if (time - m.bornAt > 5200) { m.dead = true; continue; }
        if (m.caught >= 0) {
          // Circling the hung lantern till it burns.
          const k = (time - m.caught) / 1500;
          m.x = LANTERN.x + Math.cos(time / 160 + m.seed) * (30 - k * 22);
          m.y = LANTERN.y + Math.sin(time / 160 + m.seed) * (22 - k * 16);
          if (k >= 1) { m.dead = true; tk.boom(m.x, m.y, 10, CANDLE); }
          continue;
        }
        if (time < m.diveAt) {
          // The launch: a spiral out round the lantern.
          const k = (time - m.bornAt) / Math.max(1, m.diveAt - m.bornAt);
          m.x = LANTERN.x + Math.cos(m.a + k * 4) * (16 + k * 40);
          m.y = LANTERN.y + Math.sin(m.a + k * 4) * (12 + k * 30);
          continue;
        }
        if (time - m.diveAt < 30) m.a = Math.atan2(p.y - m.y, p.x - m.x);
        const want = Math.atan2(p.y - m.y, p.x - m.x);
        let d = Math.atan2(Math.sin(want - m.a), Math.cos(want - m.a));
        d = clamp(d, -1.5 * dt, 1.5 * dt);
        m.a += d;
        m.x += Math.cos(m.a) * 165 * dt + Math.sin(time / 90 + m.seed) * 0.8;
        m.y += Math.sin(m.a) * 165 * dt + Math.cos(time / 80 + m.seed) * 0.8;
        if (!LANTERN.held && dist(m.x, m.y, LANTERN.x, LANTERN.y) < 70) { m.caught = time; continue; }
        if (p.active && p.hp > 0 && dist(m.x, m.y, p.x, p.y) < 24) {
          m.dead = true;
          tk.hitPlayer(6, p.x, p.y);
          tk.sfx('hit-light');
        }
        if (m.x < -40 || m.x > tk.W + 40 || m.y < 60 || m.y > tk.H + 40) m.dead = true;
      }
      flock = flock.filter((m) => !m.dead);
    },
    drawAir(g, time) {
      for (const m of flock) {
        // Lit dust trailing off the wings, so they show in the dark.
        g.fillStyle(lit(0x8a7aa0, 0.3), 0.25); g.fillCircle(m.x - Math.cos(m.a) * 8, m.y - Math.sin(m.a) * 8, 3);
        moth(g, m.x, m.y, 1.5, time / 1000 + m.seed, m.caught >= 0 ? CANDLE : 0xa898c0);
      }
    },
    onPhaseEnd() { flock = []; },
  };
};

// ── Signature: Lights Out ────────────────────────────────────────────
// He cups the lantern and the flame gutters; the dark presses in from the edges of the room. When
// it goes out, everything outside the last of its light is struck. Get under the lamp.

const snuff = (tk: BossToolkit): SignatureMove => {
  let castAt = -1;
  let fireAt = 0;
  let fired = false;
  let safe = { x: 0, y: 0 };
  const SAFE_R = 104;
  return {
    durationMs: 2300,
    windupMs: 400,
    hold: 'brace',
    locksBody: true,
    tell: 'LIGHTS OUT',
    cast(time) {
      castAt = time;
      fired = false;
      fireAt = time + tk.warn(1800);
      tk.sfx('hush');
    },
    update(time) {
      if (castAt < 0) return;
      safe = { x: LANTERN.x, y: LANTERN.y + 10 };
      if (!fired) LANTERN.snuffK = clamp((time - castAt) / Math.max(1, fireAt - castAt), 0, 1) * 0.6;
      if (!fired && time >= fireAt) {
        fired = true;
        LANTERN.snuffK = 1;
        const p = tk.player;
        tk.sfx('curse-cast');
        if (p.active && p.hp > 0 && dist(p.x, p.y, safe.x, safe.y) > SAFE_R) tk.hitPlayer(18, p.x, p.y);
      }
      if (fired && time > fireAt + 500) {
        LANTERN.snuffK = Math.max(0, 1 - (time - fireAt - 500) / 400);
        if (LANTERN.snuffK <= 0) castAt = -1;
      }
    },
    drawGround(g, time) {
      if (castAt < 0 || fired) return;
      const k = clamp((time - castAt) / Math.max(1, fireAt - castAt), 0, 1);
      // The safe ring under the lamp, and the dark creeping in from the walls.
      g.lineStyle(3, CANDLE_LIT, 0.4 + k * 0.5); g.strokeCircle(safe.x, safe.y, SAFE_R);
      const inset = k * 200;
      g.lineStyle(60, 0x000000, 0.25 + k * 0.3); g.strokeRect(inset * 0.5, TOP + inset * 0.3, tk.W - inset, tk.H - TOP - inset * 0.6);
    },
    drawAir(g, time) {
      if (castAt < 0) return;
      if (fired) {
        const a = clamp(1 - (time - fireAt) / 500, 0, 1);
        g.fillStyle(0x000000, 0.6 * a); g.fillRect(0, TOP, tk.W, tk.H - TOP);
        return;
      }
      const k = clamp((time - castAt) / Math.max(1, fireAt - castAt), 0, 1);
      g.lineStyle(2, CANDLE, 0.6); g.strokeCircle(safe.x, safe.y, SAFE_R * (1 + (1 - k) * 0.2));
    },
    onPhaseEnd() { castAt = -1; LANTERN.snuffK = 0; },
  };
};

// ── Signature: Canopy Shafts ─────────────────────────────────────────
// Umbra. He is a shadow on the floor now, and solid only where light falls. Three shafts of light
// come down through gaps in the canopy and drift; when he casts this, the leaves shift — the old
// shafts close and new ones open (one of them on you, burning briefly as it opens).

const shafts = (tk: BossToolkit): SignatureMove => {
  SHAFTS = [];
  let started = false;
  let reseedAt = 0;
  let pending: { x: number; y: number }[] = [];
  const seed = (x: number, y: number, time: number): Shaft => ({ x, y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 40, r: 88, openAt: time });
  return {
    durationMs: 1300,
    windupMs: 500,
    gesture: 'raise',
    tell: 'THE LEAVES SHIFT',
    cast(time) {
      if (duskPhase < 2) return;
      const p = tk.player;
      pending = [
        { x: p.x, y: p.y },
        { x: tk.clampX(tk.W - p.x, 120), y: tk.clampY(p.y + 80, 100) },
        { x: tk.clampX(Math.random() * tk.W, 120), y: tk.clampY(TOP + Math.random() * (tk.H - TOP), 100) },
      ];
      reseedAt = time + tk.warn(800);
      tk.sfx('gust');
    },
    update(time, dt) {
      if (duskPhase < 2) { SHAFTS = []; started = false; return; }
      if (!started) {
        started = true;
        SHAFTS = [seed(tk.W * 0.25, tk.H * 0.45, time), seed(tk.W * 0.6, tk.H * 0.7, time), seed(tk.W * 0.8, tk.H * 0.35, time)];
      }
      if (pending.length && time >= reseedAt) {
        SHAFTS = pending.map((q) => seed(q.x, q.y, time));
        pending = [];
        const p = tk.player;
        if (dist(p.x, p.y, SHAFTS[0].x, SHAFTS[0].y) < SHAFTS[0].r * 0.6) tk.hitPlayer(9, p.x, p.y);
        tk.sfx('light-beam');
      }
      for (const s of SHAFTS) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < 100 || s.x > tk.W - 100) s.vx *= -1;
        if (s.y < TOP + 80 || s.y > tk.H - 80) s.vy *= -1;
        s.x = clamp(s.x, 100, tk.W - 100); s.y = clamp(s.y, TOP + 80, tk.H - 80);
      }
    },
    takenMult() {
      if (duskPhase < 2) return 1;
      return inShaft(tk.bossX, tk.bossY) ? 1 : 0.2;
    },
    drawGround(g, time) {
      if (duskPhase < 2) return;
      // The floor under a closed canopy, darker than ever.
      g.fillStyle(0x020106, 0.35); g.fillRect(0, TOP, tk.W, tk.H - TOP);
      for (const s of SHAFTS) {
        const open = clamp((time - s.openAt) / 400, 0, 1);
        for (let k = 5; k >= 1; k--) { g.fillStyle(0xfff2d0, 0.05 * open); g.fillEllipse(s.x, s.y, s.r * 2 * (0.5 + k * 0.1), s.r * 1.4 * (0.5 + k * 0.1)); }
        g.lineStyle(1.5, 0xfff2d0, 0.35 * open); g.strokeEllipse(s.x, s.y, s.r * 2, s.r * 1.4);
        // Leaf-shadows dappling the edge of the pool of light.
        for (let i = 0; i < 6; i++) { const a = i + time / 3000; g.fillStyle(LEAF, 0.3); g.fillEllipse(s.x + Math.cos(a) * s.r * 0.85, s.y + Math.sin(a) * s.r * 0.6, 22, 10); }
      }
      for (const q of pending) {
        g.lineStyle(2, 0xfff2d0, 0.5 + Math.sin(time / 70) * 0.3); g.strokeEllipse(q.x, q.y, 176, 124);
      }
    },
    drawAir(g, time) {
      if (duskPhase < 2) return;
      // The shafts themselves, slanting down from the leaves, motes turning in them.
      for (const s of SHAFTS) {
        const open = clamp((time - s.openAt) / 400, 0, 1);
        g.fillStyle(0xfff6e0, 0.05 * open);
        g.fillTriangle(s.x - s.r * 0.9, s.y, s.x + s.r * 0.9, s.y, s.x - 30, TOP);
        g.fillTriangle(s.x + s.r * 0.9, s.y, s.x - 30, TOP, s.x + 50, TOP);
        for (let i = 0; i < 8; i++) {
          const ph = (time / 2400 + i / 8) % 1;
          g.fillStyle(0xfff6e0, 0.5 * Math.sin(ph * Math.PI) * open);
          g.fillCircle(s.x + Math.sin(i * 2.3 + time / 900) * s.r * 0.6, s.y - ph * 200, 1.3);
        }
      }
    },
    onPhaseEnd() { pending = []; },
  };
};

// ── Signature: Grasp ─────────────────────────────────────────────────
// Hands come up out of the floor in a ring round you, fingers first, and clutch; a beat later one
// more comes up where you are standing. Slip out through the gap in the ring.

interface Hand { x: number; y: number; at: number; warn: number }

const grasp = (tk: BossToolkit): SignatureMove => {
  let hands: Hand[] = [];
  return {
    durationMs: 1800,
    windupMs: 500,
    gesture: 'slam',
    tell: 'GRASP',
    cast(time) {
      const p = tk.player;
      const n = 7;
      const gapI = Math.floor(Math.random() * n);
      const warn = tk.warn(1000);
      hands = [];
      for (let i = 0; i < n; i++) {
        if (i === gapI) continue;
        const a = (i / n) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 120), y = tk.clampY(p.y + Math.sin(a) * 92);
        hands.push({ x, y, at: time, warn });
        tk.spawnZone({ x, y, radius: 46, warnMs: warn, damage: 12 });
      }
      tk.schedule(700, () => {
        const q = tk.player;
        const w2 = tk.warn(900);
        hands.push({ x: q.x, y: q.y, at: tk.now, warn: w2 });
        tk.spawnZone({ x: q.x, y: q.y, radius: 50, warnMs: w2, damage: 12 });
      });
      tk.sfx('curse-cast');
    },
    drawAir(g, time) {
      hands = hands.filter((h) => time < h.at + h.warn + 500);
      for (const h of hands) {
        const k = clamp((time - h.at) / Math.max(1, h.warn), 0, 1);
        const up = time > h.at + h.warn ? 1 - clamp((time - h.at - h.warn) / 500, 0, 1) : k;
        // Fingertips breaking the floor, then the whole hand clutching up out of it.
        for (let f = 0; f < 5; f++) {
          const fx = h.x - 14 + f * 7, fh = (10 + (f === 2 ? 8 : f % 2 ? 5 : 2)) * up * 2.2;
          const curl = time > h.at + h.warn ? 6 : 0;
          g.lineStyle(5, 0x040208, 0.95); g.lineBetween(fx, h.y, fx + (f - 2) * curl * 0.4, h.y - fh);
          g.fillStyle(DUSK_LIT, 0.5 * up); g.fillCircle(fx + (f - 2) * curl * 0.4, h.y - fh, 1.4);
        }
        g.fillStyle(0x040208, 0.9 * up); g.fillEllipse(h.x, h.y - 4 * up, 34, 12 * up + 2);
      }
    },
    onPhaseEnd() { hands = []; },
  };
};

// ── The Prince ───────────────────────────────────────────────────────

export const DUSK_BOSS: WorldBossDef = {
  worldId: 'isle:dusk',
  name: 'Prince Dusk',
  title: 'the Lamp-Snuffer',
  color: DUSK,
  colorLit: DUSK_LIT,
  colorDark: DUSK_DARK,
  accent: CRESCENT,
  // Tier 3 of the seventh isle.
  damageMult: 1.35,

  intro: [
    'Shh. Not so loud. The dark hears everything, and everything it hears comes to me.',
    'I was afraid of it once, you know. So Mother gave it all to me. Come in. Let\'s put the light down low.',
  ],
  banter: [
    'A thing that cannot be seen cannot be informed on. I have made my whole court safe.',
    'Every black lamp in Umbral is a kindness. Light is how they find you.',
    'Mother says the dark is a cradle. I have lain in it all my life.',
    'You keep looking for me. I am right here. I have always been right here.',
    'Hush now. Hush. The informers are listening, and I pay them in doses.',
  ],
  defeatLine: 'THE LAMP IS LIT',
  resumeLine: 'You came back in the dark. Of course you did. Everyone does, in the end.',

  phases: [
    {
      name: 'Long Shadows',
      line: 'The light is low tonight. Look how long my shadow is. Look how far it reaches.',
      hp: 540,
      cycle: [
        'sig:reach', 'volley', 'sig:pickets', 'lanes', 'sig:weft',
        'sig:reach', 'homing', 'sig:pickets', 'sig:weft', 'radial',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Nightfall',
      line: 'There. Now there is only my lantern. And I am only where it shines.',
      hp: 630,
      cycle: [
        'sig:lantern', 'sig:moths', 'minefield', 'sig:snuff', 'sig:lantern',
        'sig:moths', 'sig:reach', 'spiral', 'sig:snuff',
      ],
      harass: ['h-flak', 'h-rune'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'NO LIGHT REACHES',
    extraPhase: {
      name: 'Umbra',
      line: 'I am done with lanterns. I am a shadow on your floor. Find the light, if you can.',
      hp: 460,
      cycle: [
        'sig:shafts', 'sig:grasp', 'sig:reach', 'sanctuary',
        'sig:grasp', 'sig:shafts', 'sig:weft', 'sig:grasp', 'homing',
      ],
      harass: ['h-mines', 'h-snipe'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.45 },
    radial: { count: 16, speed: 175 },
    lanes: { halfW: 26 },
    spiral: { arms: 3, speed: 160 },
    homing: { count: 4 },
  },

  signatures: {
    reach,
    pickets,
    weft,
    lantern,
    moths,
    snuff,
    shafts,
    grasp,
  },

  look: {
    crest: 'veil', pattern: 'smooth', aura: 'smoke', hands: 'wisp',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: DUSK_LIT,
  },
  phaseStyles: [
    { movement: 'orbit', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'gloom', tint: 'void', look: { aura: 'none', hands: 'claw', mouth: 'none' } },
    { movement: 'blink', gimmick: 'none', tint: 'void', look: { crest: 'tendrils', aura: 'smoke', hands: 'wisp', eyes: 1 } },
  ],

  /**
   * The Lamp-Snuffer's tells. A long hooded mantle of shadow-cloth down to the floor, its hem
   * smoking off into nothing; a thin silver crescent worn as a circlet; a black lamp on a crook in
   * his second hand, burning lampblack. In Nightfall the black lamp is gone — he carries the real
   * lantern instead (drawn by its signature), and his mantle is starred. In Umbra he is flat: a
   * shadow laid on the floor, standing up only where a shaft of light falls on him.
   */
  drawDecor(g, s) {
    duskPhase = s.phaseIdx;
    const R = s.radius;
    const umbra = s.hard && s.phaseIdx >= 2;
    if (umbra && !inShaft(s.x, s.y)) {
      // Laid flat: a long shadow on the floor, two pale eyes in it.
      g.fillStyle(0x020106, 0.75); g.fillEllipse(s.x, s.y + R * 0.6, R * 3.4, R * 1.1);
      g.fillStyle(0x020106, 0.6); g.fillEllipse(s.x + Math.cos(s.facing + Math.PI) * R * 1.6, s.y + R * 0.6, R * 1.6, R * 0.7);
      g.fillStyle(DUSK_LIT, 0.9); g.fillEllipse(s.x - 6, s.y + R * 0.5, 4, 2.4); g.fillEllipse(s.x + 6, s.y + R * 0.5, 4, 2.4);
      return;
    }
    // The mantle: a long hood falling to a smoking hem.
    g.fillStyle(CLOTH, 0.92);
    g.fillTriangle(s.x - R * 1.15, s.y + R * 1.25, s.x + R * 1.15, s.y + R * 1.25, s.x, s.y - R * 1.25);
    g.fillStyle(CLOTH_SHEEN, 0.35); g.fillTriangle(s.x - R * 0.9, s.y + R * 1.2, s.x - R * 0.5, s.y + R * 1.2, s.x - R * 0.1, s.y - R * 1.0);
    for (let i = 0; i < 7; i++) {
      const ph = (s.t / 900 + i / 7) % 1;
      g.fillStyle(CLOTH, 0.5 * (1 - ph)); g.fillCircle(s.x - R + (i / 6) * R * 2 + Math.sin(s.t / 300 + i) * 4, s.y + R * 1.25 + ph * 14, 4 + ph * 6);
    }
    if (s.phaseIdx === 1) {
      // Nightfall: the mantle starred.
      for (let i = 0; i < 12; i++) {
        const tw = 0.5 + Math.sin(s.t / 200 + i * 2) * 0.5;
        g.fillStyle(MOON, 0.3 + tw * 0.5); g.fillCircle(s.x - R * 0.8 + ((i * 37) % 100) / 100 * R * 1.6, s.y - R * 0.2 + ((i * 53) % 100) / 100 * R * 1.3, 1);
      }
    }
    // The crescent circlet on his brow.
    g.lineStyle(2.5, CRESCENT, 0.95); g.beginPath(); g.arc(s.x, s.y - R * 0.55, R * 0.62, Math.PI * 1.12, Math.PI * 1.88, false); g.strokePath();
    g.fillStyle(CRESCENT, 1); g.fillCircle(s.x, s.y - R * 1.12, 6);
    g.fillStyle(CLOTH, 1); g.fillCircle(s.x + 3, s.y - R * 1.15, 5);
    glow(g, s.x - 2, s.y - R * 1.12, 14, MOON, 0.04, 2);
    // The black lamp on a crook, in his second hand (Long Shadows and Umbra).
    const hand = s.hands[1];
    if (hand && s.phaseIdx !== 1) {
      const cx = hand.x + 6, cy = hand.y - 34;
      g.lineStyle(2.5, IRON, 1); g.lineBetween(hand.x, hand.y + 8, hand.x + 2, cy - 10);
      g.beginPath(); g.arc(hand.x + 8, cy - 10, 6, Math.PI, 0, false); g.strokePath();
      g.lineStyle(1, IRON, 1); g.lineBetween(cx + 8, cy - 10, cx + 8, cy - 2);
      g.fillStyle(IRON, 1); g.fillRect(cx + 3, cy - 2, 10, 2); g.fillRect(cx + 3, cy + 10, 10, 2);
      blackFlame(g, cx + 8, cy + 9, 0.7 + s.castGlow * 0.3, s.t / 1000);
    }
    if (s.enraged) { g.lineStyle(1.5, DUSK_LIT, 0.3 + Math.sin(s.t / 140) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * What shows in the dark of Nightfall: if he stands in the lantern's light, his whole outline
   * catches it, warm; if he does not, only his eyes.
   */
  drawLit(g, s) {
    if (!s.inGloom) return;
    const R = s.radius;
    const lit_ = dist(s.x, s.y, LANTERN.x, LANTERN.y) < LANTERN.lightR;
    if (lit_) {
      g.lineStyle(2, CANDLE, 0.7); g.strokeEllipse(s.x, s.y, R * 2.2, R * 2.6);
      g.fillStyle(CANDLE, 0.12); g.fillEllipse(s.x, s.y, R * 2.2, R * 2.6);
      g.lineStyle(2, CRESCENT, 0.8); g.beginPath(); g.arc(s.x, s.y - R * 0.55, R * 0.62, Math.PI * 1.12, Math.PI * 1.88, false); g.strokePath();
    } else {
      g.lineStyle(1, DUSK_LIT, 0.2); g.strokeEllipse(s.x, s.y, R * 2, R * 2.4);
      g.fillStyle(MOON_DIM, 0.6); g.fillCircle(s.x, s.y - R * 1.12, 3);
    }
    g.fillStyle(DUSK_LIT, 0.95); g.fillEllipse(s.x - 7, s.y - R * 0.2, 5, 3); g.fillEllipse(s.x + 7, s.y - R * 0.2, 5, 3);
  },

  /**
   * The Gloaming Hall, inside the Umbral Bole: a floor cut across the grain of the great tree, its
   * growth-rings spreading from a heart at the middle; black lamps on crooks round the walls; bracket
   * fungus on the bark under the HUD; a ring of moon-faces inlaid in silver round the heart.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xd05c7a);
    const cx = W / 2, cy = (H + 110) / 2;
    // Heartwood, cut across: rings from the middle.
    g.fillStyle(HEART_DARK, 1); g.fillRect(0, 0, W, H);
    for (let r = 760; r > 10; r -= 14 + rng() * 10) {
      g.fillStyle(((r / 14) | 0) % 2 ? HEART : HEART_DARK, 0.55);
      g.fillEllipse(cx + Math.sin(r * 0.01) * 6, cy, r * 2, r * 1.5);
    }
    for (let i = 0; i < 18; i++) {
      // Radial checks in the wood.
      const a = rng() * Math.PI * 2, r0 = 40 + rng() * 120, r1 = r0 + 60 + rng() * 200;
      g.lineStyle(1.5, dim(HEART_DARK, 0.4), 0.6); g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.75, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.75);
    }
    // A wash of shadow over it all, darkest at the edges.
    g.fillStyle(MOULD, 0.45); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { g.lineStyle(50, MOULD_DARK, 0.12); g.strokeRect(i * 20, 90 + i * 16, W - i * 40, H - 90 - i * 32); }
    // The ring of moon-faces round the heart.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const mx = cx + Math.cos(a) * 170, my = cy + Math.sin(a) * 125;
      g.fillStyle(MOON, 0.7); g.fillCircle(mx, my, 8);
      g.fillStyle(HEART_DARK, 1); g.fillCircle(mx + Math.cos((i / 12) * Math.PI * 2) * 8, my, 8);
    }
    g.lineStyle(2, STONE_LIT, 0.4); g.strokeEllipse(cx, cy, 380, 280);
    duskSigil(g, cx, cy - 6, 22, 0.55);
    // The bark wall under the HUD, fungus on it.
    g.fillStyle(BARK_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let x = 0; x < W; x += 26) { g.lineStyle(2, BARK_LIT, 0.25); g.lineBetween(x + rng() * 6, 0, x + rng() * 10, 104); }
    g.fillStyle(BARK, 1); g.fillRect(0, 96, W, 10);
    for (let i = 0; i < 7; i++) fungusShelf(g, 60 + i * 140 + rng() * 30, 70 + rng() * 20, 1.4, i % 2 === 0);
    // Black lamps on crooks round the walls.
    for (let i = 0; i < 5; i++) {
      for (const x of [26, W - 26]) {
        const y = 170 + i * ((H - 230) / 4);
        g.lineStyle(3, IRON, 1); g.lineBetween(x, y + 30, x, y - 10);
        g.lineStyle(1, IRON_LIT, 0.5); g.lineBetween(x - 1, y + 30, x - 1, y - 10);
        blackFlame(g, x, y - 12, 0.9, i * 0.7);
      }
    }
    // Shadow-cloth runners down the long sides.
    for (const x of [64, W - 64]) {
      g.fillStyle(CLOTH, 0.7); g.fillRect(x - 10, 110, 20, H - 130);
      g.fillStyle(CLOTH_SHEEN, 0.2); g.fillRect(x - 8, 110, 3, H - 130);
    }
    // Foxfire in the cracks.
    for (let i = 0; i < 40; i++) { g.fillStyle(FOXFIRE, 0.15 + rng() * 0.2); g.fillCircle(100 + rng() * (W - 200), 130 + rng() * (H - 160), 1 + rng()); }
    g.fillStyle(BARK, 1); g.fillRect(0, H - 14, W, 14);
    g.fillStyle(LEAF, 0.3); g.fillRect(0, H - 16, W, 3);
  },
};
