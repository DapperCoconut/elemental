/**
 * Alternate ultimates: a second Q an element can carry in place of its base one. The choice is
 * made in the customize panel (cheats only for now) and, later, drafted mid-run in Invasion.
 *
 * This file is only the catalogue — names and blurbs for menus. The Ability objects live in
 * `src/elements/AltUltimates.ts`, which the arena uses to swap the Q on a fighter's element.
 *
 * The choice travels as the pseudo upgrade slot `ALT_ULT_SLOT` inside a fighter's upgrade list,
 * so every path that already carries upgrades (scene payloads, the online lobby, a quantum swap,
 * NpcLoadout) carries it too without a protocol change.
 */
export const ALT_ULT_SLOT = 'alt-q';

export interface AltUltInfo {
  /** The ability id of the alternate Q. */
  abilityId: string;
  /** Name of the base ultimate it replaces, for the Base/Alternate toggle. */
  baseName: string;
  name: string;
  emoji: string;
  description: string;
}

export const ALT_ULTS: Record<string, AltUltInfo> = {
  fire: {
    abilityId: 'supernova',
    baseName: 'Flame Nuke',
    name: 'Supernova',
    emoji: '☄️',
    description: 'Rooted in place, pour a beam of fire from your palms that turns only slowly toward the cursor — 45 damage a second to everything in it. Heat builds over you and burns you harder the longer you hold it; press Q again to stop. Hold the full 6 seconds and the beam detonates for 70 more along its length, leaving flaming puddles behind — and sears you for 60.',
  },
};

export function hasAltUlt(elementId: string): boolean {
  return elementId in ALT_ULTS;
}
