import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Miragewright — Sovereign of Sand, which built a copy of the realm before
 * the fall out of heat and haze and moved into it. Canon with the Sand
 * challenge, 'The Miragewright' ("I kept a picture of the realm before it fell.
 * You are standing in it.").
 *
 * Sand fights with your own image and with the dunes above you. Its light bends
 * off the air along a path drawn in full before it fires — everything here is
 * legible, because a mirage cannot lie about geometry. It only lies about where
 * the water is.
 */

const SAND = 0xe8c87a;
const SAND_LIT = 0xf7e2b4;
const SAND_DARK = 0x2a1c0e;
const GOLD = 0xffd54a;

// ── Signature: The Dunefall ──────────────────────────────────────────
// The slope above sheds in slabs. Rings mark the drop, well before it lands.

const dunefall = (tk: BossToolkit): SignatureMove => {
  interface Drop { x: number; y: number; landsAt: number; r: number; fired: boolean }
  let drops: Drop[] = [];
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('rock-throw');
      for (let i = 0; i < 9; i++) {
        tk.schedule(i * 240, () => {
          const p = tk.player;
          const x = tk.clampX(p.x + Phaser.Math.Between(-230, 230), 60);
          const y = tk.clampY(p.y + Phaser.Math.Between(-190, 190), 120);
          drops.push({ x, y, landsAt: tk.now + 1400, r: 62, fired: false });
        });
      }
      void time;
    },
    update(time: number) {
      for (const d of drops) {
        if (d.fired || time < d.landsAt) continue;
        d.fired = true;
        tk.sfx('stone-slam');
        tk.explode(d.x, d.y, d.r, 22, SAND);
        // Grit, thrown outward at a walkable spacing.
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI * 2 * k) / 6 + Math.random();
          tk.spawnBullet({ x: d.x, y: d.y, angle: a, speed: 200, damage: 7, r: 4, color: SAND_LIT });
        }
      }
      drops = drops.filter((d) => time < d.landsAt + 300);
    },
    drawGround(g, time) {
      for (const d of drops) {
        if (d.fired) continue;
        const t = Phaser.Math.Clamp(1 - (d.landsAt - time) / 1400, 0, 1);
        g.lineStyle(2, SAND, 0.3 + t * 0.5);
        g.strokeCircle(d.x, d.y, d.r);
        g.lineStyle(1.5, SAND_LIT, 0.2 + t * 0.4);
        g.strokeCircle(d.x, d.y, d.r * (1 - t * 0.8));
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        if (d.fired) continue;
        const t = Phaser.Math.Clamp(1 - (d.landsAt - time) / 1400, 0, 1);
        // The slab itself, falling and turning as it comes.
        const lift = (1 - t) * 130;
        const size = 20 + t * 26;
        const spin = time / 300 + d.x;
        g.fillStyle(SAND, 0.25 + t * 0.4);
        g.fillTriangle(
          d.x + Math.cos(spin) * size, d.y - lift + Math.sin(spin) * size * 0.6,
          d.x + Math.cos(spin + 2.2) * size, d.y - lift + Math.sin(spin + 2.2) * size * 0.6,
          d.x + Math.cos(spin + 4.2) * size, d.y - lift + Math.sin(spin + 4.2) * size * 0.6,
        );
        g.lineStyle(1.5, GOLD, 0.3 + t * 0.4);
        g.strokeCircle(d.x, d.y - lift, size * 0.7);
      }
    },
    onPhaseEnd() { drops = []; },
  };
};

// ── Signature: The Refraction ────────────────────────────────────────
// A shaft of desert sun bent off the walls three times by the haze. The whole
// path is drawn for a second before any of it is hot.

const refraction = (tk: BossToolkit): SignatureMove => {
  let path: { x: number; y: number }[] = [];
  let firesAt = 0;
  let showUntil = 0;
  return {
    durationMs: 2600,
    cast(time: number) {
      tk.sfx('beam-charge');
      firesAt = time + 1200;
      showUntil = time + 2200;
      // Trace the bounce path up front — a mirage is honest arithmetic.
      let x = tk.bossX;
      let y = tk.bossY;
      let a = tk.angleToPlayer();
      path = [{ x, y }];
      const L = 40;
      const top = 100;
      for (let step = 0; step < 320; step++) {
        x += Math.cos(a) * L;
        y += Math.sin(a) * L;
        if (x < 20 || x > tk.W - 20) { a = Math.PI - a; x = Phaser.Math.Clamp(x, 20, tk.W - 20); path.push({ x, y }); }
        if (y < top || y > tk.H - 20) { a = -a; y = Phaser.Math.Clamp(y, top, tk.H - 20); path.push({ x, y }); }
        if (path.length > 4) break;
      }
      path.push({ x: x + Math.cos(a) * 900, y: y + Math.sin(a) * 900 });
      tk.schedule(1200, () => {
        tk.sfx('beam-fire');
        // The beam is dealt as a chain of short lanes along the traced path.
        for (let i = 0; i < path.length - 1; i++) {
          const p0 = path[i];
          const p1 = path[i + 1];
          const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
          const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
          tk.schedule(i * 90, () => {
            tk.spawnLane({ x: mid.x, y: mid.y, angle: ang, halfW: 20, warnMs: 0, fireMs: 300, damage: 26 });
          });
        }
      });
    },
    drawAir(g, time) {
      if (time > showUntil || path.length < 2) return;
      const hot = time >= firesAt;
      const t = Phaser.Math.Clamp(1 - (firesAt - time) / 1200, 0, 1);
      g.lineStyle(hot ? 14 : 3, SAND_LIT, hot ? 0.55 : 0.15 + t * 0.3);
      for (let i = 0; i < path.length - 1; i++) g.lineBetween(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
      g.lineStyle(hot ? 4 : 1.5, GOLD, hot ? 0.95 : 0.3 + t * 0.5);
      for (let i = 0; i < path.length - 1; i++) g.lineBetween(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
      // Bounce points, where the air folds.
      for (let i = 1; i < path.length - 1; i++) {
        g.fillStyle(SAND_LIT, hot ? 0.8 : 0.3 + t * 0.4);
        g.fillCircle(path[i].x, path[i].y, hot ? 10 : 5);
      }
    },
    onPhaseEnd() { path = []; showUntil = 0; },
  };
};

// ── Signature: The Mirage ────────────────────────────────────────────
// Your double, across the hall's own axis. It cannot be hit and it does exactly
// what you do — which means the way to make it miss is to move.

const theMirage = (tk: BossToolkit): SignatureMove => {
  let until = 0;
  let mx = 0;
  let my = 0;
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('portal');
      until = time + 6200;
      tk.host.showFloatingText(tk.W / 2, 130, 'MIRAGED', '#f7e2b4');
      for (let k = 0; k < 5; k++) {
        tk.schedule(700 + k * 1100, () => {
          if (tk.now > until) return;
          tk.sfx('sand');
          const p = tk.player;
          const a = Math.atan2(p.y - my, p.x - mx);
          for (let i = -1; i <= 1; i++) {
            tk.spawnBullet({
              x: mx + Math.cos(a) * 24, y: my + Math.sin(a) * 24,
              angle: a + i * 0.22, speed: 265, damage: 12, color: SAND,
            });
          }
        });
      }
    },
    update(time: number) {
      if (time > until) return;
      const p = tk.player;
      // Mirrored across the hall's vertical axis; the y is honest.
      mx = tk.W - p.x;
      my = p.y;
    },
    drawAir(g, time) {
      if (time > until) return;
      const shimmer = 0.45 + Math.sin(time / 130) * 0.12;
      // The axis it lives across, so the trick is never a mystery.
      g.lineStyle(1.5, SAND, 0.14);
      g.lineBetween(tk.W / 2, 100, tk.W / 2, tk.H - 10);
      // The double: a pale, flipped silhouette of a fighter.
      g.fillStyle(SAND, shimmer * 0.7);
      g.fillCircle(mx, my, 20);
      g.fillStyle(SAND_LIT, shimmer);
      g.fillCircle(mx, my, 15);
      g.fillStyle(SAND_DARK, shimmer);
      g.fillCircle(mx - 6, my - 4, 3);
      g.fillCircle(mx + 6, my - 4, 3);
      g.lineStyle(2, GOLD, shimmer * 0.8);
      g.strokeCircle(mx, my, 22);
      // Heat coming off it in bands, because it is made of air and it knows.
      for (let i = 0; i < 4; i++) {
        const yy = my - 16 + i * 11;
        g.lineStyle(1, GOLD, shimmer * 0.45);
        g.lineBetween(mx - 18, yy + Math.sin(time / 220 + i) * 2, mx + 18, yy - Math.sin(time / 220 + i) * 2);
      }
    },
    onPhaseEnd() { until = 0; },
  };
};

export const DUNE_BOSS: WorldBossDef = {
  worldId: 'dune',
  name: 'The Miragewright',
  title: 'Sovereign of Sand, Tenant of the Better Realm',
  color: SAND,
  colorLit: SAND_LIT,
  colorDark: SAND_DARK,
  accent: GOLD,
  bodyR: 28,

  intro: ['I kept a picture of the realm before it fell. You are standing in it. Please do not drink anything.'],
  banter: [
    'Out there, everything went under. In here, nothing has yet. I intend to keep the record.',
    'You have a very good face for a mirage. It changes when it is hit.',
    'The Voice throws no shimmer. That is how I knew, and how late I knew it.',
    'Scatter me and you scatter the last picture of it. Do go on.',
  ],
  defeatLine: 'THE PICTURE SCATTERS',

  phases: [
    {
      name: 'The Hall of Haze',
      line: 'Mind the slope. It sheds when it is looked at.',
      hp: 420,
      cycle: [
        'sig:dunefall', 'volley', 'sig:refraction', 'lanes',
        'sig:mirage', 'homing', 'spiral', 'radial',
      ],
      harass: ['h-snipe', 'h-flak', 'h-orbs'],
      restMs: 1030,
      harassMs: 3050,
      moveSpeed: 58,
      holdDist: 300,
    },
    {
      name: 'The True Picture',
      line: 'There. Now there are two of you, and I prefer the other one.',
      hp: 480,
      cycle: [
        'sig:mirage', 'sig:refraction', 'barrage', 'sig:dunefall',
        'stream', 'spiral', 'sig:refraction', 'quake', 'lanes',
      ],
      harass: ['h-snipe', 'h-flak', 'h-lane', 'h-orbs'],
      restMs: 880,
      harassMs: 2550,
      moveSpeed: 70,
      holdDist: 275,
    },
  ],

  hard: {
    introLine: 'EVERY GRAIN IN THE HALL IS WATCHING',
    extraPhase: {
      name: 'The Fused Sea',
      line: 'Look around. Every one of them is on my side. They always were.',
      hp: 390,
      cycle: [
        'sig:mirage', 'sig:dunefall', 'sig:refraction', 'sanctuary',
        'sig:refraction', 'stream', 'spiral', 'barrage',
      ],
      harass: ['h-flak', 'h-snipe', 'h-lane', 'h-rune'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 80,
      holdDist: 250,
    },
  },

  signatures: {
    dunefall,
    refraction,
    mirage: theMirage,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x1a1006, 0.6);
    g.fillRect(0, 0, W, H);
    // Standing stelae down both walls, each carved with a slightly better version
    // of the room, and a floor of drifted sand ribbed into dunes.
    for (const side of [0, 1]) {
      const x = side === 0 ? 40 : W - 40;
      for (let i = 0; i < 4; i++) {
        const y = 150 + i * 118;
        g.fillStyle(SAND, 0.09);
        g.fillRoundedRect(x - 26, y - 46, 52, 100, 6);
        g.lineStyle(2, SAND_LIT, 0.16);
        g.strokeRoundedRect(x - 26, y - 46, 52, 100, 6);
        g.lineStyle(1, GOLD, 0.1);
        g.lineBetween(x - 20, y - 40, x + 12, y + 12);
      }
    }
    g.fillStyle(SAND, 0.05);
    g.fillRect(0, H * 0.62, W, H * 0.38);
    g.lineStyle(1, GOLD, 0.05);
    for (let i = 0; i < 8; i++) g.lineBetween(0, H * 0.62 + i * 22, W, H * 0.62 + i * 22);
    // Old ridgelines across the sky of the place.
    g.lineStyle(1.5, SAND_LIT, 0.07);
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * ((W - 240) / 4);
      g.lineBetween(x, 96, x + 40, 200);
      g.lineBetween(x + 40, 200, x - 20, 280);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(s.x, s.y + 46, 84, 15);

    const dirX = Math.cos(s.facing);
    // A figure of packed sand held in three slabs, with the haze visible through it.
    const facets: [number, number, number, number][] = [
      [-26, -20, 26, 18], [-20, 0, 22, 26], [-14, 24, 16, 22],
    ];
    for (let i = 0; i < facets.length; i++) {
      const [ox, oy, w, h] = facets[i];
      g.fillStyle(SAND, 0.42 - i * 0.05);
      g.fillRoundedRect(s.x + ox, s.y + oy, w, h, 5);
      g.lineStyle(1.5, SAND_LIT, 0.55);
      g.strokeRoundedRect(s.x + ox, s.y + oy, w, h, 5);
      // Grain running down the slab, drifting independently of anything else here.
      g.fillStyle(GOLD, 0.16 + Math.sin(t / 400 + i) * 0.08);
      g.fillRect(s.x + ox + 4, s.y + oy + 3, 5, h - 8);
    }
    // Strata it has already survived, thin and permanent.
    g.lineStyle(1, SAND_DARK, 0.5);
    g.lineBetween(s.x - 18, s.y - 14, s.x + 4, s.y + 8);
    g.lineBetween(s.x + 4, s.y + 8, s.x - 4, s.y + 30);
    g.lineBetween(s.x + 4, s.y + 8, s.x + 18, s.y + 2);

    // Hands: two floating slabs, held like tools, angled to catch the sun.
    for (const side of [-1, 1]) {
      const hx = s.x + side * 38;
      const hy = s.y + 6 + Math.sin(t / 500 + side) * 5 - s.castGlow * 10;
      const ang = t / 700 * side;
      g.fillStyle(SAND_LIT, 0.4);
      g.fillTriangle(
        hx + Math.cos(ang) * 14, hy + Math.sin(ang) * 14,
        hx + Math.cos(ang + 2.1) * 14, hy + Math.sin(ang + 2.1) * 14,
        hx + Math.cos(ang + 4.2) * 14, hy + Math.sin(ang + 4.2) * 14,
      );
      g.lineStyle(1.5, GOLD, 0.6);
      g.strokeCircle(hx, hy, 12);
    }

    // Head: an oval of standing haze, showing something that is not this room.
    const hy0 = s.y - 42;
    g.fillStyle(GOLD, 0.22);
    g.fillEllipse(s.x + dirX * 2, hy0, 34, 40);
    g.lineStyle(2.5, SAND_LIT, 0.75);
    g.strokeEllipse(s.x + dirX * 2, hy0, 34, 40);
    // The picture in the face — a horizon, receding.
    for (let i = 0; i < 3; i++) {
      g.lineStyle(1, SAND_LIT, 0.2 - i * 0.05);
      g.lineBetween(s.x - 14 + dirX * 2, hy0 - 8 + i * 9, s.x + 14 + dirX * 2, hy0 - 8 + i * 9);
    }
    const eye = s.hurt ? 0xffffff : GOLD;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 0.85 + s.castGlow * 0.15);
      g.fillEllipse(s.x + side * 8 + dirX * 4, hy0 - 3, 5, 8);
    }
    g.lineStyle(2, SAND_LIT, 0.55);
    g.lineBetween(s.x - 7 + dirX * 2, hy0 + 15, s.x + 7 + dirX * 2, hy0 + 15);
    // Grains in slow orbit, each holding a scrap of somewhere else.
    for (let i = 0; i < 5; i++) {
      const a = t / 1100 + (i * Math.PI * 2) / 5;
      const ox = s.x + Math.cos(a) * 58;
      const oy = s.y - 12 + Math.sin(a) * 26;
      g.fillStyle(SAND, 0.45);
      g.fillTriangle(ox - 6, oy + 6, ox + 5, oy + 4, ox, oy - 8);
      g.lineStyle(1, GOLD, 0.5);
      g.lineBetween(ox - 4, oy + 3, ox + 2, oy - 4);
    }
    if (s.enraged) {
      g.lineStyle(1.5, GOLD, 0.25 + Math.sin(t / 110) * 0.15);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + t / 1800;
        g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 70, s.y + Math.sin(a) * 70);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.28);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
