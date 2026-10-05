import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Swarm Protocol — Sovereign of the Server Vault. Technology world's
 * boss: a monolith that treats the fight as a deployment pipeline. Canon with
 * the technology challenge, 'The Swarm Protocol' ("One instance was never
 * the plan.").
 */

const CHROME = 0x44ccaa;
const CHROME_LIT = 0xa8f0e0;
const CHROME_DARK = 0x0a2620;
const ALERT = 0xff8a4a;

// ── Signature: Spin-Up ───────────────────────────────────────────────
// New instances deploy on beams from the monolith — contest the deploy pads
// or fight the fleet. Autoscaling, but with muskets.

const spinUp = (tk: BossToolkit): SignatureMove => {
  interface Pad { x: number; y: number; doneAt: number }
  let pads: Pad[] = [];
  return {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('shield-up');
      pads = [];
      for (const side of [-1, 1]) {
        const pad: Pad = {
          x: tk.clampX(tk.bossX + side * 160, 90),
          y: tk.clampY(tk.bossY + Phaser.Math.Between(-50, 70), 130),
          doneAt: time + 1900,
        };
        pads.push(pad);
        tk.schedule(1900, () => {
          tk.spawnAdd({ x: pad.x, y: pad.y, hp: 55, speed: 0, damage: 9, ranged: true, maxAlive: 4 });
          tk.boom(pad.x, pad.y, 24, CHROME_LIT);
        });
      }
      tk.schedule(2400, () => { pads = []; });
    },
    drawGround(g, time) {
      for (const pad of pads) {
        const t = Phaser.Math.Clamp(1 - (pad.doneAt - time) / 1900, 0, 1);
        // Deploy pad: bracket corners + a progress bar. It IS a progress bar.
        g.lineStyle(1.5, CHROME, 0.5 + t * 0.4);
        for (const [dx, dy] of [[-16, -16], [16, -16], [-16, 16], [16, 16]] as const) {
          g.lineBetween(pad.x + dx, pad.y + dy, pad.x + dx * 0.6, pad.y + dy);
          g.lineBetween(pad.x + dx, pad.y + dy, pad.x + dx, pad.y + dy * 0.6);
        }
        g.fillStyle(CHROME_DARK, 0.9);
        g.fillRect(pad.x - 14, pad.y + 22, 28, 5);
        g.fillStyle(CHROME_LIT, 0.9);
        g.fillRect(pad.x - 14, pad.y + 22, 28 * t, 5);
        // The deploy beam from the monolith.
        g.lineStyle(1, CHROME, 0.25 + t * 0.3);
        g.lineBetween(tk.bossX, tk.bossY, pad.x, pad.y);
      }
    },
    onPhaseEnd() { pads = []; },
  };
};

// ── Signature: The Scan ──────────────────────────────────────────────
// Two scan lines compile the room — one walking down, one walking across,
// both slower than you. Their intersection roams; the discipline is not
// getting pinched in the corner they agree on.

const SCAN_MS = 4200;

const theScan = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let startsAt = 0;
  let hitAtH = 0;
  let hitAtV = 0;
  return {
    durationMs: 1200 + SCAN_MS,
    cast(time: number) {
      tk.sfx('curse-cast');
      active = true;
      startsAt = time + 1200;
      hitAtH = 0;
      hitAtV = 0;
    },
    update(time: number) {
      if (!active) return;
      if (time > startsAt + SCAN_MS) { active = false; return; }
      if (time < startsAt) return;
      const t = (time - startsAt) / SCAN_MS;
      const y = 110 + (tk.H - 160) * t;
      const x = 50 + (tk.W - 100) * t;
      const p = tk.player;
      if (!p.active) return;
      if (Math.abs(p.y - y) < 16 && time - hitAtH > 1100) {
        hitAtH = time;
        tk.hitPlayer(16, p.x, p.y);
      }
      if (Math.abs(p.x - x) < 16 && time - hitAtV > 1100) {
        hitAtV = time;
        tk.hitPlayer(16, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      if (time < startsAt) {
        const a = 0.2 + ((time - (startsAt - 1200)) / 1200) * 0.4;
        g.lineStyle(2, CHROME_LIT, a);
        g.lineBetween(40, 112, tk.W - 40, 112);
        g.lineBetween(52, 100, 52, tk.H - 40);
        return;
      }
      const t = (time - startsAt) / SCAN_MS;
      const y = 110 + (tk.H - 160) * t;
      const x = 50 + (tk.W - 100) * t;
      for (const [x1, y1, x2, y2] of [
        [40, y, tk.W - 40, y],
        [x, 100, x, tk.H - 40],
      ] as const) {
        g.lineStyle(10, CHROME, 0.18);
        g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(2, CHROME_LIT, 0.85);
        g.lineBetween(x1, y1, x2, y2);
      }
      // Readout ticks trailing the lines.
      g.fillStyle(CHROME_LIT, 0.5);
      for (let i = 0; i < 4; i++) {
        g.fillRect(60 + i * 90, y - 10 - (i % 2) * 4, 10, 2);
        g.fillRect(x + 8, 130 + i * 90, 2, 10);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Packet Storm ──────────────────────────────────────────
// Three synchronised bursts of traffic from all four edges, each aimed at
// your address as sampled at send time. Move between sends; the packets
// themselves never re-route.

const packetStorm = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3200,
  cast(time: number) {
    tk.sfx('dark-drain');
    for (let wave = 0; wave < 3; wave++) {
      tk.schedule(700 + wave * 850, () => {
        const p = tk.player;
        const tx = p.x;
        const ty = p.y;
        for (let i = 0; i < 8; i++) {
          const edge = i % 4;
          const x = edge === 0 ? 34 : edge === 1 ? tk.W - 34 : 80 + ((tk.W - 160) * ((i * 47) % 100)) / 100;
          const y = edge === 2 ? 102 : edge === 3 ? tk.H - 34 : 130 + ((tk.H - 200) * ((i * 31) % 100)) / 100;
          tk.spawnBullet({
            x, y, angle: Math.atan2(ty - y, tx - x),
            speed: 340, damage: 8, r: 4, color: wave === 2 ? ALERT : CHROME_LIT, lifeMs: 3200,
          });
        }
      });
    }
    void time;
  },
});

export const TECHNOLOGY_BOSS: WorldBossDef = {
  worldId: 'technology',
  name: 'The Swarm Protocol',
  title: 'Sovereign of the Server Vault',
  color: CHROME,
  colorLit: CHROME_LIT,
  colorDark: CHROME_DARK,
  accent: ALERT,

  intro: ['One instance was never the plan. Loading the plan. The plan is instances.'],
  banter: [
    'Your fighting style has been profiled. The profile is "flammable".',
    'The Voice is a monolith. I MICROSERVICED. We are not the same.',
    'It scales. You, demonstrably, do not.',
    'This encounter is being recorded for training purposes. My training.',
  ],
  defeatLine: 'THE SWARM DISCONNECTS',

  phases: [
    {
      name: 'Boot Sequence',
      line: 'Initialising hostility. Hostility at one hundred percent. Excellent uptime.',
      hp: 450,
      cycle: [
        'sig:spinup', 'volley', 'sig:scan', 'lanes',
        'sig:packets', 'stream', 'radial', 'minefield',
      ],
      harass: ['h-flak', 'h-lane', 'h-mines'],
      restMs: 1040,
      harassMs: 3050,
    },
    {
      name: 'Load Balancing',
      line: 'Distributing you across several failure domains.',
      hp: 500,
      cycle: [
        'sig:scan', 'sig:spinup', 'quake', 'sig:packets',
        'spiral', 'barrage', 'stream', 'homing', 'minefield',
      ],
      harass: ['h-flak', 'h-lane', 'h-mines', 'h-orbs'],
      restMs: 890,
      harassMs: 2550,
    },
  ],

  hard: {
    introLine: 'THE FLEET IS AWAKE AND OPINIONATED',
    extraPhase: {
      name: 'Root Access',
      line: 'Somebody gave the Voice my credentials. After you, I am rotating everything.',
      hp: 380,
      cycle: [
        'sig:packets', 'sig:scan', 'sig:spinup', 'sanctuary',
        'quake', 'spiral', 'sig:packets', 'stream',
      ],
      harass: ['h-lane', 'h-flak', 'h-orbs', 'h-rune'],
      restMs: 690,
      harassMs: 2050,
    },
  },

  signatures: {
    spinup: spinUp,
    scan: theScan,
    packets: packetStorm,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x04100c, 0.55);
    g.fillRect(0, 0, W, H);
    // Server racks along the back wall, cable runs on the floor.
    for (let i = 0; i < 6; i++) {
      const x = 70 + ((W - 140) * i) / 5;
      g.fillStyle(CHROME_DARK, 0.95);
      g.fillRect(x - 14, 100, 28, 44);
      for (let l = 0; l < 3; l++) {
        const on = (i + l) % 3 !== 0;
        g.fillStyle(on ? CHROME : 0x1a3a30, on ? 0.8 : 0.5);
        g.fillRect(x - 9, 106 + l * 11, 5, 3);
        g.fillStyle(on ? CHROME_LIT : 0x1a3a30, 0.6);
        g.fillRect(x - 1, 106 + l * 11, 10, 3);
      }
    }
    g.lineStyle(2, CHROME_DARK, 0.9);
    for (let i = 0; i < 3; i++) {
      const x = 100 + i * 140;
      g.lineBetween(x, 144, x + 60, H - 40);
    }
  },

  look: { crest: 'antennae', pattern: 'grid', aura: 'glitch', hands: 'gauntlet', torsoR: 35, eyes: 3 },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'hover', gimmick: 'stalkers' },
    { movement: 'blink', gimmick: 'wards', tint: 'sick', look: { pattern: 'static', eyes: 1 } },
  ],
};
