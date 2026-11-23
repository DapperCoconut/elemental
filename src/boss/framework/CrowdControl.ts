import type { Fighter } from '../../entities/Fighter';

/**
 * Real crowd control for boss signatures. Whoever owns the per-frame body holds (the Isles fight kit)
 * registers itself here for the length of a fight; `BossToolkit.stun/root/silence` route through it, so a
 * prince's freeze is the same stun a gimmick's is — tray icon, disarm, body held — never a speed mult.
 */
export interface CrowdControlImpl {
  stun(f: Fighter, ms: number): void;
  root(f: Fighter, ms: number): void;
  /** Abilities locked (tray icon), movement free. */
  silence(f: Fighter, ms: number): void;
}

let impl: CrowdControlImpl | null = null;

export function setCrowdControl(next: CrowdControlImpl | null): void { impl = next; }
export function crowdControl(): CrowdControlImpl | null { return impl; }
