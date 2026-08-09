import { ElementCodex } from '../AbilityCodex';

/**
 * Earth — verified against `src/elements/earth.ts`, `kits/EarthKit.ts` (shield, bash, rock and
 * Titan blocks) and the earth block of `data/Upgrades.ts`.
 */
const earth: ElementCodex = {
  identity:
    'Geomancy played as siege equipment. Earth carries a physical shield with its own health bar, '
    + 'orbits rocks it can fire off that shield, and converts all of it into a titan at the end. It is '
    + 'the only base element whose defence is an object in the world rather than a number on the caster.',

  passives: [
    {
      emoji: '🛡️',
      name: 'The Shield',
      magic:
        'A slab of stone hauled up out of the floor and kept between the caster and whatever they are '
        + 'looking at. It tracks the cursor, so it only ever guards the direction you are facing — and it '
        + 'is a real object with real health that breaks and has to be rebuilt.',
      effects: [
        { tag: 'shield', label: 'Standing guard', detail: '75 HP at match start, angled to face the cursor at all times.' },
        { tag: 'utility', label: 'Rebuild', detail: 'A broken shield repairs after 8s — 4s with the Shield Splinter upgrade.' },
        { tag: 'cost', label: 'One direction only', detail: 'It guards the arc you are aiming at. Anything that comes from behind ignores it entirely.' },
      ],
    },
  ],

  abilities: {
    bash: {
      magic:
        'The shield used as the weapon rather than the wall. The caster winds up and drives the whole '
        + 'slab forward, riding behind it. Held longer it goes further and lands harder, and a full-weight '
        + 'charge puts the person on the other end of it on the floor.',
      cast: 'Hold Click to wind up, release to charge. Charge ratio scales speed, distance and damage together.',
      effects: [
        { tag: 'movement', label: 'Charge', detail: 'Dash speed scales 550 → 800 with charge; duration scales 200ms → 320ms.' },
        { tag: 'damage', label: 'Shield impact', detail: '30 damage at a tap, scaling to 45 at full charge.' },
        { tag: 'control', label: 'Full-charge stun', detail: 'A hit at ≥95% charge also stuns for 700ms.' },
      ],
      upgrade: {
        magic:
          'Double Shield gives the caster a second slab riding behind them. The front one still takes '
          + 'everything, but when it goes the rear one comes round — the guard now fails twice instead of once.',
        effects: [
          { tag: 'shield', label: 'Rear shield', detail: 'A second grey shield behind you. Each is 50 HP; when the front breaks the back takes over.', requiresUpgrade: 'click' },
          { tag: 'shield', label: 'With Shield Enhancement', detail: 'Both shields go to 100 HP each — 200 total, against the base 75.', requiresUpgrade: 'click' },
        ],
      },
    },

    repair: {
      magic:
        'Deliberate repair work: the caster kneels and puts the wall back together, or hauls a fresh one '
        + 'up if the last is gone. It is the least glamorous key in the game and the one that decides '
        + 'whether the element functions.',
      cast: 'E. Restores the shield rather than doing anything to the enemy.',
      effects: [
        { tag: 'shield', label: 'Rebuild', detail: 'Puts the standing guard back up, ready to take hits again.' },
      ],
      upgrade: {
        magic:
          'Shield Splinter is the opposite instinct — instead of maintaining the wall, you overload it. '
          + 'Hold the key and the slab throbs red under the pressure, then bursts, throwing its own '
          + 'remaining health outward as the blast. A full shield is a bomb you have been carrying.',
        effects: [
          { tag: 'cost', label: 'Hold to overload', detail: 'Hold E for 2s; the shield throbs red for the duration.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Detonation', detail: 'Releasing explodes it: AoE damage equal to one third of the shield\'s current HP, plus a 20 damage forward projectile.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Faster rebuild', detail: 'A shield lost this way repairs in 4s instead of 8s.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Because the blast scales off current HP, splintering a damaged shield is worth far less than splintering a fresh one.',
      ],
    },

    'rock-dance': {
      magic:
        'Stones torn out of the floor and set orbiting the caster. They are ammunition rather than '
        + 'defence: each one can be fired off the shield along the aim line, the shield slamming into the '
        + 'rock and kicking it out of the muzzle.',
      cast: 'R to raise the orbit; the rocks are then launched along the shield angle.',
      effects: [
        { tag: 'summon', label: 'Orbiting stones', detail: 'Rocks circle the caster until fired, and are consumed one at a time.' },
        { tag: 'damage', label: 'Launch', detail: 'Fired at 500 px/s along the current shield angle.' },
      ],
      upgrade: {
        magic:
          'Lava Rocks keeps the stones molten. They orbit faster and closer, they hit for a great deal '
          + 'more, and the ground they land on stays on fire.',
        effects: [
          { tag: 'buff', label: 'Faster orbit', detail: 'Rocks turn red and orbit 25% faster, with a tighter launch range.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Molten impact', detail: '60 damage on launch, plus a fire pool left where it lands.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Rocks into Quake', detail: 'Firing a lava rock into your own Quake magmifies the whole field for the rest of its life: trips deal 10 instead of 5, they come every 0.5s instead of 0.75s (0.35s instead of 0.5s with Quake upgraded), and every trip also sets a 1.5s lava burn.', requiresUpgrade: 'r' },
        ],
      },
    },

    quake: {
      magic:
        'The caster brings the shield down on the arena floor hard enough that the floor answers. A ridge '
        + 'of tilted slabs tears away from the impact and runs for the nearest edge, and anything standing '
        + 'in the line it picks goes with it.',
      cast: 'F. The wave picks a horizontal or vertical axis at random and travels away from the impact.',
      effects: [
        { tag: 'area', label: 'Travelling ridge', detail: 'A wave of slabs at 300 px/s, running from the impact point toward the nearest edge on a randomly-chosen axis.' },
        { tag: 'area', label: 'Lifetime', detail: 'The wave persists for 3s or until it leaves the arena.' },
      ],
      upgrade: {
        magic:
          'Tectonic Quake is the same blow with the whole plate behind it — bigger, longer, and white '
          + 'rather than violet. And it does not stop at one ridge: the shock reaches the edges of the '
          + 'arena and brings water back in from them.',
        effects: [
          { tag: 'area', label: 'Larger', detail: '25% larger and 20% longer-lived, rendered white.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Tsunami waves', detail: 'Spawns 2 tsunami waves from random arena edges, each dealing 35 damage plus a push.', requiresUpgrade: 'f' },
        ],
      },
    },

    'golem-ritual': {
      magic:
        'The caster stops using the ground and starts wearing it. Stone comes up around them until there '
        + 'is a golem standing where the fighter was — the culmination of every other key in the kit, '
        + 'built out of the same material as the shield and the rocks.',
      cast: 'Q. Instant.',
      effects: [
        { tag: 'summon', label: 'Golem form', detail: 'The caster becomes a stone golem, replacing the normal body.' },
      ],
      upgrade: {
        magic:
          'Titan Form is not a bigger golem — it is a different scale of thing entirely. Held for five '
          + 'seconds, the caster becomes a head the size of the arena looming over it, untouchable, with a '
          + 'completely new set of five abilities for twenty seconds. Nothing else in the game replaces '
          + 'the whole kit like this.',
        effects: [
          { tag: 'cost', label: 'Summoning', detail: 'Hold Q for 5s to transform.', requiresUpgrade: 'q' },
          { tag: 'shield', label: 'Untouchable', detail: '20s of Titan form, during which the titan cannot be damaged.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Click — Smash', detail: 'Falling rock strikes, on a 1.4s cooldown, each telegraphed for 2s before it lands.', requiresUpgrade: 'q' },
          { tag: 'area', label: 'E — Tremor', detail: '10s of shaking ground, on a 5s cooldown.', requiresUpgrade: 'q' },
          { tag: 'area', label: 'R — Tsunami', detail: 'A wave across the arena, on a 13s cooldown.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'F — Beam', detail: 'A 5s beam from the titan\'s mouth, on a 10s cooldown.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Q — Eruption', detail: 'Self-destruct: ends the form early in a single detonation.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Every falling rock the titan drops is telegraphed for a full 2s, so Titan Form is oppressive rather than unfair.',
        'Titan effects are inset 32px from the arena border so nothing lands underneath the HUD strip.',
      ],
    },
  },

  perks: {
    obsidian: {
      magic:
        'The shield is reforged in volcanic glass — far more of it, and far heavier. The guard '
        + 'becomes the best in the game and the geomancer becomes the slowest thing on the field, '
        + 'which is the trade the whole perk is: you stop being able to leave.',
      cast: 'Passive.',
      effects: [
        { tag: 'shield', label: 'Reinforced', detail: 'Shield HP raised to 100, against the base 75. With Double Shield, 75 each — 150 total.' },
        { tag: 'cost', label: 'Heavy', detail: 'You move 15% slower for as long as the perk is equipped.' },
      ],
    },
  },
  mastery: {
    unbreakable: {
      magic:
        'Nothing moves the mountain and nothing lands a decisive blow on it. Every push, pull, drag '
        + 'and knockback in the game simply fails, and the largest single hit anybody can land is '
        + 'capped — a boss ultimate and a thrown rock arrive at the same ceiling.',
      effects: [
        { tag: 'shield', label: 'Immovable', detail: 'You cannot be knocked back, dragged or forcibly moved by any ability in the game.' },
        { tag: 'shield', label: 'Hard damage cap', detail: 'No single hit can exceed 50 damage. Anything above is reduced back down to 50.' },
      ],
      notes: [
        'The cap is per hit, not per second — a fast multi-hit ability is unaffected by it.',
      ],
    },
    'dust-screen': {
      magic:
        'A cone of grit thrown into the enemy\'s face. It does no damage at all; it takes away their '
        + 'ability to see or aim, and what that means depends on who you are fighting — which makes '
        + 'it the one mastery in the game whose effect is written differently for a person, a bot '
        + 'and a husk.',
      cast: 'Bindable to E, R, F or Q. Fires a cone along the aim.',
      effects: [
        { tag: 'debuff', label: 'Against a player', detail: 'Their screen turns fuzzy and hard to see through for 5s.' },
        { tag: 'debuff', label: 'Against a bot', detail: 'It fires wildly with no accuracy for 5s.' },
        { tag: 'debuff', label: 'Against Invasion husks', detail: 'They wander randomly instead of pathfinding for 5s; ranged husks still fire, but erratically.' },
        { tag: 'area', label: 'The cone', detail: '180px of range, 40° either side of the aim.' },
        { tag: 'utility', label: 'Availability', detail: '10s cooldown.' },
      ],
    },
  },
};

export default earth;
