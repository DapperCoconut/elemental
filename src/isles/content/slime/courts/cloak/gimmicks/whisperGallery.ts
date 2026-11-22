import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { earTrumpet } from '../art';
import { BRASS_LIT, MASK_GOLD, MASK_TEAL, WAX } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Whisper Gallery — Gossip Murmur.
 *
 * Ear-trumpets stand in pairs round the walls, each pair tied with the same coloured ribbon and
 * joined by a speaking-tube under the floor. Anything cast beside a trumpet is *heard* at its
 * twin a breath later — and said again from there: the twin's bell coughs out a fan of whispers
 * that fly at the caster's foe. Fight beside a trumpet whose twin is at your foe's back and every
 * cast comes at them twice.
 *
 * Murmur keeps the gallery's hush. Every so often she lifts a finger: for a few seconds the
 * trumpets listen *for* trouble, and whoever casts beside one is swallowed by the hush —
 * silenced, the word stolen. Mind the finger.
 */

const NEAR = 90;
const DELAY = 450;
const BOLT_SPEED = 300;
const HUSH_EVERY = 9500;
const HUSH_WARN = 1100;
const HUSH_MS = 2600;

interface Horn { x: number; y: number; twin: number; color: number; dir: number; heardAt: number; spokeAt: number; cd: Map<Fighter, number> }
interface Bolt { x: number; y: number; vx: number; vy: number; owner: Fighter; dmg: number; born: number }
interface Echo { horn: number; at: number; owner: Fighter; dmg: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const spots: [Pt, number][] = [
    [{ x: 90, y: top + 110 }, 0], [{ x: W - 90, y: H - 70 }, 0],
    [{ x: W - 90, y: top + 110 }, 1], [{ x: 90, y: H - 70 }, 1],
    [{ x: W / 2, y: top + 64 }, 2], [{ x: W / 2, y: H - 40 }, 2],
  ];
  const colors = [WAX, MASK_TEAL, MASK_GOLD];
  const horns: Horn[] = spots.map(([p, pair], i) => ({
    x: p.x, y: p.y, twin: i % 2 ? i - 1 : i + 1, color: colors[pair],
    dir: Math.atan2(cy - p.y, cx - p.x), heardAt: -9999, spokeAt: -9999, cd: new Map(),
  }));
  const bolts: Bolt[] = [];
  const echoes: Echo[] = [];
  let nextHush = 0;
  let hushWarn = -1;
  let hushUntil = 0;
  let started = false;
  const swallowed: { x: number; y: number; at: number }[] = [];

  const nearHorn = (f: Fighter): number => {
    let best = -1, bd = NEAR;
    horns.forEach((h, i) => { const d = dist(h.x, h.y, f.x, f.y); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  function heard(f: Fighter, dmg: number): void {
    const now = ctx.scene.time.now;
    const i = nearHorn(f);
    if (i < 0) return;
    const h = horns[i];
    if (now < hushUntil) {
      // The hush swallows it: silenced.
      ctx.silence(f, 1400);
      swallowed.push({ x: h.x, y: h.y, at: now });
      ctx.float(f.x, f.y - 56, 'HUSHED', '#d8d0f0');
      ctx.sfx('hush');
      return;
    }
    if (now < (h.cd.get(f) ?? 0)) return;
    h.cd.set(f, now + 900);
    h.heardAt = now;
    echoes.push({ horn: h.twin, at: now + DELAY, owner: f, dmg });
    ctx.sfx('sonic-pulse');
  }

  function speak(e: Echo, time: number): void {
    const h = horns[e.horn];
    const foe = e.owner === player ? npc : player;
    if (!alive(foe)) return;
    h.spokeAt = time;
    const a = Math.atan2(foe.y - h.y, foe.x - h.x);
    const n = ctx.hard ? 4 : 3;
    for (let k = 0; k < n; k++) {
      const b = a + (k - (n - 1) / 2) * 0.14;
      bolts.push({ x: h.x + Math.cos(b) * 24, y: h.y - 30 + Math.sin(b) * 16, vx: Math.cos(b) * BOLT_SPEED, vy: Math.sin(b) * BOLT_SPEED, owner: e.owner, dmg: e.dmg, born: time });
    }
    ctx.float(h.x, h.y - 80, '…said again…', '#e8dcff');
  }

  return {
    update(time, dt) {
      if (!started) { started = true; nextHush = time + HUSH_EVERY; }
      if (hushWarn < 0 && time >= nextHush - HUSH_WARN) { hushWarn = time; ctx.banner('MURMUR RAISES A FINGER — HUSH', '#e8dcff'); ctx.sfx('hush'); }
      if (time >= nextHush) { nextHush = time + HUSH_EVERY; hushWarn = -1; hushUntil = time + HUSH_MS; }
      for (let i = echoes.length - 1; i >= 0; i--) if (time >= echoes[i].at) { speak(echoes[i], time); echoes.splice(i, 1); }
      const step = Math.min(dt, 0.1);
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * step; b.y += b.vy * step;
        const foe = b.owner === player ? npc : player;
        if (alive(foe) && dist(b.x, b.y, foe.x, foe.y - 14) < 24) {
          if (foe === player) ctx.tk.hitPlayer(b.dmg, b.x, b.y);
          else ctx.hit(foe, b.dmg, b.x, b.y);
          bolts.splice(i, 1);
          continue;
        }
        if (b.x < -20 || b.x > W + 20 || b.y < top - 20 || b.y > H + 20 || time - b.born > 3500) bolts.splice(i, 1);
      }
      for (let i = swallowed.length - 1; i >= 0; i--) if (time - swallowed[i].at > 700) swallowed.splice(i, 1);
    },

    onPlayerCast(_id, slot) { heard(player, slot === 'q' ? 12 : slot === 'click' ? 4 : 7); },
    onNpcCast() { heard(npc, 6); },

    npcSeek() {
      if (!alive(npc)) return null;
      const now = ctx.scene.time.now;
      if (now < hushUntil || hushWarn >= 0) {
        // Away from every horn while the finger is up.
        const a = Math.atan2(npc.y - cy, npc.x - cx);
        return { x: clamp(cx + Math.cos(a) * 80, 60, W - 60), y: clamp(cy + Math.sin(a) * 60, top + 50, H - 40) };
      }
      // Beside the horn whose twin is closest to the player.
      let best = horns[0], bd = Infinity;
      for (const h of horns) {
        const t = horns[h.twin];
        const d = dist(t.x, t.y, player.x, player.y) - dist(h.x, h.y, player.x, player.y) * 0.5;
        if (d < bd) { bd = d; best = h; }
      }
      return { x: clamp(best.x + Math.cos(best.dir) * 50, 60, W - 60), y: clamp(best.y + Math.sin(best.dir) * 40, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const hushK = time < hushUntil ? 1 : hushWarn >= 0 ? clamp((time - hushWarn) / HUSH_WARN, 0, 1) * 0.6 : 0;
      for (const h of horns) {
        // Each trumpet's listening ring, in its pair's colour (pale violet while hushed).
        g.lineStyle(2, hushK > 0 ? 0xc8c0e8 : h.color, 0.18 + hushK * 0.4); g.strokeCircle(h.x, h.y, NEAR);
        g.fillStyle(hushK > 0 ? 0xc8c0e8 : h.color, 0.05 + hushK * 0.08); g.fillCircle(h.x, h.y, NEAR);
      }
      // The speaking-tube carrying a heard cast: a pulse running from the horn to its twin.
      for (const e of echoes) {
        const from = horns[horns[e.horn].twin], to = horns[e.horn];
        const k = clamp(1 - (e.at - time) / DELAY, 0, 1);
        const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k;
        g.lineStyle(1.5, to.color, 0.25); g.lineBetween(from.x, from.y, to.x, to.y);
        glow(g, x, y, 14, to.color, 0.1, 3);
      }
    },

    drawAir(g, time) {
      for (const h of horns) {
        earTrumpet(g, h.x, h.y, 1.05, h.dir, 50);
        // The pair's ribbon on the post.
        g.fillStyle(h.color, 1); g.fillRect(h.x - 4, h.y - 34, 8, 5);
        g.fillTriangle(h.x + 4, h.y - 32, h.x + 10, h.y - 22, h.x + 3, h.y - 26);
        const heard = (time - h.heardAt) / 400, spoke = (time - h.spokeAt) / 500;
        const bx = h.x + Math.cos(h.dir) * 22, by = h.y - 52 + Math.sin(h.dir) * 13;
        if (heard >= 0 && heard < 1) { g.lineStyle(2, BRASS_LIT, 1 - heard); g.strokeCircle(bx, by, 10 + heard * 18); }
        if (spoke >= 0 && spoke < 1) for (let i = 0; i < 3; i++) {
          g.lineStyle(2.5, h.color, 1 - spoke);
          g.beginPath(); g.arc(bx, by, 12 + i * 9 + spoke * 20, h.dir - 0.7, h.dir + 0.7, false); g.strokePath();
        }
      }
      // Whispers in flight: little stacked crescents.
      for (const b of bolts) {
        const a = Math.atan2(b.vy, b.vx);
        const c = b.owner === player ? 0xe8dcff : 0xffb8c8;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2.4 - i * 0.6, c, 0.9 - i * 0.25);
          g.beginPath(); g.arc(b.x - Math.cos(a) * i * 7, b.y - Math.sin(a) * i * 7, 7 - i, a - 0.9, a + 0.9, false); g.strokePath();
        }
      }
      // A cast swallowed by the hush: a finger to the lips over the horn.
      for (const s of swallowed) {
        const k = (time - s.at) / 700;
        g.fillStyle(0xe8dcff, 1 - k); g.fillRoundedRect(s.x - 2, s.y - 110 - k * 10, 4, 16, 2);
        g.lineStyle(2, 0xe8dcff, 1 - k); g.strokeEllipse(s.x, s.y - 100 - k * 10, 18, 6);
      }
    },

    drawHud(g, time) {
      if (time >= hushUntil && hushWarn < 0) return;
      // The raised finger, top centre, while the hush is coming or kept.
      const x = W / 2, y = top + 22;
      const on = time < hushUntil;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 18, y - 16, 36, 34, 8);
      g.fillStyle(on ? 0xe8dcff : 0x9a90b8, 1); g.fillRoundedRect(x - 3, y - 12, 6, 18, 3);
      g.fillRoundedRect(x - 8, y + 2, 16, 10, 4);
      if (on) { const k = (hushUntil - time) / HUSH_MS; g.fillStyle(0xe8dcff, 0.8); g.fillRect(x - 16, y + 14, 32 * k, 2); }
    },
  };
}

export const WHISPER_GALLERY: GimmickDef = {
  id: 'cloak-whisper-gallery',
  rules: 'Ear-trumpets stand in pairs. Cast beside one and its twin says it again — whispers fly at your foe. When Murmur raises a finger, casting by a trumpet silences you.',
  make,
};
