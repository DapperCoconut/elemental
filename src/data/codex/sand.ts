import { ElementCodex } from '../AbilityCodex';

/**
 * Time (element id `sand`) — the gunslinger who is paid in the damage you do to them.
 *
 * Verified against `src/elements/sand.ts`, `kits/TimeKit.ts`, the sand block of `data/Upgrades.ts`,
 * the Purge perk in `data/Perks.ts` and Time Mastery in `data/Mastery.ts`. Numbers here are the
 * ones the kit applies, and where the card text and the code disagree the code wins and the row
 * says so.
 */
const sand: ElementCodex = {
  identity:
    'A revolver, a rope and a clock that only you are allowed to wind. Time has no burst worth the '
    + 'name — its bullets open at 5 damage — and instead wins by making the other fighter pay for '
    + 'every exchange twice: once when you rewind them out of the position they earned, and once '
    + 'when the beating they gave you comes back as a bounty you cash in on their cooldowns. '
    + 'Everything in the kit is a delay: absorbed damage arrives late, warped enemies arrive early, '
    + 'and the ultimate is a five second gap in the world that only you are awake for.',

  passives: [
    {
      emoji: '🎯',
      name: 'The Bounty',
      basics:
        'A meter that fills as you are hurt: every 5 damage taken is +1 bounty, tracked fractionally so '
        + 'a 12-damage hit is +2.4 and nothing is rounded away. It never decays and has no cap, and the '
        + 'whole number is drawn 55px above the enemy, popping to 1.3× scale each time it ticks over. The '
        + 'only way it leaves is being spent on F or converted on Q. Your highest-ever bounty this match '
        + 'is remembered separately, and it — not your current total — sets the length of Bounty Hunter.',
      effects: [
        { tag: 'resource', label: 'Accrual', detail: 'Every 5 damage you take is +1 bounty, tracked fractionally — a 12 damage hit is +2.4, so nothing is rounded away.' },
        { tag: 'utility', label: 'The label', detail: 'The whole number is drawn 55px above the enemy and pops to 1.3× scale each time it ticks over.' },
        { tag: 'utility', label: 'Never decays', detail: 'Bounty has no timer and no cap. It is only ever removed by spending it on F or converting it on Q.' },
        { tag: 'buff', label: 'High-water mark', detail: 'The largest bounty you have ever held this match is remembered separately, and that figure — not your current one — sets the length of Bounty Hunter (F+).', requiresUpgrade: 'f' },
      ],
      notes: [
        'Spending on F resets it to zero, so cashing a 9-bounty warrant early costs you the 15 you would have had.',
      ],
    },
    {
      emoji: '🕰️',
      name: 'Time Puddles',
      basics:
        'A 28px patch that slows the opposing fighter to ×0.75 while they stand in it, lasting 5 '
        + 'seconds and fading as the face dims. Multiple puddles never stack — being in any of them is '
        + 'one 25% slow. Standing in your own charges Time Energy at 1000ms per second. They come from '
        + 'Lasso rewinds (one every 200ms, about 5 per drag) and from Remain, one per 10 damage absorbed.',
      effects: [
        { tag: 'control', label: 'Slow', detail: '28px radius; the opposing fighter moves at ×0.75 while inside one of yours. Multiple puddles do not stack — being in any of them is one 25% slow.' },
        { tag: 'area', label: 'Lifetime', detail: '5 seconds each, fading over the last of it as the face dims.' },
        { tag: 'resource', label: 'Charges the ultimate', detail: 'Standing in your own puddle adds Time Energy in real time — 1000ms of charge per second stood in it.' },
        { tag: 'summon', label: 'Where they come from', detail: 'One every 200ms along a Lasso rewind (roughly 5 per drag), and one per 10 damage Remain absorbs.' },
      ],
    },
    {
      emoji: '⏳',
      name: 'Time Energy',
      basics:
        'The ultimate\'s fuel, capped at 10,000ms and drawn as a 40px bar that reads gold under full and '
        + 'blue at full. It fills two ways: real time spent standing in your own time puddles, or a press '
        + 'of Q converting bounty at 1 bounty per 1000ms. Conversion clamps at the cap, so cashing 14 '
        + 'bounty into a bar already at 4,000ms wastes 8 of it. Always Noon empties the bar to zero — '
        + 'there is no partial time-stop.',
      effects: [
        { tag: 'resource', label: 'Capacity', detail: '10,000ms. The bar is 40px wide and reads gold under full, blue at full.' },
        { tag: 'resource', label: 'Two ways to fill it', detail: 'Real time spent standing in your own time puddles, or a press of Q converting bounty at 1 bounty = 1000ms.' },
        { tag: 'cost', label: 'Overflow is discarded', detail: 'Conversion clamps at 10,000ms. Cashing 14 bounty into a bar already at 4,000ms wastes 8 of it.' },
        { tag: 'utility', label: 'Spent whole', detail: 'Always Noon empties the bar to zero — there is no partial time-stop.' },
      ],
    },
  ],

  abilities: {
    'time-barrage': {
      basics:
        'A held revolver that fires one round every 250ms at the cursor. Rounds age in flight: 5 damage '
        + 'at the muzzle climbing to 12 over 2 seconds, recomputed every frame, with the sprite tinting '
        + 'yellow to red so you can read a bullet\'s worth off its colour — and they self-destruct after '
        + '2.5s, so the last half second of flight is the only stretch paying the full 12. They travel '
        + '380 px/s. The magazine is 6, the sixth shot starts the 3-second reload automatically, and you '
        + 'cannot reload early: the cylinder swings out beside you and fills a chamber at a time.',
      cast: 'Hold Click. It fires continuously while the pointer is down, one round per 250ms, aimed at the cursor.',
      effects: [
        { tag: 'damage', label: 'Ageing round', detail: 'Spawns at 5 damage and ramps to 12 over 2 seconds of flight, recomputed every frame. The sprite tints yellow → red across the same 2s so you can read a bullet\'s worth off its colour.' },
        { tag: 'utility', label: 'Flight', detail: '380 px/s in a straight line. It self-destructs after 2.5s, so the last half second of its life is the only stretch that pays the full 12.' },
        { tag: 'resource', label: 'Magazine', detail: '6 rounds. The sixth shot starts the reload automatically; you cannot reload early or by choice.' },
        { tag: 'cost', label: 'Reload', detail: '3 seconds with no shooting at all, shown as a revolver cylinder swung out beside you filling one chamber at a time.' },
        { tag: 'utility', label: 'Rate of fire', detail: '250ms between shots — 24 rounds a minute of actual uptime once the reload is counted.' },
      ],
      upgrade: {
        basics:
          'A reload bar appears, with a perfect band at 45–55% of the 3 seconds — a 300ms window between '
          + '1.35s and 1.65s. A click inside it refills all six chambers instantly and launches the old '
          + 'cylinder as a projectile: 300 px/s with a 2-second fuse for 30 damage in a 40px radius and a '
          + '160ms shake. A click outside the band after the first 200ms paints the bar red and forfeits '
          + 'the window; the reload runs its full 3 seconds and there is no second attempt.',
        effects: [
          { tag: 'utility', label: 'The bar', detail: 'Only drawn while you own this upgrade. The perfect band sits at 45–55% of the 3s reload — a 300ms window, 1.35s to 1.65s in.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Instant reload', detail: 'A click inside the band refills all 6 chambers on the spot and ends the reload.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Thrown cylinder', detail: 'The same click launches a chamber projectile at 300 px/s with a 2 second fuse: 30 damage in a 40px radius, with a 160ms camera shake.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'One attempt', detail: 'A click outside the band (after the first 200ms) paints the bar red and forfeits the window — the reload runs its full 3s and no second try is allowed.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A chamber that hits the enemy directly is consumed for its own 0 damage; the 30 damage blast only fires when the 2 second fuse runs out. It is a mine thrown at their feet, not a shell aimed at their chest.',
        'Clicks in the first 200ms of a reload are ignored entirely — neither a perfect nor a failure.',
        'Every perfect reload counts toward the Quickdraw requirement of Time Mastery (50 needed), which is why that requirement is unreachable without this upgrade.',
        'Bounty Hunter (F+) cuts the reload to 1.5s while its aura is up, which also halves the perfect window in real time.',
      ],
    },

    'time-warp': {
      basics:
        'Throws a loop at the cursor at 260 px/s that expires after 3 seconds if it hits nothing. On a '
        + 'hit it deals 20 damage and drags the target over a full second back to where they were 3 '
        + 'seconds ago — position is sampled every 100ms with 40 samples kept, so it picks the closest '
        + 'real snapshot in a 4-second memory — laying a time puddle every 200ms of the drag, about five '
        + '5-second slows that also charge your energy. 3s cooldown, the shortest Time has.',
      cast: 'E, thrown at the cursor. The loop travels on its own and the rewind only happens on a hit.',
      effects: [
        { tag: 'damage', label: 'Catch', detail: '20 damage on contact, with a brass detonation on the catch point.' },
        { tag: 'control', label: 'Rewind', detail: 'The target is dragged over a full 1 second to the position they occupied 3 seconds ago. Position is sampled every 100ms and 40 samples are kept, so the kit is choosing the closest real snapshot within a 4 second memory.' },
        { tag: 'summon', label: 'Puddles along the rope', detail: 'One time puddle every 200ms of the drag — about 5, laid along the line they are hauled through, each a 5s 25% slow that also charges your Time Energy.' },
        { tag: 'utility', label: 'The throw', detail: '260 px/s, and the loop expires 3 seconds after it leaves your hand if it hits nothing.' },
        { tag: 'utility', label: 'Availability', detail: '3 second cooldown, the shortest keyed cooldown Time has.' },
      ],
      upgrade: {
        basics:
          'The hit still deals its 20 damage but no longer drags: it saves their 3-seconds-ago position '
          + 'and pins a pulsing dial marker there. The next press of E, at any time and any range, hauls '
          + 'them to that spot over a second, still dropping a puddle every 200ms — and firing the saved '
          + 'warp does not go through the ability at all, so it costs no cooldown. Only a real throw ever '
          + 'pays the 3 seconds.',
        effects: [
          { tag: 'utility', label: 'Marked, not moved', detail: 'The hit still deals its 20 damage, but instead of the drag it saves the 3-seconds-ago position and pins a pulsing dial marker there.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Cash it in', detail: 'The next press of E — at any time, at any range — drags them to the saved spot over 1 second, still dropping a puddle every 200ms.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'The trigger is free', detail: 'Firing the saved warp does not go through the ability at all, so it costs no cooldown. The 3s cooldown is only ever paid by an actual throw.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'While a position is saved, E cannot throw another lasso — the key belongs to the trigger until you use it.',
        'The drag is a position override, not a shove: it cannot be resisted, walked out of or shielded, and it runs at a fixed rate regardless of anybody\'s move speed.',
        'An enemy Time user\'s lasso is not symmetrical — the NPC\'s catch deals no damage at all, only the rewind.',
        'Every catch counts toward the Wrangler requirement of Time Mastery (40 needed).',
      ],
    },

    'time-remain': {
      basics:
        'For 3 seconds every point of damage from any source is absorbed rather than applied, '
        + 'intercepting ahead of shields so nothing else you own is spent. When the window closes you '
        + 'take 80% of the running total in one hit — absorb 100, take 80. Every 10 damage absorbed drops '
        + 'a time puddle 20–60px away in a random direction, so a heavy three seconds paves the ground '
        + 'around you. No lock: you move, shoot and cast normally throughout. 12s cooldown.',
      cast: 'R. No lock — you can move, shoot and cast normally for the whole 3 seconds.',
      effects: [
        { tag: 'shield', label: 'Total absorb', detail: 'For 3 seconds, every point of damage from any source is absorbed rather than applied. It intercepts ahead of shields, so nothing else you own is spent.' },
        { tag: 'cost', label: 'The bill', detail: 'When the window closes you take 80% of the running total in one hit, rounded. Absorb 100 and you take 80.' },
        { tag: 'summon', label: 'Overflow puddles', detail: 'Every 10 damage absorbed drops a time puddle 20–60px away in a random direction — a heavy 3 seconds paves the ground around you.' },
        { tag: 'utility', label: 'Availability', detail: '12 second cooldown.' },
      ],
      upgrade: {
        basics:
          'A 60px stasis zone follows you for the same 3 seconds, zeroing the velocity of every '
          + 'projectile inside it and restoring it exactly as they leave or as the field ends. It freezes '
          + 'yours as readily as theirs, so firing into your own field parks the round in front of you '
          + 'until the window shuts.',
        effects: [
          { tag: 'control', label: 'Projectile stasis', detail: 'A 60px zone follows you for the same 3 seconds. Every projectile inside it has its velocity zeroed and restored exactly when it leaves the zone or the field ends.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'It freezes yours too', detail: 'Your own bullets are stopped by it as readily as theirs. Firing into your own field parks the round in front of you until the window shuts.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The absorb has no cap. A full 3 seconds inside a heavy ultimate can hand you a bill larger than your health bar.',
        'Damage absorbed counts toward the Immovable requirement of Time Mastery (500 needed) — the bill is charged for it either way.',
        'The Purge perk is the only way to avoid the bill, and it is a one-shot for the whole match.',
      ],
    },

    'time-halt': {
      basics:
        'Spends your entire bounty — fractions included — to put a warrant on the other fighter '
        + 'wherever they are. It runs one second per whole point, minimum 1s and no upper limit, and for '
        + 'that time they move at ×0.5 speed, every cooldown they own takes twice as long, and any '
        + 'projectile within 120px of them flies at 15% of its speed, snapping back to full as it leaves. '
        + '10s cooldown, so two heavy warrants a fight is realistic and a stream of 1-bounty ones is not. '
        + 'Refused with nothing spent below 1 bounty.',
      cast: 'F. Refused with nothing spent if your bounty is below 1; otherwise it lands instantly on the other fighter, wherever they are.',
      effects: [
        { tag: 'resource', label: 'Cost', detail: 'The entire bounty, spent on cast and reset to zero — including the fractional part.' },
        { tag: 'control', label: 'Duration', detail: 'One second per whole point of bounty, minimum 1s. 9 bounty is a 9 second aura; there is no upper limit.' },
        { tag: 'control', label: 'Slow', detail: 'Target move speed ×0.5 for the whole duration.' },
        { tag: 'debuff', label: 'Cooldowns doubled', detail: 'Target cooldown multiplier set to 2.0 — every ability they own takes twice as long to return.' },
        { tag: 'control', label: 'Projectile drag', detail: 'Any projectile within 120px of them flies at 15% of its speed and snaps back to full the moment it leaves the zone. The ability card calls this "slows projectiles 15%"; the kit multiplies by 0.15, which is an 85% slow.' },
        { tag: 'utility', label: 'Availability', detail: '10 second cooldown, so two heavy warrants a fight is realistic and a stream of 1-bounty ones is not.' },
      ],
      upgrade: {
        basics:
          'Recasting cancels the warrant early, forfeiting whatever was left of the sentence but leaving '
          + 'them a flat 25% slow for 5 seconds — and turning the clock on yourself instead: ×1.5 move '
          + 'speed, ×0.5 cooldowns, revolver reload down from 3s to 1.5s, and every projectile within 120px '
          + 'of you at 150% speed, including the ones aimed at you. It runs for the greater of 3 seconds '
          + 'and your highest-ever bounty this match, so cashing a 12-bounty warrant leaves the 12 on '
          + 'record for later.',
        effects: [
          { tag: 'cost', label: 'Ends the warrant', detail: 'The recast immediately cancels the aura on the enemy, forfeiting whatever was left of the sentence.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Parting slow', detail: 'They keep a flat 25% slow for 5 seconds as it drops.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Your own clock', detail: 'Move speed ×1.5 and cooldowns ×0.5 for the duration.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Faster gunwork', detail: 'Revolver reload drops from 3s to 1.5s, and every projectile within 120px of you travels at 150% speed — including the ones being shot at you.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Duration', detail: 'The greater of 3 seconds and your highest-ever bounty this match, in seconds. Cashing a 12-bounty warrant leaves the 12 on record, so a later recast still runs 12 seconds.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The high-water mark never resets, so the ideal line is to bank one enormous bounty early and then spend small ones — every later Bounty Hunter is still paid at the peak.',
        'Speeding up projectiles inside your own aura is genuinely two-edged: incoming fire arrives 50% sooner as well.',
      ],
    },

    'time-timeless': {
      basics:
        'Two presses. The first converts your whole bounty into Time Energy at 1000ms a point and '
        + 'zeroes it, clamped at the 10,000ms cap with the surplus thrown away. A press made while the '
        + 'bar is already full stops time for 5 seconds: the enemy\'s velocity is zeroed and restored '
        + 'exactly on resume, and every projectile in the world is frozen and released untouched. During '
        + 'the stop Click fires a 900px hitscan beam that hangs in the air — three shots, each resolving '
        + 'the instant time resumes for 25 damage to anything within 30px of its line. A grey full-screen '
        + 'wash, a 260ms shake, and your character frozen blue. No cooldown at all; the bar is the only '
        + 'gate.',
      cast:
        'Q, and it takes two presses. The first converts bounty into Time Energy. Only a press made '
        + 'while the bar is already full stops time — so you press once to load, then once to fire.',
      effects: [
        { tag: 'resource', label: 'Conversion', detail: 'Every press adds 1000ms of energy per point of bounty (fractions included) and zeroes the bounty. Clamped at the 10,000ms cap; the surplus is thrown away.' },
        { tag: 'control', label: 'Time stop', detail: '5 seconds. The enemy\'s velocity is zeroed and restored exactly on resume, and every projectile in the world — yours and theirs — is frozen and released untouched.' },
        { tag: 'damage', label: 'The rifle', detail: 'Click fires a 900px hitscan beam that hangs in the air. Every beam resolves the moment time resumes for 25 damage to anything within 30px of its line. Three shots.' },
        { tag: 'utility', label: 'The look of it', detail: 'A grey full-screen wash, a 260ms camera shake, and your character frozen over in blue for the duration.' },
        { tag: 'utility', label: 'Availability', detail: 'No cooldown at all. The energy bar is the only gate.' },
      ],
      upgrade: {
        basics:
          'After the third shot a reload minigame starts by itself — the shop card says you press Q, but '
          + 'the kit opens it for you. It runs 1.5 seconds with three bands at 10–25%, 42–57% and 72–87%; '
          + 'click while the marker is inside each. Caught bands turn green, missed ones red, and only all '
          + 'three reloads the full 3 shots — anything less gives nothing back. It runs on the same '
          + '5-second clock as the stop and is abandoned unfinished if time resumes mid-bar.',
        effects: [
          { tag: 'utility', label: 'When it starts', detail: 'Automatically, the instant the third shot is fired — the shop card describes pressing Q to begin it, but the kit starts it for you.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The minigame', detail: '1.5 seconds long (the card says 1). Three bands at 10–25%, 42–57% and 72–87% of the bar; click while the marker is inside each one. Bands you have caught turn green, ones you missed turn red.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Payoff', detail: 'All three caught reloads the full 3 shots. Anything less is a failed reload and gives nothing back.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'It costs stopped time', detail: 'The reload runs on the same 5 second clock as the stop, and is abandoned unfinished if time resumes mid-bar.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Nothing but the rifle works during Always Noon. E, R, F and Q are all ignored for the full 5 seconds — the trade for stopping the world is that you may only shoot.',
        'The in-match status tray says your cooldowns are free during the stop; the kit does not actually change your cooldown multiplier. The NPC version of this ability does (its multiplier goes to 0.001), and it only runs 3 seconds rather than 5.',
        'Because the enemy cannot move while frozen, the beams resolving "where they are on resume" is the same as where they were when you fired — the shot is only wasted if they were never on the line.',
        'Rifle hits count toward the Sharpshooter requirement of Time Mastery (10 needed).',
        'Clicks in the first 200ms of a rifle reload are ignored, the same forgiveness the revolver bar has.',
      ],
    },
  },

  perks: {
    purge: {
      basics:
        'Recast R while Remain is already running, once per match. The window gains 3 seconds — 6 of '
        + 'total absorb instead of 3 — and the deferred 80% is never applied at all: everything absorbed '
        + 'is simply gone. The cost is that R cannot be cast again for the rest of the match, neither the '
        + 'perk nor a fresh Remain. The dial repaints to heat tones and throws a red ring as you commit, '
        + 'so both players can see the debt has been voided.',
      cast: 'R again while Remain is already running. Available once per match.',
      effects: [
        { tag: 'buff', label: 'Longer window', detail: 'Adds 3 seconds to the current Remain — 6 seconds of total absorb instead of 3.' },
        { tag: 'heal', label: 'The debt is cancelled', detail: 'The deferred 80% is never applied. Everything absorbed during the whole window is simply gone.' },
        { tag: 'cost', label: 'Locked out', detail: 'R cannot be cast again for the rest of the match — not the perk recast and not a fresh Remain.' },
        { tag: 'utility', label: 'The tell', detail: 'The dial repaints to heat tones and a red ring throws out at the moment you commit, so both players can see the debt has been voided.' },
      ],
      notes: [
        'The absorbed total still counts toward Time Mastery\'s Immovable requirement, so purging costs you nothing on that front.',
        'Best held for an enemy ultimate: a purged Remain eaten a wall of damage is the largest single swing in the kit.',
      ],
    },
  },

  mastery: {
    'passive-manipulation': {
      basics:
        'Always on, starting in Focus, with Space flipping between two world speeds on a 5-second '
        + 'switch cooldown — the dash itself still happens. Focus runs the world at 0.5×, Rush at 1.5×, '
        + 'and in both cases it is both fighters and every projectile in the air. It scales physics '
        + 'bodies, projectiles and visual tweens only: ability cooldowns, burn ticks and every other '
        + 'timer run on the real clock and are deliberately untouched.',
      cast: 'Passive, always on, starting in Focus. Dash (Space) flips between the two; the dash itself still happens.',
      effects: [
        { tag: 'utility', label: 'Focus', detail: 'The world runs at 0.5×. Both fighters move at half speed and every projectile in the air flies at half speed.' },
        { tag: 'utility', label: 'Rush', detail: 'The world runs at 1.5×. Both fighters and every projectile move half again as fast.' },
        { tag: 'utility', label: 'Switching', detail: 'Space flips the mode with a 5 second cooldown on switching. The flip is instant and free otherwise.' },
        { tag: 'utility', label: 'What it scales', detail: 'Physics bodies, projectiles and visual tweens. Ability cooldowns, burn ticks and every other timer run on the real clock and are untouched — deliberately, because kits mix loop time and scene time.' },
      ],
      notes: [
        'It is symmetrical. Focus does not slow them relative to you; it slows the whole arena, which favours the fighter whose damage does not depend on landing fast shots.',
        'Focus makes your ageing revolver rounds spend far longer in the air, so they arrive nearer their 12 damage ceiling — the ramp is on the real clock while the flight is not.',
        'Your own Time Bomb flies on the mode you are in. An online opponent\'s bomb does not — their mode is not synced, so theirs travels at face value.',
      ],
    },
    'time-bomb': {
      basics:
        'A bindable bomb that takes its slot over from Time\'s own ability, in three presses: throw, '
        + 'arm, detonate. It flies 430 px/s and sticks to anything within 26px, dying unspent after 560px '
        + 'with a MISSED. Once stuck it ripens from 10 damage to 50 over 30 seconds, drawn live in the '
        + 'victim\'s status tray, and detonates for a 72px blast centred on their body. Arming closes a '
        + 'ring from 130px onto the 13px casing over 1.4 seconds; detonating while the ring is within '
        + '12px of the casing is ×1.5, so a ripe bomb on the beat is 75. Left alone the ring lands and '
        + 'the bomb goes off by itself for normal damage — waiting costs the bonus, not the bomb. 14s '
        + 'cooldown from the throw, one bomb per side, and while yours is live the bound key belongs to '
        + 'the bomb.',
      cast:
        'Bindable to E, R, F or Q, and it takes that slot over from Time\'s own ability. Three presses: '
        + 'throw, arm, detonate.',
      effects: [
        { tag: 'damage', label: 'Ripening', detail: '10 damage the moment it sticks, climbing linearly to 50 damage after 30 seconds on the victim. The number is drawn live in their status tray.' },
        { tag: 'area', label: 'Blast', detail: '72px radius, centred on the casing — which is riding their body, so it is centred on them.' },
        { tag: 'buff', label: 'On the beat', detail: '×1.5 damage if the third press lands while the closing ring is within 12px of the casing. A ripe bomb detonated on the beat is 75 damage.' },
        { tag: 'utility', label: 'The throw', detail: '430 px/s, sticking to anything it passes within 26px of. It dies unspent after 560px of travel and says MISSED.' },
        { tag: 'utility', label: 'Arming', detail: 'The ring starts at 130px and closes onto the 13px casing over 1.4 seconds. Left alone it lands and the bomb goes off by itself for normal damage — waiting costs you the bonus, not the bomb.' },
        { tag: 'utility', label: 'Availability', detail: '14 second cooldown, counted from the throw. A bomb left to ripen for half a minute is free.' },
        { tag: 'cost', label: 'One at a time', detail: 'One bomb per side. While yours is live the bound key is the bomb\'s and cannot cast the ability it replaced.' },
      ],
      notes: [
        'The bomb dies with its victim. Killing somebody wearing a ripe bomb wastes it.',
        'A bomb still in flight ignores presses entirely — the arm press only registers once it has stuck.',
        'The cooldown bar for the bound slot reads full for as long as a bomb is live, because the next press is an arm or a detonation rather than a new throw.',
      ],
    },
  },
};

export default sand;
