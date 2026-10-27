import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Rimefast Court's five champions, each holding a part of the frozen harbour. Positions match
 * `area.ts`: Brisa on the swept rink in the middle of the basin, Floe beside his icebreaker at the
 * east end, Tarn in the frozen market square on the west quay, Vell under the palace's west
 * gallery, Drift between the snow forts by the south quay.
 */
export const RIMEFAST_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'rimefast-thin-ice',
    court: 'rimefast',
    name: 'Thin Ice',
    foeName: 'Skater Brisa',
    foeElement: 'ice',
    difficulty: 3,
    gimmick: 'rimefast-thin-ice',
    at: { x: 1150, y: 1010 },
    look: { body: 0xe6d2c4, accent: 0xa8343a, hat: 'beanie', traits: ['scarf'], size: 0.9, eye: 0xcfefff },
    challenge: [
      'You walk on this ice like it owes you money. It doesn\'t. It owes ME. I swept it.',
      'Rink rules: hit hard and the ice cracks where you land. Fall through and you come up a statue.',
      'Lace up. Oh — you haven\'t got skates. Shame.',
    ],
    beaten: [
      'You put ME through my own rink. I have never once been through my own rink.',
      'Go on, then. Glide, don\'t stamp. The ice can hear you stamping.',
    ],
    coins: 70,
  },
  {
    id: 'rimefast-icebreaker',
    court: 'rimefast',
    name: 'Icebreaker',
    foeName: 'Captain Floe',
    foeElement: 'metal',
    difficulty: 4,
    gimmick: 'rimefast-icebreaker',
    at: { x: 1930, y: 990 },
    look: { body: 0xb8a090, accent: 0x343a42, hat: 'souwester', traits: ['beard', 'pipe', 'tool'], size: 1.3 },
    challenge: [
      'The Rimebiter is the only hull in Rimefast with leave to move, and she moves when I say.',
      'The Prince pays me to keep the lanes open for his collectors and shut for everyone else.',
      'Stand in a lane when the horn goes and I\'ll have you for ballast. Clear the deck!',
    ],
    beaten: [
      'Ran me down with my own prow. Forty winters at the wheel and never once looked behind me.',
      'Mind the channels. They freeze over thin, and thin is the worst kind.',
    ],
    coins: 70,
  },
  {
    id: 'rimefast-frostbite',
    court: 'rimefast',
    name: 'Frostbite',
    foeName: 'Trapper Tarn',
    foeElement: 'fire',
    difficulty: 4,
    gimmick: 'rimefast-frostbite',
    at: { x: 460, y: 1060 },
    look: { body: 0x9a6e52, accent: 0x6a4a32, hat: 'hood', traits: ['pack', 'beard', 'lantern'], size: 1.2 },
    challenge: [
      'Every brazier on this square is licensed. A coin an hour for the warmth, and I hold the licences.',
      'Out here the cold does my trapping. Stand still long enough and you set like a fish in a bucket.',
      'Warm your hands. Go on. I\'ll be right over to kick it out.',
    ],
    beaten: [
      'Booted my own fire out from under me. That\'s a trapper\'s trick. Who taught you a trapper\'s trick?',
      'Keep the braziers lit, then. All of them. See if I care. …I care. They\'re lovely.',
    ],
    coins: 70,
  },
  {
    id: 'rimefast-icicle-gallery',
    court: 'rimefast',
    name: 'Icicle Gallery',
    foeName: 'Sculptor Vell',
    foeElement: 'crystal',
    difficulty: 4,
    gimmick: 'rimefast-icicles',
    at: { x: 1110, y: 490 },
    look: { body: 0xd8e4ee, accent: 0x4f94b8, hat: 'veil', traits: ['tool', 'glasses'], size: 1.0, eye: 0x9fd8f0 },
    challenge: [
      'Hush. Every icicle in my gallery is tuned. Raise your voice and one of them answers.',
      'I carve the Prince\'s likeness out of the harbour, and the harbour sends me icicles for applause.',
      'Shall we see whose note they fall to?',
    ],
    beaten: [
      'The whole hall rang on my head. That is the loudest anyone has ever been in here.',
      'Leave the statues standing, please. Some of them were people\'s faces, once. I keep them for the families.',
    ],
    coins: 70,
  },
  {
    id: 'rimefast-snow-forts',
    court: 'rimefast',
    name: 'Snow Forts',
    foeName: 'Quartermaster Drift',
    foeElement: 'gravity',
    difficulty: 4,
    gimmick: 'rimefast-snow-forts',
    at: { x: 1960, y: 1190 },
    look: { body: 0xc4a898, accent: 0x1f6a70, hat: 'helmet', traits: ['satchel', 'scarf'], size: 1.15 },
    challenge: [
      'These forts belonged to the harbour children. Requisitioned. For training purposes.',
      'Snow is issued, not taken. I am the issuer. Every ball you throw is signed for.',
      'Take the west fort. It\'s draughty. I made sure.',
    ],
    beaten: [
      'You knocked my wall flat before I could pack it. Requisition denied, I suppose.',
      'Tell the children the forts are theirs. I\'ll sign the transfer. In triplicate. With a heavy heart.',
    ],
    coins: 70,
  },
];
