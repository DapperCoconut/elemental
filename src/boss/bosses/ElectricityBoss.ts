import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Storm Crown — Sovereign of the Abstract root. Electricity world's boss:
 * the first abstract throne, a crown-shaped storm with a contract lawyer's
 * temperament. Canon with the electricity challenge, 'The Storm Crown'
 * ("The sky signed a contract with me.").
 */

const VOLT = 0xffee00;
const VOLT_LIT = 0xfff8a8;
const VOLT_DARK = 0x2a2a08;
const ION = 0x8ae8ff;

// ── Signature: Chain Arc ─────────────────────────────────────────────
// The first bolt lands on you; every bolt after lands one hop from the last,
// walking the chain toward wherever you ran. Break the geometry, not the sprint.

const chainArc = (tk: BossToolkit): SignatureMove => {
  interface Strike { x: number; y: number; at: number }
  let strikes: Strike[] = [];
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('curse-cast');
      strikes = [];
      let px = tk.player.x;
      let py = tk.player.y;
      for (let hop = 0; hop < 4; hop++) {
        const delay = 700 + hop * 620;
        const hx = px;
        const hy = py;
        strikes.push({ x: hx, y: hy, at: time + delay });
        tk.schedule(delay - 620 > 0 ? delay - 620 : 0, () => {
          // Re-aim each hop at the player's CURRENT position when it charges.
          const p = tk.player;
          const a = Math.atan2(p.y - hy, p.x - hx);
          const nx = tk.clampX(hx + Math.cos(a) * 150, 70);
          const ny = tk.clampY(hy + Math.sin(a) * 150, 110);
          if (strikes[hop + 1]) { strikes[hop + 1].x = nx; strikes[hop + 1].y = ny; }
          tk.spawnZone({ x: hx, y: hy, radius: 52, warnMs: 620, damage: 15, fall: true });
          px = nx;
          py = ny;
        });
      }
      tk.schedule(3200, () => { strikes = []; });
    },
    drawAir(g, time) {
      // The chain drawn between pending strike points, jittering like live wire.
      for (let i = 0; i < strikes.length - 1; i++) {
        const a = strikes[i];
        const b = strikes[i + 1];
        if (time > b.at) continue;
        const segs = 5;
        g.lineStyle(1.5, ION, 0.5);
        let lx = a.x;
        let ly = a.y;
        for (let sIdx = 1; sIdx <= segs; sIdx++) {
          const t = sIdx / segs;
          const nx = a.x + (b.x - a.x) * t + (sIdx < segs ? Phaser.Math.Between(-8, 8) : 0);
          const ny = a.y + (b.y - a.y) * t + (sIdx < segs ? Phaser.Math.Between(-8, 8) : 0);
          g.lineBetween(lx, ly, nx, ny);
          lx = nx;
          ly = ny;
        }
      }
    },
    onPhaseEnd() { strikes = []; },
  };
};

// ── Signature: The Capacitors ────────────────────────────────────────
// Three pylons drop and charge; when the charge completes, every pair fires
// a beam between them. The triangle is drawn well in advance — be outside it,
// or in the one wedge no beam crosses.

const capacitors = (tk: BossToolkit): SignatureMove => {
  interface Pylon { x: number; y: number }
  let pylons: Pylon[] = [];
  let firesAt = 0;
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('shield-up');
      const p = tk.player;
      const cx = tk.clampX(p.x, 170);
      const cy = tk.clampY(p.y, 160);
      const rot = Math.random() * Math.PI * 2;
      pylons = [0, 1, 2].map((i) => ({
        x: tk.clampX(cx + Math.cos(rot + (Math.PI * 2 * i) / 3) * 170, 70),
        y: tk.clampY(cy + Math.sin(rot + (Math.PI * 2 * i) / 3) * 150, 110),
      }));
      firesAt = time + 2600;
      tk.schedule(2600, () => {
        for (let i = 0; i < pylons.length; i++) {
          for (let j = i + 1; j < pylons.length; j++) {
            const a = pylons[i];
            const b = pylons[j];
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            tk.spawnLane({
              x: mid.x, y: mid.y,
              angle: Math.atan2(b.y - a.y, b.x - a.x),
              halfW: 18, warnMs: 300, damage: 20,
            });
          }
        }
        tk.schedule(700, () => { pylons = []; });
      });
    },
    drawGround(g, time) {
      if (pylons.length === 0) return;
      const t = Phaser.Math.Clamp(1 - (firesAt - time) / 2600, 0, 1);
      for (let i = 0; i < pylons.length; i++) {
        for (let j = i + 1; j < pylons.length; j++) {
          g.lineStyle(1, ION, 0.15 + t * 0.3);
          g.lineBetween(pylons[i].x, pylons[i].y, pylons[j].x, pylons[j].y);
        }
      }
      for (const py of pylons) {
        g.fillStyle(VOLT_DARK, 1);
        g.fillRect(py.x - 5, py.y - 16, 10, 16);
        g.fillStyle(VOLT, 0.4 + t * 0.55);
        g.fillCircle(py.x, py.y - 20, 4 + t * 3);
        // Charge meter ring.
        g.lineStyle(2, VOLT_LIT, 0.7);
        g.beginPath();
        g.arc(py.x, py.y - 20, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t, false);
        g.strokePath();
      }
    },
    onPhaseEnd() { pylons = []; },
  };
};

// ── Signature: Static Field ──────────────────────────────────────────
// The floor charges for five seconds. Stand still and the charge finds you —
// fast. The Storm Crown's version of small talk.

const STATIC_MS = 5000;

const staticField = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  let stillX = 0;
  let stillY = 0;
  let stillSince = 0;
  return {
    durationMs: 1400,
    cast(time: number) {
      tk.sfx('dark-drain');
      activeUntil = time + STATIC_MS;
      stillX = tk.player.x;
      stillY = tk.player.y;
      stillSince = time;
      tk.host.showFloatingText(tk.W / 2, 150, '⚡ THE FLOOR IS LIVE — MOVE', `#${VOLT_LIT.toString(16)}`);
    },
    update(time: number) {
      if (time >= activeUntil) return;
      const p = tk.player;
      if (!p.active) return;
      if (Phaser.Math.Distance.Between(stillX, stillY, p.x, p.y) > 40) {
        stillX = p.x;
        stillY = p.y;
        stillSince = time;
        return;
      }
      if (time - stillSince > 850) {
        stillSince = time;
        tk.spawnZone({ x: p.x, y: p.y, radius: 46, warnMs: 380, damage: 13, fall: true });
      }
    },
    drawGround(g, time) {
      if (time >= activeUntil) return;
      // Crawling static across the floor.
      for (let i = 0; i < 8; i++) {
        const x = ((i * 173 + time / 6) % (tk.W - 80)) + 40;
        const y = 120 + ((i * 97 + time / 9) % (tk.H - 180));
        g.lineStyle(1, VOLT, 0.25);
        g.lineBetween(x, y, x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10));
      }
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

export const ELECTRICITY_BOSS: WorldBossDef = {
  worldId: 'electricity',
  name: 'The Storm Crown',
  title: 'Sovereign of the Charged Court',
  color: VOLT,
  colorLit: VOLT_LIT,
  colorDark: VOLT_DARK,
  accent: ION,
  bodyR: 28,

  intro: ['The sky signed a contract with me. You are in breach of the sky.'],
  banter: [
    'Clause four: everything grounded belongs to the ground. You look grounded.',
    'The Voice offered better terms. I do not renegotiate with tenants.',
    'You are a very good conductor. That is not a compliment here.',
    'Thunder is just the paperwork arriving late.',
  ],
  defeatLine: 'THE CONTRACT IS VOID',

  phases: [
    {
      name: 'The Charged Court',
      line: 'Court is in session. The floor will take the minutes.',
      hp: 440,
      cycle: [
        'sig:chain', 'volley', 'sig:capacitors', 'lanes',
        'sig:static', 'stream', 'radial', 'homing',
      ],
      harass: ['h-flak', 'h-lane', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 70,
      holdDist: 280,
    },
    {
      name: 'The Verdict',
      line: 'The sky finds you liable. Sentencing is immediate and repeated.',
      hp: 490,
      cycle: [
        'sig:capacitors', 'sig:chain', 'quake', 'spiral',
        'sig:static', 'barrage', 'stream', 'homing', 'lanes',
      ],
      harass: ['h-flak', 'h-lane', 'h-orbs', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 85,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'THE SKY ITSELF IS IN THE ROOM',
    extraPhase: {
      name: 'The Appeal, Denied',
      line: 'You appealed to a higher power. I am the higher power.',
      hp: 370,
      cycle: [
        'sig:chain', 'sig:static', 'sig:capacitors', 'sanctuary',
        'quake', 'spiral', 'sig:chain', 'stream',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-rune'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 100,
      holdDist: 230,
    },
  },

  signatures: {
    chain: chainArc,
    capacitors,
    static: staticField,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0c0c04, 0.5);
    g.fillRect(0, 0, W, H);
    // Dead pylons at the rim, one still sparking.
    for (let i = 0; i < 6; i++) {
      const x = 70 + ((W - 140) * i) / 5;
      const y = i % 2 === 0 ? H - 32 : 108;
      g.lineStyle(3, VOLT_DARK, 1);
      g.lineBetween(x - 8, y, x, y - 26);
      g.lineBetween(x + 8, y, x, y - 26);
      g.lineBetween(x - 6, y - 12, x + 6, y - 12);
      if (i === 4) {
        g.fillStyle(VOLT, 0.5);
        g.fillCircle(x, y - 28, 3);
      }
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // No shadow: the crown floats on its own weather.
    // The cloud: overlapping storm lobes.
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 + t / 2600;
      const r = 14 + (i % 2) * 6;
      g.fillStyle(i % 2 === 0 ? 0x3a3a4a : 0x2a2a38, 1);
      g.fillCircle(s.x + Math.cos(a) * 22, s.y + 6 + Math.sin(a) * 10, r + 8);
    }
    g.fillStyle(0x32323e, 1);
    g.fillEllipse(s.x, s.y + 4, 62, 34);

    // Rain-static falling out of the cloud.
    for (let i = 0; i < 6; i++) {
      const ph = ((t + i * 300) % 900) / 900;
      g.lineStyle(1, ION, (1 - ph) * 0.5);
      const rx = s.x - 24 + i * 10;
      g.lineBetween(rx, s.y + 18 + ph * 22, rx - 2, s.y + 24 + ph * 22);
    }

    // The crown riding the cloud: five bolt-prongs of living lightning.
    const flick = Math.floor(t / 90) % 3;
    for (let i = 0; i < 5; i++) {
      const px = s.x - 24 + i * 12;
      const ph = 16 + (i === 2 ? 8 : (i % 2) * 4) + (flick === i % 3 ? 3 : 0);
      g.lineStyle(3, VOLT, 0.95);
      g.lineBetween(px, s.y - 12, px + 3, s.y - 12 - ph * 0.5);
      g.lineBetween(px + 3, s.y - 12 - ph * 0.5, px - 2, s.y - 12 - ph);
      g.fillStyle(VOLT_LIT, 0.9);
      g.fillCircle(px - 2, s.y - 12 - ph, 1.8);
    }
    // Band of the crown.
    g.fillStyle(VOLT, 0.85 + s.castGlow * 0.15);
    g.fillRect(s.x - 28, s.y - 14, 56, 5);

    // Eyes in the cloud: two slits of charge.
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xffb04a : VOLT_LIT;
    const ex = Math.cos(s.facing) * 4;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 1);
      g.fillRect(s.x + side * 10 + ex - 4, s.y + 1, 8, 2.5 + (s.enraged ? 1.5 : 0));
    }
    // Grounding bolt beneath, when casting.
    if (s.castGlow > 0.3) {
      g.lineStyle(2, VOLT, (s.castGlow - 0.3) * 1.2);
      let ly = s.y + 22;
      let lx = s.x;
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const nx = lx + Phaser.Math.Between(-8, 8);
        const ny = ly + 9;
        g.lineBetween(lx, ly, nx, ny);
        lx = nx;
        ly = ny;
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 50);
    }
  },
};
