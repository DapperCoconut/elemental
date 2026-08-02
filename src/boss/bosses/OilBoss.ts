import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Derrick — Sovereign of the Slick. Oil world's boss: a rooted industrial
 * tower that lays slicks and then introduces them to a spark. Canon with the
 * oil challenge, 'The Derrick' ("Everything you love is fuel.").
 *
 * The two-signature combo is the fight: `spray` seeds the floor with oil, and
 * `ignite` sets every live slick burning after a readable warning. The slicks
 * are shared between the two moves through a per-fight WeakMap keyed on the
 * toolkit — signatures are built independently, but the state is one fight's.
 */

const OIL = 0x4a3618;
const OIL_LIT = 0xd8a03d;
const OIL_DARK = 0x1c130a;
const FLAME = 0xff8a2a;

interface Slick {
  x: number;
  y: number;
  r: number;
  dieAt: number;
  litUntil: number;
  lastBurnAt: number;
}

const slicksByFight = new WeakMap<BossToolkit, Slick[]>();

const slicksOf = (tk: BossToolkit): Slick[] => {
  let list = slicksByFight.get(tk);
  if (!list) {
    list = [];
    slicksByFight.set(tk, list);
  }
  return list;
};

// ── Signature: Slick Spray ───────────────────────────────────────────
// Five globs arc onto the player's ground. The landing hurts a little; the
// point is the oil they leave, which waits for the spark.

const SLICK_LIFE_MS = 16000;
const MAX_SLICKS = 8;

const slickSpray = (tk: BossToolkit): SignatureMove => {
  const slicks = slicksOf(tk);
  return {
    durationMs: 1900,
    cast(time: number) {
      tk.sfx('acid-spray');
      for (let i = 0; i < 5; i++) {
        tk.schedule(i * 260, () => {
          const p = tk.player;
          const x = tk.clampX(p.x + Phaser.Math.Between(-170, 170), 80);
          const y = tk.clampY(p.y + Phaser.Math.Between(-130, 130), 110);
          tk.spawnZone({ x, y, radius: 40, warnMs: 900, damage: 8, fall: true });
          tk.schedule(i * 260 + 900, () => {
            if (slicks.length >= MAX_SLICKS) slicks.shift();
            slicks.push({
              x, y, r: 56, dieAt: tk.now + SLICK_LIFE_MS, litUntil: 0, lastBurnAt: 0,
            });
          });
        });
      }
      void time;
    },
    update(time: number) {
      // One owner ticks the shared slicks: burn damage and expiry live here.
      for (const s of slicks) {
        if (time < s.litUntil) {
          const p = tk.player;
          if (p.active && Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) < s.r
            && time - s.lastBurnAt > 550) {
            s.lastBurnAt = time;
            tk.hitPlayer(9, p.x, p.y);
          }
        }
      }
      const keep = slicks.filter((s) => time < s.dieAt);
      if (keep.length !== slicks.length) slicks.splice(0, slicks.length, ...keep);
    },
    drawGround(g, time) {
      for (const s of slicks) {
        const lit = time < s.litUntil;
        // The slick itself: black with an amber sheen.
        g.fillStyle(OIL_DARK, 0.75);
        g.fillEllipse(s.x, s.y, s.r * 2, s.r * 1.5);
        g.lineStyle(1.5, OIL_LIT, lit ? 0.9 : 0.35);
        g.strokeEllipse(s.x, s.y, s.r * 1.7, s.r * 1.25);
        if (lit) {
          // Tongues of fire dancing on the pool.
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 + Math.sin(time / 180 + i) * 0.4;
            const fx = s.x + Math.cos(a) * s.r * 0.5;
            const fy = s.y + Math.sin(a) * s.r * 0.35;
            const h = 12 + Math.sin(time / 110 + i * 2.2) * 6;
            g.fillStyle(i % 2 === 0 ? FLAME : OIL_LIT, 0.9);
            g.fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - h);
          }
        }
      }
    },
    onPhaseEnd() { slicks.length = 0; },
  };
};

// ── Signature: Ignition ──────────────────────────────────────────────
// The spark. Every live slick glows for a long breath, then erupts and burns
// for four seconds. Standing in oil during the warning is the whole mistake.

const ignition = (tk: BossToolkit): SignatureMove => {
  const slicks = slicksOf(tk);
  let warnUntil = 0;
  return {
    durationMs: 1600,
    cast(time: number) {
      if (slicks.length === 0) {
        // Nothing to light — flick sparks instead so the beat is never empty.
        tk.sfx('curse-cast');
        const aim = tk.angleToPlayer();
        for (let i = 0; i < 7; i++) {
          const a = aim + (i - 3) * 0.18;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
            angle: a, speed: 260, damage: 9, color: FLAME,
          });
        }
        return;
      }
      tk.sfx('explosion-large');
      warnUntil = time + 1100;
      tk.schedule(1100, () => {
        for (const s of slicks) {
          tk.explode(s.x, s.y, s.r + 14, 20, FLAME);
          s.litUntil = tk.now + 4200;
        }
      });
    },
    drawGround(g, time) {
      if (time >= warnUntil) return;
      const t = 1 - (warnUntil - time) / 1100;
      for (const s of slicks) {
        g.lineStyle(3, FLAME, 0.25 + t * 0.65);
        g.strokeEllipse(s.x, s.y, s.r * 2 + 10, s.r * 1.5 + 8);
      }
    },
    onPhaseEnd() { warnUntil = 0; },
  };
};

// ── Signature: The Pump-Jack ─────────────────────────────────────────
// The head nods, and a line of gushers walks down the aim — each burst also
// spits a fan of crude sideways, so the lane is wider than it looks.

const pumpJack = (tk: BossToolkit): SignatureMove => ({
  durationMs: 2600,
  cast(time: number) {
    tk.sfx('roar');
    const a = tk.angleToPlayer();
    for (let step = 1; step <= 5; step++) {
      tk.schedule(step * 300, () => {
        const r = 80 + step * 78;
        const x = tk.clampX(tk.bossX + Math.cos(a) * r, 70);
        const y = tk.clampY(tk.bossY + Math.sin(a) * r, 110);
        tk.spawnZone({ x, y, radius: 48, warnMs: 750, damage: 17 });
        tk.schedule(step * 300 + 750, () => {
          for (const side of [-1, 1]) {
            tk.spawnBullet({
              x, y, angle: a + (Math.PI / 2) * side, speed: 200,
              damage: 8, color: OIL_LIT, lifeMs: 2200,
            });
          }
        });
      });
    }
    void time;
  },
});

export const OIL_BOSS: WorldBossDef = {
  worldId: 'oil',
  name: 'The Derrick',
  title: 'Sovereign of the Slick',
  color: OIL,
  colorLit: OIL_LIT,
  colorDark: OIL_DARK,
  accent: FLAME,
  bodyR: 34,

  intro: ['Everything you love is fuel. Shall we itemise?'],
  banter: [
    'The Slick was a marsh once. I industrialised.',
    'The Voice wanted the reserves. I do not share mineral rights.',
    'You are, what, sixty percent water? Flammable enough.',
    'Slipping is not falling. Falling comes after.',
  ],
  defeatLine: 'THE WELL RUNS DRY',

  phases: [
    {
      name: 'The Slick',
      line: 'Mind the floor. I have plans for the floor.',
      hp: 420,
      cycle: [
        'sig:spray', 'volley', 'sig:pump', 'lanes',
        'sig:ignite', 'slamchain', 'stream', 'radial',
      ],
      harass: ['h-snipe', 'h-flak', 'h-lane'],
      restMs: 1080,
      harassMs: 3200,
    },
    {
      name: 'The Refinery Fire',
      line: 'Stage two of any refinery: the part the inspectors feared.',
      hp: 470,
      cycle: [
        'sig:spray', 'sig:ignite', 'quake', 'sig:pump',
        'homing', 'barrage', 'spiral', 'minefield', 'stream',
      ],
      harass: ['h-flak', 'h-mines', 'h-snipe', 'h-lane'],
      restMs: 920,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'EVERYTHING HERE IS FUEL',
    extraPhase: {
      name: 'The Gusher',
      line: 'The reserve under this floor has waited an age. Up it comes.',
      hp: 350,
      cycle: [
        'sig:spray', 'sig:ignite', 'sig:pump', 'sanctuary',
        'quake', 'spiral', 'sig:spray', 'sig:ignite', 'homing',
      ],
      harass: ['h-flak', 'h-mines', 'h-rune', 'h-lane'],
      restMs: 720,
      harassMs: 2200,
    },
  },

  signatures: {
    spray: slickSpray,
    ignite: ignition,
    pump: pumpJack,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0e0a04, 0.5);
    g.fillRect(0, 0, W, H);
    // Pipeline runs along the walls, stained ground beneath.
    g.lineStyle(6, OIL_DARK, 0.9);
    g.lineBetween(30, 100, W - 30, 100);
    g.lineStyle(2, OIL_LIT, 0.25);
    g.lineBetween(30, 98, W - 30, 98);
    for (let i = 0; i < 6; i++) {
      const x = 80 + ((W - 160) * i) / 5;
      g.fillStyle(OIL_DARK, 0.6);
      g.fillEllipse(x, H - 60 - (i % 2) * 90, 60, 16);
      g.fillStyle(OIL, 0.3);
      g.fillCircle(x, 100, 6);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // Ground shadow + concrete footing.
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(s.x, s.y + 52, 120, 20);
    g.fillStyle(0x2a2420, 1);
    g.fillRect(s.x - 46, s.y + 40, 92, 12);

    // A-frame tower legs.
    g.lineStyle(8, OIL_DARK, 1);
    g.lineBetween(s.x - 38, s.y + 46, s.x - 6, s.y - 40);
    g.lineBetween(s.x + 38, s.y + 46, s.x + 6, s.y - 40);
    g.lineStyle(4, OIL, 1);
    g.lineBetween(s.x - 28, s.y + 18, s.x + 28, s.y + 18);
    g.lineBetween(s.x - 18, s.y - 10, s.x + 18, s.y - 10);
    // Rivet glints.
    for (const [rx, ry] of [[-28, 18], [28, 18], [-18, -10], [18, -10]] as const) {
      g.fillStyle(OIL_LIT, 0.8);
      g.fillCircle(s.x + rx, s.y + ry, 2);
    }

    // The pump head: a horse-head beam that nods — hard, when casting.
    const nod = Math.sin(t / 460) * 0.12 + s.castGlow * 0.4;
    const hx = s.x + Math.cos(s.facing) * 6;
    const beamA = (s.facing > -Math.PI / 2 && s.facing < Math.PI / 2 ? 0 : Math.PI) + nod * (s.facing > -Math.PI / 2 && s.facing < Math.PI / 2 ? 1 : -1);
    const headX = hx + Math.cos(beamA) * 44;
    const headY = s.y - 44 + Math.sin(beamA) * 20;
    g.lineStyle(9, OIL_DARK, 1);
    g.lineBetween(hx - Math.cos(beamA) * 30, s.y - 44 - Math.sin(beamA) * 12, headX, headY);
    // Counterweight.
    g.fillStyle(OIL, 1);
    g.fillCircle(hx - Math.cos(beamA) * 34, s.y - 44 - Math.sin(beamA) * 14, 12);
    // The horse head itself.
    g.fillStyle(OIL_DARK, 1);
    g.fillRoundedRect(headX - 10, headY - 16, 22, 30, 5);
    // Eyes: two amber lamps on the head, tracking.
    const eye = s.hurt ? 0xffffff : s.enraged ? FLAME : OIL_LIT;
    g.fillStyle(eye, 1);
    g.fillCircle(headX - 2, headY - 6, 3.4);
    g.fillCircle(headX + 7, headY - 6, 3.4);
    // Crude dripping off the head when casting.
    if (s.castGlow > 0.2) {
      const drip = (t % 500) / 500;
      g.fillStyle(OIL_DARK, 0.9);
      g.fillCircle(headX + 2, headY + 14 + drip * 26, 3.5);
    }
    // Warning lamp at the crown blinks while enraged.
    if (s.enraged && Math.floor(t / 300) % 2 === 0) {
      g.fillStyle(FLAME, 0.95);
      g.fillCircle(s.x, s.y - 62, 4);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 60);
    }
  },
};
