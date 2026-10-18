import { ElementCodex } from '../AbilityCodex';

/**
 * Tempest — a storm with a second axis.
 *
 * Verified against `src/elements/tempest.ts` and `kits/TempestKit.ts`. Tempest has its five shop
 * upgrades (2026-10-18) and its mastery (2026-10-18, the kit's "Mastery" block) but no perks yet;
 * every figure below is a constant at the top of the kit. Every key has a floor form and an airborne form, and both are documented
 * on the one entry.
 */
const tempest: ElementCodex = {
  identity:
    'Tempest is a knockback brawler that can leave the floor. On the ground every key is wind: a '
    + 'two-charge burst that recharges by moving rather than on a clock, a roll that kicks and '
    + 'refills it, conveyor fronts, and a passive that makes every wall in the arena a weapon. '
    + 'Ride one of the three drifting currents, or grapple someone into the sky with the ultimate, '
    + 'and the same five keys become a flight kit — and from then on height is the resource, because '
    + 'every landing, slam and crash pays out by how far it came down.',

  passives: [
    {
      emoji: '🧱',
      name: 'Wall Slam',
      basics:
        'Any enemy your knockback drives into an arena wall takes 12 damage, once a second per body. '
        + 'Only your own shoves count — Gale Burst, Kick Blast, a front slam, a landing or the Storm '
        + 'Currents — so the walls are an extension of your kit and nobody else\'s. A body that cannot '
        + 'be moved (Unbreakable, Unstoppable) never reaches a wall and never takes it.',
      effects: [
        { tag: 'damage', label: 'The slam', detail: '12 damage the moment a body under one of your shoves touches a wall.' },
        { tag: 'cost', label: 'The clock', detail: 'Once a second per victim. Two walls inside a second is one slam.' },
        { tag: 'utility', label: 'What counts', detail: 'Only knockback this kit dealt: Gale Burst (620 px/s for 0.38s), Kick Blast (760 px/s for 0.42s), a landing (420 px/s for 0.32s), a front slam (520 px/s for 0.36s) and the Storm Currents.' },
      ],
      notes: [
        'A Gale Burst aimed a little short of a target standing by a wall is 10 + 12. The bot knows this and aims for it.',
        'The Storm Currents after a dive bounce a body off three walls, which is three Wall Slams on top of the landing.',
      ],
    },
    {
      emoji: '🪁',
      name: 'Flight',
      basics:
        'Off the floor you are airborne: melee swings and floor hazards (puddles, zones, traps) cannot '
        + 'reach you, while shots and area blasts still can. You steer with WASD at half speed. Gravity is '
        + '520 px/s² and a free fall tops out at 900 px/s; a launch from a current (640 px/s up) peaks around '
        + '390px and lasts about 2.4 seconds unless you buy more. Landing is a shockwave: 6 to 40 damage in a '
        + '70 to 140px radius, scaled by your speed at impact against a dive\'s 1500 px/s, with a 420 px/s '
        + 'shove — so a hop lands for about 20 and a dive for 40. The arrow beside you reddens with your '
        + 'fall speed and its ticks fill with your height.',
      effects: [
        { tag: 'shield', label: 'Untouchable from below', detail: 'Melee swings and floor hazards miss an airborne body. Shots and area blasts still land.' },
        { tag: 'movement', label: 'The drift', detail: 'WASD at 50% speed while airborne.' },
        { tag: 'utility', label: 'Gravity', detail: '520 px/s², free fall capped at 900 px/s. A 640 px/s launch peaks near 390px and lands about 2.4s later.' },
        { tag: 'damage', label: 'The landing', detail: '6 + 34 × (impact speed ÷ 1500) damage to everyone within 70 + 70 × the same fraction px. A free fall is about 20 in 100px; a dive is 40 in 140px.' },
        { tag: 'control', label: 'The landing shove', detail: '420 px/s outward for 0.32s — a Wall Slam if there is a wall behind them.' },
        { tag: 'utility', label: 'Your keys change', detail: 'Click lifts you when it catches you, E is a hop, R drops you onto a front, Q is a dive. F does nothing in the air.' },
      ],
      notes: [
        'The rig is drawn 0.55px higher per px of height. There is no ceiling: climb far enough and you fly off the top of the screen, where a pin on the edge (with your gauge) shows where you are. The shadow and the chevron ladder under you show the real gap.',
        'Your hitbox and health bar stay on the floor where your shadow is. Being airborne changes what may hit you, not where you are.',
      ],
    },
  ],

  abilities: {
    'tempest-gale': {
      basics:
        'Throw a burst of wind at 780 px/s that detonates when it reaches your cursor, meets a body or '
        + 'hits a wall: 10 damage to everyone within 72px and a 620 px/s shove away from the blast for '
        + '0.38 seconds. There is no cooldown — it holds 2 charges and you earn one back for every 240px you '
        + 'move; Kick Blast refills both. Airborne, a burst whose blast catches you adds 380 px/s of lift, '
        + 'or 620 px/s if it went off within 48px of a wall or while you were falling under 80px of height.',
      cast: 'Click, one burst per press, aimed at the cursor. 150ms between presses; the real limit is the two charges.',
      effects: [
        { tag: 'damage', label: 'The blast', detail: '10 damage to everyone within 72px of where it goes off.' },
        { tag: 'control', label: 'The shove', detail: '620 px/s away from the blast centre for 0.38s. Into a wall, that is a Wall Slam.' },
        { tag: 'resource', label: 'Charges', detail: '2 held. One back per 240px moved, in the air or on the floor; Kick Blast refills both. A press with none left is refused.' },
        { tag: 'utility', label: 'The shot', detail: '780 px/s toward the cursor. Goes off at the cursor, on the first body within 26px, or at the wall it hits.' },
        { tag: 'movement', label: 'Airborne — lift', detail: 'A blast whose 72px radius catches you adds 380 px/s of upward speed.', },
        { tag: 'movement', label: 'Airborne — the big lift', detail: '620 px/s instead if the blast is within 48px of a wall, or you are falling and under 80px of height.' },
      ],
      notes: [
        'Click on yourself and it goes off at once — on the floor that is just a blast around you, in the air it is the lift.',
        'The faint ring at your cursor while the shot flies is where it will go off.',
        'It is a registered projectile: anything that steals or intercepts shots can take it.',
      ],
      upgrade: {
        basics:
          'Hailstorm: the burst is thrown as a hailstone. It deals 13 instead of 10, and wherever it goes off '
          + 'it shatters into 6 splinters of ice shrapnel that fly 170px outward at 520 px/s, each dealing 4 '
          + 'to the first enemy it meets. Everything else — the shove, the lift, the charges — is unchanged.',
        effects: [
          { tag: 'damage', label: 'The stone', detail: '13 damage in the 72px blast instead of 10.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Shrapnel', detail: '6 splinters fanned all the way round, 520 px/s, 170px range. 4 damage each to the first enemy they touch (18px).', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Point blank', detail: 'A body at the centre of the blast takes the stone and most of the shrapnel: up to 13 + 24.', requiresUpgrade: 'click' },
        ],
      },
    },

    'tempest-kick': {
      basics:
        'Roll 440px along your aim over 0.32 seconds with a 50% dodge chance for the roll and the full '
        + 'second after it. Anyone within 50px of you during the roll takes 15 damage once and is kicked '
        + 'along the roll at 760 px/s for 0.42 seconds. Casting it refills Gale Burst to 2 charges. '
        + 'Airborne, there is no roll: it adds 520 px/s of upward speed, and still refills the click.',
      cast: 'E, aimed at the cursor. 5s cooldown.',
      effects: [
        { tag: 'movement', label: 'The roll', detail: '440px in 0.32s along the aim.' },
        { tag: 'shield', label: 'The dodge', detail: '50% chance to dodge every hit for the roll and 1s after it. Topped back up to 50% after each dodge that fires.' },
        { tag: 'damage', label: 'The kick', detail: '15 damage to everyone within 50px during the roll, once each.' },
        { tag: 'control', label: 'The kick\'s shove', detail: '760 px/s along the roll for 0.42s — the longest shove in the kit, and the one most likely to find a wall.' },
        { tag: 'resource', label: 'Reload', detail: 'Gale Burst goes back to 2 charges.' },
        { tag: 'movement', label: 'Airborne — the hop', detail: '+520 px/s of upward speed instead of a roll.' },
      ],
      notes: [
        'Roll through someone who is between you and a wall and the kick is 15 + 12.',
        'The hop plus a well-timed self-burst is how you stay up long enough for a front slam.',
      ],
      upgrade: {
        basics:
          'Shocking Acceleration: the roll leaves a trail of static electricity along its whole path for 5 '
          + 'seconds. Anyone standing on it (within 22px) takes 5 every half second. Airborne, the hop instead '
          + 'leaves a thundercloud where you were for 5 seconds; once a second it strikes everyone within 150px '
          + 'of it for 8.',
        effects: [
          { tag: 'area', label: 'Static trail', detail: 'Along the roll, 44px wide, for 5s. A floor hazard: airborne bodies are safe.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'The static', detail: '5 damage every 0.5s to each enemy standing on it.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Airborne — thundercloud', detail: 'Left over the floor where you hopped, for 5s.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Airborne — strikes', detail: '8 damage to everyone within 150px of the cloud, every second — up to 5 strikes.', requiresUpgrade: 'e' },
        ],
      },
    },

    'tempest-front': {
      basics:
        'Lay a wind front: a 360px long, 116px wide lane from your feet along your aim that carries '
        + 'every grounded body standing in it — you included — at 300 px/s in its direction. Two at a '
        + 'time; placing a third fades the oldest over 0.35 seconds, and nothing else removes one. '
        + 'Airborne, the key is Front Slam instead: you are thrown onto the centre of your nearest front over '
        + '0.42 seconds, everything inside its rectangle takes 20 damage plus 0.12 per px of the height you '
        + 'left (up to 60 extra) and is shoved along the front at 520 px/s, the front is destroyed, and you '
        + 'bounce back up to 1.3× the height you started from plus 120px.',
      cast: 'R, aimed at the cursor. 1.8s cooldown. Airborne it needs a live front of yours and is refused without one.',
      effects: [
        { tag: 'area', label: 'The lane', detail: '360 × 116px, its near edge at your feet, pointing along the aim.' },
        { tag: 'control', label: 'The conveyor', detail: '+300 px/s along the lane for every grounded body in it, yours too. Bodies being shoved, grappled or bounced are not carried.' },
        { tag: 'summon', label: 'The cap', detail: '2 fronts. A third fades the oldest over 0.35s. They never time out.' },
        { tag: 'damage', label: 'Airborne — the slam', detail: '20 + 0.12 × height-left-at damage, up to +60, to everyone inside the front\'s rectangle.' },
        { tag: 'control', label: 'Airborne — the slam\'s shove', detail: '520 px/s along the front for 0.36s.' },
        { tag: 'movement', label: 'Airborne — the flight', detail: '0.42s to the front\'s centre, then up again to 1.3× your starting height + 120px. Gale Burst refills to 2 on the bounce.' },
        { tag: 'cost', label: 'Airborne — the front is spent', detail: 'The front you slammed is destroyed.' },
      ],
      notes: [
        'A front pointed at a wall is a conveyor into a Wall Slam.',
        'Two fronts is two slams: each one you drop onto sends you higher, and the second is worth more than the first.',
        'Fronts are floor — a summon purge does not raze them, and a raze does not stop them.',
      ],
      upgrade: {
        basics:
          'Float: while you are airborne over a live front, you do not lose height. Gravity keeps slowing a '
          + 'climb but never turns it into a fall, so you hang where you peaked for as long as you stay over the '
          + 'lane. A dive, a slam or a grapple crash still comes down as normal.',
        effects: [
          { tag: 'movement', label: 'Hover', detail: 'Over any live front, airborne: downward speed is held at 0. Bursts, hops and bounces still lift you.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Exceptions', detail: 'Diving (Q), slamming (R) or crashing out of the grapple ignores it.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The tell', detail: 'A cushion of wind under you and a Float status. Hovering over one front is how you bank height for a slam onto the other.', requiresUpgrade: 'r' },
        ],
      },
    },

    'tempest-updraft': {
      basics:
        'Three currents drift around the arena at all times while a Tempest is in the match, each '
        + 'living 9 seconds before reappearing somewhere else 0.9 seconds later, and a ridden one '
        + 'reappears the same way. Press F within 80px of one to be launched at 640 px/s, which peaks near '
        + '390px and lasts about 2.4 seconds if you do nothing. The current is consumed. F does nothing in '
        + 'the air and is refused without a current in reach.',
      cast: 'F, no aim. 1.2s cooldown. Refused in the air or with no current within 80px.',
      effects: [
        { tag: 'summon', label: 'The currents', detail: '3 on the field at all times, 90px or more from the walls and 150px from each other. Each lives 9s and respawns 0.9s after it dies or is ridden.' },
        { tag: 'movement', label: 'The launch', detail: '640 px/s upward from a current within 80px. Peak about 390px, about 2.4s in the air unless you buy more.' },
        { tag: 'cost', label: 'The current is spent', detail: 'Riding one consumes it.' },
        { tag: 'utility', label: 'Shared weather', detail: 'In a Tempest mirror both sides ride the same three currents.' },
      ],
      notes: [
        'The bot walks to a current on its own schedule — a Tempest opponent will go up roughly every 6–7 seconds.',
        'A current is also an escape: nothing melee can follow you up.',
      ],
      upgrade: {
        basics:
          'Cyclone: press F with no current in reach and you spin up a cyclone where you stand and ride it — '
          + 'an 880 px/s launch instead of a current\'s 640 — but Updraft then goes on double cooldown (2.4s). '
          + 'Near a current, F rides the current as normal.',
        effects: [
          { tag: 'movement', label: 'The cyclone', detail: '880 px/s upward from anywhere on the floor with no current within 80px.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Double cooldown', detail: 'A cyclone puts Updraft on 2× its cooldown.', requiresUpgrade: 'f' },
        ],
      },
    },

    'tempest-forecast': {
      basics:
        'Dash 420px along your aim over 0.3 seconds. The first enemy within 48px is grappled: you are '
        + 'launched at 700 px/s, they are held at arm\'s length and cannot move, and for 3 seconds you keep '
        + 'every ability — each self-burst and hop takes the pair higher. Then you both crash down at 1500 px/s '
        + 'and they take 20 damage plus 0.15 per px of the height you released from, up to 70 extra, on top of '
        + 'the landing shockwave. Airborne, Q is a dive instead: straight down at 1500 px/s for a full 40-damage '
        + 'landing, and every enemy within 150px of it is caught in Storm Currents — bounced between the walls '
        + 'at 540 px/s, taking a Wall Slam on each, until the third wall ends it. While the currents run, the '
        + 'Eye of the Storm opens on you.',
      cast: 'Q, aimed at the cursor. 22s cooldown. A missed dash keeps the cooldown.',
      effects: [
        { tag: 'movement', label: 'The dash', detail: '420px in 0.3s along the aim.' },
        { tag: 'control', label: 'The grapple', detail: 'The first enemy within 48px is held at 30px for 3s and cannot move. You are launched at 700 px/s and hang there — gravity is mostly suspended while you hold them.' },
        { tag: 'utility', label: 'Hands free', detail: 'Every ability works while holding. Self-bursts (+380/+620 px/s) and hops (+520 px/s) raise the release height, which is the damage.' },
        { tag: 'damage', label: 'The crash', detail: '20 + 0.15 × release height, up to +70, to the held body — plus the landing shockwave (6–40) they are standing in.' },
        { tag: 'movement', label: 'The crash speed', detail: 'Both bodies come down at 1500 px/s. Pressing Q again while holding crashes early.' },
        { tag: 'damage', label: 'Airborne — the dive', detail: 'Straight down at 1500 px/s: a full landing, 40 damage in 140px with a 420 px/s shove.' },
        { tag: 'control', label: 'Airborne — Storm Currents', detail: 'Every enemy within 150px of the dive is bounced between the walls at 540 px/s, unable to steer, until the third wall. Ends on its own after 7s regardless.' },
        { tag: 'damage', label: 'Airborne — the walls', detail: 'Each wall they hit is a Wall Slam: 12 damage, so a full run is 36 on top of the landing.' },
      ],
      notes: [
        'The Eye of the Storm is a tell, not a buff: a huge electric eye painted over your body for exactly as long as someone is bouncing.',
        'Bodies that cannot be moved (Unbreakable, Unstoppable) cannot be grappled and are not caught by the currents.',
        'The grappled body is drawn on the floor with a shadow ladder under it — its hitbox never leaves the ground, so it can still be shot while held.',
      ],
      upgrade: {
        basics:
          'Herald of Doom: the moment you dive (Q in the air) or start coming down from the grapple, you cut in '
          + 'on the broadcast — the Tempest at the weather map, a 5-day forecast of skulls and DEATH, and a ticker '
          + 'crawling underneath. When you land, the weather goes wild for 12 seconds: lightning strikes at random '
          + '(warned, 12 in 50px), hail falls from the top of the screen (5 a stone), gales make every gain of '
          + 'height 40% bigger, and the rain leaves puddles that slow anyone standing in them by 40%.',
        effects: [
          { tag: 'utility', label: 'The forecast', detail: 'A 2.6s broadcast over the top of the screen. It pauses nothing.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Lightning', detail: 'About every 0.7s, half of them near an enemy: 0.45s warning ring, then 12 to everyone within 50px.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Hail', detail: 'A stone from the top edge every 0.15s, a quarter dropped over an enemy: 5 to the first enemy it hits.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Gales', detail: 'Every gain of elevation — launches, bursts, hops, slam bounces — is 1.4× while the weather lasts. Anyone\'s, not just yours.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'Rain puddles', detail: 'One every 0.55s, 42px, lasting 5s: 40% slower while standing in one. Airborne bodies are safe.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Duration', detail: '12s from the landing. Another Herald landing restarts the clock.', requiresUpgrade: 'q' },
        ],
      },
    },
  },

  mastery: {
    'tempest-unrelenting-storm': {
      basics:
        'Your storm never lifts. For the whole match a very tame version of Herald of Doom\'s weather hangs '
        + 'over the arena: every 5.5 to 11.5 seconds a thunderbolt drops on a random spot (warned first, 12 '
        + 'damage to a foe under it), now and then a hailstone falls from the top of the screen (5 damage), '
        + 'and up to two rain puddles lie on the floor, slowing foes who wade through them. A light breeze '
        + 'pushes every enemy toward the right of the screen; it never pushes you. None of it adds elevation. '
        + 'A bank of cloud lines the top of the arena, and it turns black and starts to flicker with lightning '
        + 'while anyone\'s Herald weather is live.',
      cast: 'Passive. Always on while Tempest Mastery is enabled and Tempest is the element being played.',
      effects: [
        { tag: 'damage', label: 'Stray bolts', detail: 'One every 5.5–11.5s, on a random spot, never aimed. 12 to foes inside 50px of it, after a warning on the floor.' },
        { tag: 'damage', label: 'Spotty hail', detail: 'A roll every ~1.1s, and about half of them fall: 5 to a foe a stone lands on.' },
        { tag: 'control', label: 'Puddles', detail: 'At most two at a time, 6.5s each: foes inside are 40% slower.' },
        { tag: 'control', label: 'The breeze', detail: '42px a second toward the right of the screen, on every foe that is not already being thrown, shoved or held. You are never pushed.' },
        { tag: 'area', label: 'The cloud bank', detail: 'Hangs about 40px deep along the top edge all match; darkens, thickens and crackles during Herald of Doom.' },
      ],
      notes: [
        'It is not Herald of Doom: no gales, so launches stay their normal size.',
        'A foe standing still drifts right on their own. Keep the walls on that side in mind for Wall Slam.',
      ],
    },
    'tempest-gale-uppercut': {
      basics:
        'Dash 250px toward the cursor and drive an uppercut into the first enemy you meet. It deals only 8 '
        + 'damage, but it throws them into the air. While they are up they cannot move — they hang where they '
        + 'were hit, drawn higher the higher they go — and they come down under the same gravity a flier '
        + 'does, only with no top speed short of a dive. When they hit the floor they take 6 to 60 damage, '
        + 'by how fast they were falling. Burst a Gale Burst (Click) on them while they are up and they go '
        + '360 higher every time — a juggle is a bigger slam.',
      cast: 'Press the bound key (R, F or Q) to dash at the cursor. 9 second cooldown from the press.',
      effects: [
        { tag: 'movement', label: 'The dash', detail: '250px in 0.22s toward the cursor; stops on the first enemy within 46px.' },
        { tag: 'damage', label: 'Uppercut', detail: '8 damage on contact.' },
        { tag: 'control', label: 'Thrown', detail: 'Launched at 720 upward speed: about 1.4s up and the same down, unable to move. Melee and floor hazards cannot reach a body in the air.' },
        { tag: 'damage', label: 'The slam', detail: '6 + 54 × (landing speed ÷ 1500): about 31 from one uppercut, 45+ after a couple of juggles, 60 at most.' },
        { tag: 'buff', label: 'Juggle', detail: 'A Gale Burst that goes off within 80px of the thrown body adds 360 upward speed. Herald weather makes it 40% more.' },
      ],
      notes: [
        'Another Tempest is thrown on its own height sim: its own landing is the slam, and it is credited to you.',
        'Anything that cannot be moved (bosses, Unstoppable bodies) takes the 8 and stays on the floor.',
        'A Tempest NPC on Nightmare binds it over Summon Front, throws it at foes inside the dash, and spends its Click juggling them.',
      ],
    },
  },
};

export default tempest;
