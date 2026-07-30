/**
 * Audio preferences.
 *
 * Deliberately kept out of `PlayerData`: volume is a property of the machine
 * you are sitting at, not of a save file. Keeping it in its own key means it
 * survives switching to the cheat profile, wiping a campaign slot, or a corrupt
 * save being discarded.
 */

const KEY = 'elemental_audio';

export interface AudioPrefs {
  sfx: number;
  music: number;
  muted: boolean;
}

const DEFAULTS: AudioPrefs = { sfx: 0.7, music: 0.4, muted: false };

export function load(): AudioPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      return {
        sfx: clamp(p.sfx ?? DEFAULTS.sfx),
        music: clamp(p.music ?? DEFAULTS.music),
        muted: p.muted ?? false,
      };
    }
  } catch {
    // unreadable or unavailable storage — fall through to defaults
  }
  return { ...DEFAULTS };
}

export function save(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable — preferences just won't persist this session
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
