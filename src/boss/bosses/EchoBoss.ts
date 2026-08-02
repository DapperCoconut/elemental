import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Cavern — Sovereign of the Returning Dark. Echo world's boss: the cave
 * itself, awake, fighting with sound that comes back wrong. Canon with the
 * echo challenge, 'The Cavern' ("Follow the sound. I made it for you.").
 */

const CHIRP = 0xccccff;
const CHIRP_LIT = 0xf0f0ff;
const CAVE_DARK = 0x14142e;
const SONAR = 0x8ae8d8;

// ── Signature: Echolocation ──────────────────────────────────────────
// Sonar rings sweep out from three points. Any ring front that passes over
// you has FOUND you — and the cavern drops a strike on the spot where it did.

const echolocation = (tk: BossToolkit): SignatureMove => {
  interface Ping { cx: number; cy: number; radius: number; found: boolean }
  let pings: Ping[] = [];
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('screech');
      pings = [];
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 700, () => {
          pings.push({
            cx: Phaser.Math.Between(140, tk.W - 140),
            cy: Phaser.Math.Between(160, tk.H - 120),
            radius: 0,
            found: false,
          });
        });
      }
      tk.schedule(3600, () => { pings = []; });
      void time;
    },
    update(_time: number, dt: number) {
      const p = tk.player;
      for (const ping of pings) {
        ping.radius += 240 * dt;
        if (!ping.found && p.active) {
          const d = Phaser.Math.Distance.Between(ping.cx, ping.cy, p.x, p.y);
          if (Math.abs(d - ping.radius) < 14) {
            ping.found = true;
            tk.spawnZone({ x: p.x, y: p.y, radius: 58, warnMs: 850, damage: 16, fall: true });
          }
        }
      }
      pings = pings.filter((ping) => ping.radius < 520);
    },
    drawGround(g, time) {
      for (const ping of pings) {
        if (ping.radius <= 0) continue;
        g.lineStyle(2.5, ping.found ? CHIRP_LIT : SONAR, ping.found ? 0.75 : 0.45);
        g.strokeCircle(ping.cx, ping.cy, ping.radius);
        g.lineStyle(1, SONAR, 0.2);
        g.strokeCircle(ping.cx, ping.cy, Math.max(0, ping.radius - 16));
      }
      void time;
    },
    onPhaseEnd() { pings = []; },
  };
};

// ── Signature: Resound ───────────────────────────────────────────────
// A fan of chirps that comes back off the walls — every shot reflects once,
// and the second pass is the one that catches people.

const resound = (tk: BossToolkit): SignatureMove => {
  interface Chirp { x: number; y: number; vx: number; vy: number; bounced: boolean; dieAt: number }
  let chirps: Chirp[] = [];
  return {
    durationMs: 1600,
    cast(time: number) {
      tk.sfx('curse-cast');
      const aim = tk.angleToPlayer();
      chirps = [];
      for (let i = 0; i < 7; i++) {
        const a = aim + (i - 3) * 0.24;
        chirps.push({
          x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
          vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
          bounced: false, dieAt: time + 5200,
        });
      }
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const c of chirps) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (!c.bounced) {
          if ((c.x < 46 && c.vx < 0) || (c.x > tk.W - 46 && c.vx > 0)) { c.vx *= -1; c.bounced = true; }
          if ((c.y < 106 && c.vy < 0) || (c.y > tk.H - 46 && c.vy > 0)) { c.vy *= -1; c.bounced = true; }
          if (c.bounced) tk.boom(c.x, c.y, 10, SONAR);
        }
        if (p.active && Phaser.Math.Distance.Between(c.x, c.y, p.x, p.y) < 20) {
          tk.hitPlayer(10, p.x, p.y);
          c.dieAt = 0;
        }
      }
      chirps = chirps.filter((c) =>
        time < c.dieAt && c.x > -40 && c.x < tk.W + 40 && c.y > -40 && c.y < tk.H + 40);
    },
    drawAir(g, time) {
      for (const c of chirps) {
        const a = Math.atan2(c.vy, c.vx);
        // A chevron of sound; the echoes (post-bounce) draw hollow.
        g.lineStyle(2.5, c.bounced ? SONAR : CHIRP_LIT, 0.9);
        for (const off of [0, -7]) {
          const bx = c.x + Math.cos(a) * off;
          const by = c.y + Math.sin(a) * off;
          g.beginPath();
          g.arc(bx, by, 7, a - 0.7, a + 0.7, false);
          g.strokePath();
        }
      }
      void time;
    },
    onPhaseEnd() { chirps = []; },
  };
};

// ── Signature: Stalactite Chorus ─────────────────────────────────────
// The ceiling answers: stalactites fall in rings that radiate outward from
// the Sovereign — a drumbeat you can walk out ahead of.

const stalactites = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3400,
  cast(time: number) {
    tk.sfx('explosion-large');
    const cx = tk.bossX;
    const cy = tk.bossY;
    for (let ring = 1; ring <= 3; ring++) {
      const count = 5 + ring * 2;
      tk.schedule(ring * 700, () => {
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count + ring * 0.4;
          tk.spawnZone({
            x: tk.clampX(cx + Math.cos(a) * ring * 105, 60),
            y: tk.clampY(cy + Math.sin(a) * ring * 90, 100),
            radius: 42, warnMs: 800, damage: 14, fall: true,
          });
        }
      });
    }
    void time;
  },
});

export const ECHO_BOSS: WorldBossDef = {
  worldId: 'echo',
  name: 'The Cavern',
  title: 'Sovereign of the Returning Dark',
  color: CHIRP,
  colorLit: CHIRP_LIT,
  colorDark: CAVE_DARK,
  accent: SONAR,
  bodyR: 30,

  intro: ['Follow the sound. I made it for you. I make ALL the sounds here.'],
  banter: [
    'Everything you say comes back. Nothing you say comes back agreeing with you.',
    'The Voice speaks once and expects forever. In here, forever answers back.',
    'I heard your heartbeat when you entered the realm. It has opinions.',
    'Shout something brave. I collect those.',
  ],
  defeatLine: 'THE CAVERN FALLS SILENT',

  phases: [
    {
      name: 'The First Gallery',
      line: 'Mind the dark. It is load-bearing.',
      hp: 450,
      cycle: [
        'sig:sonar', 'volley', 'sig:resound', 'lanes',
        'sig:drop', 'homing', 'radial', 'slamchain',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune'],
      restMs: 1040,
      harassMs: 3050,
      moveSpeed: 60,
      holdDist: 280,
    },
    {
      name: 'The Deep Gallery',
      line: 'This far down, even your echo is afraid of you.',
      hp: 500,
      cycle: [
        'sig:resound', 'sig:sonar', 'quake', 'sig:drop',
        'spiral', 'barrage', 'homing', 'stream', 'lanes',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 75,
      holdDist: 250,
    },
  ],

  hard: {
    introLine: 'EVERY SOUND EVER MADE IS STILL DOWN HERE',
    extraPhase: {
      name: 'The Unreturned',
      line: 'Some echoes never found their way back. They found me instead.',
      hp: 380,
      cycle: [
        'sig:sonar', 'sig:drop', 'sig:resound', 'sanctuary',
        'quake', 'spiral', 'sig:resound', 'stream',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 690,
      harassMs: 2050,
      moveSpeed: 90,
      holdDist: 230,
    },
  },

  signatures: {
    sonar: echolocation,
    resound,
    drop: stalactites,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x06061a, 0.55);
    g.fillRect(0, 0, W, H);
    // Stalactite fringe above, stalagmite teeth below, one glow-worm seam.
    for (let i = 0; i < 12; i++) {
      const x = 40 + ((W - 80) * i) / 11;
      const len = 14 + ((i * 37) % 26);
      g.fillStyle(CAVE_DARK, 0.95);
      g.fillTriangle(x - 8, 96, x + 8, 96, x, 96 + len);
      const len2 = 10 + ((i * 53) % 22);
      g.fillTriangle(x - 7 + 18, H - 28, x + 7 + 18, H - 28, x + 18, H - 28 - len2);
    }
    for (let i = 0; i < 8; i++) {
      g.fillStyle(SONAR, 0.25);
      g.fillCircle(60 + ((W - 120) * i) / 7, 118 + (i % 3) * 6, 1.5);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    // It hangs from the dark: no ground shadow, a rock stem above instead.
    g.fillStyle(CAVE_DARK, 1);
    g.fillTriangle(s.x - 16, s.y - 58, s.x + 16, s.y - 58, s.x, s.y - 30);

    // Folded wing membranes around a crystal core.
    for (const side of [-1, 1]) {
      const flap = Math.sin(t / 480 + side) * 0.1 + s.castGlow * 0.3;
      g.fillStyle(0x1e1e40, 1);
      g.fillTriangle(
        s.x + side * 6, s.y - 26,
        s.x + side * (38 + flap * 20), s.y - 8,
        s.x + side * 14, s.y + 26,
      );
      g.lineStyle(1.5, CHIRP, 0.4);
      g.lineBetween(s.x + side * 8, s.y - 18, s.x + side * (32 + flap * 16), s.y - 6);
    }

    // The core: a faceted crystal heart that rings when it casts.
    g.fillStyle(CAVE_DARK, 1);
    g.fillEllipse(s.x, s.y - 4, 34, 44);
    g.fillStyle(0x262650, 1);
    g.fillEllipse(s.x, s.y - 4, 26, 34);
    g.fillStyle(SONAR, 0.35 + s.castGlow * 0.55);
    g.fillEllipse(s.x, s.y - 2, 12, 18);

    // Great sonar ears, swivelled toward the player.
    const dirX = Math.cos(s.facing);
    for (const side of [-1, 1]) {
      const lean = side * 0.3 + dirX * 0.2;
      g.fillStyle(0x1e1e40, 1);
      g.fillTriangle(
        s.x + side * 10, s.y - 28,
        s.x + side * (24 + lean * 8), s.y - 52,
        s.x + side * 4, s.y - 38,
      );
      g.lineStyle(1, CHIRP_LIT, 0.5);
      g.lineBetween(s.x + side * 12, s.y - 34, s.x + side * (20 + lean * 6), s.y - 46);
    }

    // Eyes: wide sonar dishes. Blind, and better for it.
    const eye = s.hurt ? 0xffffff : s.enraged ? SONAR : CHIRP_LIT;
    const ex = dirX * 3;
    for (const side of [-1, 1]) {
      g.lineStyle(1.5, eye, 0.9);
      g.strokeCircle(s.x + side * 7 + ex, s.y - 14, 4.5);
      g.fillStyle(eye, 0.8);
      g.fillCircle(s.x + side * 7 + ex, s.y - 14, 1.6);
    }
    // Its voice, visible: ripple arcs off the core on a slow beat.
    for (let i = 0; i < 2; i++) {
      const ph = ((t / 1100 + i / 2) % 1);
      g.lineStyle(1.5, SONAR, (1 - ph) * 0.4);
      g.strokeCircle(s.x, s.y - 2, 20 + ph * 34);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
