import type { QuestDef } from '../../../../IslesTypes';
import { FISH_ROACH } from './items';
import { BRIDGES, DEAD_SPOT, ECHO_WALL, GALLERY, GALLERY_RX, GALLERY_RY } from './spots';

/**
 * The Cavern Court's five side quests.
 *
 * Between them they show what the Repeat costs: a widow listening for the last bars her husband
 * sang (Maud), a girl who has never heard her own voice (Wren), a choirmaster teaching harmony
 * under the Part (Cantle), a ropewright whose bridges keep the cave-folk from the gallery's ears
 * (Hamish), and finally the man the Prince was before he stopped saying anything new (Coda).
 * Each one is somebody wanting a thing to be heard once, as it was meant.
 */
export const CAVERN_QUESTS: QuestDef[] = [
  // ── 1. The Fading Voice — visit + collect + duel ─────────────────────
  {
    id: 'cavern-q-fading-voice',
    area: 'cavern',
    name: 'The Fading Voice',
    giver: 'cavern-maud',
    offer: [
      '(whispering) Tam\'s few bars are still in the gallery. But they\'re fainter every week. Much fainter.',
      'The Tuners have pinned brass reeds into the rim. Each one sings the Score, all day, into the stone.',
      'It\'s drowning him. They\'re re-singing the gallery over him like painting over a window.',
      'Would you pull them out? Go and listen at the far plate first — you\'ll hear him. Then you\'ll want to.',
    ],
    accept: ['Stand on the bronze plate by the far end. Wait for the end of the second verse. That\'s him.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'cavern', at: { x: GALLERY.x - 192, y: GALLERY.y }, r: 60, label: 'The far plate' },
        hint: 'Stand on the far plate of the Whispering Gallery and listen',
      },
      {
        objective: {
          kind: 'collect', area: 'cavern', label: 'Tuner\'s reed', emoji: '🎼', color: 0xb8843e,
          spots: [
            { x: GALLERY.x - GALLERY_RX + 30, y: GALLERY.y - 40 }, { x: GALLERY.x, y: GALLERY.y - GALLERY_RY + 14 },
            { x: GALLERY.x + GALLERY_RX - 30, y: GALLERY.y + 40 }, { x: GALLERY.x - 40, y: GALLERY.y + GALLERY_RY - 14 },
          ],
        },
        hint: 'Pull the 4 Tuners\' reeds pinned round the gallery rim',
      },
      {
        objective: {
          kind: 'duel', area: 'cavern',
          foe: {
            id: 'cavern-q-fading-voice-duel',
            court: 'cavern',
            name: 'Re-Singing',
            foeName: 'Tuner Diapason',
            foeElement: 'sound',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'cavern-whispering-gallery',
            at: { x: GALLERY.x + 90, y: GALLERY.y + 30 },
            look: { body: 0xd0c8c0, accent: 0xb8843e, hat: 'bandmaster', traits: ['tool', 'satchel'], size: 1.1, eye: 0xeac070 },
            challenge: [
              'Those reeds are Tuners\' property. Pitch-perfect, each one, and costly. Hand them over.',
              'A voice that sang out of turn does not get to go on singing in the rock. That is what muting is FOR.',
              'Stand on a plate if you like. The gallery carries my blows as well as yours.',
            ],
            beaten: ['…Keep them, then. I will write that the gallery was re-sung. Nobody comes down here to check.'],
            coins: 115,
          },
        },
        hint: 'Face Tuner Diapason in the gallery',
      },
    ],
    complete: [
      '(whispering) He\'s louder. Not loud. But I can hear him breathe before the note. I\'d forgotten he did that.',
      'Take this. It was his. He kept it for the day he\'d sing in the market. He never got there.',
    ],
    reward: { orbs: 12, coins: 80 },
  },

  // ── 2. A Rest — talk + visit + duel ──────────────────────────────────
  {
    id: 'cavern-q-a-rest',
    area: 'cavern',
    name: 'A Rest',
    giver: 'cavern-wren',
    offer: [
      'Every place in the cave sends back the Score. Every place. I\'ve tried all the ones I\'m allowed.',
      'But Glimmer goes all over the roof with her lamp. She\'d know if there was anywhere it doesn\'t reach.',
      'Will you ask her? She thinks I\'m too loud. You\'re not loud. You\'re hardly anything.',
    ],
    accept: ['Glimmer\'s down past the pool road, feeding the worms. Thank you! Shh. Thank you.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cavern-glimmer',
          lines: [
            'A dead spot? …There is one. Under the chasm\'s foot, where the floor\'s gone soft and the roof\'s high.',
            'The sound falls into the crack and never comes up. The worms there are the brightest in the cave.',
            'I don\'t tell children. The Hush sends a warden down to sit on it, in case anyone goes there to talk.',
          ],
        },
        hint: 'Ask Glimmer Sedge, down past the pool road, where the echo can\'t reach',
      },
      {
        objective: { kind: 'visit', area: 'cavern', at: DEAD_SPOT, r: 70, label: 'The dead spot' },
        hint: 'Find the dead spot under the foot of the chasm',
      },
      {
        objective: {
          kind: 'duel', area: 'cavern',
          foe: {
            id: 'cavern-q-a-rest-duel',
            court: 'cavern',
            name: 'Noise Is Fined',
            foeName: 'Hush-Warden Felting',
            foeElement: 'silence',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: DEAD_SPOT.x + 80, y: DEAD_SPOT.y - 20 },
            look: { body: 0xd8d8e0, accent: 0x8a8a9a, hat: 'earmuffs', traits: ['lantern', 'scarf'], size: 1.15, eye: 0xd8e0ff },
            challenge: [
              '(barely a breath) This is a quiet place, visitor. It is meant to stay quiet. No one is to sing here.',
              'A place where a voice comes back as itself is a dangerous place. People get ideas about themselves.',
              'I will fine you the only way the Hush fines. Hold still.',
            ],
            beaten: ['(a breath) …Let the child come, then. I will sit at the far end. I have very bad hearing today.'],
            coins: 115,
          },
        },
        hint: 'Get past the Hush-warden who sits on the dead spot',
      },
    ],
    complete: [
      'I went. I sang. Nothing came back — and then I heard it. Me. Just me, small, in the air. Like a bird.',
      'I sound AWFUL. I sound like a gate. I love it. Here — it\'s my Part-day money. I\'m going to need a new reed.',
    ],
    reward: { orbs: 11, coins: 60 },
  },

  // ── 3. Under the Part — fish + deliver + defeat ──────────────────────
  {
    id: 'cavern-q-under-the-part',
    area: 'cavern',
    name: 'Under the Part',
    giver: 'cavern-cantle',
    offer: [
      '(very low) The children sing a harmony under their Parts in the evenings. Softly. Just a second note.',
      'Chirrup\'s bats hear it. They hunt for voices in the dark for the Prince, and they are getting close.',
      'Ringing roach. A bucket of them flips and peals like a chandelier. Under that, nobody hears a choir.',
      'Three would do. Agnes at the pool will show you how. Will you? Quietly?',
    ],
    accept: ['You\'ll want a tuning rod — the pool rings, and an ordinary line shakes loose. Agnes will explain.'],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_ROACH, count: 3 },
        hint: 'Catch 3 ringing roach in the ringing pool (tuning rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'cavern-cantle', item: FISH_ROACH, count: 3,
          lines: [
            'Into the bucket — listen to them! Like a chandelier in a cellar. Perfect. Perfect.',
            '(lower) Oh. There\'s a bat on the stalls. Watching. That means Chirrup heard the bucket. And us.',
          ],
        },
        hint: 'Bring the 3 roach to Brother Cantle at the choir stalls',
      },
      {
        objective: { kind: 'defeat', encounter: 'cavern-sonar' },
        hint: 'Beat Batkeeper Chirrup (Sonar) in the Bat Hollow before his bats report',
      },
    ],
    complete: [
      'The bats are sulking in the Hollow. Last night, under a bucket of very happy fish, they sang it. All of it.',
      'Twelve children, two notes each. A chord. I have not heard a chord in this cave in thirty years. Take this.',
    ],
    reward: { orbs: 12, coins: 70 },
  },

  // ── 4. Handropes — collect + talk + duel ─────────────────────────────
  {
    id: 'cavern-q-handropes',
    area: 'cavern',
    name: 'Handropes',
    giver: 'cavern-hamish',
    offer: [
      'Somebody cut the Lower Bridge\'s handropes. Folk won\'t cross without them — the chasm has no bottom.',
      'So nobody goes over to the gallery now but the keepers. Very convenient, if you\'re the Prince.',
      'I hid four coils of good rope round the court before the Tuners could requisition them. Fetch them?',
    ],
    accept: ['By the listening post, under the Echo Wall, at the mouth by the waystone, and past the pool\'s far side.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'cavern', label: 'Coil of bridge-rope', emoji: '🪢', color: 0xa88a58,
          spots: [{ x: 1840, y: 1250 }, { x: 1060, y: 420 }, { x: 2180, y: 1000 }, { x: 1840, y: 930 }],
        },
        hint: 'Fetch the 4 coils of rope Hamish hid round the court',
      },
      {
        objective: {
          kind: 'talk', npc: 'cavern-hamish',
          lines: [
            'That\'s all four. Good. I\'ll have the Lower Bridge roped by Vespers.',
            '(lower) And there he is — Shale, the Prince\'s quarryman, on the far side, with his chisel out. Again.',
          ],
        },
        hint: 'Bring the rope back to Hamish Knott by the upper bridge',
      },
      {
        objective: {
          kind: 'duel', area: 'cavern',
          foe: {
            id: 'cavern-q-handropes-duel',
            court: 'cavern',
            name: 'Clean Through',
            foeName: 'Quarryman Shale',
            foeElement: 'earth',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'cavern-stalactite-chimes',
            at: { x: BRIDGES[1].x1 + 60, y: BRIDGES[1].y + 30 },
            look: { body: 0xa89a8a, accent: 0x5a5a62, hat: 'miner', traits: ['tool', 'beard'], size: 1.3, eye: 0xd8c8a8 },
            challenge: [
              'His Highness says a bridge to the gallery is a road for gossip. I cut roads for gossip.',
              'Clean through, both ropes, with this chisel. I\'ll do it again tonight. And the planks, this time.',
              'Out of the way. Heavy hands, me. Mind the roof.',
            ],
            beaten: ['…Rope it, then. I\'ll tell him the chisel broke. It nearly did, on your head.'],
            coins: 115,
          },
        },
        hint: 'See off Quarryman Shale at the Lower Bridge',
      },
    ],
    complete: [
      'Roped and tarred. The choir crossed for Vespers and sang on the far side. First time in a month.',
      'Here — my bridge-toll. I\'ve never charged a toll. I\'ve been saving it for the day I\'d want to.',
    ],
    reward: { orbs: 11, coins: 70 },
  },

  // ── 5. Once — talk + visit + prince ──────────────────────────────────
  {
    id: 'cavern-q-once',
    area: 'cavern',
    name: 'Once',
    giver: 'cavern-coda',
    requires: { courtReady: 'cavern' },
    offer: [
      'All five keepers. His Highness listened to every fight through the Shell. He has asked for silence.',
      'Before you go in: Ansel Bourne, at the grotto doors. Muted. He sang bass when the Prince was a boy.',
      'Then stand at the Echo Wall and say your name. Once. That is how it starts, with him.',
    ],
    accept: ['Ansel, then the wall. Then the Shell. I will hold the door. Hold the door.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'cavern-ansel',
          lines: [
            '(He signs, slowly: a small boy. Then a hand to the mouth, words coming out — once, and then he stops.)',
            '(He signs: the boy said a wrong thing at the Wall. His own. The Maestro heard it come back.)',
            '(He signs: after that, the boy only ever said what had been said. Safer. He touches his ribbon.)',
          ],
        },
        hint: 'Ask Ansel Bourne, at the grotto doors, about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'cavern', at: { x: ECHO_WALL.x, y: ECHO_WALL.y + 80 }, r: 80, label: 'The Echo Wall' },
        hint: 'Stand at the Echo Wall and say your name — once',
      },
      {
        objective: { kind: 'prince', prince: 'reprise' },
        hint: 'Face Prince Reprise at the Sounding Shell',
      },
    ],
    complete: [
      'He has said something new. To me. Six words. I will not tell you what they were. They were only said once.',
      'The steward\'s purse. He says the Shell is to be a room again. Just a room, with an echo, like anywhere.',
    ],
    reward: { orbs: 14, coins: 150 },
  },
];
