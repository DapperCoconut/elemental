import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { dim, lit, mulberry } from '../../../../../art/IsleArt';
import { FEATHER, LINEN, QUILTS, STITCH, dist, patch, segDist, stitchLine } from '../art';
import { fallenId } from '../../../../meteor/spec';
import { EMBER, alive, hudPlate, inRect, scorch } from './kit';

/**
 * Tucked In — Mother Gusset, Quilter of the Long Ward: in the star's telling, the woman who sewed
 * the becalmed into their beds. Every quilt on the Long Ward is hers, and in this version of the
 * story every one of them is stitched shut along the mattress so nobody gets up before the debt
 * is worked off.
 *
 * The whole yard is one of her quilts: twelve padded patches. Her needle runs a seam round the
 * patch you stand in, corner to corner, laying red thread behind it. Get out before it closes —
 * but laid thread *snags*: crossing it holds you a moment (a real root) and puts you back where
 * you were. You leave through the side the needle has not reached yet. When the seam meets
 * itself the patch is tucked: everyone inside is held and squeezed, Gusset included.
 *
 * The thing to do: pearl-headed pins stand at the patch's corners, and the pin the needle is
 * heading for can be struck out — the seam unpicks and the thread falls slack. Halfway down she
 * threads a second needle and sews the patch beside yours at the same time, the other way round.
 * The bot walks out through the open side, and stands in your gap to keep you in.
 */

const ID = fallenId('slumber', 'tucked-in');
const COLS = 4;
const ROWS = 3;
const QX0 = 40;
const QX1 = 920;
const QY0 = 112;
const QY1 = 624;
const STITCH_MS = 2500;
const TWIN_STITCH_MS = 2800;
const REST_MS = 1300;
const SNAG_MS = 520;
const TUCK_MS = 1450;
const SQUEEZE_EVERY = 480;
const SQUEEZE_TICKS = 3;
const SQUEEZE_P = 9;
const SQUEEZE_N = 15;
const PIN_R = 22;

interface Seam {
  rect: Rect;
  corners: Pt[];
  /** Path order of corner indices, five long (it comes back to the first). */
  order: number[];
  cum: number[];
  len: number;
  t0: number;
  ms: number;
  pins: StrikeTarget[];
  snagged: Set<Fighter>;
  prev: Map<Fighter, Pt>;
}
interface Tuck { rect: Rect; at: number; ticks: number; who: Fighter[] }
interface Slack { pts: Pt[]; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { player, npc, tk } = ctx;
  const pw = (QX1 - QX0) / COLS;
  const ph = (QY1 - QY0) / ROWS;
  const colours = Array.from({ length: COLS * ROWS }, (_, i) => QUILTS[(i * 3 + Math.floor(i / COLS)) % QUILTS.length]);
  const rectOf = (c: number, r: number): Rect => ({ x: QX0 + c * pw, y: QY0 + r * ph, w: pw, h: ph });
  const cellAt = (x: number, y: number): [number, number] => [
    Math.max(0, Math.min(COLS - 1, Math.floor((x - QX0) / pw))),
    Math.max(0, Math.min(ROWS - 1, Math.floor((y - QY0) / ph))),
  ];

  let seams: Seam[] = [];
  const tucks: Tuck[] = [];
  const slack: Slack[] = [];
  let nextAt = 0;
  let started = false;
  let twin = false;

  const progress = (s: Seam, time: number): number => Math.min(1, (time - s.t0) / s.ms) * s.len;
  /** The point `d` along the seam's path, and which leg it is on. */
  const along = (s: Seam, d: number): { p: Pt; leg: number } => {
    let leg = 0;
    while (leg < 3 && d > s.cum[leg + 1]) leg++;
    const a = s.corners[s.order[leg]], b = s.corners[s.order[leg + 1]];
    const L = s.cum[leg + 1] - s.cum[leg];
    const k = L > 0 ? (d - s.cum[leg]) / L : 0;
    return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, leg };
  };
  /** Where a point projects onto the seam path (its path distance), via the nearest leg. */
  const paramOf = (s: Seam, x: number, y: number): number => {
    let best = 1e9, bestD = 0;
    for (let i = 0; i < 4; i++) {
      const a = s.corners[s.order[i]], b = s.corners[s.order[i + 1]];
      const dd = segDist(x, y, a.x, a.y, b.x, b.y);
      if (dd < best) {
        best = dd;
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        const k = L > 0 ? Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (L * L))) : 0;
        bestD = s.cum[i] + k * L;
      }
    }
    return bestD;
  };
  const laidPts = (s: Seam, upTo: number): Pt[] => {
    const pts: Pt[] = [s.corners[s.order[0]]];
    for (let i = 1; i <= 4 && s.cum[i] <= upTo; i++) pts.push(s.corners[s.order[i]]);
    if (upTo < s.len) pts.push(along(s, upTo).p);
    return pts;
  };

  function unpick(s: Seam, time: number): void {
    slack.push({ pts: laidPts(s, progress(s, time)), at: time });
    for (const p of s.pins) p.remove();
    seams = seams.filter((o) => o !== s);
    ctx.sfx('trap-snap');
    const c = { x: s.rect.x + s.rect.w / 2, y: s.rect.y + s.rect.h / 2 };
    ctx.flash(c.x, c.y, EMBER);
    if (!seams.length) nextAt = time + REST_MS;
  }

  function sew(c: number, r: number, time: number, dir: 1 | -1, ms: number): void {
    const rect = rectOf(c, r);
    const corners = [
      { x: rect.x, y: rect.y }, { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h }, { x: rect.x, y: rect.y + rect.h },
    ];
    const s0 = Math.floor(ctx.rng() * 4);
    const order = [0, 1, 2, 3, 4].map((i) => (((s0 + dir * i) % 4) + 4) % 4);
    const cum = [0];
    for (let i = 0; i < 4; i++) {
      const a = corners[order[i]], b = corners[order[i + 1]];
      cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    const seam: Seam = { rect, corners, order, cum, len: cum[4], t0: time, ms: tk.warn(ms), pins: [], snagged: new Set(), prev: new Map() };
    seam.pins = corners.map((p, ci) => ctx.target({
      x: p.x, y: p.y, r: PIN_R, passThrough: true,
      onStruck: (by) => {
        if (by !== 'player' || !seams.includes(seam)) return;
        // Only the pin the needle is running at gives: strike the next corner out.
        const now = tk.now;
        const leg = along(seam, progress(seam, now)).leg;
        if (seam.order[leg + 1] === ci) unpick(seam, now);
      },
    }));
    for (const f of [player, npc]) seam.prev.set(f, { x: f.x, y: f.y });
    seams.push(seam);
    ctx.sfx('whip');
  }

  function close(s: Seam, time: number): void {
    for (const p of s.pins) p.remove();
    seams = seams.filter((o) => o !== s);
    const who = [player, npc].filter((f) => alive(f) && inRect(s.rect, f.x, f.y));
    for (const f of who) ctx.root(f, TUCK_MS);
    tucks.push({ rect: s.rect, at: time, ticks: 0, who });
    ctx.sfx('chain');
    if (who.includes(npc)) ctx.float(npc.x, npc.y - 58, 'TUCKED IN', '#ffb070');
    if (!seams.length) nextAt = time + REST_MS;
  }

  return {
    update(time) {
      if (!started) { started = true; nextAt = time + 1600; ctx.banner('MIND THE SEAMS', '#ffc890'); }
      if (!twin && npc.hp < npc.maxHp * 0.5) { twin = true; ctx.banner('A SECOND NEEDLE', '#ffb070'); ctx.sfx('status-debuff'); }

      if (!seams.length && time >= nextAt && alive(player)) {
        const [c, r] = cellAt(player.x, player.y);
        sew(c, r, time, 1, twin ? TWIN_STITCH_MS : STITCH_MS);
        if (twin) {
          // The neighbouring patch you would run into, sewn the other way round.
          const opts: [number, number][] = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]];
          let best: [number, number] | null = null, bd = 1e9;
          for (const [oc, or] of opts) {
            if (oc < 0 || or < 0 || oc >= COLS || or >= ROWS) continue;
            const rc = rectOf(oc, or);
            const d = dist(player.x, player.y, rc.x + rc.w / 2, rc.y + rc.h / 2);
            if (d < bd) { bd = d; best = [oc, or]; }
          }
          if (best) sew(best[0], best[1], time, -1, TWIN_STITCH_MS);
        }
      }

      for (const s of [...seams]) {
        const laid = progress(s, time);
        // Laid thread snags anyone who crosses it — once a seam, then it gives.
        for (const f of [player, npc]) {
          const prev = s.prev.get(f) ?? { x: f.x, y: f.y };
          const was = inRect(s.rect, prev.x, prev.y), now = inRect(s.rect, f.x, f.y);
          if (alive(f) && was !== now && !s.snagged.has(f) && paramOf(s, (prev.x + f.x) / 2, (prev.y + f.y) / 2) < laid) {
            s.snagged.add(f);
            ctx.root(f, SNAG_MS);
            ctx.nudge(f, prev.x - f.x, prev.y - f.y);
            ctx.sfx('trap-snap');
            s.prev.set(f, { x: prev.x, y: prev.y });
            continue;
          }
          s.prev.set(f, { x: f.x, y: f.y });
        }
        if (time - s.t0 >= s.ms) close(s, time);
      }

      for (const t of tucks) {
        while (t.ticks < SQUEEZE_TICKS && time - t.at >= (t.ticks + 1) * SQUEEZE_EVERY) {
          t.ticks++;
          for (const f of t.who) {
            if (!alive(f)) continue;
            if (f === player) tk.hitPlayer(SQUEEZE_P, f.x, f.y);
            else ctx.hit(npc, SQUEEZE_N, f.x, f.y);
          }
        }
      }
      while (tucks.length && time - tucks[0].at > 2600) tucks.shift();
      while (slack.length && time - slack[0].at > 900) slack.shift();
    },

    npcSeek(): Pt | null {
      const time = tk.now;
      for (const s of seams) {
        const laid = progress(s, time);
        const cx = s.rect.x + s.rect.w / 2, cy = s.rect.y + s.rect.h / 2;
        // The open stretch of the seam nearest a point, pushed a step outside.
        const gapNear = (x: number, y: number): Pt => {
          let best = along(s, s.len).p, bd = 1e9;
          for (let d = laid + 30; d < s.len - 20; d += 24) {
            const p = along(s, d).p;
            const dd = dist(x, y, p.x, p.y);
            if (dd < bd) { bd = dd; best = p; }
          }
          return best;
        };
        if (inRect(s.rect, npc.x, npc.y)) {
          const p = gapNear(npc.x, npc.y);
          const a = Math.atan2(p.y - cy, p.x - cx);
          return { x: tk.clampX(p.x + Math.cos(a) * 50), y: tk.clampY(p.y + Math.sin(a) * 50) };
        }
        if (inRect(s.rect, player.x, player.y)) {
          const p = gapNear(player.x, player.y);
          const a = Math.atan2(p.y - cy, p.x - cx);
          return { x: tk.clampX(p.x + Math.cos(a) * 40), y: tk.clampY(p.y + Math.sin(a) * 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The yard is one great quilt: twelve padded patches, a rng per patch so they hold still.
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const rc = rectOf(c, r);
        patch(g, rc.x + 2, rc.y + 2, rc.w - 4, rc.h - 4, colours[r * COLS + c], mulberry(91 + c * 7 + r * 13), 0.34);
      }
      // Where the star touched the quilt: a few scorched threads.
      scorch(g, QX0 + pw * 1.2, QY0 + ph * 1.7, 60, 0.4, 0.45);
      scorch(g, QX0 + pw * 2.9, QY0 + ph * 0.6, 48, 2.6, 0.4);
      // Tucked patches: pulled tight, buttoned down, the padding bulging round the buttons.
      for (const tc of tucks) {
        const k = Math.min(1, (time - tc.at) / 260), fade = 1 - Math.max(0, (time - tc.at - 1800) / 800);
        const r = tc.rect;
        g.fillStyle(dim(STITCH, 0.3), 0.5 * fade); g.fillRect(r.x, r.y, r.w, r.h);
        for (let i = 1; i <= 3; i++) for (let j = 1; j <= 2; j++) {
          const bx = r.x + (r.w * i) / 4, by = r.y + (r.h * j) / 3;
          g.fillStyle(lit(QUILTS[(i + j) % QUILTS.length], 0.2), 0.55 * fade * k); g.fillEllipse(bx, by, 40 * k, 30 * k);
          g.fillStyle(dim(STITCH, 0.2), fade); g.fillCircle(bx, by, 4);
          g.lineStyle(1, dim(STITCH, 0.4), fade);
          g.lineBetween(bx - 14 * k, by - 10 * k, bx, by); g.lineBetween(bx + 14 * k, by - 10 * k, bx, by);
          g.lineBetween(bx - 14 * k, by + 10 * k, bx, by); g.lineBetween(bx + 14 * k, by + 10 * k, bx, by);
        }
      }
      // Fallen thread from an unpicked seam, curling as it drops slack.
      for (const sl of slack) {
        const k = (time - sl.at) / 900;
        g.lineStyle(2, 0xc84a4a, 0.8 * (1 - k));
        for (let i = 0; i < sl.pts.length - 1; i++) {
          const a = sl.pts[i], b = sl.pts[i + 1];
          const mx = (a.x + b.x) / 2 + Math.sin(i * 2.3 + k * 6) * 14 * k, my = (a.y + b.y) / 2 + 10 * k;
          g.beginPath(); g.moveTo(a.x, a.y + 6 * k); g.lineTo(mx, my); g.lineTo(b.x, b.y + 6 * k); g.strokePath();
        }
      }
      for (const s of seams) {
        const laid = progress(s, time);
        // Tailor's chalk: the dotted line the needle will take.
        const ahead: Pt[] = [along(s, laid).p];
        for (let i = 1; i <= 4; i++) if (s.cum[i] > laid) ahead.push(s.corners[s.order[i]]);
        for (let i = 0; i < ahead.length - 1; i++) stitchLine(g, ahead[i].x, ahead[i].y, ahead[i + 1].x, ahead[i + 1].y, FEATHER, 0.55, 3, 7);
        // The laid thread: a red running stitch, doubled, with an ember glint where the star got in.
        const pts = laidPts(s, laid);
        for (let i = 0; i < pts.length - 1; i++) {
          g.lineStyle(5, 0x5a1a22, 0.35); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
          stitchLine(g, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, 0xd8484a, 1, 9, 3);
          stitchLine(g, pts[i].x + 1, pts[i].y + 1, pts[i + 1].x + 1, pts[i + 1].y + 1, EMBER, 0.5, 2, 10);
        }
        // The patch itself glows faintly the longer the seam runs.
        g.fillStyle(0xd8484a, 0.05 + 0.12 * (laid / s.len)); g.fillRect(s.rect.x, s.rect.y, s.rect.w, s.rect.h);
        // Pins at the corners; the one the needle is heading for pulses — strike it out.
        const next = s.order[along(s, laid).leg + 1];
        s.corners.forEach((p, ci) => {
          const hot = ci === next;
          g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x + 3, p.y + 4, 14, 6);
          g.lineStyle(2, 0xb8b8c8, 1); g.lineBetween(p.x, p.y, p.x - 6, p.y - 16);
          g.fillStyle(hot ? EMBER : LINEN, 1); g.fillCircle(p.x - 6, p.y - 17, hot ? 6 : 5);
          g.fillStyle(0xffffff, 0.8); g.fillCircle(p.x - 8, p.y - 19, 1.8);
          if (hot) { g.lineStyle(2, EMBER, 0.45 + 0.35 * Math.sin(t * 9)); g.strokeCircle(p.x, p.y, PIN_R); }
        });
      }
    },

    drawAir(g, time) {
      for (const s of seams) {
        const laid = progress(s, time);
        const { p, leg } = along(s, laid);
        const a = s.corners[s.order[leg]], b = s.corners[s.order[leg + 1]];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const bob = Math.sin(time / 60) * 4;
        // The needle: steel, eye trailing, dipping in and out of the quilt as it runs.
        const c = Math.cos(ang), sn = Math.sin(ang);
        const tipX = p.x + c * 22, tipY = p.y + sn * 22 - bob;
        const eyeX = p.x - c * 22, eyeY = p.y - sn * 22 - bob - 8;
        g.lineStyle(5, 0x3a3a4a, 0.6); g.lineBetween(eyeX + 2, eyeY + 3, tipX + 2, tipY + 3);
        g.lineStyle(4, 0xc8ccd8, 1); g.lineBetween(eyeX, eyeY, tipX, tipY);
        g.lineStyle(1.5, 0xffffff, 0.9); g.lineBetween(eyeX + c * 4, eyeY - 1 + sn * 4, tipX - c * 6, tipY - 1 - sn * 6);
        g.lineStyle(1.5, 0x3a3a4a, 1); g.strokeEllipse(eyeX + c * 3, eyeY + sn * 3, 6, 4);
        // The red thread from the eye down into the last stitch.
        g.lineStyle(1.6, 0xd8484a, 1);
        g.beginPath(); g.moveTo(eyeX, eyeY); g.lineTo((eyeX + p.x) / 2 - c * 10, (eyeY + p.y) / 2 + 6); g.lineTo(p.x, p.y); g.strokePath();
      }
      // Whoever is tucked: the quilt's hem drawn over them, a tuft of padding either side.
      for (const tc of tucks) {
        if (tc.ticks >= SQUEEZE_TICKS) continue;
        for (const f of tc.who) {
          if (!alive(f)) continue;
          const sq = 1 + Math.sin(time / 90) * 0.06;
          g.fillStyle(QUILTS[1], 0.9); g.fillRoundedRect(f.x - 26 * sq, f.y - 4, 52 * sq, 20, 6);
          g.fillStyle(lit(QUILTS[1], 0.25), 0.9); g.fillRect(f.x - 24 * sq, f.y - 4, 48 * sq, 4);
          stitchLine(g, f.x - 22, f.y + 10, f.x + 22, f.y + 10, 0xd8484a, 1, 4, 3);
          g.fillStyle(FEATHER, 0.9); g.fillCircle(f.x - 28 * sq, f.y + 4, 6); g.fillCircle(f.x + 28 * sq, f.y + 4, 6);
        }
      }
    },

    drawHud(g, time) {
      if (!seams.length) return;
      // A cotton reel: the thread left on it is the seam not yet sewn.
      const s = seams[0];
      const k = progress(s, time) / s.len;
      const x = 28, y = ctx.H - 70;
      hudPlate(g, x - 12, y - 10, 160, 56);
      g.fillStyle(0x8a624e, 1); g.fillRect(x, y, 34, 6); g.fillRect(x, y + 30, 34, 6);
      g.fillStyle(0xd8484a, 1); g.fillRect(x + 5, y + 6 + 24 * k, 24, 24 * (1 - k));
      for (let i = 0; i < 5; i++) { g.lineStyle(1, dim(0xd8484a, 0.3), 0.8); g.lineBetween(x + 5, y + 8 + i * 5, x + 29, y + 8 + i * 5); }
      for (let i = 0; i < 4; i++) {
        const done = s.cum[i + 1] <= progress(s, time);
        g.fillStyle(done ? 0xd8484a : LINEN, done ? 1 : 0.5); g.fillCircle(x + 56 + i * 20, y + 18, 6);
      }
      if (seams.length > 1) { g.fillStyle(EMBER, 1); g.fillCircle(x + 140, y + 18, 4); }
    },

    destroy() { for (const s of seams) for (const p of s.pins) p.remove(); },
  };
}

export const FALLEN_TUCKED_IN: GimmickDef = {
  id: ID,
  rules: 'A needle sews round your patch; its laid thread snags you. Leave by the unsewn side, or strike the pin it runs at. Closed seams squeeze all inside.',
  make,
};
