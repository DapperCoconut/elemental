import { ElementCodex } from '../AbilityCodex';

/**
 * Magnet — a scrap-metal magician (reworked 2026-10-15).
 *
 * Verified against `src/elements/magnet.ts`, `kits/MagnetKit.ts` and `kits/MagnetMech.ts`; every
 * number is a constant at the top of one of those two kits. Magnet has no shop upgrades and no
 * mastery since the rework — both were retired and new ones are owed. The Blade perk was rewritten
 * for the new kit.
 */
const magnet: ElementCodex = {
  identity:
    'A scrap-metal magician. Everything it owns is metal left lying around the arena — coins in '
    + 'the air, nails in the enemy, spikes in the floor, shards of plate — and its one real attack, '
    + 'Repulse, fires whatever happens to be in front of it. The kit is about setting things up '
    + 'and then letting them all go at once, and it ends in a giant scrap mech.',

  passives: [
    {
      emoji: '🔩',
      name: 'Scrap',
      basics:
        'A Steel Spike that Repulse launches into a wall breaks into 3 shards that fly back into the '
        + 'arena. In flight a shard deals 8 to each enemy it passes through; once it slows down it '
        + 'lies on the floor for 20 seconds. Walk within 56px of one and it joins a ring orbiting '
        + 'you (46px out, up to 6 shards). An orbiting shard blocks one enemy shot, or deals 12 to an '
        + 'enemy that touches it — either way it is used up. Repulse a shard that is in front of you '
        + 'and you dash that way (900px/s for 0.26s); it has to be a shard inside the cone, not just '
        + 'any shard in the ring.',
      effects: [
        { tag: 'damage', label: 'Flying shard', detail: '8 to each enemy a shard passes through while it is still moving fast (over 120px/s).' },
        { tag: 'summon', label: 'On the floor', detail: 'A shard that has stopped lies there for 20s. Pick it up by walking within 56px.' },
        { tag: 'shield', label: 'Orbit', detail: 'Up to 6 shards ring you at 46px. Each one blocks one enemy shot, then breaks.' },
        { tag: 'damage', label: 'Contact', detail: '12 to an enemy that touches an orbiting shard. The shard breaks.' },
        { tag: 'movement', label: 'Scrap dash', detail: 'Repulse a shard that is inside the cone: you dash the way you face at 900px/s for 0.26s (about 230px). One shard is spent per Repulse.' },
      ],
      notes: [
        'The orbit is shown in your status tray as Orbiting Scrap.',
        'With the Blade perk a launched spike breaks into 5 shards instead of 3.',
      ],
    },
  ],

  abilities: {
    'magnet-coin': {
      basics:
        'Flips a coin straight up from where you stand. It rises and falls back to that spot over 3 '
        + 'seconds and is gone when it hits the floor — it stays there if you walk away. A coin does nothing by '
        + 'itself — it is ammunition for Repulse. Keep the button held for more than 0.22 seconds and '
        + 'you stop flipping: every coin you have in the air freezes where it is in a blue field, and '
        + 'its 3-second timer stops until you let go. Up to 8 coins at once; a ninth makes the oldest '
        + 'drop.',
      cast: 'Click to flip where you stand. Hold to freeze every coin in the air. 0.45s cooldown.',
      effects: [
        { tag: 'summon', label: 'Coin', detail: '3s in the air, up to 120px high, landing where it was flipped. Up to 8 at once.' },
        { tag: 'utility', label: 'Hold', detail: 'Held for over 0.22s: every coin stops moving and its timer pauses until release.' },
        { tag: 'damage', label: 'Fired by Repulse', detail: '6 damage per coin, 820px/s, one target each, for up to 1.1s.' },
      ],
      notes: [
        'A coin\'s shadow stays on the floor under it; the cone reads either the coin or its shadow.',
        'Coins are fired the way you face, not at the cursor from where they hang — line yourself up behind them.',
      ],
    },

    'magnet-repulse': {
      basics:
        'A short burst of force in a 140° cone in front of you (170px). It deals no damage itself; '
        + 'it fires whatever is in it the way you are facing. Coins become 6-damage bullets. A planted '
        + 'Steel Spike is launched as a 30-damage javelin. A nail flying back to you that is within '
        + '150px (anywhere around you) is re-fired at the cursor and can stick again. One orbiting '
        + 'shard inside the cone throws you into a dash. And any enemy with your nail in them is shoved '
        + 'away from you from as far as 340px.',
      cast: 'E, aimed at the cursor. 2.5s cooldown.',
      effects: [
        { tag: 'area', label: 'Cone', detail: '170px deep, 70° either side of your aim.' },
        { tag: 'damage', label: 'Coins', detail: 'Every one of your coins in the cone is fired for 6 damage each.' },
        { tag: 'damage', label: 'Spike', detail: 'A planted spike in the cone is launched at 1050px/s for 30 to everything it passes through.' },
        { tag: 'utility', label: 'Nail re-fire', detail: 'A returning nail within 150px is fired at the cursor as a fresh nail.' },
        { tag: 'control', label: 'Nailed shove', detail: 'Enemies carrying your nail within 340px are pushed away at up to 720px/s for 0.26s (weaker the further away).' },
        { tag: 'movement', label: 'Scrap dash', detail: 'One orbiting shard in the cone is spent to dash you 900px/s for 0.26s.' },
      ],
      notes: [
        'Everything happens in one press — a Repulse that catches three coins, a spike and a nail fires all of them.',
      ],
    },

    'magnet-nail': {
      basics:
        'Shoots a nail (840px/s, 620px reach). If it hits it deals 10 and sticks in them for 12 '
        + 'seconds. While a nail is in someone, Repulse can shove them from far away. Press R again while '
        + 'any of your nails is stuck in someone to rip every one of them out: 15 damage each, and the '
        + 'nails fly back to you. Catch one with Repulse while it is within 150px and it is re-fired at '
        + 'the cursor, ready to stick again. Ripping nails out costs no cooldown.',
      cast: 'R, aimed at the cursor. R again with a nail stuck: rip them out (free). 5s cooldown on the shot.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '10 damage. The nail sticks for 12s.' },
        { tag: 'damage', label: 'Rip out', detail: '15 damage per stuck nail, then each flies home at 760px/s.' },
        { tag: 'utility', label: 'Handle', detail: 'A nailed enemy can be shoved by Repulse from up to 340px.' },
        { tag: 'utility', label: 'Re-fire', detail: 'Repulse a homing nail within 150px to shoot it at the cursor again.' },
      ],
      notes: [
        'The R card shows as ready while a nail is stuck, because the rip-out is free.',
        'An enemy carrying your nail sees a Nailed status.',
      ],
    },

    'magnet-spike': {
      basics:
        'Hangs a steel rod over the cursor (up to 560px away). For 2 seconds it follows your cursor '
        + 'while its shadow swells, then it slams down wherever it is: 22 damage and a light knockback to everything within 95px. The rod stays '
        + 'planted for 15 seconds. Press F again while it is planted to magnetise yourself to it — you '
        + 'are pulled to it at 1100px/s (each spike can be ridden once). Repulse a planted spike to '
        + 'launch it: 30 damage to everything it passes through, and when it hits a wall it shatters '
        + 'into 3 shards of scrap (see Scrap).',
      cast: 'F, aimed at the cursor. F again with an unridden spike planted: ride to it (free). 8s cooldown.',
      effects: [
        { tag: 'area', label: 'Drop', detail: '2s warning (a growing shadow and a ring) that tracks your cursor, within 560px of you, then the slam.' },
        { tag: 'damage', label: 'Shockwave', detail: '22 damage within 95px, pushed back at 380px/s for 0.16s.' },
        { tag: 'summon', label: 'Planted', detail: 'Stays 15s, blinking out at the end.' },
        { tag: 'movement', label: 'Ride', detail: 'F again: pulled to the spike at 1100px/s (up to 0.9s). Once per spike; with several planted, the one nearest the cursor.' },
        { tag: 'damage', label: 'Launched', detail: 'Repulse: 1050px/s, 30 to each enemy it runs through, pushed 520px/s.' },
        { tag: 'summon', label: 'Shatter', detail: 'Hitting a wall breaks it into 3 shards thrown back into the arena.' },
      ],
      notes: [
        'Riding to a spike and then Repulsing it is a point-blank javelin.',
        'The F card shows as ready while you have an unridden spike planted.',
      ],
    },

    'magnet-mecha': {
      basics:
        'Stand still for 3 seconds while shards of scrap stream in from every edge of the screen and '
        + 'pile up on you — you can be hit and you cannot move. Then you become a mech too big for the '
        + 'arena for 15 seconds: only its cockpit (over the edge) and its arms (down the sides) fit. '
        + 'You are untouchable and rooted, and your keys become the mech\'s: Click a hydraulic smash '
        + '(20 in 96px, and 3 chunks of scrap fall 2s later for 10), E a live rail down the arena at '
        + 'the cursor (15 per second to anyone on it, 8s), R a scrap avalanche across the whole arena '
        + '(25, carried to the far wall for 30 more and a 0.7s stun, then 50 pieces of scrap rain down '
        + 'for 12), F a visor cannon dragged with the cursor for 4s (5 every 0.2s, leaving burning slag '
        + 'that deals 5 every 0.5s), and Q self-destruct — you are ejected and 20 blasts (20 each) walk '
        + 'across the arena. Your health is put back to what it was when the mech arrived.',
      cast: 'Q. 3s rooted wind-up, then 15s as the mech. 50s cooldown.',
      effects: [
        { tag: 'cost', label: 'Wind-up', detail: '3s standing still, vulnerable.' },
        { tag: 'shield', label: 'Pilot', detail: 'Hidden, untouchable and rooted for 15s. Health restored to its value on entry.' },
        { tag: 'damage', label: 'Smash (Click)', detail: '20 within 96px; 3 scrap chunks land 2s later for 10 within 46px. 1.4s cooldown.' },
        { tag: 'damage', label: 'Mag Rail (E)', detail: '15 per second to anyone within 26px of the rail, for 8s. 5s cooldown.' },
        { tag: 'control', label: 'Avalanche (R)', detail: '25 on contact, carried to the far wall: 30 and a 0.7s stun there. Then 50 scrap pieces rain for 12 each. 13s cooldown.' },
        { tag: 'dot', label: 'Visor Cannon (F)', detail: '4s beam, 5 every 0.2s within 34px; slag deals 5 every 0.5s for 7s. 10s cooldown.' },
        { tag: 'damage', label: 'Self-Destruct (Q)', detail: 'Ends the form: you are ejected and 20 blasts of 20 (76px) land across the arena.' },
      ],
      notes: [
        'This is Earth\'s old Titan Form rebuilt in scrap — the same five keys and numbers, with a 15s timer.',
        'An enemy Magnet\'s mech hangs off the opposite edge, so two mechs never overlap.',
      ],
    },
  },

  perks: {
    blade: {
      basics:
        'Your Steel Spike is an iron sword. When Repulse launches it, it deals double damage — 60 '
        + 'instead of 30 — to everything it runs through, and when it hits a wall it shatters into 5 '
        + 'shards of scrap instead of 3.',
      effects: [
        { tag: 'damage', label: 'Sword', detail: 'A launched spike deals 60 instead of 30.' },
        { tag: 'summon', label: 'More scrap', detail: 'Shatters into 5 shards instead of 3.' },
      ],
      notes: ['The perk\'s ingredients are electricity, acid, fate and light.'],
    },
  },
};

export default magnet;
