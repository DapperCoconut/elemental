import { ElementCodex } from '../AbilityCodex';

/**
 * Harvest — the scarecrow (element id `gluttony`, kept from the chef it replaced).
 *
 * Verified against `src/elements/gluttony.ts` and `kits/GluttonyKit.ts`. The five shop upgrades
 * (2026-10-16) are constants in the kit's "Shop upgrades" block; the mastery (2026-10-17) is in its
 * "Mastery" block — the chef's was retired with the 2026-10-15 rework. No perks. Every number below is a constant
 * at the top of the kit.
 */
const gluttony: ElementCodex = {
  identity:
    'A dark scarecrow with a burlap sack for a head, a stitched purple grin that will not stop '
    + 'drooling, and a scythe taller than it is. It plants rot. Sow Corruption seeds the ground '
    + 'with a purple mold of eyes and mouths that keeps spreading; whatever stands in it rots, and '
    + 'the rot is what the rest of the kit feeds on — the sickle heals more off a rotten body, the '
    + 'crows bite it harder, and the scythe kills it sooner. The mold grows hearts, and cutting one '
    + 'with the sickle is Corrupt HP.',

  passives: [
    {
      emoji: '🟣',
      name: 'Corruption',
      basics:
        'Corruption is a 0–100% meter on every enemy, shown in their status tray and as purple rot '
        + 'creeping up their body. It rises by 6% a second while they stand on mature Harvest mold '
        + '(less on younger mold), by a quarter of a point for every point of your Corrupt HP they '
        + 'chew through, and by 40% from a heavy Consume. Once they have been off the mold for 2.5 '
        + 'seconds it fades at 1.2% a second. Every hit Harvest lands heals you for a share of the '
        + 'damage equal to 35% × their corruption — 35% of the hit at full rot, nothing at none.',
      effects: [
        { tag: 'debuff', label: 'Mold', detail: '+6% a second standing on mature mold (scaled down on mold under full growth).' },
        { tag: 'debuff', label: 'Backlash', detail: '+0.25% for every point of Corrupt HP they damage.' },
        { tag: 'debuff', label: 'Heavy bite', detail: '+40% from a Consume made while your Corrupt HP is at least your health.' },
        { tag: 'heal', label: 'Lifesteal', detail: 'Every Harvest hit heals 35% × corruption of the damage it dealt (up to 35%).' },
        { tag: 'damage', label: 'Crows', detail: 'Feeding Frenzy pecks for 5, up to 15 at 100% corruption.' },
        { tag: 'control', label: 'Execute line', detail: 'Reaping Hour kills at 10% health, rising to 25% at 100% corruption.' },
      ],
      notes: [
        'Corruption fades only once they are off the mold — 1.2% a second after 2.5 seconds clear of it.',
        'Online the attacker\'s machine decides it; the victim sees the same meter mirrored.',
      ],
    },
    {
      emoji: '🫀',
      name: 'Corrupt HP',
      basics:
        'A purple layer of rotten bonus health, drawn on your health bar, spent after shields and weak '
        + 'HP and before your real health. It is capped at half your maximum health (never below 150). '
        + 'Whoever damages it gains a quarter of a point of corruption for every point they take off. '
        + 'You get it three ways: cutting one of your own corrupt hearts with the sickle (75, then 5 '
        + 'a second for 5 seconds), eating a piece of Corrupt Flesh (75, automatic below 75 health), '
        + 'and stealing an enemy\'s with Consume.',
      effects: [
        { tag: 'shield', label: 'Layer', detail: 'Soaks damage before your health. Cap: 50% of max HP (at least 150).' },
        { tag: 'resource', label: 'Hearts', detail: 'A cut heart: +75, then +5 a second for 5 seconds.' },
        { tag: 'resource', label: 'Corrupt Flesh', detail: '+75 when eaten — automatically, the moment you drop below 75 health. Up to 3 carried.' },
        { tag: 'debuff', label: 'Backlash', detail: 'Attackers gain 0.25% corruption per point of Corrupt HP they remove.' },
      ],
      notes: [
        'Mature mold grows a heart every 5 seconds once it has at least 20 fully grown cells, up to 3 at a time. A heart lasts 20 seconds, or until the mold under it dies.',
        'Only your own sickle can cut your own hearts.',
        'Piercing damage skips it, like every absorb layer.',
      ],
    },
  ],

  abilities: {
    'harvest-sickle': {
      basics:
        'Throws a sickle that flies a full circle out to the cursor and back to your hand, like a '
        + 'boomerang. The loop\'s far side is the cursor: its diameter is the distance to it, between '
        + '140 and 380px. It takes 0.62 seconds plus 1.5ms per pixel of that diameter to come back, '
        + 'and the return leg homes onto wherever you are now. It pierces: 12 damage to every enemy '
        + 'it passes through, once each per throw. Right-click swaps which way the loop curls. It '
        + 'bursts any of your own corrupt hearts it touches. 0.65s cooldown; hold to keep throwing.',
      cast: 'Click, at the cursor; hold to keep throwing. Right-click flips the curl. 0.65s cooldown.',
      effects: [
        { tag: 'damage', label: 'Cut', detail: '12 to each enemy the loop passes through, once per throw.' },
        { tag: 'area', label: 'The loop', detail: 'Diameter = cursor distance, clamped 140–380px. 0.62s + 1.5ms/px round trip.' },
        { tag: 'resource', label: 'Hearts', detail: 'Bursts your own corrupt hearts: +75 Corrupt HP, then 5 a second for 5 seconds.' },
      ],
      upgrade: {
        basics:
          'Recursive: when the sickle comes home it does not stop. It whips once around you and flies '
          + 'a second full loop, thrown from wherever you are standing then toward wherever your cursor '
          + 'is then, curling the same way. The second loop forgets who the first one cut, so '
          + 'everything can be cut twice — 24 a throw against a body both loops pass through. It glows '
          + 'purple while it is on its second loop.',
        effects: [
          { tag: 'damage', label: 'Second swing', detail: 'A second loop, 12 to everything it passes through again.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'Re-aimed', detail: 'Thrown from you, toward the cursor, at the moment the first loop returns.', requiresUpgrade: 'click' },
          { tag: 'resource', label: 'Hearts', detail: 'The second loop bursts hearts too.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The curl is shown in your status tray; the sickle leaves your hand empty while it is out.',
        'Two can be in the air at once on a long loop.',
      ],
    },

    'harvest-sow': {
      basics:
        'Scatters 7 corruption seeds around you, 45–120px out. Each lands 0.42 seconds later and '
        + 'starts a colony of mold on a 14px grid: the seed\'s own cell grows first, and a cell grows '
        + 'once a neighbour is about a third grown — so it spreads outward, about one cell a second. '
        + 'A colony\'s reach starts at 30px and creeps out to 110px over 25 seconds. Fully grown mold '
        + 'is purple, veined, and here and there opens an eye or a chewing mouth. Enemies standing on '
        + 'mold at least half grown gain corruption; mature mold grows corrupt hearts. Up to three '
        + 'casts\' seeds (21) are alive at once — sowing a fourth withers the oldest. 10s cooldown.',
      cast: 'E. Seeds scatter around you. 10s cooldown.',
      effects: [
        { tag: 'summon', label: 'Seeds', detail: '7 per cast, 45–120px around you. 21 alive at most.' },
        { tag: 'area', label: 'Colony', detail: 'Reach 30px → 110px over 25s. Spreads about one 14px cell a second.' },
        { tag: 'debuff', label: 'Rot', detail: 'Up to 6% corruption a second on mature mold.' },
        { tag: 'resource', label: 'Hearts', detail: 'Mature mold (20+ cells) grows a heart every 5s, up to 3.' },
      ],
      upgrade: {
        basics:
          'Vile Rot: once a second, every enemy standing on mold at least half grown has an 18% chance '
          + 'of being grabbed — a hand of rot claws up around their feet, holds them still and unable '
          + 'to attack for 1 second, and squeezes for 10. The same body cannot be grabbed again for 3.5 '
          + 'seconds. Every 3.5 seconds, mold with at least 8 fully grown cells also pushes up a worm '
          + '(3 at most), on the mature cell nearest an enemy within reach. A worm lives 8 seconds, or '
          + 'until the mold under it dies, and spits a gob of rot at the nearest enemy within 380px '
          + 'every 1.2 seconds: 5 damage, 300px a second, first body it touches.',
        effects: [
          { tag: 'control', label: 'Grab', detail: '18% a second on rotting mold: 1s stun + 10 damage. 3.5s before the same body again.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Worms', detail: 'One every 3.5s on mature mold, 3 at once, 8s each.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Spit', detail: '5 per gob, every 1.2s, at the nearest enemy within 380px.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Mold outside every live colony\'s reach withers away at half a point of growth a second.',
        'The scatter is seeded by where you stand, so both machines grow the same mold online.',
      ],
    },

    'harvest-frenzy': {
      basics:
        'Releases 3 crows that fly out to your cursor and circle it (about 52px out) for 6 seconds, '
        + 'following it as you move the mouse. A crow pecks any enemy it flies through for 5, up to '
        + 'three times that at full corruption, and can peck the same body again after 0.45 seconds. '
        + '14s cooldown.',
      cast: 'R, at the cursor. 14s cooldown.',
      effects: [
        { tag: 'damage', label: 'Peck', detail: '5 × (1 + 2 × corruption) — 5 to 15. Each crow re-pecks a body every 0.45s.' },
        { tag: 'summon', label: 'Crows', detail: '3 crows, 6 seconds, orbiting the cursor at ~52px.' },
      ],
      upgrade: {
        basics:
          'Poison Payload: each crow flies out carrying a small vial of poison. Press R again while '
          + 'they are still up and all three let go at once: each vial falls for a quarter of a second '
          + 'and shatters in a 48px burst of glass for 12. Everything a vial splashes is Poisoned for '
          + '5 seconds, taking 4 damage a second — and every vial that splashed them is its own stack, '
          + 'so a body under all three takes 12 a second. The vials can be dropped only once a cast; '
          + 'after that the crows go on pecking as usual.',
        effects: [
          { tag: 'damage', label: 'Shatter', detail: '12 per vial in a 48px burst.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Poison', detail: '4 a second for 5s, per vial — up to 12 a second from all three.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'Recast', detail: 'R while the crows still carry their vials. Once per cast.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Dragging the circle over a target keeps all three pecking it.',
        'A bot\'s or an online opponent\'s crows circle a point that drifts toward their target, since their cursor is not shared.',
      ],
    },

    'harvest-consume': {
      basics:
        'Splits the sack open along the grin and bites forward — 84px, about 104° wide. Everything '
        + 'bitten takes 18 and cannot heal for 8 seconds. Their shield charges, shield HP, weak HP, '
        + 'Corrupt HP, evasion and wind dodge are stolen outright and added to yours; their damage '
        + 'and speed buffs are copied onto you for 8 seconds. Biting at least one fighter tears off a '
        + 'piece of Corrupt Flesh (up to 3): the moment you drop below 75 health you eat one for 75 '
        + 'Corrupt HP. If your Corrupt HP is at least your health when you bite, it also adds 40% '
        + 'corruption to everything bitten. 9s cooldown.',
      cast: 'F, toward the cursor. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Bite', detail: '18 in an 84px, ~104° cone.' },
        { tag: 'debuff', label: 'Heal block', detail: 'No healing for 8 seconds.' },
        { tag: 'control', label: 'Steal', detail: 'Shields, shield HP, weak HP, Corrupt HP, evasion and wind dodge move to you.' },
        { tag: 'buff', label: 'Copy', detail: 'Their damage and speed buffs, copied onto you for 8 seconds.' },
        { tag: 'resource', label: 'Corrupt Flesh', detail: '+1 per bite that lands (3 max). Eaten below 75 health for 75 Corrupt HP.' },
        { tag: 'debuff', label: 'Heavy bite', detail: '+40% corruption when your Corrupt HP ≥ your health.' },
      ],
      upgrade: {
        basics:
          'Corrupt Cooking: Corrupt Flesh is no longer eaten on its own below 75 health — it goes in '
          + 'the pot. A cooking menu sits at the top of the screen with three dishes; click one to cook '
          + 'it (the click never throws a sickle). Jerky costs 1 meat and heals 100 over 15 seconds '
          + '(strips stack). Meat Broth costs 2 and makes you take 33% less damage for 20 seconds. '
          + 'Vile Feast costs 3: +150 maximum health for the rest of the round, and 150 healed. A dish '
          + 'you cannot afford is dimmed.',
        effects: [
          { tag: 'heal', label: 'Jerky (1)', detail: '100 healed over 15 seconds.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Meat Broth (2)', detail: '33% less damage taken for 20 seconds.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Vile Feast (3)', detail: '+150 max health for the round, and 150 healed.', requiresUpgrade: 'f' },
          { tag: 'resource', label: 'No raw meat', detail: 'Flesh is never eaten automatically while you have this.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Flesh you carry circles your shoulders and is shown in your status tray.',
        'Buffs that a kit rewrites every frame cannot be moved, so damage and speed are copied rather than taken.',
      ],
    },

    'harvest-reap': {
      basics:
        'Raises the great scythe for 0.32 seconds, then swings it through a 160° arc in front of you, '
        + '160px deep. Everything cut takes 30 and is permanently marked: +15% damage taken for the '
        + 'rest of the match, compounding with every further cut. Anything the swing leaves at or '
        + 'below its execute line is killed outright — 10% of maximum health, rising to 25% at full '
        + 'corruption. The swing curls the same way as your sickle. 35s cooldown.',
      cast: 'Q, toward the cursor. 0.32s wind-up. 35s cooldown. Ultimate.',
      effects: [
        { tag: 'damage', label: 'Swing', detail: '30 to everything in a 160px, 160° arc.' },
        { tag: 'debuff', label: 'Reaped', detail: '×1.15 damage taken, permanent, compounding per cut.' },
        { tag: 'control', label: 'Execute', detail: 'Killed at ≤10% health, up to ≤25% at 100% corruption.' },
      ],
      upgrade: {
        basics:
          'Endless Harvest: every kill a Harvest attack makes resets Reaping Hour\'s cooldown on the '
          + 'spot — the sickle, a crow, the bite, a grab, a worm, a vial or its poison, or the scythe '
          + 'itself, execute included. There is no limit, so a room full of low enemies can be reaped '
          + 'one swing after another.',
        effects: [
          { tag: 'resource', label: 'Reset', detail: 'Any Harvest kill: Reaping Hour is ready again at once. No limit.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The line is checked after the swing\'s own damage lands, so a cut that pushes them under it still kills.',
        'The vulnerability shows in the victim\'s tray as Reaped.',
      ],
    },
  },

  mastery: {
    'invasive-species': {
      basics:
        'While any harmful status effect is on you, you regenerate 2 HP a second. Anything in the '
        + 'debuff half of your status tray counts — a burn, a poison, a slow, a stun, a disarm, '
        + 'Corruption, Reaped, an opponent\'s heal block — and the regrowth stops the moment the last '
        + 'one is gone. The tray is checked four times a second.',
      cast: 'Passive. Always on while Harvest Mastery is enabled and Harvest is the element being played.',
      effects: [
        { tag: 'heal', label: 'Regrowth', detail: '2 HP a second while any harmful status effect is on you.' },
        { tag: 'utility', label: 'Anything harmful', detail: 'Every debuff in your status tray counts — damage over time, slows, stuns, disarms, Corruption, Reaped, a heal block.' },
      ],
      notes: [
        'A heal block still blocks it: Consume\'s bite turns the regrowth on and stops it landing at the same time.',
        'A Harvest NPC on Nightmare regrows the same way.',
      ],
    },
    'corrupt-predation': {
      basics:
        'Spends 50 Corrupt HP and fires 12 pellets of rot in a cone 5° wide toward the cursor, out to '
        + '720px. Each pellet stops in the first enemy it meets for 5 damage — 60 if the whole volley '
        + 'lands — and puts 4 Corruption on them. Wherever the volley hits, it plants a corrupt seed '
        + '(one per spot, however many pellets land there), and the seed grows into a colony of mold '
        + 'right under whoever you shot, counting toward your seed limit like any other. With less '
        + 'than 50 Corrupt HP it will not fire. Bindable to R, F or Q. 3s cooldown.',
      cast: 'The bound key (R, F or Q), toward the cursor. Costs 50 Corrupt HP. 3 second cooldown.',
      effects: [
        { tag: 'cost', label: 'Paid in rot', detail: '50 Corrupt HP per volley. Without it the shot does not fire.' },
        { tag: 'damage', label: 'Twelve pellets', detail: '5 each in a 5° cone, 720px of range. Each stops in the first enemy it meets.' },
        { tag: 'debuff', label: 'Corrupting', detail: '+4 Corruption per pellet — up to 48 from one full volley.' },
        { tag: 'summon', label: 'Seeds the hit', detail: 'Every spot the volley lands plants a corrupt seed there, growing new mold under the target.' },
      ],
      notes: [
        'It is how you put mold where your enemy is instead of where you are standing — sow at range, then let the rot do the rest.',
        'Every pellet still heals you off the target\'s corruption, so the later pellets of a volley heal more than the first.',
        'A Harvest NPC on Nightmare binds it over Feeding Frenzy and fires it whenever it has the Corrupt HP and you are in range.',
      ],
    },
  },
};

export default gluttony;
