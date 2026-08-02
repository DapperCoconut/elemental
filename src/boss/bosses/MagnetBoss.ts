import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Lodestone — Sovereign of the Poles. Magnet world's boss: a great
 * horseshoe that decides which way north is, and enforces it. Canon with the
 * magnet challenge, 'The Lodestone' ("North is wherever I say.").
 */

const POLE_RED = 0xcc2244;
const POLE_LIT = 0xff7a8a;
const IRON_DARK = 0x33101a;
const POLE_BLUE = 0x4a8aff;

// ── Signature: Polarity ──────────────────────────────────────────────
// Red pulls; blue pushes. The Lodestone announces its pole in colour, holds
// it for two seconds with a ring of shots riding the field, then flips.

const polarity = (tk: BossToolkit): SignatureMove => {
  let mode: 'off' | 'pull' | 'push' = 'off';
  let flipAt = 0;
  return {
    durationMs: 4600,
    cast(time: number) {
      tk.sfx('shield-up');
      mode = 'pull';
      flipAt = time + 2200;
      const ring = (speed: number): void => {
        for (let i = 0; i < 14; i++) {
          const a = (Math.PI * 2 * i) / 14;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
            angle: a, speed, damage: 9, color: mode === 'pull' ? POLE_LIT : POLE_BLUE,
          });
        }
      };
      tk.schedule(300, () => ring(150));
      tk.schedule(2200, () => {
        mode = 'push';
        tk.sfx('shield-up');
        ring(240);
      });
      tk.schedule(4400, () => { mode = 'off'; });
    },
    update(time: number, dt: number) {
      if (mode === 'off') return;
      const p = tk.player;
      if (!p.active) return;
      const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y);
      if (d < 20 || d > 320) return;
      const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
      const dir = mode === 'pull' ? -1 : 1;
      const strength = 92 * (1 - d / 340);
      p.x = Phaser.Math.Clamp(p.x + Math.cos(a) * strength * dir * dt, 44, tk.W - 44);
      p.y = Phaser.Math.Clamp(p.y + Math.sin(a) * strength * dir * dt, 96, tk.H - 44);
      void time;
    },
    drawGround(g, time) {
      if (mode === 'off') return;
      const color = mode === 'pull' ? POLE_RED : POLE_BLUE;
      const closing = mode === 'pull';
      for (let i = 0; i < 3; i++) {
        const ph = ((time / 700 + i / 3) % 1);
        const r = closing ? 300 * (1 - ph) + 30 : 30 + ph * 300;
        g.lineStyle(1.5, color, (closing ? ph : 1 - ph) * 0.45);
        g.strokeCircle(tk.bossX, tk.bossY, r);
      }
      void flipAt;
    },
    onPhaseEnd() { mode = 'off'; },
  };
};

// ── Signature: The Railgun ───────────────────────────────────────────
// Two rails frame a corridor through the player; a slug rides them a breath
// later, far too fast to race. Leave the corridor — the rails say where.

const railgun = (tk: BossToolkit): SignatureMove => {
  interface Rail { x: number; y: number; angle: number; firesAt: number }
  let rails: Rail[] = [];
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('curse-cast');
      rails = [];
      for (let shot = 0; shot < 3; shot++) {
        tk.schedule(shot * 1050, () => {
          const p = tk.player;
          const a = shot % 2 === 0 ? 0 : Math.PI / 2;
          const rail: Rail = {
            x: tk.clampX(p.x, 70), y: tk.clampY(p.y, 110),
            angle: a, firesAt: tk.now + 850,
          };
          rails.push(rail);
          tk.schedule(850, () => {
            tk.spawnBullet({
              x: rail.angle === 0 ? 30 : rail.x,
              y: rail.angle === 0 ? rail.y : 100,
              angle: rail.angle === 0 ? 0 : Math.PI / 2,
              speed: 620, damage: 22, r: 8, color: POLE_LIT, lifeMs: 2000,
            });
            rails = rails.filter((r2) => r2 !== rail);
          });
        });
      }
      void time;
    },
    drawGround(g, time) {
      for (const r of rails) {
        const t = Phaser.Math.Clamp(1 - (r.firesAt - time) / 850, 0, 1);
        const dx = Math.cos(r.angle) * 1400;
        const dy = Math.sin(r.angle) * 1400;
        const ox = -Math.sin(r.angle) * 22;
        const oy = Math.cos(r.angle) * 22;
        for (const side of [-1, 1]) {
          g.lineStyle(3, POLE_BLUE, 0.3 + t * 0.6);
          g.lineBetween(
            r.x - dx + ox * side, r.y - dy + oy * side,
            r.x + dx + ox * side, r.y + dy + oy * side,
          );
        }
        // Charge sparks between the rails.
        for (let i = 0; i < 3; i++) {
          const along = ((time / 120 + i / 3) % 1 - 0.5) * 300;
          g.lineStyle(1, POLE_LIT, 0.5 * t);
          g.lineBetween(
            r.x + Math.cos(r.angle) * along + ox, r.y + Math.sin(r.angle) * along + oy,
            r.x + Math.cos(r.angle) * along - ox, r.y + Math.sin(r.angle) * along - oy,
          );
        }
      }
    },
    onPhaseEnd() { rails = []; },
  };
};

// ── Signature: The Junk Field ────────────────────────────────────────
// Everything ferrous in the walls remembers who it belongs to. Scrap tears
// loose from the rim and flies home through the middle of the fight.

const junkField = (tk: BossToolkit): SignatureMove => {
  interface Chunk { x: number; y: number; loosensAt: number }
  let chunks: Chunk[] = [];
  return {
    durationMs: 3000,
    cast(time: number) {
      tk.sfx('tentacle');
      chunks = [];
      for (let i = 0; i < 6; i++) {
        const edge = i % 4;
        const chunk: Chunk = {
          x: edge === 0 ? 36 : edge === 1 ? tk.W - 36 : Phaser.Math.Between(80, tk.W - 80),
          y: edge === 2 ? 104 : edge === 3 ? tk.H - 36 : Phaser.Math.Between(140, tk.H - 80),
          loosensAt: time + 900 + i * 260,
        };
        chunks.push(chunk);
        tk.schedule(900 + i * 260, () => {
          const a = Math.atan2(tk.bossY - chunk.y, tk.bossX - chunk.x);
          tk.spawnBullet({
            x: chunk.x, y: chunk.y, angle: a, speed: 280,
            damage: 14, r: 10, color: 0x8a8a92, lifeMs: 3000,
          });
          chunks = chunks.filter((c2) => c2 !== chunk);
        });
      }
      void time;
    },
    drawGround(g, time) {
      for (const c of chunks) {
        const t = Phaser.Math.Clamp(1 - (c.loosensAt - time) / 900, 0, 1);
        const rattle = t * Math.sin(time / 40) * 2.5;
        g.fillStyle(0x5a5a64, 0.9);
        g.fillRect(c.x - 7 + rattle, c.y - 6, 14, 12);
        g.lineStyle(1.5, POLE_LIT, 0.3 + t * 0.6);
        g.strokeRect(c.x - 9 + rattle, c.y - 8, 18, 16);
        // The pull line home.
        g.lineStyle(1, POLE_RED, 0.12 + t * 0.2);
        g.lineBetween(c.x, c.y, tk.bossX, tk.bossY);
      }
    },
    onPhaseEnd() { chunks = []; },
  };
};

export const MAGNET_BOSS: WorldBossDef = {
  worldId: 'magnet',
  name: 'The Lodestone',
  title: 'Sovereign of the Poles',
  color: POLE_RED,
  colorLit: POLE_LIT,
  colorDark: IRON_DARK,
  accent: POLE_BLUE,
  bodyR: 30,

  intro: ['North is wherever I say. Today, north is me. Come north.'],
  banter: [
    'You carry iron in your blood. We were always going to be close.',
    'The Voice pulls everything down. Amateur. Direction is a CHOICE.',
    'Compasses in every realm are lying right now. On my behalf.',
    'Push, pull. Push, pull. The universe is embarrassingly simple.',
  ],
  defeatLine: 'THE POLES RELEASE',

  phases: [
    {
      name: 'Attraction',
      line: 'Come closer. That was not a request. Nothing here is.',
      hp: 450,
      cycle: [
        'sig:polarity', 'volley', 'sig:railgun', 'lanes',
        'sig:junk', 'homing', 'radial', 'minefield',
      ],
      harass: ['h-flak', 'h-orbs', 'h-mines'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 55,
      holdDist: 280,
    },
    {
      name: 'Full Field',
      line: 'Every scrap of metal in this hall just chose a side. Mine.',
      hp: 500,
      cycle: [
        'sig:railgun', 'sig:polarity', 'quake', 'sig:junk',
        'spiral', 'barrage', 'homing', 'stream', 'minefield',
      ],
      harass: ['h-flak', 'h-orbs', 'h-mines', 'h-lane'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 65,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'NORTH, SOUTH, AND YOU',
    extraPhase: {
      name: 'Magnetic Reversal',
      line: 'Once an age, the poles trade places. Stand very still. Or run. Both are wrong.',
      hp: 380,
      cycle: [
        'sig:polarity', 'sig:junk', 'sig:railgun', 'sanctuary',
        'quake', 'spiral', 'sig:polarity', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-mines', 'h-rune'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 80,
      holdDist: 230,
    },
  },

  signatures: {
    polarity,
    railgun,
    junk: junkField,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x100608, 0.5);
    g.fillRect(0, 0, W, H);
    // Field lines sweeping the floor, and scrap heaped at the rim.
    g.lineStyle(1, POLE_RED, 0.1);
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(W / 2, H * 0.55, 80 + i * 55, Math.PI * 0.15, Math.PI * 0.85, false);
      g.strokePath();
    }
    const rnd = new Phaser.Math.RandomDataGenerator(['magnet-boss-arena']);
    for (let i = 0; i < 8; i++) {
      const x = rnd.integerInRange(50, W - 50);
      const y = rnd.pick([H - 32, 108]);
      g.fillStyle(0x3a3a42, 0.85);
      g.fillRect(x - 8, y - 5, 16, 10);
      g.fillRect(x - 3, y - 10, 8, 6);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // Iron filings orbiting in two shells.
    for (let i = 0; i < 10; i++) {
      const a = t / 800 + (Math.PI * 2 * i) / 10;
      const r = 44 + (i % 2) * 10;
      g.lineStyle(1.5, 0x8a8a92, 0.6);
      const fx = s.x + Math.cos(a) * r;
      const fy = s.y + Math.sin(a) * r * 0.8;
      g.lineBetween(fx, fy, fx + Math.cos(a + Math.PI / 2) * 5, fy + Math.sin(a + Math.PI / 2) * 5);
    }

    // The horseshoe: a great U, poles down, tipped toward the player.
    const lean = Math.cos(s.facing) * 6;
    // Arch.
    g.lineStyle(20, IRON_DARK, 1);
    g.beginPath();
    g.arc(s.x + lean * 0.3, s.y - 8, 26, Math.PI, Math.PI * 2, false);
    g.strokePath();
    g.lineStyle(14, POLE_RED, 1);
    g.beginPath();
    g.arc(s.x + lean * 0.3, s.y - 8, 26, Math.PI, Math.PI * 1.5, false);
    g.strokePath();
    g.lineStyle(14, POLE_BLUE, 1);
    g.beginPath();
    g.arc(s.x + lean * 0.3, s.y - 8, 26, Math.PI * 1.5, Math.PI * 2, false);
    g.strokePath();
    // Legs.
    g.fillStyle(POLE_RED, 1);
    g.fillRect(s.x - 36 + lean, s.y - 10, 18, 34);
    g.fillStyle(POLE_BLUE, 1);
    g.fillRect(s.x + 18 + lean, s.y - 10, 18, 34);
    // Pole tips: pale caps that flare when casting.
    for (const [x0, col] of [[s.x - 36 + lean, POLE_LIT], [s.x + 18 + lean, 0xa8c8ff]] as const) {
      g.fillStyle(0xe8e8f0, 1);
      g.fillRect(x0, s.y + 18, 18, 9);
      if (s.castGlow > 0.25) {
        g.fillStyle(col, (s.castGlow - 0.25) * 0.9);
        g.fillEllipse(x0 + 9, s.y + 30, 20, 8);
      }
    }
    // Eyes on the arch: two rivet-lights.
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xffd27a : 0xf2f2f6;
    const ex = Math.cos(s.facing) * 3;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillCircle(s.x + side * 9 + ex + lean * 0.3, s.y - 22, 3);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 54);
    }
  },
};
