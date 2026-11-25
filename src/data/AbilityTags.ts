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
  // Fear (element id `silence`): Haunt is recast to swing the hook, and again to slam whoever it caught
  'fear-haunt': ['recast'],
  // Water
  'pressure-dagger': ['hold'],
  // Earth
  bash: ['hold'],
  'biome-builder': ['recast'],
  // Oil
  'drone-command': ['rmb', 'hold'],
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
  // Fate
  'fate-dice-of-doom': ['hold', 'recast'],
  'fate-all-in': ['recast'],
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
  // Venom (right click on Inject is the Click+ Self-Inject; F drinks a Consume bottle before it dives)
  'venom-inject': ['rmb', 'hold'],
  'pick-your-poison': ['hold'],
  'acid-reflux': ['recast'],
  'venom-burrow': ['recast'],
  // Sound
  fermata: ['recast'],
  // Light
  'light-lance': ['hold'],
  'light-supernova': ['recast'],
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
  'cloth-scarf-hand': ['hold'],
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
  'bind-daggers': ['rmb', 'hold'],
  'bind-chain': ['recast'],
  'bind-siphon': ['recast'],
  // Savor (id gum)
  'savor-salt-infusion': ['recast'],
  // Wood
  'wood-carverang': ['rmb'],
  // Pressure: everything is held to charge. Release banks its charge and fires on a tap.
  'pressure-punch': ['hold'],
  'pressure-slam': ['hold'],
  'pressure-point': ['hold'],
  'pressure-release': ['hold'],
  // Ink: Skedaddle is held to run; the anvil is pulled with F and dropped with a click.
  'ink-skedaddle': ['hold'],
  'ink-anvil': ['recast'],
  // Memory
  'memory-rebirth': ['recast'],
  // String: R again snaps the hex strand.
  'string-hexing-strand': ['recast'],
};

/** The tags for one ability id, in tray order. Empty for an ability with none. */
export function abilityTags(abilityId: string): readonly AbilityTag[] {
  return ABILITY_TAGS[abilityId] ?? [];
}
