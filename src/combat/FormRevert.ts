import { Fighter } from '../entities/Fighter';

/**
 * The contract behind Ruin Mastery's Second Skin.
 *
 * A shard from the shed layer doesn't only hurt — it strips whoever it hits back down to the
 * body they started the match in. Hunt's beast, Justice's flight, Gluttony's butcher, Earth's
 * titan, Fire's flame body, Magnet's board, Acid's burrow, Light's car: every one of them is a
 * *form*, a state the fighter chose to leave their base kit for, and every one of them ends the
 * moment a shard lands.
 *
 * Built exactly like {@link SummonPurgeTarget}, and for the same reason: a central registry of
 * "who is in what form" needs every kit to stay in sync on entry *and* exit, which is a
 * lifecycle bug per kit. One method each can never drift, because the kit that owns the form is
 * the only thing that knows how to end it safely.
 *
 * Rules for an implementation:
 * - Only end things the fighter *transformed into*. A buff, a stance-flavoured status effect,
 *   a held charge or a placed structure is not a form and must survive.
 * - Only touch the form if it belongs to `f`. Kits are two-sided; reverting the wrong side
 *   hands the Ruin player a free cancel on their own abilities.
 * - End it exactly as the kit's own expiry path does — the same restore of speed, hitbox,
 *   texture, ability tray and absorbers — rather than by clearing the flag. Half-ended forms
 *   are how a fighter ends up permanently invisible or permanently un-castable.
 * - Return the display name of each form that actually ended, for the callout. An empty array
 *   means "this fighter was already in their base form", which is not a failure.
 */
export interface FormRevertTarget {
  revertForms(f: Fighter): string[];
}
