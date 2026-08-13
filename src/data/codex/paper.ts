import { ElementCodex } from '../AbilityCodex';

/**
 * Paper — three books, and a fourth one you write yourself.
 *
 * Verified against `src/elements/paper.ts`, `kits/PaperKit.ts`, `data/PaperJournal.ts`, the five
 * shop upgrades in `data/Upgrades.ts` and the two mastery enhancements in `data/Mastery.ts`.
 * Paper has no perks; every figure below is a constant at the top of the kit or of the journal
 * table.
 */
const paper: ElementCodex = {
  identity:
    'Two ideas that turn out to be the same idea. The first is the Journal: Paper is the only '
    + 'element whose passive is written *between* matches rather than during them — every fight '
    + 'you take is filed away afterwards, a win teaching you how to press that element and a loss '
    + 'teaching you how to survive it, and the notes stay in the save forever. The second is the '
    + 'storybooks: three of them on a shelf, cycled with right-click, and both the click and the '
    + 'ultimate are entirely different abilities depending on which one is open. A ghost blade, a '
    + 'hitscan laser, a teleporting spike; a cavalry charge, an orbital bombardment, a bouncing '
    + 'fire. The three middle keys belong to nobody\'s book. Paper is the widest kit in the game '
    + 'and the only one that gets better at a matchup by losing it.',

  passives: [
    {
      emoji: '📖',
      name: 'The Journal',
      basics:
        'A save-backed record of every element you have fought. Each entry against an element is worth '
        + '−5% damage taken from it, +6% damage dealt to it, −20% off the remaining duration of every '
        + 'debuff it puts on you (capped at 85%, applied by scaling live timers so it shortens what has '
        + 'already landed), +5% move speed in that matchup, and +25 shield HP granted once at the start '
        + 'of the fight. There are six per element: losses always teach defence and wins always teach '
        + 'offence, and which six an element teaches depends on how it actually kills you — a burn '
        + 'element teaches you to shrug first, a burst element teaches you to survive the first exchange.',
      effects: [
        { tag: 'buff', label: 'Resist', detail: '−5% damage taken from that element per entry.' },
        { tag: 'buff', label: 'Pressure', detail: '+6% damage dealt to that element per entry.' },
        { tag: 'buff', label: 'Shrug', detail: '−20% off the remaining duration of every debuff that element puts on you, per entry, capped at 85%. Applied by scaling live timers rather than blocking anything, so it shortens what has already landed.' },
        { tag: 'movement', label: 'Footwork', detail: '+5% move speed in that matchup per entry.' },
        { tag: 'shield', label: 'Guard', detail: '+25 shield HP per entry, granted once at the start of the fight rather than repeatedly.' },
        { tag: 'utility', label: 'Six per element', detail: 'Losses always teach defence and wins always teach offence, and which six an element teaches depends on how it actually kills you — a burn element teaches you to shrug first, a burst element teaches you to survive the first exchange.' },
      ],
      notes: [
        'A complete set of six is worth roughly a 15–20% swing in that matchup. It is a real edge and not a free win, which is the point of the fixed vocabulary.',
        'The passive is player-only by construction: a bot has no save. That is also why the same field can safely mean a resist on you and a vulnerability on them at the same time.',
        'Invasion waves are mixed-element, so there is nobody to take notes on and nothing is written up.',
        'A fourth win of the same kind is still tallied but teaches nothing — three is the ceiling on each side.',
        'Read the whole thing on the THE JOURNAL tab of this screen, element by element.',
      ],
    },
    {
      emoji: '📚',
      name: 'The Shelf',
      basics:
        'Three books — 📗 Knight, 📘 Alien, 📕 Fantasy — cycled in that order with right-click, and '
        + 'Larger Library shelves 📙 Bible and 📓 Herbology alongside them for a ring of five. The shelf '
        + 'drives two keys: Click and Q are entirely different abilities per book, so it is five clicks '
        + 'and five endings behind two buttons. Cycling out of a half-fired Alien burst drops the rest of '
        + 'the burst and still charges the 1.5s reload, so you cannot dodge the downside by flipping the '
        + 'page. The open book\'s cover, the rig\'s accent colour and every effect it throws are that '
        + 'book\'s palette, so an opponent can read which attack is coming.',
      effects: [
        { tag: 'utility', label: 'Three books', detail: '📗 Knight, 📘 Alien, 📕 Fantasy, cycled in that order. Larger Library shelves 📙 Bible and 📓 Herbology alongside them, making it a ring of five.' },
        { tag: 'utility', label: 'It drives two keys', detail: 'Click and Q are both entirely different abilities per book — five clicks and five endings behind two buttons.' },
        { tag: 'cost', label: 'Turning the page mid-laser', detail: 'Cycling out of a half-fired Alien burst drops the rest of the burst but still charges the 1.5s reload. You cannot dodge the downside by flipping the page.' },
        { tag: 'utility', label: 'The character shows it', detail: 'The open book\'s cover, the rig\'s accent colour and every effect it throws are the book\'s own palette, so an opponent can read which attack is coming.' },
      ],
      notes: [
        'A bot has no right mouse button, so it turns the page on a 9–13 second timer instead — slow enough that a player can read the book off it before it changes.',
        'The bot\'s starting book is rolled at the top of every match, so consecutive fights against a Paper bot are not identical.',
        'Larger Library is bought in the Click slot but quietly adds two ultimates as well, because each new book brings its own ending.',
      ],
    },
  ],

  abilities: {
    'paper-storybook': {
      basics:
        'Your click, and which attack it is depends on the open book — the five are listed below. The '
        + 'cooldown is shared, so switching books does not reset it and cannot be used to cast twice in a '
        + 'row. 0.9s cooldown, right-click to cycle.',
      cast: 'Click. 0.9s cooldown, shared by every book. Right-click cycles which one you are casting.',
      effects: [
        { tag: 'utility', label: 'One key, five attacks', detail: 'The cooldown is shared, so switching books does not reset it and cannot be used to cast twice in a row.' },
      ],
      variants: {
        label: 'What the click does, per book',
        variants: [
          { emoji: '📗', name: 'Knight — Excalibur', description: 'A ghostly green blade at 620 px/s for 2.2s, dealing 15 to each body it reaches. It bends toward the nearest enemy within 155px at up to 3.6 radians a second, so a shot thrown wide curves in rather than snapping — it homes if it is near, not simply homes.' },
          { emoji: '📘', name: 'Alien — the laser', description: 'A hitscan beam: 4 damage every 0.5s for 2 seconds — four ticks, 16 total — down a 900px line 16px wide, then a 1.5s reload you have to sit through. It pierces: everybody standing on the line is charged, and only the drawn beam stops at the nearest body. A click during the burst or the reload does nothing and costs no cooldown.' },
          { emoji: '📕', name: 'Fantasy — the spike', description: 'A violet spike at 700 px/s for 6 damage. On a hit it vanishes into a portal, reappears 96px away on a random side of the same body after 0.28s, and comes again — three strikes for 18 total, arriving from somewhere the victim was not backing away from.' },
          { emoji: '📙', name: 'Bible — scripture', description: 'Needs Larger Library. A 96×22 slab of light thrown broadside on at 520 px/s for 1.8s: 12 damage, once per body, and a 320px shove along the throw over 0.28 seconds. The 12 is a rounding error next to being put most of an arena back into a wall.', requiresUpgrade: 'click' },
          { emoji: '📓', name: 'Herbology — seeds', description: 'Needs Larger Library. Three seeds at 620 px/s that deal no damage whatsoever. A seed that touches a body is simply wasted. One that reaches a wall heals you 3, plus up to 6 more for how close it came on the way — full value at 42px, nothing at all past 150px. So 9 to 27 health, and the ability is entirely about how tightly you are willing to shave somebody.', requiresUpgrade: 'click' },
        ],
      },
      upgrade: {
        basics:
          'Adds two more books to the ring, each with its own click and its own ending. The Bible click '
          + 'is 12 damage broadside with a 320px shove; the Herbology click plants three seeds worth 3 to 9 '
          + 'health each, paid on the wall behind them. The Bible ending replaces Q with a crucifix that '
          + 'chains one enemy to the spot for 5 seconds with no damage at all; the Herbology ending is a '
          + 'lotus worth 100 health in one press. Right-click cycles all five in order and nothing gets a '
          + 'second key, so a specific book is up to four presses away.',
        effects: [
          { tag: 'damage', label: 'The Bible click', detail: '12 damage broadside and a 320px shove. See the variants above.', requiresUpgrade: 'click' },
          { tag: 'heal', label: 'The Herbology click', detail: '3 to 9 health per seed, three seeds, paid on the wall behind them.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'The Bible ending', detail: 'Q becomes a crucifix that chains one enemy to the spot for 5 seconds with no damage at all.', requiresUpgrade: 'click' },
          { tag: 'heal', label: 'The Herbology ending', detail: 'Q becomes a lotus worth 100 health in one press.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The ring goes to five', detail: 'Right-click cycles all five in order. Nothing gets a second key, so a specific book is up to four presses away.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The Alien book is the only one whose economy is its own two clocks rather than the ability\'s cooldown, which is why its click can be refused without costing anything.',
        'A Fantasy spike that never connects simply flies until it leaves the arena or its 3.2 seconds run out — the three strikes are three *hits*, not three throws.',
        'Nothing else in the kit asks you to miss on purpose. A Herbology seed thrown down a lane somebody is standing at the edge of is worth three times one thrown into open floor.',
      ],
    },

    'paper-plane': {
      basics:
        'Tapping throws a plane at 560 px/s for 2.6 seconds, crumpling against the first wall; holding '
        + 'rides it at 470 px/s instead — deliberately slower, because a ride you cannot react to is a '
        + 'teleport rather than a glide — steering at up to 2.4 radians a second toward the cursor and '
        + 'banking visibly into its turns. Which one you get is decided on the very first frame rather '
        + 'than after a hold timer. Either way it deals 10 damage to each body it passes through, once '
        + 'each. The ride takes the same body claim a Space dodge uses, so WASD does nothing for its '
        + 'duration and the plane cannot turn on the spot, and a ridden plane is clamped at the walls '
        + 'rather than crumpling, so a rider is never carried out of the arena — it ends on the key '
        + 'release, on death, or when its 2.6 seconds run out. 8s cooldown.',
      cast: 'E. Tapping throws; holding rides, decided on the very first frame rather than after a hold timer. 8s cooldown. Releasing E dismounts immediately.',
      effects: [
        { tag: 'damage', label: 'The hit', detail: '10 damage to each body it passes through, once each, whether it is being ridden or not.' },
        { tag: 'movement', label: 'Thrown', detail: '560 px/s for 2.6 seconds, and it crumples against the first wall.' },
        { tag: 'movement', label: 'Ridden', detail: '470 px/s — deliberately slower, because a ride you cannot react to is a teleport rather than a glide — steering at up to 2.4 radians a second toward the cursor. It banks visibly into its turns.' },
        { tag: 'cost', label: 'You are not driving', detail: 'The ride takes the same body claim a Space dodge uses, so WASD does nothing for its duration and the plane cannot turn on the spot.' },
        { tag: 'utility', label: 'A ridden plane cannot leave', detail: 'It is clamped at the walls rather than crumpling, so a rider is never carried out of the arena. It ends on the key release, on death, or when its 2.6 seconds run out.' },
      ],
      upgrade: {
        basics:
          'The nose becomes a drill: anybody hit is written to a point 16px off it every frame and '
          + 'carried until the plane meets a wall — stomped rather than pushed, because anything gentler '
          + 'loses the fight with their own movement — and the crash deals 10 more damage to everything '
          + 'within 96px. Anything currently unstoppable takes the 10 and is not carried, because a drill '
          + 'that silently failed to carry would read as a broken upgrade. It works on a ridden plane too: '
          + 'riding into somebody drills them and takes both of you to the wall.',
        effects: [
          { tag: 'control', label: 'Speared', detail: 'Anybody hit is written to a point 16px off the nose every frame and carried until the plane meets a wall. The position is stomped rather than pushed, because anything gentler loses the fight with their own movement.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'The crash', detail: '10 more damage to everything within 96px of where the plane met the wall.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Unmovable targets are just hit', detail: 'Anything currently unstoppable takes the 10 and is not carried — a drill that silently failed to carry would read as a broken upgrade.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'It works on a ridden plane too', detail: 'Riding into somebody drills them and takes both of you to the wall.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The ride is read straight off the key rather than through the ability, so holding E does not re-stamp the cooldown sixty times a second.',
        'A ridden plane at 470 px/s across 2.6 seconds is about 1200px of travel — most of two arena widths — which makes E by some distance the largest repositioning tool in the kit.',
        'A Space dodge taken mid-flight fights the plane for the body, and the plane re-asserts its claim every frame, so the dash is largely wasted.',
      ],
    },

    'paper-shuriken': {
      basics:
        'Throws a 20px star at 640 px/s that cuts each body once on the way past for 15 damage and '
        + 'opens a bleed of 2% of whatever they have left, every second, for 4 seconds, minimum 1 — a '
        + 'fraction rather than a flat figure, so it is a rounding error on a husk and real on a boss. It '
        + 'buries itself in the first wall and spins there for 8 seconds, cutting anything within 20px '
        + 'for another 15 and a fresh bleed no more than once every 1.2s per body. It always sticks '
        + 'somewhere: if four seconds pass without a wall, it sticks wherever it has got to. 12s '
        + 'cooldown.',
      cast: 'R, aimed at the cursor. 12s cooldown.',
      effects: [
        { tag: 'damage', label: 'The cut', detail: '15 damage, at 640 px/s, on a 20px star. Each body is cut once on the way past.' },
        { tag: 'dot', label: 'The bleed', detail: '2% of whatever the victim has left, every second, for 4 seconds — minimum 1. A fraction rather than a flat figure, so it is a rounding error on a husk and real on a boss.' },
        { tag: 'area', label: 'Buried in the wall', detail: '8 seconds spinning where it landed, cutting anything within 20px of it for another 15 and a fresh bleed, no more than once every 1.2s per body.' },
        { tag: 'utility', label: 'It always sticks somewhere', detail: 'It buries itself in the first wall — and if four seconds pass without one, it sticks wherever it has got to.' },
      ],
      upgrade: {
        basics:
          'The star is 40px instead of 20 in flight and buried, and stays in the wall 16 seconds instead '
          + 'of 8. Any live projectile from either side passing within 48px spins it back into the room at '
          + '640 px/s aimed roughly inward, no more than once every 0.26s, and it will not stop again until '
          + 'it finds another wall. Every launch banks 2 more seconds of wall time, so a pinwheel that '
          + 'keeps being shot off the wall keeps outlasting its own timer — and the hit list and per-victim '
          + 'clocks are both cleared on a kick, so the same body can be cut for 15 again by the same wheel '
          + 'every time it is launched.',
        effects: [
          { tag: 'area', label: 'Bigger', detail: '40px instead of 20px, both in flight and buried.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'Longer', detail: '16 seconds in the wall instead of 8.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Kicked loose', detail: 'Any live projectile from either side passing within 48px spins it back into the room at 640 px/s, aimed roughly inward, no more than once every 0.26s. It will not stop again until it finds another wall.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'It gets harder to be rid of', detail: 'Every launch banks 2 more seconds of wall time. A pinwheel that keeps being shot off the wall keeps outlasting its own timer.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Every launch is a fresh pass', detail: 'The hit list and the per-victim clocks are both cleared on a kick, so the same body can be cut for 15 again by the same wheel every time it is launched.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The wheel does not eat the shot that kicked it. Both continue.',
        'A buried shuriken only ever cuts its owner\'s enemies, so it is safe to stand next to your own.',
        'The bleed refreshes rather than stacking, and its tick clock is preserved across refreshes so a re-cut does not reset the countdown to the next tick.',
      ],
    },

    'paper-mache': {
      basics:
        'Places 6 paper monsters in a ring around you, 58 to 136px out with a random phase so no two '
        + 'casts land the same, each lasting 10 seconds. They are mines: 6 damage to anything that comes '
        + 'within 26px, and the monster is spent. Each also destroys an enemy projectile passing within '
        + '26px outright — from either projectile system, so it works against every element rather than '
        + 'half of them — and a monster that ate something stands up, turns on the nearest enemy at 330 '
        + 'px/s and bites for 8, living 5 seconds from the moment it woke. 18s cooldown.',
      cast: 'F. Instant, no aim — the ring is placed around you, 58 to 136px out. 18s cooldown.',
      effects: [
        { tag: 'summon', label: 'The six', detail: '6 monsters, 10 seconds each, in a ring with a random phase so no two casts land the same.' },
        { tag: 'damage', label: 'The bite', detail: '6 damage to anything that comes within 26px of one, and the monster is spent. They are mines.' },
        { tag: 'utility', label: 'Eating a shot', detail: 'An enemy projectile passing within 26px is destroyed outright — from either projectile system, so it works against every element rather than half of them.' },
        { tag: 'damage', label: 'Enraged', detail: 'A monster that ate something stands up, turns on the nearest enemy at 330 px/s, and bites for 8. It lives 5 seconds from the moment it woke up.' },
      ],
      upgrade: {
        basics:
          'The monsters hunt from the moment they land: 185 px/s after the nearest enemy, biting for 4 '
          + 'and spent on the bite. Feeding one a bullet still turns it into the 8-damage, 330 px/s enraged '
          + 'version — the upgrade changes what a monster does with its life, not what an enraged one is '
          + 'worth — and the scatter is identical either way, because six mines and six hunters want the '
          + 'same spread.',
        effects: [
          { tag: 'damage', label: 'The hunt', detail: '4 damage a bite at 185 px/s, chasing the nearest enemy from the moment they land. Each is spent on its bite.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Still enrageable', detail: 'Feeding one a bullet still turns it into the 8-damage, 330 px/s version — the upgrade changes what a monster does with its life, not what an enraged one is worth.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Same ring', detail: 'The scatter is identical either way. Six mines and six hunters want the same spread.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The shop card says the upgrade makes the bullet stop rather than carry on past. It already did — an ordinary face-up fortune-teller destroys the shot it eats too.',
        'Six mines around your feet is genuinely awkward to walk into, and it is the reason Paper can hold ground at all. Six hunters give that up for pressure.',
        'A monster is not a Fighter: nothing damages one, and the only things that end one are its ten seconds, its bite, or being eaten by a Summon Purge.',
      ],
    },

    'paper-climax': {
      basics:
        'Your ultimate, and which of the five endings fires is whichever book is open at the moment of '
        + 'the press. There is no way to queue a different one. 40s cooldown, shared across every book.',
      cast: 'Q, ultimate, aimed at the cursor where the ending cares. 40s cooldown, shared across every book.',
      effects: [
        { tag: 'utility', label: 'One key, five endings', detail: 'Which one fires is whichever book is open at the moment of the press. There is no way to queue a different one.' },
      ],
      variants: {
        label: 'The ending, per book',
        variants: [
          { emoji: '📗', name: 'Knight — the Charge', description: '12 ghost riders enter from the side you aimed at, spread down the full height in four staggered waves 60ms apart, at 760 px/s. 50 damage, and the whole wave shares one hit list — twelve riders are one attack, so a body caught by all of them takes 50, not 600. Hit box is roughly 80×96 per rider.' },
          { emoji: '📘', name: 'Alien — the Bombardment', description: '60 rings painted on the floor, 25 of them within 90px of the nearest enemy and the other 35 scattered across the arena. They arm over 2 seconds and then land 25ms apart. Each is 25 damage and a 2-second stun in a 46px circle — and they overlap, so standing where three land is 75 damage and three stuns.' },
          { emoji: '📕', name: 'Fantasy — the Flame Spirit', description: 'One spirit at 330 px/s for 8 seconds, bouncing off the walls like a screensaver with no loss of speed and no steering at all. Every 90ms it drops a 28px patch of fire that lasts 3 seconds and burns for 4 damage a second — about 89 patches over the ultimate, laid across whatever path it happened to take.' },
          { emoji: '📙', name: 'Bible — Judgement', description: 'Needs Larger Library. A crucifix comes down on the enemy nearest your cursor and chains them to the floor for 5 seconds. No damage at all — it is the only ending in the kit that buys time instead of spending it. It is refused outright against anything currently unstoppable, and says ⛓️ UNBOUND.', requiresUpgrade: 'click' },
          { emoji: '📓', name: 'Herbology — the Lotus', description: 'Needs Larger Library. A lotus opens under you and hands back 100 health in one press. Nothing else happens; the flower is a drawing.', requiresUpgrade: 'click' },
        ],
      },
      upgrade: {
        basics:
          'Two endings fire instead of one. The second is drawn from every book on the shelf except the '
          + 'one that is open, so it always adds an ability rather than occasionally casting the same one '
          + 'twice — a coin flip between the two books you are not holding, or one of four with Larger '
          + 'Library. It announces the roll with 📖 OPEN-ENDED and the book\'s name over your head before '
          + 'the second ending starts.',
        effects: [
          { tag: 'utility', label: 'Two endings', detail: 'The second is drawn from every book on the shelf except the one that is open, so it always adds an ability rather than occasionally casting the same one twice.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The pool is the shelf', detail: 'Without Larger Library that is a coin flip between the two books you are not holding. With it, one of four.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'It announces the roll', detail: '📖 OPEN-ENDED and the book\'s name over your head, before the second ending starts.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The Bombardment is by far the largest ceiling in the element and by far the most dependent on the enemy standing still — which is exactly what the Bible\'s crucifix does, and why Open-Ended rolling those two together is the best outcome in the kit.',
        'The Charge is the only ending that is a single guaranteed 50, and the only one that is over in under a second.',
        'The Spirit is uncontrollable on purpose. There is no aim past the initial direction and no way to steer it, so it is a zoning ultimate rather than a damage one.',
        'The 40 seconds are shared, so a Paper player has to decide which book they want to be holding well before they need the ultimate.',
      ],
    },
  },

  mastery: {
    'spirit-of-the-story': {
      basics:
        'The open book now carries a standing buff, so right-click is a free, instant stance change '
        + 'with no cooldown. 📗 Knight is ×0.8 damage taken, on Paper\'s own rewritten-every-frame '
        + 'multiplier so it multiplies honestly with the Journal\'s resist entries. 📘 Alien is ×1.2 '
        + 'damage dealt, applied victim-side on everyone you are fighting, so it covers every source in '
        + 'the kit at once — the laser, the blade, the spike, the plane, the shuriken and its bleed, the '
        + 'monsters, all five endings and the mastery\'s own shards. 📕 Fantasy is +25% move speed, folded '
        + 'into the same pulled aggregate the Journal\'s footwork uses. With Larger Library, 📙 Bible is '
        + '×0.8 move speed on everyone you are fighting for as long as it stays open — the only one of '
        + 'the five worn by somebody else, and the only way off it is you turning the page — and 📓 '
        + 'Herbology is 3 health a second, continuously, with no cap and no condition beyond holding the '
        + 'book.',
      effects: [
        { tag: 'shield', label: '📗 Knight — armoured', detail: '×0.8 damage taken, on Paper\'s own rewritten-every-frame multiplier, so it multiplies honestly with the Journal\'s resist entries rather than replacing them.' },
        { tag: 'damage', label: '📘 Alien — amplified', detail: '×1.2 damage dealt, applied victim-side on everyone you are fighting — so it covers every source in the kit at once: the laser, the blade, the spike, the plane, the shuriken and its bleed, the monsters, all five endings and the mastery\'s own shards.' },
        { tag: 'movement', label: '📕 Fantasy — swift', detail: '+25% move speed, folded into the same pulled aggregate the Journal\'s footwork entries use.' },
        { tag: 'debuff', label: '📙 Bible — slowed them', detail: '×0.8 move speed on everyone you are fighting, for as long as the book stays open. The only one of the five worn by somebody else, and the only way off it is you turning the page. Needs Larger Library.', requiresUpgrade: 'click' },
        { tag: 'heal', label: '📓 Herbology — regenerating', detail: '3 health a second, continuously, with no cap and no condition beyond holding the book. Needs Larger Library.', requiresUpgrade: 'click' },
        { tag: 'utility', label: 'Right-click is a stance change', detail: 'Free, instant, no cooldown — exactly as it was before. Three stances without Larger Library, five with it.' },
      ],
      notes: [
        'This is the enhancement that finally makes the shelf a decision rather than a rotation. Before it, you turned the page to get the attack you wanted; now every page turn is also giving something up.',
        'Knight and Alien are the two that fight each other. The armour is worth most in the exchange you are losing and the damage is worth most in the one you are winning, and the click you get with each pulls the same way — a blade that seeks, or a laser that has to stand still.',
        'The Bible slow reaches husks through their own walk multiplier and the two 1v1 fighters through the arena\'s pulled speed aggregate. It is deliberately handed back only to a body this kit is still the one slowing, so turning the page cannot cancel somebody else\'s slow.',
        'Herbology\'s 3 a second is small and never stops. Over a two-minute fight it is 360 health, which is more than the Q on the same book hands back in one press.',
        'Bots with the mastery on choose their page instead of cycling it: hurt they open Herbology or Knight, out of reach they take the Fantasy stride, and otherwise they press with Alien.',
      ],
    },
    restructure: {
      basics:
        'A bindable tear: you come apart into 14 shards at 5 damage each, 13px reach, launched in an '
        + 'even ring at 470–840 px/s and bouncing off the walls without losing speed, every cut opening '
        + 'the pinwheel\'s bleed for 2 seconds at 2% of what the victim has left. Each shard holds its own '
        + '0.5s re-cut clock per victim, so a room full of them is a grinder rather than one enormous '
        + 'hit, and all fourteen can cut the same person on the same frame. While you are in pieces you '
        + 'are invincible and invisible, with no body and no health bar, folded into the same '
        + 'nothing-to-aim-at flag Silence\'s stealth and the Depths camouflage use, so a bot stops '
        + 'fighting and wanders — but every key and the click are dead and drained rather than buffered, '
        + 'so the tray does not fire all at once when you are whole, and a plane you were riding puts you '
        + 'down while a laser mid-burst stops. The body slides from where it tore to wherever you are '
        + 'pointing in step with how many shards are back, tracking your cursor the whole way, so it '
        + 'doubles as a slow, unstoppable, uninterruptible reposition. It costs 25 health off the bar and '
        + 'straight back on as weak HP, the grey layer that soaks a hit and drains at 3 a second, most of '
        + 'it draining while you are still in pieces — and it never takes your last point. 2.3 seconds of '
        + 'scatter then one shard turning round every 0.185s, about 4.9 seconds all told. Cannot be bound '
        + 'over Q. 32s cooldown.',
      cast: 'The bound key, tapped. Cannot be bound over Q. 32s cooldown, on the kit\'s own timer rather than the slot\'s.',
      effects: [
        { tag: 'damage', label: 'The shards', detail: '14 pieces, 5 damage each, 13px reach against a normal body, launched in an even ring at 470–840 px/s and bouncing off the arena walls without losing speed.' },
        { tag: 'debuff', label: 'The bleed', detail: 'Every cut opens the pinwheel\'s bleed for 2 seconds: 2% of what the victim has left, every second. It refreshes rather than stacking.' },
        { tag: 'utility', label: 'One shard, one body, twice a second', detail: 'Each shard holds its own 0.5s re-cut clock per victim, so a room full of them is a grinder rather than one enormous hit — and fourteen of them can all cut the same person on the same frame.' },
        { tag: 'shield', label: 'Nothing to hit', detail: 'Invincible for the whole tear. Invisible with it — no body, no health bar — and folded into the same "there is nothing to aim at" flag Silence\'s stealth and the Depths camouflage use, so a bot stops fighting and wanders.' },
        { tag: 'cost', label: 'Nothing to press', detail: 'Every key and the click are dead for the duration, and drained rather than buffered, so the tray does not fire all at once the moment you are whole. A plane you were riding puts you down and a laser mid-burst stops.' },
        { tag: 'movement', label: 'It ends at your cursor', detail: 'The body slides from where it tore to wherever you are pointing, in step with how many shards are back — so the ability doubles as a slow, unstoppable, uninterruptible reposition. The point tracks your cursor the whole way.' },
        { tag: 'cost', label: 'The price', detail: '25 health comes off the bar and goes straight back on as weak HP, the grey layer that soaks a hit and drains at 3 a second. Most of it drains while you are still in pieces, which is the point. Never takes your last point of health.' },
        { tag: 'utility', label: 'How long', detail: '2.3 seconds of scatter, then one shard turning round every 0.185s — about 4.9 seconds all told, and the card counts the rebuild rather than the cooldown while it runs.' },
      ],
      notes: [
        'It is a panic button that hurts people, which is unusual: almost every escape in the game is a pure defensive spend. Fourteen shards bouncing around a small arena for five seconds is real damage, and the bleed on each of them is worth more against something with a big health pool.',
        'The reposition is the half that wins fights. Nothing can interrupt it, nothing can hit you during it, and you choose where it ends — so it is the answer to being cornered, to a Bombardment about to land, and to any ultimate with a wind-up.',
        'The weak HP is not a heal and is not meant to read as one. You are down 25 real health for the rest of the fight; what you get back is a few seconds of grey that you spend invincible and therefore mostly waste.',
        'It is barred from Q by `excludeSlots`. The Herbology lotus is the only heal in the entire element, and binding a health cost over the one thing that pays it back would be a trap rather than a choice.',
        'The cooldown lives on the kit\'s own timer, not the cooldown map, because the slot it is bound over still owns that — and it is broadcast by hand in online play for the same reason.',
        'Bots with the mastery on tear at 45% health or less, and put their rebuild point down 150px behind whoever they are fighting, so they come back somewhere useful rather than in the corner they were pinned in.',
      ],
    },
  },
};

export default paper;
