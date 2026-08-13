import { ElementCodex } from '../AbilityCodex';

/**
 * Oil — an industrial kit. Nothing it owns is cast at the enemy; it is built, driven or
 * detonated, and the drones are both the ammunition and the resource.
 *
 * Verified against `src/elements/oil.ts`, `kits/OilKit.ts`, the oil block of `data/Upgrades.ts`,
 * the Bio Fuel and Gasoline perks, and `data/Mastery.ts`.
 */
const oil: ElementCodex = {
  identity:
    'Machinery rather than magic. Oil fights through hardware it has to build first — a swarm of '
    + 'quadcopters that are simultaneously its damage, its ultimate\'s length and (with mastery) its '
    + 'armour — plus barrels of crude that roll, spill and burn. It is the only element in the tier '
    + 'whose opening thirty seconds are spent constructing rather than attacking.',

  passives: [
    {
      emoji: '🛩️',
      name: 'The Drone Swarm',
      basics:
        'The resource everything else spends. Up to 6 drones for a player, 4 for an AI, held on orbit '
        + 'indefinitely, each carrying a magazine of 3 shots — a drone at zero shots is destroyed on the '
        + 'spot, so the swarm is ammunition rather than a permanent escort. Every Drone Command volley '
        + 'costs 1 shot from every drone at once, Drone Destroy consumes a whole drone, and Train Morph '
        + 'eats the entire swarm when it ends. Train Morph also runs 1.5 seconds per drone you had at the '
        + 'cast, so the ultimate is only as long as the fleet you built for it.',
      effects: [
        { tag: 'resource', label: 'The cap', detail: '6 drones for a player, 4 for an AI. Held on orbit indefinitely until spent.' },
        { tag: 'resource', label: 'Magazines', detail: '3 shots each. A drone at zero shots is destroyed on the spot — the swarm is consumable, not a permanent escort.' },
        { tag: 'utility', label: 'What spends them', detail: 'Every Drone Command volley costs 1 shot from every drone at once. Drone Destroy consumes a whole drone. Train Morph eats the entire swarm when it ends.' },
        { tag: 'utility', label: 'What sizes off them', detail: 'Train Morph runs 1.5s per drone you had when it started, so the ultimate is only as long as the fleet you built for it.' },
      ],
      notes: [
        'The Bio Fuel perk raises every magazine to 5 shots, which is 67% more volleys out of the same build-up.',
        'With Oil Mastery the swarm is also a damage resistance, at 10% per drone — see Drone Array.',
      ],
    },
    {
      emoji: '🛢️',
      name: 'Oil Puddles and Oily',
      basics:
        'The floor half of the kit. A puddle is 30px across and stands 12 seconds, left by rolling '
        + 'barrels every 80px, by every barrel detonation (two extra) and by a Train Morph every 2s. '
        + 'Standing in one applies Oily for 8 seconds, refreshed while you stay. A lit puddle deals 2 '
        + 'damage every 0.3s — about 6.7 a second — and sets Burning, which is 3 damage every 0.5s for 5 '
        + 'seconds, 30 in total. Lighting a puddle halves whatever life it had left: twice as hot for '
        + 'half as long. Shooting an Oily enemy with a drone laser burns the coat straight off them and '
        + 'Burns them too.',
      effects: [
        { tag: 'area', label: 'The spill', detail: '30px radius, standing 12s. Left by rolling barrels every 80px, by every barrel detonation (2 extra), and by a Train Morph every 2s.' },
        { tag: 'debuff', label: 'Oily', detail: 'Standing in a puddle applies Oily for 8s, refreshed continuously while you stay in it.' },
        { tag: 'dot', label: 'Ignited puddles', detail: 'A lit puddle deals 2 damage every 0.3s to anyone inside — about 6.7 a second — and sets them Burning. Lighting a puddle halves whatever lifetime it had left: it burns twice as hot for half as long.' },
        { tag: 'dot', label: 'Burning', detail: '3 damage every 0.5s for 5s — 30 total. Applied by stepping in a lit puddle, or by shooting an Oily enemy with a drone laser, which burns the coat straight off them.' },
      ],
      notes: [
        'Setting your own puddles alight is one of the four Oil Mastery requirements (100 ignites).',
        'Puddles belong to whoever spilled them. Your own never coat or burn you.',
      ],
    },
  ],

  abilities: {
    'drone-command': {
      basics:
        'One key doing three jobs. Hold it to build drones — the first 0.5s in, then one a second to '
        + 'the cap — or release inside 300ms to fire a volley: 3 damage per drone within 40px of the '
        + 'cursor, so a full six is 18 on one point, at the cost of one shot from every drone whether or '
        + 'not it hit. Beams destroy enemy projectiles within 14px of their path, set your own puddles '
        + 'alight within 20px, and strip the coat off an Oily enemy within 40px to Burn them for 5 '
        + 'seconds. Volleys are 1 second apart. A tap while a barrel is rolling detonates the barrel '
        + 'instead — a bigger blast than a natural one, with an oil pillar, a 220ms shake, and both '
        + 'scatter puddles lit as they land.',
      cast: 'Click. Held past 300ms it builds; released under 300ms it is a volley. A tap while a barrel is rolling detonates the barrel instead.',
      effects: [
        { tag: 'summon', label: 'Building', detail: 'First drone 0.5s into the hold, then one every 1s, to the cap of 6.' },
        { tag: 'damage', label: 'The volley', detail: '3 damage per drone within 40px of the cursor. All six firing at once is 18 on a single point — the kit\'s main damage.' },
        { tag: 'resource', label: 'Volley cost', detail: '1 shot from every drone, spent whether or not the beam hit anything. A 3-shot fleet is three volleys.' },
        { tag: 'utility', label: 'Point defence', detail: 'Enemy projectiles within 14px of any beam\'s path are destroyed outright.' },
        { tag: 'dot', label: 'Ignition', detail: 'A beam landing within 20px of one of your own puddles sets it alight. A beam landing within 40px of an Oily enemy strips the coat and Burns them for 5s.' },
        { tag: 'utility', label: 'Volley cadence', detail: '1s between volleys, enforced only when you actually had drones to fire.' },
        { tag: 'utility', label: 'Barrel detonator', detail: 'A tap with a barrel in play blows the barrel instead: a bigger blast than a natural one, with an oil pillar, a 220ms shake, and both scatter puddles lit on arrival.' },
      ],
      upgrade: {
        basics:
          'A drone that reaches 0 shots is no longer discarded: it flies to the cursor over 0.4s and '
          + 'detonates for 5 damage in a 60px radius. Orbiting drones also deal 5 melee damage to anything '
          + 'that touches them, once a second each.',
        effects: [
          { tag: 'damage', label: 'Spent-drone bomb', detail: 'A drone that hits 0 shots flies to the cursor over 0.4s and detonates for 5 damage in a 60px radius rather than being discarded.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Contact damage', detail: 'Orbiting drones deal 5 melee damage to an enemy that touches them, on a 1s cooldown per drone.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Volleys also service a discharged Shield Generator: aim a volley within 60px of it and it recharges.',
        'Because a volley costs a shot from every drone regardless of hits, a six-drone fleet fired at nothing is a third of your ammunition gone.',
      ],
    },

    'barrel-roll': {
      basics:
        'Rolls a barrel from you toward the cursor at 300 px/s, leaving a 30px puddle every 80px of '
        + 'travel. It detonates for 20 damage in a 50px radius with a 150ms shake and two more puddles '
        + 'scattered within 25px — set off by touching an enemy, reaching a wall, or being hit by an '
        + 'enemy projectile, so you do not choose the moment unless you click it. 3s cooldown, and '
        + 'casting again while one is rolling blows the old one first.',
      cast: 'E, aimed at the cursor. Casting again while one is rolling detonates the old barrel first.',
      effects: [
        { tag: 'damage', label: 'Detonation', detail: '20 damage in a 50px radius, plus a 150ms camera shake.' },
        { tag: 'summon', label: 'The spill', detail: 'One 30px puddle every 80px of travel, plus 2 more scattered within 25px of the blast.' },
        { tag: 'movement', label: 'Travel', detail: '300 px/s in a straight line from the caster toward the cursor.' },
        { tag: 'cost', label: 'What sets it off', detail: 'Touching an enemy (within 30px), reaching a wall, or being hit by an enemy projectile (within 30px). You do not choose the moment unless you click it.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        basics:
          'You ride it. Glued to the drum at its 300 px/s with WASD doing nothing, steering toward the '
          + 'cursor at 150° a second so it curves rather than snapping. Release E to drop off — or hit a '
          + 'wall or the enemy, which detonates the barrel underneath you.',
        effects: [
          { tag: 'movement', label: 'The ride', detail: 'You are glued to the barrel and carried at its 300 px/s. WASD does nothing — the barrel is the only thing moving you.', requiresUpgrade: 'e' },
          { tag: 'movement', label: 'Steering', detail: 'The barrel turns toward the cursor at 150° per second while ridden, so it curves rather than tracking instantly.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Getting off', detail: 'Releasing E drops you. So does hitting a wall or the enemy — which detonates the barrel underneath you.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The ridden barrel is drawn under the fighters rather than over them, so the rider is always visible on top of it.',
        'A ridden barrel still spills every 80px, so a long ride paints a lane of oil for the drones to light afterwards.',
      ],
    },

    'drone-destroy': {
      basics:
        'Sends one drone from its orbit to the cursor over 500ms whatever the distance, arriving for 20 '
        + 'damage in a 60px radius with a 120ms shake. It costs the whole drone and any shots it still '
        + 'had. Refuses to cast with no drones, always takes the most recently built one, 3s cooldown.',
      cast: 'R at the cursor. Refuses to cast with no drones. The drone taken is the most recently built one.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '20 damage in a 60px radius on arrival, with a 120ms camera shake.' },
        { tag: 'movement', label: 'The run', detail: '500ms of flight from the drone\'s orbit position to the cursor, whatever the distance.' },
        { tag: 'resource', label: 'Cost', detail: 'One whole drone, destroyed. Its remaining shots are lost with it.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        basics:
          'The run now empties the magazine on the way in: after a 340ms charge, 4 damage per remaining '
          + 'shot fired at the live cursor 90ms apart — 12 extra from a full drone, 20 from a Bio Fuel one '
          + '— and the crash itself becomes 5 × its shots + 5, so 20 from a full drone, 30 from a five-shot '
          + 'one and still 5 from an empty one. The drone tracks your cursor throughout, so both the volley '
          + 'and the crash can be re-aimed mid-run.',
        effects: [
          { tag: 'damage', label: 'The dump', detail: '4 damage per remaining shot, fired at the live cursor 90ms apart after a 340ms charge. A full 3-shot drone is 12 extra damage; a Bio Fuel drone is 20.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Scaled blast', detail: 'The detonation becomes 5 × (shots it had) + 5 — 20 damage from a full 3-shot drone, 30 from a 5-shot one, and still 5 from an empty one.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Live tracking', detail: 'The drone keeps following your cursor through the whole sequence, so both the volley and the crash can be re-aimed mid-run.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'With Overclock a full drone is worth 32 damage rather than 20, so the upgrade is a straight 60% increase on a fully loaded launch.',
        'With the Gasoline perk a Blast-Drone launched this way hits for 40 instead of 20, and a Drone-Prime pulls out of the run and flies home — the blast lands, the airframe survives.',
      ],
    },

    'shield-gen': {
      basics:
        'Places a generator at the cursor that destroys every enemy projectile within 150px outright, '
        + 'with a beam out to the kill and 8 damage in a 30px radius where it comes apart — a shot '
        + 'brought down beside the enemy hurts them. It holds a 5-second charge, dimming visibly across '
        + 'the whole window, and a Drone Command volley within 60px refills it for another 5 with no '
        + 'limit on how often. 15s cooldown to place, and a second one destroys the first: there is only '
        + 'ever one.',
      cast: 'F at the cursor. Placing a second one destroys the first — there is only ever one.',
      effects: [
        { tag: 'shield', label: 'Interception', detail: 'Every enemy projectile within 150px of the generator is destroyed outright, with a beam out to the kill and shrapnel where it came apart.' },
        { tag: 'damage', label: 'Splash', detail: '8 damage in a 30px radius at each interception point — so a projectile shot down beside the enemy hurts them.' },
        { tag: 'utility', label: 'The window', detail: 'Charged for 5s from placement, and the lens visibly dims across the whole window rather than only at the end.' },
        { tag: 'resource', label: 'Recharging', detail: 'A Drone Command volley aimed within 60px of a discharged generator refills it for another 5s. There is no limit on how often.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown on placing one — but a placed generator can be kept alive indefinitely with volleys.' },
      ],
      upgrade: {
        basics:
          'Every 2 interceptions add a point of scrap and the generator darkens with wreckage up to 10 — '
          + 'purely a record of the work. Note that the shop card promises an 8-second charge; the kit '
          + 'still runs a flat 5-second window whether or not this is owned, so the scrap tally is the only '
          + 'real change.',
        effects: [
          { tag: 'utility', label: 'Scrap tally', detail: 'Every 2 interceptions add a point of scrap, and the generator darkens with wreckage up to 10 scrap. Cosmetic — it is a record of the work, not a bonus.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Not the 8s window', detail: 'The shop card promises an 8s charge instead of 5s. The kit still uses a flat 5s window whether or not this is owned; only the scrap tally actually changes.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Shooting projectiles down with a charged generator is one of the four Oil Mastery requirements (200 blocks).',
        'The generator only exists for the player. An AI Oil places the old firewall instead.',
      ],
    },

    'train-morph': {
      basics:
        'You become a train on rails: a constant 200 px/s in whichever of the four cardinal directions '
        + 'you last pressed, unable to stop, cancel or travel diagonally. It runs 1.5 seconds per drone '
        + 'you had at the cast (minimum 1.5, so a full fleet is 9 seconds) and destroys every drone when '
        + 'it ends. The head deals 8 damage within 28px on a shared 0.5s cooldown, every wagon 3 within '
        + '20px on its own independent 0.5s timer — a long rake dragged over somebody bills them '
        + 'repeatedly — and a puddle drops every 2 seconds. Five coal lumps are scattered at random: each '
        + 'is +5% speed to a ×2.0 cap and +10% train damage to a ×3.0 cap. 30s cooldown, counted from '
        + 'when the train ends.',
      cast: 'Q. WASD snaps to the four cardinal directions; there is no way to stop or cancel. The cooldown starts when the train ends, not when it begins.',
      effects: [
        { tag: 'movement', label: 'On rails', detail: 'A constant 200 px/s in whichever of the four directions you last pressed. You cannot stand still and you cannot travel diagonally.' },
        { tag: 'utility', label: 'Duration', detail: '1.5s per drone you had when you cast it, minimum 1.5s — so a full 6-drone fleet is 9 seconds. Every drone is destroyed when it ends.' },
        { tag: 'damage', label: 'The locomotive', detail: '8 damage within 28px of the head, on a shared 0.5s cooldown.' },
        { tag: 'damage', label: 'Every wagon', detail: '3 damage within 20px of each segment, each on its own independent 0.5s cooldown. A long rake dragged across somebody bills them repeatedly.' },
        { tag: 'summon', label: 'Spillage', detail: 'One oil puddle dropped every 2s along the track.' },
        { tag: 'resource', label: 'Coal', detail: '5 lumps scattered at random. Each collected is +5% speed (to a ×2.0 cap) and +10% train damage (to a ×3.0 cap).' },
        { tag: 'utility', label: 'Availability', detail: '30s cooldown, counted from the moment the train ends.' },
      ],
      upgrade: {
        basics:
          'Collecting all five lumps doubles the whole train damage multiplier on top of the +10% each '
          + 'already gave — a fully fuelled overloaded train is at ×3.0, so 24 from the head and 9 from '
          + 'every wagon — adds 5 seconds to the remaining run, and turns the spillage into fire: a puddle '
          + 'every 1 second instead of 2, each lit as it lands. Every segment glows orange for the rest of '
          + 'the run.',
        effects: [
          { tag: 'buff', label: 'Doubled damage', detail: 'The whole train damage multiplier is doubled on top of the +10% each lump already gave — a fully fuelled overloaded train is at ×3.0, so 24 from the head and 9 from every wagon.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Extra time', detail: '+5s onto the remaining duration, whenever in the run the fifth lump was collected.', requiresUpgrade: 'q' },
          { tag: 'dot', label: 'Burning track', detail: 'Puddles drop every 1s instead of 2s, and each one is lit as it lands. The train stops leaving fuel and starts leaving fire.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Readable', detail: 'Every segment glows orange for the rest of the run.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Triggering Coal Overload is one of the four Oil Mastery requirements (20 times), and running enemies down with the train is another (50 kills).',
        'Q is the reason the swarm is worth hoarding: casting with one drone is a 1.5s train, casting with six is a 9s one.',
      ],
    },
  },

  perks: {
    'bio-fuel': {
      basics:
        'Magazines go from 3 shots to 5, which is 67% more volleys out of the same building time. It '
        + 'compounds with Overclock: a full drone dumps 20 damage of bullets instead of 12 and detonates '
        + 'for 30 instead of 20.',
      effects: [
        { tag: 'resource', label: 'Bigger magazines', detail: '5 shots per drone instead of 3 — 67% more volleys out of the same time spent building.' },
        { tag: 'damage', label: 'More out of Overclock', detail: 'With R+ a full drone dumps 20 damage of bullets instead of 12, and detonates for 30 instead of 20.' },
      ],
      notes: [
        'It does not raise the 6-drone cap, only what each one is worth.',
      ],
    },
    gasoline: {
      basics:
        'Every drone rolls its kind as it is assembled: 14% Med-Drone, 14% Bash-Drone, 14% Blast-Drone, '
        + '8% Drone-Prime — a 50% chance of something special, 50% a standard airframe. 💊 Med heals you '
        + '2 HP a second while it stays on the orbit. 🥊 Bash spends its shot ramming: it drops off, '
        + 'crosses in about 0.2s, deals 10 damage in a 46px radius with a 620 shove for 220ms, and climbs '
        + 'back on station. 💣 Blast lobs a 10-damage bomb instead of a laser and doubles every '
        + 'detonation it is part of — 40 from a Drone Destroy. ⭐ Prime carries 5 shots whatever else is '
        + 'fitted and survives a Drone Destroy: it pulls out of the run, the blast still lands, and the '
        + 'airframe flies home.',
      cast: 'Nothing to press. Every drone built rolls its kind on assembly.',
      effects: [
        { tag: 'utility', label: 'The roll', detail: '14% Med-Drone, 14% Bash-Drone, 14% Blast-Drone, 8% Drone-Prime — 50% chance of a special per build, and 50% a standard airframe.' },
        { tag: 'heal', label: '💊 Med-Drone', detail: 'Heals you 2 HP per second for as long as it stays on the orbit.' },
        { tag: 'damage', label: '🥊 Bash-Drone', detail: 'Spends its shot ramming instead of firing: drops off the orbit, crosses to the mark in ~0.2s, deals 10 damage in a 46px radius with a 620 shove for 220ms, then climbs back on station.' },
        { tag: 'damage', label: '💣 Blast-Drone', detail: 'Lobs a 10-damage bomb instead of a laser, and doubles every detonation it is part of — 40 from a Drone Destroy, and twice the Overclock blast.' },
        { tag: 'resource', label: '⭐ Drone-Prime', detail: 'Carries 5 shots whatever else is fitted, and survives a Drone Destroy — it pulls out of the run, the blast still lands, and the airframe flies home.' },
      ],
    },
  },

  mastery: {
    'drone-array': {
      basics:
        'Every drone on the orbit is 10% damage reduction — 60% off everything at the 6-drone cap. It '
        + 'drops the instant a drone is destroyed, launched by Drone Destroy or eaten by a Train Morph, '
        + 'so a volley that kills your last-round drones costs the armour with them. A lattice of plates '
        + 'around you shows the count, with a floating 🛡️ Array readout on every build.',
      effects: [
        { tag: 'shield', label: 'Resistance', detail: '10% damage reduction per drone currently on the orbit — 60% off everything at the 6-drone cap.' },
        { tag: 'cost', label: 'Spend it and lose it', detail: 'The number drops the instant a drone is destroyed, launched by Drone Destroy, or eaten by a Train Morph. Firing a volley that kills the last-round drones costs you the armour with them.' },
        { tag: 'utility', label: 'Readable', detail: 'A lattice of plates around the caster, one per drone, and a floating 🛡️ Array readout on every build.' },
      ],
      notes: [
        'Passive — no bind and no key. It puts the whole element in tension: every drone spent on damage is 10% armour handed back.',
      ],
    },
    turret: {
      basics:
        'A bindable turret built at the cursor for 3 drones — half a fleet, and 30% of your damage '
        + 'resistance if you run Drone Array. It has 150 health and a 24px body, stands 10 seconds or '
        + 'until destroyed, and soaks enemy projectiles that reach it instead of you. Recast within 64px '
        + 'to mount: held click then fires a 2-damage laser every 100ms in a 20px radius, 20 damage a '
        + 'second sustained, but mounting roots you and the turret owns your movement and mouse until you '
        + 'jump off. 20s cooldown, and it refuses to build with fewer than 3 drones.',
      cast: 'Bindable to E, R, F or Q. First cast builds it at the cursor. Recast next to it to mount; recast again to jump off. Refuses to cast with fewer than 3 drones.',
      effects: [
        { tag: 'resource', label: 'The cost', detail: '3 drones, consumed on construction — half a full fleet, and with Drone Array 30% of your damage resistance.' },
        { tag: 'summon', label: 'The turret', detail: '150 health, a 24px body, standing 10s or until destroyed. Enemy projectiles reaching it are soaked by it rather than by you.' },
        { tag: 'damage', label: 'Mounted fire', detail: 'Hold click while mounted for a 2-damage laser every 100ms in a 20px radius — 20 damage a second, sustained, for as long as you sit there.' },
        { tag: 'cost', label: 'Rooted', detail: 'Mounting locks you in place. The turret owns both your movement keys and your mouse button until you dismount.' },
        { tag: 'utility', label: 'Mount range', detail: 'You must be within 64px of it to climb on.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown.' },
      ],
      notes: [
        'The enhancement\'s own card says 75 health; the kit builds it with 150.',
        'Left unmounted it is still a shield — anything that would have hit you and reaches the turret first is absorbed by its health pool instead.',
      ],
    },
  },
};

export default oil;
