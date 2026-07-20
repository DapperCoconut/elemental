/**
 * Cheat-mode coordination.
 *
 * This module is deliberately import-free so that PlayerData / CampaignProgress
 * can depend on it for storage namespacing without creating an import cycle.
 * The "build a maxed-out save" logic lives in CheatSave.ts, which is allowed to
 * import everything.
 *
 * Cheat mode works by namespacing the save keys: when active, PlayerData writes
 * to `elemental_save__cheat` instead of `elemental_save`. The real save is never
 * touched, so toggling back restores legitimate progress exactly as it was.
 */

const META_KEY = 'elemental_cheats';

/** Suffix appended to every save key while cheat mode is active. */
const CHEAT_SUFFIX = '__cheat';

/** Logo clicks required on the title screen to unlock the cheat menu. */
export const LOGO_CLICK_TARGET = 100;

interface CheatMeta {
  logoClicks: number;
  unlocked: boolean;
  active: boolean;
}

function loadMeta(): CheatMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CheatMeta>;
      return {
        logoClicks: parsed.logoClicks ?? 0,
        unlocked: parsed.unlocked ?? false,
        active: parsed.active ?? false,
      };
    }
  } catch {
    // corrupted — start fresh
  }
  return { logoClicks: 0, unlocked: false, active: false };
}

function saveMeta(meta: CheatMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // storage unavailable — silently ignore
  }
}

// ── Storage namespacing ──────────────────────────────────────────────

/**
 * Maps a base save key to the key actually in use. Callers must invoke this on
 * every read/write rather than caching the result — the namespace changes at
 * runtime when the player toggles cheat mode.
 */
export function saveKey(base: string): string {
  return loadMeta().active ? base + CHEAT_SUFFIX : base;
}

/** Reads a namespaced key regardless of which mode is currently active. */
export function rawKeyFor(base: string, cheat: boolean): string {
  return cheat ? base + CHEAT_SUFFIX : base;
}

// ── Unlock progress ──────────────────────────────────────────────────

export function getLogoClicks(): number {
  return loadMeta().logoClicks;
}

/** Registers one logo click and returns the new total. */
export function bumpLogoClicks(): number {
  const meta = loadMeta();
  if (meta.unlocked) return meta.logoClicks;
  meta.logoClicks = Math.min(LOGO_CLICK_TARGET, meta.logoClicks + 1);
  if (meta.logoClicks >= LOGO_CLICK_TARGET) meta.unlocked = true;
  saveMeta(meta);
  return meta.logoClicks;
}

/**
 * 0–1 click progress toward the unlock. Callers decide what to do once
 * unlocked — the title logo, for one, reverts to orange outside cheat mode.
 */
export function getLogoProgress(): number {
  return Math.min(1, loadMeta().logoClicks / LOGO_CLICK_TARGET);
}

export function isUnlocked(): boolean {
  return loadMeta().unlocked;
}

export function unlock(): void {
  const meta = loadMeta();
  meta.unlocked = true;
  meta.logoClicks = LOGO_CLICK_TARGET;
  saveMeta(meta);
}

// ── Mode toggle ──────────────────────────────────────────────────────

export function isCheatMode(): boolean {
  return loadMeta().active;
}

export function setCheatMode(on: boolean): void {
  const meta = loadMeta();
  meta.active = on;
  saveMeta(meta);
}

/** True once a cheat save has been written (i.e. the namespaced key exists). */
export function cheatSaveExists(): boolean {
  try {
    return localStorage.getItem(rawKeyFor('elemental_save', true)) !== null;
  } catch {
    return false;
  }
}

/** Wipes the cheat-namespace saves. The real save is untouched. */
export function deleteCheatSave(): void {
  try {
    localStorage.removeItem(rawKeyFor('elemental_save', true));
    localStorage.removeItem(rawKeyFor('elemental_campaign', true));
  } catch {
    // storage unavailable
  }
}
