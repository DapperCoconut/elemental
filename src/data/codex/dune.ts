import { ElementCodex } from '../AbilityCodex';

/**
 * Sand — the parkour element. Its ability ids are `dune-*` because `sand` is already Time's
 * element id; it answers to "Sand" everywhere a player can read it.
 *
 * Verified against `src/elements/dune.ts` and `kits/SandKit.ts`. Every figure below is a
 * constant at the top of the kit.
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
      basics:
        'Space is a jump, not a dash: 384 units of upward speed against 900 of gravity, an apex of '
        + 'about 82 units and roughly 0.85 seconds in the air from a standing hop. There is no double '
        + 'jump — it is refused in mid-air, so you must be on the floor, a platform or a bridge deck. A '
        + 'platform catches you from up to 26 units under its top face while falling, and of every '
        + 'platform at or below you the highest wins. Anything above 6 units counts as airborne, which is '
        + '+5 on the Striker and complete immunity to the Cursed Pyramid\'s poison. Height is read off a '
        + 'shadow that slides away from you by 0.62px per unit, shrinking and fading, with a ladder of '
        + 'chevrons counting the gap.',
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
      basics:
        'Landing back on the floor off an unfinished course of yours costs 20 damage as self-inflicted. '
        + 'Four things are explicitly not falls: hopping from the floor and back, stepping off a slab '
        + 'belonging to no live course, walking off the side of a bridge, and anything at all once the '
        + 'course has been claimed — the kit pulls a finished course into the floor on purpose and will '
        + 'not charge you for the drop it just made. Index 0 of every course is a cold grey block saying '
        + 'start here; it is the only slab reachable from the ground. Progress is the highest index you '
        + 'have actually stood on, and falling resets an NPC\'s target to the grey block because from down '
        + 'there that is the only slab it can reach. A platform coming down deals 35 damage inside 110px '
        + 'to everything the collapsing side is fighting, and drops whoever was standing on it.',
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
      basics:
        'A hitscan flintlock stopping at the first enemy on the line, with the arena diagonal for range '
        + '— it is only ever about what is in the way. 30 damage flat-footed, +5 in the air (anything '
        + 'above 6 units), +10 standing on a platform of yours or a bridge deck that is itself off the '
        + 'floor, and 45 for both at once, since the platform bonus rides out the jump that left it. The '
        + 'reload is 2 seconds, or 1 while Golden Sand is on the barrel. The beam is angled from the '
        + 'muzzle rather than the chest — the gun is held out to one side, so a shot measured from the '
        + 'body would run down a line merely parallel to the one you drew.',
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
      basics:
        'Lays a course of 4–5 platforms into open floor near you, angled toward the middle of the '
        + 'arena: a grey block at 58 units and then 3 or 4 pillars each 26–68 units higher than the last, '
        + '88–112px apart. Reaching the last one gives Golden Sand — 8 seconds in which the flintlock '
        + 'reloads in 1 second instead of 2, doubling its rate of fire — and the whole course sinks back '
        + 'into the floor 140ms later, because the reward is the buff and not the scaffolding. Every '
        + 'landing on the floor while it is unfinished costs 20 self-inflicted damage. Left unclaimed it '
        + 'stands 22 seconds and crumbles for nothing, though the pillars are still pillars and still '
        + 'worth +10 a shot in the meantime. 15s cooldown.',
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
      basics:
        'A much longer course: 9–11 platforms 92–122px apart, each 26–68 units higher than the last, '
        + 'with about a third of the run sliding on a 2.6–4.0 second patrol up to 52px wide — the goal '
        + 'never does. Every gap holds a poison patch 34–56px across, dealing 12 damage the instant you '
        + 'step in and 9 every 0.6 seconds while you stand there, and anything above 6 units of height '
        + 'ignores poison entirely, so jumping the patch is the one free way across. Claiming it wakes an '
        + 'idol for 15 seconds that fires a golden beam every 0.9 seconds at the nearest living enemy, at '
        + 'any range, for 16 damage — about 16 shots and 256 damage from a full window — and collapses '
        + 'the whole course except the idol\'s own slab so your turret is not shooting through your own '
        + 'scaffolding. Unclaimed it stands 34 seconds and crumbles, poison and all. 28s cooldown.',
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
      basics:
        'Lays a 52px sloped deck to whichever platform of yours the cursor picks, within 180px — '
        + 'nothing further counts as a neighbour. It lives 6 seconds and carries you at your own velocity '
        + '×1.25 plus 110 px/s of conveyor toward the far end, applied after your movement has already '
        + 'been written for the frame, with its height under you worked out per step along the slope. '
        + 'With nothing in range it lays a 170px conveyor strip on the floor instead — same speed, same '
        + 'carry, no altitude — so it is worth pressing before you have built anything. A slab level with '
        + 'the far end adopts you off the deck, so crossing to a goal still claims the course, and '
        + 'walking off the side is never a fall. One deck per side; a second cast moves it rather than '
        + 'laying a lattice. 10s cooldown.',
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
      basics:
        'A race. Two lanes of 11–13 slabs each, confined to half the screen and climbing 22–60 units a '
        + 'step, rolled independently so they are the same difficulty and never the same course. Losing '
        + 'costs 70 damage — for coming second, for falling to the floor, or for letting the lava reach '
        + 'you, one price for all three — and that includes you: the caster losing their own minigame '
        + 'takes the 70 as self-inflicted, so it is a bet that you climb better rather than a free '
        + 'ultimate. Lava starts 70 units below the floor and rises 20 a second, reaching the starting '
        + 'slab about 5.5 seconds in, catching anything at or below its surface. Only the jump and '
        + 'Sandwalk work up there for either side, and the rival is disarmed on a rolling refresh for the '
        + 'whole race. A dead man\'s switch ends it at 40 seconds however badly both sides stall, and it '
        + 'ends immediately if either runner dies. Against a bot you are racing a cadence rather than '
        + 'skill: an NPC commits to its next slab the moment it lands so it cannot fall, dwelling 450ms '
        + 'on each and walking at 90% speed. Refused with "NO RIVAL" if there is nobody eligible. 42s '
        + 'cooldown.',
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

  mastery: {
    unsatiable: {
      basics:
        'Every link in a climbing chain takes 6% off the reload, capped at ten links for 60% — two '
        + 'seconds becomes 800ms, and the golden orb\'s one second becomes 400ms. A link is landing on any '
        + 'platform, or catching a Sandwalk deck out of the air while the deck is itself off the floor; a '
        + 'deck lying on the floor is the floor. Dropping to the floor off anything breaks the chain '
        + 'outright whatever the fall itself cost, and five unbroken seconds standing on the floor lapses '
        + 'it too, so it can never be banked once and carried all match. No bind and nothing to press.',
      effects: [
        { tag: 'buff', label: 'The chain', detail: '6% off the reload per link, capped at ten links — 60%. Two seconds becomes 800ms, and the golden orb\'s one second becomes 400ms.' },
        { tag: 'utility', label: 'What counts as a link', detail: 'Landing on any platform, and catching a Sandwalk deck out of the air while the deck is itself off the floor. A deck lying on the floor is the floor.' },
        { tag: 'cost', label: 'Falling', detail: 'Dropping to the floor off something breaks the chain outright, whatever the fall itself cost.' },
        { tag: 'cost', label: 'Standing still', detail: 'Five unbroken seconds on the floor also lapses it. A chain you could bank once and carry all match would be a flat buff wearing a combo\'s clothes.' },
        { tag: 'utility', label: 'No key', detail: 'The passive half of Sand Mastery — no bind, no cast, nothing to press.' },
      ],
      notes: [
        'Ten links is not a long run: a Cursed Pyramid is nine slabs, so one clean climb caps it on its own.',
        'The reload is the kit\'s own two-second gate, not `cooldownMult` — this stacks cleanly with the golden orb rather than fighting it.',
      ],
    },
    'tempered-temptation': {
      basics:
        'A bindable glass state — F or Q only, never over E or R, which raise the courses this exists '
        + 'to enhance — that can be re-cast to temper back down early. The Striker fires three balls a '
        + 'pull instead of one, each for half a single shot, so 1.5× a normal pull, with every ball after '
        + 'the first tracking the cursor into a stream rather than a shotgun; with the golden orb it is '
        + 'five balls, 2.5×, on top of the faster reload. A Cursed Pyramid claimed while tempered leaves '
        + 'a shard orbiting you for the rest of the match, firing a 5-damage hitscan beam every 1.5 '
        + 'seconds at whoever is nearest, up to four. The courses turn hostile: a flamethrower per gap '
        + 'dealing 13 damage every 0.4s, cycling 1.5s on and 1.5s off with a half-second wind-up on the '
        + 'nozzle; half of every course\'s middle slabs hold 2.4 seconds under a standing weight and then '
        + 'shatter, returning 4 seconds later in the same place; and every slab loses 14% of its radius. '
        + 'And while you are glass, landing back on the floor off anything does not cost 20 damage — it '
        + 'kills you outright. 16s and 34s cooldowns counted from the cast.',
      cast: 'Bindable to F or Q — never over E or R, which raise the courses this exists to enhance. Re-cast to temper back down early. 16s, 34s cooldown counted from the cast.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: 'Three balls a pull instead of one, each for half what the single shot would have hit for — 1.5× a normal pull. Every ball after the first tracks the cursor, so it is a stream rather than a shotgun.' },
        { tag: 'damage', label: 'With the golden orb', detail: 'Five balls instead of three, still at half apiece — 2.5×, on top of the orb\'s faster reload.' },
        { tag: 'summon', label: 'Mini idols', detail: 'A Cursed Pyramid claimed while tempered leaves a shard orbiting you for the rest of the match, firing a 5-damage hitscan beam every 1.5s at whoever is nearest. Up to four.' },
        { tag: 'cost', label: 'Falling', detail: 'While you are glass, landing back on the floor off anything is not 20 damage. It kills you outright.' },
        { tag: 'dot', label: 'Flamethrowers', detail: 'One per gap on every tempered course, 13 damage every 0.4s to anything in the jet, cycling 1.5s on and 1.5s off with a half-second wind-up on the nozzle before it lights.' },
        { tag: 'control', label: 'Glass slabs', detail: 'Half of every course\'s middle slabs hold for 2.4 seconds under a standing weight and then shatter. They come back 4 seconds later in the same place.' },
        { tag: 'debuff', label: 'Narrower footing', detail: 'Every slab of a tempered course loses 14% of its radius.' },
      ],
      notes: [
        'It tempers *every* live course on the board, not only yours — an enemy Sand\'s obstacle course catching fire is a legitimate attack, and your own catching fire is the price of the burst.',
        'The starter block and the prize at the end never crumble. A course whose first step can vanish is not a course, and a goal that drops you as you take it would be taking the reward back with the same hand.',
        'The crumble clock only runs while somebody is standing on the slab and resets the instant they leave, so it is a pace rule rather than a timer — cross it as often as you like, just never stop on it.',
        'The flames are strung between the pillars and reach 42 units below their own height. Anything on the arena floor is under them and is never caught.',
        'Casting Final Trail ends the glass. A lane is not a course you built — it is a race the ability puts both fighters into with its own price and its own guarantees, and salting it with flamethrowers a committed bot cannot read would turn a symmetrical bet into an execution.',
        'Nightmare Sand bots run the passive but never bind this one. Their course autopilot falls off pillars on purpose, and a lethal fall would just be a suicide button.',
      ],
    },
  },
};

export default dune;
