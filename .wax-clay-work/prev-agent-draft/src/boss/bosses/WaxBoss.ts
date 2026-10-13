import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

const WAX = 0xf2c85b;
const LIGHT = 0xffefad;
const HONEY = 0xd99518;
const DARK = 0x2b2115;

/** Candles rise around the player and burn in overlapping defensive-looking circles. */
const candleCourt = (tk: BossToolkit): SignatureMove => {
  interface Candle { x: number; y: number; litAt: number; until: number; hitAt: number }
  let candles: Candle[] = [];
  return {
    durationMs: 4200,
    cast(time) {
      tk.sfx('holy-chord');
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        candles.push({
          x: tk.clampX(tk.player.x + Math.cos(a) * 150, 55),
          y: tk.clampY(tk.player.y + Math.sin(a) * 115, 125),
          litAt: time + 900 + i * 160, until: time + 4400, hitAt: 0,
        });
      }
    },
    update(time) {
      for (const c of candles) {
        if (time < c.litAt || time >= c.until || time - c.hitAt < 650) continue;
        if (Phaser.Math.Distance.Between(c.x, c.y, tk.player.x, tk.player.y) <= 82) {
          c.hitAt = time;
          tk.hitPlayer(12, tk.player.x, tk.player.y);
          tk.slowPlayer(0.72, 800);
        }
      }
      candles = candles.filter((c) => time < c.until);
    },
    drawGround(g, time) {
      for (const c of candles) {
        const lit = time >= c.litAt;
        g.fillStyle(WAX, lit ? 0.14 : 0.06); g.fillCircle(c.x, c.y, 82);
        g.lineStyle(lit ? 3 : 1, lit ? LIGHT : WAX, lit ? 0.55 : 0.25); g.strokeCircle(c.x, c.y, 82);
      }
    },
    drawAir(g, time) {
      for (const c of candles) {
        const lit = time >= c.litAt;
        g.fillStyle(WAX, 1); g.fillRoundedRect(c.x - 8, c.y - 32, 16, 36, 4);
        g.lineStyle(2, DARK, 1); g.lineBetween(c.x, c.y - 32, c.x, c.y - 38);
        if (lit) { g.fillStyle(0xff8b24, 0.95); g.fillEllipse(c.x, c.y - 45, 9, 17 + Math.sin(time / 80) * 2); }
      }
    },
    onPhaseEnd() { candles = []; },
  };
};

/** Three expanding cones of bee bullets, with a small safe lane between each comb. */
const royalSwarm = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3000,
  cast(time) {
    tk.sfx('whoosh');
    const base = Phaser.Math.Angle.Between(tk.bossX, tk.bossY, tk.player.x, tk.player.y);
    for (let wave = 0; wave < 3; wave++) {
      tk.schedule(wave * 520, () => {
        for (let i = 0; i < 15; i++) {
          const lane = i / 14 - 0.5;
          tk.spawnBullet({
            x: tk.bossX, y: tk.bossY,
            angle: base + lane * Phaser.Math.DegToRad(62) + (wave - 1) * 0.08,
            speed: 235 + wave * 25, damage: 8, r: 5, color: wave === 2 ? LIGHT : HONEY,
          });
        }
      });
    }
    void time;
  },
  update() {},
  drawAir(g, time) {
    for (let i = 0; i < 8; i++) {
      const a = time / 230 + i * Math.PI / 4;
      const x = tk.bossX + Math.cos(a) * 54;
      const y = tk.bossY + Math.sin(a) * 31;
      g.fillStyle(HONEY, 0.9); g.fillEllipse(x, y, 12, 7);
      g.lineStyle(2, DARK, 0.9); g.lineBetween(x - 2, y - 4, x - 2, y + 4);
    }
  },
});

/** Sticky seals mark the floor, then all detonate at once with stack-sized blasts. */
const sealedSentence = (tk: BossToolkit): SignatureMove => {
  interface Seal { x: number; y: number; r: number; burstsAt: number; burst: boolean }
  let seals: Seal[] = [];
  return {
    durationMs: 4000,
    cast(time) {
      tk.sfx('grenade-launch');
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(20, 190);
        seals.push({
          x: tk.clampX(tk.player.x + Math.cos(a) * d, 58),
          y: tk.clampY(tk.player.y + Math.sin(a) * d, 122),
          r: 54 + (i % 3) * 8, burstsAt: time + 2200, burst: false,
        });
      }
    },
    update(time) {
      for (const s of seals) {
        if (s.burst || time < s.burstsAt) continue;
        s.burst = true;
        tk.explode(s.x, s.y, s.r, 24, WAX);
        tk.sfx('explosion-small');
      }
      seals = seals.filter((s) => time < s.burstsAt + 900);
    },
    drawGround(g, time) {
      for (const s of seals) {
        const p = Phaser.Math.Clamp(1 - (s.burstsAt - time) / 2200, 0, 1);
        g.fillStyle(WAX, 0.06 + p * 0.13); g.fillCircle(s.x, s.y, s.r);
        g.lineStyle(2 + p * 4, p > 0.75 ? LIGHT : HONEY, 0.3 + p * 0.55); g.strokeCircle(s.x, s.y, s.r);
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          g.lineStyle(1, DARK, 0.25); g.strokeCircle(s.x + Math.cos(a) * s.r * 0.45, s.y + Math.sin(a) * s.r * 0.45, 9);
        }
      }
    },
    onPhaseEnd() { seals = []; },
  };
};

export const WAX_BOSS: WorldBossDef = {
  worldId: 'wax',
  name: 'The Apiary Regent',
  title: 'Sovereign of Wax, Keeper of the Last Flame',
  color: WAX,
  colorLit: LIGHT,
  colorDark: DARK,
  accent: HONEY,
  intro: ['The hive remembers every hand that stole its honey. Yours is merely the latest.'],
  banter: [
    'Stand still. The comb is being built around you.',
    'Every sting is small. That has never made the swarm small.',
    'The realm wanted light without heat. I gave it wax and consequences.',
    'You may leave when the last candle does.',
  ],
  defeatLine: 'THE LAST FLAME GUTTERS',
  phases: [
    {
      name: 'The Candle Court',
      line: 'Mind the light. It belongs to me.',
      hp: 460,
      cycle: ['sig:candles', 'volley', 'sig:swarm', 'hazard', 'sig:seals', 'lanes', 'radial'],
      harass: ['h-snipe', 'h-rune', 'h-flak'],
      restMs: 1050,
      harassMs: 3100,
    },
    {
      name: 'The Hive Opens',
      line: 'One bee was a warning. Here is the verdict.',
      hp: 520,
      cycle: ['sig:swarm', 'sig:seals', 'barrage', 'sig:candles', 'spiral', 'quake', 'sig:swarm'],
      harass: ['h-snipe', 'h-rune', 'h-mines', 'h-flak'],
      restMs: 900,
      harassMs: 2600,
    },
  ],
  hard: {
    introLine: 'THE WHOLE COURT IS BURNING AT BOTH ENDS',
    extraPhase: {
      name: 'Royal Jelly',
      line: 'Sweetness was always the bait.',
      hp: 420,
      cycle: ['sig:seals', 'sig:swarm', 'sig:candles', 'sanctuary', 'spiral', 'barrage'],
      harass: ['h-mines', 'h-snipe', 'h-rune', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
    },
  },
  signatures: { candles: candleCourt, swarm: royalSwarm, seals: sealedSentence },
  drawArena(g, W, H) {
    g.fillStyle(0x171107, 0.7); g.fillRect(0, 0, W, H);
    g.fillStyle(0x4b3510, 0.45); g.fillRect(0, 96, W, H - 96);
    for (let y = 125; y < H; y += 48) {
      for (let x = 28; x < W; x += 55) {
        const ox = ((Math.floor(y / 48) & 1) * 27);
        g.lineStyle(2, HONEY, 0.2); g.strokeCircle(x + ox, y, 23);
      }
    }
    g.fillStyle(WAX, 0.25); g.fillRect(0, 96, W, 8);
  },
  look: { crest: 'crown', pattern: 'rings', aura: 'sparks', hands: 'claw', torsoR: 38, mouth: 'maw' },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'shrink', tint: 'hot' },
    { movement: 'rush', gimmick: 'tremor', tint: 'hot', look: { crest: 'mane', arms: 4 } },
  ],
};
