import type { EncounterDef } from '../../../../IslesTypes';

/**
 * The Corona Court's five champions — Prince Flux's staff, each running one of his experiments
 * as a fight. Tier 3: difficulties 3,3,4,4,4 and 55 coins apiece. They stand along the walkways
 * where their experiment lives: Helia on the plaza under the sun, Ampere in the pylon field, Q-7
 * outside the containment vault, Zenith in the stone circle, Torus by the bottle works.
 */
export const CORONA_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'corona-captive-sun',
    court: 'corona',
    name: 'Captive Sun',
    foeName: 'Sunwarden Helia',
    foeElement: 'light',
    difficulty: 3,
    gimmick: 'corona-captive-sun',
    at: { x: 1090, y: 930 },
    look: { body: 0xffe6a0, accent: 0xc8963a, hat: 'goggles', traits: ['glasses', 'tool'], eye: 0xfff6c8 },
    challenge: [
      'Stand still. You are in my light, and my light is metered.',
      'The Prince lets me walk a little sun on a leash. Shall we see how warm you can stand?',
    ],
    beaten: [
      'My little sun is sulking in its gimbal. It liked you better. Everyone does, apparently.',
      'Go on. Stand in the warm. Nobody is metering it today.',
    ],
    coins: 55,
  },
  {
    id: 'corona-arc-pylons',
    court: 'corona',
    name: 'Arc Pylons',
    foeName: 'Pylon-Keeper Ampere',
    foeElement: 'electricity',
    difficulty: 3,
    gimmick: 'corona-arc-pylons',
    at: { x: 1730, y: 640 },
    look: { body: 0x9fb4c8, accent: 0x3a3a52, hat: 'helmet', traits: ['tool', 'satchel', 'glasses'], eye: 0xd6f0ff },
    challenge: [
      'Mind the numbers on the pylons. One, two, three — then the air turns to wire.',
      'I keep the arcs on schedule. You are not on the schedule. Let us fix that.',
    ],
    beaten: [
      'You read the sequence better than my apprentices. Want a job? No? Wise.',
      'The pylons hum your name now. That is not a compliment, it is a fault I have to fix.',
    ],
    coins: 55,
  },
  {
    id: 'corona-containment-breach',
    court: 'corona',
    name: 'Containment Breach',
    foeName: 'Specimen Q-7',
    foeElement: 'plasma',
    difficulty: 4,
    gimmick: 'corona-containment-breach',
    at: { x: 760, y: 470 },
    look: { body: 0xc89aff, accent: 0x5a1fa8, hat: 'none', traits: ['bandage', 'brand'], eye: 0xffffff, size: 1.15 },
    challenge: [
      'q-seven. q-seven. they wrote it on me so i would remember. HOLD STILL. it hurts less near the plates.',
      'do not hit me too much. i get BRIGHT when you hit me. everybody goes away when i get bright.',
    ],
    beaten: [
      'it is quiet in the tank now. quieter than before. thank you for the plates.',
      'i think i had a name before the letter. i am trying to hear it.',
    ],
    coins: 55,
  },
  {
    id: 'corona-flare-weather',
    court: 'corona',
    name: 'Flare Weather',
    foeName: 'Flare-Chaser Zenith',
    foeElement: 'fire',
    difficulty: 4,
    gimmick: 'corona-flare-weather',
    at: { x: 1890, y: 1110 },
    look: { body: 0xff9a4a, accent: 0x7a2a10, hat: 'bandana', traits: ['scarf', 'satchel'], eye: 0xfff0b0 },
    challenge: [
      'Feel that? The meter is climbing. When it breaks, the only safe place is in a stone\'s shadow.',
      'And there are only so many stones. I chase flares for the Prince. You can chase shade.',
    ],
    beaten: [
      'You beat me to the shadow every time. Infuriating. Brilliant, but infuriating.',
      'I measured that last flare. It was the biggest yet. You stood in it like it was drizzle.',
    ],
    coins: 55,
  },
  {
    id: 'corona-magnetic-bottle',
    court: 'corona',
    name: 'Magnetic Bottle',
    foeName: 'Torus the Bottle-Keeper',
    foeElement: 'magnet',
    difficulty: 4,
    gimmick: 'corona-magnetic-bottle',
    at: { x: 1505, y: 1300 },
    look: { body: 0x7d8a96, accent: 0x4f9c8a, hat: 'goggles', traits: ['apron', 'tool'], size: 1.3, eye: 0xb36bff },
    challenge: [
      'A sun cannot be held in a jar. It can be held in a field. I am the field. Step inside.',
      'The walls breathe. In, out. Do not touch them on the out-breath. Or the in-breath. Do not touch them.',
    ],
    beaten: [
      'You found the mirror coils and threw me at them. I will be writing that down. Then crying.',
      'The bottle held. You did not. Wait — no. Other way round. Yes. Go away, please.',
    ],
    coins: 55,
  },
];
