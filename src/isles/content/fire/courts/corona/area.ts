import type { AreaDef, Solid } from '../../../../IslesTypes';
import { CORONA_ACCENT } from './palette';
import {
  AREA_H, AREA_W, BOTTLE, COTTAGES, FULGURITES, LAMPS, LONE_STONES, OBS_NE, OBS_S, OBS_W, PALACE, POOL,
  PRINCE_AT, PYLON_CHAINS, RIM_E, RIM_N, SHOP, STONE_RING, WAYSTONE,
} from './layout';
import { CORONA_PAINTER } from './painter';
import { CORONA_CROWD, CORONA_NPCS } from './npcs';
import { CORONA_ENCOUNTERS } from './encounters';

/**
 * Collision for the plateau: every footprint at its base line, never the drawn height. The
 * palace solid also swallows the plinth behind it, so nobody walks under the sun.
 */
function coronaSolids(): Solid[] {
  const s: Solid[] = [
    { kind: 'rect', x: 0, y: 0, w: AREA_W, h: RIM_N },
    { kind: 'rect', x: RIM_E, y: 0, w: AREA_W - RIM_E, h: AREA_H },
    { kind: 'rect', x: PALACE.x - 230, y: RIM_N, w: 460, h: PALACE.y - RIM_N + 2 },
    { kind: 'rect', x: SHOP.x - SHOP.w / 2, y: SHOP.y - 46, w: SHOP.w, h: 50 },
    { kind: 'circle', x: OBS_W.x, y: OBS_W.y - 14, r: OBS_W.r - 4 },
    { kind: 'circle', x: OBS_W.x + OBS_W.r + 50, y: OBS_W.y - 10, r: 40 },
    { kind: 'circle', x: OBS_NE.x, y: OBS_NE.y - 14, r: OBS_NE.r - 4 },
    { kind: 'circle', x: OBS_S.x, y: OBS_S.y - 10, r: OBS_S.r - 4 },
    { kind: 'rect', x: POOL.x - 10, y: POOL.y - 10, w: POOL.w + 20, h: POOL.h + 20 },
    { kind: 'rect', x: BOTTLE.x - BOTTLE.rx - 5, y: BOTTLE.y - 74, w: BOTTLE.rx * 2 + 10, h: 82 },
  ];
  for (const chain of PYLON_CHAINS) for (const p of chain) s.push({ kind: 'circle', x: p.x, y: p.y - 4, r: 16 });
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.95 + (i / 7) * Math.PI * 2;
    if (Math.cos(a) < -0.85) continue;
    s.push({
      kind: 'circle', r: 17,
      x: STONE_RING.x + Math.cos(a) * STONE_RING.r, y: STONE_RING.y + Math.sin(a) * STONE_RING.r * 0.7 - 4,
    });
  }
  for (const st of LONE_STONES) s.push({ kind: 'circle', x: st.x, y: st.y - 4, r: 15 });
  for (const c of COTTAGES) {
    s.push({ kind: 'rect', x: c.x - c.w / 2, y: c.y - 40, w: c.w, h: 42 });
    s.push({ kind: 'circle', x: c.x + c.w / 2 + 22, y: c.y - 2, r: 6 });
  }
  for (const f of FULGURITES) s.push({ kind: 'circle', x: f.x, y: f.y - 4, r: 10 });
  for (const l of LAMPS) s.push({ kind: 'circle', x: l.x, y: l.y - 2, r: 6 });
  for (const b of [{ x: 140, y: 220 }, { x: 2210, y: 260 }, { x: 2230, y: 1500 }, { x: 1020, y: 220 }]) {
    s.push({ kind: 'circle', x: b.x, y: b.y - 6, r: 20 });
  }
  return s;
}

export const CORONA_AREA: AreaDef = {
  id: 'corona',
  isle: 'fire',
  court: 'corona',
  name: 'The Corona Court',
  subtitle: 'A glass plateau under the captive sun',
  w: AREA_W,
  h: AREA_H,
  bg: 0x1a1226,
  accent: CORONA_ACCENT,
  weather: 'sparks',
  spawn: { x: 170, y: 800 },
  painter: CORONA_PAINTER,
  solids: coronaSolids(),
  exits: [
    { side: 'w', to: 'hearth', label: 'The Hearth Court' },
    { side: 's', to: 'candlewick', label: 'The Candlewick Court' },
  ],
  pois: [
    ...CORONA_ENCOUNTERS.map((e) => ({ kind: 'encounter' as const, id: e.id })),
    { kind: 'prince', id: 'flux', at: PRINCE_AT },
    { kind: 'waystone', at: WAYSTONE },
    { kind: 'water', id: 'corona-glasspool', shape: { x: POOL.x, y: POOL.y, w: POOL.w, h: POOL.h }, fishery: 'corona-glasspool' },
    { kind: 'sign', at: { x: 1120, y: 880 }, text: 'THE LIGHT IS METERED. KEEP YOUR TITHE FIRE LIT. — by order of the Prince' },
    { kind: 'sign', at: { x: 1800, y: 900 }, text: 'Stone Circle. In flare weather, share the shade.' },
    { kind: 'sign', at: { x: 1570, y: 610 }, text: 'PYLON FIELD — arcs fire on schedule. Count the pips.' },
    { kind: 'chest', id: 'corona-chest-rim', at: { x: 2200, y: 175 }, coins: 70 },
    { kind: 'chest', id: 'corona-chest-vault', at: { x: 790, y: 360 }, orbs: 2, open: { prince: 'flux' } },
  ],
  npcs: CORONA_NPCS,
  crowd: CORONA_CROWD,
};
