import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Halflife Court — Sovereign of Radiation, exiled for giving too
 * generously. Canon with the radiation challenge, 'The Halflife Court' ("My
 * kingdom decays at a fixed rate. Guests decay faster.").
 *
 * The only Sovereign that keeps a running total on you: dose accumulates in
 * the fallout and burns off in clean air, and the bar above your head is the
 * whole fight. Everything else — the halving field, the railgun — is a reason
 * to be somewhere specific while that bar comes down.
 */

const RAD = 0x7cff3d;
const RAD_LIT = 0xd8ffb0;
const RAD_DARK = 0x0e2208;
const HAZARD = 0xffe14a;

// ── Signature: The Fallout ───────────────────────────────────────────
// Motes drift in, settle, and hum. Standing near them adds dose; dose is the
// real damage, and the only cure is clean floor.

const fallout = (tk: BossToolkit): SignatureMove => {
  interface Mote { x: number; y: number; vx: number; vy: number; dieAt: number }
  let motes: Mote[] = [];
  let dose = 0;
  let lastTick = 0;
  return {
    durationMs: 2200,
    cast(time: number) {
      tk.sfx('sizzle');
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 60;
        motes.push({
          x: tk.clampX(tk.bossX + Math.cos(a) * 60, 40),
          y: tk.clampY(tk.bossY + Math.sin(a) * 60, 110),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          dieAt: time + 9000,
        });
      }
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.x < 30 || m.x > tk.W - 30) m.vx = -m.vx;
        if (m.y < 110 || m.y > tk.H - 30) m.vy = -m.vy;
      }
      motes = motes.filter((m) => time < m.dieAt);
      if (time - lastTick < 400) return;
      lastTick = time;
      if (!p.active) return;
      // Dose is proximity, summed. Two motes at arm's length is a bad idea;
      // one across the room is nothing.
      let near = 0;
      for (const m of motes) {
        if (Phaser.Math.Distance.Between(m.x, m.y, p.x, p.y) < 100) near++;
      }
      dose = Phaser.Math.Clamp(dose + near * 5 - (near === 0 ? 9 : 0), 0, 100);
      if (near > 0) tk.hitPlayer(2 + near, p.x, p.y);
      if (dose >= 100) {
        dose = 0;
        tk.sfx('explosion-medium');
        tk.host.showFloatingText(p.x, p.y - 46, 'ACUTE DOSE', '#7cff3d');
        tk.explode(p.x, p.y, 110, 34, RAD);
        tk.slowPlayer(0.55, 1400);
      }
    },
    drawGround(g, time) {
      for (const m of motes) {
        const hum = 0.25 + Math.sin(time / 160 + m.x) * 0.12;
        g.fillStyle(RAD, hum * 0.4);
        g.fillCircle(m.x, m.y, 100);
        g.fillStyle(RAD_LIT, hum);
        g.fillCircle(m.x, m.y, 6);
        g.lineStyle(1.5, RAD, hum * 1.6);
        g.strokeCircle(m.x, m.y, 12 + Math.sin(time / 200 + m.y) * 3);
      }
    },
    drawAir(g) {
      if (dose <= 0) return;
      // The dose meter, over the player, because it is the whole fight.
      const p = tk.player;
      const w = 54;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(p.x - w / 2 - 1, p.y - 44, w + 2, 7);
      g.fillStyle(dose > 70 ? HAZARD : RAD, 0.95);
      g.fillRect(p.x - w / 2, p.y - 43, (w * dose) / 100, 5);
      g.lineStyle(1, RAD_LIT, 0.7);
      g.strokeRect(p.x - w / 2 - 1, p.y - 44, w + 2, 7);
    },
    onPhaseEnd() { motes = []; dose = 0; },
  };
};

// ── Signature: The Halving ───────────────────────────────────────────
// A field that halves. Every step, the outer half of it detonates and the rest
// closes in — so the safe ground is always inward, and always shrinking.

const halving = (tk: BossToolkit): SignatureMove => {
  let cx = 0;
  let cy = 0;
  let r = 0;
  let nextAt = 0;
  let steps = 0;
  const STEP_MS = 1100;
  return {
    durationMs: STEP_MS * 4 + 400,
    cast(time: number) {
      tk.sfx('status-poison');
      cx = tk.clampX(tk.player.x, 200);
      cy = tk.clampY(tk.player.y, 240);
      r = 340;
      steps = 0;
      nextAt = time + STEP_MS;
      tk.host.showFloatingText(cx, cy - 70, 'HALF-LIFE', '#d8ffb0');
      for (let k = 0; k < 4; k++) {
        tk.schedule(STEP_MS * (k + 1), () => {
          steps = k + 1;
          nextAt = tk.now + STEP_MS;
          const outer = r;
          r = Math.max(60, r / 2);
          tk.sfx('zap');
          const p = tk.player;
          const d = Phaser.Math.Distance.Between(cx, cy, p.x, p.y);
          // The annulus between the old edge and the new one is what fires.
          if (p.active && d <= outer && d > r) {
            tk.hitPlayer(28, p.x, p.y);
            tk.slowPlayer(0.6, 900);
          }
          tk.boom(cx, cy, outer, RAD);
        });
      }
    },
    drawGround(g, time) {
      if (steps > 4) return;
      const t = Phaser.Math.Clamp(1 - (nextAt - time) / STEP_MS, 0, 1);
      // The doomed annulus, filling in as its moment approaches.
      g.fillStyle(RAD, 0.06 + t * 0.2);
      g.fillCircle(cx, cy, r);
      g.fillStyle(RAD_DARK, 0.35);
      g.fillCircle(cx, cy, Math.max(60, r / 2));
      g.lineStyle(3, RAD_LIT, 0.4 + t * 0.5);
      g.strokeCircle(cx, cy, r);
      g.lineStyle(2, HAZARD, 0.5 + t * 0.4);
      g.strokeCircle(cx, cy, Math.max(60, r / 2));
      // The trefoil, because there is a standard for this sort of thing.
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 * i) / 3 + time / 2400;
        g.fillStyle(HAZARD, 0.12 + t * 0.1);
        g.beginPath();
        g.arc(cx, cy, r * 0.42, a - 0.5, a + 0.5, false);
        g.lineTo(cx, cy);
        g.closePath();
        g.fillPath();
      }
    },
    onPhaseEnd() { steps = 5; },
  };
};

// ── Signature: The Railgun ───────────────────────────────────────────
// It charges for a second and a half down a line it has already drawn, and
// then that line is not there any more. Three shots. Read, step, repeat.

const railgun = (tk: BossToolkit): SignatureMove => {
  let ang = 0;
  let chargeUntil = 0;
  let shots = 0;
  return {
    durationMs: 4200,
    cast(time: number) {
      for (let k = 0; k < 3; k++) {
        tk.schedule(k * 1400, () => {
          tk.sfx('beam-charge');
          ang = tk.angleToPlayer();
          chargeUntil = tk.now + 1050;
          shots = k + 1;
          tk.schedule(1050, () => {
            tk.sfx('beam-fire');
            tk.scene.cameras.main.shake(180, 0.005);
            tk.spawnLane({
              x: tk.bossX, y: tk.bossY, angle: ang,
              halfW: 22, warnMs: 0, fireMs: 260, damage: 38,
            });
            // Fallout kicked up along the shot line.
            for (let i = 1; i < 5; i++) {
              tk.spawnZone({
                x: tk.bossX + Math.cos(ang) * i * 130,
                y: tk.bossY + Math.sin(ang) * i * 130,
                radius: 46, warnMs: 700, damage: 10, poolMs: 2600, poolDamage: 5,
              });
            }
          });
        });
      }
      void time;
    },
    drawAir(g, time) {
      if (time > chargeUntil || shots === 0) return;
      const t = Phaser.Math.Clamp(1 - (chargeUntil - time) / 1050, 0, 1);
      const len = Math.hypot(tk.W, tk.H);
      const ex = tk.bossX + Math.cos(ang) * len;
      const ey = tk.bossY + Math.sin(ang) * len;
      g.lineStyle(4 + t * 26, RAD, 0.06 + t * 0.2);
      g.lineBetween(tk.bossX, tk.bossY, ex, ey);
      g.lineStyle(2, RAD_LIT, 0.4 + t * 0.55);
      g.lineBetween(tk.bossX, tk.bossY, ex, ey);
      // Rails: two lines converging on the barrel as it charges.
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const gap = (1 - t) * 26 + 6;
      g.lineStyle(2, HAZARD, 0.5 + t * 0.4);
      g.lineBetween(tk.bossX + nx * gap, tk.bossY + ny * gap, ex + nx * gap * 0.2, ey + ny * gap * 0.2);
      g.lineBetween(tk.bossX - nx * gap, tk.bossY - ny * gap, ex - nx * gap * 0.2, ey - ny * gap * 0.2);
      g.fillStyle(RAD_LIT, 0.4 + t * 0.6);
      g.fillCircle(tk.bossX + Math.cos(ang) * 34, tk.bossY + Math.sin(ang) * 34, 5 + t * 9);
    },
    onPhaseEnd() { shots = 0; chargeUntil = 0; },
  };
};

export const RADIATION_BOSS: WorldBossDef = {
  worldId: 'radiation',
  name: 'The Halflife Court',
  title: 'Sovereign of Radiation, Which Gave Until There Was Nothing Left',
  color: RAD,
  colorLit: RAD_LIT,
  colorDark: RAD_DARK,
  accent: HAZARD,

  intro: ['My kingdom decays at a fixed rate. Guests decay faster. Do stay — I am so rarely visited twice.'],
  banter: [
    'They exiled me for generosity. I gave and gave and it turned out I was giving THAT.',
    'You are carrying some of me now. You will carry it home.',
    'The Voice arrived, took a great swallow of my court, and has been glowing ever since.',
    'Nothing personal. I am simply what is left of something that was once enormous.',
  ],
  defeatLine: 'BELOW THRESHOLD',

  phases: [
    {
      name: 'The Exclusion Zone',
      line: 'Mind the drift. Clean floor is the only medicine in this realm.',
      hp: 440,
      cycle: [
        'sig:fallout', 'volley', 'sig:railgun', 'hazard',
        'sig:halving', 'lanes', 'homing', 'radial',
      ],
      harass: ['h-rune', 'h-snipe', 'h-flak'],
      restMs: 1040,
      harassMs: 3100,
    },
    {
      name: 'Criticality',
      line: 'The court convenes. It is a very small court now, and everyone is me.',
      hp: 500,
      cycle: [
        'sig:halving', 'sig:fallout', 'barrage', 'sig:railgun',
        'spiral', 'summon', 'sig:fallout', 'quake', 'lanes',
      ],
      harass: ['h-rune', 'h-snipe', 'h-mines', 'h-flak'],
      restMs: 890,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'THE COURT HAS ENTERED ITS SHORTEST HALF-LIFE',
    extraPhase: {
      name: 'Meltdown',
      line: 'I have spent an age decaying politely. Let us do the rest of it at once.',
      hp: 410,
      cycle: [
        'sig:halving', 'sig:railgun', 'sig:fallout', 'sanctuary',
        'sig:halving', 'spiral', 'barrage', 'summon',
      ],
      harass: ['h-mines', 'h-rune', 'h-snipe', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
    },
  },

  signatures: {
    fallout,
    halving,
    railgun,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x060e04, 0.6);
    g.fillRect(0, 0, W, H);
    // An exclusion zone: hazard tape, a trefoil burnt into the floor, fencing
    // that stopped mattering, and drums nobody came back for.
    g.lineStyle(3, HAZARD, 0.1);
    for (let i = 0; i < 3; i++) g.lineBetween(0, 120 + i * 8, W, 120 + i * 8);
    for (let i = 0; i < 3; i++) g.lineBetween(0, H - 40 + i * 8, W, H - 40 + i * 8);
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 * i) / 3 - Math.PI / 2;
      g.fillStyle(RAD, 0.05);
      g.beginPath();
      g.arc(W / 2, H * 0.55, 150, a - 0.5, a + 0.5, false);
      g.lineTo(W / 2, H * 0.55);
      g.closePath();
      g.fillPath();
    }
    g.fillStyle(RAD, 0.06);
    g.fillCircle(W / 2, H * 0.55, 34);
    for (const side of [0, 1]) {
      const x = side === 0 ? 30 : W - 30;
      for (let i = 0; i < 9; i++) {
        g.lineStyle(2, 0x4a5a3a, 0.35);
        g.lineBetween(x, 120 + i * 40, x + (side === 0 ? 16 : -16), 140 + i * 40);
      }
      for (let i = 0; i < 3; i++) {
        g.fillStyle(0x3a4a2a, 0.7);
        g.fillRoundedRect(x - 14, 190 + i * 150, 28, 40, 5);
        g.fillStyle(HAZARD, 0.2);
        g.fillRect(x - 14, 202 + i * 150, 28, 5);
      }
    }
    // The glow that never quite leaves the floor.
    for (let i = 0; i < 8; i++) {
      g.fillStyle(RAD, 0.03);
      g.fillCircle(100 + ((i * 211) % (W - 200)), 180 + ((i * 137) % (H - 260)), 60);
    }
  },

  look: { crest: 'halo', pattern: 'rings', aura: 'sparks', hands: 'orb', torsoR: 35, eyes: 3, mouth: 'grate' },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'wards', tint: 'sick' },
    { movement: 'anchor', gimmick: 'shrink', tint: 'sick', look: { crest: 'blades', pattern: 'static' } },
  ],
};
