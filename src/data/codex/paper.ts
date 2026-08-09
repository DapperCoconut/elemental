import { ElementCodex } from '../AbilityCodex';

/**
 * Paper — three books, and a fourth one you write yourself.
 *
 * Verified against `src/elements/paper.ts`, `kits/PaperKit.ts`, `data/PaperJournal.ts` and the
 * five shop upgrades in `data/Upgrades.ts`. Paper has no perks and no mastery enhancements;
 * every figure below is a constant at the top of the kit or of the journal table.
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
      magic:
        'A leather-and-gilt book that is not in the arena at all. Every fight you finish as Paper '
        + 'is written up in it against the element you fought, and those notes are permanent and '
        + 'save-backed. There are six entries per element — three you can only earn by losing to '
        + 'it and three you can only earn by beating it — and every one of them makes that '
        + 'specific matchup, and only that matchup, easier forever.',
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
      magic:
        'A storybook floats open beside you and its cover colour is the whole state of the '
        + 'element. Right-click turns to the next book on the shelf with a visible page-flip and a '
        + 'shout of its name. It is free, it is instant, and it has no cooldown — the cost of '
        + 'Storybook Summoning is that only one of its attacks exists at a time, not that changing '
        + 'which one is slow.',
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
      magic:
        'Whatever is written on the open page happens. There is no shared logic between the '
        + 'branches at all — a ghost sword that curves toward people, a hitscan beam on a magazine, '
        + 'a spike that goes through a hole in the world and comes back twice, and with the '
        + 'library two more: a broadside slab of scripture-light and three seeds that are worth '
        + 'nothing at all if they touch anybody.',
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
        magic:
          'Larger Library puts two more books on the shelf and cycles them with the other three. '
          + 'They are not a sixth key — they are two more clicks and two more endings, which makes '
          + 'this the only 100-shard upgrade in the game that adds two ultimates.',
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
      magic:
        'A dart of folded paper, and one object with two completely different jobs. Tap E and you '
        + 'throw it. Hold E and you are on it — the plane banks toward wherever you are pointing, '
        + 'the character is glued to it, and the arena scrolls past underneath until you let go.',
      cast: 'E. Tapping throws; holding rides, decided on the very first frame rather than after a hold timer. 8s cooldown. Releasing E dismounts immediately.',
      effects: [
        { tag: 'damage', label: 'The hit', detail: '10 damage to each body it passes through, once each, whether it is being ridden or not.' },
        { tag: 'movement', label: 'Thrown', detail: '560 px/s for 2.6 seconds, and it crumples against the first wall.' },
        { tag: 'movement', label: 'Ridden', detail: '470 px/s — deliberately slower, because a ride you cannot react to is a teleport rather than a glide — steering at up to 2.4 radians a second toward the cursor. It banks visibly into its turns.' },
        { tag: 'cost', label: 'You are not driving', detail: 'The ride takes the same body claim a Space dodge uses, so WASD does nothing for its duration and the plane cannot turn on the spot.' },
        { tag: 'utility', label: 'A ridden plane cannot leave', detail: 'It is clamped at the walls rather than crumpling, so a rider is never carried out of the arena. It ends on the key release, on death, or when its 2.6 seconds run out.' },
      ],
      upgrade: {
        magic:
          'Plane Drill stops the plane passing through people. It picks them up on the nose '
          + 'instead and does not put them down until it reaches a wall — and then there is a '
          + 'small blast where it lands.',
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
      magic:
        'A big four-bladed folded star, thrown flat and spinning fast. It cuts whoever it reaches '
        + 'and leaves them bleeding, and then it does not stop — it buries itself in the first '
        + 'wall it finds and keeps spinning there for eight seconds, and anybody who comes near it '
        + 'gets cut again. Half of this ability is a projectile and half is a piece of furniture '
        + 'you have to remember to fight next to.',
      cast: 'R, aimed at the cursor. 12s cooldown.',
      effects: [
        { tag: 'damage', label: 'The cut', detail: '15 damage, at 640 px/s, on a 20px star. Each body is cut once on the way past.' },
        { tag: 'dot', label: 'The bleed', detail: '2% of whatever the victim has left, every second, for 4 seconds — minimum 1. A fraction rather than a flat figure, so it is a rounding error on a husk and real on a boss.' },
        { tag: 'area', label: 'Buried in the wall', detail: '8 seconds spinning where it landed, cutting anything within 20px of it for another 15 and a fresh bleed, no more than once every 1.2s per body.' },
        { tag: 'utility', label: 'It always sticks somewhere', detail: 'It buries itself in the first wall — and if four seconds pass without one, it sticks wherever it has got to.' },
      ],
      upgrade: {
        magic:
          'Paper Pinwheel refolds it as a six-sailed wheel: twice the size, twice as long in the '
          + 'wall, and — the part that changes the ability — anything that flies past one kicks it '
          + 'straight off the wall again. Yours, theirs, it does not matter. The wheel is a thing '
          + 'in the room that reacts, not a shield.',
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
      magic:
        'Six paper fortune-tellers — the folded finger-puppets from a school desk — scattered '
        + 'face-up in a ring around you, opening and closing gently on the floor. Anybody who '
        + 'walks over one gets bitten. And any bullet that flies over one is swallowed, which does '
        + 'not just stop the bullet: the thing that ate it stands up.',
      cast: 'F. Instant, no aim — the ring is placed around you, 58 to 136px out. 18s cooldown.',
      effects: [
        { tag: 'summon', label: 'The six', detail: '6 monsters, 10 seconds each, in a ring with a random phase so no two casts land the same.' },
        { tag: 'damage', label: 'The bite', detail: '6 damage to anything that comes within 26px of one, and the monster is spent. They are mines.' },
        { tag: 'utility', label: 'Eating a shot', detail: 'An enemy projectile passing within 26px is destroyed outright — from either projectile system, so it works against every element rather than half of them.' },
        { tag: 'damage', label: 'Enraged', detail: 'A monster that ate something stands up, turns on the nearest enemy at 330 px/s, and bites for 8. It lives 5 seconds from the moment it woke up.' },
      ],
      upgrade: {
        magic:
          'Magical Monsters land on their feet. Instead of six mines waiting to be stepped on, it '
          + 'is six small paper things walking somebody down from six directions at once — worth '
          + 'less each, but they come to you.',
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
      magic:
        'The ending of whichever book is open, and the five of them have nothing in common. '
        + 'Twelve ghost riders across the whole arena. Sixty targeting rings painted on the floor '
        + 'and then bombed. A flame spirit loose in the room for eight seconds. A crucifix. A '
        + 'lotus. It is the widest single key in the game.',
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
        magic:
          'Open-Ended finishes two books at once. Whichever one is open goes off as normal, and a '
          + 'second is rolled from the rest of the shelf and ends as well — so a single press can '
          + 'be a cavalry charge and a bombardment, or a lotus and a spirit.',
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
};

export default paper;
