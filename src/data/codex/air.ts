import { ElementCodex } from '../AbilityCodex';

/**
 * Air — the hooded assassin (the rework of 2026-11-25; the wind dancer is gone).
 *
 * Verified against `src/elements/air.ts` and `kits/AirKit.ts`. Every number below is a constant
 * at the top of the kit. No upgrades, element perks or mastery yet.
 */
const air: ElementCodex = {
  identity:
    'A hooded assassin with chimes on her cloak and no steel: her knives are made of air the '
    + 'moment before they land. She hides in her own clouds to bank stealth, then spends all of '
    + 'it on a single stab — or keeps it, and lets it turn hits aside.',

  passives: [
    {
      emoji: '🌫️',
      name: 'Clouds',
      basics:
        'Four clouds crawl across the arena. Standing in one banks stealth, up to 100. Stealth is '
        + 'a chance to dodge any hit — 33% at full — and it powers Pierce the Skies and Tornado '
        + 'Blade. You see through your clouds; your enemy cannot.',
      effects: [
        { tag: 'buff', label: 'Stealth', detail: '+12 a second while you stand in one of your own clouds. It does not drain on its own.' },
        { tag: 'shield', label: 'Dodge', detail: 'Up to 33% at 100 stealth, scaling straight down to 0% at none. A dodge costs no stealth.' },
        { tag: 'control', label: 'Thick air', detail: 'Enemy projectiles inside a cloud move 75% slower.' },
        { tag: 'utility', label: 'Cover', detail: 'Your clouds are a see-through veil on your screen and a solid bank on your enemy\'s.' },
        { tag: 'area', label: 'The sky', detail: '4 clouds, each 95–130px across its half-width, drifting at 14–24px a second.' },
      ],
      notes: [
        'A cloud does not make you invisible: bots still attack, and a player can still guess. Cloud Cover is what hides you.',
        'The slow reaches ordinary projectiles. Beams, melee and things an ability places are not slowed.',
        'A small gauge under your feet shows the bar; the yellow tick is the halfway mark.',
      ],
    },
  ],

  abilities: {
    'pierce-the-skies': {
      basics:
        'Form a knife out of air and stab. The more stealth you have, the further the stab throws '
        + 'you and the harder it lands — and it takes all of it. From behind it deals double. '
        + 'Hold the button for a barrage of small stabs.',
      cast: 'Click, aimed with the cursor. 0.65s cooldown. Keep holding for 0.26s and small stabs follow, one every 0.11s.',
      effects: [
        { tag: 'damage', label: 'Stab', detail: '14 damage, +0.36 per point of stealth: 50 at a full bar. Hits everything on the line, once each.' },
        { tag: 'movement', label: 'Lunge', detail: '50px, +2.3px per point of stealth: 280px at a full bar. The knife reaches 62px past where you stop.' },
        { tag: 'damage', label: 'Backstab', detail: 'Double damage from within 60° of directly behind the target — up to 100.' },
        { tag: 'cost', label: 'Stealth', detail: 'Spends all of it, hit or miss.' },
        { tag: 'utility', label: 'Over 50 stealth', detail: 'The stab scars the floor and every cloud is blown away. New clouds crawl in 5s later.' },
        { tag: 'damage', label: 'Barrage', detail: '3 damage a stab at 82px, doubled from behind. Costs no stealth and does not lunge; you move at 60% speed while stabbing.' },
      ],
      notes: [
        'A fighter faces their cursor; a bot faces the way it is walking.',
        'The first press of a hold is always the real stab, so holding with stealth banked spends it.',
      ],
    },

    'air-knock': {
      basics:
        'A short, hard blast of wind right in front of you. Enemies it hits have the wind knocked '
        + 'out of them for 10 seconds: they turn very slowly, and they are on a stamina gauge that '
        + 'drains while they walk.',
      cast: 'E, aimed with the cursor. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Blast', detail: '10 damage to every enemy in a 100px cone about 70° wide.' },
        { tag: 'debuff', label: 'Winded', detail: '10s. A second Knock restarts it with a full gauge.' },
        { tag: 'control', label: 'Slow to turn', detail: 'They can only turn about 30° a second, and everything they cast goes the way they are facing.' },
        { tag: 'control', label: 'Stamina', detail: 'Empties in 2.2s of walking, refills in 1.6s of standing still.' },
        { tag: 'control', label: 'Exhausted', detail: 'Run the gauge dry and they move at 30% speed until it has refilled completely.' },
        { tag: 'movement', label: 'Shove', detail: 'Bots and husks are thrown back at 380px a second for 0.17s.' },
      ],
      notes: ['Somebody who cannot turn cannot protect their back: Knock is what sets up the doubled stab.'],
    },

    'cloud-cover': {
      basics:
        'Wrap yourself in a sparkling cloak of rain. You are invisible, you bank stealth twice as '
        + 'fast in a cloud, and hits land on the cloak instead of you. The cloak has 25 health and '
        + 'loses 5 by itself every 3 seconds.',
      cast: 'R. 22s cooldown.',
      effects: [
        { tag: 'utility', label: 'Invisible', detail: 'Enemies cannot see you at all; you see yourself at 42%. Bots stop aiming at you.' },
        { tag: 'shield', label: 'Cloak', detail: '25 HP. A hit that reaches you is taken by the cloak in full, even one larger than what the cloak has left.' },
        { tag: 'cost', label: 'Wears off', detail: '−5 HP every 3s: 15s at most if nothing touches it.' },
        { tag: 'buff', label: 'In a cloud', detail: 'Stealth builds at 24 a second instead of 12.' },
      ],
      notes: ['Attacking does not take the cloak off.'],
    },

    'air-combo': {
      basics:
        'Three presses. The first throws 6 air knives. A white ring then closes on you: press '
        + 'again as it lands to flip into the air and hang there, untouchable, for 3 seconds. A '
        + 'second ring closes while you are still in the air: press again to rain knives into the floor at the '
        + 'cursor. Miss a ring and the combo ends.',
      cast: 'F, then F on each ring. 14s cooldown from the first press.',
      effects: [
        { tag: 'damage', label: 'Volley', detail: '6 knives in a fan, 6 damage each, 640px range.' },
        { tag: 'utility', label: 'The ring', detail: 'Appears 0.28s after the volley and closes in 0.56s. A press from 0.15s before it lands to 0.11s after counts.' },
        { tag: 'movement', label: 'Levitate', detail: '3s above the fight. Nothing can hit you; you can move but not attack, and you bank no stealth.' },
        { tag: 'damage', label: 'Rain', detail: '12 knives in a 160×108px block at the cursor. 16 damage to everyone in it as they land.' },
        { tag: 'area', label: 'Dagger field', detail: 'Stays for 7s. An enemy moving inside it takes 5 damage every 0.35s. Standing still on it is safe.' },
      ],
      notes: [
        'Pressing too early or too late breaks the combo; so does letting a ring close unanswered.',
        'The second ring lands 2.2s into the levitation, 0.8s before you would come down. Answer it and you drop with the rain; miss it and you float down empty-handed.',
      ],
    },

    'tornado-blade': {
      basics:
        'Pull out your fans and become a spinning top of wind. It skates after your cursor, grinds '
        + 'inside the first enemy it touches, then is thrown back off them. It runs on stamina, '
        + 'which drains over time and when you are hit. More stealth means more stamina.',
      cast: 'Q (ultimate: paid for with charge). Steered with the cursor; nothing else can be cast until it ends.',
      effects: [
        { tag: 'buff', label: 'Stamina', detail: '6s, +0.04s per point of stealth: 10s at a full bar. Stealth is not spent.' },
        { tag: 'cost', label: 'Being hit', detail: 'Each point of damage you take also costs 0.04s of stamina.' },
        { tag: 'movement', label: 'Skating', detail: 'Pulled toward the cursor with very little grip, up to 640px a second. Walls bounce it back at 80% speed.' },
        { tag: 'damage', label: 'Grind', detail: '4 damage every 0.1s for 0.9s while inside an enemy — 36 a bite. You move at 12% speed while grinding.' },
        { tag: 'debuff', label: 'Shredded', detail: 'The enemy being ground on recharges abilities 50% slower.' },
        { tag: 'movement', label: 'Thrown off', detail: 'Launched away at 720px a second. It cannot bite the same enemy again for 0.6s.' },
        { tag: 'utility', label: 'Daggers', detail: 'Rolling over your own dagger field takes all 12 knives into orbit. Each deals 6 damage to an enemy it touches, then is gone.' },
      ],
      notes: [
        'While it grinds, the view pushes in on the two of you; offline, the fight also runs slower for that moment.',
        'Storm (divine perk): each grinding tick also strikes for 2 lightning damage.',
      ],
    },
  },
};

export default air;
