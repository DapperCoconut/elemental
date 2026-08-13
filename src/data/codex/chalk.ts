import { ElementCodex } from '../AbilityCodex';

/**
 * Chalk — the element where the cursor is the weapon and the key only says what colour.
 *
 * Verified against `src/elements/chalk.ts`, `kits/ChalkKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the two Chalk Mastery enhancements in `data/Mastery.ts`. Chalk has no
 * perks; every figure below is a constant at the top of the kit.
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
      basics:
        'Every ability opens a drawing window: a mark is laid every 12px of cursor travel, or 17px '
        + 'during a Masterpiece, which runs 8 seconds and would otherwise carpet the floor. Moving the '
        + 'cursor more than 96px between marks lifts the pen and the next mark starts a fresh unjoined '
        + 'run rather than drawing a straight stripe across the arena. A window that is already open '
        + 'swallows every other key, so you cannot start a second drawing while one is running, and the '
        + 'input is eaten rather than the half-drawn line being thrown away. The windows are Ward 1s, '
        + 'Explosive Chalk 2s, Perma-Chalk 0.5s, Chalk Shield 1s (2.5s upgraded) and Masterpiece 8s. 460 '
        + 'marks may lie on the floor at once across both sides, and past that the oldest non-blue mark '
        + 'is rubbed out, so a blue line is never the thing that gets erased.',
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
      basics:
        'A body standing on chalk takes the single highest rate covering it — 30/s from blue, 18/s from '
        + 'orange — and nothing else; overlap never sums, fractions carry between frames, and a part-tick '
        + 'is dropped rather than banked the moment they step off. Blasts are gated to one per victim '
        + 'every 180ms, so one dab of a dense scribble hurts them and the other nineteen in the same '
        + 'instant do not. What each artist is standing on is read before anything deals damage that '
        + 'frame, so a Prodigy crimson boost applies to a blast landing on the same tick you stepped onto '
        + 'it. And only the artist benefits: green heals, teal hastens and crimson empowers whoever drew '
        + 'them, so standing on somebody else\'s green does nothing at all.',
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
      basics:
        'Opens a 1-second drawing window; the whole run detonates half a second after it closes, '
        + 'however long ago the first dab was laid. Each mark is 34px, and a body takes 10 damage plus 5 '
        + 'for every additional white mark covering it, capped at 5 marks, so 30 is the ceiling for one '
        + 'Ward. The run is resolved as a single blast against each body rather than a stream the gate '
        + 'would throw away. The bursts drawn are thinned to 30px apart and at most 16 of them, because a '
        + 'hundred flashes in one frame is a white screen rather than an ability. 2s cooldown.',
      cast: 'Click. Opens a 1s drawing window; the whole run detonates 0.5s after the window closes, however long ago the first dab was laid. 2s cooldown.',
      effects: [
        { tag: 'damage', label: 'The sheet', detail: '10 damage, +5 for each additional white mark covering the same body, capped at 5 marks — so 30 is the ceiling for one Ward.' },
        { tag: 'area', label: 'Each mark', detail: '34px. A body is "covered" by every mark within that of it, and the count is what sets the damage.' },
        { tag: 'utility', label: 'One hit', detail: 'A run is resolved as a single blast against each body, so the whole scribble is one number rather than a stream the gate would throw away.' },
        { tag: 'utility', label: 'The bursts drawn', detail: 'Thinned to 30px apart and at most 16 of them — a hundred flashes in one frame is a white screen, not an ability.' },
      ],
      upgrade: {
        basics:
          'The run also leaves up to 4 clouds, spread along it rather than heaped on its first few marks, '
          + '56px across and hanging 4 seconds. Standing in one is ×0.62 movement speed — 38% slower — and '
          + '×1.5 damage from every kind of your chalk: wards, red blasts, the enclosure, blue burn, orange '
          + 'burn and shield payback alike. A cloud belongs to whoever drew the ward and does nothing at '
          + 'all to them.',
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
      basics:
        'Opens a 2-second drawing window, and one second after it closes the line starts burning from '
        + 'end to end: 55ms between consecutive marks, so a 40-mark line takes about 2.2 seconds, with '
        + 'every mark knowing its turn in advance and brightening as it approaches. Each blast is 10 '
        + 'damage within 40px. Standing still on the line is not 40 blasts — the 180ms gate lets one '
        + 'through at a time, so a burning line is roughly 5.5 hits a second at most. 9s cooldown.',
      cast: 'E. Opens a 2s drawing window; the run starts going up 1s after it closes. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Each blast', detail: '10 damage within 40px of the mark.' },
        { tag: 'utility', label: 'The fuse walking', detail: '55ms between consecutive marks, so a 40-mark line takes about 2.2 seconds to burn from end to end. Every mark knows its own turn in advance and brightens as it approaches.' },
        { tag: 'utility', label: 'One hit per 180ms', detail: 'Standing still on the line is not 40 blasts — the blast gate lets one through every 180ms, so a burning line is roughly 5.5 hits a second at most.' },
      ],
      upgrade: {
        basics:
          'A line that closes on itself detonates the shape as well: 25 damage to everything standing '
          + 'inside it, with no falloff and no size limit, so a loop around half the arena is the same 25 '
          + 'as a loop around their feet. Closing means coming back within 34px of an earlier mark at least '
          + '8 marks behind, enclosing at least 3500 px² — smaller is an accident rather than a plan — and '
          + 'a scribble that closes more than once uses the largest shape it made rather than the first '
          + 'knot it tied. It fires just after the line\'s own last blast so it reads as the conclusion, and '
          + 'it is not blast-gated, so it always lands.',
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
      basics:
        'Opens a half-second drawing window and lays a permanent blue line that burns any enemy within '
        + '24px for 30 damage a second — the highest single rate covering them rather than the sum, so a '
        + 'wider scribble is a wider trap and not a hotter one. It never expires and it is the one kind '
        + 'of chalk the 460-mark floor limit refuses to erase. Only one line exists: recasting erases the '
        + 'previous stroke outright before the new window opens. 6s cooldown, so it can be moved often.',
      cast: 'R. Opens a 0.5s drawing window. 6s cooldown, so the line can be moved often.',
      effects: [
        { tag: 'dot', label: 'The burn', detail: '30 damage a second to any enemy within 24px of any blue mark. The highest single rate covering them, not the sum — a wider scribble is a wider trap, not a hotter one.' },
        { tag: 'utility', label: 'Permanent', detail: 'No expiry at all, and it is the one kind of chalk the 460-mark floor limit refuses to erase.' },
        { tag: 'utility', label: 'One line only', detail: 'Recasting erases the previous stroke outright before the new window opens.' },
      ],
      upgrade: {
        basics:
          'Every hostile projectile passing within 20px of any blue mark is destroyed, with no charge '
          + 'count and no cost — a half-second scribble can eat an entire fight\'s worth of shots. The 30 a '
          + 'second is unchanged, so the line is a wall and a trap at once.',
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
      basics:
        'Opens a 1-second confined drawing window and builds the shape you drew into a 125 HP shield '
        + 'the frame it closes. The pool intercepts damage before health as an absorber, so nothing at '
        + 'all reaches you while it stands; any hostile projectile touching a node within 15px is '
        + 'destroyed for 8 off the pool; and enemies are pushed out to the shield\'s reach plus 14px and '
        + 'stopped dead, with leaning on it grinding the pool down at 12 a second. It is drawn inside '
        + '118px and clamped no closer than 30px, so the ring you drew is the ring you get, and it turns '
        + 'at 0.9 radians a second. Nodes are shed in proportion to the pool, so a shield at 20% actually '
        + 'looks like one. A second cast breaks the old one first. 16s cooldown.',
      cast: 'F. Opens a 1s confined drawing window (2.5s upgraded). The shield is built the frame the window closes; a second cast breaks the old one first. 16s cooldown.',
      effects: [
        { tag: 'shield', label: 'The pool', detail: '125 HP. It intercepts damage before health as an absorber, so nothing at all reaches the artist while it stands.' },
        { tag: 'shield', label: 'Shots die on it', detail: 'Any hostile projectile touching a node within 15px is destroyed, for 8 off the pool.' },
        { tag: 'control', label: 'Bodies bounce off it', detail: 'Enemies are pushed out to the shield\'s reach + 14px and stopped dead. Leaning on it grinds the pool down at 12 a second.' },
        { tag: 'area', label: 'The shape', detail: 'Drawn inside 118px and clamped no closer than 30px, so the ring you drew is the ring you get. It turns at 0.9 radians a second.' },
        { tag: 'utility', label: 'It visibly wears', detail: 'Nodes are shed in proportion to the pool, so a shield at 20% actually looks like one — and the pieces snap off with a puff of chalk.' },
      ],
      upgrade: {
        basics:
          'The drawing window goes to 2.5 seconds and E / R / F swap stick mid-draw without closing it. '
          + 'The pool scales with the blue fraction up to ×2.5, so an all-blue shield is 312 HP and a '
          + 'half-blue one 219, and the red fraction pays back: 14 damage × the red fraction to the nearest '
          + 'enemy every time the shield takes anything at all — an absorbed hit, a blocked shot or a body '
          + 'leaning on it — blast-gated at 180ms so a burst cannot chain it. Both bonuses are read off the '
          + 'shield as a whole rather than per node, so half blue is half the toughness bonus however the '
          + 'halves are arranged.',
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
      basics:
        'Eight seconds of painting during which nothing lands on you from anybody — and during which '
        + 'you cannot cast a single ability, because the mouse draws and the keys pick colours. That '
        + 'invincibility is what pays for it. Marks are 26px across, laid every 17px of cursor travel, '
        + 'capped at 200 a side, and last 30 seconds each. Green heals you 9 a second while you stand on '
        + 'it, and only you. Orange deals 18 a second to any enemy standing on it, max-not-sum as ever. '
        + 'Teal is ×1.45 movement speed while you stand on it. 48s cooldown, and the tray shows the '
        + 'work\'s own 8-second clock.',
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
        basics:
          'Adds crimson to the palette, taken with Q during the work: standing on your own crimson '
          + 'multiplies every point of chalk damage you deal by 1.5 — wards, red blasts, enclosures, both '
          + 'burns and shield payback. It also teaches the Perma-Chalk line whatever you painted, counted '
          + 'mark for mark at the end of the work: green makes the blue line heal you when you stand on it, '
          + 'orange adds +2/s to its 30, teal hastens you on it, and crimson gives you the ×1.5 while you '
          + 'stand on it. The enhancement lasts until the next Masterpiece and is cleared the instant that '
          + 'one starts rather than when it finishes, so it covers the whole gap between ultimates.',
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

  mastery: {
    'chalk-smudge': {
      basics:
        'Your chalk gets up and walks. One smudge per 9 marks of line — about 108px — or per 22 marks '
        + 'of Perma-Chalk, 24 of yours on the floor at once, and 14 seconds of life for anything that is '
        + 'not blue or green. White, from Ward and Shield, deals 8 on contact and is gone, moving 96px/s. '
        + 'Red, from Explosive, never bites: it bursts for 15 inside 46px when it reaches a body. Blue, '
        + 'from Perma, deals 8 every 1.4s and backs off 30px between bites, and never expires, never '
        + 'fades and is never rubbed out by anything but its artist dying. Orange, from Masterpiece, '
        + 'deals 15 and 3 seconds of burning. Green does not attack at all — it follows you at heel '
        + 'healing 5 a second inside 74px, then fades after 8 seconds. Teal runs at ×2.6 speed, 250px/s, '
        + 'faster than anything else the element puts on the board. Crimson, which needs Prodigy for the '
        + 'colour to exist, is ×0.42 speed and 25 damage a bite. Anything smudged inside a Chalk Shield '
        + 'window is a 46px bar on legs instead, patrolling a 64px ring around you broadside-on and '
        + 'eating 3 hostile shots before it crumbles — and with Supreme Shield a red bar also bursts for '
        + '15 on its last block, on expiry or the moment anything comes within 132px, while a blue bar '
        + 'has no block count and no expiry at all.',
      effects: [
        { tag: 'summon', label: 'The rate', detail: 'One smudge per 9 marks of chalk — about 108px of line — and one per 22 marks for Perma-Chalk. 24 of yours on the floor at once.' },
        { tag: 'damage', label: 'White (Ward, Shield)', detail: '8 damage on contact and it is gone. Moves 96px/s.' },
        { tag: 'damage', label: 'Red (Explosive)', detail: 'Never bites. Bursts for 15 inside 46px when it reaches a body, and is spent doing it.' },
        { tag: 'dot', label: 'Blue (Perma)', detail: '8 damage every 1.4s, backing off 30px between bites — and it never expires, never fades and is never rubbed out by anything but its artist dying.' },
        { tag: 'dot', label: 'Orange (Masterpiece)', detail: '15 damage and 3 seconds of burning, scaled by the victim\'s status duration.' },
        { tag: 'heal', label: 'Green (Masterpiece)', detail: 'Does not attack at all. Follows you at heel and heals 5 health a second inside 74px, then fades after 8 seconds.' },
        { tag: 'movement', label: 'Teal (Masterpiece)', detail: '×2.6 speed — 250px/s, faster than anything else the element puts on the board.' },
        { tag: 'damage', label: 'Crimson (Masterpiece)', detail: '×0.42 speed and 25 damage a bite. Needs the Q+ Prodigy upgrade for crimson to be in the palette at all.', requiresUpgrade: 'q' },
        { tag: 'shield', label: 'Shield smudges', detail: 'Anything smudged inside a Chalk Shield window is a 46px bar on legs instead: it patrols a 64px ring around you broadside-on and eats 3 hostile shots before it crumbles.' },
        { tag: 'shield', label: 'Red and blue bars', detail: 'With Supreme Shield: a red bar blocks 3 shots *and* bursts for 15 — on its last block, on expiry, or the moment anything comes within 132px of it. A blue bar has no block count and no expiry at all.', requiresUpgrade: 'f' },
        { tag: 'utility', label: 'The lifetime', detail: '14 seconds for anything that is not blue or green, so a smudge that never finds a body rubs itself out rather than joining a permanent crowd.' },
      ],
      notes: [
        'The rate being paid in *line* rather than rolled is the whole balance of it. Masterpiece draws for 8 seconds and sheds a dozen; Perma-Chalk draws for half a second and is the rarest source in the kit — which is exactly the right way round, because the blue one is the one that never dies.',
        'Smudge damage goes through the same multiplier as everything else in the element, so standing on crimson makes your swarm hit for ×1.5 and a victim in Chalk Debris takes ×1.5 from every leg of it.',
        'Blast immunity is shared with the rest of the kit: 180ms per victim, so a crowd of red smudges arriving together is one explosion, not six.',
        'A shield window drawn entirely for smudges is a real use of the ability — the bars come off the line as it is being drawn, before the shield itself is ever raised.',
        'Ruin\'s Spikes of Ruin scrubs smudges off the board like any other summon, and a red one razed that way does not get to go off.',
        'A Living Chalk circle sheds nothing. Every mark in it is already being spent on a body, and a smudge crawling out of the drawing you are still making would be the same line paid for twice.',
      ],
    },
    'living-chalk': {
      basics:
        'Opens a 74px circle 104px ahead along your cursor and a 3-second drawing window — press the '
        + 'bound key again to finish early — and what you draw inside it stands up 0.9 seconds later as a '
        + 'creature that lives 30 seconds. E, R, F and Q are Explosive, Perma, Shield and Green chalk, '
        + 'minus whichever one you bound this over. The base body is 35 health, 15 damage a bite every '
        + '1.1s at 30px reach, 92px/s. The shapes you draw change it: every closed triangle is +10 '
        + 'damage, every circle +34 speed (a three-circle drawing runs at 194px/s, faster than any '
        + 'fighter in the game), and every square +20 maximum health, applied before the blue multiplier. '
        + 'The colours scale it: red multiplies its damage by up to ×1.6 at fully Explosive, blue '
        + 'multiplies its health by up to double, and white gives it up to 45 points of shield, spent '
        + 'before its health. One at a time — casting again rubs the last one out — and the circle stands '
        + 'still on the floor, so walking away does not drag it with you. 21s cooldown.',
      cast: 'The bound key. Opens a 74px circle 104px ahead along your cursor and a 3s drawing window; press the bound key again to finish early. E, R, F and Q are Explosive, Perma, Shield and Green chalk — minus whichever one you bound this over. 21 second cooldown.',
      effects: [
        { tag: 'summon', label: 'The base body', detail: '35 health, 15 damage a bite every 1.1s at 30px reach, 92px/s. It stands up 0.9s after the window closes and lives 30 seconds from there.' },
        { tag: 'damage', label: 'Triangles', detail: '+10 damage each. Every closed loop in the drawing is read separately, and they stack.' },
        { tag: 'movement', label: 'Circles', detail: '+34 speed each — a three-circle drawing runs at 194px/s, faster than any fighter in the game.' },
        { tag: 'shield', label: 'Squares', detail: '+20 maximum health each, applied before the blue multiplier.' },
        { tag: 'damage', label: 'Explosive chalk', detail: '×(1 + 0.6 × the fraction drawn in red) on its damage — up to ×1.6 for a body drawn entirely in Explosive Chalk.' },
        { tag: 'shield', label: 'Perma-chalk', detail: '×(1 + 1.0 × the fraction drawn in blue) on its health — up to double.' },
        { tag: 'shield', label: 'Shield chalk', detail: 'Up to 45 points of shield on it, scaled by the fraction drawn in white. Shots spend the shield before they spend its health.' },
        { tag: 'utility', label: 'One at a time', detail: 'Casting again rubs the last one out. It has no cooldown reduction and no recall — the 21 seconds is the whole of its economy.' },
        { tag: 'area', label: 'The circle', detail: '74px across and standing still on the floor: walking away does not drag it with you, and the cursor is pinned to its edge rather than ignored.' },
      ],
      notes: [
        'The shapes are read by the wobble in the stroke\'s radius rather than by counting corners — a hand-drawn triangle at 12px resolution has a dozen corners and a shaky circle has four, so the 3rd and 4th harmonics of the outline are compared instead. A lumpy triangle still reads as a triangle.',
        'A stroke that never comes back near where it started is not read at all. Scribbling for three seconds gives you the base 35/15 body and nothing more.',
        'It is not a Fighter, so nothing in the arena\'s own projectile overlap can find it — the kit gives it a body to be shot in, sized to how far your art actually reached.',
        'Drawing it in white is the only way to make it survive a burst of shots, and drawing it in blue is the only way to make it survive a slow grind. They are different problems and the answer is which stick you finish in.',
        'Bound over Q you keep the whole base kit and lose only the Masterpiece; bound over E you lose the fuse, which is what a bot gives up for it.',
        'Online, only the fact of the cast crosses the wire. Three seconds of somebody else\'s mouse cannot be replicated, so the opponent\'s copy is built to the base statline on your sim.',
      ],
    },
  },
};

export default chalk;
