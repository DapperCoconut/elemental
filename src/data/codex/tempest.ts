import { ElementCodex } from '../AbilityCodex';

/**
 * Tempest — a storm with a second axis.
 *
 * Verified against `src/elements/tempest.ts` and `kits/TempestKit.ts`. Tempest has no shop
 * upgrades, perks or mastery enhancements yet; every figure below is a constant at the top of the
 * kit. Every key has a floor form and an airborne form, and both are documented on the one entry.
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
        'The rig is drawn up to 0.55px higher per px of height, and is clamped so it never leaves the top of the screen; the shadow and the chevron ladder under it show the real gap.',
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
    },
  },
};

export default tempest;
