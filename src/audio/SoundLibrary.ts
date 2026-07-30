/**
 * Every sound in Elemental, written as a recipe.
 *
 * Nothing here is a sample — each entry is a stack of oscillators and filtered
 * noise that `Synth.ts` renders on demand. Recipes are grouped by what they are
 * for; `AbilitySounds.ts` then maps all ~200 ability ids onto the combat entries
 * below, so adding an ability never means adding a sound unless you want a
 * bespoke one.
 *
 * Rules of thumb used throughout:
 *   • Noise carries the *texture* (fire hisses, metal rings, water splashes).
 *   • A pitched layer carries the *weight* — a low sine drop is what makes a hit
 *     feel heavy, and what a plain noise burst always lacks.
 *   • Downward pitch = impact and landing. Upward pitch = charge, pickup, reward.
 *   • Inharmonic FM ratios (1.4, 2.7, 3.3) read as metal, bell and glass; whole
 *     ratios (2, 3) read as musical and warm.
 */

import {
  Layer, SoundRecipe, arp, drop, noise, repeat, rise, semi, stack, tone,
} from './Synth';

/** Shorthand for building a recipe from a flat list of layers. */
function fx(layers: Layer[], o: Partial<SoundRecipe> = {}): SoundRecipe {
  return { layers, ...o };
}

export const SOUNDS: Record<string, SoundRecipe> = {

  // ══ Interface ═══════════════════════════════════════════════════════

  'ui-hover': fx([
    tone(660, 0.05, { wave: 'sine', gain: 0.10, attack: 0.002, release: 0.04 }),
    tone(990, 0.04, { wave: 'sine', gain: 0.05, attack: 0.001, release: 0.03 }),
  ], { minGap: 45 }),

  'ui-click': fx([
    tone(880, 0.07, { wave: 'square', gain: 0.13, freqEnd: 1180, attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.05 }),
    tone(440, 0.09, { wave: 'triangle', gain: 0.10, freqEnd: 590, attack: 0.001, release: 0.06 }),
    noise(0.03, { gain: 0.07, color: 'white', filter: { type: 'highpass', freq: 2600 }, release: 0.02 }),
  ], { minGap: 25 }),

  'ui-back': fx([
    tone(520, 0.09, { wave: 'square', gain: 0.11, freqEnd: 330, attack: 0.001, release: 0.06 }),
    tone(260, 0.10, { wave: 'triangle', gain: 0.08, freqEnd: 165, release: 0.07 }),
  ], { minGap: 25 }),

  'ui-denied': fx([
    tone(180, 0.16, { wave: 'square', gain: 0.14, freqEnd: 120, attack: 0.002, release: 0.09 }),
    tone(181.5, 0.16, { wave: 'square', gain: 0.09, freqEnd: 121, detune: 18, release: 0.09 }),
  ], { minGap: 120 }),

  'ui-toggle-on': fx([
    tone(520, 0.07, { wave: 'square', gain: 0.10, attack: 0.001, release: 0.04 }),
    tone(780, 0.10, { wave: 'triangle', gain: 0.12, delay: 0.05, attack: 0.002, release: 0.07 }),
  ]),

  'ui-toggle-off': fx([
    tone(700, 0.07, { wave: 'square', gain: 0.10, attack: 0.001, release: 0.04 }),
    tone(440, 0.10, { wave: 'triangle', gain: 0.10, delay: 0.05, attack: 0.002, release: 0.07 }),
  ]),

  'ui-tab': fx([
    tone(1180, 0.05, { wave: 'sine', gain: 0.11, attack: 0.001, release: 0.04 }),
    noise(0.025, { gain: 0.05, filter: { type: 'highpass', freq: 3400 } }),
  ], { minGap: 40 }),

  // A modal or panel opening: a soft swell with a rising tail behind it.
  'ui-open': fx([
    noise(0.24, { gain: 0.10, color: 'pink', filter: { type: 'lowpass', freq: 500, freqEnd: 3200 }, attack: 0.05, release: 0.14 }),
    rise(330, 660, 0.22, { gain: 0.10, attack: 0.03, release: 0.12 }),
    ...stack(660, 0.3, [1, 1.5], { gain: 0.06, delay: 0.06, attack: 0.05, release: 0.2, reverb: 0.2 }),
  ]),

  'ui-close': fx([
    noise(0.18, { gain: 0.09, color: 'pink', filter: { type: 'lowpass', freq: 2800, freqEnd: 400 }, attack: 0.005, release: 0.12 }),
    drop(560, 240, 0.16, { gain: 0.09, release: 0.11 }),
  ]),

  // Buying something: a coin-bright chime over a satisfying mechanical clack.
  'ui-purchase': fx([
    ...arp(784, [0, 4, 7, 12], 0.13, 0.055, { wave: 'triangle', gain: 0.16, reverb: 0.22 }),
    noise(0.05, { gain: 0.09, filter: { type: 'bandpass', freq: 3000, q: 2 } }),
    drop(300, 180, 0.12, { gain: 0.10 }),
  ], { minGap: 90 }),

  'ui-equip': fx([
    tone(560, 0.09, { wave: 'square', gain: 0.10, freqEnd: 840, release: 0.05 }),
    noise(0.06, { gain: 0.10, color: 'white', filter: { type: 'bandpass', freq: 2400, q: 1.6 } }),
    tone(1120, 0.14, { wave: 'sine', gain: 0.09, delay: 0.06, attack: 0.003, release: 0.1, reverb: 0.25 }),
  ]),

  'ui-drag': fx([
    noise(0.05, { gain: 0.06, color: 'pink', filter: { type: 'bandpass', freq: 900, q: 1 } }),
    tone(420, 0.05, { wave: 'sine', gain: 0.06 }),
  ], { minGap: 70 }),

  'ui-drop': fx([
    drop(340, 190, 0.11, { gain: 0.11 }),
    noise(0.05, { gain: 0.08, color: 'brown', filter: { type: 'lowpass', freq: 1200 } }),
  ]),

  'ui-toast': fx([
    ...arp(660, [0, 7], 0.16, 0.07, { wave: 'sine', gain: 0.11, reverb: 0.28 }),
  ], { minGap: 150 }),

  'ui-page': fx([
    noise(0.11, { gain: 0.09, color: 'white', filter: { type: 'bandpass', freq: 1800, freqEnd: 4200, q: 0.9 }, attack: 0.01, release: 0.07 }),
  ], { minGap: 60 }),

  'ui-scroll': fx([
    tone(1400, 0.03, { wave: 'sine', gain: 0.05, attack: 0.001, release: 0.02 }),
  ], { minGap: 55 }),

  // Reference blip for the volume sliders. Its own long gap is what keeps a
  // drag — which fires a pointermove every frame — from machine-gunning.
  'volume-tick': fx([
    tone(880, 0.06, { wave: 'triangle', gain: 0.16, attack: 0.002, release: 0.04 }),
    noise(0.03, { gain: 0.06, filter: { type: 'highpass', freq: 2600 } }),
  ], { minGap: 110 }),

  'ui-type': fx([
    noise(0.02, { gain: 0.05, filter: { type: 'highpass', freq: 3000 } }),
  ], { minGap: 18 }),

  // ══ Progression and rewards ═════════════════════════════════════════

  'scene-transition': fx([
    noise(0.42, { gain: 0.12, color: 'pink', filter: { type: 'bandpass', freq: 300, freqEnd: 4000, q: 0.7 }, attack: 0.14, release: 0.24 }),
    rise(180, 720, 0.4, { gain: 0.09, attack: 0.12, release: 0.2, reverb: 0.3 }),
  ], { minGap: 200 }),

  'unlock': fx([
    ...arp(523, [0, 4, 7, 12, 16], 0.34, 0.075, { wave: 'triangle', gain: 0.17, reverb: 0.4 }),
    ...stack(523, 0.9, [1, 2, 3], { gain: 0.10, delay: 0.36, attack: 0.03, release: 0.5, reverb: 0.5 }),
    noise(0.5, { gain: 0.07, color: 'white', filter: { type: 'highpass', freq: 4000 }, attack: 0.02, release: 0.4, delay: 0.3 }),
  ], { minGap: 400, important: true }),

  'achievement': fx([
    ...arp(659, [0, 5, 9, 12], 0.3, 0.09, { wave: 'sine', gain: 0.18, reverb: 0.45 }),
    ...stack(1318, 1.0, [1, 1.5, 2], { gain: 0.09, delay: 0.36, attack: 0.05, release: 0.6, reverb: 0.6 }),
  ], { minGap: 500, important: true }),

  'level-up': fx([
    ...arp(392, [0, 7, 12, 19, 24], 0.28, 0.07, { wave: 'triangle', gain: 0.16, reverb: 0.35 }),
    rise(120, 480, 0.5, { gain: 0.10, wave: 'sawtooth', filter: { type: 'lowpass', freq: 600, freqEnd: 3000 } }),
  ], { minGap: 400, important: true }),

  'shard-gain': fx([
    tone(1568, 0.16, { wave: 'sine', gain: 0.13, attack: 0.002, release: 0.13, reverb: 0.3 }),
    tone(2350, 0.12, { wave: 'sine', gain: 0.07, delay: 0.04, release: 0.1, reverb: 0.3 }),
  ], { minGap: 45 }),

  'nucleus-gain': fx([
    ...stack(440, 0.7, [1, 2, 3.01, 4.2], { gain: 0.12, attack: 0.01, release: 0.5, reverb: 0.5, fm: { ratio: 1.41, index: 0.6, indexEnd: 0.05 } }),
  ], { minGap: 300, important: true }),

  'reward-big': fx([
    ...arp(261, [0, 4, 7, 12, 16, 19, 24], 0.5, 0.085, { wave: 'triangle', gain: 0.15, reverb: 0.5 }),
    noise(0.9, { gain: 0.08, color: 'white', filter: { type: 'highpass', freq: 3000 }, attack: 0.1, release: 0.6 }),
    drop(90, 55, 0.9, { gain: 0.14, wave: 'sine', attack: 0.02, release: 0.6 }),
  ], { minGap: 600, important: true }),

  'star': fx([
    rise(1200, 2400, 0.22, { wave: 'sine', gain: 0.13, reverb: 0.4 }),
    tone(3200, 0.16, { wave: 'sine', gain: 0.06, delay: 0.1, reverb: 0.4 }),
  ], { minGap: 80 }),

  'countdown-tick': fx([
    tone(880, 0.14, { wave: 'square', gain: 0.14, attack: 0.002, decay: 0.05, sustain: 0.1, release: 0.08 }),
    drop(220, 160, 0.16, { gain: 0.10 }),
  ], { minGap: 200, important: true }),

  'countdown-go': fx([
    ...stack(523, 0.5, [1, 1.5, 2], { gain: 0.18, attack: 0.004, release: 0.35, reverb: 0.35 }),
    noise(0.3, { gain: 0.12, color: 'white', filter: { type: 'highpass', freq: 1800 }, release: 0.24 }),
    drop(160, 60, 0.4, { gain: 0.16, release: 0.3 }),
  ], { minGap: 300, important: true }),

  'victory': fx([
    ...arp(392, [0, 4, 7, 12], 0.5, 0.11, { wave: 'triangle', gain: 0.18, reverb: 0.5 }),
    ...stack(784, 1.4, [1, 1.25, 1.5, 2], { gain: 0.11, delay: 0.44, attack: 0.03, release: 0.9, reverb: 0.6 }),
    noise(1.2, { gain: 0.07, color: 'pink', filter: { type: 'highpass', freq: 2200 }, attack: 0.3, release: 0.8, delay: 0.4 }),
  ], { minGap: 1000, important: true }),

  'defeat': fx([
    ...stack(196, 1.6, [1, 1.19, 1.42], { gain: 0.14, wave: 'sawtooth', attack: 0.04, release: 1.1, reverb: 0.5, filter: { type: 'lowpass', freq: 1400, freqEnd: 300 } }),
    drop(110, 42, 1.8, { gain: 0.16, attack: 0.05, release: 1.2 }),
  ], { minGap: 1000, important: true }),

  'boss-intro': fx([
    ...stack(55, 2.2, [1, 1.5, 2, 2.5], { gain: 0.16, wave: 'sawtooth', attack: 0.4, release: 1.4, reverb: 0.6, filter: { type: 'lowpass', freq: 200, freqEnd: 1400 } }),
    noise(2.4, { gain: 0.11, color: 'brown', filter: { type: 'lowpass', freq: 400 }, attack: 0.8, release: 1.4 }),
  ], { minGap: 2000, important: true }),

  'boss-phase': fx([
    drop(320, 70, 1.1, { gain: 0.2, wave: 'sawtooth', attack: 0.01, release: 0.7, reverb: 0.5 }),
    noise(1.2, { gain: 0.14, color: 'brown', filter: { type: 'lowpass', freq: 2400, freqEnd: 160 }, release: 0.8 }),
    ...stack(110, 1.3, [1, 1.41, 2.1], { gain: 0.1, wave: 'square', delay: 0.05, release: 0.9, reverb: 0.4 }),
  ], { minGap: 900, important: true }),

  // ══ Core combat ═════════════════════════════════════════════════════

  // Three weights of hit. Which one plays is chosen by damage in `Sfx.hit()`.
  'hit-light': fx([
    noise(0.07, { gain: 0.16, color: 'white', filter: { type: 'bandpass', freq: 1900, freqEnd: 700, q: 0.9 }, release: 0.05 }),
    drop(340, 150, 0.09, { gain: 0.14, release: 0.06 }),
  ], { minGap: 22 }),

  'hit-medium': fx([
    noise(0.12, { gain: 0.2, color: 'white', filter: { type: 'lowpass', freq: 2600, freqEnd: 500 }, release: 0.08 }),
    drop(240, 90, 0.15, { gain: 0.2, release: 0.1 }),
  ], { minGap: 28 }),

  'hit-heavy': fx([
    noise(0.22, { gain: 0.22, color: 'brown', filter: { type: 'lowpass', freq: 2200, freqEnd: 220 }, release: 0.15 }),
    drop(180, 48, 0.3, { gain: 0.26, release: 0.2 }),
    tone(90, 0.26, { wave: 'square', gain: 0.1, freqEnd: 40, release: 0.18 }),
  ], { minGap: 40 }),

  'crit': fx([
    noise(0.16, { gain: 0.22, color: 'white', filter: { type: 'bandpass', freq: 4200, freqEnd: 1200, q: 1.2 }, release: 0.11 }),
    drop(1300, 320, 0.18, { wave: 'sawtooth', gain: 0.16, release: 0.12 }),
    drop(200, 60, 0.26, { gain: 0.2, release: 0.18 }),
    tone(2600, 0.1, { wave: 'sine', gain: 0.1, delay: 0.02, reverb: 0.3 }),
  ], { minGap: 60, important: true }),

  // Shields: a charge blocking a hit rings; shield HP soaking it just thuds dully.
  'shield-block': fx([
    ...stack(620, 0.34, [1, 2.02, 3.3], { gain: 0.14, attack: 0.002, release: 0.26, reverb: 0.35, fm: { ratio: 1.7, index: 0.4, indexEnd: 0.02 } }),
    noise(0.09, { gain: 0.1, filter: { type: 'highpass', freq: 2600 } }),
  ], { minGap: 45 }),

  'shield-absorb': fx([
    tone(300, 0.16, { wave: 'sine', gain: 0.15, freqEnd: 210, attack: 0.004, release: 0.12 }),
    noise(0.13, { gain: 0.09, color: 'pink', filter: { type: 'lowpass', freq: 900 }, release: 0.1 }),
  ], { minGap: 35 }),

  'shield-break': fx([
    noise(0.4, { gain: 0.2, color: 'white', filter: { type: 'highpass', freq: 1400, freqEnd: 5200 }, release: 0.3 }),
    ...repeat(tone(1800, 0.14, { wave: 'triangle', gain: 0.1, freqEnd: 1200, reverb: 0.35 }), 5, 0.035, { rate: 1.17, gain: 0.78 }),
    drop(260, 80, 0.3, { gain: 0.14 }),
  ], { minGap: 200 }),

  'shield-up': fx([
    rise(220, 560, 0.35, { wave: 'sine', gain: 0.14, attack: 0.05, release: 0.22, reverb: 0.3 }),
    ...stack(560, 0.4, [1, 1.5], { gain: 0.07, delay: 0.24, attack: 0.03, release: 0.3, reverb: 0.4 }),
  ], { minGap: 150 }),

  'heal': fx([
    ...arp(523, [0, 7, 12], 0.34, 0.075, { wave: 'sine', gain: 0.13, attack: 0.02, reverb: 0.4 }),
    noise(0.4, { gain: 0.05, color: 'pink', filter: { type: 'highpass', freq: 3200 }, attack: 0.1, release: 0.24 }),
  ], { minGap: 220 }),

  'death-player': fx([
    ...stack(220, 1.5, [1, 1.19, 1.5], { gain: 0.15, wave: 'sawtooth', freqEnd: 55, attack: 0.01, release: 1.0, reverb: 0.5, filter: { type: 'lowpass', freq: 2200, freqEnd: 260 } }),
    noise(1.2, { gain: 0.14, color: 'brown', filter: { type: 'lowpass', freq: 1600, freqEnd: 120 }, release: 0.9 }),
  ], { minGap: 600, important: true }),

  'death-npc': fx([
    drop(420, 70, 0.7, { wave: 'sawtooth', gain: 0.16, release: 0.45, filter: { type: 'lowpass', freq: 2600, freqEnd: 400 }, reverb: 0.35 }),
    noise(0.6, { gain: 0.14, color: 'brown', filter: { type: 'lowpass', freq: 2000, freqEnd: 200 }, release: 0.4 }),
    drop(140, 45, 0.5, { gain: 0.12 }),
  ], { minGap: 90, important: true }),

  // Movement.
  'dash': fx([
    noise(0.24, { gain: 0.17, color: 'pink', filter: { type: 'bandpass', freq: 500, freqEnd: 2600, q: 0.8 }, attack: 0.015, release: 0.16 }),
    rise(160, 460, 0.2, { gain: 0.09, release: 0.14 }),
  ], { minGap: 90 }),

  'whoosh': fx([
    noise(0.2, { gain: 0.13, color: 'pink', filter: { type: 'bandpass', freq: 1400, freqEnd: 400, q: 1.1 }, attack: 0.02, release: 0.14 }),
  ], { minGap: 45 }),

  'jump': fx([
    rise(220, 620, 0.16, { wave: 'triangle', gain: 0.12, release: 0.1 }),
    noise(0.12, { gain: 0.07, color: 'pink', filter: { type: 'highpass', freq: 900 } }),
  ], { minGap: 100 }),

  'land': fx([
    drop(160, 55, 0.2, { gain: 0.16, release: 0.14 }),
    noise(0.16, { gain: 0.13, color: 'brown', filter: { type: 'lowpass', freq: 900, freqEnd: 200 }, release: 0.11 }),
  ], { minGap: 90 }),

  'footstep': fx([
    noise(0.05, { gain: 0.05, color: 'brown', filter: { type: 'lowpass', freq: 1100, q: 0.8 }, release: 0.04 }),
  ], { minGap: 120 }),

  'projectile-impact': fx([
    noise(0.09, { gain: 0.13, color: 'white', filter: { type: 'bandpass', freq: 1600, freqEnd: 600, q: 1 }, release: 0.06 }),
    drop(300, 120, 0.1, { gain: 0.11 }),
  ], { minGap: 30 }),

  'ability-ready': fx([
    tone(1046, 0.13, { wave: 'sine', gain: 0.08, attack: 0.002, release: 0.1, reverb: 0.25 }),
    tone(1568, 0.1, { wave: 'sine', gain: 0.04, delay: 0.05, release: 0.08 }),
  ], { minGap: 110 }),

  'low-health': fx([
    drop(150, 90, 0.28, { wave: 'sine', gain: 0.16, attack: 0.01, release: 0.2 }),
    drop(150, 88, 0.24, { wave: 'sine', gain: 0.11, delay: 0.22, release: 0.18 }),
  ], { minGap: 900 }),

  // ══ Explosions ══════════════════════════════════════════════════════

  'explosion-small': fx([
    noise(0.32, { gain: 0.22, color: 'brown', filter: { type: 'lowpass', freq: 3200, freqEnd: 260 }, release: 0.24 }),
    drop(200, 45, 0.36, { gain: 0.2, release: 0.26 }),
  ], { minGap: 55 }),

  'explosion-medium': fx([
    noise(0.6, { gain: 0.26, color: 'brown', filter: { type: 'lowpass', freq: 4200, freqEnd: 160 }, release: 0.44, reverb: 0.25 }),
    drop(160, 32, 0.7, { gain: 0.26, release: 0.5 }),
    noise(0.14, { gain: 0.16, color: 'white', filter: { type: 'highpass', freq: 2200 }, release: 0.1 }),
  ], { minGap: 90 }),

  'explosion-large': fx([
    noise(1.3, { gain: 0.3, color: 'brown', filter: { type: 'lowpass', freq: 5000, freqEnd: 90 }, release: 0.95, reverb: 0.45 }),
    drop(120, 24, 1.5, { gain: 0.3, release: 1.0 }),
    noise(0.25, { gain: 0.2, color: 'white', filter: { type: 'highpass', freq: 1800, freqEnd: 5000 }, release: 0.18 }),
    drop(600, 90, 0.5, { wave: 'sawtooth', gain: 0.12, release: 0.35 }),
  ], { minGap: 180, important: true }),

  // ══ Status effects ══════════════════════════════════════════════════

  'status-burn': fx([
    noise(0.5, { gain: 0.12, color: 'pink', filter: { type: 'bandpass', freq: 1200, freqEnd: 2600, q: 0.7 }, attack: 0.03, release: 0.35 }),
    rise(160, 300, 0.4, { wave: 'sawtooth', gain: 0.07, filter: { type: 'lowpass', freq: 1400 } }),
  ], { minGap: 400 }),

  'status-freeze': fx([
    ...stack(1400, 0.55, [1, 1.51, 2.03], { gain: 0.11, attack: 0.006, release: 0.4, reverb: 0.45, fm: { ratio: 3.3, index: 0.25, indexEnd: 0.01 } }),
    drop(700, 260, 0.4, { gain: 0.09, release: 0.3 }),
    noise(0.3, { gain: 0.07, filter: { type: 'highpass', freq: 5000 }, release: 0.24 }),
  ], { minGap: 400 }),

  'status-shock': fx([
    ...repeat(noise(0.04, { gain: 0.13, filter: { type: 'bandpass', freq: 3800, q: 3 } }), 6, 0.032, { gain: 0.85 }),
    tone(1600, 0.22, { wave: 'square', gain: 0.07, freqEnd: 600, release: 0.16 }),
  ], { minGap: 350 }),

  'status-poison': fx([
    ...repeat(tone(320, 0.13, { wave: 'sine', gain: 0.09, freqEnd: 190, reverb: 0.2 }), 3, 0.09, { rate: 0.87, gain: 0.85 }),
    noise(0.4, { gain: 0.07, color: 'pink', filter: { type: 'lowpass', freq: 700 }, attack: 0.06, release: 0.3 }),
  ], { minGap: 400 }),

  'status-bleed': fx([
    ...repeat(noise(0.07, { gain: 0.09, color: 'pink', filter: { type: 'bandpass', freq: 900, q: 1.4 } }), 3, 0.11, { gain: 0.8 }),
    drop(260, 150, 0.3, { gain: 0.08, release: 0.22 }),
  ], { minGap: 420 }),

  'status-stun': fx([
    ...stack(440, 0.7, [1, 1.42, 2.7], { gain: 0.12, attack: 0.003, release: 0.5, reverb: 0.4, fm: { ratio: 1.41, index: 0.9, indexEnd: 0.05 } }),
    drop(180, 70, 0.4, { gain: 0.11 }),
  ], { minGap: 400 }),

  'status-slow': fx([
    drop(520, 190, 0.6, { wave: 'triangle', gain: 0.11, attack: 0.02, release: 0.44, glide: 'lin', reverb: 0.3 }),
    noise(0.5, { gain: 0.06, color: 'pink', filter: { type: 'lowpass', freq: 1600, freqEnd: 380 }, release: 0.36 }),
  ], { minGap: 420 }),

  'status-silence': fx([
    noise(0.6, { gain: 0.11, color: 'pink', filter: { type: 'lowpass', freq: 2600, freqEnd: 180 }, attack: 0.02, release: 0.45 }),
    drop(600, 90, 0.55, { wave: 'sine', gain: 0.09, release: 0.4 }),
  ], { minGap: 450 }),

  'status-root': fx([
    drop(300, 110, 0.4, { wave: 'sawtooth', gain: 0.12, filter: { type: 'lowpass', freq: 900 }, release: 0.3 }),
    noise(0.3, { gain: 0.1, color: 'brown', filter: { type: 'lowpass', freq: 600 }, release: 0.22 }),
  ], { minGap: 400 }),

  'status-curse': fx([
    ...stack(146, 0.9, [1, 1.19, 1.62], { gain: 0.11, wave: 'sawtooth', attack: 0.05, release: 0.6, reverb: 0.5, filter: { type: 'lowpass', freq: 1200, freqEnd: 300 } }),
  ], { minGap: 450 }),

  'status-buff': fx([
    ...arp(440, [0, 7, 12], 0.3, 0.06, { wave: 'sine', gain: 0.11, attack: 0.015, reverb: 0.35 }),
  ], { minGap: 350 }),

  'status-debuff': fx([
    ...arp(440, [0, -5, -12], 0.3, 0.06, { wave: 'triangle', gain: 0.11, attack: 0.015, reverb: 0.3 }),
  ], { minGap: 350 }),

  'status-haste': fx([
    ...repeat(rise(600, 1400, 0.12, { gain: 0.09, reverb: 0.25 }), 3, 0.07, { rate: 1.14, gain: 0.9 }),
  ], { minGap: 380 }),

  'status-invisible': fx([
    noise(0.55, { gain: 0.1, color: 'pink', filter: { type: 'bandpass', freq: 2600, freqEnd: 260, q: 1.4 }, attack: 0.04, release: 0.4 }),
    drop(880, 220, 0.5, { wave: 'sine', gain: 0.08, release: 0.38, reverb: 0.45 }),
  ], { minGap: 420 }),

  'status-invincible': fx([
    ...stack(392, 0.8, [1, 2, 3, 4], { gain: 0.12, attack: 0.03, release: 0.55, reverb: 0.5 }),
    noise(0.6, { gain: 0.06, filter: { type: 'highpass', freq: 4000 }, attack: 0.1, release: 0.4 }),
  ], { minGap: 450 }),

  'status-regen': fx([
    ...arp(659, [0, 4, 7], 0.34, 0.09, { wave: 'sine', gain: 0.09, attack: 0.04, reverb: 0.45 }),
  ], { minGap: 500 }),

  'status-sleep': fx([
    ...arp(392, [0, -3, -7, -12], 0.6, 0.14, { wave: 'sine', gain: 0.11, attack: 0.08, release: 0.4, reverb: 0.55 }),
  ], { minGap: 500 }),

  'status-fear': fx([
    drop(700, 130, 1.0, { wave: 'sawtooth', gain: 0.11, attack: 0.03, release: 0.7, filter: { type: 'lowpass', freq: 1800, freqEnd: 320 }, reverb: 0.5, vibrato: { rate: 7, depth: 20 } }),
  ], { minGap: 500 }),

  'status-confuse': fx([
    drop(660, 380, 0.5, { wave: 'triangle', gain: 0.11, attack: 0.02, release: 0.36, reverb: 0.4, vibrato: { rate: 9, depth: 70 } }),
    tone(440, 0.4, { wave: 'sine', gain: 0.07, delay: 0.12, release: 0.3, vibrato: { rate: 12, depth: 40 } }),
  ], { minGap: 400 }),

  'status-mark': fx([
    tone(1760, 0.18, { wave: 'square', gain: 0.09, attack: 0.002, release: 0.13, reverb: 0.3 }),
    tone(1320, 0.16, { wave: 'square', gain: 0.07, delay: 0.09, release: 0.12 }),
  ], { minGap: 300 }),

  'status-drain': fx([
    drop(880, 180, 0.6, { wave: 'triangle', gain: 0.12, attack: 0.03, release: 0.44, reverb: 0.4 }),
    noise(0.5, { gain: 0.07, color: 'pink', filter: { type: 'bandpass', freq: 1800, freqEnd: 400, q: 1.2 }, release: 0.36 }),
  ], { minGap: 380 }),

  'status-expire': fx([
    drop(880, 560, 0.16, { wave: 'sine', gain: 0.07, release: 0.12 }),
  ], { minGap: 260 }),

  // ══ Elemental ability voices ════════════════════════════════════════
  //
  // From here down these are the sounds abilities actually map onto. Names are
  // descriptive of the *gesture* rather than the element, so several elements can
  // share one where it fits (a thrown spear and a thrown dagger want the same
  // whip-crack; only their pitch differs).

  // ── Fire ──
  'fireball': fx([
    noise(0.34, { gain: 0.17, color: 'pink', filter: { type: 'bandpass', freq: 900, freqEnd: 2400, q: 0.8 }, attack: 0.012, release: 0.24 }),
    drop(420, 120, 0.3, { wave: 'sawtooth', gain: 0.12, filter: { type: 'lowpass', freq: 1800, freqEnd: 600 }, release: 0.2 }),
  ], { minGap: 55 }),

  'flame-burst': fx([
    noise(0.5, { gain: 0.22, color: 'pink', filter: { type: 'bandpass', freq: 500, freqEnd: 3000, q: 0.6 }, attack: 0.02, release: 0.35 }),
    drop(260, 70, 0.4, { gain: 0.15, release: 0.3 }),
  ], { minGap: 90 }),

  'inferno': fx([
    noise(1.6, { gain: 0.22, color: 'pink', filter: { type: 'bandpass', freq: 300, freqEnd: 2600, q: 0.5 }, attack: 0.3, release: 1.0, reverb: 0.4 }),
    drop(180, 44, 1.5, { wave: 'sawtooth', gain: 0.18, attack: 0.1, release: 1.0, filter: { type: 'lowpass', freq: 900 } }),
    ...repeat(noise(0.1, { gain: 0.09, color: 'white', filter: { type: 'highpass', freq: 3000 } }), 6, 0.16, { gain: 0.9 }),
  ], { minGap: 500, important: true }),

  // ── Water ──
  'water-jet': fx([
    noise(0.28, { gain: 0.16, color: 'white', filter: { type: 'bandpass', freq: 2400, freqEnd: 900, q: 1.6 }, attack: 0.01, release: 0.2 }),
    drop(700, 300, 0.22, { wave: 'sine', gain: 0.08, release: 0.16 }),
  ], { minGap: 50 }),

  'splash': fx([
    noise(0.36, { gain: 0.18, color: 'white', filter: { type: 'bandpass', freq: 1200, freqEnd: 3600, q: 0.9 }, attack: 0.006, release: 0.26 }),
    ...repeat(tone(900, 0.09, { wave: 'sine', gain: 0.06, freqEnd: 1500, reverb: 0.25 }), 4, 0.045, { rate: 1.12, gain: 0.8 }),
  ], { minGap: 70 }),

  'geyser': fx([
    noise(0.9, { gain: 0.2, color: 'white', filter: { type: 'bandpass', freq: 600, freqEnd: 3400, q: 0.8 }, attack: 0.12, release: 0.6, reverb: 0.3 }),
    rise(120, 520, 0.8, { wave: 'sine', gain: 0.12, attack: 0.06, release: 0.5 }),
  ], { minGap: 200 }),

  'rain': fx([
    noise(1.5, { gain: 0.15, color: 'white', filter: { type: 'bandpass', freq: 3200, q: 0.6 }, attack: 0.4, release: 0.9, reverb: 0.35 }),
    ...repeat(tone(1800, 0.05, { wave: 'sine', gain: 0.05 }), 8, 0.13, { rate: 0.96, gain: 0.94 }),
  ], { minGap: 500 }),

  'bubble': fx([
    ...repeat(rise(300, 900, 0.09, { wave: 'sine', gain: 0.09, reverb: 0.3 }), 3, 0.07, { rate: 1.2, gain: 0.85 }),
  ], { minGap: 90 }),

  // ── Air ──
  'gust': fx([
    noise(0.55, { gain: 0.16, color: 'pink', filter: { type: 'bandpass', freq: 700, freqEnd: 2200, q: 0.6 }, attack: 0.1, release: 0.36 }),
  ], { minGap: 90 }),

  'air-snipe': fx([
    noise(0.14, { gain: 0.15, color: 'white', filter: { type: 'bandpass', freq: 5000, freqEnd: 1600, q: 2.4 }, release: 0.1 }),
    drop(2600, 700, 0.12, { wave: 'sine', gain: 0.1, release: 0.09 }),
  ], { minGap: 40 }),

  'tornado': fx([
    noise(1.4, { gain: 0.2, color: 'pink', filter: { type: 'bandpass', freq: 400, freqEnd: 1800, q: 2.2 }, attack: 0.3, release: 0.9, reverb: 0.4 }),
    rise(90, 260, 1.3, { wave: 'sawtooth', gain: 0.1, filter: { type: 'lowpass', freq: 800 }, vibrato: { rate: 5, depth: 14 } }),
  ], { minGap: 400 }),

  'beam-charge': fx([
    rise(140, 900, 0.9, { wave: 'sawtooth', gain: 0.13, attack: 0.15, release: 0.2, filter: { type: 'lowpass', freq: 500, freqEnd: 4000, q: 4 } }),
    noise(0.9, { gain: 0.07, color: 'white', filter: { type: 'highpass', freq: 2000, freqEnd: 6000 }, attack: 0.4, release: 0.3 }),
  ], { minGap: 300 }),

  'beam-fire': fx([
    ...stack(300, 0.7, [1, 2, 3], { gain: 0.15, wave: 'sawtooth', attack: 0.008, release: 0.5, reverb: 0.35, filter: { type: 'lowpass', freq: 4000, freqEnd: 900 } }),
    noise(0.6, { gain: 0.16, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 800, q: 1.2 }, release: 0.42 }),
  ], { minGap: 160 }),

  // ── Earth / stone ──
  'rock-throw': fx([
    noise(0.16, { gain: 0.14, color: 'brown', filter: { type: 'bandpass', freq: 800, freqEnd: 300, q: 1 }, release: 0.11 }),
    drop(220, 110, 0.18, { gain: 0.12 }),
  ], { minGap: 45 }),

  'quake': fx([
    noise(1.4, { gain: 0.26, color: 'brown', filter: { type: 'lowpass', freq: 260 }, attack: 0.15, release: 0.9, reverb: 0.4 }),
    drop(70, 28, 1.5, { gain: 0.28, attack: 0.06, release: 1.0 }),
    ...repeat(noise(0.12, { gain: 0.1, color: 'brown', filter: { type: 'lowpass', freq: 700 } }), 5, 0.2, { gain: 0.85 }),
  ], { minGap: 400, important: true }),

  'stone-slam': fx([
    drop(130, 38, 0.5, { gain: 0.26, release: 0.34 }),
    noise(0.4, { gain: 0.2, color: 'brown', filter: { type: 'lowpass', freq: 1600, freqEnd: 180 }, release: 0.3 }),
  ], { minGap: 90 }),

  'stone-rise': fx([
    rise(70, 260, 0.5, { wave: 'sawtooth', gain: 0.15, attack: 0.03, release: 0.3, filter: { type: 'lowpass', freq: 900 } }),
    noise(0.45, { gain: 0.13, color: 'brown', filter: { type: 'lowpass', freq: 500, freqEnd: 1400 }, attack: 0.05, release: 0.3 }),
  ], { minGap: 130 }),

  'golem-ritual': fx([
    ...stack(87, 1.8, [1, 1.5, 2, 3], { gain: 0.14, wave: 'sawtooth', attack: 0.3, release: 1.1, reverb: 0.55, filter: { type: 'lowpass', freq: 300, freqEnd: 1600 } }),
    noise(1.9, { gain: 0.12, color: 'brown', filter: { type: 'lowpass', freq: 400 }, attack: 0.6, release: 1.1 }),
  ], { minGap: 600, important: true }),

  // ── Life / growth ──
  'vine-grow': fx([
    rise(180, 620, 0.45, { wave: 'triangle', gain: 0.12, attack: 0.02, release: 0.3, reverb: 0.3 }),
    noise(0.4, { gain: 0.09, color: 'pink', filter: { type: 'bandpass', freq: 1400, freqEnd: 3200, q: 1.2 }, attack: 0.04, release: 0.28 }),
  ], { minGap: 90 }),

  'petal-burst': fx([
    ...repeat(noise(0.07, { gain: 0.1, color: 'pink', filter: { type: 'bandpass', freq: 2200, q: 1.4 } }), 5, 0.028, { gain: 0.88 }),
    rise(440, 900, 0.24, { wave: 'sine', gain: 0.09, release: 0.18, reverb: 0.3 }),
  ], { minGap: 60 }),

  'thorn': fx([
    noise(0.1, { gain: 0.13, color: 'white', filter: { type: 'bandpass', freq: 3200, freqEnd: 1200, q: 2 }, release: 0.07 }),
    drop(900, 320, 0.12, { wave: 'sawtooth', gain: 0.09, release: 0.09 }),
  ], { minGap: 45 }),

  'bloom': fx([
    ...arp(392, [0, 4, 7, 11], 0.5, 0.1, { wave: 'sine', gain: 0.12, attack: 0.04, reverb: 0.5 }),
    noise(0.7, { gain: 0.06, color: 'pink', filter: { type: 'highpass', freq: 2600 }, attack: 0.2, release: 0.4 }),
  ], { minGap: 300 }),

  'spore': fx([
    noise(0.7, { gain: 0.12, color: 'pink', filter: { type: 'bandpass', freq: 800, freqEnd: 2000, q: 0.7 }, attack: 0.12, release: 0.5 }),
    ...repeat(tone(520, 0.14, { wave: 'sine', gain: 0.06, freqEnd: 380, reverb: 0.35 }), 4, 0.12, { rate: 0.92, gain: 0.85 }),
  ], { minGap: 200 }),

  'mutate': fx([
    drop(600, 200, 0.6, { wave: 'square', gain: 0.11, release: 0.4, filter: { type: 'lowpass', freq: 2000, freqEnd: 500 }, vibrato: { rate: 11, depth: 30 } }),
    noise(0.5, { gain: 0.09, color: 'pink', filter: { type: 'lowpass', freq: 1200 }, attack: 0.08, release: 0.35 }),
  ], { minGap: 250 }),

  // ── Ice / frost ──
  'ice-shard': fx([
    ...stack(1800, 0.26, [1, 1.48, 2.01], { gain: 0.12, attack: 0.002, release: 0.2, reverb: 0.35, fm: { ratio: 3.3, index: 0.2, indexEnd: 0.01 } }),
    noise(0.1, { gain: 0.1, filter: { type: 'highpass', freq: 4600 }, release: 0.07 }),
  ], { minGap: 45 }),

  'frost-blast': fx([
    noise(0.6, { gain: 0.18, color: 'white', filter: { type: 'highpass', freq: 1400, freqEnd: 5200 }, attack: 0.02, release: 0.45 }),
    drop(900, 240, 0.5, { wave: 'triangle', gain: 0.12, release: 0.36, reverb: 0.4 }),
  ], { minGap: 110 }),

  'ice-wall': fx([
    ...stack(240, 0.7, [1, 1.5, 2.4], { gain: 0.13, wave: 'triangle', freqEnd: 400, attack: 0.02, release: 0.5, reverb: 0.4 }),
    noise(0.6, { gain: 0.12, color: 'white', filter: { type: 'highpass', freq: 2600 }, attack: 0.05, release: 0.44 }),
  ], { minGap: 200 }),

  'ice-shatter': fx([
    ...repeat(tone(2400, 0.11, { wave: 'triangle', gain: 0.1, freqEnd: 1600, reverb: 0.4, fm: { ratio: 3.3, index: 0.3, indexEnd: 0.02 } }), 7, 0.03, { rate: 0.9, gain: 0.85 }),
    noise(0.4, { gain: 0.15, filter: { type: 'highpass', freq: 3400 }, release: 0.3 }),
  ], { minGap: 150 }),

  'skate': fx([
    noise(0.7, { gain: 0.11, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 1200, q: 3 }, attack: 0.08, release: 0.5 }),
  ], { minGap: 300 }),

  // ── Electricity / plasma ──
  'zap': fx([
    ...repeat(noise(0.03, { gain: 0.14, filter: { type: 'bandpass', freq: 4200, q: 4 } }), 4, 0.022, { gain: 0.82 }),
    drop(2200, 500, 0.16, { wave: 'square', gain: 0.11, release: 0.12 }),
  ], { minGap: 40 }),

  'thunder': fx([
    noise(1.2, { gain: 0.26, color: 'brown', filter: { type: 'lowpass', freq: 5000, freqEnd: 140 }, attack: 0.01, release: 0.9, reverb: 0.5 }),
    ...repeat(noise(0.05, { gain: 0.16, filter: { type: 'bandpass', freq: 5000, q: 3 } }), 5, 0.03, { gain: 0.8 }),
    drop(140, 34, 1.1, { gain: 0.22, release: 0.8 }),
  ], { minGap: 250, important: true }),

  'electric-charge': fx([
    rise(220, 1600, 0.7, { wave: 'square', gain: 0.1, attack: 0.1, release: 0.2, filter: { type: 'bandpass', freq: 1200, freqEnd: 5000, q: 3 } }),
    ...repeat(noise(0.025, { gain: 0.07, filter: { type: 'bandpass', freq: 4000, q: 5 } }), 8, 0.08, { gain: 1.05 }),
  ], { minGap: 250 }),

  'plasma-arc': fx([
    ...stack(420, 0.5, [1, 1.98, 3.02], { gain: 0.12, wave: 'sawtooth', attack: 0.006, release: 0.36, reverb: 0.35, fm: { ratio: 2.7, index: 0.5, indexEnd: 0.1 }, filter: { type: 'bandpass', freq: 2400, freqEnd: 800, q: 1.6 } }),
    ...repeat(noise(0.03, { gain: 0.09, filter: { type: 'bandpass', freq: 5200, q: 4 } }), 5, 0.045, { gain: 0.86 }),
  ], { minGap: 70 }),

  'chaos': fx([
    ...repeat(drop(1400, 300, 0.1, { wave: 'square', gain: 0.09, reverb: 0.3 }), 7, 0.05, { rate: 0.83, gain: 1.02 }),
    noise(0.7, { gain: 0.13, color: 'white', filter: { type: 'bandpass', freq: 1600, freqEnd: 4600, q: 1.4 }, attack: 0.05, release: 0.5 }),
  ], { minGap: 250 }),

  // ── Metal ──
  'clang': fx([
    ...stack(520, 0.6, [1, 1.41, 2.7, 3.9], { gain: 0.14, attack: 0.001, release: 0.45, reverb: 0.4, fm: { ratio: 1.41, index: 1.2, indexEnd: 0.05 } }),
    noise(0.06, { gain: 0.11, filter: { type: 'highpass', freq: 3200 } }),
  ], { minGap: 50 }),

  'slash': fx([
    noise(0.13, { gain: 0.17, color: 'white', filter: { type: 'bandpass', freq: 3600, freqEnd: 900, q: 1.8 }, attack: 0.003, release: 0.09 }),
    drop(1200, 380, 0.12, { wave: 'sawtooth', gain: 0.09, release: 0.09 }),
  ], { minGap: 35 }),

  'stab': fx([
    noise(0.09, { gain: 0.15, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 1000, q: 2.4 }, release: 0.06 }),
    drop(700, 240, 0.11, { wave: 'triangle', gain: 0.1, release: 0.08 }),
  ], { minGap: 32 }),

  'flail-swing': fx([
    noise(0.3, { gain: 0.13, color: 'pink', filter: { type: 'bandpass', freq: 900, freqEnd: 2400, q: 1.4 }, attack: 0.05, release: 0.2 }),
    ...stack(300, 0.3, [1, 1.41], { gain: 0.08, delay: 0.16, release: 0.2, reverb: 0.3, fm: { ratio: 1.41, index: 0.8, indexEnd: 0.1 } }),
  ], { minGap: 90 }),

  'chain': fx([
    ...repeat(tone(1600, 0.06, { wave: 'square', gain: 0.07, reverb: 0.3, fm: { ratio: 1.41, index: 1, indexEnd: 0.1 } }), 5, 0.045, { rate: 1.08, gain: 0.88 }),
  ], { minGap: 90 }),

  'anvil': fx([
    ...stack(180, 1.0, [1, 1.41, 2.4], { gain: 0.16, attack: 0.001, release: 0.75, reverb: 0.5, fm: { ratio: 1.41, index: 1.6, indexEnd: 0.03 } }),
    drop(120, 40, 0.4, { gain: 0.16, release: 0.3 }),
  ], { minGap: 120 }),

  // ── Shadow / soul / death ──
  'dark-drain': fx([
    drop(700, 130, 0.7, { wave: 'sawtooth', gain: 0.13, attack: 0.02, release: 0.5, filter: { type: 'lowpass', freq: 1800, freqEnd: 300 }, reverb: 0.45 }),
    noise(0.6, { gain: 0.08, color: 'pink', filter: { type: 'bandpass', freq: 1200, freqEnd: 300, q: 1.4 }, release: 0.44 }),
  ], { minGap: 90 }),

  'tentacle': fx([
    noise(0.4, { gain: 0.14, color: 'pink', filter: { type: 'bandpass', freq: 500, freqEnd: 1700, q: 1.2 }, attack: 0.03, release: 0.28 }),
    rise(90, 240, 0.4, { wave: 'sawtooth', gain: 0.11, filter: { type: 'lowpass', freq: 700 }, release: 0.28 }),
  ], { minGap: 80 }),

  'black-hole': fx([
    rise(40, 190, 2.0, { wave: 'sawtooth', gain: 0.2, attack: 0.5, release: 1.0, filter: { type: 'lowpass', freq: 200, freqEnd: 1200 }, reverb: 0.6 }),
    noise(2.2, { gain: 0.16, color: 'brown', filter: { type: 'bandpass', freq: 200, freqEnd: 900, q: 2 }, attack: 0.7, release: 1.2 }),
  ], { minGap: 700, important: true }),

  'ghost-wail': fx([
    ...stack(330, 1.2, [1, 1.5], { gain: 0.11, wave: 'triangle', freqEnd: 180, attack: 0.15, release: 0.8, reverb: 0.6, vibrato: { rate: 5.5, depth: 12 } }),
  ], { minGap: 350 }),

  'bone': fx([
    ...repeat(noise(0.05, { gain: 0.1, color: 'white', filter: { type: 'bandpass', freq: 1600, q: 2.6 } }), 4, 0.05, { gain: 0.86 }),
    drop(400, 200, 0.2, { wave: 'square', gain: 0.07, release: 0.14 }),
  ], { minGap: 90 }),

  'lantern': fx([
    ...stack(880, 0.5, [1, 2.01, 3.02], { gain: 0.1, attack: 0.008, release: 0.38, reverb: 0.5, fm: { ratio: 2.7, index: 0.3, indexEnd: 0.02 } }),
  ], { minGap: 60 }),

  'whistle': fx([
    rise(900, 2200, 0.4, { wave: 'sine', gain: 0.13, attack: 0.04, release: 0.24, reverb: 0.4, vibrato: { rate: 6, depth: 30 } }),
  ], { minGap: 200 }),

  'torment': fx([
    ...stack(110, 1.8, [1, 1.19, 1.62, 2.4], { gain: 0.14, wave: 'sawtooth', attack: 0.2, release: 1.2, reverb: 0.6, filter: { type: 'lowpass', freq: 900, freqEnd: 2400 } }),
    noise(2.0, { gain: 0.12, color: 'brown', filter: { type: 'bandpass', freq: 400, freqEnd: 1600, q: 1.4 }, attack: 0.5, release: 1.2 }),
  ], { minGap: 600, important: true }),

  // ── Gravity / space ──
  'gravity-slam': fx([
    drop(300, 30, 0.7, { wave: 'sine', gain: 0.28, attack: 0.006, release: 0.5 }),
    noise(0.6, { gain: 0.18, color: 'brown', filter: { type: 'lowpass', freq: 2600, freqEnd: 120 }, release: 0.44 }),
  ], { minGap: 120 }),

  'meteor': fx([
    noise(0.9, { gain: 0.18, color: 'pink', filter: { type: 'bandpass', freq: 2400, freqEnd: 500, q: 0.9 }, attack: 0.25, release: 0.5 }),
    drop(700, 120, 0.85, { wave: 'sawtooth', gain: 0.13, attack: 0.1, release: 0.5, filter: { type: 'lowpass', freq: 2000, freqEnd: 500 } }),
  ], { minGap: 130 }),

  'space-slash': fx([
    noise(0.2, { gain: 0.15, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 700, q: 1.4 }, attack: 0.004, release: 0.14 }),
    drop(1400, 260, 0.24, { wave: 'sine', gain: 0.11, release: 0.18, reverb: 0.45 }),
  ], { minGap: 45 }),

  'moon-landing': fx([
    drop(160, 40, 1.2, { gain: 0.22, attack: 0.02, release: 0.85, reverb: 0.5 }),
    ...stack(220, 1.4, [1, 1.5, 2], { gain: 0.1, wave: 'sine', attack: 0.3, release: 0.9, reverb: 0.6 }),
    noise(1.2, { gain: 0.14, color: 'brown', filter: { type: 'lowpass', freq: 2000, freqEnd: 150 }, release: 0.85 }),
  ], { minGap: 500, important: true }),

  // ── Light / crystal ──
  'light-beam': fx([
    ...stack(1320, 0.4, [1, 2, 3], { gain: 0.11, wave: 'sine', attack: 0.004, release: 0.3, reverb: 0.45 }),
    noise(0.3, { gain: 0.09, filter: { type: 'highpass', freq: 4200 }, release: 0.22 }),
  ], { minGap: 45 }),

  'blink': fx([
    rise(500, 2600, 0.14, { wave: 'sine', gain: 0.12, release: 0.1, reverb: 0.35 }),
    noise(0.14, { gain: 0.09, filter: { type: 'highpass', freq: 3600, freqEnd: 7000 }, release: 0.1 }),
  ], { minGap: 70 }),

  'crystal-chime': fx([
    ...stack(1046, 0.8, [1, 2.01, 3.02, 4.2], { gain: 0.11, attack: 0.002, release: 0.62, reverb: 0.55, fm: { ratio: 3.3, index: 0.4, indexEnd: 0.01 } }),
  ], { minGap: 60 }),

  'crystal-shatter': fx([
    ...repeat(tone(2000, 0.14, { wave: 'sine', gain: 0.09, reverb: 0.5, fm: { ratio: 3.3, index: 0.5, indexEnd: 0.02 } }), 8, 0.035, { rate: 0.88, gain: 0.88 }),
    noise(0.45, { gain: 0.14, filter: { type: 'highpass', freq: 3000 }, release: 0.34 }),
  ], { minGap: 160 }),

  'prism': fx([
    ...arp(880, [0, 4, 7, 11, 14], 0.4, 0.05, { wave: 'sine', gain: 0.09, reverb: 0.5 }),
  ], { minGap: 140 }),

  'portal': fx([
    rise(120, 900, 0.7, { wave: 'sawtooth', gain: 0.13, attack: 0.15, release: 0.4, filter: { type: 'bandpass', freq: 600, freqEnd: 3000, q: 3 }, reverb: 0.55 }),
    noise(0.8, { gain: 0.1, color: 'pink', filter: { type: 'bandpass', freq: 1200, freqEnd: 3600, q: 1.6 }, attack: 0.2, release: 0.5 }),
  ], { minGap: 220 }),

  'teleport': fx([
    noise(0.26, { gain: 0.14, color: 'white', filter: { type: 'bandpass', freq: 900, freqEnd: 5200, q: 1.2 }, attack: 0.01, release: 0.18 }),
    rise(300, 1800, 0.24, { wave: 'triangle', gain: 0.11, release: 0.16, reverb: 0.4 }),
  ], { minGap: 90 }),

  // ── Sound / echo ──
  'sonic-pulse': fx([
    ...stack(180, 0.5, [1, 2, 4], { gain: 0.14, wave: 'sine', freqEnd: 90, attack: 0.008, release: 0.38, reverb: 0.45 }),
    noise(0.3, { gain: 0.08, color: 'pink', filter: { type: 'lowpass', freq: 1400 }, release: 0.22 }),
  ], { minGap: 60 }),

  'screech': fx([
    ...stack(1400, 0.6, [1, 1.5, 2.02], { gain: 0.12, wave: 'sawtooth', attack: 0.01, release: 0.44, reverb: 0.4, filter: { type: 'bandpass', freq: 3000, q: 4 }, vibrato: { rate: 22, depth: 60 } }),
  ], { minGap: 180 }),

  'echo-ping': fx([
    tone(1760, 0.2, { wave: 'sine', gain: 0.12, attack: 0.002, release: 0.16, reverb: 0.6 }),
    tone(1760, 0.18, { wave: 'sine', gain: 0.05, delay: 0.18, release: 0.14, reverb: 0.6 }),
    tone(1760, 0.16, { wave: 'sine', gain: 0.025, delay: 0.36, release: 0.13, reverb: 0.6 }),
  ], { minGap: 90 }),

  'guitar-solo': fx([
    ...arp(330, [0, 3, 5, 7, 10, 12, 15], 0.5, 0.09, { wave: 'sawtooth', gain: 0.12, filter: { type: 'lowpass', freq: 2600, q: 4 }, reverb: 0.4 }),
    drop(110, 82, 1.0, { wave: 'sawtooth', gain: 0.1, filter: { type: 'lowpass', freq: 700 }, release: 0.6 }),
  ], { minGap: 500, important: true }),

  'drum-hit': fx([
    drop(200, 55, 0.2, { gain: 0.2, release: 0.14 }),
    noise(0.09, { gain: 0.1, color: 'white', filter: { type: 'highpass', freq: 2400 } }),
  ], { minGap: 40 }),

  // ── Guns / hunt ──
  'musket': fx([
    noise(0.32, { gain: 0.26, color: 'brown', filter: { type: 'lowpass', freq: 5200, freqEnd: 300 }, attack: 0.001, release: 0.24 }),
    drop(320, 60, 0.28, { gain: 0.2, release: 0.2 }),
    noise(0.06, { gain: 0.16, color: 'white', filter: { type: 'highpass', freq: 3000 } }),
  ], { minGap: 60 }),

  'shotgun': fx([
    noise(0.4, { gain: 0.28, color: 'brown', filter: { type: 'lowpass', freq: 4000, freqEnd: 200 }, attack: 0.001, release: 0.3 }),
    drop(240, 45, 0.4, { gain: 0.22, release: 0.28 }),
    ...repeat(noise(0.04, { gain: 0.08, filter: { type: 'highpass', freq: 3600 } }), 4, 0.02, { gain: 0.85 }),
  ], { minGap: 90 }),

  'crossbow': fx([
    noise(0.1, { gain: 0.14, color: 'white', filter: { type: 'bandpass', freq: 2200, freqEnd: 800, q: 2 }, release: 0.07 }),
    drop(560, 180, 0.14, { wave: 'square', gain: 0.11, release: 0.1 }),
    noise(0.2, { gain: 0.07, color: 'pink', filter: { type: 'bandpass', freq: 3600, q: 3 }, delay: 0.03, release: 0.14 }),
  ], { minGap: 50 }),

  'reload': fx([
    noise(0.05, { gain: 0.1, color: 'white', filter: { type: 'bandpass', freq: 1800, q: 2.4 } }),
    noise(0.06, { gain: 0.12, color: 'white', filter: { type: 'bandpass', freq: 1200, q: 2 }, delay: 0.12 }),
    tone(300, 0.08, { wave: 'square', gain: 0.07, delay: 0.12 }),
  ], { minGap: 120 }),

  'roar': fx([
    ...stack(90, 1.1, [1, 1.5, 2.4], { gain: 0.18, wave: 'sawtooth', freqEnd: 60, attack: 0.06, release: 0.7, reverb: 0.5, filter: { type: 'lowpass', freq: 1400, freqEnd: 500 }, vibrato: { rate: 18, depth: 8 } }),
    noise(1.0, { gain: 0.14, color: 'brown', filter: { type: 'bandpass', freq: 600, freqEnd: 240, q: 1.2 }, attack: 0.08, release: 0.6 }),
  ], { minGap: 400, important: true }),

  'beast-transform': fx([
    rise(70, 300, 1.1, { wave: 'sawtooth', gain: 0.16, attack: 0.15, release: 0.6, filter: { type: 'lowpass', freq: 400, freqEnd: 2200 }, reverb: 0.45 }),
    noise(1.2, { gain: 0.14, color: 'brown', filter: { type: 'bandpass', freq: 300, freqEnd: 1800, q: 1 }, attack: 0.3, release: 0.7 }),
    ...repeat(noise(0.06, { gain: 0.09, color: 'white', filter: { type: 'bandpass', freq: 1800, q: 3 } }), 5, 0.13, { gain: 0.95 }),
  ], { minGap: 600, important: true }),

  'grenade-throw': fx([
    noise(0.22, { gain: 0.11, color: 'pink', filter: { type: 'bandpass', freq: 700, freqEnd: 2000, q: 1.2 }, attack: 0.03, release: 0.16 }),
    tone(400, 0.07, { wave: 'square', gain: 0.07 }),
  ], { minGap: 70 }),

  'trap-set': fx([
    ...repeat(tone(900, 0.05, { wave: 'square', gain: 0.09 }), 2, 0.07, { rate: 1.3 }),
    noise(0.06, { gain: 0.08, color: 'white', filter: { type: 'bandpass', freq: 2200, q: 2 }, delay: 0.07 }),
  ], { minGap: 110 }),

  'trap-snap': fx([
    noise(0.12, { gain: 0.2, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 700, q: 1.6 }, release: 0.08 }),
    ...stack(420, 0.3, [1, 1.41], { gain: 0.11, release: 0.22, reverb: 0.3, fm: { ratio: 1.41, index: 1, indexEnd: 0.05 } }),
  ], { minGap: 80 }),

  'grapple': fx([
    noise(0.3, { gain: 0.12, color: 'pink', filter: { type: 'bandpass', freq: 1200, freqEnd: 2600, q: 1.6 }, attack: 0.02, release: 0.2 }),
    rise(240, 700, 0.3, { wave: 'square', gain: 0.08, release: 0.2 }),
  ], { minGap: 90 }),

  // ── Acid / oil / slime ──
  'acid-spray': fx([
    noise(0.4, { gain: 0.16, color: 'pink', filter: { type: 'bandpass', freq: 1600, freqEnd: 3600, q: 1.4 }, attack: 0.02, release: 0.3 }),
    ...repeat(tone(600, 0.09, { wave: 'sine', gain: 0.06, freqEnd: 900 }), 4, 0.06, { rate: 0.94, gain: 0.86 }),
  ], { minGap: 70 }),

  'sizzle': fx([
    noise(0.8, { gain: 0.11, color: 'white', filter: { type: 'bandpass', freq: 4200, q: 1.2 }, attack: 0.03, release: 0.6 }),
  ], { minGap: 300 }),

  'slime-splat': fx([
    drop(500, 130, 0.24, { wave: 'sine', gain: 0.14, release: 0.18 }),
    noise(0.24, { gain: 0.13, color: 'pink', filter: { type: 'lowpass', freq: 1400, freqEnd: 400 }, release: 0.18 }),
  ], { minGap: 55 }),

  'whip': fx([
    noise(0.16, { gain: 0.18, color: 'white', filter: { type: 'bandpass', freq: 900, freqEnd: 4600, q: 1.4 }, attack: 0.05, release: 0.06 }),
    rise(300, 1600, 0.14, { wave: 'sawtooth', gain: 0.08, release: 0.06 }),
  ], { minGap: 60 }),

  'burrow': fx([
    noise(0.7, { gain: 0.15, color: 'brown', filter: { type: 'lowpass', freq: 900, freqEnd: 260 }, attack: 0.06, release: 0.5 }),
    drop(200, 60, 0.6, { wave: 'sawtooth', gain: 0.1, filter: { type: 'lowpass', freq: 600 }, release: 0.42 }),
  ], { minGap: 180 }),

  'oil-splash': fx([
    drop(320, 90, 0.3, { wave: 'sine', gain: 0.14, release: 0.22 }),
    noise(0.34, { gain: 0.13, color: 'pink', filter: { type: 'lowpass', freq: 1100, freqEnd: 320 }, release: 0.24 }),
  ], { minGap: 70 }),

  'engine': fx([
    ...stack(70, 1.0, [1, 2, 3], { gain: 0.11, wave: 'sawtooth', attack: 0.08, release: 0.6, filter: { type: 'lowpass', freq: 700, q: 3 }, vibrato: { rate: 24, depth: 4 } }),
    noise(1.0, { gain: 0.09, color: 'brown', filter: { type: 'lowpass', freq: 500 }, attack: 0.15, release: 0.6 }),
  ], { minGap: 400 }),

  'drone-buzz': fx([
    ...stack(180, 0.6, [1, 2.01], { gain: 0.09, wave: 'square', attack: 0.04, release: 0.4, filter: { type: 'bandpass', freq: 1200, q: 3 }, vibrato: { rate: 32, depth: 12 } }),
  ], { minGap: 200 }),

  'train-horn': fx([
    ...stack(146, 1.4, [1, 1.19, 1.5], { gain: 0.16, wave: 'sawtooth', attack: 0.08, release: 0.8, reverb: 0.5, filter: { type: 'lowpass', freq: 1600 } }),
  ], { minGap: 600, important: true }),

  // ── Magnet / technology ──
  'magnet-pull': fx([
    rise(140, 520, 0.6, { wave: 'sine', gain: 0.13, attack: 0.04, release: 0.42, reverb: 0.35, vibrato: { rate: 9, depth: 16 } }),
    noise(0.5, { gain: 0.07, color: 'pink', filter: { type: 'bandpass', freq: 800, freqEnd: 2400, q: 2.4 }, attack: 0.08, release: 0.34 }),
  ], { minGap: 130 }),

  'nail': fx([
    noise(0.07, { gain: 0.14, color: 'white', filter: { type: 'bandpass', freq: 3400, freqEnd: 1400, q: 2.6 }, release: 0.05 }),
    ...stack(1200, 0.2, [1, 1.41], { gain: 0.09, release: 0.15, fm: { ratio: 1.41, index: 0.8, indexEnd: 0.05 } }),
  ], { minGap: 38 }),

  'glitch': fx([
    ...repeat(tone(1200, 0.035, { wave: 'square', gain: 0.1 }), 6, 0.04, { rate: 0.79, gain: 1.04 }),
    noise(0.22, { gain: 0.09, filter: { type: 'bandpass', freq: 2600, freqEnd: 900, q: 5 }, release: 0.16 }),
  ], { minGap: 90 }),

  'digital-beep': fx([
    tone(1046, 0.06, { wave: 'square', gain: 0.1, release: 0.03 }),
    tone(1568, 0.07, { wave: 'square', gain: 0.09, delay: 0.07, release: 0.04 }),
  ], { minGap: 60 }),

  'upload': fx([
    ...repeat(rise(600, 1400, 0.08, { wave: 'square', gain: 0.08 }), 6, 0.07, { rate: 1.11, gain: 0.97 }),
    noise(0.6, { gain: 0.06, filter: { type: 'highpass', freq: 3600 }, attack: 0.1, release: 0.4 }),
  ], { minGap: 250 }),

  'error-popup': fx([
    tone(880, 0.09, { wave: 'square', gain: 0.11, release: 0.05 }),
    tone(660, 0.11, { wave: 'square', gain: 0.11, delay: 0.1, release: 0.07 }),
  ], { minGap: 140 }),

  'robot-power': fx([
    rise(60, 380, 0.9, { wave: 'sawtooth', gain: 0.14, attack: 0.2, release: 0.4, filter: { type: 'lowpass', freq: 400, freqEnd: 2400, q: 2 } }),
    ...repeat(tone(1400, 0.05, { wave: 'square', gain: 0.06, delay: 0.5 }), 3, 0.14, { rate: 1.26 }),
  ], { minGap: 400 }),

  // ── Time / sand ──
  'clock-tick': fx([
    noise(0.03, { gain: 0.09, filter: { type: 'bandpass', freq: 2600, q: 4 } }),
    tone(1400, 0.04, { wave: 'square', gain: 0.06, release: 0.02 }),
  ], { minGap: 120 }),

  'time-warp': fx([
    drop(1200, 200, 0.8, { wave: 'triangle', gain: 0.13, attack: 0.02, release: 0.55, reverb: 0.55, vibrato: { rate: 4, depth: 40 } }),
    noise(0.8, { gain: 0.08, color: 'pink', filter: { type: 'bandpass', freq: 2400, freqEnd: 600, q: 2 }, attack: 0.1, release: 0.5 }),
  ], { minGap: 250 }),

  'time-halt': fx([
    ...stack(220, 1.6, [1, 1.5, 2], { gain: 0.14, wave: 'sine', freqEnd: 110, attack: 0.01, release: 1.1, reverb: 0.65 }),
    noise(1.4, { gain: 0.09, color: 'pink', filter: { type: 'lowpass', freq: 3000, freqEnd: 200 }, release: 1.0 }),
  ], { minGap: 500, important: true }),

  'rewind': fx([
    rise(200, 1600, 0.6, { wave: 'sawtooth', gain: 0.11, attack: 0.02, release: 0.3, filter: { type: 'bandpass', freq: 900, freqEnd: 4000, q: 2 }, reverb: 0.4 }),
    ...repeat(noise(0.04, { gain: 0.06, filter: { type: 'bandpass', freq: 3000, q: 4 } }), 6, 0.09, { gain: 1.03 }),
  ], { minGap: 250 }),

  'sand': fx([
    noise(0.5, { gain: 0.12, color: 'white', filter: { type: 'bandpass', freq: 5200, q: 0.8 }, attack: 0.05, release: 0.36 }),
  ], { minGap: 150 }),

  // ── Fate / magic ──
  'card-throw': fx([
    noise(0.14, { gain: 0.12, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 5200, q: 1.4 }, attack: 0.01, release: 0.1 }),
    rise(700, 1500, 0.14, { wave: 'triangle', gain: 0.08, release: 0.1 }),
  ], { minGap: 40 }),

  'card-shuffle': fx([
    ...repeat(noise(0.035, { gain: 0.08, color: 'white', filter: { type: 'bandpass', freq: 3400, q: 1.6 } }), 7, 0.032, { gain: 0.96 }),
  ], { minGap: 130 }),

  'dice': fx([
    ...repeat(noise(0.045, { gain: 0.1, color: 'brown', filter: { type: 'bandpass', freq: 1400, q: 2 } }), 5, 0.06, { gain: 0.88 }),
    tone(700, 0.1, { wave: 'sine', gain: 0.07, delay: 0.3, reverb: 0.3 }),
  ], { minGap: 200 }),

  'jackpot': fx([
    ...arp(880, [0, 4, 7, 12, 7, 12, 16], 0.4, 0.07, { wave: 'square', gain: 0.11, reverb: 0.4 }),
    ...stack(1760, 0.8, [1, 1.5], { gain: 0.09, delay: 0.5, attack: 0.02, release: 0.5, reverb: 0.55 }),
  ], { minGap: 500, important: true }),

  'sparkle': fx([
    ...arp(1318, [0, 7, 12, 19], 0.22, 0.04, { wave: 'sine', gain: 0.09, reverb: 0.45 }),
  ], { minGap: 55 }),

  'spellbook': fx([
    noise(0.3, { gain: 0.1, color: 'pink', filter: { type: 'bandpass', freq: 1200, freqEnd: 400, q: 1 }, attack: 0.02, release: 0.22 }),
    ...stack(220, 0.7, [1, 1.5, 2.4], { gain: 0.09, wave: 'triangle', attack: 0.06, release: 0.5, reverb: 0.5 }),
  ], { minGap: 160 }),

  'incantation': fx([
    ...stack(146, 1.6, [1, 1.5, 2.02, 3.01], { gain: 0.12, wave: 'sawtooth', attack: 0.35, release: 1.0, reverb: 0.65, filter: { type: 'lowpass', freq: 500, freqEnd: 2200 } }),
    ...arp(587, [0, 3, 7, 10], 0.5, 0.16, { wave: 'sine', gain: 0.08, delay: 0.5, reverb: 0.6 }),
  ], { minGap: 600, important: true }),

  'curse-cast': fx([
    drop(520, 90, 0.9, { wave: 'sawtooth', gain: 0.13, attack: 0.04, release: 0.6, filter: { type: 'lowpass', freq: 1600, freqEnd: 260 }, reverb: 0.5 }),
  ], { minGap: 200 }),

  // ── Rubber ──
  'boing': fx([
    tone(420, 0.34, { wave: 'sine', gain: 0.16, freqEnd: 140, attack: 0.004, release: 0.26, vibrato: { rate: 16, depth: 55 } }),
  ], { minGap: 60 }),

  'stretch': fx([
    rise(180, 640, 0.5, { wave: 'triangle', gain: 0.12, attack: 0.05, release: 0.3, vibrato: { rate: 7, depth: 12 } }),
    noise(0.45, { gain: 0.06, color: 'pink', filter: { type: 'bandpass', freq: 1400, freqEnd: 3000, q: 2.4 }, attack: 0.1, release: 0.3 }),
  ], { minGap: 110 }),

  'snap-back': fx([
    drop(1200, 180, 0.24, { wave: 'sine', gain: 0.15, release: 0.18, vibrato: { rate: 20, depth: 40 } }),
    noise(0.1, { gain: 0.1, color: 'white', filter: { type: 'bandpass', freq: 2000, q: 1.6 } }),
  ], { minGap: 70 }),

  // ── Silence / subterfuge ──
  'hush': fx([
    noise(0.9, { gain: 0.12, color: 'pink', filter: { type: 'lowpass', freq: 3400, freqEnd: 140 }, attack: 0.06, release: 0.65, reverb: 0.4 }),
    drop(420, 60, 0.85, { wave: 'sine', gain: 0.09, release: 0.6 }),
  ], { minGap: 350 }),

  'heartbeat': fx([
    drop(90, 48, 0.16, { gain: 0.2, release: 0.12 }),
    drop(84, 44, 0.14, { gain: 0.13, delay: 0.2, release: 0.11 }),
  ], { minGap: 500 }),

  'claw': fx([
    ...repeat(noise(0.09, { gain: 0.14, color: 'white', filter: { type: 'bandpass', freq: 2600, freqEnd: 900, q: 2.2 } }), 3, 0.045, { gain: 0.9 }),
    drop(500, 180, 0.16, { wave: 'sawtooth', gain: 0.09, release: 0.12 }),
  ], { minGap: 50 }),

  'money': fx([
    ...repeat(noise(0.05, { gain: 0.07, color: 'white', filter: { type: 'bandpass', freq: 4200, q: 1.6 } }), 4, 0.045, { gain: 0.9 }),
    ...arp(1046, [0, 7], 0.2, 0.06, { wave: 'sine', gain: 0.09, delay: 0.06, reverb: 0.35 }),
  ], { minGap: 120 }),

  'smoke': fx([
    noise(0.9, { gain: 0.14, color: 'pink', filter: { type: 'bandpass', freq: 600, freqEnd: 2000, q: 0.7 }, attack: 0.12, release: 0.6 }),
    drop(300, 120, 0.7, { wave: 'sine', gain: 0.07, release: 0.5 }),
  ], { minGap: 250 }),

  // ── Dream / justice ──
  'dream-chime': fx([
    ...stack(660, 1.4, [1, 1.5, 2.01, 3.02], { gain: 0.1, wave: 'sine', attack: 0.06, release: 1.0, reverb: 0.7, vibrato: { rate: 3, depth: 4 } }),
  ], { minGap: 130 }),

  'pillow': fx([
    noise(0.26, { gain: 0.15, color: 'brown', filter: { type: 'lowpass', freq: 700, freqEnd: 220 }, attack: 0.01, release: 0.2 }),
    drop(180, 90, 0.22, { wave: 'sine', gain: 0.11, release: 0.16 }),
  ], { minGap: 55 }),

  'nightmare': fx([
    ...stack(73, 1.8, [1, 1.19, 1.62, 2.4], { gain: 0.13, wave: 'sawtooth', attack: 0.2, release: 1.2, reverb: 0.7, filter: { type: 'lowpass', freq: 700, freqEnd: 1800 }, vibrato: { rate: 3.5, depth: 6 } }),
    noise(1.8, { gain: 0.1, color: 'brown', filter: { type: 'bandpass', freq: 300, freqEnd: 1200, q: 1.4 }, attack: 0.5, release: 1.1 }),
  ], { minGap: 600, important: true }),

  'spear-throw': fx([
    noise(0.2, { gain: 0.14, color: 'white', filter: { type: 'bandpass', freq: 1400, freqEnd: 4200, q: 1.6 }, attack: 0.04, release: 0.12 }),
    rise(320, 900, 0.18, { wave: 'sawtooth', gain: 0.09, release: 0.12 }),
  ], { minGap: 50 }),

  'judgement': fx([
    ...stack(392, 2.0, [1, 1.5, 2, 3], { gain: 0.15, wave: 'sawtooth', attack: 0.25, release: 1.3, reverb: 0.7, filter: { type: 'lowpass', freq: 900, freqEnd: 3600 } }),
    drop(160, 44, 1.8, { gain: 0.18, attack: 0.1, release: 1.2 }),
    noise(1.6, { gain: 0.1, color: 'white', filter: { type: 'highpass', freq: 3000 }, attack: 0.5, release: 1.0 }),
  ], { minGap: 700, important: true }),

  'holy-chord': fx([
    ...stack(523, 1.6, [1, 1.25, 1.5, 2], { gain: 0.12, wave: 'triangle', attack: 0.2, release: 1.1, reverb: 0.7 }),
  ], { minGap: 400 }),

  'wings': fx([
    ...repeat(noise(0.16, { gain: 0.1, color: 'pink', filter: { type: 'bandpass', freq: 900, freqEnd: 2400, q: 1.2 }, attack: 0.04 }), 3, 0.19, { gain: 0.9 }),
  ], { minGap: 250 }),

  // ── Creation ──
  'hammer-forge': fx([
    ...stack(340, 0.5, [1, 1.41, 2.7], { gain: 0.15, attack: 0.001, release: 0.38, reverb: 0.4, fm: { ratio: 1.41, index: 1.4, indexEnd: 0.06 } }),
    drop(150, 50, 0.24, { gain: 0.16, release: 0.18 }),
    noise(0.08, { gain: 0.11, filter: { type: 'highpass', freq: 3400 } }),
  ], { minGap: 70 }),

  'gear-turn': fx([
    ...repeat(tone(420, 0.06, { wave: 'square', gain: 0.07, filter: { type: 'lowpass', freq: 1600 } }), 5, 0.075, { rate: 1.05, gain: 0.94 }),
  ], { minGap: 160 }),

  'craft-complete': fx([
    ...arp(659, [0, 4, 7], 0.3, 0.06, { wave: 'triangle', gain: 0.13, reverb: 0.4 }),
    noise(0.16, { gain: 0.08, filter: { type: 'highpass', freq: 3600 }, delay: 0.14, release: 0.12 }),
  ], { minGap: 200 }),

  'potion-drink': fx([
    ...repeat(rise(260, 520, 0.1, { wave: 'sine', gain: 0.1 }), 3, 0.11, { rate: 1.12, gain: 0.95 }),
    ...arp(880, [0, 7], 0.24, 0.07, { wave: 'sine', gain: 0.08, delay: 0.34, reverb: 0.4 }),
  ], { minGap: 200 }),

  'mortar-launch': fx([
    drop(300, 90, 0.3, { wave: 'sine', gain: 0.18, release: 0.22 }),
    noise(0.4, { gain: 0.15, color: 'brown', filter: { type: 'lowpass', freq: 1800, freqEnd: 400 }, release: 0.3 }),
  ], { minGap: 100 }),

  // ── Generic fallbacks ───────────────────────────────────────────────
  //
  // Used by `AbilitySounds.ts` when an ability has no bespoke entry. Shaped by
  // slot: a Click is fast and light, a Q is slow and huge.
  'cast-click': fx([
    noise(0.11, { gain: 0.13, color: 'white', filter: { type: 'bandpass', freq: 2200, freqEnd: 900, q: 1.3 }, release: 0.08 }),
    drop(760, 280, 0.13, { wave: 'triangle', gain: 0.1, release: 0.1 }),
  ], { minGap: 35 }),

  'cast-e': fx([
    noise(0.24, { gain: 0.13, color: 'pink', filter: { type: 'bandpass', freq: 900, freqEnd: 2600, q: 1 }, attack: 0.02, release: 0.16 }),
    rise(280, 700, 0.24, { wave: 'triangle', gain: 0.11, release: 0.16, reverb: 0.25 }),
  ], { minGap: 60 }),

  'cast-r': fx([
    ...stack(300, 0.44, [1, 1.5], { gain: 0.12, wave: 'triangle', attack: 0.01, release: 0.32, reverb: 0.3 }),
    noise(0.34, { gain: 0.12, color: 'pink', filter: { type: 'bandpass', freq: 1200, freqEnd: 500, q: 1.1 }, release: 0.24 }),
    drop(220, 90, 0.3, { gain: 0.11, release: 0.22 }),
  ], { minGap: 80 }),

  'cast-f': fx([
    rise(200, 620, 0.5, { wave: 'sawtooth', gain: 0.12, attack: 0.05, release: 0.3, filter: { type: 'lowpass', freq: 1400, freqEnd: 3000 }, reverb: 0.3 }),
    noise(0.45, { gain: 0.09, color: 'pink', filter: { type: 'bandpass', freq: 1400, q: 1.2 }, attack: 0.06, release: 0.3 }),
  ], { minGap: 110 }),

  'cast-q': fx([
    ...stack(160, 1.5, [1, 1.5, 2, 3], { gain: 0.14, wave: 'sawtooth', attack: 0.2, release: 1.0, reverb: 0.55, filter: { type: 'lowpass', freq: 500, freqEnd: 2600 } }),
    drop(200, 55, 1.4, { gain: 0.16, attack: 0.05, release: 0.9 }),
    noise(1.4, { gain: 0.11, color: 'pink', filter: { type: 'bandpass', freq: 800, freqEnd: 2800, q: 0.8 }, attack: 0.3, release: 0.9 }),
  ], { minGap: 250, important: true }),
};

export type SoundName = keyof typeof SOUNDS;

/** Every recipe name, for the settings-screen preview and for validation. */
export const SOUND_NAMES = Object.keys(SOUNDS);

// `semi` is re-exported so ability mappings can express pitch shifts musically
// (`rate: semi(-3)`) rather than as opaque decimals.
export { semi };
