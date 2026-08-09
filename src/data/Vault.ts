/**
 * The Vault — what 🗝️ Keys are actually *for*.
 *
 * Keys used to buy exactly two things, both of them doors (the Abstract portal, the scar),
 * after which every key a Sovereign paid out was dead weight. The Vault is the sink: three
 * pages of locked chests hanging off the campaign world map, priced in keys and stocked with
 * the last content in the game that had no obtainment at all.
 *
 * ## The three pages
 *
 * - **Pages 1–2** — fifty ordinary gold-and-oak chests, 1 key each. Thirty-five of them hold
 *   one shop upgrade apiece for the seven Vault elements (7 elements × 5 slots = 35, so the
 *   set is exactly covered and nothing is duplicated), plus a purse of ⚡ Sparks and a couple
 *   of shop items. The other fifteen hold an artifact each — see `Artifacts.ts`.
 * - **Page 3** — seven black-and-silver chests with spikes on them. They are mimics, they are
 *   not subtle about it, and they cost 3 keys. Each one is a Vault element: opening it is the
 *   only way in the game to get Illusion, Conquest, Passion, Death, Fortune, Slime or
 *   Gluttony on a profile that is not in cheat mode.
 *
 * ## Why the table is generated rather than typed out
 *
 * Fifty-seven hand-written literals would drift the moment an element gained a sixth upgrade
 * slot or an artifact was added. Everything below is derived from `VAULT_ELEMENT_IDS`,
 * `ALL_UPGRADES` and `ARTIFACTS`, so the Vault restocks itself. The only hand-tuned part is
 * the *interleave* — which chests are artifacts — and that is a fixed arithmetic pattern so
 * the layout is identical for every player and every save.
 */

import * as PlayerData from './PlayerData';
import * as CP from './CampaignProgress';
import { ARTIFACTS } from './Artifacts';
import { ITEMS } from './Items';
import { getElementUpgrades } from './Upgrades';
import { VAULT_ELEMENTS } from './ElementRoster';

/** The seven elements the mimics guard, in mimic order. */
export const VAULT_ELEMENT_IDS: string[] = VAULT_ELEMENTS.map((e) => e.id);

export const GOLD_CHEST_COST = 1;
export const MIMIC_CHEST_COST = 3;

/** Chests per ordinary page. Two pages of these, then the mimic page. */
export const CHESTS_PER_PAGE = 25;
export const VAULT_PAGE_COUNT = 3;
/** Index of the mimic page. */
export const MIMIC_PAGE = 2;

export type VaultReward =
  | {
    kind: 'upgrade';
    elementId: string;
    slot: string;
    /** ⚡ Sparks paid alongside the upgrade. */
    sparks: number;
    /** Shop items thrown in on top, by id. */
    items: string[];
  }
  | { kind: 'artifact'; artifactId: string }
  | { kind: 'element'; elementId: string };

export interface VaultChestDef {
  id: string;
  /** 0-based page. 0 and 1 are gold, 2 is the mimic row. */
  page: number;
  /** Position within the page, in reading order. */
  index: number;
  cost: number;
  mimic: boolean;
  reward: VaultReward;
}

// ── Table construction ────────────────────────────────────────────────

/**
 * mulberry32. Used *once, at module load*, to pick which shop items ride along with each
 * upgrade — so the bonus loot is varied but identical on every machine and every reload.
 * Nothing about opening a chest is random at runtime.
 */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Artifact chests sit at these offsets in every run of ten — 15 of the 50, evenly spread. */
const ARTIFACT_OFFSETS = new Set([2, 5, 8]);

function buildChests(): VaultChestDef[] {
  const rng = seeded(0x5eed_1a17);

  // Every upgrade slot of every Vault element, element-major so a page reads as a
  // sweep through the roster rather than a shuffle.
  const upgradeRewards: VaultReward[] = [];
  for (const elementId of VAULT_ELEMENT_IDS) {
    getElementUpgrades(elementId).forEach((up, slotIdx) => {
      // Two or three shop items on top of the upgrade — the chest should feel like a
      // haul, not like a coupon.
      const count = 2 + (rng() < 0.45 ? 1 : 0);
      const items: string[] = [];
      while (items.length < count) {
        const pick = ITEMS[Math.floor(rng() * ITEMS.length)].id;
        if (!items.includes(pick)) items.push(pick);
      }
      upgradeRewards.push({
        kind: 'upgrade',
        elementId,
        slot: up.slot,
        // Later slots are the expensive ones in the shop, so they pay out more here too.
        sparks: 45 + slotIdx * 15,
        items,
      });
    });
  }

  const artifactRewards: VaultReward[] = ARTIFACTS.map((a) => ({ kind: 'artifact', artifactId: a.id }));

  const chests: VaultChestDef[] = [];
  let nextUpgrade = 0;
  let nextArtifact = 0;
  const goldTotal = CHESTS_PER_PAGE * MIMIC_PAGE;

  for (let i = 0; i < goldTotal; i++) {
    // Artifacts first while any remain; once they run out the pattern falls back to
    // upgrades, which is what keeps the two counts from having to agree exactly.
    const wantsArtifact = ARTIFACT_OFFSETS.has(i % 10) && nextArtifact < artifactRewards.length;
    const reward = wantsArtifact
      ? artifactRewards[nextArtifact++]
      : upgradeRewards[nextUpgrade++] ?? artifactRewards[nextArtifact++];
    if (!reward) continue;
    chests.push({
      id: `vault-${i}`,
      page: Math.floor(i / CHESTS_PER_PAGE),
      index: i % CHESTS_PER_PAGE,
      cost: GOLD_CHEST_COST,
      mimic: false,
      reward,
    });
  }

  VAULT_ELEMENT_IDS.forEach((elementId, i) => {
    chests.push({
      id: `vault-mimic-${elementId}`,
      page: MIMIC_PAGE,
      index: i,
      cost: MIMIC_CHEST_COST,
      mimic: true,
      reward: { kind: 'element', elementId },
    });
  });

  return chests;
}

export const VAULT_CHESTS: VaultChestDef[] = buildChests();

export function getChest(id: string): VaultChestDef | undefined {
  return VAULT_CHESTS.find((c) => c.id === id);
}

export function chestsOnPage(page: number): VaultChestDef[] {
  return VAULT_CHESTS.filter((c) => c.page === page);
}

// ── Opening ───────────────────────────────────────────────────────────

export type VaultOpenFailure = 'already-open' | 'no-keys' | 'unknown-chest';

export interface VaultOpenResult {
  ok: boolean;
  failure?: VaultOpenFailure;
  reward?: VaultReward;
}

/**
 * Spends the keys and hands over the contents.
 *
 * Order matters: the chest is only stamped open *after* the keys clear, so a save that
 * cannot afford it is left exactly as it was. Grants themselves are idempotent
 * (`purchaseUpgrade` and `unlockElement` both no-op on a repeat), which is the belt to the
 * `isChestOpened` braces.
 */
export function openVaultChest(slotIdx: 0 | 1 | 2, chestId: string): VaultOpenResult {
  const chest = getChest(chestId);
  if (!chest) return { ok: false, failure: 'unknown-chest' };
  if (CP.isVaultChestOpened(slotIdx, chestId)) return { ok: false, failure: 'already-open' };
  if (!CP.spendKeys(slotIdx, chest.cost)) return { ok: false, failure: 'no-keys' };

  grantReward(slotIdx, chest.reward);
  CP.markVaultChestOpened(slotIdx, chestId);
  return { ok: true, reward: chest.reward };
}

/** Applies a reward with no cost and no bookkeeping — the cheat save's route in. */
export function grantReward(slotIdx: 0 | 1 | 2, reward: VaultReward): void {
  switch (reward.kind) {
    case 'upgrade':
      PlayerData.purchaseUpgrade(reward.elementId, reward.slot);
      CP.addSparks(slotIdx, reward.sparks);
      for (const itemId of reward.items) CP.addItem(slotIdx, itemId);
      break;
    case 'artifact':
      CP.addArtifact(slotIdx, reward.artifactId);
      break;
    case 'element':
      PlayerData.unlockElement(reward.elementId);
      break;
  }
}

/** How many chests on a page this save has already emptied. */
export function openedOnPage(slotIdx: 0 | 1 | 2, page: number): number {
  return chestsOnPage(page).filter((c) => CP.isVaultChestOpened(slotIdx, c.id)).length;
}

export function totalOpened(slotIdx: 0 | 1 | 2): number {
  return VAULT_CHESTS.filter((c) => CP.isVaultChestOpened(slotIdx, c.id)).length;
}
