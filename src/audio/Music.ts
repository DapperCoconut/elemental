/**
 * Generative background music.
 *
 * There is no soundtrack file — each track is a description of a groove (tempo,
 * scale, chord progression, and which voices play on which sixteenth) that gets
 * rendered a fraction of a second ahead of the playhead. Because it is generated
 * rather than looped, it never has a seam, and the arena track can thicken as a
 * fight gets desperate without cross-fading between stems.
 *
 * Scheduling uses the standard two-clock approach: a coarse `setInterval` wakes
 * up every 25ms and schedules every step that falls inside the next 150ms using
 * exact `AudioContext` times. Timing therefore comes from the audio clock, not
 * from the timer, so a stuttering frame never makes the music stumble.
 */

import { audioContext, musicBusNode } from './Synth';

/** Semitone sets. Minor and phrygian carry the darker fights. */
const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  pentatonic: [0, 3, 5, 7, 10],
};

type ScaleName = keyof typeof SCALES;

interface TrackDef {
  bpm: number;
  /** Tonic in Hz — low, since most voices transpose up from here. */
  root: number;
  scale: ScaleName;
  /** Semitone offset of the tonic for each bar, cycled. */
  progression: number[];
  /** Which voices are allowed at all, and the intensity each needs to switch on. */
  voices: Partial<Record<VoiceName, number>>;
  /** Overall level for the whole track. */
  gain?: number;
  /** Swing amount, 0–0.5 — offsets every odd sixteenth later. */
  swing?: number;
}

type VoiceName =
  | 'kick' | 'snare' | 'hat' | 'bass' | 'arp' | 'pad' | 'lead' | 'pulse' | 'toms'
  // The haunted-mansion voices — only the invasion track uses them.
  | 'drone' | 'bell' | 'wail';

export type TrackName =
  | 'title' | 'menu' | 'shop' | 'lab' | 'campaign'
  | 'arena' | 'boss' | 'invasion' | 'online' | 'gauntlet';

const TRACKS: Record<TrackName, TrackDef> = {
  // Wide and slow — the game's theme, carried by a pad and a distant bell.
  title: {
    bpm: 74, root: 65.4, scale: 'minor', progression: [0, 0, -4, -2],
    voices: { pad: 0, arp: 0, bass: 0.2 }, gain: 0.9,
  },
  // A pulse under the menus so they don't feel like a static page.
  menu: {
    bpm: 96, root: 73.4, scale: 'dorian', progression: [0, 3, -2, 0],
    voices: { pad: 0, bass: 0, arp: 0.15, hat: 0.4, pulse: 0 }, gain: 0.85,
  },
  shop: {
    bpm: 88, root: 87.3, scale: 'major', progression: [0, 5, 3, -2],
    voices: { pad: 0, arp: 0, bass: 0.2, hat: 0.5 }, gain: 0.8,
  },
  lab: {
    bpm: 82, root: 61.7, scale: 'dorian', progression: [0, 0, 2, 3],
    voices: { pad: 0, pulse: 0, arp: 0.3, bass: 0.2 }, gain: 0.8,
  },
  campaign: {
    bpm: 104, root: 73.4, scale: 'minor', progression: [0, 5, 3, 7],
    voices: { pad: 0, bass: 0, arp: 0.2, hat: 0.3, kick: 0.4, snare: 0.6 }, gain: 0.85,
  },
  // The fight groove. Everything above ~0.5 intensity only appears when the
  // fight is actually going badly, which is what makes low HP feel different.
  arena: {
    bpm: 132, root: 55, scale: 'minor', progression: [0, 0, 5, 3],
    voices: { kick: 0, bass: 0, hat: 0.15, snare: 0.3, arp: 0.45, pad: 0.2, lead: 0.75, toms: 0.85 },
    gain: 0.95, swing: 0.08,
  },
  boss: {
    bpm: 148, root: 46.2, scale: 'phrygian', progression: [0, 0, 1, -1],
    voices: { kick: 0, bass: 0, snare: 0.1, hat: 0.2, pad: 0, toms: 0.4, lead: 0.55, arp: 0.7 },
    gain: 1.0,
  },
  // The mansion under siege. A slow phrygian dirge: a beating low drone, a
  // funeral bell with a tritone ghost, and a far-off wail a half-step out of
  // tune with itself. The kick is a heartbeat that only arrives once the
  // fight turns desperate — at rest the house just breathes.
  invasion: {
    bpm: 72, root: 43.7, scale: 'phrygian', progression: [0, 0, 1, -4],
    voices: { drone: 0, bell: 0, pad: 0, wail: 0.25, bass: 0.35, hat: 0.5, kick: 0.55, toms: 0.65, snare: 0.75, arp: 0.85 },
    gain: 0.95,
  },
  online: {
    bpm: 138, root: 58.3, scale: 'dorian', progression: [0, 5, 3, 7],
    voices: { kick: 0, bass: 0, hat: 0.1, snare: 0.25, arp: 0.4, pulse: 0.3, lead: 0.7 },
    gain: 0.95, swing: 0.06,
  },
  gauntlet: {
    bpm: 142, root: 51.9, scale: 'minor', progression: [0, -2, 3, 5],
    voices: { kick: 0, bass: 0, hat: 0.15, snare: 0.3, toms: 0.5, arp: 0.5, lead: 0.7 },
    gain: 0.95,
  },
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_WINDOW = 0.15;
const STEPS_PER_BAR = 16;

let timer: number | null = null;
let current: TrackName | null = null;
let def: TrackDef | null = null;
let nextStepTime = 0;
let step = 0;
let bar = 0;
/** Track gain, so a track can fade rather than cut. */
let trackGain: GainNode | null = null;

let intensity = 0.35;
let targetIntensity = 0.35;
let enabled = true;

/** Semitone offset → multiplier against the track root. */
function hz(root: number, semitones: number): number {
  return root * Math.pow(2, semitones / 12);
}

/** Nth degree of the scale, wrapping into higher octaves past the top. */
function degree(scaleName: ScaleName, n: number): number {
  const s = SCALES[scaleName];
  const oct = Math.floor(n / s.length);
  return s[((n % s.length) + s.length) % s.length] + oct * 12;
}

// ── Voice rendering ───────────────────────────────────────────────────

function note(
  c: AudioContext, dest: AudioNode, freq: number, at: number, dur: number,
  o: {
    wave?: OscillatorType; gain?: number; attack?: number; release?: number;
    filter?: number; q?: number; detune?: number; pan?: number; sustain?: number;
  } = {},
): void {
  const osc = c.createOscillator();
  osc.type = o.wave ?? 'triangle';
  osc.frequency.value = freq;
  if (o.detune) osc.detune.value = o.detune;

  const amp = c.createGain();
  const peak = o.gain ?? 0.2;
  const a = o.attack ?? 0.008;
  const r = o.release ?? Math.min(0.3, dur * 0.6);
  const body = Math.max(0.01, dur - r);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(peak, at + a);
  amp.gain.linearRampToValueAtTime(peak * (o.sustain ?? 0.7), at + body);
  amp.gain.linearRampToValueAtTime(0.0001, at + body + r);

  let head: AudioNode = amp;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    f.Q.value = o.q ?? 1;
    osc.connect(f);
    f.connect(amp);
  } else {
    osc.connect(amp);
  }

  if (o.pan) {
    const p = c.createStereoPanner();
    p.pan.value = o.pan;
    head.connect(p);
    head = p;
  }
  head.connect(dest);

  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** Percussion, all from a pitch-dropping sine plus a filtered noise burst. */
function drum(
  c: AudioContext, dest: AudioNode, kind: 'kick' | 'snare' | 'hat' | 'tom',
  at: number, gain: number,
): void {
  if (kind === 'hat') {
    const src = c.createBufferSource();
    src.buffer = hatBuffer(c);
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const amp = c.createGain();
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0005, at + 0.05);
    src.connect(f); f.connect(amp); amp.connect(dest);
    src.start(at); src.stop(at + 0.06);
    return;
  }

  const osc = c.createOscillator();
  osc.type = 'sine';
  const amp = c.createGain();

  if (kind === 'kick') {
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(38, at + 0.11);
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0005, at + 0.28);
    osc.connect(amp); amp.connect(dest);
    osc.start(at); osc.stop(at + 0.3);
    return;
  }

  if (kind === 'tom') {
    osc.frequency.setValueAtTime(220, at);
    osc.frequency.exponentialRampToValueAtTime(90, at + 0.16);
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0005, at + 0.24);
    osc.connect(amp); amp.connect(dest);
    osc.start(at); osc.stop(at + 0.26);
    return;
  }

  // Snare: a short body tone plus a band of noise, which is what gives it snap.
  osc.frequency.setValueAtTime(190, at);
  osc.frequency.exponentialRampToValueAtTime(110, at + 0.09);
  amp.gain.setValueAtTime(gain * 0.5, at);
  amp.gain.exponentialRampToValueAtTime(0.0005, at + 0.13);
  osc.connect(amp); amp.connect(dest);
  osc.start(at); osc.stop(at + 0.15);

  const src = c.createBufferSource();
  src.buffer = hatBuffer(c);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.Q.value = 0.8;
  const namp = c.createGain();
  namp.gain.setValueAtTime(gain * 0.8, at);
  namp.gain.exponentialRampToValueAtTime(0.0005, at + 0.14);
  src.connect(bp); bp.connect(namp); namp.connect(dest);
  src.start(at); src.stop(at + 0.16);
}

let cachedHat: AudioBuffer | null = null;
function hatBuffer(c: AudioContext): AudioBuffer {
  if (cachedHat) return cachedHat;
  const len = Math.floor(c.sampleRate * 0.2);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  cachedHat = b;
  return b;
}

// ── The step scheduler ────────────────────────────────────────────────

/** True when a voice is unlocked at the current intensity. */
function on(voice: VoiceName): boolean {
  const threshold = def!.voices[voice];
  return threshold !== undefined && intensity >= threshold;
}

function scheduleStep(c: AudioContext, dest: AudioNode, s: number, at: number): void {
  const d = def!;
  const chordRoot = d.progression[bar % d.progression.length];
  const root = hz(d.root, chordRoot);
  // Voices get louder as well as more numerous with intensity, so the ramp is
  // felt even before the next layer crosses its threshold.
  const drive = 0.65 + intensity * 0.55;

  if (on('kick') && (s === 0 || s === 6 || s === 8 || (s === 14 && intensity > 0.6))) {
    drum(c, dest, 'kick', at, 0.5 * drive);
  }
  if (on('snare') && (s === 4 || s === 12)) {
    drum(c, dest, 'snare', at, 0.26 * drive);
  }
  if (on('hat') && s % 2 === 0) {
    drum(c, dest, 'hat', at, (s % 4 === 0 ? 0.1 : 0.06) * drive);
  }
  if (on('toms') && (s === 10 || s === 11) && bar % 2 === 1) {
    drum(c, dest, 'tom', at, 0.2 * drive);
  }

  // Bass: root on the downbeat, fifth and octave filling the bar.
  if (on('bass') && s % 4 === 0) {
    const shape = [0, 7, 0, 12][(s / 4) | 0];
    note(c, dest, hz(root, shape) * 2, at, 0.34, {
      wave: 'sawtooth', gain: 0.19 * drive, filter: 320 + intensity * 700, q: 4, attack: 0.006, release: 0.1,
    });
  }

  // Pad: one sustained chord per bar, held across it.
  if (on('pad') && s === 0) {
    const barLen = (60 / d.bpm) * 4;
    for (const iv of [0, degree(d.scale, 2), degree(d.scale, 4)]) {
      note(c, dest, hz(root, iv) * 4, at, barLen * 0.95, {
        wave: 'triangle', gain: 0.055 * drive, attack: barLen * 0.25, release: barLen * 0.4, sustain: 0.85, detune: 5,
      });
    }
  }

  // Arp: a rolling sixteenth figure walking up and down the scale.
  if (on('arp') && s % 2 === 0) {
    const idx = (s / 2 + bar * 3) % 8;
    const walk = idx < 5 ? idx : 8 - idx;
    note(c, dest, hz(root, degree(d.scale, walk)) * 8, at, 0.16, {
      wave: 'square', gain: 0.045 * drive, filter: 2200, attack: 0.004, release: 0.09,
      pan: ((s / 2) % 2 ? 0.25 : -0.25),
    });
  }

  // Pulse: an eighth-note stab that gives menus their heartbeat.
  if (on('pulse') && s % 8 === 0) {
    note(c, dest, hz(root, 0) * 4, at, 0.3, {
      wave: 'sine', gain: 0.07 * drive, attack: 0.01, release: 0.2,
    });
  }

  // Drone: two reeds a few cents apart held across the bar, so the unison
  // beats slowly — like something breathing under the floorboards.
  if (on('drone') && s === 0) {
    const barLen = (60 / d.bpm) * 4;
    note(c, dest, hz(root, 0) * 2, at, barLen * 1.04, {
      wave: 'sawtooth', gain: 0.05 * drive, filter: 260, q: 2,
      attack: barLen * 0.3, release: barLen * 0.5, sustain: 0.9,
    });
    note(c, dest, hz(root, 0) * 2, at, barLen * 1.04, {
      wave: 'sawtooth', gain: 0.045 * drive, filter: 200, detune: 9,
      attack: barLen * 0.35, release: barLen * 0.5, sustain: 0.9,
    });
  }

  // Bell: a funeral toll every other bar, its tritone ghost ringing just after.
  if (on('bell') && s === 0 && bar % 2 === 0) {
    note(c, dest, hz(root, 0) * 8, at, 2.6, {
      wave: 'sine', gain: 0.1 * drive, attack: 0.002, release: 2.2, sustain: 0.2,
    });
    note(c, dest, hz(root, 6) * 8, at + 0.04, 2.3, {
      wave: 'sine', gain: 0.035 * drive, attack: 0.002, release: 2.0, sustain: 0.15,
    });
  }

  // Wail: a high minor-second cluster that drifts in every fourth bar and
  // slides across the stereo field — the voice heard through the walls.
  if (on('wail') && s === 8 && bar % 4 === 2) {
    note(c, dest, hz(root, 0) * 16, at, 1.8, {
      wave: 'triangle', gain: 0.03 * drive, attack: 0.6, release: 1.0, sustain: 0.8, pan: 0.35,
    });
    note(c, dest, hz(root, 1) * 16, at + 0.15, 1.6, {
      wave: 'triangle', gain: 0.026 * drive, attack: 0.6, release: 0.9, sustain: 0.8, pan: -0.35,
    });
  }

  // Lead: sparse, only in the top intensity band — the "you are in trouble" voice.
  if (on('lead') && s === 8 && bar % 2 === 0) {
    const pick = [7, 5, 9, 4][bar % 4];
    note(c, dest, hz(root, degree(d.scale, pick)) * 4, at, 0.5, {
      wave: 'sawtooth', gain: 0.075 * drive, filter: 1800, q: 3, attack: 0.02, release: 0.3,
    });
  }
}

function tick(): void {
  const c = audioContext();
  const bus = musicBusNode();
  if (!c || !bus || !def || !trackGain || c.state !== 'running') return;

  // Ease toward the requested intensity so a sudden HP drop swells the mix
  // rather than snapping a new layer on mid-bar.
  intensity += (targetIntensity - intensity) * 0.06;

  const stepDur = (60 / def.bpm) / 4;

  // Backgrounding the tab suspends the context, so on return `nextStepTime` can
  // be minutes behind the playhead. Catching up step by step would fire that
  // whole backlog at once; resync to the next bar instead.
  if (c.currentTime - nextStepTime > 1) {
    nextStepTime = c.currentTime + 0.05;
    step = 0;
    bar++;
  }

  while (nextStepTime < c.currentTime + SCHEDULE_WINDOW) {
    // Swing pushes the off-sixteenths late, which is what stops the arena
    // groove sounding like a metronome.
    const swing = (def.swing ?? 0) * stepDur * (step % 2 === 1 ? 1 : 0);
    scheduleStep(c, trackGain, step, Math.max(c.currentTime, nextStepTime + swing));
    nextStepTime += stepDur;
    step++;
    if (step >= STEPS_PER_BAR) { step = 0; bar++; }
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Starts (or switches to) a track. Re-requesting the track already playing is a
 * no-op, so scenes can call this in `create()` without restarting the music on
 * every menu bounce.
 */
export function play(track: TrackName, opts: { intensity?: number; restart?: boolean } = {}): void {
  if (!enabled) { current = track; return; }
  const c = audioContext();
  const bus = musicBusNode();
  if (!c || !bus) { current = track; return; }

  if (current === track && timer !== null && !opts.restart) {
    if (opts.intensity !== undefined) targetIntensity = opts.intensity;
    return;
  }

  stop(0.35);

  current = track;
  def = TRACKS[track];
  step = 0;
  bar = 0;
  intensity = targetIntensity = opts.intensity ?? 0.35;

  trackGain = c.createGain();
  trackGain.gain.setValueAtTime(0.0001, c.currentTime);
  trackGain.gain.linearRampToValueAtTime(def.gain ?? 0.9, c.currentTime + 0.8);
  trackGain.connect(bus);

  nextStepTime = c.currentTime + 0.1;
  timer = window.setInterval(tick, LOOKAHEAD_MS);
}

/** Fades the current track out and tears down the scheduler. */
export function stop(fadeSec = 0.6): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  const c = audioContext();
  if (c && trackGain) {
    const g = trackGain;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, c.currentTime + fadeSec);
    window.setTimeout(() => g.disconnect(), (fadeSec + 0.2) * 1000);
  }
  trackGain = null;
  current = null;
  def = null;
}

/**
 * Sets how thick the mix should be, 0–1. ArenaScene drives this from the fight
 * state: low HP, a boss phase change, or an ultimate all push it up.
 */
export function setIntensity(v: number): void {
  targetIntensity = Math.max(0, Math.min(1, v));
}

export function getIntensity(): number {
  return targetIntensity;
}

export function currentTrack(): TrackName | null {
  return current;
}

/** Master switch for the music layer, independent of its volume. */
export function setEnabled(on: boolean): void {
  enabled = on;
  if (!on) stop(0.3);
}

export function isEnabled(): boolean {
  return enabled;
}

/**
 * Restarts whatever track was requested before audio was available. Called once
 * the context unlocks, since scenes usually ask for music before the player has
 * clicked anything.
 */
export function resumePending(): void {
  if (current && timer === null && enabled) {
    const t = current;
    current = null;
    play(t, { intensity: targetIntensity });
  }
}
