import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * Uber-Gear — Sovereign of the Bounce. Rubber world's boss: a grinning drive
 * gear with infinite tolerance for impact and none for you. Canon with the
 * rubber challenge, 'Uber-Gear' ("There's more of me than there is of you.").
 */

const GUM = 0xff5577;
const GUM_LIT = 0xffb8c8;
const GUM_DARK = 0x44101c;
const SPRING = 0xffe08a;

// ── Signature: The Gear Train ────────────────────────────────────────
// Three heavy gears roll out and BOUNCE off the walls, twice each, before
// they wear out. Contact grinds; the reads are all in the ricochet angles.

const gearTrain = (tk: BossToolkit): SignatureMove => {
  interface Gear { x: number; y: number; vx: number; vy: number; bounces: number; lastHitAt: number; dieAt: number }
  let gears: Gear[] = [];
  return {
    durationMs: 2000,
    cast(time: number) {
      tk.sfx('roar');
      const aim = tk.angleToPlayer();
      gears = [];
      for (let i = 0; i < 3; i++) {
        const a = aim + (i - 1) * 0.45;
        gears.push({
          x: tk.bossX + Math.cos(a) * 34, y: tk.bossY + Math.sin(a) * 34,
          vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
          bounces: 0, lastHitAt: 0, dieAt: time + 6500,
        });
      }
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const gr of gears) {
        gr.x += gr.vx * dt;
        gr.y += gr.vy * dt;
        if ((gr.x < 60 && gr.vx < 0) || (gr.x > tk.W - 60 && gr.vx > 0)) {
          gr.vx *= -1;
          gr.bounces++;
          tk.boom(gr.x, gr.y, 20, GUM_LIT);
        }
        if ((gr.y < 120 && gr.vy < 0) || (gr.y > tk.H - 60 && gr.vy > 0)) {
          gr.vy *= -1;
          gr.bounces++;
          tk.boom(gr.x, gr.y, 20, GUM_LIT);
        }
        if (p.active && Phaser.Math.Distance.Between(gr.x, gr.y, p.x, p.y) < 26
          && time - gr.lastHitAt > 800) {
          gr.lastHitAt = time;
          tk.hitPlayer(15, p.x, p.y);
        }
      }
      gears = gears.filter((gr) => gr.bounces < 3 && time < gr.dieAt);
    },
    drawAir(g, time) {
      for (const gr of gears) {
        const spin = time / 90 * Math.sign(gr.vx || 1);
        g.fillStyle(GUM_DARK, 1);
        g.fillCircle(gr.x, gr.y, 17);
        for (let i = 0; i < 8; i++) {
          const a = spin + (Math.PI * 2 * i) / 8;
          g.fillStyle(GUM_DARK, 1);
          g.fillCircle(gr.x + Math.cos(a) * 17, gr.y + Math.sin(a) * 17, 4);
        }
        g.fillStyle(GUM, 1);
        g.fillCircle(gr.x, gr.y, 12);
        g.fillStyle(GUM_LIT, 0.6);
        g.fillCircle(gr.x - 3, gr.y - 3, 5);
        g.fillStyle(GUM_DARK, 1);
        g.fillCircle(gr.x, gr.y, 3.5);
      }
    },
    onPhaseEnd() { gears = []; },
  };
};

// ── Signature: The Slingshot ─────────────────────────────────────────
// It stretches back — visibly, absurdly — then snaps across the hall THROUGH
// you to the far wall, and rebounds back along the same line. One telegraph,
// two passes.

const slingshot = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3300,
  cast(time: number) {
    tk.sfx('teleport');
    const p = tk.player;
    const a = tk.angleToPlayer();
    // Far point past the player, near the wall.
    const fx = tk.clampX(p.x + Math.cos(a) * 320, 70);
    const fy = tk.clampY(p.y + Math.sin(a) * 320, 110);
    const homeX = tk.bossX;
    const homeY = tk.bossY;
    tk.spawnCharge({ toX: fx, toY: fy, warnMs: 1050, travelMs: 260, halfW: 42, damage: 20 });
    // The rebound, back through the middle to where it started.
    tk.schedule(1900, () => {
      tk.spawnCharge({ toX: homeX, toY: homeY, warnMs: 550, travelMs: 260, halfW: 42, damage: 20 });
    });
    void time;
  },
});

// ── Signature: Rubber Bands ──────────────────────────────────────────
// Three bands stretch across the hall between anchor pegs, bowing further and
// further — then snap straight. The bow is the warning; the straight line
// between the pegs is the hit.

const rubberBands = (tk: BossToolkit): SignatureMove => {
  interface Band { x1: number; y1: number; x2: number; y2: number; snapsAt: number }
  let bands: Band[] = [];
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('curse-cast');
      bands = [];
      const p = tk.player;
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (i / 3) + Phaser.Math.FloatBetween(-0.2, 0.2);
        const cx = tk.clampX(p.x + Phaser.Math.Between(-60, 60), 120);
        const cy = tk.clampY(p.y + Phaser.Math.Between(-50, 50), 140);
        const band: Band = {
          x1: cx - Math.cos(a) * 500, y1: cy - Math.sin(a) * 500,
          x2: cx + Math.cos(a) * 500, y2: cy + Math.sin(a) * 500,
          snapsAt: time + 1300 + i * 600,
        };
        bands.push(band);
        tk.schedule(1300 + i * 600, () => {
          tk.spawnLane({
            x: cx, y: cy, angle: a, halfW: 20, warnMs: 120, damage: 18,
          });
          tk.schedule(400, () => { bands = bands.filter((b2) => b2 !== band); });
        });
      }
    },
    drawGround(g, time) {
      for (const b of bands) {
        const t = Phaser.Math.Clamp(1 - (b.snapsAt - time) / 1600, 0, 1);
        if (time >= b.snapsAt) continue;
        // The band bows away from its chord — further as the snap approaches.
        const mx = (b.x1 + b.x2) / 2;
        const my = (b.y1 + b.y2) / 2;
        const a = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
        const bow = 26 + t * 34;
        const bx = mx - Math.sin(a) * bow;
        const by = my + Math.cos(a) * bow;
        g.lineStyle(3 + t * 2, GUM, 0.5 + t * 0.4);
        // Two straight halves through the bow point read as a stretched band.
        g.lineBetween(b.x1, b.y1, bx, by);
        g.lineBetween(bx, by, b.x2, b.y2);
        // Anchor pegs.
        for (const [px, py] of [[b.x1, b.y1], [b.x2, b.y2]] as const) {
          g.fillStyle(SPRING, 0.9);
          g.fillCircle(Phaser.Math.Clamp(px, 30, tk.W - 30), Phaser.Math.Clamp(py, 96, tk.H - 30), 4);
        }
        // The chord it will snap to.
        g.lineStyle(1, GUM_LIT, 0.25 + t * 0.35);
        g.lineBetween(b.x1, b.y1, b.x2, b.y2);
      }
    },
    onPhaseEnd() { bands = []; },
  };
};

export const RUBBER_BOSS: WorldBossDef = {
  worldId: 'rubber',
  name: 'Uber-Gear',
  title: 'Sovereign of the Bounce',
  color: GUM,
  colorLit: GUM_LIT,
  colorDark: GUM_DARK,
  accent: SPRING,
  bodyR: 32,

  intro: ["There's more of me than there is of you. Elastically speaking, there's more of me than anything."],
  banter: [
    'Everything you throw comes back. Everything I throw ALSO comes back. Fun room.',
    'The Voice bit me once. I gave the bite back with interest.',
    'Momentum is a currency and you are broke.',
    'Boing is a philosophy. You would not understand.',
  ],
  defeatLine: 'THE GEAR SPINS DOWN',

  phases: [
    {
      name: 'Warm-Up Stretch',
      line: 'Limber up. The floor certainly has.',
      hp: 450,
      cycle: [
        'sig:gears', 'volley', 'sig:sling', 'lanes',
        'sig:bands', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-flak', 'h-orbs', 'h-snipe'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 95,
      holdDist: 280,
    },
    {
      name: 'Full Tension',
      line: 'Maximum stretch. Everything after this is release.',
      hp: 500,
      cycle: [
        'sig:sling', 'sig:bands', 'quake', 'sig:gears',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 110,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'IT HAS NEVER ONCE STOPPED BOUNCING',
    extraPhase: {
      name: 'Terminal Elasticity',
      line: 'Physics says energy is conserved. I say it is SAVED UP.',
      hp: 380,
      cycle: [
        'sig:gears', 'sig:sling', 'sig:bands', 'sanctuary',
        'quake', 'spiral', 'sig:sling', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-lane', 'h-rune'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 130,
      holdDist: 230,
    },
  },

  signatures: {
    gears: gearTrain,
    sling: slingshot,
    bands: rubberBands,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x120408, 0.5);
    g.fillRect(0, 0, W, H);
    // Bumper walls and scuff arcs from a thousand ricochets.
    g.lineStyle(5, GUM_DARK, 0.9);
    g.strokeRect(36, 100, W - 72, H - 136);
    g.lineStyle(2, GUM, 0.25);
    g.strokeRect(42, 106, W - 84, H - 148);
    const rnd = new Phaser.Math.RandomDataGenerator(['rubber-boss-arena']);
    for (let i = 0; i < 8; i++) {
      const x = rnd.integerInRange(80, W - 80);
      const y = rnd.integerInRange(140, H - 80);
      g.lineStyle(1.5, GUM_LIT, 0.12);
      g.beginPath();
      g.arc(x, y, rnd.integerInRange(12, 30), rnd.realInRange(0, 3), rnd.realInRange(3.5, 6), false);
      g.strokePath();
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 44, 90, 15);

    // Squash-and-stretch: the whole body breathes like it just landed.
    const squash = 1 + Math.sin(t / 280) * 0.06 + s.castGlow * 0.1;

    // Satellite gears, counter-rotating.
    for (const [ox, oy, r, dir] of [[-40, -20, 9, 1], [42, 8, 7, -1]] as const) {
      const spin = (t / 200) * dir;
      g.fillStyle(GUM_DARK, 0.9);
      g.fillCircle(s.x + ox, s.y + oy, r);
      for (let i = 0; i < 6; i++) {
        const a = spin + (Math.PI * 2 * i) / 6;
        g.fillCircle(s.x + ox + Math.cos(a) * r, s.y + oy + Math.sin(a) * r, 2.5);
      }
      g.fillStyle(SPRING, 0.7);
      g.fillCircle(s.x + ox, s.y + oy, 2);
    }

    // The great gear: rim of teeth, rubber tyre, grinning hub.
    const R = 30 * squash;
    const spin = t / 400;
    for (let i = 0; i < 10; i++) {
      const a = spin + (Math.PI * 2 * i) / 10;
      g.fillStyle(GUM_DARK, 1);
      g.fillRoundedRect(
        s.x + Math.cos(a) * R - 5, s.y + Math.sin(a) * (R / squash) - 5, 10, 10, 3,
      );
    }
    g.fillStyle(GUM_DARK, 1);
    g.fillEllipse(s.x, s.y, R * 2, (R / squash) * 2);
    g.fillStyle(GUM, 1);
    g.fillEllipse(s.x, s.y, R * 1.7, (R / squash) * 1.7);
    g.fillStyle(GUM_LIT, 0.4);
    g.fillEllipse(s.x - 6, s.y - 8, R * 0.9, R * 0.5);
    // Hub bolts.
    for (let i = 0; i < 4; i++) {
      const a = spin / 2 + (Math.PI * 2 * i) / 4;
      g.fillStyle(SPRING, 0.85);
      g.fillCircle(s.x + Math.cos(a) * 14, s.y + Math.sin(a) * 12, 2.5);
    }

    // The face: huge grin, springy eyes on short stalks.
    const ex = Math.cos(s.facing) * 4;
    const eyeBounce = Math.sin(t / 180) * 2;
    const eye = s.hurt ? 0xffffff : s.enraged ? SPRING : 0xffffff;
    for (const side of [-1, 1]) {
      g.lineStyle(2, GUM_DARK, 1);
      g.lineBetween(s.x + side * 8, s.y - 6, s.x + side * 9 + ex, s.y - 14 - eyeBounce);
      g.fillStyle(eye, 1);
      g.fillCircle(s.x + side * 9 + ex, s.y - 16 - eyeBounce, 4.5);
      g.fillStyle(GUM_DARK, 1);
      g.fillCircle(s.x + side * 9 + ex + Math.cos(s.facing) * 1.5, s.y - 16 - eyeBounce, 2);
    }
    g.lineStyle(2.5, GUM_DARK, 1);
    g.beginPath();
    g.arc(s.x + ex * 0.5, s.y + 4, s.enraged ? 11 : 9, 0.2, Math.PI - 0.2, false);
    g.strokePath();
    if (s.enraged) {
      // Teeth in the grin. It was cuter without them.
      g.fillStyle(0xffffff, 0.9);
      for (let i = 0; i < 3; i++) {
        g.fillRect(s.x - 6 + i * 5 + ex * 0.5, s.y + 10, 3, 4);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
