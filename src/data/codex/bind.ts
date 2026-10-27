import { ElementCodex } from '../AbilityCodex';

/**
 * Bind — something in chains, born under a curse, that makes its living off the dead.
 *
 * Verified against `src/elements/bind.ts`, `kits/BindKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the two mastery enhancements in `data/Mastery.ts`. Bind has no perks;
 * every figure below is a constant at the top of the kit.
 */
const bind: ElementCodex = {
  identity:
    'Something in chains, born under a curse, that makes its living off the dead. Every arena a '
    + 'Bind fights in fills up with lost souls nobody can see. Blackened Eyes shows them, the chain '
    + 'takes them, Siphon drinks them for damage and wears the curse off a little more each second '
    + '— and a soul drunk dry comes back as a revenant that wants you dead and will kill anybody '
    + 'standing in its way. The ancient god does not hang over the arena any more; it only comes '
    + 'when the Ritual pays it in souls, and the more you pay the longer it stays and the less it '
    + 'takes. The skill is in the bookkeeping: which soul to drink, which to keep on the chain for '
    + 'the god, and where to stand so the thing you made angry runs through somebody else.',

  passives: [
    {
      emoji: '⛓️',
      name: 'Bound',
      basics:
        'Every match starts with one curse, rolled at random and printed on a plaque at the top of '
        + 'the screen: Shackled (−25% move speed), Brittle (+25% damage taken), Feeble (−25% damage '
        + 'dealt) or Sluggish (+25% cooldowns). Every second you spend siphoning takes 3% of its '
        + 'strength off for good — a whole 6-second soul is about 18%, and 33 seconds of drinking '
        + 'clears it completely. Nothing else wears it down. A Ritual of 3 or more souls lifts it '
        + 'outright while the god stays; the plaque unlocks and reads LIFTED.',
      effects: [
        { tag: 'cost', label: 'The four curses', detail: 'Shackled ×0.75 move speed, Brittle ×1.25 damage taken, Feeble ×0.75 damage dealt, Sluggish ×1.25 cooldowns. One of the four, rolled at random at the start of every match.' },
        { tag: 'resource', label: 'Wearing it down', detail: '3% of its strength off per second of siphoning, permanently. One full soul (6s) is about 18%; 33 seconds of siphoning in total clears it.' },
        { tag: 'buff', label: 'Lifted', detail: 'A Ritual of 3–4 souls lifts the curse for the god\'s 8 seconds; 5 or more lifts it for 15.' },
        { tag: 'utility', label: 'The plaque', detail: 'Printed at the top of the screen with its current figure — "BOUND · SHACKLED · 19% slower movement" — and a gauge that empties as you drink. An enemy Bind\'s curse is printed under yours.' },
      ],
      notes: [
        'The curse is the reason to siphon early even when there is nothing to fight: every second of drinking is a permanent stat back.',
        'Sluggish also stretches the Ritual\'s cooldown, and Feeble shrinks the damage the god does on your behalf — the curse applies to everything you deal, not only your own hands.',
      ],
    },
    {
      emoji: '👻',
      name: 'Lost Souls',
      basics:
        'Small wisps of long-dead elements wander every arena a Bind fights in — one more every 3.5 '
        + 'seconds up to 6 wild at once, drifting at 34 px/s and turning off the walls. They are '
        + 'invisible to everyone until Blackened Eyes opens yours, and only a soul you can see can '
        + 'be bound or drunk. A soul on your chain follows you in a slow ring, visible to everyone, '
        + 'up to 6 of them, and stays visible after the eyes close. A soul flickers as it runs low.',
      effects: [
        { tag: 'summon', label: 'Wild souls', detail: 'One every 3.5s, up to 6 wild at once, drifting at 34 px/s. Invisible until Blackened Eyes (R).' },
        { tag: 'summon', label: 'Bound souls', detail: 'Up to 6 on your chain, circling you about 38px out. Anyone can see them. They are what the Ritual (Q) is paid with.' },
        { tag: 'resource', label: 'Essence', detail: 'A full soul holds 6 seconds of siphoning. It shrinks and flickers as it empties.' },
      ],
      notes: [
        'A soul being siphoned is drawn for everyone, eyes or not — drinking one in front of an opponent tells them exactly where it is.',
      ],
    },
    {
      emoji: '👹',
      name: 'Revenants',
      basics:
        'A soul drained dry comes back as a revenant: an angry red soul that keeps about 170px away '
        + 'from you, circling at 150 px/s. Every 3.2 seconds it stops, winds up for 0.9s with a '
        + 'burning line drawn between you, and dashes at where you are at 720 px/s, overshooting by '
        + '90px. If you are still there it hits you for 12. Anyone else it runs through on the way '
        + 'takes 30. Up to 3 at once; a soul drained while three are already out simply vanishes. '
        + 'They never die on their own — only the Ritual (with Q+) or Trial by Faith (F+) removes one.',
      effects: [
        { tag: 'damage', label: 'Ran through', detail: '30 to every enemy within 26px of the dash line, once each per dash.' },
        { tag: 'cost', label: 'At you', detail: '12 to you if the dash catches you. It aims where you stood when the 0.9s wind-up ended, so walking sideways makes it miss.' },
        { tag: 'summon', label: 'The stalk', detail: 'Keeps about 170px off you at 150 px/s. Dashes every 3.2s: 0.9s wind-up, 720 px/s, 90px overshoot.' },
        { tag: 'utility', label: 'The cap', detail: 'Up to 3 revenants. Draining a soul while 3 are out makes no new one.' },
      ],
      notes: [
        'The whole trick is geometry: keep the enemy between you and your revenants. A revenant 170px behind them dashing at you passes straight through them for 30.',
        'A revenant always comes from the side away from you, so backing into a wall leaves nowhere for the enemy to stand that is out of its line.',
      ],
    },
  ],

  abilities: {
    'bind-daggers': {
      basics:
        'Throws a dagger at 640 px/s with a short chain trailing behind it, for 11 damage to the '
        + 'first enemy it touches. A dagger that reaches a wall sticks there for 5 seconds and, every '
        + '1.5 seconds, spits 3 chain fragments at the nearest enemy within 540px for 4 each. Right '
        + 'click detonates every dagger you have out — in flight or in a wall — into a shotgun of 7 '
        + 'fragments for 5 each in a ±19° cone: a flying one carries on along its path, a stuck one '
        + 'fires back out at the nearest enemy. Up to 6 stuck at once; a seventh pushes the oldest out.',
      cast: 'Click, held to keep throwing. 0.38s cooldown. Right click detonates (no cooldown, but at most once every 0.3s).',
      effects: [
        { tag: 'damage', label: 'The dagger', detail: '11 damage to the first enemy it touches. 640 px/s, flies to the wall.' },
        { tag: 'damage', label: 'Stuck in a wall', detail: 'Stays 5s. Every 1.5s (first after 0.9s) it spits 3 fragments at the nearest enemy within 540px, 4 damage each.' },
        { tag: 'damage', label: 'Detonate (right click)', detail: 'Every dagger out bursts into 7 fragments, 5 damage each, in a ±19° cone. Fragments fly at 820 px/s for about 0.42s — roughly 345px.' },
        { tag: 'area', label: 'Aim of a stuck burst', detail: 'A stuck dagger fires its 7 at the nearest enemy within 540px, or straight back out of the wall if there is none.' },
        { tag: 'utility', label: 'Wall limit', detail: 'Up to 6 stuck daggers at once; the seventh pushes the oldest out.' },
      ],
      upgrade: {
        basics:
          'Inspirit: a dagger that passes within 18px of a lost soul — seen or not — takes a little '
          + 'of it along, +30% damage for every soul it goes through, stacking. A soul-lit dagger also '
          + 'finds the enemy\'s soul: while one is in flight a tiny glowing point is drawn at the '
          + 'centre of every enemy, and a dagger that passes within 9px of it deals 50% more again '
          + 'for every soul it carries and prints SOUL STRUCK. Its fragments, flying or sprayed from '
          + 'a wall, carry +15% per soul.',
        effects: [
          { tag: 'damage', label: 'Through a soul', detail: '+30% damage per soul passed through, stacking: 14 after one, 18 after two, 21 after three.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Soul struck', detail: 'Inside 9px of the enemy\'s centre: ×(1 + 0.5 per soul) on top — 21 with one soul, 35 with two, 52 with three.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Lit fragments', detail: 'A soul-lit dagger\'s fragments deal +15% per soul it carries.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The souls a dagger can pass through include wild ones you cannot currently see. Blackened Eyes is what tells you where to throw.',
        'Your own bound souls circle you about 38px out — a dagger thrown through your own ring picks them up on the way out.',
        'Cultists (F+) throw the same dagger for 7. Theirs never stick and are never detonated.',
      ],
    },

    'bind-chain': {
      basics:
        'Throws a chain at whatever in reach is nearest your cursor. An enemy within 150px is chained '
        + 'to you for 5 seconds: it cannot get more than 150px from you, so walking away drags it '
        + 'along, and its cooldowns run 20% longer while it is chained. Press E again while the chain '
        + 'is on to anchor it to the floor where you stand, and walk off. A lost soul within 130px that '
        + 'you can see is bound to you instead and follows you, visible to everyone, up to 6. With a '
        + 'soul on your chain, a cultist (F+) or a False Idol (mastery) within 150px can be fed it. '
        + 'With nothing in reach the cast is refused and costs nothing.',
      cast: 'E, aimed at the cursor. 2.3s cooldown. Recast while the chain holds to anchor it.',
      effects: [
        { tag: 'control', label: 'Chained', detail: 'For 5s the enemy cannot get more than 150px from you — or from the anchor. Only the outward part of their movement is stopped; they can still circle.' },
        { tag: 'debuff', label: 'Weighed down', detail: '×1.2 cooldowns on the chained enemy while the chain holds.' },
        { tag: 'utility', label: 'Anchor', detail: 'Recast E to pin the chain to the floor where you stand. The enemy stays tied to that spot for the rest of the 5 seconds.' },
        { tag: 'summon', label: 'Bind a soul', detail: 'A visible lost soul within 130px is bound to you instead. Up to 6. Bound souls are the Ritual\'s payment.' },
        { tag: 'utility', label: 'What it picks', detail: 'Every candidate in reach — enemy within 150px, soul within 130px, cultist or idol within 150px — and takes the one nearest the cursor.' },
      ],
      upgrade: {
        basics:
          'Bind the Hatred: revenants within 170px can be chained too. A bound revenant is held '
          + 'still in its chains for 5 seconds — then it dashes at you straight away, 20% faster and '
          + 'for 60% more: 48 to anyone in the line, 19 to you if it reaches you. Chain it with the '
          + 'enemy between you and it.',
        effects: [
          { tag: 'control', label: 'Held', detail: 'A revenant within 170px is frozen in chains for 5s.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Released', detail: 'It then dashes at you at once: ×1.2 speed and ×1.6 damage — 48 to enemies in the line, 19 to you.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The chain stops the victim at 150px after it has moved, every frame, so a chained enemy cannot dash or knock itself out of reach — it is put straight back on the circle.',
        'Anchoring and then walking 150px away is the cleanest way to line an enemy up for a revenant: they cannot leave the circle, and you know exactly where the dash will come from.',
        'A cultist\'s chain (F+) is a separate, shorter tether: 2 seconds, 140px, anchored where the cultist stood.',
      ],
    },

    'bind-eyes': {
      basics:
        'For 8 seconds the whole screen turns inverted and you can see the lost souls wandering the '
        + 'arena — and only a soul you can see can be bound or siphoned. Your body becomes only its '
        + 'small inner soul: your hitbox shrinks to 35% of its size and you walk straight through '
        + 'anything solid. The bright core drawn at your centre is all that can be hit.',
      cast: 'R. 16s cooldown. Instant.',
      effects: [
        { tag: 'utility', label: 'Sight', detail: 'Wild lost souls are drawn for you for 8s, and can be bound (E) and siphoned (F).' },
        { tag: 'shield', label: 'Inner soul', detail: 'Hitbox ×0.35 for 8s — most shots that would have clipped you miss.' },
        { tag: 'movement', label: 'Soul-walk', detail: 'For the same 8s you pass through walls, pillars and anything else solid.' },
        { tag: 'utility', label: 'Inverted', detail: 'Your screen inverts its colours for the 8 seconds. Only yours — the opponent\'s does not.' },
      ],
      upgrade: {
        basics:
          'Choice Souls: lost souls come in three tempers, and Blackened Eyes shows you which. Green '
          + 'kind souls heal you 4 HP a second while you siphon them. Red angry souls build the damage '
          + 'buff faster and higher: +16% a second up to +80%, against the usual +10% up to +50%. '
          + 'Blue sad souls give +5% move speed a second as well, up to +30%.',
        effects: [
          { tag: 'heal', label: 'Kind (green)', detail: '4 HP a second while siphoning it.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'Angry (red)', detail: 'Damage buff builds at +16%/s to +80%, instead of +10%/s to +50%.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'Sad (blue)', detail: '+5% move speed per second of siphoning, up to +30%, lingering with the damage buff.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Souls you have already bound stay visible after the eyes close, and can still be siphoned. Binding a few during the 8 seconds is how you keep drinking afterwards.',
        'The shrunken hitbox makes Blackened Eyes a strong dodge in its own right, quite apart from the souls.',
      ],
    },

    'bind-siphon': {
      basics:
        'Drains the lost soul nearest your cursor, within 340px. The longer you drink the more '
        + 'damage you deal: +10% a second, up to +50%, and the buff lingers for 3 seconds after you '
        + 'stop (press F again to let go; it also breaks past 420px). Every second also takes 3% '
        + 'off your curse, for good. A full soul holds 6 seconds. Drain it dry and it comes back as '
        + 'a revenant — up to 3.',
      cast: 'F to start, F again to stop. 2.5s cooldown. Refused with no visible soul in range — nothing is spent.',
      effects: [
        { tag: 'buff', label: 'The drink', detail: '+10% damage dealt per second of siphoning, up to +50%. Lingers 3s after you stop.' },
        { tag: 'resource', label: 'The cure', detail: '−3% curse strength per second, permanently.' },
        { tag: 'area', label: 'Reach', detail: 'Picks the visible soul nearest the cursor within 340px of you. The stream breaks if it gets more than 420px away.' },
        { tag: 'summon', label: 'Overdrained', detail: 'A soul holds 6s. Drained dry it becomes a revenant (up to 3) — see Revenants.' },
      ],
      upgrade: {
        basics:
          'Trial by Faith: revenants within 340px can be siphoned. It makes them angrier as you '
          + 'drink — over 4 seconds they stalk 40% faster, wind up 40% quicker, dash 30% faster, '
          + 'recharge in half the time and hit twice as hard — and a fully siphoned one kneels as a '
          + 'cultist. A cultist walks to about 170px short of the enemy, throws a 7-damage dagger every '
          + '1.1s within 480px, and every 4.5s chains an enemy within 200px for 2 seconds. It loses '
          + 'faith as it goes and fades after 12 seconds; bind a soul to it (E) for 6 more, up to 18 '
          + 'left. Up to 3 cultists. Drinking a revenant counts as an angry soul for the buff.',
        effects: [
          { tag: 'summon', label: 'Cultist', detail: 'Up to 3. 12s of faith; walks at 120 px/s to about 170px short of the enemy.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Its daggers', detail: '7 damage, one every 1.1s at an enemy within 480px.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Its chain', detail: 'Every 4.5s, an enemy within 200px is chained to the cultist\'s spot for 2s, 140px of chain.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'Feeding', detail: 'Bind a soul to a cultist (E, within 150px): +6s of faith, never more than 18s left.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'The trial', detail: '4 seconds of siphoning to convert one. Meanwhile it gets worse: up to ×2 dash damage (24 to you, 60 to enemies), quicker wind-ups and shorter gaps.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The siphon only draws from a soul you can see. A bound soul is always visible to you, so a chain of six is six drinks waiting.',
        'Letting go at 5 seconds keeps the soul alive (and the revenant unborn) with almost all of the buff already earned.',
        'A siphoned soul is drawn for everyone. So is the stream.',
      ],
    },

    'bind-ritual': {
      basics:
        'Stabs a dagger into the floor, wakes the old red runes and offers every soul on your chain '
        + 'at once. The ancient god comes, unbound and almighty, and works on the enemy: a 7-shard '
        + 'volley at 10 each every 1.2s, a 24-damage swipe within 96px every 2.1s, three 8-damage '
        + 'lasers every 0.62s, and every 3 seconds a marked circle that takes a 38-damage, 122px '
        + 'blast 0.9s later. How long it stays and what it costs is set by how many souls you paid. '
        + '1–2 souls: 5 seconds, and it takes one of Click, E, R or F for the rest of the match — '
        + 'you choose which by pressing it. 3–4: 8 seconds, and your curse is lifted while it stays. '
        + '5–6: 12 seconds, curse lifted for 15, and three hexes of the old prophet\'s protection.',
      cast: 'Q, ultimate. Paid for in charge. Refused with no souls on your chain — nothing is spent.',
      effects: [
        { tag: 'damage', label: 'Shard volleys', detail: '7 shards at 10 each into a 68px scatter round an enemy, every 1.2s. Each bursts in 34px.' },
        { tag: 'damage', label: 'Swipe', detail: '24 to every enemy within 96px of the swipe, every 2.1s.' },
        { tag: 'damage', label: 'Lasers', detail: 'Three lines every 0.62s, 8 each to anything within 20px.' },
        { tag: 'damage', label: 'Dark blast', detail: 'Every 3s a circle is marked; 0.9s later 38 damage in 122px.' },
        { tag: 'cost', label: '1–2 souls', detail: '5 seconds of the god — and one of Click, E, R or F is locked for the rest of the match. The prompt waits 0.8s before it takes an answer. A bot loses one at random.' },
        { tag: 'buff', label: '3–4 souls', detail: '8 seconds of the god, and your curse is lifted for the same 8.' },
        { tag: 'shield', label: '5–6 souls', detail: '12 seconds of the god, the curse lifted for 15, and 3 hexes that each swallow one whole hit, however big.' },
      ],
      upgrade: {
        basics:
          'Wrathful God: revenants can be offered too — they count as souls and are gone for good. '
          + 'But the god does not like being handed hatred: when its time on the enemy is up it turns '
          + 'on you, with the same four attacks, for 3 seconds per revenant offered. Six souls and '
          + 'three revenants is nine — the 12-second god, and then 9 seconds of it on you.',
        effects: [
          { tag: 'resource', label: 'Hatred as payment', detail: 'Every revenant counts as one soul toward the 1–2 / 3–4 / 5+ tiers, and is removed.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'The wrath', detail: '3 seconds of the god turned on you per revenant offered, starting the moment it leaves the enemy. Volleys, swipes, lasers and blasts, all aimed at you.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The tiers are the whole decision. One soul is a 5-second god for a limb; three is 8 seconds and a clean slate. Holding Q until the chain is full is almost always right.',
        'Once all four limbs are gone a 1–2 soul ritual takes nothing more.',
        'The protection\'s hexes go before any other shield. A hex spent on a 4-damage fragment is spent.',
        'Q+ is how a revenant problem goes away. Three revenants on the field for nine seconds of wrath is a trade worth making only with a shield or a lot of health.',
      ],
    },
  },

  mastery: {
    'permanent-bond': {
      basics:
        'Whatever you lose of your curse, your enemy gains in its place. Every bit Siphon wears '
        + 'off you lands on them, for good — siphon a third of your Shackled away and they are '
        + 'moving about 8% slower for the rest of the match. And while the Ritual lifts your curse '
        + 'completely, they carry the whole 25% of it for exactly as long.',
      effects: [
        { tag: 'debuff', label: 'Handed on', detail: 'Every enemy carries the same curse at (1 − your strength) × 25%. Fully siphoned off you, it is the full 25% on them, permanently.' },
        { tag: 'debuff', label: 'While lifted', detail: 'For the Ritual\'s 8 or 15 seconds of lifted curse, they carry all 25% of it.' },
      ],
      notes: [
        'It doubles the value of siphoning: every second of drinking is +3% back for you and −3% of the curse on them.',
        'Brittle handed over is +25% damage taken on the enemy — on top of the siphon\'s own damage buff, that is a large swing.',
      ],
    },
    'false-idol': {
      basics:
        'Plants an idol at your cursor with a 110px ring of ground around it. Standing in the ring '
        + 'builds its favour over 8 seconds — up to +35% damage, +20% move speed and −25% damage '
        + 'taken, scaled by the favour and only while you stay in it. Out of it the favour drains '
        + 'over 12 seconds. Leave the idol alone for more than 4 seconds and it loses patience: a '
        + 'laser at you every 1.2 seconds for 8, until you come back. Bind (E) a soul to it from '
        + 'within 150px and the soul stands in the ring in your place — the favour keeps growing and '
        + 'the idol stays calm — but it drains the soul over 15 seconds.',
      cast: 'The bound key. 18s cooldown. A new idol replaces the old one, and a soul standing at the old one comes back to you.',
      effects: [
        { tag: 'buff', label: 'Favour', detail: 'Fills over 8s in the ring: up to +35% damage, +20% move speed and ×0.75 damage taken while you stand in it. Drains over 12s out of it.' },
        { tag: 'area', label: 'The ring', detail: '110px round the idol\'s foot.' },
        { tag: 'damage', label: 'Impatience', detail: 'More than 4s with nobody in the ring: an 8-damage laser at you every 1.2s.' },
        { tag: 'summon', label: 'A soul in your place', detail: 'Bind (E) a bound soul to the idol from within 150px. It keeps favour growing and the lasers off for 15s, then is gone.' },
      ],
      notes: [
        'The buffs only count while you are in the ring yourself; a soul keeps the favour up for when you come back, it does not carry the buffs to you.',
        'Plant it on the spot you want to fight over. An idol behind you is 8 damage every 1.2 seconds for the privilege.',
      ],
    },
  },
};

export default bind;
