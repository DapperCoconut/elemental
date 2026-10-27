import type { QuestDef } from '../../../../IslesTypes';
import { GLOW, STEM } from './palette';
import { FEN, GREEN } from './layout';

/**
 * Five small stories in the Spore Court. Each is about what the bog takes and what it gives back:
 * a child the fairy rings returned wrong, a frog choir weighed as tithe, lamps that inform on the
 * houses they light, a widow following the wisps of the pruned, and the thing that listens under
 * every floor.
 */
export const SPORE_QUESTS: QuestDef[] = [
  {
    id: 'spore-changeling',
    area: 'spore',
    name: 'The Boy Who Came Back Wrong',
    giver: 'spore-tansy',
    offer: [
      'My grandson Wat went into a ring on the Green the night we came up a basket short. He came out again.',
      'Only it is not Wat. It smiles with too many teeth. It does not know the frog song, and every Mould knows it.',
      'Puck keeps the rings. Beat him, and the Green\'s three ring-stones will be loose. They show what a thing truly is.',
    ],
    accept: ['Be careful on the Green, dear. A ring is a door with no house round it, and Puck knows every door.'],
    stages: [
      { objective: { kind: 'defeat', encounter: 'spore-fairy-ring' }, hint: 'Beat Ringwarden Puck on the Tithe Green' },
      {
        objective: {
          kind: 'collect', area: 'spore', label: 'Ring-stone', emoji: '🪨', color: STEM,
          spots: [{ x: GREEN.x - 130, y: GREEN.y + 70 }, { x: GREEN.x + 140, y: GREEN.y + 60 }, { x: GREEN.x - 20, y: GREEN.y + 120 }],
        },
        hint: 'Gather the 3 ring-stones from the rim of the Tithe Green',
      },
      {
        objective: {
          kind: 'duel', area: 'spore',
          foe: {
            id: 'spore-changeling-duel',
            court: 'spore',
            name: 'Changeling',
            foeName: 'The Thing Called Wat',
            foeElement: 'illusion',
            difficulty: 4,
            gimmick: 'spore-fairy-ring',
            at: { x: 1000, y: 860 },
            look: { body: 0x5f8240, accent: 0x6effd2, hat: 'beanie', traits: ['scarf'], size: 0.75, eye: 0x6effd2 },
            challenge: [
              'Nana says I am her Wat. Nana is old. Nana does not see so well. Put the stones down, stranger.',
              'Wat is somewhere nicer. Wat is under the Green with the others. I am here instead. Isn\'t that fair?',
            ],
            beaten: ['...Wat is in the ring under the old oak stump. He is sleeping. He is fine. Let me go home now. Please.'],
            coins: 75,
          },
        },
        hint: 'Hold the ring-stones up to the thing at Tansy\'s door, below the Green',
      },
    ],
    complete: [
      'You found him under the stump? Asleep, with moss in his ears — oh, my boy. He hummed the frog song in his sleep.',
      'The other one has gone back through a ring. I left a saucer of milk on the Green. Old habits.',
    ],
    reward: { orbs: 5, coins: 60 },
  },
  {
    id: 'spore-frog-song',
    area: 'spore',
    name: 'Frog Song',
    giver: 'spore-pip',
    offer: [
      'The Bailiff took my whole frog choir for the Scales. He says frogs are produce. Frogs are NOT produce.',
      'If I had two new frogs they could teach the tadpoles the songs. Mire frogs. From the Black Mere. Big ones.',
      'Please? I would go myself but Mam says the Mere eats children. It does not. It only eats rods.',
    ],
    accept: ['Mister Mossop at the jetty knows where the frogs sit. You need an iron rod. Do you have an iron rod?'],
    stages: [
      { objective: { kind: 'fish', fish: 'fish-mire-frog', count: 2 }, hint: 'Land 2 mire frogs in the Black Mere' },
      {
        objective: {
          kind: 'deliver', npc: 'spore-pip', item: 'fish-mire-frog', count: 2, lines: [
            'GERALD. And... Mabel. Hello, Mabel. Look at her chin wobble! She is going to be a soprano.',
            'Oh no. Oh no, there is Plumb. He heard them sing. He is coming down the boards with the weights.',
          ],
        },
        hint: 'Give the 2 mire frogs to Pip Puddock',
      },
      {
        objective: {
          kind: 'duel', area: 'spore',
          foe: {
            id: 'spore-frog-song-duel',
            court: 'spore',
            name: 'Dead Weight',
            foeName: 'Tithe-Bailiff Plumb',
            foeElement: 'gravity',
            difficulty: 4,
            gimmick: '',
            at: { x: 830, y: 770 },
            look: { body: 0x4a3828, accent: 0x110d0a, hat: 'tophat', traits: ['satchel', 'tool'], size: 1.3, eye: 0xd9c27a },
            challenge: [
              'Two mire frogs, unweighed, singing on a public board. That is undeclared produce, and it is heavy.',
              'Everything has a weight, stranger. Frogs. Children. You. Step on the pan.',
            ],
            beaten: ['My weights... in the Mere. Do you know how long it took to make them read heavy? Years. YEARS.'],
            coins: 75,
          },
        },
        hint: 'Keep Tithe-Bailiff Plumb off Pip\'s frogs (the west boardwalk)',
      },
    ],
    complete: [
      'He sank his own weights! Off the end of the jetty, plop, plop. Gerald sang the whole time.',
      'You can have the first song. It goes "brup". It is about you. Thank you thank you thank you.',
    ],
    reward: { orbs: 4, coins: 45 },
  },
  {
    id: 'spore-lamplighter',
    area: 'spore',
    name: 'Keep to the Lit Side',
    giver: 'spore-russula',
    offer: [
      'When a house speaks against the tithe, Hypha snuffs its lamp through the net. The whole street sees it go out.',
      'The bank walk has gone dark from end to end. Four lamps. The low street cannot see its own feet.',
      'I can relight them, but only with fresh glow-spore, and it only falls along the Lode bank. Will you gather it?',
    ],
    accept: ['Then put a stop to Hypha\'s drumming, or he will snuff them again by morning. He is in the Thread Yard.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'spore', label: 'Glow-spore', emoji: '✨', color: GLOW,
          spots: [{ x: 700, y: 952 }, { x: 1350, y: 953 }, { x: 1720, y: 953 }, { x: 2120, y: 949 }],
        },
        hint: 'Gather 4 drifts of glow-spore along the Lode bank walk',
      },
      {
        objective: {
          kind: 'talk', npc: 'spore-russula', lines: [
            'Four drifts. Enough for every lamp on the bank, and some over for the Puddocks\', which went out on Tuesday.',
            'But Hypha is still at the net. The moment I light them he will tap them out. You must deal with him.',
          ],
        },
        hint: 'Bring the glow-spore to Brother Russula',
      },
      { objective: { kind: 'defeat', encounter: 'spore-mycelium' }, hint: 'Beat Netkeeper Hypha in the Thread Yard' },
    ],
    complete: [
      'Lit, all of them, and none of them wired. Look at the low street — people are standing in their doorways.',
      'A lamp should light a door, not watch it. Peace on your boards, friend. Keep to the lit side.',
    ],
    reward: { orbs: 5, coins: 55 },
  },
  {
    id: 'spore-wisp-road',
    area: 'spore',
    name: 'The Wisp Road',
    giver: 'spore-ambrosine',
    offer: [
      'Every night I follow the wisps across the fen, and every night they lean the same way. North.',
      'Fen leads them the long way round, so nobody can follow. And there are false lights out there too.',
      'Walk the fen with me. Find out where the true lights go — and who is hanging the false ones.',
    ],
    accept: ['Out past the east bridge, where the sedge is tallest. Keep to the cold lights. The warm ones lie.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'spore', at: { x: FEN.x + 120, y: FEN.y + 70 }, r: 70, label: 'The heart of the Wisp Fen' },
        hint: 'Walk out into the Wisp Fen, east of the low street',
      },
      { objective: { kind: 'defeat', encounter: 'spore-wisps' }, hint: 'Beat Wisper Fen and let the wisps go their own way' },
      {
        objective: {
          kind: 'duel', area: 'spore',
          foe: {
            id: 'spore-wisp-road-duel',
            court: 'spore',
            name: 'False Lights',
            foeName: 'Lantern-Man Gant',
            foeElement: 'light',
            difficulty: 4,
            gimmick: 'spore-wisps',
            at: { x: 2120, y: 1365 },
            look: { body: 0x84664a, accent: 0xd9c27a, hat: 'straw', traits: ['lantern', 'pack', 'eyepatch'], eye: 0xffe2a8 },
            challenge: [
              'A warm light on the fen, a voice calling help — and in they wade. The Prince pays by the head.',
              'Short households, mostly. Saves the Bailiff a trip. You look short, friend. Follow my lantern.',
            ],
            beaten: ['Put it out, then! Put them all out! ...Mind the deep bit behind you. I am not a monster. Not entirely.'],
            coins: 75,
          },
        },
        hint: 'Catch Lantern-Man Gant hanging false lights at the fen\'s south edge',
      },
    ],
    complete: [
      'No warm lights on the fen tonight. Only the cold ones, and every one of them leaning north. To the Glasshouse.',
      'Then Edric is up there in the hedges, still breathing. I know which way to walk now. Thank you.',
    ],
    reward: { orbs: 6, coins: 50 },
  },
  {
    id: 'spore-under-floor',
    area: 'spore',
    name: 'Under the Floor',
    giver: 'spore-corvin',
    requires: { encounter: 'spore-decomposition' },
    offer: [
      'You beat Morel at her own pits. Then you have seen what comes down the barrow. Now look where it goes.',
      'Every thread in this bog runs one way — to the Mycelarium. Something down there hears it all and keeps it.',
      'Russula has walked every thread in town with his lamps. Ask him where the heart of the net lies.',
    ],
    accept: ['Talk soft. The floor listens. It has always listened. But I think it has never once been listened TO.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'spore-russula', lines: [
            'The heart of the net? Under the Mycelarium, in a chamber of gill. Every whisper in the bog is kept there.',
            'Rhizo keeps it — the Prince\'s steward, the Listener. He writes down everything the floor hears.',
            'You will not get past him while the Prince stands. The Prince first. Then the Listener.',
          ],
        },
        hint: 'Ask Brother Russula where the heart of the net lies',
      },
      { objective: { kind: 'prince', prince: 'mycel' }, hint: 'Defeat Prince Mycel in the Mycelarium' },
      {
        objective: {
          kind: 'duel', area: 'spore',
          foe: {
            id: 'spore-under-floor-duel',
            court: 'spore',
            name: 'The Listener',
            foeName: 'Steward Rhizo',
            foeElement: 'psychic',
            difficulty: 4,
            gimmick: 'spore-mycelium',
            at: { x: 1300, y: 600 },
            look: { body: 0x3b2a3c, accent: 0x6effd2, hat: 'wizard', traits: ['book', 'glasses'], eye: 0x6effd2 },
            challenge: [
              'The Prince is down, and the net still hums. I hear it. I have always heard it. I wrote it all down.',
              'Every "short" whispered in this bog for twenty years is in my ledgers. Who do you think told the Scales?',
            ],
            beaten: ['Take the ledgers. Burn them. ...No — read them first. Read the names. Somebody should hear them once.'],
            coins: 75,
          },
        },
        hint: 'Face Steward Rhizo on the Mycelarium steps and silence the net\'s heart',
      },
    ],
    complete: [
      'The ledgers? Every whisper since the Prince came, and against each one, the basket it cost. Look at them.',
      'Edric Peat. Wat Mould\'s father. The Hobbes. All of them. We will read them out at the Scales. Every name.',
    ],
    reward: { orbs: 8, coins: 100 },
  },
];
