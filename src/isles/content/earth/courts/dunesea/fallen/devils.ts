import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { PALM, PALM_DARK, SAND, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, SIROCCO, SIROCCO_LIT, STRIPE_SAFFRON } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Devils in the Dust — Soraya, Wind-Dancer of the Palace of Winds: in the star's telling the one
 * who whirls on the palace roof between the windcatchers, and whose dancing calls the hot wind's
 * little children down onto the households the Prince is tired of.
 *
 * Soraya dances dust devils up out of the yard beside you — a ring of sand turns on the floor, then
 * a funnel stands up and wanders. A dust devil swallows every shot that flies into it: yours and
 * hers alike, spinning them round inside where you can see them. Touch one and it buffets you.
 * When a devil sputters out (it leans and thins first) it flings everything it swallowed at
 * whoever stands nearest it. Dash through a devil and it bursts at once — flinging all it holds at
 * the *other* fighter.
 *
 * So the devils are loaded guns that belong to no one: fill one beside her, and step back as it
 * sputters, or dash through it. At half the devils gather: they drift together and merge, and a
 * merged devil holds both hoards. The bot hides behind a devil to have it eat your shots, and backs
 * off from one that is sputtering so you are the nearer.
 */

const ID = fallenId('dunesea', 'devils');
const R = 32;
const CATCH_R = 40;
const LIFE_MS = 7200;
const SPUTTER_MS = 1600;
const RISE_MS = 850;
const MAX_HELD = 12;
const MAX_DEVILS = 3;

interface Held { damage: number; seed: number }
interface Devil { x: number; y: number; tx: number; ty: number; born: number; dies: number; held: Held[]; r: number; seed: number }
interface Rising { x: number; y: number; at: number }
interface Gust { x: number; y: number; at: number; big: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const devils: Devil[] = [];
  const rising: Rising[] = [];
  const gusts: Gust[] = [];
  const buffetAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let spawnEvery = 4600;
  let nextSpawn = 0;
  let gather = false;
  let started = false;

  const wanderPt = () => ({ x: 90 + rng() * (W - 180), y: top + 70 + rng() * (H - top - 130) });

  function fling(d: Devil, at: Fighter | null, time: number): void {
    gusts.push({ x: d.x, y: d.y, at: time, big: d.held.length > 0 });
    ctx.sfx(d.held.length ? 'tornado' : 'gust');
    if (!at || !d.held.length) return;
    const a0 = Math.atan2(at.y - d.y, at.x - d.x);
    d.held.forEach((h, i) => {
      tk.schedule(i * 70, () => {
        if (!alive(at)) return;
        const a = a0 + (i % 2 ? 1 : -1) * (i * 0.04);
        tk.spawnBullet({ x: d.x + Math.cos(a) * (d.r + 6), y: d.y + Math.sin(a) * (d.r + 6), angle: a, speed: 430, damage: h.damage, hits: [at], turn: 1.4, r: 6, color: SIROCCO_LIT });
      });
    });
    if (at === npc) ctx.float(npc.x, npc.y - 56, `${d.held.length} FLUNG`, '#ffd08a');
  }

  function nearest(d: Devil, except: Fighter | null): Fighter | null {
    let best: Fighter | null = null, bd = Infinity;
    for (const f of [player, npc]) {
      if (f === except || !alive(f)) continue;
      const dd = dist(f.x, f.y, d.x, d.y);
      if (dd < bd) { bd = dd; best = f; }
    }
    return best;
  }

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!started) { started = true; nextSpawn = time + 2400; }
      if (!gather && npc.hp < npc.maxHp * 0.5) { gather = true; spawnEvery = 3700; ctx.banner('THE DEVILS GATHER', '#ffd08a'); ctx.sfx('tornado'); }

      // Soraya dances one up beside you.
      if (time >= nextSpawn && alive(npc)) {
        nextSpawn = time + spawnEvery;
        if (devils.length + rising.length < MAX_DEVILS) {
          const a = rng() * Math.PI * 2;
          rising.push({ x: tk.clampX(player.x + Math.cos(a) * 140, 70), y: tk.clampY(player.y + Math.sin(a) * 120, 60), at: time });
          ctx.sfx('whoosh');
        }
      }
      for (let i = rising.length - 1; i >= 0; i--) {
        const s = rising[i];
        if (time - s.at < tk.warn(RISE_MS)) continue;
        rising.splice(i, 1);
        const w = wanderPt();
        devils.push({ x: s.x, y: s.y, tx: w.x, ty: w.y, born: time, dies: time + LIFE_MS, held: [], r: R, seed: rng() * 10 });
      }

      for (let i = devils.length - 1; i >= 0; i--) {
        const d = devils[i];
        // Wander; once gathered, drift toward the nearest other devil.
        let gx = d.tx, gy = d.ty;
        if (gather) {
          const o = devils.filter((e) => e !== d).sort((a, b) => dist(d.x, d.y, a.x, a.y) - dist(d.x, d.y, b.x, b.y))[0];
          if (o) { gx = o.x; gy = o.y; }
        }
        if (dist(d.x, d.y, gx, gy) < 20) { const w = wanderPt(); d.tx = w.x; d.ty = w.y; }
        const a = Math.atan2(gy - d.y, gx - d.x), sp = gather ? 62 : 46;
        d.x = clamp(d.x + Math.cos(a) * sp * dt, 50, W - 50);
        d.y = clamp(d.y + Math.sin(a) * sp * dt, top + 40, H - 40);

        // Swallow shots.
        if (time < d.dies - 200) for (const s of ctx.shotsNear(d.x, d.y, CATCH_R + (d.r - R))) {
          s.block();
          if (d.held.length < MAX_HELD) d.held.push({ damage: Math.max(4, Math.round(s.damage)), seed: rng() * 6 });
        }
        // Buffet whoever touches it; burst if they dash through.
        let burst: Fighter | null = null;
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, d.x, d.y) > d.r + 14) continue;
          if (ctx.dashing(f)) { burst = f; break; }
          if (time - (buffetAt.get(f) ?? 0) < 500) continue;
          buffetAt.set(f, time);
          const ang = Math.atan2(f.y - d.y, f.x - d.x);
          ctx.nudge(f, Math.cos(ang + 1.2) * 34, Math.sin(ang + 1.2) * 34);
          if (f === player) tk.hitPlayer(6, f.x, f.y); else ctx.hit(npc, 9, f.x, f.y);
        }
        if (burst) { fling(d, nearest(d, burst), time); devils.splice(i, 1); continue; }
        if (time >= d.dies) { fling(d, nearest(d, null), time); devils.splice(i, 1); continue; }
      }

      // Gathered devils that touch become one.
      if (gather) {
        for (let i = 0; i < devils.length; i++) for (let j = devils.length - 1; j > i; j--) {
          const a = devils[i], b = devils[j];
          if (dist(a.x, a.y, b.x, b.y) > a.r + b.r - 10) continue;
          a.held = [...a.held, ...b.held].slice(0, MAX_HELD + 6);
          a.r = Math.min(52, a.r + 8); a.dies = Math.max(a.dies, b.dies) + 1200;
          a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2;
          devils.splice(j, 1);
          ctx.sfx('gust');
        }
      }
      for (let i = gusts.length - 1; i >= 0; i--) if (time - gusts[i].at > 700) gusts.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const t = tk.now;
      // A loaded devil sputtering near her: back off until you are the nearer.
      for (const d of devils) {
        if (d.held.length < 2 || d.dies - t > SPUTTER_MS + 400) continue;
        const mine = dist(npc.x, npc.y, d.x, d.y), yours = dist(player.x, player.y, d.x, d.y);
        if (mine < yours + 60) {
          const a = Math.atan2(npc.y - d.y, npc.x - d.x);
          return { x: tk.clampX(d.x + Math.cos(a) * (yours + 120)), y: tk.clampY(d.y + Math.sin(a) * (yours + 120)) };
        }
      }
      // Otherwise stand behind a young devil, so it eats your shots.
      const young = devils.filter((d) => d.dies - t > 3000 && dist(d.x, d.y, npc.x, npc.y) < 260)[0];
      if (!young) return null;
      const a = Math.atan2(young.y - player.y, young.x - player.x);
      return { x: tk.clampX(young.x + Math.cos(a) * (young.r + 60)), y: tk.clampY(young.y + Math.sin(a) * (young.r + 60)) };
    },

    drawGround(g, time) {
      for (const s of rising) {
        const k = clamp((time - s.at) / tk.warn(RISE_MS), 0, 1);
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2, SAND_DEEP, 0.3 + k * 0.5);
          g.beginPath(); g.arc(s.x, s.y, 14 + i * 12 + k * 6, time / 120 + i * 2, time / 120 + i * 2 + 3.6 * k + 0.6); g.strokePath();
        }
        g.fillStyle(SAND_LIT, 0.5 * k); g.fillEllipse(s.x, s.y, 30 * k, 12 * k);
      }
      for (const d of devils) {
        shadow(g, d.x, d.y + 4, d.r * 2.4, d.r * 0.8, 0.28);
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2, SAND_DARK, 0.45);
          g.beginPath(); g.arc(d.x, d.y + 2, d.r * (0.7 + i * 0.25), time / 90 + i * 2.1, time / 90 + i * 2.1 + 2.2); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      for (const d of devils) drawDevil(g, d, time, clamp((d.dies - time) / SPUTTER_MS, 0, 1), clamp((time - d.born) / 300, 0, 1));
      for (const gu of gusts) {
        const k = (time - gu.at) / 700;
        g.lineStyle(gu.big ? 4 : 2, SAND_PALE, 0.7 * (1 - k)); g.strokeCircle(gu.x, gu.y - 20, 20 + k * (gu.big ? 80 : 40));
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + k; g.fillStyle(SAND_LIT, 0.8 * (1 - k)); g.fillCircle(gu.x + Math.cos(a) * (20 + k * 70), gu.y - 20 + Math.sin(a) * (10 + k * 40), 3); }
      }
    },

    drawHud(g, time) {
      const x0 = W / 2 - 60, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 12, y - 14, 144, 28, 6);
      for (let i = 0; i < MAX_DEVILS; i++) {
        const d = devils[i];
        const cx = x0 + i * 44 + 6;
        g.fillStyle(d ? SAND : 0x4a3e30, d ? 1 : 0.5); g.fillTriangle(cx - 9, y - 10, cx + 9, y - 10, cx, y + 9);
        if (!d) continue;
        const life = clamp((d.dies - time) / LIFE_MS, 0, 1);
        g.lineStyle(2, life < SPUTTER_MS / LIFE_MS ? 0xff7050 : SAND_PALE, 1);
        g.beginPath(); g.arc(cx, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life); g.strokePath();
        for (let k = 0; k < Math.min(8, d.held.length); k++) { g.fillStyle(SIROCCO_LIT, 1); g.fillCircle(cx + 15 + (k % 2) * 5, y - 9 + Math.floor(k / 2) * 5, 1.8); }
      }
    },
  };
}

/** A dust devil: a funnel of turning sand, widening as it climbs, with frond-scraps and swallowed shots spinning in it. */
function drawDevil(g: G, d: Devil, time: number, life: number, grow: number): void {
  const sputter = life < 1 ? 1 - life : 0;
  const lean = Math.sin(time / 140 + d.seed) * (4 + sputter * 16);
  const hgt = (d.r * 3.4) * grow * (1 - sputter * 0.35);
  const fade = 1 - sputter * 0.5;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const cx = d.x + lean * t + Math.sin(time / 90 + i * 0.9 + d.seed) * (2 + t * 5);
    const cy = d.y - hgt * t;
    const w = d.r * (0.55 + t * 1.25) * (0.9 + Math.sin(time / 60 + i) * 0.05);
    g.fillStyle(i % 2 ? SAND : SAND_LIT, (0.55 - t * 0.25) * fade); g.fillEllipse(cx, cy, w * 2, w * 0.55);
    g.lineStyle(1.5, SAND_PALE, 0.5 * fade);
    g.beginPath(); g.arc(cx, cy, w * 0.9, time / 70 + i, time / 70 + i + 1.8); g.strokePath();
  }
  // Scraps of palm frond and grit whirling round.
  for (let i = 0; i < 6; i++) {
    const a = time / 160 + i * 1.05 + d.seed;
    const t = ((i * 0.17 + time / 3000) % 1);
    const x = d.x + lean * t + Math.cos(a) * d.r * (0.6 + t), y = d.y - hgt * t + Math.sin(a) * 6;
    g.fillStyle(i % 2 ? PALM : PALM_DARK, 0.9 * fade); g.fillTriangle(x - 4, y, x + 4, y - 1, x, y - 3);
    g.fillStyle(SAND_DARK, fade); g.fillCircle(x + 6, y + 2, 1.6);
  }
  // What it has swallowed, glowing as it turns.
  d.held.forEach((h, i) => {
    const a = time / 110 + h.seed + i * 0.7;
    const t = 0.15 + ((i * 0.13) % 0.7);
    const x = d.x + lean * t + Math.cos(a) * d.r * (0.5 + t * 0.6), y = d.y - hgt * t + Math.sin(a) * 5;
    g.fillStyle(SIROCCO, 1); g.fillCircle(x, y, 4);
    g.fillStyle(SIROCCO_LIT, 1); g.fillCircle(x - 1, y - 1, 2);
  });
  if (d.held.length) glow(g, d.x, d.y - hgt * 0.4, d.r * 1.4, STRIPE_SAFFRON, 0.03 + Math.min(0.06, d.held.length * 0.006), 3);
}

export const FALLEN_DEVILS: GimmickDef = {
  id: ID,
  rules: 'Dust devils swallow every shot. Sputtering out, one flings them all at whoever is nearest; dash through it to fling them at the other.',
  make,
};
