import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BARK, BARK_DARK, BARK_LIT, BONE, BRUISE, BRUISE_LIT, DEW, GOLD_THREAD, HOURGLASS, LAMP_HOT, SILK, SILK_LIT, WEFT_LIT,
} from '../palette';
import { alive, clamp, dist, segT, stepDt } from '../util';

/**
 * Word Down the Strand — Strand-Runner Pim Ostrey, who carried the Spymaster's reports: every
 * informer on Fangmire had a strand to the great map, and a word dropped on a strand ran down it
 * to the end. In the King's telling Pim ran the words, and knew where every one of them landed.
 *
 * Four of the Spymaster's strands are strung across the yard on carved posts. Anything that
 * touches a strand is *carried*: a shot that meets one is taken up as a bead of light and runs
 * along it, away from whoever fired it, and flies out of the far end straight on, at their foe.
 * So a strand is a barrel, and the line beyond each end is its aim. Pim sends word down the strand
 * whose aim lies on you; the bead is seen running before it leaves. Stand off the ends.
 *
 * The exploit: put him on an aim and shoot the strand — your shot comes out at him. Strike a post
 * and word runs from it to the other end, out at the striker's foe. Halfway down he restrings: each
 * strand swings on its middle until one end looks at you.
 */

const ID = fallenId('web', 'strand');
const LEN = 270;
const BEAD_SPEED = 430;
const OUT_SPEED = 470;
const CATCH_R = 15;
const WORD_DMG = 13;
const PEG_DMG = 15;

type Owner = 'player' | 'npc' | 'crown';
interface Bead { t: number; dir: 1 | -1; owner: Owner; damage: number }
interface Strand { cx: number; cy: number; ang: number; toAng: number; beads: Bead[]; pegs: StrikeTarget[]; pegAt: [number, number]; flashAt: [number, number] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const strands: Strand[] = [];
  let restrung = false;
  let nextWord = 0;
  let nextRestring = 0;
  let started = false;

  const ends = (s: Strand): [Pt, Pt] => {
    const ux = Math.cos(s.ang) * LEN / 2, uy = Math.sin(s.ang) * LEN / 2;
    return [{ x: s.cx - ux, y: s.cy - uy }, { x: s.cx + ux, y: s.cy + uy }];
  };
  const along = (s: Strand, t: number): Pt => { const [a, b] = ends(s); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
  /** The aim out of end `e` (0 = a, 1 = b): from the other end through it. */
  const aimOf = (s: Strand, e: 0 | 1): number => s.ang + (e === 0 ? Math.PI : 0);
  /** How near a point lies to the line fired out of end `e`, and how far ahead of it. */
  function onAim(s: Strand, e: 0 | 1, x: number, y: number): { off: number; ahead: number } {
    const p = ends(s)[e], a = aimOf(s, e);
    const dx = x - p.x, dy = y - p.y;
    return { ahead: dx * Math.cos(a) + dy * Math.sin(a), off: Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) };
  }

  function launch(s: Strand, fromEnd: 0 | 1, owner: Owner, damage: number): void {
    if (s.beads.length >= 5) return;
    s.beads.push({ t: fromEnd === 0 ? 0 : 1, dir: fromEnd === 0 ? 1 : -1, owner, damage });
  }

  function addStrand(cx: number, cy: number, ang: number): void {
    const s: Strand = { cx, cy, ang, toAng: ang, beads: [], pegs: [], pegAt: [0, 0], flashAt: [-9999, -9999] };
    ([0, 1] as (0 | 1)[]).forEach((e) => {
      const p = ends(s)[e];
      s.pegs.push(ctx.target({
        x: p.x, y: p.y - 12, r: 14, passThrough: true,
        onStruck: (by) => {
          if (tk.now - s.pegAt[e] < 700) return;
          s.pegAt[e] = tk.now;
          launch(s, e, by, PEG_DMG);
          ctx.sfx('chain');
        },
      }));
    });
    strands.push(s);
  }

  addStrand(W * 0.3, top + 150, 0.35);
  addStrand(W * 0.7, top + 170, -0.5);
  addStrand(W * 0.28, H - 140, -0.25);
  addStrand(W * 0.72, H - 120, 0.6);

  function exit(s: Strand, e: 0 | 1, b: Bead, time: number): void {
    const p = ends(s)[e], a = aimOf(s, e);
    tk.spawnBullet({
      x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, angle: a, speed: OUT_SPEED, damage: b.damage, r: 7,
      lifeMs: 2400, color: b.owner === 'player' ? WEFT_LIT : LAMP_HOT, hits: b.owner === 'player' ? [npc] : [player],
    });
    s.flashAt[e] = time;
    ctx.sfx('zap');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWord = time + 2600; nextRestring = time + 1e9; }
      if (!restrung && npc.hp < npc.maxHp * 0.5) {
        restrung = true;
        nextRestring = time + 400;
        ctx.banner('THE STRANDS ARE RESTRUNG', '#ddd4f0');
        ctx.sfx('gear-turn');
      }
      // Restringing: each strand swings on its middle until one end looks at you.
      if (time >= nextRestring && alive(player)) {
        nextRestring = time + 7500;
        for (const s of strands) s.toAng = Math.atan2(player.y - s.cy, player.x - s.cx) + (ctx.rng() < 0.5 ? Math.PI : 0);
      }
      for (const s of strands) {
        let d = Math.atan2(Math.sin(s.toAng - s.ang), Math.cos(s.toAng - s.ang));
        // A strand turns either way round; take the shorter, end-for-end.
        if (Math.abs(d) > Math.PI / 2) d = d - Math.sign(d) * Math.PI;
        s.ang += clamp(d, -1.4 * dt, 1.4 * dt);
        ends(s).forEach((p, i) => s.pegs[i].moveTo(p.x, p.y - 12));
      }
      // Shots that touch a strand are taken up and run away from whoever fired them.
      for (const s of strands) {
        const [a, b] = ends(s);
        for (let k = 1; k < 12; k++) {
          const p = along(s, k / 12);
          for (const h of ctx.shotsNear(p.x, p.y, CATCH_R)) {
            if (s.beads.length >= 5) break;
            const shooter = h.owner === 'player' ? player : npc;
            const t = segT(h.x, h.y, a.x, a.y, b.x, b.y);
            const dir: 1 | -1 = dist(shooter.x, shooter.y, b.x, b.y) > dist(shooter.x, shooter.y, a.x, a.y) ? 1 : -1;
            h.block();
            s.beads.push({ t, dir, owner: h.owner, damage: Math.max(8, Math.round(h.damage * 1.15)) });
            ctx.sfx('crystal-chime');
          }
        }
      }
      // Beads run; at an end they fly out straight on.
      for (const s of strands) {
        for (let i = s.beads.length - 1; i >= 0; i--) {
          const b = s.beads[i];
          b.t += (b.dir * BEAD_SPEED * dt) / LEN;
          if (b.t >= 1) { exit(s, 1, b, time); s.beads.splice(i, 1); }
          else if (b.t <= 0) { exit(s, 0, b, time); s.beads.splice(i, 1); }
        }
      }
      // Pim sends word down the strand whose aim lies on you.
      if (time >= nextWord && alive(player) && alive(npc)) {
        nextWord = time + (restrung ? 2600 : 3400);
        let best: { s: Strand; e: 0 | 1 } | null = null, bo = Infinity;
        for (const s of strands) for (const e of [0, 1] as (0 | 1)[]) {
          const o = onAim(s, e, player.x, player.y);
          if (o.ahead < 20 || o.ahead > 760 || o.off >= bo) continue;
          bo = o.off; best = { s, e };
        }
        if (best) { launch(best.s, best.e === 0 ? 1 : 0, 'crown', WORD_DMG); ctx.sfx('chain'); }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Stand behind a strand whose far end aims at you, so his shots run down it into you.
      let best: Pt | null = null, bd = Infinity;
      for (const s of strands) for (const e of [0, 1] as (0 | 1)[]) {
        const o = onAim(s, e, player.x, player.y);
        if (o.ahead < 40 || o.off > 70) continue;
        const entry = ends(s)[e === 0 ? 1 : 0], a = aimOf(s, e);
        const q = { x: tk.clampX(entry.x - Math.cos(a) * 110, 60), y: tk.clampY(entry.y - Math.sin(a) * 110, 60) };
        const d = dist(npc.x, npc.y, q.x, q.y);
        if (d < bd) { bd = d; best = q; }
      }
      if (best) return best;
      // Otherwise keep off every aim with a bead coming down it.
      let x = player.x + (npc.x < player.x ? -280 : 280), y = clamp(npc.y, top + 60, H - 50);
      for (const s of strands) for (const e of [0, 1] as (0 | 1)[]) {
        const o = onAim(s, e, x, y);
        if (o.ahead > 0 && o.off < 50) y += y < (top + H) / 2 ? 90 : -90;
      }
      return { x: tk.clampX(x, 60), y: tk.clampY(y, 60) };
    },

    drawGround(g, time) {
      for (const s of strands) {
        // The aim beyond each end: faint always; bright, with chevrons, when a bead is coming.
        for (const e of [0, 1] as (0 | 1)[]) {
          const p = ends(s)[e], a = aimOf(s, e);
          const coming = s.beads.filter((b) => (e === 1 ? b.dir === 1 : b.dir === -1));
          const hot = coming.length > 0;
          const crown = coming.some((b) => b.owner !== 'player');
          const c = crown ? HOURGLASS : WEFT_LIT;
          g.lineStyle(hot ? 2 : 1, c, hot ? 0.45 : 0.1);
          g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 900, p.y + Math.sin(a) * 900);
          if (hot) {
            for (let k = 0; k < 7; k++) {
              const d = 40 + k * 70 + ((time / 4) % 70);
              const qx = p.x + Math.cos(a) * d, qy = p.y + Math.sin(a) * d;
              const l = a + Math.PI * 0.8, r = a - Math.PI * 0.8;
              g.lineStyle(2, c, 0.5);
              g.lineBetween(qx, qy, qx + Math.cos(l) * 9, qy + Math.sin(l) * 9);
              g.lineBetween(qx, qy, qx + Math.cos(r) * 9, qy + Math.sin(r) * 9);
            }
          }
        }
        const [a, b] = ends(s);
        shadow(g, a.x, a.y + 2, 26, 8); shadow(g, b.x, b.y + 2, 26, 8);
        g.lineStyle(3, 0x000000, 0.12); g.lineBetween(a.x + 4, a.y + 8, b.x + 4, b.y + 8);
      }
    },

    drawAir(g, time) {
      for (const s of strands) {
        const [a, b] = ends(s);
        drawPost(g, a.x, a.y, time - s.flashAt[0]);
        drawPost(g, b.x, b.y, time - s.flashAt[1]);
        // The strand: taut silk, a spy's knot tied every so often, dew on it.
        const ta = { x: a.x, y: a.y - 30 }, tb = { x: b.x, y: b.y - 30 };
        g.lineStyle(3, dim(SILK, 0.35), 1); g.lineBetween(ta.x, ta.y + 1, tb.x, tb.y + 1);
        g.lineStyle(1.5, SILK_LIT, 1); g.lineBetween(ta.x, ta.y, tb.x, tb.y);
        for (let k = 1; k < 6; k++) {
          const x = ta.x + (tb.x - ta.x) * (k / 6), y = ta.y + (tb.y - ta.y) * (k / 6);
          if (k % 2) { g.fillStyle(BRUISE, 1); g.fillCircle(x, y, 2.6); g.lineStyle(1, BRUISE_LIT, 1); g.lineBetween(x, y, x - 2, y + 7); g.lineBetween(x, y, x + 2, y + 6); }
          else { g.fillStyle(DEW, 0.8); g.fillCircle(x + 3, y + 1.5, 1.4); }
        }
        // A sealed report rolled and tied at the middle — whose, nobody says.
        const m = { x: (ta.x + tb.x) / 2, y: (ta.y + tb.y) / 2 };
        g.fillStyle(BONE, 1); g.fillRect(m.x - 5, m.y + 2, 10, 5);
        g.fillStyle(HOURGLASS, 1); g.fillCircle(m.x, m.y + 4.5, 1.6);
        g.lineStyle(1, SILK_LIT, 1); g.lineBetween(m.x, m.y, m.x, m.y + 2);
        // Beads: running light with a curl of paper inside, a smear of light behind.
        for (const bd of s.beads) {
          const x = ta.x + (tb.x - ta.x) * bd.t, y = ta.y + (tb.y - ta.y) * bd.t;
          const c = bd.owner === 'player' ? WEFT_LIT : LAMP_HOT;
          const tx = (tb.x - ta.x) / LEN * -bd.dir, ty = (tb.y - ta.y) / LEN * -bd.dir;
          for (let i = 1; i < 6; i++) { g.fillStyle(c, 0.35 - i * 0.05); g.fillCircle(x + tx * i * 7, y + ty * i * 7, 5 - i * 0.6); }
          glow(g, x, y, 16, c, 0.1, 3);
          g.fillStyle(lit(c, 0.5), 1); g.fillCircle(x, y, 5.5);
          g.lineStyle(1, bd.owner === 'player' ? BRUISE : HOURGLASS, 0.9); g.beginPath(); g.arc(x, y, 2.5, time / 80, time / 80 + 4.5, false); g.strokePath();
        }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      const k = clamp(1 - (nextWord - time) / (restrung ? 2600 : 3400), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 54, y - 13, 108, 26, 6);
      // A rolled report filling with ink as the next word is written.
      g.fillStyle(BONE, 1); g.fillRect(x - 40, y - 5, 64, 10);
      g.fillStyle(HOURGLASS, 0.9); g.fillRect(x - 40, y - 5, 64 * k, 10);
      g.fillStyle(dim(BONE, 0.3), 1); g.fillEllipse(x - 40, y, 5, 10); g.fillEllipse(x + 24, y, 5, 10);
      const n = strands.reduce((m, s) => m + s.beads.length, 0);
      for (let i = 0; i < Math.min(5, n); i++) { g.fillStyle(LAMP_HOT, 1); g.fillCircle(x + 34 + (i % 3) * 6, y - 4 + Math.floor(i / 3) * 8, 2.4); }
    },

    destroy() { for (const s of strands) for (const p of s.pegs) p.remove(); },
  };
}

/** A strand-post: a carved mangrove stake with the spy's eye cut in it and a ring the strand runs through. */
function drawPost(g: G, x: number, y: number, sinceFire: number): void {
  g.fillStyle(BARK_DARK, 1); g.fillRect(x - 5, y - 34, 10, 34);
  g.fillStyle(BARK, 1); g.fillRect(x - 4, y - 33, 6, 32);
  g.fillStyle(BARK_LIT, 1); g.fillRect(x - 3, y - 32, 2, 28);
  g.fillStyle(BARK_DARK, 1); g.fillTriangle(x - 6, y - 34, x + 6, y - 34, x, y - 42);
  // The eye, cut into the wood.
  g.fillStyle(BONE, 1); g.fillEllipse(x, y - 18, 7, 4);
  g.fillStyle(BRUISE, 1); g.fillCircle(x, y - 18, 1.5);
  g.lineStyle(2, GOLD_THREAD, 1); g.strokeCircle(x, y - 30, 3.5);
  if (sinceFire < 300) {
    const k = sinceFire / 300;
    g.fillStyle(LAMP_HOT, 0.8 * (1 - k)); g.fillCircle(x, y - 30, 6 + k * 12);
  }
}

export const FALLEN_STRAND: GimmickDef = {
  id: ID,
  rules: 'A shot touching a strand runs along it, away from its shooter, and flies out the far end at their foe. Stand off the ends. Strike a post: word runs.',
  make,
};
