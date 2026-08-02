import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Overmind — Sovereign of Psychic, exiled for knowing how the vote would
 * go before it was cast. Canon with the psychic challenge, 'The Overmind'
 * ("One of us is imagining the other. Care to check?").
 *
 * It fights ahead of you: every shot is announced by the ghost of itself
 * arriving a beat early, and the beat is exactly long enough to leave. Being
 * predictable is the only way to lose here.
 */

const MIND = 0x9b4dff;
const MIND_LIT = 0xd8b0ff;
const MIND_DARK = 0x180a2e;
const NERVE = 0x6affd8;

// ── Signature: Precognition ──────────────────────────────────────────
// It fires at where you are going to be, and shows you the shot first. The
// premonition is real: match it and you are hit; deviate and it wasted a turn.

const precognition = (tk: BossToolkit): SignatureMove => {
  interface Fore { x: number; y: number; ang: number; firesAt: number; fired: boolean }
  let fores: Fore[] = [];
  return {
    durationMs: 3300,
    cast(time: number) {
      tk.sfx('sonic-pulse');
      for (let k = 0; k < 5; k++) {
        tk.schedule(k * 420, () => {
          const p = tk.player;
          const body = p.body as Phaser.Physics.Arcade.Body | null;
          // Lead by 900ms of the player's current velocity — the premonition
          // is a straight-line extrapolation, and turning breaks it.
          const lx = tk.clampX(p.x + (body?.velocity.x ?? 0) * 0.9, 50);
          const ly = tk.clampY(p.y + (body?.velocity.y ?? 0) * 0.9, 110);
          fores.push({
            x: lx, y: ly,
            ang: Math.atan2(ly - tk.bossY, lx - tk.bossX),
            firesAt: tk.now + 900, fired: false,
          });
        });
      }
      void time;
    },
    update(time: number) {
      for (const f of fores) {
        if (f.fired || time < f.firesAt) continue;
        f.fired = true;
        tk.sfx('zap');
        tk.spawnBullet({
          x: tk.bossX + Math.cos(f.ang) * 28, y: tk.bossY + Math.sin(f.ang) * 28,
          angle: f.ang, speed: 430, damage: 16, r: 7, color: MIND_LIT, lifeMs: 2200,
        });
      }
      fores = fores.filter((f) => time < f.firesAt + 260);
    },
    drawAir(g, time) {
      for (const f of fores) {
        if (f.fired) continue;
        const t = Phaser.Math.Clamp(1 - (f.firesAt - time) / 900, 0, 1);
        // The shot, remembered forward: a dotted track and a target that tightens.
        const dist = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, f.x, f.y);
        for (let i = 0; i < dist; i += 22) {
          g.fillStyle(MIND_LIT, 0.1 + t * 0.25);
          g.fillCircle(tk.bossX + Math.cos(f.ang) * i, tk.bossY + Math.sin(f.ang) * i, 2);
        }
        g.lineStyle(2, NERVE, 0.35 + t * 0.5);
        g.strokeCircle(f.x, f.y, 26 - t * 12);
        g.lineBetween(f.x - 12, f.y, f.x - 4, f.y);
        g.lineBetween(f.x + 4, f.y, f.x + 12, f.y);
        g.lineBetween(f.x, f.y - 12, f.x, f.y - 4);
        g.lineBetween(f.x, f.y + 4, f.x, f.y + 12);
      }
    },
    onPhaseEnd() { fores = []; },
  };
};

// ── Signature: The Idea ──────────────────────────────────────────────
// One enormous thought descends. It takes four seconds, it is the size of a
// quarter of the hall, and it is impossible not to see coming.

const theIdea = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let landsAt = 0;
  const R = 210;
  const FALL_MS = 3600;
  return {
    durationMs: FALL_MS + 500,
    cast(time: number) {
      tk.sfx('incantation');
      active = true;
      cx = tk.clampX(tk.player.x, 150);
      cy = tk.clampY(tk.player.y, 200);
      landsAt = time + FALL_MS;
      tk.host.showFloatingText(cx, cy - 70, 'AN IDEA FORMS', '#d8b0ff');
      tk.schedule(FALL_MS, () => {
        active = false;
        tk.sfx('gravity-slam');
        tk.scene.cameras.main.shake(420, 0.008);
        tk.explode(cx, cy, R, 46, MIND);
        // The aftershock: thinking that hard leaves a headache on the floor.
        tk.spawnPool({ x: cx, y: cy, radius: R * 0.7, lifeMs: 4000, damage: 7, tickMs: 650 });
      });
    },
    update(time: number, dt: number) {
      if (!active) return;
      // It drifts toward you, slowly enough to be walked away from twice over.
      const p = tk.player;
      if (!p.active) return;
      const a = Math.atan2(p.y - cy, p.x - cx);
      const d = Math.min(Phaser.Math.Distance.Between(cx, cy, p.x, p.y), 42 * dt);
      cx = tk.clampX(cx + Math.cos(a) * d, 150);
      cy = tk.clampY(cy + Math.sin(a) * d, 200);
      void time;
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (landsAt - time) / FALL_MS, 0, 1);
      g.fillStyle(MIND, 0.07 + t * 0.2);
      g.fillCircle(cx, cy, R);
      g.lineStyle(3, MIND_LIT, 0.3 + t * 0.55);
      g.strokeCircle(cx, cy, R);
      g.lineStyle(2, NERVE, 0.2 + t * 0.4);
      g.strokeCircle(cx, cy, R * (1 - t * 0.85));
    },
    drawAir(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (landsAt - time) / FALL_MS, 0, 1);
      // The thought itself: a brain-shaped mass descending, gaining detail as
      // it approaches — the closer it gets, the more of it there is.
      const r = 40 + t * 110;
      const lift = (1 - t) * 90;
      g.fillStyle(MIND_DARK, 0.35 + t * 0.4);
      g.fillCircle(cx, cy - lift, r);
      g.fillStyle(MIND, 0.4 + t * 0.35);
      g.fillCircle(cx, cy - lift, r * 0.86);
      // Folds.
      g.lineStyle(2 + t * 2, MIND_LIT, 0.4 + t * 0.4);
      for (let i = 0; i < 5; i++) {
        const a0 = (Math.PI * 2 * i) / 5 + time / 1400;
        g.beginPath();
        g.arc(cx + Math.cos(a0) * r * 0.4, cy - lift + Math.sin(a0) * r * 0.4,
          r * 0.34, a0, a0 + Math.PI * 1.4, false);
        g.strokePath();
      }
      // Synapses firing as it makes up its mind.
      for (let i = 0; i < 6; i++) {
        const a0 = time / 300 + i * 1.1;
        g.fillStyle(NERVE, 0.4 + Math.sin(time / 90 + i) * 0.3);
        g.fillCircle(cx + Math.cos(a0) * r * 0.7, cy - lift + Math.sin(a0) * r * 0.6, 3);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Lattice ───────────────────────────────────────────
// It puts a grid of thought over the hall and lights a path through it toward
// you, one node at a time. You can see which way it is coming from a long way off.

const theLattice = (tk: BossToolkit): SignatureMove => {
  interface Node { x: number; y: number; firesAt: number; fired: boolean }
  let nodes: Node[] = [];
  let showUntil = 0;
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('echo-ping');
      showUntil = time + 3800;
      const p = tk.player;
      // A chain of nodes from an edge of the hall to the player, drawn whole
      // before the first one goes off.
      const a = Math.random() * Math.PI * 2;
      const sx = tk.clampX(p.x + Math.cos(a) * 460, 60);
      const sy = tk.clampY(p.y + Math.sin(a) * 400, 130);
      const STEPS = 8;
      for (let i = 0; i <= STEPS; i++) {
        const t2 = i / STEPS;
        nodes.push({
          x: sx + (p.x - sx) * t2,
          y: sy + (p.y - sy) * t2,
          firesAt: time + 1300 + i * 230,
          fired: false,
        });
      }
    },
    update(time: number) {
      for (const n of nodes) {
        if (n.fired || time < n.firesAt) continue;
        n.fired = true;
        tk.explode(n.x, n.y, 56, 15, MIND_LIT);
      }
      nodes = nodes.filter((n) => time < n.firesAt + 500);
    },
    drawGround(g, time) {
      if (time > showUntil) return;
      // The whole chain, drawn at once: the route is public information.
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const soon = Phaser.Math.Clamp(1 - (n.firesAt - time) / 900, 0, 1);
        if (i > 0) {
          g.lineStyle(2, MIND, 0.12 + soon * 0.3);
          g.lineBetween(nodes[i - 1].x, nodes[i - 1].y, n.x, n.y);
        }
        if (n.fired) continue;
        g.lineStyle(2, NERVE, 0.25 + soon * 0.5);
        g.strokeCircle(n.x, n.y, 56 * (0.4 + soon * 0.6));
        g.fillStyle(MIND, 0.08 + soon * 0.2);
        g.fillCircle(n.x, n.y, 56 * soon);
      }
    },
    onPhaseEnd() { nodes = []; showUntil = 0; },
  };
};

export const PSYCHIC_BOSS: WorldBossDef = {
  worldId: 'psychic',
  name: 'The Overmind',
  title: 'Sovereign of Psychic, Which Knew the Verdict First',
  color: MIND,
  colorLit: MIND_LIT,
  colorDark: MIND_DARK,
  accent: NERVE,
  bodyR: 30,

  intro: ['One of us is imagining the other. Care to check? I already have. Twice.'],
  banter: [
    'I told them the verdict before the vote. They exiled me for the TELLING.',
    'You are about to move left. There. Now you have moved right, to spite me, which I also had.',
    'The Voice thinks in a language with no future tense. It was the first thing I could not read.',
    'I have run this fight four thousand times. You are doing better than average.',
  ],
  defeatLine: 'I DID NOT SEE THAT',

  phases: [
    {
      name: 'The Parlour',
      line: 'Sit. Think of a number. I will be disappointed, but sit.',
      hp: 440,
      cycle: [
        'sig:precog', 'volley', 'sig:lattice', 'homing',
        'sig:idea', 'lanes', 'spiral', 'radial',
      ],
      harass: ['h-rune', 'h-orbs', 'h-flak'],
      restMs: 1040,
      harassMs: 3100,
      moveSpeed: 56,
      holdDist: 300,
    },
    {
      name: 'The Broadcast',
      line: 'Enough conversation. I will simply put it directly into the room.',
      hp: 500,
      cycle: [
        'sig:idea', 'sig:precog', 'barrage', 'sig:lattice',
        'stream', 'spiral', 'sig:precog', 'quake', 'homing',
      ],
      harass: ['h-rune', 'h-orbs', 'h-lane', 'h-flak'],
      restMs: 890,
      harassMs: 2550,
      moveSpeed: 68,
      holdDist: 275,
    },
  ],

  hard: {
    introLine: 'THE OVERMIND HAS ALREADY WON THIS ONE',
    extraPhase: {
      name: 'The Certainty',
      line: 'I have seen how this ends. I am doing it anyway. That is what certainty IS.',
      hp: 400,
      cycle: [
        'sig:precog', 'sig:idea', 'sig:lattice', 'sanctuary',
        'sig:precog', 'stream', 'spiral', 'barrage',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-flak'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 78,
      holdDist: 255,
    },
  },

  signatures: {
    precog: precognition,
    idea: theIdea,
    lattice: theLattice,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0a0518, 0.6);
    g.fillRect(0, 0, W, H);
    // A parlour inside a skull: soft furniture, and a lattice over everything.
    g.lineStyle(1, MIND, 0.05);
    for (let x = 40; x < W; x += 60) g.lineBetween(x, 96, x, H);
    for (let y = 110; y < H; y += 60) g.lineBetween(0, y, W, y);
    for (let x = 40; x < W; x += 60) {
      for (let y = 110; y < H; y += 60) {
        g.fillStyle(NERVE, 0.05);
        g.fillCircle(x, y, 2);
      }
    }
    // Two armchairs, facing each other, one of them enormous.
    g.fillStyle(0x2a1440, 0.7);
    g.fillRoundedRect(W * 0.12, H * 0.55, 90, 70, 12);
    g.fillRoundedRect(W * 0.12 - 8, H * 0.5, 106, 30, 10);
    g.fillRoundedRect(W * 0.76, H * 0.5, 130, 100, 16);
    g.fillRoundedRect(W * 0.76 - 10, H * 0.42, 150, 40, 14);
    // The throb: rings from the centre, permanently mid-thought.
    for (let i = 0; i < 4; i++) {
      g.lineStyle(2, MIND, 0.04);
      g.strokeCircle(W / 2, H / 2, 90 + i * 80);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 48, 92, 16);

    const dirX = Math.cos(s.facing);
    const think = Math.sin(t / 500) * 2;

    // A small body carrying an enormous head, which is the entire joke.
    g.fillStyle(MIND_DARK, 1);
    g.fillRoundedRect(s.x - 17, s.y + 4, 34, 44, 9);
    g.fillStyle(0x3a2058, 1);
    g.fillRoundedRect(s.x - 13, s.y + 8, 26, 36, 7);
    // Frail little arms, which it barely uses.
    g.lineStyle(4, 0x3a2058, 1);
    g.lineBetween(s.x - 15, s.y + 14, s.x - 30 - s.castGlow * 6, s.y + 30);
    g.lineBetween(s.x + 15, s.y + 14, s.x + 30 + s.castGlow * 6, s.y + 30);
    g.fillStyle(0x8a6ab8, 1);
    g.fillCircle(s.x - 31 - s.castGlow * 6, s.y + 32, 5);
    g.fillCircle(s.x + 31 + s.castGlow * 6, s.y + 32, 5);

    // The head: exposed, folded, faintly luminous, and always working.
    const hy = s.y - 26 + think;
    g.fillStyle(MIND_DARK, 1);
    g.fillEllipse(s.x, hy, 84, 74);
    g.fillStyle(MIND, 0.9);
    g.fillEllipse(s.x, hy, 76, 66);
    // Folds, drawn as nested arcs so it reads as a brain and not a balloon.
    g.lineStyle(3, MIND_LIT, 0.55);
    for (let i = 0; i < 6; i++) {
      const a0 = (Math.PI * 2 * i) / 6 + t / 3000;
      g.beginPath();
      g.arc(s.x + Math.cos(a0) * 22, hy + Math.sin(a0) * 18, 16, a0, a0 + Math.PI * 1.5, false);
      g.strokePath();
    }
    g.lineStyle(2, MIND_DARK, 0.6);
    g.lineBetween(s.x, hy - 34, s.x, hy + 32);
    // Synapses. They go faster when it is about to do something.
    for (let i = 0; i < 8; i++) {
      const a0 = t / (240 - s.castGlow * 120) + i * 0.8;
      const rr = 20 + ((i * 7) % 22);
      g.fillStyle(NERVE, 0.35 + Math.sin(t / 70 + i) * 0.3 + s.castGlow * 0.3);
      g.fillCircle(s.x + Math.cos(a0) * rr, hy + Math.sin(a0) * rr * 0.85, 2.5);
    }

    // The eyes: three of them, and the third is the one that is looking at you.
    const eye = s.hurt ? 0xffffff : NERVE;
    for (const side of [-1, 1]) {
      g.fillStyle(0xf0e4ff, 0.9);
      g.fillEllipse(s.x + side * 18 + dirX * 3, hy + 20, 15, 11);
      g.fillStyle(MIND_DARK, 1);
      g.fillCircle(s.x + side * 18 + dirX * 5, hy + 20, 4.5);
      g.fillStyle(eye, 0.8);
      g.fillCircle(s.x + side * 18 + dirX * 5, hy + 20, 2);
    }
    const blink = Math.sin(t / 1700) > 0.9 ? 0.15 : 1;
    g.fillStyle(0xf0e4ff, 0.95 * blink);
    g.fillEllipse(s.x + dirX * 3, hy - 6, 22, 16 * blink);
    g.fillStyle(MIND_DARK, blink);
    g.fillCircle(s.x + dirX * 6, hy - 6, 7 * blink);
    g.fillStyle(eye, 0.9 * blink);
    g.fillCircle(s.x + dirX * 6, hy - 6, 3.4 * blink + s.castGlow);
    if (s.enraged) {
      // It has stopped keeping its thinking to itself.
      for (let i = 0; i < 3; i++) {
        const r = 70 + ((t / 6 + i * 40) % 120);
        g.lineStyle(2, MIND_LIT, Math.max(0, 0.25 - (r - 70) / 480));
        g.strokeCircle(s.x, hy, r);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 62);
    }
  },
};
