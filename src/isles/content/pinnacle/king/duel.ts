import type { BossEntry, SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { OBS, seam } from '../../../art/PinnacleArt';
import type { KingPart } from './contract';
import { ENTRY_MS, STAIR_FOOT, aegisShard, drawKing, entryGround, entryOver, hallLife, paintHall } from './duelArt';
import { aegis, execution, faultLines, kingsGuard, kneel, longReach, verdict } from './duelMoves';
import {
  BACK_HALF, DS, GUARD_FAN_R, GUARD_HALF, clampN, dist, fieldX, fieldY, float, live, place, resetDuel, shake,
  turnToward, wrap,
} from './duelState';

/**
 * The Obsidian King, Act II — THE CRACKED MASK (phase index 1, pool 1000).
 *
 * He rises from the throne, the mask cracks and the star shows through, he draws the sword out of
 * the throne's back, the Aegis folds down onto his arm, and he walks down the stair to meet you.
 *
 * A duel with a sword-and-shield king. THE SHIELD IS THE FIGHT: it faces you and turns slower than
 * you can circle him up close (never at range). Blows into its arc are turned, shots into it come
 * straight back; his back takes more. Openings are plain on the floor: the guard fan disappears and
 * a gold ring takes its place when the Aegis is thrown, when a missed lunge buries the sword, when
 * the Execution sets the blade in the glass. At half his pool the Aegis shatters into the floor and
 * he fights two-handed — faster, wider, every move changed, the mask split and starlight in it.
 *
 * Moves (`sig:p2-…`): THE VERDICT (three cuts / four with the crowning spin), THE LONG REACH (lunge;
 * a miss buries the blade), THE AEGIS (thrown and ricocheting / its shards recalled), FAULT LINES
 * (cracks race and erupt), KNEEL (rings that strike only the moving), THE KING'S GUARD (counter
 * stance), THE EXECUTION (a leap onto a ring that follows you). `p2-guard` is never cast: it is the
 * shield, the footwork and the shattering, running every frame of the act.
 */

// ── The guard: footwork, the turning shield, reflection, the break ─────

const guard = (tk: BossToolkit): SignatureMove => {
  let lastBlockSfx = -1e9, lastBackSfx = -1e9;
  const shieldPt = (): { x: number; y: number } => ({ x: DS.x + Math.cos(DS.guardA) * 46, y: DS.y + Math.sin(DS.guardA) * 46 });
  const rel = (): number => {
    const p = tk.player;
    return Math.abs(wrap(Math.atan2(p.y - DS.y, p.x - DS.x) - DS.guardA));
  };
  const guarding = (time: number): boolean => DS.shield === 'arm' && time >= DS.stuckUntil && DS.air < 0.3;

  /** At half the pool the Aegis goes: it bursts off his arm and its pieces stand in the floor. */
  const shatter = (time: number): void => {
    DS.shattered = true; DS.shield = 'gone'; DS.shatterAt = time; DS.staggerUntil = time + 1300;
    const s = shieldPt();
    DS.shards = [];
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < 6; i++) {
      const a = base + (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const d = 190 + Math.random() * 110;
      DS.shards.push({ x: fieldX(DS.x + Math.cos(a) * d), y: fieldY(DS.y + Math.sin(a) * d * 0.85), a, fromX: s.x, fromY: s.y, at: time, size: 20 + Math.random() * 8 });
    }
    tk.sfx('shield-break'); tk.sfx('crystal-shatter'); tk.sfx('boss-phase');
    shake(tk, 650, 0.015);
    tk.scene.cameras.main.flash(260, 255, 233, 176);
    tk.boom(s.x, s.y, 120, OBS.star);
    float(tk, DS.x, DS.y - 120, 'THE AEGIS BREAKS', '#ffe9b0');
  };

  return {
    durationMs: 0,
    tell: 'THE AEGIS',
    cast() { /* never in the cycle — the guard runs every frame of the act */ },
    update(time, dt) {
      if (!live(tk)) {
        if (DS.live && tk.phase !== 1 && tk.now - DS.seenAt > 300) resetDuel();
        return;
      }
      const p = tk.player;
      if (!DS.live) {
        DS.live = true;
        DS.x = tk.bossX; DS.y = tk.bossY;
        DS.guardA = Math.atan2(p.y - DS.y, p.x - DS.x);
      }
      if (!DS.shattered && DS.hpRatio <= 0.5 && DS.shield === 'arm' && !DS.drive) shatter(time);

      // The turn: slower than you can circle him close in; a commitment slows it, the parry quickens it.
      const want = Math.atan2(p.y - DS.y, p.x - DS.x);
      const base = DS.shattered ? 2.3 : tk.hard ? 1.0 : 0.85;
      const rate = time < DS.stuckUntil || time < DS.staggerUntil ? 0 : base * DS.turnMult;
      DS.guardA = turnToward(DS.guardA, want, rate * dt);

      // Footwork: he walks you down at a measured pace and keeps sword's reach.
      if (!DS.drive && time >= DS.stuckUntil && time >= DS.staggerUntil) {
        const d = dist(p.x, p.y, DS.x, DS.y);
        const keep = DS.shattered ? 115 : 150;
        const speed = (DS.shattered ? 124 : 90) * (DS.shield === 'thrown' ? 1.25 : 1);
        let mx = 0, my = 0;
        if (d > keep + 18) { mx = ((p.x - DS.x) / d) * speed; my = ((p.y - DS.y) / d) * speed; }
        else if (d < keep - 50 && d > 1) { mx = -((p.x - DS.x) / d) * speed * 0.45; my = -((p.y - DS.y) / d) * speed * 0.45; }
        const nx = fieldX(DS.x + mx * dt), ny = fieldY(DS.y + my * dt);
        DS.walk += Math.hypot(nx - DS.x, ny - DS.y);
        DS.x = nx; DS.y = ny;
      }
      place(tk, DS.x, DS.y);

      // Shots into the face of the shield come straight back.
      if (guarding(time)) {
        const s = shieldPt();
        const fx = Math.cos(DS.guardA), fy = Math.sin(DS.guardA);
        for (const h of tk.shotsNear(s.x, s.y, 64)) {
          if (h.owner !== 'player') continue;
          if ((h.x - DS.x) * fx + (h.y - DS.y) * fy < 16) continue;
          h.reflect(fx, fy);
          DS.blockAt = time; DS.blockX = h.x; DS.blockY = h.y;
          if (time - lastBlockSfx > 140) { lastBlockSfx = time; tk.sfx('shield-block'); }
          if (time - DS.saidTurnedAt > 6000) { DS.saidTurnedAt = time; float(tk, s.x, s.y - 50, 'TURNED', '#c9b0ff'); }
        }
      }
      DS.swing = DS.swing && time - DS.swing.at > DS.swing.ms + 260 ? null : DS.swing;
    },
    takenMult() {
      if (!live(tk) || !DS.live) return 1;
      const time = tk.now;
      if (DS.air > 0.3) return 0.25;
      if (time < DS.stuckUntil) return 1.6;
      if (time < DS.staggerUntil) return 1.4;
      const r = rel();
      const back = r > Math.PI - BACK_HALF;
      if (DS.shield === 'arm') return r < GUARD_HALF ? 0.15 : back ? 1.5 : 1;
      if (DS.shield === 'thrown') return back ? 1.5 : 1.25;
      return r > Math.PI - 0.8 ? 1.3 : 1;
    },
    onBossHurt() {
      if (!live(tk) || !DS.live) return;
      const time = tk.now;
      const r = rel();
      if (guarding(time) && r < GUARD_HALF) {
        const s = shieldPt();
        DS.blockAt = time; DS.blockX = s.x; DS.blockY = s.y;
        if (time - lastBlockSfx > 180) { lastBlockSfx = time; tk.sfx('shield-block'); }
        if (time - DS.saidTurnedAt > 6000) { DS.saidTurnedAt = time; float(tk, s.x, s.y - 50, 'TURNED', '#c9b0ff'); }
      } else if (r > Math.PI - BACK_HALF || time < DS.stuckUntil) {
        DS.backAt = time;
        if (time - lastBackSfx > 300) { lastBackSfx = time; tk.sfx('crit'); }
      }
    },
    drawGround(g, time) {
      if (!DS.live || !live(tk)) return;
      const t = time / 1000;
      const a = DS.guardA;
      // The Aegis's pieces in the floor (flying out to them first, as it breaks).
      for (const s of DS.shards) {
        const k = clampN((time - s.at) / 450, 0, 1);
        if (k < 1) {
          const x = s.fromX + (s.x - s.fromX) * k, y = s.fromY + (s.y - s.fromY) * k - Math.sin(k * Math.PI) * 60;
          g.fillStyle(OBS.star, 0.5); g.fillCircle(x, y, 6);
          g.lineStyle(2, OBS.star, 0.4); g.lineBetween(s.fromX + (s.x - s.fromX) * k * 0.7, s.fromY + (s.y - s.fromY) * k * 0.7, x, y);
        } else aegisShard(g, s.x, s.y, s.size, Math.cos(s.a) * 6, t);
      }
      if (DS.air > 0.3) return;
      const open = time < DS.stuckUntil || time < DS.staggerUntil;
      if (open || DS.shield === 'thrown') {
        // Bare: a gold ring all the way round — hit him from anywhere.
        const pulse = 0.5 + 0.5 * Math.sin(t * 8);
        g.lineStyle(open ? 3 : 2, OBS.star, (open ? 0.45 : 0.3) + pulse * 0.2);
        for (let i = 0; i < 16; i++) {
          const a0 = (i / 16) * Math.PI * 2 + t * 0.6;
          g.beginPath(); g.arc(DS.x, DS.y, 104, a0, a0 + 0.26, false); g.strokePath();
        }
        g.fillStyle(OBS.star, 0.04 + pulse * 0.03); g.fillCircle(DS.x, DS.y, 104);
        return;
      }
      if (DS.shield === 'arm') {
        // The guard: a violet fan before the shield — blows into it are turned.
        g.fillStyle(OBS.seam, 0.08 + DS.braced * 0.08); g.slice(DS.x, DS.y, GUARD_FAN_R, a - GUARD_HALF, a + GUARD_HALF, false); g.fillPath();
        g.lineStyle(3, OBS.seamLit, 0.45 + DS.braced * 0.4);
        g.beginPath(); g.arc(DS.x, DS.y, GUARD_FAN_R, a - GUARD_HALF, a + GUARD_HALF, false); g.strokePath();
        g.lineStyle(1.2, OBS.seamLit, 0.25);
        g.lineBetween(DS.x, DS.y, DS.x + Math.cos(a - GUARD_HALF) * GUARD_FAN_R, DS.y + Math.sin(a - GUARD_HALF) * GUARD_FAN_R);
        g.lineBetween(DS.x, DS.y, DS.x + Math.cos(a + GUARD_HALF) * GUARD_FAN_R, DS.y + Math.sin(a + GUARD_HALF) * GUARD_FAN_R);
      }
      // The open back: a faint gold arc behind him.
      const bh = DS.shield === 'arm' ? BACK_HALF : 0.8;
      g.fillStyle(OBS.star, 0.05); g.slice(DS.x, DS.y, 108, a + Math.PI - bh, a + Math.PI + bh, false); g.fillPath();
      g.lineStyle(2, OBS.star, 0.35);
      for (let i = 0; i < 5; i++) {
        const a0 = a + Math.PI - bh + (i / 5) * bh * 2;
        g.beginPath(); g.arc(DS.x, DS.y, 108, a0, a0 + (bh * 2) / 5 * 0.6, false); g.strokePath();
      }
      if (DS.shattered) {
        // Two-handed: the blade's guard shown as a thin violet line before him, no fan.
        seam(g, [{ x: DS.x + Math.cos(a - 0.6) * 96, y: DS.y + Math.sin(a - 0.6) * 96 }, { x: DS.x + Math.cos(a) * 104, y: DS.y + Math.sin(a) * 104 }, { x: DS.x + Math.cos(a + 0.6) * 96, y: DS.y + Math.sin(a + 0.6) * 96 }], 1, 0.4);
      }
    },
    onPhaseEnd() { resetDuel(); },
  };
};

// ── The entry ────────────────────────────────────────────────────────

/** The rising: ~7.6 s, from the seat to the foot of the stair. */
const ENTRY: BossEntry = {
  ms: ENTRY_MS,
  hideBody: true,
  swapAt: 0.01,
  bodyTo: { ...STAIR_FOOT },
  drawGround: entryGround,
  drawOver: entryOver,
  cues: [
    { at: 0, sfx: 'quake', shake: 0.006, ms: 1400 },
    { at: 800, sfx: 'crystal-shatter', flash: 0xffe9b0, ms: 160 },
    { at: 1000, sfx: 'heartbeat' },
    { at: 1550, sfx: 'stone-rise', shake: 0.004, ms: 500 },
    { at: 1700, say: 'Then I will stand. It has been a very long time.' },
    { at: 2550, sfx: 'clang' },
    { at: 3350, sfx: 'slash', flash: 0xc9b0ff, ms: 220, shake: 0.008 },
    { at: 3600, sfx: 'beam-fire' },
    { at: 3950, sfx: 'crystal-chime' },
    { at: 4300, say: 'The Aegis kept you out. Now it will keep you off.' },
    { at: 4800, sfx: 'shield-block', shake: 0.006, ms: 260 },
    { at: 5400, sfx: 'land', shake: 0.004, ms: 180 },
    { at: 5950, sfx: 'land', shake: 0.004, ms: 180 },
    { at: 6500, sfx: 'land', shake: 0.005, ms: 180 },
    { at: 6700, sfx: 'holy-chord' },
    { at: 7100, sfx: 'land', shake: 0.006, ms: 220 },
  ],
};

// ── The part ─────────────────────────────────────────────────────────

export const KING_DUEL: KingPart = {
  phase: {
    name: 'The Cracked Mask',
    line: 'A king should be met at the foot of his own stair. Come. Kneel or bleed.',
    hp: 1000,
    cycle: [
      'sig:p2-verdict', 'sig:p2-reach', 'sig:p2-aegis', 'sig:p2-fault', 'sig:p2-kneel',
      'sig:p2-verdict', 'sig:p2-guardstance', 'sig:p2-execution', 'sig:p2-reach', 'sig:p2-aegis',
      'sig:p2-kneel', 'sig:p2-fault', 'sig:p2-guardstance', 'sig:p2-execution',
    ],
    harass: ['h-rune', 'h-snipe'],
    restMs: 2200,
    restEnragedMs: 1350,
    harassMs: 4600,
    bodyR: 40,
    style: { movement: 'stalk', gimmick: 'none', tint: 'none', hideRig: true },
    entry: ENTRY,
  },
  signatures: {
    'p2-guard': guard,
    'p2-verdict': verdict,
    'p2-reach': longReach,
    'p2-aegis': aegis,
    'p2-fault': faultLines,
    'p2-kneel': kneel,
    'p2-guardstance': kingsGuard,
    'p2-execution': execution,
  },
  drawDecor(g, s) {
    DS.seenAt = s.t;
    DS.hpRatio = s.hpRatio;
    const stuck = s.t < DS.stuckUntil;
    const half = clampN((0.5 - s.hpRatio) / 0.5, 0, 1);
    drawKing(g, s.x, s.y, {
      t: s.t, face: DS.guardA, swordA: DS.swordA, pose: DS.pose, swing: DS.swing,
      shield: DS.shield === 'arm' ? (stuck ? 'low' : 'arm') : 'none',
      twoHanded: DS.shattered,
      crack: DS.shattered ? 1 : 0.62 + (1 - s.hpRatio) * 0.3,
      split: DS.shattered ? 0.35 + 0.65 * half : 0,
      crouch: DS.crouch, air: DS.air, braced: DS.braced, crownFlare: DS.crownFlare, walk: DS.walk,
      hurt: s.hurt, blockAt: DS.blockAt, backAt: DS.backAt,
      stuck: stuck ? { x: DS.stuckX, y: DS.stuckY } : undefined,
    });
  },
  drawArena(g, W, H) { paintHall(g, W, H); },
  drawBackdrop(g, s, W, H) {
    const broken = DS.shattered ? clampN((s.t - DS.shatterAt) / 1500, 0, 1) * (0.5 + 0.5 * clampN((0.5 - s.hpRatio) / 0.5, 0, 1)) : 0;
    hallLife(g, s.t, W, H, broken);
  },
};
