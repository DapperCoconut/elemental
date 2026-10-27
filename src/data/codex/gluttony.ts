import { ElementCodex } from '../AbilityCodex';

/**
 * Wood — the birch ent (element id `gluttony`, kept from the chef and the scarecrow before it).
 *
 * Verified against `src/elements/gluttony.ts` and `kits/GluttonyKit.ts`. Every number below is a
 * constant at the top of the kit; the five shop upgrades are in the same blocks as the abilities
 * they change. No mastery yet (the chef's and Harvest's were retired). No perks.
 */
const gluttony: ElementCodex = {
  identity:
    'A birch ent: pale papery bark, black marks, and the eye scars birches are known for — two of '
    + 'them for eyes, a crown of twigs, and a giant scythe slung on its back. The arena is ringed '
    + 'with the same watching birches. It fights on Sap HP, amber health on top of its own that '
    + 'can climb past its maximum, grows back, and gums up whatever cuts into it. Its brew turns '
    + 'health into sap, stepping out of a tree grants it, digesting a beating turns the beating '
    + 'into it — and the scythe kills outright anything the ent out-healths by 60%.',

  passives: [
    {
      emoji: '🌳',
      name: 'Haunting Hollows',
      basics:
        'While a Wood is in the fight, the arena is ringed with birches — along the top and bottom '
        + 'edges and down both sides. Each one has an eye scar or two that blinks and turns to watch '
        + 'whichever fighter is nearest. They are where Commensalism (R) takes you, and where Friend '
        + 'of the Forest (F+) grows its apples. A tree Commensalism takes is a stump until it grows '
        + 'back 25 seconds later.',
      effects: [
        { tag: 'area', label: 'The ring', detail: 'Birches about every 120px around the edge of the arena.' },
        { tag: 'utility', label: 'Regrowth', detail: 'A tree you step out of is gone for 25 seconds.' },
      ],
      notes: [
        'The trees block nothing and cannot be hurt.',
        'They stand in the same places on both machines online, so a tree is the same tree for both players.',
      ],
    },
    {
      emoji: '🪵',
      name: 'Sap HP',
      basics:
        'An amber layer of bonus health, drawn on your health bar and spent after shields and weak '
        + 'HP, before your real health. Your health and Sap HP together can reach your maximum health '
        + 'plus 100 (Q+ Prune raises that to 200). It grows back on its own at 2 a second, up to the '
        + 'most you have held — until it is cut right through to nothing, which resets that mark. '
        + 'Whoever damages it is gummed up in sap: 30% slower for 1.5 seconds.',
      effects: [
        { tag: 'shield', label: 'Layer', detail: 'Soaks damage before your health. Health + Sap HP ≤ max health + 100.' },
        { tag: 'heal', label: 'Regrowth', detail: '2 a second, back up to the most you held since it was last broken.' },
        { tag: 'control', label: 'Gummed up', detail: 'Anyone who damages it moves 30% slower for 1.5s.' },
        { tag: 'resource', label: 'Sources', detail: 'Oakbrew (25), Commensalism (50), Digest (15% of damage taken), Tainted enemies (5 per 25 dealt), Prune.' },
      ],
      notes: [
        'Final Harvest counts Sap HP as health when it decides whether to kill.',
        'Piercing damage skips it, like every absorb layer.',
      ],
    },
  ],

  abilities: {
    'wood-carverang': {
      basics:
        'Throws a big wooden boomerang that flies a full circle out to the cursor and back to your '
        + 'hand. The loop\'s far side is the cursor: its diameter is the distance to it, between 150 '
        + 'and 400px. It takes 0.66 seconds plus 1.5ms per pixel of that diameter to come back, and '
        + 'the return leg homes onto wherever you are now. It pierces: 12 damage to every enemy it '
        + 'passes through, once each per loop. Right-click swaps which way the loop curls.\n\n'
        + '**Re-carve:** throw again while one of yours is in the last stretch of its loop (the final '
        + '28%) and that one does not come home — it swings round and flies a fresh loop out to the '
        + 'cursor, and can cut everything again. Keep timing it and the same boomerang never lands.',
      cast: 'Click (a press — each throw is its own click), at the cursor. Right-click flips the curl. 0.65s cooldown.',
      effects: [
        { tag: 'damage', label: 'Cut', detail: '12 to each enemy the loop passes through, once per loop.' },
        { tag: 'area', label: 'The loop', detail: 'Diameter = cursor distance, clamped 150–400px. 0.66s + 1.5ms/px round trip.' },
        { tag: 'utility', label: 'Re-carve', detail: 'A throw while one is coming home (last 28% of its loop) sends that one back out on a fresh loop.' },
      ],
      upgrade: {
        basics:
          'Amber Edge: the boomerang runs with golden amber the more Sap HP you carry — it is fully '
          + 'coated at 150. The amber cuts: up to 80% more damage (22 a cut at full), and against an '
          + 'enemy that is slowed by anything, up to 60% more again (35 a cut at full).',
        effects: [
          { tag: 'damage', label: 'Amber', detail: '+80% damage at 150 Sap HP, scaling down to nothing at 0.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Into the slowed', detail: 'Up to +60% more against a slowed enemy — your own sap gums them up.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The curl is shown in your status tray; the boomerang leaves your hand empty while it is out.',
        'Two can be in the air at once on a long loop.',
      ],
    },

    'wood-oakbrew': {
      basics:
        'Drinks a teacup of oakbrew. For 8 seconds you take 15% less damage, and 25 of your health '
        + 'turns into Sap HP at once — the same total, but sap grows back and gums up whoever cuts it. '
        + 'It never takes you below 1 health.',
      cast: 'E. 12s cooldown.',
      effects: [
        { tag: 'buff', label: 'Armour', detail: '15% less damage taken for 8 seconds.' },
        { tag: 'resource', label: 'Sap', detail: '25 health converted into 25 Sap HP.' },
      ],
      upgrade: {
        basics:
          'Brewmaster: the brew is cooked. Press E to put it on, hold, and let go to drink it. Up to '
          + '3 seconds of cooking add up to 8 more seconds (16 in all) and up to 35 free Sap HP on top '
          + 'of the 25 converted. If you take any damage while it is on the boil, the cup is knocked '
          + 'away, the brew is lost, and the cooldown is spent. Teammates within 150px get a cup as you '
          + 'drink — the same damage resistance for as long, and 25 Sap HP plus the cooked bonus — and '
          + 'so do your sprouts (R+).',
        effects: [
          { tag: 'buff', label: 'Cooked', detail: '+8s duration and +35 Sap HP at a full 3s cook, scaling.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Fragile', detail: 'Any damage while cooking spills it and spends the cooldown.', requiresUpgrade: 'e' },
          { tag: 'heal', label: 'Shared', detail: 'Teammates within 150px get the armour and the Sap HP.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'With an apple (F+) the brew eats one and lasts twice as long.',
      ],
    },

    'wood-commensalism': {
      basics:
        'Sinks into the ground and steps out of one of the birches around the arena — the standing '
        + 'tree nearest your cursor — taking its place. The tree is gone (a stump) until it grows '
        + 'back 25 seconds later. You gain 50 Sap HP. Stepping out of a tree with one of your apples '
        + 'on it picks the apple.',
      cast: 'R, toward the tree you want (nearest the cursor). 14s cooldown.',
      effects: [
        { tag: 'movement', label: 'Tree swap', detail: 'Teleport to the standing tree nearest the cursor.' },
        { tag: 'resource', label: 'Sap', detail: '+50 Sap HP.' },
      ],
      upgrade: {
        basics:
          'Mutualism: a sprout comes up where you sank into the ground — up to 4 (a fifth wilts the '
          + 'oldest). A sprout starts with 10 health and has no maximum; it grows as it is fed. Every '
          + 'heal or Sap HP your abilities give a sprout — Digest\'s aura, a shared Brewmaster cup — '
          + 'gives you half that much again, as the same kind, on top of what you gave yourself. '
          + 'Enemy shots that fly into a sprout hit it and stop there; an enemy standing on one '
          + 'tramples it for 25 a second.',
        effects: [
          { tag: 'summon', label: 'Sprout', detail: '10 health, no maximum. Up to 4.', requiresUpgrade: 'r' },
          { tag: 'heal', label: 'Mutualism', detail: '+50% of every heal or Sap HP you give a sprout, back to you.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'In the way', detail: 'Stops enemy shots that hit it; trampled for 25/s.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Q+ Prune cuts sprouts down for their health as Sap HP — the fatter, the better.',
      ],
    },

    'wood-digest': {
      basics:
        'Digests everything you took in the last 5 seconds (health and Sap HP lost). A healing '
        + 'aura of roots opens around you, 120px across, for 5 seconds: 15% of that damage comes back '
        + 'at once as Sap HP, and another 25% comes back as health over the 5 seconds. Teammates '
        + 'inside the aura get the same — the Sap HP if they are in it when you cast, the health '
        + 'while they stand in it.',
      cast: 'F, on yourself. Best right after a beating. 12s cooldown.',
      effects: [
        { tag: 'resource', label: 'At once', detail: '15% of the last 5 seconds\' damage as Sap HP.' },
        { tag: 'heal', label: 'Over time', detail: '25% of it as health over 5 seconds.' },
        { tag: 'area', label: 'Aura', detail: '120px around you, following you. Teammates inside are healed too.' },
      ],
      upgrade: {
        basics:
          'Friend of the Forest: every 7 seconds an apple grows on one of the trees (3 on the trees '
          + 'at most). Walk up to it to pick it; you carry up to 3, floating over your head. Your next '
          + 'Oakbrew eats one and lasts twice as long, or your next Digest eats one and heals 1.5× — '
          + 'both halves. Below 30% health they are eaten on their own, 25 health each, one every half '
          + 'second.',
        effects: [
          { tag: 'resource', label: 'Apples', detail: 'One every 7s on a tree. Carry up to 3.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Eaten with a cast', detail: 'Next Oakbrew 2× duration, or next Digest 1.5× healing.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Emergency', detail: 'Below 30% health: +25 health an apple.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Sprouts in the aura (R+) are fed the same, and Mutualism pays you half of it again.',
        'Nothing taken, nothing digested — the aura opens but heals nothing.',
      ],
    },

    'wood-final-harvest': {
      basics:
        'Takes the giant scythe off your back and, after a short wind-up, swings it through a wide '
        + 'arc in front of you (170px, 160°) for 35. Then, for every enemy it cut that is still '
        + 'standing: if your health plus Sap HP is at least 60% more than theirs, they die on the '
        + 'spot. Anyone it does not kill is Tainted for the rest of the match — every 25 damage you '
        + 'deal them from then on gives you 5 Sap HP.',
      cast: 'Q, toward the cursor. Ultimate: charged by damage dealt and taken.',
      effects: [
        { tag: 'damage', label: 'Swing', detail: '35 to everything in a 170px, 160° arc.' },
        { tag: 'control', label: 'Execute', detail: 'Kills outright when your health + Sap HP ≥ 1.6× theirs, after the 35.' },
        { tag: 'debuff', label: 'Tainted', detail: 'Survivors give you 5 Sap HP per 25 damage you deal them, permanently.' },
      ],
      upgrade: {
        basics:
          'Prune: the scythe cuts your own sprouts (R+) down too. Each one gives you half its health '
          + 'as Sap HP, and raises how far your health and Sap HP can climb past your maximum by 50 — '
          + 'from 100 up to 200. A pruned sprout is cut clean in half, goes grey, and lies where it fell '
          + 'for the rest of the match. Each one adds to your Guilt.',
        effects: [
          { tag: 'resource', label: 'Prune', detail: 'Half the sprout\'s health as Sap HP.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Overflow', detail: '+50 overflow per sprout, to 200 past max health.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Stack Sap HP before the swing — the brew and a tree are both sap, and sap counts.',
        'Executes pierce every shield.',
      ],
    },
  },
};

export default gluttony;
