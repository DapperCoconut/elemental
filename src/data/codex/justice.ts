import { ElementCodex } from '../AbilityCodex';

/**
 * Justice — a magistrate on the floor and a valkyrie in the air, spending one blue bar for both.
 *
 * Verified against `src/elements/justice.ts` and `kits/JusticeKit.ts`. Justice has no perks and
 * no mastery enhancements: every figure below is a constant at the top of the kit. The ability
 * list is ten entries — indices 0–4 are the ground stance, 5–9 the flight stance — and F is the
 * door between them.
 *
 * Its five shop upgrades do not respect that split. Each one is bought against a *key*, and
 * both stances share the five keys, so Hell-Piercer changes what a spear does in the air as
 * well as on the floor, World Maker arms an arena border the flight stance is the only thing
 * that can tear out, and Swift and Blind pays out completely differently depending on which
 * Q you pressed. Every ability that an upgrade reaches carries its own `upgrade` block below,
 * whether or not that slot is "its" key.
 */
const justice: ElementCodex = {
  identity:
    'Justice is two characters sharing one bar of Willpower. On the ground you are a magistrate '
    + 'with a spear who fences the arena off with marble, burns Willpower to become harder to '
    + 'kill, and closes the match by putting the enemy on a set of scales and reading out how much '
    + 'they have taken off you. In the air you are a valkyrie who hovers over your own walls, tears '
    + 'the arena border out and drives it across the map, and finishes by opening a hundred eyes in '
    + 'the middle of the floor until somebody walks to you. Nothing here is subtle and almost none '
    + 'of it can be dodged sideways — Justice wins by deciding where the fight is allowed to happen.',

  passives: [
    {
      emoji: '💙',
      name: 'Willpower',
      basics:
        'A 100-point bar, full at the start of every match, refilling at 5 a second whether or not '
        + 'anything is draining it — and at 6 a second for 2 seconds after any hit that lands on you, '
        + 'renewed by every further hit. Sheer Will burns 10 a second against that, a net 5, so a full '
        + 'bar lasts 20 seconds of it. Flight costs 2 a second, which is a net gain of 3 — flying on its '
        + 'own fills the bar. Both together is 12 a second, a net 7 down, about 14 seconds from full. At '
        + '0 you get "💤 WILL SPENT": Sheer Will switches itself off and flight drops you to the ground, '
        + 'and neither can be switched back on below 5.',
      effects: [
        { tag: 'resource', label: 'The bar', detail: '100 Willpower, full at the start of every match, and it refills at 5 a second whether or not anything is draining it.' },
        { tag: 'resource', label: 'Determination', detail: 'Any hit that lands on you sets the regen to 6 a second for the next 2 seconds. Every further hit renews the window.' },
        { tag: 'cost', label: 'Sheer Will', detail: '10 a second against the 5 coming in — a net 5 a second, so a full bar burns out in 20 seconds of it.' },
        { tag: 'cost', label: 'Flight', detail: '2 a second against the 5 coming in — a net *gain* of 3 a second. Flying on its own fills the bar.' },
        { tag: 'cost', label: 'Both at once', detail: '12 a second, a net 7 a second down: about 14 seconds from full before the floor takes you back.' },
        { tag: 'utility', label: 'Running dry', detail: 'At 0 you get "💤 WILL SPENT", Sheer Will switches itself off and flight drops you to the ground. Neither can be switched back on below 5 Willpower.' },
      ],
      notes: [
        'The HUD prints the live net rate next to the number, and turns red under 25 — the bar is meant to be read as a rate, not a pool.',
        'Because regen never pauses, Sheer Will is a 20-second timer you can stop and restart at will, not a resource you can run out of by accident mid-combo.',
        'Flight paying for itself is the whole reason the flight stance is the default cruising position and Sheer Will is the thing you switch on for a fight.',
      ],
    },
    {
      emoji: '🕊️',
      name: 'Two Stances',
      basics:
        'F takes off, on a 2.5s cooldown and needing 5 Willpower, and F lands again on a 0.5s cooldown, '
        + 'with the whole ability tray rebuilt to match the stance you are in. The air gives +33% move '
        + 'speed and lets you cross your own Coliseum ring, which nothing else can; it costs +20% damage '
        + 'taken from everything for as long as you are up. Hovering also stops enemy puddles halving '
        + 'your speed and refuses damage from any source that has not moved in 3 seconds. Coliseum rings, '
        + 'flame pillars, a running sentence and a trance all carry through a stance change — a grappling '
        + 'chain, flying or already hooked, is dropped the instant your feet touch the floor.',
      effects: [
        { tag: 'utility', label: 'The swap', detail: 'F takes off (2.5s cooldown, needs 5 Willpower) and F lands again (0.5s cooldown). The ability tray is rebuilt to match the stance you are in.' },
        { tag: 'buff', label: 'What the air gives', detail: '+33% move speed, and you are the only thing that can cross your own Coliseum ring.' },
        { tag: 'cost', label: 'What the air costs', detail: '+20% damage taken from everything, for as long as you are up.' },
        { tag: 'shield', label: 'Hovering', detail: 'Enemy puddles stop halving your speed, and damage from any source that has not moved in 3 seconds does not land on you at all.' },
        { tag: 'utility', label: 'What carries over', detail: 'Coliseum rings, flame pillars, a running sentence and a trance all keep going through a stance change. A grappling chain — flying or already hooked — is dropped the instant your feet touch the floor.' },
      ],
      notes: [
        'Landing is not free of consequence: Descend and being forced down by an empty bar do the same thing to your chains.',
        'Descend has its own 0.5s cooldown, but taking off again runs Flight\'s 2.5s, so the stance dance has a floor of about three seconds a round trip.',
        'The 20% vulnerability and Sheer Will\'s 25% cut are both written to the same field and compose rather than overwrite: flying with a fresh retaliation up is ×1.2 × 0.75 = ×0.9, so you are momentarily *tougher* in the air than standing still.',
      ],
    },
  ],

  abilities: {
    // ── Ground stance ───────────────────────────────────────────────
    'justice-stab': {
      basics:
        'One press, two attacks. A 20-damage thrust to every body within 96px in a 60° wedge — 30° '
        + 'either side of the aim, so it is neither a circle nor single-target — and a 15-damage spear '
        + 'launched 30px ahead at 620 px/s that dies on the first body it touches. The thrown spear is a '
        + 'real arena projectile on the proj-justice-spear texture, so anything that blocks, eats, steals '
        + 'or reflects shots can do it to this one. A body standing on the line inside 96px takes both '
        + 'halves off one press. 800ms between casts.',
      cast: 'Click, aimed at the cursor. 800ms between casts.',
      effects: [
        { tag: 'damage', label: 'The thrust', detail: '20 damage to every body within 96px in a 60° wedge in front of you — 30° either side of the aim. It is not a circle and it is not single-target.' },
        { tag: 'damage', label: 'The spear', detail: '15 damage, launched 30px ahead of you at 620 px/s and dying on the first body it touches.' },
        { tag: 'utility', label: 'A real projectile', detail: 'The thrown spear is an arena projectile on the `proj-justice-spear` texture, so anything in the game that blocks, eats, steals or reflects shots can do it to this one.' },
        { tag: 'damage', label: 'Point blank', detail: 'A body standing on the line inside 96px takes both halves off one press: 20, then 15 when the spear arrives.' },
      ],
      upgrade: {
        basics:
          'Two upgrades reach this key from opposite ends. Hell-Piercer makes the thrown spear a marker: '
          + 'it opens an angel bite lasting 3 seconds, up to 3 at once with a fourth refreshing the oldest, '
          + 'and the thrust then kills outright if it leaves the body under 5% of its maximum health per '
          + 'open bite — 5% at one, 10% at two, 15% at three. The 20-damage thrust resolves first and the '
          + 'threshold is read off what is left, so a body the swing itself pushed under the line is still '
          + 'taken, and the kill goes through every absorb layer in the game. Death from Above replaces the '
          + 'hand weapon entirely for the 5 seconds after you land: no spear at all, an axe dealing 5 '
          + 'damage in a 90° arc inside 84px on a 100ms cooldown instead of 800ms, auto-firing while the '
          + 'button is held, shoving you 22px over 110ms along your existing heading with every swing — '
          + 'about 200 px/s on top of your own speed. No spear is thrown by an axe swing, so no bites are '
          + 'opened by one.',
        effects: [
          { tag: 'debuff', label: 'Angel bite', requiresUpgrade: 'click', detail: 'The thrown spear opens a bite that lasts 3 seconds. Up to 3 are open at once; a fourth refreshes the oldest rather than being wasted.' },
          { tag: 'damage', label: 'Execution', requiresUpgrade: 'click', detail: 'The thrust kills outright if it leaves the body under 5% of its maximum health per open bite — 5% at one, 10% at two, 15% at three.' },
          { tag: 'utility', label: 'Checked after the hit', requiresUpgrade: 'click', detail: 'The 20-damage thrust resolves first and the threshold is read off what is left, so a body the swing itself pushed under the line is still taken.' },
          { tag: 'utility', label: 'Pierced', requiresUpgrade: 'click', detail: 'The kill goes through every absorb layer in the game — shields, shield HP, weak HP, clotted HP and any damage absorber.' },
          { tag: 'damage', label: 'The axe', requiresUpgrade: 'f', detail: '5 damage in a 90° arc inside 84px, on a 100ms cooldown instead of 800ms, for the 5 seconds after you press F to land.' },
          { tag: 'movement', label: 'Rushing down', requiresUpgrade: 'f', detail: 'Every swing shoves you 22px over 110ms along whatever direction you were already moving — about 200 px/s on top of your own speed for as long as you keep swinging.' },
          { tag: 'utility', label: 'Held, not clicked', requiresUpgrade: 'f', detail: 'The axe auto-fires while the mouse button is down. No spear is thrown by an axe swing, so no bites are opened by one.' },
        ],
      },
      notes: [
        'The wedge is rolled before the throw, and it takes Sheer Will\'s Righteous bonus with it — so swinging at empty air spends the +33% on nothing and the spear then flies at its plain 15.',
        'The animation draws 76px of spear; the wedge reaches 96px, because a body\'s own width counts.',
        'Your own Coliseum destroys your own spear the moment it crosses the ring. The wall does not check who fired.',
        'The axe is a melee Justice swing like the thrust is, so it cashes in angel bites too — Death from Above and Hell-Piercer together are the fastest way anything in the game reaches an execution.',
      ],
    },

    'justice-coliseum': {
      basics:
        'Raises a 152px ring of 18 columns centred on you, rising over 320ms and holding people once it '
        + 'is 60% up, standing 8 seconds and sinking over its last 400ms. Everyone is held on the side '
        + 'they were on: insiders pushed back to 134px from the centre, outsiders held out at 170px, and '
        + 'the shove stops their velocity dead. Any projectile crossing the ring in either direction is '
        + 'destroyed at the crossing point, tracked per ring by which side the shot was on last frame so '
        + 'nothing tunnels through at speed. It holds you too — only the flight stance passes through '
        + 'your own wall. One per side; a second ring sinks the first within 120ms. 14s cooldown.',
      cast: 'E, no aim — the ring is centred on you at the instant of the cast. 14s cooldown, 8s of wall.',
      effects: [
        { tag: 'area', label: 'The ring', detail: '152px radius, 18 columns, rising over 320ms. It starts holding people once it is 60% up — about 190ms — and sinks over its last 400ms.' },
        { tag: 'control', label: 'The wall', detail: 'Everyone is held on the side they were on when it went up: insiders are pushed back to 134px from the centre, outsiders held out at 170px, and the shove stops their velocity dead.' },
        { tag: 'shield', label: 'Shots die on it', detail: 'Any projectile that crosses the ring in either direction is destroyed at the crossing point. It is tracked per ring by which side the shot was on last frame, so nothing tunnels through at speed.' },
        { tag: 'cost', label: 'It holds you too', detail: 'A magistrate standing on the ground is subject to their own wall. Only the flight stance passes through it.' },
        { tag: 'utility', label: 'One per side', detail: 'Raising a second ring sinks the first within 120ms rather than stacking two cages.' },
      ],
      upgrade: {
        basics:
          'World Maker. Standing within 152px of the centre of a ring of your own gives +25% move speed '
          + 'and +25% on every damage figure Justice deals. The arena itself is re-fitted as well: every '
          + 'border wall grows iron spikes dealing 20 damage to any enemy within 40px, once every 2 seconds '
          + 'per body rather than per wall, so a corner is not worth double. They are owner-scoped — they '
          + 'hurt everything you are allowed to hurt and never you — and they travel: a wall ripped out by '
          + 'Bind carries its spikes across the arena on its leading face, so the crossing costs 20 on top '
          + 'of the shove. The 15-second hole a ripped wall leaves has no spikes in it at all.',
        effects: [
          { tag: 'buff', label: 'Home ground', requiresUpgrade: 'e', detail: '+25% move speed and +25% damage on every figure Justice deals, for as long as you are within 152px of the centre of a ring of your own.' },
          { tag: 'damage', label: 'The spikes', requiresUpgrade: 'e', detail: '20 damage to any enemy within 40px of a standing arena wall, once every 2 seconds per body — not per wall, so a corner is not worth double.' },
          { tag: 'utility', label: 'Only yours bite', requiresUpgrade: 'e', detail: 'The spikes are owner-scoped: they hurt everything you are allowed to hurt and never you.' },
          { tag: 'summon', label: 'They travel', requiresUpgrade: 'e', detail: 'A wall ripped out by Bind carries its spikes across the arena on its leading face, so the crossing costs 20 on top of the shove.' },
          { tag: 'utility', label: 'And they leave', requiresUpgrade: 'e', detail: 'The 15-second hole a ripped wall leaves behind has no spikes in it at all — that side of the arena is safe until the border comes back.' },
        ],
      },
      notes: [
        'Who is inside and who is outside is decided once, at the cast, by a 152px distance check. Anything that joins the fight afterwards — an Invasion husk spawned later — is not on the list at all and walks through the marble as though it were not there.',
        'Casting it on top of the enemy locks them in with you; casting it on yourself and taking off is the trick, because you can then leave and they cannot follow.',
        'Eight seconds of a full circle is the longest hard denial in the kit, and it costs nothing but the 14s cooldown.',
      ],
    },

    'justice-sheer-will': {
      basics:
        'A toggle costing 10 Willpower a second against the standing 5 of regen — a net 5, so 20 '
        + 'seconds from a full bar. While it burns you move 20% faster, and the moment a hit lands on you '
        + 'it cows the attacker: 25% less damage from everything for 3 seconds, renewed by every further '
        + 'hit, and that same hit arms the next damage figure Justice deals at ×1.33, announced as "⚖️ '
        + 'RIGHTEOUS +33%" and spent once. Pressing R again releases it for free; running the bar to zero '
        + 'forces it off. Needs at least 5 Willpower to switch on, 1.2s between presses.',
      cast: 'R toggles it on and off. Needs at least 5 Willpower to switch on; 1.2s between presses.',
      effects: [
        { tag: 'buff', label: 'Speed', detail: '+20% move speed for as long as it is burning.' },
        { tag: 'cost', label: 'The burn', detail: '10 Willpower a second against the standing 5 a second of regen — a net 5, so 20 seconds from a full bar.' },
        { tag: 'shield', label: 'Cowed attackers', detail: 'The moment a hit lands on you, you take 25% less damage from everything for 3 seconds. Every further hit renews the 3 seconds.' },
        { tag: 'buff', label: 'Righteous', detail: 'That same hit arms the next damage figure Justice deals: ×1.33, rounded, announced as "⚖️ RIGHTEOUS +33%", and spent once.' },
        { tag: 'utility', label: 'Switching off', detail: 'Pressing R again releases it for free ("Will released"). Running the bar to zero forces it off with "💤 WILL SPENT".' },
      ],
      upgrade: {
        basics:
          'Your health cannot be driven below 1 while Sheer Will is on — a floor on the subtraction '
          + 'rather than invulnerability, so the hit resolves and the number shows and the health stops. '
          + 'Standing on that last point doubles the burn to 20 Willpower a second, a net 15 down, so a '
          + 'full bar buys under 7 seconds of it, and switching off or emptying the bar lifts the floor '
          + 'immediately with no grace period. It also makes your Pillar of Flame solid: enemies are held '
          + 'on whichever side they were last seen clear of, pressed against the 42px face — which is '
          + 'inside the damage band, so a blocked enemy takes the full 6 damage every 500ms for as long as '
          + 'they are pinned there.',
        effects: [
          { tag: 'shield', label: 'You cannot die', requiresUpgrade: 'r', detail: 'Health cannot be driven below 1 while Sheer Will is on. It is a floor on the subtraction, not invulnerability — the hit resolves, the number shows, the health stops.' },
          { tag: 'cost', label: 'The price of the floor', requiresUpgrade: 'r', detail: 'At 1 health the burn doubles to 20 Willpower a second — a net 15 down, so a full bar buys under 7 seconds of standing on the last point.' },
          { tag: 'utility', label: 'When it ends', requiresUpgrade: 'r', detail: 'Switching Sheer Will off, or running the bar to zero, lifts the floor immediately. There is no grace period on the other side of it.' },
          { tag: 'control', label: 'Solid fire', requiresUpgrade: 'r', detail: 'Your Pillar of Flame becomes a wall: enemies are held on whichever side of it they were last seen clear of, pressed against the 42px face.' },
          { tag: 'dot', label: 'And it still burns', requiresUpgrade: 'r', detail: 'The face they are held against is inside the damage band, so a blocked enemy takes the full 6 damage every 500ms for as long as they are pinned there.' },
        ],
      },
      notes: [
        'Both of the good halves need you to have been hit. Turning it on and then not being touched buys 20% speed and nothing else at all.',
        'Righteous is spent by whatever Justice damage lands next, and every source counts — a 6-point flame pillar tick will happily eat it and become 8.',
        'The damage cut is written to your own incoming multiplier rather than to the attacker, so it stacks multiplicatively with flight\'s +20% instead of replacing it.',
      ],
    },

    'justice-flight': {
      basics:
        'Takes you into the air for as long as the bar allows: +33% move speed, +20% damage taken from '
        + 'every source, and a drain of 2 Willpower a second against 5 of regen, so flying is a net gain '
        + 'of 3 rather than a cost. The tray becomes a different five — Spear of Heaven, Bind, Pillar of '
        + 'Flame, Descend and Seraphim\'s Gaze — and the ground five are unreachable until you land. You '
        + 'pass through your own Coliseum ring freely and nobody else does, enemy puddles stop halving '
        + 'your speed, and damage from any source that has not moved in the last 3 seconds cannot land on '
        + 'you. Needs 5 Willpower, 2.5s cooldown, and it ends with Descend or on its own when the bar '
        + 'empties.',
      cast: 'F. Needs at least 5 Willpower. 2.5s cooldown. Flight ends with Descend, or on its own when the bar empties.',
      effects: [
        { tag: 'movement', label: 'Speed', detail: '+33% move speed the whole time you are up.' },
        { tag: 'cost', label: 'Vulnerable', detail: '+20% damage taken from every source while airborne.' },
        { tag: 'resource', label: 'The drain', detail: '2 Willpower a second against 5 a second of regen — flying is a net gain of 3 a second, not a cost.' },
        { tag: 'utility', label: 'A different five', detail: 'The tray becomes Spear of Heaven, Bind, Pillar of Flame, Descend and Seraphim\'s Gaze. The ground five are unreachable until you land.' },
        { tag: 'shield', label: 'Over your own walls', detail: 'You pass through your own Coliseum ring freely. Nobody else does, including anyone trapped inside it.' },
        { tag: 'shield', label: 'Hovering', detail: 'Enemy puddles no longer halve your speed, and damage from any source that has not moved in the last 3 seconds cannot land on you.' },
      ],
      upgrade: {
        basics:
          'For the 8 seconds after Seraphim\'s Gaze ends, Flight and Descend have their cooldowns cleared '
          + 'every frame and Willpower is pinned at a full 100 with no drain at all — flight, Sheer Will or '
          + 'both.',
        effects: [
          { tag: 'buff', label: 'Free door', requiresUpgrade: 'q', detail: 'Flight and Descend both have their cooldowns cleared every frame for the 8 seconds after Seraphim\'s Gaze ends.' },
          { tag: 'resource', label: 'Pinned', requiresUpgrade: 'q', detail: 'Willpower is held at a full 100 for those 8 seconds and no drain applies at all — flight, Sheer Will or both.' },
        ],
      },
      notes: [
        'The bar emptying grounds you with "🪶 Grounded" and drops any chain you had out, in flight or already hooked.',
        'Because flight nets +3 Willpower a second and Sheer Will nets −5, the two together are −7 — about 14 seconds of both from a full bar.',
        'Taking off inside your own Coliseum with the enemy in it is the strongest thing the stance does: you can leave, and they have eight seconds of marble to look at.',
      ],
    },

    'justice-judgement-day': {
      basics:
        'A 2.6-second trial in which your velocity is held at zero, every one of your abilities is '
        + 'locked out, and the nearest enemy\'s position is written into the pan and re-stunned every '
        + 'frame. The verdict is read off your total pre-mitigation damage taken this match — every point '
        + 'ever aimed at you, whether or not a shield ate it. Under 100 is NOT GUILTY: nothing at all, '
        + 'and the 30s cooldown is spent on the animation. 100 to 199 is 5 seconds in chains, 200 to 299 '
        + 'is 8, and 300 or more is DAMNED — 10 seconds in chains and 25% more damage taken for all of '
        + 'it, with a red ring around them saying so. Being sentenced is a disarm renewed every frame: '
        + 'not one ability can be cast for the sentence, and nothing can quietly clear it early.',
      cast: 'Q. The nearest enemy is the defendant. Neither of you can move or act for the 2.6s scene. Ultimate, 30s cooldown.',
      effects: [
        { tag: 'control', label: 'The trial', detail: '2.6 seconds in which your velocity is held at zero and every one of your abilities is locked out, and the defendant\'s position is written into the pan and re-stunned every frame.' },
        { tag: 'utility', label: 'The evidence', detail: 'The verdict is read off your total pre-mitigation damage taken this match — every point that was ever aimed at you, whether or not a shield ate it.' },
        { tag: 'control', label: 'DAMNED — 300+', detail: '10 seconds in chains.' },
        { tag: 'control', label: 'GUILTY — 200 to 299', detail: '8 seconds in chains.' },
        { tag: 'control', label: 'GUILTY — 100 to 199', detail: '5 seconds in chains.' },
        { tag: 'utility', label: 'NOT GUILTY — under 100', detail: 'Nothing at all. They walk, and the 30s cooldown is spent on the animation.' },
        { tag: 'debuff', label: 'The damnation', detail: 'A DAMNED verdict also makes them take 25% more damage for the whole 10 seconds, with a red ring around them saying so.' },
        { tag: 'control', label: 'The chains', detail: 'Being sentenced is a disarm: not one ability can be cast for the sentence, and it is renewed every frame so nothing else can quietly clear it early.' },
      ],
      upgrade: {
        basics:
          'Your health and the defendant\'s are exchanged at the end of the 2.6-second scene, whatever the '
          + 'verdict was. Each figure is clamped into the receiver\'s own maximum, so trading with a 100 HP '
          + 'body while you carry 400 gives them their 100 and no more, and both sides are floored at 1 — a '
          + 'swap levels the fight, it does not end it. It is written straight onto both fighters rather '
          + 'than dealt, so nothing mitigates it, nothing lifesteals off it, and no "next hit" buff is '
          + 'spent on it.',
        effects: [
          { tag: 'utility', label: 'The trade', requiresUpgrade: 'q', detail: 'Your health and the defendant\'s are exchanged at the end of the 2.6s scene, whatever the verdict was.' },
          { tag: 'utility', label: 'Different pools', requiresUpgrade: 'q', detail: 'Each figure is clamped into the receiver\'s own maximum, so trading with a 100 HP body while you carry 400 gives them their 100 and no more.' },
          { tag: 'utility', label: 'Never lethal', requiresUpgrade: 'q', detail: 'Both sides are floored at 1. A swap levels the fight; it does not end it.' },
          { tag: 'utility', label: 'Not damage', requiresUpgrade: 'q', detail: 'Written straight onto both fighters, so nothing mitigates it, nothing lifesteals off it, and no "next hit" buff is spent on it.' },
        ],
      },
      notes: [
        'The chains take their hands, not their feet. A sentenced enemy can still walk, run and chase you the whole time — they simply cannot cast.',
        'The tier is chosen at the cast, so nothing that happens during the 2.6-second scene changes the sentence.',
        'Weighing your own record means the ultimate is weakest when you are winning: an untouched Justice reads NOT GUILTY and gets an animation. 300 damage is three quarters of a fighter\'s health, so DAMNED is explicitly a comeback button.',
        'Damage taken from hazards, from your own mistakes and from anything else in the arena counts toward the total exactly as the enemy\'s hits do — the card says "the damage they have done to you", the kit weighs everything that has been done to you.',
      ],
    },

    // ── Flight stance ───────────────────────────────────────────────
    'justice-spear-throw': {
      basics:
        'The flight stance\'s click: a spear thrown at the cursor at 800 px/s that bursts for 20 damage '
        + 'to everything within 64px. It goes off on coming within 18px of the point you aimed at, within '
        + '24px of any enemy on the way, or on reaching the arena edge, whichever happens first. The kit '
        + 'steps and paints this one itself rather than spawning a sprite, so nothing that blocks, steals '
        + 'or reflects shots can touch it — and it flies straight through a Coliseum wall. 1.5s between '
        + 'throws.',
      cast: 'Click, thrown at the cursor. 1.5s between throws.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: '20 damage to everything within 64px of where it goes off.' },
        { tag: 'movement', label: 'The flight', detail: '800 px/s from your hand toward the cursor.' },
        { tag: 'utility', label: 'What sets it off', detail: 'Coming within 18px of the point you aimed at, coming within 24px of any enemy on the way, or reaching the arena edge. Whichever happens first.' },
        { tag: 'utility', label: 'Not a projectile', detail: 'The kit steps and paints this one itself rather than spawning a sprite, so nothing that blocks, steals or reflects shots can touch it — and it flies straight through a Coliseum wall.' },
      ],
      upgrade: {
        basics:
          'Every enemy within the 64px burst gets an angel bite for 3 seconds — the only way in the kit '
          + 'to open bites on several bodies at once. Bites are only spent by a melee Justice swing, so the '
          + 'air marks and the floor kills: land, and the thrust or the axe executes anything under 5% of '
          + 'its maximum health per open bite.',
        effects: [
          { tag: 'debuff', label: 'Bites the whole blast', requiresUpgrade: 'click', detail: 'Every enemy within the 64px burst gets an angel bite for 3 seconds — the only way in the kit to open bites on several bodies at once.' },
          { tag: 'utility', label: 'Cashed on the ground', requiresUpgrade: 'click', detail: 'Bites are only spent by a melee Justice swing, so the air marks and the floor kills: land, and the thrust (or the axe) executes anything under 5% per bite.' },
        ],
      },
      notes: [
        'Because it bursts on the first body inside 24px, aiming past somebody still catches them on the way through.',
        'Compare the ground click: 800ms for 20 in a wedge plus a 15 spear, versus 1.5s for 20 in a 64px circle you can place anywhere. The air trades rate for placement.',
        'It goes off on the arena edge rather than vanishing, so a wild throw still makes a burst somebody could be standing in.',
      ],
    },

    'justice-bind': {
      basics:
        'E throws a chain at the cursor at 1050 px/s that deals 10 damage to every body it passes '
        + 'through, once each, and does not stop for anyone. It sinks into whichever arena edge it '
        + 'reaches and hangs there 7 seconds — "⛓️ HOOKED — press E" — before rotting off. Pressing E '
        + 'again rips that whole wall out, free because the throw already paid for it: a 26px slab '
        + 'spanning the full width or height of the arena, crossing at 300 px/s, pinning anything its '
        + 'face touches 33px in front of it with the wall\'s own velocity and a 260ms stun renewed every '
        + 'frame for the entire crossing. Reaching the far side it comes apart for 20 damage and a '
        + '2-second stun to every enemy in the arena, wherever they are standing, and the edge it came '
        + 'from is missing for 15 seconds. Hooking into a wall that is already lying somewhere else gives '
        + '"⛓️ Nothing there" and spends the anchor for nothing. 5s cooldown on the throw.',
      cast: 'E throws the chain at the cursor (5s cooldown). E again while it is hooked rips the wall out, and that recast is free — the throw already paid for it.',
      effects: [
        { tag: 'damage', label: 'The chain', detail: '10 damage to every body it passes through, once each. 1050 px/s, and it does not stop for anyone.' },
        { tag: 'summon', label: 'Hooked', detail: 'It sinks into whichever arena edge it reaches and stays there for 7 seconds — "⛓️ HOOKED — press E" — then rots off on its own.' },
        { tag: 'summon', label: 'The slab', detail: 'The whole wall: 26px thick, spanning the full width or height of the arena, crossing at 300 px/s.' },
        { tag: 'control', label: 'Shoved', detail: 'Anything the face touches is pinned 33px in front of it, given the wall\'s own velocity and stunned for 260ms, renewed every frame — for the entire crossing.' },
        { tag: 'damage', label: 'The impact', detail: 'Reaching the far side, it comes apart for 20 damage and a 2-second stun — and that lands on every enemy in the arena, wherever they happen to be standing.' },
        { tag: 'utility', label: 'The hole', detail: 'The edge it came from is missing for 15 seconds. Hooking into a wall that is already lying somewhere else gives "⛓️ Nothing there" and spends the anchor for nothing.' },
      ],
      upgrade: {
        basics:
          'A crossing wall now carries spikes: 20 damage to anything it touches, once every 2 seconds per '
          + 'body, on top of the shove and the 260ms stun. The edge it came from is spikeless for the 15 '
          + 'seconds it is missing, so ripping a wall out disarms that side of the arena.',
        effects: [
          { tag: 'damage', label: 'Spiked slab', requiresUpgrade: 'e', detail: '20 damage to anything the crossing wall touches, once every 2 seconds per body, on top of the shove and the 260ms stun.' },
          { tag: 'utility', label: 'The hole is safe', requiresUpgrade: 'e', detail: 'The edge it came from is spikeless for the 15 seconds it is missing — ripping a wall out disarms that side of the arena.' },
        ],
      },
      notes: [
        'The impact has no distance check at all. Twenty damage and two seconds of stun on everybody, from anywhere, is the largest piece of control Justice owns, and it is not aimed.',
        'The hole in the border is painted, not opened — nothing can leave the arena through it. All it does is stop that wall being ripped twice inside 15 seconds.',
        'Landing (or being grounded by an empty bar) drops the anchor and any chain still in flight. This is an air-only tool from throw to impact.',
        'Three bodies in a line take 10 each on the way out — the chain is a pierce, not a shot.',
      ],
    },

    'justice-pillar': {
      basics:
        'Raises a wall of fire from the top of the arena to the bottom at the cursor\'s x — only the x '
        + 'is read — clamped 26px in from either wall, 26px either side of the line, for 8 seconds. Any '
        + 'enemy within 42px takes 6 damage every 500ms, 12 a second, so 96 to somebody who stands in it '
        + 'the whole time, and moves at ×0.75 speed; a second pillar does not stack, the first one found '
        + 'wins. Your own pillar neither burns nor slows you. 14s cooldown.',
      cast: 'R, at the cursor. Only the cursor\'s x is read; the pillar is always full height. 14s cooldown, 8s of fire.',
      effects: [
        { tag: 'area', label: 'The wall', detail: 'Top of the arena to the bottom, 26px either side of the line, placed at the cursor\'s x and clamped 26px in from either wall. 8 seconds.' },
        { tag: 'dot', label: 'Burning', detail: '6 damage every 500ms — 12 a second — to any enemy within 42px of the line. 96 damage to somebody who stands in it the whole 8 seconds.' },
        { tag: 'control', label: 'Wading', detail: '×0.75 move speed to anyone in that same 42px band. It does not stack with a second pillar — the first one found wins.' },
        { tag: 'utility', label: 'Yours is yours', detail: 'Your own pillar neither burns nor slows you. Only the other side\'s does.' },
      ],
      upgrade: {
        basics:
          'The pillar becomes a real wall: enemies cannot cross it, each held on whichever side of the '
          + '42px band they were last seen clear of with their horizontal velocity stopped dead. The face '
          + 'they are held at is inside the burn band, so a blocked enemy takes the full 12 a second for as '
          + 'long as they lean on it. Anything the game has declared unstoppable walks through exactly as '
          + 'before — it is hard control and obeys the same rule everything else does.',
        effects: [
          { tag: 'control', label: 'A real wall', requiresUpgrade: 'r', detail: 'Enemies cannot cross. Each one is held on whichever side of the 42px band they were last seen clear of, and their horizontal velocity is stopped dead.' },
          { tag: 'dot', label: 'Pressed against it', requiresUpgrade: 'r', detail: 'The face they are held at is inside the burn band, so a blocked enemy takes the full 6 damage every 500ms — 12 a second — for as long as they lean on it.' },
          { tag: 'utility', label: 'Unstoppable passes', requiresUpgrade: 'r', detail: 'Anything the game has declared unstoppable walks through it exactly as before. The wall is hard control and obeys the same rule everything else does.' },
        ],
      },
      notes: [
        'The y of your cursor is thrown away. Aiming this is a one-dimensional decision.',
        'Each tick passes through Sheer Will\'s Righteous bonus, so the first 6 after being hit is an 8 — a wasteful place for the amplifier to land.',
        'The AI is told about hostile pillars explicitly and steers around a 60px-wide danger band, so against an NPC this is genuinely area denial rather than free damage.',
        'Nothing stops two of your pillars being up at once; the 14s cooldown against an 8s life is the only limit.',
      ],
    },

    'justice-descend': {
      basics:
        'Ends flight immediately: the +33% speed, the +20% damage taken and the 2 Willpower a second '
        + 'all stop at once, and the tray is rebuilt as the ground five — Spear Thrust, Coliseum, Sheer '
        + 'Will, Flight of the Valkyrie, Judgement Day. Any anchored chain and any chain still flying is '
        + 'let go the moment you land, and the wall you were about to rip out stays where it is. Your own '
        + 'Coliseum ring applies to you again from the frame you touch down. 0.5s cooldown.',
      cast: 'F while airborne. 0.5s cooldown.',
      effects: [
        { tag: 'movement', label: 'Landing', detail: 'Ends flight immediately: the +33% speed, the +20% damage taken and the 2 Willpower a second all stop at once.' },
        { tag: 'utility', label: 'The tray', detail: 'The ability row is rebuilt as the ground five: Spear Thrust, Coliseum, Sheer Will, Flight of the Valkyrie, Judgement Day.' },
        { tag: 'cost', label: 'What you drop', detail: 'Any anchored chain and any chain still flying is let go the moment you land. The wall you were about to rip out stays where it is.' },
        { tag: 'utility', label: 'Back in the cage', detail: 'Your own Coliseum ring applies to you again from the frame you touch down.' },
      ],
      upgrade: {
        basics:
          'A landing you chose arms an axe for 5 seconds: Click deals 5 damage in a 90° arc inside 84px '
          + 'on a 100ms cooldown — about 20 swings, or 100 damage, if every one lands — auto-firing while '
          + 'the button is held rather than clicked, and each swing shoves you 22px over 110ms along the '
          + 'direction you are already moving, roughly +200 px/s. No spear is thrown by an axe swing. Being '
          + 'dropped by an empty Willpower bar gives you nothing.',
        effects: [
          { tag: 'damage', label: 'The axe', requiresUpgrade: 'f', detail: '5 seconds in which Click deals 5 damage in a 90° arc inside 84px on a 100ms cooldown — about 20 swings, or 100 damage, if every one lands.' },
          { tag: 'movement', label: 'The rush', requiresUpgrade: 'f', detail: 'Each swing shoves you 22px over 110ms along the direction you are already moving, roughly +200 px/s while you keep the button down.' },
          { tag: 'utility', label: 'Auto-fire', requiresUpgrade: 'f', detail: 'Hold the mouse button rather than clicking. No spear is thrown by an axe swing.' },
          { tag: 'cost', label: 'Pressed, not forced', requiresUpgrade: 'f', detail: 'Only a landing you chose arms it. Being dropped by an empty Willpower bar gives you nothing.' },
        ],
      },
      notes: [
        'Landing is on a 0.5s cooldown but taking off runs Flight\'s own 2.5s, so a round trip has a floor of about three seconds.',
        'Running the bar to zero does exactly this for you, with "🪶 Grounded" instead — including the dropped chain.',
        'Landing inside a Coliseum you raised and then flew out of will simply hold you outside it. The wall remembers which side you were on when it went up.',
      ],
    },

    'justice-seraphim': {
      basics:
        'Teleports you to the exact centre of the arena, position and physics body both, and locks you '
        + 'there as an invincible, completely immobile seraph for 3 seconds. Then the nearest enemy '
        + 'walks: 10 seconds in which their velocity is overwritten every frame into a straight line at '
        + 'you, at their own move speed, stopping once they are within 34px. The 10 seconds start when '
        + 'the form drops rather than when it is cast — 13 seconds from the button to the end of the '
        + 'walk. Any frame the victim is unstoppable or hard-stunned is theirs and the trance simply '
        + 'skips it; dying or leaving clears it outright. 34s cooldown.',
      cast: 'Q. The nearest enemy is the one who sees it. You cannot move or act during the 3s transformation. Ultimate, 34s cooldown.',
      effects: [
        { tag: 'movement', label: 'The centre', detail: 'You are teleported to the exact middle of the arena — position and physics body both — the instant it is cast.' },
        { tag: 'shield', label: 'The form', detail: '3 seconds of being invincible and completely immobile. Your character is replaced by the seraph while it lasts.' },
        { tag: 'control', label: 'The trance', detail: '10 seconds during which the victim\'s velocity is overwritten every frame: a straight line at you, at their own move speed, stopping once they are within 34px.' },
        { tag: 'utility', label: 'The clock', detail: 'The 10 seconds start when the form drops, not when it is cast — 13 seconds from the button to the end of the walk.' },
        { tag: 'utility', label: 'What breaks it', detail: 'Any frame the victim is unstoppable or hard-stunned is theirs; the trance simply skips it. Dying or leaving clears it outright.' },
      ],
      upgrade: {
        basics:
          'For 8 seconds after the seraph form drops, Willpower is held at 100 and nothing drains it — '
          + 'flight, Sheer Will, or the doubled burn of standing on 1 health — and Flight and Descend have '
          + 'their cooldowns cleared every frame. The window begins with the trance, so it is 11 seconds '
          + 'from pressing Q and it overlaps the first 8 of the enemy\'s 10-second walk.',
        effects: [
          { tag: 'resource', label: 'Pinned full', requiresUpgrade: 'q', detail: 'Willpower is held at 100 for 8 seconds and nothing drains it — flight, Sheer Will or the doubled burn of standing on 1 health.' },
          { tag: 'buff', label: 'No door cost', requiresUpgrade: 'q', detail: 'Flight (2.5s) and Descend (0.5s) have their cooldowns cleared every frame of those 8 seconds.' },
          { tag: 'utility', label: 'Starts on the walk', requiresUpgrade: 'q', detail: 'The 8 seconds begin when the seraph form drops and the trance starts — 11 seconds from pressing Q, and it overlaps the first 8 of the enemy\'s 10-second walk.' },
        ],
      },
      notes: [
        'The trance only takes their feet. They can cast every ability they have on the way in — and the way in ends with them standing on top of you.',
        'Not one point of damage anywhere in this ultimate. It is a positioning tool: it puts an enemy exactly where a Coliseum, a flame pillar or a wall of arena border can reach them.',
        'You are pinned in the middle for three of the thirteen seconds and invincible for all three of them, so the opening is safe but entirely blind.',
        'Two white beams are drawn from the victim\'s eyes to you for the whole walk — the enemy can see exactly what has been done to them.',
      ],
    },
  },

  mastery: {
    'combo-excelsius': {
      basics:
        'A style meter fed by thirty-six named combos, climbing six ranks — D, C, B, A, S, SS — at 100 '
        + 'style each, with overflow carrying into the next rank and a lost rank dropping you to 60 '
        + 'rather than zero. It bleeds the whole time: 2 a second at D, 3 at C, 4 at B, 6 at A, 8 at S '
        + 'and 11 at SS, so a rank is held rather than reached. Each rank pays Willpower regeneration '
        + '(+15% at C rising to ×2 at SS, multiplying the regeneration rather than the net, so it is '
        + 'worth most while you are spending hardest), move speed (+4% at C to +22% at SS) and cooldowns '
        + '(−5% at C to −32% at SS, on every ability in both stances). No key.',
      cast: 'Passive — no key. The meter fills from thirty-six named combos and bleeds down the whole time.',
      effects: [
        { tag: 'resource', label: 'The ladder', detail: 'Six ranks — D, C, B, A, S, SS — 100 style each. Overflow carries into the next rank; a rank lost drops you to 60 rather than to zero.' },
        { tag: 'cost', label: 'The bleed', detail: '2 style a second at D, 3 at C, 4 at B, 6 at A, 8 at S and 11 at SS. A rank is held, not reached.' },
        { tag: 'buff', label: 'Willpower', detail: '+15% regeneration at C, +30% at B, +50% at A, +75% at S, ×2 at SS. It multiplies the regeneration, not the net — so it is worth most while you are spending hardest.' },
        { tag: 'buff', label: 'Movement', detail: '+4% at C, +8% at B, +12% at A, +17% at S, +22% at SS.' },
        { tag: 'buff', label: 'Cooldowns', detail: '−5% at C, −10% at B, −16% at A, −24% at S, −32% at SS, on every ability in both stances.' },
        { tag: 'debuff', label: 'Beyond Justice', requiresMastery: true, detail: 'At S and above, Judgement Day stops weighing anybody: no tally, no tier, DAMNED every time — 10 seconds in chains and +25% damage taken, with I AM BEYOND JUSTICE across the screen while it lands.' },
      ],
      notes: [
        'All thirty-six combos are written out on the Rules of Law page of this screen — what each one is worth and exactly what you have to do.',
        'The biggest single award in the table is Last Word (50): a kill made while you are under a tenth of your own health.',
        'Most combos carry a re-award gate of a few seconds, so a repeatable interaction — a pillar somebody is standing in, a wall they are pinned against — cannot be tapped for style.',
        'The meter is the player\'s alone. A bot has no mastery loadout to switch the passive on with.',
      ],
    },
    'vigilante-vengeance': {
      basics:
        'A bindable finisher whose half depends on the stance you press it in. On the ground it is a '
        + '260px charge over 220ms, driven as a position delta so WASD cannot fight it, catching the '
        + 'first body within 40px: 45 damage for the impalement and the kick together, holding them on '
        + 'the spear for 320ms stunned, then kicking them 900 px/s for up to 420px with their velocity '
        + 'written to zero every frame so their own AI has no say in where they are going. Into a wall — '
        + 'the arena edge or a Coliseum of yours — is +30 damage and 2 seconds stunned; into a Pillar of '
        + 'Flame is +30 and 5 seconds alight; into a wall you are still driving is +45 and 3 seconds, the '
        + 'biggest landing in the ability and the one needing two of your own set-ups in the same place. '
        + 'In the air it is a barrage instead: 200 spears at 2 damage each released over 2.6 seconds, '
        + 'tightest at your cursor and thinning either side with a standard deviation of about 150px and '
        + 'a 20px hit radius per spear — 400 if all of them landed, which they will not. 28s cooldown.',
      cast: 'The bound key, in either stance. The stance you are in when you press it decides which half you get. 28s cooldown.',
      effects: [
        { tag: 'movement', label: 'The charge', detail: 'A 260px dash over 220ms along the aim, driven as a position delta so WASD cannot fight it. Catches the first body within 40px.' },
        { tag: 'damage', label: 'Run through', detail: '45 damage for the impalement and the kick together. They are held on the spear for 320ms first, stunned throughout.' },
        { tag: 'control', label: 'The kick', detail: '900 px/s for up to 420px along the same line, with their velocity written to zero every frame — their own AI does not get a say in where they are going.' },
        { tag: 'damage', label: 'Into a wall', detail: '+30 damage and 2 seconds stunned. The arena edge and any Coliseum of yours both count.' },
        { tag: 'dot', label: 'Into a Pillar of Flame', detail: '+30 damage and 5 seconds alight.' },
        { tag: 'damage', label: 'Into a wall you are still driving', detail: '+45 damage and 3 seconds stunned — the biggest landing in the ability, and the one that needs two of your own set-ups in the same place.' },
        { tag: 'damage', label: 'The barrage', detail: '200 spears at 2 damage each, released over 2.6 seconds. 400 if all of them landed; they will not.' },
        { tag: 'area', label: 'The spread', detail: 'Tightest at your cursor and thinning out to either side of it, with a standard deviation of about 150px. A 20px hit radius per spear.' },
        { tag: 'utility', label: 'Guided by the bites', requiresUpgrade: 'click', detail: 'Spears within 210px of a body carrying an angel bite bend toward it at 1.7 rad/s per bite — a nudge at one, a funnel at three.' },
      ],
      notes: [
        'Every landing is a combo the style meter knows the name of, and the moving-wall one is worth 42 style on its own.',
        'The charge takes your movement entirely while it runs; the kick does not, so you are free again the moment the boot lands.',
        'A barrage aimed straight down at a body that is standing still is worth far more than the spread suggests. A body that keeps moving is worth far less.',
        'The bound slot is taken in both stances, because this is one ability rather than two that share a key.',
      ],
    },
  },
};

export default justice;
