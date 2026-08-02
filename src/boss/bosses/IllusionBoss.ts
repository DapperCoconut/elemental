import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Final Curtain — Sovereign of Illusion, playing to a house that stopped
 * existing some time ago. Canon with the illusion challenge, 'The Final
 * Curtain' ("Bow. The realm is watching what it used to be.").
 *
 * Its whole fight is an information problem, and it plays fair about it: every
 * lie is *visibly* a lie if you look — phantom shots flicker and cast no
 * shadow, painted floor is a shade off, the tear in the curtain is plain. The
 * boss is betting you will not have time to look.
 */

const STAGE = 0xb45cff;
const STAGE_LIT = 0xe0b0ff;
const STAGE_DARK = 0x1b0a2c;
const FOOTLIGHT = 0xffd76a;

// ── Signature: The Understudies ──────────────────────────────────────
// Two more of it step out of the wings. All three fire the same fan — but the
// understudies are painted on, and painted shots flicker and cast no shadow.

const understudies = (tk: BossToolkit): SignatureMove => {
  interface Ghost { x: number; y: number }
  interface Fake { x: number; y: number; vx: number; vy: number; dieAt: number }
  let ghosts: Ghost[] = [];
  let fakes: Fake[] = [];
  let showUntil = 0;
  return {
    durationMs: 2900,
    cast(time: number) {
      tk.sfx('blink');
      showUntil = time + 2600;
      ghosts = [];
      for (const side of [-1, 1]) {
        ghosts.push({
          x: tk.clampX(tk.bossX + side * 170, 60),
          y: tk.clampY(tk.bossY + Phaser.Math.Between(-40, 40), 120),
        });
      }
      // Three fans, one after another, in a random running order — so the
      // real one is not always the middle body.
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      order.forEach((who, i) => {
        tk.schedule(650 + i * 620, () => {
          const src = who === 2 ? { x: tk.bossX, y: tk.bossY } : ghosts[who];
          if (!src) return;
          const aim = Math.atan2(tk.player.y - src.y, tk.player.x - src.x);
          for (let k = 0; k < 7; k++) {
            const a = aim + (k - 3) * 0.19;
            if (who === 2) {
              tk.spawnBullet({
                x: src.x + Math.cos(a) * 26, y: src.y + Math.sin(a) * 26,
                angle: a, speed: 250, damage: 11, color: STAGE_LIT,
              });
            } else {
              fakes.push({
                x: src.x + Math.cos(a) * 26, y: src.y + Math.sin(a) * 26,
                vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, dieAt: tk.now + 2600,
              });
            }
          }
          tk.sfx(who === 2 ? 'shotgun' : 'whoosh');
        });
      });
    },
    update(time: number, dt: number) {
      for (const f of fakes) { f.x += f.vx * dt; f.y += f.vy * dt; }
      fakes = fakes.filter((f) => time < f.dieAt);
      if (time > showUntil) ghosts = [];
    },
    drawAir(g, time) {
      // The doubles: the same silhouette, thinner, and lagging half a beat.
      for (const gh of ghosts) {
        const flick = 0.28 + Math.sin(time / 90 + gh.x) * 0.12;
        g.fillStyle(STAGE, flick);
        g.fillRoundedRect(gh.x - 22, gh.y - 30, 44, 62, 12);
        g.fillStyle(STAGE_LIT, flick * 0.9);
        g.fillCircle(gh.x, gh.y - 40, 17);
        g.fillStyle(STAGE_DARK, flick);
        g.fillCircle(gh.x - 6, gh.y - 42, 3);
        g.fillCircle(gh.x + 6, gh.y - 42, 3);
      }
      // Painted shots: hollow, flickering, and they leave no wake.
      for (const f of fakes) {
        const flick = 0.2 + Math.sin(time / 60 + f.x * 0.1) * 0.16;
        g.lineStyle(1.5, STAGE_LIT, flick);
        g.strokeCircle(f.x, f.y, 5);
      }
    },
    onPhaseEnd() { ghosts = []; fakes = []; showUntil = 0; },
  };
};

// ── Signature: The Curtain ───────────────────────────────────────────
// It comes down across the whole stage and travels. There is one tear in it,
// there has always been one tear in it, and it is the only way through.

const theCurtain = (tk: BossToolkit): SignatureMove => {
  let x = 0;
  let vx = 0;
  let tearY = 0;
  let warnUntil = 0;
  let running = false;
  let lastHitAt = 0;
  const TEAR_HALF = 78;
  return {
    durationMs: 3900,
    cast(time: number) {
      tk.sfx('portal');
      const fromLeft = tk.player.x > tk.W / 2;
      x = fromLeft ? -30 : tk.W + 30;
      vx = fromLeft ? 300 : -300;
      // The tear is put on the far side of the hall from the player: a run,
      // not a step, but the curtain is slower than a run by a clear margin.
      tearY = tk.clampY(tk.player.y < tk.H / 2 ? tk.H * 0.72 : tk.H * 0.34, 130);
      warnUntil = time + 1000;
      running = false;
      tk.schedule(1000, () => { running = true; });
      tk.schedule(3800, () => { running = false; });
    },
    update(time: number, dt: number) {
      if (!running) return;
      x += vx * dt;
      const p = tk.player;
      if (!p.active) return;
      if (Math.abs(p.x - x) < 26 && Math.abs(p.y - tearY) > TEAR_HALF && time - lastHitAt > 700) {
        lastHitAt = time;
        tk.hitPlayer(30, p.x, p.y);
        tk.slowPlayer(0.6, 700);
      }
      if (x < -60 || x > tk.W + 60) running = false;
    },
    drawAir(g, time) {
      if (!running && time > warnUntil) return;
      const preview = !running;
      const px = preview ? (vx > 0 ? 8 : tk.W - 8) : x;
      const alpha = preview ? 0.25 + Math.sin(time / 110) * 0.1 : 0.85;
      // Velvet, in folds, with the tear left ragged.
      for (let y = 96; y < tk.H; y += 12) {
        if (Math.abs(y - tearY) < TEAR_HALF) continue;
        const fold = Math.sin(y / 26 + time / 320) * 5;
        g.fillStyle(y % 24 === 0 ? 0x6a1a8a : 0x8a2aa8, alpha);
        g.fillRect(px - 22 + fold, y, 44, 12);
      }
      g.lineStyle(2, FOOTLIGHT, alpha * 0.7);
      g.lineBetween(px, 96, px, tearY - TEAR_HALF);
      g.lineBetween(px, tearY + TEAR_HALF, px, tk.H);
      // The tear itself, lit so it cannot be missed.
      g.lineStyle(3, FOOTLIGHT, preview ? 0.5 : 0.9);
      g.lineBetween(px - 14, tearY - TEAR_HALF, px + 10, tearY - TEAR_HALF + 18);
      g.lineBetween(px + 10, tearY + TEAR_HALF - 18, px - 14, tearY + TEAR_HALF);
      g.fillStyle(FOOTLIGHT, 0.1 + Math.sin(time / 180) * 0.05);
      g.fillRect(px - 16, tearY - TEAR_HALF, 32, TEAR_HALF * 2);
    },
    onPhaseEnd() { running = false; warnUntil = 0; },
  };
};

// ── Signature: The False Floor ───────────────────────────────────────
// Half of this stage is painted scenery. The paint is a shade off, and it is
// shown a full second before anything opens.

const falseFloor = (tk: BossToolkit): SignatureMove => {
  interface Trap { x: number; y: number; opensAt: number; fired: boolean }
  let traps: Trap[] = [];
  const CELL = 118;
  return {
    durationMs: 3200,
    cast(time: number) {
      tk.sfx('glitch');
      const cols = Math.floor((tk.W - 80) / CELL);
      const rows = Math.floor((tk.H - 180) / CELL);
      // A checker of trapdoors: every other cell, offset by a random parity,
      // so the safe cells always form a connected diagonal path.
      const parity = Math.random() < 0.5 ? 0 : 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 !== parity) continue;
          traps.push({
            x: 60 + c * CELL + CELL / 2,
            y: 130 + r * CELL + CELL / 2,
            opensAt: time + 1400 + r * 120,
            fired: false,
          });
        }
      }
    },
    update(time: number) {
      for (const t of traps) {
        if (t.fired || time < t.opensAt) continue;
        t.fired = true;
        const p = tk.player;
        if (p.active && Math.abs(p.x - t.x) < CELL / 2 && Math.abs(p.y - t.y) < CELL / 2) {
          tk.hitPlayer(26, p.x, p.y);
          tk.slowPlayer(0.55, 1100);
          tk.host.showFloatingText(p.x, p.y - 40, 'SCENERY', '#e0b0ff');
        }
        tk.boom(t.x, t.y, CELL * 0.45, STAGE_DARK);
      }
      traps = traps.filter((t) => time < t.opensAt + 700);
    },
    drawGround(g, time) {
      for (const t of traps) {
        const warn = Phaser.Math.Clamp(1 - (t.opensAt - time) / 1400, 0, 1);
        if (!t.fired) {
          // Painted boards: the grain runs the wrong way, and the shade is off.
          g.fillStyle(0x5a2a7a, 0.14 + warn * 0.3);
          g.fillRect(t.x - CELL / 2 + 3, t.y - CELL / 2 + 3, CELL - 6, CELL - 6);
          g.lineStyle(1.5, STAGE_LIT, 0.2 + warn * 0.5);
          g.strokeRect(t.x - CELL / 2 + 3, t.y - CELL / 2 + 3, CELL - 6, CELL - 6);
          for (let i = 1; i < 4; i++) {
            g.lineStyle(1, STAGE_LIT, 0.08 + warn * 0.2);
            g.lineBetween(t.x - CELL / 2 + 3, t.y - CELL / 2 + i * (CELL / 4),
              t.x + CELL / 2 - 3, t.y - CELL / 2 + i * (CELL / 4));
          }
          // The hinge line, so the fall direction reads.
          g.lineStyle(2, FOOTLIGHT, 0.25 + warn * 0.45);
          g.lineBetween(t.x, t.y - CELL / 2 + 3, t.x, t.y + CELL / 2 - 3);
        } else {
          g.fillStyle(0x000000, 0.55);
          g.fillRect(t.x - CELL / 2 + 3, t.y - CELL / 2 + 3, CELL - 6, CELL - 6);
        }
      }
    },
    onPhaseEnd() { traps = []; },
  };
};

export const ILLUSION_BOSS: WorldBossDef = {
  worldId: 'illusion',
  name: 'The Final Curtain',
  title: 'Sovereign of Illusion, Sole Survivor of the Cast',
  color: STAGE,
  colorLit: STAGE_LIT,
  colorDark: STAGE_DARK,
  accent: FOOTLIGHT,

  intro: ['Bow. The realm is watching what it used to be. Play your part badly and I will recast it.'],
  banter: [
    'They exiled me for lying. A court of ELEMENTS. Do you know what fire tells people about itself?',
    'The house has been empty for an age. I have never once played to it worse.',
    'Every double you cut down was already a rumour of a double.',
    'The Voice gave the best performance any of us ever saw. Then it ate the theatre.',
  ],
  defeatLine: 'AND SCENE',

  phases: [
    {
      name: 'Act One: The Company',
      line: 'Places, everyone. Everyone is me. Places anyway.',
      hp: 430,
      cycle: [
        'sig:understudies', 'volley', 'sig:falsefloor', 'homing',
        'sig:curtain', 'lanes', 'spiral', 'slamchain',
      ],
      harass: ['h-flak', 'h-orbs', 'h-rune'],
      restMs: 1020,
      harassMs: 3000,
      moveSpeed: 62,
      holdDist: 280,
    },
    {
      name: 'Act Two: The House Lights',
      line: 'The audience left centuries ago. That has never once stopped a performer.',
      hp: 490,
      cycle: [
        'sig:curtain', 'sig:understudies', 'barrage', 'sig:falsefloor',
        'stream', 'homing', 'quake', 'sig:understudies', 'lanes',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane', 'h-snipe'],
      restMs: 880,
      harassMs: 2550,
      moveSpeed: 74,
      holdDist: 255,
    },
  ],

  hard: {
    introLine: 'THE UNDERSTUDIES HAVE BEEN REHEARSING',
    extraPhase: {
      name: 'Curtain Call',
      line: 'One more. For the empty seats. For the FULL empty seats.',
      hp: 390,
      cycle: [
        'sig:understudies', 'sig:curtain', 'sig:falsefloor', 'sanctuary',
        'sig:understudies', 'spiral', 'barrage', 'stream',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-lane'],
      restMs: 700,
      harassMs: 2100,
      moveSpeed: 86,
      holdDist: 235,
    },
  },

  signatures: {
    understudies,
    curtain: theCurtain,
    falsefloor: falseFloor,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0c0616, 0.6);
    g.fillRect(0, 0, W, H);
    // A proscenium: swagged curtains down both sides, footlights at the front,
    // and rows of seats fading into a dark that is not painted at all.
    for (const side of [0, 1]) {
      const x = side === 0 ? 0 : W - 56;
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i % 2 === 0 ? 0x5a1478 : 0x741c96, 0.5);
        g.fillRect(x + (side === 0 ? i * 7 : i * 7), 96, 7, H - 96);
      }
    }
    g.fillStyle(0x3a0a4c, 0.55);
    g.fillRect(0, 96, W, 34);
    for (let i = 0; i < 14; i++) {
      const x = 40 + (i * (W - 80)) / 13;
      g.fillStyle(FOOTLIGHT, 0.14);
      g.fillCircle(x, H - 14, 9);
      g.fillStyle(FOOTLIGHT, 0.05);
      g.fillCircle(x, H - 14, 22);
    }
    // The vanished audience, drawn as the memory of an audience.
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 11; c++) {
        g.fillStyle(STAGE, 0.04);
        g.fillCircle(70 + c * ((W - 140) / 10), 118 + r * 9, 5 - r);
      }
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(s.x, s.y + 46, 84, 15);

    const dirX = Math.cos(s.facing);
    // Velvet body, cut like a stage curtain and never quite still.
    g.fillStyle(0x5a1478, 1);
    g.beginPath();
    g.moveTo(s.x - 26, s.y - 24);
    g.lineTo(s.x + 26, s.y - 24);
    g.lineTo(s.x + 34, s.y + 46);
    g.lineTo(s.x - 34, s.y + 46);
    g.closePath();
    g.fillPath();
    for (let i = 0; i < 5; i++) {
      const fx = s.x - 26 + i * 13;
      g.lineStyle(2, 0x8a2aa8, 0.7);
      g.lineBetween(fx + Math.sin(t / 400 + i) * 2, s.y - 22, fx + Math.sin(t / 400 + i + 1) * 4, s.y + 44);
    }
    g.fillStyle(FOOTLIGHT, 0.5);
    g.fillRect(s.x - 28, s.y - 26, 56, 4);

    // Hands: white gloves, one presenting, one holding the spare mask.
    const present = Math.sin(t / 500) * 6;
    g.fillStyle(0xf4ecff, 0.95);
    g.fillCircle(s.x + dirX * 34, s.y + 6 + present - s.castGlow * 10, 7);
    g.fillCircle(s.x - dirX * 34, s.y + 14 - present, 7);

    // The mask it is wearing — comedy, unless it is losing, in which case the
    // other one, and the swap is instant and unremarked.
    const hy = s.y - 40;
    const tragic = s.hurt || s.hpRatio < 0.34;
    g.fillStyle(0xf0e4ff, 0.97);
    g.fillEllipse(s.x + dirX * 2, hy, 34, 40);
    g.fillStyle(STAGE, 0.25);
    g.fillEllipse(s.x + dirX * 2, hy + 6, 26, 24);
    // Eyeholes: empty, and the empty is the point.
    for (const side of [-1, 1]) {
      g.fillStyle(STAGE_DARK, 1);
      g.fillEllipse(s.x + side * 9 + dirX * 3, hy - 6, 11, tragic ? 9 : 12);
      g.fillStyle(s.hurt ? 0xffffff : STAGE_LIT, 0.75 + s.castGlow * 0.25);
      g.fillCircle(s.x + side * 9 + dirX * 5, hy - 6, 2.4 + s.castGlow);
    }
    // The mouth does the acting.
    g.lineStyle(3, STAGE_DARK, 0.95);
    if (tragic) {
      g.beginPath();
      g.arc(s.x + dirX * 2, hy + 20, 11, Math.PI, 0, false);
      g.strokePath();
    } else {
      g.beginPath();
      g.arc(s.x + dirX * 2, hy + 8, 11, 0, Math.PI, false);
      g.strokePath();
    }
    // The spare masks orbit, waiting to be needed.
    for (let i = 0; i < 2; i++) {
      const a = t / 900 + (i * Math.PI * 2) / 2;
      const ox = s.x + Math.cos(a) * 54;
      const oy = s.y - 20 + Math.sin(a) * 16;
      g.fillStyle(0xf0e4ff, 0.28 + Math.sin(t / 200 + i) * 0.1);
      g.fillEllipse(ox, oy, 16, 19);
      g.fillStyle(STAGE_DARK, 0.35);
      g.fillCircle(ox - 4, oy - 3, 2);
      g.fillCircle(ox + 4, oy - 3, 2);
    }
    if (s.enraged) {
      g.lineStyle(2, FOOTLIGHT, 0.3 + Math.sin(t / 140) * 0.15);
      g.strokeCircle(s.x, s.y, 62);
    }
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 52);
    }
  },
};
