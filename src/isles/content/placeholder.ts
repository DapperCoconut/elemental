import type { WorldBossDef } from '../../boss/framework/BossDefs';
import type { AreaDef, AreaExit, CourtBundle, DungeonBundle, PinnacleTierBundle, Poi, PortBundle } from '../IslesTypes';

/**
 * Stand-ins for an isle's content while its builders are still writing it.
 *
 * At the start of an isle the engine owner drops one of these into each builder's folder as its
 * `index.ts` and lists the isle in `BUNDLES`, so the real validator (`node .check-isles.mjs`) runs
 * against the whole isle from the first minute. Each builder overwrites its own `index.ts` with
 * the real bundle. Everything here is marked `placeholder`; the validator skips it and lists any
 * that are still standing, so an isle cannot be called finished with one left in.
 */

interface AreaStub {
  id: string;
  isle: string;
  name: string;
  w: number;
  h: number;
  /** The exits the brief's geography fixes for this area. */
  exits: { side: AreaExit['side']; to: string }[];
  pois?: Poi[];
}

export function stubArea(o: AreaStub & { court?: string }): AreaDef {
  return {
    id: o.id, isle: o.isle, court: o.court, name: o.name, subtitle: '(under construction)', w: o.w, h: o.h,
    bg: 0x404040, accent: 0x808080, weather: 'none', spawn: { x: o.w / 2, y: o.h / 2 },
    painter: { ground: () => {} },
    solids: [], exits: o.exits.map((e) => ({ ...e, label: e.to })), pois: o.pois ?? [], npcs: [],
    placeholder: true,
  };
}

export function stubBoss(id: string, name: string): WorldBossDef {
  return {
    worldId: `isle:${id}`, name, title: '(under construction)',
    color: 0x808080, colorLit: 0xa0a0a0, colorDark: 0x404040, accent: 0xffffff,
    intro: [], banter: [], defeatLine: '', phases: [], signatures: {},
    look: {} as WorldBossDef['look'],
  };
}

export function placeholderCourt(o: AreaStub & {
  element: string; tier: number; prince: { id: string; name: string };
}): CourtBundle {
  return {
    court: {
      id: o.id, isle: o.isle, element: o.element, name: o.name, tier: o.tier, area: o.id, color: 0x808080,
      prince: { id: o.prince.id, name: o.prince.name, title: '', artifact: `art-${o.prince.id}` },
      floor: () => {}, encounters: [], quests: [],
    },
    area: stubArea({ ...o, court: o.id }),
    gimmicks: [], boss: stubBoss(o.prince.id, o.prince.name), items: [], scripts: {}, shops: [],
    placeholder: true,
  };
}

export function placeholderPort(o: AreaStub & { wanderer: string }): PortBundle {
  return {
    area: stubArea({ ...o, pois: [{ kind: 'mooring', at: { x: o.w / 2, y: o.h - 60 }, isle: o.isle }] }),
    wanderer: { id: `${o.isle}-wanderer-placeholder`, name: o.wanderer, title: '', look: { body: 0x808080, accent: 0xffffff, hat: 'none' }, byArea: {}, general: [] },
    quests: [], items: [], scripts: {}, shops: [], bakeries: [], fish: [], fisheries: [], rods: [], floor: () => {},
  };
}

export function placeholderDungeon(o: AreaStub & { monarch: { id: string; name: string } }): DungeonBundle {
  return {
    area: stubArea(o), encounters: [], gimmicks: [], boss: stubBoss(o.monarch.id, o.monarch.name),
    floor: () => {}, items: [], scripts: {},
  };
}

/** A Pinnacle bench not yet built: an empty room with its two stairs. */
export function placeholderBench(o: AreaStub): PinnacleTierBundle {
  return { area: stubArea(o), encounters: [], gimmicks: [], floor: () => {}, items: [], scripts: {}, cutscenes: [] };
}
