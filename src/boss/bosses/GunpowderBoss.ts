import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * Final Ordinance — Sovereign of the Ordinance Yard. Gunpowder world's boss:
 * the last cannon of a war nobody else remembers, still holding the line.
 * Canon with the gunpowder challenge, 'Final Ordinance'.
 */

const POWDER = 0xb0883a;
const POWDER_LIT = 0xffd88a;
const POWDER_DARK = 0x2a1a3a;
const FLASH = 0xff6a3a;

// ── Signature: The Firing Line ───────────────────────────────────────
// Five muskets materialise along one wall and fire in sequence, left to
// right — a stagger you can walk through like a hall of swinging doors.

const firingLine = (tk: BossToolkit): SignatureMove => {
  interface Muzzle { x: number; y: number; angle: number; firesAt: number }
  let muzzles: Muzzle[] = [];
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('curse-cast');
      muzzles = [];
      const fromTop = Math.random() < 0.5;
      for (let i = 0; i < 5; i++) {
        const m: Muzzle = {
          x: 110 + ((tk.W - 220) * i) / 4,
          y: fromTop ? 110 : tk.H - 46,
          angle: fromTop ? Math.PI / 2 : -Math.PI / 2,
          firesAt: time + 1200 + i * 380,
        };
        muzzles.push(m);
        tk.schedule(1200 + i * 380, () => {
          tk.spawnLane({ x: m.x, y: tk.H / 2, angle: Math.PI / 2, halfW: 20, warnMs: 300, damage: 17 });
          tk.boom(m.x, m.y, 16, FLASH);
          tk.schedule(700, () => { muzzles = muzzles.filter((m2) => m2 !== m); });
        });
      }
    },
    drawGround(g, time) {
      for (const m of muzzles) {
        const t = Phaser.Math.Clamp(1 - (m.firesAt - time) / 1500, 0, 1);
        // The musket: stock, barrel, and a slow match glowing brighter.
        g.save();
        g.translateCanvas(m.x, m.y);
        g.rotateCanvas(m.angle);
        g.fillStyle(0x4a3018, 1);
        g.fillRect(-3, -14, 6, 14);
        g.fillStyle(0x8a8a92, 1);
        g.fillRect(-2, 0, 4, 18);
        g.restore();
        g.fillStyle(FLASH, 0.3 + t * 0.65);
        g.fillCircle(m.x, m.y, 3 + t * 2);
      }
    },
    onPhaseEnd() { muzzles = []; },
  };
};

// ── Signature: Bombardment ───────────────────────────────────────────
// Mortars, by the book: long arcs, long whistles, big circles, and smoke
// that stays where the shells land.

const bombardment = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3400,
  cast(time: number) {
    tk.sfx('explosion-large');
    for (let i = 0; i < 5; i++) {
      tk.schedule(i * 480, () => {
        const p = tk.player;
        tk.spawnZone({
          x: p.x + Phaser.Math.Between(-160, 160),
          y: p.y + Phaser.Math.Between(-120, 120),
          radius: 66, warnMs: 1550, damage: 19, fall: true,
          poolMs: 4200, poolDamage: 6,
        });
      });
    }
    void time;
  },
});

// ── Signature: The Powder Trail ──────────────────────────────────────
// A fuse is laid — a visible zigzag from the cannon toward you — and a spark
// walks it. Wherever the spark arrives, the yard's biggest barrel goes up.
// Cut the distance rule: the trail is fixed at lighting time; move OFF its end.

const powderTrail = (tk: BossToolkit): SignatureMove => {
  interface Trail { points: { x: number; y: number }[]; sparkIdx: number; segT: number; done: boolean }
  let trail: Trail | null = null;
  return {
    durationMs: 3800,
    cast(time: number) {
      tk.sfx('curse-cast');
      const p = tk.player;
      const points: { x: number; y: number }[] = [];
      let x = tk.bossX;
      let y = tk.bossY;
      points.push({ x, y });
      // Five zigzag legs toward the player's position at cast time.
      for (let i = 1; i <= 5; i++) {
        const tx = tk.bossX + ((p.x - tk.bossX) * i) / 5;
        const ty = tk.bossY + ((p.y - tk.bossY) * i) / 5;
        x = tk.clampX(tx + (i < 5 ? Phaser.Math.Between(-70, 70) : 0), 60);
        y = tk.clampY(ty + (i < 5 ? Phaser.Math.Between(-55, 55) : 0), 100);
        points.push({ x, y });
      }
      trail = { points, sparkIdx: 0, segT: 0, done: false };
      void time;
    },
    update(time: number, dt: number) {
      if (!trail || trail.done) return;
      // The spark walks at 170 px/s — readable, relentless.
      const a = trail.points[trail.sparkIdx];
      const b = trail.points[trail.sparkIdx + 1];
      if (!b) {
        trail.done = true;
        tk.explode(a.x, a.y, 130, 32, FLASH);
        tk.scene.cameras.main.shake(320, 0.008);
        tk.schedule(400, () => { trail = null; });
        return;
      }
      const segLen = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) || 1;
      trail.segT += (170 * dt) / segLen;
      if (trail.segT >= 1) {
        trail.segT = 0;
        trail.sparkIdx++;
      }
      void time;
    },
    drawGround(g, time) {
      if (!trail) return;
      // The laid powder: unburnt ahead of the spark, scorched behind.
      for (let i = 0; i < trail.points.length - 1; i++) {
        const a = trail.points[i];
        const b = trail.points[i + 1];
        const burnt = i < trail.sparkIdx;
        g.lineStyle(3, burnt ? 0x3a3a3a : POWDER, burnt ? 0.5 : 0.85);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      // The keg at the end of the line.
      const end = trail.points[trail.points.length - 1];
      g.fillStyle(0x4a3018, 1);
      g.fillRoundedRect(end.x - 10, end.y - 12, 20, 24, 4);
      g.lineStyle(1.5, POWDER_LIT, 0.8);
      g.lineBetween(end.x - 10, end.y - 4, end.x + 10, end.y - 4);
      g.lineBetween(end.x - 10, end.y + 4, end.x + 10, end.y + 4);
      // The spark itself.
      const a2 = trail.points[trail.sparkIdx];
      const b2 = trail.points[trail.sparkIdx + 1];
      if (b2) {
        const sx = a2.x + (b2.x - a2.x) * trail.segT;
        const sy = a2.y + (b2.y - a2.y) * trail.segT;
        g.fillStyle(FLASH, 0.95);
        g.fillCircle(sx, sy, 4 + Math.sin(time / 60) * 1.5);
        g.fillStyle(POWDER_LIT, 0.6);
        g.fillCircle(sx, sy, 8);
      }
    },
    onPhaseEnd() { trail = null; },
  };
};

export const GUNPOWDER_BOSS: WorldBossDef = {
  worldId: 'gunpowder',
  name: 'Final Ordinance',
  title: 'Sovereign of the Ordinance Yard',
  color: POWDER,
  colorLit: POWDER_LIT,
  colorDark: POWDER_DARK,
  accent: FLASH,
  bodyR: 32,

  intro: ['One last volley. Make it count. I always make it count.'],
  banter: [
    'The war ended. Nobody told the cannon. The cannon prefers it that way.',
    'The Voice asked for a salute. It received one. Nine-pounder.',
    'Sixty seconds to be a hero. I have watched thousands try. The yard keeps their hats.',
    'Powder, wadding, shot, ram. Repeat until the argument is over.',
  ],
  defeatLine: 'THE LAST GUN FALLS SILENT',

  phases: [
    {
      name: 'The Salute',
      line: 'Present arms. Every one of them, presently, at you.',
      hp: 450,
      cycle: [
        'sig:line', 'volley', 'sig:bombard', 'minefield',
        'sig:fuse', 'lanes', 'radial', 'stream',
      ],
      harass: ['h-snipe', 'h-mines', 'h-flak'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 40,
      holdDist: 290,
    },
    {
      name: 'The Barrage',
      line: 'Fire for effect. The effect is you, elsewhere, in pieces.',
      hp: 500,
      cycle: [
        'sig:bombard', 'sig:fuse', 'quake', 'sig:line',
        'barrage', 'spiral', 'minefield', 'stream', 'lanes',
      ],
      harass: ['h-snipe', 'h-mines', 'h-flak', 'h-lane'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 50,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE MAGAZINE HOLDS ONE MORE WAR',
    extraPhase: {
      name: 'The Final Volley',
      line: 'Every shell I ever saved for a special occasion. Congratulations.',
      hp: 380,
      cycle: [
        'sig:fuse', 'sig:line', 'sig:bombard', 'sanctuary',
        'quake', 'minefield', 'spiral', 'stream',
      ],
      harass: ['h-mines', 'h-snipe', 'h-flak', 'h-rune'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 60,
      holdDist: 240,
    },
  },

  signatures: {
    line: firingLine,
    bombard: bombardment,
    fuse: powderTrail,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0e0a10, 0.5);
    g.fillRect(0, 0, W, H);
    // Stacked kegs, shot pyramids, old craters.
    const rnd = new Phaser.Math.RandomDataGenerator(['gunpowder-boss-arena']);
    for (let i = 0; i < 4; i++) {
      const x = 80 + ((W - 160) * i) / 3;
      const y = i % 2 === 0 ? H - 44 : 116;
      g.fillStyle(0x4a3018, 0.9);
      g.fillRoundedRect(x - 9, y - 12, 18, 22, 4);
      g.fillRoundedRect(x + 10, y - 8, 15, 18, 3);
    }
    for (let i = 0; i < 3; i++) {
      const x = rnd.integerInRange(W * 0.25, W * 0.75);
      const y = rnd.integerInRange(H * 0.45, H * 0.8);
      g.lineStyle(1.5, POWDER_DARK, 0.8);
      g.strokeCircle(x, y, rnd.integerInRange(14, 26));
    }
    for (let i = 0; i < 3; i++) {
      const x = 140 + i * 12;
      g.fillStyle(0x2a2a30, 0.9);
      g.fillCircle(x, H - 100 - (i === 1 ? 10 : 0), 6);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 48, 110, 18);

    // The carriage: two great wheels and a timber trail.
    const dirX = Math.cos(s.facing) >= 0 ? 1 : -1;
    for (const wx of [-24, 20]) {
      const spin = t / 900;
      g.fillStyle(0x3a2a14, 1);
      g.fillCircle(s.x + wx, s.y + 30, 17);
      g.fillStyle(0x241a0c, 1);
      g.fillCircle(s.x + wx, s.y + 30, 12);
      for (let i = 0; i < 4; i++) {
        const a = spin + (Math.PI * i) / 2;
        g.lineStyle(2.5, 0x4a3018, 1);
        g.lineBetween(
          s.x + wx - Math.cos(a) * 11, s.y + 30 - Math.sin(a) * 11,
          s.x + wx + Math.cos(a) * 11, s.y + 30 + Math.sin(a) * 11,
        );
      }
    }

    // The barrel: elevated toward the player, recoiling with the cast.
    const elev = -0.35 * dirX;
    const recoil = s.castGlow * 8;
    g.save();
    g.translateCanvas(s.x - dirX * recoil, s.y + 8);
    g.rotateCanvas(dirX > 0 ? elev : Math.PI - elev);
    g.fillStyle(0x2e2e36, 1);
    g.fillRoundedRect(-16, -11, 62, 22, 8);
    g.fillStyle(0x44444e, 1);
    g.fillRoundedRect(-16, -11, 62, 8, 6);
    // Muzzle ring and bore.
    g.fillStyle(0x1c1c22, 1);
    g.fillRect(42, -11, 6, 22);
    g.fillStyle(s.castGlow > 0.4 ? FLASH : 0x0a0a0e, 1);
    g.fillCircle(46, 0, 6);
    g.restore();

    // Powder keg rider — the Sovereign itself: a little revenant gunner
    // perched on the breech, match in hand.
    const gx = s.x - dirX * 26;
    const gy = s.y - 18;
    g.fillStyle(POWDER_DARK, 1);
    g.fillEllipse(gx, gy, 20, 24);
    g.fillStyle(0x1a1026, 1);
    g.fillEllipse(gx, gy - 14, 16, 13);
    const eye = s.hurt ? 0xffffff : s.enraged ? FLASH : POWDER_LIT;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillCircle(gx + side * 4 + dirX * 2, gy - 15, 2.2);
    }
    // The linstock: a long match, always lit, angrier when enraged.
    const matchA = -0.6 * dirX + Math.sin(t / 300) * 0.08;
    const mx = gx + Math.cos(matchA) * 26 * dirX;
    const my = gy - 4 + Math.sin(matchA) * 26;
    g.lineStyle(2.5, 0x4a3018, 1);
    g.lineBetween(gx + dirX * 6, gy - 2, mx, my);
    g.fillStyle(FLASH, 0.95);
    g.fillCircle(mx, my, 3 + (s.enraged ? 1.5 : 0) + Math.sin(t / 90) * 1);
    g.fillStyle(POWDER_LIT, 0.5);
    g.fillCircle(mx, my, 7);
    // Smoke curling off the match.
    for (let i = 0; i < 2; i++) {
      const ph = ((t + i * 600) % 1300) / 1300;
      g.fillStyle(0x8a8a92, (1 - ph) * 0.3);
      g.fillCircle(mx + Math.sin(t / 240 + i) * 4, my - 8 - ph * 20, 2.5 + ph * 3);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 58);
    }
  },
};
