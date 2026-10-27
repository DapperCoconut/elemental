import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Orbit Court's five champions — Prince Perigee's keepers of the clockwork that decides
 * whose house swings nearest the moon, and so whose breath weighs heaviest on the King's meters.
 * Tier 3: difficulties 4,4,4,4,5 and 85 coins apiece. They stand where their work is done: Tycho
 * in the yard of the Great Orrery, Selene on the Ring-Street at the moon's foot, Lofty in his
 * zero-g yard on the east islet, Apsis at the Sling Hoops on Tether Quay, Null on the steps of
 * the Archive of Falling Things.
 */
export const ORBIT_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'orbit-orrery',
    court: 'orbit',
    name: 'Orrery',
    foeName: 'Clockmaker Tycho',
    foeElement: 'technology',
    difficulty: 4,
    gimmick: 'orbit-orrery',
    at: { x: 1010, y: 485 },
    look: { body: 0xc8963e, accent: 0x2b3b6a, hat: 'goggles', traits: ['apron', 'tool', 'glasses'], size: 1.05, eye: 0xffd98a },
    challenge: [
      'Mind the arms. Mind the planets. Mind the SUN. Three things to mind, and I have built all of them.',
      'My orrery decides which islet swings in closest each month. It has never once been wrong. Watch it work.',
    ],
    beaten: [
      'You threw my own switch. In my own yard. With my own planet. I would be furious if it were not so elegant.',
      'The Prince tells me which way to set the Ledger Arm. I always told myself it was only arithmetic. It is not.',
    ],
    coins: 85,
  },
  {
    id: 'orbit-tidal-lock',
    court: 'orbit',
    name: 'Tidal Lock',
    foeName: 'Moonkeeper Selene',
    foeElement: 'gravity',
    difficulty: 4,
    gimmick: 'orbit-tidal-lock',
    at: { x: 1290, y: 1065 },
    look: { body: 0x2a2338, accent: 0x9d8be6, hat: 'veil', traits: ['scarf', 'lantern'], eye: 0xd8ceff },
    challenge: [
      'Everything falls toward something, little stranger. I only decide what it falls toward, and when.',
      'My moon swings close once a pass. When it does, nobody stands their ground. Not you. Not anyone.',
    ],
    beaten: [
      'You let it take me. My own moon. I have kept it twenty years and it pulled me in like a stranger.',
      'I steer it past the debtors\' windows at perigee so their meters read heavy. I called that tending. Huh.',
    ],
    coins: 85,
  },
  {
    id: 'orbit-zero-g',
    court: 'orbit',
    name: 'Zero-G',
    foeName: 'Spacer Lofty',
    foeElement: 'rubber',
    difficulty: 4,
    gimmick: 'orbit-zero-g',
    at: { x: 2190, y: 905 },
    look: { body: 0x4fa38e, accent: 0xece0c4, hat: 'aviator', traits: ['pack', 'scarf'], size: 1.1, eye: 0xcfe6f8 },
    challenge: [
      'Wheee — oh, hello! Come in, come in. Mind your feet, they stop working past the green line. Mine never did!',
      'I train the chain-hands to work without any down. You look like you have a lot of down. Let\'s fix that.',
    ],
    beaten: [
      'BOING. Ow. Ha! You came in sideways! Nobody comes in sideways! I bounced off three walls, did you see?',
      'The Prince says the low orbit is just like my yard, for the sleepers. It isn\'t. Mine has a way out.',
    ],
    coins: 85,
  },
  {
    id: 'orbit-slingshot',
    court: 'orbit',
    name: 'Slingshot',
    foeName: 'Courier Apsis',
    foeElement: 'hunt',
    difficulty: 4,
    gimmick: 'orbit-slingshot',
    at: { x: 430, y: 1130 },
    look: { body: 0xb4683e, accent: 0x7a5622, hat: 'aviator', traits: ['satchel', 'scarf'], size: 0.95, eye: 0xf0c766 },
    challenge: [
      'Post! Arrears notices, every one of them, and every one of them delivered by hoop. You are on my round.',
      'I have never missed a door in eleven years. I go round the moon to get to them. Stand still, please.',
    ],
    beaten: [
      'You took my hoop and posted ME. Into the turf. I have never been delivered before. It is humiliating.',
      'I carry the notices. I never read them. "One link shorter", every one. Eleven years of one link shorter.',
    ],
    coins: 85,
  },
  {
    id: 'orbit-event-horizon',
    court: 'orbit',
    name: 'Event Horizon',
    foeName: 'Archivist Null',
    foeElement: 'shadow',
    difficulty: 5,
    gimmick: 'orbit-event-horizon',
    at: { x: 1420, y: 1385 },
    look: { body: 0x15121c, accent: 0xece0c4, hat: 'hood', traits: ['book', 'glasses', 'lantern'], size: 1.15, eye: 0xb9a8ff },
    challenge: [
      'Everything that falls into the moon is filed here. Houses. Chains. Names. The file is small now. Very dense.',
      'Strike me if you like. Every blow feeds the hole, and the hole is the one thing in this archive not yet full.',
    ],
    beaten: [
      'You let it grow. Past me. I have catalogued what falls for thirty years. I have never once been the entry.',
      'There is a ledger at the bottom of my archive that nothing comes back out of. The Prince keeps the key.',
    ],
    coins: 85,
  },
];
