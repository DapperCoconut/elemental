import { ElementCodex } from '../AbilityCodex';

/**
 * Radiation — a sniper in lead plate (reworked 2026-10-15).
 *
 * Verified against `src/elements/radiation.ts` and `kits/RadiationKit.ts`; every figure below is
 * a constant at the top of the kit. The five shop upgrades (2026-10-16) live in the kit's "Shop
 * upgrades" section. Radiation has no mastery since the rework — one is owed — and no perks.
 */
const radiation: ElementCodex = {
  identity:
    'A sniper in lead plate. His click is a procedure: tag a body three times and the railgun '
    + 'fires itself, and one tracer that hits nothing scrubs the whole board. Around it he has a '
    + 'sighting cone that has to be held on a target while it closes, a lead bunker to hide in, and '
    + 'a uranium rod for whoever got too close. The status he sells is irradiated, which turns every '
    + 'heal into a hit — and makes his Barrage and his rod hit harder.',

  passives: [
    {
      emoji: '☢️',
      name: 'Irradiated',
      basics:
        'While a target is irradiated, every heal they receive is dealt to them as damage of the same '
        + 'size instead — their own regeneration, an ally\'s heal, a potion, a lifesteal tick, all of '
        + 'it. A confirmed railgun and the airdrop put 10 seconds of it on; the Rod Baton puts 4. A new '
        + 'dose never shortens one already running, and doses do not stack. Being irradiated also '
        + 'makes Barrage hit for 8 a round instead of 5, and turns the Rod Baton from a dose into a '
        + '2-second stun.',
      effects: [
        { tag: 'debuff', label: 'Healing inverted', detail: 'Every heal the victim receives is dealt as damage of the same size instead, from any source.' },
        { tag: 'area', label: 'How long', detail: '10 seconds from the railgun or the airdrop, 4 seconds from the Rod Baton. A new dose never shortens the one already running.' },
        { tag: 'damage', label: 'Barrage', detail: 'Barrage rounds deal 8 instead of 5 to an irradiated target.' },
        { tag: 'control', label: 'Rod Baton', detail: 'The rod deals 16 instead of 8 to an irradiated target and stuns them for 2 seconds instead of dosing them.' },
      ],
      notes: [
        'A green trefoil and a draining bar hang over anybody carrying a dose.',
        'The inversion prints "☢ N REJECTED" every time a heal turns into a hit, so it never reads as a bug.',
      ],
    },
  ],

  abilities: {
    'radiation-railgun': {
      basics:
        'Click fires a tracer that deals no damage: 950 px/s for 700px, sticking to anything within '
        + '35px of its path. Three tracers on one body confirms — counted per victim, so tagging two '
        + 'enemies twice each confirms neither — and the confirmation fires itself the instant the third '
        + 'lands, as a 50-damage hitscan that cannot be dodged, plus 10 seconds irradiated. A tracer '
        + 'that hits nothing at all, whether the arena edge or the end of its 700px, sheds every tracer '
        + 'this side has planted on every body and prints "✖ TRACERS LOST". The three are consumed by '
        + 'the shot, so the next railgun costs another three clean clicks. 620ms cooldown.',
      cast: 'Click, held — 620ms cooldown. Aimed at the cursor and thrown from the weapon hand.',
      effects: [
        { tag: 'utility', label: 'The tracer', detail: 'Deals no damage. Flies at 950 px/s for 700px and sticks to the first body it passes within 35px of.' },
        { tag: 'resource', label: 'The count', detail: '3 tracers on one body confirms. Counted per victim.' },
        { tag: 'damage', label: 'The shot', detail: '50 damage, hitscan — it fires itself the instant the third tracer lands.' },
        { tag: 'debuff', label: 'On confirm', detail: '10 seconds irradiated.' },
        { tag: 'cost', label: 'The miss', detail: 'A tracer that hits nothing sheds every tracer this side has planted, on every body.' },
      ],
      upgrade: {
        basics:
          'Flick Shot: face away from the nearest enemy — more than 100° off them — then flick your aim '
          + 'back and click. A tracer thrown within 0.35 seconds of facing away comes out spiked, and '
          + 'when it lands it deals 25 damage. It is still a tracer: it counts toward the three, and if '
          + 'it misses it still scrubs the board. A tracer thrown while you are still facing away is '
          + 'not spiked, and flares never are.',
        effects: [
          { tag: 'utility', label: 'The flick', detail: 'Aim more than 100° away from the nearest enemy, then click toward them within 0.35s.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Spiked', detail: '25 damage when the spiked tracer lands.', requiresUpgrade: 'click' },
          { tag: 'resource', label: 'Still a tracer', detail: 'It counts toward the railgun\'s three like any other tracer.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'While the flare gun from Q is out, the click fires flares instead and no tracers are placed.',
        'A tracer is swept across its whole step rather than sampled at the end of it, so a fast round on a small target cannot skip through the body between two frames.',
      ],
    },

    'radiation-barrage': {
      basics:
        'Opens a 45° sighting cone, 560px long, pointing wherever you aim — it follows your cursor for '
        + 'the whole cast. The first enemy inside it is locked on, and the cone starts closing: from 45° '
        + 'down to 5° over 3 seconds. If the locked enemy gets out of the cone at any point, or nobody '
        + 'is found within 1.2 seconds, the ability is cancelled. When the cone reaches 5°, an instant '
        + 'burst of 5 hitscan rounds fires at the enemy, 60ms apart, aimed at them automatically: 5 '
        + 'damage each, or 8 each if they are irradiated — 25 or 40 in total.',
      cast: 'E, aimed at the cursor; keep the cursor on them. 7s cooldown, spent whether it fires or not.',
      effects: [
        { tag: 'area', label: 'The cone', detail: '560px long. Opens at 45°, closes to 5° over 3 seconds once it has locked on.' },
        { tag: 'utility', label: 'The lock', detail: 'Locks onto the nearest enemy inside the cone. Their middle has to stay inside it — grazing the edge does not count.' },
        { tag: 'cost', label: 'Cancelled', detail: 'If the locked enemy leaves the cone, or nobody is found within 1.2s, nothing fires.' },
        { tag: 'damage', label: 'The burst', detail: '5 hitscan rounds, 60ms apart, aimed at the target: 5 damage each.' },
        { tag: 'damage', label: 'Irradiated', detail: '8 damage per round instead of 5 against an irradiated target.' },
      ],
      upgrade: {
        basics:
          'Trigger Happy: the burst no longer stops at five. The first five rounds fire as usual, then '
          + 'the cone stays up and you keep firing — one round every 0.1 seconds, 5 damage each or 8 on '
          + 'an irradiated target — for as long as the enemy stays inside the cone. While it fires the '
          + 'cone keeps closing, from 5° down to 1° over 4 seconds, so it gets harder and harder to '
          + 'hold. The moment they are outside it the fire stops.',
        effects: [
          { tag: 'damage', label: 'Sustained fire', detail: 'After the first five, a round every 0.1s — 50 damage a second, 80 on an irradiated target.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Closing', detail: 'The cone keeps narrowing while it fires: 5° to 1° over 4 seconds.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Ceasing', detail: 'It stops the moment the target leaves the cone.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'A lock reticle closes in on the target as the cone narrows; the rails turn yellow in the last stretch.',
        'A stunned target cannot walk out of the cone — the Rod Baton\'s stun lasts 2 of the 3 seconds.',
        'Being stunned yourself cancels the cast.',
      ],
    },

    'radiation-bunker': {
      basics:
        'Builds a round lead bunker, 72px across the inside, exactly where you are standing. It has '
        + '75 HP and lasts 10 seconds. Enemy projectiles that reach the wall stop there and their damage '
        + 'comes off the bunker\'s HP. Enemies cannot walk into it — they are held outside the wall and '
        + 'slide round it. You can walk in and out freely, and while you are inside nothing can hurt you: '
        + 'every hit aimed at you lands on the bunker instead. At 0 HP it comes down. It also shelters '
        + 'you from your own Extermination airdrop — the bunker takes the whole blast and collapses.',
      cast: 'R. Built at your feet. 16s cooldown. A new bunker replaces the old one.',
      effects: [
        { tag: 'summon', label: 'The bunker', detail: '75 HP, 10 seconds, a 72px ring around where you cast it.' },
        { tag: 'shield', label: 'Shots', detail: 'Enemy projectiles stop in the wall. Their damage comes off the bunker\'s HP.' },
        { tag: 'control', label: 'Enemies', detail: 'Enemies cannot get inside — they are held at the wall.' },
        { tag: 'shield', label: 'Inside', detail: 'While you are inside, every hit on you lands on the bunker instead.' },
        { tag: 'shield', label: 'The airdrop', detail: 'Inside your bunker when your own airdrop lands: you take none of its 200, and the bunker comes down.' },
      ],
      upgrade: {
        basics:
          'Turret Town: the bunker comes with two radioactive turrets, one bolted to each side of the '
          + 'wall. Each shoots for 4 damage about twice a second at the nearest enemy within 300px — or, '
          + 'for 3 seconds after anything hits the bunker, at anyone within 600px. They only ever shoot '
          + 'enemies who are irradiated; a clean enemy can stand right next to them. They come down '
          + 'with the bunker.',
        effects: [
          { tag: 'summon', label: 'The turrets', detail: 'Two, one on each side of the bunker wall. They last as long as the bunker.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Shots', detail: '4 damage, one shot every 0.42s per turret.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'Reach', detail: '300px — 600px for 3 seconds after the bunker is hit.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'Irradiated only', detail: 'They never shoot an enemy who is not irradiated.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'An HP arc rides the top of the wall, and the blocks crack and fall out as it is damaged.',
        'Hits that pierce shields go straight through, as they do for every shield in the game.',
      ],
    },

    'radiation-baton': {
      basics:
        'Pulls out a uranium rod and strikes forward at close range — 92px out, in a wedge about 90° '
        + 'wide. A clean target takes 8 damage and is irradiated for 4 seconds. A target that is already '
        + 'irradiated takes 16 damage and is stunned for 2 seconds instead (no moving, no casting).',
      cast: 'F, aimed at the cursor. 6s cooldown.',
      effects: [
        { tag: 'area', label: 'Reach', detail: '92px out, about 45° either side of your aim.' },
        { tag: 'damage', label: 'Clean target', detail: '8 damage.' },
        { tag: 'debuff', label: 'Dose', detail: 'A clean target is irradiated for 4 seconds.' },
        { tag: 'damage', label: 'Dosed target', detail: '16 damage.' },
        { tag: 'control', label: 'Stun', detail: 'A dosed target is stunned for 2 seconds — no moving, no casting.' },
      ],
      upgrade: {
        basics:
          'Mutation: when the rod hits an enemy who is already irradiated, they still take 16 and are '
          + 'still stunned for 2 seconds — but the dose comes off, and they are mutated instead. A '
          + 'mutated enemy\'s hitbox is 25% bigger for 15 seconds, so tracers, flares, Barrage and '
          + 'everything else land on them more easily.',
        effects: [
          { tag: 'debuff', label: 'Mutated', detail: 'Hitbox 25% bigger for 15 seconds.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'The dose', detail: 'Their irradiation is removed — healing works on them again until they are re-dosed.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Base effects', detail: 'Still 16 damage and a 2-second stun.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Two rods in a row is a dose and then a stun; a railgun confirm or the airdrop sets the stun up from range.',
      ],
    },

    'radiation-extermination': {
      basics:
        'Draws a flare gun with 5 rounds and 12 seconds to fire them. While it is out, your click fires '
        + 'flares instead of tracers: 1350 px/s, 900px, no damage. Land all five on the same enemy and '
        + 'an airdrop is called — 1.7 seconds of siren with its footprint painted across the whole '
        + 'arena, then 200 damage and 10 seconds irradiated to every enemy on screen, and 200 to you as '
        + 'well through self-damage. Anything less than five on one body calls nothing at all and prints '
        + '"✖ NO CONFIRMATION".',
      cast: 'Q, then five clicks. 40s cooldown.',
      effects: [
        { tag: 'resource', label: 'The magazine', detail: '5 flares, 12 seconds. Flares deal no damage.' },
        { tag: 'damage', label: 'The airdrop', detail: '200 damage to every enemy on screen, 1.7 seconds after the fifth flare lands.' },
        { tag: 'debuff', label: 'Fallout', detail: '10 seconds irradiated on everybody it hits.' },
        { tag: 'cost', label: 'And you', detail: '200 to you too, through self-damage — unless you are inside your own Fallout Bunker, which takes the blast for you and collapses.' },
        { tag: 'cost', label: 'The miss', detail: 'Four on one body and a stray, or the window running out: nothing happens and the cooldown is spent.' },
      ],
      upgrade: {
        basics:
          'Complete Annihilation: the airdrop splashes 11 radioactive puddles across the arena that '
          + 'last 9 seconds. An enemy standing in one takes 3 damage every 0.4 seconds and is irradiated '
          + 'while they stay. Any enemy who was already irradiated when the nuke hit becomes '
          + 'over-radiated for 8 seconds: they move at half speed and take 30% more damage from '
          + 'everything, on top of the 200 and the fresh dose.',
        effects: [
          { tag: 'area', label: 'Puddles', detail: '11 puddles in a fixed splash around the middle of the arena, for 9 seconds.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Standing in one', detail: '3 damage every 0.4s (7.5 a second), and a 2.5-second dose kept topped up.', requiresUpgrade: 'q' },
          { tag: 'debuff', label: 'Over-radiated', detail: 'Already irradiated when the nuke hits: half speed and +30% damage taken for 8 seconds.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The magazine is shown over your head and a hit counter over each enemy you have tagged.',
      ],
    },
  },

  mastery: {
    'x-ray-vision': {
      basics:
        'You see straight through them. Every enemy carries a green outline on your screen — a neon '
        + 'contour round the body, scanner brackets, the faint bones inside and a scan line sweeping '
        + 'down through it. The outline is drawn whatever the body itself is doing, so a target that '
        + 'has gone invisible (Silence stealth, Depths camouflage, a Technology shelter, anything that '
        + 'fades a fighter out) is still an outline walking about.',
      cast: 'Passive. Always on while Radiation Mastery is enabled and Radiation is the element being played.',
      effects: [
        { tag: 'utility', label: 'Outlined', detail: 'Every enemy on your screen has a green outline, visible or not.' },
      ],
      notes: [
        'It only shows you where they are. It does not make them targetable by anything that could not already hit them.',
        'A Radiation bot with the mastery is not fooled by invisibility either: it keeps fighting instead of wandering.',
        'In Invasion only the husks in the room you are in are outlined.',
      ],
    },
    'test-dummy': {
      basics:
        'Throw out a crash-test dummy — up to 230px toward the cursor — tied to you by a faint green '
        + 'link. It has 25 HP. Until it dies you cannot be hurt: every hit that would land on you runs '
        + 'down the link and into the dummy instead, from any source. Bots and husks switch to '
        + 'attacking the dummy, enemy shots that hit it stop there, and blasts that reach it count as '
        + 'hits on you (so they go into the dummy too). It stands for 12 seconds if nobody breaks it. '
        + 'Like the Fallout Bunker, it also takes your own airdrop\'s 200 for you — and breaks doing it. '
        + 'Bindable to R, F or Q. 16s cooldown.',
      cast: 'The bound key (R, F or Q). It is thrown toward the cursor.',
      effects: [
        { tag: 'summon', label: 'The dummy', detail: '25 HP, thrown up to 230px; stands for 12 seconds.' },
        { tag: 'shield', label: 'The link', detail: 'While it stands, every hit on you goes into the dummy instead.' },
        { tag: 'control', label: 'Decoy', detail: 'Bots and husks target the dummy; enemy shots that hit it stop there.' },
        { tag: 'utility', label: 'Cover', detail: 'Your own airdrop\'s self-hit lands on the dummy and breaks it.' },
      ],
      notes: [
        'The killing hit is absorbed too — however big it is, the dummy takes all of it.',
        'Throw it between you and them: shots aimed at you hit it on the way.',
        'Pair it with the flare gun — you can walk right up and place all five flares without being hurt.',
        'A Radiation NPC on Nightmare binds it over Fallout Bunker and throws it as its airdrop falls, while its flare gun is out, or when it is hurt and pressed.',
      ],
    },
  },
};

export default radiation;
