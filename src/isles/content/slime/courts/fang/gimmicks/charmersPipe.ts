import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { charmerBasket, pipersMat, risenCobra, venomSlick } from '../art';
import { BRUISE_LIT, COBRA_HOOD, VENOM, VENOM_DARK, VENOM_LIT } from '../palette';
import { alive, arcPoint, clamp, dist, stepDt } from '../util';

/**
 * Charmer's Pipe — Charmer Sibila.
 *
 * A cobra rises out of a basket in the middle of the square and sways to Sibila's pipe. While the
 * tune plays it is charmed. When the tune falters, it rears — and when it stops, the cobra spits
 * three globs of venom at *whoever is nearest the basket*, which pool where they land. Sibila
 * plays from wherever she stands; she likes you closer to her snake than she is.
 *
 * But there is a piper's mat in front of the basket. Stand on it as the tune ends and the tune is
 * yours: the cobra spits at your foe instead, wherever they are. The piper's hands are full, so
 * the one on the mat takes a quarter more from every blow — and a piper who has just played one
 * tune is out of breath, and cannot claim the next.
 */

type Phase = 'play' | 'falter' | 'spit' | 'rest';

const FALTER_MS = 950;
const FLY_MS = 720;
const REST_MS = 700;
const GLOB_R = 44;
const GLOB_DMG = 10;
const SLICK_MS = 3600;
const SLICK_TICK = 600;
const SLICK_DMG = 3;
const MAT_W = 84;
const MAT_H = 48;

interface Glob { sx: number; sy: number; tx: number; ty: number; at: number; landed: boolean }
interface Slick { x: number; y: number; until: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const PLAY_MS = ctx.hard ? 3800 : 4600;
  const BASKET = { x: W / 2, y: (top + H) / 2 - 10 };
  const MAT = { x: W / 2, y: BASKET.y + 170 };
  let phase: Phase = 'play';
  let phaseAt = 0;
  let started = false;
  /** Who will own the spit when the tune stops (null = Sibila's own pipe: nearest gets it). */
  let piper: Fighter | null = null;
  /** The last mat-piper: out of breath for the next tune. */
  let breathless: Fighter | null = null;
  let victim: Fighter | null = null;
  const globs: Glob[] = [];
  const slicks: Slick[] = [];
  const tick = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  const onMat = (f: Fighter) => alive(f) && Math.abs(f.x - MAT.x) < MAT_W / 2 + 6 && Math.abs(f.y - MAT.y) < MAT_H / 2 + 10;
  const matHolder = (): Fighter | null => {
    for (const f of [player, npc]) if (f !== breathless && onMat(f)) return f;
    return null;
  };
  const nearestToBasket = (): Fighter => {
    if (!alive(player)) return npc;
    if (!alive(npc)) return player;
    return dist(player.x, player.y, BASKET.x, BASKET.y) <= dist(npc.x, npc.y, BASKET.x, BASKET.y) ? player : npc;
  };
  const chooseVictim = (): Fighter => {
    const p = matHolder();
    if (p) return p === player ? npc : player;
    return nearestToBasket();
  };

  function spit(time: number): void {
    const v = chooseVictim();
    victim = v;
    piper = matHolder();
    breathless = piper;
    const head = { x: BASKET.x, y: BASKET.y - 70 };
    const a = Math.atan2(v.y - BASKET.y, v.x - BASKET.x) + Math.PI / 2;
    for (const k of [0, -1, 1]) {
      const off = k === 0 ? 0 : k * (44 + rng() * 18);
      globs.push({
        sx: head.x, sy: head.y,
        tx: clamp(v.x + Math.cos(a) * off + (rng() - 0.5) * 16, 40, W - 40),
        ty: clamp(v.y + Math.sin(a) * off + (rng() - 0.5) * 16, top + 40, H - 30),
        at: time + Math.abs(k) * 90, landed: false,
      });
    }
    ctx.sfx('slime-splat');
    if (piper) ctx.float(piper.x, piper.y - 50, piper === player ? 'YOUR TUNE' : 'SIBILA\'S TUNE', '#f0d080');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; phase = 'play'; phaseAt = time; }
      const age = time - phaseAt;
      if (phase === 'play' && age >= PLAY_MS) { phase = 'falter'; phaseAt = time; ctx.sfx('screech'); ctx.banner('THE TUNE FALTERS', '#f0d080'); }
      else if (phase === 'falter' && age >= FALTER_MS) { phase = 'spit'; phaseAt = time; spit(time); }
      else if (phase === 'spit' && age >= FLY_MS + 200) { phase = 'rest'; phaseAt = time; }
      else if (phase === 'rest' && age >= REST_MS) { phase = 'play'; phaseAt = time; ctx.sfx('sonic-pulse'); }

      for (const gl of globs) {
        if (gl.landed || time - gl.at < FLY_MS) continue;
        gl.landed = true;
        slicks.push({ x: gl.tx, y: gl.ty, until: time + SLICK_MS, seed: rng() * 6 });
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, gl.tx, gl.ty) > GLOB_R + 14) continue;
          ctx.hit(f, GLOB_DMG, f.x, f.y);
          if (f === player) ctx.tk.slowPlayer(0.75, 900);
        }
        ctx.flash(gl.tx, gl.ty, VENOM);
      }
      for (let i = globs.length - 1; i >= 0; i--) if (globs[i].landed) globs.splice(i, 1);
      for (let i = slicks.length - 1; i >= 0; i--) if (time >= slicks[i].until) slicks.splice(i, 1);
      for (const f of [player, npc]) {
        if (!alive(f) || !slicks.some((s) => dist(s.x, s.y, f.x, f.y) < GLOB_R)) continue;
        if (time - (tick.get(f) ?? 0) < SLICK_TICK) continue;
        tick.set(f, time);
        ctx.hit(f, SLICK_DMG, f.x, f.y);
      }
    },

    playerTakenMult() { return matHolder() === player ? 1.25 : 1; },
    npcTakenMult() { return matHolder() === npc ? 1.25 : 1; },

    npcSeek() {
      if (!alive(player)) return null;
      const holder = matHolder();
      // The cobra is about to spit at her: get off the line and out from under the globs.
      if ((phase === 'falter' && (holder === player || (!holder && nearestToBasket() === npc))) || (phase === 'spit' && victim === npc)) {
        const a = Math.atan2(npc.y - BASKET.y, npc.x - BASKET.x) + 0.9;
        return { x: clamp(npc.x + Math.cos(a) * 150, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 150, top + 50, H - 40) };
      }
      // The mat, if she has the breath for it and you are not already on it.
      if (breathless !== npc && holder !== player) return { x: MAT.x, y: MAT.y };
      // Otherwise she keeps the basket between you, a little further from it than you are.
      const a = Math.atan2(BASKET.y - player.y, BASKET.x - player.x);
      const dp = dist(player.x, player.y, BASKET.x, BASKET.y);
      return { x: clamp(BASKET.x + Math.cos(a) * (dp + 90), 60, W - 60), y: clamp(BASKET.y + Math.sin(a) * (dp + 90), top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The mat, glowing for whoever may claim it; dulled for the breathless.
      const holder = matHolder();
      pipersMat(g, MAT.x, MAT.y, MAT_W, MAT_H, 1);
      if (holder) { g.lineStyle(3, holder === player ? 0x9ad0ff : 0xe0a0ff, 0.6 + Math.sin(time / 120) * 0.2); g.strokeRoundedRect(MAT.x - MAT_W / 2 - 4, MAT.y - MAT_H / 2 - 4, MAT_W + 8, MAT_H + 8, 8); }
      for (const s of slicks) venomSlick(g, s.x, s.y, GLOB_R, clamp((s.until - time) / 600, 0, 1), time, s.seed);
      // Where the globs will land.
      for (const gl of globs) {
        const k = clamp((time - gl.at) / FLY_MS, 0, 1);
        g.fillStyle(VENOM_DARK, 0.15 + k * 0.25); g.fillEllipse(gl.tx, gl.ty, GLOB_R * 2 * (0.5 + k * 0.5), GLOB_R * 1.2 * (0.5 + k * 0.5));
        g.lineStyle(2, VENOM_LIT, 0.4 + k * 0.5); g.strokeEllipse(gl.tx, gl.ty, GLOB_R * 2, GLOB_R * 1.2);
      }
      // The falter: the cobra's aim, a line from the basket to who it will spit at.
      if (phase === 'falter') {
        const v = chooseVictim();
        const k = clamp((time - phaseAt) / FALTER_MS, 0, 1);
        g.lineStyle(3, VENOM, 0.2 + k * 0.5); g.lineBetween(BASKET.x, BASKET.y - 10, v.x, v.y);
        g.lineStyle(2, VENOM_LIT, 0.3 + k * 0.6); g.strokeCircle(v.x, v.y, 30 + (1 - k) * 30);
      }
      // The basket's shadow ring: "nearest" is measured from here.
      g.lineStyle(1, COBRA_HOOD, 0.25); g.strokeEllipse(BASKET.x, BASKET.y + 4, 90, 30);
    },

    drawAir(g, time) {
      const age = time - phaseAt;
      const holder = matHolder();
      // The cobra: risen while the tune plays, swaying toward the piper on the mat if there is one.
      const rise = phase === 'rest' ? clamp(age / REST_MS, 0, 1) * 60 + 10 : 70;
      let sway = Math.sin(time / 420);
      if (holder && phase === 'play') sway = clamp((holder.x - BASKET.x) / 120, -1, 1) * 0.6 + Math.sin(time / 300) * 0.4;
      const rear = phase === 'falter' ? clamp(age / FALTER_MS, 0, 1) : phase === 'spit' ? 1 - clamp(age / 400, 0, 1) : 0;
      if (phase === 'falter') sway = Math.sin(time / 60) * 0.25 * (1 - rear);
      charmerBasket(g, BASKET.x, BASKET.y + 30, 1.1);
      risenCobra(g, BASKET.x, BASKET.y + 6, rise, sway, rear, 1.05);
      if (rear > 0.5) glow(g, BASKET.x, BASKET.y - rise - 10, 18, VENOM, 0.05 * rear, 3);
      // Notes drifting up from the piper (Sibila, or whoever holds the mat).
      const src = holder ?? (alive(npc) ? npc : null);
      if (src && phase === 'play') {
        for (let i = 0; i < 4; i++) {
          const ph = ((time / 900) + i / 4) % 1;
          const x = src.x + 14 + Math.sin(ph * 6 + i) * 10, y = src.y - 30 - ph * 50;
          g.fillStyle(holder === player ? 0x9ad0ff : 0xf0d080, 0.8 * (1 - ph));
          g.fillCircle(x, y, 2.6); g.fillRect(x + 1.6, y - 9, 1.4, 9);
          if (i % 2) g.fillRect(x + 1.6, y - 9, 5, 1.4);
        }
      }
      // The falter: the notes going sour and scattering.
      if (phase === 'falter' && src) {
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 300) + i / 3) % 1;
          g.fillStyle(BRUISE_LIT, 0.8 * (1 - ph)); g.fillCircle(src.x + 14 + (i - 1) * ph * 30, src.y - 30 - ph * 20, 2.6);
        }
      }
      // Globs in flight: a lobbed bead of venom with a dripping tail.
      for (const gl of globs) {
        const k = clamp((time - gl.at) / FLY_MS, 0, 1);
        if (time < gl.at) continue;
        const p = arcPoint(gl.sx, gl.sy, gl.tx, gl.ty, 110, k);
        const q = arcPoint(gl.sx, gl.sy, gl.tx, gl.ty, 110, Math.max(0, k - 0.06));
        g.lineStyle(4, VENOM_DARK, 0.6); g.lineBetween(q.x, q.y, p.x, p.y);
        g.fillStyle(VENOM, 1); g.fillCircle(p.x, p.y, 6);
        g.fillStyle(VENOM_LIT, 0.9); g.fillCircle(p.x - 2, p.y - 2, 2);
      }
    },

    drawHud(g, time) {
      // The tune: a bar of notes across the top that the cobra is charmed by, and whose tune it is.
      const w = 260, x0 = W / 2 - w / 2, y = top + 8;
      const k = phase === 'play' ? clamp((time - phaseAt) / PLAY_MS, 0, 1) : phase === 'falter' ? 1 : 0;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 4, y - 4, w + 8, 16, 6);
      g.fillStyle(phase === 'falter' ? BRUISE_LIT : COBRA_HOOD, 0.9); g.fillRoundedRect(x0, y, Math.max(3, w * k), 8, 4);
      for (let i = 0; i < 8; i++) {
        const nx = x0 + 16 + i * 32, on = k * 8 > i;
        g.fillStyle(on ? 0xfff0c0 : 0x6a5a3a, 1); g.fillCircle(nx, y + 4 + (i % 2 ? -1 : 1), 2.4);
      }
      const holder = matHolder();
      if (holder) {
        g.fillStyle(holder === player ? 0x9ad0ff : 0xe0a0ff, 1);
        g.fillTriangle(x0 + w + 12, y + 4, x0 + w + 20, y - 2, x0 + w + 20, y + 10);
      }
      if (breathless) {
        const bx = breathless === player ? 30 : W - 30;
        g.fillStyle(0x000000, 0.4); g.fillCircle(bx, top + 30, 10);
        g.lineStyle(2, 0x9aa0a8, 0.9); g.lineBetween(bx - 5, top + 30, bx + 5, top + 30);
      }
    },
  };
}

export const CHARMERS_PIPE: GimmickDef = {
  id: 'fang-charmers-pipe',
  rules: 'When Sibila\'s tune stops, the cobra spits at whoever is nearest its basket. Stand on the piper\'s mat as it ends and it spits at your foe — but the piper takes +25%.',
  make,
};
