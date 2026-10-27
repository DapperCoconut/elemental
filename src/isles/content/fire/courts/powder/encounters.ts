import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Powder Court's five champions, each holding a corner of the star fort. Positions match the
 * area layout in `area.ts`: Bram in the keg alley by the magazine stacks, Hask under the north
 * rampart guns, Corvette on the drill square, Kit by the barracks smokehouse, Ironsides out on the
 * fenced test field.
 */
export const POWDER_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'powder-keg-alley',
    court: 'powder',
    name: 'Keg Alley',
    foeName: 'Keg-Roller Bram',
    foeElement: 'gunpowder',
    difficulty: 2,
    gimmick: 'powder-kegs',
    at: { x: 620, y: 1290 },
    look: { body: 0xb07a52, accent: 0x5a3a22, hat: 'beanie', traits: ['apron', 'beard'], size: 1.3 },
    challenge: [
      'Mind your feet, friend. Everything in this alley rolls, and half of it is lit.',
      'Prince says the kegs go to the guns. I say they go wherever I kick them. Let\'s see who you agree with.',
    ],
    beaten: [
      'Ha! You kick like a mule with a grudge. Best compliment I give.',
      'Go on through. And roll them gentle — powder remembers being dropped.',
    ],
    coins: 40,
  },
  {
    id: 'powder-cannon-ridge',
    court: 'powder',
    name: 'Cannon Ridge',
    foeName: 'Gunnery-Sergeant Hask',
    foeElement: 'hunt',
    difficulty: 2,
    gimmick: 'powder-cannons',
    at: { x: 1640, y: 300 },
    look: { body: 0x8a5a3a, accent: 0xa3262a, hat: 'tricorn', traits: ['scarf', 'eyepatch'], size: 1.1 },
    challenge: [
      'Five guns on this ridge, recruit. Every one of them is laid on whoever dawdles.',
      'I don\'t dawdle. I hunt. Fall in.',
    ],
    beaten: [
      'You walked me into my own row. I taught three hundred gunners and none of them thought of that.',
      'Carry on. And never stand in a line you didn\'t draw.',
    ],
    coins: 40,
  },
  {
    id: 'powder-twenty-paces',
    court: 'powder',
    name: 'Twenty Paces',
    foeName: 'Duelist Corvette',
    foeElement: 'justice',
    difficulty: 2,
    gimmick: 'powder-draw',
    at: { x: 1300, y: 760 },
    look: { body: 0xe0c0a0, accent: 0x2f4f8f, hat: 'tophat', traits: ['scarf', 'glasses'], size: 0.95 },
    challenge: [
      'Satisfaction is owed, and I am the court\'s appointed collector.',
      'Back to back. Twenty paces. Turn on the drum — and do find your mark, it would be so untidy otherwise.',
    ],
    beaten: [
      'You found your mark. I found the floor. Honour is, regrettably, satisfied.',
      'Should you ever need a second, I am told I am excellent at losing gracefully.',
    ],
    coins: 40,
  },
  {
    id: 'powder-smoke-screen',
    court: 'powder',
    name: 'Smoke Screen',
    foeName: 'Smoke-Runner Kit',
    foeElement: 'shadow',
    difficulty: 3,
    gimmick: 'powder-smoke',
    at: { x: 1960, y: 640 },
    look: { body: 0x4a4650, accent: 0x1a1a20, hat: 'hood', traits: ['mask', 'satchel'], size: 0.85 },
    challenge: [
      'You can see me? That\'s a problem. Give me a second.',
      '*pop* … There. Now come find me.',
    ],
    beaten: [
      'Nobody\'s ever walked into my smoke on purpose before. Rude. Clever. Mostly rude.',
      'Keep the canisters. I\'ve got a hundred, and the Prince counts every one.',
    ],
    coins: 40,
  },
  {
    id: 'powder-minefield',
    court: 'powder',
    name: 'Minefield Drill',
    foeName: 'Sapper Ironsides',
    foeElement: 'earth',
    difficulty: 3,
    gimmick: 'powder-mines',
    at: { x: 1200, y: 1180 },
    look: { body: 0x7a6a58, accent: 0x5e4c34, hat: 'helmet', traits: ['tool', 'beard', 'bandage'], size: 1.25 },
    challenge: [
      'Drill field. Sown it myself, I have. Every square yard, twice.',
      'Sweep goes round every few breaths. Watch the flags. Or don\'t, and we\'ll see how lucky you are.',
    ],
    beaten: [
      'Walked me over my own handiwork. Forty years sapping, and I go up on a mine I dug this morning.',
      'Take the long way round the field, eh? I lose track of a few.',
    ],
    coins: 40,
  },
];
