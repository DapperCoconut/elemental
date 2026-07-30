/**
 * The contract behind Ruin's Spikes of Ruin.
 *
 * Every element that puts a *thing* on the board — a building, a turret, a summoned body, a
 * trap, a placed structure — implements `purgeSummons` so a cross-cutting effect can wipe the
 * board inside a circle without knowing what any of those things are. The alternative was a
 * central registry every kit has to keep in sync on spawn and despawn, which is a lifecycle
 * bug per kit waiting to happen; a method each is one place per kit that can never drift.
 *
 * Rules for an implementation:
 * - Only destroy things somebody *built or summoned*. Projectiles in flight, puddles, auras,
 *   decals and status effects are not structures and must survive.
 * - Never touch a `Fighter`. Husks, bots and players take the ability's damage like anybody
 *   else; the purge is for what they put on the floor.
 * - Skip anything owned by `exceptOwner` — the caster's own board is not what is being razed.
 * - Clean up exactly as the kit's own expiry path does (destroy sprites, splice arrays, hand
 *   back anything written onto a fighter), and return how many objects died.
 */
export interface SummonPurgeTarget {
  purgeSummons(x: number, y: number, radius: number, exceptOwner: 'player' | 'npc'): number;
}
