import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { reliquary } from '../art';
import { CASSOCK, GILT, GILT_LIT, SMOKE, SURPLICE, WAX } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Procession — Pilgrim Penitent.
 *
 * A procession goes round the nave at a slow walk, as it does every hour on the summit: a
 * thurifer swinging his censer in front, pilgrims with candles, the gilt reliquary on its poles
 * between two bearers, more pilgrims behind. Walk *beside* the reliquary and you are blessed —
 * you take much less while you keep pace with it. Walk *into* the procession and the pilgrims
 * shove you out of their way, elbows and candles, without breaking step.
 *
 * At each corner the procession halts for a Kyrie, and the reliquary's blessing swells: whoever
 * is blessed then is healed. Penitent walks beside the relic every step he can; a player who
 * takes his place — or steers him into the pilgrims' path — takes the blessing for themselves.
 */

const SPACING = 36;
const BODY_R = 15;
const BLESS_R = 104;
const RELIC_IDX = 4;
const ROLES = ['thurifer', 'pilgrim', 'pilgrim', 'bearer', 'relic', 'bearer', 'pilgrim', 'pilgrim'] as const;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 6;
  const hw = 320, hh = 160, cr = 70;
  /** The nave route: a rounded rectangle, sampled into a polyline once. */
  const route: Pt[] = [];
  const corner = (x: number, y: number, a0: number) => {
    for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); route.push({ x: x + Math.cos(a) * cr, y: y + Math.sin(a) * cr }); }
  };
  corner(cx + hw - cr, cy - hh + cr, -Math.PI / 2);
  corner(cx + hw - cr, cy + hh - cr, 0);
  corner(cx - hw + cr, cy + hh - cr, Math.PI / 2);
  corner(cx - hw + cr, cy - hh + cr, Math.PI);
  route.push({ ...route[0] });
  const segLen: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) { const l = dist(route[i].x, route[i].y, route[i + 1].x, route[i + 1].y); segLen.push(l); total += l; }
  /** Distances along the route at which each corner's middle lies — the Kyrie halts. */
  const halts: number[] = [];
  { let acc = 0; for (let i = 0; i < route.length - 1; i++) { if (i % 9 === 4) halts.push(acc); acc += segLen[i]; } }

  const at = (s: number): { p: Pt; dir: number } => {
    let d = ((s % total) + total) % total;
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i]) {
        const k = segLen[i] ? d / segLen[i] : 0;
        const a = route[i], b = route[i + 1];
        return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: Math.atan2(b.y - a.y, b.x - a.x) };
      }
      d -= segLen[i];
    }
    return { p: route[0], dir: 0 };
  };

  const haltAbs = (i: number) => halts[i % halts.length] + Math.floor(i / halts.length) * total;

  const SPEED = ctx.hard ? 62 : 52;
  const KYRIE_MS = 2600;
  let s = 0;
  let haltUntil = 0;
  let haltIdx = 1;
  let started = false;
  const shoveAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const hurtAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const blessed = new Map<Fighter, boolean>([[player, false], [npc, false]]);

  const bodies = (): { p: Pt; dir: number; role: typeof ROLES[number] }[] =>
    ROLES.map((role, i) => ({ ...at(s - i * SPACING), role }));
  const relic = () => at(s - RELIC_IDX * SPACING);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        s = total * 0.1;
        haltIdx = 0;
        while (haltAbs(haltIdx) < s - RELIC_IDX * SPACING) haltIdx++;
      }
      // Walk on, unless halted for a Kyrie at a corner (the reliquary stops at each corner's middle).
      if (time >= haltUntil) {
        const before = s;
        s += SPEED * dt;
        const h = haltAbs(haltIdx);
        if (before - RELIC_IDX * SPACING < h && s - RELIC_IDX * SPACING >= h) {
          haltIdx++;
          haltUntil = time + KYRIE_MS;
          ctx.banner('KYRIE — THE PROCESSION KNEELS', '#ffe8b0');
          ctx.sfx('holy-chord');
          const r = relic().p;
          for (const f of [player, npc]) {
            if (alive(f) && dist(f.x, f.y, r.x, r.y) < BLESS_R) { ctx.heal(f, ctx.hard && f === player ? 8 : 11); ctx.float(f.x, f.y - 50, 'BLESSED', '#fff0c0'); }
          }
        }
      }
      const bs = bodies();
      const r = relic().p;
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        let shoved = false;
        for (const b of bs) {
          const d = dist(f.x, f.y, b.p.x, b.p.y);
          if (d > BODY_R + 22) continue;
          shoved = true;
          if (time < (shoveAt.get(f) ?? 0)) continue;
          shoveAt.set(f, time + 220);
          // Out of the way: sideways off the line, and a little along it.
          const nx = (f.x - b.p.x) / (d || 1), ny = (f.y - b.p.y) / (d || 1);
          ctx.nudge(f, nx * 30 + Math.cos(b.dir) * 14, ny * 30 + Math.sin(b.dir) * 14);
          if (time >= (hurtAt.get(f) ?? 0)) {
            hurtAt.set(f, time + 800);
            ctx.hit(f, b.role === 'thurifer' ? 5 : 3, f.x, f.y);
            ctx.float(f.x, f.y - 46, b.role === 'thurifer' ? 'CENSED' : 'SHOVED', '#e8d8c0');
            ctx.sfx('hit-light');
          }
        }
        blessed.set(f, !shoved && dist(f.x, f.y, r.x, r.y) < BLESS_R);
      }
    },

    playerTakenMult() { return blessed.get(player) ? 0.55 : 1; },
    npcTakenMult() { return blessed.get(npc) ? 0.55 : 1; },

    npcSeek() {
      // Beside the relic, on the inside of the loop (away from the pilgrims' elbows), a pace ahead.
      const { p, dir } = at(s - RELIC_IDX * SPACING + 20);
      const ix = Math.cos(dir + Math.PI / 2), iy = Math.sin(dir + Math.PI / 2);
      const inside = (cx - p.x) * ix + (cy - p.y) * iy > 0 ? 1 : -1;
      return { x: clamp(p.x + ix * inside * 62, 50, W - 50), y: clamp(p.y + iy * inside * 62, top + 40, H - 40) };
    },

    drawGround(g, time) {
      // The processional way: a long red runner round the nave, its fringe and a gilt edge.
      for (let i = 0; i < route.length - 1; i++) {
        const a = route[i], b = route[i + 1];
        g.lineStyle(58, 0x5a1420, 0.55); g.lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(50, 0x8a1830, 0.55); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      for (let i = 0; i < route.length - 1; i += 2) { g.fillStyle(GILT, 0.3); g.fillCircle(route[i].x, route[i].y, 3); }
      // The blessing round the relic.
      const r = relic().p;
      const kneel = time < haltUntil;
      glow(g, r.x, r.y, BLESS_R, GILT_LIT, kneel ? 0.06 : 0.03, 3);
      g.lineStyle(2, GILT_LIT, 0.35 + Math.sin(time / 200) * 0.15); g.strokeCircle(r.x, r.y, BLESS_R);
      // Censer smoke trailing from the thurifer.
      for (let i = 0; i < 8; i++) {
        const b = at(s - i * 16);
        const ph = ((time / 1200) + i / 8) % 1;
        g.fillStyle(SMOKE, 0.12 * (1 - i / 8)); g.fillCircle(b.p.x + Math.sin(ph * 6) * 6, b.p.y - ph * 8, 10 + i * 2);
      }
    },

    drawAir(g, time) {
      const kneel = time < haltUntil;
      const step = Math.sin(time / 180);
      for (const b of bodies()) {
        const { p, dir, role } = b;
        const bob = kneel ? 4 : Math.abs(step) * 2;
        if (role === 'relic') {
          reliquary(g, p.x, p.y + 6 - bob, 0.9, kneel ? 1 : 0.5, true);
          continue;
        }
        // A robed figure: hooded pilgrim in grey, bearers in white, the thurifer in black.
        const robe = role === 'bearer' ? SURPLICE : role === 'thurifer' ? CASSOCK : 0x6a645c;
        g.fillStyle(0x000000, 0.25); g.fillEllipse(p.x, p.y + 12, 26, 8);
        g.fillStyle(dim(robe, 0.25), 1); g.fillTriangle(p.x - 13, p.y + 12, p.x + 13, p.y + 12, p.x, p.y - 22 + bob);
        g.fillStyle(robe, 1); g.fillTriangle(p.x - 10, p.y + 11, p.x + 6, p.y + 11, p.x - 1, p.y - 20 + bob);
        g.fillStyle(role === 'thurifer' ? 0xe0c8a8 : dim(robe, 0.1), 1); g.fillCircle(p.x, p.y - 24 + bob, 7);
        if (role !== 'thurifer') { g.fillStyle(dim(robe, 0.4), 1); g.fillEllipse(p.x, p.y - 22 + bob, 9, 6); }
        if (role === 'pilgrim') {
          // A candle held out in front.
          const hx = p.x + Math.cos(dir) * 10, hy = p.y - 8 + Math.sin(dir) * 4;
          g.fillStyle(WAX, 1); g.fillRect(hx - 1.5, hy - 10, 3, 10);
          g.fillStyle(0xffc44a, 0.9); g.fillEllipse(hx, hy - 13, 3, 6);
          glow(g, hx, hy - 13, 12, 0xffd890, 0.06, 2);
        } else if (role === 'thurifer') {
          // The censer on its chain, swinging out ahead.
          const sw = Math.sin(time / 260) * 0.9;
          const ex = p.x + Math.cos(dir + sw) * 30, ey = p.y - 6 + Math.sin(dir + sw) * 30;
          g.lineStyle(1.2, GILT, 1); g.lineBetween(p.x + 4, p.y - 14, ex, ey);
          g.fillStyle(GILT, 1); g.fillCircle(ex, ey, 5);
          g.fillStyle(lit(GILT, 0.3), 1); g.fillCircle(ex - 1.5, ey - 1.5, 2);
          g.fillStyle(SMOKE, 0.4); g.fillCircle(ex, ey - 8, 5);
        }
      }
      // A halo of gilt light over whoever is blessed.
      for (const f of [player, npc]) {
        if (!alive(f) || !blessed.get(f)) continue;
        g.lineStyle(2, GILT_LIT, 0.7); g.strokeEllipse(f.x, f.y - 46, 22, 7);
      }
    },
  };
}

export const PROCESSION: GimmickDef = {
  id: 'cathedral-procession',
  rules: 'A procession circles the nave. Walk beside the reliquary to be blessed (take far less); walk into it and the pilgrims shove you aside.',
  make,
};
