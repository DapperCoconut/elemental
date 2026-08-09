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
      magic:
        'Despair, tracked as a number from 0 to 100. It is not damage and it does not tick — it '
        + 'blunts. The afflicted visibly blackens as it climbs, weeping black motes that sink '
        + 'instead of rising, and everything they throw at you lands softer for it.',
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
      magic:
        'The dark you spill stays where it fell, welling up out of the floor rather than fading in, '
        + 'and it is a two-way object: it feeds you and it eats them. Almost everything in the kit '
        + 'exists to put more of these on the ground or to keep somebody standing in one.',
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
      magic:
        'One button doing two unrelated jobs. Tapped, the caster throws a writhing orb of void that '
        + 'accelerates as it goes, grows a tail of tendrils behind it, and implodes rather than '
        + 'exploding. Held, they stop throwing and start pouring — hands out along the aim, laying '
        + 'dark onto the ground at the cursor until you let go.',
      cast: 'Click. Released under 300ms it is a tap and throws the bomb. Held past 300ms it becomes the pour, which continues for as long as the button is down.',
      effects: [
        { tag: 'damage', label: 'Bomb impact', detail: '10 damage to everything within 50px of where it lands. Small, and the pool it leaves is the actual payload.' },
        { tag: 'summon', label: 'Bomb pool', detail: 'Every detonation leaves a shadow pool at the impact point — 36px, 6s, healing you and draining them.' },
        { tag: 'summon', label: 'The pour', detail: 'One pool every 0.6s at the cursor while held. There is no cost and no cooldown on the pour; it is limited only by how long you can stand still and aim.' },
        { tag: 'utility', label: 'Availability', detail: '0.8s cooldown on the tap. The pour is not gated by it at all.' },
        { tag: 'utility', label: 'Camera', detail: 'A 90ms shake on each bomb, so a detonation off screen still registers.' },
      ],
      upgrade: {
        magic:
          'Cloud Confusion makes standing in the dark a mistake rather than a cost. Long enough in a '
          + 'pool and the enemy loses the thread — they keep swinging, but they stop being able to '
          + 'decide where to go.',
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
      magic:
        'A limb lashes out of the caster\'s body along the aim. If there is anything close enough it '
        + 'takes hold, and from that moment the tentacle is a leash — the victim is hauled toward '
        + 'wherever your cursor goes, for three seconds, with no say in it. Reaching into empty air '
        + 'instead is a whiff that closes in half a second.',
      cast: 'E, aimed at the cursor. The limb reaches up to 100px toward the aim; anything within 110px of you is caught.',
      effects: [
        { tag: 'damage', label: 'Grab', detail: '10 damage on contact to every enemy within 110px, plus 10 Hopelessness.' },
        { tag: 'control', label: 'The leash', detail: 'A caught enemy is dragged toward your cursor for 3s. A miss retracts after 0.6s instead.' },
        { tag: 'area', label: 'Reach', detail: 'The visible limb extends 100px along the aim; the catch check is 110px in every direction from the caster.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        magic:
          'Consume turns the leash into a mouth. Drag them all the way in — right onto your own body — '
          + 'and the caster swallows them: a shroud of limbs closes over the pair and they simply stop '
          + 'being able to act. Then you choose whether to keep grinding them or throw them across the '
          + 'arena.',
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
      magic:
        'A set of jaws pushed into the floor at the caster\'s own feet — never at the cursor, which is '
        + 'the whole design. You have to have been somewhere to have trapped it. The jaws quiver over '
        + 'a pressure plate with a spark of charge breathing in the middle, and they bite once.',
      cast: 'R, planted at your feet. No aiming and no wind-up.',
      effects: [
        { tag: 'damage', label: 'The bite', detail: '20 damage to whoever springs it, plus 20 Hopelessness — the largest single lump the kit applies.' },
        { tag: 'control', label: 'Stun', detail: '2s of full stun on the victim.' },
        { tag: 'area', label: 'The plate', detail: '18px trigger radius, standing 12s or until sprung. One bite only; a trap is spent when it fires.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown, so several can be alive at once.' },
      ],
      upgrade: {
        magic:
          'Trap Drag stops the trap being a decision you already made. The jaws are wider, and your '
          + 'tentacle can pick them up — so a trap laid ten seconds ago in the wrong place can be '
          + 'hauled under somebody\'s feet in the middle of a fight.',
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
      magic:
        'Eight spiked limbs pushed up out of the floor one at a time, each erupting beside the last. '
        + 'They do not appear together — each one aims at wherever your cursor is at the instant it '
        + 'comes up, so sweeping the mouse mid-cast bends the wall into a curve, a hook, or a ring '
        + 'around somebody.',
      cast: 'F, steered live. The first limb rises at the cast point; the remaining seven follow one every 55ms toward the current cursor.',
      effects: [
        { tag: 'damage', label: 'Per spike', detail: '5 damage and 10 Hopelessness per contact, within 28px of a limb.' },
        { tag: 'utility', label: 'Hit gate', detail: 'One wall can only hit the same target once per second, however many of its limbs they are touching — walking the length of a wall is 5 a second, not 40.' },
        { tag: 'area', label: 'The wall', detail: '8 limbs 34px apart, standing 6s from the moment the last one rises.' },
        { tag: 'movement', label: 'Steerable', detail: 'The 55ms stagger is a real steering window: the wall follows the cursor for the ~440ms it takes to grow.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown.' },
      ],
      upgrade: {
        magic:
          'Watchers gives some of the limbs eyes. A watcher is darker than its neighbours, red-eyed, '
          + 'and it stops being a spike — it lobs bolts at whoever the wall is watching, and those '
          + 'bolts do no damage at all. What they do is multiply the despair already in the target.',
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
      magic:
        'The ultimate. A singularity is gathered at the cursor — matter visibly falling inward along '
        + 'spiralling arms — and for three seconds it owns the arena. It follows your live cursor the '
        + 'entire time, and whatever is caught is driven toward it at a speed nothing in the game '
        + 'outruns. It is the hardest displacement in the combined tier, and the longest cooldown.',
      cast: 'Q at the cursor. The caster is locked in a 3s arm-raise; the hole then tracks the pointer for its whole duration.',
      effects: [
        { tag: 'control', label: 'The pull', detail: 'The victim\'s velocity is overwritten toward the hole at 550 for the full 3s, whatever they were doing. It is a hard drag, not a force — no movement input survives it.' },
        { tag: 'dot', label: 'Crush', detail: '5 damage every second inside it — 15 across the ultimate. The damage is almost incidental; the positioning is the point.' },
        { tag: 'movement', label: 'Tracks your cursor', detail: 'The hole is wherever your mouse is, updated every frame, so the enemy can be walked anywhere on the map for three seconds.' },
        { tag: 'utility', label: 'Screen impact', detail: 'A 260ms camera shake on the birth and another 220ms when it collapses.' },
        { tag: 'utility', label: 'Availability', detail: '35s cooldown — the longest in the combined tier.' },
      ],
      upgrade: {
        magic:
          'Void Singularity feeds the caster off the hole. It is bigger and hungrier, it lays a trail '
          + 'of pools wherever you steer it, and while it runs you are healing faster than most '
          + 'elements can damage you.',
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
      magic:
        'The dark simply goes further. Nothing changes about how the pools work — they are just '
        + 'wider and they last half again as long, which quietly makes every Hopelessness figure in '
        + 'the kit bigger, because Hopelessness is paid by the second and pools are how you buy '
        + 'seconds.',
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
      magic:
        'Snap Traps stop biting. What you plant instead is a bare stake, useless on its own — and '
        + 'then a second stake, which strings a black tripline between the two. The trap is no longer '
        + 'a point on the floor, it is a line across it, and the enemy has to cross it rather than '
        + 'step on it.',
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
      magic:
        'The divine perk. A trap bar appears above the arena and R stops meaning one thing — you pick '
        + 'what gets planted before you plant it. The jaws are still there, but so are a charge, a '
        + 'grasping limb, and a trap that comes apart into a field of dark.',
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
      magic:
        'The despair stops being something you inflict and becomes something you leak. Every wound '
        + 'you take is a broadcast: the damage lands on you, and a little of what it costs you is '
        + 'paid by everybody on the other side.',
      effects: [
        { tag: 'debuff', label: 'Pulse', detail: 'For every 30 damage you take, 5 Hopelessness is applied to every enemy at once. The counter is cumulative, so it does not care whether that was one big hit or ten small ones.' },
        { tag: 'utility', label: 'Scales with the fight', detail: 'A 400 HP fighter taken to the wire has broadcast roughly 13 pulses — 65 Hopelessness, or a 32% cut to everything aimed at them.' },
      ],
      notes: [
        'Passive — no bind and no key. It rewards exactly the fights Shadow is worst at, which is the point.',
      ],
    },
    'shadow-beacon': {
      magic:
        'A mortar planted at your feet and a purple dot painted at your cursor. Neither does anything '
        + 'on its own. The ability is the walk between them: every time you step back onto the mortar '
        + 'it throws a shell at the dot, so the damage comes from moving through your own ground '
        + 'rather than from pressing anything.',
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
