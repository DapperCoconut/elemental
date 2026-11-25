import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, type G } from '../../../../../art/IsleArt';
import { SF, P, alive, angDiff, clamp, dist, star } from '../palette';
import { fallenId } from '../../../../meteor/spec';

/**
 * Eyes Down — Gaze-Warden Vesper Hollin, in the star's telling the watchwoman who enforced the
 * Prince's oldest summit law: no one looks upon the Evening Star unlicensed. Gazers were reported,
 * and a reported household's star went into the inking book.
 *
 * Every few seconds the Evening Star — Prince Nova's own — rises on the arena's horizon and swells.
 * When it flares, whoever is *looking toward it* is caught gazing: struck and silenced, a blindfold
 * of light over their eyes. You look where your aim is (the bot looks where it walks), so the rule
 * is a tug against your own attacks: when Hollin stands between you and the star, every shot at her
 * is a look at it. Each fighter's gaze is drawn as a cone; inside the forbidden arc it reddens.
 *
 * The exploit is the warden's speculum, a brass mirror on a stand: strike it while the star is
 * swelling and it throws the flare back — at the flare, whoever did NOT strike it is caught,
 * whichever way they were looking. It needs time to come round again after. At half, the star
 * walks: it rides along the horizon while it swells, so the safe way to look keeps moving. The
 * bot walks away from the star on the swell (and goes for the mirror when it is near and lit —
 * which means walking toward the star: bait it).
 */

const ID = fallenId('starfall', 'eyes-down');
const ARC = (55 * Math.PI) / 180;
const WARN_MS = 2400;
const EVERY_MS = 6000;
const CAUGHT_DMG = 18;
const BLIND_MS = 1600;
const MIRROR_RECHARGE = 9000;
const WALK = 1.05;

/** One rising of the Evening Star: where it comes up, and (after half) how far it walks. */
interface Rising { a0: number; walk: number; at: number; fireAt: number; fired: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const spots: Pt[] = [{ x: W * 0.3, y: cy + 40 }, { x: W * 0.7, y: cy - 40 }, { x: W * 0.5, y: top + (H - top) * 0.78 }];
  let spot = 0;
  let rising: Rising | null = null;
  let nextAt = -1;
  let walking = false;
  let mirrorBy: 'player' | 'npc' | null = null;
  let mirrorLitAt = 0;
  let mirror: StrikeTarget | null = null;
  let flareAt = -9999;
  const blind = new Map<Fighter, number>();
  let now = 0;

  /** Where the star stands on the horizon for a bearing from the centre. */
  const horizon = (a: number): Pt => {
    const dx = Math.cos(a), dy = Math.sin(a);
    const kx = dx !== 0 ? (W / 2 - 26) / Math.abs(dx) : Infinity;
    const ky = dy !== 0 ? ((H - top) / 2 - 18) / Math.abs(dy) : Infinity;
    const k = Math.min(kx, ky);
    return { x: cx + dx * k, y: cy + dy * k };
  };
  const starAt = (r: Rising, time: number): Pt => horizon(r.a0 + r.walk * clamp((time - r.at) / WARN_MS, 0, 1));
  /** Is this fighter looking toward the star? */
  const gazing = (f: Fighter, s: Pt): boolean => Math.abs(angDiff(ctx.facing(f), Math.atan2(s.y - f.y, s.x - f.x))) < ARC;

  const placeMirror = (): void => {
    mirror?.remove();
    const p = spots[spot];
    mirror = ctx.target({
      x: p.x, y: p.y - 22, r: 26,
      onStruck: (by) => {
        if (!rising || rising.fired || now < mirrorLitAt) return;
        mirrorBy = by;
        ctx.sfx('prism');
      },
    });
  };

  /** The flare: the caught are struck and blindfolded. */
  function flare(r: Rising): void {
    r.fired = true;
    flareAt = now;
    const s = starAt(r, now);
    ctx.sfx('light-beam');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const side = f === player ? 'player' : 'npc';
      const caught = mirrorBy ? mirrorBy !== side : gazing(f, s);
      if (!caught) continue;
      ctx.hit(f, CAUGHT_DMG, f.x, f.y);
      ctx.silence(f, BLIND_MS);
      blind.set(f, now + BLIND_MS);
      ctx.float(f.x, f.y - 50, mirrorBy ? 'DAZZLED' : 'CAUGHT GAZING', '#ffe08a');
    }
    if (mirrorBy) {
      mirrorBy = null;
      mirrorLitAt = now + MIRROR_RECHARGE;
      spot = (spot + 1) % spots.length;
      placeMirror();
    }
  }

  return {
    update(time) {
      now = time;
      if (!mirror) placeMirror();
      if (nextAt < 0) nextAt = time + 1800;
      if (!walking && npc.hp < npc.maxHp * 0.5) {
        walking = true;
        ctx.banner('THE EVENING STAR WALKS', '#ffe08a');
        ctx.sfx('wings');
      }
      if (!rising && time >= nextAt) {
        rising = { a0: rng() * Math.PI * 2, walk: walking ? (rng() < 0.5 ? WALK : -WALK) : 0, at: time, fireAt: time + WARN_MS, fired: false };
        ctx.sfx('beam-charge');
      }
      if (rising && !rising.fired && time >= rising.fireAt) flare(rising);
      if (rising && rising.fired && time - rising.fireAt > 500) { rising = null; nextAt = time + (walking ? EVERY_MS - 800 : EVERY_MS) - WARN_MS; }
    },

    npcSeek() {
      if (!rising || rising.fired) return null;
      const s = starAt(rising, rising.fireAt);
      // The mirror is lit and near: go and strike it (walking at the star to get there).
      const m = spots[spot];
      if (now >= mirrorLitAt && !mirrorBy && dist(npc.x, npc.y, m.x, m.y) < 240) return { x: m.x + 30, y: m.y };
      // Otherwise walk away from where the star will flare, so the eyes go with the feet.
      const a = Math.atan2(npc.y - s.y, npc.x - s.x);
      let x = npc.x + Math.cos(a) * 180, y = npc.y + Math.sin(a) * 180;
      if (x < 60 || x > W - 60 || y < top + 50 || y > H - 50) { x = npc.x + Math.cos(a + Math.PI / 2) * 180; y = npc.y + Math.sin(a + Math.PI / 2) * 180; }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 50) };
    },

    drawGround(g, time) {
      const s = rising ? starAt(rising, Math.min(time, rising.fireAt)) : null;
      drawWatchEye(g, cx, cy, s, time);
      if (rising && s && !rising.fired) {
        const k = clamp((time - rising.at) / WARN_MS, 0, 1);
        // The star's light laid on the floor in a long wedge toward the middle.
        const a = Math.atan2(cy - s.y, cx - s.x);
        g.fillStyle(SF.starGold, 0.05 + k * 0.1);
        g.fillTriangle(s.x, s.y, s.x + Math.cos(a - 0.5) * 900, s.y + Math.sin(a - 0.5) * 900, s.x + Math.cos(a + 0.5) * 900, s.y + Math.sin(a + 0.5) * 900);
        // Each fighter's gaze: a cone where they look, red when it is turned on the star.
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const fa = ctx.facing(f);
          const bad = mirrorBy ? mirrorBy !== (f === player ? 'player' : 'npc') : gazing(f, s);
          const col = bad ? 0xff4a3a : SF.comet;
          g.fillStyle(col, bad ? 0.22 + k * 0.25 : 0.12);
          g.fillTriangle(f.x, f.y, f.x + Math.cos(fa - ARC) * 90, f.y + Math.sin(fa - ARC) * 90, f.x + Math.cos(fa + ARC) * 90, f.y + Math.sin(fa + ARC) * 90);
          g.lineStyle(1.5, col, 0.5); g.lineBetween(f.x, f.y, f.x + Math.cos(fa) * 100, f.y + Math.sin(fa) * 100);
        }
      }
      const fk = (time - flareAt) / 500;
      if (fk >= 0 && fk < 1) { g.fillStyle(SF.starHot, 0.3 * (1 - fk)); g.fillRect(0, top, W, H - top); }
      drawMirror(g, spots[spot], time, now >= mirrorLitAt, mirrorBy);
    },

    drawAir(g, time) {
      if (rising) {
        const s = starAt(rising, Math.min(time, rising.fireAt));
        const k = clamp((time - rising.at) / WARN_MS, 0, 1);
        const burst = rising.fired ? 1 - clamp((time - rising.fireAt) / 500, 0, 1) : 0;
        glow(g, s.x, s.y, 50 + k * 60 + burst * 120, SF.starGold, 0.06 + burst * 0.1, 4);
        star(g, s.x, s.y, 14 + k * 26 + burst * 40, SF.starGold, 1);
        star(g, s.x, s.y, 8 + k * 10, SF.starHot, 1);
        // Count pips round the star, one out per beat.
        if (!rising.fired) for (let i = 0; i < 3; i++) {
          const on = (1 - k) * 3 > i;
          const pa = -Math.PI / 2 + (i - 1) * 0.5;
          g.fillStyle(on ? SF.starHot : SF.stoneDark, 1); g.fillCircle(s.x + Math.cos(pa) * 54, s.y + Math.sin(pa) * 54, 3.5);
        }
      }
      // Blindfolds of light over the caught.
      for (const [f, until] of blind) {
        if (now >= until || !alive(f)) continue;
        const a = clamp((until - now) / 400, 0, 1);
        g.fillStyle(SF.starGold, 0.9 * a); g.fillRoundedRect(f.x - 15, f.y - 60, 30, 8, 3);
        g.fillStyle(SF.starHot, 0.8 * a); g.fillRect(f.x - 12, f.y - 58, 24, 2);
        g.lineStyle(1.5, SF.starGold, 0.8 * a); g.lineBetween(f.x + 15, f.y - 56, f.x + 22, f.y - 48);
      }
    },

    drawHud(g) {
      // An eye on a slip: open while the star swells, shut when it is safe to look anywhere.
      const x = W / 2, y = top + 18;
      const k = rising && !rising.fired ? clamp((now - rising.at) / WARN_MS, 0, 1) : 0;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 32, y - 13, 64, 26, 10);
      const open = 2 + k * 8;
      g.fillStyle(SF.parchment, 1); g.fillEllipse(x, y, 40, open * 2);
      if (k > 0) { g.fillStyle(k > 0.66 ? 0xff4a3a : SF.lapis, 1); g.fillCircle(x, y, Math.min(open, 6)); }
      g.lineStyle(2, SF.ink, 1); g.strokeEllipse(x, y, 40, open * 2);
    },

    destroy() { mirror?.remove(); mirror = null; blind.clear(); },
  };
}

/** The Watch-floor: a great inlaid eye in moonstone and lapis, its iris turned to the star. */
function drawWatchEye(g: G, cx: number, cy: number, s: Pt | null, time: number): void {
  const w = 300, h = 120;
  const lid = (k: number): Phaser.Geom.Point[] => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(P(cx - w + t * w * 2, cy - Math.sin(t * Math.PI) * h * k)); }
    for (let i = 20; i >= 0; i--) { const t = i / 20; pts.push(P(cx - w + t * w * 2, cy + Math.sin(t * Math.PI) * h * k)); }
    return pts;
  };
  g.fillStyle(SF.stoneDeep, 0.6); g.fillPoints(lid(1.12), true, true);
  g.fillStyle(SF.stoneLit, 0.4); g.fillPoints(lid(1), true, true);
  // Lashes of gold leaf round the upper lid.
  for (let i = 1; i < 12; i++) {
    const t = i / 12, x = cx - w + t * w * 2, y = cy - Math.sin(t * Math.PI) * h;
    g.lineStyle(3, SF.leaf, 0.6); g.lineBetween(x, y, x + (t - 0.5) * 30, y - 22);
  }
  const look = s ? Math.atan2(s.y - cy, s.x - cx) : time / 3000;
  const ix = cx + Math.cos(look) * 90, iy = cy + Math.sin(look) * 34;
  g.fillStyle(SF.lapis, 0.85); g.fillCircle(ix, iy, 64);
  g.lineStyle(1.5, SF.lapisLit, 0.8);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; g.lineBetween(ix + Math.cos(a) * 26, iy + Math.sin(a) * 26, ix + Math.cos(a) * 60, iy + Math.sin(a) * 60); }
  g.fillStyle(SF.ink, 0.9); g.fillCircle(ix, iy, 26);
  g.fillStyle(SF.silver, 0.5); g.fillCircle(ix - 10, iy - 10, 7);
  g.lineStyle(2, SF.brass, 0.6); g.strokePoints(lid(1), true, true);
}

/** The warden's speculum: a polished brass disc on a tripod; lit, it shines; spent, it is dull. */
function drawMirror(g: G, p: Pt, time: number, lit: boolean, held: 'player' | 'npc' | null): void {
  const t = time / 1000;
  g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 2, 46, 12);
  g.lineStyle(3, SF.brassDark, 1);
  g.lineBetween(p.x, p.y - 20, p.x - 16, p.y); g.lineBetween(p.x, p.y - 20, p.x + 16, p.y); g.lineBetween(p.x, p.y - 20, p.x + 2, p.y + 3);
  const tilt = held ? 0.35 : Math.sin(t) * 0.08;
  g.fillStyle(SF.brassDark, 1); g.fillEllipse(p.x, p.y - 42, 44 * Math.cos(tilt), 46);
  g.fillStyle(lit ? SF.brassLit : SF.brass, 1); g.fillEllipse(p.x, p.y - 42, 38 * Math.cos(tilt), 40);
  if (lit) {
    g.fillStyle(SF.starHot, 0.55 + Math.sin(t * 3) * 0.2); g.fillEllipse(p.x - 6, p.y - 48, 12 * Math.cos(tilt), 16);
    glow(g, p.x, p.y - 42, 40, held ? SF.starHot : SF.starGold, held ? 0.1 : 0.04, 3);
  } else {
    g.fillStyle(SF.brassDark, 0.5); g.fillEllipse(p.x, p.y - 42, 26, 28);
  }
}

export const FALLEN_EYES_DOWN: GimmickDef = {
  id: ID,
  rules: 'When the Evening Star flares, whoever looks toward it is struck and silenced. Strike the mirror while it swells: the flare finds the other one.',
  make,
};
