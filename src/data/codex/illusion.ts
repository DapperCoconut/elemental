import { ElementCodex } from '../AbilityCodex';

/**
 * Illusion — an element that never argues with the health bar, only with the aim.
 *
 * Verified against `src/elements/illusion.ts`, `kits/IllusionKit.ts` and the five shop
 * upgrades in `data/Upgrades.ts`. Illusion has no perks and no mastery enhancements: every
 * figure below is a constant at the top of the kit.
 */
const illusion: ElementCodex = {
  identity:
    'A stage magician who worked out that the trick is worth more than the knife. Nothing in '
    + 'this kit hits especially hard and nothing in it burns, bleeds or stacks — the whole '
    + 'element is spent on making the other person\'s answer wrong. A bullet that pays out on '
    + 'the wall it missed. A pane of loose space that bends whatever crosses it, yours '
    + 'included. Two different ways of simply not being where you were. And a cube thrown at '
    + 'somebody who is not allowed to know it exists, which leaves them wearing a bigger '
    + 'silhouette than the one they were aiming from behind. Play it and you will end fights '
    + 'with the opponent still confident they had you.',

  passives: [
    {
      emoji: '🃏',
      name: 'Never Quite There',
      magic:
        'The illusionist is drawn twice over and neither copy is honest. Two afterimages of '
        + 'the body hang either side of the real one, lagging a beat behind it and wearing the '
        + 'same harlequin mask, and the floor underneath ripples in rings that never close. '
        + 'The moment anything starts happening — a pane going up, a blink, the ultimate — the '
        + 'copies slide further out, so the character is visibly hardest to locate at exactly '
        + 'the moments it is hardest to hit.',
      effects: [
        { tag: 'utility', label: 'The copies', detail: '2 afterimages as standard, spread wide while an ability is running and pulled back in when it is not. The Dance raises the count to 6 for its whole 20 seconds and drops it to 2 when it ends.' },
        { tag: 'utility', label: 'Pure tell', detail: 'None of it is a hitbox and none of it blocks anything. The copies are information — a reader who learns the spread knows an Illusion player has just done something before the ability itself is visible.' },
        { tag: 'utility', label: 'The mask', detail: 'Floats about 26px above the crown so it never covers the eyes, and grows by 2px once the element is mastered. Each hand turns a cyan prism shard on its own clock.' },
      ],
      notes: [
        'The mask and the shards are the sight-read for "this is an Illusion player" at a distance where the violet could be Magic or Psychic.',
      ],
    },
    {
      emoji: '⬛',
      name: 'Folded',
      magic:
        'The status a Tesseract leaves, and the only thing this element does that outlives the '
        + 'person who did it. A folded fighter is no longer a body: their sprite is swapped for '
        + 'a flat square, star or rhombus, drawn over the top as well as swapped underneath so '
        + 'that a character wearing its own rig still reads as a shape rather than a circle '
        + 'hiding under hands and eyes. A seam ticks around the outside of them the whole time.',
      effects: [
        { tag: 'debuff', label: 'Bigger', detail: 'Size multiplied by 1.3 — and because the arena sizes the hitbox off the sprite, that is 30% more body for everything in the game to land on, not a cosmetic.' },
        { tag: 'utility', label: 'Duration', detail: '8 seconds. Re-folding an already-folded fighter refreshes the clock and re-rolls the shape rather than stacking anything.' },
        { tag: 'utility', label: 'What comes back', detail: 'The exact texture they were wearing at the moment of the fold, restored verbatim when it lapses, with the size multiplier handed back at the same time.' },
        { tag: 'utility', label: 'Who can be folded', detail: 'Anything that is a Fighter: the 1v1 bot, an online replica, every husk in an Invasion wave, a world boss.' },
      ],
      notes: [
        'The bookkeeping runs even when neither side is playing Illusion, because an online opponent can fold you and then die — a fold with nobody left to expire it would leave a body permanently 30% wider.',
        'Online, being folded also turns your entire screen into its own negative for the full 8 seconds. That is the victim\'s half of the trick and it does not exist against a bot.',
        'A folded fighter who dies is unfolded silently, so the shape never survives onto a fresh match.',
      ],
    },
  ],

  abilities: {
    'illusion-crack-shot': {
      magic:
        'The one thing in the kit that is genuinely solid: a stubby red dart with a hot core, '
        + 'thrown flat and fast out of the leading hand. What makes it an Illusion ability is '
        + 'what happens when it misses. A dart that reaches the arena wall does not vanish — it '
        + 'breaks against it in a star of red splinters, and one of those splinters runs back '
        + 'across the floor as a jagged hitscan and finds whoever the shot was meant for.',
      cast: 'Click, one bullet per press. Aimed at the cursor and launched 26px out from the body. 0.9s cooldown.',
      effects: [
        { tag: 'damage', label: 'The bullet', detail: '20 damage on a body, at 760 px/s. An ordinary group projectile, so shields, blocks and every other kit\'s interception rule answer it normally.' },
        { tag: 'damage', label: 'The crack', detail: '10 damage to the nearest enemy when the bullet reaches a wall instead. Hitscan and unavoidable — it is resolved the instant the dart lands, at any range, with no line of sight and nothing to dodge.' },
        { tag: 'area', label: 'What counts as the wall', detail: 'Within 18px of the arena\'s 32px play border, on any of the four edges. Deliberately generous so the bullet is always caught here before the scene\'s out-of-bounds sweep can quietly eat it.' },
        { tag: 'utility', label: 'What does not crack', detail: 'A bullet stopped by a body, a shield charge, a block or any other kit\'s absorber pays nothing extra. Only reaching the wall pays.' },
      ],
      upgrade: {
        magic:
          'Immersion Breaker stops the bullet believing in people. It no longer notices bodies '
          + 'as obstacles at all: it bills each one for the full hit as it passes through them, '
          + 'trailing a spray out of the far side, and carries on to the wall behind them to '
          + 'crack there as usual.',
        effects: [
          { tag: 'damage', label: 'Through everybody', detail: '20 damage to every enemy on the line, not just the first, and the bullet keeps its full speed and heading.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Billed once each', detail: 'Each bullet remembers who it has already been through. Without that ledger, a 760 px/s dart overlapping a body would be charged on every frame of the overlap — three or four full hits for one click.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'And still cracks', detail: 'The pierce does not replace the wall payout. A shot that goes through two people and reaches the wall is 20 + 20 + 10.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The crack picks the nearest enemy at the moment of impact, not the one you were aiming at. In an Invasion wave that is whoever has closed on you, which is usually the right answer anyway.',
        'Shooting deliberately past somebody at a wall is a real line of play: 10 guaranteed beats 20 that a shield eats.',
        'A crack is not a projectile, so a Veil cannot bend it and Illusion Dance cannot phase through it.',
      ],
    },

    'illusion-veil': {
      magic:
        'A slab of space comes loose and hangs in the air across your line of sight — a pane of '
        + 'sheared scanlines that crawl and slide over each other inside a bright rim with '
        + 'corner ticks. The ticks are not decoration: they mark exactly where the bending '
        + 'starts, because the pane does not care whose shot is crossing it.',
      cast: 'E. Hung 78px out along the cursor, standing across your aim rather than along it, and clamped to stay inside the arena. 9s cooldown.',
      effects: [
        { tag: 'summon', label: 'The pane', detail: '164px long and 26px thick, standing perpendicular to the direction you were aiming. It never moves again — it does not follow you, and stepping away from it does not take it with you.' },
        { tag: 'control', label: 'The kick', detail: 'Any projectile crossing it leaves 30° off true. The side is a fresh coin flip per shot, so a stream of shots through one pane fans rather than curving.' },
        { tag: 'utility', label: 'Once each', detail: 'A given pane touches a given projectile exactly once, however long it spends inside — otherwise a slow shot crawling through would spiral. Two panes each get their own go at the same bullet.' },
        { tag: 'cost', label: 'Yours too', detail: 'Symmetrical by design. Your own Crack Shots come out of it just as crooked as theirs, which is what makes the pane a placement decision instead of a free wall.' },
        { tag: 'area', label: 'Lifetime', detail: '6 seconds, fading over its last 0.32s so it never blinks out mid-fight, then a collapsing ring where it stood.' },
      ],
      upgrade: {
        magic:
          'Duplication changes what the pane does to your own ammunition. A Crack Shot crossing '
          + 'it is not deflected at all — it comes apart into two whole bullets that leave on '
          + 'either side of the heading it arrived on, both of them real, both of them yours.',
        effects: [
          { tag: 'damage', label: 'Two bullets', detail: 'Each is a full 20-damage Crack Shot at the same 760 px/s, leaving at roughly 25.7° either side of the incoming heading.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Once per bullet, ever', detail: 'A bullet may be split once in its life and a copy may never be split. One shot through one pane is exactly two shots, and shooting the same bullet through a second pane does nothing more.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Two cracks', detail: 'Both halves are tracked shots, so both pay the 10-damage wall crack if they reach an edge — the same press can be worth 20 twice and 10 twice.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Instead of, not as well as', detail: 'A split bullet is never also deflected, so with this upgrade owned your own panes stop being a liability for Crack Shot and start being a doubler.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Only group projectiles are bent. This element\'s own tesseracts and Blade Dance daggers are kit-owned objects and sail straight through their own panes.',
        'It bends every element\'s shots, which is worth remembering against kits that fire in volleys — an Air splice or a Gunpowder burst through a pane arrives as a mess.',
        'A pane is a structure, so Ruin\'s Spikes of Ruin can tear it down. Anything it already bent keeps its new heading; the kick was applied, and the pane was only ever the thing that applied it.',
      ],
    },

    'illusion-relocate': {
      magic:
        'No wind-up, no travel, no smoke. The silhouette collapses inward into the point it was '
        + 'standing on, cracks running in to meet it, and unfolds out of nothing in a corner. '
        + 'The whole ability is that one line — the point of it is that there is nothing else '
        + 'to it and nothing to react to.',
      cast: 'R. Instant, no aim, no target. 5s cooldown.',
      effects: [
        { tag: 'movement', label: 'The jump', detail: 'To one of the four arena corners, 58px inside the 32px play border — 90px off the true edge, so you never arrive stuck in a wall.' },
        { tag: 'utility', label: 'Never where you were', detail: 'The corner you are already nearest is struck off the list before the roll, so the destination is one of three. A "random" jump that can leave you where you started is a dead ability a quarter of the time.' },
        { tag: 'utility', label: 'No invulnerability', detail: 'It is a position change and nothing else. Anything already in the air keeps travelling, and anything already on you stays on you.' },
      ],
      upgrade: {
        magic:
          'Phantom leaves the understudy behind. Where you were standing there is now a red '
          + 'figure wearing your mask — the one thing this element draws that is unmistakably a '
          + 'person — with the space around it visibly being drawn inward and a ring of light '
          + 'closing onto it. A second later it tears itself apart.',
        effects: [
          { tag: 'summon', label: 'The understudy', detail: 'Dropped at the exact spot you left, with a 1-second fuse. It winds visibly tighter as it burns: the ring closes from 52px to 22px and the seams pull in.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'The burst', detail: 'Catches every enemy within 100px. Nothing takes damage from it — it marks them for 5 seconds instead.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Understudied', detail: 'A marked fighter takes ×1.2 damage from everything and moves at ×0.7 speed for the full 5 seconds.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Refresh, not stack', detail: 'A second Phantom on somebody already marked extends the window to a fresh 5 seconds at the same strength. Two in quick succession is a longer debuff, never a stronger one.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The upgrade is a trap laid backwards: the figure stands where the opponent was already looking, so the people it catches are the ones who were chasing you.',
        'A Phantom is only dropped if you were alive and active at the press — a Relocate cast on the frame you die leaves nothing standing.',
        'Ruin\'s spikes tear an unlit Phantom down rather than setting it off. The upgrade is denied, not triggered early.',
      ],
    },

    'illusion-tesseract': {
      magic:
        'A four-dimensional cube — an outer square, an inner square turning the other way, and '
        + 'struts joining their corners so the cage appears to turn itself inside out — thrown '
        + 'flat across the arena with two lagging ghosts trailing it. The person it is aimed at '
        + 'never sees any of that. It is drawn only on the thrower\'s side of the fight; from '
        + 'the receiving end there is nothing in the air at all until the fold lands.',
      cast: 'F, aimed at the cursor, launched 26px out. 12s cooldown. Only the caster gets a cast tell.',
      effects: [
        { tag: 'damage', label: 'The impact', detail: '20 damage to the first body within 30px of the cube.' },
        { tag: 'control', label: 'The fold', detail: '8 seconds folded into a square, star or rhombus — one of the three at random, evenly. Size ×1.3, and with it the hitbox.' },
        { tag: 'area', label: 'The flight', detail: '430 px/s for up to 2.6 seconds, or until it leaves the play area. A cube that finds nobody folds away in a scatter of cyan splinters — visible to the thrower only.' },
        { tag: 'utility', label: 'The one-way mirror', detail: 'Invisible to everybody but the person who threw it. The impact, on the other hand, is loud and visible to all: being hit by it is not the secret, the cube is.' },
        { tag: 'utility', label: 'Online', detail: 'A fold your sim resolves is relayed to the real person wearing it, who takes the shape and spends the 8 seconds looking at their own screen inverted.' },
      ],
      upgrade: {
        magic:
          'Mind-Boggle folds them badly on purpose. The shape comes out with a wedge of raw, '
          + 'unfinished geometry hanging off one side of it — hatched, red, with a bright bead '
          + 'at the tip — and that wedge turns slowly around them for the whole eight seconds. '
          + 'Stand on that side and you are hitting a part of them that was never put back.',
        effects: [
          { tag: 'debuff', label: 'The seam', detail: 'A 30° wedge (15° either side of its heading). Everything you land while you are inside it hits for ×1.5.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'It turns', detail: '0.85 radians a second — about 49°/s, a full lap roughly every 7.4 seconds — so the angle can never simply be camped on. You have to keep walking around them.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Where you are, not where the shot came from', detail: 'The test is the angle from the folded body to *you* at the moment damage lands. A hit has no position left by the time it resolves, and a ranged shot came along that line anyway.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Stamped at the fold', detail: 'The seam is written the instant the cube lands, and it belongs to whoever threw it. Buying the upgrade mid-match cannot open a hole in somebody who is already square.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'A seam multiplies with a Phantom mark rather than overriding it: a folded, understudied target standing in your wedge takes ×1.2 × ×1.5 = ×1.8 from everything you land.',
        'The seam is painted in the folder\'s own colours, on the folded body, so the victim can see exactly which side of themselves is open.',
        'Because the cube is drawn only for the player\'s own side, a co-op ally playing Illusion throws a tesseract nobody on the screen can see — including them.',
        'Online, the opponent\'s cast is not replayed locally at all. A local copy could only fold you a second time, with its own roll of the shape, on top of the fold their sim already sent.',
      ],
    },

    'illusion-dance': {
      magic:
        'The act itself. Six afterimages instead of two, the floor rings thrown wide, and for '
        + 'twenty seconds the illusionist stops being solid enough for bullets to notice: '
        + 'everything fired at them passes straight through the body without registering. '
        + 'Every three seconds the whole performance is torn down and reassembled in a '
        + 'different corner without warning, whether or not that was convenient.',
      cast: 'Q, ultimate. Instant, no aim. 45s cooldown, and the ability bar shows the dance\'s own clock draining rather than a cooldown while it runs.',
      effects: [
        { tag: 'shield', label: 'Phased', detail: 'Projectiles pass through you for the full 20 seconds. Held open every single frame, so nothing else in the game — a stun, a slow, another kit\'s state reset — can quietly switch the ultimate off partway.' },
        { tag: 'cost', label: 'What still lands', detail: 'Only projectiles are ignored. Blasts, beams, auras, hazards on the floor, contact damage and every damage-over-time already on you land in full.' },
        { tag: 'movement', label: 'The hops', detail: 'A corner jump every 3 seconds for the duration — about 6 of them — using the same never-the-nearest-corner rule as Relocate, and unannounced, because 7 floating labels in 20 seconds would bury the arena.' },
        { tag: 'cost', label: 'Not your choice', detail: 'The hops are on a timer, not a key. The ultimate will take you out of a winning position as happily as a losing one.' },
      ],
      upgrade: {
        magic:
          'Blade Dance rewards a clean performance. Reach a teleport without having been '
          + 'touched since the last one and you arrive already throwing — a fan of ten violet '
          + 'daggers, each with its own lagging ghost, thrown out of where you land rather than '
          + 'where you left. Anyone a dagger finds is blinked to the far side of the arena.',
        effects: [
          { tag: 'damage', label: 'The fan', detail: '10 daggers across a 60° cone at 660 px/s, 15 damage each, spent on the first body within 26px, and gone after 1.5 seconds or at the arena edge.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'Cast across', detail: 'A landed dagger reflects the victim through the middle of the arena — your position mirrored — clamped 58px inside the border so nobody lands in a wall.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The clean condition', detail: 'Measured against your total damage taken as it stood at the previous hop. The ultimate\'s opening counts as the first teleport, so the very first hop can already pay out.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Aim', detail: 'The fan is centred on the nearest enemy, or on your cursor if there is nobody left alive to aim at.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Against a single opponent the fan rarely pays ten times: the first dagger to land throws them across the arena, and the remaining nine are usually left crossing empty floor — though at 660 px/s over 1.5s they cover about 990px, so a second one catching up is possible.',
        'The clean check reads raw damage taken, which counts every point aimed at you including hits your shields ate outright. A blocked shot still cancels the next fan.',
        'The reposition is the real payload. Ten daggers is 150 on paper; what actually wins the round is putting somebody diagonally opposite you with your ultimate still running.',
        'Online, a dagger landing on a replica asks their sim to move them rather than moving the copy here — the opponent\'s position is theirs to own.',
      ],
    },
  },
};

export default illusion;
