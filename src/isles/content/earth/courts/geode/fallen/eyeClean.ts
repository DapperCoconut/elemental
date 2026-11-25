import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { cutGem } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CITRINE, FLAW, IRON, QUARTZ, QUARTZ_LIT, SUNSHAFT, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Eye-Clean — Ottoline Sabe, the Loupe Table's reader, who in the King's telling held the glass
 * over every household's stone and never once called one clean.
 *
 * Each fighter carries a stone, and its grade is how long they have gone untouched: every 2.2 s
 * without taking a real blow (3 or more) it grades up a step, to five — EYE-CLEAN. Every step
 * you hold makes your blows land 16% harder on the other, and an eye-clean stone speeds your
 * cooldowns too. One blow taken and the flaw shows: the grade falls to nothing. So the fight is
 * a streak — dodge to grow it, break his.
 *
 * Over the yard hangs Ottoline's great loupe on its cord. It drifts after whoever holds the
 * better stone (you, on a tie), then stops and focuses — the ring of light narrows for a second.
 * Whoever is under it when it reads: a graded stone loses two steps; an ungraded one is burned
 * by the gathered sun. Out-grade her and the loupe goes to read *her*. Halfway down she brings a
 * second loupe, one for each of you, and they focus faster.
 */

const ID = fallenId('geode', 'eye-clean');
const GRADE_MS = 2200;
const MAX_GRADE = 5;
const PER_GRADE = 0.16;
const FLAW_MIN = 3;
const LENS_R = 74;
const LENS_UP = 74;
const DRIFT_MS = 2600;
const BURN = 11;
const FLASH_MS = 380;

interface Stone { f: Fighter; grade: number; clean: number; brokeAt: number; brokeFrom: number; gradedAt: number }
interface Loupe { x: number; y: number; phase: 'drift' | 'focus' | 'flash'; until: number; owner: 'best' | 'player' | 'npc'; sway: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const ps: Stone = { f: player, grade: 0, clean: 0, brokeAt: -9999, brokeFrom: 0, gradedAt: -9999 };
  const ns: Stone = { f: npc, grade: 0, clean: 0, brokeAt: -9999, brokeFrom: 0, gradedAt: -9999 };
  const loupes: Loupe[] = [{ x: W / 2, y: (top + H) / 2, phase: 'drift', until: 0, owner: 'best', sway: 0 }];
  let started = false;
  let halved = false;

  const focusMs = () => (halved ? 820 : 1000);
  const speed = () => (halved ? 150 : 135);

  /** Whom a loupe is hunting this moment. */
  function quarry(l: Loupe): Stone {
    if (l.owner === 'player') return ps;
    if (l.owner === 'npc') return ns;
    return ns.grade > ps.grade ? ns : ps;
  }

  function flaw(s: Stone, amount: number): void {
    if (amount < FLAW_MIN) return;
    const time = ctx.scene.time.now;
    if (s.grade >= 2) { ctx.sfx('crystal-shatter'); s.brokeAt = time; s.brokeFrom = s.grade; }
    s.grade = 0; s.clean = 0;
  }

  function read(l: Loupe, time: number): void {
    ctx.sfx('light-beam');
    for (const s of [ps, ns]) {
      if (!alive(s.f) || dist(s.f.x, s.f.y, l.x, l.y) > LENS_R) continue;
      if (s.grade >= 1) {
        s.brokeFrom = s.grade; s.brokeAt = time;
        s.grade = Math.max(0, s.grade - 2); s.clean = 0;
        ctx.sfx('crystal-shatter');
      } else {
        ctx.hit(s.f, BURN, s.f.x, s.f.y);
        ctx.sfx('sizzle');
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; for (const l of loupes) l.until = time + DRIFT_MS + 1200; }
      // Grading: an untouched stone climbs.
      for (const s of [ps, ns]) {
        if (!alive(s.f)) continue;
        s.clean += dt * 1000;
        if (s.clean >= GRADE_MS && s.grade < MAX_GRADE) {
          s.grade++; s.clean = 0; s.gradedAt = time;
          ctx.sfx(s.grade === MAX_GRADE ? 'sparkle' : 'crystal-chime');
          if (s.grade === MAX_GRADE) ctx.flash(s.f.x, s.f.y - 40, QUARTZ_LIT);
        }
      }
      // The turn: a second loupe.
      if (!halved && alive(npc) && npc.hp < npc.maxHp * 0.5) {
        halved = true;
        loupes[0].owner = 'player';
        loupes.push({ x: npc.x, y: Math.max(top + 60, npc.y - 160), phase: 'drift', until: time + DRIFT_MS, owner: 'npc', sway: 1.7 });
        ctx.banner('OTTOLINE BRINGS A SECOND GLASS', '#fff4d8');
        ctx.sfx('prism');
      }
      for (const l of loupes) {
        l.sway += dt;
        if (l.phase === 'drift') {
          const q = quarry(l).f;
          const d = dist(l.x, l.y, q.x, q.y);
          if (d > 2) {
            const step = Math.min(d, speed() * dt);
            l.x += ((q.x - l.x) / d) * step; l.y += ((q.y - l.y) / d) * step;
          }
          if (time >= l.until) { l.phase = 'focus'; l.until = time + focusMs(); ctx.sfx('beam-charge'); }
        } else if (l.phase === 'focus') {
          if (time >= l.until) { read(l, time); l.phase = 'flash'; l.until = time + FLASH_MS; }
        } else if (time >= l.until) {
          l.phase = 'drift'; l.until = time + DRIFT_MS * (halved ? 0.85 : 1);
        }
        l.x = clamp(l.x, 50, W - 50); l.y = clamp(l.y, top + 40, H - 30);
      }
    },

    onPlayerHurt(amount) { flaw(ps, amount); },
    onNpcHurt(amount) { flaw(ns, amount); },

    playerTakenMult: () => 1 + PER_GRADE * ns.grade,
    npcTakenMult: () => 1 + PER_GRADE * ps.grade,
    playerCooldownRate: () => (ps.grade >= MAX_GRADE ? 1.3 : 1),
    npcCooldownRate: () => (ns.grade >= MAX_GRADE ? 1.3 : 1),

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Out from under a glass that is focusing.
      for (const l of loupes) {
        if (l.phase === 'flash') continue;
        const near = dist(npc.x, npc.y, l.x, l.y);
        const soon = l.phase === 'focus' || l.until - ctx.scene.time.now < 700;
        if (!soon || near > LENS_R + 34) continue;
        const a = near > 4 ? Math.atan2(npc.y - l.y, npc.x - l.x) : Math.atan2(player.y - l.y, player.x - l.x) + Math.PI;
        return { x: clamp(l.x + Math.cos(a) * (LENS_R + 70), 60, W - 60), y: clamp(l.y + Math.sin(a) * (LENS_R + 70), top + 50, H - 40) };
      }
      // Her stone is better and a glass is hunting her: keep the player between her and it.
      const hunting = loupes.find((l) => quarry(l) === ns && l.phase === 'drift');
      if (hunting && ns.grade >= 2) {
        const a = Math.atan2(player.y - hunting.y, player.x - hunting.x);
        return { x: clamp(player.x + Math.cos(a) * 150, 60, W - 60), y: clamp(player.y + Math.sin(a) * 150, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of loupes) drawSpot(g, l, time, focusMs());
    },

    drawAir(g, time) {
      for (const s of [ps, ns]) if (alive(s.f)) drawStone(g, s, time);
      for (const l of loupes) drawLoupe(g, l, time, top);
    },

    drawHud(g, time) {
      const y = top + 16;
      const row = (x: number, s: Stone, tag: number) => {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 13, 132, 26, 7);
        g.fillStyle(tag, 1); g.fillCircle(x, y, 4.5);
        for (let i = 0; i < MAX_GRADE; i++) {
          const gx = x + 20 + i * 21;
          if (i < s.grade) cutGem(g, gx, y, 7, s.grade >= MAX_GRADE ? QUARTZ_LIT : lit(QUARTZ, 0.1), 1);
          else {
            g.lineStyle(1.2, 0x6a6470, 1); g.strokeCircle(gx, y, 6.5);
            if (i === s.grade) {
              const k = clamp(s.clean / GRADE_MS, 0, 1);
              g.lineStyle(2, CITRINE, 0.9); g.beginPath(); g.arc(gx, y, 6.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
            }
          }
        }
        // A fresh flaw: a gold crack over the row.
        const since = time - s.brokeAt;
        if (since < 700) {
          g.lineStyle(2, FLAW, 1 - since / 700);
          g.lineBetween(x + 14, y - 8, x + 40, y + 2); g.lineBetween(x + 40, y + 2, x + 62, y - 6); g.lineBetween(x + 62, y - 6, x + 100, y + 7);
        }
      };
      row(W / 2 - 150, ps, 0xd8ccb0);
      row(W / 2 + 28, ns, 0xffa040);
    },
  };
}

/** The light a loupe throws: a soft disc while it drifts; a ring narrowing to a hot point as it focuses. */
function drawSpot(g: G, l: Loupe, time: number, focusMs: number): void {
  if (l.phase === 'drift') {
    g.fillStyle(SUNSHAFT, 0.09); g.fillCircle(l.x, l.y, LENS_R);
    g.lineStyle(1.5, BRASS_LIT, 0.28); g.strokeCircle(l.x, l.y, LENS_R);
    // Magnified grit: a few big grains seen through the glass.
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + l.sway * 0.2, r = LENS_R * (0.25 + ((i * 37) % 60) / 100);
      g.fillStyle(i % 2 ? 0xa49aa2 : 0xe6dfe2, 0.35); g.fillEllipse(l.x + Math.cos(a) * r, l.y + Math.sin(a) * r, 7, 5);
    }
  } else if (l.phase === 'focus') {
    const k = clamp(1 - (l.until - time) / focusMs, 0, 1);
    g.fillStyle(SUNSHAFT, 0.12 + k * 0.12); g.fillCircle(l.x, l.y, LENS_R);
    g.lineStyle(3, CITRINE, 0.5 + k * 0.5); g.strokeCircle(l.x, l.y, LENS_R * (1 - k * 0.9));
    g.lineStyle(1.5, BRASS_LIT, 0.8); g.strokeCircle(l.x, l.y, LENS_R);
    // Crosshair ticks, like the reticle in a grader's glass.
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.lineBetween(l.x + Math.cos(a) * LENS_R * 0.82, l.y + Math.sin(a) * LENS_R * 0.82, l.x + Math.cos(a) * LENS_R, l.y + Math.sin(a) * LENS_R);
    }
    glow(g, l.x, l.y, 10 + k * 14, CITRINE, 0.08 + k * 0.1, 3);
  } else {
    const k = clamp(1 - (l.until - time) / FLASH_MS, 0, 1);
    g.fillStyle(0xffffff, 0.55 * (1 - k)); g.fillCircle(l.x, l.y, LENS_R * (0.4 + k * 0.6));
    g.lineStyle(2, SUNSHAFT, 1 - k); g.strokeCircle(l.x, l.y, LENS_R);
  }
}

/** The great loupe itself: a brass-rimmed lens hung on a cord from the crack, hovering over its spot. */
function drawLoupe(g: G, l: Loupe, time: number, top: number): void {
  const x = l.x + Math.sin(l.sway * 1.3) * (l.phase === 'drift' ? 3 : 0.5);
  const y = l.y - LENS_UP;
  // The cord and its brass yoke.
  g.lineStyle(2, TIMBER_DARK, 0.9); g.lineBetween(x, y - 34, x + 6, top - 4);
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(x - 28, y - 18, x, y - 34); g.lineBetween(x + 28, y - 18, x, y - 34);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y - 34, 4);
  // The lens: thick rim, glass, two reflections and a graduated bezel.
  shadow(g, x, y + 12, 72, 12, 0.12);
  g.lineStyle(9, BRASS_DARK, 1); g.strokeEllipse(x, y, 66, 34);
  g.lineStyle(5, BRASS, 1); g.strokeEllipse(x, y, 66, 34);
  g.lineStyle(1.5, BRASS_LIT, 1); g.strokeEllipse(x, y - 1.5, 62, 30);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.lineStyle(1, IRON, 0.7);
    g.lineBetween(x + Math.cos(a) * 31, y + Math.sin(a) * 15.5, x + Math.cos(a) * 34, y + Math.sin(a) * 17);
  }
  const focusing = l.phase === 'focus';
  g.fillStyle(focusing ? lit(CITRINE, 0.5) : QUARTZ_LIT, focusing ? 0.42 : 0.22); g.fillEllipse(x, y, 58, 26);
  g.fillStyle(0xffffff, 0.55); g.fillEllipse(x - 14, y - 6, 16, 5);
  g.fillStyle(0xffffff, 0.25); g.fillEllipse(x + 12, y + 6, 9, 3);
  if (focusing) {
    // Light gathering down the cone to the floor.
    g.fillStyle(SUNSHAFT, 0.1 + Math.sin(time / 60) * 0.04);
    g.fillTriangle(x - 28, y + 4, x + 28, y + 4, l.x, l.y);
  }
}

/** The stone a fighter carries, hovering over their head: bigger and clearer with each step. */
function drawStone(g: G, s: Stone, time: number): void {
  const x = s.f.x, y = s.f.y - 66;
  if (s.grade > 0) {
    const r = 4 + s.grade * 1.4;
    const col = s.grade >= MAX_GRADE ? QUARTZ_LIT : dim(QUARTZ, 0.25 - s.grade * 0.04);
    if (s.grade >= MAX_GRADE) {
      glow(g, x, y, 20, SUNSHAFT, 0.08, 3);
      for (let i = 0; i < 4; i++) {
        const a = time / 600 + i * Math.PI / 2;
        g.lineStyle(1.2, 0xffffff, 0.7); g.lineBetween(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3), x + Math.cos(a) * (r + 11), y + Math.sin(a) * (r + 11));
      }
    }
    cutGem(g, x, y + Math.sin(time / 300) * 1.5, r, col, 0.95);
    // Inclusions fade out as it grades: dark flecks inside a cloudy stone.
    for (let i = 0; i < MAX_GRADE - s.grade; i++) {
      g.fillStyle(0x3a3440, 0.5); g.fillCircle(x - r * 0.4 + i * r * 0.22, y + (i % 2 ? 1 : -1) * r * 0.2, 1);
    }
  }
  const since = time - s.brokeAt;
  if (since < 650) {
    // The stone breaking: halves falling with a gold flaw line.
    const k = since / 650;
    const r = 4 + s.brokeFrom * 1.4;
    for (const side of [-1, 1]) {
      cutGem(g, x + side * (3 + k * 14), y + k * 22, r * 0.7, QUARTZ, 1 - k);
    }
    g.lineStyle(2, FLAW, 1 - k); g.lineBetween(x - 2, y - r - 2, x + 3, y); g.lineBetween(x + 3, y, x - 1, y + r + 2);
  }
}

export const FALLEN_EYE_CLEAN: GimmickDef = {
  id: ID,
  rules: 'Untouched, your stone grades up: each step hits harder. One blow and it breaks. The loupe reads the better stone: lose two steps, or burn.',
  make,
};
