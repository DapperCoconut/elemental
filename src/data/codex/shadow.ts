import { ElementCodex } from '../AbilityCodex';

/**
 * Shadow — a kit that wins by taking the fight out of the other fighter rather than the health.
 *
 * Verified against `src/elements/shadow.ts`, `kits/ShadowKit.ts`, the shadow block of
 * `data/Upgrades.ts`, the Void / String / Death perks and `data/Mastery.ts`.
 */
const shadow: ElementCodex = {
  identity:
    'Umbramancy: pools of living dark, limbs that reach out of them, and a debuff that makes the '
    + 'enemy hit softer instead of making you hit harder. Shadow has the lowest raw damage of the '
    + 'combined tier and the most ways to stop somebody leaving — every ability either plants '
    + 'ground you own, holds them still, or feeds Hopelessness.',

  passives: [
    {
      emoji: '🕳️',
      name: 'Hopelessness',
      basics:
        'A suppression meter carried by your victims. Every 2 points cuts their outgoing damage by 1%, '
        + 'to a cap of 50% off at 100 points. It builds 3 a second while they stand in one of your shadow '
        + 'pools plus flat lumps from nearly every ability — 10 from a tentacle or wall spike, 20 from a '
        + 'snap trap — and always bleeds off at 1 a second, so leaving someone alone hands it all back in '
        + 'a minute and a half. The victim darkens in proportion, is a pure silhouette at 100, and weeps '
        + 'black ooze at a rate matching the count past 10 points.',
      effects: [
        { tag: 'debuff', label: 'Suppression', detail: 'Every 2 points of Hopelessness cuts the sufferer\'s outgoing damage by 1%, capped at 50% off at 100 points.' },
        { tag: 'resource', label: 'Build', detail: '3 points a second while standing in one of your shadow pools, plus flat lumps from almost every ability: 10 from a tentacle or wall spike, 20 from a snap trap.' },
        { tag: 'utility', label: 'Drain', detail: 'Always bleeding off at 1 point a second, from every source and in every state. Leaving a target alone hands it all back over a minute and a half.' },
        { tag: 'utility', label: 'Readable', detail: 'The victim darkens in proportion — at 100 they are a silhouette — and past 10 points they start weeping black ooze at a rate matching the count.' },
      ],
      notes: [
        'It works on you too. An enemy Shadow\'s pools are the only thing that will ever put Hopelessness on you, and it cuts your damage by exactly the same rule.',
        'Because the cap is 50%, a fully despairing enemy still deals half. Hopelessness is a tax, never an off switch.',
      ],
    },
    {
      emoji: '🌑',
      name: 'Shadow Pools',
      basics:
        'The floor half of the kit. A pool is 36px across (plus a 14px forgiveness pad) and stands 6 '
        + 'seconds, healing you 1.5 HP every 0.4s — 3.75 a second — while dealing enemies 2 every 0.4s, 5 '
        + 'a second, on top of the 3 Hopelessness a second the passive adds. They come from every Dark '
        + 'Drain bomb, from holding Click (one every 0.6s), from Void Singularity (one every 0.5s) and '
        + 'from the Plume trap, which bursts into ten. The Void perk makes them bigger and longer.',
      effects: [
        { tag: 'heal', label: 'Yours to stand in', detail: '1.5 HP every 0.4s — 3.75 HP a second — while you are inside your own pool.' },
        { tag: 'dot', label: 'Theirs to avoid', detail: '2 damage every 0.4s — 5 a second — to any enemy inside it, plus the 3 Hopelessness a second the passive adds.' },
        { tag: 'area', label: 'Size and lifetime', detail: '36px radius (plus a 14px forgiveness pad) standing 6s. Both figures are raised by the Void perk.' },
        { tag: 'utility', label: 'Where they come from', detail: 'Every Dark Drain bomb leaves one; holding Click pours one every 0.6s; Void Singularity drops one every 0.5s; the Plume trap bursts into ten.' },
      ],
    },
  ],

  abilities: {
    'dark-drain': {
      basics:
        'Tap Click for a bomb: 10 damage within 50px and, more importantly, a shadow pool at the impact '
        + 'point. Hold it past 300ms and it becomes a pour instead, laying a pool at the cursor every '
        + '0.6s for as long as you hold, with no cost and no cooldown gating it — only how long you can '
        + 'stand still and aim. The tap has a 0.8s cooldown and each bomb shakes the camera 90ms.',
      cast: 'Click. Released under 300ms it is a tap and throws the bomb. Held past 300ms it becomes the pour, which continues for as long as the button is down.',
      effects: [
        { tag: 'damage', label: 'Bomb impact', detail: '10 damage to everything within 50px of where it lands. Small, and the pool it leaves is the actual payload.' },
        { tag: 'summon', label: 'Bomb pool', detail: 'Every detonation leaves a shadow pool at the impact point — 36px, 6s, healing you and draining them.' },
        { tag: 'summon', label: 'The pour', detail: 'One pool every 0.6s at the cursor while held. There is no cost and no cooldown on the pour; it is limited only by how long you can stand still and aim.' },
        { tag: 'utility', label: 'Availability', detail: '0.8s cooldown on the tap. The pour is not gated by it at all.' },
        { tag: 'utility', label: 'Camera', detail: 'A 90ms shake on each bomb, so a detonation off screen still registers.' },
      ],
      upgrade: {
        basics:
          'An enemy who stays in one of your pools for 3 continuous seconds is confused for 3 seconds: '
          + 'their movement goes random. They can still cast and still attack — it takes their feet, not '
          + 'their hands.',
        effects: [
          { tag: 'control', label: 'Confusion', detail: 'An enemy who has been in your pool for 3 continuous seconds is confused for 3s: their movement goes random. They can still cast and still attack.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The pour is the cheapest Hopelessness in the game — a lane of pools between you and them builds 3 a second for as long as they walk through it.',
        'Pools from either owner are visible to both, but only the owner heals from theirs.',
      ],
    },

    tentacle: {
      basics:
        'A limb that reaches 100px along your aim and catches anything within 110px of you in any '
        + 'direction, dealing 10 damage and 10 Hopelessness, then dragging the caught enemy toward your '
        + 'cursor for 3 seconds. A miss retracts after 0.6s. 5s cooldown.',
      cast: 'E, aimed at the cursor. The limb reaches up to 100px toward the aim; anything within 110px of you is caught.',
      effects: [
        { tag: 'damage', label: 'Grab', detail: '10 damage on contact to every enemy within 110px, plus 10 Hopelessness.' },
        { tag: 'control', label: 'The leash', detail: 'A caught enemy is dragged toward your cursor for 3s. A miss retracts after 0.6s instead.' },
        { tag: 'area', label: 'Reach', detail: 'The visible limb extends 100px along the aim; the catch check is 110px in every direction from the caster.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        basics:
          'Dragging a leashed enemy within 22px of you swallows them for 3 seconds: they cannot move at '
          + 'all and take 2 damage a second, 6 across the hold. Pressing E while somebody is consumed spits '
          + 'them at the cursor at 800 velocity, ending it early. Owning this also lets the tentacle pick '
          + 'up and reposition your own snap traps.',
        effects: [
          { tag: 'control', label: 'Swallowed', detail: 'Dragging a leashed enemy within 22px of you consumes them for 3s. They cannot move at all for the duration.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Digestion', detail: '2 damage every second while consumed — 6 over the full hold.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'The throw', detail: 'Pressing E while somebody is consumed spits them at the cursor at 800 velocity, ending the hold early.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Drags traps too', detail: 'Owning this upgrade also lets the tentacle pick up and move your own snap traps, the same as Trap Drag does.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Consuming an enemy is one of the four Shadow Mastery requirements (35 times).',
        'The leash overrides their movement outright; it is not a slow, and nothing they can do shortens it.',
      ],
    },

    'snap-trap': {
      basics:
        'Plants a plate at your feet with no aiming and no wind-up. It stands 12 seconds or until '
        + 'sprung, and whoever springs it takes 20 damage, 20 Hopelessness — the largest single lump in '
        + 'the kit — and a 2-second stun. One bite only; the trap is spent when it fires. 5s cooldown, so '
        + 'several can be alive at once.',
      cast: 'R, planted at your feet. No aiming and no wind-up.',
      effects: [
        { tag: 'damage', label: 'The bite', detail: '20 damage to whoever springs it, plus 20 Hopelessness — the largest single lump the kit applies.' },
        { tag: 'control', label: 'Stun', detail: '2s of full stun on the victim.' },
        { tag: 'area', label: 'The plate', detail: '18px trigger radius, standing 12s or until sprung. One bite only; a trap is spent when it fires.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown, so several can be alive at once.' },
      ],
      upgrade: {
        basics:
          'The trigger radius goes from 18px to 27px, half again as wide, and casting the tentacle near '
          + 'one of your own traps hooks the trap instead of whiffing, holding it for the full 3 seconds so '
          + 'you can carry it somewhere better.',
        effects: [
          { tag: 'area', label: 'Wider jaws', detail: 'Trigger radius goes from 18px to 27px — 50% larger.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Draggable', detail: 'Casting the tentacle near one of your own traps hooks the trap instead of whiffing, and holds for the full 3s so you can reposition it.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Catching enemies in traps is one of the four Shadow Mastery requirements (50 catches).',
        'A trap is placed on the caster, so laying one is always a commitment of where you are standing right now.',
      ],
    },

    'tentacle-wall': {
      basics:
        'Eight limbs 34px apart that you steer as they grow: the first rises at the cast point and the '
        + 'rest follow one every 55ms toward wherever your cursor is, so the whole ~440ms of growth is a '
        + 'steering window. Contact within 28px of a limb deals 5 damage and 10 Hopelessness, gated to '
        + 'one hit per target per second however many limbs they are touching — walking the length of a '
        + 'wall is 5 a second, not 40. It stands 6 seconds from the moment the last limb rises. 12s '
        + 'cooldown.',
      cast: 'F, steered live. The first limb rises at the cast point; the remaining seven follow one every 55ms toward the current cursor.',
      effects: [
        { tag: 'damage', label: 'Per spike', detail: '5 damage and 10 Hopelessness per contact, within 28px of a limb.' },
        { tag: 'utility', label: 'Hit gate', detail: 'One wall can only hit the same target once per second, however many of its limbs they are touching — walking the length of a wall is 5 a second, not 40.' },
        { tag: 'area', label: 'The wall', detail: '8 limbs 34px apart, standing 6s from the moment the last one rises.' },
        { tag: 'movement', label: 'Steerable', detail: 'The 55ms stagger is a real steering window: the wall follows the cursor for the ~440ms it takes to grow.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown.' },
      ],
      upgrade: {
        basics:
          'Each of the 8 limbs has a 20% chance to grow eyes, so a wall averages one or two watchers and '
          + 'sometimes none. A watcher lobs a bolt every 1.5s that does no damage at all — landing within '
          + '44px of its mark, it multiplies that target\'s Hopelessness by 1.25×.',
        effects: [
          { tag: 'summon', label: 'Eyed limbs', detail: 'Each of the 8 limbs has a 20% chance to grow eyes — on average 1 to 2 per wall, and sometimes none.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Despair amplifier', detail: 'A watcher lobs a bolt every 1.5s. On landing within 44px of its mark it multiplies their Hopelessness by 1.25× — it does no damage whatsoever.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Because watcher bolts multiply rather than add, they are worth nothing against a fresh target and worth 20 points against one already at 80.',
        'The limbs are static once grown. The wall is area denial, not a moving hazard.',
      ],
    },

    'black-hole': {
      basics:
        'The ultimate, and a pure positioning tool. After a 3-second arm-raise lock the hole follows '
        + 'your mouse every frame for 3 seconds, overwriting the victim\'s velocity toward it at 550 no '
        + 'matter what they were doing — no movement input survives it — so they can be walked anywhere '
        + 'on the map. It crushes for 5 damage a second, 15 in total, which is almost incidental. 260ms '
        + 'camera shake at birth, 220ms at the collapse. 35s cooldown, the longest in the combined tier.',
      cast: 'Q at the cursor. The caster is locked in a 3s arm-raise; the hole then tracks the pointer for its whole duration.',
      effects: [
        { tag: 'control', label: 'The pull', detail: 'The victim\'s velocity is overwritten toward the hole at 550 for the full 3s, whatever they were doing. It is a hard drag, not a force — no movement input survives it.' },
        { tag: 'dot', label: 'Crush', detail: '5 damage every second inside it — 15 across the ultimate. The damage is almost incidental; the positioning is the point.' },
        { tag: 'movement', label: 'Tracks your cursor', detail: 'The hole is wherever your mouse is, updated every frame, so the enemy can be walked anywhere on the map for three seconds.' },
        { tag: 'utility', label: 'Screen impact', detail: 'A 260ms camera shake on the birth and another 220ms when it collapses.' },
        { tag: 'utility', label: 'Availability', detail: '35s cooldown — the longest in the combined tier.' },
      ],
      upgrade: {
        basics:
          'The hole now feeds you 15 HP a second — 45 across the full three — drops a shadow pool at the '
          + 'cursor every 0.5s so six pools land exactly along the path you dragged them, and is drawn on a '
          + '22px core instead of 17px, leaving a void pillar mark where it was cast.',
        effects: [
          { tag: 'heal', label: 'Feeding', detail: '15 HP per second while the hole is active — 45 across the full 3s.', requiresUpgrade: 'q' },
          { tag: 'summon', label: 'Pool trail', detail: 'A shadow pool is dropped at the cursor every 0.5s during the ultimate — six pools, laid exactly along the path you dragged them.', requiresUpgrade: 'q' },
          { tag: 'area', label: 'Bigger hole', detail: 'The singularity is drawn at a 22px core instead of 17px, and it leaves a void pillar mark on the ground where it was cast.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Killing an enemy while they are inside the hole is one of the four Shadow Mastery requirements (25 kills).',
        'The pool trail from Void Singularity outlives the ultimate by 6s, so the ground you dragged them across stays hostile after the hole collapses.',
      ],
    },
  },

  perks: {
    'void-shade': {
      basics:
        'Pools become 43px instead of 36 — about 20% wider and 42% more floor — and stand 9 seconds '
        + 'instead of 6. Since pools build 3 Hopelessness a second, that is directly more suppression: a '
        + 'full stay is 27 points instead of 18.',
      effects: [
        { tag: 'area', label: 'Wider', detail: 'Pool radius 43px instead of 36 — about 20% more, and 42% more floor area.' },
        { tag: 'area', label: 'Longer', detail: 'Pools stand 9s instead of 6 — 50% longer.' },
        { tag: 'debuff', label: 'Compounding', detail: 'Since pools build 3 Hopelessness a second, a bigger, longer pool is directly more suppression: a full 9s stay is 27 points instead of 18.' },
      ],
      notes: [
        'Applies to every source of pools — bombs, the pour, Void Singularity\'s trail and the Plume trap alike.',
      ],
    },
    plume: {
      basics:
        'R plants stakes instead of traps, and every second stake strings a tripline back to the one '
        + 'before it with a 🧵 STRUNG pop-up. Stakes stand 24 seconds — twice a snap trap — and are '
        + 'completely inert until paired. Crossing a line costs 5 damage, 10 Hopelessness and a 50% slow '
        + 'for 3 seconds, at most once every 1.5s per fighter. With Consume or Trap Drag the tentacle '
        + 'hauls stakes around and the string follows.',
      cast: 'R plants a stake. Every second stake strings a tripline to the one before it, announced with a 🧵 STRUNG pop-up.',
      effects: [
        { tag: 'summon', label: 'Stakes', detail: 'Stakes stand 24s — twice as long as a snap trap — and are completely inert until paired.' },
        { tag: 'damage', label: 'Crossing the line', detail: '5 damage and 10 Hopelessness to anyone who crosses a tripline.' },
        { tag: 'control', label: 'Snag', detail: 'A 50% slow for 3s on the crosser.' },
        { tag: 'utility', label: 'Trip gate', detail: 'One tripline can only catch the same fighter once every 1.5s, so standing on it is not a grinder.' },
        { tag: 'utility', label: 'Draggable', detail: 'With the Consume or Trap Drag upgrade the tentacle hauls stakes around, and the string follows the stake it is tied to.' },
      ],
      notes: [
        'Stakes deal nothing by themselves. An odd number of stakes means the last one is doing nothing until you plant its partner.',
      ],
    },
    death: {
      basics:
        'Adds a four-tile trap bar above the arena; click a tile to select, R plants whichever is '
        + 'chosen, and the selection persists. All four stand 12 seconds and count toward the Ensnared '
        + 'mastery requirement. Jaws is the ordinary trap: 20 damage, 20 Hopelessness, 2s stun on an 18px '
        + 'plate. Mine takes the whole area instead of one victim: 35 damage and 10 Hopelessness within '
        + '92px, a 0.7s stun and a 220ms shake. Grabber seizes whoever springs it for 5 seconds and will '
        + 'not let them stray more than 62px, plus 15 Hopelessness, on the widest plate of the four. '
        + 'Plume bites for 20/20 with a 2s stun and then bursts into 10 shadow pools up to 78px around '
        + 'it. An AI or online Shadow always plants the base jaws whatever you are carrying.',
      cast: 'Click a tile on the trap bar to select. R plants whichever is selected. Clicking the bar never counts as an attack.',
      effects: [
        { tag: 'utility', label: 'The bar', detail: 'Four tiles above the arena, built the first frame the perk is live and torn down if it is not. Selection persists until you change it. All four traps keep the 12s lifetime and still count toward the Ensnared mastery requirement.' },
        { tag: 'damage', label: 'Base — Jaws', detail: '20 damage, 20 Hopelessness, 2s stun, on an 18px plate (27px with Trap Drag). Unchanged from the ordinary Snap Trap.' },
        { tag: 'damage', label: 'Mine', detail: '35 damage and 10 Hopelessness to everything within 92px, a 0.7s stun and a 220ms camera shake. It does not bite one victim — it takes the whole area.' },
        { tag: 'control', label: 'Grabber', detail: 'Seizes whoever springs it for 5s and will not let them stray further than 62px from the trap, plus 15 Hopelessness. A 30px plate, 40px with Trap Drag — the widest of the four.' },
        { tag: 'summon', label: 'Plume', detail: '20 damage, 20 Hopelessness and a 2s stun, then the trap bursts into 10 shadow pools scattered up to 78px around it.' },
        { tag: 'cost', label: 'NPCs never get it', detail: 'An AI or online Shadow always plants the base jaws, whatever you are carrying.' },
      ],
    },
  },

  mastery: {
    'shared-suffering': {
      basics:
        'Your own suffering is broadcast: for every 30 damage you take, 5 Hopelessness lands on every '
        + 'enemy at once. The counter is cumulative, so one big hit and ten small ones count the same. A '
        + '400 HP fighter taken to the wire has pulsed about thirteen times — 65 Hopelessness, a 32% cut '
        + 'to everything aimed at them.',
      effects: [
        { tag: 'debuff', label: 'Pulse', detail: 'For every 30 damage you take, 5 Hopelessness is applied to every enemy at once. The counter is cumulative, so it does not care whether that was one big hit or ten small ones.' },
        { tag: 'utility', label: 'Scales with the fight', detail: 'A 400 HP fighter taken to the wire has broadcast roughly 13 pulses — 65 Hopelessness, or a 32% cut to everything aimed at them.' },
      ],
      notes: [
        'Passive — no bind and no key. It rewards exactly the fights Shadow is worst at, which is the point.',
      ],
    },
    'shadow-beacon': {
      basics:
        'A bindable pair: one press drops a mortar at your feet and a target dot at the cursor, both '
        + 'standing 20 seconds. Walking onto the mortar fires it — 20 damage and 10 Hopelessness within '
        + '70px of the dot — with no per-shot cooldown at all, so the cadence is however fast you can run '
        + 'laps back to it. 35s cooldown, so one beacon is live at a time.',
      cast: 'Bindable to E, R, F or Q. One press drops the mortar at your feet and the target dot at the cursor; after that it fires on contact, not on input.',
      effects: [
        { tag: 'damage', label: 'The shell', detail: '20 damage and 10 Hopelessness within 70px of the marked dot.' },
        { tag: 'utility', label: 'Firing it', detail: 'Every time you walk onto the mortar it launches. There is no per-shot cooldown — the cadence is however fast you can run laps back to it.' },
        { tag: 'summon', label: 'Lifetime', detail: 'Both the mortar and the dot stand 20s, then expire together.' },
        { tag: 'utility', label: 'Availability', detail: '35s cooldown, so one beacon is live at a time.' },
      ],
      notes: [
        'The dot cannot be moved once placed. The whole ability is a bet about where the enemy will be for the next twenty seconds.',
      ],
    },
  },
};

export default shadow;
