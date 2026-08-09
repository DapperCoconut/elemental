import { AbilityVariantSet } from './AbilityVariants';
import { CODEX } from './codex';
import { LEGACY_PASSIVES } from './codex/legacy';

/**
 * The Ability Codex — the long-form documentation behind the info (ℹ) screen.
 *
 * `Ability.description` is a one-liner because the in-match ability bar renders it under a
 * 90px key cap, and it cannot grow. This is the other half: for each ability, what kind of
 * magic it actually is, every numeric effect it produces, what its shop upgrade changes, and
 * every outcome it can roll. The info screen reads nothing but this.
 *
 * ## Adding an element
 *
 * 1. Write `src/data/codex/<elementId>.ts` exporting a default `ElementCodex`.
 * 2. Add one line to `src/data/codex/index.ts`.
 * 3. Run `node .check-codex.mjs`. It walks the real ability definitions and tells you every
 *    id you missed, every id you documented that no longer exists, and every effect row
 *    missing a number.
 *
 * Nothing here is required for an element to work. An undocumented ability renders a visible
 * "not yet documented" card rather than an empty pane, so gaps are obvious in-game instead of
 * quietly looking finished.
 */

/**
 * What kind of thing an effect row is. Drives the row's colour and its chip, so a reader can
 * skim a wall of detail and still see at a glance that an ability is control-heavy or that
 * its damage is all damage-over-time.
 */
export type EffectTag =
  | 'damage'    // direct, on-hit
  | 'dot'       // damage over time
  | 'heal'      // restores health
  | 'shield'    // absorbs or blocks
  | 'control'   // stun, root, slow, knockback, displacement of the target
  | 'debuff'    // makes the target take more / deal less / see less
  | 'buff'      // makes you deal more / move faster / recharge sooner
  | 'movement'  // moves *you*
  | 'summon'    // puts a persistent thing in the world
  | 'resource'  // spends or generates a kit resource
  | 'area'      // the shape, size and lifetime of the thing
  | 'cost'      // what it takes from you: self-damage, lockout, cooldown penalty
  | 'utility';  // everything else worth stating

export interface CodexEffect {
  tag: EffectTag;
  /** Three or four words naming the mechanic. Becomes the bold lead of the row. */
  label: string;
  /**
   * The numbers. Every damage figure, radius, duration, tick rate, cap and stack limit that
   * the kit actually implements. This is the field the whole screen exists for — a row that
   * says "deals heavy damage" is a bug.
   */
  detail: string;
  /** Only in play once this shop upgrade slot is owned ('click' | 'e' | 'r' | 'f' | 'q'). */
  requiresUpgrade?: string;
  /** Only in play with this perk equipped. */
  requiresPerk?: string;
  /** Only in play while the element's mastery is switched on. */
  requiresMastery?: boolean;
}

export interface AbilityCodexEntry {
  /**
   * The kind of magic: what the caster is physically doing and what the arena does back.
   * Two to four sentences, written to match what the ability actually looks like on screen.
   * Flavour, but flavour that teaches — it should leave a reader able to recognise the
   * ability by sight.
   */
  magic: string;
  /** The input: tap or hold, what it aims at, what it locks, how long the wind-up runs. */
  cast: string;
  /** Every mechanical effect of the base ability. */
  effects: CodexEffect[];
  /** What the element's shop upgrade for this slot changes, in the same detail. */
  upgrade?: {
    /** How the upgrade re-frames the ability, if it changes the fantasy and not just numbers. */
    magic?: string;
    effects: CodexEffect[];
  };
  /** Every outcome a random or selectable ability can produce. */
  variants?: AbilityVariantSet;
  /** Interactions that are not obvious from the effect list. Kept short and specific. */
  notes?: string[];
}

/** An always-on mechanic that is not bound to a key. */
export interface PassiveCodexEntry {
  emoji: string;
  name: string;
  magic: string;
  effects: CodexEffect[];
  notes?: string[];
  /**
   * Index into the element's form tabs (Hunt's three, Gluttony's two). Omit for passives that
   * apply in every form.
   */
  form?: number;
}

/**
 * A documented thing that is not an ability: a perk, or one mastery enhancement.
 *
 * Same shape as an ability entry minus the parts only a keyed ability has (upgrade, variants).
 * Perks and mastery enhancements already carry a one-line `description` in `Perks.ts` /
 * `Mastery.ts` for the shop and loadout screens; this is the long form, exactly as the codex
 * is the long form of `Ability.description`.
 */
export interface SubjectCodexEntry {
  magic: string;
  /** How it is used. Omit for anything permanently on. */
  cast?: string;
  effects: CodexEffect[];
  /**
   * Every outcome a random or selectable subject can produce — the same table an ability gets.
   * A mastery enhancement can be as full of possibilities as a key is (Fate's Tarot rolls one of
   * nine curses; Subterfuge's theft has a dozen crooked versions), and listing them in `effects`
   * would say they all happen at once.
   */
  variants?: AbilityVariantSet;
  notes?: string[];
}

export interface ElementCodex {
  /**
   * One or two sentences on what the element is for — the sentence you would say to somebody
   * choosing between it and the element next to it on the grid.
   */
  identity: string;
  passives?: PassiveCodexEntry[];
  /** Keyed by `Ability.id`, not by display key — Hunt and Gluttony reuse keys across forms. */
  abilities: Record<string, AbilityCodexEntry>;
  /** Keyed by perk id, as in `data/Perks.ts`. */
  perks?: Record<string, SubjectCodexEntry>;
  /** Keyed by mastery enhancement id, as in `data/Mastery.ts`. */
  mastery?: Record<string, SubjectCodexEntry>;
}

/** The codex for an element, or undefined if it has not been written yet. */
export function getElementCodex(elementId: string): ElementCodex | undefined {
  return CODEX[elementId];
}

/** The codex entry for one ability, or undefined if it has not been written yet. */
export function getAbilityCodex(elementId: string, abilityId: string): AbilityCodexEntry | undefined {
  return CODEX[elementId]?.abilities[abilityId];
}

/**
 * Passives for an element, narrowed to a form tab when the element has them.
 *
 * Falls back to `codex/legacy.ts` — the passive text that used to be hardcoded in the info
 * screen — for elements whose real codex has not been written yet. A written codex always wins,
 * so migrating an element is a matter of deleting its legacy entry.
 */
export function getPassiveCodex(elementId: string, form = 0): PassiveCodexEntry[] {
  const all = CODEX[elementId]?.passives ?? LEGACY_PASSIVES[elementId] ?? [];
  return all.filter((p) => p.form === undefined || p.form === form);
}

/** True while an element is still showing the old hardcoded passive text. */
export function usesLegacyPassives(elementId: string): boolean {
  return !CODEX[elementId]?.passives && !!LEGACY_PASSIVES[elementId];
}

/** The long-form entry for a perk, or undefined if it has not been written yet. */
export function getPerkCodex(elementId: string, perkId: string): SubjectCodexEntry | undefined {
  return CODEX[elementId]?.perks?.[perkId];
}

/** The long-form entry for a mastery enhancement, or undefined. */
export function getMasteryCodex(elementId: string, enhId: string): SubjectCodexEntry | undefined {
  return CODEX[elementId]?.mastery?.[enhId];
}

/**
 * Stable showcase key for a passive. Passives have no id of their own — they are a positional
 * list — so the name is slugged rather than the index used, or reordering a list would
 * silently repoint every loop.
 */
export function passiveSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** True once an element has any codex content at all. */
export function isElementDocumented(elementId: string): boolean {
  return CODEX[elementId] !== undefined;
}

/** Documented / total across the whole roster — shown on the info screen footer. */
export function codexCoverage(totalAbilities: number): { done: number; total: number } {
  let done = 0;
  for (const id of Object.keys(CODEX)) done += Object.keys(CODEX[id].abilities).length;
  return { done, total: totalAbilities };
}

// ── Presentation tokens ───────────────────────────────────────────────

/** Chip label and colour per tag. Shared by the info screen so tags read consistently. */
export const TAG_STYLE: Record<EffectTag, { label: string; color: number; text: string }> = {
  damage:   { label: 'DMG',    color: 0xff6b5c, text: '#ffb3aa' },
  dot:      { label: 'OVER T', color: 0xff9a3c, text: '#ffcf9a' },
  heal:     { label: 'HEAL',   color: 0x4ade80, text: '#a6f0c2' },
  shield:   { label: 'GUARD',  color: 0x7dd3fc, text: '#bfe8ff' },
  control:  { label: 'CTRL',   color: 0xa78bfa, text: '#d4c6ff' },
  debuff:   { label: 'DEBUFF', color: 0xf472b6, text: '#ffc0de' },
  buff:     { label: 'BUFF',   color: 0xfacc15, text: '#ffe98a' },
  movement: { label: 'MOVE',   color: 0x38bdf8, text: '#a8dcff' },
  summon:   { label: 'SUMMON', color: 0x94a3b8, text: '#cbd5e1' },
  resource: { label: 'COST',   color: 0xfbbf24, text: '#ffd98a' },
  area:     { label: 'AREA',   color: 0x5eead4, text: '#a8f0e4' },
  cost:     { label: 'RISK',   color: 0xef4444, text: '#ff9c9c' },
  utility:  { label: 'MISC',   color: 0x8a8ab0, text: '#b9b9d4' },
};
