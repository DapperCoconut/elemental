import { ElementCodex } from '../AbilityCodex';

/**
 * Magnet — a scrap-metal magician (reworked 2026-10-15).
 *
 * Verified against `src/elements/magnet.ts`, `kits/MagnetKit.ts` and `kits/MagnetMech.ts`; every
 * number is a constant at the top of one of those two kits. Shop upgrades (Shatter Shot, Magnetize,
 * Nailstorm, Electromagnet, Mega Mechancements) landed 2026-10-16; the mastery is still owed. The
 * Blade perk was rewritten for the new kit.
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
      upgrade: {
        basics:
          'Shatter Shot: a coin Repulse has fired that reaches the wall of the arena, still flying, '
          + 'bursts into 6 gold fragments that come back into the arena at 640px a second, aimed in '
          + 'a fan at the nearest enemy. Each fragment deals 3 to the first body it touches and can '
          + 'bounce off one more wall; it is gone after 0.9 seconds. If an enemy is magnetised (E+), '
          + 'every fragment goes straight at them instead, locked on all the way.',
        effects: [
          { tag: 'damage', label: 'Fragments', detail: '6 per coin that reaches a wall, 3 each — 18 if they all land.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'Fan', detail: 'Spread ±26° at the nearest enemy, 640px/s, one bounce, 0.9s.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Magnetised', detail: 'A magnetised enemy draws every fragment, locked on.', requiresUpgrade: 'click' },
        ],
      },
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
      upgrade: {
        basics:
          'Magnetize: everything Repulse touches is magnetised. Enemies inside the cone (and every '
          + 'nailed enemy it shoves) are magnetised for 5 seconds. The coins it fires, the nails it '
          + 're-fires and the spikes it launches are magnetised too: with nothing magnetised about, '
          + 'they bend toward the nearest enemy within 360px (a gentle turn — they can still miss). '
          + 'A magnetised enemy pulls any of your coins, nails, spikes or fragments that pass within '
          + '110px of them. And two magnets lock: a magnetised shot within 720px of a magnetised enemy '
          + 'flies perfectly onto them — a thin field line shows the lock. A launched spike that has '
          + 'already gone through someone looks for the next. Scrap from a repulsed spike no longer '
          + 'drops on the floor: it flies straight back to you (still cutting anyone on the way) and '
          + 'joins your orbit, or lands at your feet if the ring is full.',
        effects: [
          { tag: 'debuff', label: 'Magnetised', detail: '5s on every enemy in the cone or shoved by a nail. Shown as a red-and-blue field round them.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Basic homing', detail: 'Fired coins and re-fired nails turn 2.6 rad/s toward the nearest enemy within 360px; spikes 1.4 rad/s.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Attraction', detail: 'Any of your shots within 110px of a magnetised enemy bends hard toward them.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Two magnets', detail: 'Magnetised shot + magnetised enemy within 720px = a perfect lock.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Scrap comes home', detail: 'Shards from a repulsed spike fly straight to you at 620px/s and join the orbit.', requiresUpgrade: 'e' },
        ],
      },
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
      upgrade: {
        basics:
          'Nailstorm: Nail Implant fires a tight burst of 3 golden nails (3.4° apart), and all three '
          + 'can stick in the same enemy for 10 each. Every nail in a body makes the rest worse: '
          + 'ripping them out deals 15 plus 4 for every other one of your nails in that body (23 each '
          + 'with three in), and when Repulse shoves a nailed enemy it deals 4 for each nail in them and '
          + 'pushes 20% harder per nail past the first. With Magnetize (E+), each nail also keeps them '
          + 'magnetised a second longer.',
        effects: [
          { tag: 'damage', label: 'Burst', detail: '3 golden nails, 10 each on impact — all three can stick in one body.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Rip out', detail: '15 + 4 per other nail in the same body, per nail: 3 nails rip for 69.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'Handles', detail: 'Repulse on a nailed enemy: 4 damage per nail, +20% push per extra nail.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Held charge', detail: 'With Magnetize: +1s magnetised per nail in them.', requiresUpgrade: 'r' },
        ],
      },
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
      upgrade: {
        basics:
          'Electromagnet: your steel spikes carry current. A planted spike arcs into every enemy '
          + 'within 120px for 5 every 0.9 seconds. Riding to one (F again) leaves you Charged for 4 '
          + 'seconds: 35% faster, with an aura that zaps every enemy within 105px for 5 every 0.6 '
          + 'seconds. A live spike that Repulse throws into a wall breaks into live scrap; while it '
          + 'orbits you, every 1.1 seconds one live shard shoots the nearest enemy shot within 140px of '
          + 'you out of the air — without being used up, unlike an ordinary block.',
        effects: [
          { tag: 'damage', label: 'Live spike', detail: '5 to every enemy within 120px, every 0.9s, for as long as it stands.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Charged', detail: 'Ride a live spike: +35% speed for 4s.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Aura', detail: 'While charged, 5 to every enemy within 105px every 0.6s.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Live scrap', detail: 'Orbiting live scrap zaps one enemy shot within 140px every 1.1s. The shard survives.', requiresUpgrade: 'f' },
        ],
      },
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
      upgrade: {
        basics:
          'Mega Mechancements: the mech comes out red — crimson plate, war-horns and a gold chevron '
          + 'on the cockpit, a red visor and red current in its rail — and everything it does is '
          + 'bigger. Hydraulic Smash deals 30 in 120px and kicks up 5 chunks (14 each), on a 1s '
          + 'cooldown. Mag Rail deals 22 a second across 38px either side, every 4s. Scrap Avalanche '
          + 'deals 35, then 45 and a 1.2s stun at the wall, and its rain hits for 16; 11s cooldown. Visor '
          + 'Cannon ticks for 7 in a wider 46px beam and its slag for 7; 8.5s cooldown. Self-Destruct '
          + 'sets off 30 blasts of 25 (90px).',
        effects: [
          { tag: 'damage', label: 'Smash', detail: '30 in 120px, 5 chunks of 14. 1s cooldown.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Mag Rail', detail: '22 per second, 38px either side. 4s cooldown.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'Avalanche', detail: '35, then 45 + 1.2s stun at the wall; rain 16. 11s cooldown.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Visor Cannon', detail: '7 every 0.2s in 46px; slag 7 every 0.5s. 8.5s cooldown.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Self-Destruct', detail: '30 blasts of 25 in 90px.', requiresUpgrade: 'q' },
        ],
      },
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
