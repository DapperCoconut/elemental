import { ElementCodex } from '../AbilityCodex';

/**
 * Chalk — the element where the cursor is the weapon and the key only says what colour.
 *
 * Verified against `src/elements/chalk.ts`, `kits/ChalkKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts`. Chalk has no perks and no mastery enhancements; every figure below is a
 * constant at the top of the kit.
 */
const chalk: ElementCodex = {
  identity:
    'Every other element in the game aims something. Chalk draws. Four of its five abilities do '
    + 'nothing at all on the frame you press them — they open a window during which your cursor '
    + 'lays a line of chalk behind it across the floor, and the only difference between them is '
    + 'what that line does afterwards. White goes up all at once and hits harder the more of it '
    + 'you scribbled over somebody. Red waits and then runs the whole length like a fuse. Blue '
    + 'stays where it is until you draw it somewhere else. The fourth kind peels itself off the '
    + 'ground and orbits you as a shield. So a Chalk player\'s damage is a function of where '
    + 'they moved the mouse, not where they clicked — nothing here is aimed at the enemy, it is '
    + 'aimed at the floor the enemy is about to be standing on.',

  passives: [
    {
      emoji: '🖍️',
      name: 'The Drawing Window',
      magic:
        'Pressing a key does not fire anything. It puts a stick of that colour in the artist\'s '
        + 'hand, presses it to the floor, and starts a clock — and from then until the clock '
        + 'runs out, wherever the cursor goes a grainy chalk line follows. The hands press '
        + 'visibly down and shed powder while a window is open, and the ability tray shows the '
        + 'window\'s own clock draining rather than a cooldown.',
      effects: [
        { tag: 'utility', label: 'The resolution', detail: 'A mark is laid every 12px of cursor travel (17px during a Masterpiece, which runs for 8 seconds and would otherwise carpet the floor).' },
        { tag: 'utility', label: 'Lifting the pen', detail: 'Move the cursor more than 96px between marks and the line breaks — the next mark starts a fresh, unjoined run rather than drawing a straight stripe across the arena.' },
        { tag: 'utility', label: 'One hand, one stick', detail: 'A window that is already open swallows every other key. You cannot start a second drawing while one is running, and the input is eaten rather than the half-drawn line being thrown away.' },
        { tag: 'utility', label: 'The windows', detail: 'Ward 1s, Explosive Chalk 2s, Perma-Chalk 0.5s, Chalk Shield 1s (2.5s upgraded), Masterpiece 8s.' },
        { tag: 'utility', label: 'The floor\'s limit', detail: '460 marks on the ground at once across both sides. Past that the oldest non-blue mark is rubbed out to make room, so a blue line is never the thing that gets erased.' },
      ],
      notes: [
        'A Chalk bot has no mouse, so it is given a phantom cursor that circles: over the target\'s feet for white and red, on the midpoint between the two of you for blue, and around itself for the shield.',
        'Because the window is the ability, everything Chalk does is telegraphed for its whole duration. The other side can watch the shape being drawn and simply walk off it.',
      ],
    },
    {
      emoji: '🔥',
      name: 'Standing On It',
      magic:
        'Blue chalk and Masterpiece orange burn whoever is standing on them, and the rule that '
        + 'makes that survivable is that burn rates are taken as a **maximum, never a sum**. '
        + 'Scribbling twenty overlapping marks onto one square metre makes a wider trap, not a '
        + 'stronger one. The same principle guards the explosions: however many blasts land on '
        + 'the same body at the same moment, only one of them is charged.',
      effects: [
        { tag: 'dot', label: 'Max, not sum', detail: 'A body standing on chalk takes the single highest rate of every mark covering it — 30/s from blue, 18/s from orange — and nothing else. Fractions carry between frames, and a part-tick is dropped rather than banked the moment they step off.' },
        { tag: 'utility', label: 'The blast gate', detail: '180ms of blast immunity per victim. One dab of a dense scribble hurts them; the other nineteen in the same instant do not.' },
        { tag: 'utility', label: 'Footing first', detail: 'What each artist is standing on is read before anything deals damage that frame, so a Prodigy crimson boost applies to a blast landing on the same tick you stepped onto it.' },
        { tag: 'utility', label: 'Only the artist benefits', detail: 'Green heals, teal hastens and crimson empowers *the person who drew them* and nobody else. Standing on somebody else\'s green does nothing at all.' },
      ],
      notes: [
        'The gate is why Ward is resolved as one blast for the whole white run rather than one per dab — otherwise the gate would throw away every mark but the first and a scribble would be worth 10.',
        'The one thing not gated is Explosive Release\'s enclosure, which is a single hit by construction and stamps the gate on its way out.',
      ],
    },
  ],

  abilities: {
    'chalk-ward': {
      magic:
        'A stick of white goes down and for one second the cursor scrawls with it. Half a second '
        + 'after your hand comes off the floor the entire scribble goes up together in one sheet '
        + 'of white bursts — not a line running, one flash. What it is worth depends entirely on '
        + 'how much of it you managed to pile onto the same pair of feet.',
      cast: 'Click. Opens a 1s drawing window; the whole run detonates 0.5s after the window closes, however long ago the first dab was laid. 2s cooldown.',
      effects: [
        { tag: 'damage', label: 'The sheet', detail: '10 damage, +5 for each additional white mark covering the same body, capped at 5 marks — so 30 is the ceiling for one Ward.' },
        { tag: 'area', label: 'Each mark', detail: '34px. A body is "covered" by every mark within that of it, and the count is what sets the damage.' },
        { tag: 'utility', label: 'One hit', detail: 'A run is resolved as a single blast against each body, so the whole scribble is one number rather than a stream the gate would throw away.' },
        { tag: 'utility', label: 'The bursts drawn', detail: 'Thinned to 30px apart and at most 16 of them — a hundred flashes in one frame is a white screen, not an ability.' },
      ],
      upgrade: {
        magic:
          'Chalk Debris is what the flash throws up. Powder hangs over the ground the ward just '
          + 'cleared, in loose puffs rather than a disc, and anybody breathing it is both slower '
          + 'and softer to every colour of chalk you own.',
        effects: [
          { tag: 'summon', label: 'The clouds', detail: 'Up to 4, spread along the run rather than heaped on its first few marks, 56px across and hanging for 4 seconds.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'A lungful', detail: '×0.62 movement speed — 38% slower — while standing in one.', requiresUpgrade: 'click' },
          { tag: 'debuff', label: 'And softer', detail: '×1.5 damage from every kind of your chalk: wards, red blasts, the enclosure, blue burn, orange burn and shield payback alike.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Yours only', detail: 'A cloud belongs to whoever drew the ward and does nothing at all to them.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The two-second cooldown makes this the only Chalk ability you cast often. It is also the one that teaches the element: a tight knot over their feet is 30, the same second of drawing spread thin is 10.',
        'The amplifier stacks multiplicatively with Prodigy\'s crimson: a target in your dust while you stand on your own crimson takes ×2.25 from everything.',
      ],
    },

    'chalk-explosive': {
      magic:
        'Red chalk, and two full seconds of it — long enough to draw a line right across the '
        + 'floor in front of somebody. A second after your hand comes up, the line lights at the '
        + 'end you started from and runs the whole length, one blast at a time, in exactly the '
        + 'order you drew it. Where a Ward rewards scribbling over their feet, this rewards '
        + 'guessing where they are going.',
      cast: 'E. Opens a 2s drawing window; the run starts going up 1s after it closes. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Each blast', detail: '10 damage within 40px of the mark.' },
        { tag: 'utility', label: 'The fuse walking', detail: '55ms between consecutive marks, so a 40-mark line takes about 2.2 seconds to burn from end to end. Every mark knows its own turn in advance and brightens as it approaches.' },
        { tag: 'utility', label: 'One hit per 180ms', detail: 'Standing still on the line is not 40 blasts — the blast gate lets one through every 180ms, so a burning line is roughly 5.5 hits a second at most.' },
      ],
      upgrade: {
        magic:
          'Explosive Release rewards closing the loop. Bring the red line back round to meet an '
          + 'earlier part of itself and the floor inside the shape is armed too: it hatches over '
          + 'in red while the line burns, and when the last mark has gone the whole enclosed area '
          + 'lifts at once, however big you drew it.',
        effects: [
          { tag: 'damage', label: 'The enclosure', detail: '25 damage to everything standing inside the shape, with no falloff and no size limit — a loop around half the arena is the same 25 as a loop around their feet.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'What counts as closed', detail: 'The line must come back within 34px of an earlier mark at least 8 marks behind it, and the shape has to enclose at least 3500 px² — smaller than that is an accident rather than a plan.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'The biggest loop wins', detail: 'A scribble that closes more than once uses the largest shape it made, not the first knot it happened to tie.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'The timing', detail: 'It fires just after the line\'s own last blast, so it reads as the line\'s conclusion rather than a second explosion. It is not blast-gated, so it always lands.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The shape is snapshotted the moment the drawing window closes, because the marks that defined it are about to detonate and be deleted.',
        'A closed loop is worth 25 flat *plus* whatever the line itself catches on the way round, so the ideal drawing is a circle whose edge passes through them.',
      ],
    },

    'chalk-perma': {
      magic:
        'Half a second of blue — barely time for a stroke, which is the point. What you draw '
        + 'stays there. It does not expire, it is never trimmed to make room for anything else, '
        + 'and it burns harder per second than anything else in the kit. There is only ever one '
        + 'blue line on the floor: drawing another rubs the first one out in a puff of powder.',
      cast: 'R. Opens a 0.5s drawing window. 6s cooldown, so the line can be moved often.',
      effects: [
        { tag: 'dot', label: 'The burn', detail: '30 damage a second to any enemy within 24px of any blue mark. The highest single rate covering them, not the sum — a wider scribble is a wider trap, not a hotter one.' },
        { tag: 'utility', label: 'Permanent', detail: 'No expiry at all, and it is the one kind of chalk the 460-mark floor limit refuses to erase.' },
        { tag: 'utility', label: 'One line only', detail: 'Recasting erases the previous stroke outright before the new window opens.' },
      ],
      upgrade: {
        magic:
          'Perma-Block turns the blue line from a burn into a wall. Any shot that crosses it is '
          + 'rubbed out where it touched, with a snap of chalk dust — and the line is not spent '
          + 'doing it, which is what makes having drawn it somewhere useful worth so much.',
        effects: [
          { tag: 'shield', label: 'Rubbed out', detail: 'Every hostile projectile passing within 20px of any blue mark is destroyed. There is no charge count and no cost — a half-second scribble can eat an entire fight\'s worth of shots.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Still burns', detail: 'The 30/s is unchanged. The line is both a wall and a trap at once.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Against a ranged element this upgrade is close to a hard counter — a blue line drawn across the lane between you costs nothing per shot it eats.',
        'It only stops projectiles. Beams, blasts, auras and anything a kit paints rather than fires go straight over it.',
        'With Prodigy, whichever colour dominated your last Masterpiece is loaded onto this line as well: it can heal you, hasten you, boost your damage, or add 2/s to its burn.',
      ],
    },

    'chalk-shield': {
      magic:
        'A dashed ring opens around the artist and for a second the chalk will only go down '
        + 'inside it — a cursor sweeping wider is pinned to the edge rather than ignored, so a '
        + 'wild scrawl still becomes something. When the window closes, everything drawn inside '
        + 'the ring peels off the floor and hangs in the air around you at the angle and reach '
        + 'you drew it, turning slowly. It is the only defensive object in the element and it '
        + 'stops absolutely everything.',
      cast: 'F. Opens a 1s confined drawing window (2.5s upgraded). The shield is built the frame the window closes; a second cast breaks the old one first. 16s cooldown.',
      effects: [
        { tag: 'shield', label: 'The pool', detail: '125 HP. It intercepts damage before health as an absorber, so nothing at all reaches the artist while it stands.' },
        { tag: 'shield', label: 'Shots die on it', detail: 'Any hostile projectile touching a node within 15px is destroyed, for 8 off the pool.' },
        { tag: 'control', label: 'Bodies bounce off it', detail: 'Enemies are pushed out to the shield\'s reach + 14px and stopped dead. Leaning on it grinds the pool down at 12 a second.' },
        { tag: 'area', label: 'The shape', detail: 'Drawn inside 118px and clamped no closer than 30px, so the ring you drew is the ring you get. It turns at 0.9 radians a second.' },
        { tag: 'utility', label: 'It visibly wears', detail: 'Nodes are shed in proportion to the pool, so a shield at 20% actually looks like one — and the pieces snap off with a puff of chalk.' },
      ],
      upgrade: {
        magic:
          'Supreme Shield gives you two and a half seconds and three sticks. Press E, R or F '
          + 'part-way through the draw and the rest of the shield comes out in that colour — the '
          + 'whole run still lifts as one object, so what you get is a shield made of whatever '
          + 'proportions you chose. Blue pieces make it far tougher; red pieces go off in the '
          + 'face of anybody who touches it.',
        effects: [
          { tag: 'utility', label: 'Twice the drawing time', detail: '2.5 seconds instead of 1, and E / R / F swap stick mid-draw without closing the window.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Blue is tougher', detail: 'The pool scales with the blue fraction up to ×2.5 — an all-blue shield is 312 HP, a half-blue one 219.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Red is payback', detail: '14 damage × the red fraction to the nearest enemy every time the shield takes anything at all — an absorbed hit, a blocked shot or a body leaning on it. Blast-gated at 180ms so a burst cannot chain it.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Fractions, not pieces', detail: 'Both bonuses are read off the shield as a whole rather than per node, so half blue is half the toughness bonus however the halves happen to be arranged around you.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The absorber eats the *whole* hit whatever its size. A 300-damage ultimate landing on a 125-point shield takes 125 off the pool, breaks it, and deals nothing — which makes the shield worth far more against one big hit than against a stream of small ones.',
        'Payback goes to the nearest enemy rather than to whoever actually hit the shield. At the range a shield operates at, anything close enough to be picked is close enough to have done it.',
        'During an upgraded shield draw the E/R/F keys belong to the palette, so no other ability can be started until the window closes.',
        'Drawing nothing at all — a cursor that never moved — produces no shield and says so.',
      ],
    },

    'chalk-masterpiece': {
      magic:
        'Eight seconds in which nothing can touch you and the whole keyboard becomes a paintbox. '
        + 'The mouse stops casting and starts painting, and it only flows while you hold it down '
        + '— eight seconds of unbroken chalk would be a solid slab. E, R and F swap the stick in '
        + 'your hand between green, orange and teal, and whatever you paint stays on the floor '
        + 'for thirty seconds after you have stopped.',
      cast: 'Q, ultimate. Instant. Hold the mouse to draw; E/R/F pick a colour. 48s cooldown, and the ability tray shows the work\'s own 8-second clock.',
      effects: [
        { tag: 'shield', label: 'Invincible', detail: 'The full 8 seconds. Nothing lands, from anybody, while you are painting.' },
        { tag: 'heal', label: 'Green', detail: '9 health a second while *you* are standing on it. Only the artist is healed by their own green.' },
        { tag: 'dot', label: 'Orange', detail: '18 damage a second to any enemy standing on it — the max-not-sum rule again, so a thick patch is no hotter than a thin one.' },
        { tag: 'buff', label: 'Teal', detail: '×1.45 movement speed while you are standing on it.' },
        { tag: 'area', label: 'The work', detail: 'Marks are 26px across, laid every 17px of cursor travel, capped at 200 per side, and they last 30 seconds from the moment each was drawn.' },
        { tag: 'cost', label: 'You cannot fight', detail: 'No ability can be cast for the whole 8 seconds — the mouse draws and the keys pick colours. The invincibility is what pays for that.' },
      ],
      upgrade: {
        magic:
          'Prodigy adds a fourth stick to the palette — crimson, pushed well into pink so it can '
          + 'never be mistaken for Explosive Chalk\'s red — and then makes the whole work mean '
          + 'something afterwards. Whichever colour you laid the most marks of is what the artist '
          + 'has been practising, and the blue line picks it up and keeps it.',
        effects: [
          { tag: 'buff', label: 'Crimson', detail: 'Taken with Q during the work. Standing on your own crimson multiplies every point of chalk damage you deal by 1.5 — wards, red blasts, enclosures, both burns and shield payback.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'What the line learns', detail: 'Counted mark for mark at the end of the work. Green makes Perma-Chalk heal you when you stand on it, orange adds +2/s to its 30, teal hastens you on it, crimson gives you the ×1.5 while you stand on it.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'How long it lasts', detail: 'Until the next Masterpiece — and it is cleared the instant that one *starts*, not when it finishes, so the enhancement covers the whole gap between ultimates.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The invincibility is the real reason to press it. Eight untouchable seconds is long enough to walk out of anything, and the paint is what you get for the trouble.',
        'Teal plus a blue line is the element\'s only mobility, and the only way a Chalk player reliably gets to the floor they want to be drawing on.',
        'The crimson boost multiplies with Chalk Debris\'s ×1.5, giving a ceiling of ×2.25 on every damage figure in the kit.',
        'A Chalk bot has no mouse button, so it paints in bursts on a sine wave rather than one unbroken ring.',
      ],
    },
  },
};

export default chalk;
