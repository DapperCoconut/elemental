import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow, mulberry } from '../../../../../art/IsleArt';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { nameScratch, quill } from '../art';
import { B, VEN, VEN_CSS, VEN_DARK, VEN_DEEP, VEN_LIT, VEN_LIT_CSS, VIOLET_CSS, type Who, WHO, alive, clamp, dist, other } from '../palette';

/**
 * Seat of the Register — the Decree of the Struck Line.
 *
 * The floor is a page of the Register of the Marked: six ruled lines, one name to a line. Every ten
 * seconds the great quill glides to the margin of the line YOU are standing in and strikes it
 * through, west to east: whoever is on that line as the nib passes is struck — held for the clerk
 * and hurt; the councilor, if he is caught, is Written In (struck hard, held, and takes +35% for a
 * while). A struck line stays wet: everyone wades through ink there. Six lines make a page; the
 * page turns and the floor is clean again.
 *
 * While the quill is finding its line it can be struck, and a struck quill loses its place — it
 * goes to the line of the striker's foe instead. He will strike it back. And remember whose clock
 * is running: the Register is your fastest way to finish him before midnight. His Deal stands him
 * still at your elbow for a handshake — on your line.
 */

const ID = `${B.id}-struck-line`;

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, tk } = ctx;
  const ROWS = 6;
  const RH = (H - top) / ROWS;
  const MARGIN = 58;
  const AIM = 2200;
  const SPEED = ctx.hard ? 1050 : 900;
  const PERIOD = 10000;
  const rowOf = (y: number): number => clamp(Math.floor((y - top) / RH), 0, ROWS - 1);
  const rowY = (r: number): number => top + RH * (r + 0.5);
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  type State = 'wait' | 'aim' | 'write' | 'rest';
  let state: State = 'wait';
  let stateAt = 0;
  let next = 0;
  let row = 0;
  let tip = 0;
  let pen: Pt = { x: W - 80, y: top + 40 };
  let redirectLock = 0;
  let turnAt = 0;
  let handshakeAt = -9999;
  const inked: number[] = new Array(ROWS).fill(0); // time each line was struck (0 = clean)
  const struck: Record<Who, boolean> = { player: false, npc: false };
  const writtenUntil = { npc: 0 };
  const hitFx: { x: number; y: number; at: number; who: Who }[] = [];
  const rng = mulberry(7071);
  const nameSeeds = Array.from({ length: ROWS }, () => Math.floor(rng() * 100000));

  const penTarget = ctx.target({
    x: pen.x, y: pen.y, r: 28, passThrough: true,
    onStruck(by) {
      const now = ctx.scene.time.now;
      if (state !== 'aim' || now < redirectLock) return;
      const foe = fighter(other(by));
      const r = rowOf(foe.y);
      redirectLock = now + 700;
      if (r === row) return;
      row = r;
      ctx.sfx('whoosh');
      ctx.float(pen.x, pen.y - 40, 'IT LOSES ITS PLACE', by === 'player' ? VEN_LIT_CSS : VIOLET_CSS);
    },
  });

  const strike = (w: Who, time: number) => {
    const f = fighter(w);
    struck[w] = true;
    hitFx.push({ x: f.x, y: f.y, at: time, who: w });
    ctx.sfx('slash');
    if (w === 'player') {
      tk.hitPlayer(10, f.x, f.y);
      ctx.root(f, 900);
      ctx.float(f.x, f.y - 50, 'STRUCK', VIOLET_CSS);
    } else {
      ctx.hit(f, Math.max(12, f.maxHp * 0.08), f.x, f.y);
      ctx.root(f, 1000);
      writtenUntil.npc = time + 3500;
      ctx.float(f.x, f.y - 50, 'WRITTEN IN', VEN_LIT_CSS);
    }
  };

  const inInk = (f: Fighter): boolean => inked[rowOf(f.y)] > 0;

  return {
    update(time, dt) {
      if (next === 0) { next = time + 4000; ctx.banner('SIX LINES TO A PAGE — THE QUILL STRIKES YOURS', VEN_CSS); }
      const k = clamp(dt * 6, 0, 1);
      if (state === 'wait' && time >= next) {
        state = 'aim'; stateAt = time; row = rowOf(ctx.player.y); next = time + PERIOD;
        ctx.sfx('curse-cast');
      } else if (state === 'aim') {
        pen = { x: pen.x + (MARGIN - pen.x) * k, y: pen.y + (rowY(row) - pen.y) * k };
        if (time - stateAt >= tk.warn(AIM)) {
          state = 'write'; stateAt = time; tip = MARGIN; struck.player = false; struck.npc = false;
          ctx.sfx('judgement');
        }
      } else if (state === 'write') {
        const prev = tip;
        tip += SPEED * clamp(dt, 0, 0.05);
        pen = { x: tip, y: rowY(row) };
        for (const w of WHO) {
          const f = fighter(w);
          if (struck[w] || !alive(f) || rowOf(f.y) !== row) continue;
          if (f.x > prev - 14 && f.x <= tip + 14) strike(w, time);
        }
        if (tip >= W - MARGIN) {
          inked[row] = time;
          state = 'rest'; stateAt = time;
          if (inked.every((v) => v > 0)) { turnAt = time + 1500; ctx.banner('THE PAGE IS FULL — IT TURNS', VEN_CSS); }
        }
      } else if (state === 'rest') {
        pen = { x: pen.x + (W - 80 - pen.x) * k * 0.5, y: pen.y + (top + 40 - pen.y) * k * 0.5 };
        if (time >= next - 200) state = 'wait';
      }
      if (turnAt && time >= turnAt) { inked.fill(0); turnAt = 0; ctx.sfx('whoosh'); }
      penTarget.moveTo(pen.x, pen.y);
      while (hitFx.length && time - hitFx[0].at > 800) hitFx.shift();
    },
    playerSpeedMult() { return inInk(ctx.player) ? 0.72 : 1; },
    npcSpeedMult() { return inInk(ctx.npc) ? 0.72 : 1; },
    npcTakenMult() { return ctx.scene.time.now < writtenUntil.npc ? 1.35 : 1; },
    onNpcCast(id) {
      if (id !== 'death-deal') return;
      handshakeAt = ctx.scene.time.now;
      ctx.float(ctx.npc.x, ctx.npc.y - 60, 'THE HANDSHAKE', VEN_LIT_CSS);
    },
    npcSeek() {
      const n = ctx.npc;
      const nr = rowOf(n.y);
      const now = ctx.scene.time.now;
      const late = state === 'write' || (state === 'aim' && now - stateAt > tk.warn(AIM) * 0.75);
      if (state === 'aim' && nr === row && !late && dist(n.x, n.y, pen.x, pen.y) < 320) return { x: pen.x + 30, y: pen.y };
      if (late && nr === row) {
        const up = nr > 0 ? nr - 1 : 1, dn = nr < ROWS - 1 ? nr + 1 : nr - 1;
        const pick = inked[up] && !inked[dn] ? dn : up;
        return { x: n.x, y: rowY(pick) };
      }
      if (inked[nr]) {
        let best = -1;
        for (let d = 1; d < ROWS; d++) {
          for (const r of [nr - d, nr + d]) if (best < 0 && r >= 0 && r < ROWS && !inked[r]) best = r;
          if (best >= 0) break;
        }
        if (best >= 0) return { x: n.x, y: rowY(best) };
      }
      return null;
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The page: ruled lines, a margin, the line numbers as pips.
      g.lineStyle(1, OBS.seam, 0.28);
      for (let r = 1; r < ROWS; r++) g.lineBetween(MARGIN - 20, top + r * RH, W - 20, top + r * RH);
      g.lineStyle(2, VEN_DEEP, 0.6); g.lineBetween(MARGIN - 20, top + 6, MARGIN - 20, H - 6);
      for (let r = 0; r < ROWS; r++) {
        for (let i = 0; i <= r; i++) { g.fillStyle(VEN, 0.45); g.fillCircle(24 + (i % 3) * 7, rowY(r) - 8 + Math.floor(i / 3) * 7, 2.2); }
        // Each line's name, faint, in green — the clean lines' names, waiting.
        if (!inked[r]) {
          const nr = mulberry(nameSeeds[r]);
          nameScratch(g, MARGIN + 40, rowY(r) + 4, W * 0.3, 18, VEN_DARK, nr, 0.9);
        }
      }
      // Struck lines: a wet ink wash and the violet line through.
      for (let r = 0; r < ROWS; r++) {
        if (!inked[r]) continue;
        const age = (time - inked[r]) / 1000;
        const y0 = top + r * RH;
        g.fillStyle(0x020203, 0.55); g.fillRect(MARGIN - 18, y0 + 4, W - MARGIN, RH - 8);
        for (let x = MARGIN; x < W - 40; x += 46) {
          g.fillStyle(0x000000, 0.35); g.fillEllipse(x + ((x * 7) % 23), y0 + RH * 0.5 + Math.sin(x) * RH * 0.2, 40, 14);
        }
        const nr = mulberry(nameSeeds[r]);
        nameScratch(g, MARGIN + 40, rowY(r) + 4, W * 0.3, 18, VEN_DEEP, nr, 0.7);
        seam(g, [{ x: MARGIN - 10, y: rowY(r) + 3 }, { x: W * 0.5, y: rowY(r) - 2 }, { x: W - 30, y: rowY(r) + 1 }], 3, 0.8, Math.max(0, 1 - age), OBS.seam);
        // A shine that drifts along the wet ink.
        const sx = MARGIN + ((t * 120 + r * 200) % (W - MARGIN));
        g.fillStyle(0xffffff, 0.05); g.fillEllipse(sx, rowY(r) - 8, 90, 6);
      }
      // The line the quill is finding.
      if (state === 'aim' || state === 'write') {
        const y0 = top + row * RH;
        const k = state === 'aim' ? clamp((time - stateAt) / tk.warn(AIM), 0, 1) : 1;
        const flick = state === 'aim' && k > 0.7 && Math.floor(time / 90) % 2 === 0;
        g.fillStyle(VEN, 0.06 + k * 0.1); g.fillRect(MARGIN - 18, y0 + 3, W - MARGIN, RH - 6);
        g.lineStyle(2, flick ? VEN_LIT : VEN, 0.4 + k * 0.5);
        g.strokeRect(MARGIN - 18, y0 + 3, W - MARGIN, RH - 6);
        if (state === 'aim') {
          g.lineStyle(3, VEN_LIT, 0.8);
          g.lineBetween(MARGIN - 18, y0 + RH - 3, MARGIN - 18 + (W - MARGIN) * k, y0 + RH - 3);
        }
      }
      // The stroke itself, laid behind the nib.
      if (state === 'write') {
        const y = rowY(row);
        g.lineStyle(14, 0x000000, 0.7); g.lineBetween(MARGIN, y, tip, y);
        seam(g, [{ x: MARGIN, y: y + 1 }, { x: tip, y: y - 1 }], 3, 1, 1, OBS.seam);
        glow(g, tip, y, 30, VEN_LIT, 0.08, 3);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      // The quill, hovering, nib down to its line.
      const writing = state === 'write';
      const bob = writing ? 0 : Math.sin(t * 2.2) * 6;
      const ang = writing ? -2.55 : -2.2 + Math.sin(t * 1.3) * 0.1;
      quill(g, pen.x, pen.y - 6 + bob, ang, 120, 1, state === 'aim' || writing ? 1 : 0.4);
      if (state === 'aim') {
        const live = ctx.scene.time.now >= redirectLock;
        g.lineStyle(2, live ? VEN_LIT : VEN_DARK, 0.6 + 0.3 * Math.sin(t * 8)); g.strokeCircle(pen.x, pen.y - 6 + bob, 28);
      }
      for (const h of hitFx) {
        const k = (time - h.at) / 800;
        g.lineStyle(4, h.who === 'npc' ? VEN_LIT : OBS.seamLit, 1 - k);
        g.lineBetween(h.x - 40 - k * 20, h.y - 10, h.x + 40 + k * 20, h.y + 4);
      }
      if (ctx.scene.time.now < writtenUntil.npc && alive(ctx.npc)) {
        const n = ctx.npc;
        nameScratch(g, n.x - 22, n.y - 44, 44, 9, VEN_LIT, mulberry(99), 0.9);
        g.lineStyle(2, OBS.seamLit, 0.9); g.lineBetween(n.x - 26, n.y - 43, n.x + 26, n.y - 46);
      }
      if (time - handshakeAt < 900 && alive(ctx.npc)) {
        const k = (time - handshakeAt) / 900;
        g.lineStyle(2, VEN, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y, 30 + k * 40);
      }
    },
    drawHud(g, time) {
      const cx = W / 2, cy = top + 16;
      g.fillStyle(0x040405, 0.85); g.fillRoundedRect(cx - 100, cy - 11, 200, 22, 8);
      g.lineStyle(1.5, OBS.edge, 0.6); g.strokeRoundedRect(cx - 100, cy - 11, 200, 22, 8);
      for (let r = 0; r < ROWS; r++) {
        const x = cx - 84 + r * 20;
        g.fillStyle(inked[r] ? OBS.seam : VEN_DARK, 1); g.fillRect(x, cy - 5, 14, 10);
        if (inked[r]) { g.lineStyle(1.2, OBS.seamLit, 1); g.lineBetween(x - 1, cy + 1, x + 15, cy - 1); }
      }
      const k = state === 'wait' || state === 'rest' ? clamp(1 - (next - time) / PERIOD, 0, 1) : 1;
      g.fillStyle(VEN_DARK, 1); g.fillRect(cx + 40, cy - 3, 50, 6);
      g.fillStyle(state === 'aim' ? VEN_LIT : VEN, 1); g.fillRect(cx + 40, cy - 3, 50 * k, 6);
    },
    destroy() { penTarget.remove(); },
  };
};

export const DECREE_STRUCK_LINE: GimmickDef = {
  id: ID,
  rules: 'Every ten seconds the quill shall strike through the line its challenger stands on; a quill struck while it seeks loses its place.',
  make,
};
