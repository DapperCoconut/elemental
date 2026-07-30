/**
 * The game's audio surface. Everything outside `src/audio/` should import from
 * here and nothing else:
 *
 *   import { Sfx, Music } from '../audio';
 *   Sfx.play('ui-click');
 *   Sfx.hit(damage, x);
 *   Music.play('arena');
 *
 * Every call is safe before the audio context exists — sounds requested before
 * the player's first click are simply dropped rather than queued, which is what
 * you want (nobody wants the menu music to start with a backlog of clicks).
 */

import * as Settings from './AudioSettings';
import * as Synth from './Synth';
import { SOUNDS } from './SoundLibrary';
import { soundForAbility } from './AbilitySounds';
import * as MusicEngine from './Music';

export * as Music from './Music';
export type { TrackName } from './Music';

/** Arena width, used to turn a world x into a stereo position. */
const ARENA_WIDTH = 960;

let installed = false;

/** Volume of anything the opponent does, relative to the player's own actions. */
const NPC_VOLUME = 0.62;

export const Sfx = {
  /**
   * Boots the engine: restores saved volumes and installs the gesture listeners
   * that let the browser start playback. Call once, from `main.ts`.
   */
  init(): void {
    if (installed) return;
    installed = true;

    const prefs = Settings.load();
    Synth.setSfxVolume(prefs.sfx);
    Synth.setMusicVolume(prefs.music);
    Synth.setMuted(prefs.muted);
    Synth.install();

    // Scenes ask for music long before the player clicks anything; once the
    // context unlocks, start whatever was last requested. Bounded so a browser
    // that never grants audio isn't left with a timer running for the session.
    let tries = 0;
    const poll = window.setInterval(() => {
      if (Synth.isReady()) {
        window.clearInterval(poll);
        MusicEngine.resumePending();
      } else if (++tries > 1200) {
        window.clearInterval(poll);
      }
    }, 250);
  },

  /** Plays a named recipe from the sound library. Unknown names are ignored. */
  play(name: string, opts: Synth.PlayOptions = {}): void {
    const recipe = SOUNDS[name];
    if (!recipe) return;
    Synth.render(name, recipe, opts);
  },

  /**
   * Plays a sound positioned in the arena — the stereo image follows the action,
   * so an explosion on the far side of the screen sits on that side.
   */
  playAt(name: string, worldX: number, opts: Synth.PlayOptions = {}): void {
    const pan = Math.max(-0.75, Math.min(0.75, (worldX / ARENA_WIDTH - 0.5) * 1.5));
    Sfx.play(name, { ...opts, pan: (opts.pan ?? 0) + pan });
  },

  /**
   * The sound of an ability being cast. Driven from `Fighter.stampCast`, so this
   * covers every ability in the game without each kit having to opt in.
   */
  ability(
    abilityId: string, elementId: string | undefined, displayKey: string | undefined,
    o: { isPlayer?: boolean; x?: number } = {},
  ): void {
    const resolved = soundForAbility(abilityId, elementId, displayKey);
    if (!resolved) return;
    const volume = resolved.volume * (o.isPlayer === false ? NPC_VOLUME : 1);
    if (o.x !== undefined) Sfx.playAt(resolved.sound, o.x, { rate: resolved.rate, volume });
    else Sfx.play(resolved.sound, { rate: resolved.rate, volume });
  },

  /**
   * A hit landing. The weight of the sound is chosen from the damage so a chip
   * of poison tick and a fully-charged ultimate don't share one thud — and the
   * pitch drifts slightly per hit so a rapid-fire attack doesn't machine-gun the
   * exact same sample.
   */
  hit(amount: number, worldX?: number, isPlayer = true): void {
    const name = amount >= 45 ? 'hit-heavy' : amount >= 15 ? 'hit-medium' : 'hit-light';
    const rate = 0.94 + Math.random() * 0.12;
    const volume = isPlayer ? 1 : NPC_VOLUME + 0.15;
    if (worldX !== undefined) Sfx.playAt(name, worldX, { rate, volume });
    else Sfx.play(name, { rate, volume });
  },

  /** A critical hit — always audible, never throttled away behind other hits. */
  crit(worldX?: number): void {
    if (worldX !== undefined) Sfx.playAt('crit', worldX, { force: true });
    else Sfx.play('crit', { force: true });
  },

  /** Convenience wrappers for the most-used interface sounds. */
  click(): void { Sfx.play('ui-click'); },
  hover(): void { Sfx.play('ui-hover'); },
  back(): void { Sfx.play('ui-back'); },
  denied(): void { Sfx.play('ui-denied'); },

  // ── Settings ────────────────────────────────────────────────────────

  setSfxVolume(v: number): void {
    Synth.setSfxVolume(v);
    persist();
    // A reference blip so dragging the slider demonstrates itself. Deliberately
    // not forced — the recipe's 110ms gap is what throttles a per-frame drag
    // down to something you can actually judge the level from.
    Sfx.play('volume-tick');
  },

  setMusicVolume(v: number): void {
    Synth.setMusicVolume(v);
    persist();
  },

  setMuted(m: boolean): void {
    Synth.setMuted(m);
    persist();
  },

  getSfxVolume(): number { return Synth.getSfxVolume(); },
  getMusicVolume(): number { return Synth.getMusicVolume(); },
  isMuted(): boolean { return Synth.isMuted(); },

  /** True once the browser has let playback start. */
  isReady(): boolean { return Synth.isReady(); },
};

let persistTimer: number | null = null;

/**
 * Debounced write. A slider drag calls the setters once per pointer frame, and
 * a synchronous `JSON.stringify` + `localStorage.setItem` at that rate is enough
 * to make the drag itself stutter — so the write waits for the drag to settle.
 */
function persist(): void {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    Settings.save({
      sfx: Synth.getSfxVolume(),
      music: Synth.getMusicVolume(),
      muted: Synth.isMuted(),
    });
  }, 250);
}
