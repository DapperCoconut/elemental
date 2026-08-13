import { ElementCodex } from '../AbilityCodex';

/**
 * Plasma — an element that does not care whose side it is on.
 *
 * Verified against `src/elements/plasma.ts`, `kits/PlasmaKit.ts`, the plasma block of
 * `data/Upgrades.ts`, the Solar perk in `data/Perks.ts` and Plasma Mastery in
 * `data/Mastery.ts`. Numbers here are the ones the kit actually applies.
 */
const plasma: ElementCodex = {
  identity:
    'Raw current with no manners. Four of its five abilities can kill the person who cast them — '
    + 'the arena explodes under whoever is standing in it, the blades bounce back through you, the '
    + 'ultimate turns on you if there is nobody else to chase, and a missed click bites you for two. '
    + 'What it buys with that is coverage nothing else has: an element that fills the room with '
    + 'things that are dangerous to be near.',

  passives: [
    {
      emoji: '💥',
      name: 'It Hits You Too',
      basics:
        'Almost nothing in this kit distinguishes between the two fighters. Standing in your own '
        + 'Unstable Arena for 3 consecutive seconds detonates it on you for the same 80 damage. Chaos '
        + 'Blades deal you 8 on contact and apply Chaos to you as readily as to them, with a 2-second '
        + 'grace period from your own and no more. The Plasma Current\'s 70px collapse blast deals its 10 '
        + 'to you if you are standing in it. Chaos orbs deal 10 to whoever touches them, including the '
        + 'fighter carrying the Chaos that made them. And each of the three Plasma Burst blasts that '
        + 'catches nobody snaps a red bolt back for 2 self-damage — up to 6 for a fully missed cast.',
      effects: [
        { tag: 'cost', label: 'Unstable Arena', detail: 'Standing in your own zone for 3 consecutive seconds detonates it on you for the same 80 damage it deals them.' },
        { tag: 'cost', label: 'Chaos Blades', detail: '8 damage to you on contact, and they apply Chaos to you as readily as to them. You get a 2-second grace period from your own blades, and no more.' },
        { tag: 'cost', label: 'Plasma Current', detail: 'The 70px collapse blast deals its 10 to you if you are standing in it.' },
        { tag: 'cost', label: 'Chaos orbs', detail: '10 damage to whoever touches one, including the fighter who is carrying the Chaos that made it.' },
        { tag: 'cost', label: 'A missed click', detail: 'Each of the three Plasma Burst blasts that catches nobody snaps a red bolt back for 2 self-damage — up to 6 for a fully missed cast.' },
      ],
      notes: [
        'The Order divine perk removes this entirely: nothing you do can damage you by any route, at the price of taking 25% more from everything outside.',
      ],
    },
    {
      emoji: '🌀',
      name: 'Chaos',
      basics:
        'A 15-second mark, refreshed rather than stacked. Every 5 seconds the carrier releases 5 orbs '
        + 'at their own position — 3 releases and 15 orbs over a full duration — each dealing 10 damage '
        + 'to the first fighter within 20px. They drift at 80–140 px/s, slow to a crawl on friction and '
        + 'bounce off the walls, and they belong to nobody once loose: the carrier walking back into '
        + 'their own takes the full 10.',
      effects: [
        { tag: 'debuff', label: 'Duration', detail: '15 seconds, refreshed rather than stacked by a second application.' },
        { tag: 'summon', label: 'Releases', detail: '5 orbs at the carrier\'s position every 5 seconds — 3 releases, 15 orbs, over a full duration.' },
        { tag: 'damage', label: 'The orbs', detail: '10 damage to the first fighter to come within 20px of one. They drift at 80–140 px/s, slow to a crawl on friction, and bounce off the arena walls.' },
        { tag: 'utility', label: 'Anybody can pop one', detail: 'An orb belongs to nobody once it is loose. The carrier walking back into their own is a full 10.' },
      ],
    },
  ],

  abilities: {
    'plasma-burst': {
      basics:
        'Three blasts at the point you clicked, 200ms apart, 4 damage each in a 42px radius — 12 if all '
        + 'three land on somebody who stands still. Any blast that catches nobody snaps a red bolt back '
        + 'for 2 self-damage, so a complete miss costs you 6. 0.6s cooldown, and the only ability here '
        + 'you can use continuously.',
      cast: 'Click, at the cursor. Instant; the three blasts land 0.2s apart at the point you clicked.',
      effects: [
        { tag: 'damage', label: 'Three blasts', detail: '4 damage each in a 42px radius, 200ms apart — 12 if all three land on somebody who stands still.' },
        { tag: 'cost', label: 'Punished for missing', detail: 'Any blast that catches nobody deals 2 self-damage and snaps a red bolt back to you. A complete miss costs 6.' },
        { tag: 'utility', label: 'Availability', detail: '0.6s cooldown. It is the only ability here you can use continuously.' },
      ],
      upgrade: {
        basics:
          'Each blast now flood-fills outward from every enemy it hit to any other enemy within 160px, '
          + 'hitting each once for the same 4, with no hop limit — a connected line is caught end to end, '
          + 'three times over. Against a single opponent it does nothing at all: this is a horde and '
          + 'invasion upgrade.',
        effects: [
          { tag: 'damage', label: 'Arcing', detail: 'Each blast flood-fills outward from every enemy it hit to any other enemy within 160px, hitting each of them once for the same 4.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'No cap', detail: 'The chain has no hop limit — a connected line of enemies is hit end to end, three times over.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Duels are unchanged', detail: 'Against a single opponent this upgrade does nothing at all. It is a horde and invasion upgrade.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The self-damage is charged per blast, not per cast, so nicking somebody with the first one still saves you two thirds of the cost.',
        'With the R+ Volt Points upgrade every blast landing near a volt also fires a relay.',
      ],
    },

    'plasma-arena': {
      basics:
        'Places an 80px zone that lasts 30 seconds, with a visible sweep showing how much of the '
        + '3-second dwell has been served. Anybody who stands inside for 3 consecutive seconds sets off '
        + '80 damage in a 100px radius. The timer runs separately for both fighters, so yours triggers '
        + 'the same explosion on you, and stepping out zeroes that fighter\'s accumulator — three separate '
        + 'seconds are worth nothing. 10s cooldown, 300ms shake on detonation.',
      cast: 'E, placed at the cursor. Instant. The zone lasts 30 seconds if nobody triggers it.',
      effects: [
        { tag: 'area', label: 'The zone', detail: '80px radius, 30s lifetime, with a visible sweep showing how much of the 3-second dwell has been served.' },
        { tag: 'damage', label: 'Detonation', detail: '80 damage in a 100px radius — the zone radius plus 20 — when anybody has stood inside for 3 consecutive seconds.' },
        { tag: 'cost', label: 'It counts you', detail: 'The dwell timer runs separately for both fighters. Yours triggers the same explosion on you.' },
        { tag: 'utility', label: 'Resets on leaving', detail: 'Stepping out zeroes that fighter\'s accumulator. Three separate seconds spread out are worth nothing.' },
        { tag: 'utility', label: 'Availability', detail: '10s cooldown, and a 300ms camera shake on detonation.' },
      ],
      upgrade: {
        basics:
          'Zones grow to 96px with the blast rising to 116px, and they never expire on their own — only '
          + 'somebody standing in one for 3 seconds removes it. You may have 2 at a time, and placing a '
          + 'third silently deletes the oldest.',
        effects: [
          { tag: 'area', label: 'Bigger', detail: '96px radius instead of 80, and the blast grows to 116px with it.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Permanent', detail: 'They never expire on their own. Only somebody standing in one for 3 seconds removes it.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Two at a time', detail: 'A maximum of 2 of your zones can exist; placing a third silently deletes the oldest.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Catching an enemy in the explosion is the mastery\'s Ground Gives Way requirement — 10 of them.',
        'Because the zone counts both fighters independently, placing one on top of somebody who is already cornered is often better than placing it where you want to stand.',
      ],
    },

    'plasma-current': {
      basics:
        'Hold R to widen a pair of beads from 40px apart at a tap to 120px at a full 1.5 seconds, then '
        + 'release to launch them along your aim at 320 px/s for 5 seconds. Anything within 18px of the '
        + 'line between them takes 2 damage every 0.1s — 20 a second. Touching either bead within 20px '
        + 'deals 10 and collapses the whole current, which detonates for 10 more in a 70px radius at the '
        + 'midpoint, on you as well if you are standing there. 8s cooldown, spent on release.',
      cast: 'Hold R to widen the gap, release to launch. The pair flies along the aim.',
      effects: [
        { tag: 'utility', label: 'The pair', detail: 'Two beads at 320 px/s, living 5 seconds. They start 40px apart at a tap, widening to 120px at a full 1.5s hold.' },
        { tag: 'dot', label: 'The chain', detail: '2 damage every 0.1s — 20 a second — to anything within 18px of the line between the beads.' },
        { tag: 'damage', label: 'Hitting a bead', detail: 'Touching either bead (within 20px) deals 10 damage and collapses the whole current.' },
        { tag: 'damage', label: 'Chain collapse', detail: 'The collapse detonates for 10 damage in a 70px radius at the midpoint — on you as well, if you are standing there.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown, spent on release.' },
      ],
      upgrade: {
        basics:
          'Holding R past 2.5 seconds plants two sockets 96px either side of you instead — anything '
          + 'shorter still fires an ordinary current. They last 10 seconds and carry 3 relay charges each, '
          + 'shown as pips: any plasma damage within 60px of a volt fires a bolt to its partner, and '
          + 'anything within 100px of that partner takes 8. Both ends spend a charge per relay, so the pair '
          + 'is worth exactly 3 relays before it burns out.',
        effects: [
          { tag: 'cost', label: 'The hold', detail: 'Hold R past 2.5s. Anything shorter still fires an ordinary current at the usual width.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Two sockets', detail: 'Planted 96px either side of you, lasting 10 seconds, with 3 relay charges each shown as pips.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'The relay', detail: 'Any plasma damage within 60px of a volt fires a bolt to its partner; anything within 100px of that partner takes 8. Both volts spend a charge per relay.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Three relays', detail: 'Because both ends spend a charge each time, the pair is worth exactly 3 relays before it burns out.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Relays are the mastery\'s Relay Race requirement — 100 of them — and only exist with this upgrade.',
        'Every damage source in the kit can trigger a relay: bursts, blades, seekers, all of it.',
        'With the Solar quad perk R can be recast to freeze a live current in place. Frozen currents last 20 seconds and then explode at both ends for 15 in 60px, and two overlapping frozen beams drop a plasma puddle at the crossing every 0.5s that ticks 2 damage per 0.1s for a second.',
      ],
    },

    'plasma-chaos-blades': {
      basics:
        'Throws 3 blades in a fixed even fan from your position at 380 px/s, bouncing off the walls for '
        + '8 seconds and dealing 8 damage within 20px. Every hit applies 15 seconds of Chaos — five loose '
        + '10-damage orbs released every 5 seconds. Your own blades cut you for the same 8 and the same '
        + 'Chaos, and you are immune only for the first 2 seconds. A blade that lands is nudged off '
        + 'course by up to ±30 in each axis, so a bouncing swarm never repeats a pattern. 12s cooldown '
        + 'against an 8s life, so there is always a gap.',
      cast: 'F. Instant, no aim — the blades leave in a fixed even fan from your position.',
      effects: [
        { tag: 'damage', label: 'The blades', detail: '3 blades at 380 px/s, 8 damage on contact within 20px, bouncing off the arena walls for 8 seconds.' },
        { tag: 'debuff', label: 'Chaos on hit', detail: 'Every hit applies 15 seconds of Chaos — 5 loose 10-damage orbs released every 5 seconds.' },
        { tag: 'cost', label: 'Yours cut you', detail: 'You take the same 8 and the same Chaos from your own blades. You are immune to them only for the first 2 seconds.' },
        { tag: 'utility', label: 'Scattered on impact', detail: 'A blade that lands is nudged off course by up to ±30 in each axis, so a bouncing swarm never repeats a pattern.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown against an 8s lifetime, so there is always a gap.' },
      ],
      upgrade: {
        basics:
          'Six blades instead of three, still evenly spaced and still 8 damage each, at 475 px/s instead '
          + 'of 380 so they cover more of the arena in the same 8 seconds. The self-hit rule is unchanged, '
          + 'which means twice as much of the room is dangerous to you as well.',
        effects: [
          { tag: 'damage', label: 'Six blades', detail: '6 instead of 3, still evenly spaced, still 8 damage each.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Faster', detail: '475 px/s instead of 380 — 25% quicker, so they cover more of the arena in the same 8 seconds.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Twice the risk', detail: 'The self-hit rule is unchanged, so six blades is twice as much of the room that is dangerous to you as well.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Killing with a blade is the mastery\'s Cut to Ribbons requirement — 3 kills.',
        'A blade that connects also fires a Volt Point relay if you have that upgrade, which is the cheapest way to burn relay charges.',
      ],
    },

    'plasma-pure-chaos': {
      basics:
        'Twenty seconds of a seeker shell, refreshed rather than stacked, strobing for its last 4 '
        + 'seconds as a warning. Five orbs fire on the cast and every 5 seconds after — 5 volleys, 25 '
        + 'orbs — each living 6 seconds, thrown outward at 210 px/s first so they arc back in rather than '
        + 'hugging you. They home on the nearest enemy within 280px at the moment the volley fired for 8 '
        + 'damage each, 40 a volley if all five land. A volley fired with nobody inside 280px targets you '
        + 'instead, for 5 self-damage each — up to 25. 30s cooldown against a 20s duration.',
      cast: 'Q. Instant. The first volley fires on the cast, not five seconds later.',
      effects: [
        { tag: 'buff', label: 'The shell', detail: '20 seconds, refreshed rather than stacked by a recast. It strobes in its last 4 seconds as a warning.' },
        { tag: 'damage', label: 'Volleys', detail: '5 seeker orbs immediately and every 5 seconds after — 5 volleys, 25 orbs, over the full duration.' },
        { tag: 'damage', label: 'When they find somebody', detail: '8 damage each, homing on the nearest enemy within 280px at the moment the volley fired. 40 damage a volley if all five land.' },
        { tag: 'cost', label: 'When they do not', detail: 'A volley fired with nobody inside 280px targets *you* instead, for 5 self-damage each — up to 25 a volley.' },
        { tag: 'utility', label: 'Seeker lifetime', detail: 'Each orb lives 6 seconds, thrown outward at 210 px/s first so it arcs back in rather than hugging you.' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown against a 20s duration.' },
      ],
      upgrade: {
        basics:
          'When the shell expires it leaves a player-sized orb drifting in a random direction at 55 px/s '
          + 'that never expires. It strikes anybody within 110px for 5 damage on a per-fighter cooldown, '
          + 'you included, and touching it deals 25 and destroys it in a blast about three and a half times '
          + 'its own radius. It is pushed clear of you on spawn and stays inert for 1.5 seconds so it '
          + 'cannot pop on the caster the frame it appears.',
        effects: [
          { tag: 'summon', label: 'The orb', detail: 'One player-sized orb spawned on expiry, drifting in a random direction at 55 px/s. It never expires.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Proximity strike', detail: '5 damage to anybody within 110px, on a per-fighter cooldown. It applies to you as self-damage.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Detonation', detail: 'Touching it deals 25 and destroys it, with a blast about three and a half times its own radius.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'A moment to clear', detail: 'It is pushed clear of you on spawn and stays inert for 1.5 seconds, so it cannot pop on the caster the frame it appears.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Killing while the shell is still up is the mastery\'s Eye of the Storm requirement — 5 kills.',
        'The hostile-volley check happens once, when the volley fires. Orbs already in the air do not change their mind if somebody walks into range.',
      ],
    },
  },

  perks: {
    solar: {
      basics:
        'R cast while one of your currents is alive and moving stops that current instead of launching '
        + 'a new one, freezing it in place with a fresh 20-second lifetime. It keeps its 2-per-0.1s chain '
        + 'damage for all of it, so a frozen wire across a doorway is a genuine wall, and when the 20 '
        + 'seconds run out it explodes at both beads for 15 damage in a 60px radius each. Where two of '
        + 'your beams overlap, a plasma puddle spawns near the intersection every 0.5s, each lasting a '
        + 'second and ticking 2 damage every 0.1s.',
      cast: 'R while one of your currents is alive and moving. It stops that current instead of launching a new one.',
      effects: [
        { tag: 'utility', label: 'Stop it', detail: 'Every live, unstopped current of yours is frozen in place and given a fresh 20-second lifetime.' },
        { tag: 'damage', label: 'Endpoint blasts', detail: 'A frozen current explodes at *both* beads when its 20 seconds run out — 15 damage in a 60px radius each.' },
        { tag: 'dot', label: 'Crossed beams', detail: 'Where two of your beams overlap, a plasma puddle spawns near the intersection every 0.5s. Each lasts 1 second and ticks 2 damage every 0.1s.' },
        { tag: 'utility', label: 'Still a chain', detail: 'A stopped current keeps its 2-per-0.1s chain damage for the whole 20 seconds, so a frozen wire across a doorway is a genuine wall.' },
      ],
      notes: [
        'The perk\'s ingredients are acid, fate, sound and light.',
        'Recasting R while a current is live cannot launch a new one — the stop takes priority and returns early.',
      ],
    },
  },

  mastery: {
    'chaos-storm': {
      basics:
        'The playable square shrinks continuously over 120 seconds, from the full arena down to a 160px '
        + 'square at the centre, and anybody standing on or outside the live edge takes 5 damage a second '
        + 'until they get back inside. It herds the mastery\'s owner exactly as it herds the enemy — there '
        + 'is no safe side. No key, no cooldown, no cost; it starts at the opening bell.',
      effects: [
        { tag: 'area', label: 'The close', detail: 'The playable square shrinks continuously over 120 seconds, from the full arena down to a 160px square at the centre.' },
        { tag: 'dot', label: 'The edge', detail: '5 damage once a second to anybody standing on or outside the live edge, until they get back inside.' },
        { tag: 'cost', label: 'It herds you too', detail: 'The wall applies to the mastery\'s owner exactly as it applies to the enemy. There is no safe side.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost. It starts at the opening bell.' },
      ],
      notes: [
        'This is the passive half of Plasma Mastery — it needs no bind and no key.',
        'Because everything the element does is area denial, a shrinking arena is a straightforward multiplier on the whole kit.',
      ],
    },
    'unstable-orbital': {
      basics:
        'A bindable ring summoned at 190px orbiting you at 2.5 rad/s — and that opening radius is also '
        + 'the furthest out it can ever be pushed back. It creeps 9px closer every second, and reaching '
        + '26px detonates on you for 50 self-damage. Every point of damage you deal shoves it 1.6px '
        + 'outward, so holding it still costs about 31 damage a second. It sweeps any enemy within 24px '
        + 'for 20 damage on a 1.2s per-target cooldown. 20s cooldown, counted from the summon rather than '
        + 'the detonation.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Summoned onto '
        + 'its ring instantly.',
      effects: [
        { tag: 'summon', label: 'The ring', detail: 'Starts at 190px and orbits at 2.5 rad/s. That opening radius is also the furthest out it can ever be pushed back.' },
        { tag: 'cost', label: 'Closing in', detail: 'It creeps 9px closer every second. Reaching 26px from you detonates it on you for 50 self-damage.' },
        { tag: 'buff', label: 'Pushing it back', detail: 'Every point of damage you deal shoves it 1.6px outward — about 31 damage a second just to hold it still.' },
        { tag: 'damage', label: 'What it sweeps', detail: '20 damage to any enemy within 24px of it, on a 1.2s per-target cooldown.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown, counted from the summon rather than from the detonation.' },
      ],
      notes: [
        'From 190px to 26px at 9px a second is about 18 seconds of grace if you deal no damage at all.',
        'Because it is on a tilted, precessing ring, the orbital sweeps a wide band of floor rather than a fixed circle — it will find an enemy standing anywhere near you.',
      ],
    },
  },
};

export default plasma;
