/**
 * The three control hints the in-match ability tray prints under an ability's name. The tray
 * carries no descriptions — that is the Codex's job — so these are the only "how do I use it"
 * the player sees mid-fight:
 *
 *   - `rmb`    right-click does something for this ability
 *   - `hold`   the key (or button) can be held — to charge, channel, aim or keep firing
 *   - `recast` pressing the key again while it is out does something (a toggle, a detonation,
 *              a second placement, a recall)
 *
 * Keyed by ability id. An ability that is none of the three is simply absent. Read off each
 * element's ability text and its Codex `cast` line; keep it current when an ability's controls
 * change.
 */
export type AbilityTag = 'rmb' | 'hold' | 'recast';

export const ABILITY_TAGS: Record<string, readonly AbilityTag[]> = {
  // Fire
  'flame-body': ['recast'],
  // Water
  'pressure-dagger': ['hold'],
  // Earth
  bash: ['hold'],
  'biome-builder': ['recast'],
  // Oil
  'drone-command': ['hold'],
  'barrel-roll': ['recast'],
  // Shadow
  'shadow-caltrop': ['hold'],
  // Ice
  'block-up': ['recast'],
  skate: ['recast'],
  // Crystal
  'crystal-portal': ['recast'],
  // Soul
  'soul-lantern': ['rmb', 'hold'],
  // Hunt
  'hunt-hook': ['recast'],
  // Time
  'time-barrage': ['hold'],
  'time-timeless': ['recast'],
  // Gravity
  'space-slash': ['hold'],
  'meteor-rain': ['hold'],
  'grav-bomb': ['hold'],
  // Creation
  'dagger-spray': ['hold'],
  'charged-bolt': ['hold'],
  'creation-block': ['hold'],
  // Electricity
  'electro-dash': ['recast'],
  'pain-battery': ['hold'],
  // Acid
  'snake-burrow': ['recast'],
  // Sound
  fermata: ['recast'],
  // Light
  'light-lance': ['hold'],
  // Magnet
  'magnet-coin': ['hold'],
  'magnet-nail': ['recast'],
  'magnet-spike': ['recast'],
  // Metal
  'metal-blood-transfusion': ['hold'],
  // Plasma
  'plasma-current': ['hold', 'recast'],
  // Gunpowder
  'gunpowder-arsenal-expansion': ['rmb'],
  // Rubber
  'rubber-punch': ['hold'],
  'rubber-sling': ['hold'],
  'rubber-band': ['hold', 'recast'],
  // Magic
  'magic-grimoire': ['hold'],
  'magic-anchor': ['rmb'],
  'magic-necronomicon': ['hold'],
  // Technology
  'tech-webdrag': ['hold'],
  // Echo
  'echo-lantern': ['recast'],
  // Subterfuge
  'sub-spray': ['hold'],
  'sub-recruit': ['hold'],
  // Quantum
  'quantum-splicers': ['hold'],
  // Justice
  'justice-sheer-will': ['recast'],
  'justice-bind': ['recast'],
  // Dream
  'dream-sandmen': ['hold'],
  'dream-delve': ['recast'],
  // Paint
  'paint-splotch': ['rmb'],
  'paint-still-life': ['rmb'],
  'paint-masterpiece': ['rmb'],
  // Magma
  'magma-mutiny': ['recast'],
  // Wax
  'wax-hive-hearth': ['recast'],
  'wax-sticky-bombs': ['recast'],
  // Clay
  'clay-clot': ['hold'],
  'clay-slink': ['recast'],
  'clay-fuse': ['recast'],
  // Depths
  'depths-angler': ['recast'],
  // Sand
  'dune-striker': ['hold'],
  // Devotion
  'passion-sermon': ['hold'],
  // Paper
  'paper-storybook': ['rmb'],
  'paper-plane': ['hold'],
  // Gold
  'fortune-fray': ['hold'],
  // Cloth
  'cloth-pin': ['hold'],
  'cloth-longpin': ['recast'],
  'cloth-safety-line': ['recast'],
  // Marrow
  'marrow-antibody': ['hold'],
  // Myth
  'myth-whip': ['rmb', 'hold'],
  'myth-truth': ['recast'],
  'myth-determination': ['recast'],
  'myth-beast': ['recast'],
  'myth-pistol': ['hold'],
  // Psychic
  'psychic-en-passant': ['hold'],
  // Radiation
  'radiation-railgun': ['hold'],
  // Bind
  'bind-summon': ['hold'],
  // Slime
  'gum-grab': ['hold'],
  // Harvest
  'harvest-sickle': ['rmb', 'hold'],
};

/** The tags for one ability id, in tray order. Empty for an ability with none. */
export function abilityTags(abilityId: string): readonly AbilityTag[] {
  return ABILITY_TAGS[abilityId] ?? [];
}
