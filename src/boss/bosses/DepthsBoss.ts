import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Sunken Throne — Sovereign of the Depths, exiled for keeping whatever the
 * surface dropped. Canon with the depths challenge, 'The Sunken Throne'
 * ("Crowns sink. Mine simply arrived first.").
 *
 * A fight with a tide in it: the undertow inhales on a cycle you can count,
 * the lure is bait that says so if you look at it, and the shoal turns like
 * one animal, which is exactly what makes it dodgeable.
 */

const DEEP = 0x0e8f9c;
const DEEP_LIT = 0x7ce8f0;
const DEEP_DARK = 0x04181e;
const LURE = 0xffe6a0;

// ── Signature: The Undertow ──────────────────────────────────────────
// It inhales. Four counts in, and on the fourth the trench closes on whatever
// drifted too far down.

const undertow = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let cx = 0;
  let cy = 0;
  let closesAt = 0;
  const PULL_MS = 3000;
  return {
    durationMs: PULL_MS + 600,
    cast(time: number) {
      tk.sfx('bubble');
      active = true;
      cx = tk.bossX;
      cy = tk.bossY;
      closesAt = time + PULL_MS;
      tk.pull(cx, cy, 122, PULL_MS);
      // Debris, dragged in with everything else.
      for (let i = 0; i < 4; i++) {
        tk.schedule(400 + i * 600, () => {
          const a = Math.random() * Math.PI * 2;
          tk.spawnZone({
            x: cx + Math.cos(a) * 220, y: cy + Math.sin(a) * 190,
            radius: 58, warnMs: 800, damage: 16,
          });
        });
      }
      tk.schedule(PULL_MS, () => {
        active = false;
        tk.sfx('splash');
        tk.explode(cx, cy, 170, 40, DEEP);
        tk.scene.cameras.main.shake(300, 0.005);
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (closesAt - time) / PULL_MS, 0, 1);
      g.fillStyle(DEEP_DARK, 0.25 + t * 0.35);
      g.fillCircle(cx, cy, 170);
      g.lineStyle(3, DEEP_LIT, 0.35 + t * 0.5);
      g.strokeCircle(cx, cy, 170);
      // Spiral currents, drawn in, so the direction of the pull is legible.
      for (let arm = 0; arm < 4; arm++) {
        g.lineStyle(2, DEEP_LIT, 0.15 + t * 0.25);
        g.beginPath();
        for (let i = 0; i < 26; i++) {
          const p = i / 25;
          const a = arm * (Math.PI / 2) + p * 3.2 - time / 700;
          const r = 170 * (1 - p);
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokePath();
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Lure ──────────────────────────────────────────────
// A light, out in the dark, drifting. It looks like something worth having.
// There are teeth behind it and they are drawn faintly the entire time.

const theLure = (tk: BossToolkit): SignatureMove => {
  let lx = 0;
  let ly = 0;
  let vx = 0;
  let vy = 0;
  let until = 0;
  let snapping = false;
  return {
    durationMs: 2400,
    cast(time: number) {
      tk.sfx('bubble');
      const a = Math.random() * Math.PI * 2;
      lx = tk.clampX(tk.player.x + Math.cos(a) * 260, 90);
      ly = tk.clampY(tk.player.y + Math.sin(a) * 220, 150);
      const dir = Math.random() * Math.PI * 2;
      vx = Math.cos(dir) * 55;
      vy = Math.sin(dir) * 55;
      until = time + 8000;
      snapping = false;
    },
    update(time: number, dt: number) {
      if (time > until || snapping) return;
      lx += vx * dt;
      ly += vy * dt;
      if (lx < 90 || lx > tk.W - 90) vx = -vx;
      if (ly < 150 || ly > tk.H - 60) vy = -vy;
      const p = tk.player;
      if (!p.active) return;
      if (Phaser.Math.Distance.Between(lx, ly, p.x, p.y) < 90) {
        // It has been waiting for exactly this.
        snapping = true;
        const sx = lx;
        const sy = ly;
        tk.sfx('claw');
        tk.host.showFloatingText(sx, sy - 40, '!', '#ffe6a0');
        tk.schedule(520, () => {
          tk.sfx('slime-splat');
          tk.explode(sx, sy, 150, 40, DEEP_DARK);
          tk.spawnPool({ x: sx, y: sy, radius: 90, lifeMs: 2600, damage: 6, tickMs: 600 });
        });
        tk.schedule(1800, () => { snapping = false; until = 0; });
      }
    },
    drawAir(g, time) {
      if (time > until && !snapping) return;
      // The teeth, always visible, always faint — the deal is on the table.
      const bite = snapping ? 1 : 0.18 + Math.sin(time / 400) * 0.06;
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14;
        const r = snapping ? 150 - ((time % 520) / 520) * 60 : 150;
        g.fillStyle(0xf0e8d0, bite * 0.8);
        g.fillTriangle(
          lx + Math.cos(a - 0.07) * r, ly + Math.sin(a - 0.07) * r,
          lx + Math.cos(a + 0.07) * r, ly + Math.sin(a + 0.07) * r,
          lx + Math.cos(a) * (r - 30), ly + Math.sin(a) * (r - 30),
        );
      }
      g.lineStyle(2, DEEP_LIT, bite * 1.6);
      g.strokeCircle(lx, ly, 150);
      // The lure itself: a stalk, a bulb, and a light that is far too warm.
      const bob = Math.sin(time / 260) * 5;
      g.lineStyle(2, 0x2a4a4a, 0.8);
      g.lineBetween(lx, ly + 26, lx + Math.sin(time / 500) * 8, ly + bob - 4);
      g.fillStyle(LURE, 0.2);
      g.fillCircle(lx, ly + bob - 8, 22);
      g.fillStyle(LURE, 0.95);
      g.fillCircle(lx, ly + bob - 8, 7);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(lx - 2, ly + bob - 10, 2.5);
    },
    onPhaseEnd() { until = 0; snapping = false; },
  };
};

// ── Signature: The Shoal ─────────────────────────────────────────────
// A school, moving as one animal. It turns in one piece, with a long lean
// into every turn, which is the whole reason it can be stepped around.

const theShoal = (tk: BossToolkit): SignatureMove => {
  interface Fish { ox: number; oy: number }
  let fish: Fish[] = [];
  let x = 0;
  let y = 0;
  let ang = 0;
  let until = 0;
  let lastHitAt = 0;
  return {
    durationMs: 4000,
    cast(time: number) {
      tk.sfx('water-jet');
      fish = [];
      for (let i = 0; i < 16; i++) {
        fish.push({ ox: Phaser.Math.Between(-56, 56), oy: Phaser.Math.Between(-38, 38) });
      }
      const a = Math.random() * Math.PI * 2;
      x = tk.clampX(tk.player.x + Math.cos(a) * 420, 40);
      y = tk.clampY(tk.player.y + Math.sin(a) * 360, 120);
      ang = Math.atan2(tk.player.y - y, tk.player.x - x);
      until = time + 4400;
    },
    update(time: number, dt: number) {
      if (time > until) return;
      const p = tk.player;
      // Turns at 1.1 rad/s at 235 px/s — fast in a line, poor around corners.
      const want = Math.atan2(p.y - y, p.x - x);
      ang = Phaser.Math.Angle.RotateTo(ang, want, 1.1 * dt);
      x += Math.cos(ang) * 235 * dt;
      y += Math.sin(ang) * 235 * dt;
      if (!p.active || time - lastHitAt < 620) return;
      for (const f of fish) {
        const fx = x + Math.cos(ang) * f.ox - Math.sin(ang) * f.oy;
        const fy = y + Math.sin(ang) * f.ox + Math.cos(ang) * f.oy;
        if (Phaser.Math.Distance.Between(fx, fy, p.x, p.y) < 22) {
          lastHitAt = time;
          tk.hitPlayer(16, p.x, p.y);
          break;
        }
      }
    },
    drawAir(g, time) {
      if (time > until) return;
      // The school, all leaning the same way, wake and all.
      g.fillStyle(DEEP, 0.1);
      g.fillEllipse(x, y, 150, 110);
      for (let i = 0; i < fish.length; i++) {
        const f = fish[i];
        const wig = Math.sin(time / 90 + i) * 3;
        const fx = x + Math.cos(ang) * f.ox - Math.sin(ang) * (f.oy + wig);
        const fy = y + Math.sin(ang) * f.ox + Math.cos(ang) * (f.oy + wig);
        g.fillStyle(DEEP_LIT, 0.85);
        g.fillEllipse(fx, fy, 14, 7);
        g.fillStyle(DEEP, 0.9);
        g.fillTriangle(
          fx - Math.cos(ang) * 7, fy - Math.sin(ang) * 7,
          fx - Math.cos(ang) * 14 - Math.sin(ang) * 5, fy - Math.sin(ang) * 14 + Math.cos(ang) * 5,
          fx - Math.cos(ang) * 14 + Math.sin(ang) * 5, fy - Math.sin(ang) * 14 - Math.cos(ang) * 5,
        );
        g.fillStyle(0x04181e, 0.9);
        g.fillCircle(fx + Math.cos(ang) * 4, fy + Math.sin(ang) * 4, 1.6);
      }
    },
    onPhaseEnd() { fish = []; until = 0; },
  };
};

export const DEPTHS_BOSS: WorldBossDef = {
  worldId: 'depths',
  name: 'The Sunken Throne',
  title: 'Sovereign of the Depths, Which Kept Everything Dropped',
  color: DEEP,
  colorLit: DEEP_LIT,
  colorDark: DEEP_DARK,
  accent: LURE,
  bodyR: 32,

  intro: ['Crowns sink. Mine simply arrived first. Everything the surface let go of is down here, and now so are you.'],
  banter: [
    'They exiled me for keeping things. Everything you have ever lost went somewhere. It went HERE.',
    'The pressure is not personal. It is simply the weight of everything above you.',
    'The Voice came down looking for a floor. There is no floor.',
    'Follow the light if you like. Everyone does. That is what it is for.',
  ],
  defeatLine: 'THE TRENCH EXHALES',

  phases: [
    {
      name: 'The Trench',
      line: 'Breathe out. You will not need it where the current is going.',
      hp: 450,
      cycle: [
        'sig:undertow', 'volley', 'sig:lure', 'hazard',
        'sig:shoal', 'lanes', 'homing', 'radial',
      ],
      harass: ['h-orbs', 'h-rune', 'h-snipe'],
      restMs: 1050,
      harassMs: 3100,
      moveSpeed: 48,
      holdDist: 295,
    },
    {
      name: 'Full Fathom',
      line: 'Down we go. It is only dark for the first age or so.',
      hp: 510,
      cycle: [
        'sig:shoal', 'sig:undertow', 'barrage', 'sig:lure',
        'spiral', 'summon', 'sig:shoal', 'quake', 'lanes',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane', 'h-snipe'],
      restMs: 900,
      harassMs: 2600,
      moveSpeed: 58,
      holdDist: 270,
    },
  ],

  hard: {
    introLine: 'THE TRENCH HAS OPENED ALL THE WAY DOWN',
    extraPhase: {
      name: 'The Crush',
      line: 'Do you feel that? That is every world above us, resting on your shoulders. Mine too. It is heavy up there.',
      hp: 420,
      cycle: [
        'sig:undertow', 'sig:shoal', 'sig:lure', 'sanctuary',
        'sig:undertow', 'spiral', 'barrage', 'summon',
      ],
      harass: ['h-orbs', 'h-rune', 'h-mines', 'h-lane'],
      restMs: 710,
      harassMs: 2100,
      moveSpeed: 68,
      holdDist: 250,
    },
  },

  signatures: {
    undertow,
    lure: theLure,
    shoal: theShoal,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x02090e, 0.7);
    g.fillRect(0, 0, W, H);
    // A trench floor: silt, a drowned throne, ribs of something enormous, and
    // a great deal of other people's property.
    g.fillStyle(DEEP_DARK, 0.8);
    g.fillRect(0, H - 120, W, 120);
    for (let i = 0; i < 7; i++) {
      const x = 90 + i * ((W - 180) / 6);
      g.lineStyle(5, 0x2a4048, 0.35);
      g.beginPath();
      g.arc(x, H - 30, 60, Math.PI * 1.15, Math.PI * 1.85, false);
      g.strokePath();
    }
    // The throne, half-buried, still a throne about it.
    g.fillStyle(0x1a3a42, 0.75);
    g.fillRect(W / 2 - 46, H * 0.46, 92, 96);
    g.fillRect(W / 2 - 58, H * 0.40, 116, 26);
    for (let i = 0; i < 5; i++) {
      g.fillTriangle(W / 2 - 52 + i * 26, H * 0.40, W / 2 - 40 + i * 26, H * 0.40, W / 2 - 46 + i * 26, H * 0.36);
    }
    // Lost property, glinting.
    for (let i = 0; i < 16; i++) {
      g.fillStyle(LURE, 0.06);
      g.fillEllipse(60 + ((i * 173) % (W - 120)), 160 + ((i * 211) % (H - 260)), 10, 5);
    }
    // Marine snow, on its way down forever.
    for (let i = 0; i < 30; i++) {
      g.fillStyle(0xd8f0f4, 0.05);
      g.fillCircle(30 + ((i * 137) % (W - 60)), 110 + ((i * 97) % (H - 150)), 1.6);
    }
    // The pressure gradient: it gets darker the lower you look.
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x000000, 0.05);
      g.fillRect(0, H - 60 - i * 70, W, 70);
    }
  },

  drawBody(g, s) {
    const t = s.t;
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(s.x, s.y + 50, 116, 19);

    const dirX = Math.cos(s.facing);
    const drift = Math.sin(t / 900) * 4;

    // A mass of dark water with a crowned skull somewhere in the middle.
    g.fillStyle(DEEP_DARK, 1);
    g.fillEllipse(s.x, s.y + 8 + drift, 104, 88);
    g.fillStyle(0x0a3038, 0.95);
    g.fillEllipse(s.x, s.y + 8 + drift, 92, 76);
    // Bioluminescent stripes down the flanks.
    for (let i = 0; i < 5; i++) {
      const a = -0.8 + i * 0.4;
      g.lineStyle(3, DEEP_LIT, 0.3 + Math.sin(t / 300 + i) * 0.2 + s.castGlow * 0.3);
      g.beginPath();
      g.arc(s.x, s.y + 8 + drift, 34 + i * 8, a, a + 0.9, false);
      g.strokePath();
    }
    // Tendrils, hanging and swaying, because everything down here does.
    for (let i = 0; i < 6; i++) {
      const bx = s.x - 44 + i * 18;
      g.lineStyle(3, 0x0a3038, 0.9);
      g.beginPath();
      g.moveTo(bx, s.y + 40 + drift);
      for (let k = 1; k <= 4; k++) {
        g.lineTo(bx + Math.sin(t / 420 + i + k) * (k * 3), s.y + 40 + drift + k * 12);
      }
      g.strokePath();
      g.fillStyle(DEEP_LIT, 0.4);
      g.fillCircle(bx + Math.sin(t / 420 + i + 4) * 12, s.y + 90 + drift, 2.5);
    }

    // The jaw: it is most of the front, and it never fully closes.
    const chew = Math.abs(Math.sin(t / 500)) * 5;
    g.fillStyle(0x02090e, 1);
    g.fillEllipse(s.x + dirX * 6, s.y + 14 + drift, 64, 22 + chew + s.castGlow * 8);
    for (let i = 0; i < 11; i++) {
      const tx = s.x - 30 + i * 6 + dirX * 6;
      g.fillStyle(0xf0e8d0, 0.9);
      g.fillTriangle(tx - 2.5, s.y + 4 + drift, tx + 2.5, s.y + 4 + drift, tx, s.y + 13 + drift);
      g.fillTriangle(tx - 2.5, s.y + 24 + chew + drift, tx + 2.5, s.y + 24 + chew + drift, tx, s.y + 15 + chew + drift);
    }

    // Eyes: enormous, pale, adapted to a dark nobody else has ever seen.
    const eye = s.hurt ? 0xffffff : DEEP_LIT;
    for (const side of [-1, 1]) {
      g.fillStyle(0xd8f0f4, 0.85);
      g.fillCircle(s.x + side * 26 + dirX * 4, s.y - 22 + drift, 13);
      g.fillStyle(0x02090e, 1);
      g.fillCircle(s.x + side * 26 + dirX * 7, s.y - 22 + drift, 6);
      g.fillStyle(eye, 0.6 + s.castGlow * 0.4);
      g.fillCircle(s.x + side * 26 + dirX * 7, s.y - 22 + drift, 2.4);
    }
    // The lure: its own light, out on a stalk, and it never stops moving.
    const stalkX = s.x + Math.sin(t / 700) * 26;
    const stalkY = s.y - 74 + Math.cos(t / 900) * 8 + drift;
    g.lineStyle(3, 0x0a3038, 0.95);
    g.beginPath();
    g.moveTo(s.x, s.y - 40 + drift);
    g.lineTo(s.x + (stalkX - s.x) * 0.5, s.y - 62 + drift);
    g.lineTo(stalkX, stalkY);
    g.strokePath();
    g.fillStyle(LURE, 0.18 + s.castGlow * 0.2);
    g.fillCircle(stalkX, stalkY, 20);
    g.fillStyle(LURE, 0.95);
    g.fillCircle(stalkX, stalkY, 6 + s.castGlow * 2);

    // The crown, corroded, still on.
    const cy = s.y - 44 + drift;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (Math.PI * i) / 5;
      const px = s.x + Math.cos(a) * 34;
      const py = cy + Math.sin(a) * 11;
      g.fillStyle(0x8a7a4a, 0.75);
      g.fillTriangle(px - 5, py, px + 5, py, px, py - 13);
    }
    g.lineStyle(3, 0x8a7a4a, 0.7);
    g.strokeEllipse(s.x, cy + 2, 66, 22);
    if (s.hurt) {
      g.fillStyle(0xffffff, 0.2);
      g.fillCircle(s.x, s.y, 66);
    }
  },
};
