/**
 * World gimmicks — one standing arena rule per campaign world, active in every
 * bout fought there (boss included). This is the layer that makes Fire's world
 * *play* differently from Ice's rather than just recolouring the opponent.
 *
 * Each entry picks one of GimmickKit's archetypes and tunes it; the flavour
 * name and blurb are what the player sees in the briefing and on entry.
 * Magnitudes are deliberately modest — a gimmick seasons a fight, it never
 * decides one, and the NPC is subject to it just as much as the player.
 */

export type GimmickSpec =
  | { arch: 'vents'; count: number; intervalMs: number; radius: number; damage: number; color: number }
  | { arch: 'sweep'; intervalMs: number; halfW: number; damage: number; color: number }
  | { arch: 'rockfall'; intervalMs: number; radius: number; damage: number; color: number }
  | { arch: 'slick'; count: number; push: number; color: number }
  | { arch: 'springs'; count: number; healPerSec: number; color: number }
  | { arch: 'pulse'; intervalMs: number; strength: number; durationMs: number; inward: boolean; color: number }
  | { arch: 'metronome'; intervalMs: number; cooldownMs: number; color: number }
  | { arch: 'sparks'; intervalMs: number; damage: number; speed: number; color: number }
  | { arch: 'fog'; periodMs: number; minAlpha: number; maxAlpha: number; color: number }
  | { arch: 'hill'; radius: number; moveEveryMs: number; color: number }
  | { arch: 'decay'; stillMs: number; damage: number; tickMs: number; color: number }
  | { arch: 'bouncy'; push: number; color: number };

export interface WorldGimmick {
  name: string;
  blurb: string;
  spec: GimmickSpec;
}

export const WORLD_GIMMICKS: Record<string, WorldGimmick> = {
  // ── Normal realm ──────────────────────────────────────────────────
  fire:    { name: 'Lava Vents',      blurb: 'Vents erupt on a cycle — read the glow, step off the plate.',
             spec: { arch: 'vents', count: 4, intervalMs: 5200, radius: 62, damage: 14, color: 0xff5a1e } },
  water:   { name: 'Riptide',         blurb: 'A tide sweeps the arena on a rhythm. It hits both of you.',
             spec: { arch: 'sweep', intervalMs: 9000, halfW: 46, damage: 12, color: 0x3aa8ff } },
  life:    { name: 'Spring Blossoms', blurb: 'Blossom pools heal whoever stands in them. Share nicely.',
             spec: { arch: 'springs', count: 3, healPerSec: 3, color: 0x55dd66 } },
  air:     { name: 'Crosswind',       blurb: 'Gusts sweep the hall — a wall of wind that stings and shoves.',
             spec: { arch: 'sweep', intervalMs: 8000, halfW: 54, damage: 8, color: 0xaaddff } },
  earth:   { name: 'Rockfall',        blurb: 'The ceiling sheds. Watch the dust rings and keep moving.',
             spec: { arch: 'rockfall', intervalMs: 3400, radius: 56, damage: 13, color: 0x887755 } },
  oil:     { name: 'Slick Patches',   blurb: 'Black pools kill your grip — momentum decides where you stop.',
             spec: { arch: 'slick', count: 4, push: 150, color: 0x2a2013 } },
  ice:     { name: 'Black Ice',       blurb: 'Frozen patches keep you sliding the way you were already going.',
             spec: { arch: 'slick', count: 5, push: 170, color: 0x9fd8ff } },
  growth:  { name: 'Spore Blooms',    blurb: 'Fungal beds mend whatever stands on them. The colony does not take sides.',
             spec: { arch: 'springs', count: 3, healPerSec: 4, color: 0x88bb22 } },
  crystal: { name: 'Shardfall',       blurb: 'Facets shear off the ceiling and come down point-first.',
             spec: { arch: 'rockfall', intervalMs: 3000, radius: 48, damage: 12, color: 0x88ccff } },
  hunt:    { name: 'Predator Sense',  blurb: 'Stand still too long and something finds you. Keep moving.',
             spec: { arch: 'decay', stillMs: 2100, damage: 8, tickMs: 900, color: 0xcc4400 } },
  soul:    { name: 'Grave Mist',      blurb: 'The mist breathes — sight comes and goes with it.',
             spec: { arch: 'fog', periodMs: 9000, minAlpha: 0.05, maxAlpha: 0.4, color: 0x1a1030 } },
  shadow:  { name: 'The Dark Breathes', blurb: 'The light fails in slow waves. Fight through the troughs.',
             spec: { arch: 'fog', periodMs: 7600, minAlpha: 0.08, maxAlpha: 0.5, color: 0x08040f } },
  creation:{ name: 'The Workshop Hill', blurb: 'A forge-circle drifts around the floor. Holding it speeds your hands and mends you.',
             spec: { arch: 'hill', radius: 92, moveEveryMs: 12000, color: 0xcc6622 } },
  gravity: { name: 'Gravity Wells',   blurb: 'The centre pulls on a cycle. Plant your feet or use the ride.',
             spec: { arch: 'pulse', intervalMs: 8600, strength: 120, durationMs: 2200, inward: true, color: 0x8844cc } },
  sand:    { name: 'The Metronome',   blurb: 'Every few seconds time skips a beat — both fighters’ cooldowns jump forward.',
             spec: { arch: 'metronome', intervalMs: 8000, cooldownMs: 1500, color: 0xffdd44 } },

  // ── Abstract realm ────────────────────────────────────────────────
  electricity: { name: 'Static Discharge', blurb: 'The walls arc. Stray bolts cross the arena at random.',
             spec: { arch: 'sparks', intervalMs: 2600, damage: 7, speed: 300, color: 0xffee00 } },
  slime:   { name: 'Acid Drip',       blurb: 'The ceiling drips. The drops are not water.',
             spec: { arch: 'rockfall', intervalMs: 3200, radius: 44, damage: 11, color: 0x66cc44 } },
  fate:    { name: 'The Turning Wheel', blurb: 'A ring of favour wanders the floor. Stand in it and fortune quickens you.',
             spec: { arch: 'hill', radius: 86, moveEveryMs: 9000, color: 0x88eecc } },
  sound:   { name: 'The Downbeat',    blurb: 'The hall keeps a beat, and on every bar your cooldowns skip ahead.',
             spec: { arch: 'metronome', intervalMs: 7000, cooldownMs: 1300, color: 0xff66cc } },
  light:   { name: 'Sunlances',       blurb: 'Focused beams strobe across the arena edges.',
             spec: { arch: 'sparks', intervalMs: 2400, damage: 8, speed: 420, color: 0xfff4a8 } },
  magnet:  { name: 'Polarity Pulse',  blurb: 'The room flips polarity — pulled in, thrown out, on a cycle.',
             spec: { arch: 'pulse', intervalMs: 7800, strength: 130, durationMs: 1900, inward: false, color: 0xcc2244 } },
  metal:   { name: 'Swarf Storm',     blurb: 'Shavings rain off the ceiling works. Hard hats would not help.',
             spec: { arch: 'rockfall', intervalMs: 3100, radius: 50, damage: 12, color: 0x8899aa } },
  plasma:  { name: 'Arc Weather',     blurb: 'Loose plasma arcs wander in from the edges.',
             spec: { arch: 'sparks', intervalMs: 2300, damage: 8, speed: 340, color: 0xaa22ff } },
  rubber:  { name: 'Bounce House',    blurb: 'The walls give it all back — touch one and you are launched.',
             spec: { arch: 'bouncy', push: 260, color: 0xff5577 } },
  gunpowder: { name: 'Loose Powder',  blurb: 'Charges cook off around the floor on a fuse you can read.',
             spec: { arch: 'vents', count: 5, intervalMs: 4800, radius: 58, damage: 13, color: 0x8a5a2a } },
  echo:    { name: 'Sound Shadow',    blurb: 'The cavern swallows light in waves — navigate by memory.',
             spec: { arch: 'fog', periodMs: 8200, minAlpha: 0.06, maxAlpha: 0.45, color: 0x0c0c22 } },
  silence: { name: 'The Hush',        blurb: 'The dark leans in and out. In the deep of it, trust nothing.',
             spec: { arch: 'fog', periodMs: 7000, minAlpha: 0.1, maxAlpha: 0.55, color: 0x0a0512 } },
  magic:   { name: 'Leyline Surge',   blurb: 'A wandering circle of raw leyline — hold it and your casts renew.',
             spec: { arch: 'hill', radius: 88, moveEveryMs: 10000, color: 0x9944ff } },
  technology: { name: 'Perimeter Turrets', blurb: 'Automated fire from the walls. It has no allegiance settings.',
             spec: { arch: 'sparks', intervalMs: 2500, damage: 7, speed: 380, color: 0x44ccaa } },
  subterfuge: { name: 'Protection Racket', blurb: 'A moving patch of "insured" ground. Stand on it and business favours you.',
             spec: { arch: 'hill', radius: 84, moveEveryMs: 8500, color: 0xcc2233 } },

  // ── Corrupt realm ─────────────────────────────────────────────────
  ruin:    { name: 'Collapse',        blurb: 'What is left of the ceiling is still arriving.',
             spec: { arch: 'rockfall', intervalMs: 2700, radius: 58, damage: 14, color: 0xc4392c } },
  death:   { name: 'The Toll',        blurb: 'Linger in one place and the bell starts counting you.',
             spec: { arch: 'decay', stillMs: 2000, damage: 9, tickMs: 850, color: 0x4a4468 } },
  illusion:{ name: 'Unreliable Light', blurb: 'The scene keeps changing its mind about being visible.',
             spec: { arch: 'fog', periodMs: 6400, minAlpha: 0.08, maxAlpha: 0.5, color: 0x1c0a30 } },
  conquest:{ name: 'The High Ground', blurb: 'One patch of land is worth holding. Both of you know it.',
             spec: { arch: 'hill', radius: 96, moveEveryMs: 11000, color: 0xc23a2e } },
  gluttony:{ name: 'Grease Fire',     blurb: 'The kitchen floor spits burning fat on a cycle.',
             spec: { arch: 'vents', count: 5, intervalMs: 4600, radius: 56, damage: 14, color: 0xd8452f } },
  amber:   { name: 'Setting Sap',     blurb: 'Stand still and the amber starts to take you.',
             spec: { arch: 'decay', stillMs: 1800, damage: 10, tickMs: 800, color: 0xd98b1f } },
  bind:    { name: 'The Short Leash', blurb: 'The chains haul everything toward the centre on a cycle.',
             spec: { arch: 'pulse', intervalMs: 7600, strength: 135, durationMs: 2100, inward: true, color: 0xe0b743 } },
  paper:   { name: 'Paper Cuts',      blurb: 'Loose pages knife through the air from the margins.',
             spec: { arch: 'sparks', intervalMs: 2400, damage: 7, speed: 330, color: 0xf2ead6 } },
  chalk:   { name: 'Chalk Dust',      blurb: 'The board is wiped in slow waves — whole seconds go unreadable.',
             spec: { arch: 'fog', periodMs: 7200, minAlpha: 0.06, maxAlpha: 0.42, color: 0xd9d4c2 } },
  psychic: { name: 'Migraine Pulse',  blurb: 'The room throbs, shoving everything away from its one idea.',
             spec: { arch: 'pulse', intervalMs: 8200, strength: 125, durationMs: 1800, inward: false, color: 0x9b4dff } },
  passion: { name: 'Heartbeat',       blurb: 'The floor keeps a pulse; on every beat, your abilities hurry.',
             spec: { arch: 'metronome', intervalMs: 6600, cooldownMs: 1200, color: 0xff5fa2 } },
  glass:   { name: 'Falling Panes',   blurb: 'The gallery sheds glass in sheets. The rings mark the drop.',
             spec: { arch: 'rockfall', intervalMs: 2900, radius: 50, damage: 13, color: 0x9fe8ff } },
  fortune: { name: 'The Jackpot Ring', blurb: 'A lucky circle roams the floor, paying out in vigour and haste.',
             spec: { arch: 'hill', radius: 88, moveEveryMs: 9500, color: 0xd8a531 } },
  magma:   { name: 'Eruption Field',  blurb: 'Pressure vents everywhere. Every plate on the floor has a temper.',
             spec: { arch: 'vents', count: 6, intervalMs: 4400, radius: 60, damage: 15, color: 0xff5a1e } },
  radiation: { name: 'Fallout',       blurb: 'Hot particles drift in off the exclusion zone. Constantly.',
             spec: { arch: 'sparks', intervalMs: 2200, damage: 8, speed: 280, color: 0x7cff3d } },
  depths:  { name: 'The Undertow',    blurb: 'The trench inhales on a cycle — everything drifts toward the dark.',
             spec: { arch: 'pulse', intervalMs: 8000, strength: 130, durationMs: 2300, inward: true, color: 0x0e8f9c } },
  gum:     { name: 'Sticky Floor',    blurb: 'Patches of slime keep whatever momentum you brought.',
             spec: { arch: 'slick', count: 5, push: 160, color: 0x46b93f } },
};

export function getWorldGimmick(worldId: string): WorldGimmick | undefined {
  return WORLD_GIMMICKS[worldId];
}
