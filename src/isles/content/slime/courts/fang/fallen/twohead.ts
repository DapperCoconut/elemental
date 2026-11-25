import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRUISE, BRUISE_LIT, FANG_LIT, MUD_DARK, VENIN, VENIN_EYE, VENIN_LIT, VENOM, VENOM_DARK, VENOM_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Two-Headed Turn — Curator Clothilde Ketch, in the King's telling keeper of the Prince's
 * cabinet of wonders and of its finest piece: Both, the serpent with a head at either end.
 *
 * Both has one head on each of you. Each head bites the floor at its fighter's feet (a ring, a
 * beat to step out), and every bite leaves two fang-holes that well up with venom and spurt a
 * column a little later. Every few seconds Both *turns its venom over*: its body pulls taut
 * between the heads, and each head drinks up every unspurted hole it bit — the venom runs the
 * length of the body and the *other* head spits it, one glob per hole, at its own fighter's
 * feet, harder the fuller the hole was. The holes bitten at your feet are his medicine.
 *
 * So the holes round you are ammunition against him, and his against you: let yours ripen, and
 * strike his to spurt them early (empty, they carry nothing across). Halfway down Both turns
 * sooner and its heads bite twice as often.
 */

const ID = fallenId('fang', 'twohead');
const BITE_R = 38;
const BITE_WARN = 850;
const BITE = 7;
const WELL_MS = 2600;
const SPURT_MS = 450;
const SPURT_R = 46;
const SPURT = 15;
const TURN_WARN = 1500;
const RUN_MS = 600;
const SPIT_WARN = 760;
const SPIT_R = 44;
const SPIT_GAP = 230;

/** A bite coming down at a fighter's feet. */
interface Bite { x: number; y: number; at: number; head: number }
/** Two fang-holes welling with venom. */
interface Well { x: number; y: number; at: number; spurtAt: number; hit: Set<Fighter>; target: StrikeTarget | null; a: number; head: number }
/** Drunk venom crossing the body, spat by the other head at its fighter's feet. */
interface Spit { head: number; fill: number; spawnAt: number; x: number; y: number; landAt: number; placed: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const heads: Pt[] = [{ x: player.x, y: player.y - 60 }, { x: npc.x, y: npc.y - 60 }];
  const bites: Bite[] = [];
  const wells: Well[] = [];
  let nextBite = [0, 0];
  let turnAt = 0;
  let drinkAt = -1e9;
  const spits: Spit[] = [];
  let quick = false;
  const owner = (i: number): Fighter => (i === 0 ? player : npc);
  const now = (): number => ctx.scene.time.now;
  const biteGap = (): number => (quick ? 1500 : 2600);
  const turnGap = (): number => (quick ? 5600 : 7000);

  function spurtNow(w: Well): void {
    const t = now();
    if (t >= w.spurtAt || t - w.at < 300) return;
    w.spurtAt = t;
    ctx.float(w.x, w.y - 30, 'BURST', '#d8f088');
  }

  function bite(b: Bite, time: number): void {
    const f = owner(b.head);
    if (alive(f) && !ctx.isAirborne(f) && dist(f.x, f.y, b.x, b.y) < BITE_R) { ctx.hit(f, BITE, f.x, f.y); ctx.sfx('stab'); }
    const w: Well = { x: b.x, y: b.y, at: time, spurtAt: time + WELL_MS, hit: new Set(), target: null, a: rng() * Math.PI, head: b.head };
    w.target = ctx.target({ x: b.x, y: b.y - 6, r: 22, passThrough: true, onStruck: () => spurtNow(w) });
    wells.push(w);
    ctx.sfx('snap');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (turnAt === 0) { turnAt = time + 5200; nextBite = [time + 1400, time + 2700]; }
      if (!quick && npc.hp / npc.maxHp < 0.5) { quick = true; ctx.banner('Both turns sooner — and bites twice as often', '#d8c0f0'); ctx.sfx('boss-phase'); }

      // Heads hover over their fighters, leaning toward each other.
      for (let i = 0; i < 2; i++) {
        const f = owner(i), o = owner(1 - i);
        const a = Math.atan2(o.y - f.y, o.x - f.x);
        const tx = f.x + Math.cos(a) * 54, ty = f.y - 46 + Math.sin(a) * 24;
        const k = Math.min(1, dt * 6);
        heads[i].x += (tx - heads[i].x) * k; heads[i].y += (ty - heads[i].y) * k;
        if (time >= nextBite[i] && alive(f)) {
          bites.push({ x: f.x, y: f.y, at: time, head: i });
          nextBite[i] = time + biteGap();
          ctx.sfx('screech');
        }
      }
      for (const b of [...bites]) if (time - b.at >= BITE_WARN) { bites.splice(bites.indexOf(b), 1); bite(b, time); }

      // Wells spurt for a moment, hitting anyone on them who is not in the air.
      for (const w of [...wells]) {
        if (time >= w.spurtAt && time < w.spurtAt + SPURT_MS) {
          if (w.hit.size === 0 && time - w.spurtAt < 40) ctx.sfx('geyser');
          for (const f of [player, npc]) {
            if (!alive(f) || w.hit.has(f) || ctx.isAirborne(f) || dist(f.x, f.y, w.x, w.y) > SPURT_R) continue;
            w.hit.add(f);
            ctx.hit(f, SPURT, f.x, f.y);
            ctx.root(f, 500);
            ctx.float(f.x, f.y - 46, 'SPURTED', '#c8f060');
          }
        } else if (time >= w.spurtAt + SPURT_MS) { w.target?.remove(); wells.splice(wells.indexOf(w), 1); }
      }

      // The turn: each head drinks the unspurted holes it bit; the other head spits them back.
      if (time >= turnAt) {
        drinkAt = time;
        turnAt = time + turnGap();
        const n = [0, 0];
        for (const w of [...wells]) {
          if (time >= w.spurtAt) continue;
          const fill = clamp((time - w.at) / WELL_MS, 0, 1);
          const head = 1 - w.head;
          if (n[head] < 4) spits.push({ head, fill, spawnAt: time + RUN_MS + n[head] * SPIT_GAP, x: 0, y: 0, landAt: 0, placed: false });
          n[head]++;
          w.target?.remove(); wells.splice(wells.indexOf(w), 1);
        }
        ctx.sfx('magnet-pull');
      }
      for (const sp of [...spits]) {
        const f = owner(sp.head);
        if (!sp.placed && time >= sp.spawnAt) {
          sp.placed = true; sp.x = f.x; sp.y = f.y; sp.landAt = time + SPIT_WARN;
          ctx.sfx('slime-splat');
        }
        if (sp.placed && time >= sp.landAt) {
          spits.splice(spits.indexOf(sp), 1);
          ctx.sfx('splash');
          for (const g of [player, npc]) {
            if (!alive(g) || ctx.isAirborne(g) || dist(g.x, g.y, sp.x, sp.y) > SPIT_R) continue;
            ctx.hit(g, 8 + Math.round(sp.fill * 12), g.x, g.y);
            ctx.float(g.x, g.y - 46, 'SPAT BACK', '#d8c0f0');
          }
        }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      const t = now();
      const toTurn = turnAt - t;
      // A glob coming down at his feet: step out of it.
      for (const sp of spits) {
        if (sp.placed && sp.head === 1 && dist(npc.x, npc.y, sp.x, sp.y) < SPIT_R + 24) {
          const c = Math.atan2(npc.y - sp.y, npc.x - sp.x);
          return { x: clamp(sp.x + Math.cos(c) * (SPIT_R + 60), 60, W - 60), y: clamp(sp.y + Math.sin(c) * (SPIT_R + 60), top + 40, H - 40) };
        }
      }
      // Before the turn: burst the ripest hole bitten at the player's feet, so it carries nothing back.
      if (toTurn < 2200) {
        let best: Well | null = null, bf = 0.35;
        for (const w of wells) { const f = (t - w.at) / WELL_MS; if (w.head === 0 && f > bf && w.spurtAt - t > 500 && dist(w.x, w.y, player.x, player.y) > 70) { bf = f; best = w; } }
        if (best) return { x: best.x + 30, y: best.y };
      }
      // Otherwise keep off wells about to go and out of bite rings.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 220, y = player.y + Math.sin(a) * 220;
      for (const w of wells) {
        if (w.spurtAt - t > 1400) continue;
        if (dist(w.x, w.y, x, y) < SPURT_R + 30) { const b = Math.atan2(y - w.y, x - w.x); x = w.x + Math.cos(b) * (SPURT_R + 40); y = w.y + Math.sin(b) * (SPURT_R + 40); }
      }
      for (const b of bites) {
        if (b.head === 1 && dist(npc.x, npc.y, b.x, b.y) < BITE_R + 20) { const c = Math.atan2(npc.y - b.y, npc.x - b.x); x = b.x + Math.cos(c) * (BITE_R + 50); y = b.y + Math.sin(c) * (BITE_R + 50); }
      }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 40, H - 40) };
    },

    drawGround(g, time) {
      for (const w of wells) drawWell(g, w, time);
      for (const b of bites) {
        const k = clamp((time - b.at) / BITE_WARN, 0, 1);
        g.fillStyle(MUD_DARK, 0.25); g.fillCircle(b.x, b.y, BITE_R);
        g.fillStyle(VENOM, 0.12); g.slice(b.x, b.y, BITE_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        g.lineStyle(2, b.head === 0 ? VENIN_LIT : BRUISE_LIT, 0.5 + k * 0.4); g.strokeCircle(b.x, b.y, BITE_R);
        for (const s of [-1, 1]) { g.fillStyle(FANG_LIT, 0.3 + k * 0.6); g.fillCircle(b.x + s * 8, b.y, 3); }
      }
      // As the turn comes, every hole that will be drunk is ringed in the colour of the head that will spit it.
      const toTurn = turnAt - time;
      if (toTurn < TURN_WARN) {
        const k = 1 - clamp(toTurn / TURN_WARN, 0, 1);
        for (const w of wells) {
          if (time >= w.spurtAt) continue;
          g.lineStyle(2, w.head === 0 ? 0xff9a70 : 0x9ad0ff, 0.3 + k * 0.6);
          g.strokeCircle(w.x, w.y, 20 + Math.sin(time / 80) * 2);
        }
      }
      // Globs coming down: a clock ring at the feet they were spat at.
      for (const sp of spits) {
        if (!sp.placed) continue;
        const k = clamp(1 - (sp.landAt - time) / SPIT_WARN, 0, 1);
        g.fillStyle(BRUISE, 0.12 + k * 0.12); g.fillCircle(sp.x, sp.y, SPIT_R);
        g.fillStyle(VENOM, 0.16); g.slice(sp.x, sp.y, SPIT_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        g.lineStyle(2, BRUISE_LIT, 0.4 + k * 0.5); g.strokeCircle(sp.x, sp.y, SPIT_R * (0.6 + sp.fill * 0.4));
        g.lineStyle(1.5, VENOM_LIT, 0.4 + k * 0.5); g.strokeCircle(sp.x, sp.y, SPIT_R);
      }
    },

    drawAir(g, time) {
      const toTurn = turnAt - time;
      const run = clamp((time - drinkAt) / RUN_MS, 0, 1);
      const drinking = time - drinkAt < RUN_MS + 200;
      const taut = drinking ? 1 : clamp(1 - toTurn / TURN_WARN, 0, 1);
      const a = heads[0], b = heads[1];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const len = Math.max(1, dist(a.x, a.y, b.x, b.y));
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const sag = (1 - taut) * (60 + Math.sin(time / 700) * 20);
      const cx = mx + nx * sag, cy = my + ny * sag + (1 - taut) * 30;
      const pts: Pt[] = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28, u = 1 - t;
        const wig = Math.sin(t * Math.PI * 4 + time / 180) * 5 * (1 - taut);
        pts.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x + nx * wig, y: u * u * a.y + 2 * u * t * cy + t * t * b.y + ny * wig });
      }
      for (const [i, p] of pts.entries()) {
        const w = 8 + Math.sin((i / 28) * Math.PI) * 4;
        g.fillStyle(dim(VENIN, 0.4), 1); g.fillCircle(p.x, p.y + 2, w + 1);
        g.fillStyle(i % 4 < 2 ? VENIN : mixBand(i), 1); g.fillCircle(p.x, p.y, w);
        if (i % 4 === 0) { g.fillStyle(VENIN_LIT, 0.8); g.fillCircle(p.x, p.y - w * 0.3, w * 0.35); }
      }
      if (taut > 0) {
        // The poles lighting along the body as it pulls taut: violet at one end, green at the other.
        for (let i = 2; i < 27; i += 3) {
          const p = pts[i], t = i / 28;
          g.fillStyle(t < 0.5 ? VENIN_LIT : BRUISE_LIT, taut * (0.4 + 0.5 * Math.sin(time / 60 + i)));
          g.fillCircle(p.x, p.y, 3);
        }
        glow(g, mx, my, 40 + taut * 30, BRUISE_LIT, 0.03 * taut, 3);
      }
      if (drinking && run < 1) {
        // The drunk venom running the length of the body both ways, a swallowed bead in each direction.
        for (let j = 0; j < 4; j++) {
          const t = clamp(run - j * 0.08, 0, 1);
          const i0 = Math.round(t * 28), i1 = 28 - i0;
          const p0 = pts[i0], p1 = pts[i1];
          g.fillStyle(VENOM, 0.9 - j * 0.2); g.fillCircle(p0.x, p0.y, 9 - j * 1.5); g.fillCircle(p1.x, p1.y, 9 - j * 1.5);
          g.fillStyle(VENOM_LIT, 0.8 - j * 0.2); g.fillCircle(p0.x - 2, p0.y - 3, 3); g.fillCircle(p1.x - 2, p1.y - 3, 3);
        }
      }
      const spitting = (h: number): boolean => spits.some((q) => q.head === h && q.placed && q.landAt - time > SPIT_WARN - 250);
      drawHead(g, a, Math.atan2(a.y - pts[2].y, a.x - pts[2].x), VENIN_LIT, bites.some((q) => q.head === 0) || spitting(0), time);
      drawHead(g, b, Math.atan2(b.y - pts[26].y, b.x - pts[26].x), BRUISE_LIT, bites.some((q) => q.head === 1) || spitting(1), time);
      // Globs in flight from a head down to the ring at its fighter's feet.
      for (const sp of spits) {
        if (!sp.placed) continue;
        const k = clamp(1 - (sp.landAt - time) / SPIT_WARN, 0, 1);
        const h = heads[sp.head];
        const x = h.x + (sp.x - h.x) * k, y = h.y + (sp.y - h.y) * k - Math.sin(k * Math.PI) * 70;
        g.fillStyle(dim(VENOM, 0.3), 1); g.fillCircle(x, y + 1, 5 + sp.fill * 3);
        g.fillStyle(VENOM, 1); g.fillCircle(x, y, 4 + sp.fill * 3);
        g.fillStyle(VENOM_LIT, 0.9); g.fillCircle(x - 1.5, y - 1.5, 1.6);
      }
      for (const w of wells) if (time >= w.spurtAt && time < w.spurtAt + SPURT_MS) drawSpurt(g, w, time);
    },

    drawHud(g, time) {
      // Bottom centre: a horseshoe dial counting down to the turn.
      const x = W / 2, y = H - 26;
      const k = clamp(1 - (turnAt - time) / turnGap(), 0, 1);
      g.fillStyle(0x0e140e, 0.7); g.fillRoundedRect(x - 60, y - 18, 120, 34, 9);
      g.lineStyle(7, dim(BRUISE, 0.4), 1); g.beginPath(); g.arc(x, y + 2, 12, Math.PI, 0, false); g.strokePath();
      g.lineStyle(7, k > 0.8 ? BRUISE_LIT : BRUISE, 1); g.beginPath(); g.arc(x, y + 2, 12, Math.PI, Math.PI + k * Math.PI, false); g.strokePath();
      g.fillStyle(VENIN_LIT, 1); g.fillRect(x - 15.5, y + 2, 7, 6);
      g.fillStyle(BRUISE_LIT, 1); g.fillRect(x + 8.5, y + 2, 7, 6);
      for (let i = 0; i < 2; i++) {
        const sx = x + (i ? 38 : -38);
        g.fillStyle(i ? 0xff9a70 : 0x9ad0ff, 1); g.fillCircle(sx, y, 5);
        g.lineStyle(1.5, FANG_LIT, 0.8);
        g.beginPath(); g.arc(sx + (i ? -10 : 10), y, 7, i ? Math.PI * 0.4 : Math.PI * 1.4, i ? Math.PI * 1.6 : Math.PI * 0.6, false); g.strokePath();
      }
    },
  };

  function mixBand(i: number): number { return i % 8 < 4 ? dim(VENIN_LIT, 0.35) : dim(BRUISE, 0.2); }

  /** A head of Both: a blunt wedge, one ringed in green, the other in violet; open while it bites. */
  function drawHead(g: G, p: Pt, a: number, ring: number, biting: boolean, time: number): void {
    const c = Math.cos(a), s = Math.sin(a), px = -s, py = c;
    const L = 20, Wd = 10;
    const at = (f: number, side: number): Pt => ({ x: p.x + c * f + px * side, y: p.y + s * f + py * side });
    g.fillStyle(dim(VENIN, 0.4), 1); g.fillPoints([at(-6, Wd + 1), at(L * 0.7, Wd * 0.8), at(L + 2, 0), at(L * 0.7, -Wd * 0.8), at(-6, -Wd - 1)], true);
    g.fillStyle(VENIN, 1); g.fillPoints([at(-4, Wd), at(L * 0.7, Wd * 0.7), at(L, 0), at(L * 0.7, -Wd * 0.7), at(-4, -Wd)], true);
    g.lineStyle(2, ring, 0.9); g.strokeCircle(p.x - c * 4, p.y - s * 4, Wd + 1);
    for (const side of [-1, 1]) { const e = at(L * 0.4, side * Wd * 0.55); g.fillStyle(VENIN_EYE, 1); g.fillCircle(e.x, e.y, 2.2); g.fillStyle(0x101010, 1); g.fillRect(e.x - 0.4, e.y - 1.8, 0.8, 3.6); }
    if (biting) {
      const m = at(L, 0);
      g.fillStyle(0x6a2028, 1); g.fillCircle(m.x, m.y + 3, 4);
      for (const side of [-1, 1]) { const f = at(L - 2, side * 3); g.fillStyle(FANG_LIT, 1); g.fillTriangle(f.x - 1, f.y, f.x + 1, f.y, f.x, f.y + 7); }
      g.fillStyle(VENOM, 0.9); g.fillCircle(m.x, m.y + 9 + ((time / 120) % 1) * 6, 1.5);
    } else if ((time / 450) % 1 < 0.18) {
      const m = at(L, 0); g.lineStyle(1.2, 0xd83048, 1); g.lineBetween(m.x, m.y, m.x + c * 8, m.y + s * 8);
    }
  }

  /** Two fang-holes in the mud, venom welling up in them toward the spurt. */
  function drawWell(g: G, w: Well, time: number): void {
    const k = clamp((time - w.at) / Math.max(1, w.spurtAt - w.at), 0, 1);
    g.fillStyle(MUD_DARK, 0.55); g.fillEllipse(w.x, w.y, 56, 22);
    g.fillStyle(VENOM_DARK, 0.15 + k * 0.25); g.fillCircle(w.x, w.y, SPURT_R * (0.4 + k * 0.6));
    g.lineStyle(1.5, VENOM_LIT, 0.2 + k * 0.6); g.strokeCircle(w.x, w.y, SPURT_R);
    for (const s of [-1, 1]) {
      const hx = w.x + Math.cos(w.a) * 9 * s, hy = w.y + Math.sin(w.a) * 4 * s;
      g.fillStyle(0x0a0d08, 1); g.fillEllipse(hx, hy, 9, 6);
      g.fillStyle(VENOM, 0.5 + k * 0.5); g.fillEllipse(hx, hy + 1 - k * 1.5, 7 * k + 1, 4 * k + 1);
      if (k > 0.75) { g.fillStyle(VENOM_LIT, (k - 0.75) * 4); g.fillCircle(hx, hy - 2 - Math.sin(time / 70 + s) * 2, 1.6); }
    }
  }

  /** A spurting column of venom over a well: a jet, a crown of droplets, a splash ring. */
  function drawSpurt(g: G, w: Well, time: number): void {
    const k = clamp((time - w.spurtAt) / SPURT_MS, 0, 1);
    const h = Math.sin(k * Math.PI) * 90;
    g.fillStyle(VENOM_DARK, 0.7); g.fillRect(w.x - 11, w.y - h, 22, h);
    g.fillStyle(VENOM, 0.85); g.fillRect(w.x - 8, w.y - h, 16, h);
    g.fillStyle(VENOM_LIT, 0.8); g.fillRect(w.x - 3, w.y - h, 4, h);
    for (let i = 0; i < 9; i++) {
      const b = (i / 9) * Math.PI * 2 + time / 200;
      g.fillStyle(i % 2 ? VENOM_LIT : VENOM, 0.9); g.fillCircle(w.x + Math.cos(b) * 16 * (0.5 + k), w.y - h + Math.sin(b) * 6 - k * 10, 3);
    }
    g.lineStyle(2, lit(VENOM, 0.3), 1 - k); g.strokeEllipse(w.x, w.y, SPURT_R * 2 * (0.6 + k * 0.4), SPURT_R * 0.8);
  }
}

export const FALLEN_TWOHEAD: GimmickDef = {
  id: ID,
  rules: 'Both bites at your feet; each bite wells and spurts. At the turn it drinks the holes and spits them at the other side. Strike one to spurt it.',
  make,
};
