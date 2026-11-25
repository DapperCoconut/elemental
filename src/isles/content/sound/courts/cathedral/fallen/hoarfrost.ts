import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mulberry } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ICE, ICE_DEEP, ICE_LIT, OAK, OAK_DARK, OAK_LIT, SNOW, SNOW_LIT, SNOW_SHADE, SURPLICE } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { FOE, MINE, motionTracker, sideBadge, vellum } from './common';

/**
 * Hoarfrost — Rail-Warden Mildred Kneale.
 *
 * The pilgrims who climb to the summit wait out the Hours at the kneeling-rails in the snow, and in
 * the star's telling the Rail-Warden keeps them there until the frost grows on them. Here the frost
 * grows on whoever stands still: needle by needle, a coat of rime that turns blows (the thicker, the
 * less you take) and slows nothing — until it closes. Full, it freezes you solid where you stand.
 *
 * And rime is brittle. Once it is thick, the next real blow you take shatters it, and the shards fly
 * out at whoever stands close — the one who struck you, if they came in to do it. Stand and let the
 * frost thicken while she closes in, and her blow will cut her. Strike her rime from out of reach.
 * Past half the cold gets in even while you walk, and the shards pin whoever they cut.
 */

const SHATTER_AT = 35;
const SHARD_R = 150;
const GROW = 36;     // per s while still
const SHED = 26;     // per s while moving
const CREEP = 6;     // per s past half, regardless

interface Coat { frost: number; frozenUntil: number; shatterCd: number }
interface Burst { x: number; y: number; at: number; frost: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const motion = motionTracker();
  const coats = new Map<Fighter, Coat>([[player, { frost: 0, frozenUntil: 0, shatterCd: 0 }], [npc, { frost: 0, frozenUntil: 0, shatterCd: 0 }]]);
  const bursts: Burst[] = [];
  const half = () => npc.hp < npc.maxHp * 0.5;
  const coat = (f: Fighter) => coats.get(f) as Coat;
  const other = (f: Fighter) => (f === player ? npc : player);
  const flakes = Array.from({ length: 70 }, (_, i) => { const r = mulberry(i * 17 + 5); return { x: r() * W, y: r() * H, s: 0.7 + r() * 1.3, p: r() * 6 }; });

  function shatter(f: Fighter, amount: number): void {
    const c = coat(f);
    const now = ctx.scene.time.now;
    if (c.frost < SHATTER_AT || amount < 4 || now < c.shatterCd || !alive(f)) return;
    const fr = c.frost;
    c.frost = 0; c.shatterCd = now + 600; c.frozenUntil = Math.min(c.frozenUntil, now);
    bursts.push({ x: f.x, y: f.y - 14, at: now, frost: fr, seed: Math.floor(now) });
    ctx.sfx('ice-shatter');
    const o = other(f);
    if (alive(o) && dist(f.x, f.y, o.x, o.y) < SHARD_R) {
      ctx.hit(o, Math.round(4 + fr * 0.15), f.x, f.y);
      if (half()) ctx.root(o, 500);
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const f of [player, npc]) {
        const m = motion.step(f, dt);
        const c = coat(f);
        if (!alive(f)) { c.frost = 0; continue; }
        if (time < c.frozenUntil) continue;
        if (c.frozenUntil && time >= c.frozenUntil && c.frost >= 100) c.frost = 30;
        c.frost += (m.still >= 0.25 ? GROW : -SHED) * dt + (half() ? CREEP * dt : 0);
        c.frost = clamp(c.frost, 0, 100);
        if (c.frost >= 100) {
          c.frozenUntil = time + 1200;
          ctx.stun(f, 1200);
          ctx.sfx('status-freeze');
        }
      }
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 650) bursts.splice(i, 1);
    },

    playerTakenMult: () => 1 - 0.4 * coat(player).frost / 100,
    npcTakenMult: () => 1 - 0.4 * coat(npc).frost / 100,
    onPlayerHurt(amount) { shatter(player, amount); },
    onNpcHurt(amount) { shatter(npc, amount); },

    npcSeek(): Pt | null {
      if (!alive(npc) || !alive(player)) return null;
      const mine = coat(npc).frost, yours = coat(player).frost;
      const d = dist(npc.x, npc.y, player.x, player.y);
      const ux = (npc.x - player.x) / (d || 1), uy = (npc.y - player.y) / (d || 1);
      // Nearly frozen: walk it off, across your line rather than into you.
      if (mine > 72) return { x: clamp(npc.x - uy * 140, 50, W - 50), y: clamp(npc.y + ux * 140, top + 40, H - 40) };
      // Your rime is thick and she is close: step out of the shards' reach before she strikes.
      if (yours >= SHATTER_AT && d < SHARD_R + 20) return { x: clamp(player.x + ux * (SHARD_R + 60), 50, W - 50), y: clamp(player.y + uy * (SHARD_R + 60), top + 40, H - 40) };
      // You are coming in: she kneels and lets the frost take her.
      if (mine < 60 && d < 230) return { x: npc.x, y: npc.y };
      return null;
    },

    drawGround(g) {
      // Kneeling-rails along both walls, pilgrims at them rimed white.
      for (const x of [34, W - 34]) {
        g.fillStyle(OAK_DARK, 1); g.fillRect(x - 5, top + 40, 10, H - top - 80);
        g.fillStyle(OAK, 1); g.fillRect(x - 4, top + 40, 6, H - top - 80);
        g.fillStyle(OAK_LIT, 0.8); g.fillRect(x - 4, top + 40, 2, H - top - 80);
        g.fillStyle(SNOW, 1); for (let y = top + 40; y < H - 40; y += 10) g.fillEllipse(x, y, 12, 6);
        for (let y = top + 90; y < H - 60; y += 120) {
          const s = x < W / 2 ? 1 : -1;
          g.fillStyle(SNOW_SHADE, 1); g.fillEllipse(x + s * 22, y + 8, 30, 14);
          g.fillStyle(SURPLICE, 1); g.fillEllipse(x + s * 20, y - 4, 22, 26);
          g.fillStyle(SNOW_LIT, 1); g.fillCircle(x + s * 18, y - 20, 8); g.fillEllipse(x + s * 20, y - 14, 24, 6);
          g.lineStyle(1, ICE_DEEP, 0.6); for (let k = -2; k <= 2; k++) g.lineBetween(x + s * 20 + k * 4, y - 12, x + s * 20 + k * 4 + 1, y - 6);
        }
      }
      // Frost flowers on the flags round anyone it is taking: fern-like, growing with the coat.
      for (const f of [player, npc]) {
        const c = coat(f);
        if (!alive(f) || c.frost < 4) continue;
        const k = c.frost / 100;
        const rr = mulberry(f === player ? 11 : 23);
        for (let i = 0; i < 9; i++) {
          const a = rr() * Math.PI * 2, len = (14 + rr() * 22) * k + 6;
          const bx = f.x + Math.cos(a) * 14, by = f.y + 14 + Math.sin(a) * 6;
          const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len * 0.5;
          g.lineStyle(1.2, ICE_LIT, 0.75); g.lineBetween(bx, by, ex, ey);
          for (let j = 1; j <= 3; j++) {
            const t = j / 4, mx = bx + (ex - bx) * t, my = by + (ey - by) * t, bl = len * 0.22 * (1 - t * 0.5);
            g.lineBetween(mx, my, mx + Math.cos(a + 0.7) * bl, my + Math.sin(a + 0.7) * bl * 0.5);
            g.lineBetween(mx, my, mx + Math.cos(a - 0.7) * bl, my + Math.sin(a - 0.7) * bl * 0.5);
          }
        }
      }
    },

    drawAir(g, time) {
      // Snow, falling slowly through the whole nave.
      for (const fl of flakes) {
        const y = top + ((fl.y + time * 0.02 * fl.s) % (H - top));
        const x = (fl.x + Math.sin(time / 900 + fl.p) * 10 + W) % W;
        g.fillStyle(SNOW_LIT, 0.7); g.fillCircle(x, y, fl.s);
      }
      for (const f of [player, npc]) {
        const c = coat(f);
        if (!alive(f) || c.frost < 2) continue;
        const cx = f.x, cy = f.y - 14;
        const k = c.frost / 100;
        if (time < c.frozenUntil) {
          // Frozen solid: a faceted block of clear ice round the whole figure.
          g.fillStyle(ICE, 0.45); g.fillRoundedRect(cx - 26, cy - 34, 52, 64, 6);
          g.lineStyle(2, ICE_LIT, 0.9); g.strokeRoundedRect(cx - 26, cy - 34, 52, 64, 6);
          g.lineStyle(1, ICE_DEEP, 0.6); g.lineBetween(cx - 26, cy - 6, cx - 4, cy - 34); g.lineBetween(cx + 6, cy + 30, cx + 26, cy + 2); g.lineBetween(cx - 10, cy + 30, cx + 4, cy - 2);
          g.fillStyle(0xffffff, 0.7); g.fillRect(cx - 20, cy - 28, 4, 22); g.fillRect(cx - 14, cy - 28, 2, 10);
          continue;
        }
        // The rime: needles bristling out from the figure, each feathered with barbs.
        const n = 18;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + (i % 2) * 0.12;
          const r0 = 16, len = 3 + k * (10 + (i % 3) * 4);
          const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * 1.25;
          const x1 = cx + Math.cos(a) * (r0 + len), y1 = cy + Math.sin(a) * (r0 + len) * 1.25;
          g.lineStyle(1.4, ICE_LIT, 0.55 + 0.4 * k); g.lineBetween(x0, y0, x1, y1);
          if (k > 0.3) {
            const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            g.lineStyle(1, SNOW_LIT, 0.6);
            g.lineBetween(mx, my, mx + Math.cos(a + 0.8) * len * 0.35, my + Math.sin(a + 0.8) * len * 0.35);
            g.lineBetween(mx, my, mx + Math.cos(a - 0.8) * len * 0.35, my + Math.sin(a - 0.8) * len * 0.35);
          }
        }
        // Once it is thick enough to shatter, a pale shell glints round them.
        if (c.frost >= SHATTER_AT) {
          g.lineStyle(1.5, ICE_LIT, 0.35 + 0.25 * Math.sin(time / 160)); g.strokeEllipse(cx, cy, 44 + k * 12, 54 + k * 14);
          g.fillStyle(0xffffff, 0.8); g.fillCircle(cx - 14, cy - 20, 1.6 + Math.sin(time / 200) * 0.6);
        }
      }
      // Shattering: shards flying out to the edge of their reach.
      for (const b of bursts) {
        const k = (time - b.at) / 650;
        const rr = mulberry(b.seed);
        g.lineStyle(2 * (1 - k), ICE_LIT, 0.6 * (1 - k)); g.strokeCircle(b.x, b.y + 14, SHARD_R * Math.min(1, k * 1.6));
        const n = 10 + Math.floor(b.frost / 10);
        for (let i = 0; i < n; i++) {
          const a = rr() * Math.PI * 2, d = SHARD_R * Math.min(1, k * 1.6) * (0.6 + rr() * 0.4), sz = 3 + rr() * 4;
          const px = b.x + Math.cos(a) * d, py = b.y + Math.sin(a) * d * 0.85;
          g.fillStyle(i % 2 ? ICE_LIT : ICE, 1 - k);
          g.fillTriangle(px + Math.cos(a) * sz, py + Math.sin(a) * sz, px + Math.cos(a + 2.4) * sz * 0.5, py + Math.sin(a + 2.4) * sz * 0.5, px + Math.cos(a - 2.4) * sz * 0.5, py + Math.sin(a - 2.4) * sz * 0.5);
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      vellum(g, x, y, 216, 28);
      // Each coat of rime against its two marks: where it can shatter, and where it freezes.
      for (const [f, col, ox] of [[player, MINE, -100], [npc, FOE, 8]] as const) {
        const c = coat(f);
        sideBadge(g, x + ox + 8, y + 14, col);
        const bx = x + ox + 18, bw = 72;
        g.fillStyle(0x2a3a4a, 1); g.fillRect(bx, y + 10, bw, 8);
        g.fillStyle(time < c.frozenUntil ? 0xffffff : c.frost >= SHATTER_AT ? ICE_LIT : ICE, 1); g.fillRect(bx, y + 10, bw * c.frost / 100, 8);
        const sm = bx + bw * SHATTER_AT / 100;
        g.lineStyle(1.5, ICE_DEEP, 1); g.lineBetween(sm, y + 7, sm, y + 21);
        g.fillStyle(ICE_LIT, 1); g.fillTriangle(bx + bw + 2, y + 9, bx + bw + 8, y + 14, bx + bw + 2, y + 19);
        g.lineStyle(1, OAK_DARK, 1); g.strokeRect(bx, y + 10, bw, 8);
      }
    },
  };
}

export const FALLEN_HOARFROST: GimmickDef = {
  id: fallenId('cathedral', 'hoarfrost'),
  rules: 'Stand still and rime grows on you: it turns blows, and full it freezes you. Thick rime shatters on the next blow, cutting whoever stands close.',
  make,
};
