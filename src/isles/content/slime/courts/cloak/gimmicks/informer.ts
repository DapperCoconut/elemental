import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit, shadow } from '../../../../../art/IsleArt';
import { figure, watchtower } from '../art';
import { coverPiece, type CoverKind } from './cover';
import { IRON, LAMP, LAMP_DEEP, WAX, WAX_LIT } from '../palette';
import { alive, blocks, clamp, dist, stepDt, wrapAngle } from '../util';

/**
 * Informer — Snitch Tattle.
 *
 * An informer wanders the square with a dark-lantern, its beam swinging as he walks and sweeping
 * slowly from side to side whenever he stops to look about. Cast anything inside that beam
 * where he can see you — no barrels, crates or pump between — and you are *reported*: his
 * whistle shrills, a red eye hangs over your head, and two breaths later the crossbowman up the
 * watchtower looses at the spot you are standing on. Move, and the quarrel finds the cobbles.
 *
 * Tattle reports *anyone*. Get his beam onto the foe and let him cast; hide behind cover when it
 * swings your way; or strike the informer himself — he is easily bought — and for a few seconds
 * his lantern stays fixed on whoever you are fighting.
 */

const RANGE = 380;
const HALF = 0.5;
const WALK = 58;
const MARK_MS = 1500;
const BOLT_MS = 420;
const BLAST_R = 44;
const BOUGHT_MS = 4200;

interface Cover { x: number; y: number; r: number; kind: CoverKind }
interface Mark { at: number; lockAt: number; x: number; y: number; locked: boolean; boltAt: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const TOWER: Pt = { x: W / 2, y: top + 40 };
  const covers: Cover[] = [
    { x: 210, y: top + 190, r: 34, kind: 'barrels' },
    { x: W - 210, y: top + 190, r: 34, kind: 'crates' },
    { x: 300, y: H - 120, r: 30, kind: 'pump' },
    { x: W - 300, y: H - 120, r: 36, kind: 'cart' },
  ];
  const stops: Pt[] = [
    { x: 150, y: H / 2 + 30 }, { x: W / 2, y: top + 150 }, { x: W - 150, y: H / 2 + 30 },
    { x: W / 2, y: H - 80 }, { x: W / 2 - 160, y: H / 2 + 20 }, { x: W / 2 + 160, y: H / 2 + 20 },
  ];
  const tattle = { x: W / 2, y: H / 2 + 40, heading: 0, gaze: 0, stopUntil: 0, target: stops[0], whistleAt: -9999, dazedUntil: 0 };
  let boughtUntil = 0;
  let boughtOn: Fighter | null = null;
  let lastBuy = 0;
  const marks = new Map<Fighter, Mark>();
  const cooldown = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const fx: { x: number; y: number; at: number }[] = [];

  const pickStop = () => {
    let s = stops[Math.floor(rng() * stops.length)];
    for (let i = 0; i < 4 && dist(s.x, s.y, tattle.x, tattle.y) < 120; i++) s = stops[Math.floor(rng() * stops.length)];
    tattle.target = s;
  };
  pickStop();

  /** True if the lantern's beam finds f, with nothing in the way. */
  const sees = (f: Fighter): boolean => {
    if (!alive(f)) return false;
    const d = dist(tattle.x, tattle.y, f.x, f.y);
    if (d > RANGE) return false;
    if (Math.abs(wrapAngle(Math.atan2(f.y - tattle.y, f.x - tattle.x) - tattle.gaze)) > HALF) return false;
    return !covers.some((c) => blocks(tattle.x, tattle.y - 20, f.x, f.y - 10, c.x, c.y - 10, c.r * 0.9));
  };

  // The informer can be struck: he is easily bought.
  const body = ctx.target({
    x: tattle.x, y: tattle.y - 18, r: 18, passThrough: true,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (now - lastBuy < 1500) return;
      lastBuy = now;
      boughtOn = by === 'player' ? npc : player;
      boughtUntil = now + BOUGHT_MS;
      tattle.dazedUntil = now + 500;
      ctx.float(tattle.x, tattle.y - 60, by === 'player' ? 'BOUGHT — HE WATCHES THEM' : 'BOUGHT — HE WATCHES YOU', '#ffd27a');
      ctx.sfx('money');
    },
  });

  function report(f: Fighter, time: number): void {
    if (marks.has(f) || time < (cooldown.get(f) ?? 0)) return;
    marks.set(f, { at: time, lockAt: time + MARK_MS, x: f.x, y: f.y, locked: false, boltAt: 0, done: false });
    tattle.whistleAt = time;
    tattle.stopUntil = Math.max(tattle.stopUntil, time + 900);
    ctx.float(f.x, f.y - 58, 'REPORTED', '#ff6a78');
    ctx.sfx('screech');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      // Walk the round, stopping to look about.
      if (time >= tattle.dazedUntil) {
        if (time < tattle.stopUntil) {
          tattle.gaze = tattle.heading + Math.sin(time / 700) * 0.9;
        } else {
          const dx = tattle.target.x - tattle.x, dy = tattle.target.y - tattle.y;
          const d = Math.hypot(dx, dy);
          if (d < 8) {
            tattle.stopUntil = time + 1800 + rng() * 900;
            pickStop();
          } else {
            tattle.heading = Math.atan2(dy, dx);
            tattle.x += (dx / d) * WALK * dt;
            tattle.y += (dy / d) * WALK * dt;
            tattle.gaze = tattle.heading + Math.sin(time / 500) * 0.25;
          }
        }
      }
      // Bought: the lantern stays on the other fighter.
      if (time < boughtUntil && boughtOn && alive(boughtOn)) {
        const want = Math.atan2(boughtOn.y - tattle.y, boughtOn.x - tattle.x);
        tattle.gaze += wrapAngle(want - tattle.gaze) * Math.min(1, dt * 6);
        tattle.heading = tattle.gaze;
      }
      body.moveTo(tattle.x, tattle.y - 18);

      // Marks: track, then lock and loose from the tower.
      for (const [f, m] of marks) {
        if (!m.locked) {
          m.x = f.x; m.y = f.y;
          if (time >= m.lockAt) { m.locked = true; m.boltAt = time + BOLT_MS; ctx.sfx('musket'); }
        } else if (!m.done && time >= m.boltAt) {
          m.done = true;
          fx.push({ x: m.x, y: m.y, at: time });
          ctx.sfx('stab');
          const dmg = ctx.hard ? 20 : 16;
          for (const v of [player, npc]) {
            if (alive(v) && dist(v.x, v.y, m.x, m.y) < BLAST_R + 18) {
              ctx.hit(v, dmg, v.x, v.y);
              ctx.root(v, 450);
            }
          }
          cooldown.set(f, time + 2600);
        }
        if (m.done && time > m.boltAt + 200) marks.delete(f);
      }
      for (let i = fx.length - 1; i >= 0; i--) if (time - fx[i].at > 700) fx.splice(i, 1);
    },

    onPlayerCast() { const t = ctx.scene.time.now; if (sees(player)) report(player, t); },
    onNpcCast() { const t = ctx.scene.time.now; if (sees(npc)) report(npc, t); },

    npcSeek() {
      if (!alive(npc)) return null;
      const m = marks.get(npc);
      // Marked: keep moving — dodge sideways off the spot.
      if (m && !m.done) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x) + Math.PI / 2;
        return { x: clamp(npc.x + Math.cos(a) * 140, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 140, top + 50, H - 40) };
      }
      const toward = Math.abs(wrapAngle(Math.atan2(npc.y - tattle.y, npc.x - tattle.x) - tattle.gaze)) < HALF + 0.5
        && dist(npc.x, npc.y, tattle.x, tattle.y) < RANGE + 40;
      if (toward) {
        // Behind the nearest cover, as seen from the lantern.
        let best: Cover = covers[0];
        let bd = Infinity;
        for (const c of covers) { const d = dist(c.x, c.y, npc.x, npc.y); if (d < bd) { bd = d; best = c; } }
        const a = Math.atan2(best.y - tattle.y, best.x - tattle.x);
        return { x: clamp(best.x + Math.cos(a) * (best.r + 34), 50, W - 50), y: clamp(best.y + Math.sin(a) * (best.r + 34), top + 40, H - 40) };
      }
      // Safe: buy the informer if he is close and watching nobody, else press the player.
      if (time() >= boughtUntil && dist(npc.x, npc.y, tattle.x, tattle.y) < 220) return { x: tattle.x, y: tattle.y + 10 };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 190, 60, W - 60), y: clamp(player.y + Math.sin(a) * 160, top + 50, H - 40) };
    },

    drawGround(g, t) {
      // The lantern's beam on the cobbles: a warm wedge, brighter near him, cut off by cover.
      const n = 14;
      const steps = 10;
      for (let i = 0; i < n; i++) {
        const a0 = tattle.gaze - HALF + (i / n) * HALF * 2, a1 = tattle.gaze - HALF + ((i + 1) / n) * HALF * 2;
        for (let k = 0; k < steps; k++) {
          const r0 = 26 + (k / steps) * RANGE, r1 = 26 + ((k + 1) / steps) * RANGE;
          const mx = tattle.x + Math.cos((a0 + a1) / 2) * r1, my = tattle.y + Math.sin((a0 + a1) / 2) * r1;
          if (covers.some((c) => blocks(tattle.x, tattle.y, mx, my, c.x, c.y, c.r * 0.9))) break;
          const alpha = (time() < boughtUntil ? 0.15 : 0.1) * (1 - k / steps);
          g.fillStyle(time() < boughtUntil ? WAX_LIT : LAMP, alpha);
          g.fillTriangle(
            tattle.x + Math.cos(a0) * r0, tattle.y + Math.sin(a0) * r0,
            tattle.x + Math.cos(a1) * r0, tattle.y + Math.sin(a1) * r0,
            tattle.x + Math.cos(a1) * r1, tattle.y + Math.sin(a1) * r1,
          );
          g.fillTriangle(
            tattle.x + Math.cos(a0) * r0, tattle.y + Math.sin(a0) * r0,
            tattle.x + Math.cos(a1) * r1, tattle.y + Math.sin(a1) * r1,
            tattle.x + Math.cos(a0) * r1, tattle.y + Math.sin(a0) * r1,
          );
        }
      }
      // The tower (its base peeks below the HUD) and the cover.
      watchtower(g, TOWER.x, TOWER.y + 40, 0.42);
      for (const c of covers) coverPiece(g, c.x, c.y, c.kind);
      // Marks on the floor once locked: a target ring and a crossbow sight.
      for (const m of marks.values()) {
        if (!m.locked || m.done) continue;
        const k = clamp((t - (m.boltAt - BOLT_MS)) / BOLT_MS, 0, 1);
        g.lineStyle(2, WAX, 0.5 + k * 0.5); g.strokeCircle(m.x, m.y, BLAST_R * (1.4 - k * 0.4));
        g.lineBetween(m.x - BLAST_R, m.y, m.x + BLAST_R, m.y); g.lineBetween(m.x, m.y - BLAST_R * 0.7, m.x, m.y + BLAST_R * 0.7);
        g.fillStyle(WAX, 0.12 + k * 0.15); g.fillCircle(m.x, m.y, BLAST_R);
      }
      for (const e of fx) {
        const k = (t - e.at) / 700;
        g.fillStyle(0x000000, 0.25 * (1 - k)); g.fillEllipse(e.x, e.y, 60, 20);
        // The quarrel stuck in the cobbles, fletching up.
        g.lineStyle(3, 0x3a2a1c, 1 - k); g.lineBetween(e.x, e.y, e.x + 6, e.y - 18);
        g.fillStyle(WAX, 1 - k); g.fillTriangle(e.x + 6, e.y - 18, e.x + 2, e.y - 26, e.x + 10, e.y - 24);
      }
    },

    drawAir(g, t) {
      // Bolts in flight, from the tower's rail down to the mark.
      for (const m of marks.values()) {
        if (!m.locked || m.done) continue;
        const k = clamp((t - (m.boltAt - BOLT_MS)) / BOLT_MS, 0, 1);
        const sx = TOWER.x - 14, sy = TOWER.y - 22;
        const x = sx + (m.x - sx) * k, y = sy + (m.y - sy) * k - Math.sin(k * Math.PI) * 30;
        const a = Math.atan2(m.y - sy, m.x - sx);
        g.lineStyle(2.5, 0x3a2a1c, 1); g.lineBetween(x, y, x - Math.cos(a) * 18, y - Math.sin(a) * 18);
        g.fillStyle(IRON, 1); g.fillCircle(x, y, 2.4);
      }
      // The red eye over whoever is being reported.
      for (const [f, m] of marks) {
        if (m.locked || !alive(f)) continue;
        const k = clamp((t - m.at) / MARK_MS, 0, 1);
        const ex = f.x, ey = f.y - 62 - Math.sin(t / 120) * 2;
        glow(g, ex, ey, 18, WAX, 0.06 + k * 0.08, 3);
        g.fillStyle(0xf4ead8, 1); g.fillEllipse(ex, ey, 22, 12);
        g.fillStyle(WAX, 1); g.fillCircle(ex, ey, 4.5);
        g.fillStyle(0x0a0608, 1); g.fillCircle(ex, ey, 2);
        g.lineStyle(2, WAX, 1); g.beginPath(); g.arc(ex, ey + 12, 14, -Math.PI * 0.85, -Math.PI * 0.85 + k * Math.PI * 1.7, false); g.strokePath();
        g.lineStyle(1, 0x0a0608, 0.7); g.strokeEllipse(ex, ey, 22, 12);
      }
      // Snitch Tattle's informer: a stooped man in a grey cloak with a bullseye lantern.
      shadow(g, tattle.x, tattle.y + 2, 30, 9);
      const dazed = t < tattle.dazedUntil;
      figure(g, tattle.x, tattle.y, 0.95, 0x4a4652, { lean: Math.cos(tattle.gaze) * 0.6 + (dazed ? Math.sin(t / 40) : 0), arm: 0.4, eyeGlint: true });
      const lx = tattle.x + Math.cos(tattle.gaze) * 14, ly = tattle.y - 26 + Math.sin(tattle.gaze) * 6;
      g.fillStyle(IRON, 1); g.fillRect(lx - 5, ly - 6, 10, 11);
      g.fillStyle(LAMP_DEEP, 1); g.fillCircle(lx + Math.cos(tattle.gaze) * 5, ly + Math.sin(tattle.gaze) * 2, 3.5);
      g.fillStyle(LAMP, 1); g.fillCircle(lx + Math.cos(tattle.gaze) * 6, ly + Math.sin(tattle.gaze) * 2, 2.2);
      glow(g, lx + Math.cos(tattle.gaze) * 6, ly, 12, LAMP, 0.06, 3);
      // The whistle: rings off his mouth for a moment after a report.
      const w = (t - tattle.whistleAt) / 600;
      if (w >= 0 && w < 1) {
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2, 0xfff2d0, (1 - w) * 0.8);
          g.beginPath(); g.arc(tattle.x + 4, tattle.y - 40, 8 + i * 8 + w * 14, -0.9, 0.9, false); g.strokePath();
        }
      }
      if (t < boughtUntil) {
        // A coin turning over his head while he is bought.
        const s = Math.abs(Math.cos(t / 120));
        g.fillStyle(0xd8b050, 1); g.fillEllipse(tattle.x, tattle.y - 70, 10 * s + 1, 10);
        g.fillStyle(lit(0xd8b050, 0.4), 1); g.fillEllipse(tattle.x - 1, tattle.y - 71, 4 * s + 0.5, 4);
      }
    },

    drawHud(g) {
      // An eye at the top of the screen, open while the lantern is on you (red) or on the foe (pale).
      const onYou = sees(player), onFoe = sees(npc);
      if (!onYou && !onFoe) return;
      const x = W / 2, y = top + 14;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 26, y - 9, 52, 18, 8);
      g.fillStyle(0xf4ead8, 1); g.fillEllipse(x, y, 34, 12);
      g.fillStyle(onYou ? WAX : 0x6a6a7a, 1); g.fillCircle(x, y, 4.5);
      g.fillStyle(0x0a0608, 1); g.fillCircle(x, y, 2);
      if (onYou) { g.lineStyle(1.5, WAX_LIT, 0.9); g.strokeEllipse(x, y, 38, 15); }
    },

    destroy() { body.remove(); },
  };

  function time(): number { return ctx.scene.time.now; }
}

export const INFORMER: GimmickDef = {
  id: 'cloak-informer',
  rules: 'An informer patrols with a dark-lantern. Cast in its beam and you are reported, then shot from the tower. Hide behind cover; strike him to buy his eye.',
  make,
};
