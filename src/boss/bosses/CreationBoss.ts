import Phaser from 'phaser';
import { SignatureMove, WorldBossDef } from '../framework/BossDefs';
import { BossToolkit } from '../framework/BossToolkit';

/**
 * The Architect — Sovereign of the Workshop. Creation world's boss: it drew
 * this room, and it is happy to revise it with you inside. Canon with the
 * creation challenge, 'The Architect' ("I drew this room. And your exit.").
 */

const FORGE = 0xcc6622;
const FORGE_LIT = 0xffcf8a;
const FORGE_DARK = 0x2a1a0c;
const BLUEPRINT = 0x7cd8ff;

// ── Signature: The Blueprint ─────────────────────────────────────────
// Blue ghost-lines sketch a figure around the player — then the build order
// executes and every drawn line becomes real at once.

const theBlueprint = (tk: BossToolkit): SignatureMove => {
  interface Line { x: number; y: number; angle: number }
  let draft: Line[] = [];
  let buildsAt = 0;
  return {
    durationMs: 2800,
    cast(time: number) {
      tk.sfx('curse-cast');
      const p = tk.player;
      const cx = tk.clampX(p.x, 140);
      const cy = tk.clampY(p.y, 150);
      // A triangle of lanes around the pocket, rotated randomly.
      const rot = Math.random() * Math.PI;
      draft = [0, 1, 2].map((i) => ({
        x: cx + Math.cos(rot + (Math.PI * 2 * i) / 3) * 95,
        y: cy + Math.sin(rot + (Math.PI * 2 * i) / 3) * 95,
        angle: rot + (Math.PI * 2 * i) / 3 + Math.PI / 2,
      }));
      buildsAt = time + 1600;
      tk.schedule(1600, () => {
        for (const l of draft) {
          tk.spawnLane({ x: l.x, y: l.y, angle: l.angle, halfW: 22, warnMs: 350, damage: 20 });
        }
        draft = [];
      });
    },
    drawGround(g, time) {
      if (draft.length === 0) return;
      const t = Phaser.Math.Clamp(1 - (buildsAt - time) / 1600, 0, 1);
      for (const l of draft) {
        const dx = Math.cos(l.angle) * 1400;
        const dy = Math.sin(l.angle) * 1400;
        // Dashed drafting line, inked in as the build approaches.
        g.lineStyle(1.5, BLUEPRINT, 0.35 + t * 0.5);
        const segs = 24;
        for (let sIdx = 0; sIdx < segs; sIdx += 2) {
          const t0 = sIdx / segs - 0.5;
          const t1 = (sIdx + 1) / segs - 0.5;
          g.lineBetween(l.x + dx * t0, l.y + dy * t0, l.x + dx * t1, l.y + dy * t1);
        }
        // Dimension ticks — pure drafting-table flavour.
        g.lineStyle(1, BLUEPRINT, 0.3);
        g.lineBetween(l.x - dy * 0.012, l.y + dx * 0.012, l.x + dy * 0.012, l.y - dx * 0.012);
      }
    },
    onPhaseEnd() { draft = []; },
  };
};

// ── Signature: Scaffolding ───────────────────────────────────────────
// Two turret-thralls are built on the spot — announced by scaffold frames so
// the player can contest the construction site.

const scaffolding = (tk: BossToolkit): SignatureMove => {
  interface Site { x: number; y: number; doneAt: number }
  let sites: Site[] = [];
  return {
    durationMs: 2200,
    cast(time: number) {
      tk.sfx('shield-up');
      sites = [];
      for (const side of [-1, 1]) {
        const site: Site = {
          x: tk.clampX(tk.bossX + side * 170, 90),
          y: tk.clampY(tk.bossY + Phaser.Math.Between(-60, 60), 130),
          doneAt: time + 1800,
        };
        sites.push(site);
        tk.schedule(1800, () => {
          tk.spawnAdd({
            x: site.x, y: site.y, hp: 60, speed: 0, damage: 9,
            ranged: true, maxAlive: 4,
          });
          tk.boom(site.x, site.y, 26, FORGE_LIT);
        });
      }
      tk.schedule(2200, () => { sites = []; });
    },
    drawGround(g, time) {
      for (const site of sites) {
        const t = Phaser.Math.Clamp(1 - (site.doneAt - time) / 1800, 0, 1);
        // Scaffold frame going up.
        g.lineStyle(2, FORGE, 0.5 + t * 0.4);
        const h = 10 + t * 24;
        g.strokeRect(site.x - 14, site.y - h, 28, h);
        g.lineBetween(site.x - 14, site.y - h, site.x + 14, site.y);
        g.lineBetween(site.x + 14, site.y - h, site.x - 14, site.y);
        g.fillStyle(BLUEPRINT, 0.3 + t * 0.4);
        g.fillCircle(site.x, site.y - h, 3);
      }
    },
    onPhaseEnd() { sites = []; },
  };
};

// ── Signature: Renovation ────────────────────────────────────────────
// "I drew this room." The walls are revised inward for five seconds — the
// habitable floor shrinks to a drawn rectangle, and everything outside the
// new plan is a demolition zone.

const RENO_MS = 5200;

const renovation = (tk: BossToolkit): SignatureMove => {
  let activeUntil = 0;
  let lastHitAt = 0;
  return {
    durationMs: 2000,
    cast(time: number) {
      tk.sfx('judgement');
      activeUntil = time + RENO_MS;
      lastHitAt = 0;
    },
    update(time: number) {
      if (time >= activeUntil) return;
      const t = Phaser.Math.Clamp(1 - (activeUntil - time) / RENO_MS, 0, 1);
      // Two phases: drawing in (first 40%), then enforcement.
      if (t < 0.4) return;
      const inset = 90 + Math.min(1, (t - 0.4) / 0.5) * 60;
      const p = tk.player;
      const outside = p.x < inset || p.x > tk.W - inset
        || p.y < 96 + inset * 0.5 || p.y > tk.H - inset * 0.6;
      if (p.active && outside && time - lastHitAt > 650) {
        lastHitAt = time;
        tk.hitPlayer(11, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (time >= activeUntil) return;
      const t = Phaser.Math.Clamp(1 - (activeUntil - time) / RENO_MS, 0, 1);
      const inset = t < 0.4 ? 90 * (t / 0.4) : 90 + Math.min(1, (t - 0.4) / 0.5) * 60;
      const x = inset;
      const y = 96 + inset * 0.5;
      const w = tk.W - inset * 2;
      const h = tk.H - y - inset * 0.6;
      const enforcing = t >= 0.4;
      // Outside the plan: demolition hatching.
      if (enforcing) {
        g.fillStyle(FORGE_DARK, 0.35);
        g.fillRect(0, 90, tk.W, y - 90);
        g.fillRect(0, y + h, tk.W, tk.H - y - h);
        g.fillRect(0, y, x, h);
        g.fillRect(x + w, y, tk.W - x - w, h);
      }
      // The revised wall line.
      g.lineStyle(2.5, enforcing ? FORGE_LIT : BLUEPRINT, enforcing ? 0.85 : 0.55);
      g.strokeRect(x, y, w, h);
      // Corner marks, drafting style.
      g.lineStyle(1.5, BLUEPRINT, 0.7);
      for (const [cxr, cyr] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]] as const) {
        g.lineBetween(cxr - 8, cyr, cxr + 8, cyr);
        g.lineBetween(cxr, cyr - 8, cxr, cyr + 8);
      }
    },
    onPhaseEnd() { activeUntil = 0; },
  };
};

export const CREATION_BOSS: WorldBossDef = {
  worldId: 'creation',
  name: 'The Architect',
  title: 'Sovereign of the Workshop',
  color: FORGE,
  colorLit: FORGE_LIT,
  colorDark: FORGE_DARK,
  accent: BLUEPRINT,

  intro: ['I drew this room. And your exit. One of those drawings is finished.'],
  banter: [
    'Every piece is already placed. You keep standing on the wrong ones.',
    'The Voice commissions ruins. I have standards about clients.',
    'Measure twice. Strike once. You will notice I am never off by much.',
    'You fight like an unreviewed draft.',
  ],
  defeatLine: 'THE DESIGN IS COMPLETE',

  phases: [
    {
      name: 'The Draft',
      line: 'First, the sketch. Try to hold still — it ruins the linework.',
      hp: 430,
      cycle: [
        'sig:blueprint', 'volley', 'sig:scaffold', 'lanes',
        'sig:renovation', 'minefield', 'radial', 'slamchain',
      ],
      harass: ['h-lane', 'h-mines', 'h-snipe'],
      restMs: 1100,
      harassMs: 3300,
    },
    {
      name: 'The Build',
      line: 'The sketch is approved. Construction is louder.',
      hp: 470,
      cycle: [
        'sig:renovation', 'sig:blueprint', 'quake', 'sig:scaffold',
        'barrage', 'sweep', 'spiral', 'minefield', 'lanes',
      ],
      harass: ['h-lane', 'h-mines', 'h-flak', 'h-snipe'],
      restMs: 950,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE FINAL BLUEPRINT IS OF YOU',
    extraPhase: {
      name: 'The Revision',
      line: 'The client wants it darker. The client is beneath the floor.',
      hp: 360,
      cycle: [
        'sig:blueprint', 'sig:renovation', 'sanctuary', 'sig:scaffold',
        'quake', 'sweep', 'spiral', 'barrage',
      ],
      harass: ['h-lane', 'h-mines', 'h-rune', 'h-flak'],
      restMs: 740,
      harassMs: 2300,
    },
  },

  signatures: {
    blueprint: theBlueprint,
    scaffold: scaffolding,
    renovation,
  },

  drawArena(g, W, H) {
    g.fillStyle(0x0e0a06, 0.5);
    g.fillRect(0, 0, W, H);
    // The workshop: drafting grid faint on the floor, tool racks at the rim.
    g.lineStyle(1, BLUEPRINT, 0.07);
    for (let x = 60; x < W - 40; x += 70) g.lineBetween(x, 100, x, H - 30);
    for (let y = 130; y < H - 30; y += 70) g.lineBetween(40, y, W - 40, y);
    for (let i = 0; i < 5; i++) {
      const x = 90 + ((W - 180) * i) / 4;
      g.fillStyle(FORGE_DARK, 0.9);
      g.fillRect(x - 20, H - 36, 40, 8);
      g.lineStyle(2, FORGE, 0.4);
      g.lineBetween(x - 12, H - 36, x - 12, H - 48);
      g.lineBetween(x + 4, H - 36, x + 4, H - 52);
      g.lineBetween(x + 12, H - 36, x + 12, H - 44);
    }
  },

  look: { crest: 'stack', pattern: 'grid', aura: 'sparks', hands: 'gauntlet', torsoR: 34, mouth: 'line' },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none' },
    { movement: 'hover', gimmick: 'wards', tint: 'gold' },
    { movement: 'stalk', gimmick: 'tremor', tint: 'pale', look: { crest: 'crown', arms: 4 } },
  ],
};
