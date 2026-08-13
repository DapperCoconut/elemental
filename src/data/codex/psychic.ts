import { ElementCodex } from '../AbilityCodex';

/**
 * Psychic — two seconds of the future, and a pool that only exists in it.
 *
 * Verified against `src/elements/psychic.ts`, `kits/PsychicKit.ts` and `ArenaScene.scatterAim`.
 * Psychic has five corrupt shop upgrades and a mastery, and no perks, so every number below is a
 * constant at the top of the kit.
 *
 * The upgrades share one idea rather than one mechanic: unupgraded, everything the passive draws
 * on the floor is *advice*. Each upgrade turns a piece of that drawing into something with rules —
 * the ghost becomes a hitbox, the queue pays rent, the telegraph presses R for you.
 */
const psychic: ElementCodex = {
  identity:
    'A monk who stared at a wall until the eye in the middle of his forehead opened, and who has '
    + 'been two seconds ahead of everybody ever since. Nothing he throws is a projectile — the only '
    + 'thing that touches anybody is a whip, and even that is a delivery system for stress, a second '
    + 'health bar that sits there doing nothing for ten seconds and then goes off all at once '
    + 'straight through armour. Everything else in the kit is spent on the gap: stealing an ability '
    + 'out of the queue over their head, standing untouchable for exactly as long as a telegraph, '
    + 'or ruining their aim to make the pool grow faster. Slow, patient, and unanswerable once the '
    + 'number gets big.',

  passives: [
    {
      emoji: '👁️',
      name: 'Opened Eyes',
      basics:
        'You read the future. Every ability the enemy casts resolves 2 seconds after the press — the '
        + 'cooldown starts at the press, so it costs them tempo rather than uptime — and everything they '
        + 'press meanwhile stacks behind it in an unbounded queue, with the nearest 3 shown as chips over '
        + 'their head, an ultimate marked by a gold chip with a five-pointed sigil. You also see where '
        + 'they are going: a 20-step projection over the same 2 seconds, one marker every 100ms, clamped '
        + 'to the arena\'s 32px margin, ending in a hollow ghost with an eye for a head, drawn only when '
        + 'the projection lands more than 24px from where they are now. For a bot the route is not a '
        + 'guess — it replays the exact locomotion rule the AI is following this tick. With Whip Snap '
        + 'owned, the ghost grows a gold 26px ring that is a real hitbox for the cord, and the passive '
        + 'stops being a read-out and becomes half of the Click.',
      effects: [
        { tag: 'debuff', label: 'The delay', detail: 'Every ability the enemy casts resolves 2 seconds after the press. The cooldown starts at the press, so the delay costs them tempo rather than uptime.' },
        { tag: 'utility', label: 'The queue', detail: 'Unbounded — anything they press while something is already held stacks behind it. The bar over their head shows the nearest 3.' },
        { tag: 'utility', label: 'The route', detail: 'A 20-step projection over the same 2 seconds, one marker every 100ms, clamped to the arena\'s 32px margin. For a bot it is not a guess: it replays the exact locomotion rule the AI is following this tick.' },
        { tag: 'utility', label: 'The ghost', detail: 'A hollow body with an eye for a head at the far end of the thread, drawn only when the projection lands more than 24px from where they are now.' },
        { tag: 'utility', label: 'Reading it back', detail: 'Ultimates get a gold chip with a five-pointed sigil behind it — that is the one worth spending Mind Control on.' },
        { tag: 'control', label: 'The ghost as a target', detail: 'With Whip Snap owned the ghost grows a gold 26px ring: that ring is a real hitbox for the cord, and catching it drags them to it. The passive stops being a read-out and becomes half of the Click.', requiresUpgrade: 'click' },
      ],
      notes: [
        'The thread stops being true the moment the target changes their mind, which is the point: it is a promise the psychic can walk out from under.',
        'A body with no AI plan to read — an online replica, a husk — falls back to dead reckoning off its current velocity, damped 3% a step, and shows nothing at all below 8 px/s.',
        'A psychic who dies mid-telegraph does not hand out free cooldowns: everything still queued fires immediately rather than being dropped.',
        'Online, the opponent delays their own casts on their own machine and relays the queue back at roughly 6 times a second. Their shots really are two seconds late rather than merely looking it — and a mirror older than 1.2s is treated as gone.',
        'A psychic NPC has the same foreknowledge, but its copy of the thread is never painted. Drawing it would hand you the bot\'s routing for free.',
      ],
    },
    {
      emoji: '🩸',
      name: 'Stress',
      basics:
        'A pool that builds with no cap, though the crack art and the burst stop growing at 80 points. '
        + 'Its fuse is 10 seconds and every new point pushes it back out to a full 10, so a psychic who '
        + 'keeps whipping never lets it go off by accident. When it does, the whole pool lands at once as '
        + 'pierce damage, skipping the entire mitigation product and every absorb layer under it — 100 '
        + 'stress is 100 health whatever they are wearing. It is fed by Headache (5, or 10 on the tip), '
        + 'Migraine (10 for being caught, then 10 a second for 3 seconds) and half of every hit that '
        + 'lands on a comatose target. Cycle of Abuse adds a second exit that is not a detonation: 3 a '
        + 'second torn off a comatose victim and spent as ordinary damage, with a quarter of it handed '
        + 'back when they wake.',
      effects: [
        { tag: 'utility', label: 'The pool', detail: 'Builds with no cap. The crack art and the size of the burst scale up to 80 points and stop growing there; the number does not.' },
        { tag: 'utility', label: 'The fuse', detail: '10 seconds, and every single new point pushes it back out to a full 10 — so a psychic who keeps whipping never lets it go off by accident.' },
        { tag: 'damage', label: 'Release', detail: 'The whole pool at once as pierce damage: it skips the entire mitigation product and every absorb layer under it. 100 stress is 100 health, whatever they are wearing.' },
        { tag: 'utility', label: 'What feeds it', detail: 'Headache (5, or 10 on the tip), Migraine (10 for being caught by the charge, then 10 a second for 3 seconds), and half of every hit that lands on a comatose target.' },
        { tag: 'utility', label: 'A second way out', detail: 'Cycle of Abuse gives the pool an exit that is not a detonation: 3 a second is torn off a comatose victim and spent as ordinary damage instead of waiting for the fuse. A quarter of everything spent that way is handed back when they wake.', requiresUpgrade: 'q' },
      ],
      notes: [
        'The pool belongs to whoever last added to it — that side\'s palette paints the cracks and the burst.',
        'Coma\'s banking is silent: it lands on every tick of every burn, poison and bleed the victim is wearing, so a pop-up per tick would bury the arena. The readout over their head is live regardless.',
        'A comatose victim is re-baselined immediately after any detonation, or the half of the burst the coma eats would come back as fresh stress and the two would feed each other forever.',
      ],
    },
  ],

  abilities: {
    'psychic-headache': {
      basics:
        'A 196px cord that deals 12 ordinary damage to everything it crosses — tested as 18 line '
        + 'segments against a body-radius-plus-18px window, so a lash laid across a shoulder lands rather '
        + 'than slipping between sample points. A body hit adds 5 stress, or 10 for anything caught past '
        + '77% of the cord, the last ~45px, which prints "⚡ TIP!" and cracks red. 260ms of animation with '
        + 'the hit resolved at 55% of it and a 700ms cooldown, so holding the button is about 1.4 lashes '
        + 'a second.',
      cast: 'Click, held rather than tapped — the whip is a 700ms rhythm and its own cooldown is the only gate. Aimed at the cursor, thrown from the hand rather than the body centre.',
      effects: [
        { tag: 'damage', label: 'The lash', detail: '12 damage to everything the cord crosses. Ordinary damage — armour answers this half normally.' },
        { tag: 'area', label: 'The reach', detail: '196px of cord, tested as 18 line segments against a body-radius-plus-18px window, so a lash laid across a shoulder lands rather than slipping between sample points.' },
        { tag: 'utility', label: 'The pool', detail: '+5 stress on a body hit.' },
        { tag: 'utility', label: 'The tip', detail: '+10 stress instead, for anything caught past 77% of the cord — the last ~45px of the 196. Prints "⚡ TIP!" and cracks red.' },
        { tag: 'utility', label: 'Timing', detail: '260ms of animation with the hit resolved at 55% of it, and a 700ms cooldown, so holding the button is roughly 1.4 lashes a second.' },
      ],
      upgrade: {
        basics:
          'The cord is now tested against the end of their projected route within 26px before it is '
          + 'tested against any body, and anything caught there is teleported to that point for 20 stress — '
          + 'double the best tip hit and four times a body hit. A snapped target takes 0 damage and none of '
          + 'the ordinary 5 or 10 stress: the lash landed on where they were going, not on them, and they '
          + 'are taken out of the ordinary hit list entirely. It only exists when the projection lands more '
          + 'than 24px from the body, so somebody standing still has no future to be pulled to. A gold 26px '
          + 'ring pulses on the ghost, drawn at exactly the size it is tested at.',
        effects: [
          { tag: 'control', label: 'The snap', detail: 'The cord is tested against the end of the route within 26px, before it is tested against any body. Anything caught there is teleported to that point.' },
          { tag: 'utility', label: 'The pool', detail: '20 stress — double the best possible tip hit, and four times a body hit.' },
          { tag: 'cost', label: 'No damage at all', detail: 'A snapped target takes 0 damage and none of the ordinary 5/10 stress. The lash landed on where they were going, not on them, and a target caught by the snap is taken out of the ordinary hit list entirely.' },
          { tag: 'utility', label: 'Only what moves', detail: 'The ghost — and so the snap — only exists when the projection lands more than 24px from the body. Somebody standing still has no future to be pulled to.' },
          { tag: 'utility', label: 'The tell', detail: 'A gold 26px ring pulses on the ghost the moment the upgrade is owned, so the target you are aiming at is drawn at exactly the size it is tested at.' },
        ],
      },
      notes: [
        'The whole skill in the ability is standing at exactly the wrong distance. Point blank is 5 stress a lash; hanging back at the very end of the cord is 10.',
        'A lash that catches nobody still cracks in the air at the tip, so the reach stays legible when you are practising the range.',
        'It hits everything the cord crosses, which in an Invasion wave is every husk on the line at once — each of them getting its own pool.',
      ],
    },

    'psychic-mind-control': {
      basics:
        'Takes the soonest-resolving entry out of the nearest enemy\'s queue: the ability never fires '
        + 'and its effect never lands, and its cooldown is restamped in full from the instant it was '
        + 'seized, so a stolen 30-second ultimate is 30 fresh seconds on top of the 2 they already spent '
        + 'waiting. Pressed with nothing seizable it is refused before the cast is stamped, printing '
        + '"NOTHING TO SEIZE" and costing no cooldown at all. The chips over their head are the shopping '
        + 'list. 5s cooldown.',
      cast: 'E, no aim — it takes the nearest enemy who actually has something queued. 5s cooldown.',
      effects: [
        { tag: 'control', label: 'The theft', detail: 'Removes the soonest-resolving entry from the target\'s queue. The ability never fires and its effect never lands.' },
        { tag: 'debuff', label: 'The cooldown', detail: 'Restamped in full from the instant it was seized — a stolen 30-second ultimate is 30 fresh seconds, on top of the 2 they already spent waiting.' },
        { tag: 'utility', label: 'Free when it whiffs', detail: 'Pressed with nothing seizable, it is refused before the cast is stamped: it prints "NOTHING TO SEIZE" and costs no cooldown at all.' },
        { tag: 'utility', label: 'Reading the target', detail: 'The chips over their head are the shopping list. Gold chip with a sigil behind it means an ultimate is in the queue.' },
      ],
      upgrade: {
        basics:
          'Every successful seizure also takes 5 seconds off the cooldown of your own ability in the same '
          + 'slot as the one you stole, printing "⏱ <key> −5s". It is matched on the display key rather '
          + 'than the ability id, since the slot is the only thing a stolen Fireball and a Headache have in '
          + 'common — and because Mind Control\'s own cooldown is 5 seconds, seizing an E refunds the entire '
          + 'cost of the theft. A refused press credits nothing.',
        effects: [
          { tag: 'buff', label: 'The credit', detail: '5 seconds off the cooldown of the thief\'s own ability in the same slot as the one seized. Prints "⏱ <key> −5s" over him.' },
          { tag: 'utility', label: 'Matched by slot', detail: 'Paired on the display key (Click / E / R / F / Q), not the ability id — the slot is the only thing a stolen Fireball and a Headache have in common.' },
          { tag: 'buff', label: 'Stealing their E', detail: 'Mind Control\'s own cooldown is 5 seconds, so seizing an E refunds the entire cost of the theft and hands it straight back.' },
          { tag: 'utility', label: 'Where it applies', detail: 'On every successful seizure, including the optimistic one taken against the relayed mirror online. A refused press ("NOTHING TO SEIZE") credits nothing.' },
        ],
      },
      notes: [
        'Value is entirely in what you take. A stolen click is worth under a second; a stolen ultimate is worth its whole cooldown, which is why the chips are colour-coded.',
        'Online, the theft is applied optimistically against the relayed mirror and a cancel is sent for the opponent\'s own sim to honour — their next relay corrects any disagreement.',
        'It reaches into the *queue*, not the arena. An ability that already resolved cannot be taken back.',
      ],
    },

    'psychic-dodge-destiny': {
      basics:
        '1.25 seconds of full invincibility: nothing lands, not damage, not shields being stripped, not '
        + 'status. It is re-asserted every single frame rather than set once, because dashes and half a '
        + 'dozen other kits clear invincibility on timers of their own, so nothing in the game can cut '
        + 'the window short. The monk\'s third eye is forced shut for the duration. 6s cooldown.',
      cast: 'R. Instant, no aim. 6s cooldown.',
      effects: [
        { tag: 'shield', label: 'Untouchable', detail: '1.25 seconds of full invincibility. Nothing lands: not damage, not shields being stripped, not status.' },
        { tag: 'utility', label: 'Held open', detail: 'Re-asserted every single frame rather than set once, because dashes and half a dozen other kits clear invincibility on timers of their own. Nothing in the game can cut the window short.' },
        { tag: 'utility', label: 'The tell', detail: 'The monk\'s third eye is forced shut for the whole window and reopens to whatever focus it was at.' },
      ],
      upgrade: {
        basics:
          'It now fires itself when 50 damage is about to land, measured after every mitigation and '
          + 'armour multiplier on the way in, and refuses the triggering hit entirely — 0 damage and no '
          + 'shield spent. The 50 is a running total inside a rolling 2-second window rather than one blow, '
          + 'so five 10s trip it just as a single 50 does, and the window empties when it fires. You get '
          + 'the ordinary ability, and it spends the real 6-second cooldown, so an automatic dodge is a '
          + 'manual one you no longer have; on cooldown, the hit lands normally. The hook sits on the '
          + 'absorb layer, which pierce damage skips, so another psychic\'s stress release is not stopped by '
          + 'it.',
        effects: [
          { tag: 'shield', label: 'The trigger', detail: '50 damage about to land, measured after every mitigation and armour multiplier on the way in. The triggering hit is refused entirely — 0 damage, no shield spent.' },
          { tag: 'utility', label: 'A running total', detail: 'It is 50 inside a rolling 2-second window, not 50 in one blow — five 10s in a row trip it just as a single 50 does. The window is emptied when it fires.' },
          { tag: 'shield', label: 'What you get', detail: 'The ordinary ability: the same 1.25 seconds of full invincibility, re-asserted every frame.' },
          { tag: 'cost', label: 'It is not free', detail: 'It spends the real 6-second cooldown, so an automatic dodge is a manual one you no longer have. On cooldown, the hit lands normally.' },
          { tag: 'utility', label: 'Pierce goes through it', detail: 'The hook sits on the absorb layer, which pierce damage skips — so another psychic\'s stress release is not stopped by this, and neither is anything else that pierces.' },
        ],
      },
      notes: [
        '1.25 seconds against a 2-second telegraph means you can press it *after* seeing a chip go gold and still be under it when the ability lands.',
        'Invincibility does not stop stress — the pool is already on you, and it goes off when its fuse runs out regardless of what you were invincible to.',
      ],
    },

    'psychic-migraine': {
      basics:
        'Paints a mark at the cursor, clamped to the arena\'s 32px margin, that resolves 2.5 seconds '
        + 'later as a 100px blast — long enough to walk out of from a standing start, which is the whole '
        + 'deal being offered. Everything caught takes 10 stress and then 10 a second for 3 seconds, 40 '
        + 'in total, and has its aim ruined: for those 3 seconds 66% of their casts are rotated 20–35° '
        + 'off true to either side, about the caster and at the same range, while the other 34% land '
        + 'honestly. Both sides\' marks are painted under the fighters. 15s cooldown, refunded only if the '
        + 'caster is already dead — where it lands is your problem.',
      cast: 'F, aimed at the cursor and clamped to the arena\'s 32px margin. 2.5s fuse, then a 100px blast. 15s cooldown. Refunded only if the caster is already dead — where it lands is your problem.',
      effects: [
        { tag: 'area', label: 'The blast', detail: '100px radius measured from the mark to the centre of a body, resolved once, 2.5 seconds after the press. Everything on the enemy list inside it is caught: 1 in a duel, however many are standing in it in Invasion.' },
        { tag: 'debuff', label: 'Ruined aim', detail: '3 seconds in which 66% of their casts are rotated 20–35° off true, to either side, about the caster and at the same range. The other 34% land honestly.' },
        { tag: 'utility', label: 'The pool', detail: '+10 stress for being caught by the blast, then 10 a second for the 3 seconds after it — 40 in total on a clean hit.' },
        { tag: 'utility', label: 'The telegraph', detail: 'Both sides\' marks are painted, under the fighters at depth 4. 2.5 seconds is long enough to walk 100px out of it from a standing start, which is the whole deal being offered.' },
      ],
      upgrade: {
        basics:
          'F can be held for up to 5 seconds, firing itself on reaching 5 rather than stalling; releasing '
          + 'early fires whatever it had reached and a tap is exactly the base ability. Each second held '
          + 'adds 0.8s of fuse (2.5s at a tap out to 6.5s), 20px of radius (100px out to 200px, with the '
          + 'rim drawn at the real size throughout), 4 flat stress (10 out to 30), and 10% of the pool they '
          + 'are already carrying — fully wound that is half their current pool again, so 60 stress on a '
          + 'target becomes 90 plus the flat 30, read before the add so it never scales off itself. The 15s '
          + 'cooldown is stamped at the release, and the wind-up is dropped for nothing if you are put in a '
          + 'coma or killed during it ("FOCUS LOST").',
        effects: [
          { tag: 'utility', label: 'The wind-up', detail: 'Hold F for up to 5 seconds. It fires itself on reaching 5 rather than stalling there; releasing early fires it at whatever it had reached, and a tap is exactly the base ability.' },
          { tag: 'utility', label: 'Longer fuse', detail: '+0.8s of fuse per second held — 2.5s at a tap out to 6.5s fully wound. A wound charge sits on the floor longer, so the mark is a longer promise as well as a bigger one.' },
          { tag: 'area', label: 'Wider blast', detail: '+20px of radius per second held: 100px at a tap, 200px fully wound. The rim on the floor is drawn at the real size the whole time.' },
          { tag: 'utility', label: 'More stress, flat', detail: '+4 stress on the blast per second held — 10 at a tap, 30 fully wound, before the part below.' },
          { tag: 'damage', label: 'More stress, scaling', detail: '+10% of the pool they are *already* carrying, per second held. Fully wound that is half their current pool again — 60 stress on a target becomes 90 plus the flat 30. Read before the add, so it never scales off itself.' },
          { tag: 'cost', label: 'What it costs', detail: 'The 15s cooldown is stamped at the release, not the press, and the wind-up is dropped for nothing if he is put in a coma or killed during it ("FOCUS LOST").' },
        ],
      },
      notes: [
        'It is Fire\'s Pressure Bomb with a migraine in it instead of an explosion, and it suits this element better: the thread on the floor is already telling you where they are going to be standing.',
        'A third of their shots landing honestly is deliberate — a debuff that misses *everything* stops reading as distress and starts reading as a stun.',
        'The ability\'s own one-line description says "up to 30 degrees". The kit rotates 20–35°, so the floor is higher and the ceiling is higher than the card claims.',
        'The press is only the plant. The cooldown starts there, the sound at the press is the seal going down, and the torment is played by the kit when the fuse runs out.',
        'A charge outlives nothing: it is dropped along with the rest of the kit\'s state at the start of the next match, and a caster who dies mid-fuse still gets the detonation.',
        'Online it is relayed rather than applied locally, and only at the detonation: bending the copy here as well would bend an angle that has already been bent once on the machine that owns it.',
      ],
    },

    'psychic-coma': {
      basics:
        'Detonates the stress pool on every enemy carrying one for 1.5× its value as pierce damage — 80 '
        + 'stress becomes 120 health, through anything — and puts them face down for 1 second per 20 '
        + 'points detonated, rounded down, so 120 is 6 seconds and under 20 is none at all. A coma forces '
        + 'velocity to zero every frame and disarms on a rolling 150ms refresh, so they can neither walk '
        + 'nor cast. While they are under, damage they take is halved and the half that was eaten is '
        + 'banked straight back as stress, so a Q on 80 buys six seconds in which to build the next pool '
        + 'for free. With no pool anywhere it is refunded outright and prints "NO STRESS TO CASH". 30s '
        + 'cooldown.',
      cast: 'Q. Instant, no aim — it detonates the pool on every enemy carrying one. 30s cooldown. Ultimate.',
      effects: [
        { tag: 'damage', label: 'The detonation', detail: 'The whole pool ×1.5 as pierce damage. 80 stress becomes 120 health, through anything.' },
        { tag: 'control', label: 'Face down', detail: '1 second of coma for every 20 points detonated, rounded down. 120 detonated is 6 seconds; under 20 detonated is none at all.' },
        { tag: 'control', label: 'What a coma is', detail: 'Velocity forced to zero every frame and disarmed on a rolling 150ms refresh, so they can neither walk nor cast for the duration.' },
        { tag: 'debuff', label: 'The battery', detail: 'Damage taken while under is multiplied by 0.5 — and the half that was eaten is banked back as stress. A Q on 80 buys 6 seconds in which to build the next pool for free.' },
        { tag: 'utility', label: 'Free when it whiffs', detail: 'With no pool anywhere the ultimate is refunded outright and prints "NO STRESS TO CASH" — 30 seconds is not spent on a light show.' },
      ],
      upgrade: {
        basics:
          'A comatose victim now bleeds: 3 stress a second taken off their pool and dealt as ordinary '
          + 'damage, which their armour answers normally — the coma\'s own halving included — so it lands as '
          + 'roughly 1.5 while they are under. Every point bled throws a 120px burst dealing 10 damage to '
          + 'every living body inside it except the one in the coma, who is never touched by their own '
          + 'pressure. You are not exempt: standing over a victim to whip them costs 10 a second as '
          + 'self-inflicted damage, which is what the name is warning about. A quarter of everything bled '
          + 'is handed back as a fresh pool with a full 10-second fuse the moment the coma ends, unless '
          + 'they died under. The bleed\'s own damage is exempt from the coma\'s banking — it is a drain, not '
          + 'a loan.',
        effects: [
          { tag: 'dot', label: 'The bleed', detail: '3 stress a second is taken off a comatose victim\'s pool and dealt to them as ordinary damage. Their armour answers it normally, the coma\'s own 0.5 included, so it lands as roughly 1.5 while they are under.' },
          { tag: 'area', label: 'The shockwave', detail: 'Every point bled throws a 120px burst dealing 10 damage to every living body inside it — except the one in the coma, who is never touched by their own pressure.' },
          { tag: 'cost', label: 'You are in the blast', detail: 'The psychic is not exempt. Standing over a comatose victim to whip them costs 10 a second, taken as self-inflicted damage. The name is the warning.' },
          { tag: 'resource', label: 'The refund', detail: '25% of everything bled is added back as a fresh pool the moment the coma ends — 18 bled over 6 seconds returns 5, with a full 10-second fuse on it. Nothing is returned if they died under.' },
          { tag: 'utility', label: 'Not banked', detail: 'The bleed\'s own damage is exempt from the coma\'s half-damage banking. It is a drain, not a loan — otherwise the coma would hand half of every bleed straight back and the pool would never go down.' },
        ],
      },
      notes: [
        'The multiplier is applied before the coma length is worked out, so the ×1.5 buys seconds as well as damage: 80 stress is 6 seconds, not 4.',
        'The half-damage is a *discount for them* and a *loan to you*. Nothing is lost — it comes back as a pool with a fresh 10-second fuse on it.',
        'The whip banks nothing extra while they are under; it is the coma splitting the incoming hit, so any damage source at all feeds it, including your own burns and anything an ally is doing.',
        'Pierce means invincibility is the only thing that stops it landing, and even that does not stop the pool from existing.',
      ],
    },
  },

  mastery: {
    'predictors-snare': {
      basics:
        'Space stops being a dash and becomes a teleport to the end of the nearest living enemy\'s '
        + 'projected route — the same point the ghost is drawn at, clamped to the arena\'s 32px margin. '
        + 'Direction is ignored entirely; WASD has nothing to do with it. A closed eye is left on the '
        + 'landing spot, arming after 0.26s and lying there 14 seconds, dealing 15 stress to the first '
        + 'enemy whose body comes within 20px of it and then spent. Six can be on the floor at once, and '
        + 'a seventh rubs out the oldest rather than refusing the dash. If nobody on the field has a '
        + 'route ending more than 24px from where they stand it is an ordinary 520px dash. Under Utter '
        + 'Focus the marker is five seconds ahead instead of two, so the teleport reaches much further '
        + 'and the rune is planted much deeper into their future. No cooldown of its own — it rides the '
        + 'dodge\'s own second.',
      cast: 'Space. Replaces the ordinary Space dash entirely while Psychic Mastery is on. No cooldown of its own — it rides the dodge\'s own 1 second.',
      effects: [
        { tag: 'movement', label: 'Where you land', detail: 'The end of the nearest living enemy\'s projected route — the same point the destiny ghost is drawn at, clamped to the arena\'s 32px margin. Direction is ignored: WASD has nothing to do with it.' },
        { tag: 'summon', label: 'The rune', detail: 'A closed eye is left on the landing spot. It arms after 0.26s and lies there for 14 seconds.' },
        { tag: 'debuff', label: 'What it does', detail: '15 stress to the first enemy whose body comes within 20px of it, plus their own radius. It is spent the moment it fires.' },
        { tag: 'area', label: 'How many', detail: '6 on the floor at once. Planting a 7th rubs out the oldest rather than refusing the dash.' },
        { tag: 'utility', label: 'When it refuses', detail: 'Nobody on the field has a route ending more than 24px from where they are standing — then it is an ordinary 520px dash, exactly as it was before the mastery.' },
        { tag: 'buff', label: 'Under Utter Focus', detail: 'The marker is five seconds ahead instead of two, so the teleport reaches much further and the rune is planted much deeper into their future. The stress it deals is ×1.2 like everything else.' },
      ],
      notes: [
        'The rune is not a trap you place — it is a prediction you cash. It only ever ends up somewhere the enemy has already told you they are walking, which is why it needs no seeking behaviour at all.',
        'Standing still beats it, and beats it completely: no route means no marker, no teleport and no rune. It is the same counterplay Whip Snap asks for, which is the point — the mastery makes refusing to move even more expensive.',
        'A rune cannot catch the psychic who planted it. Only the planter\'s own enemies trip one.',
        'The teleport goes through the dodge, so the 280ms of invincibility and the 1s cooldown are unchanged — and so is the WASD lockout during it, which is what stops you sliding off the marker you just bought.',
        'The passive is the human player\'s. A bot has no Space dash to replace, so a Nightmare psychic gets the mastery\'s ability and its look but never plants a rune.',
      ],
    },
    'utter-focus': {
      basics:
        'Eight seconds in which your read goes from 2 seconds ahead to 5: route, ghost, chips and the '
        + 'delay on their casts are all the same number and move together, so every ability aimed at you '
        + 'resolves 5 seconds after the press — though casts already queued keep the window they were '
        + 'pressed under. All stress you inflict is ×1.2 while it runs, lashes, tips, Migraine ticks, '
        + 'blast stress, snares and the coma\'s banking alike. Against a real opponent online their '
        + 'movement keys are buffered by the same 5 seconds on their own machine, so for the first 5 '
        + 'seconds they do not move at all and after that they walk the route you have been reading — and '
        + 'while their feet are held, their machine integrates the buffered keys forward and relays 10 '
        + 'points of the result about six times a second, making it the only projection in the game that '
        + 'is a fact. Every frame in which any damage lands on you takes 0.5s off the window, so six hits '
        + 'inside it and there is nothing left. Your third eye is drawn shut throughout, which is the '
        + 'tell they have to read. Bindable to R, F or Q — never E. 26s cooldown.',
      cast: 'The bound key (R, F or Q — never E). Instant, no aim. 26 second cooldown, counted from the press; the ability card shows the 8 seconds first and the 26 after.',
      effects: [
        { tag: 'buff', label: 'Five seconds ahead', detail: 'The passive\'s window goes from 2s to 5s for the whole 8 seconds. Route, ghost, chips and delay are all the same number, so all four move together.' },
        { tag: 'control', label: 'The delay', detail: 'Every ability cast at you resolves 5 seconds after the press instead of 2. Casts already in the queue keep the window they were pressed under — a widening window does not reach back.' },
        { tag: 'damage', label: 'Every point is worth more', detail: '×1.2 on all stress you inflict while it runs — lashes, tips, Migraine ticks, blast stress, snares and the coma\'s own banking alike.' },
        { tag: 'control', label: 'Held feet (online only)', detail: 'Against a real opponent their movement keys are buffered by the same 5 seconds on their own machine. For the first 5 seconds of the window there is nothing mature in that buffer, so they do not move at all; after that they walk the route you have been reading.' },
        { tag: 'utility', label: 'A route that is not a guess', detail: 'While their feet are held, their machine integrates the buffered keys forward and relays 10 points of the result about 6 times a second. The thread over an online opponent is the only projection in the game that is a fact.' },
        { tag: 'cost', label: 'Being hit shortens it', detail: 'Every frame in which any damage at all lands on you takes 0.5s off the window. Six hits inside it and there is no window left.' },
        { tag: 'utility', label: 'Blind', detail: 'His third eye is drawn shut for the duration, exactly as it is during Dodge Destiny. It is the tell the opponent has to read.' },
      ],
      notes: [
        'A five-second queue is the only thing that makes Mind Control comfortable: three chips over their head instead of one, and long enough to pick the gold one. That is why E is the one slot this cannot be bound over — binding it there would delete the reason to press it.',
        'It is not an invulnerability. Everything still lands, five seconds later, all of it at once — and the pile-up at the end of the window is exactly the thing a psychic is supposed to have already walked out from under.',
        'The counter is pressure rather than burst. A single enormous hit costs the window half a second; six chip ticks cost it three.',
        'A Space dodge is not a movement key and is not held — it is the one way out of the buffered feet, and it is deliberately left open. Somebody being read can still roll.',
        'Online, what crosses the wire is how much of the window is *left*, roughly twice a second, rather than how long it was — every hit the psychic takes changes that number and the other machine has no way to know.',
        'Offline the movement half never runs. A bot\'s route is already projected exactly from its own locomotion rule, so holding a human\'s feet would buy the psychic nothing and cost the human everything.',
        'Predictor\'s Snare reaches five seconds too while this is up, which is the pairing: the teleport lands much further away, and the rune is planted much deeper into a route they have not walked yet.',
      ],
    },
  },
};

export default psychic;
