import type { AreaDef, Solid } from '../../../../IslesTypes';
import { INK, INKWELL_ACCENT } from './palette';
import {
  ARCHIVE, AREA_H, AREA_W, BRIDGES_X, CANAL, CUT, CUT_BRIDGES_Y, HALL, HOUSES, LAMPS, LINES, MANOR, PENS, PRESS,
  PRINCE_AT, REACH, SHOP, SPAWN, TOWERS, WALL_N, WAYSTONE,
} from './layout';
import { INKWELL_PAINTER } from './painter';
import { INKWELL_CROWD, INKWELL_NPCS } from './npcs';
import { INKWELL_ENCOUNTERS } from './encounters';

/**
 * Collision for the Inkwell: canals are water (solid) except where a bridge crosses; every
 * building blocks only its footprint at its base line, never its drawn height. The east and
 * south exit strips are kept clear.
 */
function inkwellSolids(): Solid[] {
  const s: Solid[] = [
    { kind: 'rect', x: 0, y: 0, w: AREA_W, h: WALL_N },
  ];
  // The Grand Canal, in stretches between the bridges (the pens widen its west end).
  let x = 0;
  for (const b of BRIDGES_X) { s.push({ kind: 'rect', x, y: CANAL.y, w: b.x0 - x, h: CANAL.h }); x = b.x1; }
  s.push({ kind: 'rect', x, y: CANAL.y, w: AREA_W - x, h: CANAL.h });
  s.push({ kind: 'rect', x: PENS.x - 10, y: PENS.y, w: PENS.w + 10, h: PENS.h });
  // The Quill Cut, between its bridges.
  let y = CUT.y0;
  for (const b of CUT_BRIDGES_Y) { s.push({ kind: 'rect', x: CUT.x, y, w: CUT.w, h: b.y0 - y }); y = b.y1; }
  s.push({ kind: 'rect', x: CUT.x, y, w: CUT.w, h: CUT.y1 - y });
  // Buildings.
  s.push({ kind: 'rect', x: MANOR.x - MANOR.w / 2, y: WALL_N, w: MANOR.w, h: MANOR.y - WALL_N - 2 });
  s.push({ kind: 'rect', x: PRESS.x - PRESS.w / 2 - 34, y: PRESS.y - 60, w: PRESS.w + 34, h: 62 });
  s.push({ kind: 'rect', x: SHOP.x - SHOP.w / 2, y: SHOP.y - 44, w: SHOP.w, h: 46 });
  s.push({ kind: 'rect', x: HALL.x - HALL.w / 2, y: HALL.y - 60, w: HALL.w, h: 62 });
  s.push({ kind: 'rect', x: ARCHIVE.x - ARCHIVE.w / 2, y: ARCHIVE.y - 40, w: ARCHIVE.w, h: 42 });
  for (const t of TOWERS) s.push({ kind: 'circle', x: t.x, y: t.y - 8, r: t.r + 2 });
  for (const h of HOUSES) s.push({ kind: 'rect', x: h.x - h.w / 2, y: h.y - 40, w: h.w, h: 42 });
  for (const l of LAMPS) s.push({ kind: 'circle', x: l.x, y: l.y - 2, r: 6 });
  for (const l of LINES) for (const p of [l.a, l.b]) s.push({ kind: 'circle', x: p.x, y: p.y - 2, r: 6 });
  return s;
}

export const INKWELL_AREA: AreaDef = {
  id: 'inkwell',
  isle: 'water',
  court: 'inkwell',
  name: 'The Inkwell Court',
  subtitle: 'A scriptorium town on canals of ink',
  w: AREA_W,
  h: AREA_H,
  bg: INK,
  accent: INKWELL_ACCENT,
  weather: 'ink',
  spawn: SPAWN,
  painter: INKWELL_PAINTER,
  solids: inkwellSolids(),
  exits: [
    { side: 'e', to: 'tidewater', label: 'The Tidewater Court' },
    { side: 's', to: 'sailmaker', label: 'The Sailmaker\'s Court' },
  ],
  pois: [
    ...INKWELL_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'blot', at: PRINCE_AT },
    { kind: 'waystone', at: WAYSTONE },
    { kind: 'water', id: 'inkwell-reach', shape: { x: REACH.x, y: REACH.y, w: REACH.w, h: REACH.h }, fishery: 'inkwell-canal' },
    { kind: 'sign', at: { x: 1330, y: 520 }, text: 'DECREE SQUARE. Read. Obey. Pay. — by order of the Censor' },
    { kind: 'sign', at: { x: 520, y: 930 }, text: 'SQUID PENS. Do not feed the stock. Do not stand near the stock. The stock squirts.' },
    { kind: 'sign', at: { x: 2300, y: 690 }, text: 'THE INKWELL. All ink is the Queen\'s. Mind what you write.' },
    { kind: 'sign', at: { x: 1260, y: 1350 }, text: 'Low street. First under at the tide. Keep your receipt on your person.' },
    { kind: 'chest', id: 'inkwell-chest-pens', at: { x: 70, y: 1240 }, coins: 80 },
    { kind: 'chest', id: 'inkwell-chest-well', at: { x: 1430, y: 500 }, orbs: 2, open: { prince: 'blot' } },
  ],
  npcs: INKWELL_NPCS,
  crowd: INKWELL_CROWD,
};
