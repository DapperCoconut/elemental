import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Chronicler — Sovereign of Paper, who kept the minutes of the trial that
 * exiled it and has been quietly improving them ever since. Canon with the
 * paper challenge, 'The Chronicler' ("History is whatever survives the edit.
 * You will not.").
 *
 * The hall is a page and the boss has the pen: it redacts across you in bars,
 * it cuts inward from the margins, and when it writes the next line, standing
 * anywhere but *on* the line is being written out.
 */

const PAGE = 0xf2ead6;
const PAGE_LIT = 0xffffff;
const PAGE_DARK = 0x2a2418;
const INK = 0x1a1a24;

// ── Signature: The Redaction ─────────────────────────────────────────
// Black bars march down the page. Four of them, evenly spaced, and the gaps
// between them are exactly as wide as a person who is paying attention.

const redaction = (tk: BossToolkit): SignatureMove => {
  interface Bar { y: number; vy: number; lastHitAt: number }
  let bars: Bar[] = [];
  let running = false;
  const HALF = 30;
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('whoosh');
      const down = tk.player.y < tk.H / 2;
      bars = [];
      for (let i = 0; i < 4; i++) {
        bars.push({
          y: (down ? 60 : tk.H - 60) + (down ? -1 : 1) * i * 150,
          vy: (down ? 1 : -1) * 210,
          lastHitAt: 0,
        });
      }
      running = false;
      tk.schedule(950, () => { running = true; });
      tk.schedule(3400, () => { running = false; bars = []; });
      void time;
    },
    update(time: number, dt: number) {
      if (!running) return;
      const p = tk.player;
      for (const b of bars) {
        b.y += b.vy * dt;
        if (p.active && Math.abs(p.y - b.y) < HALF && time - b.lastHitAt > 700) {
          b.lastHitAt = time;
          tk.hitPlayer(22, p.x, p.y);
          tk.host.showFloatingText(p.x, p.y - 40, 'STRUCK OUT', '#f2ead6');
        }
      }
    },
    drawAir(g, time) {
      for (const b of bars) {
        const preview = !running;
        // Before it moves, it is drawn as a ruled guide; then it inks in.
        if (preview) {
          g.lineStyle(2, INK, 0.35 + Math.sin(time / 120) * 0.12);
          g.lineBetween(20, b.y - HALF, tk.W - 20, b.y - HALF);
          g.lineBetween(20, b.y + HALF, tk.W - 20, b.y + HALF);
          continue;
        }
        g.fillStyle(INK, 0.92);
        g.fillRect(16, b.y - HALF, tk.W - 32, HALF * 2);
        // Wet ink at the leading edge.
        g.fillStyle(0x3a3a52, 0.6);
        g.fillRect(16, b.y + (b.vy > 0 ? HALF - 6 : -HALF), tk.W - 32, 6);
        for (let i = 0; i < 9; i++) {
          g.fillStyle(INK, 0.5);
          g.fillCircle(40 + i * ((tk.W - 80) / 8), b.y + (b.vy > 0 ? HALF + 4 : -HALF - 4), 3);
        }
      }
    },
    onPhaseEnd() { bars = []; running = false; },
  };
};

// ── Signature: The Margins ───────────────────────────────────────────
// The edges of the page are close-written, and the writing comes off it. Cuts
// arrive from all four borders in a rolling wave, one border at a time.

const theMargins = (tk: BossToolkit): SignatureMove => {
  let warnSide = -1;
  let warnUntil = 0;
  return {
    durationMs: 3600,
    cast(time: number) {
      tk.sfx('slash');
      // Order chosen so it never fires two opposite borders at once.
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      order.forEach((side, i) => {
        tk.schedule(i * 820, () => {
          warnSide = side;
          warnUntil = tk.now + 620;
          tk.schedule(620, () => {
            tk.sfx('slash');
            const n = 7;
            for (let k = 0; k < n; k++) {
              const t2 = (k + 0.5) / n;
              const jitter = (Math.random() - 0.5) * 40;
              let x = 0;
              let y = 0;
              let a = 0;
              if (side === 0) { x = 30 + (tk.W - 60) * t2 + jitter; y = 100; a = Math.PI / 2; }
              if (side === 2) { x = 30 + (tk.W - 60) * t2 + jitter; y = tk.H - 20; a = -Math.PI / 2; }
              if (side === 3) { x = 20; y = 110 + (tk.H - 150) * t2 + jitter; a = 0; }
              if (side === 1) { x = tk.W - 20; y = 110 + (tk.H - 150) * t2 + jitter; a = Math.PI; }
              tk.spawnBullet({ x, y, angle: a, speed: 260, damage: 12, r: 7, color: PAGE });
            }
          });
        });
      });
      void time;
    },
    drawGround(g, time) {
      if (time > warnUntil || warnSide < 0) return;
      const pulse = 0.25 + Math.sin(time / 80) * 0.15;
      g.fillStyle(PAGE, pulse);
      if (warnSide === 0) g.fillRect(0, 96, tk.W, 26);
      if (warnSide === 2) g.fillRect(0, tk.H - 26, tk.W, 26);
      if (warnSide === 3) g.fillRect(0, 96, 26, tk.H - 96);
      if (warnSide === 1) g.fillRect(tk.W - 26, 96, 26, tk.H - 96);
    },
    onPhaseEnd() { warnSide = -1; warnUntil = 0; },
  };
};

// ── Signature: The Revision ──────────────────────────────────────────
// It writes the next line of the record. Whatever is not on the line is not in
// the record, and whatever is not in the record did not happen.

const theRevision = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let y0 = 0;
  let y1 = 0;
  let x0 = 0;
  let x1 = 0;
  let firesAt = 0;
  const HALF = 60;
  return {
    durationMs: 3400,
    cast(time: number) {
      tk.sfx('upload');
      active = true;
      firesAt = time + 2800;
      // A line drawn through the hall, always reachable: it passes within a
      // comfortable walk of wherever the player is standing right now.
      const p = tk.player;
      const a = Math.random() * Math.PI;
      const cx = tk.clampX(p.x + (Math.random() - 0.5) * 150, 120);
      const cy = tk.clampY(p.y + (Math.random() - 0.5) * 130, 170);
      const len = Math.hypot(tk.W, tk.H);
      x0 = cx - Math.cos(a) * len;
      y0 = cy - Math.sin(a) * len;
      x1 = cx + Math.cos(a) * len;
      y1 = cy + Math.sin(a) * len;
      tk.host.showFloatingText(cx, cy - 60, 'STAY ON THE LINE', '#f2ead6');
      tk.schedule(2800, () => {
        active = false;
        tk.sfx('judgement');
        tk.scene.cameras.main.flash(240, 250, 246, 230);
        const pl = tk.player;
        if (!pl.active) return;
        // Distance from the line — the only geometry that matters here.
        const dx = x1 - x0;
        const dy = y1 - y0;
        const t2 = ((pl.x - x0) * dx + (pl.y - y0) * dy) / (dx * dx + dy * dy);
        const px = x0 + dx * t2;
        const py = y0 + dy * t2;
        if (Phaser.Math.Distance.Between(px, py, pl.x, pl.y) > HALF) {
          tk.hitPlayer(48, pl.x, pl.y);
          tk.host.showFloatingText(pl.x, pl.y - 44, 'OMITTED', '#ffffff');
        }
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (firesAt - time) / 2800, 0, 1);
      const nx = -(y1 - y0);
      const ny = x1 - x0;
      const nl = Math.hypot(nx, ny);
      const ux = (nx / nl) * HALF;
      const uy = (ny / nl) * HALF;
      // The safe line, drawn as ruled paper: two rules and a highlight.
      g.fillStyle(PAGE, 0.1 + t * 0.14);
      g.beginPath();
      g.moveTo(x0 + ux, y0 + uy);
      g.lineTo(x1 + ux, y1 + uy);
      g.lineTo(x1 - ux, y1 - uy);
      g.lineTo(x0 - ux, y0 - uy);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, PAGE_LIT, 0.4 + t * 0.5);
      g.lineBetween(x0 + ux, y0 + uy, x1 + ux, y1 + uy);
      g.lineBetween(x0 - ux, y0 - uy, x1 - ux, y1 - uy);
      // The pen, writing its way along.
      const wx = x0 + (x1 - x0) * t;
      const wy = y0 + (y1 - y0) * t;
      g.lineStyle(3, INK, 0.75);
      g.lineBetween(x0, y0, wx, wy);
      g.fillStyle(INK, 0.9);
      g.fillTriangle(wx, wy, wx - uy * 0.14 - ux * 0.1, wy + ux * 0.14 - uy * 0.1,
        wx + uy * 0.14 - ux * 0.1, wy - ux * 0.14 - uy * 0.1);
      // Everything off the line dims as the sentence completes.
      g.fillStyle(INK, t * 0.16);
      g.fillRect(0, 96, tk.W, tk.H - 96);
    },
    onPhaseEnd() { active = false; },
  };
};

export const PAPER_BOSS: WorldBossDef = {
  worldId: 'paper',
  name: 'The Chronicler',
  title: 'Sovereign of Paper, Clerk of the Trial',
  color: PAGE,
  colorLit: PAGE_LIT,
  colorDark: PAGE_DARK,
  accent: INK,
  bodyR: 27,

  intro: ['History is whatever survives the edit. You will not. I have already drafted the paragraph.'],
  banter: [
    'I took the minutes at my own trial. I have been correcting them for an age.',
    'You have made four notable mistakes. I have written down six.',
    'The Voice dictated a chapter to me once. I have never been able to strike it.',
    'Do not worry about being forgotten. Worry about being AMENDED.',
  ],
  defeatLine: 'THE RECORD STANDS',

  phases: [
    {
      name: 'The First Draft',
      line: 'Speak up. Anything you do not say, I will supply.',
      hp: 420,
      cycle: [
        'sig:redact', 'volley', 'sig:margins', 'lanes',
        'sig:revision', 'homing', 'spiral', 'slamchain',
      ],
      harass: ['h-flak', 'h-lane', 'h-snipe'],
      restMs: 1030,
      harassMs: 3050,
      moveSpeed: 58,
      holdDist: 290,
    },
    {
      name: 'The Final Edition',
      line: 'The draft is closed. What remains is what was always true.',
      hp: 480,
      cycle: [
        'sig:revision', 'sig:redact', 'barrage', 'sig:margins',
        'stream', 'spiral', 'homing', 'lanes', 'quake',
      ],
      harass: ['h-flak', 'h-lane', 'h-rune', 'h-snipe'],
      restMs: 880,
      harassMs: 2550,
      moveSpeed: 70,
      holdDist: 265,
    },
  ],

  hard: {
    introLine: 'THE CHRONICLER HAS OPENED A SECOND VOLUME',
    extraPhase: {
      name: 'The Errata',
      line: 'A correction, appended. It concerns you, and it is very short.',
      hp: 390,
      cycle: [
        'sig:revision', 'sig:margins', 'sig:redact', 'sanctuary',
        'sig:revision', 'stream', 'spiral', 'barrage',
      ],
      harass: ['h-flak', 'h-lane', 'h-rune', 'h-orbs'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 80,
      holdDist: 245,
    },
  },

  signatures: {
    redact: redaction,
    margins: theMargins,
    revision: theRevision,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x151208, 0.5);
    g.fillRect(0, 0, W, H);
    // The hall is a page: ruled lines, a red margin rule, and a filing wall.
    g.fillStyle(PAGE, 0.06);
    g.fillRect(40, 110, W - 80, H - 150);
    for (let i = 0; i < 12; i++) {
      g.lineStyle(1, PAGE, 0.07);
      g.lineBetween(56, 140 + i * 44, W - 56, 140 + i * 44);
    }
    g.lineStyle(2, 0xc4392c, 0.12);
    g.lineBetween(96, 110, 96, H - 40);
    // Filing: stacks and stacks of everything anyone ever said.
    for (const side of [0, 1]) {
      const x = side === 0 ? 18 : W - 18;
      for (let i = 0; i < 14; i++) {
        g.fillStyle(i % 3 === 0 ? PAGE_DARK : 0x4a4230, 0.75);
        g.fillRect(x - 14, 110 + i * 34, 28, 28);
        g.fillStyle(PAGE, 0.1);
        g.fillRect(x - 10, 116 + i * 34, 20, 3);
      }
    }
    // Loose sheets, mid-fall, permanently.
    for (let i = 0; i < 9; i++) {
      g.fillStyle(PAGE, 0.05);
      g.fillRect(120 + ((i * 173) % (W - 240)), 160 + ((i * 97) % (H - 260)), 22, 28);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(s.x, s.y + 44, 80, 14);

    const dirX = Math.cos(s.facing);
    const flutter = Math.sin(t / 260) * 3;

    // The body: a standing sheaf, each leaf turning slightly out of phase.
    for (let i = 4; i >= 0; i--) {
      const off = (i - 2) * 7;
      const lean = Math.sin(t / 400 + i) * 4;
      g.fillStyle(i === 2 ? PAGE : 0xd8d0ba, 0.92 - i * 0.06);
      g.fillRoundedRect(s.x - 24 + off + lean, s.y - 30 + Math.abs(off) * 0.4, 48, 74, 5);
      g.lineStyle(1, PAGE_DARK, 0.25);
      g.strokeRoundedRect(s.x - 24 + off + lean, s.y - 30 + Math.abs(off) * 0.4, 48, 74, 5);
    }
    // Ruled text down the front leaf, and one line struck through.
    for (let i = 0; i < 7; i++) {
      g.lineStyle(1.5, INK, i === 3 ? 0.8 : 0.35);
      const w = 30 - ((i * 7) % 12);
      g.lineBetween(s.x - 16, s.y - 20 + i * 10, s.x - 16 + w, s.y - 20 + i * 10);
    }
    g.lineStyle(2, 0xc4392c, 0.7);
    g.lineBetween(s.x - 18, s.y + 10, s.x + 14, s.y + 10);

    // Hands: a nib pen that never leaves the page, and a stack of amendments.
    const px = s.x + dirX * 34;
    const py = s.y + 6 - s.castGlow * 12;
    g.fillStyle(0xd8d0ba, 0.95);
    g.fillCircle(px, py, 6);
    g.fillStyle(INK, 0.95);
    g.fillTriangle(px + dirX * 4, py, px + dirX * 10, py - 4, px + dirX * 26, py + 20);
    g.fillStyle(PAGE_LIT, 0.6);
    g.fillCircle(px + dirX * 24, py + 18, 1.6);
    // Ink drips from the nib, always.
    for (let i = 0; i < 3; i++) {
      const ph = ((t + i * 500) % 1500) / 1500;
      g.fillStyle(INK, (1 - ph) * 0.5);
      g.fillCircle(px + dirX * 26, py + 22 + ph * 26, 2 - ph);
    }
    g.fillStyle(0xd8d0ba, 0.95);
    g.fillCircle(s.x - dirX * 34, s.y + 14 + flutter * 0.4, 6);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(PAGE, 0.8);
      g.fillRect(s.x - dirX * 34 - 11, s.y + 18 + i * 4 + flutter * 0.3, 22, 3);
    }

    // Head: a folded-paper mask with two punched holes and a slit that reads.
    const hy = s.y - 44;
    g.fillStyle(PAGE, 0.96);
    g.beginPath();
    g.moveTo(s.x, hy - 22);
    g.lineTo(s.x + 20, hy - 4);
    g.lineTo(s.x + 14, hy + 20);
    g.lineTo(s.x - 14, hy + 20);
    g.lineTo(s.x - 20, hy - 4);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, PAGE_DARK, 0.4);
    g.lineBetween(s.x, hy - 22, s.x, hy + 20);
    const eye = s.hurt ? 0xc4392c : INK;
    for (const side of [-1, 1]) {
      g.fillStyle(eye, 0.9);
      g.fillEllipse(s.x + side * 8 + dirX * 3, hy - 2, 5, 7 - s.castGlow * 2);
    }
    g.lineStyle(2, INK, 0.7);
    g.lineBetween(s.x - 7, hy + 11, s.x + 7, hy + 11);
    // Loose leaves circling — the pages it is still deciding about.
    for (let i = 0; i < 3; i++) {
      const a = t / 700 + (i * Math.PI * 2) / 3;
      const ox = s.x + Math.cos(a) * 52;
      const oy = s.y - 16 + Math.sin(a) * 22;
      g.fillStyle(PAGE, 0.35 + Math.sin(t / 300 + i) * 0.12);
      g.fillRect(ox - 8, oy - 10, 16, 20);
      g.lineStyle(1, INK, 0.25);
      g.lineBetween(ox - 5, oy - 4, ox + 5, oy - 4);
      g.lineBetween(ox - 5, oy + 2, ox + 3, oy + 2);
    }
    if (s.enraged) {
      g.fillStyle(INK, 0.12);
      g.fillCircle(s.x, s.y, 70 + Math.sin(t / 200) * 4);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
