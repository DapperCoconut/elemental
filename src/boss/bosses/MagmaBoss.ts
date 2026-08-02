import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Caldera King — Sovereign of Magma, which was exile's own temper.
 * Canon with the magma challenge, 'The Caldera King' ("The realm cracked open
 * and I was what leaked out.").
 *
 * Pressure, released on a schedule. The plates glow before they vent, the
 * flow front crosses at a walking pace and leaves safe crust behind it, and
 * the bloat is the biggest, slowest, most obvious threat in the realm.
 */

const MAGMA = 0xff5a1e;
const MAGMA_LIT = 0xffd06a;
const MAGMA_DARK = 0x2a0a04;
const BASALT = 0x2e2622;

// ── Signature: The Plates ────────────────────────────────────────────
// The floor is tiled, every tile has a grievance, and they vent in the order
// they heat up in.

const thePlates = (tk: BossToolkit): SignatureMove => {
  interface Plate { x: number; y: number; w: number; h: number; ventsAt: number; fired: boolean }
  let plates: Plate[] = [];
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('sizzle');
      const cols = 4;
      const rows = 3;
      const w = (tk.W - 80) / cols;
      const h = (tk.H - 190) / rows;
      const picks: number[] = [];
      for (let i = 0; i < cols * rows; i++) picks.push(i);
      picks.sort(() => Math.random() - 0.5);
      picks.slice(0, 7).forEach((idx, k) => {
        plates.push({
          x: 40 + (idx % cols) * w + w / 2,
          y: 140 + Math.floor(idx / cols) * h + h / 2,
          w, h,
          ventsAt: time + 1400 + k * 340,
          fired: false,
        });
      });
    },
    update(time: number) {
      for (const pl of plates) {
        if (pl.fired || time < pl.ventsAt) continue;
        pl.fired = true;
        tk.sfx('geyser');
        const p = tk.player;
        if (p.active && Math.abs(p.x - pl.x) < pl.w / 2 && Math.abs(p.y - pl.y) < pl.h / 2) {
          tk.hitPlayer(24, p.x, p.y);
        }
        tk.boom(pl.x, pl.y, Math.min(pl.w, pl.h) * 0.5, MAGMA_LIT);
        // Spatter, thrown clear of the plate that threw it.
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          tk.spawnBullet({ x: pl.x, y: pl.y, angle: a, speed: 210, damage: 7, r: 5, color: MAGMA });
        }
      }
      plates = plates.filter((pl) => time < pl.ventsAt + 600);
    },
    drawGround(g, time) {
      for (const pl of plates) {
        const heat = Phaser.Math.Clamp(1 - (pl.ventsAt - time) / 1400, 0, 1);
        if (pl.fired) {
          g.fillStyle(MAGMA_LIT, 0.25);
          g.fillRect(pl.x - pl.w / 2, pl.y - pl.h / 2, pl.w, pl.h);
          continue;
        }
        // Heating: the seams go first, then the whole plate.
        g.fillStyle(MAGMA, 0.05 + heat * 0.3);
        g.fillRect(pl.x - pl.w / 2 + 4, pl.y - pl.h / 2 + 4, pl.w - 8, pl.h - 8);
        g.lineStyle(2 + heat * 3, MAGMA_LIT, 0.25 + heat * 0.65);
        g.strokeRect(pl.x - pl.w / 2 + 4, pl.y - pl.h / 2 + 4, pl.w - 8, pl.h - 8);
        // Cracks opening across it as the pressure finds a way.
        for (let i = 0; i < 3; i++) {
          const y = pl.y - pl.h / 4 + i * (pl.h / 4);
          g.lineStyle(1 + heat * 2, MAGMA, 0.15 + heat * 0.5);
          g.lineBetween(pl.x - pl.w / 2 + 10, y, pl.x + pl.w / 2 - 10, y + Math.sin(i * 2) * 12);
        }
      }
    },
    onPhaseEnd() { plates = []; },
  };
};

// ── Signature: The Flow ──────────────────────────────────────────────
// A front of molten rock crosses the hall at a walk. The leading edge burns;
// behind it, cooled crust, which is the safest ground in the fight.

const theFlow = (tk: BossToolkit): SignatureMove => {
  let front = 0;
  let vx = 0;
  let running = false;
  let lastHitAt = 0;
  return {
    durationMs: 5000,
    cast(time: number) {
      tk.sfx('inferno');
      const fromLeft = tk.player.x > tk.W / 2;
      front = fromLeft ? -60 : tk.W + 60;
      vx = (fromLeft ? 1 : -1) * 145;
      running = false;
      tk.schedule(1200, () => { running = true; });
      tk.schedule(5600, () => { running = false; });
      void time;
    },
    update(time: number, dt: number) {
      if (!running) return;
      front += vx * dt;
      const p = tk.player;
      if (!p.active) return;
      // Only the leading 70px is molten. Behind it is crust; ahead is floor.
      const ahead = vx > 0 ? p.x < front && p.x > front - 74 : p.x > front && p.x < front + 74;
      if (ahead && time - lastHitAt > 520) {
        lastHitAt = time;
        tk.hitPlayer(18, p.x, p.y);
        tk.slowPlayer(0.62, 800);
      }
    },
    drawGround(g, time) {
      if (!running) {
        g.fillStyle(MAGMA, 0.12 + Math.sin(time / 150) * 0.05);
        g.fillRect(vx > 0 ? 0 : tk.W - 30, 96, 30, tk.H - 96);
        return;
      }
      const behind = vx > 0 ? 0 : front;
      const width = vx > 0 ? front : tk.W - front;
      // Cooled crust: dark, cracked, and completely safe.
      g.fillStyle(BASALT, 0.85);
      g.fillRect(behind, 96, width, tk.H - 96);
      g.lineStyle(1.5, MAGMA, 0.2);
      for (let i = 0; i < 12; i++) {
        const y = 110 + i * ((tk.H - 130) / 11);
        g.lineBetween(behind, y, behind + width, y + Math.sin(i * 1.7 + time / 900) * 10);
      }
      // The front itself: molten, uneven, and moving.
      const edge = front - (vx > 0 ? 74 : -74);
      g.fillStyle(MAGMA, 0.85);
      g.fillRect(Math.min(front, edge), 96, 74, tk.H - 96);
      g.fillStyle(MAGMA_LIT, 0.7);
      for (let i = 0; i < 16; i++) {
        const y = 100 + i * ((tk.H - 110) / 15);
        const wob = Math.sin(time / 200 + i) * 12;
        g.fillCircle(front + wob, y, 14);
      }
      // Fume off the leading edge.
      for (let i = 0; i < 10; i++) {
        const ph = ((time + i * 190) % 1400) / 1400;
        g.fillStyle(0x8a8078, (1 - ph) * 0.16);
        g.fillCircle(front - Math.sign(vx) * ph * 40, 120 + ((i * 83) % (tk.H - 160)), 6 + ph * 12);
      }
    },
    onPhaseEnd() { running = false; },
  };
};

// ── Signature: The Bloat ─────────────────────────────────────────────
// It swells. It keeps swelling. It is the single most obvious thing that has
// ever happened, and it still catches people who were watching their feet.

const theBloat = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let burstsAt = 0;
  const SWELL_MS = 3200;
  const R = 260;
  return {
    durationMs: SWELL_MS + 600,
    cast(time: number) {
      tk.sfx('geyser');
      active = true;
      burstsAt = time + SWELL_MS;
      tk.host.showFloatingText(tk.bossX, tk.bossY - 80, 'PRESSURE RISING', '#ffd06a');
      tk.schedule(SWELL_MS, () => {
        active = false;
        tk.sfx('explosion-large');
        tk.scene.cameras.main.shake(500, 0.01);
        tk.explode(tk.bossX, tk.bossY, R, 52, MAGMA);
        // And then it is raining, briefly.
        for (let i = 0; i < 8; i++) {
          tk.schedule(i * 130, () => {
            const a = Math.random() * Math.PI * 2;
            const d = Phaser.Math.Between(R, R + 220);
            tk.spawnZone({
              x: tk.bossX + Math.cos(a) * d, y: tk.bossY + Math.sin(a) * d,
              radius: 54, warnMs: 900, damage: 18, fall: true,
              poolMs: 3600, poolDamage: 6,
            });
          });
        }
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (burstsAt - time) / SWELL_MS, 0, 1);
      g.fillStyle(MAGMA, 0.05 + t * 0.16);
      g.fillCircle(tk.bossX, tk.bossY, R);
      g.lineStyle(2 + t * 4, MAGMA_LIT, 0.3 + t * 0.6);
      g.strokeCircle(tk.bossX, tk.bossY, R);
      // The floor around it cracks outward as the pressure builds.
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        g.lineStyle(1 + t * 2.5, MAGMA, 0.15 + t * 0.4);
        g.lineBetween(
          tk.bossX + Math.cos(a) * 50, tk.bossY + Math.sin(a) * 50,
          tk.bossX + Math.cos(a) * R * t, tk.bossY + Math.sin(a) * R * t,
        );
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (burstsAt - time) / SWELL_MS, 0, 1);
      // The King itself, distending. Seams open; the light comes through.
      const r = 44 + t * 62;
      g.fillStyle(MAGMA_DARK, 0.55);
      g.fillCircle(tk.bossX, tk.bossY, r);
      g.fillStyle(MAGMA, 0.35 + t * 0.4);
      g.fillCircle(tk.bossX, tk.bossY, r * 0.9);
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI * 2 * i) / 7 + Math.sin(time / 300 + i) * 0.1;
        g.lineStyle(2 + t * 5, MAGMA_LIT, 0.4 + t * 0.5);
        g.lineBetween(
          tk.bossX + Math.cos(a) * r * 0.3, tk.bossY + Math.sin(a) * r * 0.3,
          tk.bossX + Math.cos(a) * r, tk.bossY + Math.sin(a) * r,
        );
      }
    },
    onPhaseEnd() { active = false; },
  };
};

export const MAGMA_BOSS: WorldBossDef = {
  worldId: 'magma',
  name: 'The Caldera King',
  title: 'Sovereign of Magma, Crowned by the Crack',
  color: MAGMA,
  colorLit: MAGMA_LIT,
  colorDark: MAGMA_DARK,
  accent: BASALT,
  bodyR: 33,

  intro: ['The realm cracked open and I was what leaked out. Mind the plates. They have opinions.'],
  banter: [
    'They exiled me for temper. TEMPER. I am the only honest pressure left.',
    'Everything here vents on a schedule. Learn it, and the schedule is a gift.',
    'The Voice went down my throat expecting a throne room and found a furnace.',
    'You are standing on tomorrow morning. It is running early.',
  ],
  defeatLine: 'THE PRESSURE DROPS',

  phases: [
    {
      name: 'The Vent Field',
      line: 'Watch the glow. That is the courtesy portion of the evening.',
      hp: 460,
      cycle: [
        'sig:plates', 'volley', 'sig:flow', 'hazard',
        'sig:bloat', 'lanes', 'radial', 'slamchain',
      ],
      harass: ['h-snipe', 'h-rune', 'h-flak'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 46,
      holdDist: 290,
    },
    {
      name: 'Full Eruption',
      line: 'Courtesy portion concluded.',
      hp: 520,
      cycle: [
        'sig:bloat', 'sig:plates', 'barrage', 'sig:flow',
        'spiral', 'quake', 'sig:plates', 'hazard', 'lanes',
      ],
      harass: ['h-snipe', 'h-rune', 'h-mines', 'h-flak'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 58,
      holdDist: 265,
    },
  ],

  hard: {
    introLine: 'THE CALDERA HAS STOPPED KEEPING TO ITS SCHEDULE',
    extraPhase: {
      name: 'The Crack Widens',
      line: 'There is no floor. There has never BEEN a floor. There is only a lid.',
      hp: 420,
      cycle: [
        'sig:bloat', 'sig:flow', 'sig:plates', 'sanctuary',
        'sig:bloat', 'quake', 'spiral', 'barrage',
      ],
      harass: ['h-mines', 'h-snipe', 'h-rune', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 68,
      holdDist: 245,
    },
  },

  signatures: {
    plates: thePlates,
    flow: theFlow,
    bloat: theBloat,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x140503, 0.6);
    g.fillRect(0, 0, W, H);
    // A caldera floor: basalt slabs with glowing seams, a fume ring, and the
    // rim of the crater visible up top.
    g.fillStyle(BASALT, 0.8);
    g.fillRect(0, 110, W, H - 110);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 7; c++) {
        const x = 20 + c * ((W - 40) / 7);
        const y = 120 + r * ((H - 150) / 5);
        g.fillStyle(0x241c18, 0.9);
        g.fillRect(x + 3, y + 3, (W - 40) / 7 - 6, (H - 150) / 5 - 6);
        g.lineStyle(2, MAGMA, 0.16);
        g.strokeRect(x + 3, y + 3, (W - 40) / 7 - 6, (H - 150) / 5 - 6);
      }
    }
    // Fissures with real light in them.
    g.lineStyle(5, MAGMA, 0.18);
    g.beginPath();
    g.moveTo(0, H * 0.44);
    g.lineTo(W * 0.32, H * 0.52);
    g.lineTo(W * 0.6, H * 0.36);
    g.lineTo(W, H * 0.48);
    g.strokePath();
    g.lineStyle(2, MAGMA_LIT, 0.22);
    g.beginPath();
    g.moveTo(0, H * 0.44);
    g.lineTo(W * 0.32, H * 0.52);
    g.lineTo(W * 0.6, H * 0.36);
    g.lineTo(W, H * 0.48);
    g.strokePath();
    // The crater rim.
    g.fillStyle(0x1a1210, 0.95);
    g.fillRect(0, 96, W, 18);
    for (let i = 0; i < 18; i++) {
      g.fillTriangle(i * (W / 18), 114, (i + 1) * (W / 18), 114, i * (W / 18) + W / 36, 96 + (i % 3) * 8);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 50, 110, 19);

    const dirX = Math.cos(s.facing);
    const swell = Math.sin(t / 520) * 3 + s.castGlow * 5;

    // A body of cooling crust with the furnace showing through every seam.
    g.fillStyle(MAGMA_DARK, 1);
    g.fillCircle(s.x, s.y + 6, 48 + swell);
    g.fillStyle(BASALT, 1);
    g.fillCircle(s.x, s.y + 6, 44 + swell);
    // Crust plates, laid on like scales, each with a lit edge.
    for (let i = 0; i < 9; i++) {
      const a = (Math.PI * 2 * i) / 9 + Math.sin(t / 900) * 0.1;
      const px = s.x + Math.cos(a) * 26;
      const py = s.y + 6 + Math.sin(a) * 26;
      g.fillStyle(0x241c18, 1);
      g.fillCircle(px, py, 15);
      g.lineStyle(2, MAGMA, 0.5 + Math.sin(t / 300 + i) * 0.25 + s.castGlow * 0.3);
      g.strokeCircle(px, py, 15);
    }
    // The seams: the actual heat, brightening with the cast.
    const glow = 0.4 + s.castGlow * 0.5 + (s.enraged ? 0.2 : 0);
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + t / 4000;
      g.lineStyle(3, MAGMA_LIT, glow);
      g.lineBetween(s.x, s.y + 6, s.x + Math.cos(a) * (44 + swell), s.y + 6 + Math.sin(a) * (44 + swell));
    }

    // Arms: two arms of running rock, dripping continually.
    for (const side of [-1, 1]) {
      const ax = s.x + side * 52;
      const drop = Math.sin(t / 400 + side) * 6;
      g.fillStyle(BASALT, 1);
      g.fillCircle(ax, s.y + 16 + drop, 16);
      g.fillStyle(MAGMA, 0.6 + s.castGlow * 0.4);
      g.fillCircle(ax, s.y + 16 + drop, 9);
      for (let i = 0; i < 3; i++) {
        const ph = ((t + i * 400 + side * 200) % 1300) / 1300;
        g.fillStyle(MAGMA_LIT, (1 - ph) * 0.6);
        g.fillCircle(ax, s.y + 28 + drop + ph * 24, 3 - ph * 1.5);
      }
    }

    // The crown: a ring of basalt spikes, lit from beneath.
    const cy = s.y - 44;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (Math.PI * i) / 6;
      const px = s.x + Math.cos(a) * 34;
      const py = cy + Math.sin(a) * 12;
      const h = 16 + (i % 2) * 8;
      g.fillStyle(BASALT, 1);
      g.fillTriangle(px - 6, py, px + 6, py, px, py - h);
      g.fillStyle(MAGMA, 0.45 + Math.sin(t / 260 + i) * 0.2);
      g.fillTriangle(px - 3, py, px + 3, py, px, py - h * 0.6);
    }

    // The face: a fissure across the crust with a furnace behind it.
    const fy = s.y - 12;
    g.fillStyle(0x000000, 0.85);
    g.fillEllipse(s.x + dirX * 3, fy, 40, 12);
    g.fillStyle(MAGMA_LIT, 0.5 + s.castGlow * 0.4);
    g.fillEllipse(s.x + dirX * 3, fy, 34, 7);
    const eye = s.hurt ? 0xffffff : MAGMA_LIT;
    for (const side of [-1, 1]) {
      g.fillStyle(MAGMA_DARK, 1);
      g.fillEllipse(s.x + side * 15 + dirX * 3, s.y - 28, 14, 11);
      g.fillStyle(eye, 0.9 + s.castGlow * 0.1);
      g.fillCircle(s.x + side * 15 + dirX * 5, s.y - 28, 4 + s.castGlow * 2);
    }
    // Fume, permanently.
    for (let i = 0; i < 5; i++) {
      const ph = ((t + i * 360) % 1800) / 1800;
      g.fillStyle(0x8a8078, (1 - ph) * 0.18);
      g.fillCircle(s.x - 26 + i * 13 + Math.sin(t / 400 + i) * 6, s.y - 60 - ph * 46, 4 + ph * 9);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 62);
    }
  },
};
