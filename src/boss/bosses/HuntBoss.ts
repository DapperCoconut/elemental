import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * Apex — Sovereign of the Wilds. Hunt world's boss: the thing that hunts the
 * hunters. Fast, circling, and fond of traps. Canon with the hunt challenge,
 * 'Apex' ("Something hunts the hunters. Meet it.").
 */

const PELT = 0xcc4400;
const PELT_LIT = 0xffa060;
const PELT_DARK = 0x2a1408;
const BONE = 0xe8e0d0;

// ── Signature: Pounce ────────────────────────────────────────────────
// Three quick charges, each landing with a claw-swipe. The lanes telegraph;
// the discipline is stepping OFF the line, not backing down it.

const pounce = (tk: BossToolkit): SignatureMove => ({
  durationMs: 3300,
  cast(time: number) {
    tk.sfx('roar');
    for (let i = 0; i < 3; i++) {
      tk.schedule(i * 1050, () => {
        const p = tk.player;
        const a = tk.angleToPlayer();
        tk.spawnCharge({
          toX: p.x + Math.cos(a) * 120, toY: p.y + Math.sin(a) * 120,
          warnMs: 620, travelMs: 240, halfW: 38, damage: 22,
        });
        // The claw-swipe where it lands.
        tk.schedule(i * 1050 + 900, () => {
          tk.spawnZone({
            x: tk.bossX, y: tk.bossY, radius: 74, warnMs: 380, damage: 14,
          });
        });
      });
    }
    void time;
  },
});

// ── Signature: The Mark ──────────────────────────────────────────────
// A reticle settles on the player and follows for two seconds. When it
// hardens, a bolt arrives from the nearest treeline AND Apex comes with it —
// the answer is a sharp direction change at the click, not distance.

const theMark = (tk: BossToolkit): SignatureMove => {
  let markUntil = 0;
  let hardened = false;
  return {
    durationMs: 3000,
    cast(time: number) {
      tk.sfx('curse-cast');
      markUntil = time + 2100;
      hardened = false;
      tk.schedule(2100, () => {
        hardened = true;
        const p = tk.player;
        // The bolt: from the nearest arena edge, flat at the marked spot.
        const fromLeft = p.x < tk.W / 2;
        tk.spawnBullet({
          x: fromLeft ? 30 : tk.W - 30, y: p.y,
          angle: fromLeft ? 0 : Math.PI, speed: 520,
          damage: 18, r: 6, color: BONE, lifeMs: 2400,
        });
        // And Apex, off the mark's echo.
        tk.spawnCharge({
          toX: p.x, toY: p.y, warnMs: 460, travelMs: 220, halfW: 36, damage: 20,
        });
        tk.schedule(700, () => { hardened = false; });
      });
    },
    drawAir(g, time) {
      if (time >= markUntil && !hardened) return;
      const p = tk.player;
      const closing = Phaser.Math.Clamp(1 - (markUntil - time) / 2100, 0, 1);
      const r = 44 - closing * 18;
      const color = hardened ? 0xff3030 : PELT_LIT;
      g.lineStyle(2, color, 0.5 + closing * 0.45);
      g.strokeCircle(p.x, p.y, r);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + time / 600;
        g.lineStyle(2.5, color, 0.8);
        g.lineBetween(
          p.x + Math.cos(a) * (r + 6), p.y + Math.sin(a) * (r + 6),
          p.x + Math.cos(a) * (r - 4), p.y + Math.sin(a) * (r - 4),
        );
      }
    },
    onPhaseEnd() { markUntil = 0; hardened = false; },
  };
};

// ── Signature: Snares ────────────────────────────────────────────────
// Five jaw-traps scattered across the middle ground. They do not bite hard —
// they HOLD, which with everything else in the air is far worse.

const SNARE_LIFE_MS = 14000;
const SNARE_TRIGGER_R = 40;

const snares = (tk: BossToolkit): SignatureMove => {
  interface Snare { x: number; y: number; armedAt: number; sprung: boolean }
  let traps: Snare[] = [];
  return {
    durationMs: 900,
    cast(time: number) {
      tk.sfx('tentacle');
      const p = tk.player;
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 + Math.random() * 0.7;
        traps.push({
          x: tk.clampX(p.x + Math.cos(a) * Phaser.Math.Between(110, 230), 70),
          y: tk.clampY(p.y + Math.sin(a) * Phaser.Math.Between(90, 190), 110),
          armedAt: time + 900,
          sprung: false,
        });
      }
      if (traps.length > 10) traps = traps.slice(-10);
      tk.schedule(SNARE_LIFE_MS, () => {
        traps = traps.filter((tr) => tk.now - tr.armedAt < SNARE_LIFE_MS - 1000);
      });
    },
    update(time: number) {
      const p = tk.player;
      if (!p.active) return;
      for (const tr of traps) {
        if (tr.sprung || time < tr.armedAt) continue;
        if (Phaser.Math.Distance.Between(tr.x, tr.y, p.x, p.y) < SNARE_TRIGGER_R) {
          tr.sprung = true;
          tk.sfx('tentacle');
          tk.hitPlayer(10, p.x, p.y);
          tk.slowPlayer(0.15, 1300);
          tk.boom(tr.x, tr.y, 30, BONE);
        }
      }
      traps = traps.filter((tr) => !tr.sprung && time - tr.armedAt < SNARE_LIFE_MS);
    },
    drawGround(g, time) {
      for (const tr of traps) {
        const armed = time >= tr.armedAt;
        // A ring of teeth, slightly open.
        g.lineStyle(2, armed ? BONE : PELT_DARK, armed ? 0.85 : 0.45);
        g.strokeCircle(tr.x, tr.y, 15);
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          g.fillStyle(armed ? BONE : PELT_DARK, armed ? 0.9 : 0.5);
          g.fillTriangle(
            tr.x + Math.cos(a - 0.18) * 15, tr.y + Math.sin(a - 0.18) * 15,
            tr.x + Math.cos(a + 0.18) * 15, tr.y + Math.sin(a + 0.18) * 15,
            tr.x + Math.cos(a) * 8, tr.y + Math.sin(a) * 8,
          );
        }
      }
    },
    onPhaseEnd() { traps = []; },
  };
};

export const HUNT_BOSS: WorldBossDef = {
  worldId: 'hunt',
  name: 'Apex',
  title: 'Sovereign of the Wilds',
  color: PELT,
  colorLit: PELT_LIT,
  colorDark: PELT_DARK,
  accent: BONE,
  bodyR: 28,

  intro: ['Something hunts the hunters. Introductions are unnecessary — I know you already.'],
  banter: [
    'You have been tracked since the fire world. Professionally.',
    'The Voice sent hounds for me once. I kept the good one.',
    'Running is honest. I respect the running.',
    'Every trail ends. Yours ends indoors, which is a shame.',
  ],
  defeatLine: 'THE WILDS GO QUIET',

  phases: [
    {
      name: 'The Stalking',
      line: 'Walk the clearing. I will tell you when the hunt starts. It started.',
      hp: 410,
      cycle: [
        'sig:snares', 'sig:pounce', 'volley', 'sig:mark',
        'lanes', 'stream', 'slamchain', 'homing',
      ],
      harass: ['h-snipe', 'h-flak', 'h-mines'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 120,
      holdDist: 300,
    },
    {
      name: 'Red In Tooth',
      line: 'Enough sport. Now it is a meal.',
      hp: 450,
      cycle: [
        'sig:pounce', 'sig:mark', 'quake', 'sig:snares',
        'summon', 'charge', 'barrage', 'stream', 'volley',
      ],
      harass: ['h-flak', 'h-mines', 'h-snipe', 'h-lane'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 140,
      holdDist: 260,
    },
  ],

  hard: {
    introLine: 'THE PACK IS ALREADY BEHIND YOU',
    extraPhase: {
      name: 'The Apex',
      line: 'One predator left in the world. Guess.',
      hp: 340,
      cycle: [
        'sig:mark', 'sig:pounce', 'sig:snares', 'sanctuary',
        'charge', 'summon', 'quake', 'stream',
      ],
      harass: ['h-flak', 'h-mines', 'h-lane', 'h-orbs'],
      restMs: 700,
      harassMs: 2150,
      moveSpeed: 160,
      holdDist: 240,
    },
  },

  signatures: {
    pounce,
    mark: theMark,
    snares,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0c0804, 0.5);
    g.fillRect(0, 0, W, H);
    // Treeline silhouettes top and bottom; old bones in the clearing.
    const rnd = new Phaser.Math.RandomDataGenerator(['hunt-boss-arena']);
    for (let i = 0; i < 12; i++) {
      const x = 30 + ((W - 60) * i) / 11;
      const top = i % 2 === 0;
      const y = top ? 96 : H - 28;
      const h = rnd.integerInRange(26, 54) * (top ? 1 : -1);
      g.fillStyle(PELT_DARK, 0.85);
      g.fillTriangle(x - 12, y, x + 12, y, x, y + h);
    }
    for (let i = 0; i < 5; i++) {
      const x = rnd.integerInRange(W * 0.2, W * 0.8);
      const y = rnd.integerInRange(H * 0.4, H * 0.8);
      g.lineStyle(2, BONE, 0.22);
      g.lineBetween(x - 8, y, x + 8, y - 3);
      g.lineBetween(x - 5, y - 5, x - 3, y + 5);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    const dirX = Math.cos(s.facing);
    const lean = s.castGlow * 8;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 40, 104, 16);

    // Haunches and tail — the low, coiled silhouette of a runner at rest.
    g.fillStyle(PELT_DARK, 1);
    g.fillEllipse(s.x - dirX * 24, s.y + 16, 52, 38);
    const tailWag = Math.sin(t / 300) * 8;
    g.lineStyle(6, PELT_DARK, 1);
    g.lineBetween(s.x - dirX * 44, s.y + 12, s.x - dirX * 66, s.y + 2 + tailWag);
    // Chest and shoulders, leaning toward the player when casting.
    g.fillStyle(PELT, 1);
    g.fillEllipse(s.x + dirX * (8 + lean), s.y + 4, 54, 42);
    g.fillStyle(PELT_LIT, 0.3);
    g.fillEllipse(s.x + dirX * (8 + lean), s.y - 8, 38, 18);
    // Forelegs planted, claws out.
    for (const side of [-1, 1]) {
      const lx = s.x + dirX * (22 + lean) + side * 14;
      g.lineStyle(6, PELT_DARK, 1);
      g.lineBetween(lx, s.y + 14, lx + dirX * 4, s.y + 38);
      g.fillStyle(BONE, 0.9);
      for (let c = 0; c < 3; c++) {
        g.fillTriangle(
          lx + dirX * 4 - 4 + c * 4, s.y + 38,
          lx + dirX * 4 - 2 + c * 4, s.y + 38,
          lx + dirX * 4 - 3 + c * 4 + dirX * 3, s.y + 44,
        );
      }
    }

    // The head: a wolfish skull-face under swept antlers.
    const hx = s.x + dirX * (34 + lean);
    const hy0 = s.y - 22;
    g.fillStyle(PELT_DARK, 1);
    g.fillEllipse(hx, hy0, 34, 26);
    // Muzzle, toward the player.
    g.fillStyle(PELT, 1);
    g.fillTriangle(hx, hy0 - 8, hx, hy0 + 10, hx + dirX * 22, hy0 + 4);
    // Bared teeth when enraged.
    if (s.enraged || s.castGlow > 0.4) {
      g.fillStyle(BONE, 0.95);
      for (let c = 0; c < 3; c++) {
        g.fillTriangle(
          hx + dirX * (8 + c * 5), hy0 + 5,
          hx + dirX * (11 + c * 5), hy0 + 5,
          hx + dirX * (9.5 + c * 5), hy0 + 10,
        );
      }
    }
    // Ears pinned back.
    for (const side of [-1, 1]) {
      g.fillStyle(PELT_DARK, 1);
      g.fillTriangle(
        hx - dirX * 8, hy0 - 8 + side * 3,
        hx - dirX * 4, hy0 - 12 + side * 2,
        hx - dirX * 20, hy0 - 16 + side * 5,
      );
    }
    // Antlers: bone crowns swept back off the skull.
    for (const side of [-1, 1]) {
      g.lineStyle(3.5, BONE, 0.95);
      const ax = hx - dirX * 6;
      g.lineBetween(ax, hy0 - 10, ax - dirX * 12 + side * 4, hy0 - 26);
      g.lineBetween(ax - dirX * 12 + side * 4, hy0 - 26, ax - dirX * 20 + side * 10, hy0 - 32);
      g.lineBetween(ax - dirX * 10 + side * 2, hy0 - 22, ax - dirX * 4 + side * 8, hy0 - 30);
    }
    // Eyes: hunter's lamps.
    const eye = s.hurt ? 0xffffff : s.enraged ? 0xff5030 : PELT_LIT;
    g.fillStyle(eye, 1);
    g.fillEllipse(hx + dirX * 2, hy0 - 4, 6, 4);
    g.fillEllipse(hx - dirX * 8, hy0 - 5, 5, 3.5);
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.22);
      g.fillCircle(s.x, s.y, 56);
    }
  },
};
