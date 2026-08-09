import { ElementCodex } from '../AbilityCodex';

/**
 * Death — the element whose damage is a timer.
 *
 * Verified against `src/elements/death.ts`, `kits/DeathKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts`. Death has no perks and no mastery enhancements; every figure below is a
 * constant at the top of the kit.
 */
const death: ElementCodex = {
  identity:
    'A sentinel of doom in a shroud, holding a katana over his head, and a clock in the corner of '
    + 'the screen that has been running since the first frame. He does not need to swing: at '
    + 'midnight the person in front of him simply dies, through everything. Every ability he owns '
    + 'is arithmetic on that one minute — the shurikens take their legs and their bite, Disarm '
    + 'cashes those brands in for seconds of standing still, Riposte buys a window where their '
    + 'bullets are not his problem, Amputate takes a piece of them that never grows back, and the '
    + 'Deal is the only thing in the kit that moves the clock itself. Not one of the five deals a '
    + 'single point of damage. The whole element is a countdown and five ways of surviving it.',

  passives: [
    {
      emoji: '🕛',
      name: 'Midnight',
      magic:
        'A bone-and-gold clock face hangs in the corner of the screen under the status tray, and '
        + 'its hand has been moving since the fight started. It tolls — a ring of light off the '
        + 'reaper and a number over his head — at thirty seconds, at ten, and then every second '
        + 'from five. When it reaches twelve, whoever he is fighting is reaped where they stand.',
      effects: [
        { tag: 'utility', label: 'The minute', detail: '60 seconds of match time, counted only while the reaper is alive and actually playing Death. A killed reaper\'s clock stops.' },
        { tag: 'damage', label: 'Midnight', detail: 'The primary enemy takes 100% of their remaining health as pierce damage flagged already-applied — the one combination that goes through every invincibility window in the game and that carries correctly across an online match. There is no catch and no save.' },
        { tag: 'utility', label: 'The tolls', detail: 'It announces itself at 30, 10, 5, 4, 3, 2 and 1, each louder and higher than the last. Both players hear it.' },
        { tag: 'cost', label: 'Once', detail: 'The clock is spent after it strikes and does not run again — except in Invasion, where a wave is not one person and the minute simply starts over.' },
        { tag: 'utility', label: 'Nobody home', detail: 'If it reaches zero with no valid target it waits a second and asks again rather than burning itself on an empty arena.' },
      ],
      notes: [
        'The clock is the element\'s only source of damage. Everything else in the kit exists to make sixty seconds survivable, or to make them shorter.',
        'A Deal honoured is the one thing that moves the hand: −10 seconds, and it can be pressed twice in a minute.',
        'Playing against Death is a race you have already started losing. The counterplay is to kill him first, which is why every one of his abilities is really a defensive one.',
      ],
    },
    {
      emoji: '⚖️',
      name: 'Nothing Is Damage',
      magic:
        'Every debuff in this kit takes something off what the enemy hits *for*, and they all ride '
        + 'the same field. A river brand, an arm that is not there any more, an open wound and a '
        + 'wall full of missed shots are four separate reasons the same punch lands softer, and '
        + 'they multiply rather than adding.',
      effects: [
        { tag: 'debuff', label: 'The four cuts', detail: 'Styx brands are −15% each to a −45% floor, two missing arms is −25%, Exsanguination is another −10%, and Dishonor is −2% per missed shot. 45% and 25% together is ×0.55 × ×0.75 = a 59% cut, not an 80% one.' },
        { tag: 'utility', label: 'Worn from the other end', detail: 'Damage never learns who dealt it, so the cut is worn by the reaper as reduced incoming damage rather than by the enemy as reduced outgoing. The effect is identical in a duel and the plumbing is why it works at all.' },
        { tag: 'utility', label: 'One field, many attackers', detail: 'Because it is a single number on one body, the *least* weakened enemy sets it. In an Invasion wave, one clean husk undoes the brand on all the others.' },
        { tag: 'utility', label: 'The floor', detail: 'The combined multiplier is clamped at ×0.1 — a 90% cut is as far as it can go however many reasons are stacked up.' },
      ],
      notes: [
        'This is the reason Death survives his own minute. He is not tanky and he does not heal; he simply makes everything aimed at him worth about half.',
        'Standing in Death by 1000 Cuts multiplies all of these by 1.5 before they are combined, which is how a 45% brand becomes a 67% one.',
      ],
    },
  ],

  abilities: {
    'death-styx': {
      magic:
        'Three four-pointed stars of the river, fanned out of his hand in a shallow cone. They '
        + 'pass through people without hurting them and leave a teal brand behind instead — a ring '
        + 'of glyphs turning around the body, one arc per stack. The brand is the ammunition for '
        + 'the rest of the kit, and it is on a three-second fuse.',
      cast: 'Click, aimed at the cursor. 0.62s cooldown. The three stars go out at about 14° apart, so the middle one is straight down the aim.',
      effects: [
        { tag: 'debuff', label: 'The brand', detail: '−15% move speed and −15% damage dealt per stack, to 3 stacks and −45% of each. One shared 3-second timer, refreshed by every new star that lands.' },
        { tag: 'damage', label: 'No damage at all', detail: 'Exactly 0. A star cannot finish anybody, cannot break a shield, and cannot proc anything that keys off being hit.' },
        { tag: 'area', label: 'The stars', detail: '780 px/s for 1.5 seconds, landing on anything within 29px of one. Each star is spent on the first body it touches.' },
        { tag: 'utility', label: 'Close range brands to the cap', detail: 'At knife range the cone has not opened yet, so all three connect and the target is at −45% in one throw. At distance the fan means one star, maybe two.' },
        { tag: 'utility', label: 'They are real objects', detail: 'The stars are published to the projectile registry, so another Death\'s Riposte can cut one out of the air.' },
      ],
      upgrade: {
        magic:
          'Sheath is not really a Click upgrade. Three seconds without casting anything at all and '
          + 'the katana slides back into its saya with a click, and the next thing he draws it for '
          + '— whichever of the five it is — comes out powered. What the click gets is the fan '
          + 'closing into a line: the same three stars, thrown one after another straight down the '
          + 'cursor.',
        effects: [
          { tag: 'utility', label: 'The saya', detail: '3 seconds with no cast at all. Every ability in the kit restarts the clock, and a whiff restarts it exactly like a kill.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'The line', detail: 'The three stars leave 105ms apart instead of at once, each along the aim *as it is at that moment* — so the volley can be walked across a moving target, and the full three-stack brand lands at any range rather than only up close.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'What the other four get', detail: 'E: +1s of stun even with no stacks, and a 230px shove on everything it touches. R: a parting wave when the guard drops. F: Exsanguination on everything the dash passes through. Q: the deal tolerates 75 damage instead of 50.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Three seconds of not pressing anything is a real cost in a sixty-second fight, and it is the whole balance of the upgrade.',
        'The brand expires on its own in three seconds if it is not spent on a Disarm. The click is not a chip ability — it is a loading action.',
      ],
    },

    'death-disarm': {
      magic:
        'The katana comes down through everything in front of him and leaves a hard yellow '
        + 'crescent hanging in the air behind it for most of a second. It deals nothing. What it '
        + 'does is cash the river in: every brand a body is carrying is stripped off them and paid '
        + 'back as a second of not being able to move or cast, while the clock keeps running and '
        + 'they cannot do a thing about it.',
      cast: 'E, aimed at the cursor. A 120° cleave, 126px deep. 6s cooldown.',
      effects: [
        { tag: 'control', label: 'The stun', detail: '1 second per Styx stack — 3 at the cap — and it is a full lock: velocity pinned at zero and every ability disarmed for the duration. No stacks means no stun at all.' },
        { tag: 'resource', label: 'The brands are spent', detail: 'Every stack is removed to pay for it. The cleave is the only thing in the kit that consumes them.' },
        { tag: 'movement', label: 'The quickening', detail: '+30% move speed for 5 seconds, paid unconditionally on the swing — into a crowd, into a clean target, or into an empty room. It is why the cleave is always worth pressing.' },
        { tag: 'area', label: 'The arc', detail: '126px of reach and 60° either side of the aim, landing on everybody inside it at once.' },
      ],
      upgrade: {
        magic:
          'Disarmed takes them literally. A cleave that lands on somebody carrying all three '
          + 'brands knocks their weapon clean out of their hands — a glowing core in their own '
          + 'element\'s colour, thrown across the floor with a yellow line still linking them to '
          + 'it. Until they physically walk over it, they cannot cast a single thing.',
        effects: [
          { tag: 'control', label: 'No abilities at all', detail: 'Re-applied every 250ms for as long as the core is on the floor, so a lapse cannot hand the keys back. There is no timer on this — only the walk.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Getting it back', detail: 'They have to come within 30px of the core. It is thrown about 250px along the swing over half a second.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Full brand only', detail: 'Three stacks, checked before the stacks are spent. Two is a two-second stun and nothing else.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'On top of the stun', detail: 'The three seconds of stillness the stacks already bought still happen. The disarm starts as they get up.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Three seconds of stun is five percent of the whole minute and it is bought with three clicks. Landing the full brand and then the cleave is the element\'s core loop.',
        'Powered out of a full sheath the cleave is worth a second of stun on its own, which is the only way it is worth throwing at somebody you have not managed to brand.',
        'The speed does not come out of the brands. It is paid on the swing whatever the swing found.',
      ],
    },

    'death-riposte': {
      magic:
        'He holds the blade out along your cursor and stands there. Anything that reaches the '
        + 'steel is cut in half — two pieces of a bullet spinning off to either side at more than '
        + 'sixty degrees, well past the angle that could bring one back around onto him. The two '
        + 'halves hit nothing at all. They are debris.',
      cast: 'R, tracking the cursor for the whole 3 seconds. 6s cooldown.',
      effects: [
        { tag: 'shield', label: 'The guard', detail: '3 seconds. The blade is a line from 14px to 84px in front of him along the aim, and anything within 26px of that line is cut.' },
        { tag: 'utility', label: 'Both kinds of shot', detail: 'It works on the shared projectile group and on the kit-local registry half the roster fires into, so it is not a dead button against any particular element.' },
        { tag: 'utility', label: 'The halves', detail: 'Thrown 60° off the incoming line at 540 px/s for 0.76 seconds. Purely a consequence — they can never damage anybody.' },
        { tag: 'cost', label: 'It only covers a line', detail: 'The blade is 70px of steel pointed one way. Anything arriving from a different angle is not cut, which is why the guard has to be aimed and not just pressed.' },
      ],
      upgrade: {
        magic:
          'Dishonor grows the arena a face of scarred grey stone and makes it remember. Every shot '
          + 'the enemy ends on the wall is a shot that was never aimed at anybody, and the stone '
          + 'keeps the crater burning for exactly as long as it costs them.',
        effects: [
          { tag: 'debuff', label: 'A shot that missed', detail: '−2% damage for 20 seconds to whoever fired it, per shot, with no stack limit. The combined damage cut across the whole kit is capped at 90%.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The shot dies there', detail: 'Any enemy projectile reaching the 15px inner band while travelling into it is destroyed on the stone — which is what makes it a wall hit rather than a fly-past, and what stops the same shot billing them twice.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'The craters', detail: 'One burning scar per miss, alive for the full 20 seconds so the wall is a running tally of how badly they have been aiming. Up to 48 are kept before the oldest goes.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Not while you hug it', detail: 'A shot reaching the stone within 44px of the reaper is ignored — those are hits about to land, not misses, and eating them would make wall-hugging blanket immunity.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Drawn from a full sheath the guard owes a parting wave: when it drops, 0.2% of speed per point of damage it cut, for 3 seconds, to everything within 320px. A hundred damage cut is a 20% slow and 450 is the 90% cap. That is the Sheath payoff for this key, not the R upgrade.',
        'Dishonor bills whoever the clock is counting down for rather than whoever actually fired, because a projectile carries no attacker reference. In a wave, the healthiest husk pays for everybody\'s misses.',
        'Riposte is the only ability in the kit that answers a burst directly, and three seconds of it is a very long time in a sixty-second fight.',
      ],
    },

    'death-amputate': {
      magic:
        'A picker comes up and asks which limb. Then he dashes — a short hard line to your cursor '
        + 'with the blade held out — and takes that limb off everything he passes through. No '
        + 'damage. A body has four limbs and can lose two of them for the entire match, and '
        + 'nothing anywhere in the game grows one back.',
      cast: 'F opens the limb picker; the chosen key launches the dash. 15s cooldown, refunded if there is nothing left to take. The dash runs 130–340px over 230ms and the kit drives the body for all of it.',
      effects: [
        { tag: 'debuff', label: 'A leg', detail: 'One leg is ×0.67 move speed. Both legs is ×0.34 — a third of their pace, permanently.' },
        { tag: 'debuff', label: 'An arm', detail: 'One arm is +25% cooldowns and −10% damage. Both arms is +33% cooldowns and −25% damage.' },
        { tag: 'cost', label: 'Two, and no more', detail: 'Two limbs per body for the whole match. A third cast on the same target prints 🦴 NOTHING LEFT and refunds the cooldown.' },
        { tag: 'utility', label: 'One limb per pass', detail: 'Everything the dash goes through loses the same limb, and each body only once per dash. If their chosen side is already gone, its pair is taken instead.' },
        { tag: 'area', label: 'The reach', detail: 'Anything within 34px of the dash line is cut, and the dash eases out so he arrives at speed and stops rather than coasting.' },
      ],
      upgrade: {
        magic:
          'Death by 1000 Cuts is not about limbs at all. He drags the blade behind him wherever he '
          + 'goes and leaves a trail of open gashes in the floor. They deal nothing. What standing '
          + 'in them does is make everything else that is wrong with you half again as bad — and '
          + 'take a quarter of your speed while you work that out.',
        effects: [
          { tag: 'control', label: 'The gashes', detail: '−25% move speed while standing in one. 34px each, 5 seconds each, dropped every 90ms as long as he has moved at least 11px since the last one.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'The amplifier', detail: 'Every negative effect on a body standing in the cuts is ×1.5 — its magnitude and the duration of anything new that lands. A 45% Styx brand becomes 67%; a 20% Dishonor stack becomes 30%.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Everybody\'s debuffs, not just his', detail: 'The amplifier reads the whole status list, so an ally\'s burn or slow is boosted too. Only debuffs — an enemy regen ticking in the gashes is not extended.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'It is a place, not a status', detail: 'Rebuilt from scratch every frame from who is standing where, so it ends the instant they step out and nothing has to be handed back.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Drawn from a full sheath the dash also leaves everything it passes through exsanguinating for 15 seconds: −10% speed and −10% damage, paid for by the pass rather than by the limb, so a body with nothing left to take is still opened up.',
        'Both legs is the single largest thing this element does to anybody. A target at 34% speed cannot close on him, cannot leave the cuts, and cannot beat the clock.',
        'A bot always takes legs first, for exactly that reason.',
        'The dash claims the body outright for its 230ms, so it cannot be cancelled and WASD does nothing during it.',
      ],
    },

    'death-deal': {
      magic:
        'He vanishes, reappears at their shoulder, and holds out a hand. They are not held — the '
        + 'handshake is a formality, not a grab — and then he is gone again, three hundred pixels '
        + 'away, and has ten seconds to prove he never needed to be there. Get through them barely '
        + 'touched and the clock jumps ten seconds closer to midnight. Take the beating and the '
        + 'deal is simply off.',
      cast: 'Q, ultimate. Instant — he teleports to 48px beside the nearest enemy, stands still for the 0.64s handshake, then teleports 340px clear. 30s cooldown.',
      effects: [
        { tag: 'movement', label: 'The bargain', detail: '+33% move speed and +33% dodge chance for the full 10 seconds. The dodge is sustained rather than a charge — it is topped back up every frame, because every save it makes spends some of it.' },
        { tag: 'utility', label: 'The condition', detail: 'Take less than 50 damage across the ten seconds and it is honoured. The clock only starts counting damage when he lets go of their hand, so the handshake itself is free.' },
        { tag: 'buff', label: 'Honoured', detail: '−10 seconds off the clock, immediately, and the tolls re-arm so it will announce the new marks.' },
        { tag: 'cost', label: 'Broken', detail: '50 damage taken and it prints ☠️ DEAL BROKEN. No refund, no partial credit, and the 30 seconds are gone.' },
        { tag: 'cost', label: 'The handshake', detail: '0.64 seconds of standing still, right next to them, at the start. It is the most exposed the reaper ever is.' },
      ],
      upgrade: {
        magic:
          'True Grimdark is what a deal grows. Five inky black tentacles come out of his back and '
          + 'start pulling shots out of the air on their own, and a bone-white mask covers his '
          + 'face and simply refuses the next three things that reach him, however large they '
          + 'were, before it cracks apart. Both last exactly as long as the deal does.',
        effects: [
          { tag: 'shield', label: 'The mask', detail: '3 instances of damage refused outright — instances, not points, so it does not care whether the hit was 4 or 400. It sits above every shield layer, and it visibly cracks a third further each time.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The arms', detail: '5 tentacles, each 74px, taking one enemy projectile out of the air every 0.43 seconds from up to 175px away. A grab rather than a parry — it does not care which way the shot was travelling.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'It answers both systems', detail: 'The shared group first, then the kit-local registry, so no element is immune to being grabbed.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'They go back in', detail: 'Mask and arms both end the moment the deal does, honoured or broken.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'A mask that refuses three instances and arms that eat a shot every 0.43 seconds are, between them, most of a fifty-damage budget. True Grimdark is really a way of making the deal a formality.',
        'Drawn from a full sheath the deal tolerates 75 damage instead of 50 — the largest single swing any Sheath payoff makes.',
        'Two honoured deals in a minute take twenty seconds off the clock, which is a third of it. That is the element\'s real ceiling, and it is why Q is worth pressing early rather than saving.',
        'Casting it mid-dash, or during another deal, is refused and refunded.',
      ],
    },
  },
};

export default death;
