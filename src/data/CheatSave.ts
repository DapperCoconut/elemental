/**
 * Cheat save construction and shared cheat grants.
 *
 * Separate from Cheats.ts because this module imports the whole data layer;
 * Cheats.ts must stay import-free so PlayerData can depend on it.
 */

import * as Cheats from './Cheats';
import * as PlayerData from './PlayerData';
import * as CP from './CampaignProgress';
import { RECIPES } from './Recipes';
import { ABSTRACT_ELEMENT_IDS, ABSTRACT_MIX_ELEMENT_IDS } from './AbstractElements';
import { ALL_UPGRADES } from './Upgrades';
import { ALL_PERKS } from './Perks';
import { DIVINE_PERKS } from './DivinePerks';
import { MUTATIONS } from './Mutations';
import { MASTERY_DEFS, MASTERY_SLOTS } from './Mastery';
import { WORLDS, getFightNodes } from './Worlds';
import { ABSTRACT_WORLDS } from './AbstractWorlds';
import { ITEMS } from './Items';
import { ACHIEVEMENTS } from './Achievements';

const BASE_ELEMENTS = ['fire', 'water', 'life', 'air', 'earth'];

const MAX_SHARDS = 999999;
const MAX_NUCLEI = 999;
const MAX_KEYS = 9999;
const MAX_SPARKS = 9999;
const MAX_ITEM_STACK = 99;

/**
 * Every element ID beyond the five you start with: the Lab's combined, abstract and
 * abstract-mix recipes, plus the two divine elements — which come from the Devourer's
 * endings rather than the Lab, so nothing recipe-shaped would ever list them.
 */
function allUnlockableElementIds(): string[] {
  return [
    ...RECIPES.map((r) => r.result),
    ...ABSTRACT_ELEMENT_IDS,
    ...ABSTRACT_MIX_ELEMENT_IDS,
    ...PlayerData.DIVINE_ELEMENT_IDS,
  ];
}

/**
 * Fills the *currently active* profile with everything unlocked and every
 * currency maxed. Callers are responsible for putting cheat mode on first —
 * `createCheatSave()` below does that.
 */
function maxOutCurrentProfile(): void {
  // ── Currencies ─────────────────────────────────────────────────────
  PlayerData.addShards(MAX_SHARDS - PlayerData.getShards());
  PlayerData.addCorruptShards(MAX_SHARDS - PlayerData.getCorruptShards());
  PlayerData.addNuclei(MAX_NUCLEI - PlayerData.getNuclei());
  PlayerData.addDivineNuclei(MAX_NUCLEI - PlayerData.getDivineNuclei());

  // ── Lab: max level, then every element ─────────────────────────────
  while (PlayerData.upgradelab()) { /* climbs to the cap, then returns false */ }
  for (const id of allUnlockableElementIds()) PlayerData.unlockElement(id);

  // ── Shop upgrades ──────────────────────────────────────────────────
  for (const el of ALL_UPGRADES) {
    for (const up of el.upgrades) PlayerData.purchaseUpgrade(el.elementId, up.slot);
  }

  // ── Perks (unlocked, not auto-equipped — equipping is a choice) ─────
  for (const el of ALL_PERKS) {
    for (const perk of el.perks) PlayerData.unlockPerk(el.elementId, perk.id);
  }
  for (const perk of DIVINE_PERKS) PlayerData.unlockPerk(perk.elementId, perk.id);

  // ── The Disgraced King: door open, laboratory found ────────────────
  PlayerData.markKingDefeated();
  // ...and the Devourer behind it. Recorded as the kill ending because that is the one
  // that grants Justice; both divine elements are unlocked above regardless.
  PlayerData.markDevourerDefeated('kill');

  // ── Mutations + secret enemy ───────────────────────────────────────
  for (const m of MUTATIONS) PlayerData.unlockMutation(m.id);
  PlayerData.unlockDummy();

  // ── Achievements (skins unlock with them, not auto-equipped) ───
  for (const a of ACHIEVEMENTS) PlayerData.unlockAchievement(a.id);

  // ── Gauntlets: normal + hard, all elements ─────────────────────────
  PlayerData.unlockGauntlet();
  PlayerData.unlockGauntletHard();
  for (const id of BASE_ELEMENTS) {
    PlayerData.completeGauntlet(id);
    PlayerData.completeGauntletHard(id);
  }

  // ── Infinity records ───────────────────────────────────────────────
  PlayerData.setInfinityBestFight(999, false);
  PlayerData.setInfinityBestFight(999, true);

  // ── Mastery: every requirement met, mastery switched on ────────────
  for (const [elementId, def] of Object.entries(MASTERY_DEFS)) {
    for (const req of def.requirements) {
      PlayerData.recordMasteryBest(elementId, req.key, req.target);
    }
    PlayerData.setMasteryEnabled(elementId, true);
    // Give each bindable mastery ability a default home so the cheat save is playable as-is.
    def.enhancements.filter((e) => e.bindable).forEach((enh, i) => {
      const slot = MASTERY_SLOTS[i];
      if (slot) PlayerData.setMasteryBind(elementId, slot, enh.id);
    });
  }
}

/** Completes every campaign world (normal + abstract) in the given slot. */
function maxOutCampaignSlot(idx: 0 | 1 | 2): void {
  CP.addKeys(idx, MAX_KEYS - CP.getKeys(idx));
  CP.addSparks(idx, MAX_SPARKS - CP.getSparks(idx));
  CP.markCheated(idx);

  for (const world of [...WORLDS, ...ABSTRACT_WORLDS]) {
    for (const node of getFightNodes(world)) {
      CP.markFightCompleted(idx, world.id, node.id);
    }
    CP.markChallengeCompleted(idx, world.id);
    CP.markGauntletCompleted(idx, world.id);
  }

  // Portal costs 10 keys — granted above, so this always succeeds.
  if (!CP.isPortalUnlocked(idx)) CP.purchasePortal(idx);

  for (const item of ITEMS) {
    const have = CP.getInventory(idx)[item.id] ?? 0;
    if (have < MAX_ITEM_STACK) CP.addItem(idx, item.id, MAX_ITEM_STACK - have);
  }

  // Top the keys back up after the portal purchase.
  CP.addKeys(idx, MAX_KEYS - CP.getKeys(idx));
}

/**
 * Builds (or rebuilds) the cheat profile with everything unlocked.
 *
 * Temporarily switches the storage namespace to the cheat keys so the whole
 * thing can be written through the normal PlayerData / CampaignProgress
 * setters, then restores the previous mode. The real save is never written to.
 */
export function createCheatSave(): void {
  const previous = Cheats.isCheatMode();
  Cheats.setCheatMode(true);
  try {
    maxOutCurrentProfile();

    // Campaign slot 0 is the cheat slot; slots 1 and 2 are left free.
    if (CP.getSlot(0) === null) CP.createSlot(0, 'CHEAT');
    CP.setActiveSlot(0);
    maxOutCampaignSlot(0);
  } finally {
    Cheats.setCheatMode(previous);
  }
}

/**
 * The WWSSADADBA grant. Applies to whichever profile is currently active.
 *
 * Single source of truth for the code — TitleScene and MenuScene both call
 * this so the two entry points can never drift apart.
 *
 * Returns what changed, so callers can tailor their toast.
 */
export function applyKonamiCheat(): { campaignSlot: boolean } {
  PlayerData.addShards(9999);
  PlayerData.addCorruptShards(9999);
  PlayerData.unlockGauntlet();
  for (const id of BASE_ELEMENTS) PlayerData.completeGauntlet(id);

  PlayerData.unlockDummy();
  for (const m of MUTATIONS) PlayerData.unlockMutation(m.id);

  const campaignSlot = CP.getSlot(0) !== null;
  if (campaignSlot) {
    CP.addKeys(0, 9999);
    CP.addSparks(0, 9999);
    CP.markCheated(0);
  }
  return { campaignSlot };
}
