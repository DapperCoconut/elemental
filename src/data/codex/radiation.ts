import { ElementCodex } from '../AbilityCodex';

/**
 * Radiation — a fuse with a rifle.
 *
 * Verified against `src/elements/radiation.ts` and `kits/RadiationKit.ts`. Radiation has five
 * corrupt shop upgrades and no perks or mastery enhancements, so every figure below is a
 * constant at the top of the kit.
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
      magic:
        'The seams of the lead suit glow green because the load inside it is getting out, and they '
        + 'dim a step every twelve seconds as it does. The bell hands him half again his walking '
        + 'speed and a quarter more damage on everything, and that is the most he will ever have. '
        + 'From there it halves, and halves, and halves — nothing in the kit refreshes it, nothing '
        + 'extends it, and there is nothing to spend to buy it back.',
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
      magic:
        'A slowly turning trefoil over the victim\'s head with a ten-second bar draining under it. '
        + 'On its own it does nothing whatsoever — no ticks, no slow, no damage. What it does is '
        + 'close the door: for as long as it holds, every point of healing aimed at that body from '
        + 'any source at all arrives as a hit instead, and prints "☢ REJECTED" so nobody mistakes it '
        + 'for a bug.',
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
      magic:
        'The click is not the gun. It is a Geiger tracer — a little three-legged triangle with a '
        + 'lamp on it that deals nothing at all and clamps onto whatever it touches, then orbits '
        + 'the body blinking, with a row of pips over their head counting them. The third one '
        + 'confirms the shot and the railgun fires itself: a hitscan lance from the muzzle, white '
        + 'at the core, and the three tracers are spent on it.',
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
        magic:
          'Heart Stopper. The tracers stop being identical and start grading themselves: each one '
          + 'reports how close to the middle of the body it clamped on, and reddens as it gets '
          + 'there — green at the edge, hot red dead centre, with a heartbeat trace jumping off '
          + 'the good ones. The railgun is then scaled by the average of the three. Land all '
          + 'three near-perfectly and the beam comes out red and simply does not go out: the '
          + 'line stays lying across the arena, burning, for four more seconds.',
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
        'X-Ray Vision makes the tracers easier to land as well as everything else: the 33% hitbox swell is added to the tracer\'s own catch radius.',
      ],
    },

    'radiation-baton': {
      magic:
        'A short dash forward with a spent fuel rod whipped through everything in the way — a heavy '
        + 'lead bar with a trefoil burning at the end of it, drawn as an arc sweeping through the '
        + 'wedge. The branch is the whole ability: on somebody clean it plants the dose, on somebody '
        + 'already carrying one it takes their legs instead. It is the opener or the finisher, never '
        + 'both in one swing.',
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
        magic:
          'Exposure. The swing stops merely taking their legs and starts promoting them. Every '
          + 'baton landed on somebody already carrying a dose adds a rung to it as well as the '
          + 'stun — and each rung pays the stun back with interest, until at the top the rod '
          + 'stops pinning them altogether and simply launches them off it.',
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
      magic:
        'The whole screen washes green and breathes, and every enemy on it is redrawn as its own '
        + 'skeleton — ribs, spine, skull — painted over the body rather than behind it and with no '
        + 'reference at all to whether that body is visible. An invisible enemy still has bones. '
        + 'What the enemy gets out of the deal is a body a third wider than it was.',
      cast: 'R. Instant, no aim. 12s cooldown.',
      effects: [
        { tag: 'utility', label: 'The bones', detail: '8 seconds in which every enemy is drawn as a skeleton at depth 6.5 — over the sprite, ignoring its alpha entirely. Stealth, invisibility and fading do not hide it.' },
        { tag: 'debuff', label: 'The hitbox', detail: 'Every enemy body swells 33% for the whole window — a 22px radius becomes about 29px.' },
        { tag: 'utility', label: 'What that catches', detail: 'The swell is added to every range check this kit makes: tracers, flares, the baton wedge, the drum blast, the puddle sweep and the walk-in dose.' },
        { tag: 'utility', label: 'The wash', detail: 'A screen-space green tint at roughly 10% alpha, breathing so eight seconds of it never becomes wallpaper, and fading out over the last 600ms.' },
      ],
      upgrade: {
        magic:
          'Final Vision. The wash goes red, the skeletons go red, and the ability turns round: '
          + 'nothing swells, and the operative shrinks instead — a third off the suit and a third '
          + 'off the body under it, so the sniper spends eight seconds as a much harder thing to '
          + 'hit. What he gets back for the lost hitboxes is the beam. Confirm three tracers '
          + 'while it is running and the railgun does not fire; a held lance comes out of the '
          + 'muzzle instead and stays on them for five seconds, boiling as it goes.',
        effects: [
          { tag: 'buff', label: 'The shrink', detail: 'The operative\'s body and sprite both drop to 67% for the full 8 seconds — a 22px radius becomes about 15px. Applied through the shared size multiplier by division, so a Fate roll or an Illusion fold on the same body is handed back untouched.' },
          { tag: 'utility', label: 'What is kept', detail: 'The skeletons, in full: every enemy is still drawn through its own sprite\'s alpha, so stealth and invisibility still do not hide from it.' },
          { tag: 'utility', label: 'What is given up', detail: 'The 33% enemy hitbox swell, entirely. Tracers, flares, the baton wedge, the drum and the puddle sweep are all back to their real ranges.' },
          { tag: 'damage', label: 'The beam', detail: '15 damage a second for 5 seconds — 75 total, ticked as 3 every 200ms. It tracks the victim rather than a point, so it cannot be walked out of.' },
          { tag: 'debuff', label: 'The escalation', detail: 'Irradiated on contact, then a rung every 1.7 seconds: level 1 at the start, level 2 at 1.7s, level 3 at 3.3s. It is the only route in the kit to a level 3 that does not spend an E.' },
          { tag: 'cost', label: 'The lockout', detail: 'Click is locked for the whole 5 seconds. No tracers, no flares, no second chain — the beam is the ability for its entire run.' },
        ],
      },
      notes: [
        'The bones are for you and the hitboxes are for them: it makes bad aim land, which is exactly what a three-tracer confirm chain is short of.',
        'The swell is applied through the body\'s own hitbox multiplier rather than its size, so a Fate slots roll or an Illusion fold running on the same target is not disturbed and is handed back untouched.',
        'The multiplier is rewritten from scratch every frame, so a window that ends between two ticks — or a target that dies mid-window — can never leave a permanently inflated body behind.',
        'A Radiation NPC gets the hitbox half but paints no bones and no wash. Those are the player\'s screen.',
      ],
    },

    'radiation-waste': {
      magic:
        'A yellow-striped drum rolled out in front of you, arming as it goes, and then shot. The '
        + 'blast throws you bodily backwards — untouchable the whole way down — and sprays live '
        + 'pools of waste across the floor. The moment you land, without you pressing anything, he '
        + 'starts sniping them: nearest first, one every eighth of a second, each one going off in '
        + 'its own little green blast. Three acts on one button.',
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
        magic:
          'Cutdown. A drum that goes off *on* somebody rather than merely near them buys the '
          + 'sidearm: a stubby lead revolver with six green rounds in the cylinder, emptied one '
          + 'at a time while the operative is still travelling backwards through the air. Do it '
          + 'while Final Vision is up and the suit stops containing anything — SUPERCRITICAL, '
          + 'with four slabs of lead slamming shut over him and the mission burning twice as '
          + 'bright underneath.',
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
      magic:
        'A green flare gun with five rounds in it, and nothing else. The flares are tiny, fast and '
        + 'utterly harmless — the ultimate does not go off when you press it, it goes off if you can '
        + 'put every single one of them into the same body. Get there and a footprint spreads over '
        + 'the whole arena for a second and three-quarters before a mushroom cloud lands on the '
        + 'middle of it. Everyone on the screen is inside that, and so are you.',
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
        magic:
          'Finality. The crater does not clear. When the cloud comes down it leaves the whole '
          + 'floor of the arena under live waste — forty pools, laid out in a spiral so there are '
          + 'no bald patches to stand in — and everybody still on their feet, the man who called '
          + 'it included, is sitting at the top of the irradiation ladder.',
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
};

export default radiation;
