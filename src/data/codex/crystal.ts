import { ElementCodex } from '../AbilityCodex';

/**
 * Crystal — a geometry kit. Every ability is a piece of furniture that changes where a shard
 * ends up, and the damage comes from how many of them it touched on the way.
 *
 * Verified against `src/elements/crystal.ts`, `kits/CrystalKit.ts`, the crystal block of
 * `data/Upgrades.ts`, the Gateway perk and `data/Mastery.ts`.
 */
const crystal: ElementCodex = {
  identity:
    'Optics as combat. A Diamond Shard leaves your hand for 15 damage and does not stop — it '
    + 'ricochets off lances you planted, snaps through gates you anchored, and multiplies itself by '
    + 'half again on every single bounce. Crystal has no ability that hits hard on its own and no '
    + 'ceiling on what a shot can become; the fight is about building the room before you fire into it.',

  passives: [
    {
      emoji: '🔺',
      name: 'Compounding Bounces',
      basics:
        'The rule the whole element is built on: every bounce multiplies a shard\'s damage by 1.5, with '
        + 'no cap — 15 → 23 → 34 → 51 → 76 → 114 and onward, as long as the geometry holds. Each bounce '
        + 'also re-aims up to 30° toward the enemy, so a lance placed roughly right still sends the shot '
        + 'at them. Passing through a Crystal Portal counts as a bounce and snaps the same way. Nothing '
        + 'expires: a shard flies until it hits a fighter or leaves the world.',
      effects: [
        { tag: 'damage', label: 'The multiplier', detail: '×1.5 damage per bounce, with no limit. 15 → 23 → 34 → 51 → 76 → 114, and it keeps going as long as the geometry holds.' },
        { tag: 'utility', label: 'Auto-aim snap', detail: 'A bounce re-aims within 30° toward the enemy, so a lance placed roughly right still sends the shard at them.' },
        { tag: 'utility', label: 'Gates count too', detail: 'Passing through a Crystal Portal applies the same ×1.5 as a bounce, and re-aims the same way.' },
        { tag: 'utility', label: 'Nothing expires', detail: 'A shard flies until it hits a fighter or leaves the world. There is no travel timeout and no bounce budget.' },
      ],
      notes: [
        'Hitting an enemy with a shard that has already bounced twice is one of the four Crystal Mastery requirements (50 hits).',
        'Only the player\'s shards start at 15. An AI Crystal fires 8s, and clone copies fire 6s.',
      ],
    },
  ],

  abilities: {
    'crystal-laser': {
      basics:
        'A 15-damage shard fired at the cursor with a 26px hit radius, travelling 520 px/s indefinitely '
        + '— it is consumed on a fighter and on nothing else. Every crystal it reflects off multiplies it '
        + 'by 1.5 with a 30° snap toward the enemy, uncapped. 0.5s cooldown, which is why a lattice fills '
        + 'with shards so fast.',
      cast: 'Click, aimed at the cursor. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '15 damage, before any bounce multiplier. It is consumed on a fighter and on nothing else.' },
        { tag: 'utility', label: 'Flight', detail: '520 px/s, with a 26px hit radius. It flies indefinitely.' },
        { tag: 'damage', label: 'Bounces', detail: '×1.5 per crystal it reflects off, uncapped, with a 30° auto-aim snap toward the enemy on each one.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.5s cooldown — two a second, and the reason a lattice fills with shards so quickly.' },
      ],
      upgrade: {
        basics:
          'Every shard also gets one rebound off an arena wall, taking the same ×1.5. Once spent it is '
          + 'gone until Atune refreshes it. There is nothing to switch on — buying it makes every wall a '
          + 'mirror for the rest of the game.',
        effects: [
          { tag: 'damage', label: 'Wall bounce', detail: 'Every shard gets one rebound off an arena wall, applying the same ×1.5. Once spent it is gone until Atune refreshes it.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'Always on', detail: 'There is nothing to activate — buying it makes every wall a mirror for the rest of the game.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Getting 25 of your own shards on screen at once is one of the four Crystal Mastery requirements (10 times) — at 0.5s a shot with 12s clones out, this is reachable.',
      ],
    },

    'crystal-place': {
      basics:
        'Plants a permanent 6×56px prism at the cursor, angled from you to the cursor. Your shards '
        + 'bounce off it for ×1.5 and a 30° snap; enemy projectiles that meet it are turned away rather '
        + 'than passing through. Six at once, and a seventh shatters the oldest. 2.5s cooldown, and an AI '
        + 'Crystal is capped at 3 instead of 6.',
      cast: 'E at the cursor. The lance takes the angle from you to the cursor.',
      effects: [
        { tag: 'summon', label: 'The lance', detail: 'A 6×56px prism, permanent, standing at the cast angle. Up to 6 at once — planting a 7th shatters the oldest.' },
        { tag: 'damage', label: 'Reflects yours', detail: 'Your Diamond Shards bounce off it for ×1.5 and a 30° snap toward the enemy.' },
        { tag: 'shield', label: 'Deflects theirs', detail: 'Enemy projectiles that meet it are turned away rather than passing through.' },
        { tag: 'utility', label: 'Availability', detail: '2.5s cooldown. An AI Crystal is capped at 3 lances instead of 6.' },
      ],
      upgrade: {
        basics:
          'Lances now glide away from you at 134 px/s from your own position instead of appearing at the '
          + 'cursor, and recasting E halts every moving one. A shard bouncing off a moving lance also sets '
          + 'off 18-damage blasts in an 85px radius along its onward flight, on top of the usual ×1.5.',
        effects: [
          { tag: 'movement', label: 'Gliding', detail: 'Placed lances travel away from you at 134 px/s from your own position rather than appearing at the cursor. Recasting E halts every moving lance.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Kinetic blasts', detail: 'A shard bouncing off a moving lance sets off 18-damage blasts in an 85px radius along its onward flight path, on top of the usual ×1.5.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Bouncing off a moving crystal is one of the four Crystal Mastery requirements (250 bounces).',
        'With Lattice Lace bought, attuned lances can no longer be halted with E — the key summons another one instead.',
      ],
    },

    'crystal-atune': {
      basics:
        'Freezes every shard on screen — yours and theirs — for 2 seconds, then launches the whole '
        + 'salvo at your aim point. Frozen shards rotate to face the cursor so the direction is readable '
        + 'before it fires, and each one gets its spent wall-bounce charge restored, though a shard can '
        + 'only ever hold one. 7s cooldown, and it keeps re-aiming from your live cursor for the whole '
        + 'hold.',
      cast: 'R. Instant, arena-wide, and it re-aims from your live cursor for the whole 2s hold.',
      effects: [
        { tag: 'control', label: 'The freeze', detail: 'Every shard on screen stops dead for 2s, then launches at your aim point. It catches enemy shards too.' },
        { tag: 'utility', label: 'Visible aim', detail: 'Frozen shards rotate to face the cursor, so the whole salvo\'s direction is readable before it fires.' },
        { tag: 'utility', label: 'Bounce refresh', detail: 'Each shard\'s spent wall-bounce charge is restored. It does not stack — a shard can only ever hold one.' },
        { tag: 'utility', label: 'Availability', detail: '7s cooldown.' },
      ],
      upgrade: {
        basics:
          'Moving lances are caught in the freeze too and redirected at your aim point on release. '
          + 'Attuned lances turn violet, grow 25% longer (56px to 70px) and slow to about 100 px/s, and the '
          + 'first enemy one reaches is orbited at a 70px radius, 2.4 radians a second, for 8 seconds '
          + 'before it carries on — once per lance. E stops halting attuned lances; pressing it summons '
          + 'another instead.',
        effects: [
          { tag: 'control', label: 'Lances frozen too', detail: 'Every moving lance pauses for the same 2s and is redirected at your aim point on release.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'Attuned', detail: 'Attuned lances turn violet, grow 25% longer (56px → 70px) and travel at 75% speed — about 100 px/s.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'Orbiting', detail: 'An attuned lance that reaches an enemy circles them at a 70px radius, 2.4 radians a second, for 8s before continuing along its old path. Once per lance.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'No longer haltable', detail: 'E stops halting attuned lances. Pressing it summons another one instead.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With Crystal Shredder bound, recasting Atune also throws an idle chakram back out at your current cursor.',
      ],
    },

    'crystal-portal': {
      basics:
        'Places gate A on the first press and gate B on the second, a third replacing the older. '
        + 'Touching either puts you at the other instantly, with no cost and no limit. Your shards pass '
        + 'through and come out with ×1.5 and a fresh 30° snap, so a gate is a bounce that also moves the '
        + 'shot across the map, and enemy projectiles entering are sent back at them with +50% damage. An '
        + 'enemy who enters collapses the gate and is stunned for 2 seconds — they never get the '
        + 'teleport. 5s cooldown.',
      cast: 'F at the cursor. The first press places A, the second places B; a third replaces the older of the two.',
      effects: [
        { tag: 'movement', label: 'Teleport', detail: 'Touching either gate puts you at the other one instantly. There is no cost and no limit on how often.' },
        { tag: 'damage', label: 'Shards through gates', detail: 'Your Diamond Shards pass through and come out of the far gate with ×1.5 damage and a fresh 30° auto-aim snap — a gate is a bounce that also moves the shot across the map.' },
        { tag: 'control', label: 'Enemy entry', detail: 'An enemy that enters a gate collapses it and is stunned for 2s. They never get the teleport.' },
        { tag: 'damage', label: 'Redirected shots', detail: 'Enemy projectiles entering a gate are sent back out at them with +50% damage.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        basics: 'Every teleport also grants +20% move speed for 3 seconds, refreshed on each jump.',
        effects: [
          { tag: 'buff', label: 'Exit speed', detail: '+20% move speed for 3s after every teleport, refreshed on each jump.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Stepping through your own portal is one of the four Crystal Mastery requirements (100 traversals).',
        'Because a gate applies the bounce multiplier, an A→B loop with lances at both ends compounds a single shard very quickly.',
      ],
    },

    'crystal-trick': {
      basics:
        'Stands 2 mirages of 50 HP each 58px to either side of you for 12 seconds, following you and '
        + 'positioned off your facing. Every shard you launch is duplicated from each of them at 6 damage '
        + 'instead of 15 — and the copies bounce and compound exactly as yours do. Each clone carries a '
        + '30px health bar and a white direction pip. 0.9s arm-raise, 50s cooldown, the longest in the '
        + 'combined tier alongside Shadow\'s Black Hole.',
      cast: 'Q. Instant, with a 0.9s arm-raise. Clones are positioned relative to your facing and follow you.',
      effects: [
        { tag: 'summon', label: 'The mirages', detail: '2 clones at 50 HP each, standing 58px to either side of you, for 12s.' },
        { tag: 'damage', label: 'Copied fire', detail: 'Every Diamond Shard you launch is duplicated from each clone at 6 damage instead of 15 — but the copies bounce and compound exactly like yours do.' },
        { tag: 'utility', label: 'Readable', detail: 'Each clone carries a 30px health bar and a white direction pip, so their state and aim are legible at a glance.' },
        { tag: 'utility', label: 'Availability', detail: '50s cooldown — the longest in the combined tier alongside Shadow\'s Black Hole.' },
      ],
      upgrade: {
        basics:
          'Three clones instead of two, and placed as cover rather than as an escort: one 50px directly '
          + 'ahead and two 40px out to each side at 30px forward. That is 150 HP of clone between you and '
          + 'the enemy instead of 100 HP standing beside you.',
        effects: [
          { tag: 'summon', label: 'Three, forward', detail: '3 clones instead of 2, positioned 50px directly ahead and 40px out to each side at 30px forward — a shield wall rather than an escort.', requiresUpgrade: 'q' },
          { tag: 'shield', label: 'Body blocking', detail: '150 HP of clone standing between you and the enemy instead of 100 HP standing beside you.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'With Crystal Shredder bound, each clone also throws a mini chakram carrying 4 shards.',
      ],
    },
  },

  perks: {
    gateway: {
      basics:
        'Lances become gateways: 9×84px instead of 6×56px, half again as wide and long and far harder '
        + 'to miss. Shards travel through them instead of bouncing off, still taking the ×1.5, and gain '
        + 'speed as well as damage on the way. They still glide like ordinary lances if you own Moving '
        + 'Crystals.',
      effects: [
        { tag: 'area', label: 'Bigger lances', detail: '9×84px instead of 6×56px — 50% wider and 50% longer, so they are far harder to miss.' },
        { tag: 'damage', label: 'Pass-through', detail: 'Shards travel through a gateway rather than bouncing off it, and still take the ×1.5.' },
        { tag: 'buff', label: 'Barrage boost', detail: 'Shards passing through a gateway gain speed as well as damage.' },
        { tag: 'movement', label: 'Still mobile', detail: 'Gateways glide exactly as ordinary lances do when Moving Crystals is owned.' },
      ],
      notes: [
        'It is announced with a 🌀 GATEWAY pop-up on every placement, because a gateway and a mirror are the same silhouette at gameplay zoom.',
      ],
    },
  },

  mastery: {
    resonance: {
      basics:
        'One of your own shards reaching you within 20px is absorbed for ×3 move speed for 0.2 seconds, '
        + 'announced with a ✨ RESONANCE pop-up. Only shards that have already bounced at least once count '
        + '— a shot you just fired cannot pay out.',
      effects: [
        { tag: 'movement', label: 'The burst', detail: '×3 move speed for 0.2s every time one of your own shards reaches you.' },
        { tag: 'utility', label: 'Must have bounced', detail: 'Only shards that have already bounced at least once count, within 20px. A shard you just fired cannot pay out.' },
        { tag: 'utility', label: 'Absorbed, not wasted', detail: 'The shard is consumed on absorption, announced with a ✨ RESONANCE pop-up.' },
      ],
      notes: [
        'Passive — no bind and no key. In a dense lattice the bursts overlap into something close to continuous.',
      ],
    },
    'crystal-shredder': {
      basics:
        'A bindable chakram thrown to the cursor at 260 px/s, spinning at 3.2 radians a second, that '
        + 'parks where it arrives. It deals 2 damage per shard it carries, within 15px, consuming that '
        + 'shard — 24 damage from a full 12. Recasting Atune throws an idle chakram back out at your '
        + 'current cursor, so the disc is reusable while it still has shards, and with Trick of the Light '
        + 'every clone throws a mini chakram of 4 shards as well, tripling the shredding. 14s cooldown.',
      cast: 'Bindable to E, R, F or Q. Flies to the cursor and stops there.',
      effects: [
        { tag: 'damage', label: 'Per shard', detail: '2 damage per shard, within 15px of it, and that shard is consumed. 12 shards is 24 damage if every one connects.' },
        { tag: 'movement', label: 'The throw', detail: '260 px/s to the cursor, rotating at 3.2 radians a second, then it parks where it arrived.' },
        { tag: 'utility', label: 'Re-throwing it', detail: 'Recasting Atune launches an idle chakram back out toward your current cursor — the disc is reusable while it has shards.' },
        { tag: 'summon', label: 'With Trick of the Light', detail: 'Each clone also throws a mini chakram carrying 4 shards, so a Q window triples the shredding.' },
        { tag: 'utility', label: 'Availability', detail: '14s cooldown.' },
      ],
      notes: [
        'A parked chakram is not harmless — an enemy walking into it still loses shards into themselves.',
      ],
    },
  },
};

export default crystal;
