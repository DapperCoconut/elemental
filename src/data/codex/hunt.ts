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
      basics:
        'Crossbow bolts lodge in the bodies they hit — up to 3 per body, counting the opposing hunter\'s '
        + 'as well, with a fourth passing straight through. A buried bolt keeps its offset and entry '
        + 'angle so it rides the victim wherever they run. They are ammunition for everything else: Slash '
        + 'rips the newest one out for 15 instead of 5, the mastery beastling bites a studded target for '
        + 'double, and Tracking Arrows pings off them. Every bolt in a body is discarded the moment it '
        + 'dies.',
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
      basics:
        'The four-legged form. ×1.5 move speed — ×2.25 running your own trail — at scale 1.2 with a '
        + '26px hitbox instead of 22, so you are faster and easier to hit at once. The crossbow and '
        + 'shotgun are put away entirely and the five keys become Slash, Pounce, Roar, Grapple and Blood '
        + 'Scent; nothing from human form is available.',
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
      basics:
        'The price of hybrid form. Ten seconds after you transform, and every 13 seconds after that, '
        + 'the beast takes the body for 3 seconds: WASD is ignored, every key is swallowed and your speed '
        + 'multiplier is forced to 0, so only the spirit moves you. It charges the nearest enemy at ×1.35 '
        + 'of your move speed and swings Slash every 0.38s once inside 80px — 5 damage a swing, 15 into a '
        + 'body holding one of your bolts. Control is handed back exactly once, with a notice, even if '
        + 'you used Give In mid-seizure.',
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
      basics:
        '30 damage to the body it hits, launched at 780 px/s from 22px in front of you, connecting '
        + 'within 24px and expiring after 3 seconds or at the arena edge. The bolt buries itself in the '
        + 'target and rides them from then on. The reload is 1.25s, but casting Blast, Grenade or '
        + 'Hunter\'s Trail cancels it outright and hands the bolt straight back — human form\'s rhythm is '
        + 'bolt, ability, bolt.',
      cast: 'Click at the cursor. 1.25s reload — but casting any other human-form ability cancels the reload outright and hands the bolt straight back.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '30 damage on the body it hits.' },
        { tag: 'utility', label: 'The bolt', detail: 'Launches at 780 px/s from 22px in front of you, connects within 24px of a body, and expires after 3s or at the arena edge.' },
        { tag: 'utility', label: 'It stays in', detail: 'Buries itself in the target — up to 3 bolts per body — and rides them from then on.' },
        { tag: 'utility', label: 'The reload trick', detail: 'Blast, Grenade and Hunter\'s Trail all reset the crossbow to zero, so human form\'s rhythm is bolt → ability → bolt, not standing still and plinking.' },
      ],
      upgrade: {
        basics:
          'Your bolts start pinging: a 74px shockwave off the most-studded enemy every 9 seconds with 1 '
          + 'bolt in them, every 6 with 2, every 3 with 3. Each ping also gives +25% move speed for 2 '
          + 'seconds — but only in beast or hybrid form; as a human you get the ping and nothing else. The '
          + 'period comes from the single most-studded body, so three bolts in one target beats one bolt '
          + 'each in three.',
        effects: [
          { tag: 'utility', label: 'The ping', detail: 'A 74px shockwave off the most-studded enemy: every 9s with 1 bolt in them, every 6s with 2, every 3s with 3.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'The reward', detail: '+25% move speed for 2s on each ping — but only while you are in beast or hybrid form. As a human you get the ping and nothing else.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Counted per body', detail: 'The period comes from the single most-studded enemy, so three bolts in one target beats one bolt each in three.', requiresUpgrade: 'click' },
        ],
      },
    },

    'hunt-blast': {
      basics:
        'A shotgun cone: 15 damage to everything within 168px inside a 50° wedge, throwing them 620 '
        + 'px/s away from you unless they are knockback-immune. You hold 2 charges and one refills every '
        + '6 seconds, one at a time, with the clock starting on the shot that emptied it. 0.4s between '
        + 'shots, and firing reloads the crossbow.',
      cast: 'E, aimed at the cursor. Two charges; 0.4s between shots.',
      effects: [
        { tag: 'damage', label: 'The cone', detail: '15 damage to everything within 168px inside a 50° wedge (±25° off your aim).' },
        { tag: 'control', label: 'Knockback', detail: '620 px/s away from you, applied to anything the cone catches. Knockback-immune and unstoppable targets ignore it.' },
        { tag: 'resource', label: 'Charges', detail: '2 held. One refills every 6s, one at a time — the recharge clock only starts on the shot that emptied it.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s between shots on top of the charge cost, and it reloads the crossbow.' },
      ],
      upgrade: {
        basics:
          'E becomes hold-and-release. Damage scales linearly with the hold, from 15 at a tap to 35 at a '
          + 'full 3 seconds, and a full 3-second charge also freezes everything the cone catches in place '
          + 'for 3 seconds. The closing muzzle ring and the yellow bar under your health both read the same '
          + 'number and turn white at full — but nothing fires while you hold, so what used to be instant '
          + 'now needs a deliberate let-go.',
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
      basics:
        'Throws a grenade that flies 500 px/s, stops dead at a fixed 145px whatever the cursor '
        + 'distance, and detonates 3 seconds after the throw for 35 damage within 130px. Nothing shortens '
        + 'the fuse and nothing sets it off early. 6s cooldown, and it reloads the crossbow.',
      cast: 'R toward the cursor. The throw is a fixed 145px whatever the cursor distance.',
      effects: [
        { tag: 'damage', label: 'Detonation', detail: '35 damage to everything within 130px of where it settled.' },
        { tag: 'area', label: 'The throw', detail: 'Flies at 500 px/s, stops dead at 145px from where you stood, and spins while airborne.' },
        { tag: 'utility', label: 'The fuse', detail: '3s from the throw, always. Nothing shortens it and nothing sets it off early.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, and it reloads the crossbow.' },
      ],
      upgrade: {
        basics:
          'Any of your own bolts passing within 22px of your own un-fetched grenade converts: the grenade '
          + 'is consumed and the bolt becomes a bomb bolt worth 35 on the body it hits — in place of the '
          + 'usual 30 — plus 35 more in a 92px radius to everything except that body. A bomb bolt that '
          + 'expires without hitting anything only puffs and deals nothing at all, so you spent the grenade '
          + 'for nothing.',
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
      basics:
        'Marks whoever is nearest and records their footsteps: a 30px print at the quarry\'s feet every '
        + '0.15s for 8 seconds, each lasting 4 seconds. Standing on any of your own marks gives you ×1.5 '
        + 'move speed, multiplying with beast form for ×2.25. The tracks are laid where the enemy is, not '
        + 'where you are, so you can only use a route they have already taken. 12s cooldown, and it '
        + 'reloads the crossbow.',
      cast: 'F. No aim — it marks whoever is nearest and starts recording immediately.',
      effects: [
        { tag: 'summon', label: 'The tracks', detail: 'A print laid at the quarry\'s feet every 0.15s for 8s. Each mark is 30px across and lasts 4s.' },
        { tag: 'buff', label: 'Running the trail', detail: '×1.5 move speed while you are standing on any of your own marks. It multiplies with beast form, so a beast on the trail is at ×2.25.' },
        { tag: 'utility', label: 'It follows them', detail: 'The marks are laid where the *enemy* is, not where you are — you can only use a route they already took.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown, and it reloads the crossbow.' },
      ],
      upgrade: {
        basics:
          'A further ×1.25 speed on the trail while in beast form — ×2.81 all in — and any damage you '
          + 'deal from any source while standing on your own mark slows the victim to ×0.8 speed for 3 '
          + 'seconds. The slow is routed through one place in the kit, so bolts, blasts, grenades, claws, '
          + 'pounces, the hook and Wall Slam all apply it.',
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
      basics:
        'Not something you press. The beast takes you 30 seconds into the match, holds for 12, and '
        + 'cannot take you again for 50. In beast form you are at ×1.5 move speed, scale 1.2 with a 26px '
        + 'hitbox, running Slash / Pounce / Roar / Grapple / Blood Scent. It fires mid-reload and '
        + 'mid-charge without asking, clearing Blast charges, the Mine Blast wind-up and hybrid pumps on '
        + 'the way in. The Q bar counts the 12 seconds down and then fills toward the next transform.',
      cast: 'Nothing to press. Fires on its own timer. With the Q upgrade owned, pressing Q in human form does something else entirely — see below.',
      effects: [
        { tag: 'utility', label: 'The clock', detail: 'First transform 30s into the match, then 12s as the beast, then 50s before it can take you again.' },
        { tag: 'buff', label: 'What you become', detail: 'Beast form: ×1.5 move speed, scale 1.2, a 26px hitbox, and Slash / Pounce / Roar / Grapple / Blood Scent on the five keys.' },
        { tag: 'cost', label: 'You do not choose', detail: 'It fires mid-reload, mid-charge and mid-anything. Blast charges, the Mine Blast wind-up and hybrid pumps are all cleared on the way in.' },
        { tag: 'utility', label: 'Readable', detail: 'The Q bar counts down the 12s while you are the beast and fills toward the next transform while you are not.' },
      ],
      upgrade: {
        basics:
          'Q in human form becomes a third form: Hybrid, at scale 1.1 with a 24px hitbox and ×1.25 move '
          + 'speed, carrying Shotgun Blast, Tactical Roll, Hook, Adrenaline and Give In. The beast seizes '
          + 'the body for 3 seconds every 10 while you wear it, and the beast clock stops running — so you '
          + 'can never become the ordinary 12-second beast again. The only way back to four legs is Give '
          + 'In, which is permanent.',
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
      basics:
        'A melee swipe covering 80px across the whole 180° in front of you. 5 damage on a clean hit, or '
        + '15 if the body has one of your bolts in it — which is pulled out and destroyed, one per swing. '
        + '0.4s cooldown, shortened further by Blood Scent and Alpha.',
      cast: 'Click. Hits everything within 80px in the forward half-circle (±90° off your aim).',
      effects: [
        { tag: 'damage', label: 'Clean swipe', detail: '5 damage.' },
        { tag: 'damage', label: 'Ripping a bolt', detail: '15 damage instead, and the newest bolt in that body is pulled out and destroyed. One bolt per swing.' },
        { tag: 'area', label: 'Reach', detail: '80px, in a 180° arc in front of you. It is a melee ability with a generous cone, not a point attack.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s cooldown — Blood Scent and Alpha both shorten it further.' },
      ],
      upgrade: {
        basics:
          '+5 damage against a stunned target — 10 on a clean swipe, 20 on one that rips a bolt out. Any '
          + 'stun counts, from any source: your own full-charge Mine Blast, Wall Slam, the Grapple hold, or '
          + 'another element\'s.',
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
      basics:
        'A 215px leap in 0.22s — about 977 px/s — that deals 25 damage to everything within 88px of '
        + 'where you touch down, resolved at the end of the lunge. Movement is locked to the leap for its '
        + 'duration and handed back afterwards. 5s cooldown.',
      cast: 'E toward the cursor. Movement is locked to the lunge for its 0.22s and hands back afterwards.',
      effects: [
        { tag: 'movement', label: 'The leap', detail: '215px in 0.22s — roughly 977 px/s while it lasts.' },
        { tag: 'damage', label: 'The landing', detail: '25 damage to everything within 88px of where you touch down, resolved at the end of the lunge.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        basics:
          'The landing also leaves three burning gashes fanned ±0.5 rad around your heading, 34px out '
          + 'from where you touched down. Each deals 4 damage every 0.5s to anything within 26px and lasts '
          + '6 seconds, fading visibly as it cools.',
        effects: [
          { tag: 'summon', label: 'The gashes', detail: 'Three burning cuts, fanned ±0.5 rad around your landing heading, 34px out from where you touched down.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Burning ground', detail: '4 damage per patch, once every 0.5s, to anything within 26px of it.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'How long they last', detail: '6s each, fading visibly as they cool.', requiresUpgrade: 'e' },
        ],
      },
    },

    'hunt-roar': {
      basics:
        'A 30° cone that reaches the full arena diagonal — over 1000px, so anything you can see and are '
        + 'pointed at is inside it. Everything caught is slowed to ×0.75 speed for 5 seconds, and hitting '
        + 'anything at all wraps you in ×0.67 incoming damage, a flat 33% cut, for the same 5 seconds. A '
        + 'roar that connects with nothing gives you nothing. 12s cooldown.',
      cast: 'R toward the cursor. Instant. The cone reaches the full diagonal of the arena.',
      effects: [
        { tag: 'debuff', label: 'The slow', detail: '×0.75 move speed for 5s on anything caught in the 30° cone (±15° off your aim).' },
        { tag: 'shield', label: 'The armour', detail: 'Hitting *anything* gives you ×0.67 incoming damage — a flat 33% reduction — for 5s. A roar that connects with nothing gives you nothing.' },
        { tag: 'area', label: 'Range', detail: 'The full arena diagonal — over 1000px on a standard arena — so anything you can see and are pointed at is inside it.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown.' },
      ],
      upgrade: {
        basics:
          'Everything the cone catches also turns and runs directly away from you at ×1.1 of its own '
          + 'speed for 3 seconds. Their movement is overwritten every frame — this is a loss of control '
          + 'rather than a slow, and only an unstoppable target ignores it.',
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
      basics:
        'A 250px lunge in 0.24s, about 1042 px/s, that catches the first body within 46px. The catch '
        + 'pins them at 40px from you for 1 second with their velocity zeroed and stunned, and you are '
        + 'locked in place with them — then throws them at the cursor at 780 px/s for up to 0.7s, as far '
        + 'as 546px. Pounce and the hybrid roll use the same lunge machinery but cannot grab. 10s '
        + 'cooldown.',
      cast: 'F toward the cursor. The lunge catches; the throw a second later goes wherever the cursor is *then*.',
      effects: [
        { tag: 'movement', label: 'The lunge', detail: '250px in 0.24s — about 1042 px/s. It catches the first body it comes within 46px of.' },
        { tag: 'control', label: 'The hold', detail: '1s pinned at 40px from you, velocity zeroed and stunned throughout. You are locked in place with them.' },
        { tag: 'control', label: 'The throw', detail: '780 px/s at the cursor for up to 0.7s — as far as 546px across the arena.' },
        { tag: 'utility', label: 'Only Grapple catches', detail: 'Pounce and the hybrid roll use the same lunge machinery but cannot grab; running through somebody mid-pounce does nothing.' },
        { tag: 'utility', label: 'Availability', detail: '10s cooldown.' },
      ],
      upgrade: {
        basics:
          'A thrown body that reaches within 34px of any arena edge slams for 20 damage and a 2-second '
          + 'full stun — long enough to walk over and open with a bolt-ripping Slash. The slam fires once '
          + 'and ends the flight; you cannot bounce somebody down a wall for repeats.',
        effects: [
          { tag: 'damage', label: 'Impact', detail: '20 damage when a thrown body reaches within 34px of any arena edge.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Stun', detail: '2s of full stun on the slam — long enough to walk over and open with a bolt-ripping Slash.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Once per throw', detail: 'The slam fires once and ends the flight; you cannot bounce somebody down a wall for repeat hits.', requiresUpgrade: 'f' },
        ],
      },
    },

    'hunt-blood-scent': {
      basics:
        'Eight seconds of ×0.8 cooldowns — 25% more swings on everything the beast has — and ×1.2 move '
        + 'speed on top of beast form\'s ×1.5. It is gated: something you can hurt must already be at or '
        + 'below 30% of its maximum health, and nothing else satisfies it. 20s cooldown, and it checks '
        + 'the field first, fizzling with "No blood in the air…" if nobody is wounded enough.',
      cast: 'Q. No aim. Checks the field first and fizzles with "No blood in the air…" if nothing is wounded enough.',
      effects: [
        { tag: 'buff', label: 'Attack speed', detail: '×0.8 cooldowns for 8s — 25% more swings, on every ability the beast has.' },
        { tag: 'buff', label: 'Move speed', detail: '×1.2 for the same 8s, on top of beast form\'s own ×1.5.' },
        { tag: 'cost', label: 'The gate', detail: 'Something you can hurt must already be at or below 30% of its max health. Nothing else satisfies it.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown.' },
      ],
      upgrade: {
        basics:
          'Twenty seconds of Blood Moon: the whole arena is repainted and every hunt effect on your side '
          + 'recoloured. While it is up, the current transform gains 5 seconds and every future timed '
          + 'transform does too, the Blood Scent threshold rises from 30% to 50% health so it fires on a '
          + 'target only half down, and a mastery beastling grows to 1.4× size, moves 35% faster and bites '
          + 'for 60% more.',
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
      basics:
        'Hybrid form\'s click: 15 damage to everything within 168px inside a 50° wedge, throwing them '
        + '434 px/s — 70% of what the human shotgun manages. No charge system, one shell at a time, 0.7s '
        + 'between shots with a half-second lockout after each pump.',
      cast: 'Click at the cursor. 0.7s between shots. Locked out for half a second after each pump.',
      effects: [
        { tag: 'damage', label: 'The cone', detail: '15 damage to everything within 168px inside a 50° wedge.' },
        { tag: 'control', label: 'Knockback', detail: '434 px/s — 70% of what the human shotgun throws.' },
        { tag: 'utility', label: 'Availability', detail: '0.7s cooldown. No charge system: one shell at a time.' },
      ],
      upgrade: {
        basics:
          'You can pump the gun for +5 damage a shell, up to a safe 3 — 30 on a fully pumped shot instead '
          + 'of 15 — at 0.5 seconds a pump during which you cannot fire, so three pumps is 1.5 seconds of '
          + 'standing there. A fourth pump arms a failure: the next Click detonates in your hands for 35 '
          + 'damage in a 96px radius 46px ahead of you and 10 to yourself. A four-slot gauge floats over '
          + 'your shoulder, amber for loaded shells and pulsing red once the fourth is armed, and Give In '
          + 'clears the count so a stacked gun cannot be carried into beast form.',
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
      basics:
        'A 215px tumble in 0.3s — about 717 px/s — toward the cursor, with movement locked to the roll '
        + 'for its duration. 4s cooldown.',
      cast: 'E toward the cursor. Movement is locked to the roll for its 0.3s.',
      effects: [
        { tag: 'movement', label: 'The roll', detail: '215px in 0.3s — about 717 px/s.' },
        { tag: 'utility', label: 'Availability', detail: '4s cooldown.' },
      ],
      upgrade: {
        basics:
          'Full invincibility for the 0.3 seconds of the tumble: everything is ignored rather than '
          + 'reduced. The immunity is dropped on the first frame after the roll finishes, with no grace '
          + 'window on either side.',
        effects: [
          { tag: 'shield', label: 'Untouchable', detail: 'Full invincibility for the 0.3s of the roll. Everything is ignored, not reduced.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Ends exactly with the roll', detail: 'The immunity is dropped on the first frame after the tumble finishes — there is no grace window on either side.', requiresUpgrade: 'e' },
        ],
      },
    },

    'hunt-hook': {
      basics:
        'Throws a claw 800 px/s out to 340px, catching anything within 34px, and expiring after 1.4 '
        + 'seconds if it catches nothing. R again reels the latched body toward you at 640 px/s, ending '
        + 'when they are within 56px or 4 seconds after the throw. A latched hook waits up to 6 seconds '
        + 'and you can shoot, roll and pump while it sits there. Only the throw pays the 8s cooldown; the '
        + 'reel is free.',
      cast: 'R to throw at the cursor. R again while it is latched to reel. Only the throw pays the cooldown; the reel is free.',
      effects: [
        { tag: 'utility', label: 'The throw', detail: '800 px/s out to 340px, catching anything within 34px of the claw. It expires after 1.4s if it catches nothing.' },
        { tag: 'control', label: 'The reel', detail: 'Drags the latched body toward you at 640 px/s, ending when they are within 56px or 4s after the throw.' },
        { tag: 'utility', label: 'It waits', detail: 'A latched hook holds for up to 6s. You can shoot, roll and pump while it sits there and reel whenever you like.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown on the throw.' },
      ],
      upgrade: {
        basics:
          'The drag now scrapes: 12 damage charged for every full 100px pulled, so a 340px reel is 36 '
          + 'damage and a short one is nothing. Only distance actually travelled counts, so a '
          + 'knockback-immune or unstoppable target never accrues any.',
        effects: [
          { tag: 'damage', label: 'Per 100px dragged', detail: '12 damage, charged every full 100px of the pull. A 340px reel is 36 damage; a short one is nothing.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Only travelled distance counts', detail: 'A knockback-immune or unstoppable target is never actually dragged, so it never accrues scrape damage.', requiresUpgrade: 'r' },
        ],
      },
    },

    'hunt-adrenaline': {
      basics:
        'Eight seconds of ×1.33 move speed and ×1.33 outgoing damage, followed immediately by a crash: '
        + '×0.75 to both for 5 seconds. 12s cooldown, so the high, the crash and the wait are exactly 13 '
        + 'seconds and there is always a gap. Both halves appear in the status tray with their own '
        + 'timers.',
      cast: 'F. No aim, no channel.',
      effects: [
        { tag: 'buff', label: 'The high', detail: '×1.33 move speed and ×1.33 outgoing damage for 8s.' },
        { tag: 'cost', label: 'The crash', detail: '×0.75 move speed and ×0.75 outgoing damage for 5s the instant the high runs out.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown — the buff, the crash and the wait together are exactly 13s, so there is always a gap.' },
        { tag: 'utility', label: 'Readable', detail: 'Both halves appear in the status tray with their own timers.' },
      ],
      upgrade: {
        basics:
          'The cooldown halves to 6 seconds, and recasting during either the high or the crash cancels '
          + 'the crash outright and restarts the 8-second high. Each delay adds 20 self-damage, all of it '
          + 'paid at once on the crash you finally let land — three delays is 60 health off the top. The '
          + 'tray entry shows a ×N delays counter so you can see what you owe.',
        effects: [
          { tag: 'utility', label: 'Faster cycle', detail: 'Cooldown drops from 12s to 6s, so the buff can be back before the crash would have finished.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Delaying', detail: 'Recasting while the high or the crash is running cancels the crash outright and restarts the 8s high.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'The bill', detail: '20 self-damage per delay, all of it paid at once on the crash you finally let land. Three delays is 60 health off the top.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Readable', detail: 'The Adrenaline tray entry shows a "×N delays" counter so you can see what you owe.', requiresUpgrade: 'f' },
        ],
      },
    },

    'hunt-give-in': {
      basics:
        'Hybrid form only, and one way. Instant, free, and permanent beast form with no expiry: nothing '
        + 'reverts it and the beast clock never runs again. Your pumps, your overpacked shell and any '
        + 'queued possession are cleared on the way through, and hybrid form is not recoverable.',
      cast: 'Q, in hybrid form only. Instant, free, and permanent.',
      effects: [
        { tag: 'utility', label: 'Permanent transform', detail: 'Beast form with no expiry. Nothing reverts it and the beast clock never runs again.' },
        { tag: 'resource', label: 'What it costs', detail: 'Your pumps, your overpacked shell and any queued possession are cleared on the way through. Hybrid form is not recoverable.' },
        { tag: 'utility', label: 'No cooldown', detail: 'Free to cast, but there is only ever one opportunity to.' },
      ],
      upgrade: {
        basics:
          'The permanent beast becomes an Alpha: ×0.67 incoming damage forever, which multiplies with '
          + 'Roar\'s own 33% to ×0.45 while both hold, and ×0.8 on every cooldown, so Slash comes back in '
          + '0.32s instead of 0.4s. It wears an ash-grey coat instead of the beast\'s red, so an Alpha is '
          + 'distinguishable from a timed transform on sight.',
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
      basics:
        'Standing on your own trail marks builds 10 rage a second to a cap of 100, and at 100 the beast '
        + 'is dragged out immediately whatever the clock said, resetting the meter. While it is out you '
        + 'take ×0.5 incoming damage for the whole transform — a flat halving that multiplies with Roar '
        + 'and Alpha. Trail marks also last 6 seconds instead of 4. The catch is that the meter only '
        + 'fills on marks the enemy laid, so a quarry running a straight line away gives you almost '
        + 'nothing to stand in.',
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
      basics:
        'Every beast transform, timed or permanent, is a hellhound instead: ×1.3 outgoing damage, '
        + '×0.833 cooldowns for 20% faster swings that stack with Blood Scent and Alpha, and ×1.3 speed '
        + 'on top of beast form\'s ×1.5 for ×1.95 — ×2.93 on your own trail. The price is ×1.25 incoming '
        + 'damage, everything hitting a quarter harder for as long as it is out; the partial repayment is '
        + 'a smaller target at scale 0.85 with an 18px hitbox instead of 26. It wears a charred '
        + 'black-and-rust coat and skips the beast\'s bulking-up entirely.',
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
      basics:
        'A 60° wedge sweeping around every body at 0.9 rad/s — one revolution every 7 seconds — drawn '
        + 'between 24px and 54px out. Any hit whose approach angle falls inside it deals double. Crossbow '
        + 'and bomb bolts, both shotgun cones, Slash and Pounce qualify, measured from where the attack '
        + 'came from rather than where you are standing now; the grenade, searing gashes, hook Scrape, '
        + 'Wall Slam, the bomb bolt\'s splash and the beastling\'s bite are area or secondary damage and '
        + 'never double. A 🎯 WEAK POINT callout and a rake mark the seam, throttled to one announcement '
        + 'every 0.35s. It cuts both ways: a mastered Hunt opponent has the same wedge sweeping around '
        + 'you, drawn on your body for you to read.',
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
      basics:
        'A bindable pup — E, R or F, in human form only — that lives 15 seconds at 210 px/s, aggroing '
        + 'anything within 420px and otherwise trotting 46px behind you. It bites for 5 every 2 seconds '
        + 'within 34px, or 10 against a body holding one of your bolts. It fetches: your own grenade '
        + 'within 22px is picked up, its fuse frozen completely while carried, run to the nearest enemy '
        + 'and detonated within 44px for the full 35 damage in 130px. It joins every Roar for a ×0.8 '
        + 'enemy slow that multiplies with your own ×0.75, runs your trail marks at ×1.5 like you do, and '
        + 'under the Blood Moon grows to 1.4× size at ×1.35 speed and ×1.6 bite. 30s cooldown, one pup at '
        + 'a time.',
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
