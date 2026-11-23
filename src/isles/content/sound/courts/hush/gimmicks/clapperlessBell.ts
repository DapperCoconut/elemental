import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit } from '../../../../../art/IsleArt';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, FELT_OAT, HUSH, HUSH_DEEP, IRON, SILK, TIMBER, TIMBER_DARK, VERDI } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * The Clapperless Bell — Sexton Toll.
 *
 * The Hush Bell's clapper was drawn when the Maestro came, but the sexton still swings it for the
 * Hours, and its *silent toll* is the most obeyed sound on the isle. Here it hangs on a beam over
 * the room and swings end to end, its shadow sweeping the floor. **At the top of each swing it
 * tolls without a sound**: a grey ring spreads from its shadow, with one gap in it, and whoever
 * the ring passes is silenced.
 *
 * But it is still a bell. Strike it and it rings for real — one great true note, gold rings of
 * sound bursting from it — and whoever is nearest the bell, bar the one who struck it, is stunned
 * where they stand. Wait for the foe to walk under it.
 */

const SWING_R = 330;
const TRUE_R = 270;
const RING_SPEED = 250;
const RING_BAND = 18;
const RING_GAP = 0.55;
const TRUE_CD = 3800;

interface Ring { r: number; gap: number; hit: Set<Fighter>; true: boolean; born: number; cx: number; cy: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  /** Swing phase and rate (rad of phase per second). Toll pulls it harder now and then. */
  let ph = rng() * Math.PI * 2;
  let rate = ctx.hard ? 1.25 : 1.05;
  let lastSign = 0;
  const rings: Ring[] = [];
  let trueReadyAt = 0;
  let trueAt = -9999;
  let heaveAt = 0;
  let heaveWarn = -1;
  let started = false;
  let target: StrikeTarget | null = null;
  const silencedAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);

  /** Where the bell's shadow lies: a shallow arc across the room. */
  const foot = (): Pt => {
    const s = Math.sin(ph);
    return { x: cx + s * SWING_R, y: cy - 30 + (1 - Math.cos(Math.asin(clamp(s, -1, 1)))) * 90 };
  };

  function trueToll(by: Fighter, time: number): void {
    if (time < trueReadyAt) return;
    trueReadyAt = time + TRUE_CD;
    trueAt = time;
    const f = foot();
    const victim = by === player ? npc : player;
    rings.push({ r: 20, gap: 99, hit: new Set([by]), true: true, born: time, cx: f.x, cy: f.y });
    ctx.sfx('gravity-slam');
    ctx.banner('BONG', '#ffe2a8');
    if (alive(victim) && dist(victim.x, victim.y, f.x, f.y) < TRUE_R) {
      ctx.stun(victim, ctx.hard ? 1500 : 1300);
      ctx.hit(victim, 10, victim.x, victim.y);
      ctx.float(victim.x, victim.y - 50, 'RUNG', '#ffd88a');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        heaveAt = time + 9000;
        const f = foot();
        target = ctx.target({
          x: f.x, y: f.y, r: 36, passThrough: true,
          onStruck(by) { trueToll(by === 'player' ? player : npc, ctx.scene.time.now); },
        });
      }
      // Toll heaves on the rope every so often: the bell swings faster for a while.
      if (heaveWarn < 0 && time >= heaveAt - 1000) { heaveWarn = time; ctx.banner('TOLL HEAVES ON THE ROPE', '#dfe6ee'); }
      if (time >= heaveAt) { heaveAt = time + 11000; heaveWarn = -1; rate = ctx.hard ? 1.9 : 1.6; }
      rate += ((ctx.hard ? 1.25 : 1.05) - rate) * Math.min(1, dt * 0.25);
      ph += rate * dt;
      const f = foot();
      target?.moveTo(f.x, f.y);
      // The top of each swing: a silent toll.
      const c = Math.cos(ph);
      const sign = c > 0 ? 1 : -1;
      if (lastSign !== 0 && sign !== lastSign) {
        // Crossing cos = 0 is the apex of the swing (sin at ±1).
        const toward = alive(player) ? Math.atan2(player.y - f.y, player.x - f.x) : 0;
        rings.push({ r: 30, gap: toward + (rng() - 0.5) * 2.2, hit: new Set(), true: false, born: time, cx: f.x, cy: f.y });
        ctx.sfx('hush');
      }
      lastSign = sign;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.r += (r.true ? 420 : RING_SPEED) * dt;
        if (r.r > 900) { rings.splice(i, 1); continue; }
        if (r.true) continue;
        for (const fi of [player, npc]) {
          if (r.hit.has(fi) || !alive(fi)) continue;
          const d = dist(fi.x, fi.y, r.cx, r.cy);
          if (Math.abs(d - r.r) > RING_BAND) continue;
          const a = Math.atan2(fi.y - r.cy, fi.x - r.cx);
          r.hit.add(fi);
          if (Math.abs(wrapAngle(a - r.gap)) < RING_GAP) continue;
          ctx.silence(fi, ctx.hard ? 1900 : 1600);
          silencedAt.set(fi, time);
          ctx.float(fi.x, fi.y - 48, '…', '#dfe6ee');
        }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      const f = foot();
      // You are under the bell and it is ready: get to its far side and ring it.
      if (ctx.scene.time.now >= trueReadyAt && dist(player.x, player.y, f.x, f.y) < TRUE_R * 0.8) {
        const d = Math.max(1, dist(f.x, f.y, player.x, player.y));
        return { x: clamp(f.x + ((f.x - player.x) / d) * 70, 60, W - 60), y: clamp(f.y + ((f.y - player.y) / d) * 70, top + 50, H - 40) };
      }
      // Otherwise keep out from under it.
      if (dist(npc.x, npc.y, f.x, f.y) < TRUE_R) return { x: clamp(npc.x, 60, W - 60), y: clamp(f.y + 260, top + 50, H - 40) };
      return null;
    },

    drawGround(g, time) {
      const f = foot();
      // The swing's track worn in the floor, and the bell's shadow on it.
      g.lineStyle(2, HUSH_DEEP, 0.25);
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const s = -1 + (i / 40) * 2;
        const x = cx + s * SWING_R, y = cy - 30 + (1 - Math.cos(Math.asin(s))) * 90;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      g.fillStyle(0x000000, 0.22); g.fillEllipse(f.x, f.y + 6, 110, 34);
      // Its reach when rung for real: a faint gold circle while it is ready.
      const ready = time >= trueReadyAt;
      g.lineStyle(1.5, BRONZE_LIT, ready ? 0.3 + Math.sin(time / 260) * 0.12 : 0.08);
      g.strokeCircle(f.x, f.y, TRUE_R);
      // Rings.
      for (const r of rings) {
        if (r.true) {
          const k = clamp((time - r.born) / 900, 0, 1);
          for (let j = 0; j < 3; j++) { g.lineStyle(8 - j * 2, j ? BRONZE_LIT : 0xffe2a8, (1 - k) * (0.8 - j * 0.2)); g.strokeCircle(r.cx, r.cy, r.r - j * 26); }
          continue;
        }
        const fade = clamp(1 - r.r / 900, 0, 1);
        // A silent ring: pale, doubled, no ripple — with its gap left open.
        for (const off of [0, 7]) {
          g.lineStyle(off ? 2 : 5, off ? SILK : HUSH, (off ? 0.4 : 0.6) * fade);
          g.beginPath(); g.arc(r.cx, r.cy, r.r - off, r.gap + RING_GAP, r.gap - RING_GAP + Math.PI * 2, false); g.strokePath();
        }
        // Little "rest" marks in the gap: the only place the toll does not reach.
        const gx = r.cx + Math.cos(r.gap) * r.r, gy = r.cy + Math.sin(r.gap) * r.r;
        g.fillStyle(SILK, 0.5 * fade); g.fillRect(gx - 5, gy - 2, 10, 4);
      }
    },

    drawAir(g, time) {
      const f = foot();
      const s = Math.sin(ph);
      // The beam's rope from the dark above, and the bell, hung above its shadow, tilted with the swing.
      const bx = f.x, by = f.y - 86;
      const tilt = Math.cos(ph) * 0.35;
      g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(cx + s * 40, top - 10, bx, by - 52);
      g.lineStyle(2, FELT_OAT, 1); g.lineBetween(cx + s * 40 + 3, top - 10, bx + 3, by - 52);
      g.fillStyle(TIMBER, 1); g.fillRect(bx - 26, by - 60, 52, 10);
      g.fillStyle(IRON, 1); g.fillRect(bx - 4, by - 52, 8, 10);
      const rung = time - trueAt < 700;
      const shake = rung ? Math.sin(time / 20) * 3 * (1 - (time - trueAt) / 700) : 0;
      const pts = (k: number) => {
        // Bell outline, tilted about its crown.
        const P0: [number, number][] = [[-14, 0], [14, 0], [22, 26], [26, 52], [38, 74], [-38, 74], [-26, 52], [-22, 26]];
        return P0.map(([px, py]) => {
          const x = px * k, y = py * k;
          return { x: bx + shake + x * Math.cos(tilt) - y * Math.sin(tilt), y: by - 42 + x * Math.sin(tilt) + y * Math.cos(tilt) };
        });
      };
      const body = pts(1);
      g.fillStyle(BRONZE_DARK, 1); g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x + 2, p.y + 2)), true);
      g.fillStyle(rung ? lit(BRONZE, 0.25) : BRONZE, 1); g.fillPoints(body.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
      // Waist band, verdigris, and the empty dark mouth.
      const mouth = { x: (body[4].x + body[5].x) / 2, y: (body[4].y + body[5].y) / 2 };
      g.lineStyle(2, BRONZE_DARK, 1); g.lineBetween(body[7].x, body[7].y, body[2].x, body[2].y);
      for (let i = 0; i < 5; i++) { g.fillStyle(VERDI, 0.55); g.fillRect(body[7].x + 6 + i * 8, body[7].y + 2, 2, 8 + (i * 5) % 9); }
      g.fillStyle(0x1a1610, 1); g.fillEllipse(mouth.x, mouth.y, 74, 12);
      g.fillStyle(BRONZE_LIT, 0.5); g.fillEllipse(body[7].x + 6, body[7].y + 16, 6, 30);
      if (rung) glow(g, bx, by, 60, 0xffe2a8, 0.08 * (1 - (time - trueAt) / 700), 4);
      // Ready to ring: a glint on the lip.
      if (time >= trueReadyAt) { g.fillStyle(0xffffff, 0.5 + Math.sin(time / 180) * 0.3); g.fillCircle(body[4].x - 6, body[4].y - 3, 2.5); }
      // The silenced: a pale bar across the mouth.
      for (const fi of [player, npc]) {
        const since = time - (silencedAt.get(fi) ?? -9999);
        if (since > 1600 || !alive(fi)) continue;
        g.fillStyle(SILK, 0.8 * (1 - since / 1600)); g.fillRoundedRect(fi.x - 10, fi.y - 30, 20, 6, 3);
      }
      // Whoever is in the true toll's reach, while it is ready: a faint gold tremble.
      if (time >= trueReadyAt) {
        for (const fi of [player, npc]) {
          if (!alive(fi) || dist(fi.x, fi.y, f.x, f.y) > TRUE_R) continue;
          g.lineStyle(1.5, BRONZE_LIT, 0.3); g.strokeCircle(fi.x, fi.y - 6, 26 + Math.sin(time / 90) * 2);
        }
      }
    },

    drawHud(g, time) {
      // The bell's readiness, as a little bell at the top of the screen.
      const ready = time >= trueReadyAt;
      const k = ready ? 1 : 1 - clamp((trueReadyAt - time) / TRUE_CD, 0, 1);
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 44, y - 10, 88, 20, 8);
      g.fillStyle(ready ? BRONZE_LIT : BRONZE_DARK, 1); g.fillRoundedRect(x - 40, y - 4, 80 * k, 8, 4);
      g.fillStyle(ready ? BRONZE_LIT : BRONZE, 1); g.fillTriangle(x - 52, y + 7, x - 62, y + 7, x - 57, y - 8);
    },
  };
}

export const CLAPPERLESS_BELL: GimmickDef = {
  id: 'hush-clapperless-bell',
  rules: 'The clapperless bell swings overhead; each silent toll sends a ring that silences whoever it passes. Strike the bell to ring it for real: the fighter nearest it (not you) is stunned.',
  make,
};
