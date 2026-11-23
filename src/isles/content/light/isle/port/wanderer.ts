import type { Cond, Talk, WandererDef } from '../../../../IslesTypes';

/**
 * Sable Merrow — Solmara's wanderer. The old keeper of the Meridian light, bleached twenty years ago
 * for keeping a shuttered room to sleep in: a Clear. You can see the quay through her and she casts
 * no shadow. She talks about night as if it were a story from before she was born, though she kept a
 * lamp burning through ten thousand of them. With her flies Nocturne, a big pale luna moth that rides
 * on her shoulder and is the only thing on the isle that seeks the dark — it flutters toward whatever
 * shade there is, and she follows it. She is calm, wry, very tired, and never says what she does not
 * mean (a Clear cannot hide anything, so she has stopped trying).
 *
 * She is the isle's narrator: the tutorial nudges (the Noon and Clarity, Dusk Tickets, the Clears,
 * sunpool and mana fishing, the prism rod, the Outer Sea), gossip about every prince, a reaction to
 * each court freed — and her own story, which only moves once the Despot falls. The Heliostat's
 * mirrors are turned away one by one and the sun is let go; it sets, and Solmara watches its first
 * evening in total silence; then the first night, children screaming at the stars; then Sable lights
 * the lighthouse lamp again, and with every night a little more of her colour comes back.
 *
 * Blocks are listed most specific first. Once the Despot falls, her arc is a chain of flags
 * (`sable-dusk-1` … `sable-dusk-4`) and each link holds on its own, so the next step always plays
 * next. The evening (step 2) and the lamp (step 4) play only at Meridian Quay; the area painter lights
 * the lighthouse on `sable-dusk-4`.
 */

const DESPOT: Cond = { monarch: 'auriel' };
/** True only before the Despot falls — keeps the old lines out of the rotation once he is down. */
const pre = (c: Cond): Cond => ({ all: [c, { not: DESPOT }] });
const princes = (count: number): Cond => ({ princesOfIsle: 'light', count });
const dusk = (n: number): Cond => ({ flag: `sable-dusk-${n}` });
const between = (a: number, b: number): Cond => ({ all: [dusk(a), { not: dusk(b) }] });
/** First visit to an area: plays once, sets its flag, and only before the Despot falls. */
const intro = (flag: string, lines: string[]): Talk => ({ sets: flag, when: { all: [{ not: { flag } }, { not: DESPOT }] }, lines });

// ── The dusk arc (after the Despot) ─────────────────────────────────

/** Step 1 — anywhere: the mirrors are turning away, and the sun has moved. */
const ARC_TURNING: Talk = {
  when: { all: [DESPOT, { not: dusk(1) }] },
  sets: 'sable-dusk-1',
  lines: [
    'Look at the ground. At your feet. — No, look. Your shadow. It is longer than it was an hour ago.',
    'They are turning the Heliostat\'s mirrors away. One by one, by hand, up on the Crown. The sun is coming loose.',
    'It has moved. Twenty-two years pinned to one spot over our heads, and it has moved a finger to the west.',
    'Nocturne has not sat still since. She keeps flying at the east side of things, where the dark will come from.',
    'I want to watch it go down from the Meridian Stair. Where I used to watch it from the gallery. Come with me.',
  ],
};

/** Step 2 — Meridian Quay: the first evening, in silence. */
const ARC_EVENING: Talk = {
  when: between(1, 2),
  sets: 'sable-dusk-2',
  lines: [
    'Here. Stand by me on the Stair. Everyone else has come down too. Look along the quay. Nobody is talking.',
    'The whole town, out on the stones, watching the sun go down into the sea. Not one word. Not even the gulls.',
    'It goes orange first. Then red. Then it touches the water and it looks as if it will put the sea out.',
    'Jory has hold of his mother\'s skirt with both hands. He thinks it is breaking. I said it does this. It does.',
    '...There. Gone. And the sky does what it always did. It goes on being lit for a while, to let you get home.',
  ],
};

/** Step 3 — anywhere: the first night. */
const ARC_NIGHT: Talk = {
  when: between(2, 3),
  sets: 'sable-dusk-3',
  lines: [
    'Did you hear them last night? The children. Screaming at the stars. The whole isle at once, like gulls.',
    'Not frightened. Well — some frightened. Mostly they had never seen anything so many. They tried to count.',
    'Nocturne went straight up into it. Straight up, into the dark, as high as I have ever seen a moth fly.',
    'I thought she had gone. She came back at dawn — there is a dawn now — and sat on my shoulder, cold, pleased.',
    'And look at my hand. Hold it to the light. — The edges. They are grey. A little grey. That is colour, coming.',
    'The keeper\'s door is still nailed open. Come back to the quay with me. I have a lamp to light.',
  ],
};

/** Step 4 — Meridian Quay: the lamp. */
const ARC_LAMP: Talk = {
  when: between(3, 4),
  sets: 'sable-dusk-4',
  lines: [
    'Jory had the lens back together. Every prism. Wren ground the missing ones. Dorrit sent oil. Ottoline, a wick.',
    'I went up the stair the way I went up it every evening for thirty years, and my knees remembered every step.',
    'Trimmed the wick. Filled the font. Struck a match — a match, a little dark-maker — and put it to the wick.',
    'And it caught. And the lens took it and threw it out over the water, round and round, the way it used to.',
    'A lamp implies a night, they said. Yes. It does. That is what it is for. To tell the ships the dark is safe.',
  ],
};

/** After: the colour coming back, night by night. */
const ARC_HOME: Talk = {
  when: dusk(4),
  lines: [
    'I keep the light every night now. Up at dusk, down at dawn. Dusk and dawn. I say them to myself on the stair.',
    'Every night I sit in the lamp room in the dark between the turns of the beam, and some colour comes back.',
    'Rosamund holds a swatch to my cheek in the mornings. I am "oyster" this week. Last week I was "glass".',
    'Nocturne sleeps all day now, in the folds of the curtain on the gallery. She has earned it. So have I.',
    'Thank you. You gave us back the dark. It is the kindest thing anyone has ever done for a lighthouse-keeper.',
  ],
};

/** Anywhere but the quay, between the turning and the evening. */
const NUDGE_EVENING: Talk = {
  when: between(1, 2),
  lines: [
    'The sun is sliding west. Come down to Meridian with me — I want to watch it go into the sea.',
    'Nocturne is pulling me south. She knows where the evening will be. She has been waiting for it for years.',
  ],
};

/** Anywhere but the quay, between the first night and the lamp. */
const NUDGE_LAMP: Talk = {
  when: between(3, 4),
  lines: [
    'The lighthouse is waiting. Jory has the lens in. I keep finding reasons not to go up. I am frightened of it.',
    'Thirty years I lit it and twenty-two I did not. Walk back to Meridian with me. I would like a witness.',
  ],
};

/**
 * In every court, after the first night and before the lamp: what the night has done to this court,
 * and then the pull home to the lighthouse.
 */
const nightNudge = (lines: string[]): Talk => ({
  when: between(3, 4),
  lines: [...lines, 'The lighthouse is waiting, and Jory has the lens in. Walk back to Meridian with me. I would like a witness.'],
});

export const SABLE: WandererDef = {
  id: 'light-wanderer-sable',
  name: 'Sable Merrow',
  title: 'The Bleached Keeper, with Nocturne',
  look: {
    body: 0xeef6fa, accent: 0xd8e6ee, hand: 0xe4f0f6, hat: 'souwester',
    traits: ['lantern', 'scarf'], size: 0.95, eye: 0xb8dcf0,
  },

  byArea: {
    // ── Meridian Quay ───────────────────────────────────────────────
    meridian: [
      ARC_TURNING, ARC_EVENING, ARC_NIGHT, ARC_LAMP, ARC_HOME,
      {
        when: pre(princes(6)),
        lines: [
          'Six Radiances down. The Heliostat door on the Tribunal terrace stands open. Up the summit, past the Palace.',
          'The mirrors up there are shaking. I can see it from the Stair. Like a crown on a head that is afraid.',
          'Eat at the Golden Crust before you climb. The Heliostat\'s halls burn, bounce and grind. Bring your best.',
        ],
      },
      {
        when: pre(princes(3)),
        lines: [
          'Half the courts. The clerk at the Dusk-house is giving out extra minutes and does not know why. He knows why.',
          'Somebody hung a sheet on a line by the fish market and left it there all afternoon. All afternoon. A shadow.',
          'Nocturne has started sleeping in it. The shadow of the sheet. A moth asleep in the middle of the quay.',
        ],
      },
      {
        when: pre({ prince: 'lumen' }),
        lines: [
          'Lumen is down. The Noon Radiance. He kept the Burning Glass, and the queue of Clears waiting for it.',
          'They put a sheet over the lens. People walked up the Steps just to look at a sheet. I did. Twice.',
          'Five more. West to the painters, east to the mages, or on up past the Noon to the gorge and the workshops.',
        ],
      },
      {
        when: pre({ questDone: 'meridian-declared' }),
        lines: [
          'Glaze went up the hill holding half a mirror. The quay will be talking about it for years. Quietly.',
          'Touch the waystone by the Stair if you have not. M opens the isle map; you can walk the roads in a blink.',
          'Wren Halloran sells the prism rod. Dear. The only thing on Solmara that fishes the noon pool or the Font.',
        ],
      },
      {
        when: pre({ flag: 'sable-met' }),
        lines: [
          'Still on the quay? It is a good harbour. Bright, tired, and frightened of a mirror on a float. Most are.',
          'North up the Noon Steps is the Noon Court. West is the Painters\' Road. East is the Sigil Road.',
          'Fish off the Stair or the moles. Herring for learning. Wren sells rods; Dorrit at the Crust bakes your catch.',
          'A meal lasts one fight. A charm lasts for ever. Halloran\'s and the Glass Counter both sell charms.',
        ],
      },
      intro('sable-met', [
        'You are looking at the quay through me. It is all right. Everyone does. It is what we are for, the Clears.',
        'Sable Merrow. I kept the light on the rock there, before. This is Nocturne. — She likes you. You are shady.',
        'Welcome to Solmara. It is noon. It has been noon for twenty-two years. You will stop asking soon.',
        'Walk up to anyone and press E. Ottoline on the quay first. Then Customs. They will want your bags. Let them.',
        'TAB opens your pack. I will be about. Look for the moth. Nobody looks for me; they look through me.',
      ]),
    ],

    // ── The Noon Court ──────────────────────────────────────────────
    noon: [
      ARC_TURNING, ARC_NIGHT, NUDGE_EVENING,
      { when: dusk(4), lines: [
        'The sundials work. People sit round them in the plaza and watch the shadows move like it is a play.',
        'Somebody has painted a moustache on the statue with the sunburst for a head. It is a good moustache.',
      ] },
      nightNudge([
        'The Burning Glass is pointed at the sky now. Empty. Someone filled the cradle with soil and planted beans.',
        'Lumen sat on the plaza steps last night and watched the dark come. He wept. I did not stop him.',
      ]),
      {
        when: pre({ prince: 'lumen' }),
        lines: [
          'You beat Lumen. On his own plaza. He bleached nine people a day under that lens. I was one, once.',
          'The Clears who were waiting in line just walked away. Nobody stopped them. They did not know where to go.',
          'The reflecting pool fishes now — blaze bream, glare goby, zenith koi. Prism rod. Otherwise it is all glare.',
        ],
      },
      {
        when: pre({ courtReady: 'noon' }),
        lines: [
          'Five champions down. Lumen will come out of the Solarium. He fights with a prism first: seven rays, fanning.',
          'Red burns, violet slows. Watch the colour of the ray, not the brightness. They are all bright.',
          'Then he moves at the speed of light, leaving himself behind. Each afterimage fires when he stops. Keep moving.',
        ],
      },
      {
        when: pre({ flag: 'sable-noon' }),
        lines: [
          'Every champion here plays a rule — the lens, the noon bell, the awnings. The fight card names it.',
          'Lose? You wake where you stood, sunburnt. Win and the court pays. Coin buys charms at the shops.',
          'The pool here is a sunpool — too bright to see into. Wren\'s prism rod breaks the glare. Nothing else does.',
          'The Sunrise Bun is the bakery up here. Their buns have a hole in the middle, for the sun. They mean it kindly.',
        ],
      },
      intro('sable-noon', [
        'The Noon Court. The plaza with no shade on it at all. Not a wall, not a tree, not a doorway. On purpose.',
        'That is the Burning Glass, on the gantry. A lens the size of a house. They hold a shade-thief in its focus.',
        'Nine hours, it took me. You fade from the edges in. Nocturne found me after. Moths like Clears; we are cool.',
        'Prince Lumen keeps it — the Noon Radiance. Beat his five champions and he has to come out of his Solarium.',
      ]),
    ],

    // ── The Tribunal Court ──────────────────────────────────────────
    tribunal: [
      ARC_TURNING, ARC_NIGHT, NUDGE_EVENING,
      { when: dusk(4), lines: [
        'They tried the last case in the glass courthouse at night, by candle. You could not see in. Everyone cheered.',
        'Verdict is clerk to it now. He takes notes. He reads them back to people. He asks them if they are right.',
      ] },
      nightNudge([
        'The mirror cages are open. The accused walked out and sat on the courthouse steps in the dusk.',
        'Somebody carried the bronze scale down and put a candle in each pan. They balance. Of course they do.',
      ]),
      {
        when: pre({ prince: 'verdict' }),
        lines: [
          'Verdict is down. The Tribunal Radiance. He tried me. Eleven minutes. I counted the gavel.',
          'The galleries emptied out. Nobody wants to watch a trial through a glass wall when there are no trials.',
          'The fountain fishes now — gavel gar, bail barbel. A driftwood rod does it; it is plain water. Plain!',
        ],
      },
      {
        when: pre({ courtReady: 'tribunal' }),
        lines: [
          'Five down. Verdict comes out of the Courthouse with a gavel the size of a door. Every slam is a square wave.',
          'Every third is ORDER! — a ring that stuns. Count. One, two, ORDER. Be out of it on three.',
          'Then the blindfold. He strikes wherever you last cast or dashed. Cast, then move. Make him hit the past.',
        ],
      },
      {
        when: pre({ princesOfIsle: 'light', count: 6 }),
        lines: [
          'All six! The Heliostat door is open, north, at the feet of the iron legs. It goes up to the Crown.',
          'Three halls: lenses on rails that walk burning spots across the floor, a maze of mirrors, and the sun-chain.',
          'Then him. Under the pinned sun. Nocturne will not come in. She is waiting at the door, for the dark.',
        ],
      },
      {
        when: pre({ flag: 'sable-tribunal' }),
        lines: [
          'That big door north, under the iron legs — the Heliostat. It opens when all six Radiances are down.',
          'The fountain here fishes with any rod. Everything else up here has been judged. The fish have not. Yet.',
          'Champions here play law: cages, a jury, objections, an oath. Read the fight card. Then keep your oath.',
        ],
      },
      intro('sable-tribunal', [
        'The Tribunal. The summit terrace. Glass courthouse — you can watch every trial through the walls. People do.',
        'The cages are mirror. The accused wait in them in the sun, so they are already being bleached a little.',
        'Prince Verdict keeps it. He tried me. Behind it all, the Palace of Noon, and the Heliostat on its legs.',
        'Do not stand in shade up here. There is none. That is a joke. Nobody up here laughs at it.',
      ]),
    ],

    // ── The Lantern Court ───────────────────────────────────────────
    lantern: [
      ARC_TURNING, ARC_NIGHT, NUDGE_EVENING,
      { when: dusk(4), lines: [
        'The lanterns are empty and dark. They leave them hanging. In the night they look like a gorge full of moons.',
        'Wisp walks the wires every night snuffing the last of them. Gently. He says each one sighs. I believe him.',
      ] },
      nightNudge([
        'They are letting the souls go. Lantern by lantern. Each one goes up like a spark and then — out. At last.',
        'Nell Gully is here for Gideon\'s. I held her hand. You could see her fingers through mine. She did not mind.',
      ]),
      {
        when: pre({ prince: 'wisp' }),
        lines: [
          'Wisp is down. The Lantern Radiance. He caught every soul that died on Solmara so none would lie in the dark.',
          'Nobody has let them out yet. Nobody knows how. But nobody is hanging new ones. That is something.',
          'The lake fishes — wick loach, soul carp, ghostlight pike. It is lethe water; Wren\'s prism rod will do it.',
        ],
      },
      {
        when: pre({ courtReady: 'lantern' }),
        lines: [
          'Five down. Wisp swings a great lantern like a pendulum, souls streaming along its light. Keep out of the cone.',
          'Then he sets it down and goes ghost. You can only hurt him near the lantern. Fight him by it.',
          'Nocturne will not stay in this court. Too much light that is not light. She waits at the gorge mouth.',
        ],
      },
      {
        when: pre({ flag: 'sable-lantern' }),
        lines: [
          'The champions here play with souls — lanterns to free, wicks to trim, a thread, a scale. Read the card.',
          'The lantern-lake is lethe water. It forgets your hook. The fortune rod or the prism rod will hold.',
          'If a lantern gutters in a fight, its soul gets out angry. Trim them. I would be angry too.',
        ],
      },
      intro('sable-lantern', [
        'The Lantern Court. The gorge. Every one of those lanterns has a soul in it. Every one. Glowing blue.',
        'Not even the dead may lie in the dark on Solmara. So they are caught, and hung up on wires, and kept lit.',
        'My mother is up there somewhere. Three wires from the top, I think. I do not look for her any more.',
        'Prince Wisp keeps them. He is gentle with them. That is the worst of it. Five champions, then him.',
      ]),
    ],

    // ── The Arcane Court ────────────────────────────────────────────
    arcane: [
      ARC_TURNING, ARC_NIGHT, NUDGE_EVENING,
      { when: dusk(4), lines: [
        'The observatory towers are full every night. The mages had never used them. They are weeping at the eyepieces.',
        'Sigil has started a star-chart. He is very bad at it. He keeps drawing them as sigils. He is learning.',
      ] },
      nightNudge([
        'They are scrubbing the sigil circles out of the flagstones. The ones that held the mirrors to the sun.',
        'Each circle they scrub, a mirror up on the Crown swings loose. You can hear it from here, very faintly. Clang.',
      ]),
      {
        when: pre({ prince: 'sigil' }),
        lines: [
          'Sigil is down. The Arcane Radiance. His circles held the Heliostat\'s mirrors to the sun, spell by spell.',
          'Some have gone dark already. Up on the Crown a mirror sags. Just one. But it sags.',
          'The Mana Font fishes — rune trout, hex eel, wyrd wrasse. Prism rod only. They are runes. Mind your eyes.',
        ],
      },
      {
        when: pre({ courtReady: 'arcane' }),
        lines: [
          'Five down. Sigil traces spells in the air: a triangle bursts fire, a circle rings a ward, a spiral pulls.',
          'Read the shape before it closes. Then the whole floor becomes a circle, its rings turning, segments flaring.',
          'Watch the segment that is going to flare next. It glows a breath early. They always do. Mages are proud.',
        ],
      },
      {
        when: pre({ flag: 'sable-arcane' }),
        lines: [
          'The champions here play spells — wards, familiars, wild magic, a summoning circle. The card names the rule.',
          'The Mana Font is liquid light. Any rod but the prism just shows you glare. Wren on the quay sells it.',
          'Do not step in a lit sigil circle. You will be holding a mirror to the sun for an hour before you know it.',
        ],
      },
      intro('sable-arcane', [
        'The Arcane Court. The mages\' town. Those towers are observatories. Not a star seen in twenty-two years.',
        'The circles burned into the flagstones hold the Heliostat\'s mirrors on the sun. Spells, holding a sky still.',
        'Prince Sigil keeps it. Clever. He invented the circles. He is quite proud. Five champions, then him.',
        'The Mana Font is the spring of light over there. Fish swim in it. They are made of letters. Truly.',
      ]),
    ],

    // ── The Workshop Court ──────────────────────────────────────────
    workshop: [
      ARC_TURNING, ARC_NIGHT, NUDGE_EVENING,
      { when: dusk(4), lines: [
        'They are grinding lenses for telescopes now, and spectacles, and one great one for the Meridian light. Spare.',
        'Artifex built a lamp that throws shadows of birds on the wall. He gives them to children. They are sold out.',
      ] },
      nightNudge([
        'The crane yard has stopped hoisting mirrors. They are lowering them instead. Gently, onto straw.',
        'The glassblowers blew a dark bottle last night. Dark green, nearly black. They passed it round like a baby.',
      ]),
      {
        when: pre({ prince: 'artifex' }),
        lines: [
          'Artifex is down. The Workshop Radiance. Every mirror on the Heliostat was ground and hung by his people.',
          'The furnaces are still going, but nobody knows what to make. Somebody made a shade. A lampshade. It sold.',
          'The quench tank fishes — brass bleak, gear gudgeon, lens loach. Steam water; anything past driftwood.',
        ],
      },
      {
        when: pre({ courtReady: 'workshop' }),
        lines: [
          'Five down. Artifex throws wind-up things first — beetles that march and pop, mines on springs. Count them.',
          'Then he climbs into his armature. Brass and mirrors, walking. It stomps, and sweeps a lens-beam. Get under it.',
          'Nocturne likes it here. The glass roofs throw the odd shadow when the cranes swing. She chases them.',
        ],
      },
      {
        when: pre({ flag: 'sable-workshop' }),
        lines: [
          'The champions here play machines — a blueprint, a prototype, molten glass, a golem, a hanging mobile.',
          'The quench tank fishes with anything better than driftwood. It is steaming. The fish are used to it.',
          'Every mirror up on the Crown started here, on one of those benches. Somebody\'s hands. Remember that.',
        ],
      },
      intro('sable-workshop', [
        'The Workshop Court. Lens-grinders, mirror-polishers, glassblowers, and the crane yard hoisting mirrors uphill.',
        'Every mirror on the Heliostat came out of these sheds. They are very good at it. They are very tired.',
        'Prince Artifex keeps it. An artificer. He means well, I think. That is no comfort, is it.',
        'Five champions, then him. Mind the blueprints on the drafting tables. They fade in the sun as you read.',
      ]),
    ],

    // ── The Mural Court ─────────────────────────────────────────────
    mural: [
      ARC_TURNING, ARC_NIGHT, NUDGE_EVENING,
      { when: dusk(4), lines: [
        'They are painting night on the walls. Over the Despot. Stars, a moon, an owl. One has painted me, with a lamp.',
        'Hue painted the first shadow. On a mural of a cup. A little grey crescent. People queued to see it. Queued!',
      ] },
      nightNudge([
        'The painters came out and painted the walls in the dusk light, fast, before it went. Every colour wrong.',
        'They said it was the best light they had ever worked in. Then it was dark, and they kept painting by feel.',
      ]),
      {
        when: pre({ prince: 'hue' }),
        lines: [
          'Hue is down. The Mural Radiance. Every wall in this town is the Despot, in noon light, by his order.',
          'Nobody has painted over him yet. But somebody chalked a cloud in the corner of the big one. A small cloud.',
          'The pigment river fishes — palette perch, umber eel, vermilion snapper. Iron rod at least. It stains.',
        ],
      },
      {
        when: pre({ courtReady: 'mural' }),
        lines: [
          'Five down. Hue paints the floor in great strokes: red burns, blue slows, yellow crackles. Keep off the wet.',
          'Then he paints creatures — wolves, birds — and they step out of the canvas. Paint does not bleed. Hit it.',
          'Nocturne keeps landing on the scaffolds. The dust-sheets throw the only shade in the town. She knows.',
        ],
      },
      {
        when: pre({ flag: 'sable-mural' }),
        lines: [
          'The champions here play paint — a colour wheel, painted doors, whitewash, numbers, a portrait. Read the card.',
          'The pigment river runs in stripes from the dye works. It is ink water; the iron rod or better.',
          'The censors whitewash any shadow they find on a wall. If you see a fresh white patch, someone was brave there.',
        ],
      },
      intro('sable-mural', [
        'The Mural Court. The painters\' town. Every wall is one picture of the Despot, in noon light, smiling.',
        'A painter who paints a shadow is bleached. So there are none. Look — his nose casts nothing on his face.',
        'Prince Hue keeps it. A real painter, once. A good one. Five champions, then him, in the Shadowless Gallery.',
        'Mind the wet paint on the scaffolds. Nocturne got yellow on one wing last year. It has not come off.',
      ]),
    ],

    // ── The Heliostat ───────────────────────────────────────────────
    heliostat: [
      ARC_TURNING,
      { when: dusk(1), lines: [
        'They are turning the mirrors. Listen — every one creaks as it comes away from the sun. Like a ship easing.',
        'Nocturne flew in. She has never come in here before. There is a shadow behind every mirror now. She is in it.',
      ] },
      {
        when: pre({ flag: 'sable-heliostat' }),
        lines: [
          'The Lens Gallery first: lenses on rails overhead, each walking a burning spot over the floor. Watch the spot.',
          'Then the Mirror Maze. A beam bounces mirror to mirror. Turn the mirrors; do not stand where it lands.',
          'Then the Sun Chain, and the cogs that hold the sun. And then the Crown, and him. I will be at the door.',
        ],
      },
      intro('sable-heliostat', [
        'The Heliostat. I have looked at it every day for twenty-two years and I have never been inside. It is hot.',
        'Each of those mirrors up there is the size of a sail. They tilt all day — there is no night — on the sun.',
        'Nocturne will not come in. She is sitting on the door frame. She has never sat so still. Come back for her.',
        'He is up at the top. Despot Auriel. Under the sun he pinned. He will fight in its light, and then — we see.',
      ]),
    ],
  },

  general: [
    ARC_TURNING, NUDGE_EVENING, ARC_NIGHT, NUDGE_LAMP, ARC_HOME,
    { when: pre(princes(5)), lines: [
      'Five Radiances. One left. The Despot has not come out of the Palace of Noon in a week, they say.',
      'The Heliostat door opens at six. Six Radiances down and the Tribunal terrace lets you climb to the Crown.',
      'Eat first. Equip your best three charms. And bring a rod you trust; there is water even up there.',
    ] },
    { when: pre(princes(4)), lines: [
      'Four courts free. Somebody hung a curtain in Meridian and nobody came to take it down. Nobody.',
      'Have you a boat? Ottoline builds them. The Outer Sea is wide; you will want something stout when this is done.',
      'Wren Halloran on the quay has a story about the mirror-buoys. Ask her. She has wanted someone to ask.',
    ] },
    { when: pre(princes(2)), lines: [
      'Two Radiances! The Despot knows your face now. He will have had it painted on a wall somewhere. In full light.',
      'Quests pay mostly in Orbs — those lights. Every quest on Solmara ends with a fight. Every one.',
      'If one court is too hard, try another and come back. The roads go round. So does the sun, ordinarily.',
    ] },
    { when: pre(princes(1)), lines: [
      'One Radiance down! Every prince drops something of theirs — an artifact. You may wear one at a time.',
      'And a key. Keys open things. The dungeon gate, the sealed coves out at sea. Not a curtain. Those are banned.',
      'The Noon is gentlest. The Tribunal is hardest — leave it. The gorge, the painters and the mages sit between.',
    ] },
    {
      lines: [
        'Six courts, six Radiances, one Despot at the top under a pinned sun. Start with the Noon Court, north.',
        'Press E near anyone to talk. Near water with a rod, E casts. Near a counter, E opens it.',
        'TAB is your pack — charms go on there. G is your gene tree; Orbs grow it. M is the isle map.',
        'Each court has its own water. Two of them — the noon pool and the Mana Font — want the prism rod. Wren has it.',
        'A sunpool is too bright to look into; you fish for dark shapes. A mana font is light with letters in it.',
        'Waystones! Touch one in every court and the map lets you jump between them. My glass knees thank you.',
        'Clarity is the law: everything seen. No curtains, no lids, no shade but an hour a day by Dusk Ticket.',
        'The Clears are the bleached. Like me. You can see through us. The colour comes back only in the dark. So.',
        'You crossed the Outer Sea to get here, the far edge of the map. What lies past it, Nocturne will not say.',
        'Lose a fight and you wake where you stood, a little sunburnt. Everything on Solmara is a little sunburnt.',
      ],
    },
  ],
};
