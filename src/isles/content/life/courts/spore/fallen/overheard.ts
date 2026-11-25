import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from '../gimmicks/shared';
import { live, SIDES } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { CAP_TAN, CAP_TAN_LIT, GLOW, GLOW_DEEP, PEAT_DARK, PLANK_DARK, WISP } from '../palette';
import { along, dist, hypha, hyphaPoints } from '../sporeArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Overheard — Auricle Thrum, the Doorstep Listener.
 *
 * In the King's telling Thrum was the Prince's best ear above the floor: a quiet neighbour who
 * grew jelly-ear fungus on the stumps by every door and listened through it. Nothing said on the
 * Spore Court's doorsteps went unheard, and what was heard was *repeated* — Mycel's net carries a
 * whisper home and shouts it back at whoever said it.
 *
 * Four jelly-ears grow on stumps about the yard. Every ability anyone casts drops a **whisper** at
 * their feet, which crawls down a thread to the nearest ear. An ear that has heard three whispers
 * from one speaker **tells**: it shouts a line straight through that speaker, marked on the floor a
 * long beat first. Walk over your own whisper before it reaches the ear and it is gone — said and
 * forgotten. **Strike an ear** and it blurts out everything it holds at once, at everyone it
 * heard from: an ear full of Thrum's chatter is a weapon pointed at him.
 *
 * Halfway down the net grows keen: ears tell on two whispers, not three.
 */

const ID = fallenId('spore', 'overheard');
const CRAWL = 95;
const LANE_HALF = 26;
const TELL_MS = 900;
const MAX_WHISPERS = 22;

interface Ear { x: number; y: number; heard: Record<Side, number>; flashAt: number; seed: number; target: ReturnType<GimmickCtx['target']> | null }
interface Whisper { by: Side; ear: number; path: Pt[]; len: number; t: number; seed: number }
interface Shout { x: number; y: number; angle: number; at: number; at0: number; who: Side }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
  const mid = (top + H) / 2;
  const ears: Ear[] = [
    { x: W * 0.16, y: top + 90 }, { x: W * 0.84, y: top + 100 }, { x: W * 0.22, y: H - 70 }, { x: W * 0.8, y: H - 80 },
  ].map((p, i) => ({ ...p, heard: { p: 0, n: 0 }, flashAt: -1e9, seed: i * 3 + 1, target: null }));
  let whispers: Whisper[] = [];
  let shouts: Shout[] = [];
  const keen = (): number => (ctx.npc.hp < ctx.npc.maxHp * 0.5 ? 2 : 3);
  const npcShouts = (): Shout[] => shouts.filter((s) => s.who === 'n');

  const tell = (ear: Ear, who: Side, time: number): void => {
    const f = fOf(who);
    ear.heard[who] = 0;
    ear.flashAt = time;
    if (!live(f)) return;
    const angle = Math.atan2(f.y - ear.y, f.x - ear.x);
    ctx.sfx('screech');
    if (who === 'p') tk.spawnLane({ x: ear.x, y: ear.y, angle, halfW: LANE_HALF, warnMs: TELL_MS, damage: 12 });
    shouts.push({ x: ear.x, y: ear.y, angle, at: time + tk.warn(TELL_MS), at0: time, who });
  };

  for (const e of ears) {
    e.target = ctx.target({
      x: e.x, y: e.y - 18, r: 24,
      onStruck() {
        const t = ctx.scene.time.now;
        if (t - e.flashAt < 600) return;
        for (const k of SIDES) if (e.heard[k] > 0) tell(e, k, t);
      },
    });
  }

  const whisper = (by: Side): void => {
    const f = fOf(by);
    if (!live(f) || whispers.length >= MAX_WHISPERS) return;
    let best = 0;
    for (let i = 1; i < ears.length; i++) if (dist(f.x, f.y, ears[i].x, ears[i].y) < dist(f.x, f.y, ears[best].x, ears[best].y)) best = i;
    const seed = Math.floor(ctx.rng() * 997);
    const path = hyphaPoints({ x: f.x, y: f.y + 8 }, { x: ears[best].x, y: ears[best].y }, seed, 12);
    whispers.push({ by, ear: best, path, len: Math.max(1, dist(f.x, f.y, ears[best].x, ears[best].y)), t: 0, seed });
  };

  return {
    update(time, dt) {
      // Whispers crawl home; a speaker who walks over their own whisper un-says it.
      whispers = whispers.filter((w) => {
        w.t += (CRAWL * Math.min(dt, 0.05)) / w.len;
        const at = along(w.path, w.t);
        const f = fOf(w.by);
        if (w.t > 0.12 && live(f) && dist(f.x, f.y, at.x, at.y) < 26) { ctx.sfx('hush'); return false; }
        if (w.t < 1) return true;
        const ear = ears[w.ear];
        ear.heard[w.by]++;
        if (ear.heard[w.by] >= keen()) tell(ear, w.by, time);
        return false;
      });
      // Shouts at Thrum land on our own clock (the toolkit's lanes only ever hurt the player).
      shouts = shouts.filter((s) => {
        if (time < s.at) return true;
        if (s.who === 'n') {
          const n = ctx.npc;
          const d = Math.abs((n.x - s.x) * Math.sin(s.angle) - (n.y - s.y) * Math.cos(s.angle));
          const ahead = (n.x - s.x) * Math.cos(s.angle) + (n.y - s.y) * Math.sin(s.angle) > -20;
          if (live(n) && ahead && d < LANE_HALF + 20) ctx.hit(n, 14, n.x, n.y);
        }
        return time < s.at + 360;
      });
    },

    onPlayerCast() { whisper('p'); },
    onNpcCast() { whisper('n'); },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // A shout coming down on him: step off its line, sideways.
      for (const s of npcShouts()) {
        if (ctx.scene.time.now >= s.at) continue;
        const nx = -Math.sin(s.angle), ny = Math.cos(s.angle);
        const side = (n.x - s.x) * nx + (n.y - s.y) * ny >= 0 ? 1 : -1;
        return { x: Phaser.Math.Clamp(n.x + nx * side * 90, 50, W - 50), y: Phaser.Math.Clamp(n.y + ny * side * 90, top + 40, H - 40) };
      }
      // His own whisper is close: tread on it.
      const mine = whispers.filter((w) => w.by === 'n' && w.t > 0.15).map((w) => along(w.path, w.t + 0.05))
        .sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
      if (mine && dist(mine.x, mine.y, n.x, n.y) < 150) return mine;
      // An ear full of the player's whispers and none of his: go and make it talk.
      const ripe = ears.filter((e) => e.heard.p >= 1 && e.heard.n === 0 && dist(e.x, e.y, p.x, p.y) > 60)
        .sort((a, b) => b.heard.p - a.heard.p || dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0];
      if (ripe) {
        const a = Math.atan2(mid - ripe.y, W / 2 - ripe.x);
        return { x: ripe.x + Math.cos(a) * 70, y: ripe.y + Math.sin(a) * 70 };
      }
      return null;
    },

    drawGround(g, time) {
      // The threads from every ear run off under the floor; a whisper lights its own.
      for (const e of ears) {
        for (let i = 0; i < 3; i++) {
          const a = e.seed + i * 2.1;
          hypha(g, e, { x: e.x + Math.cos(a) * 130, y: e.y + Math.sin(a) * 90 }, 1, GLOW_DEEP, 0.35, e.seed * 7 + i, 0.05);
        }
      }
      for (const w of whispers) {
        const col = w.by === 'p' ? WISP : GLOW;
        g.lineStyle(1.2, dim(col, 0.3), 0.45);
        const pts = w.path;
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokePath();
      }
      // Thrum's shouts, marked on the floor by us (the player's are the toolkit's lanes).
      for (const s of npcShouts()) {
        const k = Phaser.Math.Clamp((time - s.at0) / Math.max(1, s.at - s.at0), 0, 1);
        const ex = s.x + Math.cos(s.angle) * 1100, ey = s.y + Math.sin(s.angle) * 1100;
        g.lineStyle(LANE_HALF * 2, GLOW, time >= s.at ? 0.35 : 0.06 + 0.12 * k); g.lineBetween(s.x, s.y, ex, ey);
        g.lineStyle(2, GLOW, 0.5 + 0.4 * k); g.lineBetween(s.x, s.y, ex, ey);
      }
    },

    drawAir(g, time) {
      for (const e of ears) jellyEar(g, e, time, keen());
      // The whispers themselves: a small breath-shaped mote with a tail.
      for (const w of whispers) {
        const at = along(w.path, w.t), back = along(w.path, Math.max(0, w.t - 0.06));
        const col = w.by === 'p' ? WISP : GLOW;
        g.lineStyle(3, col, 0.35); g.lineBetween(back.x, back.y, at.x, at.y);
        g.fillStyle(col, 0.9); g.fillCircle(at.x, at.y - 4, 4);
        g.fillStyle(0xffffff, 0.8); g.fillCircle(at.x - 1, at.y - 5, 1.5);
        const ph = (time / 140 + w.seed) % 3;
        g.lineStyle(1, col, 0.6);
        g.beginPath(); g.arc(at.x, at.y - 4, 7 + ph * 2, -0.8, 0.8); g.strokePath();
      }
      // Sound rolling off a telling ear along its line.
      for (const s of shouts) {
        if (time < s.at) continue;
        const ph = (time - s.at) / 360;
        for (let i = 0; i < 4; i++) {
          const r = 40 + (ph + i * 0.25) * 420;
          g.lineStyle(3 - i * 0.5, s.who === 'p' ? WISP : GLOW, 0.5 * (1 - ph));
          g.beginPath(); g.arc(s.x, s.y, r, s.angle - 0.12, s.angle + 0.12); g.strokePath();
        }
      }
    },

    drawHud(g) {
      // The ears' keenness: how many whispers make one tell, as ear pips.
      const x = W / 2 - 40, y = 106;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 8, 100, 22, 7);
      for (let i = 0; i < 3; i++) {
        const on = i < keen();
        g.fillStyle(on ? CAP_TAN_LIT : 0x3a3030, 1); g.fillEllipse(x + i * 22, y + 3, 12, 15);
        g.fillStyle(on ? CAP_TAN : 0x2a2222, 1); g.fillEllipse(x + i * 22 + 1, y + 4, 6, 8);
      }
      const mineIn = whispers.filter((w) => w.by === 'p').length;
      for (let i = 0; i < Math.min(6, mineIn); i++) { g.fillStyle(WISP, 0.9); g.fillCircle(x + 66 + (i % 3) * 7, y - 1 + Math.floor(i / 3) * 8, 2.5); }
    },

    destroy() { for (const e of ears) e.target?.remove(); },
  };
}

/**
 * A jelly-ear on its stump: a sawn stump with growth rings, and on its side a translucent brown
 * ear of fungus — lobed rim, veined bowl — with tally beads under it for who it has heard.
 */
function jellyEar(g: G, e: Ear, time: number, keen: number): void {
  const { x, y } = e;
  const hot = Phaser.Math.Clamp(1 - (time - e.flashAt) / 500, 0, 1);
  shadow(g, x, y + 2, 56, 16, 0.4);
  g.fillStyle(PLANK_DARK, 1); g.fillRoundedRect(x - 22, y - 26, 44, 28, 6);
  g.fillStyle(dim(PLANK_DARK, 0.3), 1); g.fillRect(x - 22, y - 6, 44, 8);
  g.fillStyle(lit(PLANK_DARK, 0.25), 1); g.fillEllipse(x, y - 26, 44, 14);
  for (let r = 4; r < 20; r += 5) { g.lineStyle(1, PLANK_DARK, 0.8); g.strokeEllipse(x, y - 26, r * 2.1, r * 0.66); }
  // The ear: two lobes and a fold, glistening.
  const ex = x + 6, ey = y - 30 - 6 * hot;
  glow(g, ex, ey, 30, GLOW, 0.03 + hot * 0.1, 3);
  g.fillStyle(dim(CAP_TAN, 0.35), 0.95); g.fillEllipse(ex, ey, 34 + hot * 8, 40 + hot * 8);
  g.fillStyle(CAP_TAN, 0.85); g.fillEllipse(ex - 2, ey - 2, 28 + hot * 6, 32 + hot * 6);
  g.fillStyle(dim(CAP_TAN, 0.5), 0.9); g.fillEllipse(ex + 2, ey + 3, 12, 18);
  g.lineStyle(1, CAP_TAN_LIT, 0.7);
  for (let i = 0; i < 4; i++) {
    g.beginPath(); g.arc(ex + 2, ey + 3, 7 + i * 3, Math.PI * 0.9 + i * 0.1, Math.PI * 1.7); g.strokePath();
  }
  g.fillStyle(0xffffff, 0.45); g.fillEllipse(ex - 8, ey - 10, 6, 3);
  // Tally beads: blue-white for the player's whispers, teal for Thrum's, out of `keen`.
  for (let i = 0; i < keen; i++) {
    g.fillStyle(i < e.heard.p ? WISP : PEAT_DARK, 1); g.fillCircle(x - 18 + i * 9, y + 12, 3.2);
    g.fillStyle(i < e.heard.n ? GLOW : PEAT_DARK, 1); g.fillCircle(x + 2 + i * 9, y + 12, 3.2);
  }
}

export const FALLEN_OVERHEARD: GimmickDef = {
  id: ID,
  rules: 'Every cast drops a whisper that crawls to an ear; three from one speaker and it shouts a line at them. Tread on yours. Strike an ear to make it tell.',
  make,
};
