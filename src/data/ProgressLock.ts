/**
 * A global "none of this counts" switch.
 *
 * Dummy mode is a practice range: you pick a real opponent element, freeze it,
 * and hit it forever. Every persistent counter in the game — mastery stats,
 * achievements, Quantum bond research, Paper's Journal — would otherwise be
 * farmable against a target that cannot fight back, so all of them are routed
 * through this flag rather than each one growing its own mode check.
 *
 * ArenaScene raises the lock in `create()` for a practice fight and lowers it
 * for everything else, so a scene restart can never leave it stuck on. The
 * writers themselves (see `PlayerData`, `QuantumBonds`, `PaperJournal`) are the
 * chokepoint — callers do not have to remember.
 */

let locked = false;

/** Raised by ArenaScene for practice fights; lowered for every real one. */
export function setProgressLocked(value: boolean): void {
  locked = value;
}

/** True while nothing that happens should be written to the save. */
export function isProgressLocked(): boolean {
  return locked;
}
