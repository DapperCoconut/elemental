import { ElementCodex } from '../AbilityCodex';

/**
 * Psychic — two seconds of the future, and a chessboard to spend them on.
 *
 * Verified against `src/elements/psychic.ts` and `kits/PsychicKit.ts`. Psychic has no shop
 * upgrades (the old five were retired with the chess rework) and no perks; its mastery predates
 * the rework. Every number below is a constant at the top of the kit.
 */
const psychic: ElementCodex = {
  identity:
    'A monk who stared at a chessboard until the eye in the middle of his forehead opened. Every '
    + 'ability his enemy presses is held two seconds before it happens, stacked in a column of cards '
    + 'over his own head, and their shadow shows where they will be standing a second from now. '
    + 'Everything he presses is a piece: pawns thrown from the hand, and a bishop, knight and rook '
    + 'stood on the board for eight seconds, each with an aura he wants to stand in — less damage '
    + 'taken, more speed, more damage dealt. Click a piece to pick it up and click again to move it '
    + 'the way it moves in chess, through anybody in its way. Q makes him the queen.',

  passives: [
    {
      emoji: '👁️',
      name: 'Opened Eyes',
      basics:
        'Every ability the enemy casts resolves 2 seconds after the press — the cooldown starts at '
        + 'the press, so it costs them tempo rather than uptime — and everything they press meanwhile '
        + 'queues behind it. The queue is drawn over your own head as a vertical stack of up to 4 cards: '
        + 'the bottom card, gold and larger, is the one going off next, and each card carries the key, '
        + 'the ability\'s name and a fuse that empties as it gets closer. An ultimate has a gold key '
        + 'badge. Separately, a shadow of each enemy — their own body, filled with ink — stands where '
        + 'they will be in 1 second; for a bot that is its exact locomotion rule replayed forward, for '
        + 'anything else it is their actual velocity, damped. Nothing else is drawn: no thread, no line.',
      effects: [
        { tag: 'debuff', label: 'The delay', detail: 'Every ability the enemy casts resolves 2 seconds after the press. The cooldown starts at the press.' },
        { tag: 'utility', label: 'The queue', detail: 'Unbounded. Shown over your own head as a column of up to 4 cards, the next one at the bottom in gold, each with a fuse that empties as it approaches.' },
        { tag: 'utility', label: 'The shadow', detail: 'A dark copy of each enemy standing where they will be in 1 second. Hidden when they are not going anywhere (under 14px away).' },
      ],
      notes: [
        'A bot\'s shadow is not a guess: it replays the exact movement rule the AI is following this tick. A husk or an online opponent is projected from how they have actually been moving.',
        'A psychic who dies mid-telegraph does not hand out free cooldowns: everything still queued fires immediately.',
        'Online, the opponent delays their own casts on their own machine and relays the queue (with each card\'s time left) about 6 times a second; a mirror older than 1.2s is treated as gone.',
        'A psychic bot has the same foreknowledge, but its copy is never drawn — that would hand you its routing for free.',
      ],
    },
  ],

  abilities: {
    'psychic-en-passant': {
      basics:
        'Throws a pawn out of your hand one 130px step toward the cursor over 0.3 seconds; anything '
        + 'it walks into takes 8. Once it stops it captures the way a pawn does — on the two diagonals '
        + 'in front of it, 48px out — for 16 to anything caught there, then again every second until it '
        + 'vanishes 3 seconds after it was thrown (up to 3 captures). 0.65s cooldown; holding the button '
        + 'keeps throwing. Pressed on one of your own standing pieces, the click picks that piece up '
        + 'instead, and the next click moves it.',
      cast: 'Click, aimed at the cursor; hold to keep throwing. 0.65s cooldown. A click that lands on one of your own pieces selects it instead of throwing.',
      effects: [
        { tag: 'damage', label: 'The step', detail: '8 to anything the pawn walks into during its 130px, 0.3s step.' },
        { tag: 'damage', label: 'The capture', detail: '16 to anything on either forward diagonal, 48px out, when it stops — and again every second after.' },
        { tag: 'summon', label: 'The pawn', detail: 'Lasts 3 seconds from the throw, so up to 3 captures. No limit on how many are out.' },
        { tag: 'utility', label: 'Moving pieces', detail: 'Click one of your own bishops, knights or rooks to pick it up (gold ring), then click anywhere to move it. Click it again to put it back down.' },
      ],
      notes: [
        'Throw past them, not at them: a pawn that stops beside an enemy catches them on its diagonal for double what the step does.',
        'As the queen, Click is your legs instead — no pawns are thrown while you are crowned.',
      ],
    },

    'psychic-bishop': {
      basics:
        'Stands a bishop on the cursor for 8 seconds. Its heavenly light covers 110px around it: while '
        + 'you stand in it you take 15% less damage, and every other bishop light you stand in stacks '
        + 'multiplicatively (two is 28%, three is 39%). Click the bishop to pick it up and click again '
        + 'to slide it diagonally — the cursor snaps to the nearest of the four diagonals and the slide '
        + 'goes as far as the cursor, up to 460px, at 1100px a second. Everyone it passes through takes '
        + '40. After a move it settles for 2 seconds before it can move again. 6s cooldown.',
      cast: 'E, at the cursor. 6s cooldown. Then Click the piece, Click again to move it.',
      effects: [
        { tag: 'shield', label: "Bishop's Grace", detail: '15% less damage taken while standing within 110px of the bishop. Every bishop stacks: ×0.85 each.' },
        { tag: 'damage', label: 'The slide', detail: '40 to everyone it passes through, once each per move. Diagonals only, up to 460px.' },
        { tag: 'summon', label: 'The piece', detail: '8 seconds on the board, shown as a ring that empties round its foot. It can move once every 2 seconds. No limit on how many.' },
      ],
      notes: [
        'The move guide turns gold when the line runs through an enemy — that is the click worth making.',
        'Moving a bishop moves its light. Slide it through them and toward where you are going to stand.',
      ],
    },

    'psychic-knight': {
      basics:
        'Stands a knight on the cursor for 8 seconds. Its aura covers 110px: while you stand in it you '
        + 'move 15% faster, and every other knight stacks multiplicatively. Click it, then click again, '
        + 'to jump it like a chess knight — two 75px squares one way and one the other, whichever of the '
        + 'eight jumps lands nearest the cursor. It leaps over everything (the jump itself hits nothing) '
        + 'and lands 0.34s later in an 80px explosion that deals 35. 6s cooldown.',
      cast: 'R, at the cursor. 6s cooldown. Then Click the piece, Click again to jump it.',
      effects: [
        { tag: 'buff', label: "Knight's Stride", detail: '15% faster while standing within 110px of the knight. Every knight stacks: ×1.15 each.' },
        { tag: 'area', label: 'The landing', detail: '35 to everything within 80px of where it lands.' },
        { tag: 'movement', label: 'The jump', detail: 'An L: 150px one way and 75px the other. It flies over anything in between.' },
      ],
      notes: [
        'The guide draws the arc and the blast ring before you commit, so you can see what the landing will catch.',
      ],
    },

    'psychic-rook': {
      basics:
        'Stands a rook on the cursor for 8 seconds. Its aura covers 110px: while you stand in it you '
        + 'deal 15% more damage, and every other rook stacks multiplicatively. Click it, then click again, '
        + 'to slide it along a rank or file, up to 460px; everyone it passes through takes 45. Any other '
        + 'piece it runs over — yours or theirs — is captured and destroyed, and if it was a bishop, '
        + 'knight or rook you wear that piece\'s aura for 30 seconds wherever you go. It also flattens '
        + 'enemy pawns. 8s cooldown.',
      cast: 'F, at the cursor. 8s cooldown. Then Click the piece, Click again to slide it.',
      effects: [
        { tag: 'buff', label: "Rook's Might", detail: '15% more damage dealt while standing within 110px of the rook. Every rook stacks: ×1.15 each.' },
        { tag: 'damage', label: 'The slide', detail: '45 to everyone it passes through, once each per move. Ranks and files only, up to 460px.' },
        { tag: 'buff', label: 'Capture', detail: 'Runs over another bishop, knight or rook (either side\'s) and destroys it — you wear that piece\'s aura for 30 seconds, no standing required. Stolen auras stack with everything else.' },
      ],
      notes: [
        'Capturing your own tired bishop before it expires turns its last two seconds into thirty.',
        'In a mirror match the rook is the answer to their pieces: take the bishop and their armour is yours.',
        'The damage bonus is applied on the victim\'s side (their damage taken), so it covers everything you hit them with, pieces and pawns alike.',
      ],
    },

    'psychic-queen': {
      basics:
        'For 15 seconds you are the queen: every aura at once, three times over — 45% less damage '
        + 'taken, 45% more damage dealt, 45% faster — multiplied on top of any pieces you are standing '
        + 'in. You cannot walk or dash. Click to move yourself like a queen: the cursor snaps to the '
        + 'nearest of eight lines and you slide up to 380px along it (at 1300px a second, sped up by '
        + 'your speed aura), dealing 25 to everyone you pass through and landing in an 85px explosion '
        + 'for 20 to anyone the slide did not already hit. 1 second between moves. Clicking one of your pieces still picks it up. 30s cooldown.',
      cast: 'Q. Instant. 30s cooldown. Ultimate. The ability card shows the crown\'s time while it is worn.',
      effects: [
        { tag: 'buff', label: 'Every aura ×3', detail: '45% less damage taken, 45% more damage dealt, 45% faster slides — on top of any piece auras you stand in.' },
        { tag: 'movement', label: 'No legs', detail: 'WASD and Space do nothing. Click slides you along one of eight lines, up to 380px.' },
        { tag: 'damage', label: 'The slide', detail: '25 to everyone you pass through, once each per move. 1 second between moves.' },
        { tag: 'area', label: 'The landing', detail: '20 to everything within 85px of where you stop that the slide did not already hit.' },
      ],
      notes: [
        'Crown yourself with pieces already on the board: the ×3 multiplies whatever the auras are already giving you.',
        'Ruin\'s Second Skin ends the crown like any other form.',
      ],
    },
  },

  mastery: {
    'predictors-snare': {
      basics:
        'Space stops being a dash and becomes a teleport to where the nearest living enemy will be '
        + 'standing when the foresight window runs out — 2 seconds ahead, or 5 under Utter Focus — '
        + 'clamped to the arena\'s 32px margin. Direction is ignored. A closed eye is left on the '
        + 'landing spot, arming after 0.26s and lying there 14 seconds, dealing 15 damage to the first '
        + 'enemy whose body comes within 20px of it and then spent. Six can be on the floor at once; a '
        + 'seventh rubs out the oldest. If nobody is going anywhere (their projection ends under 24px '
        + 'away) it is an ordinary dash. No cooldown of its own — it rides the dodge\'s. Not available '
        + 'while crowned: the Queen has no Space at all.',
      cast: 'Space. Replaces the ordinary dash while Psychic Mastery is on.',
      effects: [
        { tag: 'movement', label: 'Where you land', detail: 'Where the nearest living enemy will be standing at the end of the foresight window (2s, or 5s under Utter Focus).' },
        { tag: 'summon', label: 'The rune', detail: 'A closed eye left on the landing spot. Arms after 0.26s, lies there 14 seconds.' },
        { tag: 'damage', label: 'What it does', detail: '15 damage to the first enemy whose body comes within 20px of it. Spent the moment it fires.' },
        { tag: 'area', label: 'How many', detail: '6 on the floor at once; a 7th rubs out the oldest.' },
        { tag: 'utility', label: 'When it refuses', detail: 'Nobody has a projection ending more than 24px away — then it is an ordinary dash.' },
      ],
      notes: [
        'This mastery predates the chess rework and is due to be redesigned; it still works as written.',
        'Standing still beats it completely: no projection, no teleport, no rune.',
        'A bot has no Space dash, so a bot psychic never plants a rune.',
      ],
    },
    'utter-focus': {
      basics:
        'Eight seconds with your eyes shut, in which every ability aimed at you is held 5 seconds '
        + 'instead of 2 (casts already queued keep the window they were pressed under). Against a real '
        + 'opponent online their movement keys are buffered by the same 5 seconds on their own machine '
        + 'and the resulting route is relayed back, so Predictor\'s Snare lands on a fact rather than an '
        + 'estimate. Every frame in which damage lands on you takes 0.5s off the window. Bindable to R, '
        + 'F or Q — never E. 26s cooldown.',
      cast: 'The bound key (R, F or Q — never E). Instant. 26s cooldown, counted from the press.',
      effects: [
        { tag: 'control', label: 'The delay', detail: 'Every ability cast at you resolves 5 seconds after the press instead of 2.' },
        { tag: 'control', label: 'Held feet (online only)', detail: 'A real opponent\'s movement keys are buffered by the same 5 seconds; for the first 5 seconds they do not move at all.' },
        { tag: 'cost', label: 'Being hit shortens it', detail: 'Every frame in which any damage lands on you takes 0.5s off the window.' },
        { tag: 'utility', label: 'Blind', detail: 'Your third eye is drawn shut for the duration — the tell they have to read.' },
      ],
      notes: [
        'This mastery predates the chess rework and is due to be redesigned; it still works as written.',
        'Binding it over R, F or Q gives up the Knight, Rook or Queen for the match.',
        'A Space dodge is not a movement key and is not held — the way out of the buffered feet.',
      ],
    },
  },
};

export default psychic;
