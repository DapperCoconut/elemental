import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { glint, mirrorPost } from '../art';
import { BEAM, BEAM_HOT, BRASS_DARK, GOLD_LIT } from '../palette';
import { alive, clamp, segDist } from '../util';

/**
 * Heliograph — Signaller Flash.
 *
 * Before the Endless Noon the plaza's mirror-posts sent the harbour's news up to the summit in
 * flashes; now they carry the Despot's. Six posts stand round the square, each with a silvered
 * mirror turned toward one of the others. Flash catches the sun in his hand-mirror and throws a
 * signal at a post — it races from mirror to mirror along the way each one faces, flickering
 * out its Morse while it warms (the telegraph), then burning solid for a moment. Crossing a live
 * link dazzles you: a short stun and a sting.
 *
 * Strike a mirror and it turns to face the next post along. Turn one mid-signal and the chain
 * re-routes on the instant — and a link run through Flash dazzles Flash.
 */

interface Post { x: number; y: number; aim: number; turnedAt: number; target: StrikeTarget; flashAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const N = 6;
  const cx = W / 2, cy = (top + H) / 2 + 6;
  const EVERY = ctx.hard ? 3000 : 3700;
  const WARN = ctx.hard ? 780 : 900;
  const LIVE = 1500;
  const HOPS = ctx.hard ? 5 : 4;
  const STUN = 650;
  const STING = ctx.hard ? 8 : 6;
  const posts: Post[] = [];
  let nextChain = 0;
  let started = false;
  let chainAt = -1;
  let startPost = 0;
  const immune = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2 + Math.PI / N;
    const p: Post = {
      x: cx + Math.cos(a) * 372, y: cy + Math.sin(a) * 196, aim: (i + 2) % N, turnedAt: -9999, flashAt: -9999,
      target: ctx.target({
        x: 0, y: 0, r: 24,
        onStruck() {
          const now = ctx.scene.time.now;
          if (now - p.turnedAt < 380) return;
          p.turnedAt = now;
          let next = (p.aim + 1) % N;
          if (next === i) next = (next + 1) % N;
          p.aim = next;
          ctx.sfx('crystal-chime');
          ctx.float(p.x, p.y - 80, 'TURNED', '#fff3c0');
        },
      }),
    };
    p.target.moveTo(p.x, p.y - 20);
    posts.push(p);
  }

  /** The posts the signal visits from post `s`, following each mirror's aim, stopping at a repeat. */
  function chainIdx(s: number): number[] {
    const out: number[] = [];
    let k = s;
    for (let h = 0; h <= HOPS && !out.includes(k); h++) { out.push(k); k = posts[k].aim; }
    return out;
  }

  /** The chain of points the signal runs along, from Flash's hand-mirror through the posts' mirrors. */
  const chainFrom = (s: number): Pt[] => [{ x: npc.x, y: npc.y - 30 }, ...chainIdx(s).map((k) => ({ x: posts[k].x, y: posts[k].y - 54 }))];

  /** How close the chain from post `s` passes to a fighter (link 0 excluded for Flash). */
  function chainDist(s: number, f: Fighter): number {
    const pts = chainFrom(s);
    let best = Infinity;
    for (let i = f === npc ? 1 : 0; i < pts.length - 1; i++) {
      best = Math.min(best, segDist(f.x, f.y, pts[i].x, pts[i].y + 30, pts[i + 1].x, pts[i + 1].y + 30));
    }
    return best;
  }

  const live = (time: number) => chainAt >= 0 && time >= chainAt + WARN && time < chainAt + WARN + LIVE;
  const warming = (time: number) => chainAt >= 0 && time < chainAt + WARN;

  return {
    update(time) {
      if (!started) { started = true; nextChain = time + 1800; }
      if (time >= nextChain && alive(npc)) {
        nextChain = time + EVERY;
        // Flash picks the post whose chain will run closest to you.
        let best = 0, bd = Infinity;
        for (let s = 0; s < N; s++) { const d = chainDist(s, player); if (d < bd) { bd = d; best = s; } }
        startPost = best;
        chainAt = time;
        ctx.sfx('glitch');
      }
      if (chainAt >= 0 && time >= chainAt + WARN + LIVE) chainAt = -1;
      if (chainAt >= 0 && Math.abs(time - (chainAt + WARN)) < 20) ctx.sfx('zap');
      if (live(time)) {
        for (const k of chainIdx(startPost)) posts[k].flashAt = time;
        for (const f of [player, npc]) {
          if (!alive(f) || time < (immune.get(f) ?? 0)) continue;
          if (chainDist(startPost, f) < 16) {
            immune.set(f, time + 1700);
            ctx.stun(f, STUN);
            ctx.hit(f, STING, f.x, f.y);
            ctx.flash(f.x, f.y - 20, 0xffffff);
            ctx.float(f.x, f.y - 52, 'DAZZLED', '#ffffff');
            ctx.sfx('status-shock');
          }
        }
      }
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      // Stand off at signalling range, clear of any link that is warming or burning.
      const a0 = Math.atan2(npc.y - player.y, npc.x - player.x);
      let best: Pt = { x: npc.x, y: npc.y };
      let bs = -Infinity;
      for (let i = 0; i < 10; i++) {
        const a = a0 + (i - 4.5) * 0.35;
        const x = clamp(player.x + Math.cos(a) * 250, 70, W - 70), y = clamp(player.y + Math.sin(a) * 220, top + 60, H - 50);
        let s = -Math.abs(i - 4.5) * 8;
        if (chainAt >= 0 && (warming(time) || live(time))) {
          const pts = chainFrom(startPost);
          for (let k = 1; k < pts.length - 1; k++) {
            const d = segDist(x, y, pts[k].x, pts[k].y + 30, pts[k + 1].x, pts[k + 1].y + 30);
            if (d < 70) s -= (70 - d) * 3;
          }
        }
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // Each post's aim: a faint ruled line on the marble toward the post it faces.
      for (const p of posts) {
        const q = posts[p.aim];
        g.lineStyle(1, BRASS_DARK, 0.18);
        g.lineBetween(p.x, p.y, p.x + (q.x - p.x) * 0.18, p.y + (q.y - p.y) * 0.18);
        if (time - p.turnedAt < 500) { const k = (time - p.turnedAt) / 500; g.lineStyle(3, GOLD_LIT, 1 - k); g.strokeCircle(p.x, p.y, 20 + k * 30); }
      }
      // The signal's shadow on the floor (where it actually bites: under the beam).
      if (chainAt < 0) return;
      const pts = chainFrom(startPost);
      const on = live(time);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        g.lineStyle(on ? 22 : 10, on ? BEAM : GOLD_LIT, on ? 0.22 : 0.08);
        g.lineBetween(a.x, a.y + 30, b.x, b.y + 30);
      }
    },

    drawAir(g, time) {
      for (const p of posts) {
        const q = posts[p.aim];
        const fl = clamp(1 - (time - p.flashAt) / 200, 0, 1);
        mirrorPost(g, p.x, p.y, Math.atan2(q.y - p.y, q.x - p.x), 1, fl);
      }
      if (chainAt < 0) return;
      const pts = chainFrom(startPost);
      if (warming(time)) {
        // The telegraph: Morse running down every link, dots and dashes of light.
        const k = clamp((time - chainAt) / WARN, 0, 1);
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const n = Math.floor(len / 14);
          for (let j = 0; j < n; j++) {
            const t = j / n;
            const code = (j + i * 3) % 7;
            if (code === 3 || code === 6) continue;
            const t2 = t + (code % 2 ? 0.3 : 0.12) / n;
            const ph = ((time / 120) - j * 0.3) % 2 < 1 ? 1 : 0.4;
            g.lineStyle(2, GOLD_LIT, (0.3 + k * 0.6) * ph);
            g.lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.x + (b.x - a.x) * t2, a.y + (b.y - a.y) * t2);
          }
        }
        // Flash's hand-mirror catching the sun.
        glint(g, pts[0].x, pts[0].y, 8 + k * 10, 0.6 + k * 0.4);
        return;
      }
      if (live(time)) {
        const k = clamp((time - chainAt - WARN) / LIVE, 0, 1);
        const fade = k > 0.85 ? (1 - k) / 0.15 : 1;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          g.lineStyle(14, BEAM, 0.25 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(6, BEAM_HOT, 0.9 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(2, 0xffffff, fade); g.lineBetween(a.x, a.y, b.x, b.y);
          // A pulse running along each link.
          const t = (time / 250 + i * 0.3) % 1;
          g.fillStyle(0xffffff, fade); g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 4);
        }
        for (let i = 1; i < pts.length; i++) glow(g, pts[i].x, pts[i].y, 26, 0xffffff, 0.08 * fade, 3);
        glint(g, pts[0].x, pts[0].y, 16, fade);
      }
    },

    destroy() { for (const p of posts) p.target.remove(); },
  };
}

export const HELIOGRAPH: GimmickDef = {
  id: 'noon-heliograph',
  rules: 'Flash signals along a chain of mirror-posts: a live link dazzles whoever crosses it. Strike a mirror to turn it — reroute a link through Flash.',
  make,
};
