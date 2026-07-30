/**
 * Elemental's sound engine.
 *
 * There are no audio files in this project, for the same reason there are no image
 * files: everything is generated in code. `BootScene` draws every sprite with the
 * graphics API; this module synthesises every sound with WebAudio oscillators and
 * noise buffers. A sound is a small declarative recipe (see `SoundLibrary.ts`) that
 * this file renders into a throwaway graph of nodes.
 *
 * Signal path:
 *
 *   voices ──┬─────────────────────────► sfxBus ──┐
 *            └─► reverbSend ─► convolver ─────────┤
 *   music ─────────────────────────────► musicBus ┴─► master ─► compressor ─► out
 *
 * The compressor exists because a busy fight can fire a dozen sounds in the same
 * frame; without it the sum clips into digital distortion. The voice cap and the
 * per-name dedupe window exist for the same reason, one layer earlier.
 */

/** Oscillator shapes we use. */
export type Wave = OscillatorType;

/** A pitched voice: one oscillator (optionally FM-modulated) through an amp envelope. */
export interface ToneLayer {
  kind?: 'tone';
  wave?: Wave;
  /** Starting frequency in Hz. */
  freq: number;
  /** Frequency to glide to across `dur`. Omit for a steady pitch. */
  freqEnd?: number;
  /** Exponential glides sound musical; linear ones sound mechanical. */
  glide?: 'exp' | 'lin';
  /** Total voice length in seconds. */
  dur: number;
  /** Peak amplitude, 0–1, before bus volume. */
  gain?: number;
  /** Attack time in seconds. Very short = clicky and percussive. */
  attack?: number;
  /** Time to fall from peak to the sustain level. */
  decay?: number;
  /** Sustain level as a fraction of peak. */
  sustain?: number;
  /** Fade-out at the end of `dur`. */
  release?: number;
  /** Cents of detune — a few cents on a stacked layer gives chorus-y width. */
  detune?: number;
  /** Frequency-modulation for metallic/bell/growl timbres. */
  fm?: { ratio: number; index: number; indexEnd?: number };
  /** Pitch wobble. */
  vibrato?: { rate: number; depth: number };
  /** Optional per-voice filter, with its own optional sweep. */
  filter?: { type?: BiquadFilterType; freq: number; freqEnd?: number; q?: number };
  /** Stereo position, -1 (left) to 1 (right). */
  pan?: number;
  /** Seconds to wait before this layer starts — used to build rolls and arpeggios. */
  delay?: number;
  /** How much of this layer to feed the shared reverb, 0–1. */
  reverb?: number;
}

/** An unpitched voice: filtered noise. Every impact, whoosh and hiss in the game. */
export interface NoiseLayer {
  kind: 'noise';
  /** Pink noise is darker and more natural for wind/fire; white is brighter for hiss. */
  color?: 'white' | 'pink' | 'brown';
  dur: number;
  gain?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  filter?: { type?: BiquadFilterType; freq: number; freqEnd?: number; q?: number };
  /** Playback rate on the noise buffer — higher is grittier. */
  rate?: number;
  pan?: number;
  delay?: number;
  reverb?: number;
}

export type Layer = ToneLayer | NoiseLayer;

/** A complete sound: a stack of layers plus mixing hints. */
export interface SoundRecipe {
  layers: Layer[];
  /** Master trim for the whole recipe. */
  gain?: number;
  /**
   * Minimum milliseconds between two plays of this sound. Rapid-fire sounds (a
   * machine-gun click attack) set this low; heavy ones set it high so they can't
   * stack into mush. Defaults to 30ms.
   */
  minGap?: number;
  /**
   * Sounds flagged important bypass the voice cap — a death or a victory sting
   * must never be dropped just because the screen is busy.
   */
  important?: boolean;
}

/** Per-play overrides. */
export interface PlayOptions {
  /** Multiplies the recipe gain. */
  volume?: number;
  /** Multiplies every frequency in the recipe — 2 is an octave up. */
  rate?: number;
  /** Stereo placement, -1 to 1. Added to each layer's own pan. */
  pan?: number;
  /** Extra seconds of delay before the whole sound starts. */
  delay?: number;
  /** Skip the dedupe window (for sounds that legitimately repeat fast). */
  force?: boolean;
}

// ── Engine state ──────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let musicBus: GainNode;
let reverbSend: GainNode;
let noiseBuffers: Partial<Record<'white' | 'pink' | 'brown', AudioBuffer>> = {};

/** Voices currently sounding. Compared against MAX_VOICES before starting a new one. */
let activeVoices = 0;
const MAX_VOICES = 28;

/** name → last play timestamp, for the dedupe window. */
const lastPlayed = new Map<string, number>();

let sfxVolume = 0.7;
let musicVolume = 0.45;
let muted = false;

/** True once a user gesture has let us start the context. */
let unlocked = false;

export function isReady(): boolean {
  return ctx !== null && ctx.state === 'running';
}

export function audioContext(): AudioContext | null {
  return ctx;
}

export function musicBusNode(): GainNode | null {
  return ctx ? musicBus : null;
}

export function now(): number {
  return ctx ? ctx.currentTime : 0;
}

/**
 * Builds the context and the bus graph. Browsers refuse to start an AudioContext
 * outside a user gesture, so this is safe to call early — it just creates the
 * object; `unlock()` is what actually gets it running.
 */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
  } catch {
    return null;
  }

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 22;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  comp.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(comp);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxVolume;
  sfxBus.connect(master);

  musicBus = ctx.createGain();
  musicBus.gain.value = musicVolume;
  musicBus.connect(master);

  // Reverb: a convolver fed a synthesised impulse response. Cheaper and far
  // better-sounding than a delay network, and the IR is just more noise-in-code.
  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulseResponse(ctx, 1.6, 3.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  convolver.connect(wet);
  wet.connect(sfxBus);

  reverbSend = ctx.createGain();
  reverbSend.gain.value = 1;
  reverbSend.connect(convolver);

  noiseBuffers = {
    white: buildNoise(ctx, 'white'),
    pink: buildNoise(ctx, 'pink'),
    brown: buildNoise(ctx, 'brown'),
  };

  return ctx;
}

/** Exponentially decaying noise burst — a serviceable hall. */
function buildImpulseResponse(c: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/**
 * Two seconds of looping noise, generated once and reused by every noise voice.
 * Pink and brown are made by filtering white with cheap one-pole approximations —
 * pink for wind and fire, brown for rumble and impacts.
 */
function buildNoise(c: AudioContext, color: 'white' | 'pink' | 'brown'): AudioBuffer {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);

  if (color === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }

  // Paul Kellet's pink-noise filter — a well-known 7-pole approximation.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

/**
 * Starts the context on a user gesture. Called from a one-shot pointer/key listener
 * installed by `install()`; browsers reject any earlier attempt.
 */
export function unlock(): void {
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  unlocked = true;
}

export function isUnlocked(): boolean {
  return unlocked;
}

/** Installs the gesture listeners that unlock playback. Call once, from main.ts. */
export function install(): void {
  const kick = () => {
    unlock();
    if (isReady()) {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchstart', kick);
    }
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
  window.addEventListener('touchstart', kick);

  // A backgrounded tab keeps scheduling voices it will never render audibly;
  // suspending frees the audio thread and stops the scheduler drifting.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (unlocked) void ctx.resume();
  });
}

// ── Volume ────────────────────────────────────────────────────────────

export function setSfxVolume(v: number): void {
  sfxVolume = Math.max(0, Math.min(1, v));
  if (ctx) sfxBus.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.02);
}

export function setMusicVolume(v: number): void {
  musicVolume = Math.max(0, Math.min(1, v));
  if (ctx) musicBus.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.05);
}

export function setMuted(m: boolean): void {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02);
}

export function getSfxVolume(): number { return sfxVolume; }
export function getMusicVolume(): number { return musicVolume; }
export function isMuted(): boolean { return muted; }

// ── Voice rendering ───────────────────────────────────────────────────

function isNoise(l: Layer): l is NoiseLayer {
  return l.kind === 'noise';
}

/**
 * Writes an ADSR contour onto a gain param. Peak is reached at `attack`, then the
 * level decays to `sustain × peak` and holds until the release ramp at the end.
 * Linear ramps throughout — `exponentialRampToValueAtTime` cannot reach zero, and
 * every non-zero tail here would be an audible click.
 */
function applyEnvelope(
  param: AudioParam, t0: number, peak: number,
  attack: number, decay: number, sustain: number, release: number, dur: number,
): void {
  const a = Math.max(0.001, attack);
  const d = Math.max(0, decay);
  const r = Math.max(0.005, release);
  // A long attack+decay on a short sound would never reach the release; squeeze
  // the stages proportionally so the contour always fits inside `dur`.
  const body = Math.max(0.001, dur - r);
  const scale = a + d > body ? body / (a + d) : 1;
  const aT = a * scale;
  const dT = d * scale;
  const sustainLevel = peak * Math.max(0, Math.min(1, sustain));

  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(peak, t0 + aT);
  if (dT > 0) param.linearRampToValueAtTime(sustainLevel, t0 + aT + dT);
  param.setValueAtTime(dT > 0 ? sustainLevel : peak, t0 + body);
  param.linearRampToValueAtTime(0.0001, t0 + body + r);
}

/** Ramps a frequency param from `from` to `to`, exponentially unless told otherwise. */
function sweep(param: AudioParam, from: number, to: number, t0: number, dur: number, mode: 'exp' | 'lin'): void {
  param.setValueAtTime(from, t0);
  if (mode === 'exp' && from > 0 && to > 0) param.exponentialRampToValueAtTime(to, t0 + dur);
  else param.linearRampToValueAtTime(to, t0 + dur);
}

function spawnLayer(c: AudioContext, layer: Layer, startAt: number, vol: number, rateMult: number, panShift: number): void {
  const dur = Math.max(0.01, layer.dur);
  const t0 = startAt + (layer.delay ?? 0);
  const peak = (layer.gain ?? 0.5) * vol;
  if (peak <= 0.0005) return;

  const amp = c.createGain();
  applyEnvelope(
    amp.gain, t0, peak,
    layer.attack ?? 0.005, layer.decay ?? dur * 0.4,
    layer.sustain ?? 0.6, layer.release ?? Math.min(0.25, dur * 0.4), dur,
  );

  // Panner is optional: skipping it when centred saves a node per voice, and
  // a busy fight spawns a lot of voices.
  const pan = Math.max(-1, Math.min(1, (layer.pan ?? 0) + panShift));
  let tail: AudioNode = amp;
  if (pan !== 0) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    amp.connect(p);
    tail = p;
  }
  tail.connect(sfxBus);
  if (layer.reverb) {
    const send = c.createGain();
    send.gain.value = layer.reverb;
    tail.connect(send);
    send.connect(reverbSend);
  }

  // Optional per-voice filter sits between the source and the amp envelope.
  let sink: AudioNode = amp;
  if (layer.filter) {
    const f = c.createBiquadFilter();
    f.type = layer.filter.type ?? 'lowpass';
    f.Q.value = layer.filter.q ?? 1;
    const ff = layer.filter.freq * rateMult;
    const fe = layer.filter.freqEnd !== undefined ? layer.filter.freqEnd * rateMult : undefined;
    if (fe !== undefined) sweep(f.frequency, ff, fe, t0, dur, 'exp');
    else f.frequency.setValueAtTime(ff, t0);
    f.connect(amp);
    sink = f;
  }

  const stopAt = t0 + dur + 0.06;
  activeVoices++;

  if (isNoise(layer)) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffers[layer.color ?? 'white']!;
    src.loop = true;
    src.playbackRate.value = layer.rate ?? 1;
    src.connect(sink);
    src.start(t0);
    src.stop(stopAt);
    src.onended = () => { activeVoices--; };
    return;
  }

  const osc = c.createOscillator();
  osc.type = layer.wave ?? 'sine';
  if (layer.detune) osc.detune.value = layer.detune;

  const f0 = layer.freq * rateMult;
  if (layer.freqEnd !== undefined) sweep(osc.frequency, f0, layer.freqEnd * rateMult, t0, dur, layer.glide ?? 'exp');
  else osc.frequency.setValueAtTime(f0, t0);

  // FM: a second oscillator driving this one's frequency. `index` is in Hz of
  // deviation, so it scales with the carrier to keep the timbre constant.
  if (layer.fm) {
    const mod = c.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = f0 * layer.fm.ratio;
    const modGain = c.createGain();
    const idx = f0 * layer.fm.index;
    if (layer.fm.indexEnd !== undefined) {
      modGain.gain.setValueAtTime(idx, t0);
      modGain.gain.linearRampToValueAtTime(f0 * layer.fm.indexEnd, t0 + dur);
    } else {
      modGain.gain.value = idx;
    }
    mod.connect(modGain);
    modGain.connect(osc.frequency);
    mod.start(t0);
    mod.stop(stopAt);
  }

  if (layer.vibrato) {
    const lfo = c.createOscillator();
    lfo.frequency.value = layer.vibrato.rate;
    const depth = c.createGain();
    depth.gain.value = layer.vibrato.depth * rateMult;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(stopAt);
  }

  osc.connect(sink);
  osc.start(t0);
  osc.stop(stopAt);
  osc.onended = () => { activeVoices--; };
}

/**
 * Renders a recipe. Returns false when the sound was dropped — by the dedupe
 * window, the voice cap, or a context that has not been unlocked yet.
 */
export function render(name: string, recipe: SoundRecipe, opts: PlayOptions = {}): boolean {
  const c = ctx;
  if (!c || c.state !== 'running') return false;

  const wall = performance.now();
  if (!opts.force) {
    const gap = recipe.minGap ?? 30;
    const last = lastPlayed.get(name) ?? -Infinity;
    if (wall - last < gap) return false;
  }
  lastPlayed.set(name, wall);

  if (!recipe.important && activeVoices + recipe.layers.length > MAX_VOICES) return false;

  const startAt = c.currentTime + 0.001 + (opts.delay ?? 0);
  const vol = (recipe.gain ?? 1) * (opts.volume ?? 1);
  const rate = opts.rate ?? 1;
  const pan = opts.pan ?? 0;
  for (const layer of recipe.layers) spawnLayer(c, layer, startAt, vol, rate, pan);
  return true;
}

// ── Recipe-writing helpers ────────────────────────────────────────────
//
// These exist so `SoundLibrary.ts` reads like a description of a sound rather
// than a wall of object literals.

/** A short pitched blip. */
export function tone(freq: number, dur: number, o: Partial<ToneLayer> = {}): ToneLayer {
  return { freq, dur, gain: 0.4, attack: 0.004, decay: dur * 0.5, sustain: 0.3, release: dur * 0.4, ...o };
}

/** A filtered noise burst — the workhorse for impacts, whooshes and hisses. */
export function noise(dur: number, o: Partial<NoiseLayer> = {}): NoiseLayer {
  return {
    kind: 'noise', dur, gain: 0.35, color: 'white',
    attack: 0.002, decay: dur * 0.6, sustain: 0.15, release: dur * 0.35, ...o,
  };
}

/** Downward pitch drop: thumps, impacts, land. */
export function drop(from: number, to: number, dur: number, o: Partial<ToneLayer> = {}): ToneLayer {
  return tone(from, dur, { freqEnd: to, wave: 'sine', ...o });
}

/** Upward pitch rise: charges, pickups, power-ups. */
export function rise(from: number, to: number, dur: number, o: Partial<ToneLayer> = {}): ToneLayer {
  return tone(from, dur, { freqEnd: to, wave: 'triangle', ...o });
}

/** Stacks a fundamental plus overtones — instant "chord" body from one call. */
export function stack(freq: number, dur: number, ratios: number[], o: Partial<ToneLayer> = {}): ToneLayer[] {
  return ratios.map((r, i) => {
    const layer = tone(freq * r, dur, o);
    layer.freq = freq * r;
    if (o.freqEnd !== undefined) layer.freqEnd = o.freqEnd * r;
    // Overtones sit progressively quieter than the fundamental, which is what
    // makes the stack read as one timbre instead of a cluster of separate beeps.
    layer.gain = (o.gain ?? 0.3) / (1 + i * 0.8);
    return layer;
  });
}

/** Repeats a layer N times at a fixed interval, optionally drifting pitch and level. */
export function repeat(
  layer: Layer, count: number, intervalSec: number,
  step: { rate?: number; gain?: number; pan?: number } = {},
): Layer[] {
  const out: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const copy: Layer = { ...layer } as Layer;
    copy.delay = (layer.delay ?? 0) + i * intervalSec;
    copy.gain = (layer.gain ?? 0.4) * Math.pow(step.gain ?? 1, i);
    if (step.pan) copy.pan = (layer.pan ?? 0) + step.pan * i;
    if (step.rate && !isNoise(copy)) {
      const t = copy as ToneLayer;
      const m = Math.pow(step.rate, i);
      t.freq *= m;
      if (t.freqEnd !== undefined) t.freqEnd *= m;
    }
    out.push(copy);
  }
  return out;
}

/** Plays a list of semitone offsets from a root as a melodic run. */
export function arp(
  rootHz: number, semitones: number[], noteDur: number, gapSec: number,
  o: Partial<ToneLayer> = {},
): ToneLayer[] {
  return semitones.map((s, i) => tone(rootHz * Math.pow(2, s / 12), noteDur, {
    wave: 'triangle', gain: 0.3, ...o, delay: (o.delay ?? 0) + i * gapSec,
  }));
}

/** Semitone offset → frequency multiplier. */
export function semi(n: number): number {
  return Math.pow(2, n / 12);
}
