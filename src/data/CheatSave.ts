/**
 * Cheat save construction and shared cheat grants.
 *
 * Separate from Cheats.ts because this module imports the whole data layer;
 * Cheats.ts must stay import-free so PlayerData can depend on it.
 */

import * as Cheats from './Cheats';
import * as PlayerData from './PlayerData';
import * as CP from './CampaignProgress';
import { ALL_UPGRADES } from './Upgrades';
import { isUpgradeUnlocked } from './UpgradeUnlocks';
import { ALL_PERKS } from './Perks';
import { DIVINE_PERKS } from './DivinePerks';
import { MUTATIONS } from './Mutations';
import { MASTERY_DEFS, MASTERY_SLOTS, isMasteryComplete } from './Mastery';
import { getFightNodes } from './Worlds';
import { ALL_WORLDS } from './AbstractWorlds';
import { ITEMS } from './Items';
import { ARTIFACTS } from './Artifacts';
import { VAULT_CHESTS, grantReward } from './Vault';
import { ACHIEVEMENTS } from './Achievements';
import { SKINS, isSkinUnlocked } from './Skins';
import { SECRET_MODES, SCREWS_PER_PLATE } from './SecretModes';
import { getAllStoryBeatIds } from './CampaignStory';
import { ELEMENT_MAP } from '../elements/ElementRegistry';

const BASE_ELEMENTS = ['fire', 'water', 'life', 'air', 'earth'];

const MAX_SHARDS = 999999;
const MAX_NUCLEI = 999;
const MAX_KEYS = 9999;
const MAX_SPARKS = 9999;
const MAX_ITEM_STACK = 99;

/** The cheat slot. Slots 1 and 2 are left free for real saves. */
const CHEAT_SLOT = 0;

/**
 * Registry entries that are not player elements: the body the Disgraced King fights in.
 * Everything else in `ELEMENT_MAP` is something a cheat profile is supposed to own.
 */
const NON_PLAYER_ELEMENT_IDS = new Set(['king']);

/**
 * Every element the profile should have, taken from the element registry rather than from
 * the routes that normally grant them (Lab recipes, the Devourer's two endings, the seal
 * behind the Amalgam). Reading the registry is the point: an element added later is in the
 * cheat save the moment it exists, without anyone remembering to come back here.
 */
function allUnlockableElementIds(): string[] {
  return Object.keys(ELEMENT_MAP).filter((id) => !NON_PLAYER_ELEMENT_IDS.has(id));
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

  // ── Mutations ──────────────────────────────────────────────────────
  for (const m of MUTATIONS) PlayerData.unlockMutation(m.id);

  // ── Secret modes: screwdriver in hand, every plate already off ─────
  PlayerData.findScrewdriver();
  for (const mode of SECRET_MODES) {
    for (let corner = 0; corner < SCREWS_PER_PLATE; corner++) PlayerData.removeScrew(mode.id, corner);
    PlayerData.unlockSecretMode(mode.id);
  }

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

  // ── Quantum: an element with no bond has no abilities at all ───────
  // Every pair reads as researched in cheat mode, but the carried bond is still a stored
  // choice — leave it empty and picking Quantum drops you into a fight with nothing.
  if (!PlayerData.getQuantumBond()) {
    PlayerData.setQuantumBond(PlayerData.STARTER_BOND[0], PlayerData.STARTER_BOND[1]);
  }

  // ── Passion's Exhibition toggle (found by tapping, not by playing) ──
  for (let i = 0; i < PlayerData.PASSION_Q_TAPS_REQUIRED; i++) PlayerData.tapPassionQ();
}

/** Completes the whole campaign — every realm, both portals and the finale — in one slot. */
function maxOutCampaignSlot(idx: 0 | 1 | 2): void {
  CP.markCheated(idx);

  // Both portals are granted outright rather than bought. Purchasing them has
  // prerequisites (the scar wants five Abstract Sovereigns down) which would make this
  // function's result depend on the order its own lines run in.
  CP.unlockPortal(idx);
  CP.unlockCorruptPortal(idx);

  // Every world of every realm — normal, Abstract and Corrupt. Derived from ALL_WORLDS so
  // a realm added later completes itself here instead of being quietly left locked.
  for (const world of ALL_WORLDS) {
    for (const node of getFightNodes(world)) {
      CP.markFightCompleted(idx, world.id, node.id);
    }
    CP.markChallengeCompleted(idx, world.id);
    CP.markGauntletCompleted(idx, world.id);
  }

  // The Amalgam is not a world — its clear is filed under a pseudo-world id of its own.
  CP.markChallengeCompleted(idx, CP.AMALGAM_WORLD_ID);

  // The campaign is finished, so the dialogue has notionally already been heard.
  for (const beatId of getAllStoryBeatIds()) CP.markStoryBeatSeen(idx, beatId);

  for (const item of ITEMS) {
    const have = CP.getInventory(idx)[item.id] ?? 0;
    if (have < MAX_ITEM_STACK) CP.addItem(idx, item.id, MAX_ITEM_STACK - have);
  }

  // The Vault, emptied. Every chest is stamped open and its contents granted directly —
  // `openVaultChest` would charge for them, and a profile built by paying for things depends
  // on the order these lines run in (see the portals above).
  for (const chest of VAULT_CHESTS) {
    if (CP.isVaultChestOpened(idx, chest.id)) continue;
    grantReward(idx, chest.reward);
    CP.markVaultChestOpened(idx, chest.id);
  }
  // Artifacts are handed out by the chests above, but a rebuild on an existing profile can
  // land with them mid-cooldown. Nothing in a cheat save should be on a timer.
  CP.clearArtifactCooldowns(idx);

  // Keys and sparks last: the Vault spends neither here, but the grants above pay sparks in,
  // and topping up afterwards is what makes the final number the maximum rather than
  // the maximum plus whatever fifty chests happened to contain.
  CP.addKeys(idx, MAX_KEYS - CP.getKeys(idx));
  CP.addSparks(idx, MAX_SPARKS - CP.getSparks(idx));
}

/**
 * Runs `fn` against the cheat storage namespace, whatever mode is currently on, and puts
 * the mode back afterwards. The real save is never written to or read from inside it.
 */
function inCheatProfile<T>(fn: () => T): T {
  const previous = Cheats.isCheatMode();
  Cheats.setCheatMode(true);
  try {
    return fn();
  } finally {
    Cheats.setCheatMode(previous);
  }
}

/**
 * Builds (or rebuilds) the cheat profile with everything unlocked, then audits itself.
 *
 * Returns whatever `verifyCheatSave()` still found missing — empty when the profile is
 * genuinely complete. Callers can surface that; nothing has to.
 */
export function createCheatSave(): string[] {
  inCheatProfile(() => {
    maxOutCurrentProfile();

    if (CP.getSlot(CHEAT_SLOT) === null) CP.createSlot(CHEAT_SLOT, 'CHEAT');
    CP.setActiveSlot(CHEAT_SLOT);
    maxOutCampaignSlot(CHEAT_SLOT);
  });

  const gaps = verifyCheatSave();
  if (gaps.length) console.warn('[cheat save] still incomplete after rebuild:', gaps);
  return gaps;
}

/**
 * Audits the cheat profile against the live content tables and reports what it does not
 * have. Empty means complete.
 *
 * This exists because the cheat save is written by hand while the content it is supposed to
 * mirror keeps growing — the Corrupt Realm shipped and this file kept completing two realms
 * out of three, with nothing anywhere to say so. Every check below is derived from a
 * content table, so new content shows up as a reported gap rather than as a locked door
 * somebody trips over months later. When one fires, fix the grant above; do not delete the
 * check.
 */
export function verifyCheatSave(): string[] {
  return inCheatProfile(() => {
    const gaps: string[] = [];
    const want = (ok: boolean, what: string) => { if (!ok) gaps.push(what); };

    // ── Profile ──────────────────────────────────────────────────────
    for (const id of allUnlockableElementIds()) {
      want(PlayerData.isElementUnlocked(id), `element ${id} locked`);
    }
    for (const el of ALL_UPGRADES) {
      for (const up of el.upgrades) {
        want(PlayerData.isUpgradeOwned(el.elementId, up.slot), `upgrade ${el.elementId}/${up.slot} unowned`);
        // The unstable ten gate their slots on Corrupt-world progress. Owning one
        // and being allowed to buy it are separate facts, so both are audited.
        want(isUpgradeUnlocked(el.elementId, up.slot), `upgrade ${el.elementId}/${up.slot} still gated`);
      }
    }
    for (const el of ALL_PERKS) {
      for (const perk of el.perks) {
        want(PlayerData.isPerkUnlocked(el.elementId, perk.id), `perk ${el.elementId}/${perk.id} locked`);
      }
    }
    for (const perk of DIVINE_PERKS) {
      want(PlayerData.isPerkUnlocked(perk.elementId, perk.id), `divine perk ${perk.id} locked`);
    }
    for (const m of MUTATIONS) want(PlayerData.isMutationUnlocked(m.id), `mutation ${m.id} locked`);
    for (const a of ACHIEVEMENTS) want(PlayerData.isAchievementUnlocked(a.id), `achievement ${a.id} locked`);
    for (const s of SKINS) want(isSkinUnlocked(s.id), `skin ${s.id} locked`);
    for (const elementId of Object.keys(MASTERY_DEFS)) {
      want(isMasteryComplete(elementId), `mastery ${elementId} incomplete`);
    }

    want(PlayerData.getLabLevel() >= PlayerData.MAX_LAB_LEVEL, 'lab not fully upgraded');
    want(PlayerData.isGauntletUnlocked(), 'gauntlet locked');
    want(PlayerData.isGauntletHardUnlocked(), 'hard gauntlet locked');
    want(PlayerData.isKingDefeated(), 'Disgraced King not felled');
    want(PlayerData.isDevourerDefeated(), 'Devourer not felled');
    want(PlayerData.isScrewdriverFound(), 'screwdriver not found');
    for (const mode of SECRET_MODES) {
      want(PlayerData.isSecretModeUnlocked(mode.id), `secret mode ${mode.id} still bolted down`);
    }
    want(PlayerData.getQuantumBond() !== null, 'Quantum carries no bond');
    want(PlayerData.isPassionQUnlocked(), "Passion's Q toggle locked");

    // ── Campaign ─────────────────────────────────────────────────────
    const idx = CHEAT_SLOT;
    if (CP.getSlot(idx) === null) {
      gaps.push('cheat campaign slot missing');
      return gaps;
    }
    want(CP.isPortalUnlocked(idx), 'Abstract portal shut');
    want(CP.isCorruptPortalUnlocked(idx), 'Corrupt portal shut');
    for (const world of ALL_WORLDS) {
      want(CP.isWorldUnlocked(idx, world.id), `world ${world.id} locked`);
      want(CP.areFightsCleared(idx, world.id), `world ${world.id} fights unfinished`);
      want(CP.isChallengeCompleted(idx, world.id), `world ${world.id} boss standing`);
      want(CP.isGauntletCompleted(idx, world.id), `world ${world.id} gauntlet unfinished`);
    }
    want(CP.isAmalgamFelled(idx), 'the Amalgam still stands');
    for (const item of ITEMS) {
      want((CP.getInventory(idx)[item.id] ?? 0) > 0, `item ${item.id} not stocked`);
    }
    for (const chest of VAULT_CHESTS) {
      want(CP.isVaultChestOpened(idx, chest.id), `vault chest ${chest.id} still locked`);
    }
    for (const artifact of ARTIFACTS) {
      want(CP.hasArtifact(idx, artifact.id), `artifact ${artifact.id} not owned`);
      want(CP.isArtifactReady(idx, artifact.id), `artifact ${artifact.id} on cooldown`);
    }

    return gaps;
  });
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

  for (const m of MUTATIONS) PlayerData.unlockMutation(m.id);

  const campaignSlot = CP.getSlot(0) !== null;
  if (campaignSlot) {
    CP.addKeys(0, 9999);
    CP.addSparks(0, 9999);
    CP.markCheated(0);
  }
  return { campaignSlot };
}
