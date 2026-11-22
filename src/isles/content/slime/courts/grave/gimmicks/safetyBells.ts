import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { bell, graveMound, greyedGhost } from '../art';
import { BONE_DARK, GREY_LIT, MARSH_GAS, PEAT_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT, WISP } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Safety Bells — Sexton Toll.
 *
 * On Fangmire the greyed are sometimes buried before they are quite done, so every grave in the
 * Sexton's field has a bell on a post and a cord down into the coffin. Toll keeps the bells. Here
 * they ring for anyone who stands by them: linger beside a post and its bell starts to swing,
 * and once it rings, the grave's ghost comes up out of the ground.
 *
 * A ghost does not care who rang for it. It drifts at whichever fighter is *farthest* from its
 * grave when it rises, grey hands out, and its touch is the grave-cold — a hard chill that slows.
 * So ring a bell when your foe is across the field and you are beside it, and the ghost is
 * theirs. Struck, a ghost is driven back; struck twice it is laid to rest. Toll's ghosts glow a
 * little green, for reasons the Sexton does not discuss.
 */

const RING_REACH = 70;
const RING_S = 0.75;
const RISE_MS = 700;
const POST_COOLDOWN = 6500;
const GHOST_LIFE = 9000;
const GHOST_R = 20;
const TOUCH = 28;
const MAX_GHOSTS = 4;
const CHILL_MS = 1600;

interface Post { x: number; y: number; meter: number; rangAt: number; rose: boolean }
interface Ghost {
  x: number; y: number; target: Fighter; born: number; seed: number;
  struck: number; recoilUntil: number; rvx: number; rvy: number;
  handle: StrikeTarget;
  dead: boolean;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const speed = ctx.hard ? 92 : 76;
  const touchDmg = ctx.hard ? 14 : 12;
  const spots: Pt[] = [
    { x: 160, y: top + 120 }, { x: W - 160, y: top + 120 }, { x: 160, y: H - 90 }, { x: W - 160, y: H - 90 },
  ];
  if (ctx.hard) spots.push({ x: W / 2, y: top + 70 });
  const posts: Post[] = spots.map((p) => ({ x: p.x, y: p.y, meter: 0, rangAt: -99999, rose: true }));
  const ghosts: Ghost[] = [];
  const chilled = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let started = false;

  /** The grave in front of each post — where its ghost comes up. */
  const graveOf = (p: Post): Pt => ({ x: p.x + 26, y: p.y + 12 });

  function raise(p: Post, time: number): void {
    if (ghosts.filter((gh) => !gh.dead).length >= MAX_GHOSTS) return;
    const gp = graveOf(p);
    const dp = alive(player) ? dist(gp.x, gp.y, player.x, player.y) : -1;
    const dn = alive(npc) ? dist(gp.x, gp.y, npc.x, npc.y) : -1;
    const target = dp >= dn ? player : npc;
    const gh: Ghost = {
      x: gp.x, y: gp.y, target, born: time, seed: rng() * 6, struck: 0, recoilUntil: 0, rvx: 0, rvy: 0, dead: false,
      handle: ctx.target({
        x: gp.x, y: gp.y - 14, r: GHOST_R,
        onStruck: (by) => {
          if (gh.dead) return;
          const s = by === 'player' ? player : npc;
          const d = Math.max(1, dist(s.x, s.y, gh.x, gh.y));
          gh.rvx = ((gh.x - s.x) / d) * 240; gh.rvy = ((gh.y - s.y) / d) * 240;
          gh.recoilUntil = ctx.scene.time.now + 320;
          gh.struck++;
          if (gh.struck >= 2) {
            gh.dead = true;
            gh.handle.remove();
            ctx.float(gh.x, gh.y - 40, 'LAID TO REST', '#e4e2dc');
            ctx.sfx('hush');
          } else ctx.sfx('whoosh');
        },
      }),
    };
    ghosts.push(gh);
    ctx.float(gp.x, gp.y - 50, target === player ? 'IT COMES FOR YOU' : 'IT GOES FOR TOLL', '#b8f0d8');
    ctx.sfx('curse-cast');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('STAND BY A BELL AND IT RINGS', '#b8f0d8'); }
      for (const p of posts) {
        if (time - p.rangAt < POST_COOLDOWN) {
          if (!p.rose && time - p.rangAt >= RISE_MS) { p.rose = true; raise(p, time); }
          continue;
        }
        const near = [player, npc].some((f) => alive(f) && dist(f.x, f.y, p.x, p.y) < RING_REACH);
        p.meter = clamp(p.meter + (near ? dt / RING_S : -dt * 0.8), 0, 1);
        if (p.meter >= 1) {
          p.meter = 0;
          p.rangAt = time;
          p.rose = false;
          ctx.float(p.x, p.y - 70, 'TOLL', '#e2b462');
          ctx.sfx('holy-chord');
        }
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const gh = ghosts[i];
        if (gh.dead) { ghosts.splice(i, 1); continue; }
        if (time - gh.born > GHOST_LIFE || !alive(gh.target)) {
          gh.dead = true; gh.handle.remove(); ghosts.splice(i, 1); continue;
        }
        if (time < gh.recoilUntil) { gh.x += gh.rvx * dt; gh.y += gh.rvy * dt; }
        else {
          const f = gh.target;
          const d = Math.max(1, dist(gh.x, gh.y, f.x, f.y));
          const wob = Math.sin(time / 300 + gh.seed) * 0.5;
          const ux = (f.x - gh.x) / d, uy = (f.y - gh.y) / d;
          gh.x += (ux - uy * wob) * speed * dt;
          gh.y += (uy + ux * wob) * speed * dt;
          if (d < TOUCH && !ctx.isAirborne(f)) {
            ctx.hit(f, touchDmg, f.x, f.y);
            chilled.set(f, time + CHILL_MS);
            ctx.float(f.x, f.y - 46, 'GRAVE-COLD', '#c9cfd3');
            ctx.sfx('frost-blast');
            gh.dead = true; gh.handle.remove(); ghosts.splice(i, 1); continue;
          }
        }
        gh.x = clamp(gh.x, 30, W - 30); gh.y = clamp(gh.y, top + 20, H - 20);
        gh.handle.moveTo(gh.x, gh.y - 14);
      }
    },

    playerSpeedMult() { return ctx.scene.time.now < (chilled.get(player) ?? 0) ? 0.62 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < (chilled.get(npc) ?? 0) ? 0.62 : 1; },

    npcSeek(): Pt | null {
      const time = ctx.scene.time.now;
      // Run from a ghost that has his name on it.
      const hunter = ghosts.find((gh) => !gh.dead && gh.target === npc && dist(gh.x, gh.y, npc.x, npc.y) < 240);
      if (hunter) {
        const d = Math.max(1, dist(hunter.x, hunter.y, npc.x, npc.y));
        return { x: clamp(npc.x + ((npc.x - hunter.x) / d) * 200, 60, W - 60), y: clamp(npc.y + ((npc.y - hunter.y) / d) * 200, top + 50, H - 40) };
      }
      // Otherwise ring the bell the player is farthest from.
      let best: Post | null = null, bs = 80;
      for (const p of posts) {
        if (time - p.rangAt < POST_COOLDOWN) continue;
        const gp = graveOf(p);
        const s = dist(gp.x, gp.y, player.x, player.y) - dist(gp.x, gp.y, npc.x, npc.y) * 0.5;
        if (s > bs) { bs = s; best = p; }
      }
      if (best) return { x: best.x + 10, y: best.y + 30 };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 160, 60, W - 60), y: clamp(player.y + Math.sin(a) * 160, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const p of posts) {
        const gp = graveOf(p);
        graveMound(g, gp.x, gp.y + 6, 50, () => 0.5, time - p.rangAt < POST_COOLDOWN);
        // The reach of the bell, filling as someone lingers.
        g.lineStyle(1.5, BONE_DARK, 0.25); g.strokeEllipse(p.x, p.y + 6, RING_REACH * 2, RING_REACH * 1.2);
        if (p.meter > 0) {
          g.lineStyle(3, WISP, 0.3 + p.meter * 0.5);
          g.beginPath(); g.arc(p.x, p.y + 6, RING_REACH * 0.9, -Math.PI / 2, -Math.PI / 2 + p.meter * Math.PI * 2, false); g.strokePath();
        }
        // The grave breaking open as its ghost comes up.
        if (!p.rose || time - p.rangAt < RISE_MS + 500) {
          const k = clamp((time - p.rangAt) / RISE_MS, 0, 1);
          g.fillStyle(PEAT_DARK, 0.9); g.fillEllipse(gp.x, gp.y + 4, 30 * k + 6, 12 * k + 3);
          g.fillStyle(MARSH_GAS, 0.15 * k); g.fillEllipse(gp.x, gp.y, 50, 18);
        }
      }
      // Ghost trails along the ground: a grey smear toward their quarry.
      for (const gh of ghosts) {
        g.fillStyle(WISP, 0.06); g.fillEllipse(gh.x, gh.y + 6, 40, 12);
        g.lineStyle(1, GREY_LIT, 0.18); g.lineBetween(gh.x, gh.y, gh.target.x, gh.target.y);
      }
    },

    drawAir(g, time) {
      for (const p of posts) {
        const swingT = time - p.rangAt;
        const swing = swingT < POST_COOLDOWN ? Math.sin(swingT / 110) * 0.7 * Math.max(0, 1 - swingT / 2600) : Math.sin(time / 140) * 0.25 * p.meter;
        // The post: a black gibbet of wet timber with the bell under its arm.
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 8, p.y + 4, 34, 9);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x - 4, p.y - 70, 8, 72);
        g.fillStyle(TIMBER, 1); g.fillRect(p.x - 3, p.y - 70, 3, 72);
        g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(p.x - 3, p.y - 66, p.x + 28, p.y - 68);
        g.lineStyle(2, TIMBER_LIT, 1); g.lineBetween(p.x - 3, p.y - 67, p.x + 28, p.y - 69);
        g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(p.x, p.y - 48, p.x + 16, p.y - 66);
        g.fillStyle(dim(TIMBER_DARK, 0.3), 1); g.fillTriangle(p.x - 5, p.y - 70, p.x + 5, p.y - 70, p.x, p.y - 79);
        bell(g, p.x + 24, p.y - 64, 8, swing);
        // The cord down into the coffin, jerking as the bell goes.
        const gp = graveOf(p);
        const jerk = Math.abs(swing) * 6;
        g.lineStyle(1.2, BONE_DARK, 0.9);
        g.beginPath(); g.moveTo(p.x + 24 + Math.sin(swing) * 12, p.y - 50); g.lineTo(gp.x + jerk, (p.y - 50 + gp.y) / 2); g.lineTo(gp.x, gp.y - 2); g.strokePath();
        if (swingT < 900) { const k = swingT / 900; g.lineStyle(2, 0xe2b462, 0.6 * (1 - k)); g.strokeCircle(p.x + 24, p.y - 56, 14 + k * 50); }
        // A hand coming up the cord while the ghost rises.
        if (!p.rose) {
          const k = clamp(swingT / RISE_MS, 0, 1);
          greyedGhost(g, gp.x, gp.y + (1 - k) * 26, 0.6 + k * 0.4, k, time, p.x, 0.2 + k * 0.6);
        }
      }
      for (const gh of ghosts) {
        const life = clamp((GHOST_LIFE - (time - gh.born)) / 900, 0, 1);
        greyedGhost(g, gh.x, gh.y, 1, (gh.struck ? 0.6 : 0.9) * life, time, gh.seed, 0.9);
        // Toll's ghosts: a faint green glow in the hood.
        g.fillStyle(MARSH_GAS, 0.12 * life); g.fillCircle(gh.x, gh.y - 22, 9);
      }
    },

    destroy() { for (const gh of ghosts) gh.handle.remove(); ghosts.length = 0; },
  };
}

export const SAFETY_BELLS: GimmickDef = {
  id: 'grave-safety-bells',
  rules: 'Linger by a bell post and its bell rings; the grave\'s ghost rises and drifts at whichever fighter is farthest from it. Its touch chills. Strike a ghost twice to lay it.',
  make,
};
