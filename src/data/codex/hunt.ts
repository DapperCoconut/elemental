import { ElementCodex } from '../AbilityCodex';

/**
 * Hunt — the only element in the game that takes the controls off you.
 *
 * Three forms, fifteen keys. Verified against `src/elements/hunt.ts`, `kits/HuntKit.ts`, the
 * hunt block of `data/Upgrades.ts`, the Rage perk in `data/Perks.ts`, the Hell divine perk in
 * `data/DivinePerks.ts` and the hunt entry in `data/Mastery.ts`.
 *
 * Passives carry a `form` index: 0 human, 1 beast, 2 hybrid. A passive with no form shows on
 * every tab.
 */
const hunt: ElementCodex = {
  identity:
    'A man with a crossbow and the thing living inside him, taking turns. Human form is a patient '
    + 'weapons platform — bolts that stay in the body, a shotgun, frag grenades, a scent trail to '
    + 'run on. Then the clock runs out, the beast comes out whether you asked or not, and for '
    + 'twelve seconds you are teeth and momentum instead. The Q upgrade offers a third answer: '
    + 'keep the gun *and* the claws, and pay for it by handing the body over every ten seconds.',

  passives: [
    {
      emoji: '🏹',
      name: 'Buried Bolts',
      magic:
        'A crossbow bolt that hits does not fall out. It stays in the wound, riding the body as '
        + 'it moves, and it is a resource rather than a trophy — the claw uses it as a handle, the '
        + 'shop upgrade turns it into a transmitter, and the beastling goes for whoever is already '
        + 'punctured. Every form of Hunt is either planting bolts or spending them.',
      effects: [
        { tag: 'utility', label: 'They stick', detail: 'Up to 3 bolts can be buried in one body at a time. A fourth simply passes through without lodging — and the limit counts every bolt in that body, including the opposing hunter\'s.' },
        { tag: 'utility', label: 'They ride along', detail: 'A bolt keeps its offset from the victim\'s centre and its entry angle, so it tracks the body wherever it runs.' },
        { tag: 'damage', label: 'What they are for', detail: 'Slash rips the newest one out for 15 instead of 5, the mastery beastling bites a studded target for double, and Tracking Arrows pings off them.' },
        { tag: 'cost', label: 'They are lost on death', detail: 'Every bolt in a body is discarded the moment it dies. Nothing carries over between kills.' },
      ],
    },
    {
      emoji: '🐺',
      name: "The Beast's Body",
      form: 1,
      magic:
        'The beast is not a buff on the hunter — it is a different animal wearing him. The sprite '
        + 'changes, the silhouette swells, all five keys are replaced, and the crossbow is gone '
        + 'because the hands it needed are claws now.',
      effects: [
        { tag: 'movement', label: 'Speed', detail: '×1.5 move speed for as long as it holds. It multiplies with the trail bonus, so a beast running its own tracks is at ×2.25.' },
        { tag: 'cost', label: 'A bigger target', detail: 'Scale 1.2 and a 26px collision circle in place of the hunter\'s 22px — you are easier to hit than you were.' },
        { tag: 'utility', label: 'A different kit', detail: 'Click/E/R/F/Q become Slash, Pounce, Roar, Grapple and Blood Scent. Nothing from human form is available.' },
        { tag: 'utility', label: 'No weapon', detail: 'The crossbow and shotgun are put away entirely — the rig carries nothing and the fists grow claws.' },
      ],
    },
    {
      emoji: '👹',
      name: 'Possession',
      form: 2,
      magic:
        'The price of keeping both halves. Every ten seconds the beast\'s spirit simply takes the '
        + 'body: it howls, points itself at whatever is nearest, and runs it down swinging. You are '
        + 'a passenger for three seconds — no movement, no abilities, not even the mastery whistle. '
        + 'Nothing else in the game does this to you.',
      effects: [
        { tag: 'cost', label: 'The seizure', detail: '3s of lost control, arriving 10s after you enter hybrid form and every 13s after that (10s of freedom plus the 3s it holds).' },
        { tag: 'cost', label: 'No input at all', detail: 'WASD is ignored, every key is swallowed, and your speed multiplier is forced to 0 so only the spirit can move you.' },
        { tag: 'damage', label: 'What it does with you', detail: 'Charges the nearest enemy at ×1.35 of your move speed and swings Slash every 0.38s once it is within 80px — 5 damage a swing, 15 if that body has one of your bolts in it.' },
        { tag: 'utility', label: 'Hands back cleanly', detail: 'The controls are returned exactly once, with a "You have it back." notice, even if you used Give In mid-seizure.' },
      ],
      notes: [
        'The beast clock does not run while you are hybrid — Release the Beast can never fire on you here. Possession is what replaces it.',
      ],
    },
  ],

  abilities: {
    // ── Human form ─────────────────────────────────────────────────────
    'hunt-crossbow': {
      magic:
        'A spanned crossbow, loosed at the cursor. The bolt is fast and it is heavy, and it does '
        + 'not vanish on impact — it buries itself in whatever it hit and stays there. Watch the '
        + 'string on the rig: it hauls back over the reload and the bolt slides into the groove as '
        + 'it finishes, so you can *see* when the next shot is ready.',
      cast: 'Click at the cursor. 1.25s reload — but casting any other human-form ability cancels the reload outright and hands the bolt straight back.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '30 damage on the body it hits.' },
        { tag: 'utility', label: 'The bolt', detail: 'Launches at 780 px/s from 22px in front of you, connects within 24px of a body, and expires after 3s or at the arena edge.' },
        { tag: 'utility', label: 'It stays in', detail: 'Buries itself in the target — up to 3 bolts per body — and rides them from then on.' },
        { tag: 'utility', label: 'The reload trick', detail: 'Blast, Grenade and Hunter\'s Trail all reset the crossbow to zero, so human form\'s rhythm is bolt → ability → bolt, not standing still and plinking.' },
      ],
      upgrade: {
        magic:
          'Tracking Arrows turns every buried bolt into a transmitter. The more of them are in the '
          + 'same body, the more often they call home — a shockwave off the wound that tells you '
          + 'exactly where the quarry is. The information is free; the legs to use it are not.',
        effects: [
          { tag: 'utility', label: 'The ping', detail: 'A 74px shockwave off the most-studded enemy: every 9s with 1 bolt in them, every 6s with 2, every 3s with 3.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'The reward', detail: '+25% move speed for 2s on each ping — but only while you are in beast or hybrid form. As a human you get the ping and nothing else.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Counted per body', detail: 'The period comes from the single most-studded enemy, so three bolts in one target beats one bolt each in three.', requiresUpgrade: 'click' },
        ],
      },
    },

    'hunt-blast': {
      magic:
        'The shotgun comes off his back for one shell and goes away again. It is resolved as a '
        + 'cone rather than a spray of pellets — everything inside the wedge is hit at once — and '
        + 'the damage is almost beside the point. What Blast is for is throwing a body across the '
        + 'arena, which is why it holds charges instead of running on a cooldown.',
      cast: 'E, aimed at the cursor. Two charges; 0.4s between shots.',
      effects: [
        { tag: 'damage', label: 'The cone', detail: '15 damage to everything within 168px inside a 50° wedge (±25° off your aim).' },
        { tag: 'control', label: 'Knockback', detail: '620 px/s away from you, applied to anything the cone catches. Knockback-immune and unstoppable targets ignore it.' },
        { tag: 'resource', label: 'Charges', detail: '2 held. One refills every 6s, one at a time — the recharge clock only starts on the shot that emptied it.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s between shots on top of the charge cost, and it reloads the crossbow.' },
      ],
      upgrade: {
        magic:
          'Mine Blast stops it being a tap. Hold E and the barrel packs itself — a ring closing on '
          + 'the muzzle, four powder ticks riding it round — and the longer you hold the harder it '
          + 'comes out. Take it all the way and the ring snaps white, the screen kicks, and whatever '
          + 'was in front of you stops being able to move.',
          effects: [
          { tag: 'damage', label: 'Charged damage', detail: 'Scales linearly with hold time from 15 at a tap to 35 at a full 3s charge.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Full-charge stun', detail: 'A 3s hold also stuns everything the cone catches for 3s — they are frozen in place, not slowed.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Readable wind-up', detail: 'The closing muzzle ring and the yellow charge bar under your health both read the same number, and it turns white at full.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Nothing fires while you hold', detail: 'E becomes hold-and-release, so a tap that used to be instant now needs a deliberate let-go.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'A charged shot at full power is worth chaining into Slash — the +5 stunned-target bonus from the Click upgrade lands on anything Mine Blast pinned.',
      ],
    },

    'hunt-grenade': {
      magic:
        'A frag lobbed underarm, tumbling as it goes. It travels a fixed distance and then sits '
        + 'there ticking — the fuse does not care where it landed or whether anyone is near it. '
        + 'Three seconds is long enough to be read and walked out of, which is why the grenade is '
        + 'mostly an area-denial tool and only occasionally a kill.',
      cast: 'R toward the cursor. The throw is a fixed 145px whatever the cursor distance.',
      effects: [
        { tag: 'damage', label: 'Detonation', detail: '35 damage to everything within 130px of where it settled.' },
        { tag: 'area', label: 'The throw', detail: 'Flies at 500 px/s, stops dead at 145px from where you stood, and spins while airborne.' },
        { tag: 'utility', label: 'The fuse', detail: '3s from the throw, always. Nothing shortens it and nothing sets it off early.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, and it reloads the crossbow.' },
      ],
      upgrade: {
        magic:
          'Grenade Combo lets you shoot your own frag out of the air. The bolt swallows the blast '
          + 'whole — the grenade is gone, and the bolt is now carrying it. Where that bolt lands, '
          + 'the grenade goes off, on your timing rather than the fuse\'s.',
        effects: [
          { tag: 'utility', label: 'The pickup', detail: 'Any of your own bolts passing within 22px of your own un-fetched grenade converts. The grenade is consumed and the bolt turns into a bomb bolt.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Direct hit', detail: '35 damage to the body it hits, in place of the usual 30.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Blast', detail: 'A further 35 in a 92px radius around the impact, to everything except the body it hit directly.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'A miss is wasted', detail: 'A bomb bolt that expires without hitting anything only puffs — it deals no damage at all. You spent the grenade for nothing.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Catching enemies in grenade explosions is one of the four Hunt Mastery requirements (50 hits). Bomb-bolt blasts count toward it too.',
      ],
    },

    'hunt-trail': {
      magic:
        'You take the scent. For the next eight seconds your quarry leaves a track behind them '
        + 'wherever they go — pairs of bloody paw prints pressed into the floor, still steaming — '
        + 'and the tracks are yours to run on, not theirs. It is the closest thing Hunt has to a '
        + 'movement ability, and it is entirely dependent on where the other player chose to walk.',
      cast: 'F. No aim — it marks whoever is nearest and starts recording immediately.',
      effects: [
        { tag: 'summon', label: 'The tracks', detail: 'A print laid at the quarry\'s feet every 0.15s for 8s. Each mark is 30px across and lasts 4s.' },
        { tag: 'buff', label: 'Running the trail', detail: '×1.5 move speed while you are standing on any of your own marks. It multiplies with beast form, so a beast on the trail is at ×2.25.' },
        { tag: 'utility', label: 'It follows them', detail: 'The marks are laid where the *enemy* is, not where you are — you can only use a route they already took.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown, and it reloads the crossbow.' },
      ],
      upgrade: {
        magic:
          'Enhanced Scent makes the track a hunting ground rather than a road. In the beast it is '
          + 'faster still, and anything you land while your feet are in their prints comes away '
          + 'slower — you are cutting them off from their own escape route.',
        effects: [
          { tag: 'buff', label: 'Beast on the scent', detail: 'A further ×1.25 speed while in beast form standing on the trail — ×2.81 all in with beast form itself.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Hits from the tracks', detail: 'Any damage you deal from any source while standing on your own mark slows the victim to ×0.8 speed for 3s.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Every source counts', detail: 'The slow is routed through one place in the kit, so bolts, blasts, grenades, claws, pounces, the hook and Wall Slam all apply it.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The Rage perk holds the marks for 6s instead of 4, and the mastery beastling runs 1.5× faster over them.',
      ],
    },

    'hunt-release-beast': {
      magic:
        'Not a button. A countdown. Thirty seconds into the fight the thing inside gets out '
        + 'regardless of what you were doing — the screen shakes, the sprite changes, and the whole '
        + 'ability bar is replaced with claws for twelve seconds. Then it lets go, hands you back, '
        + 'and starts counting again. The Q bar shows you which half of the cycle is running.',
      cast: 'Nothing to press. Fires on its own timer. With the Q upgrade owned, pressing Q in human form does something else entirely — see below.',
      effects: [
        { tag: 'utility', label: 'The clock', detail: 'First transform 30s into the match, then 12s as the beast, then 50s before it can take you again.' },
        { tag: 'buff', label: 'What you become', detail: 'Beast form: ×1.5 move speed, scale 1.2, a 26px hitbox, and Slash / Pounce / Roar / Grapple / Blood Scent on the five keys.' },
        { tag: 'cost', label: 'You do not choose', detail: 'It fires mid-reload, mid-charge and mid-anything. Blast charges, the Mine Blast wind-up and hybrid pumps are all cleared on the way in.' },
        { tag: 'utility', label: 'Readable', detail: 'The Q bar counts down the 12s while you are the beast and fills toward the next transform while you are not.' },
      ],
      upgrade: {
        magic:
          'Hybrid Form. Q stops being a clock and becomes a door: you keep the shotgun and take the '
          + 'claws with it, silver-tinted and permanently on edge. The beast never comes out on the '
          + 'timer again — because it does not have to wait. It takes the body every ten seconds '
          + 'instead, for three seconds at a time, and there is nothing you can do about that.',
        effects: [
          { tag: 'utility', label: 'A third form', detail: 'Q in human form transforms into Hybrid: Shotgun Blast, Tactical Roll, Hook, Adrenaline and Give In, at scale 1.1 with a 24px hitbox.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Hybrid speed', detail: '×1.25 move speed — between the hunter and the beast.' , requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Possession', detail: 'The beast seizes the body for 3s every 10s while hybrid. See the Possession passive on the Hybrid tab.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'The door locks behind you', detail: 'The beast clock does not run in hybrid form, so you can never become the ordinary 12s beast again. The only way back to four legs is Give In, and that one is permanent.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Killing while in human form is one of the four Hunt Mastery requirements (100 kills), and hybrid kills are a separate one (50) — so the Q upgrade is effectively required to finish the mastery.',
      ],
    },

    // ── Beast form ─────────────────────────────────────────────────────
    'hunt-slash': {
      magic:
        'A claw raked across the front of you. On its own it is almost nothing — five damage, the '
        + 'cheapest attack in the element. What makes it a weapon is what the hunter left behind: a '
        + 'bolt standing out of the body is a handle, and the beast goes for it, tears it out, and '
        + 'the wound it opens is worth three ordinary swipes.',
      cast: 'Click. Hits everything within 80px in the forward half-circle (±90° off your aim).',
      effects: [
        { tag: 'damage', label: 'Clean swipe', detail: '5 damage.' },
        { tag: 'damage', label: 'Ripping a bolt', detail: '15 damage instead, and the newest bolt in that body is pulled out and destroyed. One bolt per swing.' },
        { tag: 'area', label: 'Reach', detail: '80px, in a 180° arc in front of you. It is a melee ability with a generous cone, not a point attack.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s cooldown — Blood Scent and Alpha both shorten it further.' },
      ],
      upgrade: {
        magic:
          'Press Advantage. If something is already on the floor and unable to move, the beast '
          + 'stops being careful about it.',
        effects: [
          { tag: 'damage', label: 'Against a stunned target', detail: '+5 damage — 10 on a clean swipe, 20 on one that rips a bolt out.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'What counts as stunned', detail: 'Any stun, from any source: your own full-charge Mine Blast, Wall Slam, the Grapple hold, or another element\'s.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'This is the attack the Possession passive uses when the spirit is driving your body in hybrid form.',
      ],
    },

    'hunt-pounce': {
      magic:
        'The beast throws itself forward and lands in a full-body rake. It covers the ground fast '
        + 'enough that the lunge itself is a dodge, and the payload is at the far end, not the near '
        + 'one — the point is to arrive on top of somebody, not to get away from them.',
      cast: 'E toward the cursor. Movement is locked to the lunge for its 0.22s and hands back afterwards.',
      effects: [
        { tag: 'movement', label: 'The leap', detail: '215px in 0.22s — roughly 977 px/s while it lasts.' },
        { tag: 'damage', label: 'The landing', detail: '25 damage to everything within 88px of where you touch down, resolved at the end of the lunge.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        magic:
          'Searing Slash leaves the gashes in the floor instead of on the body. Three of them, cut '
          + 'across your landing arc, still hot enough to hurt anything that walks through — the '
          + 'beast turning its own arrival into a minefield.',
        effects: [
          { tag: 'summon', label: 'The gashes', detail: 'Three burning cuts, fanned ±0.5 rad around your landing heading, 34px out from where you touched down.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Burning ground', detail: '4 damage per patch, once every 0.5s, to anything within 26px of it.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'How long they last', detail: '6s each, fading visibly as they cool.', requiresUpgrade: 'e' },
        ],
      },
    },

    'hunt-roar': {
      magic:
        'The throat opens and a wall of sound goes out — nested jaw-arcs sweeping down the aim with '
        + 'fangs standing off the leading edge. The cone runs to the far corner of the arena, so at '
        + 'range this is a control tool, and up close it is a panic button: connecting with anything '
        + 'at all buys you five seconds of armour you did not have.',
      cast: 'R toward the cursor. Instant. The cone reaches the full diagonal of the arena.',
      effects: [
        { tag: 'debuff', label: 'The slow', detail: '×0.75 move speed for 5s on anything caught in the 30° cone (±15° off your aim).' },
        { tag: 'shield', label: 'The armour', detail: 'Hitting *anything* gives you ×0.67 incoming damage — a flat 33% reduction — for 5s. A roar that connects with nothing gives you nothing.' },
        { tag: 'area', label: 'Range', detail: 'The full arena diagonal — over 1000px on a standard arena — so anything you can see and are pointed at is inside it.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown.' },
      ],
      upgrade: {
        magic:
          'Primal Fear. They do not just slow down — they turn their backs and run, and for three '
          + 'seconds their hands are off the wheel entirely. This is a full control theft, not a '
          + 'debuff on their movement.',
        effects: [
          { tag: 'control', label: 'They flee', detail: 'Everything caught in the cone runs directly away from you at ×1.1 of its own speed for 3s, facing turned around.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'No input', detail: 'Their movement is overwritten every frame — this is loss of control, not a slow, and only an unstoppable target ignores it.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With the mastery beastling out, a Roar makes it throw its head back and join in for a further 20% slow over 5s — the two slows stack multiplicatively.',
      ],
    },

    'hunt-grapple': {
      magic:
        'A lunge that catches. Anything the beast runs through is snatched off the ground and held '
        + 'beside it for a second — neither of you can move, and they cannot act — and then it '
        + 'picks a direction and throws them. Where you point at the end is the whole ability: '
        + 'thrown into open ground it is a repositioning tool, thrown into a wall it is a kill.',
      cast: 'F toward the cursor. The lunge catches; the throw a second later goes wherever the cursor is *then*.',
      effects: [
        { tag: 'movement', label: 'The lunge', detail: '250px in 0.24s — about 1042 px/s. It catches the first body it comes within 46px of.' },
        { tag: 'control', label: 'The hold', detail: '1s pinned at 40px from you, velocity zeroed and stunned throughout. You are locked in place with them.' },
        { tag: 'control', label: 'The throw', detail: '780 px/s at the cursor for up to 0.7s — as far as 546px across the arena.' },
        { tag: 'utility', label: 'Only Grapple catches', detail: 'Pounce and the hybrid roll use the same lunge machinery but cannot grab; running through somebody mid-pounce does nothing.' },
        { tag: 'utility', label: 'Availability', detail: '10s cooldown.' },
      ],
      upgrade: {
        magic:
          'Wall Slam. The throw was always the ability; this makes the destination matter. Put them '
          + 'into the edge of the arena and they hit it hard enough to stop being a participant.',
        effects: [
          { tag: 'damage', label: 'Impact', detail: '20 damage when a thrown body reaches within 34px of any arena edge.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Stun', detail: '2s of full stun on the slam — long enough to walk over and open with a bolt-ripping Slash.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Once per throw', detail: 'The slam fires once and ends the flight; you cannot bounce somebody down a wall for repeat hits.', requiresUpgrade: 'f' },
        ],
      },
    },

    'hunt-blood-scent': {
      magic:
        'The beast smells that something is nearly finished and speeds up to close it out. This is '
        + 'a finisher and only a finisher — it refuses to fire at all unless there is already '
        + 'something on screen at or under 30% health. Cast it early and you have thrown away twenty '
        + 'seconds for a sentence of text.',
      cast: 'Q. No aim. Checks the field first and fizzles with "No blood in the air…" if nothing is wounded enough.',
      effects: [
        { tag: 'buff', label: 'Attack speed', detail: '×0.8 cooldowns for 8s — 25% more swings, on every ability the beast has.' },
        { tag: 'buff', label: 'Move speed', detail: '×1.2 for the same 8s, on top of beast form\'s own ×1.5.' },
        { tag: 'cost', label: 'The gate', detail: 'Something you can hurt must already be at or below 30% of its max health. Nothing else satisfies it.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown.' },
      ],
      upgrade: {
        magic:
          'Blood Moon. Q raises the sky before it checks anything — a red wash across the arena, a '
          + 'swollen moon low in the corner with clouds dragging over its face — and under that '
          + 'moon the beast stays out longer and is far less fussy about what counts as wounded.',
        effects: [
          { tag: 'buff', label: 'The moon', detail: '20s of Blood Moon, repainting the whole arena and recolouring every hunt effect on your side.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Longer as the beast', detail: '+5s on the current transform, and +5s on every future timed transform raised while the moon is up.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'A lower bar', detail: 'The Blood Scent threshold rises from 30% to 50% health, so the buff fires on a target that is only half down.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'It feeds the pup', detail: 'A mastery beastling under the moon grows to 1.4× size, moves 35% faster and bites for 60% more.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The cooldown is stamped before the check runs, so a Blood Scent that fizzles still costs the full 20s. With the upgrade the moon goes up first and is kept even when the scent itself fails.',
      ],
    },

    // ── Hybrid form ────────────────────────────────────────────────────
    'hunt-hybrid-shotgun': {
      magic:
        'The same shotgun the hunter carried, held by something that is no longer entirely him. It '
        + 'is a straight downgrade from human Blast on paper — no charges, a longer wait, weaker '
        + 'knockback — and the reason to want it is that it is the only gun that still works while '
        + 'you have claws.',
      cast: 'Click at the cursor. 0.7s between shots. Locked out for half a second after each pump.',
      effects: [
        { tag: 'damage', label: 'The cone', detail: '15 damage to everything within 168px inside a 50° wedge.' },
        { tag: 'control', label: 'Knockback', detail: '434 px/s — 70% of what the human shotgun throws.' },
        { tag: 'utility', label: 'Availability', detail: '0.7s cooldown. No charge system: one shell at a time.' },
      ],
      upgrade: {
        magic:
          'Shotgun Pump. Right-click racks another shell into the same barrel, and the gauge over '
          + 'your shoulder fills a slot each time. Three is loaded. Four is overpacked — the last '
          + 'slot glows red, and the next trigger pull does not go down the barrel at all.',
        effects: [
          { tag: 'damage', label: 'Per pump', detail: '+5 damage per shell, to a safe maximum of 3 — 30 damage on a fully pumped shot instead of 15.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Racking time', detail: '0.5s per pump, during which you cannot fire. Three pumps is 1.5s of standing there.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Overpacked', detail: 'A fourth pump arms the failure. The next Click detonates in your hands: 35 damage in a 96px radius 46px in front of you, and 10 damage to yourself.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Readable', detail: 'A four-slot gauge floats over your shoulder — filled shells in amber, the fourth pulsing red once it is armed.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Pumps are lost on transform', detail: 'Give In clears the count, so a stacked gun cannot be carried into beast form.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The overpacked shot is an area attack centred in front of you rather than a cone — it is the one time this ability hits things that are not in your wedge.',
      ],
    },

    'hunt-roll': {
      magic:
        'A tumble in the direction you are pointing. Hybrid form has no other way out of a bad '
        + 'position — no pounce, no grapple — so this is the whole of its defensive kit, and on its '
        + 'own it is nothing but distance.',
      cast: 'E toward the cursor. Movement is locked to the roll for its 0.3s.',
      effects: [
        { tag: 'movement', label: 'The roll', detail: '215px in 0.3s — about 717 px/s.' },
        { tag: 'utility', label: 'Availability', detail: '4s cooldown.' },
      ],
      upgrade: {
        magic:
          'Nothing lands on you while you are tumbling. The roll stops being a repositioning tool '
          + 'and becomes a read — three tenths of a second of complete immunity, thrown at whatever '
          + 'you can see coming.',
        effects: [
          { tag: 'shield', label: 'Untouchable', detail: 'Full invincibility for the 0.3s of the roll. Everything is ignored, not reduced.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Ends exactly with the roll', detail: 'The immunity is dropped on the first frame after the tumble finishes — there is no grace window on either side.', requiresUpgrade: 'e' },
        ],
      },
    },

    'hunt-hook': {
      magic:
        'A grappling claw on a chain, thrown flat. It does not pull anything on its own — it latches '
        + 'and waits, chain hanging taut between you, until you press R again and start winching. '
        + 'The chain is drawn link by link and sags while it is still flying, so you can tell at a '
        + 'glance whether it has caught.',
      cast: 'R to throw at the cursor. R again while it is latched to reel. Only the throw pays the cooldown; the reel is free.',
      effects: [
        { tag: 'utility', label: 'The throw', detail: '800 px/s out to 340px, catching anything within 34px of the claw. It expires after 1.4s if it catches nothing.' },
        { tag: 'control', label: 'The reel', detail: 'Drags the latched body toward you at 640 px/s, ending when they are within 56px or 4s after the throw.' },
        { tag: 'utility', label: 'It waits', detail: 'A latched hook holds for up to 6s. You can shoot, roll and pump while it sits there and reel whenever you like.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown on the throw.' },
      ],
      upgrade: {
        magic:
          'Scrape. The chain takes the skin off on the way in — the longer the drag, the more it '
          + 'costs them. Hooking somebody across the whole arena is now worth doing for the trip '
          + 'itself, not just the destination.',
        effects: [
          { tag: 'damage', label: 'Per 100px dragged', detail: '12 damage, charged every full 100px of the pull. A 340px reel is 36 damage; a short one is nothing.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Only travelled distance counts', detail: 'A knockback-immune or unstoppable target is never actually dragged, so it never accrues scrape damage.', requiresUpgrade: 'r' },
        ],
      },
    },

    'hunt-adrenaline': {
      magic:
        'A needle straight into the shoulder. Eight seconds of everything at once — faster feet, '
        + 'harder hits — and then the bill: five seconds where you are slower and weaker than you '
        + 'started. It is a burst window with a debt attached, and the debt always lands.',
      cast: 'F. No aim, no channel.',
      effects: [
        { tag: 'buff', label: 'The high', detail: '×1.33 move speed and ×1.33 outgoing damage for 8s.' },
        { tag: 'cost', label: 'The crash', detail: '×0.75 move speed and ×0.75 outgoing damage for 5s the instant the high runs out.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown — the buff, the crash and the wait together are exactly 13s, so there is always a gap.' },
        { tag: 'utility', label: 'Readable', detail: 'Both halves appear in the status tray with their own timers.' },
      ],
      upgrade: {
        magic:
          'Adrenaline Junkie. Half the wait, and the crash can be pushed back — recast before it '
          + 'lands and it simply does not happen yet. It is still going to happen, and every time '
          + 'you postpone it you add twenty health to what it takes when it finally does.',
        effects: [
          { tag: 'utility', label: 'Faster cycle', detail: 'Cooldown drops from 12s to 6s, so the buff can be back before the crash would have finished.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Delaying', detail: 'Recasting while the high or the crash is running cancels the crash outright and restarts the 8s high.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'The bill', detail: '20 self-damage per delay, all of it paid at once on the crash you finally let land. Three delays is 60 health off the top.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Readable', detail: 'The Adrenaline tray entry shows a "×N delays" counter so you can see what you owe.', requiresUpgrade: 'f' },
        ],
      },
    },

    'hunt-give-in': {
      magic:
        'Stop fighting it. There is no timer on this one and no way back — the silver comes off, '
        + 'the fur sprite goes on, and you are the beast for the rest of the match. Everything '
        + 'hybrid form was is gone: no shotgun, no roll, no hook, no needle. What you get instead is '
        + 'the Alpha, which is a materially better beast than the one the clock gives you.',
      cast: 'Q, in hybrid form only. Instant, free, and permanent.',
      effects: [
        { tag: 'utility', label: 'Permanent transform', detail: 'Beast form with no expiry. Nothing reverts it and the beast clock never runs again.' },
        { tag: 'resource', label: 'What it costs', detail: 'Your pumps, your overpacked shell and any queued possession are cleared on the way through. Hybrid form is not recoverable.' },
        { tag: 'utility', label: 'No cooldown', detail: 'Free to cast, but there is only ever one opportunity to.' },
      ],
      upgrade: {
        magic:
          'Alpha. The beast that came out on purpose is ash-grey rather than blood-red, and it is '
          + 'a different animal from the one that gets dragged out on a timer — steadier, faster '
          + 'to swing, and much harder to put down.',
        effects: [
          { tag: 'shield', label: 'Damage resistance', detail: '×0.67 incoming damage permanently — a flat 33% reduction. It multiplies with Roar\'s own 33%, taking you to ×0.45 while both hold.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Cooldowns', detail: '×0.8 on every ability, permanently. Slash comes back in 0.32s instead of 0.4s.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'How it looks', detail: 'An ash-grey coat instead of the beast\'s red, so you can tell an Alpha from a timed transform on sight.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Alpha is not optional. Hybrid form only exists once the Q upgrade is bought, and Give In only exists in hybrid form — so anybody who can cast this always gets the Alpha.',
        'The upgrade card lists "20% faster attacks" and "20% shorter cooldowns" separately. They are the same thing: one 0.8 cooldown multiplier, applied once.',
      ],
    },
  },

  perks: {
    rage: {
      magic:
        'The tracks stop being a road and start being a fuse. Standing in your quarry\'s prints '
        + 'fills a meter, and when it tops out the thing inside does not wait for its clock — it '
        + 'comes out early, and while it is out the hunter\'s hide is worth twice what it was.',
      cast: 'Nothing to press. The meter fills on its own while you are standing on your own trail.',
      effects: [
        { tag: 'resource', label: 'Building rage', detail: '10 per second while you are standing on one of your own trail marks, to a cap of 100.' },
        { tag: 'summon', label: 'The early release', detail: 'At 100 the beast is dragged out immediately, whatever the clock said, and the meter resets to 0.' },
        { tag: 'shield', label: 'While it is out', detail: '×0.5 incoming damage for the whole of any beast form — a flat halving, on top of Roar and Alpha, which all multiply.' },
        { tag: 'buff', label: 'Longer tracks', detail: 'Trail marks last 6s instead of 4s, so a single Hunter\'s Trail gives you far more standing time to build with.' },
        { tag: 'cost', label: 'It needs their feet', detail: 'The meter only fills on marks the enemy laid, so a quarry that runs a straight line away from you gives you almost nothing to stand in.' },
      ],
      notes: [
        'It cannot fire while you are already the beast or hybrid — the meter simply sits at 100 until you are human again.',
      ],
    },
    hell: {
      magic:
        'The divine perk. What comes out of you is not the beast at all — it is a hellhound, '
        + 'smaller and charred black, that traded its hide away for teeth. It is the fastest thing '
        + 'in the element and the most fragile, and it changes nothing about how you play except '
        + 'how much the mistakes cost.',
      cast: 'Nothing to press. Every beast transform is a hellhound instead, timed or permanent.',
      effects: [
        { tag: 'buff', label: 'Damage', detail: '×1.3 outgoing on everything the beast does.' },
        { tag: 'buff', label: 'Attack speed', detail: '×0.833 cooldowns — 20% faster swings, and it stacks with Blood Scent and Alpha.' },
        { tag: 'movement', label: 'Speed', detail: '×1.3 on top of beast form\'s ×1.5, for ×1.95 all in — ×2.93 while running your own trail.' },
        { tag: 'cost', label: 'What it costs', detail: '×1.25 incoming damage. Everything hits you a quarter harder for as long as the hound is out.' },
        { tag: 'utility', label: 'A smaller target', detail: 'Scale 0.85 and an 18px hitbox instead of the beast\'s 26px — the one thing that partly repays the fragility.' },
        { tag: 'utility', label: 'How it looks', detail: 'A charred black-and-rust coat with its own palette, and the rig skips beast form\'s bulking-up entirely.' },
      ],
      notes: [
        'It is checked every frame rather than latched at transform time, so equipping or clearing it between matches can never leave you half-hellhound.',
      ],
    },
  },

  mastery: {
    'weak-points': {
      magic:
        'You start reading the seams. A red wedge sweeps slowly around every enemy on the field — '
        + 'inner and outer edge, tick marks along the rim, a crosshair pip riding the middle of the '
        + 'slice — and anything of yours that comes in through that wedge lands double. It is about '
        + 'the angle you attack from, not the weapon you attack with.',
      effects: [
        { tag: 'damage', label: 'The bonus', detail: '×2 damage on any hit whose approach angle falls inside the wedge.' },
        { tag: 'area', label: 'The wedge', detail: '60° wide (±30°), drawn between 24px and 54px out from the body, sweeping at 0.9 rad/s — about one full revolution every 7 seconds.' },
        { tag: 'utility', label: 'What qualifies', detail: 'Crossbow bolts and bomb bolts, both shotgun cones, Slash and Pounce. The angle is measured from where the attack came from, not from where you are standing now.' },
        { tag: 'utility', label: 'What does not', detail: 'The grenade, searing gashes, hook Scrape, Wall Slam, the bomb bolt\'s splash and the beastling\'s bite are all area or secondary damage and never double.' },
        { tag: 'utility', label: 'Readable', detail: 'A "🎯 WEAK POINT" callout and a rake right on the seam, throttled to one announcement every 0.35s so a cone does not spam it.' },
        { tag: 'cost', label: 'It cuts both ways', detail: 'A mastered Hunt opponent gets the same wedge sweeping around *you*, and it is drawn on your body for you to read.' },
      ],
      notes: [
        'Passive — no bind and no key. It is the reason Pounce is worth aiming rather than just aiming at.',
      ],
    },
    beastling: {
      magic:
        'You whistle and something small comes running. The beastling is an eager brown pup that '
        + 'trots at your heel, goes for whoever is closest, and — this is the part nobody expects — '
        + 'fetches your grenades. It takes the frag in its jaws, the fuse stops dead, and it sprints '
        + 'the thing across the arena and sets it off on somebody\'s ankles.',
      cast: 'Bindable to E, R or F in human form only. Q cannot take it, and the whistle does nothing while you are the beast or hybrid.',
      effects: [
        { tag: 'summon', label: 'The pup', detail: '15s of life, moving at 210 px/s. It aggroes anything within 420px and otherwise trots 46px behind you.' },
        { tag: 'damage', label: 'Bite', detail: '5 damage every 2s within 34px — 10 against any body that has a bolt buried in it.' },
        { tag: 'utility', label: 'Fetch', detail: 'Picks up your own grenade within 22px, freezes its fuse completely while carried, runs it to the nearest enemy and detonates it within 44px of them — the full 35 damage in 130px, delivered.' },
        { tag: 'debuff', label: 'It roars too', detail: 'Every Roar you cast makes the pup join in: ×0.8 enemy move speed for 5s, multiplying with your own ×0.75 rather than replacing it.' },
        { tag: 'buff', label: 'On the trail', detail: '×1.5 movement over your own Hunter\'s Trail marks, same as you get.' },
        { tag: 'buff', label: 'Under the Blood Moon', detail: '1.4× size, ×1.35 speed and ×1.6 bite damage — 8 a bite, 16 against a studded target.' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown, one pup at a time. The bar counts down the pup\'s own 15s while it is out and then refills.' },
      ],
      notes: [
        'A pup that runs out of time while carrying a grenade drops it with the remaining fuse restored — it does not swallow your frag.',
        'It cannot be hurt and it cannot die early; it simply expires.',
      ],
    },
  },
};

export default hunt;
