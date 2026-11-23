import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { GILT, GILT_DARK, GILT_LIT, MIRROR, MIRROR_DARK, MIRROR_LIT, OAK, OAK_DARK } from '../palette';
import { alive, clamp, segDist, stepDt } from '../util';

/**
 * Hall of Mirrors — Mirrorwright Silver.
 *
 * Six tall cheval mirrors stand about the floor, each set on the diagonal. A shot that strikes a
 * mirror's face is sent straight back off the glass — and becomes the other side's shot, so a
 * bolt banked off a mirror at the right angle comes round at whoever fired the first one. The
 * back of a mirror is plain oak: a shot there just stops. A blow on the back turns the mirror a
 * quarter-turn on its stand.
 *
 * Silver works the mirrors for a living. Every few seconds she raises her lamp and throws a GLINT:
 * a beam of light that leaves her toward you, bouncing off every mirror face in its way. Its path
 * is drawn on the floor first. Turn the mirrors so the glint comes back round to her, and it
 * dazzles her instead — the beam doesn't care whose lamp it came out of.
 */

const HALF = 40; // half the mirror's width
const TURN_MS = 420;
const GLINT_EVERY = 6600;
const GLINT_WARN = 1150;
const GLINT_HALF = 14;
const GLINT_DMG = 14;
const GLINT_SELF_DMG = 18;

interface Mirror {
  x: number; y: number;
  /** Face normal angle (a diagonal: π/4 + kπ/2). */
  a: number;
  /** Turning from `from` to `a` until `turnUntil`. */
  from: number;
  turnUntil: number;
  back: StrikeTarget | null;
  /** Recent reflections, so a shot leaving the glass isn't bounced twice. */
  recent: { x: number; y: number; at: number }[];
  flashAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const SPOTS: Pt[] = [
    { x: 220, y: top + 140 }, { x: W - 220, y: top + 140 }, { x: W / 2, y: top + 250 },
    { x: 220, y: H - 120 }, { x: W - 220, y: H - 120 }, { x: W / 2, y: H - 60 },
  ];
  const mirrors: Mirror[] = SPOTS.map((p, i) => {
    const a = Math.PI / 4 + ((i + Math.floor(rng() * 4)) % 4) * (Math.PI / 2);
    return { x: p.x, y: p.y, a, from: a, turnUntil: 0, back: null, recent: [], flashAt: -9999 };
  });
  let started = false;
  let nextGlint = 0;
  let glintWarnAt = -1;
  let glintPath: Pt[] = [];
  let glintFiredAt = -9999;

  const normal = (m: Mirror) => ({ x: Math.cos(m.a), y: Math.sin(m.a) });
  const ends = (m: Mirror, a = m.a) => {
    const tx = -Math.sin(a), ty = Math.cos(a);
    return [{ x: m.x + tx * HALF, y: m.y + ty * HALF }, { x: m.x - tx * HALF, y: m.y - ty * HALF }];
  };
  const turning = (m: Mirror, time: number) => time < m.turnUntil;

  function placeBack(m: Mirror): void {
    const n = normal(m);
    const bx = m.x - n.x * 22, by = m.y - n.y * 22;
    if (m.back) m.back.moveTo(bx, by);
    else m.back = ctx.target({ x: bx, y: by, r: 18, onStruck: () => turn(m) });
  }

  function turn(m: Mirror): void {
    const time = ctx.scene.time.now;
    if (turning(m, time)) return;
    m.from = m.a;
    m.a += Math.PI / 2;
    m.turnUntil = time + TURN_MS;
    ctx.sfx('gear-turn');
    placeBack(m);
  }

  /** Trace a glint from (x, y) along angle `a`, bouncing off mirror faces, stopping on backs and walls. */
  function trace(x: number, y: number, a: number, time: number): Pt[] {
    const pts: Pt[] = [{ x, y }];
    let dx = Math.cos(a), dy = Math.sin(a);
    let last: Mirror | null = null;
    for (let bounce = 0; bounce < 5; bounce++) {
      let best = Infinity, hit: Mirror | null = null, face = false;
      for (const m of mirrors) {
        if (m === last || turning(m, time)) continue;
        const [p, q] = ends(m);
        // Ray–segment intersection.
        const ex = q.x - p.x, ey = q.y - p.y;
        const den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-6) continue;
        const t = ((p.x - x) * ey - (p.y - y) * ex) / den;
        const u = ((p.x - x) * dy - (p.y - y) * dx) / den;
        if (t > 1 && u >= 0 && u <= 1 && t < best) {
          best = t; hit = m;
          const n = normal(m);
          face = dx * n.x + dy * n.y < 0;
        }
      }
      // Distance to the arena wall along the ray.
      const tw = Math.min(
        dx > 0 ? (W - 20 - x) / dx : dx < 0 ? (20 - x) / dx : Infinity,
        dy > 0 ? (H - 20 - y) / dy : dy < 0 ? (top + 10 - y) / dy : Infinity,
      );
      if (!hit || best > tw) { pts.push({ x: x + dx * tw, y: y + dy * tw }); break; }
      x += dx * best; y += dy * best;
      pts.push({ x, y });
      if (!face) break;
      const n = normal(hit);
      const d = dx * n.x + dy * n.y;
      dx -= 2 * d * n.x; dy -= 2 * d * n.y;
      last = hit;
    }
    return pts;
  }

  /** On the beam? The first stretch ignores the bit right at the lamp (`skipFirst` px). */
  const onPath = (path: Pt[], x: number, y: number, skipFirst: number) => {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (segDist(x, y, a.x, a.y, b.x, b.y) >= GLINT_HALF + 12) continue;
      if (i === 0 && Math.hypot(x - a.x, y - a.y) < skipFirst) continue;
      return true;
    }
    return false;
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        for (const m of mirrors) placeBack(m);
        nextGlint = time + 4200;
      }
      // Shots against the glass.
      for (const m of mirrors) {
        m.recent = m.recent.filter((r) => time - r.at < 170);
        if (turning(m, time)) continue;
        const n = normal(m);
        const tx = -n.y, ty = n.x;
        for (const s of ctx.shotsNear(m.x, m.y, HALF + 20)) {
          const rx = s.x - m.x, ry = s.y - m.y;
          const along = rx * tx + ry * ty, across = rx * n.x + ry * n.y;
          if (Math.abs(along) > HALF || across < 0 || across > 16) continue;
          if (m.recent.some((r) => Math.hypot(r.x - s.x, r.y - s.y) < 34)) continue;
          if (s.reflect(n.x, n.y)) {
            m.recent.push({ x: s.x, y: s.y, at: time });
            m.flashAt = time;
            ctx.sfx('crystal-chime');
          }
        }
      }

      // Silver's glint.
      if (glintWarnAt < 0 && time >= nextGlint - GLINT_WARN && alive(npc) && alive(player)) {
        glintWarnAt = time;
        const a = Math.atan2(player.y - npc.y, player.x - npc.x) + (rng() - 0.5) * 0.25;
        glintPath = trace(npc.x, npc.y - 20, a, time);
        ctx.sfx('beam-charge');
      }
      if (glintWarnAt >= 0 && time >= nextGlint) {
        nextGlint = time + (ctx.hard ? 5400 : GLINT_EVERY);
        glintWarnAt = -1;
        glintFiredAt = time;
        ctx.sfx('light-beam');
        if (alive(player) && onPath(glintPath, player.x, player.y, 0)) {
          ctx.tk.hitPlayer(GLINT_DMG, player.x, player.y);
          ctx.float(player.x, player.y - 46, 'DAZZLED', '#f2f8ff');
        }
        // Her own glint, bounced back to her lamp.
        if (alive(npc) && glintPath.length > 2 && onPath(glintPath, npc.x, npc.y, 60)) {
          ctx.hit(npc, GLINT_SELF_DMG, npc.x, npc.y);
          ctx.stun(npc, 800);
          ctx.float(npc.x, npc.y - 50, 'OWN GLINT!', '#f2f8ff');
        }
      }
    },

    npcSeek() {
      // Turn the mirror nearest you so its back faces her and its face faces you — or keep range.
      if (glintWarnAt >= 0) return null;
      let best: Mirror | null = null;
      let bd = Infinity;
      for (const m of mirrors) {
        const d = Math.hypot(m.x - player.x, m.y - player.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (!best || bd > 220) return null;
      const n = normal(best);
      // Behind the glass, where a blow turns it.
      return { x: clamp(best.x - n.x * 46, 60, W - 60), y: clamp(best.y - n.y * 46, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The parquet bands that run between the mirrors, and each mirror's base and reflection.
      for (const m of mirrors) {
        const [p, q] = ends(m, angleNow(m, time));
        g.fillStyle(0x000000, 0.25); g.fillEllipse(m.x, m.y + 6, HALF * 2.2, 20);
        g.lineStyle(6, OAK_DARK, 1); g.lineBetween(p.x, p.y, q.x, q.y);
        // A pale fan of reflected light on the floor in front of the face.
        const a = angleNow(m, time);
        g.fillStyle(MIRROR_LIT, time - m.flashAt < 200 ? 0.3 : 0.07);
        g.fillTriangle(p.x, p.y, q.x, q.y, m.x + Math.cos(a) * 70, m.y + Math.sin(a) * 70);
      }
      // The glint's path: drawn on the floor first, brightening to the strike.
      if (glintWarnAt >= 0) {
        const k = clamp((time - glintWarnAt) / GLINT_WARN, 0, 1);
        for (let i = 0; i < glintPath.length - 1; i++) {
          const a = glintPath[i], b = glintPath[i + 1];
          g.lineStyle(GLINT_HALF * 2, MIRROR_LIT, 0.06 + k * 0.14); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(2, MIRROR_LIT, 0.3 + k * 0.6); g.lineBetween(a.x, a.y, b.x, b.y);
        }
        for (let i = 1; i < glintPath.length - 1; i++) { g.fillStyle(0xffffff, 0.4 + k * 0.5); g.fillCircle(glintPath[i].x, glintPath[i].y, 5 + k * 4); }
      }
    },

    drawAir(g, time) {
      // The glint itself: a white-hot beam for a moment.
      if (time - glintFiredAt < 320) {
        const k = (time - glintFiredAt) / 320;
        for (let i = 0; i < glintPath.length - 1; i++) {
          const a = glintPath[i], b = glintPath[i + 1];
          g.lineStyle(GLINT_HALF * 2 * (1 - k * 0.5), lit(MIRROR, 0.5), 0.5 * (1 - k)); g.lineBetween(a.x, a.y, b.x, b.y);
          g.lineStyle(4, 0xffffff, 1 - k); g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      // Each mirror standing: a gilt-framed glass rising off its base, oak behind.
      for (const m of mirrors) {
        const a = angleNow(m, time);
        const [p, q] = ends(m, a);
        const faceUs = Math.sin(a) > 0; // facing down-screen, toward the viewer
        const HT = 74;
        const quad = [p, q, { x: q.x, y: q.y - HT }, { x: p.x, y: p.y - HT }];
        g.fillStyle(GILT_DARK, 1); g.fillPoints(quad, true);
        const inset = [
          { x: p.x + (q.x - p.x) * 0.08, y: p.y + (q.y - p.y) * 0.08 - 6 },
          { x: q.x + (p.x - q.x) * 0.08, y: q.y + (p.y - q.y) * 0.08 - 6 },
          { x: q.x + (p.x - q.x) * 0.08, y: q.y + (p.y - q.y) * 0.08 - HT + 6 },
          { x: p.x + (q.x - p.x) * 0.08, y: p.y + (q.y - p.y) * 0.08 - HT + 6 },
        ];
        if (faceUs) {
          g.fillStyle(MIRROR_DARK, 1); g.fillPoints(inset, true);
          g.fillStyle(MIRROR, 0.75);
          g.fillTriangle(inset[0].x, inset[0].y, inset[1].x, inset[1].y, inset[3].x, inset[3].y);
          const sh = ((time / 1600) + m.x * 0.001) % 1;
          g.fillStyle(0xffffff, 0.35);
          g.fillTriangle(
            inset[0].x + (inset[1].x - inset[0].x) * sh, inset[0].y + (inset[1].y - inset[0].y) * sh,
            inset[0].x + (inset[1].x - inset[0].x) * Math.min(1, sh + 0.15), inset[0].y + (inset[1].y - inset[0].y) * Math.min(1, sh + 0.15),
            inset[3].x + (inset[2].x - inset[3].x) * sh, inset[3].y + (inset[2].y - inset[3].y) * sh,
          );
        } else {
          g.fillStyle(OAK, 1); g.fillPoints(inset, true);
          g.lineStyle(1, OAK_DARK, 0.8);
          for (let k = 1; k < 4; k++) g.lineBetween(inset[0].x, inset[0].y - (k * (HT - 12)) / 4, inset[1].x, inset[1].y - (k * (HT - 12)) / 4);
        }
        if (time - m.flashAt < 220) { g.fillStyle(0xffffff, 0.6 * (1 - (time - m.flashAt) / 220)); g.fillPoints(inset, true); }
        // Crest and finials.
        g.fillStyle(GILT_LIT, 1); g.fillCircle((p.x + q.x) / 2, (p.y + q.y) / 2 - HT - 4, 5);
        g.fillStyle(GILT, 1); g.fillCircle(p.x, p.y - HT, 3); g.fillCircle(q.x, q.y - HT, 3);
        // An arrow showing which way the glass looks.
        const n = { x: Math.cos(a), y: Math.sin(a) };
        g.lineStyle(2, dim(GILT, 0.1), 0.7); g.lineBetween(m.x + n.x * 10, m.y + n.y * 10, m.x + n.x * 26, m.y + n.y * 26);
        g.fillStyle(GILT, 0.8); g.fillTriangle(m.x + n.x * 32, m.y + n.y * 32, m.x + n.x * 22 - n.y * 6, m.y + n.y * 22 + n.x * 6, m.x + n.x * 22 + n.y * 6, m.y + n.y * 22 - n.x * 6);
      }
      // Silver's lamp, lit before a glint.
      if (glintWarnAt >= 0 && alive(npc)) {
        const k = clamp((time - glintWarnAt) / GLINT_WARN, 0, 1);
        g.fillStyle(0xffffff, 0.3 + k * 0.6); g.fillCircle(npc.x + 14, npc.y - 44, 4 + k * 6);
        g.lineStyle(2, MIRROR_LIT, k); g.strokeCircle(npc.x + 14, npc.y - 44, 10 + k * 14);
      }
    },

    destroy() {
      for (const m of mirrors) m.back?.remove();
    },
  };

  function angleNow(m: Mirror, time: number): number {
    if (!turning(m, time)) return m.a;
    const k = 1 - (m.turnUntil - time) / TURN_MS;
    return m.from + (m.a - m.from) * clamp(k, 0, 1);
  }
}

export const HALL_OF_MIRRORS: GimmickDef = {
  id: 'masque-hall-of-mirrors',
  rules: 'Mirrors send back any shot that strikes their face — as the other side\'s. Strike a mirror\'s back to turn it. Silver\'s glint bounces off the glass: turn it back on her.',
  make,
};
