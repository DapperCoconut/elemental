import type { QuestDef } from '../../../../IslesTypes';
import { COLUMBARIUM, MOURNING, wireFoot } from './area';
import { FISH_CARP, FISH_PIKE } from './items';

/**
 * The Lantern Court's five side quests.
 *
 * Between them they show what it costs to never let anyone go: a widow whose husband was hung on the
 * wrong wire (Hesper), a girl who wants one drop of her granny's light to rest in the dark (Nell), a
 * mother who cannot say the parting words with the shutters nailed open (Isolde), a Clear whose
 * mother's wick is to be let go for debt (Pellam), and finally the empty lantern in the Columbarium's
 * lowest niche before you face the Prince (Amice). Each is somebody asking for a little dark.
 */
export const LANTERN_QUESTS: QuestDef[] = [
  // ── 1. Wire Nine — collect + talk + duel ─────────────────────────────
  {
    id: 'lantern-q-wire-nine',
    area: 'lantern',
    name: 'Wire Nine',
    giver: 'lantern-hesper',
    offer: [
      'My Aldo\'s on the wrong wire. Somebody else is in his place on Nine, and he\'s hanging among strangers.',
      'The brass tags fall off in the heat and the Registrar just guesses. He guessed wrong.',
      'Would you look along the south walk for fallen tags? Three, I should think. One of them\'s his.',
    ],
    accept: [
      'Along the walk by the wire posts. Small brass things, about so big. Then take them to Tobias.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'lantern', label: 'A fallen lantern tag', emoji: '🏷️', color: 0xc9a24a,
          spots: [{ x: 700, y: 1440 }, { x: 980, y: 1440 }, { x: 1820, y: 1440 }],
        },
        hint: 'Find 3 fallen brass lantern tags along the south walk',
      },
      {
        objective: {
          kind: 'talk', npc: 'lantern-tobias',
          lines: [
            'Tags, eh? Let\'s see. Kelly… Marsh… VANE. Aldo Vane. Wire Two, this says. Over the lake.',
            'So the fellow on Nine is a Marsh. Poor chap. I\'ll swap them over — the moment the Registrar signs.',
            'Speak of him. That\'s his inkpot clinking. He\'s seen you with tags, and he does not like loose tags.',
          ],
        },
        hint: 'Bring the tags to Tobias Wick at the lamp-standard',
      },
      {
        objective: {
          kind: 'duel', area: 'lantern',
          foe: {
            id: 'lantern-q-wire-nine-duel',
            court: 'lantern',
            name: 'Filed in Triplicate',
            foeName: 'Wire-Registrar Quill Docket',
            foeElement: 'paper',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1480, y: 1400 },
            look: { body: 0xe4d8c4, accent: 0x5a4430, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 1.05, eye: 0xf0d68a },
            challenge: [
              'A lantern hangs where the register says it hangs. If the register says Nine, it is Nine.',
              'A tag off the wire is government property. A tag in a stranger\'s pocket is theft.',
              'Hand them over and I will file the matter. In triplicate. Under "closed".',
            ],
            beaten: ['…Transfer approved. Wire Two. I shall write that the register was always right. It was resting.'],
            coins: 120,
          },
        },
        hint: 'Face Wire-Registrar Quill Docket by the wire posts',
      },
    ],
    complete: [
      'He\'s on Wire Two. Over the lake. I saw Tobias carry him across, and his light went left. LEFT.',
      'I\'ve knitted you a thing. It isn\'t finished. Take the purse instead. Aldo would want you to.',
    ],
    reward: { orbs: 12, coins: 110 },
  },

  // ── 2. A Boat With No Lantern — fish + deliver + duel ────────────────
  {
    id: 'lantern-q-empty-boat',
    area: 'lantern',
    name: 'A Boat With No Lantern',
    giver: 'lantern-nell',
    offer: [
      'Granny said soul carp carry the light that drips off the lanterns down to the bottom, to the dark.',
      'She said down there it rests. I kept her wick-bead when they hung her. It still glows. Look.',
      'If you caught me a soul carp, I could tie the bead to it and let it go. Then a bit of her could rest.',
    ],
    accept: [
      'Cast off the kerb. Soul carp only bite at shiny things. Fortune rod, or a prism one. Don\'t tell the Warden.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_CARP, count: 1 },
        hint: 'Catch a soul carp in the Lantern Lake',
      },
      {
        objective: {
          kind: 'deliver', npc: 'lantern-nell', item: FISH_CARP, count: 1,
          lines: [
            'Oh, he\'s BEAUTIFUL. Hold him still. There — the bead\'s tied to his fin. Off you go, fishy.',
            'He\'s going down! Right down! I can\'t see the light any more. That means it\'s dark down there!',
            'Uh oh. That\'s the Lake-Warden. He counts every light on the lake. He\'s just counted one fewer.',
          ],
        },
        hint: 'Bring the soul carp to Nell at the boat landing',
      },
      {
        objective: {
          kind: 'duel', area: 'lantern',
          foe: {
            id: 'lantern-q-empty-boat-duel',
            court: 'lantern',
            name: 'One Light Short',
            foeName: 'Lake-Warden Sallow Mere',
            foeElement: 'depths',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'lantern-lantern-lake',
            at: { x: 1040, y: 960 },
            look: { body: 0xb8c4c8, accent: 0x2f4a5c, hat: 'souwester', traits: ['lantern', 'book'], size: 1.15, eye: 0x9fd8ff },
            challenge: [
              'Two hundred and six lights on the lake at noon. Two hundred and five now. I count them every hour.',
              'A light let go into the deep is a soul lost to the dark. That is the law. The child knows the law.',
              'Into the shallows. If you want her light so badly, fish it back out.',
            ],
            beaten: ['…Two hundred and five. I shall write that one sank. Lanterns sink. It happens. Leave the child be.'],
            coins: 120,
          },
        },
        hint: 'Face Lake-Warden Sallow Mere in the lake shallows',
      },
    ],
    complete: [
      'He went away grumbling and didn\'t write me down! He wrote down "sank". I watched him.',
      'Granny\'s resting. A bit of her. Here — it\'s a ghostlight pike. I caught it with my hands. Nobody believes me.',
    ],
    reward: { orbs: 11, coins: 90, item: FISH_PIKE, itemCount: 1 },
  },

  // ── 3. Nailed Open — collect + talk + duel ───────────────────────────
  {
    id: 'lantern-q-nailed-open',
    area: 'lantern',
    name: 'Nailed Open',
    giver: 'lantern-isolde',
    offer: [
      'The parting must be said in the dark. That\'s the old rite. Tam\'s hung a month and I\'ve not said it.',
      'The shutters on the end window are held back by four nails. The Office of Clarity drove them in.',
      'If you could draw them, I could close the shutters. One minute. That\'s all I need. One minute of dark.',
    ],
    accept: [
      'Round the end of the house, and the front. The nails are bent over. Mind your fingers — they\'re hot.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'lantern', label: 'A shutter nail', emoji: '📌', color: 0x6c6c7a,
          spots: [
            { x: MOURNING.x - 136, y: MOURNING.y - 12 }, { x: MOURNING.x + 136, y: MOURNING.y - 12 },
            { x: MOURNING.x - 70, y: MOURNING.y + 22 }, { x: MOURNING.x + 70, y: MOURNING.y + 22 },
          ],
        },
        hint: 'Draw the 4 nails holding the Mourning House shutters open',
      },
      {
        objective: {
          kind: 'talk', npc: 'lantern-isolde',
          lines: [
            '(the shutters swing shut. Inside, for the first time in twenty-two years, it is dark.)',
            '(very softly) Go well, Tam. Go into the dark and be not afraid of it. I am letting go of your hand.',
            '(the shutters open again) …There. There. Oh — someone\'s seen. There\'s a whistle. That\'s the Inspector.',
          ],
        },
        hint: 'Return to Isolde Ashcombe at the Mourning House',
      },
      {
        objective: {
          kind: 'duel', area: 'lantern',
          foe: {
            id: 'lantern-q-nailed-open-duel',
            court: 'lantern',
            name: 'Grief Must Be Seen',
            foeName: 'Clarity-Inspector Candour Bright',
            foeElement: 'light',
            difficulty: 5,
            gimmick: 'lantern-weighing',
            at: { x: 1660, y: 1410 },
            look: { body: 0xf2ead8, accent: 0xe8c25a, hat: 'helmet', traits: ['glasses', 'book', 'cane'], size: 1.1, eye: 0xfff0b0 },
            challenge: [
              'A shutter closed in the Mourning House. A full minute. I timed it from the lane.',
              'What was said in there? Nobody knows. That is precisely the problem. Grief must be seen.',
              'The widow will be fined. You will be weighed. Step onto the scale.',
            ],
            beaten: ['…I shall report the shutters closed by wind. There is no wind in the gorge. I shall report it anyway.'],
            coins: 120,
          },
        },
        hint: 'Face Clarity-Inspector Candour Bright outside the Mourning House',
      },
    ],
    complete: [
      'I said it. In the dark, in the old words. He heard. I know he heard.',
      'Take these. They were Tam\'s savings, for a Dusk Ticket of his own. He\'d want them spent on someone brave.',
    ],
    reward: { orbs: 13, coins: 120 },
  },

  // ── 4. Arrears — talk + visit + defeat ───────────────────────────────
  {
    id: 'lantern-q-arrears',
    area: 'lantern',
    name: 'Arrears',
    giver: 'lantern-pellam',
    offer: [
      'My mother\'s on Wire Three. Her wax is in arrears — I can\'t pay; Clears can\'t work. Snuff will let her gutter.',
      'He does it at the turn of the hour, in his yard, for all the debtors at once. He calls it "trimming the book".',
      'I can\'t go near the wires. Would you ask Tobias which is hers, and stand under her? Then stop Snuff.',
    ],
    accept: [
      'Tobias first. He knows every flicker. Then the Wire Three post on the south walk. Then… then Snuff.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'lantern-tobias',
          lines: [
            'Glass? Marigold Glass. Wire Three, sixth up. She flickers like she\'s humming. Always did.',
            'Arrears, is it. Snuff\'s got the book open in his yard. He lets them go in a row, like snuffing a cake.',
            'Go stand under her a moment. Somebody ought to. Then go and give that tallow-merchant a fright.',
          ],
        },
        hint: 'Ask Tobias Wick which lantern is Marigold Glass\'s',
      },
      {
        objective: { kind: 'visit', area: 'lantern', at: wireFoot(3), r: 70, label: 'Under Wire Three' },
        hint: 'Stand under Wire Three at its post on the south walk',
      },
      {
        objective: { kind: 'defeat', encounter: 'lantern-wick-trimming' },
        hint: 'Stop Chandler Snuff (Wick Trimming) in the Wick Yard before he trims the book',
      },
    ],
    complete: [
      'Tobias says she\'s burning steady. He says he\'ll trim her himself, no charge. I don\'t know how to thank anyone.',
      'I have nothing. Clears have nothing. But the Verger slipped me this for you. She said you\'d earned it.',
    ],
    reward: { orbs: 12, coins: 100 },
  },

  // ── 5. The Lowest Niche — talk + visit + prince ──────────────────────
  {
    id: 'lantern-q-lowest-niche',
    area: 'lantern',
    name: 'The Lowest Niche',
    giver: 'lantern-amice',
    requires: { courtReady: 'lantern' },
    offer: [
      'All five of them. His Highness heard the Wick Yard wailing. He has been trimming the galleries since.',
      'Before you go in, you should know who he is. Tobias taught him to trim a wick, when he was six. Ask him.',
      'And look in the lowest niche, by the door. He keeps a lantern there. He trims it first, every morning.',
    ],
    accept: [
      'Tobias, then the niche. Then the doors. I will leave them open.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'lantern-tobias',
          lines: [
            'Little Wisp. Before the Noon, it was. His sister Ffion walked out one night and they found her at dawn.',
            'In the old well, she was. He\'d been holding her hand in the dark. He let go. He was six.',
            'When the Despot pinned the sun, he promised the boy nobody would ever be lost in the dark again.',
          ],
        },
        hint: 'Ask Tobias Wick about the Prince as a boy',
      },
      {
        objective: { kind: 'visit', area: 'lantern', at: { x: COLUMBARIUM.x - 150, y: COLUMBARIUM.y + 50 }, r: 70, label: 'The lowest niche' },
        hint: 'Look into the lowest niche of the Columbarium',
      },
      {
        objective: { kind: 'prince', prince: 'wisp' },
        hint: 'Face Prince Wisp at the Columbarium of Lights',
      },
    ],
    complete: [
      'He has opened the little lantern. It was empty. He says he always knew. He says he couldn\'t bear to look.',
      'Then he opened one more. Just one. It went up, and up, and we all watched it until it was gone.',
      'Take the Columbarium\'s alms. He says the dead have no need of wax money. He is right, of course.',
    ],
    reward: { orbs: 15, coins: 260 },
  },
];
