import { ElementCodex } from '../AbilityCodex';

/**
 * Psychic — two seconds of the future, and a chessboard to spend them on.
 *
 * Verified against `src/elements/psychic.ts`, `kits/PsychicKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts` (Insight Move, Sight Lines, Mount Protect, Castle, Checkmate — the chess-era
 * set that replaced the retired five). No perks; the mastery predates the rework. Every number
 * below is a constant at the top of the kit.
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
      upgrade: {
        basics:
          'Insight Move: a pawn whose first capture catches nobody steps forward again — another full '
          + '130px step down the same line over 0.3s, hitting anything it walks into for 8 (even somebody '
          + 'the first step already hit), and captures from there for 16 and every second after. A pawn '
          + 'whose first capture lands stays where it is. Two steps at most.',
        effects: [
          { tag: 'movement', label: 'The second step', detail: 'Only when the first capture caught nobody: another 130px step along the same line, 0.3s.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'On the way', detail: '8 to anything the second step walks into — a fresh step, so the first step\'s victims can be hit again.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The captures', detail: '16 on both forward diagonals as soon as it stops, then every second, until the pawn\'s 3 seconds run out.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Two at most', detail: 'A pawn never takes a third step, whether or not the second capture lands.', requiresUpgrade: 'click' },
        ],
      },
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
      upgrade: {
        basics:
          'Sight Lines: every bishop slide leaves the diagonal it travelled lit — a line of 30px glowing '
          + 'board squares, corner to corner, from where it started to where it stopped. An enemy stepping '
          + 'onto a square takes 5. Each square bills a body once, and your squares bill any one body at '
          + 'most every 0.35s. They fade after 5 seconds.',
        effects: [
          { tag: 'area', label: 'The squares', detail: '30px squares along the whole slide, start to finish, lighting up one after another. 5 seconds each.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Stepping on one', detail: '5 to an enemy whose body reaches a square. Each square hits a body once.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Pace', detail: 'Your squares hit any one body at most every 0.35s, so walking straight down a line costs about 15 a second, not 5 per square.', requiresUpgrade: 'e' },
        ],
      },
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
      upgrade: {
        basics:
          'Mount Protect: move a knight while you are standing in its 110px aura and you ride it. You '
          + 'leave from where you stand and come down just in front of its landing over the same 0.34s '
          + 'leap, and you cannot be hurt until you are down. The landing\'s 35-damage blast goes off as '
          + 'usual.',
        effects: [
          { tag: 'movement', label: 'The ride', detail: 'Within 110px of the knight when it is moved: you travel with the jump and land 24px in front of where it lands.', requiresUpgrade: 'r' },
          { tag: 'shield', label: 'In the air', detail: 'Invulnerable for the whole 0.34s leap, shown as a gold ward round you.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Not as the queen mid-slide', detail: 'No ride while a queen move is under way, and no queen move or castle while you are riding.', requiresUpgrade: 'r' },
        ],
      },
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
      upgrade: {
        basics:
          'Castle: with a rook standing on the board, F castles instead — you and your newest rook swap '
          + 'places instantly, at any time and off cooldown, once per rook. The rook comes down where you '
          + 'were standing and slams the floor for 20 to everyone within 70px. Once every rook on the board '
          + 'has castled, F places a new rook again.',
        effects: [
          { tag: 'movement', label: 'The swap', detail: 'You go to the rook\'s square and it goes to yours. Instant, and costs no cooldown. Once per rook.', requiresUpgrade: 'f' },
          { tag: 'area', label: 'The slam', detail: '20 to everything within 70px of where the rook lands (your old square).', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'F is the swap', detail: 'While an un-castled rook stands, F castles rather than placing a second rook.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Refusals', detail: 'Not while disarmed, silenced, stunned or turned into a chicken, not while the rook is locked or sliding, and not mid-ride or mid-queen-slide.', requiresUpgrade: 'f' },
        ],
      },
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
      upgrade: {
        basics:
          'Checkmate: when the Queen runs its full 15 seconds, every enemy below 15% of their health is '
          + 'killed outright. It only happens at the natural end of the reign — not if you die crowned or '
          + 'the crown is stripped from you.',
        effects: [
          { tag: 'damage', label: 'Checkmate', detail: 'At the end of the reign, every enemy under 15% health takes true damage equal to all of it. Only invincibility stops it.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Only a full reign', detail: 'Dying while crowned, or having the form ended early (Ruin\'s Second Skin), checkmates nobody.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Crown yourself with pieces already on the board: the ×3 multiplies whatever the auras are already giving you.',
        'Ruin\'s Second Skin ends the crown like any other form.',
      ],
    },
  },

  mastery: {
    outplayed: {
      basics:
        'Compares your health percentage with every enemy\'s, every frame. When they are 25 '
        + 'percentage points or more behind you their cooldowns run 10% longer; 50 points, 25% longer; '
        + '75 points, 33% longer. Percent, not raw HP. It applies to every cooldown they start while it '
        + 'holds and lifts the moment the gap closes. On husks, which have no cooldowns, it slows their '
        + 'attack cadence by the same factor. A purple aura on the enemy shows the tier.',
      cast: 'Passive. Always on while Psychic Mastery is enabled.',
      effects: [
        { tag: 'debuff', label: '25 points behind', detail: 'Their cooldowns run 10% longer.' },
        { tag: 'debuff', label: '50 points behind', detail: 'Their cooldowns run 25% longer.' },
        { tag: 'debuff', label: '75 points behind', detail: 'Their cooldowns run 33% longer.' },
        { tag: 'utility', label: 'The aura', detail: 'One ring of chess squares at the first tier, a second counter-turning ring at the second, a crown of chevrons and sparks at the third.' },
      ],
      notes: [
        'Measured against your own health: a psychic who is losing too gets nothing from it.',
        'Online the slowdown is written on the opponent by your machine and reaches theirs with the other cooldown factors.',
      ],
    },
    'pre-move': {
      basics:
        'Cast it and a chess clock appears beside you; the next key you press — Click, E, R, F, Q, '
        + 'Space or W/A/S/D — is your prediction (the press still does what it normally does). For '
        + 'the next 1.5 seconds, the first time an enemy presses that key they take 25 damage and a '
        + '0.6s stun. An ability key also makes that ability\'s cooldown 50% longer — the one just '
        + 'started and every cast of it for 8 seconds. A movement key (Space included) slows them 30% '
        + 'for 3 seconds. Only fresh presses count: a key already held when you call it does not. '
        + 'Choose within 4 seconds or it lapses. Bindable to R, F or Q. 14s cooldown.',
      cast: 'The bound key (R, F or Q), then any key to make the call.',
      effects: [
        { tag: 'damage', label: 'Burst', detail: '25 damage to whoever pressed the called key.' },
        { tag: 'control', label: 'Stun', detail: '0.6 seconds: no moving, no casting.' },
        { tag: 'debuff', label: 'Ability key', detail: 'That ability\'s cooldown runs 50% longer, now and for every cast of it in the next 8 seconds.' },
        { tag: 'debuff', label: 'Movement key', detail: 'W, A, S, D or Space: 30% slower for 3 seconds.' },
        { tag: 'utility', label: 'Hidden call', detail: 'Only you see the key; they see a clock with a question mark on it.' },
      ],
      notes: [
        'Bots are read too: their "keys" are the directions they start moving in, the abilities they cast and, for Space, their projectile dodges. A husk\'s attack is its Click.',
        'A bot psychic predicts from what it has watched you press over the last few seconds.',
        'Binding it over R, F or Q gives up the Knight, Rook or Queen for the match.',
      ],
    },
  },
};

export default psychic;
