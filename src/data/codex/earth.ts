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
      basics:
        'A standing guard of 75 HP that always faces your cursor. It rebuilds 8 seconds after breaking '
        + '— 4 with Shield Splinter — and it only covers the arc you are aiming at: anything that comes '
        + 'from behind ignores it entirely.',
      effects: [
        { tag: 'shield', label: 'Standing guard', detail: '75 HP at match start, angled to face the cursor at all times.' },
        { tag: 'utility', label: 'Rebuild', detail: 'A broken shield repairs after 8s — 4s with the Shield Splinter upgrade.' },
        { tag: 'cost', label: 'One direction only', detail: 'It guards the arc you are aiming at. Anything that comes from behind ignores it entirely.' },
      ],
    },
  ],

  abilities: {
    bash: {
      basics:
        'Hold Click to wind up, release to charge behind the shield. Speed scales 550→800 and duration '
        + '200→320ms with the charge, the impact deals 30 at a tap rising to 45 at full, and a hit at 95% '
        + 'charge or better also stuns for 700ms.',
      cast: 'Hold Click to wind up, release to charge. Charge ratio scales speed, distance and damage together.',
      effects: [
        { tag: 'movement', label: 'Charge', detail: 'Dash speed scales 550 → 800 with charge; duration scales 200ms → 320ms.' },
        { tag: 'damage', label: 'Shield impact', detail: '30 damage at a tap, scaling to 45 at full charge.' },
        { tag: 'control', label: 'Full-charge stun', detail: 'A hit at ≥95% charge also stuns for 700ms.' },
      ],
      upgrade: {
        basics:
          'A second grey shield behind you, so you are covered both ways. Each is 50 HP and the rear one '
          + 'takes over when the front breaks — or 100 HP each, 200 total against the base 75, if you also '
          + 'own Shield Enhancement.',
        effects: [
          { tag: 'shield', label: 'Rear shield', detail: 'A second grey shield behind you. Each is 50 HP; when the front breaks the back takes over.', requiresUpgrade: 'click' },
          { tag: 'shield', label: 'With Shield Enhancement', detail: 'Both shields go to 100 HP each — 200 total, against the base 75.', requiresUpgrade: 'click' },
        ],
      },
    },

    repair: {
      basics: 'Puts the standing guard back up, ready to take hits again. It does nothing to the enemy.',
      cast: 'E. Restores the shield rather than doing anything to the enemy.',
      effects: [
        { tag: 'shield', label: 'Rebuild', detail: 'Puts the standing guard back up, ready to take hits again.' },
      ],
      upgrade: {
        basics:
          'E can now be held for 2 seconds — the shield throbs red while it charges — and released as a '
          + 'detonation: area damage equal to a third of the shield\'s current HP, plus a 20-damage forward '
          + 'projectile. A shield spent this way rebuilds in 4 seconds instead of 8.',
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
      basics:
        'Raises a ring of stones that orbit you until fired, one at a time, each launched at 500 px/s '
        + 'along whatever angle your shield is currently holding.',
      cast: 'R to raise the orbit; the rocks are then launched along the shield angle.',
      effects: [
        { tag: 'summon', label: 'Orbiting stones', detail: 'Rocks circle the caster until fired, and are consumed one at a time.' },
        { tag: 'damage', label: 'Launch', detail: 'Fired at 500 px/s along the current shield angle.' },
      ],
      upgrade: {
        basics:
          'The stones turn red, orbit 25% faster on a tighter launch range, and hit for 60 with a fire '
          + 'pool where they land. Firing one into your own Quake magmifies the whole field for the rest of '
          + 'its life: trips deal 10 instead of 5, arrive every 0.5s instead of 0.75s — 0.35s if Quake is '
          + 'upgraded — and set a 1.5s lava burn on top.',
        effects: [
          { tag: 'buff', label: 'Faster orbit', detail: 'Rocks turn red and orbit 25% faster, with a tighter launch range.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Molten impact', detail: '60 damage on launch, plus a fire pool left where it lands.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Rocks into Quake', detail: 'Firing a lava rock into your own Quake magmifies the whole field for the rest of its life: trips deal 10 instead of 5, they come every 0.5s instead of 0.75s (0.35s instead of 0.5s with Quake upgraded), and every trip also sets a 1.5s lava burn.', requiresUpgrade: 'r' },
        ],
      },
    },

    quake: {
      basics:
        'Sends a ridge of slabs from the impact point toward the nearest edge at 300 px/s, on a '
        + 'horizontal or vertical axis chosen at random. The wave lasts 3 seconds or until it leaves the '
        + 'arena.',
      cast: 'F. The wave picks a horizontal or vertical axis at random and travels away from the impact.',
      effects: [
        { tag: 'area', label: 'Travelling ridge', detail: 'A wave of slabs at 300 px/s, running from the impact point toward the nearest edge on a randomly-chosen axis.' },
        { tag: 'area', label: 'Lifetime', detail: 'The wave persists for 3s or until it leaves the arena.' },
      ],
      upgrade: {
        basics:
          'The wave is 25% larger, 20% longer-lived and rendered white, and it brings company: two '
          + 'tsunami waves from random arena edges, each dealing 35 damage plus a push.',
        effects: [
          { tag: 'area', label: 'Larger', detail: '25% larger and 20% longer-lived, rendered white.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Tsunami waves', detail: 'Spawns 2 tsunami waves from random arena edges, each dealing 35 damage plus a push.', requiresUpgrade: 'f' },
        ],
      },
    },

    'golem-ritual': {
      basics: 'Turns you into a stone golem, replacing your normal body.',
      cast: 'Q. Instant.',
      effects: [
        { tag: 'summon', label: 'Golem form', detail: 'The caster becomes a stone golem, replacing the normal body.' },
      ],
      upgrade: {
        basics:
          'Hold Q for 5 seconds to become a Titan for 20, and nothing can damage you for any of it. The '
          + 'form carries its own five keys: Click drops falling rocks on a 1.4s cooldown, each telegraphed '
          + '2 seconds before it lands; E shakes the ground for 10s on a 5s cooldown; R sends an arena-wide '
          + 'wave every 13s; F breathes a 5s beam every 10s; and Q self-destructs, ending the form early in '
          + 'one detonation.',
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
      basics:
        'The shield goes to 100 HP against the base 75 — or 75 each, 150 total, alongside Double Shield '
        + '— and you move 15% slower for as long as the perk is equipped.',
      cast: 'Passive.',
      effects: [
        { tag: 'shield', label: 'Reinforced', detail: 'Shield HP raised to 100, against the base 75. With Double Shield, 75 each — 150 total.' },
        { tag: 'cost', label: 'Heavy', detail: 'You move 15% slower for as long as the perk is equipped.' },
      ],
    },
  },
  mastery: {
    unbreakable: {
      basics:
        'Two hard rules, both always on: nothing in the game can knock you back, drag you or move you '
        + 'against your will, and no single hit can ever exceed 50 damage, with anything larger cut back '
        + 'down to 50.',
      effects: [
        { tag: 'shield', label: 'Immovable', detail: 'You cannot be knocked back, dragged or forcibly moved by any ability in the game.' },
        { tag: 'shield', label: 'Hard damage cap', detail: 'No single hit can exceed 50 damage. Anything above is reduced back down to 50.' },
      ],
      notes: [
        'The cap is per hit, not per second — a fast multi-hit ability is unaffected by it.',
      ],
    },
    'dust-screen': {
      basics:
        'A bindable cone 180px long and 40° either side of your aim that blinds whatever it catches for '
        + '5 seconds. A player\'s screen turns fuzzy and hard to see through; a bot fires wildly with no '
        + 'accuracy; Invasion husks wander at random instead of pathing, and ranged ones keep firing but '
        + 'erratically. 10s cooldown.',
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
