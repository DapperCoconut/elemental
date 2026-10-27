import type { AreaDef, Solid } from '../../../../IslesTypes';
import { ORBIT_ACCENT, SKY } from './palette';
import {
  ANCHORS, ARCHIVE, AREA_H, AREA_W, CRADLE_R, E_BRIDGES, EDGE_N, EDGE_S, GULF_E, GULF_S, GULF_W, HOOPS, HOUSES, LAMPS,
  MANOR, MOON, NORTH_GAP, ORRERY, PINES, POOL_CRADLE, PRINCE_AT, S_BRIDGES, SHOP, SPAWN, W_BRIDGES, WAYSTONE,
} from './layout';
import { ORBIT_PAINTER } from './painter';
import { ORBIT_CROWD, ORBIT_NPCS } from './npcs';
import { ORBIT_ENCOUNTERS } from './encounters';

/** A run of open sky down (or across) a gulf, broken where its bridges cross. */
function gulfRun(fixed: { a: number; w: number }, from: number, to: number, gaps: { a: number; b: number }[], vertical: boolean): Solid[] {
  const out: Solid[] = [];
  let p = from;
  for (const gp of gaps) {
    if (gp.a > p) out.push(vertical ? { kind: 'rect', x: fixed.a, y: p, w: fixed.w, h: gp.a - p } : { kind: 'rect', x: p, y: fixed.a, w: gp.a - p, h: fixed.w });
    p = gp.b;
  }
  if (to > p) out.push(vertical ? { kind: 'rect', x: fixed.a, y: p, w: fixed.w, h: to - p } : { kind: 'rect', x: p, y: fixed.a, w: to - p, h: fixed.w });
  return out;
}

/**
 * Collision for the Orbit Court: the open sky is solid — the band along the top (bar the north
 * road's bridge), the sky under the south islet, and the three gulfs between the islets except
 * where their chain bridges cross. Buildings block only their front footprint; the moon blocks
 * the iron cradle it hovers over. The west and north exit strips are kept clear.
 */
function orbitSolids(): Solid[] {
  const s: Solid[] = [
    { kind: 'rect', x: 0, y: 0, w: NORTH_GAP.x0, h: EDGE_N },
    { kind: 'rect', x: NORTH_GAP.x1, y: 0, w: AREA_W - NORTH_GAP.x1, h: EDGE_N },
    { kind: 'rect', x: 0, y: EDGE_S, w: AREA_W, h: AREA_H - EDGE_S },
  ];
  s.push(...gulfRun({ a: GULF_W.x, w: GULF_W.w }, EDGE_N, EDGE_S, W_BRIDGES.map((b) => ({ a: b.y0, b: b.y1 })), true));
  s.push(...gulfRun({ a: GULF_E.x, w: GULF_E.w }, EDGE_N, GULF_S.y, E_BRIDGES.map((b) => ({ a: b.y0, b: b.y1 })), true));
  s.push(...gulfRun({ a: GULF_S.y, w: GULF_S.h }, GULF_W.x + GULF_W.w, AREA_W, S_BRIDGES.map((b) => ({ a: b.x0, b: b.x1 })), false));
  // Buildings and fixtures.
  s.push({ kind: 'circle', x: MOON.x, y: MOON.y, r: CRADLE_R - 6 });
  s.push({ kind: 'rect', x: MANOR.x - MANOR.w / 2 + 10, y: MANOR.y - 100, w: MANOR.w - 20, h: 96 });
  s.push({ kind: 'circle', x: ORRERY.x, y: ORRERY.y - 8, r: 34 });
  s.push({ kind: 'rect', x: SHOP.x - 110, y: SHOP.y - 40, w: 220, h: 42 });
  s.push({ kind: 'rect', x: ARCHIVE.x - ARCHIVE.w / 2, y: ARCHIVE.y - 64, w: ARCHIVE.w, h: 64 });
  s.push({ kind: 'rect', x: POOL_CRADLE.x + 8, y: POOL_CRADLE.y + 6, w: POOL_CRADLE.w - 16, h: POOL_CRADLE.h - 8 });
  s.push({ kind: 'circle', x: HOOPS.x - 100, y: HOOPS.y - 2, r: 8 }, { kind: 'circle', x: HOOPS.x - 40, y: HOOPS.y - 2, r: 8 });
  s.push({ kind: 'circle', x: HOOPS.x + 6, y: HOOPS.y + 28, r: 7 }, { kind: 'circle', x: HOOPS.x + 54, y: HOOPS.y + 28, r: 7 });
  s.push({ kind: 'circle', x: HOOPS.x + 120, y: HOOPS.y + 2, r: 13 });
  for (const h of HOUSES) s.push({ kind: 'rect', x: h.x - h.w / 2 + 4, y: h.y - 30, w: h.w - 8, h: 32 });
  for (const l of LAMPS) s.push({ kind: 'circle', x: l.x, y: l.y - 2, r: 6 });
  for (const a of ANCHORS) s.push({ kind: 'circle', x: a.x, y: a.y - 6, r: 12 });
  for (const p of PINES) s.push({ kind: 'circle', x: p.x, y: p.y - 4, r: 9 });
  return s;
}

export const ORBIT_AREA: AreaDef = {
  id: 'orbit',
  isle: 'air',
  court: 'orbit',
  name: 'The Orbit Court',
  subtitle: 'A brass orrery town on islets chained to a black moon',
  w: AREA_W,
  h: AREA_H,
  bg: SKY,
  accent: ORBIT_ACCENT,
  weather: 'clouds',
  spawn: SPAWN,
  painter: ORBIT_PAINTER,
  solids: orbitSolids(),
  exits: [
    { side: 'n', to: 'stormeye', label: 'The Stormeye Court' },
    { side: 'w', to: 'windlass', label: 'Windlass' },
  ],
  pois: [
    ...ORBIT_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'perigee', at: PRINCE_AT },
    { kind: 'waystone', at: WAYSTONE },
    { kind: 'water', id: 'orbit-moonpool-water', shape: { x: POOL_CRADLE.x - 10, y: POOL_CRADLE.y - 70, w: POOL_CRADLE.w + 20, h: POOL_CRADLE.h + 80 }, fishery: 'orbit-moonpool' },
    { kind: 'sign', at: { x: 300, y: 870 }, text: 'TETHER QUAY. Mind the gulf. It is a long way down, and then it is only clouds.' },
    { kind: 'sign', at: { x: 445, y: 420 }, text: 'THE MOONPOOL. Cast UP. Any rod. Do not put your head in it. — F. Hobb' },
    { kind: 'sign', at: { x: 930, y: 905 }, text: 'THE RING-STREET. Perigee dates on the plaques. Breathe small near the moon.' },
    { kind: 'sign', at: { x: 2060, y: 860 }, text: 'ZERO-G YARD. Feet optional past the green line. Mr Lofty is not responsible for walls.' },
    { kind: 'sign', at: { x: 1625, y: 1400 }, text: 'THE ARCHIVE OF FALLING THINGS. All that falls is filed. All that is filed is kept.' },
    { kind: 'chest', id: 'orbit-chest-quay', at: { x: 300, y: 1440 }, coins: 100 },
    { kind: 'chest', id: 'orbit-chest-gulf', at: { x: 2290, y: 1430 }, coins: 80, orbs: 1 },
    { kind: 'chest', id: 'orbit-chest-periapsis', at: { x: 1820, y: 360 }, orbs: 2, open: { prince: 'perigee' } },
  ],
  npcs: ORBIT_NPCS,
  crowd: ORBIT_CROWD,
};
