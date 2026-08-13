import { ElementCodex } from '../AbilityCodex';

/**
 * Death — the element whose damage is a timer.
 *
 * Verified against `src/elements/death.ts`, `kits/DeathKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the mastery in `data/Mastery.ts`. Death has no perks; every figure below
 * is a constant at the top of the kit.
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
      basics:
        'A 60-second clock counted only while the reaper is alive and actually playing Death — a killed '
        + 'reaper\'s clock stops. When it strikes, the primary enemy takes 100% of their remaining health '
        + 'as pierce damage flagged already-applied, the one combination that goes through every '
        + 'invincibility window in the game and carries correctly across an online match. There is no '
        + 'catch and no save. It announces itself at 30, 10, 5, 4, 3, 2 and 1, each louder and higher '
        + 'than the last, and both players hear it. It is spent after it strikes and does not run again — '
        + 'except in Invasion, where a wave is not one person and the minute simply starts over. If it '
        + 'reaches zero with no valid target it waits a second and asks again rather than burning itself '
        + 'on an empty arena.',
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
      basics:
        'Almost nothing this kit does is damage; it takes pieces off people instead. Styx brands are '
        + '−15% each to a −45% floor, two missing arms is −25%, Exsanguination another −10%, and Dishonor '
        + '−2% per missed shot. They multiply rather than add: 45% and 25% together is ×0.55 × ×0.75, a '
        + '59% cut and not an 80% one. Because damage never learns who dealt it, the cut is worn by the '
        + 'reaper as reduced incoming damage rather than by the enemy as reduced outgoing — identical in '
        + 'a duel, and the plumbing is why it works at all. It is one number on one body, so the least '
        + 'weakened enemy sets it, and in an Invasion wave one clean husk undoes the brand on all the '
        + 'others. The combined multiplier is clamped at ×0.1.',
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
      basics:
        'Throws three stars at about 14° apart, so the middle one is straight down the aim, at 780 px/s '
        + 'for 1.5 seconds, landing on anything within 29px and spent on the first body each touches. '
        + 'They deal exactly 0 damage — a star cannot finish anybody, cannot break a shield and cannot '
        + 'proc anything that keys off being hit — and brand instead: −15% move speed and −15% damage '
        + 'dealt per stack to 3 stacks, on one shared 3-second timer refreshed by every new star. At '
        + 'knife range the cone has not opened yet, so all three connect and the target is at −45% in one '
        + 'throw; at distance it is one star, maybe two. The stars are real published projectiles, so '
        + 'another Death\'s Riposte can cut one out of the air. 0.62s cooldown.',
      cast: 'Click, aimed at the cursor. 0.62s cooldown. The three stars go out at about 14° apart, so the middle one is straight down the aim.',
      effects: [
        { tag: 'debuff', label: 'The brand', detail: '−15% move speed and −15% damage dealt per stack, to 3 stacks and −45% of each. One shared 3-second timer, refreshed by every new star that lands.' },
        { tag: 'damage', label: 'No damage at all', detail: 'Exactly 0. A star cannot finish anybody, cannot break a shield, and cannot proc anything that keys off being hit.' },
        { tag: 'area', label: 'The stars', detail: '780 px/s for 1.5 seconds, landing on anything within 29px of one. Each star is spent on the first body it touches.' },
        { tag: 'utility', label: 'Close range brands to the cap', detail: 'At knife range the cone has not opened yet, so all three connect and the target is at −45% in one throw. At distance the fan means one star, maybe two.' },
        { tag: 'utility', label: 'They are real objects', detail: 'The stars are published to the projectile registry, so another Death\'s Riposte can cut one out of the air.' },
      ],
      upgrade: {
        basics:
          'Sheathing the blade — 3 seconds with no cast at all, restarted by every ability in the kit and '
          + 'by a whiff exactly as by a kill — arms all five keys. Click\'s three stars leave 105ms apart '
          + 'instead of at once, each along the aim as it is at that moment, so the volley can be walked '
          + 'across a moving target and a full three-stack brand lands at any range. E gains +1s of stun '
          + 'even with no stacks and a 230px shove on everything it touches. R throws a parting wave when '
          + 'the guard drops. F applies Exsanguination to everything the dash passes through. And Q '
          + 'tolerates 75 damage instead of 50.',
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
      basics:
        'A 120° cleave 126px deep, landing on everybody inside it at once. It stuns for 1 second per '
        + 'Styx stack — 3 at the cap — as a full lock with velocity pinned at zero and every ability '
        + 'disarmed, and no stacks means no stun at all. Every stack is removed to pay for it; the cleave '
        + 'is the only thing in the kit that consumes them. It also grants +30% move speed for 5 seconds '
        + 'unconditionally, on the swing, into a crowd or into an empty room, which is why it is always '
        + 'worth pressing. 6s cooldown.',
      cast: 'E, aimed at the cursor. A 120° cleave, 126px deep. 6s cooldown.',
      effects: [
        { tag: 'control', label: 'The stun', detail: '1 second per Styx stack — 3 at the cap — and it is a full lock: velocity pinned at zero and every ability disarmed for the duration. No stacks means no stun at all.' },
        { tag: 'resource', label: 'The brands are spent', detail: 'Every stack is removed to pay for it. The cleave is the only thing in the kit that consumes them.' },
        { tag: 'movement', label: 'The quickening', detail: '+30% move speed for 5 seconds, paid unconditionally on the swing — into a crowd, into a clean target, or into an empty room. It is why the cleave is always worth pressing.' },
        { tag: 'area', label: 'The arc', detail: '126px of reach and 60° either side of the aim, landing on everybody inside it at once.' },
      ],
      upgrade: {
        basics:
          'A full three-stack cleave now tears their core out and throws it about 250px along the swing '
          + 'over half a second. Until they walk within 30px of it they cannot cast at all — re-applied '
          + 'every 250ms so a lapse cannot hand the keys back, with no timer on it, only the walk. It needs '
          + 'three stacks, checked before the stacks are spent, so two is a two-second stun and nothing '
          + 'else, and the three seconds of stillness the stacks already bought still happen: the disarm '
          + 'starts as they get up.',
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
      basics:
        'Three seconds of guard, with the blade a line from 14px to 84px in front of you along the aim, '
        + 'tracking your cursor throughout, cutting anything within 26px of that line. It works on the '
        + 'shared projectile group and on the kit-local registry half the roster fires into, so it is not '
        + 'a dead button against any particular element. The halves are thrown 60° off the incoming line '
        + 'at 540 px/s for 0.76 seconds and can never damage anybody. It only covers a line — 70px of '
        + 'steel pointed one way — so anything arriving from a different angle is not cut, which is why '
        + 'the guard has to be aimed and not just pressed. 6s cooldown.',
      cast: 'R, tracking the cursor for the whole 3 seconds. 6s cooldown.',
      effects: [
        { tag: 'shield', label: 'The guard', detail: '3 seconds. The blade is a line from 14px to 84px in front of him along the aim, and anything within 26px of that line is cut.' },
        { tag: 'utility', label: 'Both kinds of shot', detail: 'It works on the shared projectile group and on the kit-local registry half the roster fires into, so it is not a dead button against any particular element.' },
        { tag: 'utility', label: 'The halves', detail: 'Thrown 60° off the incoming line at 540 px/s for 0.76 seconds. Purely a consequence — they can never damage anybody.' },
        { tag: 'cost', label: 'It only covers a line', detail: 'The blade is 70px of steel pointed one way. Anything arriving from a different angle is not cut, which is why the guard has to be aimed and not just pressed.' },
      ],
      upgrade: {
        basics:
          'Missing him now costs them. Any enemy projectile reaching the 15px inner band while travelling '
          + 'into it is destroyed on the stone — which makes it a wall hit rather than a fly-past and stops '
          + 'the same shot billing them twice — and whoever fired it takes −2% damage for 20 seconds, per '
          + 'shot, with no stack limit, against the kit\'s overall 90% cap. Each miss leaves a burning scar '
          + 'for the full 20 seconds, up to 48 kept before the oldest goes, so the wall is a running tally '
          + 'of how badly they have been aiming. A shot reaching the stone within 44px of the reaper is '
          + 'ignored: those are hits about to land, not misses, and eating them would make wall-hugging '
          + 'blanket immunity.',
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
      basics:
        'A 130–340px dash over 230ms with the kit driving the body, cutting anything within 34px of the '
        + 'line and easing out so you arrive at speed and stop rather than coasting. If the pass caught '
        + 'somebody with a limb left, a picker comes up afterwards and waits — 1–4 or a click takes it, F '
        + 'walks away, and nothing else takes the panel down. A leg is ×0.67 move speed, both legs ×0.34, '
        + 'permanently. An arm is +25% cooldowns and −10% damage, both arms +33% and −25%. Everything the '
        + 'dash goes through loses the same limb, once each per dash, and if their chosen side is already '
        + 'gone its pair is taken instead. Two limbs per body for the whole match; charging a body with '
        + 'nothing left still prints 🗡️ SLASHED — NOTHING LEFT and the dash, the sheath bleed and the '
        + 'cuts all still happen. A miss opens no menu, takes no limb and gets no cooldown back — the '
        + 'whole 15s is spent on the attempt.',
      cast: 'F dashes, immediately. If the pass caught somebody with a limb left, the picker comes up afterwards and waits — 1–4 or a click on the row takes it, F walks away from it, and nothing else takes the panel down. 15s cooldown, spent on the press whether or not the dash lands. The dash runs 130–340px over 230ms and the kit drives the body for all of it.',
      effects: [
        { tag: 'debuff', label: 'A leg', detail: 'One leg is ×0.67 move speed. Both legs is ×0.34 — a third of their pace, permanently.' },
        { tag: 'debuff', label: 'An arm', detail: 'One arm is +25% cooldowns and −10% damage. Both arms is +33% cooldowns and −25% damage.' },
        { tag: 'cost', label: 'A miss is a miss', detail: 'The choice is the reward for connecting. A dash that touches nobody opens no menu, takes no limb and gets no cooldown back — the whole 15s is spent on the attempt.' },
        { tag: 'cost', label: 'Two, and no more', detail: 'Two limbs per body for the whole match. Charging a body with nothing left still works and is still worth it — it prints 🗡️ SLASHED — NOTHING LEFT, opens no menu, and the dash, the sheath bleed and the cuts all still happen.' },
        { tag: 'utility', label: 'One limb per pass', detail: 'Everything the dash goes through loses the same limb, and each body only once per dash. If their chosen side is already gone, its pair is taken instead.' },
        { tag: 'area', label: 'The reach', detail: 'Anything within 34px of the dash line is cut, and the dash eases out so he arrives at speed and stops rather than coasting.' },
      ],
      upgrade: {
        basics:
          'The dash lays a corridor: a 34px gash every 24px along it, each lasting 20 seconds, so a '
          + 'full-length charge is about fourteen of them. Standing in one is −25% move speed, and every '
          + 'negative effect on a body standing in the cuts is ×1.5 — its magnitude and the duration of '
          + 'anything new that lands, so a 45% Styx brand becomes 67% and a 20% Dishonor stack becomes 30%. '
          + 'It reads the whole status list, so an ally\'s burn or slow is boosted too, and only debuffs: an '
          + 'enemy regen ticking in the gashes is not extended. It is a place rather than a status, rebuilt '
          + 'from scratch every frame from who is standing where, so it ends the instant they step out. '
          + 'Only the dash lays them — the blade is in the floor for the 230ms it is out, so the corridor '
          + 'is a line you chose to draw.',
        effects: [
          { tag: 'control', label: 'The gashes', detail: '−25% move speed while standing in one. 34px each, 20 seconds each, one every 24px along the dash — so a full-length charge lays a corridor of about fourteen of them.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Only the dash lays them', detail: 'Walking around leaves nothing. The blade is only in the floor while it is out, and it is only out for the 230ms of the dash — the corridor is a line you chose to draw, not a trail you drag.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'The amplifier', detail: 'Every negative effect on a body standing in the cuts is ×1.5 — its magnitude and the duration of anything new that lands. A 45% Styx brand becomes 67%; a 20% Dishonor stack becomes 30%.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Everybody\'s debuffs, not just his', detail: 'The amplifier reads the whole status list, so an ally\'s burn or slow is boosted too. Only debuffs — an enemy regen ticking in the gashes is not extended.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'It is a place, not a status', detail: 'Rebuilt from scratch every frame from who is standing where, so it ends the instant they step out and nothing has to be handed back.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Drawn from a full sheath the dash also leaves everything it passes through exsanguinating for 15 seconds: −10% speed and −10% damage, paid for by the pass rather than by the limb, so a body with nothing left to take is still opened up.',
        'Both legs is the single largest thing this element does to anybody. A target at 34% speed cannot close on him, cannot leave the cuts, and cannot beat the clock.',
        'A bot always takes legs first, for exactly that reason — and it decides on the body its pass actually caught, with no menu of its own.',
        'The dash claims the body outright for its 230ms, so it cannot be cancelled and WASD does nothing during it.',
        'The picker is not modal. Everything else stays live while it is up — you can walk, shoot and cast with it open, and it will still be there when you are done.',
      ],
    },

    'death-deal': {
      basics:
        'Teleports you 48px beside the nearest enemy, holds you still for a 0.64-second handshake — the '
        + 'most exposed the reaper ever is — then teleports you 340px clear. For the next 10 seconds you '
        + 'have +33% move speed and +33% dodge chance, the dodge sustained and topped back up every frame '
        + 'because every save it makes spends some of it. Take less than 50 damage across those ten '
        + 'seconds and the deal is honoured: 10 seconds come straight off the midnight clock and the '
        + 'tolls re-arm to announce the new marks. Take 50 and it prints ☠️ DEAL BROKEN, with no refund '
        + 'and no partial credit. The clock only starts counting damage once he lets go of their hand, so '
        + 'the handshake itself is free. 30s cooldown.',
      cast: 'Q, ultimate. Instant — he teleports to 48px beside the nearest enemy, stands still for the 0.64s handshake, then teleports 340px clear. 30s cooldown.',
      effects: [
        { tag: 'movement', label: 'The bargain', detail: '+33% move speed and +33% dodge chance for the full 10 seconds. The dodge is sustained rather than a charge — it is topped back up every frame, because every save it makes spends some of it.' },
        { tag: 'utility', label: 'The condition', detail: 'Take less than 50 damage across the ten seconds and it is honoured. The clock only starts counting damage when he lets go of their hand, so the handshake itself is free.' },
        { tag: 'buff', label: 'Honoured', detail: '−10 seconds off the clock, immediately, and the tolls re-arm so it will announce the new marks.' },
        { tag: 'cost', label: 'Broken', detail: '50 damage taken and it prints ☠️ DEAL BROKEN. No refund, no partial credit, and the 30 seconds are gone.' },
        { tag: 'cost', label: 'The handshake', detail: '0.64 seconds of standing still, right next to them, at the start. It is the most exposed the reaper ever is.' },
      ],
      upgrade: {
        basics:
          'The deal is worn as armour. A mask refuses 3 instances of damage outright — instances, not '
          + 'points, so it does not care whether the hit was 4 or 400 — sitting above every shield layer '
          + 'and visibly cracking a third further each time. Five 74px tentacles take one enemy projectile '
          + 'out of the air every 0.43 seconds from up to 175px away, a grab rather than a parry, so it '
          + 'does not care which way the shot was travelling, and they answer the shared group first and '
          + 'then the kit-local registry, so no element is immune to being grabbed. Both end the moment the '
          + 'deal does, honoured or broken.',
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

  mastery: {
    inevitability: {
      basics:
        '50 damage aimed at you inside any 2-second window opens a 5-second window of your own. The '
        + 'trigger is counted off the same raw tally the Deal weighs itself against — after the crit '
        + 'roll, before every mitigation multiplier — so a hit your armour halved still counts what it '
        + 'was thrown for, and a dodged one counts nothing because it never reached you. You get +33% '
        + 'dodge chance topped back up every frame as each save spends 0.2 of it, 5 health a second for '
        + '25 in total, and +25% move speed multiplied into the same number Disarm\'s quickening and the '
        + 'Deal\'s haste ride, so all three stack. A second burst refreshes the 5 seconds rather than '
        + 'doubling anything, and the two seconds of damage that lit it are cleared: the next window has '
        + 'to earn its own 50.',
      effects: [
        { tag: 'utility', label: 'The trigger', detail: '50 damage aimed at you inside any 2-second window, counted off the same raw tally the Deal weighs itself against — after the crit roll, before every mitigation multiplier. A hit your armour halved still counts what it was thrown for; a dodged one counts nothing, because it never reached you.' },
        { tag: 'buff', label: 'The dodge', detail: '+33% dodge chance for 5 seconds, topped back up every frame because each save the roll makes spends 0.2 of it.' },
        { tag: 'heal', label: 'The regeneration', detail: '5 health a second for the full 5 seconds — 25 in total, paid out in whole points as the fraction accumulates.' },
        { tag: 'movement', label: 'The speed', detail: '+25% move speed, multiplied into the same number Disarm\'s quickening and the Deal\'s haste ride, so all three stack.' },
        { tag: 'cost', label: 'It does not stack with itself', detail: 'A second burst refreshes the 5 seconds rather than doubling anything, and the two seconds of damage that lit it are cleared — the next window has to earn its own 50.' },
      ],
      notes: [
        'Death has no shields, no armour and no heal anywhere else in the kit. This is the whole of his answer to a burst, and it is deliberately something the enemy hands him rather than something he presses.',
        'The dodge, the regeneration and the speed all stack with the Deal, with the Disarm quickening and with Delay The Inevitable. Only the passive is barred from stacking with the passive.',
        'It cannot be baited out cheaply: chip damage never reaches 50 inside two seconds, so the trigger is exactly the burst it exists to survive.',
        'A bot running the mastery gets it too, and it is most of the reason a Nightmare Death is harder to finish off than a Hard one.',
      ],
    },
    'delay-the-inevitable': {
      basics:
        'A bindable 8-second window bought with time. It puts 8 seconds back onto your own countdown to '
        + 'midnight immediately, and the tolls re-arm so 30/10/5/4/3/2/1 all announce themselves again. '
        + 'For those 8 seconds you take ×0.5 damage, worn on the same field the Styx brand and the '
        + 'missing arms already ride — so a full brand and the window together are ×0.55 × ×0.5, 72% off '
        + '— with +50% move speed, Space dodges carrying 3× as far (1560px instead of 520, most of the '
        + 'arena in one roll), +25% dodge chance on top of anything the passive or a running Deal is '
        + 'lending, and 5 health a second for 40 in total, or 80 second-for-second alongside '
        + 'Inevitability. The cost beyond the clock is +25% to every cooldown you own for the window, on '
        + 'a field of its own so it multiplies honestly with the penalty two missing arms would already '
        + 'be charging. Cannot be bound over Q. 26s cooldown, refused while it is already running, while '
        + 'the handshake or the amputating dash owns the body, and — like every other key — while you are '
        + 'disarmed, silenced or a chicken.',
      cast: 'The bound key, tapped. Cannot be bound over Q. 8 second window, 26 second cooldown counted from the cast. Refused while it is already running, while the handshake or the amputating dash owns the body, and — like every other key in the game — while you are disarmed, silenced or a chicken.',
      effects: [
        { tag: 'cost', label: 'The clock goes backwards', detail: '+8 seconds onto your own countdown to midnight, immediately. The tolls re-arm, so 30/10/5/4/3/2/1 will all announce themselves again.' },
        { tag: 'shield', label: 'Half damage', detail: '×0.5 damage taken for the 8 seconds, worn on the same field the Styx brand and the missing arms already ride — so a full brand and the window together are ×0.55 × ×0.5 = 72% off.' },
        { tag: 'movement', label: 'The speed', detail: '+50% move speed, and Space dodges carry 3× as far — 1560px instead of 520, which is most of the arena in one roll.' },
        { tag: 'buff', label: 'The dodge', detail: '+25% dodge chance, on top of anything the passive or a running Deal is already lending.' },
        { tag: 'heal', label: 'The regeneration', detail: '5 health a second for 8 seconds — 40 in total, and 80 a second-for-second if Inevitability is up alongside it.' },
        { tag: 'cost', label: 'Your own tempo', detail: '+25% to every cooldown you own for the whole window, on a field of its own so it multiplies honestly with the cooldown penalty two missing arms would already be charging you.' },
      ],
      notes: [
        'The eight seconds are bought from the only resource the element has, which is the sixty seconds it is playing for. An honoured Deal is −10; this is +8. Pressed twice in a minute it is most of a Deal handed back.',
        'It is the one cast in the kit that does not touch the sheath. The katana never comes out for it, so a saya that was three seconds from full still fills — every other ability in the element, hit or miss, empties it.',
        '`excludeSlots` bars it from Q, and not for balance: the Deal is the only thing in the element that can give the eight seconds back, and giving up the ultimate to press this would leave it as a pure cost.',
        'Over R it costs you Riposte, which is the honest trade — half damage taken for eight seconds does the same job as three seconds of cutting bullets, without needing the blade pointed the right way. Over F it costs the permanent amputation, which is the most expensive slot in the element to give up.',
        'A bot with the mastery gives up Riposte and presses this when it has taken 25 damage in the last two seconds or has dropped below 55% health — never on cooldown, because the eight seconds cost it the clock it is playing for.',
      ],
    },
  },
};

export default death;
