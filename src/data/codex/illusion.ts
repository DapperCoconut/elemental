import { ElementCodex } from '../AbilityCodex';

/**
 * Illusion — an element that never argues with the health bar, only with the aim.
 *
 * Verified against `src/elements/illusion.ts`, `kits/IllusionKit.ts`, the five shop upgrades
 * in `data/Upgrades.ts` and the two mastery enhancements in `data/Mastery.ts`. Illusion has no
 * perks; every figure below is a constant at the top of the kit.
 */
const illusion: ElementCodex = {
  identity:
    'A stage magician who worked out that the trick is worth more than the knife. Nothing in '
    + 'this kit hits especially hard and nothing in it burns, bleeds or stacks — the whole '
    + 'element is spent on making the other person\'s answer wrong. A bullet that pays out on '
    + 'the wall it missed. A pane of loose space that bends whatever crosses it, yours '
    + 'included. Two different ways of simply not being where you were. And a full-size clone '
    + 'that walks off wearing your face while the real you, a fifth of the size and invisible, '
    + 'goes somewhere else entirely. Play it and you will end fights '
    + 'with the opponent still confident they had you.',

  passives: [
    {
      emoji: '🃏',
      name: 'Never Quite There',
      basics:
        'Two afterimages follow you as standard, spread wide while an ability is running and pulled '
        + 'back in when it is not — the Dance raises the count to 6 for its whole 20 seconds and drops it '
        + 'back to 2 when it ends. None of it is a hitbox and none of it blocks anything: the copies are '
        + 'information, and a reader who learns the spread knows an Illusion player has done something '
        + 'before the ability itself is visible. The mask floats about 26px above the crown so it never '
        + 'covers the eyes, growing 2px once the element is mastered, and each hand turns a cyan prism '
        + 'shard on its own clock.',
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
      emoji: '🎭',
      name: 'The Clone',
      basics:
        'What Guise leaves standing: the illusionist\'s own sprite at full size, their own rig, and a '
        + 'health bar that reads their real health — nothing on it says it is not them. It walks at the '
        + 'fighter\'s normal pace (the caster\'s cursor for a player, holding about 210px off its target for '
        + 'a bot). It cannot die. Every enemy shot that reaches its 22px body is stopped there, every '
        + 'blast that reaches it and every husk bite aimed at it is banked instead, and when it fades a '
        + 'fifth of that total is paid to whoever is nearest it.',
      effects: [
        { tag: 'utility', label: 'Taken for the real thing', detail: 'Full-size sprite, rig and a live health bar. Bots and husks target it automatically for the whole 3 seconds.' },
        { tag: 'shield', label: 'It cannot die', detail: 'Shots that reach it stop on it; blasts and husk bites aimed at it are banked rather than dealt.' },
        { tag: 'damage', label: 'The payback', detail: '20% of everything it banked, to the enemy nearest it, when it fades.' },
      ],
      notes: [
        'It only stops what reaches it. A homing attack or a melee hit that finds the real, tiny illusionist still lands on them.',
        'Online the clone is drawn on the opponent\'s screen from a 20 Hz position stream, and only the illusionist\'s sim banks what it soaks up — so it is never paid twice.',
      ],
    },
  ],

  abilities: {
    'illusion-crack-shot': {
      basics:
        'One bullet a press, launched 26px out at 760 px/s, dealing 20 damage on a body — an ordinary '
        + 'group projectile, so shields, blocks and every other kit\'s interception rule answer it '
        + 'normally. A bullet that reaches a wall instead pays 10 damage to the nearest enemy: hitscan '
        + 'and unavoidable, resolved the instant the dart lands, at any range, with no line of sight and '
        + 'nothing to dodge. The wall means within 18px of the arena\'s 32px play border on any edge, '
        + 'deliberately generous so the bullet is caught there before the scene\'s out-of-bounds sweep can '
        + 'quietly eat it. A bullet stopped by a body, a shield charge, a block or any other kit\'s '
        + 'absorber pays nothing extra. 0.9s cooldown.',
      cast: 'Click, one bullet per press. Aimed at the cursor and launched 26px out from the body. 0.9s cooldown.',
      effects: [
        { tag: 'damage', label: 'The bullet', detail: '20 damage on a body, at 760 px/s. An ordinary group projectile, so shields, blocks and every other kit\'s interception rule answer it normally.' },
        { tag: 'damage', label: 'The crack', detail: '10 damage to the nearest enemy when the bullet reaches a wall instead. Hitscan and unavoidable — it is resolved the instant the dart lands, at any range, with no line of sight and nothing to dodge.' },
        { tag: 'area', label: 'What counts as the wall', detail: 'Within 18px of the arena\'s 32px play border, on any of the four edges. Deliberately generous so the bullet is always caught here before the scene\'s out-of-bounds sweep can quietly eat it.' },
        { tag: 'utility', label: 'What does not crack', detail: 'A bullet stopped by a body, a shield charge, a block or any other kit\'s absorber pays nothing extra. Only reaching the wall pays.' },
      ],
      upgrade: {
        basics:
          'The bullet pierces: 20 damage to every enemy on the line rather than just the first, keeping '
          + 'its full speed and heading, with each bullet remembering who it has already been through — '
          + 'without that ledger a 760 px/s dart overlapping a body would be charged on every frame of the '
          + 'overlap. The pierce does not replace the wall payout either, so a shot that goes through two '
          + 'people and reaches the wall is 20 + 20 + 10.',
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
      basics:
        'Hangs a 164px by 26px pane 78px out along the cursor, standing across your aim rather than '
        + 'along it, clamped inside the arena. It never moves again — it does not follow you and stepping '
        + 'away does not take it with you — and any projectile crossing it leaves 30° off true, with the '
        + 'side a fresh coin flip per shot so a stream of shots through one pane fans rather than '
        + 'curving. A given pane touches a given projectile exactly once however long it spends inside, '
        + 'though two panes each get their own go at the same bullet. It is symmetrical by design: your '
        + 'own Crack Shots come out just as crooked as theirs, which is what makes the pane a placement '
        + 'decision rather than a free wall. 6 seconds, fading over its last 0.32s. 9s cooldown.',
      cast: 'E. Hung 78px out along the cursor, standing across your aim rather than along it, and clamped to stay inside the arena. 9s cooldown.',
      effects: [
        { tag: 'summon', label: 'The pane', detail: '164px long and 26px thick, standing perpendicular to the direction you were aiming. It never moves again — it does not follow you, and stepping away from it does not take it with you.' },
        { tag: 'control', label: 'The kick', detail: 'Any projectile crossing it leaves 30° off true. The side is a fresh coin flip per shot, so a stream of shots through one pane fans rather than curving.' },
        { tag: 'utility', label: 'Once each', detail: 'A given pane touches a given projectile exactly once, however long it spends inside — otherwise a slow shot crawling through would spiral. Two panes each get their own go at the same bullet.' },
        { tag: 'cost', label: 'Yours too', detail: 'Symmetrical by design. Your own Crack Shots come out of it just as crooked as theirs, which is what makes the pane a placement decision instead of a free wall.' },
        { tag: 'area', label: 'Lifetime', detail: '6 seconds, fading over its last 0.32s so it never blinks out mid-fight, then a collapsing ring where it stood.' },
      ],
      upgrade: {
        basics:
          'A pane splits your bullets instead of deflecting them: two full 20-damage Crack Shots at the '
          + 'same 760 px/s, leaving at roughly 25.7° either side of the incoming heading. A bullet may be '
          + 'split once in its life and a copy may never be split, so one shot through one pane is exactly '
          + 'two shots and shooting the same bullet through a second pane does nothing more. Both halves '
          + 'are tracked shots, so both pay the 10-damage wall crack if they reach an edge — the same press '
          + 'can be worth 20 twice and 10 twice. A split bullet is never also deflected, so with this owned '
          + 'your own panes stop being a liability and start being a doubler.',
        effects: [
          { tag: 'damage', label: 'Two bullets', detail: 'Each is a full 20-damage Crack Shot at the same 760 px/s, leaving at roughly 25.7° either side of the incoming heading.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Once per bullet, ever', detail: 'A bullet may be split once in its life and a copy may never be split. One shot through one pane is exactly two shots, and shooting the same bullet through a second pane does nothing more.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Two cracks', detail: 'Both halves are tracked shots, so both pay the 10-damage wall crack if they reach an edge — the same press can be worth 20 twice and 10 twice.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Instead of, not as well as', detail: 'A split bullet is never also deflected, so with this upgrade owned your own panes stop being a liability for Crack Shot and start being a doubler.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Only group projectiles are bent. This element\'s own Blade Dance daggers are kit-owned objects and sail straight through their own panes.',
        'While a Guise is up the opponent\'s screen does not draw your panes at all — they still bend, and they reappear when the clone fades.',
        'It bends every element\'s shots, which is worth remembering against kits that fire in volleys — an Air splice or a Gunpowder burst through a pane arrives as a mess.',
        'A pane is a structure, so Ruin\'s Spikes of Ruin can tear it down. Anything it already bent keeps its new heading; the kick was applied, and the pane was only ever the thing that applied it.',
      ],
    },

    'illusion-relocate': {
      basics:
        'Teleports you to one of the four arena corners, 58px inside the play border and 90px off the '
        + 'true edge, so you never arrive stuck in a wall. The corner you are already nearest is struck '
        + 'off the list before the roll, so the destination is one of three — a random jump that could '
        + 'leave you where you started would be a dead ability a quarter of the time. It is a position '
        + 'change and nothing else: no invulnerability, anything already in the air keeps travelling, and '
        + 'anything already on you stays on you. 5s cooldown.',
      cast: 'R. Instant, no aim, no target. 5s cooldown.',
      effects: [
        { tag: 'movement', label: 'The jump', detail: 'To one of the four arena corners, 58px inside the 32px play border — 90px off the true edge, so you never arrive stuck in a wall.' },
        { tag: 'utility', label: 'Never where you were', detail: 'The corner you are already nearest is struck off the list before the roll, so the destination is one of three. A "random" jump that can leave you where you started is a dead ability a quarter of the time.' },
        { tag: 'utility', label: 'No invulnerability', detail: 'It is a position change and nothing else. Anything already in the air keeps travelling, and anything already on you stays on you.' },
      ],
      upgrade: {
        basics:
          'An understudy is left at the exact spot you jumped from, with a 1-second fuse that winds '
          + 'visibly tighter — the ring closing from 52px to 22px and the seams pulling in — and then '
          + 'bursts over every enemy within 100px. It deals no damage at all: it marks them Understudied '
          + 'for 5 seconds, taking ×1.2 damage from everything and moving at ×0.7 speed. A second Phantom '
          + 'on somebody already marked extends the window to a fresh 5 seconds at the same strength, so '
          + 'two in quick succession is a longer debuff and never a stronger one.',
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

    'illusion-guise': {
      basics:
        'For 3 seconds you are 80% smaller (a fifth of your size, hitbox included), 35% faster and '
        + 'invisible to the opponent, and a full-size clone of you follows your cursor at your normal '
        + 'walking pace. Bots and husks target the clone automatically. It cannot die but it banks '
        + 'everything that hits it, and when it fades 20% of that is dealt to the enemy nearest it. '
        + 'While it is out everything you throw is invisible on the opponent\'s screen too — bullets, '
        + 'cracks, daggers, Phantoms, even your Veils, which reappear when the 3 seconds end. 12s cooldown.',
      cast: 'F. Instant; the clone starts where you stand and walks to the cursor. 12s cooldown.',
      effects: [
        { tag: 'buff', label: 'Small and quick', detail: 'Size ×0.2 (hitbox included) and movement ×1.35 for 3 seconds.' },
        { tag: 'utility', label: 'Invisible', detail: 'Gone from the opponent\'s screen, health bar and all. On your own screen you are a faint ghost so you can still steer.' },
        { tag: 'utility', label: 'The decoy', detail: 'A full-size clone with your rig and a live health bar follows your cursor. Bots and husks chase it, not you.' },
        { tag: 'damage', label: 'The payback', detail: '20% of everything the clone banked is dealt to the enemy nearest it when it fades.' },
        { tag: 'utility', label: 'Silent hands', detail: 'Every attack you make while it is out is invisible to the opponent, Veils included. Bots do not dodge what they cannot see.' },
      ],
      upgrade: {
        basics:
          'Press F again while the clone is out to swap into it: you arrive exactly where it stood at '
          + 'full size, the clone is gone, and the surprise gives you +25% damage for 10 seconds. The '
          + 'clone\'s bank is still paid out. Nothing is drawn for the swap on the opponent\'s screen — '
          + 'the body they were chasing simply becomes real.',
        effects: [
          { tag: 'utility', label: 'The swap', detail: 'F during a Guise teleports you into the clone and ends the Guise. It is a recast, so it never waits on the cooldown.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Surprise advantage', detail: '+25% damage for 10 seconds after the swap.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'No tell', detail: 'No flash, sound or label on the opponent\'s screen. Only you see the swap happen.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Re-Trick multiplies with the Masquerade mask and a Phantom mark: a marked opponent hit by a masked, Re-Tricked illusionist takes 1.2 × 1.5 × 1.25.',
        'Bots with the upgrade swap just before the clone would fade anyway, or the moment you find the real one.',
        'Ruin\'s Second Skin breaks a Guise like any other form — the clone is torn down without paying anything out.',
      ],
    },

    'illusion-dance': {
      basics:
        'Twenty seconds during which projectiles pass through you entirely, held open every single '
        + 'frame so nothing else in the game — a stun, a slow, another kit\'s state reset — can quietly '
        + 'switch the ultimate off partway. Only projectiles are ignored: blasts, beams, auras, floor '
        + 'hazards, contact damage and every damage-over-time already on you land in full. You also hop '
        + 'to a fresh corner every 3 seconds for the duration, about six times, on the same '
        + 'never-the-nearest-corner rule as Relocate and unannounced, because seven floating labels in '
        + 'twenty seconds would bury the arena. The hops are on a timer rather than a key, so the '
        + 'ultimate will take you out of a winning position as happily as a losing one. 45s cooldown.',
      cast: 'Q, ultimate. Instant, no aim. 45s cooldown, and the ability bar shows the dance\'s own clock draining rather than a cooldown while it runs.',
      effects: [
        { tag: 'shield', label: 'Phased', detail: 'Projectiles pass through you for the full 20 seconds. Held open every single frame, so nothing else in the game — a stun, a slow, another kit\'s state reset — can quietly switch the ultimate off partway.' },
        { tag: 'cost', label: 'What still lands', detail: 'Only projectiles are ignored. Blasts, beams, auras, hazards on the floor, contact damage and every damage-over-time already on you land in full.' },
        { tag: 'movement', label: 'The hops', detail: 'A corner jump every 3 seconds for the duration — about 6 of them — using the same never-the-nearest-corner rule as Relocate, and unannounced, because 7 floating labels in 20 seconds would bury the arena.' },
        { tag: 'cost', label: 'Not your choice', detail: 'The hops are on a timer, not a key. The ultimate will take you out of a winning position as happily as a losing one.' },
      ],
      upgrade: {
        basics:
          'Every hop taken without having been hit since the last one throws a fan of 10 daggers across a '
          + '60° cone at 660 px/s, 15 damage each, spent on the first body within 26px and gone after 1.5 '
          + 'seconds or at the arena edge. A landed dagger reflects its victim through the middle of the '
          + 'arena — your position mirrored — clamped 58px inside the border so nobody lands in a wall. The '
          + 'clean condition is measured against your total damage taken as it stood at the previous hop, '
          + 'and the ultimate\'s opening counts as the first teleport, so the very first hop can already pay '
          + 'out. The fan is centred on the nearest enemy, or on your cursor if there is nobody left alive '
          + 'to aim at.',
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

  mastery: {
    'reality-shift': {
      basics:
        'Four doors open, one at the centre of each wall, 52px in from the edge and 80×60px. Touching '
        + 'within 34px of the centre puts you through one of the other three at random, arriving 72px '
        + 'past it into the room so a trip can never chain into a second one. There is no cast, no '
        + 'cooldown bar and no key — only a 0.7s wait before the doors will take you again. A gateway '
        + 'taken while Illusion Dance is running throws a full extra fan of 10 daggers at 15 apiece, on '
        + 'top of whatever the Dance\'s own hop was going to do. The opponent cannot use them: standing in '
        + 'one does nothing for them at all.',
      effects: [
        { tag: 'movement', label: 'The four doors', detail: 'One at the centre of each wall, 52px in from the edge, 80×60px. Touch within 34px of the centre and you are through.' },
        { tag: 'movement', label: 'Where you come out', detail: 'A random one of the other three, and you arrive 72px past it into the room — never inside the arch, so a trip can never chain into a second one.' },
        { tag: 'utility', label: 'The only limit', detail: '0.7s before the doors will take you again. There is no cast, no cooldown bar and no key.' },
        { tag: 'damage', label: 'Mid-Dance', detail: 'A gateway taken while Illusion Dance is running throws a full extra fan of 10 daggers at 15 apiece, on top of whatever the Dance\'s own 3-second hop was going to do.' },
        { tag: 'utility', label: 'Yours alone', detail: 'The opponent cannot use them. Standing in one does nothing for them at all.' },
      ],
      notes: [
        'Four doors on the walls means the arena no longer has a far side. A zoner whose whole problem was being cornered now has an exit in every direction at all times.',
        'It counts towards the Never There requirement exactly as Relocate does — but you cannot grind the requirement on it, because you need the mastery before the doors exist.',
        'The doors brighten and a mask fades in inside the arch as you approach, so walking into one is never a surprise. Bots have them too on Nightmare, and will occasionally vanish through one by accident while kiting.',
      ],
    },
    masquerade: {
      basics:
        'A bindable mask that gives ×1.5 on all damage you deal, with no duration and no upkeep — it '
        + 'stays until somebody takes it off you. They are told nothing: no mask on your sprite, no cast '
        + 'flash, no sound, and damage indicators over them are divided straight back down by 1.5 before '
        + 'they are drawn. Removing it means clicking directly on you, within 38px of your centre scaled '
        + 'by your size, one reach per person every 1.2 seconds — and a wrong guess costs the reacher 15 '
        + 'damage. The 14-second cooldown runs from the moment it goes on, so a mask stripped after 3 '
        + 'seconds is 11 seconds away from the next one.',
      cast: 'The bound key. 14 second cooldown, counted from the moment it goes on. There is no duration — the mask stays until somebody takes it off you.',
      effects: [
        { tag: 'buff', label: 'The mask', detail: '×1.5 on all damage you deal, for as long as it is on. No duration and no upkeep.' },
        { tag: 'utility', label: 'What they see', detail: 'Nothing. No mask on your sprite, no cast flash, no sound, and damage indicators over them divided straight back down by 1.5 before they are drawn.' },
        { tag: 'utility', label: 'Taking it off', detail: 'Clicking directly on you — within 38px of your centre, scaled by your size — removes it. One reach per person per 1.2s.' },
        { tag: 'cost', label: 'A wrong guess', detail: '15 damage to whoever reached, if there was no mask there.' },
        { tag: 'resource', label: 'Getting it back', detail: 'The 14 seconds run from when you put it on, so a mask stripped after 3 seconds is 11 seconds away from the next one.' },
      ],
      notes: [
        'Their health bar is the leak. The numbers lie but the bar does not, so an opponent paying close attention to how fast they are actually dying can work it out without ever clicking.',
        'A bot reaches for the mask 2–8 seconds after one goes on, and occasionally reaches at a face with nothing on it and eats the 15 — it is guessing, not reading, exactly as a person would be.',
        'Nightmare Illusion bots wear one themselves, over their Relocate. If a fight is going worse than the numbers say it should, click the illusionist.',
        'It stacks multiplicatively with the Phantom mark and Re-Trick: an understudied opponent hit by a masked, Re-Tricked illusionist is taking 1.2 × 1.5 × 1.25.',
      ],
    },
  },
};

export default illusion;
