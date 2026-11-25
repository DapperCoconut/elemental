import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from '../gimmicks/shared';
import { live, SIDES } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { CAP_TAN, PEAT_DARK, SPORE, SPORE_DARK, STEM, STEM_SHADE } from '../palette';
import { dist, hypha, sporeCloud } from '../sporeArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Cordyceps — Doctor Ergot, the Prince's old tutor.
 *
 * The tutor who, in the King's telling, taught young Mycel the lesson he governs by: *a fungus does
 * not kill the ant; it borrows it.* The cordyceps threads into its host, and when it is ready it
 * walks the host up the tallest stalk it can find and fruits out of its head.
 *
 * Blows sow the threads. Every hit Ergot lands fills your **infection**; every hit you land fills
 * his. Shake it off with a dash or a blink (each one tears threads loose). At full, the fungus
 * **takes your legs**: you are dragged toward the nearest fruiting stalk and your hands go clumsy.
 * Walk against it — you are stronger than the drag, just — and get clear before the stalk fruits,
 * because when it does it bursts over everyone round it.
 *
 * It takes him the same way. Fill his infection and the stalk has him: be anywhere else when it
 * goes. Halfway down the lesson sharpens — a fruiting stalk sheds a cloud that sows the threads
 * into anyone it touches, so a burst can start the next one.
 */

const ID = fallenId('spore', 'cordyceps');
const FULL = 100;
const SOW = 1.5;
const DECAY = 4;
const DASH_SHED = 32;
const DRAG = 130;
const FRUIT_MS = 2500;
const BURST_R = 112;
const CLOUD_MS = 1800;
const ROPE = 0xc49a5a;

interface Stalk { x: number; y: number; seed: number }
interface Taken { who: Side; stalk: number; at0: number; at: number }
interface Cloud { x: number; y: number; born: number; sown: Set<Side> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
  const stalks: Stalk[] = [
    { x: W * 0.2, y: top + (H - top) * 0.3 }, { x: W * 0.8, y: top + (H - top) * 0.28 }, { x: W * 0.5, y: top + (H - top) * 0.82 },
  ].map((p, i) => ({ ...p, seed: i * 5 + 2 }));
  const inf: Record<Side, number> = { p: 0, n: 0 };
  const wasDashing: Record<Side, boolean> = { p: false, n: false };
  let taken: Taken[] = [];
  let clouds: Cloud[] = [];
  let ruleHit = false;
  const late = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;
  const takenOf = (k: Side): Taken | undefined => taken.find((t) => t.who === k);

  const nearestStalk = (f: Fighter): number => {
    let best = 0;
    for (let i = 1; i < stalks.length; i++) if (dist(f.x, f.y, stalks[i].x, stalks[i].y) < dist(f.x, f.y, stalks[best].x, stalks[best].y)) best = i;
    return best;
  };

  const sow = (k: Side, amount: number, time: number): void => {
    if (takenOf(k) || amount <= 0) return;
    inf[k] = Math.min(FULL, inf[k] + amount);
    if (inf[k] < FULL) return;
    const f = fOf(k);
    const s = nearestStalk(f);
    taken.push({ who: k, stalk: s, at0: time, at: time + FRUIT_MS });
    ctx.sfx('curse-cast');
    if (k === 'p') { tk.pull(stalks[s].x, stalks[s].y, DRAG, FRUIT_MS - 200); ctx.silence(f, 1800); }
    else ctx.silence(f, 1800);
  };

  const burst = (t: Taken, time: number): void => {
    const s = stalks[t.stalk];
    ctx.sfx('spore');
    ctx.sfx('explosion-medium');
    inf[t.who] = 0;
    for (const k of SIDES) {
      const f = fOf(k);
      if (!live(f) || dist(f.x, f.y, s.x, s.y) > BURST_R + 16) continue;
      ruleHit = true;
      if (k === 'p') tk.hitPlayer(16, f.x, f.y); else ctx.hit(f, 20, f.x, f.y);
      ruleHit = false;
    }
    if (late()) clouds.push({ x: s.x, y: s.y, born: time, sown: new Set() });
  };

  return {
    update(time, dt) {
      for (const k of SIDES) {
        const f = fOf(k);
        const d = live(f) && ctx.dashing(f);
        if (d && !wasDashing[k] && !takenOf(k) && inf[k] > 0) { inf[k] = Math.max(0, inf[k] - DASH_SHED); ctx.sfx('snap-back'); }
        wasDashing[k] = d;
        if (!takenOf(k)) inf[k] = Math.max(0, inf[k] - DECAY * dt);
      }
      // A taken npc is walked: the drag is ours to apply (the toolkit's pull is the player's only).
      const tn = takenOf('n');
      if (tn && live(ctx.npc)) {
        const s = stalks[tn.stalk], n = ctx.npc;
        const d = dist(n.x, n.y, s.x, s.y);
        if (d > 30) ctx.nudge(n, ((s.x - n.x) / d) * DRAG * 0.75 * dt, ((s.y - n.y) / d) * DRAG * 0.75 * dt);
      }
      taken = taken.filter((t) => { if (time < t.at) return true; burst(t, time); return false; });
      // Late in the fight a burst leaves a sowing cloud.
      clouds = clouds.filter((c) => {
        for (const k of SIDES) {
          const f = fOf(k);
          if (c.sown.has(k) || !live(f) || dist(f.x, f.y, c.x, c.y) > BURST_R + 20) continue;
          c.sown.add(k);
          sow(k, 34, time);
        }
        return time - c.born < CLOUD_MS;
      });
    },

    onPlayerHurt(amount) { if (!ruleHit) sow('p', amount * SOW, ctx.scene.time.now); },
    onNpcHurt(amount) { if (!ruleHit) sow('n', amount * SOW, ctx.scene.time.now); },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      const mine = takenOf('n');
      // Taken: the fungus has the legs; it walks him to the stalk.
      if (mine) return stalks[mine.stalk];
      // A stalk about to fruit: well out of its reach.
      for (const t of taken) {
        const s = stalks[t.stalk];
        if (dist(n.x, n.y, s.x, s.y) < BURST_R + 60) {
          const a = Math.atan2(n.y - s.y, n.x - s.x);
          return { x: Phaser.Math.Clamp(s.x + Math.cos(a) * (BURST_R + 90), 50, W - 50), y: Phaser.Math.Clamp(s.y + Math.sin(a) * (BURST_R + 90), top + 40, H - 40) };
        }
      }
      // Badly infected: keep away from every stalk, so a taking starts far off.
      if (inf.n > 65) {
        const s = stalks[nearestStalk(n)];
        if (dist(n.x, n.y, s.x, s.y) < 280) {
          const a = Math.atan2(n.y - s.y, n.x - s.x);
          return { x: Phaser.Math.Clamp(s.x + Math.cos(a) * 320, 50, W - 50), y: Phaser.Math.Clamp(s.y + Math.sin(a) * 320, top + 40, H - 40) };
        }
      }
      // The player is nearly full: fight them near a stalk, so the drag is short.
      if (inf.p > 60) {
        const s = stalks[nearestStalk(p)];
        return { x: (s.x + p.x) / 2, y: (s.y + p.y) / 2 + 60 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const c of clouds) {
        const k = 1 - (time - c.born) / CLOUD_MS;
        sporeCloud(g, c.x, c.y, BURST_R + 20, SPORE, Phaser.Math.Clamp(k, 0, 1), time / 1000, 7);
      }
      for (const t of taken) {
        const s = stalks[t.stalk], f = fOf(t.who);
        const k = Phaser.Math.Clamp((time - t.at0) / (t.at - t.at0), 0, 1);
        // The burst's reach, filling like a clock, and the threads hauling the host.
        g.lineStyle(2, SPORE, 0.5 + 0.4 * k); g.strokeCircle(s.x, s.y, BURST_R);
        g.fillStyle(SPORE_DARK, 0.1 + 0.2 * k); g.fillCircle(s.x, s.y, BURST_R * k);
        g.beginPath(); g.lineStyle(4, SPORE, 0.9); g.arc(s.x, s.y, BURST_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
        if (live(f)) for (let i = 0; i < 3; i++) hypha(g, { x: f.x, y: f.y + 8 }, { x: s.x, y: s.y }, 1.5, ROPE, 0.8, s.seed + i * 13, 0.2);
      }
    },

    drawAir(g, time) {
      for (let i = 0; i < stalks.length; i++) {
        const t = taken.find((q) => q.stalk === i);
        const k = t ? Phaser.Math.Clamp((time - t.at0) / (t.at - t.at0), 0, 1) : 0;
        clubStalk(g, stalks[i], k, time);
      }
      // Threads on the infected — pale filaments climbing the body, thicker as it fills.
      for (const k of SIDES) {
        const f = fOf(k);
        if (!live(f) || inf[k] < 8) continue;
        const n = Math.ceil((inf[k] / FULL) * 7);
        for (let i = 0; i < n; i++) {
          const a = i * 0.9 + time / 1800;
          const fx = f.x + Math.cos(a) * 14, fy = f.y + 10;
          const tx = f.x + Math.cos(a + 0.6) * 8, ty = f.y - 6 - (inf[k] / FULL) * 22;
          g.lineStyle(1.2, ROPE, 0.85); g.lineBetween(fx, fy, (fx + tx) / 2 + Math.sin(a * 3) * 4, (fy + ty) / 2);
          g.lineBetween((fx + tx) / 2 + Math.sin(a * 3) * 4, (fy + ty) / 2, tx, ty);
          g.fillStyle(STEM, 0.9); g.fillCircle(tx, ty, 1.6);
        }
        if (takenOf(k)) { g.fillStyle(SPORE, 0.9); g.fillEllipse(f.x, f.y - 34, 6, 12); g.fillStyle(CAP_TAN, 1); g.fillCircle(f.x, f.y - 41, 3.5); }
      }
    },

    drawHud(g) {
      // Two infection gauges, shaped as club-fungus stalks filling from the foot.
      const y = 104;
      for (const [k, x] of [['p', W / 2 - 90], ['n', W / 2 + 30]] as [Side, number][]) {
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 4, y - 4, 68, 18, 6);
        g.fillStyle(PEAT_DARK, 1); g.fillRoundedRect(x, y, 60, 10, 4);
        g.fillStyle(takenOf(k) ? SPORE : ROPE, 1); g.fillRoundedRect(x, y, 60 * (inf[k] / FULL), 10, 4);
        g.fillStyle(k === 'p' ? 0xbfe4ff : 0xffa040, 1); g.fillCircle(x - 9, y + 5, 3.5);
      }
    },
  };
}

/**
 * A fruiting stalk of cordyceps: a tall orange club on a dead sedge stem, its head pocked with
 * perithecia, the base wrapped in mycelium. `k` 0–1 swells it as it readies to burst.
 */
function clubStalk(g: G, s: Stalk, k: number, time: number): void {
  const { x, y } = s;
  const sway = Math.sin(time / 700 + s.seed) * 2;
  const h = 64 + k * 16;
  shadow(g, x, y + 2, 46, 12, 0.4);
  g.fillStyle(dim(STEM_SHADE, 0.2), 1); g.fillEllipse(x, y, 40, 12);
  for (let i = 0; i < 6; i++) {
    const a = s.seed + i * 1.05;
    g.lineStyle(1, STEM, 0.6); g.lineBetween(x, y - 2, x + Math.cos(a) * 26, y + Math.sin(a) * 8);
  }
  g.lineStyle(6, 0x7a4a22, 1); g.lineBetween(x, y - 2, x + sway, y - h);
  g.lineStyle(2, lit(0x7a4a22, 0.3), 1); g.lineBetween(x - 1, y - 2, x + sway - 1, y - h);
  const cx = x + sway, cy = y - h - 12 - k * 4;
  if (k > 0) glow(g, cx, cy, 30 + k * 30, SPORE, 0.05 + k * 0.06, 3);
  g.fillStyle(0xa8541c, 1); g.fillEllipse(cx, cy, 16 + k * 10, 30 + k * 10);
  g.fillStyle(0xe2883a, 1); g.fillEllipse(cx - 2, cy - 2, 11 + k * 7, 25 + k * 8);
  for (let i = 0; i < 9; i++) {
    const py = cy - 10 + (i % 5) * 5, px = cx - 4 + Math.floor(i / 5) * 6 + ((i * 7) % 3) - 1;
    g.fillStyle(0x5a2a0c, 0.9); g.fillCircle(px, py, 1.3 + k * 0.6);
  }
  if (k > 0.6) {
    const shake = Math.sin(time / 30) * (k - 0.6) * 5;
    g.fillStyle(SPORE, 0.4 * k); g.fillCircle(cx + shake, cy - 18 - k * 6, 6 + k * 6);
  }
}

export const FALLEN_CORDYCEPS: GimmickDef = {
  id: ID,
  rules: 'Blows sow the fungus; dash to shake it off. Full, it drags you to a stalk that bursts — walk free in time. It takes him the same way.',
  make,
};
