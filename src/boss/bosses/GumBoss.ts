import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Ooze Eternal — Sovereign of Slime, exiled for engulfing a magistrate.
 * (In fairness, the magistrate started it.) Canon with the gum challenge, 'The
 * Ooze Eternal' ("The realm fell into me. It is still falling.").
 *
 * The world id is `gum` — Acid owns `slime` over in the Abstract Realm.
 *
 * Everything here is about being held: tack that slows before it hurts, a
 * bubble that takes an age to inflate and cannot be missed, and a body that
 * divides rather than dies.
 */

const OOZE = 0x46b93f;
const OOZE_LIT = 0xb8ff9a;
const OOZE_DARK = 0x0e2a0c;
const PINK = 0xff8ac4;

// ── Signature: The Tack ──────────────────────────────────────────────
// Patches of it, laid down thick. They cost speed first and health only if
// you insist on standing in them.

const theTack = (tk: BossToolkit): SignatureMove => {
  interface Patch { x: number; y: number; r: number; dieAt: number; lastTick: number }
  let patches: Patch[] = [];
  return {
    durationMs: 2000,
    cast(time: number) {
      tk.sfx('slime-splat');
      const aim = tk.angleToPlayer();
      for (let i = 0; i < 5; i++) {
        const a = aim + (i - 2) * 0.34;
        const d = Phaser.Math.Between(140, 300);
        tk.schedule(i * 130, () => {
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * 30, y: tk.bossY + Math.sin(a) * 30,
            angle: a, speed: 240, damage: 8, r: 9, color: OOZE, lifeMs: 1200,
          });
          tk.schedule(Math.round((d / 240) * 1000), () => {
            patches.push({
              x: tk.clampX(tk.bossX + Math.cos(a) * d, 50),
              y: tk.clampY(tk.bossY + Math.sin(a) * d, 120),
              r: 76, dieAt: tk.now + 8000, lastTick: 0,
            });
          });
        });
      }
      void time;
    },
    update(time: number) {
      const p = tk.player;
      for (const q of patches) {
        if (!p.active) continue;
        if (Phaser.Math.Distance.Between(q.x, q.y, p.x, p.y) > q.r) continue;
        tk.slowPlayer(0.5, 260);
        if (time - q.lastTick > 700) {
          q.lastTick = time;
          tk.hitPlayer(6, p.x, p.y);
        }
      }
      patches = patches.filter((q) => time < q.dieAt);
    },
    drawGround(g, time) {
      for (const q of patches) {
        const fade = Phaser.Math.Clamp((q.dieAt - time) / 1000, 0, 1);
        // A blob with a wobbling edge, drawn as a ring of overlapping lumps.
        g.fillStyle(OOZE_DARK, 0.5 * fade);
        g.fillCircle(q.x, q.y, q.r);
        g.fillStyle(OOZE, 0.42 * fade);
        for (let i = 0; i < 9; i++) {
          const a = (Math.PI * 2 * i) / 9;
          const rr = q.r * (0.62 + Math.sin(time / 400 + i + q.x) * 0.12);
          g.fillCircle(q.x + Math.cos(a) * rr * 0.5, q.y + Math.sin(a) * rr * 0.5, q.r * 0.42);
        }
        g.lineStyle(2, OOZE_LIT, 0.4 * fade);
        g.strokeCircle(q.x, q.y, q.r);
        // Strings of it, lifting where somebody stepped.
        for (let i = 0; i < 3; i++) {
          const a = time / 900 + i * 2;
          g.lineStyle(1.5, OOZE_LIT, 0.25 * fade);
          g.lineBetween(q.x + Math.cos(a) * 20, q.y + Math.sin(a) * 16,
            q.x + Math.cos(a) * 34, q.y + Math.sin(a) * 26);
        }
      }
    },
    onPhaseEnd() { patches = []; },
  };
};

// ── Signature: The Bubble ────────────────────────────────────────────
// It inflates. Slowly, hugely, and with an enormous amount of warning. When it
// goes, it goes everywhere except directly underneath it.

const theBubble = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let popsAt = 0;
  const BLOW_MS = 3400;
  const R = 300;
  const EYE = 78;
  return {
    durationMs: BLOW_MS + 600,
    cast(time: number) {
      tk.sfx('stretch');
      active = true;
      popsAt = time + BLOW_MS;
      tk.host.showFloatingText(tk.bossX, tk.bossY - 80, 'BLOWING', '#ff8ac4');
      tk.schedule(BLOW_MS, () => {
        active = false;
        tk.sfx('explosion-medium');
        tk.scene.cameras.main.shake(340, 0.006);
        const p = tk.player;
        const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, p.x, p.y);
        // Under the bubble is the eye of it. Everywhere else in reach is not.
        if (p.active && d <= R && d > EYE) {
          tk.hitPlayer(42, p.x, p.y);
          tk.slowPlayer(0.5, 1400);
        }
        tk.boom(tk.bossX, tk.bossY, R, PINK);
        // Gobs, flung out on the pop.
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.2;
          tk.spawnBullet({
            x: tk.bossX + Math.cos(a) * R * 0.6, y: tk.bossY + Math.sin(a) * R * 0.6,
            angle: a, speed: 210, damage: 10, r: 7, color: PINK,
          });
        }
      });
    },
    drawGround(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (popsAt - time) / BLOW_MS, 0, 1);
      g.fillStyle(PINK, 0.05 + t * 0.12);
      g.fillCircle(tk.bossX, tk.bossY, R);
      g.lineStyle(2 + t * 3, PINK, 0.3 + t * 0.55);
      g.strokeCircle(tk.bossX, tk.bossY, R);
      // The eye of it — safe, and marked as such from the first frame.
      g.fillStyle(OOZE_DARK, 0.4);
      g.fillCircle(tk.bossX, tk.bossY, EYE);
      g.lineStyle(2, OOZE_LIT, 0.5);
      g.strokeCircle(tk.bossX, tk.bossY, EYE);
    },
    drawAir(g, time) {
      if (!active) return;
      const t = Phaser.Math.Clamp(1 - (popsAt - time) / BLOW_MS, 0, 1);
      const r = 40 + t * 190;
      const wob = Math.sin(time / 120) * (2 + t * 6);
      g.fillStyle(PINK, 0.22 + t * 0.16);
      g.fillEllipse(tk.bossX, tk.bossY - 20 - t * 30, r * 2 + wob, r * 1.8 - wob);
      g.lineStyle(2, PINK, 0.5 + t * 0.4);
      g.strokeEllipse(tk.bossX, tk.bossY - 20 - t * 30, r * 2 + wob, r * 1.8 - wob);
      // Highlight, so it reads as a membrane rather than a disc.
      g.fillStyle(0xffffff, 0.14);
      g.fillEllipse(tk.bossX - r * 0.5, tk.bossY - 40 - t * 30, r * 0.5, r * 0.32);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Division ──────────────────────────────────────────
// It does not take damage so much as redistribute it. Pieces of the Ooze slop
// off and come after you on their own; they are slow, and they are many.

const theDivision = (tk: BossToolkit): SignatureMove => {
  let splitAt = 0;
  return {
    durationMs: 2000,
    cast(time: number) {
      tk.sfx('slime-splat');
      splitAt = time;
      const n = tk.hard ? 4 : 3;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 260, () => {
          const a = (Math.PI * 2 * i) / n + Math.random();
          tk.spawnAdd({
            x: tk.bossX + Math.cos(a) * 90, y: tk.bossY + Math.sin(a) * 90,
            hp: 55, speed: 118, damage: 16, maxAlive: 7,
          });
        });
      }
      // And the ground it slopped off onto stays sticky.
      for (let i = 0; i < 3; i++) {
        tk.schedule(300 + i * 300, () => {
          const a = Math.random() * Math.PI * 2;
          tk.spawnZone({
            x: tk.bossX + Math.cos(a) * 150, y: tk.bossY + Math.sin(a) * 130,
            radius: 62, warnMs: 800, damage: 12, slowMult: 0.55, slowMs: 1100,
            poolMs: 4200, poolDamage: 5,
          });
        });
      }
    },
    drawAir(g, time) {
      const t = time - splitAt;
      if (t < 0 || t > 700) return;
      // The moment of separation, drawn as strands snapping.
      const f = t / 700;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        g.lineStyle(4 * (1 - f), OOZE_LIT, 0.7 * (1 - f));
        g.lineBetween(
          tk.bossX + Math.cos(a) * 30, tk.bossY + Math.sin(a) * 30,
          tk.bossX + Math.cos(a) * (30 + f * 90), tk.bossY + Math.sin(a) * (30 + f * 90),
        );
      }
    },
    onPhaseEnd() { splitAt = 0; },
  };
};

export const GUM_BOSS: WorldBossDef = {
  worldId: 'gum',
  name: 'The Ooze Eternal',
  title: 'Sovereign of Slime, Which Has Not Finished Arriving',
  color: OOZE,
  colorLit: OOZE_LIT,
  colorDark: OOZE_DARK,
  accent: PINK,

  intro: ['The realm fell into me. It is still falling. Do not take it personally; nothing gets out, and nothing ever has.'],
  banter: [
    'They exiled me for engulfing a magistrate. He was extremely rude about it, right up until he was not.',
    'I do not chase. I do not need to. I am simply where you will eventually be.',
    'The Voice tried to swallow me. We are still discussing which way round it went.',
    'Everything you drop here, I keep. Everything you stand in, I keep a little of you.',
  ],
  defeatLine: 'IT LETS GO',

  phases: [
    {
      name: 'The Ooze',
      line: 'Slowly, then. Everything down here happens slowly, and then all at once.',
      hp: 470,
      cycle: [
        'sig:tack', 'volley', 'sig:division', 'hazard',
        'sig:bubble', 'lanes', 'homing', 'radial',
      ],
      harass: ['h-rune', 'h-flak', 'h-snipe'],
      restMs: 1060,
      harassMs: 3100,
    },
    {
      name: 'Engulfment',
      line: 'You have been standing in me for some time. I thought it rude to mention.',
      hp: 530,
      cycle: [
        'sig:bubble', 'sig:tack', 'sig:division', 'barrage',
        'spiral', 'sig:tack', 'quake', 'minefield', 'lanes',
      ],
      harass: ['h-rune', 'h-flak', 'h-mines', 'h-snipe'],
      restMs: 910,
      harassMs: 2600,
    },
  ],

  hard: {
    introLine: 'THE OOZE HAS STOPPED LEAVING ROOM',
    extraPhase: {
      name: 'The Whole Floor',
      line: 'There was a realm here. There is a realm IN here. Come and be part of the collection.',
      hp: 430,
      cycle: [
        'sig:bubble', 'sig:division', 'sig:tack', 'sanctuary',
        'sig:bubble', 'spiral', 'minefield', 'barrage',
      ],
      harass: ['h-mines', 'h-rune', 'h-flak', 'h-lane'],
      restMs: 720,
      harassMs: 2100,
    },
  },

  signatures: {
    tack: theTack,
    bubble: theBubble,
    division: theDivision,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x081408, 0.6);
    g.fillRect(0, 0, W, H);
    // A floor that has been oozed on for an age: layered puddles, half-digested
    // furniture, strands between the walls.
    for (let i = 0; i < 9; i++) {
      g.fillStyle(OOZE_DARK, 0.5);
      g.fillEllipse(70 + ((i * 149) % (W - 140)), 150 + ((i * 191) % (H - 240)), 120, 70);
      g.fillStyle(OOZE, 0.13);
      g.fillEllipse(70 + ((i * 149) % (W - 140)), 150 + ((i * 191) % (H - 240)), 90, 50);
    }
    // Things that were once objects, now merely lumps with corners.
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * ((W - 240) / 4);
      g.fillStyle(0x1a3a18, 0.7);
      g.fillRoundedRect(x - 18, H * 0.62, 36, 30, 12);
      g.fillStyle(OOZE, 0.12);
      g.fillEllipse(x, H * 0.62 + 30, 44, 14);
    }
    // Strands from the ceiling, which is also ooze.
    for (let i = 0; i < 12; i++) {
      const x = 40 + i * ((W - 80) / 11);
      g.lineStyle(3, OOZE, 0.1);
      g.lineBetween(x, 96, x + 8, 96 + 40 + ((i * 37) % 90));
      g.fillStyle(OOZE, 0.12);
      g.fillCircle(x + 8, 136 + ((i * 37) % 90), 5);
    }
  },

  look: { crest: 'none', pattern: 'drip', aura: 'bubbles', hands: 'wisp', torsoR: 38, eyes: 3, mouth: 'maw' },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'stalk', gimmick: 'stalkers', tint: 'sick' },
    { movement: 'rush', gimmick: 'shrink', tint: 'sick', look: { crest: 'tendrils', torsoR: 44, arms: 4 } },
  ],
};
