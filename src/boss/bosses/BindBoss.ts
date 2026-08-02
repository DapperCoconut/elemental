import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Gaoler — Sovereign of Bind, exiled for holding on and never once
 * reconsidering. Canon with the bind challenge, 'The Gaoler' ("Every cell in
 * this realm has a name on it. Yours is fresh.").
 *
 * A fight about leash length. The tether never roots outright — Bind pulls at
 * 130 against a 200 px/s walk — but everything it does shrinks the room you
 * are allowed to have.
 */

const IRON = 0xe0b743;
const IRON_LIT = 0xffe9a0;
const IRON_DARK = 0x241c08;
const RUST = 0x8a5a2a;

// ── Signature: The Tether ────────────────────────────────────────────
// A chain finds you and holds. Walking against it hurts nothing; standing in
// its reach does. It lets go when it has hauled you close enough to bite.

const theTether = (tk: BossToolkit): SignatureMove => {
  let until = 0;
  let lastTick = 0;
  let anchorX = 0;
  let anchorY = 0;
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('chain');
      until = time + 3000;
      anchorX = tk.bossX;
      anchorY = tk.bossY;
      tk.pull(anchorX, anchorY, 128, 3000);
      tk.host.showFloatingText(tk.player.x, tk.player.y - 46, 'TETHERED', '#ffe9a0');
      // The bite at the end of the leash, telegraphed from the first frame.
      tk.schedule(3000, () => {
        tk.sfx('clang');
        tk.explode(anchorX, anchorY, 170, 30, IRON);
      });
    },
    update(time: number) {
      if (time > until) return;
      const p = tk.player;
      if (!p.active || time - lastTick < 620) return;
      // Close to the anchor is where the chain has slack to swing.
      if (Phaser.Math.Distance.Between(anchorX, anchorY, p.x, p.y) < 170) {
        lastTick = time;
        tk.hitPlayer(8, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (time > until) return;
      const t = Phaser.Math.Clamp(1 - (until - time) / 3000, 0, 1);
      g.lineStyle(2, IRON, 0.2 + t * 0.4);
      g.strokeCircle(anchorX, anchorY, 170);
      g.fillStyle(IRON, 0.05 + t * 0.12);
      g.fillCircle(anchorX, anchorY, 170);
    },
    drawAir(g, time) {
      if (time > until) return;
      const p = tk.player;
      // The chain: real links, sagging under their own weight.
      const d = Phaser.Math.Distance.Between(anchorX, anchorY, p.x, p.y);
      const links = Math.max(4, Math.floor(d / 22));
      const sag = Phaser.Math.Clamp(d / 12, 0, 34);
      for (let i = 0; i <= links; i++) {
        const t2 = i / links;
        const x = anchorX + (p.x - anchorX) * t2;
        const y = anchorY + (p.y - anchorY) * t2 + Math.sin(t2 * Math.PI) * sag;
        g.lineStyle(3, i % 2 === 0 ? IRON : RUST, 0.9);
        g.strokeEllipse(x, y, 13, 8);
      }
      // The cuff, snug at the far end.
      g.lineStyle(4, IRON_LIT, 0.9);
      g.strokeCircle(p.x, p.y, 22 + Math.sin(time / 140) * 1.5);
    },
    onPhaseEnd() { until = 0; },
  };
};

// ── Signature: The Cell ──────────────────────────────────────────────
// Bars come down around you in a square. One bar is missing — the cell was
// built in a hurry, by something that expected you to panic instead of look.

const theCell = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let half = 0;
  let openSide = 0;
  let endsAt = 0;
  let lastHitAt = 0;
  const HOLD_MS = 4200;
  return {
    durationMs: 2600,
    cast(time: number) {
      tk.sfx('stone-rise');
      active = true;
      cx = tk.clampX(tk.player.x, 150);
      cy = tk.clampY(tk.player.y, 200);
      half = 168;
      openSide = Phaser.Math.Between(0, 3);
      endsAt = time + HOLD_MS;
      // Something to do while inside: the bars are only half the problem.
      for (let i = 0; i < 4; i++) {
        tk.schedule(700 + i * 800, () => {
          tk.spawnZone({
            x: cx + Phaser.Math.Between(-half + 40, half - 40),
            y: cy + Phaser.Math.Between(-half + 40, half - 40),
            radius: 54, warnMs: 900, damage: 18,
          });
        });
      }
      tk.schedule(HOLD_MS, () => { active = false; });
    },
    update(time: number) {
      if (!active) return;
      const p = tk.player;
      if (!p.active || time - lastHitAt < 550) return;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const onBar = (Math.abs(Math.abs(dx) - half) < 18 && Math.abs(dy) < half + 18)
        || (Math.abs(Math.abs(dy) - half) < 18 && Math.abs(dx) < half + 18);
      if (!onBar) return;
      const through =
        (openSide === 0 && dy < 0 && Math.abs(dy) > half - 20)
        || (openSide === 2 && dy > 0 && Math.abs(dy) > half - 20)
        || (openSide === 1 && dx > 0 && Math.abs(dx) > half - 20)
        || (openSide === 3 && dx < 0 && Math.abs(dx) > half - 20);
      if (through) return;
      lastHitAt = time;
      tk.hitPlayer(16, p.x, p.y);
      tk.slowPlayer(0.55, 700);
    },
    drawAir(g, time) {
      if (!active) return;
      const fade = Phaser.Math.Clamp((endsAt - time) / 500, 0, 1);
      const drop = Phaser.Math.Clamp((time - (endsAt - HOLD_MS)) / 400, 0, 1);
      const sides: [number, number, number, number, number][] = [
        [cx - half, cy - half, cx + half, cy - half, 0],
        [cx + half, cy - half, cx + half, cy + half, 1],
        [cx - half, cy + half, cx + half, cy + half, 2],
        [cx - half, cy - half, cx - half, cy + half, 3],
      ];
      for (const [x0, y0, x1, y1, side] of sides) {
        if (side === openSide) {
          // The missing bar, marked by the sockets it should have sat in.
          g.lineStyle(2, IRON_LIT, 0.35 * fade);
          g.lineBetween(x0, y0, x1, y1);
          continue;
        }
        const horizontal = y0 === y1;
        const span = horizontal ? x1 - x0 : y1 - y0;
        const bars = Math.floor(span / 26);
        for (let i = 0; i <= bars; i++) {
          const t2 = i / bars;
          const bxp = x0 + (x1 - x0) * t2;
          const byp = y0 + (y1 - y0) * t2;
          g.lineStyle(5, IRON, 0.85 * fade);
          if (horizontal) g.lineBetween(bxp, byp, bxp, byp + (y0 < cy ? 30 : -30) * drop);
          else g.lineBetween(bxp, byp, bxp + (x0 < cx ? 30 : -30) * drop, byp);
        }
        g.lineStyle(6, RUST, 0.9 * fade);
        g.lineBetween(x0, y0, x1, y1);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Sentence ──────────────────────────────────────────
// An idol is driven into the floor and starts reading out the terms. Each
// clause is a chain swept off the idol; the sweep is slow and it is signposted.

const theSentence = (tk: BossToolkit): SignatureMove => {
  let ix = 0;
  let iy = 0;
  let until = 0;
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('anvil');
      const p = tk.player;
      // Placed off the player's shoulder — the sweeps need somewhere to go.
      const a = tk.angleToPlayer(p.x, p.y) + Math.PI + (Math.random() - 0.5);
      ix = tk.clampX(p.x + Math.cos(a) * 200, 100);
      iy = tk.clampY(p.y + Math.sin(a) * 180, 160);
      until = time + 3600;
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        tk.schedule(k * 1100, () => {
          const centre = Math.atan2(tk.player.y - iy, tk.player.x - ix);
          tk.sfx('chain');
          tk.spawnSweep({
            ox: ix, oy: iy,
            a0: centre - dir * 0.9, a1: centre + dir * 0.9,
            warnMs: 720, travelMs: 1000, halfW: 30, damage: 26,
          });
        });
      }
    },
    drawGround(g, time) {
      if (time > until) return;
      const pulse = 0.3 + Math.sin(time / 140) * 0.15;
      g.lineStyle(2, IRON, pulse);
      g.strokeCircle(ix, iy, 26);
      g.fillStyle(IRON_DARK, 0.5);
      g.fillCircle(ix, iy, 26);
      // Fine print, radiating.
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12 + time / 3000;
        g.lineStyle(1, IRON_LIT, pulse * 0.4);
        g.lineBetween(ix + Math.cos(a) * 30, iy + Math.sin(a) * 30,
          ix + Math.cos(a) * 46, iy + Math.sin(a) * 46);
      }
    },
    drawAir(g, time) {
      if (time > until) return;
      // The idol: a squat iron thing with a keyhole face and a heavy ring.
      const bob = Math.sin(time / 400) * 2;
      g.fillStyle(IRON_DARK, 1);
      g.fillRoundedRect(ix - 15, iy - 34 + bob, 30, 46, 7);
      g.fillStyle(RUST, 1);
      g.fillRoundedRect(ix - 12, iy - 30 + bob, 24, 38, 6);
      g.fillStyle(IRON_DARK, 1);
      g.fillCircle(ix, iy - 16 + bob, 6);
      g.fillTriangle(ix - 4, iy - 12 + bob, ix + 4, iy - 12 + bob, ix, iy + 2 + bob);
      g.lineStyle(3, IRON, 0.9);
      g.strokeCircle(ix, iy - 40 + bob, 9);
      g.fillStyle(IRON_LIT, 0.3 + Math.sin(time / 180) * 0.2);
      g.fillCircle(ix, iy - 16 + bob, 3);
    },
    onPhaseEnd() { until = 0; },
  };
};

export const BIND_BOSS: WorldBossDef = {
  worldId: 'bind',
  name: 'The Gaoler',
  title: 'Sovereign of Bind, Warden of the Gaol',
  color: IRON,
  colorLit: IRON_LIT,
  colorDark: IRON_DARK,
  accent: RUST,
  bodyR: 30,

  intro: ['Every cell in this realm has a name on it. Yours is fresh. The paint is still tacky.'],
  banter: [
    'They exiled me for holding on. I held on to the exile as well.',
    'I have never lost a prisoner. I have lost several doors.',
    'The Voice slid between my links. I have been tightening ever since.',
    'You keep testing the leash. Good. That is what a leash is FOR.',
  ],
  defeatLine: 'THE LOCKS GIVE',

  phases: [
    {
      name: 'Remand',
      line: 'You are not sentenced yet. You are merely held.',
      hp: 450,
      cycle: [
        'sig:tether', 'volley', 'sig:cell', 'lanes',
        'sig:sentence', 'homing', 'minefield', 'radial',
      ],
      harass: ['h-lane', 'h-rune', 'h-orbs'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 44,
      holdDist: 290,
    },
    {
      name: 'The Long Sentence',
      line: 'Terms read. Terms accepted — I accepted them on your behalf, you were busy.',
      hp: 510,
      cycle: [
        'sig:cell', 'sig:tether', 'barrage', 'sig:sentence',
        'spiral', 'minefield', 'summon', 'lanes', 'quake',
      ],
      harass: ['h-lane', 'h-mines', 'h-rune', 'h-orbs'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 54,
      holdDist: 265,
    },
  ],

  hard: {
    introLine: 'THE GAOL HAS RUN OUT OF PATIENCE AND SPACE',
    extraPhase: {
      name: 'Solitary',
      line: 'Smaller, then. Smaller, and smaller, until it is exactly your size.',
      hp: 410,
      cycle: [
        'sig:cell', 'sig:tether', 'sig:sentence', 'sanctuary',
        'sig:cell', 'minefield', 'spiral', 'barrage',
      ],
      harass: ['h-mines', 'h-lane', 'h-rune', 'h-orbs'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 64,
      holdDist: 245,
    },
  },

  signatures: {
    tether: theTether,
    cell: theCell,
    sentence: theSentence,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0e0b04, 0.6);
    g.fillRect(0, 0, W, H);
    // A gaol block: barred alcoves down both walls, a drain in the middle, and
    // chains sunk into the floor pointing at it.
    for (const side of [0, 1]) {
      const x = side === 0 ? 30 : W - 30;
      for (let i = 0; i < 4; i++) {
        const y = 140 + i * 112;
        g.fillStyle(0x0a0803, 0.95);
        g.fillRect(x - 22, y, 44, 84);
        for (let b = 0; b < 5; b++) {
          g.fillStyle(RUST, 0.55);
          g.fillRect(x - 20 + b * 9, y, 4, 84);
        }
      }
    }
    g.fillStyle(IRON_DARK, 0.8);
    g.fillCircle(W / 2, H / 2, 30);
    g.fillStyle(0x000000, 0.7);
    g.fillCircle(W / 2, H / 2, 22);
    for (let i = 0; i < 6; i++) {
      g.lineStyle(3, RUST, 0.25);
      const a = (Math.PI * 2 * i) / 6;
      g.lineBetween(W / 2 + Math.cos(a) * 34, H / 2 + Math.sin(a) * 34,
        W / 2 + Math.cos(a) * 210, H / 2 + Math.sin(a) * 170);
    }
    g.fillStyle(IRON, 0.04);
    g.fillRect(0, 96, W, 22);
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.42);
    g.fillEllipse(s.x, s.y + 48, 96, 17);

    const dirX = Math.cos(s.facing);
    const breathe = Math.sin(t / 700) * 1.5;

    // The body is a lock: a great iron drum with a keyway down the front, wound
    // about with the chains it has never once put down.
    g.fillStyle(IRON_DARK, 1);
    g.fillRoundedRect(s.x - 34, s.y - 28 + breathe, 68, 74, 14);
    g.fillStyle(RUST, 1);
    g.fillRoundedRect(s.x - 29, s.y - 23 + breathe, 58, 64, 11);
    g.fillStyle(IRON, 0.85);
    g.fillRoundedRect(s.x - 22, s.y - 16 + breathe, 44, 50, 9);
    // The keyway — lit from behind when it is about to do something.
    g.fillStyle(IRON_DARK, 1);
    g.fillCircle(s.x, s.y + 2 + breathe, 10);
    g.fillTriangle(s.x - 6, s.y + 6 + breathe, s.x + 6, s.y + 6 + breathe, s.x, s.y + 28 + breathe);
    g.fillStyle(IRON_LIT, 0.3 + s.castGlow * 0.6);
    g.fillCircle(s.x, s.y + 2 + breathe, 5);
    // Chains wound about the drum.
    for (let i = 0; i < 3; i++) {
      const y = s.y - 12 + i * 20 + breathe;
      for (let k = 0; k < 7; k++) {
        g.lineStyle(2.5, k % 2 === 0 ? IRON : RUST, 0.75);
        g.strokeEllipse(s.x - 30 + k * 10, y + Math.sin(k + i) * 2, 11, 7);
      }
    }

    // Arms: chains ending in a ring and a great key, both always swinging.
    for (const side of [-1, 1]) {
      const ax = s.x + side * 40;
      const sway = Math.sin(t / 380 + side * 2) * 6;
      for (let i = 1; i <= 5; i++) {
        g.lineStyle(3, i % 2 === 0 ? IRON : RUST, 0.85);
        g.strokeEllipse(ax + sway * (i / 5), s.y - 10 + i * 10, 10, 7);
      }
      if (side === 1) {
        g.lineStyle(5, IRON_LIT, 0.9);
        g.strokeCircle(ax + sway, s.y + 52, 10);
      } else {
        g.fillStyle(IRON_LIT, 0.9);
        g.fillRect(ax + sway - 3, s.y + 40, 6, 22);
        g.fillRect(ax + sway - 3, s.y + 56, 12, 4);
        g.fillRect(ax + sway - 3, s.y + 50, 9, 4);
        g.lineStyle(3, IRON_LIT, 0.9);
        g.strokeCircle(ax + sway, s.y + 36, 7);
      }
    }

    // Head: a hood with a padlock where a face is customary.
    const hy = s.y - 48 + breathe;
    g.fillStyle(0x1a1408, 1);
    g.beginPath();
    g.moveTo(s.x - 22, hy + 16);
    g.lineTo(s.x - 14, hy - 18);
    g.lineTo(s.x + 14, hy - 18);
    g.lineTo(s.x + 22, hy + 16);
    g.closePath();
    g.fillPath();
    g.fillStyle(IRON, 0.95);
    g.fillRoundedRect(s.x - 11 + dirX * 3, hy - 8, 22, 20, 4);
    g.lineStyle(3.5, IRON, 0.95);
    g.beginPath();
    g.arc(s.x + dirX * 3, hy - 10, 7, Math.PI, 0, false);
    g.strokePath();
    const eye = s.hurt ? 0xffffff : IRON_LIT;
    g.fillStyle(eye, 0.9);
    g.fillCircle(s.x + dirX * 3, hy + 1, 3 + s.castGlow);
    g.fillTriangle(s.x - 2 + dirX * 3, hy + 3, s.x + 2 + dirX * 3, hy + 3, s.x + dirX * 3, hy + 9);
    if (s.enraged) {
      g.lineStyle(2, IRON_LIT, 0.25 + Math.sin(t / 130) * 0.15);
      g.strokeCircle(s.x, s.y, 66);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 56);
    }
  },
};
