import { ElementCodex } from '../AbilityCodex';

/**
 * Depths — the element that wins by making you go somewhere.
 *
 * Verified against `src/elements/depths.ts`, `kits/DepthsKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts`. Depths has no perks and no mastery enhancements; every figure below is a
 * constant at the top of the kit.
 */
const depths: ElementCodex = {
  identity:
    'Every other element pushes damage at you. Depths baits you. Stand still as a Depths player '
    + 'and the water simply takes you — body gone, health bar gone — leaving a glowing green orb '
    + 'behind that is drawn with the exact same brush as a real healing orb, and anything that '
    + 'comes to eat it walks into the only burst window this element has. The rest of the kit is '
    + 'more of the same: an air pocket a drowning enemy has to sprint to, a bloom of genuine '
    + 'heals that either side can take, and a fish on a line you can only land by standing '
    + 'perfectly still. Depths spends most of a match not attacking. Its damage arrives when the '
    + 'enemy has been made to be somewhere — chewing on the lure, running for air, or inside a '
    + 'shark.',

  passives: [
    {
      emoji: '🎣',
      name: 'The Anglerfish',
      magic:
        'Stop moving and you start disappearing. The body fades into the water over a second and '
        + 'a half, the health bar goes with it once you are most of the way gone, and a soft '
        + 'green orb on a barely-visible thread hangs in the water between you and whoever you '
        + 'are fighting, with a column of bubbles rising off it. It is painted with the same '
        + 'painter Eutrophication uses. There is no way to tell it from a heal by looking, which '
        + 'is the entire point of it.',
      effects: [
        { tag: 'utility', label: 'Going under', detail: 'Standing still — under 14 px/s — for 450ms starts a 1.4s fade. Moving brings you back in 220ms.' },
        { tag: 'utility', label: 'What vanishes', detail: 'Your sprite fades all the way to invisible, and past 85% faded the health bar is hidden too. A green bar floating over nothing would give the whole thing away.' },
        { tag: 'area', label: 'The orb', detail: 'Hangs 56px from you, on the side the nearest enemy is coming from, and pays out to anything that comes within 44px of it. It is placed in front rather than on top of you specifically so that a biter ends up beside you rather than inside you.' },
        { tag: 'utility', label: 'It brightens as you fade', detail: 'The orb is drawn at the strength of the fade — the deeper you are gone, the more convincing the lie.' },
        { tag: 'cost', label: 'The re-arm', detail: 'After a bite the lure cannot come back for 1.6 seconds, so one long stand is not infinite value.' },
      ],
      notes: [
        'Being carried does not count as standing still. Inside a gulper eel or a Megalodon, the fade never starts.',
        'A bot cannot tell a lure from a heal because there is nothing to tell: its rule for both is "walk to the orb". It will only prefer a real algae orb over your fake one when it is actually hurt.',
        'The thread back to your body is drawn at about a sixth of the fade\'s alpha — visible from close up, invisible from across the arena.',
      ],
    },
    {
      emoji: '🩸',
      name: 'Feeding Frenzy',
      magic:
        'Something takes the bait, there is a wet snap of teeth where the orb was, a red ❗ over '
        + 'the biter, and you are back — fully visible, moving fast, and holding the only real '
        + 'burst this element owns. It lasts one second. Everything Depths does is arranged '
        + 'around being ready to spend it.',
      effects: [
        { tag: 'buff', label: 'The window', detail: '1 second, starting the frame anything touches the lure.' },
        { tag: 'movement', label: 'The speed', detail: '×1.5 move speed for the whole second, multiplied against any chill or drag already on you.' },
        { tag: 'damage', label: 'The strike', detail: 'A Lungfish Strike cast inside the window deals 30 instead of 15 — and it is the same cast, so it still starts the drowning.' },
        { tag: 'utility', label: 'You come back', detail: 'The fade is dropped to zero on the bite. You are visible and the bar is back before the window opens.' },
      ],
      notes: [
        'One second at 720 px/s of dash means the boosted Lungfish has to be already aimed. This is not a window you react in — it is one you set up.',
        'The bite is checked against everything you are allowed to hurt, so in Invasion a wave walking past your lure hands you the window for free.',
      ],
    },
  ],

  abilities: {
    'depths-piranha': {
      magic:
        'A single small red-bellied fish is thrown out of your hand and swims at whatever you '
        + 'pointed at, wiggling as it goes. It does no damage at all when it arrives. What it '
        + 'does is *stay* — it clamps onto the body, orbits it nose-in, and chews, and the '
        + 'ability is entirely a matter of how many of them you can get on at once.',
      cast: 'Click, one per press. 1.2s cooldown.',
      effects: [
        { tag: 'utility', label: 'The swim', detail: '640 px/s, alive for 1.7 seconds, landing on the first body within 24px of it.' },
        { tag: 'dot', label: 'The chew', detail: '3 HP a second per piranha, for 3 seconds each. Billed once per victim as a single figure rather than per fish, so five of them read as one number on the health bar.' },
        { tag: 'utility', label: 'No impact damage', detail: 'Zero on arrival. A piranha that lands and is immediately shaken has done nothing at all.' },
        { tag: 'utility', label: 'The cap', detail: '5 on one body. A sixth does not add — it refreshes the timer on the oldest one already there and takes ownership of it.' },
        { tag: 'utility', label: 'Part-ticks are lost', detail: 'A victim whose last piranha falls off mid-second drops the fraction rather than banking it for the next school.' },
      ],
      upgrade: {
        magic:
          'Swarm Tactics is about weight of numbers. Every piranha swims and chews half again as '
          + 'long, so a school can be assembled from further out and holds together for longer — '
          + 'and once there are enough of them on one body, they stop being a nuisance.',
        effects: [
          { tag: 'dot', label: 'Longer', detail: 'Flight goes from 1.7s to 2.55s and the chew from 3s to 4.5s — so one piranha is 13 damage rather than 9.', requiresUpgrade: 'click' },
          { tag: 'dot', label: 'Three is the threshold', detail: 'With 3 or more on one body every piranha on it bites for 6 a second instead of 3. Three is 18 a second; a full five is 30.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'Five is the weight', detail: 'A full school of 5 drags them 20% slower for 5 seconds, refreshed for as long as the school stays full, and it prints 🐟 SWARMED the first time it lands.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A full five-piranha school with the upgrade is 135 damage over four and a half seconds and a 20% slow — for five clicks and six seconds of cooldown. Getting all five on is the hard part, which is what the extra flight time is for.',
        'The doubled-bite check reads whether *any* piranha on the body came from an upgraded owner, and then counts every piranha on it. In a match with Depths on both sides, one player\'s upgrade can double the other player\'s school on the same target.',
        'The slow stacks multiplicatively with an icefish\'s chill: 20% off twice is ×0.64.',
      ],
    },

    'depths-lungfish': {
      magic:
        'A short hard dash forward with a cyan arc of teeth thrown out in front of it. The dash '
        + 'and the cut are the small half of this ability. The large half is what happens to '
        + 'whoever it reaches: the water closes over their head, a bar of air appears above them, '
        + 'and a black pool opens up on the far side of the arena. They have five seconds of '
        + 'breath and a very long walk.',
      cast: 'E, aimed at the cursor. The dash is applied after movement resolves, so WASD cannot cancel it. 16s cooldown, spent whether or not the blade found anything.',
      effects: [
        { tag: 'movement', label: 'The dash', detail: '720 px/s for 170ms — about 122px — straight at the cursor.' },
        { tag: 'damage', label: 'The slash', detail: '15 to everything within 44px of a 96px line drawn along the aim. 30 instead if a lure bite is still inside its one-second window.' },
        { tag: 'debuff', label: 'The drowning', detail: 'Lands on the nearest body the blade reached. 5 seconds of air, then 12 HP a second until they reach the pool. The whole thing runs 12 seconds and then they surface whatever happened.' },
        { tag: 'area', label: 'The air pocket', detail: 'A 48px black puddle placed at the mirror of the victim\'s position across the arena. If that lands within 280px of them it is sent to the far corner instead — a step is not a run.' },
        { tag: 'heal', label: 'Reaching it', detail: 'Touching the pool refills the bar to 100% outright, not a trickle, and resets the damage tick. They can do this as many times as they can get back to it.' },
        { tag: 'cost', label: 'A miss pays nothing', detail: 'No damage, no drowning, 🫧 MISSED, and the full 16 seconds are gone.' },
      ],
      upgrade: {
        magic:
          'Knock the Breath Out connects the rest of the kit to the drowning. Every point of '
          + 'damage that lands on somebody with air still in their lungs takes some of it, so a '
          + 'school of piranhas or a thrown sword fish is no longer just damage — it is time off '
          + 'the clock they are running against.',
        effects: [
          { tag: 'debuff', label: 'The rate', detail: '0.6% of the oxygen bar per point of damage, from any source. A 50-damage sword fish is 30% of the bar; a 12-point algae trap is 7%; a piranha\'s 3-a-second is about 2% a second.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Per point, not per hit', detail: 'Deliberately charged by the size of the hit rather than flat, so a piranha costs a sip and an ultimate costs a third of the bar.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Only while they still have air', detail: 'It does nothing once the bar is already empty, which is also why the drown\'s own 12-a-second cannot feed itself.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'The tell', detail: '💨 WINDED with a burst of bubbles, but only for hits worth 5% of the bar or more — otherwise a school of piranhas would bury the screen.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The ability bar shows the drowning clock rather than the cooldown for as long as one is running, so the key is a readout of somebody else\'s lungs.',
        'One drown per caster. Landing a second Lungfish on a new target moves the bar rather than opening a second one.',
        'A strike that catches two bodies damages both and drowns only the nearest, so the ability is never a two-bar problem for the enemy team.',
      ],
    },

    'depths-eutrophication': {
      magic:
        'A ring of green goes out from you and twelve algae orbs bloom across the whole arena, '
        + 'spaced out rather than piled up. They are real, they are honest, and they are open to '
        + 'everybody. It is the only ability in this element that helps the person it is aimed '
        + 'at, and it is in the kit because a Depths player needs somewhere to be standing still.',
      cast: 'R. Instant, no aim — the bloom is placed across the arena, not at the cursor. 20s cooldown.',
      effects: [
        { tag: 'heal', label: 'The orbs', detail: '12 of them, healing 12 each to whoever gets there first — you, them, an ally or an Invasion husk. There is no owner check.' },
        { tag: 'area', label: 'The bloom', detail: '28px pickup radius, alive for 25 seconds, scattered across the whole playable area with ten attempts each at staying 80px clear of the others.' },
        { tag: 'utility', label: 'Full health does not consume one', detail: 'A fighter at maximum health walks straight over a green orb and leaves it standing.' },
      ],
      upgrade: {
        magic:
          'Algae Trap doubles the bloom and poisons half of it. Twelve more orbs come up, '
          + 'alternating with the real ones so the fake half gets exactly the same quality of '
          + 'placement — and on your screen, and only on your screen, those twelve are red. '
          + 'Everybody else in the match, the bot included, is looking at a field of heals.',
        effects: [
          { tag: 'damage', label: 'The poison', detail: '18 damage to whoever touches one, and then it is gone like a real orb. 12 of them, for 24 orbs on the floor in total.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Red is a view, not a property', detail: 'The orb is only painted red for the side that planted it. An online opponent\'s trap arrives on your screen as an ordinary green heal, which is the whole ability.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'It will take you too', detail: 'There is no owner check on a red orb either. Walking into your own trap costs you the same 18, and unlike a green orb it does not care what your health is.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Alternating placement', detail: 'The poisoned half is interleaved rather than appended, so a trap that always landed in the leftover corners is not something an opponent can learn to read.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Unupgraded, this is a genuinely two-sided ability and the counterplay is simply to eat it. The reason to cast it anyway is that a fed enemy is an enemy who came to a place you chose.',
        'A catfish landed on a baited line eats only the green half, so a trap survives your own harvest.',
        'A commanded Megalodon grinds either colour into whoever is in its mouth for 30 apiece, which turns a whole bloom — yours and the traps together — into ammunition.',
      ],
    },

    'depths-angler': {
      magic:
        'A line goes out and you have to stand there. Three seconds of not moving and something '
        + 'comes up out of the water and clamps in your jaw — one of five, and you do not get to '
        + 'choose which. Press F again and you throw it. Every one of the five is a completely '
        + 'different weapon, which is why this is the only key in the game whose value is decided '
        + 'by a dice roll after you have already paid for it.',
      cast: 'F to cast out, F again to throw the catch at the cursor. The throw is a recast rather than a second cast, so it does not touch the cooldown. 10s cooldown.',
      effects: [
        { tag: 'utility', label: 'The wait', detail: '3 seconds, counted down only on the frames you are actually standing still. Walking does not cancel the line, it pauses it.' },
        { tag: 'cost', label: 'Being hit', detail: 'Every instance of damage you take while the line is out adds a full second to the wait, and says 🎣 +1s.' },
        { tag: 'utility', label: 'The bar', detail: 'The ability bar shows the line coming in rather than a cooldown, and sits full while a catch is in your jaw.' },
      ],
      variants: {
        label: 'The catch — one of five, at random',
        variants: [
          { emoji: '🧊', name: 'Icefish', description: '620 px/s, alive 2.2s. 15 damage and a 20% slow for 5 seconds, then it is spent. Trails a cold wake so the slow is readable before it lands.' },
          { emoji: '🗡️', name: 'Barracuda', description: '800 px/s, alive 2s. 25 damage and it keeps going — it pierces every body on the line, hitting each at most once every 0.4s.' },
          { emoji: '🐡', name: 'Pufferfish', description: '400 px/s, alive 6s. 15 damage per hit with a 0.7s cooldown per target, and it bounces off walls *and* off bodies. Given room it is worth far more than any single-hit fish.' },
          { emoji: '💣', name: 'Bomb fish', description: '540 px/s, alive 2.4s. Detonates on the first body or the first wall for 20 damage inside 92px — the only fish that does not care whether it found anybody.' },
          { emoji: '🐍', name: 'Gulper eel', description: '460 px/s, alive 5s. Swallows the first body it touches and carries it, chewing for 10 a second, until it hits a wall or its five seconds run out. They go exactly where it goes.' },
        ],
      },
      upgrade: {
        magic:
          'Deep Fishing gives you something to do with a fish you did not want. Hold F on a catch '
          + 'instead of tapping it and the fish goes on the hook as bait rather than at the enemy '
          + '— and the next thing that comes up the line is off a completely different table, '
          + 'from the bottom.',
        effects: [
          { tag: 'utility', label: 'The trade', detail: 'Hold F for 0.5s on a landed catch to give it up. The tap still throws, so the throw moves to the key release — there is no way on the press to know which of the two it will be.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'One bait, one rare', detail: 'The bait is spent by the next catch, which is drawn from the rare table instead of the common one. The wait, the cooldown and the standing-still are all unchanged.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'A bot always throws its catch about 0.6 seconds after landing it, and is forced to stand still for the whole three seconds — so a fishing Depths bot is the easiest target in the game.',
        'The rare table is strictly better than the common one, so with the upgrade equipped there is very little reason ever to throw a common fish at anybody.',
        'A flying fish that comes home is back in your jaw with no cast and no cooldown, which makes it the one catch that can be spent more than once.',
      ],
    },

    'depths-megalodon': {
      magic:
        'The floor behind you opens and a two-hundred-pixel shark comes up out of it at speed, '
        + 'along exactly the line you were pointing. It surfaces *behind* you so it sweeps '
        + 'through where you are standing, and its mouth leads its body by most of a body length. '
        + 'Anything that mouth passes over goes in. It carries them to the wall, beaches itself, '
        + 'turns to face the room, and holds them there in its teeth for eight seconds before '
        + 'spitting them into the middle of the arena.',
      cast: 'Q, ultimate, aimed at the cursor. 50s cooldown. One shark per side at a time — a second would only steal the first one\'s mouthful.',
      effects: [
        { tag: 'control', label: 'The swallow', detail: 'Anything within 62px of the mouth as it passes is taken, and there is no limit on how many. The mouth runs 88px ahead of the shark\'s centre.' },
        { tag: 'movement', label: 'The rush', detail: '780 px/s in a straight line from 150px behind you, until the mouth leaves the arena.' },
        { tag: 'dot', label: 'The hold', detail: '8 HP a second for 8 seconds to everything in its mouth, with their bodies written to the mouth position every frame — they do not get to walk out.' },
        { tag: 'control', label: 'The spit', detail: 'Everybody held is dropped in the dead centre of the arena at a random 26px offset when the eight seconds are up.' },
        { tag: 'utility', label: 'An empty mouth', detail: 'A shark that caught nobody still beaches, but only holds for 1.4 seconds — just long enough to be seen leaving.' },
        { tag: 'utility', label: 'The bar', detail: 'The ability bar shows the shark\'s eight seconds rather than the cooldown for as long as one is out.' },
      ],
      upgrade: {
        magic:
          'Command the Depths gives the beached shark a steering wheel. Instead of sitting where '
          + 'it landed it follows your cursor around the arena with somebody in its jaws — and '
          + 'every algae orb it drives over, yours or theirs, green or red, is ground straight '
          + 'into whoever is inside it.',
        effects: [
          { tag: 'movement', label: 'The steering', detail: '120 px/s toward the cursor for the whole eight seconds, clamped 40px inside the walls, and it turns to face where it is going.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The grinding', detail: '30 damage per orb to every fighter in the mouth. Colour is irrelevant — the damage is the grinding, not the algae — so your own healing bloom is ammunition.', requiresUpgrade: 'q' },
          { tag: 'area', label: 'The reach', detail: 'The mouth eats an orb from within 62px of it, and the orb is destroyed. With a full 24-orb Algae Trap on the floor that is a theoretical 720 damage on one held body.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Casting Eutrophication before the ultimate, and only then, is the intended combination — the bloom is the ammunition and Command the Depths is the gun.',
        'The shark reverses its facing when it beaches, which is what keeps a held fighter inside the arena rather than through the wall it just hit.',
        'Being spat into the centre is often a favour to the victim in a 1v1 and a disaster for them in Invasion, where the centre is where everything else already is.',
        'Anything that dies inside the mouth is quietly dropped from the hold, so the shark never carries a corpse.',
      ],
    },
  },
};

export default depths;
