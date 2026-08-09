import { ElementCodex } from '../AbilityCodex';

/**
 * Justice — a magistrate on the floor and a valkyrie in the air, spending one blue bar for both.
 *
 * Verified against `src/elements/justice.ts` and `kits/JusticeKit.ts`. Justice has no shop
 * upgrades, no perks and no mastery enhancements: every figure below is a constant at the top of
 * the kit. The ability list is ten entries — indices 0–4 are the ground stance, 5–9 the flight
 * stance — and F is the door between them.
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
      magic:
        'One blue bar in the top-left corner, and it is the only resource in the kit. It fills on '
        + 'its own the entire time, so nothing is ever truly spent — the two stance powers are '
        + 'subtractions from a regen that never stops, and the bar tells you the net rate rather '
        + 'than a cost. Getting hit makes you more determined, not less.',
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
      magic:
        'Ten abilities on one character. On the ground you wear the laurel and carry the spear; in '
        + 'the air the wings come out, the laurel folds back and the whole ability tray is replaced '
        + 'with a different five. F is the hinge in both directions, and the arena keeps everything '
        + 'you built in either stance — except the chain, which needs a hand to hold it.',
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
      magic:
        'A short hard thrust of the spear, and then the spear keeps going. The arm punches out and '
        + 'pulls back inside a quarter of a second — that is the part that hurts — and a second '
        + 'spear leaves your hand along the same line and flies until it finds a body. Two damage '
        + 'figures, one button, both on the aim.',
      cast: 'Click, aimed at the cursor. 800ms between casts.',
      effects: [
        { tag: 'damage', label: 'The thrust', detail: '20 damage to every body within 96px in a 60° wedge in front of you — 30° either side of the aim. It is not a circle and it is not single-target.' },
        { tag: 'damage', label: 'The spear', detail: '15 damage, launched 30px ahead of you at 620 px/s and dying on the first body it touches.' },
        { tag: 'utility', label: 'A real projectile', detail: 'The thrown spear is an arena projectile on the `proj-justice-spear` texture, so anything in the game that blocks, eats, steals or reflects shots can do it to this one.' },
        { tag: 'damage', label: 'Point blank', detail: 'A body standing on the line inside 96px takes both halves off one press: 20, then 15 when the spear arrives.' },
      ],
      notes: [
        'The wedge is rolled before the throw, and it takes Sheer Will\'s Righteous bonus with it — so swinging at empty air spends the +33% on nothing and the spear then flies at its plain 15.',
        'The animation draws 76px of spear; the wedge reaches 96px, because a body\'s own width counts.',
        'Your own Coliseum destroys your own spear the moment it crosses the ring. The wall does not check who fired.',
      ],
    },

    'justice-coliseum': {
      magic:
        'You drive the spear into the floor and eighteen fluted marble columns come up out of it in '
        + 'a ring around wherever you were standing, with sand between them. It is a complete '
        + 'circle with no gate: whoever was inside it stays inside, whoever was outside stays '
        + 'outside, and every shot that tries to cross shatters on it. On the ground you are inside '
        + 'your own cage too.',
      cast: 'E, no aim — the ring is centred on you at the instant of the cast. 14s cooldown, 8s of wall.',
      effects: [
        { tag: 'area', label: 'The ring', detail: '152px radius, 18 columns, rising over 320ms. It starts holding people once it is 60% up — about 190ms — and sinks over its last 400ms.' },
        { tag: 'control', label: 'The wall', detail: 'Everyone is held on the side they were on when it went up: insiders are pushed back to 134px from the centre, outsiders held out at 170px, and the shove stops their velocity dead.' },
        { tag: 'shield', label: 'Shots die on it', detail: 'Any projectile that crosses the ring in either direction is destroyed at the crossing point. It is tracked per ring by which side the shot was on last frame, so nothing tunnels through at speed.' },
        { tag: 'cost', label: 'It holds you too', detail: 'A magistrate standing on the ground is subject to their own wall. Only the flight stance passes through it.' },
        { tag: 'utility', label: 'One per side', detail: 'Raising a second ring sinks the first within 120ms rather than stacking two cages.' },
      ],
      notes: [
        'Who is inside and who is outside is decided once, at the cast, by a 152px distance check. Anything that joins the fight afterwards — an Invasion husk spawned later — is not on the list at all and walks through the marble as though it were not there.',
        'Casting it on top of the enemy locks them in with you; casting it on yourself and taking off is the trick, because you can then leave and they cannot follow.',
        'Eight seconds of a full circle is the longest hard denial in the kit, and it costs nothing but the 14s cooldown.',
      ],
    },

    'justice-sheer-will': {
      magic:
        'A toggle, not a cast. The eyes go blue, the ground halo turns with them and the body starts '
        + 'leaving a hard afterimage behind it — the only thing in the kit that reads as a state '
        + 'rather than an event. It makes you faster the whole time it is on, but the two things '
        + 'that matter about it are both triggered by being hit, so it rewards standing in the fire.',
      cast: 'R toggles it on and off. Needs at least 5 Willpower to switch on; 1.2s between presses.',
      effects: [
        { tag: 'buff', label: 'Speed', detail: '+20% move speed for as long as it is burning.' },
        { tag: 'cost', label: 'The burn', detail: '10 Willpower a second against the standing 5 a second of regen — a net 5, so 20 seconds from a full bar.' },
        { tag: 'shield', label: 'Cowed attackers', detail: 'The moment a hit lands on you, you take 25% less damage from everything for 3 seconds. Every further hit renews the 3 seconds.' },
        { tag: 'buff', label: 'Righteous', detail: 'That same hit arms the next damage figure Justice deals: ×1.33, rounded, announced as "⚖️ RIGHTEOUS +33%", and spent once.' },
        { tag: 'utility', label: 'Switching off', detail: 'Pressing R again releases it for free ("Will released"). Running the bar to zero forces it off with "💤 WILL SPENT".' },
      ],
      notes: [
        'Both of the good halves need you to have been hit. Turning it on and then not being touched buys 20% speed and nothing else at all.',
        'Righteous is spent by whatever Justice damage lands next, and every source counts — a 6-point flame pillar tick will happily eat it and become 8.',
        'The damage cut is written to your own incoming multiplier rather than to the attacker, so it stacks multiplicatively with flight\'s +20% instead of replacing it.',
      ],
    },

    'justice-flight': {
      magic:
        'The laurel folds back, two feathered wings open out of your shoulders and the shadow under '
        + 'you is replaced by a pale lift-glow. It is a stance change rather than a movement '
        + 'ability: the whole ability tray becomes a different five, you move a third faster, and '
        + 'the marble you raised on the ground no longer applies to you.',
      cast: 'F. Needs at least 5 Willpower. 2.5s cooldown. Flight ends with Descend, or on its own when the bar empties.',
      effects: [
        { tag: 'movement', label: 'Speed', detail: '+33% move speed the whole time you are up.' },
        { tag: 'cost', label: 'Vulnerable', detail: '+20% damage taken from every source while airborne.' },
        { tag: 'resource', label: 'The drain', detail: '2 Willpower a second against 5 a second of regen — flying is a net gain of 3 a second, not a cost.' },
        { tag: 'utility', label: 'A different five', detail: 'The tray becomes Spear of Heaven, Bind, Pillar of Flame, Descend and Seraphim\'s Gaze. The ground five are unreachable until you land.' },
        { tag: 'shield', label: 'Over your own walls', detail: 'You pass through your own Coliseum ring freely. Nobody else does, including anyone trapped inside it.' },
        { tag: 'shield', label: 'Hovering', detail: 'Enemy puddles no longer halve your speed, and damage from any source that has not moved in the last 3 seconds cannot land on you.' },
      ],
      notes: [
        'The bar emptying grounds you with "🪶 Grounded" and drops any chain you had out, in flight or already hooked.',
        'Because flight nets +3 Willpower a second and Sheer Will nets −5, the two together are −7 — about 14 seconds of both from a full bar.',
        'Taking off inside your own Coliseum with the enemy in it is the strongest thing the stance does: you can leave, and they have eight seconds of marble to look at.',
      ],
    },

    'justice-judgement-day': {
      magic:
        'The arena goes black. A magistrate the height of the screen rises out of the floor with a '
        + 'laurel crown and blazing eyes, holding a set of scales out of one fist, and the enemy is '
        + 'lifted bodily into the left pan to be weighed against a single white feather. What the '
        + 'scales weigh is not the enemy — it is the damage on your own record. Two and a half '
        + 'seconds later a placard drops and the verdict is read out.',
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
      notes: [
        'The chains take their hands, not their feet. A sentenced enemy can still walk, run and chase you the whole time — they simply cannot cast.',
        'The tier is chosen at the cast, so nothing that happens during the 2.6-second scene changes the sentence.',
        'Weighing your own record means the ultimate is weakest when you are winning: an untouched Justice reads NOT GUILTY and gets an animation. 300 damage is three quarters of a fighter\'s health, so DAMNED is explicitly a comeback button.',
        'Damage taken from hazards, from your own mistakes and from anything else in the arena counts toward the total exactly as the enemy\'s hits do — the card says "the damage they have done to you", the kit weighs everything that has been done to you.',
      ],
    },

    // ── Flight stance ───────────────────────────────────────────────
    'justice-spear-throw': {
      magic:
        'A spear of light hurled from the air at a point on the floor. It travels fast and flat, and '
        + 'it bursts where it lands rather than where it hits — a gilt ring, a flash and a spray of '
        + 'shards — so it is the flight stance\'s answer to somebody standing behind cover you '
        + 'cannot get a line on.',
      cast: 'Click, thrown at the cursor. 1.5s between throws.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: '20 damage to everything within 64px of where it goes off.' },
        { tag: 'movement', label: 'The flight', detail: '800 px/s from your hand toward the cursor.' },
        { tag: 'utility', label: 'What sets it off', detail: 'Coming within 18px of the point you aimed at, coming within 24px of any enemy on the way, or reaching the arena edge. Whichever happens first.' },
        { tag: 'utility', label: 'Not a projectile', detail: 'The kit steps and paints this one itself rather than spawning a sprite, so nothing that blocks, steals or reflects shots can touch it — and it flies straight through a Coliseum wall.' },
      ],
      notes: [
        'Because it bursts on the first body inside 24px, aiming past somebody still catches them on the way through.',
        'Compare the ground click: 800ms for 20 in a wedge plus a 15 spear, versus 1.5s for 20 in a 64px circle you can place anywhere. The air trades rate for placement.',
        'It goes off on the arena edge rather than vanishing, so a wild throw still makes a burst somebody could be standing in.',
      ],
    },

    'justice-bind': {
      magic:
        'A grappling chain thrown out of the air. It does not stop for people — it tears straight '
        + 'through anybody in the way and keeps going until it reaches the edge of the arena, where '
        + 'it sinks into the wall and hangs there tugging. Press E again and you pull: the entire '
        + 'arena wall comes out of the border in one slab and drives across the map, pushing '
        + 'everything in front of it, until it hits the far side and comes apart.',
      cast: 'E throws the chain at the cursor (5s cooldown). E again while it is hooked rips the wall out, and that recast is free — the throw already paid for it.',
      effects: [
        { tag: 'damage', label: 'The chain', detail: '10 damage to every body it passes through, once each. 1050 px/s, and it does not stop for anyone.' },
        { tag: 'summon', label: 'Hooked', detail: 'It sinks into whichever arena edge it reaches and stays there for 7 seconds — "⛓️ HOOKED — press E" — then rots off on its own.' },
        { tag: 'summon', label: 'The slab', detail: 'The whole wall: 26px thick, spanning the full width or height of the arena, crossing at 300 px/s.' },
        { tag: 'control', label: 'Shoved', detail: 'Anything the face touches is pinned 33px in front of it, given the wall\'s own velocity and stunned for 260ms, renewed every frame — for the entire crossing.' },
        { tag: 'damage', label: 'The impact', detail: 'Reaching the far side, it comes apart for 20 damage and a 2-second stun — and that lands on every enemy in the arena, wherever they happen to be standing.' },
        { tag: 'utility', label: 'The hole', detail: 'The edge it came from is missing for 15 seconds. Hooking into a wall that is already lying somewhere else gives "⛓️ Nothing there" and spends the anchor for nothing.' },
      ],
      notes: [
        'The impact has no distance check at all. Twenty damage and two seconds of stun on everybody, from anywhere, is the largest piece of control Justice owns, and it is not aimed.',
        'The hole in the border is painted, not opened — nothing can leave the arena through it. All it does is stop that wall being ripped twice inside 15 seconds.',
        'Landing (or being grounded by an empty bar) drops the anchor and any chain still in flight. This is an air-only tool from throw to impact.',
        'Three bodies in a line take 10 each on the way out — the chain is a pierce, not a shot.',
      ],
    },

    'justice-pillar': {
      magic:
        'You point at the floor and a wall of fire comes up along that line from the top of the '
        + 'arena to the bottom, licks climbing it the whole time. It splits the map in two. It is '
        + 'not a big area — you can walk round either end of it — but everything that tries to walk '
        + 'through it burns and wades, and yours never touches you.',
      cast: 'R, at the cursor. Only the cursor\'s x is read; the pillar is always full height. 14s cooldown, 8s of fire.',
      effects: [
        { tag: 'area', label: 'The wall', detail: 'Top of the arena to the bottom, 26px either side of the line, placed at the cursor\'s x and clamped 26px in from either wall. 8 seconds.' },
        { tag: 'dot', label: 'Burning', detail: '6 damage every 500ms — 12 a second — to any enemy within 42px of the line. 96 damage to somebody who stands in it the whole 8 seconds.' },
        { tag: 'control', label: 'Wading', detail: '×0.75 move speed to anyone in that same 42px band. It does not stack with a second pillar — the first one found wins.' },
        { tag: 'utility', label: 'Yours is yours', detail: 'Your own pillar neither burns nor slows you. Only the other side\'s does.' },
      ],
      notes: [
        'The y of your cursor is thrown away. Aiming this is a one-dimensional decision.',
        'Each tick passes through Sheer Will\'s Righteous bonus, so the first 6 after being hit is an 8 — a wasteful place for the amplifier to land.',
        'The AI is told about hostile pillars explicitly and steers around a 60px-wide danger band, so against an NPC this is genuinely area denial rather than free damage.',
        'Nothing stops two of your pillars being up at once; the 14s cooldown against an 8s life is the only limit.',
      ],
    },

    'justice-descend': {
      magic:
        'The wings fold, a little masonry dust puffs up under you, and you are a magistrate again. '
        + 'It is the cheapest ability in the kit and it exists because the flight stance cannot '
        + 'reach the ground five — the Coliseum, Sheer Will and the scales are all down here.',
      cast: 'F while airborne. 0.5s cooldown.',
      effects: [
        { tag: 'movement', label: 'Landing', detail: 'Ends flight immediately: the +33% speed, the +20% damage taken and the 2 Willpower a second all stop at once.' },
        { tag: 'utility', label: 'The tray', detail: 'The ability row is rebuilt as the ground five: Spear Thrust, Coliseum, Sheer Will, Flight of the Valkyrie, Judgement Day.' },
        { tag: 'cost', label: 'What you drop', detail: 'Any anchored chain and any chain still flying is let go the moment you land. The wall you were about to rip out stays where it is.' },
        { tag: 'utility', label: 'Back in the cage', detail: 'Your own Coliseum ring applies to you again from the frame you touch down.' },
      ],
      notes: [
        'Landing is on a 0.5s cooldown but taking off runs Flight\'s own 2.5s, so a round trip has a floor of about three seconds.',
        'Running the bar to zero does exactly this for you, with "🪶 Grounded" instead — including the dropped chain.',
        'Landing inside a Coliseum you raised and then flew out of will simply hold you outside it. The wall remembers which side you were on when it went up.',
      ],
    },

    'justice-seraphim': {
      magic:
        'You vanish from wherever you were and reappear in the exact centre of the arena, and then '
        + 'you stop being a person. Eleven white ribbons wind out of a dark core packed with '
        + 'thirteen eyes, each blinking on its own clock, all of them looking at one enemy. Three '
        + 'seconds of that, and then they walk to you. They cannot help it, and there is nothing in '
        + 'the whole ultimate that does any damage.',
      cast: 'Q. The nearest enemy is the one who sees it. You cannot move or act during the 3s transformation. Ultimate, 34s cooldown.',
      effects: [
        { tag: 'movement', label: 'The centre', detail: 'You are teleported to the exact middle of the arena — position and physics body both — the instant it is cast.' },
        { tag: 'shield', label: 'The form', detail: '3 seconds of being invincible and completely immobile. Your character is replaced by the seraph while it lasts.' },
        { tag: 'control', label: 'The trance', detail: '10 seconds during which the victim\'s velocity is overwritten every frame: a straight line at you, at their own move speed, stopping once they are within 34px.' },
        { tag: 'utility', label: 'The clock', detail: 'The 10 seconds start when the form drops, not when it is cast — 13 seconds from the button to the end of the walk.' },
        { tag: 'utility', label: 'What breaks it', detail: 'Any frame the victim is unstoppable or hard-stunned is theirs; the trance simply skips it. Dying or leaving clears it outright.' },
      ],
      notes: [
        'The trance only takes their feet. They can cast every ability they have on the way in — and the way in ends with them standing on top of you.',
        'Not one point of damage anywhere in this ultimate. It is a positioning tool: it puts an enemy exactly where a Coliseum, a flame pillar or a wall of arena border can reach them.',
        'You are pinned in the middle for three of the thirteen seconds and invincible for all three of them, so the opening is safe but entirely blind.',
        'Two white beams are drawn from the victim\'s eyes to you for the whole walk — the enemy can see exactly what has been done to them.',
      ],
    },
  },
};

export default justice;
