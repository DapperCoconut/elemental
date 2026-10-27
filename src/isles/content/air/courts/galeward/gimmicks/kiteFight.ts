import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { kite, kitePost } from '../art';
import { BRASS_LIT, KITE_BLUE, KITE_OCHRE, KITE_RED, ROPE } from '../palette';
import { alive, clamp, dist, segDist, stepDt, turnToward, wrapAngle } from '../util';

/**
 * Kite Fight — Kiteflyer Oriel.
 *
 * Five posts stand round the yard, and from each one a fighting-kite flies on a line coated in
 * ground glass — the old Galeward game, where you cut your rival's line out of the sky. Here the
 * lines are low, and they cut people. A loose kite (white ribbon) wanders on the wind, and its
 * line sweeps back and forth across the floor; whoever runs through a line is cut.
 *
 * Stand at a post and you take its kite: it flies your colour, its line no longer cuts you, and
 * it turns to hunt your foe — the line swings round its post toward them, slow enough to step
 * over if they see it coming. Walk away from the post and you keep it a while; then the wind
 * takes it back. Oriel has flown kites since before she could walk. She will be at the posts
 * first unless you are.
 */

const POST_TAKE_R = 36;
const TAKE_MS = 700;
const KEEP_MS = 6500;
const LINE_LEN = 175;
const CUT_DMG = 9;
const RECUT_MS = 800;
const HUNT_TURN = 1.25;

type Owner = 'none' | 'player' | 'npc';

interface Kite {
  x: number; y: number;
  /** Angle from the post to the kite. */
  a: number;
  owner: Owner;
  /** When the owner walked off the post (keeps it until +KEEP_MS). */
  leftAt: number;
  /** Progress toward being taken, and by whom. */
  take: number;
  taker: Owner;
  seed: number;
  /** Last cut per victim. */
  cutP: number; cutN: number;
  cutFx: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const midY = (top + H) / 2 + 10;
  const posts: Kite[] = [
    { x: 110, y: top + 90 }, { x: W - 110, y: top + 90 }, { x: W / 2, y: midY }, { x: 130, y: H - 60 }, { x: W - 130, y: H - 60 },
  ].map((p, i) => ({ ...p, a: (i % 2 ? Math.PI : 0) + (rng() - 0.5), owner: 'none' as Owner, leftAt: 0, take: 0, taker: 'none' as Owner, seed: rng() * 6, cutP: 0, cutN: 0, cutFx: 0 }));
  const lineLen = ctx.hard ? LINE_LEN + 20 : LINE_LEN;

  const foeOf = (o: Owner): Fighter | null => (o === 'player' ? npc : o === 'npc' ? player : null);
  const colorOf = (o: Owner): number => (o === 'player' ? KITE_BLUE : o === 'npc' ? KITE_RED : 0xf2efe6);
  const kitePos = (k: Kite) => ({ x: k.x + Math.cos(k.a) * lineLen, y: k.y + Math.sin(k.a) * lineLen * 0.8 });

  function cut(k: Kite, f: Fighter, who: 'p' | 'n', time: number): void {
    const last = who === 'p' ? k.cutP : k.cutN;
    if (time - last < RECUT_MS) return;
    if (who === 'p') k.cutP = time; else k.cutN = time;
    k.cutFx = time;
    ctx.hit(f, CUT_DMG, f.x, f.y);
    ctx.float(f.x, f.y - 46, k.owner === 'none' ? 'CUT' : f === npc ? 'CUT BY YOUR LINE' : 'CUT', f === npc ? '#9fd0f2' : '#ff9a7a');
    ctx.sfx('slash');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      for (const k of posts) {
        // Taking a post: stand on it.
        const onP = alive(player) && dist(player.x, player.y, k.x, k.y) < POST_TAKE_R;
        const onN = alive(npc) && dist(npc.x, npc.y, k.x, k.y) < POST_TAKE_R;
        const standing: Owner = onP && !onN ? 'player' : onN && !onP ? 'npc' : 'none';
        if (standing !== 'none' && standing !== k.owner) {
          if (k.taker !== standing) { k.taker = standing; k.take = 0; }
          k.take += dt * 1000;
          if (k.take >= TAKE_MS) {
            k.owner = standing; k.take = 0; k.taker = 'none';
            ctx.float(k.x, k.y - 52, standing === 'player' ? 'YOUR KITE' : 'ORIEL\'S KITE', standing === 'player' ? '#9fd0f2' : '#ff9a7a');
            ctx.sfx('wings');
          }
        } else if (standing === 'none') { k.take = Math.max(0, k.take - dt * 2000); }
        if (k.owner !== 'none' && standing === k.owner) k.leftAt = time;
        if (k.owner !== 'none' && time - k.leftAt > KEEP_MS) {
          k.owner = 'none';
          ctx.float(k.x, k.y - 52, 'THE WIND TAKES IT', '#f2efe6');
        }

        // Flying: a loose kite rides the wind and sweeps; an owned one hunts the owner's foe.
        const foe = foeOf(k.owner);
        if (foe && alive(foe)) {
          const want = Math.atan2((foe.y - k.y) / 0.8, foe.x - k.x);
          k.a = turnToward(k.a, want, (ctx.hard ? HUNT_TURN * 1.15 : HUNT_TURN) * dt);
        } else {
          const want = Math.sin(time / 1700 + k.seed) * 1.6 + (k.x < W / 2 ? 0 : Math.PI) + Math.sin(time / 600 + k.seed * 2) * 0.2;
          k.a = turnToward(k.a, want, 1.0 * dt);
        }
        // The line cuts whoever is not its owner.
        const kp = kitePos(k);
        for (const [f, who, o] of [[player, 'p', 'player'], [npc, 'n', 'npc']] as [Fighter, 'p' | 'n', Owner][]) {
          if (!alive(f) || k.owner === o) continue;
          if (dist(f.x, f.y, k.x, k.y) < POST_TAKE_R) continue;
          if (segDist(f.x, f.y, k.x, k.y, kp.x, kp.y) < 12) cut(k, f, who, time);
        }
      }
    },

    npcSeek() {
      // Oriel: the nearest post that is not hers, unless she holds two already — then she hunts.
      const mine = posts.filter((k) => k.owner === 'npc').length;
      if (mine >= 2) return null;
      let best: Kite | null = null, bd = Infinity;
      for (const k of posts) {
        if (k.owner === 'npc') continue;
        const d = dist(npc.x, npc.y, k.x, k.y) + (k.owner === 'player' ? -60 : 0);
        if (d < bd) { bd = d; best = k; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      for (const k of posts) {
        const c = colorOf(k.owner);
        // The post's take-ring, filling while someone stands on it.
        g.lineStyle(2, c, 0.45); g.strokeCircle(k.x, k.y, POST_TAKE_R);
        if (k.take > 0) {
          g.lineStyle(4, colorOf(k.taker), 0.9);
          g.beginPath(); g.arc(k.x, k.y, POST_TAKE_R, -Math.PI / 2, -Math.PI / 2 + (k.take / TAKE_MS) * Math.PI * 2, false); g.strokePath();
        }
        // The arc an owned kite will sweep toward its prey, faintly.
        const foe = foeOf(k.owner);
        if (foe && alive(foe)) {
          const want = Math.atan2((foe.y - k.y) / 0.8, foe.x - k.x);
          const d = wrapAngle(want - k.a);
          if (Math.abs(d) > 0.05) {
            g.fillStyle(c, 0.07);
            g.slice(k.x, k.y, lineLen, Math.min(k.a, k.a + d), Math.max(k.a, k.a + d), false); g.fillPath();
          }
        }
        // The kite's shadow on the yard.
        const kp = kitePos(k);
        g.fillStyle(0x000000, 0.14); g.fillEllipse(kp.x + 14, kp.y + 30, 22, 8);
        // A remaining-hold arc at the foot of the post.
        if (k.owner !== 'none' && time - k.leftAt > 200) {
          const left = clamp(1 - (time - k.leftAt) / KEEP_MS, 0, 1);
          g.lineStyle(2, c, 0.8); g.beginPath(); g.arc(k.x, k.y, POST_TAKE_R + 6, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      for (const k of posts) {
        kitePost(g, k.x, k.y, colorOf(k.owner));
        const kp = kitePos(k);
        const c = colorOf(k.owner);
        // The line: hemp with a glitter of ground glass along it, catching the light in a run.
        g.lineStyle(3, 0x000000, 0.25); g.lineBetween(k.x, k.y - 22, kp.x, kp.y);
        g.lineStyle(1.6, k.owner === 'none' ? ROPE : c, 1); g.lineBetween(k.x, k.y - 22, kp.x, kp.y);
        const run = (time / 400 + k.seed) % 1;
        for (let i = 0; i < 6; i++) {
          const t = (run + i / 6) % 1;
          g.fillStyle(0xffffff, 0.5 + Math.sin(time / 90 + i) * 0.3);
          g.fillRect(k.x + (kp.x - k.x) * t - 1, k.y - 22 + (kp.y - k.y + 22) * t - 1, 2, 2);
        }
        if (time - k.cutFx < 260) {
          g.lineStyle(4, BRASS_LIT, 1 - (time - k.cutFx) / 260); g.lineBetween(k.x, k.y - 22, kp.x, kp.y);
        }
        kite(g, kp.x, kp.y - 6, 1.5, k.owner === 'none' ? (k.seed > 3 ? KITE_OCHRE : 0xf2efe6) : c, k.a, time / 1000 + k.seed);
      }
    },

    drawHud(g) {
      // Kite tally: five pips along the top, coloured by owner.
      posts.forEach((k, i) => {
        const x = W / 2 - 60 + i * 30, y = top + 14;
        g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 9);
        g.fillStyle(colorOf(k.owner), 1);
        g.fillTriangle(x + 7, y, x, y - 7, x - 7, y); g.fillTriangle(x + 7, y, x, y + 7, x - 7, y);
      });
    },
  };
}

export const KITE_FIGHT: GimmickDef = {
  id: 'galeward-kite-fight',
  rules: 'Five kites fly from posts on glass-coated lines that cut whoever runs through them (9). Stand at a post to take its kite: your lines spare you and swing round to hunt your foe. You keep a kite 6.5s after leaving its post.',
  make,
};
