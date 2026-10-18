import { ElementCodex } from '../AbilityCodex';

/**
 * Fire — combustion as a resource you spend your own body to keep lit.
 *
 * Verified against `src/elements/fire.ts`, `kits/FireKit.ts` and the fire block of
 * `data/Upgrades.ts`. Numbers here are the ones the kit actually applies.
 */
const fire: ElementCodex = {
  identity:
    'Pyromancy of the crude, honest kind: no wards, no summons, just combustion aimed outward and '
    + 'a caster willing to stand inside it. Fire has the widest damage numbers of any starting element '
    + 'and the shortest list of ways to survive being hit back.',

  abilities: {
    fireball: {
      basics:
        'Your basic attack: a fireball thrown at the cursor for 20 damage. It flies 520 px/s in a '
        + 'straight line, is used up on the first fighter it touches, and comes back every 0.5s — the '
        + 'only fire ability you can lean on continuously.',
      cast: 'Click, aimed at the cursor. No wind-up, no lock — it fires the instant the cooldown is clear.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '20 damage to the first fighter it touches. The projectile is consumed on contact.' },
        { tag: 'utility', label: 'Flight', detail: '520 px/s in a straight line, spawned 32px out from the caster so it clears their own body.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.5s cooldown — roughly two per second, and the only fire ability you can lean on continuously.' },
      ],
      upgrade: {
        basics:
          'The throw is unchanged; what lands now sticks. Every hit sets a burn of 1 damage every 0.5s '
          + 'for 3 seconds, so a connected fireball is 20 up front and 6 more afterwards.',
        effects: [
          { tag: 'dot', label: 'Clinging burn', detail: '1 damage every 0.5s for 3s after a hit — 6 extra damage, if they do not break away from the fight.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The 20 damage is the projectile\'s own figure, so anything that scales projectile damage scales this.',
      ],
    },

    'flame-dash': {
      basics:
        'Dashes you toward the cursor at 640 velocity and explodes where you launched from — 18 damage '
        + 'in a 90px radius on the spot you left, not the spot you land. It lays a burning trail over the '
        + 'first 180px and leaves a 46px scorch on the launch point.',
      cast: 'E, aimed at the cursor. Instant. The dash carries you 640 units of velocity along the aim.',
      effects: [
        { tag: 'movement', label: 'Blast propulsion', detail: 'Dashes the caster toward the cursor at 640 velocity. Trail is laid over the first 180px of the path.' },
        { tag: 'damage', label: 'Launch burst', detail: '18 damage in a 90px radius centred on the spot you left — not the spot you land. Disengaging with it deals nothing to someone chasing you into the gap.' },
        { tag: 'area', label: 'Scorch mark', detail: 'A 46px scorch and a 12-ember scatter are left on the launch point as a visual record of where the blast was.' },
      ],
      upgrade: {
        basics:
          'The launch blast still happens, and four more are added along the way: blasts sampled down the '
          + 'dash path 70ms apart, 5–8 damage each in a 50px radius. The whole lane you crossed is '
          + 'dangerous instead of only the spot you left.',
        effects: [
          { tag: 'damage', label: 'Trail of explosions', detail: '4 blasts sampled along the dash path 70ms apart, each 5–8 damage in a 50px radius. The whole lane you crossed is dangerous, not just the launch point.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'With the Alcohol perk the launch burst is suppressed entirely — the dash becomes pure movement with no damage and no scorch.',
      ],
    },

    'pressure-bomb': {
      basics:
        'Plants a charge at the cursor that cooks for 1.5 seconds and then deals 32 damage in a 100px '
        + 'radius with no falloff. The floor is marked red for the whole fuse — it is area denial, not a '
        + 'hit — and the blast shakes the camera for 140ms.',
      cast: 'R, planted at the cursor. Instant to throw; the charge itself takes 1.5s to go off.',
      effects: [
        { tag: 'area', label: 'Fuse', detail: '1.5s from planting to detonation, with the ground marked red for the whole window.' },
        { tag: 'damage', label: 'Detonation', detail: '32 damage in a 100px radius. Everything inside takes the full figure; there is no falloff.' },
        { tag: 'utility', label: 'Camera', detail: 'A 140ms shake on the blast, so a bomb going off behind you is felt as well as seen.' },
      ],
      upgrade: {
        basics:
          'The 32-damage blast still lands, and then the crater throws six bomblets 30–85px outward, 70ms '
          + 'apart, each going off about 0.7s later for 12 damage in a 55px radius. The dangerous circle '
          + 'roughly doubles in width a beat after everyone has decided it is over.',
        effects: [
          { tag: 'damage', label: 'Bomblets', detail: '6 bomblets scatter 30–85px from the crater and go off ~0.7s later for 12 damage each in a 55px radius.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Stagger', detail: 'Bomblets are spaced 70ms apart rather than firing as one, so the second wave reads as a rolling barrage.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With the Molten divine perk the charge is packed hotter: 38 damage instead of 32, a longer camera shake, and the caster takes a 3s burn for it.',
        'Outside the arena (raid contexts with no FireKit) there is no fuse — the charge detonates the moment it lands.',
      ],
    },

    'flame-body': {
      basics:
        'A toggle with no cooldown in either direction. While lit you move at double speed and burn 2 '
        + 'HP every 0.25s — 8 a second — indefinitely, until you switch it off. The 34px wreath itself '
        + 'deals nothing; the only limit is how much health you are willing to spend.',
      cast: 'F to toggle on, F again to toggle off. No cooldown on either direction, and no cast lock.',
      effects: [
        { tag: 'buff', label: 'Double speed', detail: 'Move speed ×2 while lit. This is what the ability is actually for — the wreath is a cost, not a weapon.' },
        { tag: 'cost', label: 'Self-immolation', detail: '2 self-damage every 0.25s — 8 HP per second, indefinitely, until you switch it off.' },
        { tag: 'utility', label: 'No cooldown', detail: 'Free to flick on and off mid-fight; the only limit is how much health you are prepared to burn.' },
        { tag: 'area', label: 'Wreath', detail: '34px wreath at base intensity, with a bloom and ring thrown outward each time it is lit.' },
      ],
      upgrade: {
        basics:
          'Same toggle, a different bargain. The self-burn stops completely, you deal double damage and '
          + 'take double damage, and the wreath widens to 44px. The doubled speed stays — you pay in risk '
          + 'now instead of in health.',
        effects: [
          { tag: 'buff', label: 'Doubled output', detail: 'All outgoing damage ×2 while lit.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Doubled intake', detail: 'All incoming damage ×2 while lit.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'No self-burn', detail: 'The 2-per-0.25s self-damage tick does not run in the upgraded form. You pay in risk instead of in health.', requiresUpgrade: 'f' },
          { tag: 'area', label: 'Larger wreath', detail: '44px at 1.35 intensity, visibly hotter than the base form.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The wreath itself deals nothing. Contact damage only exists with fire mastery (Burning Body) or the Alcohol perk — unlit by either, this is pure speed bought with health.',
        'The base self-burn is suspended while you are standing in one of your own flame puddles.',
        'Under the Alcohol perk the self-burn doubles to 4 per tick — 16 HP a second.',
        'Flame Charge (Q+) only exists while this is switched on, so the two upgrades are bought as a pair.',
      ],
    },

    'flame-nuke': {
      basics:
        'The ultimate. Locks you in place for 2 seconds with no way to cancel, then detonates for 80 '
        + 'damage in a 220px radius centred on where you started, with a 420ms camera shake and a white '
        + 'flash. 30s cooldown, and the two-second telegraph is what pays for the biggest number in the '
        + 'base game.',
      cast: 'Q. Locks the caster for 2s with no way to cancel; the detonation is centred on where you stood when you started.',
      effects: [
        { tag: 'cost', label: 'Channel lock', detail: 'The caster cannot move or act for the full 2s. The blast fires from the start position, so being knocked around does not re-aim it.' },
        { tag: 'damage', label: 'Detonation', detail: '80 damage in a 220px radius — comfortably a fifth of a 400 HP fighter, and the widest blast in the kit.' },
        { tag: 'utility', label: 'Screen impact', detail: '420ms camera shake and a white flash on detonation.' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown — roughly two casts in a long fight.' },
      ],
      upgrade: {
        basics:
          'Only reachable while Flame Body is lit — unlit, Q is still the ordinary nuke. Instead of a '
          + 'channelled blast it plants a charge at your feet: a 1s lock to commit it, a 3s fuse, then 80 '
          + 'damage to everything in range, the caster included. There is no safe placement, only distance.',
        effects: [
          { tag: 'cost', label: 'Requires Flame Body', detail: 'Q only produces the charge while Flame Body or Flame Affinity is lit. Unlit, Q casts the normal nuke.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Planting lock', detail: 'A 1s lock while the charge is committed, then the fuse begins at whatever spot you were standing on.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Fuse and blast', detail: '3s fuse, then 80 damage — and it damages the caster too. There is no safe placement, only distance.', requiresUpgrade: 'q' },
        ],
      },
    },
    // Alternate ultimate — swapped in for Flame Nuke from the customize panel (cheats only for now).
    supernova: {
      basics:
        'The alternate ultimate, in place of Flame Nuke. You root yourself and pour a beam of fire from '
        + 'your palms: 470px long, 45 damage a second to everything in it, but it swings toward the '
        + 'cursor at only 0.85 radians a second. A heat bar climbs over you and burns you harder the '
        + 'longer you hold it. Press Q again to let go — or hold all 6 seconds and the beam detonates.',
      cast: 'Q (when equipped as the alternate). Q again stops it early. 30s cooldown.',
      noUpgrade: true,
      effects: [
        { tag: 'damage', label: 'The beam', detail: '9 damage every 0.2s — 45 a second — to everything inside a 40px band out to 470px, plus a 1.5s burn.' },
        { tag: 'cost', label: 'Rooted', detail: 'You cannot move or use any other ability while the beam is open. Being stunned or frozen ends it.' },
        { tag: 'utility', label: 'Poor turning', detail: 'The beam turns toward the cursor at 0.85 radians (about 49°) a second — lead your target.' },
        { tag: 'cost', label: 'Heat', detail: 'Self-burn rises from 0 to 8 HP a second over the 6s — about 24 HP if you hold it all the way.' },
        { tag: 'area', label: 'Detonation', detail: 'At 6s the beam bursts: 70 damage to everything within 60px of its length, a 3s burn, and 4 flame pools (46px, 5 damage every 0.4s for 5s).' },
        { tag: 'cost', label: 'Backlash', detail: 'The detonation sears you for 60.' },
      ],
    },
  },

  perks: {
    'fire-blaze': {
      basics:
        'Trades the hold-click Flamethrower away for a better fireball: 45% faster, 50% more damage '
        + 'against anything already burning, and with Flameshredder (Click+) it ignites molten fire '
        + 'instead of a normal burn.',
      effects: [
        { tag: 'cost', label: 'No Flamethrower', detail: 'Holding click no longer sprays — every press is just a fireball.' },
        { tag: 'utility', label: 'Faster shot', detail: 'Fireballs fly at 760 px/s instead of 520.' },
        { tag: 'damage', label: 'Kindling', detail: '30 damage instead of 20 against a target that is burning or molten.' },
        { tag: 'dot', label: 'Molten fire', detail: 'With Flameshredder, a hit ignites molten fire (5 damage per second) for 3s instead of the normal burn.', requiresUpgrade: 'click' },
      ],
      notes: [
        'Equipped with Melt: no click at all, but every cooldown is halved (×0.5) and fire abilities deal 50% more damage.',
      ],
    },
    'fire-melt': {
      basics:
        'Trades the tap Fireball away for a better Flamethrower: it starts the instant you press, reaches '
        + '33% farther and drops pools of flame where it lands.',
      effects: [
        { tag: 'cost', label: 'No Fireball', detail: 'A click no longer throws a fireball — click and hold sprays straight away.' },
        { tag: 'area', label: 'Reach', detail: 'Flamethrower range 240px instead of 180, in the same 30° cone.' },
        { tag: 'dot', label: 'Flame pools', detail: 'A 30px pool every 0.26s of spraying, lasting 2.6s: 2 damage every 0.4s plus a 1.5s burn. Up to 14 at once.' },
      ],
      notes: [
        'Equipped with Blaze: no click at all, but every cooldown is halved (×0.5) and fire abilities deal 50% more damage.',
        'A bot with Melt swaps its fireball for a short gout: 8 damage in the cone and one pool.',
      ],
    },
    'fire-ash': {
      basics:
        'Bigger bombs that do not care who threw them. Pressure Bomb, Flame Charge (Q+) and Cluster Bomb '
        + 'bomblets hit 25% harder over 33% more range — and every one of them can now catch you.',
      effects: [
        { tag: 'damage', label: 'Pressure Bomb', detail: '40 damage over 133px instead of 32 over 100px.' },
        { tag: 'cost', label: 'Self-harm', detail: 'Standing in your own Pressure Bomb or bomblet blast costs you half its damage.' },
        { tag: 'damage', label: 'Flame Charge', detail: '100 damage over 293px instead of 80 over 220px — and it burns you for 100 instead of 80.', requiresUpgrade: 'q' },
        { tag: 'area', label: 'Cluster Bomb', detail: 'Bomblets deal 15 over 73px instead of 12 over 55px, and can hurt you too.', requiresUpgrade: 'r' },
      ],
    },
    'fire-radiate': {
      basics:
        'A constant aura of heat around you that burns every enemy within 90px for light damage over '
        + 'time — twice as hot with Fire Mastery enabled.',
      effects: [
        { tag: 'dot', label: 'Heat aura', detail: '1 damage every 0.333s — 3 a second — to every enemy within 90px. Always on, no key, no cost.' },
        { tag: 'dot', label: 'Mastery', detail: 'With Fire Mastery enabled: 2 every 0.333s — 6 a second.', requiresMastery: true },
      ],
    },
    'fire-alcohol': {
      basics:
        'Flame Dash leaves a trail of booze instead of explosions. Standing in your booze makes you 20% '
        + 'tougher, but linger and your aim drifts — and foes who wade in drift too. Light it with a '
        + 'Pressure Bomb or Flame Nuke and it burns every enemy who steps in.',
      effects: [
        { tag: 'area', label: 'Booze trail', detail: 'Four 36px puddles along the dash, lasting 7s. Replaces the dash\'s 18-damage launch blast and its E+ explosions.' },
        { tag: 'buff', label: 'Liquid courage', detail: '20% less damage taken while you stand in your own booze.' },
        { tag: 'debuff', label: 'Tipsy', detail: 'After 2s of standing in booze — you or an enemy — aim drifts by up to 22° until 1.5s after stepping out.' },
        { tag: 'dot', label: 'Lit', detail: 'A Pressure Bomb, Flame Nuke, Flame Charge or Supernova blast lights booze it reaches: 4 damage every 0.5s plus a 2s burn to enemies inside, for up to 4s.' },
      ],
    },
  },
  mastery: {
    'burning-body': {
      basics:
        'Always on, no key and no cost. Every enemy within 50px takes 3 damage every 0.5s — 6 a second '
        + '— and every damage-over-time effect on you is stripped every single frame, so nothing can hold '
        + 'a burn, a poison or a bleed on you for even one tick.',
      effects: [
        { tag: 'dot', label: 'Contact burn', detail: '3 damage every 0.5s to every enemy within 50px — 6 a second, with no toggle, no cooldown and no self-cost. It counts as fire damage over time.' },
        { tag: 'heal', label: 'Cleanse', detail: 'Every damage-over-time effect on you is stripped every single frame — 60 times a second. Nothing can hold a burn, a poison or a bleed on you for even one tick.' },
      ],
      notes: [
        'This is the passive half of fire mastery — it needs no bind and no key.',
      ],
    },
    heatwave: {
      basics:
        'A bindable wave along your aim that deals no damage whatsoever. It pierces every enemy it '
        + 'passes through and leaves them Exposed for 5 seconds, so the next hit they take lands for '
        + '1.5×. 420px of range at 520 px/s, on its own 6s cooldown.',
      cast: 'Bindable to R, F or Q. Fires along the aim and pierces every enemy it touches.',
      effects: [
        { tag: 'debuff', label: 'Exposed', detail: '5s of ☀️ Exposed on every enemy the wave passes through. The next hit they take deals 1.5×.' },
        { tag: 'damage', label: 'No damage of its own', detail: 'The wave deals 0. All of its value is in the multiplier it sets up.' },
        { tag: 'area', label: 'The wave', detail: '420px of range at 520 px/s, a 45px half-width band, 13px thick, with an 18px forgiveness pad on the target.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, independent of whichever slot it is bound over.' },
      ],
      notes: [
        'Fire damage over time ignores Exposed completely — burn and molten ticks are neither amplified nor consume the stack, so a burning target keeps its Exposed for a real hit.',
        'A hit that sets an Exposed target alight burns them molten instead: 5 damage per second.',
      ],
    },
  },
};

export default fire;
