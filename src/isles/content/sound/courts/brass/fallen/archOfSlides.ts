import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { bandsman } from '../art';
import {
  BRAID, BRASS, BRASS_DARK, BRASS_LIT, BRASS_SHINE, CREAM, NAVY, NAVY_DARK, SCARLET, SCARLET_DARK, SCARLET_LIT,
} from '../palette';
import { alive, clamp, segInfo, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Arch of Slides — Equerry Peregrine Vallow.
 *
 * When a guest of the crown climbs the Bandhall steps, the trombones form a guard of honour: two
 * ranks face each other across a red runner and raise their horns so the slides cross overhead
 * in an arch. Vallow is the Prince's equerry; he decides who walks under it, and who is clouted.
 *
 * Under the ARCH you are honoured: shots fired from outside the aisle are caught in the crossed
 * slides, and your blows land harder on the foe. Then the ranks level their horns (the runner
 * reddens) and SHOOT their slides across the aisle, clouting and silencing everyone still on it,
 * before marching off to form a new aisle by the player. Bask in it — and leave him there.
 * Past half, a second aisle crosses the first and fires a moment after it.
 */

const AW = 62;
const LEN = 560;
const MEN = 8;
const FORM_MS = 1150;
const ARCH_MS = 3000;
const HALF_ARCH_MS = 2600;
const READY_MS = 900;
const SLIDE_MS = 260;
const CLOUT_DMG = 16;
const SILENCE_MS = 1000;
const HONOUR_MULT = 1.3;

type Phase = 'form' | 'arch' | 'ready' | 'slide';

interface Aisle {
  a: Pt; b: Pt; fromA: Pt; fromB: Pt;
  phase: Phase; phaseAt: number; delay: number; fired: boolean;
}

/** One trombone, from the player's shoulder (x, y) pointing along `ang`, slide out by `ext`. */
function trombone(g: G, x: number, y: number, ang: number, len: number, ext: number, k: number): void {
  const c = Math.cos(ang), s = Math.sin(ang);
  const nx = -s * 4, ny = c * 4;
  const ex = x + c * (len + ext), ey = y + s * (len + ext);
  // The slide: two parallel tubes and the crook.
  g.lineStyle(2.4, BRASS_DARK, 1);
  g.lineBetween(x + nx, y + ny, ex + nx, ey + ny); g.lineBetween(x - nx, y - ny, ex - nx, ey - ny);
  g.lineStyle(1.2, BRASS_SHINE, 0.8 + k * 0.2);
  g.lineBetween(x + nx, y + ny - 1, ex + nx, ey + ny - 1);
  g.lineStyle(3, BRASS, 1); g.lineBetween(ex + nx, ey + ny, ex - nx, ey - ny);
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(ex, ey, 2.4);
  // The bell, back over the shoulder.
  const bx = x - c * 14, by = y - s * 14;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(bx, by, 7);
  g.fillStyle(BRASS, 1); g.fillCircle(bx, by, 5.5);
  g.fillStyle(dim(BRASS_DARK, 0.5), 1); g.fillCircle(bx, by, 3);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  let archMs = ARCH_MS;
  let crossed = false;
  const aisles: Aisle[] = [];

  const fit = (cx: number, cy: number, ang: number): { a: Pt; b: Pt } => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const x = clamp(cx, 140, W - 140), y = clamp(cy, top + 110, H - 90);
    const a = { x: clamp(x - c * LEN / 2, 50, W - 50), y: clamp(y - s * LEN / 2, top + 30, H - 30) };
    const b = { x: clamp(x + c * LEN / 2, 50, W - 50), y: clamp(y + s * LEN / 2, top + 30, H - 30) };
    return { a, b };
  };

  const newLine = (cross: boolean): { a: Pt; b: Pt } => {
    // Across the line between them, on the player's side of the middle.
    const base = Math.atan2(npc.y - player.y, npc.x - player.x);
    const ang = base + Math.PI / 2 + (ctx.rng() - 0.5) * 0.8 + (cross ? Math.PI / 2 : 0);
    const cx = player.x + (npc.x - player.x) * 0.38, cy = player.y + (npc.y - player.y) * 0.38;
    return fit(cx, cy, ang);
  };

  const start = (al: Aisle, time: number, line: { a: Pt; b: Pt }) => {
    al.fromA = al.a; al.fromB = al.b; al.a = line.a; al.b = line.b;
    al.phase = 'form'; al.phaseAt = time; al.fired = false;
  };

  {
    const first = fit(W / 2 - 40, (top + H) / 2, Math.PI / 2);
    aisles.push({ ...first, fromA: first.a, fromB: first.b, phase: 'form', phaseAt: ctx.scene.time.now, delay: 0, fired: false });
  }

  const inAisle = (al: Aisle, f: Fighter, pad = 0) => {
    const si = segInfo(f.x, f.y, al.a.x, al.a.y, al.b.x, al.b.y);
    return si.d < AW + pad && si.t > 0.01 && si.t < 0.99;
  };
  const honoured = (f: Fighter) => alive(f) && aisles.some((al) => al.phase === 'arch' && inAisle(al, f));
  const ranks = (al: Aisle, k: number) => {
    const a = { x: al.fromA.x + (al.a.x - al.fromA.x) * k, y: al.fromA.y + (al.a.y - al.fromA.y) * k };
    const b = { x: al.fromB.x + (al.b.x - al.fromB.x) * k, y: al.fromB.y + (al.b.y - al.fromB.y) * k };
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const men: { x: number; y: number; side: number }[] = [];
    for (let i = 0; i < MEN; i++) {
      const u = (i + 0.5) / MEN;
      for (const side of [-1, 1]) men.push({ x: a.x + (b.x - a.x) * u + nx * side * (AW + 24), y: a.y + (b.y - a.y) * u + ny * side * (AW + 24), side });
    }
    return { men, ang, nx, ny };
  };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!crossed && alive(npc) && npc.hp / npc.maxHp < 0.5) {
        crossed = true; archMs = HALF_ARCH_MS;
        const al: Aisle = { ...aisles[0], delay: 450, fired: false };
        aisles.push(al);
        start(al, time, newLine(true));
        ctx.banner('A second guard of honour falls in across the first — its slides fire a beat after.', '#ffd27a');
        ctx.sfx('wings');
      }
      for (const al of aisles) {
        const el = time - al.phaseAt;
        if (al.phase === 'form' && el >= FORM_MS) { al.phase = 'arch'; al.phaseAt = time; ctx.sfx('holy-chord'); }
        else if (al.phase === 'arch' && el >= archMs) { al.phase = 'ready'; al.phaseAt = time; ctx.sfx('trap-set'); }
        else if (al.phase === 'ready' && el >= READY_MS + al.delay) { al.phase = 'slide'; al.phaseAt = time; }
        else if (al.phase === 'slide' && el >= SLIDE_MS) { start(al, time, newLine(al !== aisles[0])); }
        if (al.phase === 'slide' && !al.fired) {
          al.fired = true;
          ctx.sfx('slash');
          for (const f of [player, npc]) {
            if (!alive(f) || !inAisle(al, f, 6)) continue;
            ctx.hit(f, CLOUT_DMG, f.x, f.y);
            ctx.silence(f, SILENCE_MS);
            const si = segInfo(f.x, f.y, al.a.x, al.a.y, al.b.x, al.b.y);
            const px = al.a.x + (al.b.x - al.a.x) * si.t, py = al.a.y + (al.b.y - al.a.y) * si.t;
            const dx = f.x - px, dy = f.y - py, m = Math.hypot(dx, dy) || 1;
            ctx.nudge(f, (dx / m) * 90, (dy / m) * 90);
            ctx.float(f.x, f.y - 46, 'CLOUTED!', '#ff9a7a');
          }
        }
        // Under the arch the crossed slides catch shots fired in from outside the aisle.
        if (al.phase === 'arch') {
          const pIn = alive(player) && inAisle(al, player), nIn = alive(npc) && inAisle(al, npc);
          if (pIn === nIn) continue;
          for (let u = 0.1; u < 0.95; u += 0.16) {
            const cx = al.a.x + (al.b.x - al.a.x) * u, cy = al.a.y + (al.b.y - al.a.y) * u;
            for (const sh of ctx.shotsNear(cx, cy, AW + 34)) {
              const shooterIn = sh.owner === 'player' ? pIn : nIn;
              if (shooterIn || segInfo(sh.x, sh.y, al.a.x, al.a.y, al.b.x, al.b.y).d > AW + 10) continue;
              sh.block();
              ctx.flash(sh.x, sh.y, BRASS_SHINE);
            }
          }
        }
      }
    },

    npcTakenMult() { return honoured(player) ? HONOUR_MULT : 1; },
    playerTakenMult() { return honoured(npc) ? HONOUR_MULT : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      for (const al of aisles) {
        const si = segInfo(npc.x, npc.y, al.a.x, al.a.y, al.b.x, al.b.y);
        const px = al.a.x + (al.b.x - al.a.x) * si.t, py = al.a.y + (al.b.y - al.a.y) * si.t;
        const danger = al.phase === 'ready' || al.phase === 'slide' || (al.phase === 'arch' && archMs - (now - al.phaseAt) < 700);
        if (danger && si.d < AW + 30) {
          const dx = npc.x - px, dy = npc.y - py, m = Math.hypot(dx, dy) || 1;
          const ang = Math.atan2(al.b.y - al.a.y, al.b.x - al.a.x);
          const ox = m > 4 ? dx / m : -Math.sin(ang), oy = m > 4 ? dy / m : Math.cos(ang);
          return { x: clamp(px + ox * (AW + 95), 60, W - 60), y: clamp(py + oy * (AW + 95), top + 50, H - 40) };
        }
      }
      // Go and be honoured while there is time.
      for (const al of aisles) {
        if (al.phase !== 'arch' || archMs - (now - al.phaseAt) < 1300) continue;
        const si = segInfo(player.x, player.y, al.a.x, al.a.y, al.b.x, al.b.y);
        const t = clamp(si.t + (ctx.rng() < 0.5 ? 0.25 : -0.25), 0.15, 0.85);
        return { x: al.a.x + (al.b.x - al.a.x) * t, y: al.a.y + (al.b.y - al.a.y) * t };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 260, 60, W - 60), y: clamp(player.y + Math.sin(a) * 260, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const al of aisles) {
        if (al.phase === 'form') {
          // The new line chalked out while the ranks march to it.
          g.lineStyle(2, CREAM, 0.5); g.lineBetween(al.a.x, al.a.y, al.b.x, al.b.y);
          continue;
        }
        const ang = Math.atan2(al.b.y - al.a.y, al.b.x - al.a.x);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const corner = (u: number, side: number, w: number) => ({ x: al.a.x + (al.b.x - al.a.x) * u + nx * side * w, y: al.a.y + (al.b.y - al.a.y) * u + ny * side * w });
        const quad = (w: number) => [corner(0, -1, w), corner(1, -1, w), corner(1, 1, w), corner(0, 1, w)];
        const readyK = al.phase === 'ready' ? clamp((time - al.phaseAt) / (READY_MS + al.delay), 0, 1) : al.phase === 'slide' ? 1 : 0;
        // The red runner with its gold border, reddening hot when the slides level.
        g.fillStyle(SCARLET_DARK, 1); g.fillPoints(quad(AW), true);
        g.fillStyle(readyK > 0 ? SCARLET_LIT : SCARLET, 0.85 + readyK * 0.15); g.fillPoints(quad(AW - 6), true);
        g.lineStyle(2, BRAID, 0.9); g.strokePoints(quad(AW - 10), true);
        // Gold lyres woven into the runner.
        for (let u = 0.12; u < 0.95; u += 0.19) {
          const p = corner(u, 0, 0);
          g.lineStyle(1.6, BRASS_LIT, 0.7);
          g.beginPath(); g.arc(p.x - 5, p.y, 6, -Math.PI * 0.9, Math.PI * 0.2, false); g.strokePath();
          g.beginPath(); g.arc(p.x + 5, p.y, 6, Math.PI * 0.8, Math.PI * 1.9, false); g.strokePath();
          g.lineBetween(p.x - 3, p.y + 5, p.x + 3, p.y + 5);
        }
        if (readyK > 0) { g.lineStyle(3, SCARLET_LIT, 0.4 + readyK * 0.5); g.strokePoints(quad(AW + 4), true); }
        if (al.phase === 'arch') { g.lineStyle(2, BRASS_SHINE, 0.2 + Math.sin(time / 220) * 0.12); g.strokePoints(quad(AW + 2), true); }
      }
      // The guards themselves, standing (or marching) on either side.
      for (const al of aisles) {
        const k = al.phase === 'form' ? clamp((time - al.phaseAt) / FORM_MS, 0, 1) : 1;
        const { men, nx } = ranks(al, k);
        const tunic = al.phase === 'ready' || al.phase === 'slide' ? SCARLET_DARK : SCARLET;
        for (const m of men) bandsman(g, m.x, m.y + 20, 0.9, 'none', al.phase === 'form' ? time / 180 : 0, -nx * m.side >= 0 ? 1 : -1, tunic, time);
      }
    },

    drawAir(g, time) {
      for (const al of aisles) {
        const k = al.phase === 'form' ? clamp((time - al.phaseAt) / FORM_MS, 0, 1) : 1;
        const { men, nx, ny } = ranks(al, k);
        for (const m of men) {
          const sx = m.x, sy = m.y - 14;
          const ix = -nx * m.side, iy = -ny * m.side;
          const inward = Math.atan2(iy, ix);
          if (al.phase === 'arch' || al.phase === 'form') {
            // Raised: the horn tilted up across the aisle, its crook meeting its partner's overhead.
            trombone(g, sx, sy - 10, Math.atan2(iy * 0.8 - 0.7, ix * 0.8), 62, 6 + Math.sin(time / 300 + m.x) * 2, 0);
          } else {
            // Levelled, then the slide shot out across the runner.
            const ext = al.phase === 'slide' ? clamp((time - al.phaseAt) / 90, 0, 1) * (AW - 4) : clamp((time - al.phaseAt) / (READY_MS + al.delay), 0, 1) * -10;
            trombone(g, sx, sy, inward, 26, Math.max(0, ext), al.phase === 'slide' ? 1 : 0.5);
          }
        }
        if (al.phase === 'arch') {
          // The crossing glints along the arch's crown.
          for (let u = 0.06; u < 1; u += 1 / MEN) {
            const p = { x: al.a.x + (al.b.x - al.a.x) * u, y: al.a.y + (al.b.y - al.a.y) * u - 44 };
            g.fillStyle(BRASS_SHINE, 0.5 + Math.sin(time / 160 + u * 9) * 0.3); g.fillCircle(p.x, p.y, 2.5);
          }
        }
      }
    },

    drawHud(g, time) {
      // The equerry's order-of-ceremony card: ARCH (gold), READY (scarlet), and a fuse of time.
      const x = W / 2, y = top + 18;
      g.fillStyle(NAVY_DARK, 0.75); g.fillRoundedRect(x - 80, y - 13, 160, 26, 8);
      g.lineStyle(1.5, BRASS, 0.9); g.strokeRoundedRect(x - 80, y - 13, 160, 26, 8);
      const al = aisles[0];
      const span = al.phase === 'form' ? FORM_MS : al.phase === 'arch' ? archMs : al.phase === 'ready' ? READY_MS + al.delay : SLIDE_MS;
      const k = clamp((time - al.phaseAt) / span, 0, 1);
      const col = al.phase === 'arch' ? BRASS_LIT : al.phase === 'form' ? CREAM : SCARLET_LIT;
      g.fillStyle(NAVY, 1); g.fillRoundedRect(x - 70, y - 4, 140, 8, 4);
      g.fillStyle(col, 1); g.fillRoundedRect(x - 70, y - 4, Math.max(4, 140 * (1 - k)), 8, 4);
      if (honoured(player)) { g.fillStyle(lit(BRASS, 0.4), 1); g.fillTriangle(x - 90, y, x - 84, y - 6, x - 84, y + 6); }
    },
  };
}

export const FALLEN_ARCH_OF_SLIDES: GimmickDef = {
  id: fallenId('brass', 'arch-of-slides'),
  rules: 'Under the arch of slides you are honoured: shots from outside are caught and you hit harder. Then the slides shoot across it. Leave him there.',
  make,
};
