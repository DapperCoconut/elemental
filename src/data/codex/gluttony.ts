import { ElementCodex } from '../AbilityCodex';

/**
 * Gluttony — a chef with a larder, and the thing the chef becomes when the larder runs out.
 *
 * Verified against `src/elements/gluttony.ts` and `kits/GluttonyKit.ts`; the food table is
 * `FOOD` in `kits/GluttonyVisuals.ts`. Gluttony has no perks. The ability list is ten entries —
 * 0–4 the chef, 5–9 the butcher — and F is the door between them in both directions, which is
 * also why the mastery below refuses to be bound over it.
 *
 * Its five shop upgrades are the only ones in the game that buy two abilities each, because a
 * Gluttony slot *is* two abilities. Every `upgrade` block below therefore documents one half of
 * one purchase: the chef entries carry the kitchen half and the butcher entries carry what the
 * same coin does once the toque is off. Buying "Cleave" changes both the thrown knife and the
 * swung one, and neither card tells the whole story on its own.
 */
const gluttony: ElementCodex = {
  identity:
    'Almost nothing in the chef\'s half of Gluttony does damage. You dig ingredients out of the '
    + 'ground, throw them onto the grill in the middle of the arena, walk back over it to collect '
    + 'them cooked at double value, and keep six of them on a strip along the top of the screen — '
    + 'and the whole time the only weapon you have is one knife, which is worth 25 cold and 35 if '
    + 'you stood over the coals for two seconds first. Then there is the other half. Special '
    + 'Ingredient replaces all five keys, and for thirty seconds damage stops touching your health '
    + 'at all: it comes off a hunger bar that only eating can refill. Everything you cooked in the '
    + 'first half of the fight is what keeps you alive in the second, and the ultimate is worth '
    + 'exactly as much as the larder you fed it.',

  passives: [
    {
      emoji: '🍄',
      name: 'The Larder',
      basics:
        'The ingredient table. Carrot 🥕 heals 10 raw and 20 cooked, taking 5 seconds on the grate and '
        + 'worth 3 seconds of butcher form. Mushroom 🍄 is 15/30, 10 seconds, 5 seconds. Potato 🥔 is '
        + '20/40, 12 seconds, 8 seconds. Meat 🍖 is 20/50, 15 seconds, 15 seconds — and Forage never '
        + 'turns it up, it only comes off a skewer. Right-click eats whatever is in your hand, wherever '
        + 'you are standing, with no cast time and no cooldown. The rat\'s three are separate: bread '
        + '30/60, cheese 25/45 and pie 30/60 with +20% speed for 8s, none of which can be foraged or '
        + 'grilled — they only come out of the hole in exchange for something cooked.',
      effects: [
        { tag: 'heal', label: 'Carrot 🥕', detail: 'Heals 10 raw, 20 cooked. 5 seconds on the grate, and 3 seconds of butcher form eaten.' },
        { tag: 'heal', label: 'Mushroom 🍄', detail: 'Heals 15 raw, 30 cooked. 10 seconds on the grate, 5 seconds of butcher form.' },
        { tag: 'heal', label: 'Potato 🥔', detail: 'Heals 20 raw, 40 cooked. 12 seconds on the grate, 8 seconds of butcher form.' },
        { tag: 'heal', label: 'Meat 🍖', detail: 'Heals 20 raw, 50 cooked. 15 seconds on the grate, 15 seconds of butcher form. Forage never turns it up — it only comes off a skewer.' },
        { tag: 'utility', label: 'Eating', detail: 'Right-click eats whatever is in your hand, wherever you are standing. There is no cast time and no cooldown on it.' },
        { tag: 'heal', label: 'The rat\'s three 🍞🧀🥧', requiresMastery: true, detail: 'Bread 30/60, cheese 25/45, pie 30/60 with +20% speed for 8s. Nothing forages them and the grill never makes one — they only come back out of the hole in exchange for something cooked. See Chef\'s Friend.' },
      ],
      notes: [
        'Cooked meat is 50 HP off one right-click, which is the largest single heal in the element by a distance — and the only way to get it is to skewer somebody in butcher form and then cook the piece you took.',
        'Ingredients dropped on the floor belong to whoever dropped them. Nobody can pick up anybody else\'s.',
      ],
    },
    {
      emoji: '🔥',
      name: 'The Grill',
      form: 0,
      basics:
        'Four slots, and only raw ingredients cook — a cooked one thrown at it bounces off onto the '
        + 'floor, as does anything thrown at a full grate. Cooking takes 5 seconds for a carrot, 10 for a '
        + 'mushroom, 12 for a potato and 15 for a cut of meat, at double speed for the 6 seconds after '
        + 'charcoal lands. Standing within 66px in chef form with an empty hand heats the blade in 2 '
        + 'seconds — 1 while superheated — and a heated blade throws for 35 instead of 25. Collection is '
        + 'automatic: walk within 66px and everything of yours that has finished goes onto the strip. '
        + 'While the maw is out none of this works, for either fighter: nothing cooks, charcoal will not '
        + 'fuel it, nothing can be collected and no blade can be heated.',
      effects: [
        { tag: 'utility', label: 'The grate', detail: '4 slots. Only raw ingredients cook — a cooked one thrown at it bounces off onto the floor, and so does anything thrown at a full grate.' },
        { tag: 'resource', label: 'Cooking', detail: '5 seconds for a carrot, 10 for a mushroom, 12 for a potato, 15 for a cut of meat. Double speed for the 6 seconds after charcoal lands on it.' },
        { tag: 'buff', label: 'Heating the blade', detail: 'Standing within 66px of it in chef form with nothing in your hand fills the heat bar in 2 seconds — 1 second superheated. A heated blade throws for 35 instead of 25.' },
        { tag: 'utility', label: 'Collecting', detail: 'Walk within 66px and everything of yours that has finished goes straight onto the strip. It is not a button.' },
        { tag: 'cost', label: 'While the maw is out', detail: 'Nothing cooks, charcoal will not fuel it, nothing can be collected off it and no blade can be heated — for whoever is playing Gluttony *and* their opponent.' },
      ],
      notes: [
        'The grate is shared but its contents are not: everything on it remembers who put it there, and only they can take it off.',
        'The blade heats only with an empty hand. Carrying an ingredient stops the bar dead where it is — the heat is not lost, it just stops filling.',
        'Both fighters can use the same grill in a Gluttony mirror, and the four slots are first come, first served.',
      ],
    },
    {
      emoji: '📦',
      name: 'The Prep Strip',
      form: 0,
      basics:
        'Six slots for ingredients; a seventh cannot be stowed and Forage drops it at your feet with '
        + '"📦 STRIP FULL". Clicking a tile puts that ingredient in your hand instead of the knife, and '
        + 'clicking it again, clicking an empty tile or clicking the knife tile puts the blade back. What '
        + 'your click throws follows: food at 540 px/s while you are holding food, the knife while you '
        + 'are holding nothing. A cooked item carries a green pip in the corner of its tile, and the '
        + 'knife tile carries its own heat bar along the bottom.',
      effects: [
        { tag: 'utility', label: 'Six slots', detail: 'A seventh ingredient cannot be stowed: Forage drops it at your feet instead and says "📦 STRIP FULL".' },
        { tag: 'utility', label: 'Picking up', detail: 'Clicking a tile puts that ingredient in your hand instead of the knife. Clicking it again, clicking an empty tile, or clicking the knife tile puts the blade back.' },
        { tag: 'utility', label: 'What the click does', detail: 'Holding food, your click throws the food (540 px/s) rather than the knife. Holding nothing, it throws the knife.' },
        { tag: 'utility', label: 'Reading it', detail: 'A cooked item carries a green pip in the corner of its tile; the knife tile carries its own heat bar along the bottom.' },
      ],
      notes: [
        'Clicking a tile is swallowed by the strip — it never also throws what you were holding, which is why picking something up is safe mid-fight.',
        'The strip survives the transformation. Everything you cooked as the chef is still there for the butcher to eat, and that is the whole design.',
      ],
    },
    {
      emoji: '👄',
      name: 'The Maw',
      form: 1,
      basics:
        'While anybody is in butcher form the grill is a mouth instead. It spits a gobbet at the '
        + 'nearest enemy once a second for 5 damage, at 390 px/s, dying on a body or a wall — 10 a shot '
        + 'for 6 seconds after a Cannibalize connects. It belongs to whoever is transformed, with the '
        + 'player winning the tie in a Gluttony mirror. And it is not a grill while it is a maw: no '
        + 'cooking, no collecting, no fuel and no heating a blade, for either fighter.',
      effects: [
        { tag: 'damage', label: 'Spat meat', detail: '5 damage every second at the nearest enemy, from wherever the maw is. 390 px/s, dying on a body or a wall.' },
        { tag: 'damage', label: 'Frenzy', detail: '10 a shot instead of 5 for 6 seconds after a Cannibalize connects.' },
        { tag: 'utility', label: 'Whose it is', detail: 'Whoever is in butcher form. In a Gluttony mirror where both are transformed, the player wins the tie.' },
        { tag: 'cost', label: 'The kitchen closes', detail: 'While it is a maw it is not a grill: no cooking, no collecting, no fuel, no heating a blade — for either fighter.' },
      ],
      notes: [
        'The maw is free damage nobody has to aim, and it is the reason butcher form is worth entering even with nothing to eat.',
        'It sits on the grill until Maw Awakening lets it off the floor; the rest of the time it is a turret with a one-second cycle.',
        'It goes back to being a grill the instant the form ends, taking any frenzy and any awakening with it.',
      ],
    },
    {
      emoji: '🔴',
      name: 'The Hunger Bar',
      form: 1,
      basics:
        'Butcher form\'s health. Every point of damage aimed at you takes 0.2 seconds off the bar '
        + 'instead of your health, so a full 30-second bar is 150 damage of buffer on top of your '
        + 'untouched health — but it also runs down in real time, so standing perfectly still and being '
        + 'hit by nothing still ends the form in 30 seconds. Eating puts time back: 3 seconds a carrot, 5 '
        + 'a mushroom, 8 a potato, 15 a cut of meat, and it still heals you for the item\'s full value on '
        + 'top; a Cannibalize that lands is 3 more. The bar sits ahead of every shield layer, so shield '
        + 'charges, shield HP and clotted HP are not spent while you are the butcher — they are simply '
        + 'not consulted. Armour still counts, because the figure charged to the bar is the damage after '
        + 'every multiplier.',
      effects: [
        { tag: 'shield', label: 'Damage as time', detail: '0.2 seconds off the bar per point of damage — a full 30-second bar is 150 damage of buffer on top of your untouched health.' },
        { tag: 'cost', label: 'The clock', detail: 'It also runs down in real time. Standing perfectly still and being hit by nothing still ends the form in 30 seconds.' },
        { tag: 'heal', label: 'Feeding it', detail: '3 seconds a carrot, 5 a mushroom, 8 a potato, 15 a cut of meat — and eating still heals you for the item\'s full value on top. A Cannibalize that lands is 3 more.' },
        { tag: 'shield', label: 'Nothing gets past it', detail: 'It is installed on the fighter ahead of every shield layer, so shield charges, shield HP and clotted HP are not spent while you are the butcher. They are simply not consulted.' },
        { tag: 'utility', label: 'Armour still counts', detail: 'The figure charged to the bar is the damage *after* every armour and vulnerability multiplier, so a 25% damage reduction is 25% less time off the clock.' },
      ],
      notes: [
        'Piercing damage skips damage absorbers entirely, so anything flagged as a pierce goes straight past the hunger bar and into your health.',
        'Invincibility is checked before the bar, so a frame you cannot be hurt on costs you nothing.',
        'Running the bar to zero prints "🍽️ STARVED" and reverts you. There is no penalty beyond being a chef again with the 45-second cooldown already spent.',
      ],
    },
  ],

  abilities: {
    // ── Chef ────────────────────────────────────────────────────────
    'glut-knife': {
      basics:
        'Throws whatever the prep strip has put in your hand. Empty-handed that is the cleaver: 25 '
        + 'damage at 780 px/s with a 22px hitbox and 1.5 seconds of life, dying on the first body — or 35 '
        + 'red hot, once the heat bar is full, which throwing spends, or 53 against anything Charcoal '
        + 'Chuck has burnt in the last 8 seconds. Heating takes 2 seconds within 66px of the grill with '
        + 'an empty hand, or 1 while the coals are superheated. Holding food it throws that instead, at '
        + '540 px/s for 1.3 seconds: landing within 42px of the grill centre puts it on the grate if '
        + 'there is a free slot and it is still raw, hitting a body deals 3 and drops the ingredient '
        + 'beside them, and a miss leaves it on the floor for 30 seconds. 1.25s between throws.',
      cast: 'Click, aimed at the cursor. 1.25s between throws. What it throws is whatever the prep strip has in your hand.',
      effects: [
        { tag: 'damage', label: 'Cold blade', detail: '25 damage. 780 px/s, 1.5 seconds of life, a 22px hitbox, dying on the first body it touches.' },
        { tag: 'damage', label: 'Red hot', detail: '35 damage instead, once the heat bar is full. Throwing it spends the heat — the next knife comes out of the block cold.' },
        { tag: 'damage', label: 'Seared', detail: '53 damage: a heated blade does half again as much to anything Charcoal Chuck has burnt in the last 8 seconds.' },
        { tag: 'resource', label: 'Heating it', detail: '2 seconds standing within 66px of the grill with nothing in your hand — 1 second while the coals are superheated.' },
        { tag: 'utility', label: 'Throwing food instead', detail: '540 px/s, 1.3 seconds of life. Landing within 42px of the grill centre puts it on the grate if there is a free slot and it is still raw.' },
        { tag: 'damage', label: 'Hit by a potato', detail: '3 damage to a body it hits on the way, and the ingredient lands on the floor beside them for you to walk over.' },
        { tag: 'utility', label: 'A miss', detail: 'Food that hits a wall, times out, or bounces off a full grate lands on the floor and waits 30 seconds to be picked back up.' },
      ],
      notes: [
        'A cold knife is a cold knife whatever the target has been through: the Burnt bonus only applies to a heated blade.',
        'Only raw food cooks. Throwing something already cooked at the grate bounces it onto the floor, so there is no way to double-cook anything.',
        'Dropped food remembers whose it was — the enemy cannot pick up what you spill, and you cannot pick up theirs.',
        'The knife tile\'s heat bar keeps its charge while you are carrying an ingredient; it just stops filling until your hand is empty again.',
      ],
      upgrade: {
        basics:
          'The throw pierces — 25, or 35 red, to every enemy in its line, once each, for the full 1.5 '
          + 'seconds of flight — and the heat stops being a charge and becomes a 4-second clock. Throwing '
          + 'no longer spends it, so one trip to the coals is worth every throw you fit into those 4 '
          + 'seconds. A cleaver already in flight goes cold mid-flight when the clock runs out, and cold '
          + 'when thrown counts as cold on arrival. The blade tile\'s bar flips meaning: filling orange '
          + 'while you heat, then draining pale from full as the seconds run down.',
        effects: [
          { tag: 'damage', label: 'Straight through', requiresUpgrade: 'click', detail: 'The throw pierces: 25 (or 35 red) to every enemy in its line, once each, for the full 1.5 seconds of flight.' },
          { tag: 'buff', label: 'The heat holds', requiresUpgrade: 'click', detail: 'Filling the heat bar arms a 4-second clock instead of a charge. Throwing no longer spends it, so one trip to the coals is worth every throw you fit into those 4 seconds.' },
          { tag: 'utility', label: 'Hot in the air', requiresUpgrade: 'click', detail: 'A cleaver already in flight goes cold mid-flight when the clock runs out, and cold when thrown counts as cold on arrival.' },
          { tag: 'utility', label: 'Reading it', requiresUpgrade: 'click', detail: 'The blade tile\'s bar flips meaning: filling orange while you heat, then draining pale from full as the 4 seconds run down.' },
        ],
      },
    },

    'glut-forage': {
      basics:
        'Two seconds of digging at ×0.5 move speed with your head down — you can still walk and nothing '
        + 'interrupts it — turning up one of mushroom, carrot or potato, evenly, and never meat. Raw they '
        + 'heal 15, 10 and 20; cooked, 30, 20 and 40. With all six strip slots taken it still comes out '
        + 'of the ground and simply lands at your feet as a drop, with "📦 STRIP FULL". 6s cooldown.',
      cast: 'E, no aim. 2 seconds of channelling at half move speed — you can still walk, and nothing interrupts it. 6s cooldown.',
      effects: [
        { tag: 'cost', label: 'The dig', detail: '2 seconds at ×0.5 move speed, head down, with a status entry counting it out.' },
        { tag: 'resource', label: 'What comes up', detail: 'One of mushroom, carrot or potato, evenly — a third each. Never meat.' },
        { tag: 'heal', label: 'What it is worth', detail: 'Raw: 15 for a mushroom, 10 for a carrot, 20 for a potato. Cooked: 30, 20 and 40.' },
        { tag: 'utility', label: 'A full strip', detail: 'With all six slots taken it still comes out of the ground — it just lands at your feet as a drop, with "📦 STRIP FULL".' },
      ],
      notes: [
        'This is the only source of ingredients the chef has. Every heal, every second of butcher form and every ounce of the two ultimates ultimately comes out of this button.',
        'Six seconds of cooldown against two seconds of digging means a strip can be filled from empty in about 40 seconds of doing nothing else.',
        'The half-speed window is the real cost, and it is why foraging next to the grill — where you also heat the blade and collect the grate — is worth the crowding.',
      ],
      upgrade: {
        basics:
          'The table widens from three entries to seven: the original three plus Bristle Berries, Winter '
          + 'Mint, Pineapple and Death Cap, six weighted 1 and the Death Cap 0.34 — roughly one dig in '
          + 'twenty. 🫐 Bristle Berries heal 5 and give +20% outgoing damage for 8s raw, or 12 and +35% '
          + 'after 5 seconds on the grate. 🍃 Winter Mint heals 10% of your maximum HP and −20% damage '
          + 'taken for 8s raw, and cooking it — only 2 seconds, so it is easy to do by accident — drops it '
          + 'to 1% and no buff at all. 🍍 Pineapple is 30 raw and 50 cooked with no buff either way, on a '
          + '20-second cook, the second longest in the element. ☠️ Death Cap costs you 30 HP raw for +25% '
          + 'walk speed for 8s, and 25 seconds on the grate turns that into a 50 heal and +35% — the '
          + 'biggest swing any ingredient makes. In butcher seconds they are worth 2, 3, 10 and 12.',
        effects: [
          { tag: 'resource', label: 'The wider table', requiresUpgrade: 'e', detail: 'Seven entries: the original three plus Bristle Berries, Winter Mint, Pineapple and Death Cap. Six are weighted 1 and the Death Cap 0.34 — roughly one dig in twenty.' },
          { tag: 'buff', label: 'Bristle Berries 🫐', requiresUpgrade: 'e', detail: 'Heals 5 and +20% outgoing damage for 8s raw. 5 seconds on the grate makes it 12 and +35%.' },
          { tag: 'buff', label: 'Winter Mint 🍃', requiresUpgrade: 'e', detail: 'Heals 10% of your max HP and −20% damage taken for 8s raw. Cooking it — only 2 seconds, so it is easy to do by accident — drops it to 1% and no buff at all.' },
          { tag: 'heal', label: 'Pineapple 🍍', requiresUpgrade: 'e', detail: '30 raw, 50 cooked, no buff either way. 20 seconds on the grate, the second longest cook in the element.' },
          { tag: 'heal', label: 'Death Cap ☠️', requiresUpgrade: 'e', detail: 'Raw it costs you 30 HP and gives +25% walk speed for 8s. 25 seconds on the grate turns that into a 50 heal and +35% for 8s — the single biggest swing any ingredient makes.' },
          { tag: 'resource', label: 'Feeding the bar', requiresUpgrade: 'e', detail: 'Butcher seconds: 2 a berry, 3 a mint, 10 a pineapple, 12 a Death Cap.' },
        ],
      },
    },

    'glut-charcoal': {
      basics:
        'Throws a coal at the cursor: 15 damage on a body at 560 px/s with a 24px hitbox and 1.9 '
        + 'seconds of life, leaving them Burnt for 8 seconds, during which a heated kitchen knife deals '
        + '50% more — 53 instead of 35. Landed within 45px of the grill centre it superheats the coals '
        + 'for 6 seconds instead: everything on the grate cooks at double rate and the blade heats in 1 '
        + 'second rather than 2. The grill\'s catch radius is deliberately bigger than a person, because '
        + 'this is the throw you make under pressure. 12s cooldown, the longest of the chef\'s five.',
      cast: 'R, at the cursor. 12s cooldown — the longest of the chef\'s five.',
      effects: [
        { tag: 'damage', label: 'On a body', detail: '15 damage. 560 px/s, 1.9 seconds of life, 24px hitbox.' },
        { tag: 'debuff', label: 'Burnt', detail: '8 seconds. A heated kitchen knife does 50% more to them for the whole window — 53 instead of 35.' },
        { tag: 'buff', label: 'On the grill', detail: 'Superheated for 6 seconds: everything on the grate cooks at double rate and the blade heats in 1 second instead of 2.' },
        { tag: 'area', label: 'The grill\'s catch', detail: 'Within 45px of the grill centre — a bigger target than a person, because this is the throw you make under pressure.' },
      ],
      notes: [
        'The combination is the point: charcoal on a body, then a blade off the coals, is 53 damage from a chef who has otherwise done nothing but garden.',
        'A maw does not take charcoal. While anybody is transformed the coal flies straight through where the grill was and behaves as an ordinary burn throw.',
        'Superheat is a property of the grill, not of a side. Fuel you throw speeds up an enemy Gluttony\'s cooking too.',
      ],
      upgrade: {
        basics:
          'Superheat runs at ×3 rather than ×2 for its 6 seconds — a potato in 4 seconds instead of 6, a '
          + 'blade in 0.67 instead of 1 — and cooked food keeps taking heat for another 50% of its own cook '
          + 'time (2.5s a carrot, 6s a potato, 7.5s a cut of meat) to become over-seared: +25% healing '
          + 'rounded, so a cooked potato goes 40 → 50 and a cut of meat 50 → 63, and +3 seconds on the '
          + 'food\'s own buff, so over-seared Bristle Berries are +35% damage for 11 seconds. Collection is '
          + 'still automatic within 66px, so an over-sear costs you the walk — standing at your own kitchen '
          + 'through the second pass takes the item as merely cooked. The ember ring fills and the item '
          + 'turns cooked, then the ring restarts from empty in blue with a second blue ring outside it, '
          + 'going green when the over-sear lands.',
        effects: [
          { tag: 'buff', label: 'Blue coals', requiresUpgrade: 'r', detail: 'Superheat runs at ×3 instead of ×2 for its 6 seconds: a potato in 4s instead of 6, and a blade heated in 0.67s instead of 1.' },
          { tag: 'buff', label: 'The second pass', requiresUpgrade: 'r', detail: 'A cooked item keeps taking heat for another 50% of its own cook time — 2.5s a carrot, 6s a potato, 7.5s a cut of meat — and becomes over-seared at the end of it.' },
          { tag: 'heal', label: 'What it is worth', requiresUpgrade: 'r', detail: '+25% healing, rounded: a cooked potato goes 40 → 50, a cooked cut of meat 50 → 63, a cooked Death Cap 50 → 63.' },
          { tag: 'buff', label: 'And longer', requiresUpgrade: 'r', detail: '+3 seconds on the food\'s own buff, so over-seared Bristle Berries are +35% damage for 11 seconds rather than 8.' },
          { tag: 'cost', label: 'The choice', requiresUpgrade: 'r', detail: 'Collection is still automatic within 66px of the grill, so an over-sear costs you the walk: standing at your own kitchen through the second pass takes the item as cooked instead.' },
          { tag: 'utility', label: 'Reading the grate', requiresUpgrade: 'r', detail: 'The ember ring fills and the item turns cooked; then the ring restarts from empty in blue, with a second blue ring outside it, and goes green when the over-sear lands.' },
        ],
      },
    },

    'glut-butcher': {
      basics:
        'Transforms you into the butcher for up to 30 seconds. Every point of damage aimed at you takes '
        + '0.2 seconds off the hunger bar instead of your health — 150 damage of buffer if nothing else '
        + 'touches you — but the bar also drains in real time, so doing nothing at all still ends it in '
        + '30 seconds. The tray becomes Cleave, Poach, Cannibalize, Return and Maw Awakening, and the '
        + 'chef\'s five are unreachable until you change back. Your grill becomes a mouth that spits 5 '
        + 'damage a second at your enemy and stops being usable as a grill by anybody. Eating still heals '
        + 'you in full and puts time back on the bar: 3s a carrot, 5s a mushroom, 8s a potato, 15s a cut '
        + 'of meat. 45s cooldown, the longest in the element; it ends on Return or when the bar empties.',
      cast: 'F. 45s cooldown, the longest in the element. Ends on Return, or on its own when the bar empties.',
      effects: [
        { tag: 'shield', label: 'The hunger bar', detail: '30 seconds, and every point of damage aimed at you takes 0.2s off it instead of your health — 150 damage of buffer if nothing else touches you.' },
        { tag: 'cost', label: 'The clock', detail: 'It also drains in real time. Doing nothing at all still ends the form in 30 seconds.' },
        { tag: 'utility', label: 'A different five', detail: 'The tray becomes Cleave, Poach, Cannibalize, Return and Maw Awakening. The chef\'s five are unreachable until you change back.' },
        { tag: 'summon', label: 'The maw', detail: 'The grill becomes a mouth that spits 5 damage a second at your enemy, and stops being usable as a grill by anybody.' },
        { tag: 'heal', label: 'Feeding it', detail: 'Eating still heals you in full and puts time back on the bar: 3s a carrot, 5s a mushroom, 8s a potato, 15s a cut of meat.' },
      ],
      notes: [
        'Shields are not consulted while the bar is up — the absorber sits ahead of every shield layer, so nothing you were carrying is spent.',
        'Armour still helps: the figure charged to the bar is the damage after every mitigation multiplier.',
        'Piercing damage skips the bar entirely and lands on your health.',
        'The transformation is not free damage. It buys survivability and a different toolkit; the toolkit is where the damage is.',
      ],
      upgrade: {
        basics:
          'Pressing Return knocks 9 seconds — 20% of 45 — off Special Ingredient\'s running cooldown, once '
          + 'per transformation. A butcher who exits at once is back on F after 36 seconds rather than 45, '
          + 'so short deliberate transformations stop being wasteful.',
        effects: [
          { tag: 'buff', label: 'The refund', requiresUpgrade: 'f', detail: 'Pressing Return knocks 9 seconds — 20% of 45 — off Special Ingredient\'s running cooldown, once per transformation.' },
          { tag: 'utility', label: 'What that means', requiresUpgrade: 'f', detail: 'A butcher who exits at once is back on F after 36 seconds rather than 45, so short deliberate transformations stop being wasteful.' },
        ],
      },
    },

    'glut-feast': {
      basics:
        'Empties the whole strip, anything in your hand included, into a pot: three seconds later '
        + 'everyone on your side is healed for twice the sum of what every item would have healed. Six '
        + 'cooked potatoes is 240 HP into every ally, and every fighter you are not allowed to hurt gets '
        + '100% of that figure rather than a share — one ally or three, they each get all of it. There is '
        + 'no partial Feast, and casting it with nothing on the strip is legal, does nothing, says "🍲 '
        + 'NOTHING IN IT" and spends the 30s cooldown.',
      cast: 'Q. No aim. The strip is emptied at the cast; the healing lands 3 seconds later. Ultimate, 30s cooldown.',
      effects: [
        { tag: 'heal', label: 'The pot', detail: 'Twice the sum of what everything on the strip heals. Six cooked potatoes is 240 HP into every ally.' },
        { tag: 'utility', label: 'The wait', detail: '3 seconds of pot before anything happens, with the swirl drawn over your head the whole time.' },
        { tag: 'heal', label: 'Allies too', detail: 'Every fighter you are not allowed to hurt is healed for the same full figure — 1 ally or 3, they each get 100% of it, not a share.' },
        { tag: 'resource', label: 'The cost', detail: 'The whole strip, including anything you were holding. There is no partial Feast.' },
        { tag: 'utility', label: 'An empty pot', detail: 'Casting it with nothing on the strip is legal, does nothing, says "🍲 NOTHING IN IT" and spends the 30s cooldown.' },
      ],
      notes: [
        'Raw goes in the pot at raw value: six raw carrots is 120, six cooked ones is 240. The pot doubles what it was given, it does not cook it.',
        'The strip is emptied the moment you press it, so a Feast cast to dodge a hit leaves you three seconds with no food and no butcher fuel.',
        'It is a strictly better use of a full strip than eating it item by item — the same food, twice the healing, and it reaches your allies.',
      ],
      upgrade: {
        basics:
          'Two parcels of leftovers are stowed at the cast, with any overflow landing at your feet as a '
          + 'drop. Fresh, each is worth 12% of the Feast\'s own heal — a 240 HP pot leaves two parcels of 29 '
          + '— and after 25 seconds on the strip they rest by themselves and become worth 25% of the pot '
          + 'instead, 60 apiece off the same 240. A parcel tile carries its own rest bar along the bottom, '
          + 'and the parcel opens and starts steaming once it has turned. They are food like anything else: '
          + '4 seconds of butcher form and 1 second of Maw Awakening each, and they will cook on a grate if '
          + 'you would rather over-sear them.',
        effects: [
          { tag: 'resource', label: 'Two parcels', requiresUpgrade: 'q', detail: '2 leftovers stowed at the cast. A full strip means the overflow lands at your feet as a drop instead.' },
          { tag: 'heal', label: 'Fresh', requiresUpgrade: 'q', detail: '12% of the Feast\'s own heal, each. A 240 HP pot leaves two parcels worth 29 apiece.' },
          { tag: 'heal', label: 'Rested', requiresUpgrade: 'q', detail: 'After 25 seconds on the strip they turn by themselves and become worth 25% of the pot instead — 60 apiece off that same 240.' },
          { tag: 'utility', label: 'Reading them', requiresUpgrade: 'q', detail: 'A parcel tile carries its own rest bar along the bottom, and the parcel opens and starts steaming once it has turned.' },
          { tag: 'resource', label: 'And they are food', requiresUpgrade: 'q', detail: '4 seconds of butcher form each, and 1 second of Maw Awakening. They cook on a grate like anything else if you would rather over-sear them.' },
        ],
      },
    },

    // ── Butcher ─────────────────────────────────────────────────────
    'glut-cleave': {
      basics:
        'The butcher\'s click: 30 damage to every enemy inside a 132° fan reaching 110px — 66° either '
        + 'side of your aim, with no falloff and no single-target limit. A swing that catches nothing '
        + 'still draws the arc, in steel rather than blood, and still runs the full 1.25s cooldown.',
      cast: 'Click, aimed at the cursor. 1.25s between swings.',
      effects: [
        { tag: 'damage', label: 'The cut', detail: '30 damage to every enemy inside the arc — no falloff and no single-target limit.' },
        { tag: 'area', label: 'The arc', detail: '110px of reach in a 132° fan: 66° either side of where you are aiming.' },
        { tag: 'utility', label: 'A miss', detail: 'A swing that catches nothing still draws the arc, in steel rather than blood, and still runs the full cooldown.' },
      ],
      notes: [
        'Thirty damage every 1.25 seconds is 24 a second sustained, the highest raw output anywhere in the element — and it is why the butcher walks forward.',
        'The arc is wide enough that two bodies standing anywhere near each other are both in it.',
        'The chef\'s knife throw is on the same 1.25s clock but reaches across the arena for 25. This trades all of that range for six more damage and no travel time.',
      ],
      upgrade: {
        basics:
          'Any swing that connects gives +25% walk speed for 2 seconds, refreshed by the next landed '
          + 'swing rather than stacked — and with a 1.25s cooldown that holds indefinitely while you stay '
          + 'in range. A whiffed arc gives nothing: the speed is the reward for closing, not the tool for '
          + 'closing. It multiplies with a Death Cap\'s +25%/+35% rather than overwriting it, so both at '
          + 'once is ×1.56 or ×1.69.',
        effects: [
          { tag: 'buff', label: 'Carving', requiresUpgrade: 'click', detail: '+25% walk speed for 2 seconds on any swing that connects. Refreshed by the next landed swing rather than stacked, and the cooldown is 1.25s — so it holds indefinitely while you are in range.' },
          { tag: 'cost', label: 'It has to land', requiresUpgrade: 'click', detail: 'A whiffed arc gives nothing. The speed is the reward for closing, not the tool for closing.' },
          { tag: 'utility', label: 'Stacks with the larder', requiresUpgrade: 'click', detail: 'Multiplies with a Death Cap\'s +25%/+35% rather than overwriting it: both at once is ×1.56 or ×1.69 walk speed.' },
        ],
      },
    },

    'glut-poach': {
      basics:
        'Throws a skewer at the cursor that deals 15 damage to every body it passes through, once each, '
        + 'at 720 px/s with a 26px hitbox and no slowing down. The first body it hits loses a cut of '
        + 'meat, which rides the skewer to the wall — one cut a throw however many people it hits. The '
        + 'skewer stays in the wall 22 seconds with meat on it, or 1.8 seconds if it came away with '
        + 'nothing. Raw meat heals 20 and buys 15 seconds of butcher form; cooked, after 15 seconds on '
        + 'the grate, it heals 50. Walk within 48px of the landed skewer to collect it, and a full strip '
        + 'refuses it until you make room. 8s cooldown.',
      cast: 'E, at the cursor. 8s cooldown. The skewer stays in the wall until you walk to it.',
      effects: [
        { tag: 'damage', label: 'The pass', detail: '15 damage to every body it passes through, once each. 720 px/s, 26px hitbox, and it does not slow down.' },
        { tag: 'utility', label: 'The cut', detail: 'The first body it hits loses a piece of meat, which rides the skewer to the wall. Only one cut a throw, however many people it hits.' },
        { tag: 'utility', label: 'In the wall', detail: '22 seconds stuck in the wall with meat on it; 1.8 seconds if it came away with nothing.' },
        { tag: 'heal', label: 'What you get', detail: 'Raw meat heals 20 and buys 15 seconds of butcher form. Cooked — 15 seconds on the grate — it heals 50.' },
        { tag: 'utility', label: 'Collecting it', detail: 'Walk within 48px of the landed skewer. It is not a button, and a full strip refuses it until you make room.' },
      ],
      notes: [
        'The card calls it "the first body it passes through"; the skewer actually deals its 15 to every body in the line. Only the cut of meat is limited to one.',
        'Cooked meat is 50 HP off a right-click, the biggest single heal Gluttony has, and this is the only way to get any.',
        'The meat has to be carried back to the kitchen, cooked for 15 seconds and collected — three separate trips across the arena, started in a form that is on a 30-second clock.',
      ],
      upgrade: {
        basics:
          'The maw grows rot slots. Holding an ingredient, the butcher\'s click throws it instead of '
          + 'swinging, and landing it within 42px of the maw puts it on one of 4 teeth to spoil for a flat '
          + '6 seconds — no heat involved and superheat does nothing to it — after which walking within '
          + '66px takes it back. A thrown rotten item deals what the cooked version would have healed: 20 a '
          + 'carrot, 30 a mushroom, 40 a potato, 50 a cut of meat, 50 a Death Cap, 50 a pineapple, 12 a '
          + 'berry. Rotten Winter Mint is the exception, priced off the target at 15% of their maximum '
          + 'health. Eaten, a rotten item heals half what the raw one would, rounded — and a rotten Death '
          + 'Cap still costs you 15, because half of −30 is still a mushroom that wants you dead. When the '
          + 'form ends the maw becomes a grill again and everything on the teeth falls onto the floor as '
          + 'drops, spoiled or not.',
        effects: [
          { tag: 'utility', label: 'Loading it', requiresUpgrade: 'e', detail: 'Holding an ingredient, the butcher\'s click throws it instead of swinging. Landing it within 42px of the maw puts it on one of 4 rot slots.' },
          { tag: 'resource', label: 'Spoiling', requiresUpgrade: 'e', detail: '6 seconds flat, whatever it is — no heat involved, and superheat does nothing to it. Walk within 66px of the maw to take it back.' },
          { tag: 'damage', label: 'Thrown rotten', requiresUpgrade: 'e', detail: 'It deals what the *cooked* version would have healed: 20 a carrot, 30 a mushroom, 40 a potato, 50 a cut of meat, 50 a Death Cap, 50 a pineapple, 12 a berry.' },
          { tag: 'damage', label: 'Rotten Winter Mint', requiresUpgrade: 'e', detail: 'The one exception, priced off the target instead: 15% of their maximum health.' },
          { tag: 'heal', label: 'Eaten rotten', requiresUpgrade: 'e', detail: 'Half what the raw one heals, rounded — and a rotten Death Cap still costs you 15 HP, because half of −30 is still a mushroom that wants you dead.' },
          { tag: 'cost', label: 'When the form ends', requiresUpgrade: 'e', detail: 'The maw becomes a grill again and everything on the teeth falls off onto the floor as drops, spoiled or not.' },
        ],
      },
    },

    'glut-cannibalize': {
      basics:
        'A 150ms lunge at 620 px/s — about 90px, driven after your own movement so you cannot steer out '
        + 'of it — and a bite for 20 damage to everything within 66px of a point about 52px ahead of you. '
        + 'A hit gives 15 HP of real health back, not hunger, plus 3 seconds onto the hunger bar, and '
        + 'sends the maw into frenzy: 10 a shot instead of 5 for 6 seconds, refreshed rather than stacked '
        + 'by another bite. A miss prints "😬 NOTHING TO BITE", and you have still dashed and still spent '
        + 'the full 9 seconds.',
      cast: 'R, at the cursor. A 150ms dash at 620 px/s carries you in whether it lands or not. 9s cooldown.',
      effects: [
        { tag: 'movement', label: 'The lunge', detail: '620 px/s for 150ms — about 90px — driven after your own movement, so you cannot steer out of it.' },
        { tag: 'damage', label: 'The bite', detail: '20 damage to everything within 66px of a point about 52px ahead of you.' },
        { tag: 'heal', label: 'On a hit', detail: '15 HP of your real health back — not hunger, health — and 3 seconds onto the hunger bar.' },
        { tag: 'buff', label: 'Frenzy', detail: 'The maw spits 10 a shot instead of 5 for the next 6 seconds. Landing another bite refreshes the window rather than stacking it.' },
        { tag: 'cost', label: 'On a miss', detail: '"😬 NOTHING TO BITE": you have still dashed, and the full 9 seconds of cooldown is still spent.' },
      ],
      notes: [
        'The ability\'s own card never mentions the 20 damage. It is there, and it is dealt to everything in the bite radius, not just to one target.',
        'The 15 HP is the only real healing available to a butcher who has nothing left to eat, which makes this the ability that decides whether the form is survivable.',
        'Frenzy is worth roughly 30 extra damage over its 6 seconds without you aiming anything, which is most of what a bite is worth.',
      ],
      upgrade: {
        basics:
          'Standing within 66px of the maw in butcher form coats the cleaver for 5 seconds, refreshed '
          + 'every frame you stay there. While it is coated, every 25 damage the cleaver deals is 1 second '
          + 'back on the hunger bar — 40ms a point, so one 30-damage Cleave into two bodies is 2.4 seconds. '
          + 'Cleave only: Poach, Cannibalize and everything the maw does itself pay nothing into the bar, '
          + 'however ichorous the blade looks.',
        effects: [
          { tag: 'buff', label: 'Getting coated', requiresUpgrade: 'r', detail: 'Standing within 66px of the maw in butcher form. 5 seconds, refreshed every frame you are still standing there.' },
          { tag: 'resource', label: 'What it buys', requiresUpgrade: 'r', detail: '1 second of butcher form per 25 damage the cleaver deals — 40ms a point. One 30-damage Cleave into two bodies is 2.4 seconds back on the bar.' },
          { tag: 'utility', label: 'Only the cleaver', requiresUpgrade: 'r', detail: 'Cleave only. Poach, Cannibalize and everything the maw does itself pay nothing into the bar, however ichorous the blade looks.' },
        ],
      },
    },

    'glut-return': {
      basics:
        'Changes back to the chef: the tray becomes Kitchen Knife, Forage, Charcoal Chuck, Special '
        + 'Ingredient and Feast, damage goes back to your health, and the maw becomes a grill again with '
        + 'cooking, collection, charcoal fuel and blade heating all working from the moment you change. '
        + 'The hunger bar is emptied outright, and any awakened maw and any frenzy end with it. 1.2s '
        + 'cooldown.',
      cast: 'F while transformed. 1.2s cooldown.',
      effects: [
        { tag: 'utility', label: 'Back to the chef', detail: 'The tray becomes Kitchen Knife, Forage, Charcoal Chuck, Special Ingredient and Feast, and damage goes back to your health.' },
        { tag: 'utility', label: 'The kitchen reopens', detail: 'The maw becomes a grill again: cooking, collection, charcoal fuel and blade heating all start working the moment you change.' },
        { tag: 'cost', label: 'What you lose', detail: 'The hunger bar is emptied outright, and any awakened maw and any frenzy end with it.' },
      ],
      notes: [
        'The ability\'s own card says whatever is left on the bar is "banked against the next time you need it". It is not — Return zeroes it, and the next Special Ingredient always starts from a full 30 seconds.',
        'So leaving early costs you nothing except the 45-second cooldown you already paid, and there is no reason to ride the bar down to zero unless you are still using the form.',
        'Changing back mid-frenzy throws away up to 6 seconds of a doubled maw.',
      ],
      upgrade: {
        basics:
          'The maw stops being a single spitter and works on its own. It fires 5 gobbets a second instead '
          + 'of 1, fanned across about 44°, each for the full 5 — or 10 in frenzy — so up to 25 a second on '
          + 'a target standing close enough to eat the whole fan, and every gobbet that lands leaves '
          + 'Tenderised, +15% damage taken for 2 seconds, which does not stack with itself but is refreshed '
          + 'every second by the cone. Every 10 seconds it grabs the nearest enemy within 300px and stuns '
          + 'them for 2 seconds, and anyone inside 78px is bitten for 30 at most once every 1.6 seconds, '
          + 'with that timer only spending itself when there is somebody there to bite. None of the three '
          + 'needs a button or an aim, and all of it runs while the maw is still sitting on the grill.',
        effects: [
          { tag: 'damage', label: 'The cone', requiresUpgrade: 'f', detail: '5 gobbets a second instead of 1, fanned across about 44°, each for the full 5 (or 10 in frenzy) — up to 25 a second on a target standing close enough to eat the whole fan.' },
          { tag: 'debuff', label: 'Tenderised', requiresUpgrade: 'f', detail: 'Every cone gobbet that lands leaves +15% damage taken for 2 seconds. It does not stack with itself, and the cone refreshes it every second.' },
          { tag: 'control', label: 'The reach', requiresUpgrade: 'f', detail: 'Every 10 seconds the maw grabs the nearest enemy within 300px and stuns them for 2 seconds.' },
          { tag: 'damage', label: 'The close bite', requiresUpgrade: 'f', detail: '30 damage to anyone inside 78px of the maw, at most once every 1.6 seconds. The timer only spends itself when there is somebody there to bite.' },
          { tag: 'utility', label: 'All of it unattended', requiresUpgrade: 'f', detail: 'None of the three needs a button or an aim, and all three run while the maw is still sitting on the grill.' },
        ],
      },
    },

    'glut-maw': {
      basics:
        'Consumes every ingredient on the strip, anything in your hand included, and wakes the maw for '
        + '3 seconds plus 1 a carrot, 3 a mushroom, 5 a potato and 10 a cut of meat — six cuts of meat '
        + 'would be 63 seconds. It leaves the grill and walks at the nearest enemy at 165 px/s, stopping '
        + 'within 40px and clamped inside the arena, whipping everything within 120px for 15 damage a '
        + 'second and firing 5 gobbets every 1.4 seconds at 6 damage each, 30 a volley, fanned across '
        + 'about 37° at 390 px/s — with the ordinary once-a-second spit still running underneath all of '
        + 'it. The strip is empty afterwards, and so is the plan for feeding the hunger bar. 40s '
        + 'cooldown.',
      cast: 'Q, in butcher form. No aim; the strip is consumed at the cast. Ultimate, 40s cooldown.',
      effects: [
        { tag: 'resource', label: 'The feeding', detail: '3 seconds base, plus 1 a carrot, 3 a mushroom, 5 a potato and 10 a cut of meat. Six cuts of meat would be 63 seconds.' },
        { tag: 'summon', label: 'The hunt', detail: 'It leaves the grill and walks at the nearest enemy at 165 px/s, stopping within 40px of them, clamped inside the arena.' },
        { tag: 'damage', label: 'The whip', detail: '15 damage every second to everything within 120px of it.' },
        { tag: 'damage', label: 'The barrage', detail: '5 gobbets every 1.4 seconds at 6 damage each — 30 a volley — fanned across about 37° toward its target. 390 px/s.' },
        { tag: 'damage', label: 'And the ordinary spit', detail: 'The once-a-second 5 (or 10 in frenzy) keeps running underneath all of that.' },
        { tag: 'resource', label: 'The cost', detail: 'Every ingredient on the strip, including anything in your hand. The strip is empty afterwards, and so is the plan for feeding the hunger bar.' },
      ],
      notes: [
        'It only works if the maw is yours, which means the frame you transform is too early: Q pressed on the same frame as F is refused and still spends the 40-second cooldown.',
        'It is a straight competitor with Feast for the same six tiles. Feast turns a full strip into healing; this turns it into a second fighter.',
        'Changing back to the chef ends it instantly, however much time was left on it.',
        'At full tilt — whip, barrage and spit together — it is around 45 damage a second on top of anything you are doing yourself, and none of it needs aiming.',
      ],
      upgrade: {
        basics:
          'Everything the maw does is ×1.5: the whip 15 → 23, barrage gobbets 6 → 9, the ordinary spit 5 '
          + '→ 8 and frenzied 10 → 15, the close bite 30 → 45. A 30px band along all four arena edges deals '
          + '8 damage every 0.5s to anyone standing in it, and the butcher is the one person in the room it '
          + 'will not touch. And it screams: 35 damage to everything within 240px every 5 seconds, starting '
          + '1.2s after the awakening, with nothing to dodge and nothing to block — only distance works — '
          + 'and each scream is a 2-second stun on everyone it reaches, so a 5-second cycle leaves 40% of '
          + 'the awakening as time the enemy cannot move.',
        effects: [
          { tag: 'damage', label: 'Half again', requiresUpgrade: 'q', detail: '×1.5 on everything the maw does: the whip 15 → 23, barrage gobbets 6 → 9, the ordinary spit 5 → 8 (frenzied 10 → 15), the close bite 30 → 45.' },
          { tag: 'area', label: 'The walls', requiresUpgrade: 'q', detail: 'A 30px band along all four arena edges, drawn as the band it actually is. 8 damage every 0.5s to anyone standing in it — the butcher is the one person in the room it will not touch.' },
          { tag: 'damage', label: 'The scream', requiresUpgrade: 'q', detail: '35 damage to everything within 240px of the maw, every 5 seconds, starting 1.2s after the awakening. Nothing to dodge and nothing to block: only distance works.' },
          { tag: 'control', label: 'And it deafens', requiresUpgrade: 'q', detail: 'Every scream is a 2-second stun on everyone it reaches, so a 5-second cycle leaves 40% of the awakening as time the enemy cannot move.' },
        ],
        // The scream is deliberately not multiplied by the ×1.5 above: 35 is the printed
        // figure and 52 through the whole arena every 5 seconds would be a different ability.
      },
    },
  },

  mastery: {
    snacking: {
      basics:
        'Passive regeneration scaled by what is on your strip: 1 health a second with it entirely '
        + 'empty, rising in a straight line — rate = 1 + 8 × (pool ÷ 200) — to 9 a second once the strip '
        + 'carries 200 points of healing or more, so a strip worth 100 is 5 a second. The pool is what '
        + 'each item would heal you if you ate it, summed: cooked counts double raw, over-seared 25% more '
        + 'again, a Winter Mint counts 10% of your own maximum health, and a rotten scrap counts half of '
        + 'whatever the raw one was. Nothing negative counts — a raw Death Cap contributes 0, not −30, '
        + 'and cannot drag the rate below the floor. It runs in butcher form too, where damage is coming '
        + 'off the hunger bar, so it is quietly repairing the health bar you will go back to.',
      cast: 'Passive. Always on, in both forms, while Gluttony Mastery is enabled and Gluttony is the element being played.',
      effects: [
        { tag: 'heal', label: 'The floor', detail: '1 health a second with an entirely empty strip. It is not nothing, and over a 90-second fight it is 90.' },
        { tag: 'heal', label: 'The ceiling', detail: '9 health a second once the strip is carrying 200 points of healing or more.' },
        { tag: 'heal', label: 'In between', detail: 'A straight line: rate = 1 + 8 × (pool ÷ 200). A strip worth 100 is 5 a second.' },
        { tag: 'resource', label: 'What the pool counts', detail: 'What each item would heal *you* if you ate it, summed. Cooked counts double raw, an over-seared anything counts 25% more again, a Winter Mint counts 10% of your own maximum health, and a rotten scrap counts half of whatever the raw one was.' },
        { tag: 'utility', label: 'Both forms', detail: 'It runs while you are the butcher too. Damage is coming off the hunger bar there, so the regeneration is quietly repairing the health bar you will go back to.' },
        { tag: 'cost', label: 'Nothing negative counts', detail: 'A raw Death Cap is worth −30 and contributes 0, not −30. It cannot drag the rate below the 1/s floor.' },
      ],
      notes: [
        'It is the exact inverse of the rest of the element. Gluttony has always paid for being alive by eating; this pays you for *not* eating, and every mouthful you take makes the next second of regeneration slower.',
        'Feast is the sharpest interaction in the kit. It empties the strip in one keystroke, so the moment the pot goes on the rate falls to 1/s and stays there until you have foraged the larder back.',
        'It stops entirely at full health and starts again the frame you are hit, so it is a between-engagements heal rather than a sustain during one.',
        'A Gluttony NPC on Nightmare snacks too. The passive is the element\'s, not the player\'s.',
      ],
    },
    'chefs-friend': {
      basics:
        'Opens a rat hole on the top wall the moment it is bound, and it stays all match. Throwing a '
        + 'cooked item at it — raw or rotten is refused and lands as an ordinary drop — trades it, and '
        + '1.2 seconds later one of three things drops out at random: 🍞 bread, 30 raw and 60 cooked on '
        + 'an 8-second cook and 6 seconds of butcher form; 🧀 cheese, 25/45, 5 seconds and 5 seconds; or '
        + '🥧 pie, 30/60, 10 seconds and 7 seconds, and eating one is +20% movement speed for 8 seconds '
        + 'either way. The bound key does different work in each form. In the kitchen it is a fetch: the '
        + 'rat runs out at 360 px/s, picks up your nearest drop — or the cut of meat still stuck on a '
        + 'skewer in the wall — and puts it straight on your strip, coming home empty after 6 seconds; '
        + 'with nothing of yours lying about it goes down the hole instead and one of its own three comes '
        + 'back, so the cast is never wasted. In butcher form the rat is out and hunting every second, at '
        + '175 px/s, slashing for 12 every 1.1 seconds inside 46px and collecting anything of yours on '
        + 'the floor within 280px between swings — it fights and fetches at the same time. Throwing any '
        + 'item at it, raw, cooked or rotten, feeds it: +25% slash damage and +15% speed a mouthful to a '
        + 'maximum of four, so 12 damage becomes 24 and 1.1 seconds between swings becomes 0.7, and every '
        + 'feeding sets a 12-second stay, so a fed rat keeps fighting after butcher form ends. The '
        + 'whistle in butcher form sics it on whoever is nearest your cursor within 420px: the next slash '
        + 'it lands is doubled, with the ring round it saying so until it connects, and 4 seconds to land '
        + 'it. A Gluttony slot is two abilities, so binding over E costs Forage and Poach, over R '
        + 'Charcoal Chuck and Cannibalize, over Q Feast and Maw Awakening; F is refused outright. 14s '
        + 'cooldown either way.',
      cast: 'The bound key (E, R or Q). In the kitchen it is a fetch; in butcher form it is a sic. 14 second cooldown either way. F is refused as a drop target.',
      effects: [
        { tag: 'summon', label: 'The hole', detail: 'Opens on the top wall the moment the enhancement is bound, and stays there all match. Nothing else in the element occupies that part of the arena.' },
        { tag: 'resource', label: 'The trade', detail: 'Throw a **cooked** item at the hole and it is taken. 1.2 seconds later one of three things drops out below it, at random. A raw or rotten throw is refused and lands on the floor as an ordinary drop.' },
        { tag: 'heal', label: '🍞 Bread', detail: 'Heals 30 raw, 60 cooked. 8 seconds on the grate, and 6 seconds of butcher form eaten.' },
        { tag: 'heal', label: '🧀 Cheese', detail: 'Heals 25 raw, 45 cooked. 5 seconds on the grate, 5 seconds of butcher form.' },
        { tag: 'heal', label: '🥧 Pie', detail: 'Heals 30 raw, 60 cooked. 10 seconds on the grate, 7 seconds of butcher form — and eating one is +20% movement speed for 8 seconds either way.' },
        { tag: 'utility', label: 'The fetch', detail: 'Chef form. The rat runs out at 360 px/s, picks up the nearest drop of yours — or the cut of meat still stuck on a skewer in the wall — and puts it straight on your strip. Six seconds to find it or it comes home empty.' },
        { tag: 'utility', label: 'Nothing to fetch', detail: 'With nothing of yours lying about anywhere, the whistle instead sends him down the hole for 1.2 seconds and one of his own three comes back out. The cast is never wasted.' },
        { tag: 'summon', label: 'The butcher\'s rat', detail: 'Every second you are the butcher it is out of the hole and hunting: 175 px/s, and it slashes for **12** every 1.1 seconds inside 46px.' },
        { tag: 'utility', label: 'And it still tidies', detail: 'Between swings, anything of yours on the floor within 280px of it is collected and carried back onto the strip. It fights and it fetches at the same time.' },
        { tag: 'buff', label: 'Feeding it', detail: 'Throw any item — raw, cooked, rotten, anything — at the rat while it is out. **+25% slash damage and +15% speed per mouthful, to a maximum of four**: 12 damage becomes 24, and 1.1 seconds between swings becomes 0.7.' },
        { tag: 'buff', label: 'And it stays', detail: 'Every feeding sets a **12-second stay**. Butcher form ending does not send a fed rat home — it keeps fighting for whatever is left on that clock, and only then walks back to the hole.' },
        { tag: 'damage', label: 'The sic', detail: 'Butcher form. The whistle sets it on whoever is nearest your cursor within 420px: the next slash it lands is **doubled**, and the ring round it says so until it connects. 4 seconds to land it.' },
        { tag: 'cost', label: 'The slot', detail: 'A Gluttony slot is two abilities. Binding over E costs you Forage *and* Poach; over R, Charcoal Chuck *and* Cannibalize; over Q, Feast *and* Maw Awakening. F is refused outright.' },
      ],
      notes: [
        'Q is the expensive bind and the interesting one: it deletes both ultimates, and what it hands back is a permanent second body that never has to be re-cast.',
        'The rat cannot be killed, targeted or displaced. Like the maw, it is furniture that fights.',
        'Feeding costs you the item outright — it is not eaten by you and it does not touch the hunger bar. A rat fed to four on the way out of a transformation has spent four tiles of larder.',
        'The three foods are not on either forage table and the grill will never produce one. The rat is the only source, which makes the trade the only way to convert a surplus of cooked carrots into something worth 60.',
        'A sic drops whatever the rat was carrying at the time. It is not a delivery run any more.',
        'Both halves of a Gluttony mirror can own a hole; when they do, the two are set 110px either side of centre so it is obvious whose is whose.',
      ],
    },
  },
};

export default gluttony;
