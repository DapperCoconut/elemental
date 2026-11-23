import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { chime, chimeShadow } from '../art';
import { BRONZE_LIT, FLOW, FLOW_DARK, FLOW_LIT, GLOW, ICE, SILVER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Stalactite Chimes — Chimer Drip.
 *
 * The roof of the Chime Hall is hung with stalactites, each banded in bronze; their shadows lie
 * on the floor. Every heavy blow shakes the cave — the stalactites nearest whoever took it start
 * to swing and ring, their shadows darkening and tightening as they loosen, and then they drop.
 * One that lands shatters in a ring of chimes: a spreading ring of shards that catches anyone
 * standing around it. Drip has frozen the drip on every tip, so they fall heavier here.
 *
 * Heavy blows are what shake them, so land your big hits when Drip stands under a cluster —
 * and when you take one yourself, step out from under the shadows before they fall.
 */

const HEAVY = 9;
const WINDOW_MS = 900;
const LOOSE_MS = 1000;
const DROP_R = 46;
const DROP_DMG = 13;
const RING_MAX = 150;
const RING_SPEED = 260;
const RING_BAND = 14;
const RING_DMG = 6;
const REGROW_MS = 9000;

type State = 'hang' | 'loose' | 'gone';

interface Tite {
  x: number; y: number; len: number; seed: number;
  state: State;
  /** When it was shaken loose, fell, or will regrow. */
  at: number;
  ringAt: number;
}

interface Ring { x: number; y: number; at: number; hit: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const tites: Tite[] = [];
  // A loose grid, jittered, kept clear of the very edges.
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 110 + col * ((W - 220) / 5) + (row % 2 ? 50 : -20) + (rng() - 0.5) * 40;
      const y = top + 90 + row * ((H - top - 170) / 2) + (rng() - 0.5) * 40;
      tites.push({ x: clamp(x, 70, W - 70), y, len: 40 + rng() * 34, seed: rng() * 10, state: 'hang', at: 0, ringAt: -9999 });
    }
  }
  const rings: Ring[] = [];
  const recent = new Map<Fighter, { sum: number; since: number }>([[player, { sum: 0, since: 0 }], [npc, { sum: 0, since: 0 }]]);
  const loosen = ctx.hard ? 3 : 2;
  const looseMs = ctx.hard ? 850 : LOOSE_MS;
  let started = false;
  /** Set while the roof itself is dealing damage, so a falling stalactite does not shake more down. */
  let selfHit = false;
  const roofHit = (f: Fighter, n: number) => { selfHit = true; ctx.hit(f, n, f.x, f.y); selfHit = false; };

  function shake(at: Pt, time: number): void {
    const near = tites
      .filter((t) => t.state === 'hang')
      .map((t) => ({ t, d: dist(t.x, t.y, at.x, at.y) }))
      .filter((e) => e.d < 260)
      .sort((a, b) => a.d - b.d)
      .slice(0, loosen);
    if (!near.length) return;
    for (const { t } of near) { t.state = 'loose'; t.at = time; t.ringAt = time; }
    ctx.sfx('crystal-chime');
    ctx.float(at.x, at.y - 56, 'THE ROOF RINGS', '#cfefff');
  }

  function heavy(f: Fighter, amount: number): void {
    const r = recent.get(f);
    if (!r || !alive(f) || selfHit) return;
    const now = ctx.scene.time.now;
    if (now - r.since > WINDOW_MS) { r.sum = 0; r.since = now; }
    r.sum += amount;
    if (r.sum >= HEAVY) { r.sum = 0; r.since = now; shake({ x: f.x, y: f.y }, now); }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('HEAVY BLOWS SHAKE THE STALACTITES DOWN', '#cfefff'); }
      for (const t of tites) {
        if (t.state === 'loose' && time - t.at >= looseMs) {
          t.state = 'gone';
          t.at = time;
          ctx.sfx('ice-shatter');
          for (const f of [player, npc]) {
            if (!alive(f) || dist(t.x, t.y, f.x, f.y) > DROP_R + 14) continue;
            roofHit(f, ctx.hard ? DROP_DMG + 3 : DROP_DMG);
            ctx.float(f.x, f.y - 46, 'CRACK', '#cfefff');
          }
          ctx.flash(t.x, t.y, ICE);
          rings.push({ x: t.x, y: t.y, at: time, hit: new Set() });
        } else if (t.state === 'gone' && time - t.at >= REGROW_MS) {
          t.state = 'hang';
          t.len = 26;
        }
        // A regrown tooth lengthens slowly as the drip freezes back.
        if (t.state === 'hang' && t.len < 60) t.len += dt * 4;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        const rad = ((time - r.at) / 1000) * RING_SPEED;
        if (rad > RING_MAX) { rings.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (r.hit.has(f) || !alive(f)) continue;
          // The point it landed on is inside the drop; the ring catches those standing round it.
          if (rad > DROP_R && Math.abs(dist(r.x, r.y, f.x, f.y) - rad) < RING_BAND + 10) {
            r.hit.add(f);
            roofHit(f, RING_DMG);
          }
        }
      }
    },

    onPlayerHurt(amount) { heavy(player, amount); },
    onNpcHurt(amount) { heavy(npc, amount); },

    npcSeek() {
      // First, out from under anything swinging.
      for (const t of tites) {
        if (t.state !== 'loose' || dist(t.x, t.y, npc.x, npc.y) > DROP_R + RING_MAX * 0.4) continue;
        const a = Math.atan2(npc.y - t.y, npc.x - t.x);
        return { x: clamp(t.x + Math.cos(a) * 170, 60, W - 60), y: clamp(t.y + Math.sin(a) * 170, top + 50, H - 40) };
      }
      // Then: a clear spot of floor near the player, so the player is the one under the roof.
      let best: Pt | null = null;
      let bs = Infinity;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 190, 60, W - 60), y = clamp(player.y + Math.sin(a) * 160, top + 50, H - 40);
        const under = tites.reduce((m, t) => (t.state === 'hang' ? Math.min(m, dist(t.x, t.y, x, y)) : m), 999);
        const s = dist(x, y, npc.x, npc.y) * 0.5 - Math.min(under, 160);
        if (s < bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const t of tites) {
        if (t.state === 'hang') chimeShadow(g, t.x, t.y, 18 + t.len * 0.15, 0.22);
        else if (t.state === 'loose') {
          const k = clamp((time - t.at) / looseMs, 0, 1);
          // The shadow tightening and darkening — it is coming.
          chimeShadow(g, t.x, t.y, DROP_R * (1.4 - k * 0.4), 0.25 + k * 0.4);
          g.lineStyle(2, ICE, 0.3 + k * 0.6); g.strokeCircle(t.x, t.y, DROP_R);
          g.lineStyle(1.5, ICE, 0.5); g.beginPath(); g.arc(t.x, t.y, DROP_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        } else {
          // Shards and a little frozen splash where it broke.
          const k = clamp((time - t.at) / 600, 0, 1);
          if (time - t.at < REGROW_MS) {
            for (let i = 0; i < 7; i++) {
              const a = t.seed + i * 0.9, d = 8 + ((i * 13) % 18) * (0.4 + k * 0.6);
              g.fillStyle(i % 2 ? FLOW_LIT : ICE, 0.75);
              g.fillTriangle(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d * 0.5, t.x + Math.cos(a + 0.3) * (d + 6), t.y + Math.sin(a + 0.3) * (d + 6) * 0.5, t.x + Math.cos(a) * (d + 9), t.y + Math.sin(a) * (d + 9) * 0.5 - 2);
            }
            g.fillStyle(FLOW_DARK, 0.4); g.fillEllipse(t.x, t.y, 22, 8);
          }
        }
      }
      for (const r of rings) {
        const rad = ((time - r.at) / 1000) * RING_SPEED;
        if (rad < DROP_R) continue;
        const a = 1 - rad / RING_MAX;
        g.lineStyle(RING_BAND, ICE, 0.18 * a); g.strokeEllipse(r.x, r.y, rad * 2, rad * 1.7);
        g.lineStyle(2, SILVER_LIT, 0.8 * a); g.strokeEllipse(r.x, r.y, rad * 2, rad * 1.7);
        // Chime glints riding the ring.
        for (let i = 0; i < 10; i++) {
          const b = (i / 10) * Math.PI * 2 + rad / 60;
          g.fillStyle(BRONZE_LIT, a); g.fillCircle(r.x + Math.cos(b) * rad, r.y + Math.sin(b) * rad * 0.85, 2);
        }
      }
    },

    drawAir(g, time) {
      const t0 = time / 1000;
      for (const t of tites) {
        if (t.state === 'gone') {
          // The fall itself: a streak dropping onto the shadow just after it lets go.
          const k = (time - t.at) / 180;
          if (k < 1) { g.lineStyle(4, FLOW_LIT, 1 - k); g.lineBetween(t.x, t.y - 120 + k * 100, t.x, t.y - 40 + k * 40); }
          continue;
        }
        const loose = t.state === 'loose';
        const k = loose ? clamp((time - t.at) / looseMs, 0, 1) : 0;
        const sway = loose ? Math.sin(t0 * (14 + k * 10) + t.seed) * (0.12 + k * 0.25) : Math.sin(t0 * 0.9 + t.seed) * 0.04;
        const ring = loose ? 0.6 + 0.4 * Math.sin(t0 * 30) : clamp(1 - (time - t.ringAt) / 500, 0, 1);
        const hang = t.y - 150 - t.len * 0.5 + k * 6;
        chime(g, t.x, hang, t.len, sway, ring);
        if (loose) glow(g, t.x, hang + t.len, 14, GLOW, 0.05 + k * 0.05, 2);
      }
      // Frost on the roof line at the top of the arena.
      for (let x = 20; x < W; x += 34) {
        g.fillStyle(FLOW, 0.7); g.fillTriangle(x - 7, top, x + 7, top, x, top + 10 + ((x * 7) % 9));
        g.fillStyle(ICE, 0.6); g.fillTriangle(x - 3, top, x + 3, top, x, top + 7 + ((x * 7) % 9));
      }
    },
  };
}

export const STALACTITE_CHIMES: GimmickDef = {
  id: 'cavern-stalactite-chimes',
  rules: 'Heavy blows shake loose the stalactites over whoever took them: watch the shadows tighten, then they drop and shatter in a ring of chimes.',
  make,
};
