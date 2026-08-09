import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * Sepsis — Sovereign of Marrow, which defended the realm so thoroughly that it
 * defended the realm to death. Canon with the marrow challenge, 'Sepsis' ("You
 * are a foreign body. Hold still. This will be thorough.").
 *
 * Every move here is an immune response that has stopped asking whether it is
 * needed: an abscess that swells before it bursts, a wave of white cells sent
 * to a place you were, and a quarantine membrane closing in with one gap left
 * in it. The pattern the world teaches is that the *swelling* is the warning
 * and the burst is the wound — the same beat as the element's own mast cells.
 */

const MARROW = 0xd1435c;
const MARROW_LIT = 0xf5788c;
const MARROW_DARK = 0x2a1219;
const BONE = 0xf1e7d0;

// ── Signature: The Response ──────────────────────────────────────────
// Abscesses swell under the floor. While one is filling it merely holds you —
// a hot, sticky patch that costs speed. When it bursts, it costs blood.

const theResponse = (tk: BossToolkit): SignatureMove => {
  interface Boil { x: number; y: number; r: number; burstsAt: number; burst: boolean; lastTick: number }
  let boils: Boil[] = [];
  return {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('bubble');
      for (let i = 0; i < 4; i++) {
        tk.schedule(i * 260, () => {
          const p = tk.player;
          const a = Math.random() * Math.PI * 2;
          const x = tk.clampX(p.x + Math.cos(a) * Phaser.Math.Between(40, 190), 60);
          const y = tk.clampY(p.y + Math.sin(a) * Phaser.Math.Between(40, 170), 120);
          boils.push({ x, y, r: 74, burstsAt: tk.now + 2600, burst: false, lastTick: 0 });
        });
      }
      void time;
    },
    update(time: number) {
      const p = tk.player;
      for (const q of boils) {
        const inside = p.active && Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) < q.r;
        if (!q.burst && time >= q.burstsAt) {
          q.burst = true;
          tk.sfx('explosion-small');
          if (inside) {
            tk.hitPlayer(30, p.x, p.y);
            tk.slowPlayer(0.42, 1600);
            tk.host.showFloatingText(p.x, p.y - 40, 'LANCED', '#f5788c');
          }
          tk.boom(q.x, q.y, q.r, MARROW_LIT);
        } else if (!q.burst && inside && time - q.lastTick > 500) {
          // Wading through something hot and half-set: it costs speed long
          // before it costs health.
          q.lastTick = time;
          tk.slowPlayer(0.6, 620);
          tk.hitPlayer(4, p.x, p.y);
        }
      }
      boils = boils.filter((q) => time < q.burstsAt + 900);
    },
    drawGround(g, time) {
      for (const q of boils) {
        const t = Phaser.Math.Clamp(1 - (q.burstsAt - time) / 2600, 0, 1);
        if (q.burst) {
          // Lanced: a raw crater with a bone-white rim of dead cells.
          g.fillStyle(MARROW_DARK, 0.55);
          g.fillCircle(q.x, q.y, q.r);
          g.lineStyle(3, BONE, 0.45);
          g.strokeCircle(q.x, q.y, q.r);
          continue;
        }
        // Filling: the skin tightens and the colour climbs toward the burst.
        g.fillStyle(MARROW_DARK, 0.3 + t * 0.22);
        g.fillCircle(q.x, q.y, q.r);
        g.fillStyle(MARROW, 0.18 + t * 0.36);
        g.fillCircle(q.x, q.y, q.r * (0.5 + t * 0.5));
        g.lineStyle(1 + t * 4, MARROW_LIT, 0.3 + t * 0.55);
        g.strokeCircle(q.x, q.y, q.r);
        // Pressure heads pushing up under the surface, faster as it fills.
        for (let i = 0; i < 4; i++) {
          const a = time / (620 - t * 260) + i * 1.6;
          const d = q.r * (0.24 + 0.3 * Math.abs(Math.sin(a * 0.7)));
          g.fillStyle(BONE, 0.16 + t * 0.3);
          g.fillCircle(q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, 4 + t * 4);
        }
      }
    },
    onPhaseEnd() { boils = []; },
  };
};

// ── Signature: The Swarm ─────────────────────────────────────────────
// Cells are dispatched down lit lanes toward where you were when the order
// went out. They do not re-aim. Nothing in an immune response re-aims.

const theSwarm = (tk: BossToolkit): SignatureMove => {
  interface Cell { x: number; y: number; vx: number; kind: number; lastHitAt: number; seed: number }
  let cells: Cell[] = [];
  return {
    durationMs: 3300,
    cast(time: number) {
      tk.sfx('slime-splat');
      const lanes = 3;
      for (let i = 0; i < lanes; i++) {
        const fromLeft = Math.random() < 0.5;
        const y = tk.clampY(tk.player.y + (i - 1) * 110 + Phaser.Math.Between(-30, 30), 150);
        // The lane lights a beat before anything is sent down it.
        tk.spawnLane({
          x: tk.W / 2, y, angle: 0, halfW: 40, warnMs: 1000, fireMs: 120, damage: 12,
        });
        tk.schedule(1000 + i * 220, () => {
          tk.sfx('whoosh');
          cells.push({
            x: fromLeft ? -50 : tk.W + 50, y,
            vx: fromLeft ? 330 : -330, kind: i % 3, lastHitAt: 0, seed: Math.random() * 99,
          });
        });
      }
      void time;
    },
    update(time: number, dt: number) {
      const p = tk.player;
      for (const c of cells) {
        c.x += c.vx * dt;
        if (p.active && time - c.lastHitAt > 600
          && Math.abs(p.x - c.x) < 42 && Math.abs(p.y - c.y) < 34) {
          c.lastHitAt = time;
          tk.hitPlayer(24, p.x, p.y);
        }
      }
      cells = cells.filter((c) => c.x > -110 && c.x < tk.W + 110);
    },
    drawAir(g, time) {
      for (const c of cells) {
        const dir = Math.sign(c.vx);
        const squirm = Math.sin(time / 90 + c.x / 30) * 3;
        // A cell crossing a body leaves a serum trail behind it.
        for (let i = 1; i <= 3; i++) {
          g.fillStyle(MARROW, 0.14 / i);
          g.fillEllipse(c.x - dir * i * 22, c.y + squirm * 0.5, 44, 30);
        }
        // The membrane: a lumpy blob, never a clean circle.
        g.fillStyle(MARROW_DARK, 0.95);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + time / 700;
          const rr = 22 + Math.sin(a * 3 + c.seed) * 5;
          g.fillCircle(c.x + Math.cos(a) * rr * 0.5, c.y + squirm * 0.4 + Math.sin(a) * rr * 0.4, 13);
        }
        g.fillStyle(MARROW, 0.9);
        g.fillEllipse(c.x, c.y + squirm * 0.4, 40, 27);

        if (c.kind === 0) {
          // A macrophage: pseudopods out front and a kidney nucleus.
          g.fillStyle(MARROW, 0.9);
          for (const s of [-1, 0, 1]) {
            g.fillEllipse(c.x + dir * 26, c.y + s * 12 + squirm, 18, 9);
          }
          g.fillStyle(MARROW_DARK, 0.9);
          g.fillEllipse(c.x - dir * 4, c.y + squirm, 19, 15);
          g.fillStyle(MARROW, 0.85);
          g.fillEllipse(c.x + dir * 2, c.y + 4 + squirm, 9, 7);
        } else if (c.kind === 1) {
          // A neutrophil: granules, and a nucleus in three lobes.
          for (let i = 0; i < 9; i++) {
            const a = i * 2.1 + c.seed;
            g.fillStyle(BONE, 0.55);
            g.fillCircle(c.x + Math.cos(a) * 13, c.y + Math.sin(a) * 9 + squirm, 2.6);
          }
          for (let i = 0; i < 3; i++) {
            const a = time / 900 + (i / 3) * Math.PI * 2;
            g.fillStyle(MARROW_DARK, 0.95);
            g.fillCircle(c.x + Math.cos(a) * 8, c.y + Math.sin(a) * 6 + squirm, 6);
          }
        } else {
          // A mast cell: packed edge to edge, and already glowing.
          for (let i = 0; i < 14; i++) {
            const a = i * 1.7 + c.seed;
            const d = 4 + (i % 4) * 4;
            g.fillStyle(i % 3 === 0 ? 0xff3b3b : MARROW_LIT, 0.85);
            g.fillCircle(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.7 + squirm, 3.2);
          }
        }
        // Two cilia trailing behind, out of step by design.
        g.lineStyle(3, MARROW_DARK, 0.8);
        for (let i = 0; i < 2; i++) {
          const ph = Math.sin(time / 80 + i * 2.2) * 9;
          g.lineBetween(c.x - dir * 20, c.y - 6 + i * 12, c.x - dir * 34, c.y - 6 + i * 12 + ph);
        }
      }
    },
    onPhaseEnd() { cells = []; },
  };
};

// ── Signature: Quarantine ────────────────────────────────────────────
// A membrane of spiked protein comes down around you and starts closing.
// There is always a gap, it is always on one side, and it is open until it
// is not.

const quarantine = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let half = 0;
  let closesAt = 0;
  let gapSide = 0; // 0 = top, 1 = right, 2 = bottom, 3 = left
  let lastHitAt = 0;
  const CLOSE_MS = 2700;
  const START_HALF = 250;
  const END_HALF = 96;
  const GAP_HALF = 66;
  return {
    durationMs: CLOSE_MS + 500,
    cast(time: number) {
      tk.sfx('trap-set');
      active = true;
      cx = tk.clampX(tk.player.x, 130);
      cy = tk.clampY(tk.player.y, 190);
      half = START_HALF;
      closesAt = time + CLOSE_MS;
      gapSide = Phaser.Math.Between(0, 3);
      tk.host.showFloatingText(cx, cy - 60, 'QUARANTINE', '#f5788c');
      tk.schedule(CLOSE_MS, () => {
        active = false;
        const p = tk.player;
        const inside = Math.abs(p.x - cx) < END_HALF + 10 && Math.abs(p.y - cy) < END_HALF + 10;
        tk.sfx('explosion-small');
        tk.boom(cx, cy, END_HALF + 30, MARROW_LIT);
        if (inside && p.active) {
          tk.hitPlayer(40, p.x, p.y);
          tk.slowPlayer(0.45, 1800);
          tk.host.showFloatingText(p.x, p.y - 44, 'CONTAINED', '#f5788c');
        }
      });
    },
    update(time: number) {
      if (!active) return;
      half = START_HALF + (END_HALF - START_HALF) * Phaser.Math.Clamp(1 - (closesAt - time) / CLOSE_MS, 0, 1);
      const p = tk.player;
      if (!p.active || time - lastHitAt < 600) return;
      // Brushing the mesh costs a little; the gap never does.
      const dx = Math.abs(p.x - cx);
      const dy = Math.abs(p.y - cy);
      const onMesh = (Math.abs(dx - half) < 16 && dy < half) || (Math.abs(dy - half) < 16 && dx < half);
      if (!onMesh) return;
      const throughGap =
        (gapSide === 0 && p.y < cy && dx < GAP_HALF)
        || (gapSide === 2 && p.y > cy && dx < GAP_HALF)
        || (gapSide === 1 && p.x > cx && dy < GAP_HALF)
        || (gapSide === 3 && p.x < cx && dy < GAP_HALF);
      if (throughGap) return;
      lastHitAt = time;
      tk.hitPlayer(10, p.x, p.y);
      tk.slowPlayer(0.65, 500);
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (closesAt - time) / CLOSE_MS, 0, 1);
      g.fillStyle(MARROW, 0.05 + t * 0.11);
      g.fillRect(cx - half, cy - half, half * 2, half * 2);
      g.lineStyle(2, MARROW_LIT, 0.25 + t * 0.35);
      g.strokeRect(cx - half, cy - half, half * 2, half * 2);
      // Web strung corner to corner inside the cordon, tightening with it.
      g.lineStyle(1, 0xd9e86b, 0.12 + t * 0.22);
      for (let i = 1; i < 5; i++) {
        const k = i / 5;
        g.lineBetween(cx - half + half * 2 * k, cy - half, cx + half, cy - half + half * 2 * k);
        g.lineBetween(cx + half - half * 2 * k, cy + half, cx - half, cy + half - half * 2 * k);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (closesAt - time) / CLOSE_MS, 0, 1);
      const walls: [number, number, number, number, number][] = [
        [cx - half, cy - half, half * 2, 8, 0],
        [cx + half - 8, cy - half, 8, half * 2, 1],
        [cx - half, cy + half - 8, half * 2, 8, 2],
        [cx - half, cy - half, 8, half * 2, 3],
      ];
      /** One wall segment: a band of mesh with barbs along its inner edge. */
      const band = (x: number, y: number, w: number, h: number): void => {
        g.fillStyle(MARROW_DARK, 0.5 + t * 0.3);
        g.fillRect(x, y, w, h);
        g.fillStyle(0xd9e86b, 0.3 + t * 0.4);
        g.fillRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
        const along = w > h;
        const n = Math.max(1, Math.floor((along ? w : h) / 16));
        g.lineStyle(1.4, BONE, 0.35 + t * 0.35);
        for (let i = 0; i < n; i++) {
          const px = along ? x + 8 + i * 16 : x + w / 2;
          const py = along ? y + h / 2 : y + 8 + i * 16;
          const jitter = Math.sin(time / 180 + i) * 3;
          const inX = along ? 0 : (x < cx ? 7 : -7);
          const inY = along ? (y < cy ? 7 : -7) : 0;
          g.lineBetween(px, py, px + inX + (along ? jitter : 0), py + inY + (along ? 0 : jitter));
        }
      };
      for (const [x, y, w, h, side] of walls) {
        if (side !== gapSide) { band(x, y, w, h); continue; }
        // The gap: mesh either side of an opening, lit as a way out.
        if (side === 0 || side === 2) {
          band(x, y, (w - GAP_HALF * 2) / 2, h);
          band(x + w / 2 + GAP_HALF, y, (w - GAP_HALF * 2) / 2, h);
        } else {
          band(x, y, w, (h - GAP_HALF * 2) / 2);
          band(x, y + h / 2 + GAP_HALF, w, (h - GAP_HALF * 2) / 2);
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

export const MARROW_BOSS: WorldBossDef = {
  worldId: 'marrow',
  name: 'Sepsis',
  title: 'Sovereign of Marrow, the Response That Never Ended',
  color: MARROW,
  colorLit: MARROW_LIT,
  colorDark: MARROW_DARK,
  accent: BONE,
  bodyR: 29,

  intro: ['You are a foreign body. Hold still. This will be thorough.'],
  banter: [
    'I was made to answer what did not belong. Then I stopped being able to tell.',
    'The Voice came through the cavity and I raised no fever at all. That is the only thing that has ever got past me.',
    'Swelling is not damage. Swelling is care. Ask anything I have ever cared for.',
    'You are warm. Good. That means it is working.',
  ],
  defeatLine: 'THE RESPONSE SUBSIDES',

  phases: [
    {
      name: 'The Inflamed Cavity',
      line: 'Something came in. Everything in here is already walking toward you.',
      hp: 430,
      cycle: [
        'sig:response', 'volley', 'sig:quarantine', 'hazard',
        'sig:swarm', 'homing', 'lanes', 'radial',
      ],
      harass: ['h-rune', 'h-orbs', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 40,
      holdDist: 300,
    },
    {
      name: 'Acute Response',
      line: 'Escalating. I have never once escalated and been wrong. I have never once checked.',
      hp: 490,
      cycle: [
        'sig:quarantine', 'sig:response', 'sig:swarm', 'barrage',
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
    introLine: 'IT IS IN THE BLOOD NOW',
    extraPhase: {
      name: 'Systemic',
      line: 'Seventeen worlds of infection and not one I could clear. So: all of you. At once. HOLD STILL.',
      hp: 400,
      cycle: [
        'sig:quarantine', 'sig:swarm', 'sig:response', 'sanctuary',
        'sig:quarantine', 'spiral', 'barrage', 'minefield',
      ],
      harass: ['h-rune', 'h-mines', 'h-orbs', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 60,
      holdDist: 250,
    },
  },

  signatures: {
    response: theResponse,
    swarm: theSwarm,
    quarantine,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x120709, 0.55);
    g.fillRect(0, 0, W, H);
    // A cavity: ribs closing in from both walls, and marrow pooling at the
    // bottom of each one.
    for (const side of [0, 1]) {
      const x = side === 0 ? 30 : W - 30;
      const dir = side === 0 ? 1 : -1;
      for (let i = 0; i < 5; i++) {
        const y = 130 + i * 100;
        g.lineStyle(13, MARROW_DARK, 0.85);
        g.beginPath();
        g.moveTo(x, y - 40);
        g.lineTo(x + dir * 46, y + 6);
        g.lineTo(x + dir * 30, y + 62);
        g.strokePath();
        g.lineStyle(7, BONE, 0.22);
        g.beginPath();
        g.moveTo(x, y - 40);
        g.lineTo(x + dir * 46, y + 6);
        g.lineTo(x + dir * 30, y + 62);
        g.strokePath();
        g.fillStyle(MARROW, 0.12);
        g.fillEllipse(x + dir * 26, y + 10, 26, 42);
      }
    }
    // Trabecular bone across the floor: a loose lattice, not a grid.
    g.lineStyle(2, BONE, 0.035);
    for (let i = 0; i < 22; i++) {
      const x0 = (i * 137) % W;
      const y0 = 120 + ((i * 251) % (H - 200));
      g.lineBetween(x0, y0, x0 + 90 - ((i * 37) % 160), y0 + 40 - ((i * 53) % 90));
    }
    // Warm pools where the marrow has come through.
    for (let i = 0; i < 5; i++) {
      g.fillStyle(MARROW_LIT, 0.045);
      g.fillEllipse(120 + i * ((W - 240) / 4), H * 0.55, 130, 90);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 46, 92, 17);

    const dirX = Math.cos(s.facing);
    // A slow, feverish swell — the whole body breathes like something inflamed.
    const swell = Math.sin(t / 620) * 2.6;

    // The body: a ribcage hinged wide open with the cavity burning inside it.
    g.fillStyle(MARROW_DARK, 0.95);
    g.fillEllipse(s.x, s.y + 4, 62 + swell, 84 + swell);
    g.fillStyle(MARROW, 0.55 + s.castGlow * 0.3);
    g.fillEllipse(s.x, s.y + 2, 34 + swell, 56 + swell);
    g.fillStyle(0xff3b3b, 0.35 + s.castGlow * 0.4);
    g.fillEllipse(s.x, s.y, 20 + swell, 36 + swell);
    g.fillStyle(BONE, 0.3 + Math.sin(t / 200) * 0.1);
    g.fillEllipse(s.x - 3, s.y - 8, 9, 15);

    // Ribs: four pairs, hauled outward, brighter where the marrow shows through.
    for (let i = 0; i < 4; i++) {
      const ry = s.y - 26 + i * 18;
      const span = 26 + i * 5;
      const hinge = 0.5 + Math.sin(t / 700 + i) * 0.08;
      for (const sd of [-1, 1]) {
        g.lineStyle(7, MARROW_DARK, 0.95);
        g.beginPath();
        g.moveTo(s.x + sd * 5, ry);
        g.lineTo(s.x + sd * span * 0.72, ry + hinge * 12);
        g.lineTo(s.x + sd * span, ry + hinge * 28);
        g.strokePath();
        g.lineStyle(4, BONE, 0.92);
        g.beginPath();
        g.moveTo(s.x + sd * 5, ry - 1);
        g.lineTo(s.x + sd * span * 0.72, ry + hinge * 12 - 1);
        g.lineTo(s.x + sd * span, ry + hinge * 28 - 1);
        g.strokePath();
      }
    }

    // Hands: the near one is a fistful of cells it is about to let go of; the
    // far one hangs open, trailing serum.
    const hx = s.x + dirX * 42;
    const hy = s.y + 2 - s.castGlow * 12 + swell;
    g.fillStyle(MARROW_DARK, 0.95);
    g.fillCircle(hx, hy, 11);
    for (let i = 0; i < 5; i++) {
      const a = t / 320 + (i / 5) * Math.PI * 2;
      g.fillStyle(i % 2 ? MARROW_LIT : BONE, 0.75 + s.castGlow * 0.25);
      g.fillCircle(hx + Math.cos(a) * (7 + s.castGlow * 6), hy + Math.sin(a) * (7 + s.castGlow * 6), 3.2);
    }
    g.fillStyle(MARROW_DARK, 0.95);
    g.fillCircle(s.x - dirX * 40, s.y + 18 - swell, 9);
    g.fillStyle(BONE, 0.35);
    g.fillCircle(s.x - dirX * 40, s.y + 18 - swell, 5);

    // Head: a skull, fever-lit from inside, with the jaw hanging slightly open.
    const hy0 = s.y - 52 + swell * 0.5;
    g.fillStyle(BONE, 0.95);
    g.fillEllipse(s.x, hy0, 34, 32);
    g.fillStyle(BONE, 0.95);
    g.fillRoundedRect(s.x - 10, hy0 + 12, 20, 13, 4);
    g.fillStyle(MARROW_DARK, 0.75);
    g.fillRect(s.x - 8, hy0 + 17, 16, 3);
    // Sockets, with the fever burning behind them.
    for (const side of [-1, 1]) {
      const ex = s.x + side * 9 + dirX * 3;
      g.fillStyle(MARROW_DARK, 1);
      g.fillEllipse(ex, hy0 - 2, 12, 13);
      g.fillStyle(s.hurt ? 0xffffff : 0xff3b3b, 0.85 + s.castGlow * 0.15);
      g.fillCircle(ex + dirX * 1.5, hy0 - 1, 3.6 + s.castGlow * 1.6);
      g.fillStyle(MARROW_LIT, 0.4);
      g.fillCircle(ex + dirX * 1.5, hy0 - 1, 6 + s.castGlow * 2);
    }
    // Suture lines across the cranium.
    g.lineStyle(1.4, MARROW_DARK, 0.5);
    g.lineBetween(s.x, hy0 - 16, s.x, hy0 - 6);
    g.lineBetween(s.x - 12, hy0 - 10, s.x + 12, hy0 - 9);

    if (s.enraged) {
      // It has stopped waiting to be asked, and the cells are already out.
      for (let i = 0; i < 5; i++) {
        const a = t / 900 + (i * Math.PI * 2) / 5;
        const px = s.x + Math.cos(a) * 62;
        const py = s.y + Math.sin(a) * 38;
        g.fillStyle(MARROW_DARK, 0.6);
        g.fillCircle(px, py, 8);
        g.fillStyle(MARROW_LIT, 0.45);
        g.fillCircle(px, py, 5.5);
      }
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 56);
    }
  },
};
