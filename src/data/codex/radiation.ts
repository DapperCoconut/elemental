import { ElementCodex } from '../AbilityCodex';

/**
 * Radiation — a fuse with a rifle.
 *
 * Verified against `src/elements/radiation.ts` and `kits/RadiationKit.ts`. Radiation has five
 * corrupt shop upgrades and one mastery, and no perks, so every figure below is a constant at
 * the top of the kit.
 *
 * The upgrades share one spine: **the irradiation ladder**. Base irradiated is a single
 * ten-second window and nothing else; four of the five upgrades can push a victim up it, and
 * what each rung does is documented once, on the Irradiated passive, rather than five times.
 */
const radiation: ElementCodex = {
  identity:
    'A sniper in lead plate, carrying something that is killing him and spending it on you. He '
    + 'opens the match at half again his speed and a quarter more damage — and then loses half of '
    + 'what is left every twelve seconds, forever, with no way at all to get it back. Everything he '
    + 'owns is a procedure rather than a rotation: tag a body three times and the railgun fires '
    + 'itself, put five flares into one enemy and an airdrop lands on everybody including him. Miss '
    + 'once and the whole board is scrubbed. The status he sells is irradiated, which turns every '
    + 'heal the victim takes into a hit for ten seconds. Play him like a demolition schedule.',

  passives: [
    {
      emoji: '☢️',
      name: 'Critical Mission',
      basics:
        'You start the match at +50% move speed and +25% damage, and both are halved every 12 seconds — '
        + '100% at the bell, 50% at 12s, 25% at 24s, 12.5% at 36s — stopping after 8 halvings, at which '
        + 'point 96 seconds in you are on +0.2% speed and +0.1% damage and the character has been spent. '
        + 'Each halving prints a "☢ DOSE SPENT" pop-up with the percentage left and dims the suit\'s '
        + 'seams, because a silent nerf every twelve seconds would read as a bug. It scales everything '
        + 'the kit deals: the 50 railgun, the 15 baton, the 30 drum, the 15 puddle snipe and the 200 '
        + 'airdrop — and the airdrop\'s self-hit with them.',
      effects: [
        { tag: 'buff', label: 'At the bell', detail: '+50% move speed and +25% damage, from the first frame of the match.' },
        { tag: 'cost', label: 'The halving', detail: 'Both bonuses are multiplied by 0.5 every 12 seconds. 100% → 50% at 12s, 25% at 24s, 12.5% at 36s.' },
        { tag: 'cost', label: 'The floor', detail: 'It stops laddering after 8 halvings — at 96 seconds he is on +0.2% speed and +0.1% damage, which is the character being spent.' },
        { tag: 'utility', label: 'The tell', detail: 'A pop-up reading "☢ DOSE SPENT" with the percentage left, once per halving, plus the suit\'s seams going dimmer. A silent nerf every twelve seconds would read as a bug.' },
        { tag: 'buff', label: 'What it scales', detail: 'Everything the kit deals: the 50 railgun, the 15 baton, the 30 drum, the 15 puddle snipe and the 200 airdrop — and the airdrop\'s self-hit with them.' },
      ],
      notes: [
        'This is why the numbers in this kit are as big as they are. 50 on a confirmed shot and 200 on the drop are affordable precisely because the man delivering them is getting weaker while he does it.',
        'The multiplier is applied to each figure as it is dealt rather than through the shared outgoing field alone, because none of this kit\'s damage is a projectile hit — every one of them calls the damage routine directly.',
        'It is still written into the shared outgoing multiplier as well, by division rather than assignment, so a Lust payload or a gauntlet card running on the same body is never silently deleted.',
      ],
    },
    {
      emoji: '☢️',
      name: 'Irradiated',
      basics:
        'Ten seconds in which every heal the victim receives is dealt as damage of the same size '
        + 'instead — their own regeneration, an ally\'s heal, a potion, a lifesteal tick, all of it. A '
        + 'second dose resets the window rather than stacking. It is applied by a confirmed railgun, the '
        + 'Rod Baton on a clean target, the drum blast, every sniped puddle, standing in a puddle and the '
        + 'airdrop: four of the five keys. It is worth exactly as much as the healing they were going to '
        + 'do — everything against Life or Creation, nothing at all against something that never heals. '
        + 'Once any upgrade is owned it becomes a 3-rung ladder. Level 1 is the status above, with a '
        + 'green trefoil. Level 2 runs 20 seconds instead of 10, adds 3 damage a second, and makes every '
        + 'good thing that lands on them from that moment expire at twice the rate — a 20-second haste '
        + 'becomes 10 — while leaving their own debuffs untouched, so it never accidentally cures '
        + 'anything; the trefoil turns hazard-yellow. Level 3 runs 40 seconds with everything above, and '
        + 'grows a cancerous arm off one shoulder that winds up for 0.7s and opens them for 10 damage '
        + 'plus a 0.5s stun every 3 seconds; the trefoil goes red. Exposure climbs a rung a swing, the '
        + 'Final Vision beam a rung every 1.7s, Supercritical\'s bare-core aura a rung every 3s, and '
        + 'Finality puts everybody straight to 3.',
      effects: [
        { tag: 'debuff', label: 'Healing inverted', detail: '10 seconds in which every heal the victim receives is dealt as damage of the same size instead. Their own regeneration, an ally\'s heal, a potion, a lifesteal tick — all of it.' },
        { tag: 'utility', label: 'Refresh, not stack', detail: 'A second dose resets the window to a full 10 seconds. There is no second tier and no stacking count.' },
        { tag: 'utility', label: 'What applies it', detail: 'A confirmed railgun, the Rod Baton on a clean target, the drum blast, every sniped puddle, standing in a puddle, and the airdrop. Four of the five keys.' },
        { tag: 'utility', label: 'What it is worth', detail: 'Exactly as much as the healing they were going to do — everything against Life or Creation, nothing at all against something that never heals.' },

        // ── The ladder the upgrades open up ──
        { tag: 'utility', label: 'Level 1 — the ladder', detail: 'With any upgrade owned the dose becomes a 3-rung ladder. Level 1 is exactly the status above: 10 seconds, healing inverted, nothing else. Its trefoil stays green.', requiresUpgrade: 'e' },
        { tag: 'dot', label: 'Level 2 — the bleed', detail: '20 seconds rather than 10, and 3 damage a second on top of the healing lock for the whole of it. The trefoil turns hazard-yellow and grows a second tick mark.', requiresUpgrade: 'e' },
        { tag: 'debuff', label: 'Level 2 — the decay', detail: 'Every *good* thing that lands on them from that moment runs out at twice the rate — a 20-second haste is a 10-second haste. Their own debuffs are untouched, so it never accidentally cures anything.', requiresUpgrade: 'e' },
        { tag: 'damage', label: 'Level 3 — the arm', detail: '40 seconds, everything above, and they grow a cancerous arm off one shoulder that winds up for 0.7s and opens them for 10 damage plus a 0.5s stun, every 3 seconds. The trefoil goes red and carries three tick marks.', requiresUpgrade: 'e' },
        { tag: 'utility', label: 'What climbs the ladder', detail: 'Exposure (E+) one rung per swing, the Final Vision beam (R+) one rung per 1.7s, Supercritical\'s bare-core aura (F+) one rung per 3s, and Finality (Q+) straight to 3 on everybody at once.', requiresUpgrade: 'e' },
      ],
      notes: [
        'It is applied silently by the railgun, the drum, the sweep and the airdrop — those all deal damage in the same frame, and a second pop-up on top would bury the number.',
        'The Rod Baton is the one ability that cares whether it is already there: a clean target gets the dose, a dosed one gets stunned instead.',
        'A level can never go *down*. An ordinary green dose landing on somebody sitting at level 3 refreshes the window and leaves the rung alone — a Click that quietly cured a level 3 would be the opposite of what the kit is for.',
        'The window is measured from the level it is currently at, so promoting somebody from 1 to 2 hands them a fresh 20 seconds rather than doubling whatever was left.',
        'Level 2\'s decay works by diffing effect expiries against a snapshot taken the instant they reached level 2, so it only ever shortens things applied *after* the promotion. It cannot reach backwards into a buff they were already wearing.',
      ],
    },
  ],

  abilities: {
    'radiation-railgun': {
      basics:
        'Click fires a tracer that deals no damage: 950 px/s for 700px, sticking to anything within '
        + '17px of its centre plus the body it hits. Three tracers on one body confirms — counted per '
        + 'victim, so tagging two enemies twice each confirms neither — and the confirmation fires itself '
        + 'the instant the third lands, as a 50-damage hitscan that cannot be dodged, plus 10 seconds '
        + 'irradiated, a 120ms shake and a "☢ CONFIRMED" call. A tracer that hits nothing at all, whether '
        + 'a wall, the arena edge or the end of its 700px, sheds every tracer this side has planted on '
        + 'every body and prints "✖ TRACERS LOST". The three are consumed by the shot, so the next '
        + 'railgun costs another three clean clicks. 620ms cooldown.',
      cast: 'Click, held — 620ms cooldown and no other gate. Aimed at the cursor and thrown from the weapon hand rather than the body centre.',
      effects: [
        { tag: 'utility', label: 'The tracer', detail: 'Deals no damage. Flies at 950 px/s for 700px, sticking to anything within 17px of its centre plus the body it hits.' },
        { tag: 'resource', label: 'The count', detail: '3 tracers on one body confirms. Counted per victim, so tagging two enemies twice each confirms neither.' },
        { tag: 'damage', label: 'The shot', detail: '50 damage, hitscan — it cannot be dodged once the third tracer lands, and it fires itself the instant it does.' },
        { tag: 'debuff', label: 'On confirm', detail: '10 seconds irradiated, applied silently alongside the damage, plus a 120ms screen shake and a "☢ CONFIRMED" call.' },
        { tag: 'cost', label: 'The miss', detail: 'A tracer that hits nothing at all — wall, edge of the arena or the end of its 700px — sheds every tracer this side has planted, on every body, and prints "✖ TRACERS LOST".' },
        { tag: 'resource', label: 'It is a reload', detail: 'The three are consumed by the shot rather than left on the body, so the next railgun costs another three clean clicks.' },
      ],
      upgrade: {
        basics:
          'Every tracer is now scored 0–1 on precision — the horizontal distance from the body\'s centre '
          + 'over the catch radius, inverted, so dead centre is 100% and the outside edge is 0% — and '
          + 'printed on the pop-up as it lands, each stuck tracer drawn in its own colour so a bad set is '
          + 'visible before the third arrives. The railgun\'s 50 is multiplied by 1 + 1.5 × the mean of the '
          + 'three, making a dead-centre set 125 and a sloppy 30% set 72. At a mean of 85% or better the '
          + 'line is left behind for 4 seconds dealing 6 damage every 0.4s — 60 over its run — to anything '
          + 'within 18px of it, running from the muzzle through the victim and 260px past them to the wall. '
          + 'It is a line on the floor rather than a leash: walking off it is how you stop taking it.',
        effects: [
          { tag: 'utility', label: 'Precision', detail: 'Per tracer, 0–1: the horizontal distance from the body\'s centre over the catch radius, inverted. Dead centre is 100%, the outside edge of the catch is 0%. Printed on the pop-up as the tracer lands.' },
          { tag: 'damage', label: 'The scaled shot', detail: 'The railgun\'s 50 is multiplied by 1 + 1.5 × the mean of the three. A dead-centre set is 125 damage; a sloppy 30% set is 72.' },
          { tag: 'damage', label: 'The afterimage', detail: 'At a mean of 85% or better the line is left behind for 4 seconds, dealing 6 damage every 0.4s — 60 over its full run — to anything within 18px of it.' },
          { tag: 'area', label: 'Where the line lies', detail: 'From the muzzle, through the victim, and 260px past them to the arena wall. It is a line across the floor, not a leash on the target: walking off it is how you stop taking it.' },
          { tag: 'utility', label: 'The read', detail: 'Each stuck tracer is drawn in its own colour, so a set of one red and two green is visibly a bad set before the third one lands.' },
        ],
      },
      notes: [
        'The board-scrubbing miss is the entire reason the ability is interesting: the click is free, the confirm is not, and without it the ability would be "hold the mouse down and wait".',
        'Two of three landed and then a stray is worse than nothing — you are back to zero with the cooldown spent.',
        'While the flare gun from Q is out, the click fires flares instead and no tracers are placed at all.',
        'X-Ray Vision makes the tracers easier to land as well as everything else: the 33% hitbox swell is added to the tracer\'s own catch radius. Final Vision takes the same third off it instead.',
        'A tracer is swept across its whole step rather than sampled at the end of it, so a fast round on a small target cannot skip through the body between two frames.',
      ],
    },

    'radiation-baton': {
      basics:
        'Dashes 760 px/s in the aimed direction for 190ms with WASD standing down — a plain shove, so a '
        + 'wall stopping it early breaks nothing — and swings for 15 damage across a wedge 104px deep and '
        + '0.95 radians either side of the aim, about 109° in total. A clean target is irradiated for 10 '
        + 'seconds; a target already dosed is stunned for 1.5 seconds instead, velocity zeroed and '
        + 'disarmed on a rolling refresh. Both the dash and the swing resolve on the press, so there is '
        + 'no wind-up to interrupt. 3s cooldown.',
      cast: 'E, aimed at the cursor. The dash and the swing both resolve on the press — there is no wind-up to interrupt.',
      effects: [
        { tag: 'movement', label: 'The dash', detail: '760 px/s in the aimed direction for 190ms, with WASD standing down for the duration. A plain shove, so a wall stopping it early breaks nothing.' },
        { tag: 'damage', label: 'The swing', detail: '15 damage to everything inside the wedge.' },
        { tag: 'area', label: 'The wedge', detail: '104px of reach (plus the target\'s own body radius) and 0.95 radians either side of the aim — about 109° in total.' },
        { tag: 'debuff', label: 'On a clean target', detail: '10 seconds irradiated.' },
        { tag: 'control', label: 'On a dosed target', detail: '1.5 seconds stunned instead: velocity forced to zero and disarmed on a rolling refresh, so no walking and no casting.' },
        { tag: 'utility', label: 'Cooldown', detail: '3 seconds.' },
      ],
      upgrade: {
        basics:
          'A dosed target is now promoted a rung a swing, 1 → 2 → 3, and the finisher changes with it: '
          + 'the swing that promotes to level 2 stuns for 3 seconds rather than 1.5, and the swing that '
          + 'promotes to level 3 barely stuns at all but throws them 900 px/s straight down the swing line, '
          + 'easing to zero over 420ms for roughly 190px, with the kit driving the body so neither WASD nor '
          + 'a bot\'s chase can fight it. A clean target is still simply irradiated for 10 seconds — the '
          + 'opener is unchanged; only the finisher is worth more.',
        effects: [
          { tag: 'debuff', label: 'One rung a swing', detail: 'A dosed target is promoted 1 → 2 → 3. See the Irradiated passive for what each rung does; the short version is 20s and 3/s at level 2, and 40s and the arm at level 3.' },
          { tag: 'control', label: 'Level 2 stun', detail: '3 seconds rather than 1.5 — double the base stun, on the swing that promoted them to level 2.' },
          { tag: 'control', label: 'Level 3 knockback', detail: 'No stun to speak of: 900 px/s straight down the swing line, easing to zero over 420ms — roughly 190px of travel. The kit drives the body for that window so neither WASD nor a bot\'s chase can fight it.' },
          { tag: 'utility', label: 'Still branches', detail: 'A clean target is still simply irradiated for 10 seconds. Exposure changes nothing about the opener; it only changes what the finisher is worth.' },
        ],
      },
      notes: [
        'This is the only ability in the kit that wants the status to already be there, which is what stops Radiation from being five buttons that all say "irradiate".',
        'It never does both. A dosed target takes 15 and a stun and their dose is *not* refreshed by the swing.',
        'Anything currently unstoppable refuses the stun outright and prints "UNSTOPPABLE" — and gets nothing else in its place.',
        'The dash is the kit\'s only real mobility, and it goes toward the cursor, so it is also the way out of a bad position as long as you are willing to swing on the way.',
      ],
    },

    'radiation-xray': {
      basics:
        'Eight seconds in which every enemy is drawn as a skeleton over their sprite, ignoring its '
        + 'alpha entirely, so stealth, invisibility and fading do not hide them — and every enemy body '
        + 'swells 33%, a 22px radius becoming about 29px. The swell is added to every range check this '
        + 'kit makes: tracers, flares, the baton wedge, the drum blast, the puddle sweep and the walk-in '
        + 'dose. A screen-space green tint at about 10% alpha breathes so eight seconds of it never '
        + 'becomes wallpaper, fading out over the last 600ms. 12s cooldown.',
      cast: 'R. Instant, no aim. 12s cooldown.',
      effects: [
        { tag: 'utility', label: 'The bones', detail: '8 seconds in which every enemy is drawn as a skeleton at depth 6.5 — over the sprite, ignoring its alpha entirely. Stealth, invisibility and fading do not hide it.' },
        { tag: 'debuff', label: 'The hitbox', detail: 'Every enemy body swells 33% for the whole window — a 22px radius becomes about 29px.' },
        { tag: 'utility', label: 'What that catches', detail: 'The swell is added to every range check this kit makes: tracers, flares, the baton wedge, the drum blast, the puddle sweep and the walk-in dose.' },
        { tag: 'utility', label: 'The wash', detail: 'A screen-space green tint at roughly 10% alpha, breathing so eight seconds of it never becomes wallpaper, and fading out over the last 600ms.' },
      ],
      upgrade: {
        basics:
          'The X-ray inverts and becomes a beam. Every enemy body drops to 67% instead of swelling — a '
          + '22px radius becomes about 15px, subtracted from every range check the kit makes, so tracers, '
          + 'flares, the baton wedge, the drum blast and the puddle sweep all have to be aimed properly, '
          + 'and a miss scrubs every tracer on the field. Your own body and sprite drop to 67% too, applied '
          + 'by division through the shared size multiplier so a Fate roll or an Illusion fold on the same '
          + 'body is handed back untouched. The skeletons are kept in full. The beam itself deals 22 damage '
          + 'a second for 5 seconds — 110 total, ticked as 4.4 every 200ms, against a railgun\'s 50 — and '
          + 'tracks the victim rather than a point, so it cannot be walked out of. It irradiates on contact '
          + 'and climbs a rung every 1.7 seconds, reaching level 3 at 3.3s, which is the only route in the '
          + 'kit to a level 3 that does not spend an E. Click is locked for the whole 5 seconds.',
        effects: [
          { tag: 'debuff', label: 'The tightening', detail: 'Every enemy body drops to 67% for the whole window — a 22px radius becomes about 15px. Subtracted from every range check this kit makes, so tracers, flares, the baton wedge, the drum blast and the puddle sweep all have to be aimed properly.' },
          { tag: 'buff', label: 'The shrink', detail: 'The operative\'s body and sprite both drop to 67% too. Applied through the shared size multiplier by division, so a Fate roll or an Illusion fold on the same body is handed back untouched.' },
          { tag: 'utility', label: 'What is kept', detail: 'The skeletons, in full: every enemy is still drawn through its own sprite\'s alpha, so stealth and invisibility still do not hide from it.' },
          { tag: 'utility', label: 'What is given up', detail: 'The 33% enemy hitbox swell, and then some — the same third goes the other way. Bad aim that the base ability would have caught now misses, and a miss scrubs every tracer on the field.' },
          { tag: 'damage', label: 'The beam', detail: '22 damage a second for 5 seconds — 110 total, ticked as 4.4 every 200ms, against a railgun\'s 50. It tracks the victim rather than a point, so it cannot be walked out of.' },
          { tag: 'debuff', label: 'The escalation', detail: 'Irradiated on contact, then a rung every 1.7 seconds: level 1 at the start, level 2 at 1.7s, level 3 at 3.3s. It is the only route in the kit to a level 3 that does not spend an E.' },
          { tag: 'cost', label: 'The lockout', detail: 'Click is locked for the whole 5 seconds. No tracers, no flares, no second chain — the beam is the ability for its entire run.' },
        ],
      },
      notes: [
        'The bones are for you and the hitboxes are for them: it makes bad aim land, which is exactly what a three-tracer confirm chain is short of. Final Vision sells that back — the bones stay, the charity does not.',
        'The resize is applied through the body\'s own hitbox multiplier rather than its size, so a Fate slots roll or an Illusion fold running on the same target is not disturbed and is handed back untouched.',
        'The multiplier is rewritten from scratch every frame, so a window that ends between two ticks — or a target that dies mid-window — can never leave a permanently resized body behind.',
        'Two X-rays reading one body take the tighter of the two, so an ordinary one on the far side of the fight cannot hand a Final Vision\'s mark its full hitbox back.',
        'A Radiation NPC gets the hitbox half but paints no bones and no wash. Those are the player\'s screen.',
      ],
    },

    'radiation-waste': {
      basics:
        'Rolls a drum from 30px in front of you at 340 px/s for up to 520ms or until it hits a wall, '
        + 'detonating wherever it stops for 30 damage inside 132px plus 10 seconds irradiated. You are '
        + 'thrown straight back along the throw line at 620 px/s decaying to zero over 720ms, with WASD '
        + 'standing down and invincibility re-asserted every frame so nothing can cut it short. The blast '
        + 'sprays 7 pools 30–125px around the drum at jittered angles, each 32–63px across and lasting '
        + 'until they are shot; standing in one is a fresh dose once a second per pool, though the status '
        + 'refreshes rather than stacks. Starting 120ms after you land, each pool is sniped in turn — 15 '
        + 'damage inside 74px, one every 120ms, nearest first — so seven of them is just under a second '
        + 'of shooting. One drum at a time, and pressing F again mid-fall refunds rather than stranding '
        + 'you in the air.',
      cast: 'F, aimed at the cursor. One drum at a time — pressed again mid-fall it is refunded rather than stranding the body in the air.',
      effects: [
        { tag: 'summon', label: 'The drum', detail: 'Rolls from 30px in front of you at 340 px/s for up to 520ms, or until it reaches a wall. It goes off wherever it stops.' },
        { tag: 'damage', label: 'The blast', detail: '30 damage inside 132px, plus 10 seconds irradiated on everything caught.' },
        { tag: 'movement', label: 'The fall', detail: 'Thrown straight back along the throw line at 620 px/s decaying to zero over 720ms. WASD stands down and invincibility is re-asserted every frame, so nothing in the game can cut it short.' },
        { tag: 'summon', label: 'The spray', detail: '7 pools, scattered 30–125px around the drum at jittered angles, each 32–63px across and lasting until they are shot.' },
        { tag: 'dot', label: 'Standing in one', detail: '10 seconds irradiated, once per second per pool. Two pools overlapping is two doses a second — but the status refreshes rather than stacking, so it is one window either way.' },
        { tag: 'damage', label: 'The sweep', detail: 'Starting 120ms after you land: 15 damage inside 74px per pool, one every 120ms, nearest first. Seven of them is just under a second of shooting.' },
      ],
      upgrade: {
        basics:
          'A direct hit — the drum detonating within 30px of a body rather than anywhere in its generous '
          + '132px blast — buys a follow-up: 6 hitscan rounds of 5 damage each, one every 110ms starting '
          + '180ms after the drum, fired during the fall so it costs no extra time. A direct hit landed '
          + 'while Final Vision is running instead opens Supercritical for 8 seconds, and nothing else '
          + 'opens it. During it Critical Mission\'s remaining charge is read twice as hard — at full charge '
          + '+100% speed and +50% damage, at a quarter charge +25% and +12.5% — so going critical early is '
          + 'worth vastly more. The lead plates come off: the next incoming hit is blocked outright '
          + 'whatever its size, re-clamping 3 seconds after each break so a full window is worth up to '
          + 'three blocked hits, while the bare core irradiates everything within 130px once a second and '
          + 'climbs a rung every 3 seconds, with the ring on the floor exactly matching the ring that '
          + 'doses. When it ends at 25% Critical Mission charge or less you pay for it: 6 self-damage every '
          + '0.4s for 4 seconds — 60 in total — plus level 3 irradiation on yourself, which is 40 seconds '
          + 'of your own healing landing as damage. Above 25% it prints "☢ STABLE" and does nothing, so '
          + 'Supercritical is only dangerous late, which is exactly when it is most tempting.',
        effects: [
          { tag: 'utility', label: 'A direct hit', detail: 'The drum detonating within 30px of a body, rather than anywhere inside its 132px blast. The blast is generous and would make the upgrade free.' },
          { tag: 'damage', label: 'The revolver', detail: '6 hitscan rounds of 5 damage each — 30 total — one every 110ms, starting 180ms after the drum. Fired during the fall, so the follow-up costs no extra time at all.' },
          { tag: 'buff', label: 'Supercritical', detail: '8 seconds, on a direct hit landed while Final Vision (R+) is running. Requires R+ specifically: no other ability opens it.' },
          { tag: 'buff', label: 'Double mission', detail: 'Critical Mission\'s remaining charge is read twice as hard for the duration — at full charge that is +100% speed and +50% damage, at a quarter charge +25% and +12.5%. It doubles what is left, so going critical early is worth vastly more.' },
          { tag: 'shield', label: 'The lead armour', detail: 'Blocks the next incoming hit outright, whatever its size. Re-clamps 3 seconds after it breaks and can eat another, so a full 8 seconds is worth up to three blocked hits.' },
          { tag: 'dot', label: 'The bare core', detail: 'While the plates are off: everything within 130px is irradiated once a second, and climbs a rung every 3 seconds. The ring drawn on the floor is exactly the ring that doses.' },
          { tag: 'cost', label: 'The come-down', detail: 'When it ends, if Critical Mission is at 25% charge or less: 6 self-damage every 0.4s for 4 seconds — 60 in total — plus level 3 irradiation on yourself, which means 40 seconds of your own healing landing as damage.' },
          { tag: 'utility', label: 'Or nothing at all', detail: 'Above 25% charge the come-down prints "☢ STABLE" and does nothing. Supercritical is only dangerous late, which is exactly when a Radiation player is most tempted to reach for it.' },
        ],
      },
      notes: [
        'The whole sequence is driven per-frame rather than by a chain of delayed calls, so the drum can hit a wall, the fall can be cut short by the match ending, and the sweep can find pools that were spilled a moment ago.',
        'The fall is a real escape: 720ms of invincibility travelling away from where you just detonated something. Aiming the drum is also aiming your own retreat.',
        'The sweep fires itself and cannot be aimed or stopped — if the enemy walks out of the pools they are simply 15-damage fireworks.',
        'Every pool that goes off irradiates as well as damaging, so a target standing in the spray is taking a fresh 10-second window several times a second.',
      ],
    },

    'radiation-extermination': {
      basics:
        'The ultimate hands you a flare gun: 5 rounds and a 12-second window, with your Click firing '
        + 'flares instead of tracers. Flares travel 1350 px/s for 900px with a 15px catch radius and deal '
        + 'no damage whatsoever. All five on one body confirms — the verdict waits for the last round in '
        + 'the air to resolve, so a fifth still flying does not settle it early — and then 1.7 seconds of '
        + 'footprint and siren precede 200 damage to every enemy on the screen with no range limit at '
        + 'all, plus 10 seconds irradiated on each. You take the same 200 through the self-damage route, '
        + 'so a shield cannot be spent dodging your own bomb, and Critical Mission scales the self-hit '
        + 'exactly as it scales the drop. Four on one and one stray, or the window running out with '
        + 'rounds unspent, prints "✖ NO CONFIRMATION" and does absolutely nothing. 40s cooldown.',
      cast: 'Q. Hands over the ammunition, then your Click fires flares instead of tracers for 12 seconds. Pressed while the gun is already out it is refunded. Ultimate, 40s cooldown.',
      effects: [
        { tag: 'resource', label: 'The magazine', detail: '5 flares and a 12-second window. Rounds are tracked over your own head; hits are tracked over each enemy\'s.' },
        { tag: 'utility', label: 'The flares', detail: '1350 px/s, 900px of range, 15px catch radius, and no damage whatsoever.' },
        { tag: 'utility', label: 'The confirmation', detail: 'All 5 on one body. The verdict waits for the last round in the air to resolve, so a fifth that is still flying does not settle it early.' },
        { tag: 'damage', label: 'The airdrop', detail: '1.7 seconds of footprint and siren, then 200 damage to every enemy on the screen with no range limit at all, plus 10 seconds irradiated on each.' },
        { tag: 'cost', label: 'And you', detail: 'The caster takes the same 200 through the self-damage route — a shield cannot be spent dodging your own bomb, and Critical Mission scales the self-hit exactly as it scales the drop.' },
        { tag: 'cost', label: 'Failure is total', detail: 'Four on one and one stray, or the window running out with rounds unspent, prints "✖ NO CONFIRMATION" and does absolutely nothing. The 40 seconds are gone.' },
      ],
      upgrade: {
        basics:
          'The airdrop leaves fallout: 40 pools spread across the whole arena on a sunflower spiral from '
          + 'the blast centre, each 25–46px across and ordinary Waste Disposal pools in every respect, so '
          + 'standing in one is a fresh dose once a second per pool and with 40 down there is very little '
          + 'floor that is not dosing somebody. They are also ammunition — the next Waste Disposal sweeps '
          + 'every pool it owns, so 40 pools is 40 snipes of 15 damage, 600 across roughly 5 seconds of '
          + 'shooting if the enemy stays anywhere near them. Every enemy on the screen is put straight to '
          + 'level 3 irradiation: 40 seconds of inverted healing, 3 damage a second and the arm. And so are '
          + 'you, on top of the 200 self-damage.',
        effects: [
          { tag: 'summon', label: 'The fallout', detail: '40 pools spread across the entire arena on a sunflower spiral from the blast centre, each 25–46px across. Ordinary Waste Disposal pools in every respect.' },
          { tag: 'dot', label: 'Standing in one', detail: 'A fresh dose once a second per pool, exactly as the F\'s own spray works. With 40 of them there is very little floor that is not dosing somebody.' },
          { tag: 'damage', label: 'Ammunition for the F', detail: 'The next Waste Disposal sweeps every pool it owns, so the 40 are 40 snipes of 15 damage — 600 across roughly 5 seconds of shooting if the enemy stays anywhere near them.' },
          { tag: 'debuff', label: 'Level 3 on everybody', detail: 'Every enemy on the screen is put straight to level 3 irradiation — 40 seconds of inverted healing, 3 damage a second and the arm.' },
          { tag: 'cost', label: 'And you', detail: 'The caster takes the same level 3 on top of the 200 self-damage. 40 seconds in which your own healing is damage, you bleed 3 a second, and your own arm opens you for 10 every 3 seconds.' },
        ],
      },
      notes: [
        'An ultimate the player can fail is only fair if they can see it failing, which is why the tally sits over every enemy\'s head and the magazine sits over yours for the whole window.',
        'Because Critical Mission scales the self-hit too, "and that includes you" stays literally true however late the drop is called — you never grow out of your own bomb.',
        '200 through self-damage against a 400 health pool is half your bar. This is a closer, not an opener, and calling it above half health is the plan.',
        'It lands dead centre regardless of where anybody is standing, and the footprint is drawn at a radius of 62% of the arena\'s longer side — the whole floor. There is nowhere on the map that is outside it.',
        'While the gun is out you cannot place tracers, so the railgun chain is off the table for up to 12 seconds.',
      ],
    },
  },

  mastery: {
    'snipers-instinct': {
      basics:
        'Two things, always on while Radiation Mastery is enabled. Damage taken scales with the '
        + 'distance to the nearest enemy — 0% off inside 140px ramping linearly to 45% off at 620px and '
        + 'beyond, recomputed every frame off whichever enemy is actually nearest, so it is a running '
        + 'score on the range you are playing rather than a window you open. And a sight line is drawn '
        + 'from the muzzle to the exact point a tracer fired now would stop: the body it would clamp '
        + 'onto, the wall it would strike, or the 700px where it runs out, with a green box on a body and '
        + 'a hazard-yellow crosshair on empty floor. While the flare gun is out the line measures a flare '
        + 'instead — 1350 px/s, 900px, a 15px catch — because that is what the click is actually firing.',
      cast: 'Passive. On for the whole match while Radiation Mastery is enabled and Radiation is the element being played.',
      effects: [
        { tag: 'shield', label: 'The armour', detail: 'Damage taken scales with the distance to the nearest enemy: 0% off inside 140px, ramping linearly to 45% off at 620px and beyond.' },
        { tag: 'utility', label: 'Measured live', detail: 'Recomputed every frame off whichever enemy is actually nearest, so it is a running score on the range being played rather than a window that gets opened.' },
        { tag: 'utility', label: 'The sight', detail: 'A line from the muzzle to the exact point a tracer fired now would stop: the body it would clamp onto, the wall it would strike, or the 700px where it runs out.' },
        { tag: 'utility', label: 'The reticle', detail: 'A green box on a body, a hazard-yellow crosshair on empty floor. It is the difference between knowing a tracer will miss and seeing that it will.' },
        { tag: 'utility', label: 'It follows the gun', detail: 'While the flare gun from Q is out the line measures a flare instead — 1350 px/s, 900px, a 15px catch — because that is what the click is actually firing.' },
      ],
      notes: [
        'The two halves are the same idea. The armour pays a Radiation for standing where the element wants to be, and the sight is what makes that range playable — a 700px tracer aimed by eye is a coin flip, and a coin flip is what scrubs the whole board.',
        'It stacks with nothing and it is nobody else\'s field: the multiplier is Radiation\'s own, so a Fate card or a Metal clot on the same body is untouched.',
        'A Radiation NPC gets the armour and no line. That is the player\'s instrument, in the same way the X-ray\'s skeletons are.',
        'There is no new information in the sight. It is the maths the click was already running, drawn — which is exactly why it is drawn as quietly as it is.',
      ],
    },
    'gamma-tether': {
      basics:
        'A bindable post planted at the cursor that stands 6 seconds. It has no health, nothing can '
        + 'knock it down, and the bar on its front is the only clock on it. It chains the nearest enemy '
        + 'within 260px — not instantly and not as a taunt, so a post on empty floor lies there and takes '
        + 'the first body that walks into range — and from then on that body cannot get further than '
        + '150px from it, moving freely inside the circle and sliding around the ring at the edge. '
        + 'Whoever it catches is irradiated on contact at the usual 10-second window, never lowering a '
        + 'rung they are already on, and for as long as the chain holds that dose stops running down: the '
        + 'bar over their head sits exactly where it is and the 10, 20 or 40 seconds simply do not count, '
        + 'while the bleed and the arm keep working. The post deals nothing and the chain deals nothing — '
        + 'everything it is worth is what the rest of the kit does to somebody who cannot leave a 150px '
        + 'circle. Anything currently unstoppable is never caught, and a caught body that becomes '
        + 'unstoppable is let go. Bindable to E, F or Q, never R. 15s cooldown, one post at a time.',
      cast: 'The bound key (E, F or Q). Instant, aimed at the cursor. 15 second cooldown, one post at a time. R is refused as a drop target.',
      effects: [
        { tag: 'summon', label: 'The post', detail: 'Planted at the cursor, clamped inside the arena, standing for 6 seconds. It has no health and nothing can knock it down; the bar on the front is the only clock on it.' },
        { tag: 'control', label: 'The catch', detail: 'It chains the nearest enemy within 260px of itself. Not instant and not a taunt — a post planted on empty floor lies there and takes the first body that walks into range.' },
        { tag: 'control', label: 'The leash', detail: 'From then on that body cannot get further than 150px from the post. Inside the circle they move exactly as they like; at the edge they slide around the ring instead of going outward.' },
        { tag: 'debuff', label: 'The chain doses', detail: 'Live waste on a wire: whoever it catches is irradiated on contact, at the usual 10-second window. It never lowers a rung somebody is already on.' },
        { tag: 'debuff', label: 'The pause', detail: 'For as long as the chain holds, that dose stops running down — the bar over their head sits exactly where it is, and the 10, 20 or 40 seconds they were counting simply do not count. The bleed and the arm keep working: it is paused, not suspended.' },
        { tag: 'utility', label: 'No damage at all', detail: 'The post deals nothing and the chain deals nothing. Everything it is worth is what the rest of the kit does to somebody who cannot leave a 150px circle.' },
        { tag: 'utility', label: 'What it refuses', detail: 'Anything currently unstoppable is never caught, and a caught body that becomes unstoppable is let go. A second press while a post is standing prints 📡 ONE POST AT A TIME.' },
      ],
      notes: [
        'The circle is the whole ability. Every procedure Radiation owns dies to somebody walking away from it — three tracers, a 132px drum, seven pools and a 104px baton wedge all need the target to still be there in a second\'s time — and a tethered target cannot walk away from any of them.',
        'It is placed rather than aimed at a person, which is what makes it a trap as much as a hold. A post dropped on the lane somebody is retreating down catches them on the way past.',
        'The pause is not a refresh. A dose with two seconds left is still a dose with two seconds left when the post dies; what it buys is six seconds in which those two seconds are not spent.',
        'Binding it costs a real key. Over E the baton goes and the kit loses its only mobility; over F the drum and everything Cutdown hangs off it go; over Q the airdrop goes. R is refused outright, because Final Vision is a prerequisite for Supercritical and binding over it would silently disable an F+ that had already been bought.',
        'The bot plants it on the enemy rather than at a guess, and then commits: while the chain holds it will throw the drum from 460px instead of 300, swing the baton at a body the chain has already dosed, and fire tracers to the full 700px, because none of those can be dodged by walking any more.',
      ],
    },
  },
};

export default radiation;
