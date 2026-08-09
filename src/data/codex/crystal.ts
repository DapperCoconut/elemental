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
      magic:
        'A shard does not lose energy off a facet — it gains it. Every crystal it touches re-cuts '
        + 'the light a little tighter, so a shot that has been round a lattice of your own lances '
        + 'arrives carrying several times what it left with. Nothing else in the game scales '
        + 'without a cap.',
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
      magic:
        'A kite of cut glass thrown flat, spinning, catching the light as it goes. On its own it is '
        + 'the weakest click in the combined tier. What makes it the whole element is that it has no '
        + 'idea when to stop: it keeps travelling until something with a health bar is in the way, '
        + 'and everything else it touches only makes it worse.',
      cast: 'Click, aimed at the cursor. Instant.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '15 damage, before any bounce multiplier. It is consumed on a fighter and on nothing else.' },
        { tag: 'utility', label: 'Flight', detail: '520 px/s, with a 26px hit radius. It flies indefinitely.' },
        { tag: 'damage', label: 'Bounces', detail: '×1.5 per crystal it reflects off, uncapped, with a 30° auto-aim snap toward the enemy on each one.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.5s cooldown — two a second, and the reason a lattice fills with shards so quickly.' },
      ],
      upgrade: {
        magic:
          'Shredder mirrors the arena itself. The Crystal Realm is switched on permanently, which '
          + 'means the four walls stop being the edge of the fight and start being another surface '
          + 'to work off — one free rebound per shard, anywhere, without planting anything.',
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
      magic:
        'A lance of clear crystal grown out of the floor at the angle you aimed it — not dropped, '
        + 'grown. It has no health, it deals no damage, and it never expires. Its whole job is to be '
        + 'a surface: your shards come off it hotter and re-aimed, and enemy shots that meet it are '
        + 'turned away.',
      cast: 'E at the cursor. The lance takes the angle from you to the cursor.',
      effects: [
        { tag: 'summon', label: 'The lance', detail: 'A 6×56px prism, permanent, standing at the cast angle. Up to 6 at once — planting a 7th shatters the oldest.' },
        { tag: 'damage', label: 'Reflects yours', detail: 'Your Diamond Shards bounce off it for ×1.5 and a 30° snap toward the enemy.' },
        { tag: 'shield', label: 'Deflects theirs', detail: 'Enemy projectiles that meet it are turned away rather than passing through.' },
        { tag: 'utility', label: 'Availability', detail: '2.5s cooldown. An AI Crystal is capped at 3 lances instead of 6.' },
      ],
      upgrade: {
        magic:
          'Moving Crystals unbolts the lattice. Lances no longer stand where you planted them — they '
          + 'glide away from you at a steady crawl, so the room is always re-arranging itself. And a '
          + 'shard that catches a *moving* mirror does not just bounce: the impact detonates along '
          + 'the whole path it takes afterwards.',
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
      magic:
        'Everything in the air stops. Every Diamond Shard on the screen — yours, theirs, bounced or '
        + 'fresh — hangs still for two full seconds, and while they hang they all swing to point at '
        + 'your cursor, so you are looking at exactly where the volley will go before it goes. Then '
        + 'they all leave at once.',
      cast: 'R. Instant, arena-wide, and it re-aims from your live cursor for the whole 2s hold.',
      effects: [
        { tag: 'control', label: 'The freeze', detail: 'Every shard on screen stops dead for 2s, then launches at your aim point. It catches enemy shards too.' },
        { tag: 'utility', label: 'Visible aim', detail: 'Frozen shards rotate to face the cursor, so the whole salvo\'s direction is readable before it fires.' },
        { tag: 'utility', label: 'Bounce refresh', detail: 'Each shard\'s spent wall-bounce charge is restored. It does not stack — a shard can only ever hold one.' },
        { tag: 'utility', label: 'Availability', detail: '7s cooldown.' },
      ],
      upgrade: {
        magic:
          'Lattice Lace extends the freeze to the furniture. Your moving lances stop too, and they '
          + 'come out of it changed — violet, longer, slower, and hunting. A lace that reaches an '
          + 'enemy wraps around them and orbits for eight seconds before carrying on with whatever '
          + 'it was doing.',
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
      magic:
        'Two gates anchored into the floor, labelled A and B, and everything that touches one comes '
        + 'out of the other. It is transport for you, a damage multiplier for your shards, and a '
        + 'trap for anybody who follows you through — the gate collapses on an enemy rather than '
        + 'carrying them.',
      cast: 'F at the cursor. The first press places A, the second places B; a third replaces the older of the two.',
      effects: [
        { tag: 'movement', label: 'Teleport', detail: 'Touching either gate puts you at the other one instantly. There is no cost and no limit on how often.' },
        { tag: 'damage', label: 'Shards through gates', detail: 'Your Diamond Shards pass through and come out of the far gate with ×1.5 damage and a fresh 30° auto-aim snap — a gate is a bounce that also moves the shot across the map.' },
        { tag: 'control', label: 'Enemy entry', detail: 'An enemy that enters a gate collapses it and is stunned for 2s. They never get the teleport.' },
        { tag: 'damage', label: 'Redirected shots', detail: 'Enemy projectiles entering a gate are sent back out at them with +50% damage.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        magic:
          'Portal Boost pays you for using your own network. Coming out of a gate you keep the '
          + 'momentum of the jump for a few seconds, which turns the pair from a repositioning tool '
          + 'into an actual movement loop.',
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
      magic:
        'The caster refracts. Two mirages of you are pulled out of your own body on visible beams '
        + 'of light, each with its own small health bar and its own facing pip, and each of them '
        + 'fires whenever you do. They are real objects — they can be shot, and they die — but for '
        + 'twelve seconds every click is three clicks.',
      cast: 'Q. Instant, with a 0.9s arm-raise. Clones are positioned relative to your facing and follow you.',
      effects: [
        { tag: 'summon', label: 'The mirages', detail: '2 clones at 50 HP each, standing 58px to either side of you, for 12s.' },
        { tag: 'damage', label: 'Copied fire', detail: 'Every Diamond Shard you launch is duplicated from each clone at 6 damage instead of 15 — but the copies bounce and compound exactly like yours do.' },
        { tag: 'utility', label: 'Readable', detail: 'Each clone carries a 30px health bar and a white direction pip, so their state and aim are legible at a glance.' },
        { tag: 'utility', label: 'Availability', detail: '50s cooldown — the longest in the combined tier alongside Shadow\'s Black Hole.' },
      ],
      upgrade: {
        magic:
          'Shield Clones re-forms the mirages from a flanking pair into a wedge in front of you. '
          + 'There are three of them, they all stand between you and whatever you are looking at, and '
          + 'their health bars are the first thing an incoming shot meets.',
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
      magic:
        'Mirrors stop reflecting. Every lance you plant becomes a gateway instead — bigger, and a '
        + 'thing light passes *through* rather than off. The damage multiplier survives the change, '
        + 'so the lattice keeps compounding shots; what it stops doing is bending them, which makes '
        + 'a straight line through several lances the strongest shot in the kit.',
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
      magic:
        'Your own light stops being something to stay out of. A bounced shard that comes back and '
        + 'hits you is not a mistake — it is absorbed, drunk back into the body, and for a fifth of '
        + 'a second you move at three times your speed. It rewards standing inside your own lattice '
        + 'rather than beside it.',
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
      magic:
        'A chakram thrown flat at your cursor with twelve shards standing out of its rim, spinning '
        + 'as it goes. It does not explode and it does not bounce — it grinds. Every shard that '
        + 'touches something breaks off and is gone, so the disc is a magazine that empties by '
        + 'contact rather than by time.',
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
