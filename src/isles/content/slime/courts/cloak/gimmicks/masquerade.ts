import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { figure, mask, type MaskKind } from '../art';
import { MASK_BLACK, MASK_GOLD, MASK_TEAL, MASK_VIOLET, MASK_WHITE, WAX } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Masquerade — Maskmaker Visage.
 *
 * Six masked dancers waltz across the floor in three couples, each couple turning about its
 * own centre while the three centres drift round the room. Visage wears a mask too — and it is
 * the exact twin of one dancer's mask, her *partner*. While her face is hidden she is hard to
 * hit: blows go astray in the crowd, and the dancers' bodies take shots meant for her. Every few
 * bars the music swells, everyone turns, and Visage changes places with her partner.
 *
 * Strike a dancer to pull its mask. Strike her partner and Visage's own mask cracks and falls:
 * she is bare for a while, and takes blows the harder for it, until she paints herself a new
 * face to match a new partner. Strike the wrong dancer and you've insulted a guest — they slap
 * you, and dance on bare-faced.
 */

const COUPLE_R = 30;
const DRIFT_R = 210;
const SWAP_WARN = 1300;
const BARE_MS = 5200;

interface Dancer {
  kind: MaskKind; color: number; cloak: number;
  x: number; y: number;
  couple: number; side: number;
  bareUntil: number;
  slapAt: number;
  target: StrikeTarget;
}

const KINDS: MaskKind[] = ['volto', 'bauta', 'domino', 'moon', 'grin', 'weeping'];
const COLORS = [MASK_WHITE, MASK_GOLD, MASK_TEAL, MASK_VIOLET];
const GOWNS = [0x5a2a4a, 0x2a2a4a, 0x3a4a3a, 0x4a3a2a, 0x2a3a4a, 0x4a2a2a];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  let theta = rng() * Math.PI * 2;
  let spin = 0;
  const dancers: Dancer[] = [];
  /** Visage's own mask, and which dancer is her partner (-1 = bare-faced). */
  let partner = 0;
  let bareUntil = 0;
  let fallen: { x: number; y: number; kind: MaskKind; color: number; at: number } | null = null;
  const swapEvery = ctx.hard ? 6500 : 8000;
  let nextSwap = 0;
  let warnAt = -1;
  let swapFx = 0;
  let started = false;

  // Every dancer wears a different face — no two alike, so the partner's match is exact.
  const faces: { kind: MaskKind; color: number }[] = [];
  while (faces.length < 6) {
    const f = { kind: KINDS[Math.floor(rng() * KINDS.length)], color: COLORS[Math.floor(rng() * COLORS.length)] };
    if (!faces.some((o) => o.kind === f.kind && o.color === f.color)) faces.push(f);
  }

  const coupleCentre = (i: number) => {
    const a = theta + (i / 3) * Math.PI * 2;
    return { x: cx + Math.cos(a) * DRIFT_R * 1.3, y: cy + Math.sin(a) * DRIFT_R * 0.8 };
  };
  const place = (d: Dancer) => {
    const c = coupleCentre(d.couple);
    const a = spin * (d.couple % 2 ? -1 : 1) + d.side * Math.PI;
    d.x = clamp(c.x + Math.cos(a) * COUPLE_R, 50, W - 50);
    d.y = clamp(c.y + Math.sin(a) * COUPLE_R * 0.7, top + 50, H - 40);
  };

  for (let i = 0; i < 6; i++) {
    const d: Dancer = {
      ...faces[i], cloak: GOWNS[i], x: cx, y: cy, couple: Math.floor(i / 2), side: i % 2, bareUntil: 0, slapAt: -9999,
      target: null as unknown as StrikeTarget,
    };
    place(d);
    d.target = ctx.target({ x: d.x, y: d.y - 16, r: 17, onStruck: (by) => struck(d, by) });
    dancers.push(d);
  }

  const masked = () => ctx.scene.time.now >= bareUntil && partner >= 0;

  function pickPartner(): void {
    const free = dancers.map((d, i) => i).filter((i) => ctx.scene.time.now >= dancers[i].bareUntil && i !== partner);
    partner = free.length ? free[Math.floor(rng() * free.length)] : Math.floor(rng() * 6);
  }

  function struck(d: Dancer, by: 'player' | 'npc'): void {
    const now = ctx.scene.time.now;
    if (now < d.bareUntil) return;
    const idx = dancers.indexOf(d);
    if (by === 'npc') {
      // Visage's own guests twirl away from her elbow and dance on.
      return;
    }
    d.bareUntil = now + 6000;
    if (idx === partner && masked()) {
      bareUntil = now + BARE_MS;
      fallen = { x: npc.x, y: npc.y + 6, kind: d.kind, color: d.color, at: now };
      ctx.banner('UNMASKED', '#f4e2ff');
      ctx.flash(npc.x, npc.y - 30, 0xffffff);
      ctx.sfx('crystal-shatter');
      partner = -1;
    } else {
      // The wrong guest: a slap, and a stagger back.
      d.slapAt = now;
      ctx.hit(player, ctx.hard ? 8 : 6, player.x, player.y);
      const a = Math.atan2(player.y - d.y, player.x - d.x);
      ctx.nudge(player, Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.float(d.x, d.y - 54, 'HOW DARE YOU', '#ffb0c0');
      ctx.sfx('whip');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSwap = time + swapEvery; pickPartner(); ctx.banner('THE DANCE BEGINS', '#f4e2ff'); }
      theta += dt * 0.16;
      spin += dt * 2.1;
      for (const d of dancers) { place(d); d.target.moveTo(d.x, d.y - 16); }
      // Bare-faced: once the time is up she paints a new face to match a new partner.
      if (partner < 0 && time >= bareUntil) {
        pickPartner();
        ctx.float(npc.x, npc.y - 60, 'A NEW FACE', '#f4e2ff');
        ctx.sfx('sparkle');
      }
      // Change partners.
      if (warnAt < 0 && time >= nextSwap - SWAP_WARN) { warnAt = time; ctx.banner('CHANGE PARTNERS', '#f4e2ff'); ctx.sfx('chaos'); }
      if (time >= nextSwap) {
        nextSwap = time + swapEvery;
        warnAt = -1;
        if (partner >= 0 && alive(npc)) {
          const d = dancers[partner];
          const ox = npc.x, oy = npc.y;
          ctx.nudge(npc, d.x - npc.x, d.y - npc.y);
          ctx.flash(ox, oy - 20, 0xd8c8f0);
          ctx.flash(d.x, d.y - 20, 0xd8c8f0);
          swapFx = time;
          ctx.sfx('blink');
        }
      }
    },

    npcTakenMult() { return masked() ? (ctx.hard ? 0.4 : 0.5) : 1.35; },

    npcSeek() {
      if (!alive(npc)) return null;
      // Keep her partner between herself and the player.
      if (partner >= 0) {
        const d = dancers[partner];
        const a = Math.atan2(d.y - player.y, d.x - player.x);
        return { x: clamp(d.x + Math.cos(a) * 46, 60, W - 60), y: clamp(d.y + Math.sin(a) * 40, top + 50, H - 40) };
      }
      // Bare: get into the thick of the crowd.
      let best = dancers[0], bd = -Infinity;
      for (const d of dancers) { const s = dist(d.x, d.y, player.x, player.y); if (s > bd) { bd = s; best = d; } }
      return { x: best.x, y: best.y + 30 };
    },

    drawGround(g, time) {
      // Chalked dance-steps on the floor, one ring per couple, and their drifting centres.
      for (let i = 0; i < 3; i++) {
        const c = coupleCentre(i);
        g.lineStyle(1.5, 0xf4ecf8, 0.18); g.strokeEllipse(c.x, c.y, COUPLE_R * 2.4, COUPLE_R * 1.6);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + spin * 0.2;
          g.fillStyle(0xf4ecf8, 0.16); g.fillEllipse(c.x + Math.cos(a) * COUPLE_R * 1.2, c.y + Math.sin(a) * COUPLE_R * 0.8, 7, 3);
        }
      }
      // The change-of-partners warning: a ribbon from Visage to her partner.
      if (warnAt >= 0 && partner >= 0 && alive(npc)) {
        const d = dancers[partner];
        const k = clamp((time - warnAt) / SWAP_WARN, 0, 1);
        g.lineStyle(2 + k * 2, MASK_GOLD, 0.25 + k * 0.5); g.lineBetween(npc.x, npc.y, d.x, d.y);
        g.fillStyle(MASK_GOLD, 0.2 + k * 0.3); g.fillCircle(d.x, d.y, 8 + k * 10);
      }
      // The fallen mask, cracked, on the floor.
      if (fallen && time - fallen.at < BARE_MS + 1500) {
        const k = clamp((time - fallen.at) / 400, 0, 1);
        const a = 1 - clamp((time - fallen.at - BARE_MS) / 1500, 0, 1);
        mask(g, fallen.x + k * 16, fallen.y - (1 - k) * 30, 0.8, fallen.kind, fallen.color, a);
        g.lineStyle(1.5, MASK_BLACK, a); g.lineBetween(fallen.x + k * 16 - 2, fallen.y - 8, fallen.x + k * 16 + 3, fallen.y + 6);
      }
    },

    drawAir(g, time) {
      // The dancers, back to front, gowns flared with the turn.
      const order = [...dancers].sort((a, b) => a.y - b.y);
      for (const d of order) {
        const bare = time < d.bareUntil;
        const lean = Math.sin(spin * 2 + d.side * Math.PI) * 0.6;
        // A flared hem: a wide ellipse under the cloak bell, swinging.
        g.fillStyle(dim(d.cloak, 0.2), 0.95); g.fillEllipse(d.x + lean * 4, d.y - 3, 40, 12);
        figure(g, d.x, d.y, 1.05, d.cloak, { mask: bare ? undefined : d.kind, maskColor: d.color, hood: false, lean, arm: 0.6, eyeGlint: bare });
        if (bare) {
          // A plain, put-out face, and the mask dangling from a ribbon at the wrist.
          g.fillStyle(0xd8c0a8, 1); g.fillCircle(d.x + lean * 4, d.y - 42, 7);
          g.lineStyle(1.2, 0x5a3a2a, 1); g.lineBetween(d.x + lean * 4 - 3, d.y - 39, d.x + lean * 4 + 3, d.y - 40);
          mask(g, d.x + 14, d.y - 22, 0.35, d.kind, d.color, 0.8);
        }
        // Couples hold hands: a line between partners at shoulder height.
        const mate = dancers.find((o) => o.couple === d.couple && o !== d);
        if (mate && d.side === 0) { g.lineStyle(2, 0xd8c8b4, 0.7); g.lineBetween(d.x, d.y - 28, mate.x, mate.y - 28); }
        if (time - d.slapAt < 400) {
          const k = (time - d.slapAt) / 400;
          g.lineStyle(3, WAX, 1 - k); g.beginPath(); g.arc(d.x + 10, d.y - 30, 16 + k * 12, -1, 0.6, false); g.strokePath();
        }
      }
      // Visage's own mask, worn — the exact twin of her partner's.
      if (alive(npc)) {
        const p = partner >= 0 ? dancers[partner] : null;
        if (p && time >= bareUntil) {
          glow(g, npc.x, npc.y - 36, 16, lit(p.color, 0.2), 0.04, 2);
          mask(g, npc.x, npc.y - 36, 0.75, p.kind, p.color);
          g.lineStyle(1.2, MASK_GOLD, 0.8); g.lineBetween(npc.x - 10, npc.y - 36, npc.x - 14, npc.y - 28); g.lineBetween(npc.x + 10, npc.y - 36, npc.x + 14, npc.y - 28);
        } else {
          // Bare: a ring of chalk dust round her head while she paints the next face.
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 300;
            g.fillStyle(0xf4ecf8, 0.6); g.fillCircle(npc.x + Math.cos(a) * 18, npc.y - 40 + Math.sin(a) * 8, 2);
          }
        }
      }
      // The turn: a swirl of ribbon where she and her partner traded places.
      const s = (time - swapFx) / 600;
      if (s >= 0 && s < 1 && alive(npc)) {
        for (let i = 0; i < 3; i++) {
          g.lineStyle(2, [MASK_GOLD, WAX, MASK_TEAL][i], 1 - s);
          g.beginPath(); g.arc(npc.x, npc.y - 20, 18 + i * 8 + s * 20, s * 6 + i, s * 6 + i + 2.4, false); g.strokePath();
        }
      }
    },

    destroy() { for (const d of dancers) d.target.remove(); },
  };
}

export const MASQUERADE: GimmickDef = {
  id: 'cloak-masquerade',
  rules: 'Masked dancers waltz the floor. Visage wears the twin of one dancer\'s mask and is hard to hit. Strike her partner to unmask her; strike the wrong one and get slapped.',
  make,
};
