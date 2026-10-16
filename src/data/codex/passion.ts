import { ElementCodex } from '../AbilityCodex';

/**
 * Devotion — the holy priest (element id `passion`, kept from the charmer it replaced).
 *
 * Verified against `src/elements/passion.ts` and `kits/PassionKit.ts`. Devotion has no shop
 * upgrades and no mastery yet — Passion's were retired with the 2026-10-15 rework and new ones are
 * owed — and no perks. Every number below is a constant at the top of the kit.
 */
const passion: ElementCodex = {
  identity:
    'A priest in a tall white mitre who never deals a single point of damage. Every sermon, every '
    + 'drop of holy water and every blessed explosion fills a second bar over the enemy\'s head — '
    + 'faith — and the moment it reaches 200 they are converted and gone, whatever their health. '
    + 'Nothing lowers faith, and the bar works against its owner on the way up.',

  passives: [
    {
      emoji: '🙏',
      name: 'Faith',
      basics:
        'Devotion never deals damage. Its abilities add faith to the enemy instead, shown as a gold '
        + 'bar over their head. At 200 faith they are converted: killed on the spot, through every '
        + 'shield, armour and absorb layer. Nothing lowers faith. In a duel the bar is always 200; '
        + 'husks and bosses get a bar scaled to their max health (200 per 400 health, at least 30).',
      effects: [
        { tag: 'damage', label: 'Conversion', detail: 'At 200 faith (duel) the enemy dies outright. No shield, armour, absorb or invincibility stops it.' },
        { tag: 'area', label: 'Other bars', detail: 'Husks and bosses: 200 × (max HP ÷ 400), minimum 30, fixed the first time Devotion sees them.' },
        { tag: 'utility', label: 'No way back', detail: 'Faith is never lowered — not by healing, cleansing, time or the priest dying.' },
      ],
      notes: [
        'A halo forms over the believer as the bar fills: dotted at 25%, solid at 50%, a blazing glory at 75%.',
        'Ruin\'s Combo Breaker halves faith gains like any other meter.',
        'Online the bar is decided on the priest\'s machine; the victim sees it mirrored.',
      ],
    },
    {
      emoji: '✨',
      name: 'Stages of Faith',
      basics:
        'Faith changes the believer as it rises. At 25% (50 faith) it fills on its own, 2 a second. '
        + 'At 50% (100) their attacks land 20% softer on the priest. At 75% (150) they are drawn '
        + 'slowly toward the priest\'s nearest holy water, and every attack that adds faith adds 25% '
        + 'more.',
      effects: [
        { tag: 'dot', label: '25% — Kindled', detail: '+2 faith a second, forever. Not boosted by the 75% stage.' },
        { tag: 'shield', label: '50% — Faithful', detail: 'The priest takes 20% less damage while their nearest enemy is at 50% or more.' },
        { tag: 'control', label: '75% — Devout pull', detail: 'Drawn toward the priest\'s nearest holy-water puddle at 55px a second (stops near its middle).' },
        { tag: 'debuff', label: '75% — Devout', detail: 'Every ability adds 25% more faith to them.' },
      ],
      notes: [
        'The pull only exists while a puddle is on the floor — no holy water, no pull.',
        'Unbreakable and Unstoppable bodies, and bosses, are not pulled.',
      ],
    },
  ],

  abilities: {
    'passion-sermon': {
      basics:
        'Looses a barrage of Greek letters at the cursor, one after another in a single straight line. '
        + 'A tap sends 4 letters worth 3 faith each. Hold the button to preach longer: the longer '
        + 'the hold (up to 1.4 seconds), the more letters and the more faith each — a full sermon '
        + 'sends 12 letters worth 6 each, 72 if they all land. 0.48s cooldown.',
      cast: 'Click to tap; hold and release to charge (full at 1.4s). 0.48s cooldown.',
      effects: [
        { tag: 'debuff', label: 'Tap', detail: '4 letters, 3 faith each — 12 total.' },
        { tag: 'debuff', label: 'Full sermon', detail: '12 letters, 6 faith each — 72 total. In between scales evenly.' },
        { tag: 'area', label: 'The barrage', detail: 'One straight file along the aim, 34ms apart, 560px/s for 1.1s of flight.' },
      ],
      notes: [
        'A glory of rays builds behind the priest while the sermon charges — the enemy can see it coming.',
        'A full sermon into someone at 75% faith lands 7.5 a letter.',
      ],
    },

    'passion-holy-water': {
      basics:
        'Carries 2 bottles of holy water; each refills 7 seconds after it is used, one at a time. '
        + 'Lobs a bottle at the cursor (up to 380px); it shatters into a boiling puddle 72px across '
        + 'that lasts 8 seconds. Enemies standing in it gain 9 faith a second. Pressing E with no '
        + 'bottles does nothing.',
      cast: 'E, at the cursor (up to 380px). 2 charges, 7s refill each.',
      effects: [
        { tag: 'resource', label: 'Bottles', detail: '2 stored. Each refills 7s after the previous one is back.' },
        { tag: 'dot', label: 'Boiling', detail: '9 faith a second to every enemy inside the 72px puddle.' },
        { tag: 'area', label: 'The puddle', detail: '72px radius, 8 seconds. Lands 0.52s after the throw.' },
      ],
      notes: [
        'At 75% faith the enemy is pulled toward your nearest puddle — two bottles on the floor make two pulls to choose from.',
      ],
    },

    'passion-grenade': {
      basics:
        'Throws the Holy Hand Grenade at the cursor (up to 420px). It arrives, then keeps bouncing '
        + 'and rolling — off walls, enemies and enemy crucifixes — for 3 seconds from the throw, then '
        + 'bursts for 45 faith on every enemy within 130px. 10s cooldown.',
      cast: 'R, at the cursor (up to 420px). 10s cooldown.',
      effects: [
        { tag: 'debuff', label: 'The burst', detail: '45 faith to every enemy within 130px, 3 seconds after the throw.' },
        { tag: 'area', label: 'The bounce', detail: 'Bounces off arena walls, enemy bodies and enemy crucifix auras (78% speed kept per bounce).' },
      ],
      notes: [
        'A ring shrinks around it over the last second to show where the blast will reach.',
        'Your own crucifix does not stop it, so it keeps rattling round an enemy pinned against its rim.',
      ],
    },

    'passion-crucifix': {
      basics:
        'Plants a crucifix at the cursor (up to 440px). Enemies cannot set foot inside its 90px holy '
        + 'aura — anyone inside is set back on its edge. Every enemy projectile that crosses into the '
        + 'aura gives whoever fired it 1 faith. It stands for the rest of the match; planting another '
        + 'takes the old one down. 8s cooldown.',
      cast: 'F, at the cursor (up to 440px). 8s cooldown.',
      effects: [
        { tag: 'summon', label: 'The crucifix', detail: 'Permanent until you plant another. One per priest.' },
        { tag: 'control', label: 'Holy aura', detail: 'Enemies cannot enter its 90px radius.' },
        { tag: 'debuff', label: 'Blessed shots', detail: '+1 faith to the shooter for each enemy projectile that enters the aura (once per shot).' },
      ],
      notes: [
        'Planted on your own feet it is a sanctuary nobody can step into.',
        'Shots still fly on through it — the aura taxes them, it does not stop them.',
        'Ruin\'s Spikes of Ruin and Gold\'s Midas Curse treat it as a structure.',
      ],
    },

    'passion-ascendance': {
      basics:
        'A band of light 74px tall appears right across the arena where you stand. 3 seconds later a '
        + 'flaming chariot thunders along it, giving 60 faith to every enemy in the band as it passes. '
        + 'If you are still in the band when it reaches you, it carries you off: you vanish and cannot '
        + 'be hurt for 2 seconds, then crash down at the cursor for 80 faith to every enemy within '
        + '120px. 40s cooldown.',
      cast: 'Q. The line is drawn at your feet; the chariot runs toward the side you aim at. 40s cooldown. Ultimate.',
      effects: [
        { tag: 'area', label: 'The line', detail: '74px tall, full arena width, 3 seconds of warning.' },
        { tag: 'debuff', label: 'The chariot', detail: '60 faith to every enemy in the band as it passes (1500px/s).' },
        { tag: 'movement', label: 'Taken up', detail: 'Caught in it yourself: 2 seconds off the field, invisible and invulnerable.' },
        { tag: 'debuff', label: 'Descent', detail: 'Crash at the cursor: 80 faith to every enemy within 120px.' },
      ],
      notes: [
        'A burning mark shows where you will land for the last 0.7 seconds of the ride — aim it at them.',
        'Stepping off the line before the chariot arrives cancels the ride but not the chariot.',
      ],
    },
  },
};

export default passion;
