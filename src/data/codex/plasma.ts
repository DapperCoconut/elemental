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
      magic:
        'Nothing plasma puts into the world is loyal. The unstable arena counts your seconds as '
        + 'happily as theirs, the chaos blades check both fighters on every frame, the current '
        + 'collapses on whoever is inside the blast, and the chaos orbs pop for anybody who walks '
        + 'into one. There is no friend-or-foe check anywhere in the kit.',
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
      magic:
        'The status a plasma blade leaves in you. For fifteen seconds you are unstable — every five '
        + 'seconds a handful of loose orbs boil out of your body and drift off across the floor, and '
        + 'those orbs do not know they came from you.',
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
      magic:
        'A chain of lightning thrown from the hand to wherever the cursor is, and then the ground '
        + 'there goes off three times in half a second — a rosette of forks and a jagged ring for '
        + 'each. It is the cheapest thing in the kit and the only one with a genuine punishment for '
        + 'missing: a blast that finds nobody sends a red bolt back down the line into you.',
      cast: 'Click, at the cursor. Instant; the three blasts land 0.2s apart at the point you clicked.',
      effects: [
        { tag: 'damage', label: 'Three blasts', detail: '4 damage each in a 42px radius, 200ms apart — 12 if all three land on somebody who stands still.' },
        { tag: 'cost', label: 'Punished for missing', detail: 'Any blast that catches nobody deals 2 self-damage and snaps a red bolt back to you. A complete miss costs 6.' },
        { tag: 'utility', label: 'Availability', detail: '0.6s cooldown. It is the only ability here you can use continuously.' },
      ],
      upgrade: {
        magic:
          'Chain Lightning makes the blast contagious. Anybody it catches becomes a new source, and '
          + 'the current keeps leaping outward until it runs out of bodies within reach — which is '
          + 'nothing at all in a duel and everything in a crowd.',
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
      magic:
        'A circle of floor wired up and left live. It sits there skittering with static, and a bright '
        + 'arm sweeps its rim as a countdown for anybody standing inside — three seconds of dwell and '
        + 'the ground goes. It is the largest single number in the element and it is completely '
        + 'indifferent to who set it.',
      cast: 'E, placed at the cursor. Instant. The zone lasts 30 seconds if nobody triggers it.',
      effects: [
        { tag: 'area', label: 'The zone', detail: '80px radius, 30s lifetime, with a visible sweep showing how much of the 3-second dwell has been served.' },
        { tag: 'damage', label: 'Detonation', detail: '80 damage in a 100px radius — the zone radius plus 20 — when anybody has stood inside for 3 consecutive seconds.' },
        { tag: 'cost', label: 'It counts you', detail: 'The dwell timer runs separately for both fighters. Yours triggers the same explosion on you.' },
        { tag: 'utility', label: 'Resets on leaving', detail: 'Stepping out zeroes that fighter\'s accumulator. Three separate seconds spread out are worth nothing.' },
        { tag: 'utility', label: 'Availability', detail: '10s cooldown, and a 300ms camera shake on detonation.' },
      ],
      upgrade: {
        magic:
          'Entrenched Arenas makes the wiring permanent. The circles are bigger and they never time '
          + 'out — they are simply part of the floor now, two pieces of the room that have to be '
          + 'walked around for the rest of the fight.',
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
      magic:
        'Two beads of plasma launched side by side with a live chain strung between them, travelling '
        + 'as a pair. Anything caught on the line is being cut through continuously. Hold the key '
        + 'longer before letting go and the two beads start further apart, so the choice is between '
        + 'a narrow wire that is easy to aim and a wide one that is hard to step over.',
      cast: 'Hold R to widen the gap, release to launch. The pair flies along the aim.',
      effects: [
        { tag: 'utility', label: 'The pair', detail: 'Two beads at 320 px/s, living 5 seconds. They start 40px apart at a tap, widening to 120px at a full 1.5s hold.' },
        { tag: 'dot', label: 'The chain', detail: '2 damage every 0.1s — 20 a second — to anything within 18px of the line between the beads.' },
        { tag: 'damage', label: 'Hitting a bead', detail: 'Touching either bead (within 20px) deals 10 damage and collapses the whole current.' },
        { tag: 'damage', label: 'Chain collapse', detail: 'The collapse detonates for 10 damage in a 70px radius at the midpoint — on you as well, if you are standing there.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown, spent on release.' },
      ],
      upgrade: {
        magic:
          'Volt Points is what a longer hold buys instead. Past two and a half seconds the beads stop '
          + 'being a moving wire and become two fixed sockets planted either side of you — and from '
          + 'then on any plasma damage that lands near one is relayed across to its partner and '
          + 'earthed into whoever is standing there.',
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
      magic:
        'Three slivers of plasma drawn out of the caster and thrown 120° apart. They ricochet off the '
        + 'walls for eight seconds and they do not stop being dangerous to the person who made them '
        + 'after the first couple of seconds. Everything they cut is left unstable, boiling off loose '
        + 'orbs for the next fifteen seconds.',
      cast: 'F. Instant, no aim — the blades leave in a fixed even fan from your position.',
      effects: [
        { tag: 'damage', label: 'The blades', detail: '3 blades at 380 px/s, 8 damage on contact within 20px, bouncing off the arena walls for 8 seconds.' },
        { tag: 'debuff', label: 'Chaos on hit', detail: 'Every hit applies 15 seconds of Chaos — 5 loose 10-damage orbs released every 5 seconds.' },
        { tag: 'cost', label: 'Yours cut you', detail: 'You take the same 8 and the same Chaos from your own blades. You are immune to them only for the first 2 seconds.' },
        { tag: 'utility', label: 'Scattered on impact', detail: 'A blade that lands is nudged off course by up to ±30 in each axis, so a bouncing swarm never repeats a pattern.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown against an 8s lifetime, so there is always a gap.' },
      ],
      upgrade: {
        magic:
          'Blade Storm doubles the fan and speeds it up. Six slivers cutting the room at a quarter '
          + 'again the speed is genuinely difficult to be in the same arena as — for either fighter.',
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
      magic:
        'Twenty seconds inside a cage of raw lightning. Every five seconds the shell spits out five '
        + 'seekers with comet tails, and they hunt — but only if there is somebody to hunt. If '
        + 'nobody is within a couple of body-lengths when the volley goes off, the orbs turn round '
        + 'and come for the person who made them.',
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
        magic:
          'Permanent Chaos means it never really ends. When the shell finally drops, a slow orb the '
          + 'size of a fighter peels off and drifts away, and that orb is simply part of the arena '
          + 'now. It reaches out at anybody who comes near it and it goes off like a grenade for '
          + 'anybody who touches it. It has no expiry and it does not care who you are.',
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
      magic:
        'The current can be told to stop. A recast freezes a live pair where it is — and a frozen '
        + 'wire is a wall, not a shot. Leave two of them crossed and the intersection starts '
        + 'spitting plasma onto the floor.',
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
      magic:
        'The arena itself becomes unstable. From the first second the walls start creeping inward, '
        + 'and two minutes later all that is left is a small square in the middle of the room. The '
        + 'live edge crackles, and it does not care whose mastery it is — both fighters are being '
        + 'herded into the same shrinking box.',
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
      magic:
        'A nucleus of plasma swinging around you the way an electron swings around an atom, on a '
        + 'tilted ring that precesses as it goes. It creeps inward the entire time. The only thing '
        + 'that pushes it back out is damage you are dealing to somebody else — so the ability is a '
        + 'timer that resets only while you are winning.',
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
