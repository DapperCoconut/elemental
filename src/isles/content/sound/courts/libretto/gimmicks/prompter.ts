import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { paperLantern, sheet } from '../art';
import { GILT, GILT_LIT, GLOW, GLOW_LIT, INK, OAK, OAK_DARK, PAPER_LIT, RED, RED_LIT } from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';

/**
 * The Prompter — Prompter Cue.
 *
 * Every verse in the Score is tried out on the Proving Stage first, and the prompter's box at its
 * lip has called every line of them for thirty years. In this fight it calls cues — one for each
 * fighter, shown over their heads: stand in the spotlight, strike from behind, keep still, cross
 * the stage, take a bow at the footlights, land three blows. Play your cue before the box's bell
 * and you get an *encore*: a heal, and for a few seconds your blows land harder. Dry, and the box
 * throws a cabbage at you.
 *
 * Cue reads his cues and plays them. But the stage is shared: two in one spotlight is an
 * upstaging and nobody gets the light, a fighter who is struck while keeping still has moved,
 * and the footlights are a long way from wherever he is standing. Play yours — and spoil his.
 */

type CueKind = 'spot' | 'behind' | 'still' | 'cross' | 'bow' | 'thrice';

const CUE_TEXT: Record<CueKind, string> = {
  spot: 'STAND IN THE SPOTLIGHT',
  behind: 'STRIKE FROM BEHIND',
  still: 'KEEP STILL',
  cross: 'CROSS THE STAGE',
  bow: 'BOW AT THE FOOTLIGHTS',
  thrice: 'LAND THREE BLOWS',
};

const SPOT_R = 62;
const FOOT_Y = 96;

interface Cue {
  kind: CueKind;
  /** Where they stood when it was called (still / cross). */
  ox: number; oy: number;
  hits: number;
  done: boolean;
  failed: boolean;
}

interface Cabbage { x0: number; y0: number; x1: number; y1: number; at: number; prey: Fighter; landed: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const box: Pt = { x: W / 2, y: H - 30 };
  const callMs = ctx.hard ? 4300 : 5000;
  const restMs = 1900;
  const encoreMs = 5000;
  let phaseEnd = 0;
  let calling = false;
  let started = false;
  let spot: Pt = { x: W / 2, y: H / 2 };
  const cues = new Map<Fighter, Cue>();
  const encoreUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let cabbages: Cabbage[] = [];
  let selfHit = false;
  let bellAt = -9999;

  const other = (f: Fighter) => (f === player ? npc : player);
  const inSpot = (f: Fighter) => alive(f) && dist(f.x, f.y, spot.x, spot.y) < SPOT_R;
  const atFoot = (f: Fighter) => f.y > H - FOOT_Y;
  const half = (x: number) => (x < W / 2 ? -1 : 1);

  function call(time: number): void {
    const pool: CueKind[] = ['spot', 'behind', 'still', 'cross', 'bow', 'thrice'];
    const pk = pool[Math.floor(rng() * pool.length)];
    let nk = pool[Math.floor(rng() * pool.length)];
    // At most one fighter is given the spotlight; the other may only spoil it.
    if (nk === pk) nk = pool[(pool.indexOf(nk) + 1 + Math.floor(rng() * 5)) % pool.length];
    for (const [f, k] of [[player, pk], [npc, nk]] as [Fighter, CueKind][]) {
      cues.set(f, { kind: k, ox: f.x, oy: f.y, hits: 0, done: false, failed: false });
      ctx.float(f.x, f.y - 66, CUE_TEXT[k], f === player ? '#fff0c0' : '#f4d88a');
    }
    ctx.banner(`YOUR CUE: ${CUE_TEXT[pk]}`, '#fff0c0');
    // Light the spot away from both fighters.
    for (let tries = 0; tries < 10; tries++) {
      spot = { x: 120 + rng() * (W - 240), y: top + 90 + rng() * (H - top - 220) };
      if (dist(spot.x, spot.y, player.x, player.y) > 200 && dist(spot.x, spot.y, npc.x, npc.y) > 200) break;
    }
    ctx.sfx('holy-chord');
    phaseEnd = time + callMs;
    calling = true;
  }

  function encore(f: Fighter, time: number): void {
    encoreUntil.set(f, time + encoreMs);
    ctx.heal(f, f === player ? 10 : ctx.hard ? 12 : 9);
    ctx.float(f.x, f.y - 56, 'ENCORE!', '#f4d88a');
    ctx.sfx('jackpot');
  }

  function dry(f: Fighter, time: number, why = 'DRIED!'): void {
    ctx.float(f.x, f.y - 56, why, '#f05a5a');
    cabbages.push({ x0: box.x, y0: box.y - 20, x1: f.x, y1: f.y, at: time, prey: f, landed: false });
    ctx.sfx('boing');
  }

  function resolve(time: number): void {
    for (const [f, c] of cues) {
      if (!alive(f) || c.done) continue;
      let ok = false;
      let why = 'DRIED!';
      if (!c.failed) {
        switch (c.kind) {
          case 'spot':
            ok = inSpot(f) && !inSpot(other(f));
            if (inSpot(f) && inSpot(other(f))) why = 'UPSTAGED!';
            break;
          case 'still': ok = dist(f.x, f.y, c.ox, c.oy) < 44; break;
          case 'cross': ok = half(f.x) !== half(c.ox); break;
          case 'bow': ok = atFoot(f); break;
          default: ok = false;
        }
      }
      if (ok) encore(f, time); else dry(f, time, why);
    }
    cues.clear();
    calling = false;
    phaseEnd = time + restMs;
    bellAt = time;
    ctx.sfx('crystal-chime');
  }

  function struck(attacker: Fighter, victim: Fighter, time: number): void {
    const c = cues.get(attacker);
    if (c && !c.done && !c.failed) {
      if (c.kind === 'thrice') {
        c.hits++;
        if (c.hits >= 3) { c.done = true; encore(attacker, time); }
      } else if (c.kind === 'behind') {
        const look = ctx.facing(victim);
        const from = Math.atan2(attacker.y - victim.y, attacker.x - victim.x);
        if (Math.abs(wrapAngle(from - look)) > 1.9) { c.done = true; encore(attacker, time); }
      }
    }
    // A blow moves you: keeping still is spoilt.
    const vc = cues.get(victim);
    if (vc && vc.kind === 'still' && !vc.done && !vc.failed && dist(victim.x, victim.y, vc.ox, vc.oy) > 30) vc.failed = true;
  }

  return {
    update(time) {
      if (!started) { started = true; phaseEnd = time + 1500; }
      if (time >= phaseEnd) { if (calling) resolve(time); else if (alive(player) && alive(npc)) call(time); }
      if (calling) {
        for (const [f, c] of cues) {
          if (c.kind === 'still' && !c.failed && dist(f.x, f.y, c.ox, c.oy) > 60) { c.failed = true; ctx.float(f.x, f.y - 50, 'MOVED…', '#f05a5a'); }
        }
      }
      for (const c of cabbages) {
        if (c.landed || time - c.at < 750) continue;
        c.landed = true;
        if (alive(c.prey) && dist(c.prey.x, c.prey.y, c.x1, c.y1) < 46) {
          selfHit = true;
          ctx.hit(c.prey, ctx.hard ? 9 : 7, c.x1, c.y1);
          selfHit = false;
          ctx.sfx('slime-splat');
        }
      }
      cabbages = cabbages.filter((c) => time - c.at < 1300);
    },

    npcTakenMult() { return ctx.scene.time.now < (encoreUntil.get(player) ?? 0) ? 1.3 : 1; },
    playerTakenMult() { return ctx.scene.time.now < (encoreUntil.get(npc) ?? 0) ? 1.3 : 1; },

    onNpcHurt() { if (!selfHit) struck(player, npc, ctx.scene.time.now); },
    onPlayerHurt() { if (!selfHit) struck(npc, player, ctx.scene.time.now); },

    npcSeek() {
      const c = cues.get(npc);
      const pc = cues.get(player);
      if (calling && c && !c.done && !c.failed) {
        switch (c.kind) {
          case 'spot': return spot;
          case 'still': return { x: c.ox, y: c.oy };
          case 'cross': return { x: c.ox < W / 2 ? W * 0.78 : W * 0.22, y: clamp(c.oy, top + 60, H - 60) };
          case 'bow': return { x: clamp(npc.x, 120, W - 120), y: H - 56 };
          case 'behind': {
            const look = ctx.facing(player);
            return { x: clamp(player.x - Math.cos(look) * 110, 50, W - 50), y: clamp(player.y - Math.sin(look) * 110, top + 40, H - 40) };
          }
          case 'thrice': return { x: player.x + (npc.x < player.x ? -130 : 130), y: player.y };
        }
      }
      // Your spotlight is his to spoil.
      if (calling && pc && pc.kind === 'spot') return spot;
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 240, 60, W - 60), y: clamp(player.y + Math.sin(a) * 200, top + 50, H - 80) };
    },

    drawGround(g, time) {
      // The footlights strip and the box at the lip of the stage.
      g.fillStyle(GLOW, 0.06 + (calling ? 0.04 : 0)); g.fillRect(0, H - FOOT_Y, W, FOOT_Y);
      g.lineStyle(2, GILT, 0.5); g.lineBetween(0, H - FOOT_Y, W, H - FOOT_Y);
      for (let x = 50; x < W; x += 110) if (Math.abs(x - box.x) > 70) paperLantern(g, x, H - 14, 6, 0.7 + Math.sin(time / 300 + x) * 0.1);
      // The spotlight's pool on the boards.
      if (calling) {
        const both = inSpot(player) && inSpot(npc);
        glow(g, spot.x, spot.y, SPOT_R * 1.3, both ? RED_LIT : GLOW_LIT, 0.07, 4);
        g.fillStyle(both ? RED_LIT : GLOW_LIT, 0.18); g.fillEllipse(spot.x, spot.y, SPOT_R * 2, SPOT_R * 1.7);
        g.lineStyle(2, both ? RED : GILT_LIT, 0.7); g.strokeEllipse(spot.x, spot.y, SPOT_R * 2, SPOT_R * 1.7);
      }
      // Chalked toe-marks where a "keep still" cue was called.
      for (const [f, c] of cues) {
        if (c.kind !== 'still') continue;
        g.lineStyle(2, c.failed ? RED : f === player ? PAPER_LIT : GILT_LIT, 0.7);
        g.lineBetween(c.ox - 12, c.oy - 12, c.ox + 12, c.oy + 12); g.lineBetween(c.ox + 12, c.oy - 12, c.ox - 12, c.oy + 12);
        g.strokeCircle(c.ox, c.oy, 44);
      }
      // The centre line for "cross the stage".
      if ([...cues.values()].some((c) => c.kind === 'cross')) {
        for (let y = top + 10; y < H - FOOT_Y; y += 24) { g.fillStyle(PAPER_LIT, 0.25); g.fillRect(W / 2 - 1.5, y, 3, 12); }
      }
    },

    drawAir(g, time) {
      // The beam of the spot from the flies.
      if (calling) {
        g.fillStyle(GLOW_LIT, 0.06);
        g.fillTriangle(spot.x - 26, top, spot.x + 26, top, spot.x + SPOT_R, spot.y);
        g.fillTriangle(spot.x - 26, top, spot.x - SPOT_R, spot.y, spot.x + SPOT_R, spot.y);
      }
      // The prompter's box: a hooded shell, two eyes, a hand holding up the script.
      g.fillStyle(OAK_DARK, 1); g.fillEllipse(box.x, box.y + 6, 92, 26);
      g.beginPath(); g.arc(box.x, box.y + 4, 42, Math.PI, 0, false); g.fillPath();
      g.fillStyle(OAK, 1); g.beginPath(); g.arc(box.x, box.y + 4, 38, Math.PI, 0, false); g.fillPath();
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; g.lineStyle(1.5, OAK_DARK, 1); g.lineBetween(box.x, box.y + 4, box.x + Math.cos(a) * 38, box.y + 4 + Math.sin(a) * 38); }
      g.fillStyle(0x0a080c, 1); g.beginPath(); g.arc(box.x, box.y + 6, 28, Math.PI, 0, false); g.fillPath();
      const blink = (time % 3200) < 120 ? 0.2 : 1;
      g.fillStyle(GLOW_LIT, 0.9); g.fillEllipse(box.x - 8, box.y - 6, 5, 4 * blink); g.fillEllipse(box.x + 8, box.y - 6, 5, 4 * blink);
      if (calling) {
        const k = clamp(1 - (phaseEnd - time) / callMs, 0, 1);
        sheet(g, box.x + 22, box.y - 18 - Math.sin(time / 200) * 2, 14, 18, 0.25, PAPER_LIT);
        g.lineStyle(3, GILT, 0.9); g.beginPath(); g.arc(box.x, box.y - 2, 48, Math.PI, Math.PI + k * Math.PI, false); g.strokePath();
      }
      if (time - bellAt < 400) { const k = (time - bellAt) / 400; g.lineStyle(3, GILT_LIT, 1 - k); g.strokeCircle(box.x, box.y - 10, 30 + k * 60); }
      // Cue icons over each head, with the time left.
      for (const [f, c] of cues) {
        if (!alive(f)) continue;
        const x = f.x, y = f.y - 58;
        const col = c.done ? GILT_LIT : c.failed ? RED : f === player ? PAPER_LIT : GILT;
        g.fillStyle(INK, 0.75); g.fillRoundedRect(x - 15, y - 13, 30, 24, 6);
        g.lineStyle(1.5, col, 1); g.strokeRoundedRect(x - 15, y - 13, 30, 24, 6);
        g.lineStyle(2, col, 1); g.fillStyle(col, 1);
        switch (c.kind) {
          case 'spot': g.fillTriangle(x - 4, y - 9, x + 4, y - 9, x + 9, y + 5); g.fillTriangle(x - 4, y - 9, x - 9, y + 5, x + 9, y + 5); break;
          case 'behind': g.strokeCircle(x + 4, y - 1, 6); g.lineBetween(x - 10, y - 1, x - 3, y - 1); g.fillTriangle(x - 3, y - 4, x - 3, y + 2, x + 1, y - 1); break;
          case 'still': g.fillEllipse(x - 4, y, 5, 9); g.fillEllipse(x + 4, y, 5, 9); break;
          case 'cross': g.lineBetween(x - 10, y, x + 10, y); g.fillTriangle(x + 10, y - 4, x + 10, y + 4, x + 14, y); g.fillTriangle(x - 10, y - 4, x - 10, y + 4, x - 14, y); break;
          case 'bow': g.fillCircle(x, y - 6, 3); g.lineBetween(x, y - 3, x + 6, y + 3); g.lineBetween(x - 6, y + 7, x + 8, y + 7); break;
          case 'thrice': for (let i = 0; i < 3; i++) { if (i < c.hits) g.fillCircle(x - 8 + i * 8, y, 3); else g.strokeCircle(x - 8 + i * 8, y, 3); } break;
        }
      }
      // Encore glow, and the cabbages in flight.
      for (const [f, until] of encoreUntil) {
        if (!alive(f) || time > until) continue;
        const k = (until - time) / encoreMs;
        g.lineStyle(2, GILT_LIT, 0.3 + k * 0.4); g.strokeCircle(f.x, f.y, 28 + Math.sin(time / 90) * 2);
        for (let i = 0; i < 3; i++) { const a = time / 300 + i * 2.1; g.fillStyle(GILT_LIT, 0.8); g.fillCircle(f.x + Math.cos(a) * 30, f.y + Math.sin(a) * 30 - 10, 2); }
      }
      for (const c of cabbages) {
        const k = clamp((time - c.at) / 750, 0, 1);
        if (k < 1) {
          const x = c.x0 + (c.x1 - c.x0) * k, y = c.y0 + (c.y1 - c.y0) * k - Math.sin(k * Math.PI) * 140;
          g.fillStyle(0x000000, 0.2); g.fillEllipse(c.x0 + (c.x1 - c.x0) * k, c.y0 + (c.y1 - c.y0) * k + 10, 16, 5);
          g.fillStyle(0x6a9a4a, 1); g.fillCircle(x, y, 9);
          g.fillStyle(0x8aba5a, 1); g.fillCircle(x - 2, y - 2, 6);
          g.lineStyle(1, 0x3a5a2a, 1); g.lineBetween(x - 6, y, x + 6, y - 3);
          // Where it will land.
          g.lineStyle(1.5, RED_LIT, 0.6); g.strokeCircle(c.x1, c.y1, 46 * (1 - k * 0.4));
        } else {
          const s = (time - c.at - 750) / 550;
          for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillStyle(0x6a9a4a, 1 - s); g.fillEllipse(c.x1 + Math.cos(a) * s * 30, c.y1 + Math.sin(a) * s * 18, 7, 4); }
        }
      }
    },
  };
}

export const PROMPTER: GimmickDef = {
  id: 'libretto-prompter',
  rules: 'The prompter calls a cue over each fighter. Play yours in time for an encore: a heal and harder blows. Dry and he throws a cabbage. Two in one spotlight is an upstaging.',
  make,
};
