import { ElementCodex } from '../AbilityCodex';

/**
 * Memory — the gentleman with a face of static.
 *
 * Verified against `src/elements/memory.ts` and `kits/MemoryKit.ts`. Every number below is a
 * constant at the top of the kit. No upgrades, no mastery, no perks yet.
 */
const memory: ElementCodex = {
  identity:
    'A dark figure in a top hat, leaning on a long cane, whose face is nothing but static. Every hit '
    + 'makes its enemies guiltier. Its shards fill their screen with static, its beam snatches back the '
    + 'time their abilities sat idle, Practice hits harder every time it is used, '
    + 'Repression turns their own click against them, and Trauma makes them relive a wound every second.',

  passives: [
    {
      emoji: '⚖️',
      name: 'Guilt',
      basics:
        'Every time an enemy of Memory takes damage, from any source, they take 1% more damage for the '
        + 'rest of the match. It stacks without limit — damage over time, Trauma\'s wound included.',
      effects: [
        { tag: 'debuff', label: 'Per hit', detail: '+1% damage taken per hit already taken. Never fades, no cap.' },
      ],
      notes: ['Self-inflicted damage does not count.'],
    },
  ],

  abilities: {
    'memory-forget': {
      basics:
        'Launch an obsidian shard. On a hit it does 6 damage, grows legs out of its blunt end and latches '
        + 'on for 5s. Up to 3 can be latched; a fourth replaces the oldest. What the victim sees depends on '
        + 'how many are in them.',
      cast: 'Click (hold to keep firing). 0.5s cooldown.',
      effects: [
        { tag: 'damage', label: 'Shard', detail: '6 damage. 700px/s, 620px range.' },
        { tag: 'debuff', label: '1 shard', detail: 'Memory and its health bar are lost in static on their screen. Bots aiming at you go 16–32° wide 40% of the time.' },
        { tag: 'debuff', label: '2 shards', detail: 'Their own health bar is static too.' },
        { tag: 'debuff', label: '3 shards', detail: 'Their cooldown bars are static. Bots: every 0.8s, a 45% chance they cannot use anything but their click.' },
        { tag: 'area', label: 'Latch', detail: '5s each, up to 3; a fourth replaces the oldest.' },
      ],
    },

    'memory-snatch': {
      basics:
        'Spin your cane for 2s, walking at 40% speed, then release a beam of static to your cursor. It '
        + 'splits into two slices that sweep 30° out to each side, making a cone. The beam puts every '
        + 'ready ability they have back on cooldown and takes the time each one had sat ready off all of '
        + 'your cooldowns. The slices lock their ready abilities for 2s and take 2s off yours. Each enemy is '
        + 'hit by the beam or a slice, never both.',
      cast: 'E. 8s cooldown.',
      effects: [
        { tag: 'damage', label: 'Beam', detail: '20 damage. 140–560px long (to the cursor), 22px wide.' },
        { tag: 'debuff', label: 'Beam theft', detail: 'Their ready non-ultimate abilities restart their full cooldown.' },
        { tag: 'buff', label: 'Stolen time', detail: 'Your cooldowns −(time each sat ready): up to 6s per ability, 12s total.' },
        { tag: 'damage', label: 'Slices', detail: '9 damage. Sweep ±30° in 0.24s, 14px wide.' },
        { tag: 'debuff', label: 'Slice theft', detail: 'Their ready abilities locked 2s; your cooldowns −2s.' },
        { tag: 'cost', label: 'Wind-up', detail: '2s spin at 40% speed. A stun or silence cancels it.' },
      ],
      notes: ['Ultimates are never snatched.'],
    },

    'memory-rebirth': {
      basics:
        'A thin white line runs wall to wall through your cursor and sweeps round (about 0.75 turns a '
        + 'second), following the cursor. Click to strike a thick white beam along it: 24 damage to anyone '
        + 'it hits. Every strike — hit or miss — adds 4 damage to every strike after it, for the rest of the match.',
      cast: 'R, then Click. 15s cooldown. Fires on its own after 3s.',
      effects: [
        { tag: 'damage', label: 'Beam', detail: '24 damage, +4 per earlier strike this match. Wall to wall, 40px wide.' },
        { tag: 'buff', label: 'Practice', detail: '+4 beam damage per use, permanent for the match.' },
        { tag: 'area', label: 'Sweep', detail: '≈0.75 turns/s round the cursor; auto-fires at 3s.' },
      ],
      notes: ['While the line sweeps, Click strikes it instead of throwing a shard.'],
    },

    'memory-repression': {
      basics:
        'A grey aura records your opponent for 6s — every step and every click. Then a static copy of '
        + 'them appears where they stood and walks their path, casting their real click again each time '
        + 'they clicked — same projectile, same mechanics — aimed at your cursor and hurting them instead.',
      cast: 'F. 15s cooldown.',
      effects: [
        { tag: 'summon', label: 'Static copy', detail: '6s of recording, then 6s of replay along their path.' },
        { tag: 'damage', label: 'Their click', detail: 'Their own click ability, cast from the copy at your cursor, at its own damage.' },
        { tag: 'utility', label: 'Clicks only', detail: 'E, R, F and Q are not copied. A held click is copied as a single tap.' },
      ],
    },

    'memory-trauma': {
      basics:
        'Pulse with a red aura for 3s. When it ends, every enemy takes 5% of the damage they took in '
        + 'those 3 seconds, every second, for the rest of the match. Casting it again replaces the old '
        + 'wound with the new one.',
      cast: 'Q. An ultimate: paid for in charge.',
      effects: [
        { tag: 'area', label: 'Window', detail: '3s. Counts every point of damage they take, from anything.' },
        { tag: 'dot', label: 'Wound', detail: '5% of that total, every 1s, for the rest of the match.' },
        { tag: 'cost', label: 'One wound', detail: 'A new Trauma replaces your old wounds.' },
      ],
      notes: ['Every tick is a hit, so each one also adds a Guilt stack.'],
    },
  },
};

export default memory;
