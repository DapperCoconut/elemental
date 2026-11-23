import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import { candle, soulWisp, waxDrips } from '../art';
import { BRASS, BRASS_DARK, FLAME, GLASS, IRON, IRON_LIT, MINE, SOUL, SOUL_DARK, SOUL_LIT, WAX, WAX_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Wick Trimming — Chandler Snuff.
 *
 * Five lanterns stand on posts round the yard, each with its candle burning down on a clock you can
 * see (the ring at the post's foot drains, the candle shortens). Stand by a lantern for a moment and
 * you trim it: its clock resets. Let one gutter and the soul inside gets out as a wailing wisp that
 * hunts whoever is nearest — it hits hard and staggers. Strike a wisp to set it loose for good.
 *
 * Snuff sells the wax and is not above helping a wick along: every few seconds he pinches out the
 * lantern nearest you, leaving it a few seconds from guttering. A wisp hunts the *nearest* fighter,
 * so the trick is to let the lanterns by Snuff go, keep the ones by you trimmed, and lead whatever
 * gets out back into him.
 */

const POST_R = 58;
const TRIM_S = 1.0;
const WISP_SPEED = 96;
const WISP_HIT = 24;

interface Post { x: number; y: number; life: number; max: number; trim: number; trimBy: Fighter | null; outAt: number; pinchAt: number; drip: number }
interface Wisp { x: number; y: number; a: number; bornAt: number; target: StrikeTarget | null; freed: boolean; freedAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const MAXLIFE = ctx.hard ? 13 : 16;
  const pinchEvery = ctx.hard ? 7800 : 10000;
  const PINCH_WARN = 1000;
  const posts: Post[] = [
    { x: 150, y: top + 120 }, { x: W - 150, y: top + 120 }, { x: W / 2, y: (top + H) / 2 + 10 },
    { x: 190, y: H - 80 }, { x: W - 190, y: H - 80 },
  ].map((p, i) => ({ ...p, life: MAXLIFE * (0.45 + ((i * 37) % 50) / 100), max: MAXLIFE, trim: 0, trimBy: null, outAt: 0, pinchAt: 0, drip: rng() * 10 }));
  const wisps: Wisp[] = [];
  let nextPinch = 0;
  let pinchPost: Post | null = null;
  let started = false;

  const nearest = (x: number, y: number): Fighter | null => {
    const cs = [player, npc].filter(alive);
    if (!cs.length) return null;
    return cs.reduce((a, b) => (dist(a.x, a.y, x, y) <= dist(b.x, b.y, x, y) ? a : b));
  };

  function gutter(p: Post, time: number): void {
    p.life = 0;
    p.outAt = time;
    const w: Wisp = { x: p.x, y: p.y - 70, a: -Math.PI / 2, bornAt: time, target: null, freed: false, freedAt: 0 };
    w.target = ctx.target({
      x: w.x, y: w.y, r: 18,
      onStruck: () => {
        if (w.freed) return;
        w.freed = true;
        w.freedAt = ctx.scene.time.now;
        w.target?.remove();
        ctx.float(w.x, w.y - 20, 'SET LOOSE', '#e4f5ff');
        ctx.sfx('wings');
      },
    });
    wisps.push(w);
    ctx.float(p.x, p.y - 100, 'GUTTERED', '#bfe6ff');
    ctx.sfx('screech');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPinch = time + pinchEvery * 0.7; }

      for (const p of posts) {
        if (p.life <= 0) {
          // Snuff relights a guttered lantern with a fresh candle after a while.
          if (time - p.outAt > 4500) { p.life = p.max; p.trim = 0; ctx.sfx('sizzle'); }
          continue;
        }
        p.life -= dt;
        // Trimming: whoever stands at the post; both at once still trims.
        const at = [player, npc].filter((f) => alive(f) && dist(f.x, f.y, p.x, p.y) < POST_R);
        if (at.length) {
          p.trim += dt;
          p.trimBy = at.includes(player) ? player : npc;
          if (p.trim >= TRIM_S) {
            p.trim = 0;
            p.life = p.max;
            ctx.float(p.x, p.y - 96, p.trimBy === player ? 'TRIMMED' : 'SNUFF TRIMS', p.trimBy === player ? '#ffe2a0' : '#d8c8ff');
            ctx.sfx('snap-back');
          }
        } else p.trim = Math.max(0, p.trim - dt * 2);
        if (p.life <= 0) gutter(p, time);
      }

      // Snuff's pinch: the lit lantern nearest you, down to a few seconds.
      if (!pinchPost && time >= nextPinch - PINCH_WARN && alive(npc) && alive(player)) {
        const lit1 = posts.filter((p) => p.life > 3);
        if (lit1.length) {
          pinchPost = lit1.reduce((a, b) => (dist(a.x, a.y, player.x, player.y) <= dist(b.x, b.y, player.x, player.y) ? a : b));
          pinchPost.pinchAt = time + PINCH_WARN;
          ctx.banner('SNUFF PINCHES A WICK', '#fff2c0');
          ctx.sfx('curse-cast');
        } else nextPinch = time + 1500;
      }
      if (pinchPost && time >= pinchPost.pinchAt) {
        pinchPost.life = Math.min(pinchPost.life, ctx.hard ? 2.2 : 2.8);
        pinchPost.pinchAt = 0;
        pinchPost = null;
        nextPinch = time + pinchEvery;
        ctx.sfx('hush');
      }

      // Wisps hunt the nearest fighter, wailing.
      for (let i = wisps.length - 1; i >= 0; i--) {
        const w = wisps[i];
        if (w.freed) {
          w.y -= 120 * dt;
          if (time - w.freedAt > 1400) wisps.splice(i, 1);
          continue;
        }
        const f = nearest(w.x, w.y);
        if (time - w.bornAt > 14000 || !f) { w.target?.remove(); wisps.splice(i, 1); continue; }
        const want = Math.atan2(f.y - 10 - w.y, f.x - w.x);
        const d = Math.atan2(Math.sin(want - w.a), Math.cos(want - w.a));
        w.a += clamp(d, -2.6 * dt, 2.6 * dt);
        const sp = (ctx.hard ? WISP_SPEED * 1.18 : WISP_SPEED) * (time - w.bornAt < 700 ? 0.4 : 1);
        w.x += Math.cos(w.a) * sp * dt;
        w.y += Math.sin(w.a) * sp * dt;
        w.target?.moveTo(w.x, w.y);
        if (dist(w.x, w.y, f.x, f.y - 10) < WISP_HIT) {
          ctx.hit(f, ctx.hard ? 13 : 10, f.x, f.y);
          ctx.stun(f, 420);
          ctx.float(f.x, f.y - 50, 'WAIL', '#bfe6ff');
          ctx.sfx('screech');
          w.target?.remove();
          wisps.splice(i, 1);
        }
      }
    },

    npcSeek() {
      // A post by Snuff that is burning low and nearer him than you: trim it.
      let best: Post | null = null;
      let bs = Infinity;
      for (const p of posts) {
        if (p.life <= 0 || p.life > 6) continue;
        const dn = dist(npc.x, npc.y, p.x, p.y), dp = dist(player.x, player.y, p.x, p.y);
        if (dn > 380 || dn > dp + 60) continue;
        if (p.life < bs) { bs = p.life; best = p; }
      }
      if (best) return { x: best.x + 20, y: best.y + 14 };
      // A wisp hunting him: put the stranger between them.
      const hunting = wisps.find((w) => !w.freed && nearest(w.x, w.y) === npc);
      if (hunting) {
        const a = Math.atan2(player.y - hunting.y, player.x - hunting.x);
        return { x: clamp(player.x + Math.cos(a) * 140, 60, W - 60), y: clamp(player.y + Math.sin(a) * 120, top + 50, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 180, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const p of posts) {
        // Old wax on the flags round the post (deterministic per post).
        let s = p.drip;
        const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        waxDrips(g, p.x, p.y + 4, r, 9);
        // The burn clock: a ring at the foot, draining; red-gold when low.
        const k = clamp(p.life / p.max, 0, 1);
        g.lineStyle(5, 0x000000, 0.25); g.strokeCircle(p.x, p.y, POST_R - 8);
        if (k > 0) {
          const low = k < 0.3;
          g.lineStyle(5, low ? 0xff9a5a : SOUL, low ? 0.6 + Math.sin(time / 90) * 0.3 : 0.7);
          g.beginPath(); g.arc(p.x, p.y, POST_R - 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
        // Trimming progress, in the trimmer's colour.
        if (p.trim > 0) {
          g.lineStyle(3, p.trimBy === player ? MINE : 0xb48aff, 0.9);
          g.beginPath(); g.arc(p.x, p.y, POST_R - 1, -Math.PI / 2, -Math.PI / 2 + (p.trim / TRIM_S) * Math.PI * 2, false); g.strokePath();
        }
        // Snuff's pinch telegraph: wax fingers closing on the post.
        if (p.pinchAt) {
          const kk = clamp(1 - (p.pinchAt - time) / PINCH_WARN, 0, 1);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + kk;
            const rr = POST_R + 20 - kk * 40;
            g.fillStyle(WAX, 0.8); g.fillEllipse(p.x + Math.cos(a) * rr, p.y - 50 + Math.sin(a) * rr * 0.5, 10, 18);
          }
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const p of posts) {
        const k = clamp(p.life / p.max, 0, 1);
        const out = p.life <= 0;
        // The iron post and its hook.
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 2, 26, 8);
        g.fillStyle(IRON, 1); g.fillRect(p.x - 3, p.y - 64, 6, 64);
        g.fillStyle(IRON_LIT, 0.8); g.fillRect(p.x - 2, p.y - 64, 1.4, 64);
        g.fillStyle(IRON, 1); g.fillRect(p.x - 9, p.y - 4, 18, 6);
        // The lantern: brass cage and glass, a candle inside at its height.
        const lx = p.x, ly = p.y - 66;
        if (!out) glow(g, lx, ly - 22, 40, k < 0.3 ? FLAME : SOUL, 0.05 + k * 0.03, 3);
        g.fillStyle(BRASS_DARK, 1); g.fillTriangle(lx - 18, ly - 46, lx + 18, ly - 46, lx, ly - 60);
        g.fillStyle(BRASS, 1); g.fillTriangle(lx - 14, ly - 47, lx + 6, ly - 47, lx, ly - 58);
        g.fillStyle(out ? dim(GLASS, 0.5) : SOUL_DARK, out ? 0.6 : 0.5); g.fillRect(lx - 15, ly - 46, 30, 44);
        const ch = 6 + k * 26;
        candle(g, lx, ly - 4, ch, 9, !out, t, k < 0.3 ? WAX_DARK : WAX);
        if (!out) soulWisp(g, lx, ly - 10 - ch - 6, 5, t + p.x, SOUL, 0.8);
        g.fillStyle(GLASS, 0.25); g.fillRect(lx - 15, ly - 46, 30, 44);
        g.lineStyle(2, BRASS_DARK, 1); g.strokeRect(lx - 15, ly - 46, 30, 44);
        g.lineBetween(lx, ly - 46, lx, ly - 2);
        g.fillStyle(BRASS, 1); g.fillRect(lx - 17, ly - 3, 34, 4);
        if (out) {
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 900) + i / 3) % 1;
            g.fillStyle(0x8a8a8a, 0.35 * (1 - ph)); g.fillCircle(lx + Math.sin(ph * 6 + i) * 6, ly - 50 - ph * 40, 4 + ph * 6);
          }
        } else if (k < 0.3) {
          // A guttering flicker: the glass flashes.
          g.fillStyle(SOUL_LIT, 0.2 * Math.max(0, Math.sin(time / 60))); g.fillRect(lx - 15, ly - 46, 30, 44);
        }
      }
      // The wisps: wailing, tails streaming.
      for (const w of wisps) {
        if (w.freed) {
          const k = (time - w.freedAt) / 1400;
          soulWisp(g, w.x, w.y, 9, time / 1000, SOUL_LIT, 1 - k, false, -Math.PI / 2);
          continue;
        }
        const f = nearest(w.x, w.y);
        if (f) { g.lineStyle(1, SOUL, 0.2); g.lineBetween(w.x, w.y, f.x, f.y - 10); }
        soulWisp(g, w.x, w.y, 12, time / 1000, SOUL, 0.95, true, w.a);
      }
    },

    destroy() { for (const w of wisps) w.target?.remove(); },
  };
}

export const WICK_TRIMMING: GimmickDef = {
  id: 'lantern-wick-trimming',
  rules: 'Stand by a lantern to trim its wick. A guttered lantern frees a wailing wisp that hunts the nearest fighter — strike it to set it loose.',
  make,
};
