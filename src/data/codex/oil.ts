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
      magic:
        'Quadcopters spun up out of a puff of exhaust and parked in orbit around you, each with a '
        + 'lens tracking whoever you are fighting and a strip of pips showing how many rounds it has '
        + 'left. They are the element\'s currency: everything else in the kit either spends them, '
        + 'sizes itself off them, or needs them alive.',
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
      magic:
        'Crude spilled on the floor, welling out from wherever it was dropped and draining away '
        + 'rather than blinking out. It is inert until something sets it alight, and anybody who '
        + 'walks through it wears the stuff — coated, slick, and one laser away from being on fire.',
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
      magic:
        'One button running the whole fleet, and which job it does depends entirely on how long you '
        + 'hold it. Held, the caster is a factory: airframes assemble out of exhaust and climb onto '
        + 'the orbit one after another. Tapped, every drone in the sky snaps its lens onto the cursor '
        + 'and fires at once — a converging cage of laser beams onto a single point.',
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
        magic:
          'Bomb Drones stops a spent airframe being wasted. A drone that fires its last round no '
          + 'longer just pops — it tumbles to the mark trailing smoke with its fuse lamp strobing, '
          + 'and goes up as an actual bomb. The swarm also stops being harmless to touch.',
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
      magic:
        'A drum of crude bowled out along the floor. It rolls at a fixed speed, the staves visibly '
        + 'turning at the rate the distance demands, laying a skid track and dribbling oil behind it '
        + 'the whole way — and it is unstable. Anything it touches sets it off, including a shot from '
        + 'the enemy, which makes it as much a hazard for you as for them.',
      cast: 'E, aimed at the cursor. Casting again while one is rolling detonates the old barrel first.',
      effects: [
        { tag: 'damage', label: 'Detonation', detail: '20 damage in a 50px radius, plus a 150ms camera shake.' },
        { tag: 'summon', label: 'The spill', detail: 'One 30px puddle every 80px of travel, plus 2 more scattered within 25px of the blast.' },
        { tag: 'movement', label: 'Travel', detail: '300 px/s in a straight line from the caster toward the cursor.' },
        { tag: 'cost', label: 'What sets it off', detail: 'Touching an enemy (within 30px), reaching a wall, or being hit by an enemy projectile (within 30px). You do not choose the moment unless you click it.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        magic:
          'Barrel Roll makes it a vehicle. You throw the drum out from under your own feet and ride '
          + 'it, standing on top while it steers toward the cursor — the only movement ability in the '
          + 'kit, and one that is still a bomb the whole time you are on it.',
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
      magic:
        'One airframe taken off the orbit and thrown away. It kicks off station under a strobing '
        + 'arming lamp that beats faster the closer it gets, trailing exhaust the whole run, and goes '
        + 'in nose first. There is nothing clever about it — it is the only way the kit turns a drone '
        + 'directly into a number.',
      cast: 'R at the cursor. Refuses to cast with no drones. The drone taken is the most recently built one.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '20 damage in a 60px radius on arrival, with a 120ms camera shake.' },
        { tag: 'movement', label: 'The run', detail: '500ms of flight from the drone\'s orbit position to the cursor, whatever the distance.' },
        { tag: 'resource', label: 'Cost', detail: 'One whole drone, destroyed. Its remaining shots are lost with it.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        magic:
          'Overclock refuses to let the magazine go to waste. The drone glows blue, dumps every '
          + 'bullet it has left at the cursor in a rapid string, and only then flies in — and the '
          + 'detonation is sized off the magazine it started with, so emptying it first costs nothing.',
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
      magic:
        'A hexagonal plinth driven into the ground with a dome of hex lattice snapping up around it. '
        + 'It is a point-defence installation and nothing else: it will not chase, it will not damage '
        + 'a fighter directly, and it stops working when it runs down. What it does inside its window '
        + 'is delete every projectile that comes near it.',
      cast: 'F at the cursor. Placing a second one destroys the first — there is only ever one.',
      effects: [
        { tag: 'shield', label: 'Interception', detail: 'Every enemy projectile within 150px of the generator is destroyed outright, with a beam out to the kill and shrapnel where it came apart.' },
        { tag: 'damage', label: 'Splash', detail: '8 damage in a 30px radius at each interception point — so a projectile shot down beside the enemy hurts them.' },
        { tag: 'utility', label: 'The window', detail: 'Charged for 5s from placement, and the lens visibly dims across the whole window rather than only at the end.' },
        { tag: 'resource', label: 'Recharging', detail: 'A Drone Command volley aimed within 60px of a discharged generator refills it for another 5s. There is no limit on how often.' },
        { tag: 'utility', label: 'Availability', detail: '15s cooldown on placing one — but a placed generator can be kept alive indefinitely with volleys.' },
      ],
      upgrade: {
        magic:
          'Shield Boost is meant to widen the charge window. In the kit as it stands it does something '
          + 'else: the generator keeps a tally of what it has shot down and visibly grimes up with the '
          + 'scrap of every second kill.',
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
      magic:
        'The caster stops being a person. A locomotive assembles out of the frame in a blast of '
        + 'steam, and from that moment you are a snake of coupled wagons rolling on rails you cannot '
        + 'get off — no stopping, no reversing, only four directions. Five lumps of coal are scattered '
        + 'across the arena, and the whole ultimate is a race to shovel them into the firebox before '
        + 'the boiler runs dry.',
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
        magic:
          'Coal Overload is the reward for actually collecting all five. The boiler lets go — a pillar '
          + 'out of the stack, a blast ring and a hard shake — and the train comes out the other side '
          + 'longer, angrier, and leaving fire instead of oil.',
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
      magic:
        'Better fuel in the same airframes. Nothing about the swarm changes except how long each '
        + 'drone stays useful — which is the whole element, because a drone at zero shots is a dead '
        + 'drone and the ultimate is measured in drones.',
      effects: [
        { tag: 'resource', label: 'Bigger magazines', detail: '5 shots per drone instead of 3 — 67% more volleys out of the same time spent building.' },
        { tag: 'damage', label: 'More out of Overclock', detail: 'With R+ a full drone dumps 20 damage of bullets instead of 12, and detonates for 30 instead of 20.' },
      ],
      notes: [
        'It does not raise the 6-drone cap, only what each one is worth.',
      ],
    },
    gasoline: {
      magic:
        'The divine perk. The workshop stops turning out one airframe and starts turning out four — '
        + 'each new drone is rolled from a table, and a special is announced over your head as it '
        + 'spins up. Every kind still orbits, still spends shots and still dies at zero; what changes '
        + 'is what a shot does and what a kamikaze run leaves behind.',
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
      magic:
        'The swarm stops being only ammunition and starts being armour. Plates of the drones\' own '
        + 'lattice close around you in proportion to the fleet, so a full six-drone build is the '
        + 'single largest damage reduction any element can carry — and it evaporates the moment you '
        + 'spend it.',
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
      magic:
        'Three drones stripped for parts and bolted down into a laser turret. It is a real object — '
        + 'it has health, it soaks shots aimed past it, and it can be destroyed — and it is worth far '
        + 'more mounted than left alone. Riding it roots you in place and hands you a rapid-fire beam '
        + 'that nothing else in the kit provides.',
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
