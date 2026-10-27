import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { O, drawBone, drawCandle, drawRib, drawSkull, drawTithePlate, jit, segDist } from './util';

/**
 * PRINCE SINEW — the Empress's fifth child, master of the Ossuary Court.
 *
 * Sinew was born crooked, and his mother does not tolerate a crooked plant: she staked him as a
 * boy, as a gardener stakes a sapling, and when the stake was not enough she strung him. He has
 * stood straight ever since on a cross of ligament held over his head — the court calls it the
 * Rood — and he governs the place the garden puts its dead. The pruned who die in the hedges come
 * down to him to be composted; the useful bones he keeps. He strings them too. Nothing, he says
 * very gently, goes to waste.
 *
 * Phase one, *Marionette*, he dangles from the Rood and dances: femur javelins thrown into the
 * floor and the ligaments between them snapped taut, a ligament whip that unrolls along a curve and
 * cracks at the tip, and a danse macabre — yanked up on his strings and dropped on you three times.
 * Phase two, *Unstrung*, the strings are cut and he comes apart: his bones fly out from him and
 * hang, then find him again wherever he has put himself back together; a ribcage springs up round
 * you and closes. On hard, *The Ossuary Throne*: he sits, and the walls of skulls wake — they look
 * at you and spit their teeth, and the vault drops skulls that land and roll.
 *
 * His silhouette is the Rood: a wooden cross floating over him with red strings to his crown and
 * hands. Unstrung, the strings hang cut and the cross hangs broken; enthroned, a fan of skulls
 * rises behind him like a peacock's tail.
 */

const BONE = 0xd8ccb0;
const BONE_LIT = 0xfaf2de;
const BONE_DARK = 0x4a3436;
const SINEW = 0xd8505a;

const FIELD_TOP = 96;

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** The skull niches along the throne room's walls — shared by the floor and The Walls Wake. */
function skullWall(W: number, H: number): { x: number; y: number; wall: 'l' | 'r' | 't' }[] {
  const out: { x: number; y: number; wall: 'l' | 'r' | 't' }[] = [];
  for (let y = FIELD_TOP + 50; y < H - 30; y += 74) { out.push({ x: 20, y, wall: 'l' }); out.push({ x: W - 20, y, wall: 'r' }); }
  for (let x = 110; x < W - 90; x += 92) out.push({ x, y: FIELD_TOP + 16, wall: 't' });
  return out;
}

// ── Signature: Bone Spears ───────────────────────────────────────────
// He flings femur javelins high over the room. Each lands where a cross is scratched on the floor
// (most round you, one right on you) and stands there like a stake. When the last is in, red
// ligaments draw out between neighbouring stakes — and snap taut. Stay off the cross while it is
// marked, then off the lines while they redden.

interface Javelin { ox: number; oy: number; tx: number; ty: number; at: number; landAt: number; landed: boolean }

const javelins = (tk: BossToolkit): SignatureMove => {
  let js: Javelin[] = [];
  let lineAt = 0, snapAt = 0, endAt = 0, snapped = false;
  return {
    durationMs: 3000,
    windupMs: 650,
    tell: 'BONE SPEARS',
    gesture: 'raise',
    cast(time: number) {
      js = [];
      snapped = false;
      const n = tk.hard ? 6 : 5;
      const p = tk.player;
      const gap = 230;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const r = i === 0 ? 0 : 90 + Math.random() * 150;
        const tx = tk.clampX(p.x + Math.cos(a) * r, 60), ty = tk.clampY(p.y + Math.sin(a) * r * 0.8, 60);
        const at = time + i * gap;
        js.push({ ox: tk.bossX, oy: tk.bossY - 30, tx, ty, at, landAt: at + tk.warn(950), landed: false });
      }
      const last = js[js.length - 1].landAt;
      lineAt = last + 150;
      snapAt = lineAt + tk.warn(850);
      endAt = snapAt + 1400;
      tk.sfx('whoosh');
    },
    update(time: number) {
      if (!js.length) return;
      const p = tk.player;
      for (const j of js) {
        if (j.landed || time < j.landAt) continue;
        j.landed = true;
        tk.sfx('stone-slam');
        if (Math.hypot(p.x - j.tx, p.y - j.ty) < 34) tk.hitPlayer(15, p.x, p.y);
      }
      if (!snapped && time >= snapAt) {
        snapped = true;
        tk.sfx('whip');
        for (let i = 0; i < js.length - 1; i++) {
          const a = js[i], b = js[i + 1];
          if (segDist(p.x, p.y, a.tx, a.ty, b.tx, b.ty) < 14) { tk.hitPlayer(12, p.x, p.y); tk.slowPlayer(0.7, 500); break; }
        }
      }
      if (time > endAt) js = [];
    },
    drawGround(g, time) {
      for (const j of js) {
        if (time < j.at) continue;
        if (!j.landed) {
          // The scratched cross and a ring closing on it.
          const k = clamp((time - j.at) / (j.landAt - j.at), 0, 1);
          g.lineStyle(3, SINEW, 0.5 + k * 0.4);
          g.lineBetween(j.tx - 12, j.ty - 12, j.tx + 12, j.ty + 12); g.lineBetween(j.tx + 12, j.ty - 12, j.tx - 12, j.ty + 12);
          g.lineStyle(2, BONE_LIT, 0.6); g.strokeCircle(j.tx, j.ty, 34 + (1 - k) * 40);
          g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillEllipse(j.tx, j.ty + 4, 20 + k * 16, 8 + k * 5);
        } else {
          g.fillStyle(0x000000, 0.3); g.fillEllipse(j.tx, j.ty + 3, 18, 6);
          // A crater of thrown-up loam.
          g.lineStyle(1.5, dim(BONE, 0.5), 0.6); g.strokeEllipse(j.tx, j.ty + 2, 26, 9);
        }
      }
      if (time >= lineAt && js.length) {
        const k = clamp((time - lineAt) / (snapAt - lineAt), 0, 1);
        for (let i = 0; i < js.length - 1; i++) {
          const a = js[i], b = js[i + 1];
          if (time < snapAt) {
            // Slack ligament: a sagging red line that tightens and reddens.
            const sag = 22 * (1 - k);
            g.lineStyle(1 + k * 3, SINEW, 0.3 + k * 0.55);
            g.beginPath(); g.moveTo(a.tx, a.ty - 30);
            for (let s = 1; s <= 10; s++) {
              const u = s / 10;
              g.lineTo(a.tx + (b.tx - a.tx) * u, a.ty - 30 + (b.ty - a.ty) * u + Math.sin(u * Math.PI) * sag);
            }
            g.strokePath();
          } else {
            const f = clamp(1 - (time - snapAt) / 600, 0, 1);
            g.lineStyle(4, lit(SINEW, 0.3), f); g.lineBetween(a.tx, a.ty - 30, b.tx, b.ty - 30);
            g.lineStyle(14, SINEW, 0.15 * f); g.lineBetween(a.tx, a.ty, b.tx, b.ty);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const j of js) {
        if (time < j.at) continue;
        if (!j.landed) {
          const k = clamp((time - j.at) / (j.landAt - j.at), 0, 1);
          const x = j.ox + (j.tx - j.ox) * k;
          const y = j.oy + (j.ty - 30 - j.oy) * k - Math.sin(k * Math.PI) * 170;
          // Pointing down its own flight path.
          const dx = (j.tx - j.ox), dy = (j.ty - j.oy) - Math.cos(k * Math.PI) * 170 * Math.PI;
          const a = Math.atan2(dy, dx);
          drawBone(g, x - Math.cos(a) * 20, y - Math.sin(a) * 20, x + Math.cos(a) * 20, y + Math.sin(a) * 20, 5, BONE, 1);
          g.fillStyle(SINEW, 1); g.fillTriangle(x + Math.cos(a) * 20 - Math.sin(a) * 4, y + Math.sin(a) * 20 + Math.cos(a) * 4, x + Math.cos(a) * 20 + Math.sin(a) * 4, y + Math.sin(a) * 20 - Math.cos(a) * 4, x + Math.cos(a) * 30, y + Math.sin(a) * 30);
        } else {
          // Stuck upright in the floor, still quivering for a moment.
          const q = Math.max(0, 1 - (time - j.landAt) / 400) * Math.sin(time / 25) * 3;
          drawBone(g, j.tx, j.ty, j.tx + q, j.ty - 38, 5, BONE, 1);
        }
      }
    },
    onPhaseEnd() { js = []; },
  };
};

// ── Signature: Ligament Whip ─────────────────────────────────────────
// He uncoils a whip of red ligament with a bone hook at the end. Its path is drawn first — a curve
// out of his hand that swings wide to one side and comes back across you. Then it lashes: it
// unrolls along that curve from his hand to the tip, and the tip cracks. Two lashes, from opposite
// sides; step off the curve, and above all keep clear of the hook.

interface Lash { bx: number; by: number; cx: number; cy: number; tx: number; ty: number; showAt: number; goAt: number; hit: boolean; cracked: boolean }

const LASH_MS = 240;

const bez = (l: Lash, u: number): { x: number; y: number } => ({
  x: (1 - u) * (1 - u) * l.bx + 2 * (1 - u) * u * l.cx + u * u * l.tx,
  y: (1 - u) * (1 - u) * l.by + 2 * (1 - u) * u * l.cy + u * u * l.ty,
});

const whip = (tk: BossToolkit): SignatureMove => {
  let lashes: Lash[] = [];
  return {
    durationMs: 2600,
    windupMs: 600,
    tell: 'LIGAMENT WHIP',
    gesture: 'sweep',
    cast() {
      lashes = [];
      const count = tk.hard ? 3 : 2;
      let side = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < count; i++) {
        tk.schedule(i * 800, () => {
          const p = tk.player;
          const bx = tk.bossX, by = tk.bossY;
          const a = Math.atan2(p.y - by, p.x - bx);
          // Reach a little past you, swung out to one side.
          const L = Phaser.Math.Clamp(Math.hypot(p.x - bx, p.y - by) + 90, 260, 520);
          const tx = tk.clampX(bx + Math.cos(a) * L, 30), ty = Phaser.Math.Clamp(by + Math.sin(a) * L, FIELD_TOP + 10, tk.H - 20);
          const nx = -Math.sin(a) * side, ny = Math.cos(a) * side;
          const cx = bx + Math.cos(a) * L * 0.5 + nx * 190, cy = by + Math.sin(a) * L * 0.5 + ny * 190;
          lashes.push({ bx, by, cx, cy, tx, ty, showAt: tk.now, goAt: tk.now + tk.warn(850), hit: false, cracked: false });
          side = -side;
          tk.sfx('whoosh');
        });
      }
    },
    update(time: number) {
      const p = tk.player;
      for (const l of lashes) {
        if (time < l.goAt) continue;
        const k = clamp((time - l.goAt) / LASH_MS, 0, 1);
        if (!l.hit && k > 0) {
          // The unrolled part of the whip.
          let prev = bez(l, 0);
          for (let s = 1; s <= 16; s++) {
            const u = (s / 16) * k;
            const q = bez(l, u);
            if (segDist(p.x, p.y, prev.x, prev.y, q.x, q.y) < 20) { l.hit = true; tk.hitPlayer(13, p.x, p.y); tk.sfx('whip'); break; }
            prev = q;
          }
        }
        if (!l.cracked && k >= 1) {
          l.cracked = true;
          tk.sfx('snap-back');
          if (Math.hypot(p.x - l.tx, p.y - l.ty) < 50) { tk.hitPlayer(19, p.x, p.y); tk.slowPlayer(0.6, 700); }
        }
      }
      lashes = lashes.filter((l) => time < l.goAt + LASH_MS + 700);
    },
    drawGround(g, time) {
      for (const l of lashes) {
        if (time >= l.goAt) continue;
        const k = clamp((time - l.showAt) / (l.goAt - l.showAt), 0, 1);
        // The path: red dashes along the curve, filling in from the hand; a ring where the hook cracks.
        for (let s = 0; s < 30; s++) {
          const u = s / 30;
          if (u > k * 1.15) break;
          const q = bez(l, u), q2 = bez(l, u + 0.018);
          g.lineStyle(3 + k * 3, SINEW, 0.35 + k * 0.35); g.lineBetween(q.x, q.y, q2.x, q2.y);
        }
        g.lineStyle(2, SINEW, 0.5 + k * 0.4); g.strokeCircle(l.tx, l.ty, 50);
        g.fillStyle(SINEW, 0.08 + k * 0.14); g.fillCircle(l.tx, l.ty, 50);
      }
    },
    drawAir(g, time) {
      for (const l of lashes) {
        if (time < l.goAt) continue;
        const k = clamp((time - l.goAt) / LASH_MS, 0, 1);
        const fade = clamp(1 - (time - l.goAt - LASH_MS) / 600, 0, 1);
        // The rope: a fat red ligament with paler fibres twisting along it, thinning toward the end.
        let prev = bez(l, 0);
        for (let s = 1; s <= 24; s++) {
          const u = (s / 24) * k;
          const q = bez(l, u);
          const w = 9 - u * 6;
          g.lineStyle(w + 2, dim(SINEW, 0.5), fade); g.lineBetween(prev.x, prev.y, q.x, q.y);
          g.lineStyle(w, SINEW, fade); g.lineBetween(prev.x, prev.y, q.x, q.y);
          if (s % 2 === 0) { g.lineStyle(1, lit(SINEW, 0.45), fade); g.lineBetween(prev.x + 1, prev.y - 1, q.x - 1, q.y + 1); }
          prev = q;
        }
        // The bone hook at the tip.
        const tip = bez(l, k), back = bez(l, Math.max(0, k - 0.05));
        const a = Math.atan2(tip.y - back.y, tip.x - back.x);
        drawBone(g, tip.x - Math.cos(a) * 8, tip.y - Math.sin(a) * 8, tip.x + Math.cos(a) * 6, tip.y + Math.sin(a) * 6, 4, BONE, fade);
        g.lineStyle(3, BONE, fade);
        g.beginPath(); g.arc(tip.x + Math.cos(a) * 6, tip.y + Math.sin(a) * 6, 7, a - Math.PI / 2, a + Math.PI * 0.8, false); g.strokePath();
        if (k >= 1) {
          // The crack: a white star at the tip, gone in a blink.
          const c = clamp(1 - (time - l.goAt - LASH_MS) / 260, 0, 1);
          if (c > 0) {
            g.fillStyle(0xffffff, 0.8 * c); g.fillCircle(l.tx, l.ty, 16 + (1 - c) * 30);
            for (let i = 0; i < 8; i++) {
              const sa = (i / 8) * Math.PI * 2;
              g.lineStyle(2, BONE_LIT, c); g.lineBetween(l.tx + Math.cos(sa) * 14, l.ty + Math.sin(sa) * 14, l.tx + Math.cos(sa) * (30 + (1 - c) * 30), l.ty + Math.sin(sa) * (30 + (1 - c) * 30));
            }
          }
        }
      }
    },
    onPhaseEnd() { lashes = []; },
  };
};

// ── Signature: Danse Macabre ─────────────────────────────────────────
// The Rood jerks and he is hauled up on his strings, swung across the room and dropped — three
// times, each time onto where you were when he left the floor. The landing is ringed while he is in
// the air, and when he hits, knucklebones scatter out from him in a star.

interface Hop { fx: number; fy: number; tx: number; ty: number; startAt: number; landAt: number; landed: boolean }
interface Knuckle { x: number; y: number; a: number; at: number; alive: boolean }

const HOP_R = 80;
const KNUCKLE_SPEED = 270;

const hop = (tk: BossToolkit): SignatureMove => {
  let hops: Hop[] = [];
  let ks: Knuckle[] = [];
  let busyUntil = 0;
  let planned = 0;
  const travel = (): number => tk.warn(700);
  const plan = (fromX: number, fromY: number, at: number): Hop => {
    const p = tk.player;
    return { fx: fromX, fy: fromY, tx: tk.clampX(p.x, 90), ty: tk.clampY(p.y, 90), startAt: at, landAt: at + travel(), landed: false };
  };
  return {
    durationMs: 3400,
    windupMs: 700,
    tell: 'DANSE MACABRE',
    gesture: 'raise',
    locksBody: true,
    cast(time: number) {
      hops = [plan(tk.bossX, tk.bossY, time)];
      planned = 1;
      ks = [];
      busyUntil = time + 3400;
      tk.sfx('whoosh');
    },
    update(time: number) {
      const p = tk.player;
      const total = 3;
      for (const h of hops) {
        if (time < h.startAt) continue;
        if (!h.landed) {
          const k = clamp((time - h.startAt) / (h.landAt - h.startAt), 0, 1);
          // Up on the strings, across, and down.
          const lift = Math.sin(k * Math.PI) * 120;
          tk.host.setBossPos(h.fx + (h.tx - h.fx) * k, h.fy + (h.ty - h.fy) * k - lift);
          if (k >= 1) {
            h.landed = true;
            tk.host.setBossPos(h.tx, h.ty);
            tk.sfx('stone-slam');
            if (Math.hypot(p.x - h.tx, p.y - h.ty) < HOP_R) tk.hitPlayer(18, p.x, p.y);
            const n = tk.hard ? 10 : 8;
            const rot = Math.random() * Math.PI;
            for (let i = 0; i < n; i++) ks.push({ x: h.tx, y: h.ty, a: rot + (i / n) * Math.PI * 2, at: time, alive: true });
            if (planned < total && time < busyUntil) { planned++; hops.push(plan(h.tx, h.ty, time + 260)); }
          }
        }
      }
      for (const kn of ks) {
        if (!kn.alive) continue;
        const run = ((time - kn.at) / 1000) * KNUCKLE_SPEED;
        if (run > 330) { kn.alive = false; continue; }
        const x = kn.x + Math.cos(kn.a) * run, y = kn.y + Math.sin(kn.a) * run;
        if (Math.hypot(p.x - x, p.y - y) < 16) { kn.alive = false; tk.hitPlayer(8, p.x, p.y); }
      }
      ks = ks.filter((kn) => kn.alive);
      hops = hops.filter((h) => !h.landed || time < h.landAt + 500);
    },
    drawGround(g, time) {
      for (const h of hops) {
        if (time < h.startAt) continue;
        if (!h.landed) {
          const k = clamp((time - h.startAt) / (h.landAt - h.startAt), 0, 1);
          g.fillStyle(0x000000, 0.12 + k * 0.28); g.fillEllipse(h.tx, h.ty + 10, HOP_R * (0.6 + k * 0.6), HOP_R * 0.4 * (0.6 + k * 0.6));
          g.lineStyle(3, SINEW, 0.5 + k * 0.4); g.strokeCircle(h.tx, h.ty, HOP_R);
          // Strings' shadows: two lines down to the landing from the top of the room.
          g.lineStyle(1, SINEW, 0.3 + k * 0.3); g.lineBetween(h.tx - 26, FIELD_TOP, h.tx - 26, h.ty); g.lineBetween(h.tx + 26, FIELD_TOP, h.tx + 26, h.ty);
        } else {
          const f = clamp(1 - (time - h.landAt) / 500, 0, 1);
          g.lineStyle(5, BONE_LIT, f); g.strokeCircle(h.tx, h.ty, HOP_R * (1.1 - f * 0.3));
        }
      }
    },
    drawAir(g, time) {
      for (const kn of ks) {
        const run = ((time - kn.at) / 1000) * KNUCKLE_SPEED;
        const x = kn.x + Math.cos(kn.a) * run, y = kn.y + Math.sin(kn.a) * run;
        const spin = time / 50 + kn.a * 3;
        drawBone(g, x - Math.cos(spin) * 6, y - Math.sin(spin) * 3, x + Math.cos(spin) * 6, y + Math.sin(spin) * 3, 3.5, BONE, 1);
      }
      // While he is up, the strings he hangs from are taut to the top of the room.
      for (const h of hops) {
        if (h.landed || time < h.startAt) continue;
        g.lineStyle(1.5, SINEW, 0.85);
        g.lineBetween(tk.bossX - 18, tk.bossY - 20, tk.bossX - 26, FIELD_TOP - 10);
        g.lineBetween(tk.bossX + 18, tk.bossY - 20, tk.bossX + 26, FIELD_TOP - 10);
        g.lineBetween(tk.bossX, tk.bossY - 34, tk.bossX, FIELD_TOP - 10);
      }
    },
    onPhaseEnd() { hops = []; ks = []; },
  };
};

// ── Signature: Unstrung ──────────────────────────────────────────────
// He comes apart. His bones fly out from him along straight rays and hang in a ring, turning, while
// he pulls himself together somewhere else. Then each bone finds him — a line from where it hangs
// to where he now stands is drawn, and down it the bone flies home. Two passes: out, and back.

interface Loose { x0: number; y0: number; a: number; r: number; hx: number; hy: number; outHit: boolean; backHit: boolean; seed: number; kind: number }

const OUT_SPEED = 560;

const scatter = (tk: BossToolkit): SignatureMove => {
  let bones: Loose[] = [];
  let t0 = 0, hangAt = 0, moveAt = 0, backWarn = 0, backAt = 0, endAt = 0;
  let nx = 0, ny = 0, ox = 0, oy = 0, moved = false;
  return {
    durationMs: 3600,
    windupMs: 750,
    tell: 'UNSTRUNG',
    gesture: 'flex',
    locksBody: true,
    cast(time: number) {
      bones = [];
      moved = false;
      ox = tk.bossX; oy = tk.bossY;
      const n = tk.hard ? 12 : 10;
      const rot = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        const r = 230 + (i % 2) * 70;
        const hx = tk.clampX(ox + Math.cos(a) * r, 30), hy = Phaser.Math.Clamp(oy + Math.sin(a) * r, FIELD_TOP + 14, tk.H - 20);
        bones.push({ x0: ox, y0: oy, a, r: Math.hypot(hx - ox, hy - oy), hx, hy, outHit: false, backHit: false, seed: i * 1.7, kind: i % 3 });
      }
      t0 = time;
      hangAt = time + 600;
      moveAt = hangAt + 300;
      backWarn = moveAt + 200;
      backAt = backWarn + tk.warn(900);
      endAt = backAt + 900;
      tk.sfx('crystal-shatter');
    },
    update(time: number) {
      if (!bones.length) return;
      const p = tk.player;
      if (!moved && time >= moveAt) {
        moved = true;
        // He reassembles across the room from you.
        const a = tk.angleToPlayer(tk.W / 2, (tk.H + FIELD_TOP) / 2) + Math.PI + (Math.random() - 0.5) * 0.8;
        nx = tk.clampX(tk.W / 2 + Math.cos(a) * 280, 100);
        ny = tk.clampY((tk.H + FIELD_TOP) / 2 + Math.sin(a) * 160, 100);
        tk.host.setBossPos(nx, ny);
        tk.sfx('teleport');
      }
      for (const b of bones) {
        if (time < hangAt) {
          const run = Math.min(b.r, ((time - t0) / 1000) * OUT_SPEED);
          const x = b.x0 + Math.cos(b.a) * run, y = b.y0 + Math.sin(b.a) * run;
          if (!b.outHit && Math.hypot(p.x - x, p.y - y) < 18) { b.outHit = true; tk.hitPlayer(11, p.x, p.y); }
        } else if (time >= backAt && moved) {
          const L = Math.hypot(nx - b.hx, ny - b.hy);
          const run = Math.min(L, ((time - backAt) / 1000) * 620);
          const x = b.hx + ((nx - b.hx) / (L || 1)) * run, y = b.hy + ((ny - b.hy) / (L || 1)) * run;
          if (!b.backHit && run < L - 20 && Math.hypot(p.x - x, p.y - y) < 18) { b.backHit = true; tk.hitPlayer(11, p.x, p.y); }
        }
      }
      if (time > endAt) bones = [];
    },
    drawGround(g, time) {
      if (!bones.length || !moved || time >= backAt + 100) return;
      const k = clamp((time - backWarn) / (backAt - backWarn), 0, 1);
      for (const b of bones) {
        g.lineStyle(2 + k * 4, SINEW, 0.15 + k * 0.4); g.lineBetween(b.hx, b.hy, nx, ny);
      }
      g.lineStyle(3, BONE_LIT, 0.4 + k * 0.4); g.strokeCircle(nx, ny, 40 - k * 10);
    },
    drawAir(g, time) {
      if (!bones.length) return;
      const ds = (b: Loose, x: number, y: number, spin: number) => {
        const c = Math.cos(spin), s = Math.sin(spin);
        if (b.kind === 0) drawBone(g, x - c * 14, y - s * 14, x + c * 14, y + s * 14, 4.5, BONE, 1);
        else if (b.kind === 1) drawRib(g, x - c * 10, y - s * 10, spin, 24, 3.5, 0.9, BONE, 1);
        else {
          // A vertebra: a ring of bone with three spurs.
          g.fillStyle(dim(BONE, 0.4), 1); g.fillCircle(x, y, 8);
          g.fillStyle(BONE, 1); g.fillCircle(x, y, 7);
          g.fillStyle(BONE_DARK, 1); g.fillCircle(x, y, 2.5);
          for (let i = 0; i < 3; i++) {
            const a = spin + (i / 3) * Math.PI * 2;
            g.fillStyle(BONE, 1); g.fillTriangle(x + Math.cos(a - 0.3) * 6, y + Math.sin(a - 0.3) * 6, x + Math.cos(a + 0.3) * 6, y + Math.sin(a + 0.3) * 6, x + Math.cos(a) * 13, y + Math.sin(a) * 13);
          }
        }
      };
      for (const b of bones) {
        const spin = time / 90 + b.seed;
        if (time < hangAt) {
          const run = Math.min(b.r, ((time - t0) / 1000) * OUT_SPEED);
          ds(b, b.x0 + Math.cos(b.a) * run, b.y0 + Math.sin(b.a) * run, spin);
        } else if (time < backAt || !moved) {
          // Hanging, turning slowly, a sinew thread trailing from each.
          const bob = Math.sin(time / 200 + b.seed) * 3;
          ds(b, b.hx, b.hy + bob, b.seed + time / 400);
          g.lineStyle(1, SINEW, 0.6); g.lineBetween(b.hx, b.hy + bob, b.hx + Math.sin(time / 300 + b.seed) * 6, b.hy + bob + 16);
        } else {
          const L = Math.hypot(nx - b.hx, ny - b.hy);
          const run = Math.min(L, ((time - backAt) / 1000) * 620);
          if (run >= L - 4) continue;
          ds(b, b.hx + ((nx - b.hx) / (L || 1)) * run, b.hy + ((ny - b.hy) / (L || 1)) * run, spin * 1.6);
        }
      }
      // The place he left: a heap of empty clothes and a cut string, for a moment.
      if (time < moveAt + 600) {
        const f = clamp(1 - (time - moveAt) / 600, 0, 1);
        g.fillStyle(BONE_DARK, 0.6 * f); g.fillEllipse(ox, oy + 16, 50, 16);
      }
    },
    onPhaseEnd() { bones = []; },
  };
};

// ── Signature: Ribcage ───────────────────────────────────────────────
// Ribs burst up out of the floor in a ring around you — all but a gap — and curl inward until they
// meet over the middle with a clap. Step out through the gap before they rise, or while they close;
// stay in and the cage closes on you.

const ribcage = (tk: BossToolkit): SignatureMove => {
  let cx = 0, cy = 0, gapA = 0, gapHalf = 0.42;
  let riseAt = 0, closeAt = 0, shutAt = 0, endAt = 0;
  let lastHit = 0, clapped = false, live = false;
  const R0 = 160;
  const RIBS = 16;
  const radiusAt = (time: number): number => (time < closeAt ? R0 : Math.max(18, R0 - (R0 - 18) * clamp((time - closeAt) / (shutAt - closeAt), 0, 1)));
  return {
    durationMs: 2900,
    windupMs: 600,
    tell: 'RIBCAGE',
    hold: 'reach',
    cast(time: number) {
      const p = tk.player;
      cx = tk.clampX(p.x, R0 * 0.5); cy = tk.clampY(p.y, R0 * 0.5);
      // The gap opens away from him: running from him is running out.
      gapA = Math.atan2(cy - tk.bossY, cx - tk.bossX) + (Math.random() - 0.5) * 0.8;
      gapHalf = tk.hard ? 0.36 : 0.44;
      riseAt = time;
      closeAt = time + tk.warn(1000);
      shutAt = closeAt + 1250;
      endAt = shutAt + 500;
      clapped = false; live = true;
      tk.sfx('stone-rise');
    },
    update(time: number) {
      if (!live) return;
      if (time > endAt) { live = false; return; }
      const p = tk.player;
      if (time >= closeAt && time < shutAt) {
        const r = radiusAt(time);
        const d = Math.hypot(p.x - cx, p.y - cy);
        let da = Math.atan2(p.y - cy, p.x - cx) - gapA;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(d - r) < 18 && Math.abs(da) > gapHalf && time - lastHit > 600) {
          lastHit = time; tk.hitPlayer(15, p.x, p.y); tk.sfx('hit-heavy');
        }
      }
      if (!clapped && time >= shutAt) {
        clapped = true;
        tk.sfx('clang');
        if (Math.hypot(p.x - cx, p.y - cy) < 46) tk.hitPlayer(20, p.x, p.y);
      }
    },
    drawGround(g, time) {
      if (!live) return;
      const r = radiusAt(time);
      const k = clamp((time - riseAt) / (closeAt - riseAt), 0, 1);
      g.fillStyle(SINEW, 0.06 + k * 0.08); g.fillCircle(cx, cy, r);
      // The gap, lit like a door.
      g.lineStyle(6, BONE_LIT, 0.5);
      g.beginPath(); g.arc(cx, cy, r + 4, gapA - gapHalf, gapA + gapHalf, false); g.strokePath();
      // The sternum line along the ground the ribs grow from.
      g.lineStyle(2, BONE_DARK, 0.6);
      g.beginPath(); g.arc(cx, cy, r, gapA + gapHalf, gapA - gapHalf + Math.PI * 2, false); g.strokePath();
    },
    drawAir(g, time) {
      if (!live) return;
      const r = radiusAt(time);
      const rise = clamp((time - riseAt) / (closeAt - riseAt), 0, 1);
      const shut = time >= shutAt;
      for (let i = 0; i < RIBS; i++) {
        const a = (i / RIBS) * Math.PI * 2;
        let da = a - gapA;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < gapHalf) continue;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        // Each rib springs up then curls in toward the centre, standing as tall as it has grown.
        const len = (14 + rise * 40) * (shut ? 0.7 : 1);
        const inward = a + Math.PI;
        const up = -Math.PI / 2;
        const lean = up + (inward - up) * 0.25 * (time >= closeAt ? 1 : rise * 0.5);
        drawRib(g, x, y, lean, len, 4, (i % 2 ? 0.7 : -0.7), BONE, 1);
      }
      if (shut) {
        const f = clamp(1 - (time - shutAt) / 500, 0, 1);
        g.fillStyle(BONE_LIT, 0.6 * f); g.fillCircle(cx, cy, 30 + (1 - f) * 30);
      }
    },
    onPhaseEnd() { live = false; },
  };
};

// ── Signature: The Walls Wake (hard) ─────────────────────────────────
// The skulls in the wall niches open their eyes one after another. Each one fixes on where you
// stand as it wakes and draws its look across the room; a moment later it spits a chatter of teeth
// straight down that look. Keep moving off each line as it is drawn — they fire in the order they woke.

interface Gaze { sx: number; sy: number; a: number; wakeAt: number; fireAt: number; hits: number }

const TOOTH_SPEED = 600;

const wake = (tk: BossToolkit): SignatureMove => {
  let gazes: Gaze[] = [];
  return {
    durationMs: 3600,
    windupMs: 800,
    tell: 'THE WALLS WAKE',
    hold: 'conduct',
    cast() {
      gazes = [];
      const spots = skullWall(tk.W, tk.H).slice();
      const n = tk.hard ? 8 : 6;
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      for (let i = 0; i < Math.min(n, spots.length); i++) {
        const s = spots[i];
        tk.schedule(i * 230, () => {
          const p = tk.player;
          gazes.push({ sx: s.x, sy: s.y, a: Math.atan2(p.y - s.y, p.x - s.x), wakeAt: tk.now, fireAt: tk.now + tk.warn(950), hits: 0 });
          tk.sfx('hush');
        });
      }
    },
    update(time: number) {
      const p = tk.player;
      for (const z of gazes) {
        if (time < z.fireAt || z.hits > 0) continue;
        // Three teeth in a row down the line.
        for (let k = 0; k < 3; k++) {
          const run = ((time - z.fireAt) / 1000) * TOOTH_SPEED - k * 34;
          if (run < 0 || run > 1300) continue;
          const x = z.sx + Math.cos(z.a) * run, y = z.sy + Math.sin(z.a) * run;
          if (Math.hypot(p.x - x, p.y - y) < 16) { z.hits++; tk.hitPlayer(9, p.x, p.y); tk.sfx('hit-light'); break; }
        }
      }
      gazes = gazes.filter((z) => time < z.fireAt + 2400);
    },
    drawGround(g, time) {
      for (const z of gazes) {
        if (time > z.fireAt + 80) continue;
        const k = clamp((time - z.wakeAt) / (z.fireAt - z.wakeAt), 0, 1);
        const ex = z.sx + Math.cos(z.a) * 1300, ey = z.sy + Math.sin(z.a) * 1300;
        // The look: a pale-red beam of attention widening as it settles.
        g.lineStyle(4 + k * 12, SINEW, 0.05 + k * 0.12); g.lineBetween(z.sx, z.sy, ex, ey);
        g.lineStyle(1, lit(SINEW, 0.4), 0.3 + k * 0.4); g.lineBetween(z.sx, z.sy, ex, ey);
      }
    },
    drawAir(g, time) {
      for (const z of gazes) {
        const k = clamp((time - z.wakeAt) / 300, 0, 1);
        // The waking skull over its niche: eyes lit, jaw working.
        const jaw = time >= z.fireAt && time < z.fireAt + 500 ? 0.5 + Math.sin(time / 30) * 0.5 : 0.15 * k;
        drawSkull(g, z.sx, z.sy, 13, 1, { jaw, eye: SINEW, eyeA: k });
        if (time < z.fireAt) continue;
        for (let t = 0; t < 3; t++) {
          const run = ((time - z.fireAt) / 1000) * TOOTH_SPEED - t * 34;
          if (run < 0 || run > 1300 || z.hits > 0) continue;
          const x = z.sx + Math.cos(z.a) * run, y = z.sy + Math.sin(z.a) * run;
          // A tooth: a stubby white wedge with a dark root, pointing down the line.
          const c = Math.cos(z.a), s = Math.sin(z.a);
          g.fillStyle(BONE_DARK, 1); g.fillTriangle(x - c * 7 - s * 4, y - s * 7 + c * 4, x - c * 7 + s * 4, y - s * 7 - c * 4, x - c * 12, y - s * 12);
          g.fillStyle(BONE_LIT, 1); g.fillTriangle(x - c * 6 - s * 4.5, y - s * 6 + c * 4.5, x - c * 6 + s * 4.5, y - s * 6 - c * 4.5, x + c * 7, y + s * 7);
        }
      }
    },
    onPhaseEnd() { gazes = []; },
  };
};

// ── Signature: Skullfall (hard) ──────────────────────────────────────
// The vault lets go of its skulls. Each falls onto a shadow that grows under it — one on you, the
// rest about you — and every shadow carries an arrow: where that skull will roll once it lands.
// Out of the shadows, then out of the arrows' way.

interface Falling { x: number; y: number; ra: number; at: number; landAt: number; landed: boolean; rollHit: boolean; seed: number }

const ROLL_SPEED = 300;
const ROLL_MS = 900;

const skullfall = (tk: BossToolkit): SignatureMove => {
  let skulls: Falling[] = [];
  return {
    durationMs: 3200,
    windupMs: 650,
    tell: 'SKULLFALL',
    gesture: 'raise',
    cast(time: number) {
      skulls = [];
      const p = tk.player;
      const n = tk.hard ? 9 : 7;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 70 + Math.random() * 220;
        const x = tk.clampX(p.x + Math.cos(a) * r, 50), y = tk.clampY(p.y + Math.sin(a) * r * 0.8, 50);
        const at = time + i * 170;
        // Rolls run roughly across the player's position, never straight at them from point-blank.
        const ra = i === 0 ? Math.random() * Math.PI * 2 : Math.atan2(p.y - y, p.x - x) + (Math.random() - 0.5) * 1.2;
        skulls.push({ x, y, ra, at, landAt: at + tk.warn(1000), landed: false, rollHit: false, seed: Math.random() * 10 });
      }
      tk.sfx('quake');
    },
    update(time: number) {
      const p = tk.player;
      for (const s of skulls) {
        if (!s.landed && time >= s.landAt) {
          s.landed = true;
          tk.sfx('hit-heavy');
          if (Math.hypot(p.x - s.x, p.y - s.y) < 40) tk.hitPlayer(15, p.x, p.y);
        }
        if (s.landed && !s.rollHit && time < s.landAt + ROLL_MS && time > s.landAt + 120) {
          const run = ((time - s.landAt) / 1000) * ROLL_SPEED;
          const x = s.x + Math.cos(s.ra) * run, y = s.y + Math.sin(s.ra) * run;
          if (Math.hypot(p.x - x, p.y - y) < 20) { s.rollHit = true; tk.hitPlayer(10, p.x, p.y); }
        }
      }
      skulls = skulls.filter((s) => time < s.landAt + ROLL_MS + 300);
    },
    drawGround(g, time) {
      for (const s of skulls) {
        if (time < s.at) continue;
        if (!s.landed) {
          const k = clamp((time - s.at) / (s.landAt - s.at), 0, 1);
          g.fillStyle(0x000000, 0.15 + k * 0.35); g.fillEllipse(s.x, s.y + 6, 30 + k * 40, 12 + k * 16);
          g.lineStyle(2, SINEW, 0.4 + k * 0.4); g.strokeCircle(s.x, s.y, 40);
          // The arrow it will roll down.
          const L = ROLL_SPEED * (ROLL_MS / 1000);
          const ex = s.x + Math.cos(s.ra) * L, ey = s.y + Math.sin(s.ra) * L;
          g.lineStyle(10, BONE_LIT, 0.08 + k * 0.12); g.lineBetween(s.x, s.y, ex, ey);
          const ah = s.ra + Math.PI;
          g.fillStyle(BONE_LIT, 0.25 + k * 0.3);
          g.fillTriangle(ex, ey, ex + Math.cos(ah + 0.4) * 16, ey + Math.sin(ah + 0.4) * 16, ex + Math.cos(ah - 0.4) * 16, ey + Math.sin(ah - 0.4) * 16);
        } else if (time < s.landAt + 300) {
          const f = 1 - (time - s.landAt) / 300;
          g.lineStyle(4, BONE_LIT, f); g.strokeCircle(s.x, s.y, 40 + (1 - f) * 20);
        }
      }
    },
    drawAir(g, time) {
      for (const s of skulls) {
        if (time < s.at) continue;
        if (!s.landed) {
          const k = clamp((time - s.at) / (s.landAt - s.at), 0, 1);
          // Dropping out of the dark above, growing as it comes.
          drawSkull(g, s.x, s.y - (1 - k) * 260, 6 + k * 7, 0.4 + k * 0.6, { tone: O.boneShade, turn: Math.sin(time / 120 + s.seed) });
        } else {
          const run = Math.min(ROLL_SPEED * ROLL_MS / 1000, ((time - s.landAt) / 1000) * ROLL_SPEED);
          const x = s.x + Math.cos(s.ra) * run, y = s.y + Math.sin(s.ra) * run;
          const f = clamp(1 - (time - s.landAt - ROLL_MS) / 300, 0, 1);
          drawSkull(g, x, y, 13, f, { tone: O.boneShade, turn: Math.sin(run / 9), jaw: 0.3 + Math.abs(Math.sin(run / 14)) * 0.4 });
        }
      }
    },
    onPhaseEnd() { skulls = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const SINEW_BOSS: WorldBossDef = {
  worldId: 'isle:sinew',
  name: 'Prince Sinew',
  title: 'Keeper of the Ossuary Court',
  color: BONE,
  colorLit: BONE_LIT,
  colorDark: BONE_DARK,
  accent: SINEW,
  damageMult: 1.15,

  intro: [
    'Stand up straight.',
    'Mother staked me when I was small, and strung me when the stake was not enough. Now I keep her compost. Nothing is wasted.',
  ],
  banter: [
    'Every bone in this court was somebody who came up short. I find them all a use.',
    'You stoop. Mother would have you on a cane by morning.',
    'The pruned who die in her hedges come down to me. I am very gentle with them. Someone ought to be.',
    'A string is only a kindness that holds you up.',
    'I have not sat down in nineteen years. The Rood does not let me.',
    'Lilies grow best in the beds where the most went in. I make sure the lilies are lovely.',
    'Dance with me. Everyone here dances eventually.',
  ],
  defeatLine: 'THE STRINGS GO SLACK',
  resumeLine: 'Back on your feet? Good posture, at least. Again, then — from the top.',

  phases: [
    {
      name: 'Marionette',
      line: 'Mind the strings. Mother pulls, and I dance, and so will you.',
      hp: 450,
      cycle: ['sig:javelins', 'volley', 'sig:whip', 'lanes', 'sig:hop', 'radial', 'sig:whip', 'homing'],
      harass: ['h-snipe', 'h-flak', 'h-lane'],
      restMs: 1150,
      harassMs: 3300,
    },
    {
      name: 'Unstrung',
      line: 'You cut them. Nineteen years. ...I don\'t know how to stand without them. Watch me learn.',
      hp: 530,
      cycle: ['sig:scatter', 'barrage', 'sig:ribcage', 'spiral', 'sig:javelins', 'sig:scatter', 'minefield', 'sig:ribcage'],
      harass: ['h-orbs', 'h-snipe', 'h-mines'],
      restMs: 1000,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'NOTHING GOES TO WASTE',
    extraPhase: {
      name: 'The Ossuary Throne',
      line: 'Then I will sit. For the first time in my life, I will sit — and they will stand for me.',
      hp: 380,
      cycle: ['sig:wake', 'sig:skullfall', 'sig:ribcage', 'sweep', 'sig:wake', 'quake', 'sig:skullfall', 'sanctuary'],
      harass: ['h-rune', 'h-orbs', 'h-lane'],
      restMs: 850,
      harassMs: 2500,
    },
  },

  tuning: {
    lanes: { halfW: 24 },
    radial: { speed: 220 },
    sweep: { halfW: 22 },
  },

  signatures: { javelins, whip, hop, scatter, ribcage, wake, skullfall },

  look: { crest: 'crown', pattern: 'rings', aura: 'dust', hands: 'claw', torsoR: 34, eyes: 2, eyeColor: 0xff9a90, mouth: 'stitch' },

  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'blink', gimmick: 'stalkers', tint: 'pale', look: { pattern: 'cracks', crest: 'none', mouth: 'grin', hands: 'wisp' } },
    { movement: 'anchor', gimmick: 'gloom', tint: 'blood', look: { crest: 'halo', pattern: 'runes', aura: 'none', eyes: 3, mouth: 'maw', torsoR: 38 } },
  ],

  /**
   * The Rood and its strings. A wooden control cross floats over him with red ligaments to his
   * crown and both hands, swaying as he moves; a ribcage is drawn across his body, a collar of
   * vertebrae under the chin and his mother's verdigris tithe-plate pinned over the heart. Unstrung,
   * the cross hangs broken in two and the strings dangle cut, while loose vertebrae orbit him. On
   * the Ossuary Throne a fan of skulls rises behind him, armrests of long bones either side.
   */
  drawDecor(g, s) {
    const Rr = s.radius;
    // Ribs across the body: six curved bars either side of a breastbone.
    for (let i = 0; i < 4; i++) {
      const y = s.y - Rr * 0.25 + i * Rr * 0.2;
      for (const side of [-1, 1]) {
        g.lineStyle(2.5, dim(BONE, 0.2), 0.75);
        g.beginPath(); g.arc(s.x, y - Rr * 0.3, Rr * (0.62 - i * 0.06), side > 0 ? Math.PI * 0.08 : Math.PI * 0.62, side > 0 ? Math.PI * 0.38 : Math.PI * 0.92, false); g.strokePath();
      }
    }
    g.lineStyle(3, BONE_LIT, 0.8); g.lineBetween(s.x, s.y - Rr * 0.4, s.x, s.y + Rr * 0.35);
    // A collar of vertebrae.
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
      const x = s.x + Math.cos(a) * Rr * 0.7, y = s.y - Rr * 0.05 + Math.sin(a) * Rr * 0.18 - Rr * 0.4;
      g.fillStyle(dim(BONE, 0.4), 1); g.fillCircle(x, y + 1, 4.5);
      g.fillStyle(BONE, 1); g.fillCircle(x, y, 3.8);
      g.fillStyle(BONE_DARK, 1); g.fillCircle(x, y, 1.2);
    }
    drawTithePlate(g, s.x + Rr * 0.32, s.y + Rr * 0.1, 5);

    const crossY = s.y - Rr * 2.9;
    const sway = Math.sin(s.t / 600) * 6 + Math.cos(s.facing) * 4;
    if (s.phaseIdx === 0) {
      // The Rood, whole: a crossbar and an upright, with a small bar at the front for the head.
      const cx = s.x + sway;
      g.fillStyle(dim(O.timber, 0.4), 1); g.fillRect(cx - Rr * 1.15, crossY - 4, Rr * 2.3, 9);
      g.fillStyle(O.timber, 1); g.fillRect(cx - Rr * 1.12, crossY - 3, Rr * 2.24, 6);
      g.fillStyle(O.timberLit, 1); g.fillRect(cx - Rr * 1.12, crossY - 3, Rr * 2.24, 2);
      g.fillStyle(O.timber, 1); g.fillRect(cx - 3, crossY - 22, 6, 34);
      g.fillStyle(O.gilt, 1); g.fillCircle(cx, crossY - 22, 3);
      // Strings to the crown and the hands, pulled taut with the hands' motion.
      g.lineStyle(1.5, SINEW, 0.9);
      g.lineBetween(cx, crossY + 10, s.x, s.y - Rr * 1.05);
      const hs = s.hands.slice(0, 2);
      if (hs[0]) g.lineBetween(cx - Rr * 1.1, crossY, hs[0].x, hs[0].y);
      if (hs[1]) g.lineBetween(cx + Rr * 1.1, crossY, hs[1].x, hs[1].y);
      // Two more to the shoulders.
      g.lineStyle(1, lit(SINEW, 0.2), 0.7);
      g.lineBetween(cx - Rr * 0.5, crossY, s.x - Rr * 0.7, s.y - Rr * 0.5); g.lineBetween(cx + Rr * 0.5, crossY, s.x + Rr * 0.7, s.y - Rr * 0.5);
      // String tension tells as he casts: the cross shivers and the strings glow.
      if (s.castGlow > 0.3) {
        g.lineStyle(3, SINEW, 0.3 * s.castGlow);
        g.lineBetween(cx, crossY + 10, s.x, s.y - Rr * 1.05);
      }
    } else if (s.phaseIdx === 1) {
      // The Rood, broken: two halves hanging at angles on their own threads, strings cut short.
      for (const side of [-1, 1]) {
        const hx = s.x + side * Rr * 0.7 + sway * 0.5, hy = crossY + 10 + side * 6;
        const a = side * 0.5 + Math.sin(s.t / 500 + side) * 0.15;
        const L = Rr * 1.1;
        g.lineStyle(7, dim(O.timber, 0.3), 1); g.lineBetween(hx, hy, hx + Math.cos(a) * L * side, hy + Math.sin(a) * L);
        g.lineStyle(5, O.timber, 1); g.lineBetween(hx, hy, hx + Math.cos(a) * L * side, hy + Math.sin(a) * L);
        // Splintered end.
        const ex = hx, ey = hy;
        g.fillStyle(O.timberLit, 1); g.fillTriangle(ex - 3, ey - 3, ex + 3, ey - 3, ex - side * 6, ey - 8);
        // A cut string dangling from each half, frayed.
        const dx = hx + Math.cos(a) * L * side, dy = hy + Math.sin(a) * L;
        g.lineStyle(1.5, SINEW, 0.9); g.lineBetween(dx, dy, dx + Math.sin(s.t / 300 + side) * 4, dy + 22);
        g.lineStyle(1, lit(SINEW, 0.3), 0.8); g.lineBetween(dx + Math.sin(s.t / 300 + side) * 4, dy + 22, dx + Math.sin(s.t / 300 + side) * 4 - 2, dy + 27);
      }
      // Cut strings hanging off his crown and hands.
      g.lineStyle(1.5, SINEW, 0.85);
      g.lineBetween(s.x, s.y - Rr * 1.0, s.x + Math.sin(s.t / 260) * 6, s.y - Rr * 1.6);
      for (const h of s.hands.slice(0, 2)) g.lineBetween(h.x, h.y - 6, h.x + Math.sin(s.t / 240 + h.x) * 5, h.y - 26);
      // Loose vertebrae orbiting him, the ring of a man not quite put back together.
      for (let i = 0; i < 9; i++) {
        const a = s.t / 700 + (i / 9) * Math.PI * 2;
        const r = Rr + 16 + Math.sin(s.t / 400 + i) * 5;
        const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r * 0.55;
        g.fillStyle(BONE, 1); g.fillCircle(x, y, 3.6);
        g.fillStyle(BONE_DARK, 1); g.fillCircle(x, y, 1.2);
      }
      // Gaps in him: dark seams across the body where he has not set.
      const seams = 2 + Math.floor((1 - s.hpRatio) * 4);
      for (let i = 0; i < seams; i++) {
        const y = s.y - Rr * 0.5 + jit(9, i) * Rr;
        g.lineStyle(2, BONE_DARK, 0.85); g.lineBetween(s.x - Rr * 0.7, y, s.x + Rr * 0.7, y + (jit(10, i) - 0.5) * 10);
      }
    } else {
      // The Ossuary Throne: a fan of skulls behind him like a tail, long-bone armrests either side.
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        const x = s.x + Math.cos(a) * Rr * 1.55, y = s.y - Rr * 0.3 + Math.sin(a) * Rr * 1.45;
        drawSkull(g, x, y, 6.5, 1, { tone: O.boneShade, eye: SINEW, eyeA: 0.4 + Math.sin(s.t / 300 + i) * 0.4 });
      }
      for (const side of [-1, 1]) {
        drawBone(g, s.x + side * Rr * 1.0, s.y + Rr * 0.75, s.x + side * Rr * 1.25, s.y - Rr * 0.05, 6, BONE, 1);
        drawSkull(g, s.x + side * Rr * 1.25, s.y - Rr * 0.12, 6, 1, { tone: BONE });
      }
      // Candles guttering at the throne's feet.
      for (const side of [-1, 1]) {
        drawCandle(g, s.x + side * Rr * 1.5, s.y + Rr * 1.0, 10, 5);
        g.fillStyle(O.candle, 0.9); g.fillEllipse(s.x + side * Rr * 1.5, s.y + Rr * 1.0 - 15, 3.5, 7 + Math.sin(s.t / 90 + side) * 1.5);
      }
    }
    if (s.castGlow > 0.3) for (const h of s.hands) { g.fillStyle(SINEW, 0.25 * s.castGlow); g.fillCircle(h.x, h.y, 12); }
  },

  /**
   * The nave of the Ossuary Throne: a floor of bone-white and slate flags laid in herringbone, a
   * long red runner up the middle to the dais, and both side walls built of skulls stacked in
   * niches (the same niches that wake in the last phase), a candle in front of every third one.
   * A charnel chandelier's shadow lies across the floor, and the dais at the head of the nave is
   * banked with white lilies.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5133e);
    g.fillStyle(0x2a2428, 1); g.fillRect(0, 0, W, H);
    // Herringbone flags.
    for (let y = FIELD_TOP - 20; y < H; y += 22) {
      for (let x = -40; x < W + 40; x += 44) {
        const off = (Math.floor(y / 22) % 2) * 22;
        const tone = rng() < 0.55 ? 0xcfc4ac : rng() < 0.5 ? 0x5a5260 : 0xb8ad96;
        g.fillStyle(tone, 1);
        g.fillPoints([
          new Phaser.Geom.Point(x + off, y), new Phaser.Geom.Point(x + off + 20, y + 10),
          new Phaser.Geom.Point(x + off + 20, y + 30), new Phaser.Geom.Point(x + off, y + 20),
        ], true);
        g.fillStyle(lit(tone, 0.2), 0.5); g.fillRect(x + off, y, 20, 2);
      }
    }
    g.fillStyle(0x1a1416, 0.3); g.fillRect(0, FIELD_TOP, W, H - FIELD_TOP);
    // The runner.
    g.fillStyle(dim(SINEW, 0.5), 1); g.fillRect(W / 2 - 70, FIELD_TOP, 140, H - FIELD_TOP);
    g.fillStyle(dim(SINEW, 0.25), 1); g.fillRect(W / 2 - 62, FIELD_TOP, 124, H - FIELD_TOP);
    g.lineStyle(2, O.gilt, 0.6); g.lineBetween(W / 2 - 56, FIELD_TOP, W / 2 - 56, H); g.lineBetween(W / 2 + 56, FIELD_TOP, W / 2 + 56, H);
    for (let y = FIELD_TOP + 40; y < H; y += 80) drawTithePlate(g, W / 2, y, 9);
    // The chandelier's shadow: a ring of long bones and pools of candle-light.
    const cx = W / 2, cy = FIELD_TOP + (H - FIELD_TOP) * 0.5;
    g.fillStyle(0x000000, 0.22); g.fillEllipse(cx, cy, 300, 140);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.fillStyle(O.candle, 0.06); g.fillCircle(cx + Math.cos(a) * 150, cy + Math.sin(a) * 70, 44);
      g.lineStyle(4, 0x000000, 0.25); g.lineBetween(cx + Math.cos(a) * 60, cy + Math.sin(a) * 28, cx + Math.cos(a) * 140, cy + Math.sin(a) * 64);
    }
    // The dais at the head of the nave, banked with lilies.
    g.fillStyle(0x4a4450, 1); g.fillRect(W / 2 - 170, FIELD_TOP, 340, 34);
    g.fillStyle(0x6c6672, 1); g.fillRect(W / 2 - 170, FIELD_TOP + 30, 340, 6);
    for (let i = 0; i < 16; i++) {
      const x = W / 2 - 160 + i * 21 + rng() * 6;
      g.fillStyle(O.stem, 1); g.fillRect(x, FIELD_TOP + 12, 2, 18);
      g.fillStyle(O.lily, 1); g.fillTriangle(x - 5, FIELD_TOP + 14, x + 7, FIELD_TOP + 14, x + 1, FIELD_TOP + 4);
    }
    // The skull walls, niche by niche.
    for (const side of [0, W - 40]) {
      g.fillStyle(0x1e181c, 1); g.fillRect(side, FIELD_TOP, 40, H - FIELD_TOP);
      for (let y = FIELD_TOP + 6; y < H; y += 16) {
        for (let x = side + 4; x < side + 40; x += 12) {
          g.fillStyle(rng() < 0.5 ? 0x8a7f68 : 0x6e6452, 1); g.fillEllipse(x + 4, y + 4, 11, 10);
          g.fillStyle(0x140e10, 1); g.fillCircle(x + 2, y + 4, 1.5); g.fillCircle(x + 6, y + 4, 1.5);
        }
      }
    }
    skullWall(W, H).forEach((s, i) => {
      g.fillStyle(0x0e0a0c, 1); g.fillEllipse(s.x, s.y, 36, 34);
      drawSkull(g, s.x, s.y, 12, 1, { tone: 0xc8bea4 });
      if (i % 3 === 0) {
        const cxo = s.wall === 'l' ? 26 : s.wall === 'r' ? -26 : 0;
        const cyo = s.wall === 't' ? 26 : 16;
        drawCandle(g, s.x + cxo, s.y + cyo, 9, 4);
        g.fillStyle(O.candle, 0.9); g.fillEllipse(s.x + cxo, s.y + cyo - 13, 3, 6);
        g.fillStyle(O.candle, 0.08); g.fillCircle(s.x + cxo, s.y + cyo - 12, 26);
      }
    });
    // Bone dust drifted against the walls.
    for (let y = FIELD_TOP; y < H; y += 26) {
      g.fillStyle(0xd8ccb0, 0.25); g.fillEllipse(46, y + rng() * 10, 22, 30); g.fillEllipse(W - 46, y + rng() * 10, 22, 30);
    }
  },
};
