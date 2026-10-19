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
  water: {
    abilityId: 'bubble-barrage',
    baseName: 'Pain Rain',
    name: 'Bubble Barrage',
    emoji: '🫧',
    description: 'Blow a barrage of 20 bubbles in a cone in front of you. They stick to enemies, up to 4 on one foe — a bubble that reaches a foe already carrying 4 pops on them for 8 damage instead. Each bubble has 75 HP, and any damage it takes passes on to the foe it clings to at 50%, so every splash, blast and puddle that catches a bubbled foe hits them and every bubble on them.',
  },
  shadow: {
    abilityId: 'grim-gloom',
    baseName: 'Black Hole',
    name: 'Grim Gloom',
    emoji: '🌫️',
    description: 'Dark purple fog covers the whole arena for 8 seconds. Every foe gains Hopelessness for as long as it lasts, and anyone who stands still or keeps to one small patch for a moment has tentacles erupt from the floor under them.',
  },
};

export function hasAltUlt(elementId: string): boolean {
  return elementId in ALT_ULTS;
}
