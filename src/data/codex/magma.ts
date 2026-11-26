import { ElementCodex } from '../AbilityCodex';

/**
 * Magma — a pirate made of the melt, and everything he carries is loaded.
 *
 * Verified against `src/elements/magma.ts` and `kits/MagmaKit.ts`. Every number below is a
 * constant at the top of the kit. No upgrades, element perks or mastery.
 */
const magma: ElementCodex = {
  identity:
    'A pirate cooled out of the crust, and every button is something he carries. A blunderbuss '
    + 'that only throws him when he fires it straight out of a dodge, two flintlocks, a drink '
    + 'that puts the pain off until later, a core he clamps to somebody and then beats on until '
    + 'it goes off, and a galleon that comes up across the top of the arena with three guns and '
    + 'an anchor on a chain. Most of what he does leaves lava where it lands.',

  passives: [
    {
      emoji: '🌋',
      name: 'Lava On The Floor',
      basics:
        'Cannonballs and Unstable Cores leave pools of lava. Standing in one burns for 24 a '
        + 'second. Pools on top of each other do not burn harder, and stepping out stops the '
        + 'burn at once. A pool lasts 5 seconds and skins over as it dies.',
      effects: [
        { tag: 'dot', label: 'Standing in one', detail: '24 damage a second, paid in whole points as they build up.' },
        { tag: 'area', label: 'The pool', detail: '26px radius, 5s of life. A cannonball\'s middle pool is 30px; the pools an erupting core drips are 24px and last 3.8s.' },
        { tag: 'utility', label: 'Overlap does not stack', detail: 'The burn is 24 a second whether 1 pool is touching you or 5.' },
        { tag: 'utility', label: 'Stepping out', detail: 'The burn stops at once. Any part of a point you had built up is thrown away, so 0 is carried over to the next time you step in.' },
        { tag: 'utility', label: 'The cap', detail: '40 pools on the field at once across both sides. The oldest is dropped to make room.' },
      ],
      notes: [
        'Your own lava never burns you.',
        'A pool darkens from white-hot to crust over its life: a nearly black one is about to stop hurting.',
      ],
    },
    {
      emoji: '💨',
      name: 'The Roll-Shot',
      basics:
        'A Blunderblast fired within 700ms of starting a dodge kicks: the recoil throws you '
        + '240px directly away from where you aimed. Each dodge buys one kick. Fired any other '
        + 'time, the gun does not move you at all.',
      effects: [
        { tag: 'utility', label: 'The window', detail: '700ms from the moment the dodge starts. A gold ring pulses round you while it is open.' },
        { tag: 'movement', label: 'The kick', detail: '240px straight back from your aim over 0.38s, fast at first and then a skid. You cannot steer during it, and it stops at the arena wall.' },
        { tag: 'cost', label: 'One per dodge', detail: 'The first blast after a dodge takes the kick. A second blast inside the same 700ms does not kick again.' },
      ],
      notes: [
        'The pellets go where you aimed and you go the other way: aim at somebody to get away from them, or aim behind you to be thrown into them.',
        'Only the blunderbuss kicks. A flintlock shot or a click that lights a cannon does not use up the window.',
        'A bot has no dodge key, so its roll-shot is a blast fired within 150px of you, at most once every 3.5s.',
      ],
    },
  ],

  abilities: {
    'magma-blunder': {
      basics:
        'Fire a spread of 8 small molten pellets at your cursor for 4 damage each. The gun holds '
        + '2 charges and each takes 3 seconds to come back. Fired right after a dodge, the recoil '
        + 'throws you a long way the other way (see The Roll-Shot). The same click fires a drawn '
        + 'flintlock or lights a ship\'s cannon instead when one of those is on offer.',
      cast: 'Click, aimed with the cursor. 2 charges; one reloads at a time, 3s each. Presses closer than 0.3s apart are ignored.',
      effects: [
        { tag: 'damage', label: 'The spread', detail: '8 pellets, 4 damage each — 32 if every one lands. A pellet stops in the first enemy it touches (within 20px).' },
        { tag: 'area', label: 'The pattern', detail: 'Fanned evenly across about 31° and then jittered a little. Pellets fly at about 640px a second and die out at 310px.' },
        { tag: 'control', label: 'Shove', detail: 'A hit nudges its target 16px along the pellet\'s flight. Pellets landing together do not add up: the newest shove replaces the last.' },
        { tag: 'utility', label: 'Charges', detail: '2 in the gun. Only 1 reloads at a time, 3s each, and the clock starts on the shot that breaks a full gun.' },
        { tag: 'movement', label: 'Out of a dodge', detail: 'Fired within 700ms of a dodge, you are thrown 240px back over 0.38s. Once per dodge.' },
        { tag: 'utility', label: 'One button, three jobs', detail: 'In this order: a cannon under the cursor within 44px is lit; a drawn flintlock is fired; otherwise the blunderbuss goes off. Only the last costs 1 charge.' },
        { tag: 'utility', label: 'The anchor', detail: 'A pellet that passes within 26px of your ship\'s anchor is spent knocking it loose instead of flying on.' },
      ],
      notes: [
        'The spread is a pattern with holes in it. At arm\'s length all 8 land on one body; at the end of its range two or three do.',
        'It cannot be fired during the 0.48s you are melting into the floor for Limoncello.',
      ],
    },

    'magma-hotshot': {
      basics:
        'Pull out two flaming flintlocks. Your next two clicks each fire one: an instant shot '
        + 'along your aim for 26 damage to the first enemy on the line. When both are spent you '
        + 'are back on the blunderbuss.',
      cast: 'E to draw, then Click twice. 9s cooldown from the draw.',
      effects: [
        { tag: 'buff', label: 'Two rounds', detail: '2 shots, right hand first. They stay drawn until both are fired, however long that takes.' },
        { tag: 'damage', label: 'The shot', detail: '26 damage, instantly, to the first enemy within 20px of the line from you through your cursor.' },
        { tag: 'area', label: 'Reach', detail: '900px, or the arena wall if that comes first.' },
        { tag: 'control', label: 'Shove', detail: 'The enemy hit is knocked 30px along the shot.' },
        { tag: 'utility', label: 'The blunderbuss waits', detail: 'A flintlock shot costs 0 Blunderblast charges, and charges keep reloading while the pistols are out.' },
      ],
      notes: [
        'It hits one enemy only: somebody standing behind the first body on the line is safe.',
        'A flintlock never kicks you, even straight out of a dodge.',
        'While a cannon is under your cursor and within reach, the click lights the cannon and the pistol stays loaded.',
      ],
    },

    'magma-drink': {
      basics:
        'Chug a flaming brew and go Numb for 5 seconds: you take no damage, and nothing can slow '
        + 'or stun you. Every hit you did not feel is counted. When the drink wears off, 80% of '
        + 'that total comes back as a burn over 4 seconds.',
      cast: 'R. Instant — the numbness starts on the press. 18s cooldown.',
      effects: [
        { tag: 'shield', label: 'Numb', detail: '5s. Every hit that reaches you is swallowed whole and added to a running total instead.' },
        { tag: 'buff', label: 'Unstoppable', detail: 'For the same 5s nothing can slow or stun you, and a stun already on you is cleared as you drink.' },
        { tag: 'cost', label: 'The hangover', detail: '80% of the total, rounded, paid as a burn spread evenly over 4s. Swallow 100 and you take 80, at 20 a second.' },
        { tag: 'cost', label: 'Nothing blocks it', detail: 'The hangover goes straight to health over its 4s: no shield, armour or second drink stops any of it.' },
        { tag: 'utility', label: 'The tell', detail: 'A cool blue ring with a clock that burns away over the 5s; a red arc creeps round it as the total grows, full at 120.' },
      ],
      notes: [
        'It buys time, not health: one fifth of the damage is gone for good and the rest arrives when you can better afford it — or cannot.',
        'If the hangover finds you still burning off an earlier one, the two are added together and the 4 seconds start again.',
        'Damage that pierces shields pierces numbness too: it lands at once and is not counted.',
        'Numbness comes before the ship: aboard and numb, hits are counted against you, not taken out of the hull.',
        'It cannot be drunk during the 0.48s you are melting into the floor for Limoncello.',
      ],
    },

    'magma-core': {
      basics:
        'Clamp a molten core with 100 HP onto an enemy standing very close. Whatever damage they '
        + 'take, from anyone, the core takes too. At zero it erupts on them for 5 seconds — '
        + 'burning them for 10 a second, dripping lava where they stand and throwing rock in '
        + 'every direction — and then explodes for 45.',
      cast: 'F. Clamps to the nearest enemy within 120px. 14s cooldown; a press with nobody in reach costs nothing.',
      effects: [
        { tag: 'summon', label: 'The core', detail: '100 HP, riding 30px above its host with a gauge over it. One core of yours per enemy.' },
        { tag: 'utility', label: 'Shared damage', detail: 'Every 1 point of health the host loses, to anything at all, takes 1 off the core. Its shell splits off plate by plate as it goes.' },
        { tag: 'dot', label: 'Eruption', detail: '5s. The host burns for 10 a second — 50 in all.' },
        { tag: 'summon', label: 'Lava underfoot', detail: 'A 24px pool under the host every 0.65s, each lasting 3.8s and burning for 24 a second like any other.' },
        { tag: 'damage', label: 'Thrown rock', detail: 'A rock every 0.24s in a turning spray: 9 damage to the first enemy it touches (within 22px), flying at 230px a second for 2.2s. Rocks pass through the host.' },
        { tag: 'damage', label: 'The blast', detail: '45 damage to the host and to every enemy within 130px of them, who are also thrown 110px away. Leaves a 26px pool for 5s.' },
      ],
      notes: [
        'The core does no damage until its shell is gone, so it is only worth what you follow it with. Both Blunderblast charges landed whole are 64 and both Hotshots are 52: 116 against its 100.',
        'It counts health actually lost. Damage a shield soaks up does not crack the core.',
        'A host who dies takes the core with them: no eruption, no blast.',
        'An erupting host who stands still stands in their own lava. Running leaves a trail of it instead.',
        'Ruin\'s Spikes of Ruin razes a core outright; it is simply gone and does not erupt.',
      ],
    },

    'magma-limoncello': {
      basics:
        'Melt into the ground and come back up on a giant molten pirate ship across the top of '
        + 'the arena. She has 200 hull, which takes your hits while you stand on her deck. Click '
        + 'a cannon you are standing by to light its fuse: each of the three covers a different '
        + 'third of the arena for 36 and leaves lava. Blast the anchor to send it swinging on its '
        + 'chain for 24. You can walk off the ship whenever you like.',
      cast: 'Q (ultimate: paid for with charge). You are rooted for 0.48s as you melt, and the ship takes 0.52s to rise. Cannot be cast while a ship of yours is afloat.',
      effects: [
        { tag: 'summon', label: 'The ship', detail: '440×104px, across the top middle of the arena. 200 hull; you come up standing on the deck.' },
        { tag: 'cost', label: 'Burning down', detail: 'The hull loses 4 a second by itself — 50s if nothing else touches it. At 0 she sinks.' },
        { tag: 'shield', label: 'On deck', detail: 'While you stand on the deck, a hit meant for you is taken out of the 200 hull in full instead.' },
        { tag: 'shield', label: 'Stops shots', detail: 'Enemy projectiles that cross the deck are destroyed, and their damage (at least 1) comes off the hull — whether or not you are aboard.' },
        { tag: 'utility', label: 'Lighting a gun', detail: 'Click with the cursor within 44px of a cannon while you stand within 130px of it. The fuse burns 0.6s; the gun reloads in 3.2s.' },
        { tag: 'damage', label: 'Cannonball', detail: '36 damage in a 64px blast and a 120px shove, landing 0.85s after the gun fires. A closing ring marks where.' },
        { tag: 'area', label: 'A third each', detail: '3 guns, each covering one third of the arena\'s width. A gun fires at the nearest enemy in its third when the fuse runs out, or at the middle of it if nobody is there.' },
        { tag: 'summon', label: 'What it leaves', detail: '3 pools where the ball lands — a 30px one and two of 26px beside it — for 5s.' },
        { tag: 'utility', label: 'The anchor', detail: 'Sits in the floor off the bow on a 380px chain. Each Blunderblast pellet that hits it adds 190px a second of speed, up to 950.' },
        { tag: 'damage', label: 'Tetherball', detail: '24 damage and a 130px shove to any enemy within 32px while it is moving at 170px a second or more, at most once every 0.6s each.' },
        { tag: 'utility', label: 'Hauled home', detail: 'The anchor flies for 2.6s, bouncing off walls at 75% speed and swinging round at the end of its chain, then is reeled back in to be blasted again.' },
      ],
      notes: [
        'The cannonball comes down where its target was standing when the gun fired, not where they are 0.85s later.',
        'A click on a cannon is never a Blunderblast into your own deck: a gun that is still reloading simply does nothing.',
        'The anchor can be blasted from anywhere, on deck or off it. It goes the way the pellets were travelling, so where you stand is the aim.',
        'Off the deck you take your own hits again. The ship stays afloat, still stopping shots and still burning down.',
        'A ship that sinks just goes under: no blast, no lava.',
        'Ruin\'s Spikes of Ruin razes the ship like any other summon.',
      ],
    },
  },
};

export default magma;
