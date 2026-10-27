import { ElementCodex } from '../AbilityCodex';

/**
 * Ink — the black-and-white rubber-hose cartoon.
 *
 * Verified against `src/elements/ink.ts` and `kits/InkKit.ts`. Every number below is a constant at
 * the top of the kit; the five shop upgrades sit in the same blocks as the abilities they change.
 * The F+ shop text is deliberately nonsense (the user asked for it); the codex states what it does.
 * No mastery yet. No perks.
 */
const ink: ElementCodex = {
  identity:
    'A black-and-white cartoon that never stops clicking. Litter the floor with banana peels, drop '
    + 'a six-ton anvil on whoever slips, and pull back the camera to walk out through the foam walls.',

  abilities: {
    'ink-finger-guns': {
      basics:
        'A finger gun: every click fires one ink bullet for 3 damage. There is no cooldown, so the '
        + 'damage is as fast as you can click — but holding the button does nothing.',
      cast: 'Click toward the cursor. One shot per press. No cooldown.',
      effects: [
        { tag: 'damage', label: 'Ink bullet', detail: '3 damage. 640px/s, gone after 0.95s.' },
        { tag: 'utility', label: 'Spam it', detail: 'No cooldown; one shot per press, none for holding.' },
      ],
      upgrade: {
        basics:
          'Hand Cannon: every 50th shot launches your whole hand. It hits for 10 and splits into a '
          + 'barrage of 8 bullets (3 each) on whoever it hits. A new hand pops in a second after it lands.',
        effects: [
          { tag: 'damage', label: 'Thrown hand', detail: '10 damage. 520px/s, up to 1.3s of flight. Every 50 shots.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Barrage', detail: '8 bullets for 3 damage each, fanned out from the target.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'One hand down', detail: 'No shots until the hand grows back 1s after landing.', requiresUpgrade: 'click' },
        ],
      },
      notes: ['While the anvil is out, a click drops the anvil instead of shooting.'],
    },

    'ink-banana': {
      basics:
        'Drop a banana peel behind you. It stays on the floor until an enemy steps on it. Whoever '
        + 'does is flung in a random direction, stunned for 1 second, and then has slippery controls '
        + 'for 5 seconds.',
      cast: 'E. The peel lands 30px behind you, away from the cursor. 5s cooldown.',
      effects: [
        { tag: 'summon', label: 'Banana peel', detail: 'Lasts until stepped on. Arms after 0.35s. Up to 40 on the floor; a 41st removes your oldest.' },
        { tag: 'control', label: 'Fling', detail: 'Thrown in a random direction at 430px/s for 0.42s.' },
        { tag: 'control', label: 'Stun', detail: '1s stun once the fling ends.' },
        { tag: 'debuff', label: 'Slippery', detail: '5s after the stun: steering only slowly takes hold, so they slide and overshoot.' },
      ],
      upgrade: {
        basics:
          'Mimic: while the nearest enemy is looking away from one of your peels, it grows legs and '
          + 'googly eyes and creeps toward them. When they look at it, it stops and lies flat again.',
        effects: [
          { tag: 'movement', label: 'Creeping peel', detail: '55px/s toward the nearest enemy while they face more than 90° away from it.', requiresUpgrade: 'e' },
        ],
      },
    },

    'ink-skedaddle': {
      basics:
        'Hold R to run on the spot, building up for up to 5 seconds. Let go and you shoot off toward '
        + 'the cursor, bouncing off the walls like a DVD logo for as long as you charged. Everyone you '
        + 'run into takes 10 damage.',
      cast: 'Hold R (you cannot move), let go to launch toward the cursor. 0.4s minimum, 5s maximum. 8s cooldown.',
      effects: [
        { tag: 'movement', label: 'Bounce', detail: '560px/s, reflecting off every wall, for as long as you ran (0.4–5s).' },
        { tag: 'damage', label: 'Bonk', detail: '10 damage on contact; the same enemy can be hit again after 0.5s.' },
      ],
      upgrade: {
        basics:
          'Vroom: a smoke copy of you stays where you set off. It lasts 3 seconds and fires a Finger '
          + 'Guns bullet at the nearest enemy every half second.',
        effects: [
          { tag: 'summon', label: 'Smoke double', detail: '3s at your launch point.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Its shots', detail: 'A 3-damage bullet every 0.5s — 6 in all.', requiresUpgrade: 'r' },
        ],
      },
      notes: ['In Foux World the walls it bounces off are the studio\'s, not the arena\'s.'],
    },

    'ink-anvil': {
      basics:
        'Haul a giant anvil out from behind your back, which takes 3 seconds, then hold it over your '
        + 'head for up to 3. Click to drop it on the cursor: 30 damage within 60px, and everyone hit is '
        + 'flattened for 4 seconds — half speed, and their ability keys are shuffled. Hold it for the '
        + 'full 3 seconds and it lands on you instead.',
      cast: 'F to start hauling (40% slower while you do), then Click to drop it — up to 380px away. 14s cooldown, from the press.',
      effects: [
        { tag: 'damage', label: 'Anvil', detail: '30 damage within 60px. Lands 0.42s after the click.' },
        { tag: 'control', label: 'Flattened', detail: '4s at half speed.' },
        { tag: 'debuff', label: 'Shuffled keys', detail: 'While flattened, E, R, F and Q each trigger a different one of the four. A bot casts the wrong ability.' },
        { tag: 'cost', label: 'Crushed', detail: 'Held 3s: a quarter of your max health, and you are flattened (and shuffled) for 2s.' },
        { tag: 'cost', label: 'Heavy', detail: '40% slower while hauling it out, 25% slower while holding it.' },
      ],
      upgrade: {
        basics:
          'Doombringer: the anvil stays where it lands for 3 seconds. Walk up to it and "it is '
          + 'hungry". If five or more of your banana peels are on the floor, it eats five and you get '
          + 'the Doombringer: for the rest of the match your click fires bananas, and every banana that '
          + 'misses lands as a peel.',
        effects: [
          { tag: 'summon', label: 'Hungry anvil', detail: 'Stays 3s where it landed.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Feeding', detail: 'Reach it with 5+ peels out: it eats your 5 nearest.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Banana gun', detail: '3 damage and a slip on a hit; otherwise a peel where it stops, 260px out.', requiresUpgrade: 'f' },
        ],
      },
      notes: ['The shop description for Doombringer is nonsense on purpose.'],
    },

    'ink-foux-world': {
      basics:
        'For 10 seconds the camera pulls back: the arena is a set on an animator\'s desk and its walls '
        + 'are foam. Anyone can walk out through them into the studio, but enemies take 8 damage '
        + 'pushing into the foam and 16 a second while inside it. When it ends, everyone outside is '
        + 'pulled back in.',
      cast: 'Q, instantly. An ultimate: paid for in charge.',
      effects: [
        { tag: 'area', label: 'The studio', detail: 'The arena opens to twice its size in each direction, viewed at half zoom, for 10s.' },
        { tag: 'damage', label: 'Into the foam', detail: '8 damage to an enemy entering the 34px foam band.' },
        { tag: 'dot', label: 'In the foam', detail: '4 damage every 0.25s while an enemy stays inside it.' },
        { tag: 'utility', label: 'Back on set', detail: 'At the end, anyone outside is pulled back in, 30px inside the walls.' },
      ],
      upgrade: {
        basics:
          'Fourth Wall: when Foux World starts, your five ability cards fly off the tray one by one '
          + 'and are thrown at the cursor, each exploding for 8 damage. The tray stays empty until '
          + 'Foux World ends.',
        effects: [
          { tag: 'damage', label: 'Thrown cards', detail: '5 cards, 0.35s apart, each 8 damage within 55px of where the cursor was.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Empty tray', detail: 'The cards are gone from the tray while Foux World lasts; the abilities still work.', requiresUpgrade: 'q' },
        ],
      },
    },
  },
};

export default ink;
