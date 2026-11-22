import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { StrikeTarget } from '../../../../../boss/framework/StrikeTargets';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { figure, letter, mask, nail } from './art';
import {
  BONE, BRASS, BRASS_DARK, BRASS_LIT, FLAG, FLAG_DARK, INK, IRON, IRON_LIT, LAMP, MASK_WHITE, PAPER, PAPER_DARK,
  TIMBER, TIMBER_DARK, TIMBER_LIT, VENOM, WAX, WAX_DARK, WAX_LIT, WHISPER, WHISPER_DARK, WHISPER_LIT,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Whisper, the Ear of the Mire — the Matriarch's fourth broodling, governor of the Cloak Court.
 *
 * Whisper has never raised his voice. He learned as a hatchling that his mother's coils could
 * hear a heartbeat through a wall, and that the only safe child was the one she never had to
 * listen for; so he became the one who listens. Every horn in the court runs to his Hall, every
 * letter in the Asp's Mouth crosses his desk, and he answers all of it the same way — quietly,
 * by post. He fights like a rumour:
 *
 * • **Rumour** (blinking): he is gone in a puff of smoke and four cloaked figures stand round
 *   you, one of them him; each throws a knife. Strike a decoy before it throws and it is only
 *   smoke. Between rumours, knives glint in the dark *behind* you and fly.
 * • **Denunciation** (orbiting, the blood tint): letters fly in from the walls and nail themselves
 *   to the floor round you — and each letter, a beat later, is where a blow falls. He brings the
 *   Hall's great seal down on you, and leaves a slick of wax that drags at the feet; he hammers a
 *   line of notices across the room and has it read aloud.
 * • **Silent Knife** (hard, stalking, the void tint): every warning goes faint, and his cuts land
 *   on the side of the room his back is turned to. Watch which way the hood faces.
 */

const TOP = 96;

/** The fight's current phase index, set by drawDecor every frame: telegraphs dim in Silent Knife. */
let phaseNow = 0;
let hardNow = false;
/** Where the hood is turned during Silent Knife (radians), or null to face the player. */
let gaze: number | null = null;
const faint = (): number => (hardNow && phaseNow >= 2 ? 0.35 : 1);

const alivePlayer = (tk: BossToolkit): boolean => tk.player.active && tk.player.hp > 0;

// ── Signature: Rumour ────────────────────────────────────────────────
// Smoke, and four cloaked figures on a ring round you — one of them him. Each raises a knife,
// an aim-line shows, and each throws. A decoy struck before it throws is only smoke.

interface Decoy { x: number; y: number; real: boolean; alive: boolean; target: StrikeTarget | null; poppedAt: number }

const rumour = (tk: BossToolkit): SignatureMove => {
  let decoys: Decoy[] = [];
  let castAt = 0;
  let throwAt = 0;
  let thrown = false;
  const R = 230;
  const clear = () => { for (const d of decoys) d.target?.remove(); decoys = []; };
  return {
    durationMs: 2300,
    windupMs: 600,
    gesture: 'recoil',
    locksBody: true,
    tell: 'RUMOUR',
    cast(time) {
      clear();
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      const realIdx = Math.floor(Math.random() * 4);
      tk.boom(tk.bossX, tk.bossY, 50, WHISPER_DARK);
      for (let i = 0; i < 4; i++) {
        const a = a0 + (i / 4) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * R, 70), y = tk.clampY(p.y + Math.sin(a) * R * 0.8, 60);
        const d: Decoy = { x, y, real: i === realIdx, alive: true, target: null, poppedAt: -9999 };
        if (!d.real) {
          d.target = tk.spawnTarget({
            x, y: y - 20, r: 22,
            onStruck: () => {
              if (!d.alive || thrown) return;
              d.alive = false; d.poppedAt = tk.now;
              d.target?.remove(); d.target = null;
              tk.boom(d.x, d.y - 20, 40, WHISPER_DARK);
              tk.sfx('smoke');
            },
          });
        } else {
          tk.host.setBossPos(x, y);
        }
        tk.boom(x, y - 10, 46, WHISPER);
        decoys.push(d);
      }
      castAt = time;
      throwAt = time + tk.warn(1000);
      thrown = false;
      tk.sfx('smoke');
    },
    update(time) {
      if (!decoys.length) return;
      if (!thrown && time >= throwAt) {
        thrown = true;
        const p = tk.player;
        for (const d of decoys) {
          if (!d.alive) continue;
          const a = Math.atan2(p.y - (d.y - 24), p.x - d.x);
          tk.spawnBullet({ x: d.x, y: d.y - 24, angle: a, speed: 300, damage: d.real ? 12 : 9, r: 6, color: d.real ? WAX_LIT : 0xd8d0e8, lifeMs: 3000 });
        }
        tk.sfx('slash');
      }
      if (thrown && time > throwAt + 700) {
        for (const d of decoys) if (!d.real && d.alive) { d.alive = false; d.poppedAt = time; tk.boom(d.x, d.y - 20, 40, WHISPER_DARK); }
        for (const d of decoys) d.target?.remove();
        if (time > throwAt + 1100) decoys = [];
      }
    },
    drawGround(g, time) {
      const f = faint();
      for (const d of decoys) {
        if (!d.alive || thrown) continue;
        const k = clamp((time - castAt) / Math.max(1, throwAt - castAt), 0, 1);
        const p = tk.player;
        g.lineStyle(1.5, WAX, (0.15 + k * 0.5) * f); g.lineBetween(d.x, d.y - 24, p.x, p.y);
        g.fillStyle(WHISPER_DARK, 0.25); g.fillEllipse(d.x, d.y + 2, 46, 14);
      }
    },
    drawAir(g, time) {
      const f = faint();
      for (const d of decoys) {
        if (!d.alive) {
          // A popped decoy: an empty cloak crumpling into smoke.
          const k = clamp((time - d.poppedAt) / 500, 0, 1);
          if (k < 1) for (let i = 0; i < 6; i++) { g.fillStyle(WHISPER, 0.5 * (1 - k)); g.fillCircle(d.x + Math.cos(i) * k * 30, d.y - 20 - k * 20 + Math.sin(i * 2) * 10, 10 + k * 8); }
          continue;
        }
        if (d.real) continue;
        const k = clamp((time - castAt) / Math.max(1, throwAt - castAt), 0, 1);
        figure(g, d.x, d.y, 1.35, WHISPER, { mask: 'bauta', maskColor: MASK_WHITE, lean: Math.sin(time / 300 + d.x) * 0.3, arm: thrown ? 0 : k, a: 0.95 });
        if (!thrown) {
          // The knife raised, glinting brighter as it is about to fly.
          const hx = d.x + 16, hy = d.y - 27 - k * 19;
          g.lineStyle(2, IRON_LIT, 0.6 + k * 0.4); g.lineBetween(hx, hy, hx + 4, hy - 12);
          if (k > 0.6) glow(g, hx + 4, hy - 12, 8, 0xffffff, 0.12 * f, 2);
        }
      }
    },
    onPhaseEnd() { clear(); thrown = true; },
  };
};

// ── Signature: Behind You ────────────────────────────────────────────
// Knives glint in the dark at your back — on the far side of you from him — then fly. Two waves.

interface Glint { x: number; y: number; at: number; fireAt: number; fired: boolean }

const behindYou = (tk: BossToolkit): SignatureMove => {
  let glints: Glint[] = [];
  const wave = (time: number) => {
    const p = tk.player;
    const back = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
    const n = tk.hard ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = back + (i - (n - 1) / 2) * 0.55;
      glints.push({
        x: tk.clampX(p.x + Math.cos(a) * 170, 40), y: tk.clampY(p.y + Math.sin(a) * 150, 30),
        at: time, fireAt: time + tk.warn(800) + i * 120, fired: false,
      });
    }
  };
  return {
    durationMs: 2300,
    windupMs: 500,
    gesture: 'point',
    tell: 'BEHIND YOU',
    cast(time) {
      glints = [];
      wave(time);
      tk.schedule(1000, () => wave(tk.now));
      tk.sfx('hush');
    },
    update(time) {
      const p = tk.player;
      for (const gl of glints) {
        if (gl.fired || time < gl.fireAt) continue;
        gl.fired = true;
        tk.spawnBullet({ x: gl.x, y: gl.y, angle: Math.atan2(p.y - gl.y, p.x - gl.x), speed: 400, damage: 11, r: 6, color: 0xe8e4f0, lifeMs: 2000 });
        tk.sfx('stab');
      }
      glints = glints.filter((gl) => !gl.fired || time < gl.fireAt + 300);
    },
    drawAir(g, time) {
      const f = faint();
      const p = tk.player;
      for (const gl of glints) {
        if (gl.fired) continue;
        const k = clamp((time - gl.at) / Math.max(1, gl.fireAt - gl.at), 0, 1);
        const a = Math.atan2(p.y - gl.y, p.x - gl.x);
        // A knife hanging in the murk, its point turning toward you, and a cold glint.
        g.fillStyle(WHISPER_DARK, 0.4 * f); g.fillCircle(gl.x, gl.y, 16);
        const tx = gl.x + Math.cos(a) * 12, ty = gl.y + Math.sin(a) * 12;
        g.lineStyle(3, IRON_LIT, (0.5 + k * 0.5) * f); g.lineBetween(gl.x - Math.cos(a) * 6, gl.y - Math.sin(a) * 6, tx, ty);
        g.lineStyle(3, TIMBER_DARK, f); g.lineBetween(gl.x - Math.cos(a) * 6, gl.y - Math.sin(a) * 6, gl.x - Math.cos(a) * 13, gl.y - Math.sin(a) * 13);
        if (k > 0.5) { g.fillStyle(0xffffff, (k - 0.5) * 1.6 * f); g.fillCircle(tx, ty, 2 + k * 2); }
        if (k > 0.3) { g.lineStyle(1, 0xe8e4f0, 0.25 * k * f); g.lineBetween(tx, ty, tx + Math.cos(a) * 90, ty + Math.sin(a) * 90); }
      }
    },
    onPhaseEnd() { glints = []; },
  };
};

// ── Signature: Denunciation ──────────────────────────────────────────
// Letters fly in from the walls and nail themselves to the floor — one where you stand, the
// rest round it. A beat after each lands, the blow it names falls there, in a burst of red wax.

interface Notice { fx: number; fy: number; x: number; y: number; sentAt: number; landAt: number; fallAt: number; dealt: boolean; rot: number }

const denounce = (tk: BossToolkit): SignatureMove => {
  let notices: Notice[] = [];
  const FLY = 500;
  const R = 52;
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'raise',
    tell: 'DENUNCIATION',
    cast(time) {
      const p = tk.player;
      notices = [];
      const n = tk.hard ? 6 : 5;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const tx = i === 0 ? p.x : p.x + Math.cos(a0 + (i / (n - 1)) * Math.PI * 2) * 125;
        const ty = i === 0 ? p.y : p.y + Math.sin(a0 + (i / (n - 1)) * Math.PI * 2) * 100;
        const edge = Math.floor(Math.random() * 3);
        const fx = edge === 0 ? -20 : edge === 1 ? tk.W + 20 : tk.W * Math.random();
        const fy = edge === 2 ? TOP : TOP + Math.random() * (tk.H - TOP);
        const sentAt = time + i * 140;
        notices.push({
          fx, fy, x: tk.clampX(tx, 40), y: tk.clampY(ty, 40), sentAt, landAt: sentAt + FLY,
          fallAt: sentAt + FLY + tk.warn(900), dealt: false, rot: (Math.random() - 0.5) * 0.6,
        });
      }
      tk.sfx('whoosh');
    },
    update(time) {
      for (const n of notices) {
        if (n.dealt || time < n.fallAt) continue;
        n.dealt = true;
        tk.explode(n.x, n.y, R, 14, WAX);
        tk.sfx('stone-slam');
      }
      notices = notices.filter((n) => !n.dealt || time < n.fallAt + 500);
    },
    drawGround(g, time) {
      const f = faint();
      for (const n of notices) {
        if (time < n.landAt) continue;
        if (n.dealt) {
          const k = clamp((time - n.fallAt) / 500, 0, 1);
          g.fillStyle(WAX, 0.5 * (1 - k)); g.fillCircle(n.x, n.y, R * (0.6 + k * 0.4));
          continue;
        }
        const k = clamp((time - n.landAt) / Math.max(1, n.fallAt - n.landAt), 0, 1);
        g.fillStyle(WAX_DARK, (0.08 + k * 0.18) * f); g.fillCircle(n.x, n.y, R);
        g.lineStyle(2, WAX, (0.3 + k * 0.6) * f); g.strokeCircle(n.x, n.y, R);
        g.beginPath(); g.arc(n.x, n.y, R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        letter(g, n.x, n.y, 1.6, n.rot, true, Math.max(0.35, f));
        nail(g, n.x - 10, n.y - 7, 1.4); nail(g, n.x + 10, n.y - 7, 1.4);
      }
    },
    drawAir(g, time) {
      const f = faint();
      for (const n of notices) {
        if (time < n.sentAt || time >= n.landAt) continue;
        const k = (time - n.sentAt) / FLY;
        const x = n.fx + (n.x - n.fx) * k, y = n.fy + (n.y - n.fy) * k - Math.sin(k * Math.PI) * 60;
        letter(g, x, y, 1.5, k * 8 + n.rot, true, Math.max(0.4, f));
      }
    },
    onPhaseEnd() { notices = []; },
  };
};

// ── Signature: The Great Seal ────────────────────────────────────────
// The Hall's own seal comes down on you: a shadow grows where you stand, the brass stamp drops,
// and the floor is left in a slick of hot wax with the Eye pressed in it — it drags at the feet.

const greatSeal = (tk: BossToolkit): SignatureMove => {
  let at: { x: number; y: number; warnAt: number; fallAt: number; dealt: boolean; poolUntil: number } | null = null;
  const R = 92;
  return {
    durationMs: 1800,
    windupMs: 650,
    gesture: 'slam',
    tell: 'THE GREAT SEAL',
    cast(time) {
      const p = tk.player;
      at = { x: tk.clampX(p.x, 60), y: tk.clampY(p.y, 50), warnAt: time, fallAt: time + tk.warn(1150), dealt: false, poolUntil: 0 };
      tk.sfx('anvil');
    },
    update(time) {
      if (!at) return;
      const p = tk.player;
      if (!at.dealt && time >= at.fallAt) {
        at.dealt = true;
        at.poolUntil = time + 3600;
        tk.explode(at.x, at.y, R, 20, WAX);
        tk.sfx('gravity-slam');
      }
      if (at.dealt && time < at.poolUntil && alivePlayer(tk) && dist(p.x, p.y, at.x, at.y) < R * 0.8) tk.slowPlayer(0.6, 250);
      if (at.dealt && time > at.poolUntil) at = null;
    },
    drawGround(g, time) {
      if (!at) return;
      const f = faint();
      if (!at.dealt) {
        const k = clamp((time - at.warnAt) / Math.max(1, at.fallAt - at.warnAt), 0, 1);
        g.fillStyle(0x000000, (0.1 + k * 0.3) * f); g.fillEllipse(at.x, at.y, R * 2 * (0.5 + k * 0.5), R * 1.4 * (0.5 + k * 0.5));
        g.lineStyle(2, WAX, (0.3 + k * 0.6) * f); g.strokeEllipse(at.x, at.y, R * 2, R * 1.4);
        return;
      }
      // The wax slick, the Eye pressed into it, cooling and darkening.
      const k = clamp(1 - (at.poolUntil - time) / 3600, 0, 1);
      const a = 1 - clamp((time - (at.poolUntil - 500)) / 500, 0, 1);
      g.fillStyle(WAX_DARK, 0.85 * a); g.fillEllipse(at.x, at.y, R * 1.9, R * 1.3);
      g.fillStyle(dim(WAX, k * 0.4), 0.9 * a); g.fillEllipse(at.x, at.y - 2, R * 1.7, R * 1.15);
      g.lineStyle(3, WAX_DARK, a); g.strokeEllipse(at.x, at.y, R * 1.3, R * 0.85);
      g.fillStyle(WAX_DARK, a); g.fillEllipse(at.x, at.y, 60, 26);
      g.fillStyle(lit(WAX, 0.2), a); g.fillCircle(at.x, at.y, 9);
      g.fillStyle(WAX_DARK, a); g.fillCircle(at.x, at.y, 4);
      for (let i = 0; i < 12; i++) {
        const b = (i / 12) * Math.PI * 2;
        g.fillStyle(WAX_DARK, a); g.fillCircle(at.x + Math.cos(b) * R * 0.88, at.y + Math.sin(b) * R * 0.6, 6);
      }
      g.fillStyle(WAX_LIT, 0.35 * a * (1 - k)); g.fillEllipse(at.x - 20, at.y - 12, 40, 10);
    },
    drawAir(g, time) {
      if (!at || at.dealt) return;
      const f = faint();
      const k = clamp((time - at.warnAt) / Math.max(1, at.fallAt - at.warnAt), 0, 1);
      // The stamp coming down out of the dark: brass handle, a wide wax-red face.
      const y = at.y - (1 - k * k) * 320 - 40;
      g.fillStyle(BRASS_DARK, f); g.fillRect(at.x - 10, y - 90, 20, 70);
      g.fillStyle(BRASS, f); g.fillRect(at.x - 7, y - 90, 8, 70);
      g.fillStyle(BRASS_DARK, f); g.fillCircle(at.x, y - 96, 18);
      g.fillStyle(BRASS_LIT, f); g.fillCircle(at.x - 5, y - 101, 6);
      g.fillStyle(TIMBER_DARK, f); g.fillEllipse(at.x, y - 14, R * 1.6, 28);
      g.fillStyle(WAX, f); g.fillEllipse(at.x, y, R * 1.7, 30);
      g.fillStyle(WAX_DARK, f); g.fillEllipse(at.x, y + 2, 50, 12);
    },
    onPhaseEnd() { at = null; },
  };
};

// ── Signature: Posted ────────────────────────────────────────────────
// He hammers a line of notices across the room, wall to wall, through where you stand — one tap
// at a time — then has it read aloud, and the whole line strikes. In hard, a second line crosses it.

interface Line { x: number; y: number; a: number; postAt: number; readAt: number; dealt: boolean }

const posted = (tk: BossToolkit): SignatureMove => {
  let lines: Line[] = [];
  const HALF = 26;
  const LEN = 1200;
  const make = (time: number, a: number): Line => {
    const p = tk.player;
    return { x: p.x, y: p.y, a, postAt: time, readAt: time + tk.warn(1100), dealt: false };
  };
  return {
    durationMs: 2600,
    windupMs: 550,
    gesture: 'punch',
    hold: 'brace',
    tell: 'POSTED',
    cast(time) {
      const a = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][Math.floor(Math.random() * 4)];
      lines = [make(time, a)];
      if (tk.hard || phaseNow >= 2) tk.schedule(700, () => lines.push(make(tk.now, a + Math.PI / 2)));
      tk.sfx('hammer-forge');
    },
    update(time) {
      const p = tk.player;
      for (const l of lines) {
        if (l.dealt || time < l.readAt) continue;
        l.dealt = true;
        tk.sfx('judgement');
        const x1 = l.x - Math.cos(l.a) * LEN, y1 = l.y - Math.sin(l.a) * LEN, x2 = l.x + Math.cos(l.a) * LEN, y2 = l.y + Math.sin(l.a) * LEN;
        if (alivePlayer(tk) && segDist(p.x, p.y, x1, y1, x2, y2) < HALF + 12) tk.hitPlayer(15, p.x, p.y);
      }
      lines = lines.filter((l) => !l.dealt || time < l.readAt + 450);
    },
    drawGround(g, time) {
      const f = faint();
      for (const l of lines) {
        const ca = Math.cos(l.a), sa = Math.sin(l.a);
        if (l.dealt) {
          const k = clamp((time - l.readAt) / 450, 0, 1);
          g.lineStyle(HALF * 2, WAX_LIT, 0.45 * (1 - k)); g.lineBetween(l.x - ca * LEN, l.y - sa * LEN, l.x + ca * LEN, l.y + sa * LEN);
          continue;
        }
        const k = clamp((time - l.postAt) / Math.max(1, l.readAt - l.postAt), 0, 1);
        g.lineStyle(HALF * 2, INK, 0.12 * f); g.lineBetween(l.x - ca * LEN, l.y - sa * LEN, l.x + ca * LEN, l.y + sa * LEN);
        g.lineStyle(1.5, WAX, (0.3 + k * 0.5) * f);
        for (const s of [-1, 1]) g.lineBetween(l.x - ca * LEN - sa * HALF * s, l.y - sa * LEN + ca * HALF * s, l.x + ca * LEN - sa * HALF * s, l.y + sa * LEN + ca * HALF * s);
        // Notices tapped in one by one, outward from where you stood.
        const reach = k * 620;
        for (let d = -600; d <= 600; d += 46) {
          if (Math.abs(d) > reach) continue;
          const nx = l.x + ca * d, ny = l.y + sa * d;
          if (nx < -10 || nx > tk.W + 10 || ny < TOP || ny > tk.H + 10) continue;
          letter(g, nx, ny, 1.1, l.a + ((d / 46) % 2 ? 0.1 : -0.1), true, Math.max(0.35, f));
          nail(g, nx, ny - 5, 1.1);
        }
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── Signature: Silent Knife ──────────────────────────────────────────
// He turns his hood away. Thin cuts open across the half of the room at his back — parallel,
// faint, one after another outward — then close. Stand where he is looking.

interface Cut { d: number; fireAt: number; dealt: boolean }

const silentKnife = (tk: BossToolkit): SignatureMove => {
  let cuts: Cut[] = [];
  let ox = 0, oy = 0, back = 0;
  let castAt = 0;
  const HALF = 22;
  return {
    durationMs: 2600,
    windupMs: 700,
    gesture: 'sweep',
    hold: 'draw',
    tell: '…',
    cast(time) {
      // Look somewhere that puts the player on his back side more often than not.
      const toP = Math.atan2(tk.player.y - tk.bossY, tk.player.x - tk.bossX);
      gaze = toP + Math.PI + (Math.random() - 0.5) * 1.6;
      back = gaze + Math.PI;
      ox = tk.bossX; oy = tk.bossY;
      castAt = time;
      cuts = [70, 170, 270, 370, 470].map((d, i) => ({ d, fireAt: time + tk.warn(1000) + i * 160, dealt: false }));
      tk.sfx('hush');
    },
    update(time) {
      const p = tk.player;
      for (const c of cuts) {
        if (c.dealt || time < c.fireAt) continue;
        c.dealt = true;
        tk.sfx('slash');
        // The cut: a line across the back half-plane, perpendicular to the back direction.
        const along = (p.x - ox) * Math.cos(back) + (p.y - oy) * Math.sin(back);
        if (alivePlayer(tk) && Math.abs(along - c.d) < HALF + 12) tk.hitPlayer(15, p.x, p.y);
      }
      if (cuts.length && cuts.every((c) => c.dealt) && time > cuts[cuts.length - 1].fireAt + 400) { cuts = []; gaze = null; }
    },
    drawGround(g, time) {
      const ca = Math.cos(back), sa = Math.sin(back);
      for (const c of cuts) {
        const cx = ox + ca * c.d, cy = oy + sa * c.d;
        const x1 = cx - sa * 900, y1 = cy + ca * 900, x2 = cx + sa * 900, y2 = cy - ca * 900;
        if (c.dealt) {
          const k = clamp((time - c.fireAt) / 400, 0, 1);
          g.lineStyle(4, 0xf4f0ff, 0.8 * (1 - k)); g.lineBetween(x1, y1, x2, y2);
          continue;
        }
        const k = clamp((time - castAt) / Math.max(1, c.fireAt - castAt), 0, 1);
        // Hairline warnings only — faint by design.
        g.lineStyle(1, 0xf4f0ff, 0.12 + k * 0.22); g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(HALF * 2, WHISPER_DARK, 0.06 + k * 0.08); g.lineBetween(x1, y1, x2, y2);
      }
    },
    onPhaseEnd() { cuts = []; gaze = null; },
  };
};

export const WHISPER_BOSS: WorldBossDef = {
  worldId: 'isle:whisper',
  name: 'Prince Whisper',
  title: 'the Ear of the Mire',
  color: WHISPER,
  colorLit: WHISPER_LIT,
  colorDark: WHISPER_DARK,
  accent: WAX,
  // Tier 3 of the seventh isle.
  damageMult: 1.3,

  intro: [
    'You came in by the Fang road at the third bell, bought nothing, and asked the deaf woman for directions.',
    'She told you. I know what she told you. I know what you thought of the waystone. Sit down. No? Very well.',
  ],
  banter: [
    'Mother can hear a heartbeat through a wall. I only need the wall.',
    'Every letter in the Asp\'s Mouth crosses my desk. Yours will too.',
    'I have never once raised my voice. I have never once needed to.',
    'Somebody in Cloak has already written down how this ends. I just haven\'t read it yet.',
    'Look behind you. No — the other behind you.',
  ],
  defeatLine: 'THE HALL GOES QUIET',
  resumeLine: 'Back again. A man in the Two Cups said you would be. I paid him a dose for it.',

  phases: [
    {
      name: 'Rumour',
      line: 'Did you hear? The Prince is everywhere. The Prince is right behind you. Rumours, all of them.',
      hp: 530,
      cycle: [
        'sig:rumour', 'volley', 'sig:behind', 'homing', 'sig:rumour',
        'barrage', 'sig:behind', 'sig:denounce', 'radial',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1150,
      harassMs: 3200,
    },
    {
      name: 'Denunciation',
      line: 'Enough talk. Let us have it in writing.',
      hp: 620,
      cycle: [
        'sig:denounce', 'sig:posted', 'lanes', 'sig:seal', 'sig:denounce',
        'spiral', 'sig:behind', 'sig:posted', 'sig:seal', 'minefield',
      ],
      harass: ['h-rune', 'h-lane', 'h-snipe'],
      restMs: 1050,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'NOBODY HEARS THE LAST ONE COMING',
    extraPhase: {
      name: 'Silent Knife',
      line: '…',
      hp: 450,
      cycle: [
        'sig:knife', 'sig:behind', 'sig:posted', 'sig:knife',
        'homing', 'sig:rumour', 'sig:knife', 'sig:denounce', 'sweep',
      ],
      harass: ['h-snipe', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 240, spreadRad: 0.45 },
    radial: { count: 16, speed: 190 },
    homing: { count: 3, speed: 170 },
    spiral: { arms: 3, speed: 175 },
  },

  signatures: {
    rumour,
    behind: behindYou,
    denounce,
    seal: greatSeal,
    posted,
    knife: silentKnife,
  },

  look: {
    crest: 'veil', pattern: 'weave', aura: 'smoke', hands: 'blade',
    torsoR: 34, mouth: 'stitch', eyes: 2, eyeColor: 0xe8dcff,
  },
  phaseStyles: [
    { movement: 'blink', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'blood', look: { aura: 'none', hands: 'claw', mouth: 'line' } },
    { movement: 'stalk', gimmick: 'none', tint: 'void', look: { aura: 'smoke', eyes: 1, mouth: 'none' } },
  ],

  /**
   * The Ear of the Mire's tells. A deep cowl frames his face, its rim a heavy fold of dusk
   * velvet, its point drooping behind; a white bauta mask covers the face in Rumour (no mouth —
   * he never needs one), and a high stand-collar is pinned with letters. In Denunciation the mask
   * is pushed up on the brow, a clerk's hammer is in his hand and sealed letters circle him like
   * moths. In Silent Knife the hood turns away from you — wherever it faces, the cuts are not —
   * and a long thin knife hangs from his far hand.
   */
  drawDecor(g, s) {
    phaseNow = s.phaseIdx;
    hardNow = s.hard;
    const R = s.radius;
    const knife = s.hard && s.phaseIdx >= 2;
    const look = knife && gaze !== null ? gaze : s.facing;
    // The hood's turn: the face opening slides toward where he looks.
    const fx = Math.cos(look) * R * 0.18, fy = Math.sin(look) * R * 0.08;
    // A high stand-collar with letters pinned to it.
    g.fillStyle(WHISPER_DARK, 1);
    g.fillTriangle(s.x - R * 1.1, s.y + R * 0.7, s.x - R * 0.4, s.y + R * 0.2, s.x - R * 0.9, s.y - R * 0.3);
    g.fillTriangle(s.x + R * 1.1, s.y + R * 0.7, s.x + R * 0.4, s.y + R * 0.2, s.x + R * 0.9, s.y - R * 0.3);
    letter(g, s.x - R * 0.85, s.y + R * 0.25, 0.9, -0.5);
    letter(g, s.x + R * 0.9, s.y + R * 0.3, 0.8, 0.4);
    // The cowl: a heavy rim round the face, the point drooping behind.
    g.lineStyle(R * 0.36, WHISPER, 1);
    g.beginPath(); g.arc(s.x + fx, s.y + fy - R * 0.1, R * 0.92, Math.PI * 0.82, Math.PI * 2.18, false); g.strokePath();
    g.lineStyle(R * 0.12, WHISPER_LIT, 0.5);
    g.beginPath(); g.arc(s.x + fx, s.y + fy - R * 0.12, R * 0.78, Math.PI * 1.05, Math.PI * 1.6, false); g.strokePath();
    g.fillStyle(WHISPER, 1);
    g.fillTriangle(s.x - fx - R * 0.4, s.y - R * 0.9, s.x - fx + R * 0.4, s.y - R * 0.9, s.x - fx * 3 + Math.sin(s.t / 500) * 3, s.y - R * 1.75);
    g.fillStyle(WHISPER_DARK, 0.6); g.fillTriangle(s.x - fx - R * 0.1, s.y - R * 1.0, s.x - fx + R * 0.3, s.y - R * 0.95, s.x - fx * 3, s.y - R * 1.7);
    if (s.phaseIdx === 0) {
      // Rumour: the white bauta, no mouth.
      mask(g, s.x + fx, s.y + fy - R * 0.1, R / 24, 'bauta', MASK_WHITE);
    } else if (!knife) {
      // Denunciation: mask pushed up, the hammer, letters circling like moths.
      mask(g, s.x + fx, s.y + fy - R * 0.85, R / 40, 'bauta', MASK_WHITE);
      const h = s.hands[0];
      if (h) {
        g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(h.x, h.y, h.x - 6, h.y - 22);
        g.fillStyle(IRON, 1); g.fillRect(h.x - 15, h.y - 28, 18, 8);
        g.fillStyle(IRON_LIT, 1); g.fillRect(h.x - 15, h.y - 28, 18, 2);
      }
      for (let i = 0; i < 5; i++) {
        const a = s.t / 700 + (i / 5) * Math.PI * 2;
        letter(g, s.x + Math.cos(a) * R * 1.55, s.y - R * 0.2 + Math.sin(a) * R * 0.7, 0.9, a * 2, true, 0.9);
      }
    } else {
      // Silent Knife: the long knife hanging from the far hand.
      const h = s.hands[1] ?? s.hands[0];
      if (h) {
        g.lineStyle(2, IRON_LIT, 1); g.lineBetween(h.x, h.y + 4, h.x + 3, h.y + 34);
        g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(h.x, h.y - 2, h.x, h.y + 6);
        g.fillStyle(0xffffff, 0.4 + Math.sin(s.t / 160) * 0.3); g.fillCircle(h.x + 3, h.y + 34, 1.6);
      }
      // A faint line to where he looks — the only honest thing about him.
      if (gaze !== null) { g.lineStyle(1, 0xe8dcff, 0.25); g.lineBetween(s.x, s.y, s.x + Math.cos(gaze) * 160, s.y + Math.sin(gaze) * 160); }
    }
    if (s.enraged) { g.lineStyle(1.5, WAX_LIT, 0.3 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
  },

  /**
   * The Hall of Letters, inside: a long dim hall floored in black-and-bone marble with the great
   * Eye inlaid at its heart; the back wall (under the HUD) is pigeonholes stuffed with letters and
   * brass speaking-tubes coming down from every horn in the court; clerks' desks with ink-wells
   * and candle stubs line both walls; and letters lie nailed into the floor in rows, the oldest
   * gone grey.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5e1a7c);
    const T = 48;
    for (let y = 96; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const k = ((x / T) + ((y - 96) / T)) % 2;
        g.fillStyle(k ? 0x1a1820 : dim(BONE, 0.35), 1); g.fillRect(x, y, T, T);
        g.fillStyle(k ? 0x2a2632 : dim(BONE, 0.25), 0.6); g.fillTriangle(x, y, x + T, y, x, y + T);
      }
    }
    // The back wall: pigeonholes and speaking-tubes.
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(0, 0, W, 110);
    for (let y = 6; y < 100; y += 18) for (let x = 6; x < W; x += 24) {
      g.fillStyle(0x0c0a10, 1); g.fillRect(x, y, 20, 14);
      if (rng() < 0.7) { g.fillStyle(rng() < 0.3 ? PAPER_DARK : PAPER, 0.9); g.fillRect(x + 2, y + 4 + rng() * 4, 16, 6); if (rng() < 0.5) { g.fillStyle(WAX, 1); g.fillCircle(x + 10, y + 9, 1.5); } }
    }
    for (let x = 60; x < W; x += 140) {
      g.lineStyle(6, BRASS_DARK, 1); g.lineBetween(x, 0, x, 104);
      g.lineStyle(3, BRASS, 1); g.lineBetween(x - 1, 0, x - 1, 104);
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, 108, 22, 10);
      g.fillStyle(0x140f08, 1); g.fillEllipse(x, 108, 12, 5);
    }
    g.fillStyle(FLAG_DARK, 1); g.fillRect(0, 108, W, 8);
    g.fillStyle(FLAG, 0.6); g.fillRect(0, 108, W, 2);
    // Clerks' desks down both walls.
    for (let y = 170; y < H - 60; y += 120) {
      for (const x of [26, W - 26]) {
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 22, y - 30, 44, 60);
        g.fillStyle(TIMBER, 1); g.fillRect(x - 20, y - 28, 40, 56);
        g.fillStyle(PAPER, 0.9); g.fillRect(x - 12, y - 18, 18, 24);
        g.fillStyle(INK, 1); g.fillCircle(x + 10, y - 14, 4);
        g.fillStyle(0xe8dcc0, 1); g.fillRect(x + 8, y + 8, 4, 10);
        glow(g, x + 10, y + 6, 18, LAMP, 0.04, 3);
        g.fillStyle(LAMP, 1); g.fillCircle(x + 10, y + 6, 2);
      }
    }
    // The great Eye inlaid at the heart.
    const cx = W / 2, cy = (H + 110) / 2;
    g.fillStyle(dim(BONE, 0.1), 1); g.fillEllipse(cx, cy, 300, 150);
    g.lineStyle(6, BRASS_DARK, 1); g.strokeEllipse(cx, cy, 300, 150);
    g.lineStyle(2, BRASS_LIT, 0.8); g.strokeEllipse(cx, cy, 290, 142);
    g.fillStyle(0x4a3a6a, 1); g.fillCircle(cx, cy, 52);
    g.fillStyle(0x6a5a8a, 1); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.fillTriangle(cx, cy, cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, cx + Math.cos(a + 0.12) * 52, cy + Math.sin(a + 0.12) * 52); }
    g.fillStyle(0x08060a, 1); g.fillCircle(cx, cy, 22);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(cx - 12, cy - 14, 6);
    for (let k = -5; k <= 5; k++) { g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(cx + k * 24, cy - 72 + Math.abs(k) * 4, cx + k * 30, cy - 98 + Math.abs(k) * 6); }
    // Letters nailed into the floor in rows, the oldest grey.
    for (let r = 0; r < 4; r++) {
      const y = 170 + r * 120 + (r > 1 ? 60 : 0);
      for (let x = 90; x < W - 90; x += 52 + rng() * 20) {
        if (Math.abs(x - cx) < 190 && Math.abs(y - cy) < 100) continue;
        letter(g, x, y, 1, (rng() - 0.5) * 0.4, rng() < 0.6, rng() < 0.3 ? 0.35 : 0.7);
        nail(g, x, y - 5, 1);
      }
    }
    // A thread of venom-green down the centre aisle: the Matriarch's own runner.
    g.fillStyle(dim(VENOM, 0.6), 0.25); g.fillRect(cx - 18, 116, 36, cy - 75 - 116);
    g.fillRect(cx - 18, cy + 75, 36, H - cy - 75);
  },
};
