import type { AreaDef, Solid } from '../../../../IslesTypes';
import { PEAT, SPORE_ACCENT } from './palette';
import {
  AREA_H, AREA_W, HOUSES, JETTY, LAMPS, LODE, LODE_BRIDGES, MANOR, MERE, PITS, PRINCE_AT, SCALES, SHOP, SNAGS,
  SPAWN, WALL_N, WAYSTONE,
} from './layout';
import { SPORE_PAINTER } from './painter';
import { SPORE_CROWD, SPORE_NPCS } from './npcs';
import { SPORE_ENCOUNTERS } from './encounters';

/**
 * Collision for the Spore Court: bog water is solid except where a boardwalk crosses it; every
 * mushroom-house blocks only its stem's foot, never its cap. The east and south exit strips are
 * kept clear.
 */
function sporeSolids(): Solid[] {
  const s: Solid[] = [{ kind: 'rect', x: 0, y: 0, w: AREA_W, h: WALL_N }];
  // The Black Lode, in stretches between its bridges.
  let x = 0;
  for (const b of LODE_BRIDGES) { s.push({ kind: 'rect', x, y: LODE.y, w: b.x0 - x, h: LODE.h }); x = b.x1; }
  s.push({ kind: 'rect', x, y: LODE.y, w: AREA_W - x, h: LODE.h });
  // The Black Mere, open where the jetty runs out over it.
  s.push({ kind: 'rect', x: MERE.x, y: MERE.y, w: JETTY.x - 30 - MERE.x, h: MERE.h });
  s.push({ kind: 'rect', x: JETTY.x - 30, y: MERE.y, w: MERE.x + MERE.w - (JETTY.x - 30), h: JETTY.y - MERE.y });
  s.push({ kind: 'rect', x: JETTY.x - 30, y: JETTY.y + JETTY.h, w: MERE.x + MERE.w - (JETTY.x - 30), h: MERE.y + MERE.h - JETTY.y - JETTY.h });
  // Buildings and fixtures.
  s.push({ kind: 'rect', x: MANOR.x - MANOR.w / 2, y: WALL_N, w: MANOR.w, h: MANOR.y - WALL_N - 4 });
  s.push({ kind: 'rect', x: SHOP.x - 100, y: SHOP.y - 40, w: 200, h: 42 });
  s.push({ kind: 'circle', x: SCALES.x, y: SCALES.y - 6, r: 28 });
  for (const h of HOUSES) { const sw = h.cap * 0.62 + 10; s.push({ kind: 'rect', x: h.x - sw / 2, y: h.y - 30, w: sw, h: 32 }); }
  for (const l of LAMPS) s.push({ kind: 'circle', x: l.x, y: l.y - 2, r: 6 });
  for (const t of SNAGS) s.push({ kind: 'circle', x: t.x, y: t.y - 4, r: 10 });
  for (const p of PITS) s.push({ kind: 'circle', x: p.x, y: p.y, r: p.r - 4 });
  return s;
}

export const SPORE_AREA: AreaDef = {
  id: 'spore',
  isle: 'life',
  court: 'spore',
  name: 'The Spore Court',
  subtitle: 'A fungal bog town under the mushroom wood',
  w: AREA_W,
  h: AREA_H,
  bg: PEAT,
  accent: SPORE_ACCENT,
  weather: 'spores',
  spawn: SPAWN,
  painter: SPORE_PAINTER,
  solids: sporeSolids(),
  exits: [
    { side: 'e', to: 'bloom', label: 'The Bloom Court' },
    { side: 's', to: 'confection', label: 'The Confection Court' },
  ],
  pois: [
    ...SPORE_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'mycel', at: PRINCE_AT },
    { kind: 'waystone', at: WAYSTONE },
    { kind: 'water', id: 'spore-mere', shape: { x: MERE.x, y: MERE.y, w: MERE.w, h: MERE.h }, fishery: 'spore-bog' },
    { kind: 'sign', at: { x: 1330, y: 640 }, text: 'THE TITHE GREEN. Keep out of the ring. Keep your basket full. — by order of the Ear' },
    { kind: 'sign', at: { x: 640, y: 875 }, text: 'PUFFBALL LEA. Do not tread on the white ones. Do not BREATHE near the white ones.' },
    { kind: 'sign', at: { x: 1830, y: 1260 }, text: 'WISP FEN. Firm ground only where the lights are. Follow the cold ones.' },
    { kind: 'sign', at: { x: 760, y: 1340 }, text: 'THE PITS. All windfall to be turned. Do not look in the barrow.' },
    { kind: 'sign', at: { x: 560, y: 700 }, text: 'THE BLACK MERE. Bog water: iron rods and better. It eats driftwood.' },
    { kind: 'chest', id: 'spore-chest-lode', at: { x: 90, y: 1150 }, coins: 90 },
    { kind: 'chest', id: 'spore-chest-mycelarium', at: { x: 1440, y: 540 }, orbs: 2, open: { prince: 'mycel' } },
  ],
  npcs: SPORE_NPCS,
  crowd: SPORE_CROWD,
};
