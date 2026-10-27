import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Inkwell Court's five champions — the Prince's clerks of the page, each enforcing the Dry
 * Tithe with their own instrument. Tier 3: difficulties 3,3,4,4,4 and 65 coins apiece. They stand
 * where their work is done: Quill under his censor's tower, Murk on the pen-bank, Sumi in the
 * scriptorium lane, Proclam on Decree Square, Rorsch before his Hall of Reflection.
 */
export const INKWELL_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'inkwell-redaction',
    court: 'inkwell',
    name: 'Redaction',
    foeName: 'Censor Quill',
    foeElement: 'ink',
    difficulty: 3,
    gimmick: 'inkwell-redaction',
    at: { x: 470, y: 525 },
    look: { body: 0x0e0e12, accent: 0xf2eee3, hat: 'tophat', traits: ['glasses', 'book'], eye: 0x2b5cff },
    challenge: [
      'You are not on any list I keep. Hold still and I will fix that, with a very straight line.',
      'A redacted man cannot speak, cannot cast, cannot be seen. He can only wait. Let us practise waiting.',
    ],
    beaten: [
      'You stepped round every bar. Do you know how long it takes to rule a line that straight? Forever.',
      'I have redacted myself from the tower roster. Just for an afternoon. To see how it feels. It feels... light.',
    ],
    coins: 65,
  },
  {
    id: 'inkwell-squid-pens',
    court: 'inkwell',
    name: 'Squid Pens',
    foeName: 'Squidherder Murk',
    foeElement: 'water',
    difficulty: 3,
    gimmick: 'inkwell-squid-pens',
    at: { x: 420, y: 940 },
    look: { body: 0x7d7a72, accent: 0x0e0e12, hat: 'souwester', traits: ['apron', 'tool', 'beard'], size: 1.2 },
    challenge: [
      'Careful by the pens. My girls squirt at anything that walks close. Anything but me — I smell of herring.',
      'The Queen wants her ink black and her squids milked. You want to argue about it? In the dark, then.',
    ],
    beaten: [
      'You turned my own girls on me. I am drenched. I will smell of ink until the next tide. Possibly forever.',
      'Tess says I ought to stop tapping Old Gloom. Tess says a lot of things. ...She is usually right.',
    ],
    coins: 65,
  },
  {
    id: 'inkwell-wet-ink',
    court: 'inkwell',
    name: 'Wet Ink',
    foeName: 'Calligrapher Sumi',
    foeElement: 'chalk',
    difficulty: 4,
    gimmick: 'inkwell-wet-ink',
    at: { x: 820, y: 1335 },
    look: { body: 0xf2eee3, accent: 0x0e0e12, hat: 'veil', traits: ['scarf', 'tool'], eye: 0x0e0e12 },
    challenge: [
      'Every receipt in the Reach bears my signature. One stroke, never lifted. Mind your step — I am still writing.',
      'My prints are wet, and they are mine. Tread on them and the page bites back.',
    ],
    beaten: [
      'You smudged my hand. In twenty years no one has smudged my hand. I think I would like to frame it.',
      'Mabry has been forging my S for years, you know. Badly. Tell her: the loop goes UNDER.',
    ],
    coins: 65,
  },
  {
    id: 'inkwell-decree',
    court: 'inkwell',
    name: 'Decree',
    foeName: 'Herald Proclam',
    foeElement: 'justice',
    difficulty: 4,
    gimmick: 'inkwell-decree',
    at: { x: 1050, y: 700 },
    look: { body: 0xf2eee3, accent: 0x2b5cff, hat: 'tricorn', traits: ['book', 'scarf'], size: 1.1, eye: 0x13297a },
    challenge: [
      'By order of Her Tidal Majesty: you will stand to be fined. The decree changes every few seconds. Keep up.',
      'Ignorance of the decree is no defence. Neither, I find, is anything else.',
    ],
    beaten: [
      'You stood on the seal. The SEAL. Under the law that makes you very nearly the Queen. I need to sit down.',
      'I have been reading the decrees aloud for eleven years. I had never once listened to them.',
    ],
    coins: 65,
  },
  {
    id: 'inkwell-inkblot',
    court: 'inkwell',
    name: 'Inkblot Test',
    foeName: 'Doctor Rorsch',
    foeElement: 'psychic',
    difficulty: 4,
    gimmick: 'inkwell-inkblot',
    at: { x: 1980, y: 565 },
    look: { body: 0xf2eee3, accent: 0x0e0e12, hat: 'none', traits: ['glasses', 'book', 'beard'], eye: 0x2b5cff, size: 1.05 },
    challenge: [
      'What do you see in the blot? A moth? A crown? A drowned house? Good. Now — the room is folded. Find yourself.',
      'Everything that happens on your side happens on mine. Stand opposite me, and every blow counts twice.',
    ],
    beaten: [
      'Fascinating. You saw a door in every blot. The Prince sees a crown in every one. I shall write you both up.',
      'I asked the Queen what she saw once. She said "a dry floor that ought to be wet". I have not slept since.',
    ],
    coins: 65,
  },
];
