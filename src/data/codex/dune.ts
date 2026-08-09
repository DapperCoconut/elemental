import { ElementCodex } from '../AbilityCodex';

/**
 * Sand — the parkour element. Its ability ids are `dune-*` because `sand` is already Time's
 * element id; it answers to "Sand" everywhere a player can read it.
 *
 * Verified against `src/elements/dune.ts` and `kits/SandKit.ts`. Sand has no shop upgrades, no
 * perks and no mastery enhancements; every figure below is a constant at the top of the kit.
 */
const dune: ElementCodex = {
  identity:
    'The only kit in the game whose damage lives in its feet. Sand replaces the Space dodge with a '
    + 'real vertical jump and then spends every other button on height: a short obstacle course for '
    + 'a buff, a long cruel one for a turret, a moving bridge between the things it has built, and '
    + 'a race up a pyramid with lava rising underneath. The flintlock is the payoff — a slow, '
    + 'deliberate, reloading hitscan whose bonuses add up, so a shot fired mid-jump off your own '
    + 'pillar hits half again as hard as one fired flat-footed. A Sand player who never leaves the '
    + 'floor is playing a worse element on purpose.',

  passives: [
    {
      emoji: '🦘',
      name: 'The Jump',
      magic:
        'Space is not a dodge. It is a real vertical jump into a real height simulation that runs '
        + 'entirely alongside the arena — your position on the floor never changes because of it, '
        + 'which is the trick that lets a parkour element live in a top-down game at all. Every '
        + 'other kit\'s collision, aim and area effects keep working untouched, and the only thing '
        + 'the height changes is where your shadow is.',
      effects: [
        { tag: 'movement', label: 'The arc', detail: '384 units of upward speed against 900 of gravity — an apex of about 82 units, and roughly 0.85 seconds in the air from a standing hop.' },
        { tag: 'utility', label: 'No double jump', detail: 'Refused in mid-air. You have to be standing on the floor, on a platform, or on a bridge deck.' },
        { tag: 'utility', label: 'Catching a lip', detail: 'A platform catches you from up to 26 units under its top face while you are falling, and of every platform at or below you the highest wins.' },
        { tag: 'buff', label: 'Being off the floor', detail: 'Anything above 6 units counts as airborne: +5 on the Striker, and complete immunity to the Cursed Pyramid\'s poison.' },
        { tag: 'utility', label: 'Reading height', detail: 'A shadow slides away from you by 0.62px per unit of height, shrinking and fading as it goes, with a ladder of chevrons counting the gap. A pillar\'s shadow is how tall it is; yours is how high you are.' },
      ],
      notes: [
        'ArenaScene hands Space over rather than running its own dodge block, so one press can never mean both a jump and a dodge.',
        'A rival dragged into a Final Trail gets the jump too, whatever element they are — the kit claims the key for anybody standing on a trail course.',
        'Nothing in the kit gives you a mid-air correction. Every gap the generators produce is bounded by this arc, but a badly timed hop still misses.',
      ],
    },
    {
      emoji: '🧱',
      name: 'Courses And Falling',
      magic:
        'Both course abilities lay down the same kind of walk: a chain of platforms, one grey block '
        + 'you can reach from the floor and then sandstone pillars you can only reach from each '
        + 'other, each lifted above the last by less than a jump can carry. Nothing either generator '
        + 'produces is unclearable. What they do charge you for is missing.',
      effects: [
        { tag: 'cost', label: 'Falling', detail: '20 damage, as self-inflicted, for landing back on the floor off an unfinished course of yours.' },
        { tag: 'utility', label: 'What is not a fall', detail: 'Hopping from the floor and back. Stepping off a slab that belongs to no live course. Walking off the side of a bridge. And anything at all once the course has been claimed — the kit pulls a finished course back into the floor on purpose, and will not charge you for the drop it just dropped you into.' },
        { tag: 'utility', label: 'The grey block', detail: 'Index 0 of every course, deliberately cold grey to say "start here" — it is the only slab reachable from the ground.' },
        { tag: 'utility', label: 'Progress', detail: 'Tracked as the highest index you have actually stood on. Falling to the floor resets an NPC\'s target to the grey block, because from down there that is the only slab it can reach.' },
        { tag: 'damage', label: 'A platform coming down', detail: '35 damage inside 110px to everything the collapsing side is fighting — and it drops whoever was standing on it.' },
      ],
      notes: [
        'The step lengths and the rises are drawn from ranges bounded by the jump arc rather than by taste, which is the only guarantee a random obstacle course actually needs.',
        'A Sand NPC runs its own course and misses about as often as a player does — and pays the same 20 for it. A machine that never fell would make the element\'s one real cost invisible.',
        'Knocking the slab out from under an awakened idol silences it. That is the counterplay to the R.',
      ],
    },
  ],

  abilities: {
    'dune-striker': {
      magic:
        'A flintlock held out to one side on a spring, browned iron and oiled walnut, and it fires '
        + 'a hitscan lance of packed sand that stops on the first thing in the way. It is slow and '
        + 'it is deliberate — two whole seconds of reloading between shots — and its three damage '
        + 'tiers add rather than compete, so the ceiling of the element is a shot taken in mid-air '
        + 'off a pillar you built yourself.',
      cast: 'Click, held. The kit owns the reload rather than the cooldown, so the gun fires the instant it is loaded. Aimed at the cursor.',
      effects: [
        { tag: 'damage', label: 'Flat-footed', detail: '30 damage, hitscan, stopping at the first enemy on the line. Range is the arena diagonal — it is only ever about what is in the way.' },
        { tag: 'damage', label: 'In the air', detail: '+5. Anything above 6 units of height counts.' },
        { tag: 'damage', label: 'Off a platform', detail: '+10 for standing on a platform of yours — or on a bridge deck that is itself off the floor.' },
        { tag: 'damage', label: 'Both at once', detail: '45. The platform bonus rides out the jump that left the platform, so a hop off your own pillar and a shot at the apex is the full 45.' },
        { tag: 'utility', label: 'The reload', detail: '2 seconds, or 1 while the Golden Sand from a claimed Sandstone Ruins is on the barrel.' },
        { tag: 'utility', label: 'Where it aims from', detail: 'The muzzle, not the body. The gun is held out to one side, so a shot measured from the chest would run down a line merely parallel to the one you drew — the beam is angled from the barrel so it passes exactly through the cursor.' },
      ],
      notes: [
        '30 → 35 → 40 → 45 is the whole progression of the element, and it is the reason to build anything at all.',
        'The reload is enforced by the kit rather than by the cooldown system, because the golden orb has to be able to halve it without touching the fighter\'s global cooldown multiplier.',
        'The beam is drawn as far as it actually reached, so a shot that clipped somebody stops on them and one that missed carries to the wall — the line is honest about what it hit.',
      ],
    },

    'dune-ruins': {
      magic:
        'Four or five slabs shoved up out of the arena floor in a wandering chain, each one higher '
        + 'than the last. One cold grey block you can reach standing, then sandstone pillars you can '
        + 'only reach from each other, and a wide platform at the end with a golden orb turning over '
        + 'it. It is a short obstacle course and the reward is not damage — it is rate of fire.',
      cast: 'E, no aim — the chain is laid out into open floor near you, angled toward the middle of the arena. 15s cooldown.',
      effects: [
        { tag: 'summon', label: 'The course', detail: '4–5 platforms: one grey block at 58 units, then 3 or 4 pillars each 26–68 units higher than the last, spaced 88–112px apart.' },
        { tag: 'buff', label: 'The orb', detail: 'Reaching the last platform gives Golden Sand: 8 seconds in which the flintlock reloads in 1 second instead of 2, doubling its rate of fire.' },
        { tag: 'cost', label: 'Falling off', detail: '20 damage as self-inflicted, for every landing back on the floor while the course is unfinished.' },
        { tag: 'utility', label: 'Cleaning up', detail: 'Claimed, the whole course sinks back into the floor 140ms later — the reward is the buff, not the scaffolding.' },
        { tag: 'utility', label: 'Unclaimed', detail: 'It stands for 22 seconds and then crumbles for nothing. The pillars are still pillars in the meantime, and still worth +10 a shot.' },
      ],
      notes: [
        'The buff and the platforms are two separate rewards. Even a course you never finish is somewhere to stand and shoot from.',
        'Doubling the fire rate is worth more than any single damage tier: 8 seconds of golden reload is 8 shots instead of 4.',
        'The pillars are also Sandwalk anchors — a bridge only ever reaches a platform already within one gap, so the course is what makes the F worth pressing.',
      ],
    },

    'dune-pyramid': {
      magic:
        'The long, cruel version. Nine to eleven slabs instead of four, some of them sliding back '
        + 'and forth on a slow patrol, and green poison sunk into the floor across every gap between '
        + 'them — so the ground route is closed and jumping the pillars is the only free way through. '
        + 'At the top sits a golden pyramid idol, and reaching it wakes it up: fifteen seconds of a '
        + 'turret you did not have to aim, picking apart whoever is nearest.',
      cast: 'R, no aim. 28s cooldown.',
      effects: [
        { tag: 'summon', label: 'The course', detail: '9–11 platforms, spaced 92–122px, each 26–68 units higher than the last. About a third of the run slides on a 2.6–4.0 second patrol up to 52px wide; the goal never does.' },
        { tag: 'dot', label: 'The poison', detail: '12 damage the instant you step into a patch, then 9 every 0.6 seconds while you stand in it. Patches are 34–56px across and sit in the middle of every gap.' },
        { tag: 'utility', label: 'Height is immunity', detail: 'Anything above 6 units of height ignores poison entirely. Jumping the patch is the one free way across.' },
        { tag: 'summon', label: 'The idol', detail: '15 seconds awake. It fires a golden beam every 0.9 seconds at the nearest living enemy, at any range, for 16 damage a shot — about 16 shots and 256 damage from one full window.' },
        { tag: 'utility', label: 'The clean-up', detail: 'Claiming it collapses the entire course except the idol\'s own slab, so your own turret is not shooting through your own scaffolding.' },
        { tag: 'utility', label: 'Unclaimed', detail: '34 seconds standing, then it crumbles. The poison goes with it.' },
      ],
      notes: [
        'The bite on entry is what closes the floor route. On a timer alone you could simply walk through a patch and pay nothing, which would make the pillars decorative.',
        'Your own poison is charged as self-inflicted; somebody else\'s is a genuine attack.',
        'The idol\'s slab is orphaned out of the course on purpose, so R can be re-cast immediately without the new course inheriting this one\'s teardown.',
        'Knock the idol\'s slab down and the idol goes quiet. That is the answer to it.',
      ],
    },

    'dune-sandwalk': {
      magic:
        'A ribbon of running sand laid from where you stand to the neighbouring platform nearest '
        + 'the cursor, sloping if it has to climb, with the grain visibly travelling along it. It is '
        + 'a step, not a shortcut — it will only ever reach something already within one gap of you '
        + '— and while you are on it the deck does the walking: everything you do is a quarter '
        + 'faster and you are being carried toward the far end whether you like it or not.',
      cast: 'F. The cursor chooses which neighbour. One deck per side — a second cast moves it rather than laying a lattice. 10s cooldown.',
      effects: [
        { tag: 'movement', label: 'The ride', detail: 'Your own velocity ×1.25 plus 110 px/s of conveyor toward the far end, applied after your movement has already been written for the frame.' },
        { tag: 'area', label: 'Reach', detail: 'Any platform of yours within 180px of where you are standing. Nothing further is a neighbour and gets no bridge.' },
        { tag: 'summon', label: 'The deck', detail: '52px wide, 6 seconds of life, and sloped between the two heights it connects, so its own height under you is worked out per step along it.' },
        { tag: 'movement', label: 'On the floor', detail: 'With nothing in range it lays a 170px conveyor strip instead — same speed, same carry, no altitude. It is worth pressing before you have built anything at all.' },
        { tag: 'utility', label: 'Delivering', detail: 'A slab level with the far end adopts you off the deck, so crossing to a goal still lands on it and still claims the course.' },
        { tag: 'utility', label: 'No sides', detail: 'Walking off the side of a deck is never a fall and costs nothing. Passage is what it promised you.' },
      ],
      notes: [
        'A deck that is itself off the floor counts as a platform for the Striker\'s +10, so a bridge between two pillars is a firing line as well as a route.',
        'It is the one ability that survives a Final Trail: the jump because the race *is* jumping, and Sandwalk because a bridge is a legitimate line through a course.',
        'The conveyor is an override, not a contribution — it is applied after WASD and the AI have already written the frame\'s velocity, so it wins.',
      ],
    },

    'dune-final-trail': {
      magic:
        'The arena is cleared and replaced. Two lanes serpentine up the screen, ten to twelve slabs '
        + 'each, one for you and one for the nearest enemy, with a golden crown on top of each and '
        + 'lava climbing steadily out of the floor beneath both. It suspends the fight entirely — no '
        + 'shooting your way out of a race — and it is completely symmetrical. First to their crown '
        + 'walks away clean. The other one pays for it, and that can be you.',
      cast: 'Q, no aim — it takes the nearest enemy the height sim can carry, and is refused with "NO RIVAL" if there is nobody eligible. Ultimate, 42s cooldown.',
      effects: [
        { tag: 'summon', label: 'The lanes', detail: '11–13 slabs each, confined to half the screen, climbing 22–60 units per step. Both lanes roll their own randomness, so they are the same difficulty and never the same course.' },
        { tag: 'damage', label: 'Losing', detail: '70 damage — for coming second, for falling to the floor, or for letting the lava reach you. One price for all three.' },
        { tag: 'cost', label: 'It can be you', detail: 'The caster losing their own minigame takes the 70 as self-inflicted. This is a bet that you climb better, not a free ultimate.' },
        { tag: 'area', label: 'The lava', detail: 'Starts 70 units below the floor and rises at 20 a second, reaching the starting slab about 5.5 seconds in. Anything at or below its surface is caught.' },
        { tag: 'control', label: 'Everything else is off', detail: 'Only the jump and Sandwalk work up there, for either side. A rival is disarmed on a rolling refresh for the whole race — they did not sign up for this and cannot answer it with their own kit.' },
        { tag: 'utility', label: 'The clock', detail: 'A dead man\'s switch ends it at 40 seconds however badly both sides stall, and it ends immediately if either runner dies.' },
        { tag: 'utility', label: 'Racing a bot', detail: 'An NPC commits to its next slab the moment it lands, so it cannot fall — it dwells 450ms on each slab and walks at 90% speed. What you are racing is its cadence, not its skill.' },
      ],
      notes: [
        'The lava is deliberately slower than a bot\'s climb: it never beats a runner who is actually moving, and it takes about five slabs\' worth of hesitation before it has you. Standing at the bottom reading the course is not an option either.',
        'Everything on the board is cleared first — half-built courses, decks and idols would all be cover nobody earned inside a race.',
        'Winning is worth 70 to them and nothing to you; losing is worth 70 to you. Against a bot that never falls the whole ability comes down to whether you hesitate less than it does.',
        'The rig lingers for 0.9 seconds after somebody wins or falls, then puts both runners down on the floor rather than letting go of them hundreds of units up.',
      ],
    },
  },
};

export default dune;
