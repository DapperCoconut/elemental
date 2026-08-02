import Phaser from 'phaser';
import { BossToolkit } from './BossToolkit';
import { HarassId, LibMoveId, LibTuning } from './BossDefs';

/**
 * The shared attack vocabulary. Every implementation returns how long the boss
 * is busy, so the choreographer can rest after it.
 *
 * Numbers start from the Disgraced King's tuned figures and defs override only
 * flavour (a wider lane, more arms) — the dodgeability rules live in the
 * implementations and in BossToolkit's spawners, not in the tuning:
 * a quake's gap drifts by less than its half-width per ring, a minefield never
 * seals, a sanctuary is placed at running distance, suction stays under walk
 * speed.
 */

export type LibCast = (tk: BossToolkit, time: number, p: LibTuning) => number;

const lead = (tk: BossToolkit, ms: number): { x: number; y: number } => {
  const p = tk.player;
  const body = p.body as Phaser.Physics.Arcade.Body | null;
  return {
    x: p.x + (body?.velocity.x ?? 0) * (ms / 1000),
    y: p.y + (body?.velocity.y ?? 0) * (ms / 1000),
  };
};

export const LIB_MOVES: Record<LibMoveId, LibCast> = {
  /** An aimed fan. Spaced to be walked through — pressure, not a wall. */
  volley: (tk, _time, p) => {
    tk.sfx('curse-cast');
    const count = p.count ?? 9;
    const speed = p.speed ?? 245;
    const aim = tk.angleToPlayer();
    const spread = p.spreadRad ?? 0.2;
    for (let i = 0; i < count; i++) {
      const a = aim + (i - (count - 1) / 2) * spread;
      tk.spawnBullet({
        x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
        angle: a, speed, damage: p.damage ?? 9,
      });
    }
    return 500;
  },

  /**
   * A full ring off the body, then a second, slower ring half a slot out of
   * phase — the gaps stop lining up, which is the King's Dark Shield trick.
   */
  radial: (tk, _time, p) => {
    tk.sfx('shield-up');
    const count = p.count ?? 22;
    const damage = p.damage ?? 9;
    const fire = (speed: number, offset: number) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + offset;
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 26, y: tk.bossY + Math.sin(a) * 26,
          angle: a, speed, damage,
        });
      }
    };
    fire(p.speed ?? 190, 0);
    tk.schedule(620, () => fire((p.speed ?? 190) * 0.6, Math.PI / count));
    return 900;
  },

  /** Rotating multi-arm stream. Walk with the spin, not against it. */
  spiral: (tk, time, p) => {
    tk.sfx('black-hole');
    const durationMs = p.durationMs ?? 2600;
    const intervalMs = p.intervalMs ?? 110;
    const arms = p.arms ?? 3;
    const speed = p.speed ?? 205;
    const damage = p.damage ?? 11;
    const spin = 2.1;
    const start = tk.angleToPlayer();
    const beats = Math.floor(durationMs / intervalMs);
    for (let k = 0; k < beats; k++) {
      tk.schedule(k * intervalMs, () => {
        const base = start + ((k * intervalMs) / 1000) * spin;
        for (let arm = 0; arm < arms; arm++) {
          const a = base + (Math.PI * 2 * arm) / arms;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 24, y: tk.bossY + Math.sin(a) * 24,
            angle: a, speed, damage,
          });
        }
      });
    }
    return durationMs;
  },

  /** A tracking stream — cheap per hit, expensive to ignore. */
  stream: (tk, _time, p) => {
    tk.sfx('dark-drain');
    const durationMs = p.durationMs ?? 2400;
    const intervalMs = p.intervalMs ?? 72;
    const speed = p.speed ?? 380;
    const damage = p.damage ?? 4;
    const beats = Math.floor(durationMs / intervalMs);
    for (let k = 0; k < beats; k++) {
      tk.schedule(k * intervalMs, () => {
        const a = tk.angleToPlayer() + Phaser.Math.FloatBetween(-0.09, 0.09);
        tk.spawnBullet({
          x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
          angle: a, speed, damage, r: 4,
        });
      });
    }
    return durationMs;
  },

  /** Falling strikes walked across the player's ground. */
  barrage: (tk, _time, p) => {
    tk.sfx('judgement');
    const count = p.count ?? 10;
    const radius = p.radius ?? 58;
    const damage = p.damage ?? 20;
    const warnMs = p.warnMs ?? 1650;
    for (let i = 0; i < count; i++) {
      tk.schedule(i * 170, () => {
        const pl = tk.player;
        tk.spawnZone({
          x: pl.x + Phaser.Math.Between(-190, 190),
          y: pl.y + Phaser.Math.Between(-150, 150),
          radius, warnMs, damage, fall: true,
        });
      });
    }
    return count * 170 + 500;
  },

  /** A ring of charges around the player. Never enough to seal it. */
  minefield: (tk, _time, p) => {
    tk.sfx('tentacle');
    const ringR = p.radius ?? 155;
    const count = Math.min(p.count ?? 6, tk.maxMinesOnRing(ringR));
    const pl = tk.player;
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = offset + (Math.PI * 2 * i) / count;
      tk.spawnMine({
        x: pl.x + Math.cos(a) * ringR, y: pl.y + Math.sin(a) * ringR,
        damage: p.damage ?? 30,
      });
    }
    return 700;
  },

  /**
   * Expanding shockwave rings. One shared gap, drifting one direction by less
   * than its own half-width per ring — the wave outruns the player, so a gap
   * that jumped would be a guaranteed hit.
   */
  quake: (tk, _time, p) => {
    tk.sfx('explosion-large');
    const rings = p.rings ?? 3;
    const gapMs = p.intervalMs ?? 620;
    const speed = p.speed ?? 330;
    const gapHalf = p.gapHalf ?? 0.52;
    const damage = p.damage ?? 26;
    const cx = tk.bossX;
    const cy = tk.bossY;
    const gap0 = tk.angleToPlayer(cx, cy);
    const drift = 0.35 * (Math.random() < 0.5 ? 1 : -1);
    for (let i = 0; i < rings; i++) {
      tk.spawnRing({
        cx, cy, delayMs: i * gapMs, speed,
        gapCentre: gap0 + drift * i, gapHalf, band: 30, damage,
      });
    }
    return rings * gapMs + 600;
  },

  /** Staggered lanes through where the player is heading. */
  lanes: (tk, _time, p) => {
    tk.sfx('judgement');
    const count = p.count ?? 4;
    const warnMs = p.warnMs ?? 1000;
    const halfW = p.halfW ?? 46;
    const damage = p.damage ?? 28;
    for (let i = 0; i < count; i++) {
      tk.schedule(i * 460, () => {
        const at = lead(tk, 200);
        const horizontal = i % 2 === 0;
        tk.spawnLane({
          x: tk.clampX(at.x, 60), y: tk.clampY(at.y, 60),
          angle: horizontal ? 0 : Math.PI / 2,
          halfW, warnMs, damage,
        });
      });
    }
    return count * 460 + warnMs;
  },

  /** A beam pinned to the body, swept across the player's half of the hall. */
  sweep: (tk, time, p) => {
    tk.sfx('screech');
    const travelMs = p.durationMs ?? 1700;
    const halfW = p.halfW ?? 26;
    const damage = p.damage ?? 32;
    const centre = tk.angleToPlayer();
    const half = Math.PI * 0.42;
    const dir = Math.random() < 0.5 ? 1 : -1;
    tk.spawnSweep({
      ox: tk.bossX, oy: tk.bossY,
      a0: centre - half * dir, a1: centre + half * dir,
      warnMs: p.warnMs ?? 900, travelMs, halfW, damage,
    });
    return (p.warnMs ?? 900) + travelMs;
  },

  /** Slams that lead the player's movement — running straight is punished. */
  slamchain: (tk, _time, p) => {
    tk.sfx('roar');
    const count = p.count ?? 4;
    const warnMs = p.warnMs ?? 560;
    for (let i = 0; i < count; i++) {
      tk.schedule(i * 380, () => {
        const at = lead(tk, 260);
        tk.spawnZone({
          x: at.x, y: at.y, radius: p.radius ?? 54,
          warnMs, damage: p.damage ?? 22, slowMult: 0.55, slowMs: 1100,
        });
      });
    }
    return count * 380 + warnMs;
  },

  /** Everything burns except one circle, placed at running distance. */
  sanctuary: (tk, _time, p) => {
    tk.sfx('judgement');
    const warnMs = p.warnMs ?? 2600;
    tk.spawnSanctuary({ warnMs, damage: p.damage ?? 55, safeR: p.radius ?? 132 });
    return warnMs + 400;
  },

  /** Steerable orbs — low enough turn rate to be out-manoeuvred. */
  homing: (tk, _time, p) => {
    tk.sfx('ghost-wail');
    const count = p.count ?? 3;
    const aim = tk.angleToPlayer();
    for (let i = 0; i < count; i++) {
      const a = aim + (i - (count - 1) / 2) * 0.5;
      tk.spawnBullet({
        x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
        angle: a, speed: p.speed ?? 158, damage: p.damage ?? 16,
        r: 9, turn: Math.PI / 1.7, lifeMs: p.durationMs ?? 8000,
      });
    }
    return 700;
  },

  /** Thralls. The answer is crowd control, not duelling each one. */
  summon: (tk, _time, p) => {
    tk.sfx('ghost-wail');
    const count = p.count ?? 3;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.8;
      tk.spawnAdd({
        x: tk.bossX + Math.cos(a) * 120, y: tk.bossY + Math.sin(a) * 120,
        hp: 80, speed: 130, damage: p.damage ?? 24,
        ranged: i === count - 1, maxAlive: 7,
      });
    }
    return 800;
  },

  /** Ground taken away a piece at a time. */
  hazard: (tk, _time, p) => {
    tk.sfx('acid-spray');
    const count = p.count ?? 5;
    for (let i = 0; i < count; i++) {
      tk.schedule(i * 240, () => {
        const pl = tk.player;
        tk.spawnZone({
          x: pl.x + Phaser.Math.Between(-160, 160),
          y: pl.y + Phaser.Math.Between(-130, 130),
          radius: p.radius ?? 56, warnMs: p.warnMs ?? 1500,
          damage: p.damage ?? 18,
          poolMs: p.durationMs ?? 6500, poolDamage: 8,
        });
      });
    }
    return count * 240 + 600;
  },

  /** The body itself, down a telegraphed lane, with overshoot. */
  charge: (tk, _time, p) => {
    tk.sfx('teleport');
    const pl = tk.player;
    const a = tk.angleToPlayer();
    const over = 140;
    tk.spawnCharge({
      toX: pl.x + Math.cos(a) * over, toY: pl.y + Math.sin(a) * over,
      warnMs: p.warnMs ?? 850, travelMs: p.durationMs ?? 340,
      halfW: p.halfW ?? 42, damage: p.damage ?? 30,
    });
    return (p.warnMs ?? 850) + (p.durationMs ?? 340) + 300;
  },
};

// ── Harassment ───────────────────────────────────────────────────────
// Light moves on their own clock. Nothing here blocks the main cycle — the
// point is that the scripted move being solved is never the only thing coming.

export const HARASS_MOVES: Record<HarassId, (tk: BossToolkit) => void> = {
  'h-snipe': (tk) => {
    for (let i = 0; i < 2; i++) {
      tk.schedule(i * 260, () => {
        const p = tk.player;
        tk.spawnZone({
          x: p.x + Phaser.Math.Between(-70, 70), y: p.y + Phaser.Math.Between(-60, 60),
          radius: 48, warnMs: 1500, damage: 16, fall: true,
        });
      });
    }
  },
  'h-flak': (tk) => {
    const aim = tk.angleToPlayer();
    for (let i = 0; i < 9; i++) {
      const a = aim + (i - 4) * 0.2;
      tk.spawnBullet({
        x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
        angle: a, speed: 235, damage: 8,
      });
    }
  },
  'h-orbs': (tk) => {
    const aim = tk.angleToPlayer();
    for (const off of [0.4, -0.4]) {
      tk.spawnBullet({
        x: tk.bossX, y: tk.bossY, angle: aim + off,
        speed: 152, damage: 14, r: 9, turn: Math.PI / 1.7, lifeMs: 7000,
      });
    }
  },
  'h-rune': (tk) => {
    const p = tk.player;
    tk.spawnZone({ x: p.x, y: p.y, radius: 78, warnMs: 1500, damage: 20 });
  },
  'h-lane': (tk) => {
    const p = tk.player;
    const horizontal = Math.random() < 0.5;
    tk.spawnLane({
      x: p.x, y: p.y, angle: horizontal ? 0 : Math.PI / 2,
      halfW: 48, warnMs: 1000, damage: 24,
    });
  },
  'h-mines': (tk) => {
    const p = tk.player;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      tk.spawnMine({
        x: p.x + Math.cos(a) * Phaser.Math.Between(90, 190),
        y: p.y + Math.sin(a) * Phaser.Math.Between(80, 160),
        damage: 24,
      });
    }
  },
};
