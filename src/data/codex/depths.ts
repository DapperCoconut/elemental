import { ElementCodex } from '../AbilityCodex';

/**
 * Depths — the element that wins by making you go somewhere.
 *
 * Verified against `src/elements/depths.ts`, `kits/DepthsKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the two mastery enhancements in `data/Mastery.ts`. Depths has no
 * perks; every figure below is a constant at the top of the kit.
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
      basics:
        'Standing still — under 14 px/s — for 450ms starts a 1.4-second fade to fully invisible, with '
        + 'the health bar hidden past 85%, and moving brings you back in 220ms. A lure orb hangs 56px '
        + 'from you on the side the nearest enemy is coming from, brightening as you fade, and pays out '
        + 'to anything that comes within 44px of it. It is placed in front rather than on top of you '
        + 'specifically so a biter ends up beside you rather than inside you. After a bite the lure '
        + 'cannot come back for 1.6 seconds, so one long stand is not infinite value.',
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
      basics:
        'The moment anything touches the lure you get a one-second window: ×1.5 move speed, multiplied '
        + 'against any chill or drag already on you, and a Lungfish Strike cast inside it deals 30 '
        + 'instead of 15 — the same cast, so it still starts the drowning. The fade drops to zero on the '
        + 'bite, so you are visible and the bar is back before the window opens.',
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
      basics:
        'One piranha a press, swimming at 640 px/s for 1.7 seconds and landing on the first body within '
        + '24px. It deals nothing on arrival — a piranha that lands and is immediately shaken has done '
        + 'nothing at all — and instead chews for 3 HP a second for 3 seconds, billed once per victim as '
        + 'a single figure rather than per fish so five read as one number on the health bar. Five is the '
        + 'cap on one body, and a sixth refreshes the timer on the oldest already there and takes '
        + 'ownership of it. A victim whose last piranha falls off mid-second drops the fraction. 1.2s '
        + 'cooldown.',
      cast: 'Click, one per press. 1.2s cooldown.',
      effects: [
        { tag: 'utility', label: 'The swim', detail: '640 px/s, alive for 1.7 seconds, landing on the first body within 24px of it.' },
        { tag: 'dot', label: 'The chew', detail: '3 HP a second per piranha, for 3 seconds each. Billed once per victim as a single figure rather than per fish, so five of them read as one number on the health bar.' },
        { tag: 'utility', label: 'No impact damage', detail: 'Zero on arrival. A piranha that lands and is immediately shaken has done nothing at all.' },
        { tag: 'utility', label: 'The cap', detail: '5 on one body. A sixth does not add — it refreshes the timer on the oldest one already there and takes ownership of it.' },
        { tag: 'utility', label: 'Part-ticks are lost', detail: 'A victim whose last piranha falls off mid-second drops the fraction rather than banking it for the next school.' },
      ],
      upgrade: {
        basics:
          'Flight goes from 1.7s to 2.55s and the chew from 3s to 4.5s, so one piranha is 13 damage '
          + 'rather than 9. Three or more on one body makes every piranha on it bite for 6 a second instead '
          + 'of 3 — 18 a second at three, 30 at a full five — and a full school of 5 drags them 20% slower '
          + 'for 5 seconds, refreshed while the school stays full, printing 🐟 SWARMED the first time.',
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
      basics:
        'A 122px dash at 720 px/s over 170ms straight at the cursor, applied after movement resolves so '
        + 'WASD cannot cancel it, slashing everything within 44px of a 96px line for 15 damage — or 30 if '
        + 'a lure bite is still inside its one-second window. The nearest body the blade reached starts '
        + 'drowning: 5 seconds of air, then 12 HP a second until they reach the pool, with the whole '
        + 'thing running 12 seconds before they surface whatever happened. The air pocket is a 48px black '
        + 'puddle at the mirror of their position across the arena, sent to the far corner instead if '
        + 'that would land within 280px of them, because a step is not a run. Touching it refills the bar '
        + 'to 100% outright and resets the tick, as many times as they can get back to it. A miss pays '
        + 'nothing — no damage, no drowning, 🫧 MISSED, and the full 16 seconds gone.',
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
        basics:
          'Damage now costs air: 0.6% of the oxygen bar per point, from any source, so a 50-damage sword '
          + 'fish is 30% of the bar, a 12-point algae trap is 7% and a piranha\'s 3 a second is about 2% a '
          + 'second. It is charged by the size of the hit rather than flat, so a piranha costs a sip and an '
          + 'ultimate costs a third of the bar, and it does nothing once the bar is already empty — which '
          + 'is also why the drown\'s own 12 a second cannot feed itself. 💨 WINDED shows only for hits '
          + 'worth 5% of the bar or more, otherwise a school of piranhas would bury the screen.',
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
      basics:
        'Scatters 12 orbs across the whole playable area — not at the cursor — each healing 12 to '
        + 'whoever gets there first, with no owner check at all: you, them, an ally or an Invasion husk. '
        + 'They are 28px pickups alive for 25 seconds, placed with ten attempts each at staying 80px '
        + 'clear of the others, and a fighter at maximum health walks straight over one and leaves it '
        + 'standing. 20s cooldown.',
      cast: 'R. Instant, no aim — the bloom is placed across the arena, not at the cursor. 20s cooldown.',
      effects: [
        { tag: 'heal', label: 'The orbs', detail: '12 of them, healing 12 each to whoever gets there first — you, them, an ally or an Invasion husk. There is no owner check.' },
        { tag: 'area', label: 'The bloom', detail: '28px pickup radius, alive for 25 seconds, scattered across the whole playable area with ten attempts each at staying 80px clear of the others.' },
        { tag: 'utility', label: 'Full health does not consume one', detail: 'A fighter at maximum health walks straight over a green orb and leaves it standing.' },
      ],
      upgrade: {
        basics:
          'Twelve poisoned orbs are interleaved with the healing ones — 24 on the floor in total — each '
          + 'dealing 18 damage to whoever touches one and then gone. Red is a view rather than a property: '
          + 'the orb is only painted red for the side that planted it, so an online opponent\'s trap arrives '
          + 'on your screen as an ordinary green heal, which is the whole ability. There is no owner check '
          + 'on a red orb either, so walking into your own costs you the same 18, and unlike a green orb it '
          + 'does not care what your health is. The poisoned half is interleaved rather than appended, so a '
          + 'trap that always landed in the leftover corners is not something an opponent can learn to '
          + 'read.',
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
      basics:
        'Casts a line and waits 3 seconds, counted down only on the frames you are actually standing '
        + 'still — walking pauses the line rather than cancelling it — and every instance of damage you '
        + 'take while it is out adds a full second, with a 🎣 +1s to say so. F again throws the catch at '
        + 'the cursor as a recast rather than a second cast, so it does not touch the cooldown. The '
        + 'ability bar shows the line coming in rather than a cooldown, and sits full while a catch is in '
        + 'your jaw. 10s cooldown.',
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
        basics:
          'Holding F for half a second on a landed catch gives it up as bait — and because a tap still '
          + 'throws, the throw moves to the key release, so there is no way on the press to know which of '
          + 'the two it will be. The bait is spent by the next catch, which is drawn from the rare table '
          + 'instead of the common one. The wait, the cooldown and the standing-still are all unchanged.',
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
      basics:
        'Sends a shark from 150px behind you at 780 px/s along your aim until its mouth leaves the '
        + 'arena, swallowing anything within 62px of the mouth — which runs 88px ahead of its centre — '
        + 'with no limit on how many. Everything held takes 8 HP a second for 8 seconds with their bodies '
        + 'written to the mouth position every frame, so they do not get to walk out, and all of them are '
        + 'dropped in the dead centre of the arena at a random 26px offset when the time is up. A shark '
        + 'that caught nobody still beaches, but holds for only 1.4 seconds, just long enough to be seen '
        + 'leaving. The ability bar shows the shark\'s eight seconds rather than the cooldown. One per '
        + 'side. 50s cooldown.',
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
        basics:
          'The shark steers: 120 px/s toward the cursor for the whole eight seconds, clamped 40px inside '
          + 'the walls, turning to face where it is going. And it grinds — 30 damage per orb it eats to '
          + 'every fighter in its mouth, taking any orb within 62px and destroying it. Colour is irrelevant '
          + 'because the damage is the grinding rather than the algae, so your own healing bloom is '
          + 'ammunition: with a full 24-orb Algae Trap on the floor that is a theoretical 720 damage on one '
          + 'held body.',
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

  mastery: {
    'camo-fade': {
      basics:
        'A second fade that rises to full over 6 seconds and runs whether you are moving, dashing or '
        + 'standing, independent of the Anglerfish fade — whichever has taken more of you is what is '
        + 'painted. At full it takes your sprite to zero alpha, hides the health bar past 85%, and '
        + 'suppresses every effect this kit draws at the source, though damage numbers and hit flashes '
        + 'belong to the arena and still appear on whoever you hit. Bots cannot fight it: a fully faded '
        + 'angler is fed to the AI as an invisible target, so it stops its rotation entirely and ambles '
        + 'at 80% speed in random 0.6–1.2s bursts. Any single hit worth more than 5 damage in one frame '
        + 'resets the whole 6 seconds, while chip damage never does — a piranha billing 3 a second, a '
        + '2-point burn tick or a barb will not strip it. The Anglerfish lure is refused while the '
        + 'camouflage is complete, because one is a light and the other is the absence of one. An algae '
        + 'orb you walk into while hidden still heals you 12 but is not consumed: it turns poisoned, red '
        + 'on your screen only, and stays on the floor with a fresh 25 seconds, refusing to feed you '
        + 'again for 4 seconds. And a line that lands while hidden pulls from a longer table — the '
        + 'lionfish joins the five common catches and the skele-fish the five rare ones, neither of which '
        + 'exists at all for an angler who can be seen.',
      cast: 'Always on with Depths Mastery. Six seconds of not being hit for more than 5 by any one thing.',
      effects: [
        { tag: 'utility', label: 'The fade', detail: 'Rises to full over 6 seconds and runs whether you are moving, dashing or standing. Independent of the Anglerfish fade — whichever has taken more of you is what is painted.' },
        { tag: 'utility', label: 'What is hidden', detail: 'Sprite alpha to 0, health bar off past 85%, and past the top of the fade every effect this kit draws is suppressed at the source. Damage numbers and hit flashes are the arena\'s, not the element\'s, and still appear on whoever you hit.' },
        { tag: 'buff', label: 'Bots cannot fight you', detail: 'A fully faded angler is fed to the AI as an invisible target: it stops its rotation entirely and ambles at 80% speed in random 0.6–1.2s bursts, exactly as it does against Silence stealth.' },
        { tag: 'cost', label: 'What breaks it', detail: 'Any single hit worth more than 5 damage in one frame resets the whole 6 seconds. Chip damage does not — a piranha billing 3 a second, a 2-point burn tick or a barb will never strip it.' },
        { tag: 'utility', label: 'The lure goes out', detail: 'The Anglerfish orb is refused while the camouflage is complete. The two passives are exclusive at the top end: one is a light, the other is the absence of one.' },
        { tag: 'summon', label: 'Spoiled blooms', detail: 'An algae orb you walk into while hidden still heals you 12, but is not consumed — it turns poisoned (18 damage, red on your screen only) and stays on the floor with a fresh 25s life. It refuses to feed you again for 4 seconds so you are not standing in your own trap.' },
        { tag: 'utility', label: 'Two more fish', detail: 'A line that lands while you are hidden pulls from a longer table: the lionfish joins the five common catches, and the skele-fish joins the five rare ones. Neither exists at all for an angler who can be seen.' },
      ],
      variants: {
        label: 'The two catches only a hidden angler ever lands',
        variants: [
          {
            emoji: '🦂',
            name: 'Lionfish — common catch, no bait needed',
            description: 'It is not thrown: the fish comes apart where you stand and sheds 15 poison barbs, which drift out of the burst and then hang in the water for 7 seconds. Each one is 2 damage, 3 HP/s of poison for 5 seconds, and 15% off everything the victim deals for 5 seconds. Fifteen of them is a field you have made expensive to walk into rather than a shot you have to land.',
          },
          {
            emoji: '💀',
            name: 'Skele-Fish — rare catch, needs bait',
            description: 'Thrown, it gets up: 50 health, 12 seconds, 270 px/s, homing on whoever is nearest and biting for 15 once a second. Only enemy projectiles can put damage into it — melee, auras and area damage pass straight through a set of bones — and a Lungfish Strike that passes over one of your own eats it for 50 health, with the strike still running in full so the drowning is not given up for the meal.',
            requiresUpgrade: 'f',
          },
        ],
      },
      notes: [
        'The threshold is what makes this a real passive rather than a coin flip. Every element in the game does chip damage; almost none of them can put 6 points into one frame at range without committing to something. The counterplay is "land something", not "touch them".',
        'Being hidden and standing still are two different things, and the two fades stack in the sense that they cannot uncover you: an angler who is camouflaged and then stops moving is not somehow more visible for it.',
        'A spoiled bloom is the only trap in the element you get for free. Eutrophication\'s own red half needs the R+ upgrade bought; this one only needs you to be invisible when you walk over a green one, including one the enemy planted.',
        'The bot half is real. A Nightmare Depths bot fades exactly as you do, walks its own bloom to poison it, and casts its line from far closer once it is gone — and its avatar shows the mastered rig the whole time, which is your only warning.',
        'The water still makes a noise. Sound is deliberately not suppressed: an opponent who is listening can hear the splash of a line being cast, which is the one tell left.',
      ],
    },
    'release-the-kraken': {
      basics:
        'A bindable kraken planted at the cursor, clamped 40px inside the walls, standing 25 seconds '
        + 'and never moving; casting again while one is out replaces it. Each of its three arms takes the '
        + 'first enemy within 132px of the mantle and holds them for 2 seconds with velocity pinned to '
        + 'zero and unable to act — the same hard stun Earth\'s pillars apply. An arm will not take a body '
        + 'another arm already has, so the hold is never more than 2 seconds at once, but all three in '
        + 'sequence is up to 6 seconds of somebody standing still. An arm that has had its turn is spent '
        + 'and stays a stump, and a kraken with nothing left is a beak that watches — unless you feed it: '
        + 'throwing any fish at it, resolved as a feed inside 76px of the beak, grows every stump back at '
        + 'once, and every catch counts including the catfish, the lionfish and the skele-fish, none of '
        + 'which fly. Anything Unstoppable is ignored entirely, and a body already held elsewhere is '
        + 'skipped rather than fought over. Bindable to E, R or Q, never F. 35s cooldown.',
      cast: 'The bound key (E, R or Q — never F). Placed at the cursor, clamped 40px inside the walls. 35 second cooldown; the ability card shows the kraken\'s own 25 seconds first and the cooldown afterwards.',
      effects: [
        { tag: 'summon', label: 'The kraken', detail: 'One per side, at the cursor, for 25 seconds. Casting again while one is out replaces it. It never moves.' },
        { tag: 'control', label: 'The grab', detail: 'An arm takes the first enemy within 132px of the mantle and holds them for 2 seconds — velocity pinned to zero and unable to act, the same hard stun Earth\'s pillars apply.' },
        { tag: 'control', label: 'One grip at a time', detail: 'An arm will not take a body another arm already has, so the hold is never more than 2 seconds at once. As each arm lets go the next may take its turn, so all three in sequence is up to 6 seconds of somebody standing still.' },
        { tag: 'resource', label: 'Three arms, then stumps', detail: 'An arm that has had its turn is spent, and stays a stump. A kraken with nothing left is a beak that watches.' },
        { tag: 'resource', label: 'Feeding it', detail: 'Throw any fish at the kraken instead of at them — the throw resolves as a feed inside 76px of the beak — and every stump grows back at once. Every catch counts, including the catfish, the lionfish and the skele-fish, none of which fly.' },
        { tag: 'utility', label: 'What it will not take', detail: 'Anything Unstoppable is ignored entirely, and a body already held elsewhere is skipped rather than fought over.' },
      ],
      notes: [
        'The arms are the ability and the fish are its upkeep, which is why this cannot be bound over F. Six seconds of stun once every 35 is a fair rate; six seconds every 35 *plus* every time you land a catch is what the loadout is actually for.',
        'Two seconds is exactly long enough to walk a Lungfish Strike into somebody, and the strike is the only thing in the element that starts a drowning. That is the combination the kraken exists to buy, and the bot plays it deliberately.',
        'It does not drag. A grabbed fighter stays where the arm found them, which means the kraken never posts anybody through a wall and never rescues them out of a hazard they were already standing in.',
        'Placement is the whole skill. It cannot follow, so a kraken dropped where they are is worth nothing by the time it surfaces — drop it where they are going, or on the air pocket a drowning enemy has to run to.',
        'Spikes of Ruin razes it like any other structure, along with any skele-fish caught in the ring. Everything else Depths puts on the water — barbs, algae, fish in flight, the Megalodon — is a hazard rather than a building, and survives.',
      ],
    },
  },
};

export default depths;
