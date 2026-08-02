import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Curator — Sovereign of Amber, which loved the realm so much it stopped
 * the realm. Canon with the amber challenge, 'The Curator' ("Your pose is
 * wrong. Hold still while I correct it. Forever.").
 *
 * Every move here is about being made to stand still: resin that sets, a case
 * that closes, and the permanent collection stampeding out of its own exhibit.
 */

const AMBER = 0xd98b1f;
const AMBER_LIT = 0xffd27a;
const AMBER_DARK = 0x2e1806;
const GLASS = 0xf0e6c8;

// ── Signature: The Setting ───────────────────────────────────────────
// Resin is poured. While it is liquid it merely holds you; when it sets, it
// keeps whatever is in it — so the slow is the warning, not the punishment.

const theSetting = (tk: BossToolkit): SignatureMove => {
  interface Pour { x: number; y: number; r: number; setsAt: number; set: boolean; lastTick: number }
  let pours: Pour[] = [];
  return {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('oil-splash');
      for (let i = 0; i < 4; i++) {
        tk.schedule(i * 260, () => {
          const p = tk.player;
          const a = Math.random() * Math.PI * 2;
          const x = tk.clampX(p.x + Math.cos(a) * Phaser.Math.Between(40, 190), 60);
          const y = tk.clampY(p.y + Math.sin(a) * Phaser.Math.Between(40, 170), 120);
          pours.push({ x, y, r: 74, setsAt: tk.now + 2600, set: false, lastTick: 0 });
        });
      }
      void time;
    },
    update(time: number) {
      const p = tk.player;
      for (const q of pours) {
        const inside = p.active && Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) < q.r;
        if (!q.set && time >= q.setsAt) {
          q.set = true;
          tk.sfx('crystal-chime');
          if (inside) {
            tk.hitPlayer(30, p.x, p.y);
            tk.slowPlayer(0.42, 1600);
            tk.host.showFloatingText(p.x, p.y - 40, 'ACQUIRED', '#ffd27a');
          }
          tk.boom(q.x, q.y, q.r, AMBER_LIT);
        } else if (!q.set && inside && time - q.lastTick > 500) {
          // Wading: it costs speed long before it costs health.
          q.lastTick = time;
          tk.slowPlayer(0.6, 620);
          tk.hitPlayer(4, p.x, p.y);
        }
      }
      pours = pours.filter((q) => time < q.setsAt + 900);
    },
    drawGround(g, time) {
      for (const q of pours) {
        const t = Phaser.Math.Clamp(1 - (q.setsAt - time) / 2600, 0, 1);
        if (q.set) {
          g.fillStyle(AMBER, 0.5);
          g.fillCircle(q.x, q.y, q.r);
          g.lineStyle(3, GLASS, 0.5);
          g.strokeCircle(q.x, q.y, q.r);
          continue;
        }
        // Liquid resin: thick, glossy, rising. Its skin thickens as it sets.
        g.fillStyle(AMBER_DARK, 0.32 + t * 0.2);
        g.fillCircle(q.x, q.y, q.r);
        g.fillStyle(AMBER, 0.2 + t * 0.32);
        g.fillCircle(q.x, q.y, q.r * (0.6 + t * 0.4));
        g.lineStyle(1 + t * 3, AMBER_LIT, 0.35 + t * 0.5);
        g.strokeCircle(q.x, q.y, q.r);
        // Trapped things, drifting slower each second.
        for (let i = 0; i < 3; i++) {
          const a = time / (900 + i * 400) + i * 2;
          const drift = (1 - t) * 0.7 + 0.1;
          g.fillStyle(AMBER_DARK, 0.5);
          g.fillEllipse(
            q.x + Math.cos(a * drift) * q.r * 0.45,
            q.y + Math.sin(a * drift) * q.r * 0.4, 7, 4,
          );
        }
      }
    },
    onPhaseEnd() { pours = []; },
  };
};

// ── Signature: The Permanent Collection ──────────────────────────────
// The exhibits are let out for the afternoon. They run in straight lines,
// down lit lanes, exactly as they were told to a very long time ago.

const collection = (tk: BossToolkit): SignatureMove => {
  interface Beast { x: number; y: number; vx: number; kind: number; lastHitAt: number }
  let beasts: Beast[] = [];
  return {
    durationMs: 3300,
    cast(time: number) {
      tk.sfx('roar');
      const lanes = 3;
      for (let i = 0; i < lanes; i++) {
        const fromLeft = Math.random() < 0.5;
        const y = tk.clampY(tk.player.y + (i - 1) * 110 + Phaser.Math.Between(-30, 30), 150);
        // The lane is lit a beat before anything runs down it.
        tk.spawnLane({
          x: tk.W / 2, y, angle: 0, halfW: 40, warnMs: 1000, fireMs: 120, damage: 12,
        });
        tk.schedule(1000 + i * 220, () => {
          tk.sfx('stone-slam');
          beasts.push({
            x: fromLeft ? -50 : tk.W + 50, y,
            vx: fromLeft ? 330 : -330, kind: i % 3, lastHitAt: 0,
          });
        });
      }
      void time;
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const b of beasts) {
        b.x += b.vx * dt;
        if (p.active && time - b.lastHitAt > 600
          && Math.abs(p.x - b.x) < 42 && Math.abs(p.y - b.y) < 34) {
          b.lastHitAt = time;
          tk.hitPlayer(24, p.x, p.y);
        }
      }
      beasts = beasts.filter((b) => b.x > -110 && b.x < tk.W + 110);
    },
    drawAir(g, time) {
      for (const b of beasts) {
        const dir = Math.sign(b.vx);
        const gait = Math.sin(time / 90 + b.x / 30) * 4;
        // Still half in the resin — everything they do trails a little gold.
        for (let i = 1; i <= 3; i++) {
          g.fillStyle(AMBER, 0.16 / i);
          g.fillEllipse(b.x - dir * i * 22, b.y + gait * 0.5, 46, 26);
        }
        g.fillStyle(AMBER_DARK, 0.95);
        g.fillEllipse(b.x, b.y + gait * 0.4, 48, 28);
        g.fillStyle(AMBER, 0.9);
        g.fillEllipse(b.x, b.y + gait * 0.4, 42, 22);
        if (b.kind === 0) {
          // Something with a long neck and no opinions.
          g.fillStyle(AMBER, 0.9);
          g.fillEllipse(b.x + dir * 30, b.y - 22 + gait, 12, 26);
          g.fillEllipse(b.x + dir * 34, b.y - 36 + gait, 16, 11);
        } else if (b.kind === 1) {
          // Something with a jaw and several.
          g.fillStyle(AMBER, 0.9);
          g.fillEllipse(b.x + dir * 28, b.y - 8 + gait, 22, 17);
          g.fillStyle(GLASS, 0.85);
          for (let i = 0; i < 4; i++) {
            g.fillTriangle(
              b.x + dir * (20 + i * 6), b.y - 2 + gait,
              b.x + dir * (24 + i * 6), b.y - 2 + gait,
              b.x + dir * (22 + i * 6), b.y + 6 + gait,
            );
          }
        } else {
          // Something with plates, and a grievance about the temperature.
          for (let i = 0; i < 4; i++) {
            g.fillStyle(AMBER_LIT, 0.8);
            g.fillTriangle(
              b.x - 18 + i * 12, b.y - 12 + gait,
              b.x - 10 + i * 12, b.y - 12 + gait,
              b.x - 14 + i * 12, b.y - 28 + gait,
            );
          }
        }
        // Legs, out of step with each other by design.
        g.lineStyle(4, AMBER_DARK, 0.9);
        for (let i = 0; i < 4; i++) {
          const ph = Math.sin(time / 80 + i * 1.6) * 8;
          g.lineBetween(b.x - 16 + i * 11, b.y + 10, b.x - 16 + i * 11 + ph, b.y + 26);
        }
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(b.x + dir * (b.kind === 0 ? 36 : 30), b.y - (b.kind === 0 ? 38 : 10) + gait, 2);
      }
    },
    onPhaseEnd() { beasts = []; },
  };
};

// ── Signature: The Display Case ──────────────────────────────────────
// Four panes come down around you and start closing. There is a door, it is
// always on one side, and it is open until it is not.

const displayCase = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let half = 0;
  let closesAt = 0;
  let doorSide = 0; // 0 = top, 1 = right, 2 = bottom, 3 = left
  let lastHitAt = 0;
  const CLOSE_MS = 2700;
  const START_HALF = 250;
  const END_HALF = 96;
  const DOOR_HALF = 66;
  return {
    durationMs: CLOSE_MS + 500,
    cast(time: number) {
      tk.sfx('ice-wall');
      active = true;
      cx = tk.clampX(tk.player.x, 130);
      cy = tk.clampY(tk.player.y, 190);
      half = START_HALF;
      closesAt = time + CLOSE_MS;
      doorSide = Phaser.Math.Between(0, 3);
      tk.host.showFloatingText(cx, cy - 60, 'PLINTH', '#ffd27a');
      tk.schedule(CLOSE_MS, () => {
        active = false;
        const p = tk.player;
        const inside = Math.abs(p.x - cx) < END_HALF + 10 && Math.abs(p.y - cy) < END_HALF + 10;
        tk.sfx('crystal-shatter');
        tk.boom(cx, cy, END_HALF + 30, AMBER_LIT);
        if (inside && p.active) {
          tk.hitPlayer(40, p.x, p.y);
          tk.slowPlayer(0.45, 1800);
          tk.host.showFloatingText(p.x, p.y - 44, 'CATALOGUED', '#ffd27a');
        }
      });
    },
    update(time: number) {
      if (!active) return;
      half = START_HALF + (END_HALF - START_HALF) * Phaser.Math.Clamp(1 - (closesAt - time) / CLOSE_MS, 0, 1);
      const p = tk.player;
      if (!p.active || time - lastHitAt < 600) return;
      // Brushing a pane costs a little; the door never does.
      const dx = Math.abs(p.x - cx);
      const dy = Math.abs(p.y - cy);
      const onPane = (Math.abs(dx - half) < 16 && dy < half) || (Math.abs(dy - half) < 16 && dx < half);
      if (!onPane) return;
      const throughDoor =
        (doorSide === 0 && p.y < cy && dx < DOOR_HALF)
        || (doorSide === 2 && p.y > cy && dx < DOOR_HALF)
        || (doorSide === 1 && p.x > cx && dy < DOOR_HALF)
        || (doorSide === 3 && p.x < cx && dy < DOOR_HALF);
      if (throughDoor) return;
      lastHitAt = time;
      tk.hitPlayer(10, p.x, p.y);
      tk.slowPlayer(0.65, 500);
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (closesAt - time) / CLOSE_MS, 0, 1);
      g.fillStyle(AMBER, 0.06 + t * 0.1);
      g.fillRect(cx - half, cy - half, half * 2, half * 2);
      g.lineStyle(2, AMBER_LIT, 0.3 + t * 0.3);
      g.strokeRect(cx - half, cy - half, half * 2, half * 2);
      // The plinth label, because it is a museum before it is a trap.
      g.fillStyle(GLASS, 0.2 + t * 0.2);
      g.fillRect(cx - 46, cy + half - 22, 92, 14);
    },
    drawAir(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (closesAt - time) / CLOSE_MS, 0, 1);
      const panes: [number, number, number, number, number][] = [
        [cx - half, cy - half, half * 2, 8, 0],
        [cx + half - 8, cy - half, 8, half * 2, 1],
        [cx - half, cy + half - 8, half * 2, 8, 2],
        [cx - half, cy - half, 8, half * 2, 3],
      ];
      for (const [x, y, w, h, side] of panes) {
        if (side === doorSide) {
          // The door: two panes with a gap between them, lit as a way out.
          if (side === 0 || side === 2) {
            g.fillStyle(GLASS, 0.35 + t * 0.35);
            g.fillRect(x, y, (w - DOOR_HALF * 2) / 2, h);
            g.fillRect(x + w / 2 + DOOR_HALF, y, (w - DOOR_HALF * 2) / 2, h);
          } else {
            g.fillStyle(GLASS, 0.35 + t * 0.35);
            g.fillRect(x, y, w, (h - DOOR_HALF * 2) / 2);
            g.fillRect(x, y + h / 2 + DOOR_HALF, w, (h - DOOR_HALF * 2) / 2);
          }
          continue;
        }
        g.fillStyle(GLASS, 0.35 + t * 0.35);
        g.fillRect(x, y, w, h);
        g.fillStyle(0xffffff, 0.12 + Math.sin(time / 200 + x) * 0.05);
        g.fillRect(x, y, w, h);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

export const AMBER_BOSS: WorldBossDef = {
  worldId: 'amber',
  name: 'The Curator',
  title: 'Sovereign of Amber, Keeper of the Still Gallery',
  color: AMBER,
  colorLit: AMBER_LIT,
  colorDark: AMBER_DARK,
  accent: GLASS,
  bodyR: 29,

  intro: ['Your pose is wrong. Hold still while I correct it. Forever.'],
  banter: [
    'Everything I love, I keep. Everything I keep stops. I have made peace with the sequence.',
    'The Voice moved through my gallery and I could not preserve it. It was the only visitor I ever failed.',
    'You are the first thing in an age to be worth mounting.',
    'Do not fidget. The light is finally correct.',
  ],
  defeatLine: 'THE COLLECTION DISPERSES',

  phases: [
    {
      name: 'The Still Gallery',
      line: 'Walk if you must. The gallery does not mind a slow visitor.',
      hp: 430,
      cycle: [
        'sig:setting', 'volley', 'sig:case', 'hazard',
        'sig:collection', 'homing', 'lanes', 'radial',
      ],
      harass: ['h-rune', 'h-orbs', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 40,
      holdDist: 300,
    },
    {
      name: 'Acquisition',
      line: 'I have decided where you go. It is a very good spot. The light is perfect there.',
      hp: 490,
      cycle: [
        'sig:case', 'sig:setting', 'sig:collection', 'barrage',
        'spiral', 'minefield', 'homing', 'lanes', 'quake',
      ],
      harass: ['h-rune', 'h-orbs', 'h-mines', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 50,
      holdDist: 275,
    },
  ],

  hard: {
    introLine: 'THE GALLERY IS EXPANDING ITS HOLDINGS',
    extraPhase: {
      name: 'The Permanent Exhibit',
      line: 'Seventeen worlds of loss and not one good specimen. Until now. HOLD STILL.',
      hp: 400,
      cycle: [
        'sig:case', 'sig:collection', 'sig:setting', 'sanctuary',
        'sig:case', 'spiral', 'barrage', 'minefield',
      ],
      harass: ['h-rune', 'h-mines', 'h-orbs', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 60,
      holdDist: 250,
    },
  },

  signatures: {
    setting: theSetting,
    collection,
    case: displayCase,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x140b04, 0.55);
    g.fillRect(0, 0, W, H);
    // A gallery: plinths down the walls, each with something mid-gesture in it,
    // and a floor polished enough to hold the light.
    for (const side of [0, 1]) {
      const x = side === 0 ? 44 : W - 44;
      for (let i = 0; i < 4; i++) {
        const y = 150 + i * 118;
        g.fillStyle(AMBER_DARK, 0.9);
        g.fillRect(x - 20, y + 40, 40, 34);
        g.fillStyle(AMBER, 0.22);
        g.fillRoundedRect(x - 17, y - 34, 34, 76, 12);
        g.fillStyle(AMBER_DARK, 0.35);
        g.fillEllipse(x, y + 2, 14, 30);
        g.fillStyle(GLASS, 0.1);
        g.fillRect(x - 14, y - 30, 5, 68);
      }
    }
    g.fillStyle(GLASS, 0.03);
    for (let i = 0; i < 6; i++) g.fillRect(0, 140 + i * 90, W, 3);
    // Warm pools of exhibit lighting.
    for (let i = 0; i < 5; i++) {
      g.fillStyle(AMBER_LIT, 0.04);
      g.fillEllipse(120 + i * ((W - 240) / 4), H * 0.55, 130, 90);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 46, 92, 17);

    const dirX = Math.cos(s.facing);
    // Everything about it moves slightly late, as if through resin.
    const lag = Math.sin(t / 1100) * 3;

    // The body: a standing block of amber with a curator suspended inside it.
    g.fillStyle(AMBER_DARK, 0.9);
    g.fillRoundedRect(s.x - 30, s.y - 34, 60, 80, 14);
    g.fillStyle(AMBER, 0.85);
    g.fillRoundedRect(s.x - 26, s.y - 30, 52, 72, 12);
    g.fillStyle(AMBER_LIT, 0.28);
    g.fillRoundedRect(s.x - 20, s.y - 26, 18, 62, 9);
    // Flaws and old bubbles in the block.
    for (let i = 0; i < 6; i++) {
      g.fillStyle(GLASS, 0.14);
      g.fillCircle(s.x - 18 + ((i * 13) % 38), s.y - 20 + ((i * 21) % 58), 2 + (i % 3));
    }
    // The figure inside: a suit, gloves, and a great deal of patience.
    g.fillStyle(0x5a3a12, 0.85);
    g.fillRoundedRect(s.x - 14 + lag * 0.3, s.y - 16, 28, 48, 8);
    g.fillStyle(AMBER_DARK, 0.6);
    g.fillRect(s.x - 2 + lag * 0.3, s.y - 16, 4, 44);

    // Hands: white cotton gloves, one holding tweezers big enough to be a tool
    // of state, one perpetually adjusting something that is already correct.
    g.fillStyle(GLASS, 0.95);
    const hx = s.x + dirX * 34;
    const hy = s.y + 2 - s.castGlow * 10 + lag;
    g.fillCircle(hx, hy, 7);
    g.lineStyle(2.5, 0xb8b2a0, 1);
    g.lineBetween(hx, hy, hx + dirX * 20, hy - 12);
    g.lineBetween(hx, hy, hx + dirX * 21, hy - 4);
    g.fillStyle(GLASS, 0.95);
    g.fillCircle(s.x - dirX * 34, s.y + 16 - lag, 7);

    // Head: a lens-goggled thing, the eyes magnified out of proportion.
    const hy0 = s.y - 48 + lag * 0.5;
    g.fillStyle(0xc9a05a, 0.95);
    g.fillEllipse(s.x, hy0, 30, 30);
    g.fillStyle(AMBER_DARK, 0.9);
    g.fillRect(s.x - 16, hy0 - 20, 32, 9);
    // The loupes.
    for (const side of [-1, 1]) {
      const ex = s.x + side * 9 + dirX * 3;
      g.fillStyle(0x3a2a12, 1);
      g.fillCircle(ex, hy0 - 1, 9);
      g.fillStyle(GLASS, 0.55);
      g.fillCircle(ex, hy0 - 1, 7.5);
      g.fillStyle(s.hurt ? 0xffffff : AMBER_DARK, 0.95);
      g.fillCircle(ex + dirX * 1.5, hy0 - 1, 3.4 + s.castGlow);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(ex - 2.5, hy0 - 4, 2);
    }
    g.lineStyle(2, AMBER_DARK, 0.8);
    g.lineBetween(s.x - 4, hy0 - 1, s.x + 4, hy0 - 1);
    // A very thin, very approving mouth.
    g.lineStyle(2, AMBER_DARK, 0.7);
    g.lineBetween(s.x - 6, hy0 + 13, s.x + 6, hy0 + 13);

    if (s.enraged) {
      // It has stopped pretending it will ask permission.
      for (let i = 0; i < 4; i++) {
        const a = t / 1200 + (i * Math.PI) / 2;
        g.fillStyle(AMBER_LIT, 0.22);
        g.fillCircle(s.x + Math.cos(a) * 58, s.y + Math.sin(a) * 34, 5);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 56);
    }
  },
};
