import type {
  AreaDef, ArenaFloor, BakeryDef, BoatDef, CourtDef, DockUpgradeDef, EncounterDef, FishDef, FisheryDef,
  GeneTree, GimmickDef, IsleBundle, IsleDef, IsleItemDef, ItemScriptFactory, QuestDef, RodDef,
  ShopDef, UberDef, WandererDef,
} from './IslesTypes';
import type { WorldBossDef } from '../boss/framework/BossDefs';
import { bindRegistry, S } from './IslesSave';
import { isCheatMode } from '../data/Cheats';
import { registerBossResolver } from '../boss/bosses';
import { FIRE_ISLE } from './content/fire';
import { WATER_ISLE } from './content/water';
import { LIFE_ISLE } from './content/life';
import { AIR_ISLE } from './content/air';
import { EARTH_ISLE } from './content/earth';
import { ELECTRICITY_ISLE } from './content/electricity';
import { SLIME_ISLE } from './content/slime';
import { FATE_ISLE } from './content/fate';
import { SOUND_ISLE } from './content/sound';
import { LIGHT_ISLE } from './content/light';
import { BOATS, DOCK_UPGRADES } from './content/sea';

/**
 * Every isle's content, flattened into lookup tables. Isles register by being listed in
 * `BUNDLES`; nothing else in the engine names an isle.
 */

const BUNDLES: IsleBundle[] = [FIRE_ISLE, WATER_ISLE, LIFE_ISLE, AIR_ISLE, EARTH_ISLE, ELECTRICITY_ISLE, SLIME_ISLE, FATE_ISLE, SOUND_ISLE, LIGHT_ISLE];

export const ISLES: IsleDef[] = BUNDLES.map((b) => b.isle);

/** The ten isles in chart order — the ones not yet built are drawn as uncharted. */
export const ALL_ISLE_IDS = ['fire', 'water', 'life', 'air', 'earth', 'electricity', 'slime', 'fate', 'sound', 'light'];

const areas = new Map<string, AreaDef>();
const courts = new Map<string, CourtDef>();
const encounters = new Map<string, EncounterDef>();
const gimmicks = new Map<string, GimmickDef>();
const bosses = new Map<string, WorldBossDef>();
const items = new Map<string, IsleItemDef>();
const scripts = new Map<string, ItemScriptFactory>();
const shops = new Map<string, ShopDef>();
const bakeries = new Map<string, BakeryDef>();
const fish = new Map<string, FishDef>();
const fisheries = new Map<string, FisheryDef>();
const rods = new Map<string, RodDef>();
const genes = new Map<string, GeneTree>();
const quests = new Map<string, QuestDef>();
const ubers = new Map<string, UberDef>();
const wanderers = new Map<string, WandererDef>();
const floors = new Map<string, ArenaFloor>();
const isleOfArea = new Map<string, string>();

function put<T>(m: Map<string, T>, id: string, v: T, what: string): void {
  if (m.has(id)) console.warn(`[isles] duplicate ${what} id: ${id}`);
  m.set(id, v);
}

for (const b of BUNDLES) {
  wanderers.set(b.isle.id, b.wanderer);
  for (const a of b.areas) { put(areas, a.id, a, 'area'); isleOfArea.set(a.id, b.isle.id); }
  for (const q of b.quests) put(quests, q.id, q, 'quest');
  for (const e of b.encounters) put(encounters, e.id, e, 'encounter');
  for (const g of b.gimmicks) put(gimmicks, g.id, g, 'gimmick');
  for (const d of b.bosses) put(bosses, d.worldId, d, 'boss');
  for (const it of b.items) put(items, it.id, it, 'item');
  for (const [k, f] of Object.entries(b.scripts)) put(scripts, k, f, 'script');
  for (const s of b.shops) put(shops, s.id, s, 'shop');
  for (const s of b.bakeries) put(bakeries, s.id, s, 'bakery');
  for (const f of b.fish) put(fish, f.id, f, 'fish');
  for (const f of b.fisheries) put(fisheries, f.id, f, 'fishery');
  for (const r of b.rods) put(rods, r.id, r, 'rod');
  for (const t of b.genes) put(genes, t.element, t, 'gene tree');
  for (const u of b.ubers) put(ubers, u.id, u, 'uber');
  for (const [k, f] of Object.entries(b.floors)) floors.set(k, f);
  for (const cb of b.courts) {
    const c = cb.court;
    put(courts, c.id, c, 'court');
    put(areas, cb.area.id, cb.area, 'area');
    isleOfArea.set(cb.area.id, b.isle.id);
    floors.set(c.id, c.floor);
    for (const e of c.encounters) put(encounters, e.id, e, 'encounter');
    for (const q of c.quests) put(quests, q.id, q, 'quest');
    for (const g of cb.gimmicks) put(gimmicks, g.id, g, 'gimmick');
    put(bosses, cb.boss.worldId, cb.boss, 'boss');
    for (const it of cb.items) put(items, it.id, it, 'item');
    for (const [k, f] of Object.entries(cb.scripts)) put(scripts, k, f, 'script');
    for (const s of cb.shops) put(shops, s.id, s, 'shop');
    for (const s of cb.bakeries ?? []) put(bakeries, s.id, s, 'bakery');
    for (const f of cb.fish ?? []) put(fish, f.id, f, 'fish');
    for (const f of cb.fisheries ?? []) put(fisheries, f.id, f, 'fishery');
  }
}

// Quest duel foes fight through the encounter pipeline, so they live in the same table.
for (const q of quests.values()) {
  for (const st of q.stages) {
    if (st.objective.kind === 'duel') put(encounters, st.objective.foe.id, { ...st.objective.foe, quest: q.id }, 'encounter');
  }
}

registerBossResolver((id) => bosses.get(id));

bindRegistry({
  courtEncounters: (court) => courts.get(court)?.encounters.map((e) => e.id) ?? [],
  islePrinces: (isle) => [...courts.values()].filter((c) => c.isle === isle).map((c) => c.prince.id),
});

export const getArea = (id: string) => areas.get(id);
export const getCourt = (id: string) => courts.get(id);
export const getEncounter = (id: string) => encounters.get(id);
export const getGimmick = (id: string) => gimmicks.get(id);
export const getIslesBoss = (worldId: string) => bosses.get(worldId);
export const getIsleItem = (id: string) => items.get(id);
export const getItemScript = (id: string) => scripts.get(id);
export const getShop = (id: string) => shops.get(id);
export const getBakery = (id: string) => bakeries.get(id);
export const getFish = (id: string) => fish.get(id);
export const getFishery = (id: string) => fisheries.get(id);
export const getRod = (id: string) => rods.get(id);
export const getGeneTree = (element: string) => genes.get(element);
export const getQuest = (id: string) => quests.get(id);
export const getUber = (id: string) => ubers.get(id);
export const getWanderer = (isle: string) => wanderers.get(isle);
export const getFloor = (key: string) => floors.get(key);
export const getIsle = (id: string) => ISLES.find((i) => i.id === id);
export const isleOf = (areaId: string) => isleOfArea.get(areaId);

export const allQuests = (): QuestDef[] => [...quests.values()];
export const allCourts = (): CourtDef[] => [...courts.values()];
export const allAreas = (): AreaDef[] => [...areas.values()];
/** Every fight the registry knows: court champions, dungeon wardens and quest duel foes. */
export const allEncounters = (): EncounterDef[] => [...encounters.values()];
export const allFish = (): FishDef[] => [...fish.values()];
export const allItems = (): IsleItemDef[] => [...items.values()];
export const allUbers = (): UberDef[] => [...ubers.values()];
export const allRods = (): RodDef[] => [...rods.values()];

export function courtOfArea(areaId: string): CourtDef | undefined {
  return [...courts.values()].find((c) => c.area === areaId);
}

/** The court whose prince this is. */
export function courtOfPrince(princeId: string): CourtDef | undefined {
  return [...courts.values()].find((c) => c.prince.id === princeId);
}

export function questsInArea(areaId: string): QuestDef[] {
  return [...quests.values()].filter((q) => q.area === areaId);
}

export const boats = (): BoatDef[] => BOATS;
export const dockUpgrades = (): DockUpgradeDef[] => DOCK_UPGRADES;

/**
 * Whether a ship may sail for this isle: you have landed there before, or the isle before it on
 * the chart has lost its monarch (Brandmark's King opens the Drowned Reach, and so on). A cheat
 * save may sail for any charted isle.
 */
export function routeOpen(isleId: string): boolean {
  const isle = getIsle(isleId);
  if (!isle) return false;
  if (S().waystones.includes(isle.port) || isCheatMode()) return true;
  const i = ALL_ISLE_IDS.indexOf(isleId);
  const prev = i > 0 ? getIsle(ALL_ISLE_IDS[i - 1]) : undefined;
  return !!prev && S().monarchs.includes(prev.monarch.id);
}

/** World-boss id for a prince / monarch id. */
export const bossIdFor = (id: string): string => `isle:${id}`;
