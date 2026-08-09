import { ElementCodex } from '../AbilityCodex';

/**
 * Gluttony — a chef with a larder, and the thing the chef becomes when the larder runs out.
 *
 * Verified against `src/elements/gluttony.ts` and `kits/GluttonyKit.ts`; the food table is
 * `FOOD` in `kits/GluttonyVisuals.ts`. Gluttony has no shop upgrades, no perks and no mastery
 * enhancements. The ability list is ten entries — 0–4 the chef, 5–9 the butcher — and F is the
 * door between them in both directions.
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
      magic:
        'Four ingredients, and the difference between raw and cooked is the whole economy of the '
        + 'element. Cooked is double the healing and it costs nothing but the time on the grate '
        + 'and the walk back to collect it. Nothing else in the game asks you to do prep.',
      effects: [
        { tag: 'heal', label: 'Carrot 🥕', detail: 'Heals 10 raw, 20 cooked. 5 seconds on the grate, and 3 seconds of butcher form eaten.' },
        { tag: 'heal', label: 'Mushroom 🍄', detail: 'Heals 15 raw, 30 cooked. 10 seconds on the grate, 5 seconds of butcher form.' },
        { tag: 'heal', label: 'Potato 🥔', detail: 'Heals 20 raw, 40 cooked. 12 seconds on the grate, 8 seconds of butcher form.' },
        { tag: 'heal', label: 'Meat 🍖', detail: 'Heals 20 raw, 50 cooked. 15 seconds on the grate, 15 seconds of butcher form. Forage never turns it up — it only comes off a skewer.' },
        { tag: 'utility', label: 'Eating', detail: 'Right-click eats whatever is in your hand, wherever you are standing. There is no cast time and no cooldown on it.' },
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
      magic:
        'A lit grill stands in the middle of every arena, and it is the only fixed point in the '
        + 'element. Four things fit on the grate. Standing next to it with an empty hand heats '
        + 'your blade; standing next to it with something finished on the grate collects it. Every '
        + 'good thing Gluttony does happens within about sixty pixels of it.',
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
      magic:
        'Six tiles along the top-left of the screen, with the knife\'s own tile set apart at the '
        + 'end of them. Whatever is in your hand is what your click throws and what your '
        + 'right-click eats, so the strip is not an inventory screen — it is the weapon select.',
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
      magic:
        'While anybody is the butcher, the grill in the middle of the arena is a mouth: a lip of '
        + 'teeth, a working throat, and four tentacles rooted under it. It belongs to whoever is '
        + 'transformed, it breathes on its own, and once a second it spits a piece of meat at '
        + 'whoever they are fighting. It does this whether or not you are anywhere near it.',
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
      magic:
        'Thirty seconds, counting down in real time under the prep strip, and every point of '
        + 'damage aimed at you is charged to it instead of your health. It is not a shield — '
        + 'nothing regenerates it, nothing stops it draining, and when it reaches zero you are the '
        + 'chef again whether you were ready or not. The only thing that puts time back on it is '
        + 'food.',
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
      magic:
        'The one weapon in the chef\'s half of the kit, and it does two completely different jobs '
        + 'depending on what is in your hand. Empty-handed it is a thrown knife — and if you spent '
        + 'the last two seconds standing over the coals, it comes off them glowing and hits for '
        + 'half again as much. Holding an ingredient instead, the same button posts that ingredient '
        + 'onto the grate from across the arena, which is how you cook without standing in the '
        + 'middle of the fight.',
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
    },

    'glut-forage': {
      magic:
        'The chef crouches and digs. Two seconds of head-down scrabbling at half speed, which is a '
        + 'genuinely dangerous thing to do in the middle of a fight, and at the end of it something '
        + 'comes out of the ground. You do not get to choose what.',
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
    },

    'glut-charcoal': {
      magic:
        'A briquette of charcoal, hurled. It is the only thing in the kit that is genuinely two '
        + 'abilities pointing in opposite directions: thrown at a person it is a burn that makes '
        + 'your knife hurt half again as much, and thrown at your own grill it is fuel that doubles '
        + 'the rate of everything on it for six seconds.',
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
    },

    'glut-butcher': {
      magic:
        'The toque comes off. The whites take spatter, the knife goes behind the back where you '
        + 'cannot see what it is doing, and the grill in the middle of the arena opens a mouth. '
        + 'Thirty seconds in which damage does not touch your health at all — and the only thing '
        + 'that buys more of them is the food you spent the first half of the fight cooking.',
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
    },

    'glut-feast': {
      magic:
        'Everything on the strip goes into one pot over your head, and for three seconds it just '
        + 'swirls. Then it pays out double what all of it was worth eaten one at a time — to you '
        + 'and to everyone fighting alongside you. It is the reward for having cooked: the pot pays '
        + 'double on the *cooked* value, so a grill you kept busy is worth twice a grill you did not.',
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
    },

    // ── Butcher ─────────────────────────────────────────────────────
    'glut-cleave': {
      magic:
        'The knife comes round in front of you in one flat arc. No throw, no travel time and '
        + 'nothing in the air to dodge — the only way to not be hit by this is to not be standing '
        + 'in front of the man holding it. It is a very wide arc, and it does not stop at one body.',
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
    },

    'glut-poach': {
      magic:
        'A cooking skewer, thrown hard. It does not stop at the first person — it goes through '
        + 'everybody in its way, takes a cut of meat out of the first one on the way past, and '
        + 'carries it on to the wall, where it sticks with the meat still on it. Walking over the '
        + 'skewer is what actually collects it, and a cut of meat is the best food in the game.',
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
    },

    'glut-cannibalize': {
      magic:
        'A short hard lunge and a bite. It is the only ability in the element that heals your real '
        + 'health while you are the butcher, it buys three more seconds of being the butcher, and '
        + 'it sends the maw in the middle of the arena into a frenzy for six seconds. All of that '
        + 'is conditional on the bite connecting.',
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
    },

    'glut-return': {
      magic:
        'The hat goes back on. The whites are ruined but the knife comes back out in front, the '
        + 'mouth in the middle of the arena closes back into a grill, and the kitchen reopens — '
        + 'cooking, collecting, charcoal and a blade you can heat again.',
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
    },

    'glut-maw': {
      magic:
        'You feed the mouth everything you own and it comes off the floor. Seven tentacles instead '
        + 'of four, a body that walks at the enemy on its own, whips at anything close and barrages '
        + 'of meat at anything at all. It lasts three seconds — plus however long the larder you '
        + 'just poured into it is worth, which is the entire point of the ability.',
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
    },
  },
};

export default gluttony;
