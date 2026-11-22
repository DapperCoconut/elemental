import type { QuestDef } from '../../../../IslesTypes';
import { WEB_MAP } from './area';
import { FISH_GOBY, FISH_SHINER } from './items';
import { Q_BRIDGE, Q_KNOTS, Q_LOFT, Q_MAUD, Q_STRAND } from './npcs';

/**
 * The Web Court's five side quests.
 *
 * The silk town keeps its books in knots and its order in threads, so every quest here is about a
 * thread somebody wants untied: the tally-cord that cost Flax his Draught (and the thief's knot in
 * it), the spent spider Lisle will not let go to the brood, the tag Tatting Moss had to knot on her
 * own sister's name, the bridge that was cut to a grey widow's door — and finally the thread that
 * runs all the way up to the Loft.
 */
export const WEB_QUESTS: QuestDef[] = [
  // ── 1. The Thief's Knot — collect + talk + duel ─────────────────────
  {
    id: Q_KNOTS,
    area: 'web',
    name: 'The Thief\'s Knot',
    giver: 'web-flax',
    offer: [
      'Grey to the knuckle, and it\'s the tally\'s fault. Hank\'s knots say eight skeins. I spun twelve.',
      'The cords are still on the frame-posts. A week of my work in knots, tied by his hand.',
      'Dorcas at the racks reads knots better than anybody living. If she says they\'re crooked, they\'re crooked.',
      'Would you take them down for me? My fingers won\'t untie a thing any more.',
    ],
    accept: [
      'Four posts along the mill front. Don\'t tug — slip them off the top. Then Dorcas.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'web', label: 'Tally-cord', emoji: '🪢', color: 0xa48b62,
          spots: [{ x: 260, y: 505 }, { x: 390, y: 505 }, { x: 520, y: 505 }, { x: 640, y: 505 }],
        },
        hint: 'Slip the 4 tally-cords off the frame-posts along the mill front',
      },
      {
        objective: {
          kind: 'talk', npc: 'web-dorcas',
          lines: [
            'Flax\'s week. Let\'s see. Twelve knots, all his own loop… and here, and here. Re-tied.',
            'Left over right, back through itself. Looks like a reef. It\'s a thief\'s knot. Four skeins knotted away.',
            'Hank ties those. Always has. Oh — and here he is, coming down the bridge with his tally-hook out.',
          ],
        },
        hint: 'Take the cords to Dorcas Reel at the drying racks',
      },
      {
        objective: {
          kind: 'duel', area: 'web',
          foe: {
            id: 'web-q-thief-knot-duel',
            court: 'web',
            name: 'Twelve Knots, Eight Skeins',
            foeName: 'Tallyman Pennyroyal Hank',
            foeElement: 'fortune',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 390, y: 660 },
            look: { body: 0xc8a888, accent: 0xc9a248, hat: 'tophat', traits: ['book', 'glasses', 'satchel'], size: 1.1, eye: 0xe2c25c },
            challenge: [
              'A tally is a tally. Once it\'s knotted, it\'s true. That\'s what a knot is FOR.',
              'Four skeins off a grey man\'s week. Who\'s it hurting? He\'s grey already. The doses buy themselves.',
              'Hand me those cords and we\'ll say no more about who took them down.',
            ],
            beaten: ['…Re-tie it, then. Twelve. Twelve skeins. I\'ll tie it honest. I know how. I just stopped.'],
            coins: 100,
          },
        },
        hint: 'Face Tallyman Pennyroyal Hank before he takes the cords back',
      },
    ],
    complete: [
      'Twelve! Dorcas called it out at the Reel in front of everybody. Twelve skeins, Flax, third frame.',
      'Back on the roll. A dose at the new moon. Here — the mill paid me my back wages. Take half. Take it.',
    ],
    reward: { orbs: 9, coins: 90 },
  },

  // ── 2. Old Maud — fish + deliver + duel ──────────────────────────────
  {
    id: Q_MAUD,
    area: 'web',
    name: 'Old Maud',
    giver: 'web-lisle',
    offer: [
      'Maud\'s stopped spinning. The Pen-Warden says she\'s spent, and spent spiders go to the brood pens.',
      'As FOOD. For the little ones. She\'s older than my gran! She was spinning before the Loft was built!',
      'She\'s only hungry. Spinner-shiners are her favourite — the flashy little fish in the silk pool.',
      'Catch her two? If she eats well she\'ll spin. I know she will.',
    ],
    accept: [
      'The silk pool, down the south bridge. Cast past the web on the water. They come up for the dew.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_SHINER, count: 2 },
        hint: 'Catch 2 spinner-shiners in the silk pool',
      },
      {
        objective: {
          kind: 'deliver', npc: 'web-lisle', item: FISH_SHINER, count: 2,
          lines: [
            'Two! Maud — MAUD — look! …She\'s eating. She\'s eating both. She never eats both.',
            'She\'s going up the web — she\'s spinning — it\'s GOLD. Look at it. Gold thread. Nobody\'s spun gold in years.',
            'Oh no. That\'s the Pen-Warden\'s goad clacking on the bridge. He\'s seen the light off it.',
          ],
        },
        hint: 'Bring the 2 spinner-shiners to Lisle at the end pen',
      },
      {
        objective: {
          kind: 'duel', area: 'web',
          foe: {
            id: 'web-q-old-maud-duel',
            court: 'web',
            name: 'Spent',
            foeName: 'Pen-Warden Goad Mortlake',
            foeElement: 'hunt',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'web-brood',
            at: { x: 2140, y: 640 },
            look: { body: 0xb49a80, accent: 0x261f2c, hat: 'helmet', traits: ['tool', 'beard', 'pack'], size: 1.25, eye: 0xd8402e },
            challenge: [
              'Gold thread off a spent spider. That\'s a spider somebody\'s been feeding off the books.',
              'A spider that spins gold is a spider that\'s been hiding it. She owes the Tithe the lot.',
              'Stand aside. The brood pens are hungry, and so am I.',
            ],
            beaten: ['…Fine. Fine! Write her down as working. A working spider stays in her pen. Rules is rules.'],
            coins: 100,
          },
        },
        hint: 'Stop Pen-Warden Goad Mortlake taking Maud to the brood pens',
      },
    ],
    complete: [
      'He wrote her down. WORKING. In the pen book. She\'s safe as long as she spins, and she\'s spinning like mad.',
      'She spun this for you — look, a gossamer goby wrapped in gold. Maud says thank you. I say thank you too.',
    ],
    reward: { orbs: 10, coins: 60, item: FISH_GOBY, itemCount: 1 },
  },

  // ── 3. Cut the Strand — visit + collect + duel ───────────────────────
  {
    id: Q_STRAND,
    area: 'web',
    name: 'Cut the Strand',
    giver: 'web-tatting',
    offer: [
      'I tie the tags on the Spymaster\'s Web. Today I tied one on my sister. Netty. She said the Draught was thin.',
      'Three listeners heard her and reported her. Three strands, three ear-trumpets set on our street.',
      'If the strands are cut, the reports can\'t hold the tag. No tag, no name read. No name, she gets her dose.',
      'I can\'t do it. The Web sings when a knotter\'s hand touches it wrong. Yours, it doesn\'t know.',
    ],
    accept: [
      'Read her tag first so you know the strands. Then find the trumpets. Cut their lines, not the Web.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'web', at: { x: WEB_MAP.x, y: WEB_MAP.y + 36 }, r: 70, label: 'The Spymaster\'s Web' },
        hint: 'Read Netty Moss\'s tag on the Spymaster\'s Web',
      },
      {
        objective: {
          kind: 'collect', area: 'web', label: 'Listener\'s trumpet-line', emoji: '📯', color: 0xe2c25c,
          spots: [{ x: 1640, y: 610 }, { x: 1250, y: 1180 }, { x: 780, y: 870 }],
        },
        hint: 'Cut the 3 trumpet-lines: by the pens, on the south bridge, and on the west bridge',
      },
      {
        objective: {
          kind: 'duel', area: 'web',
          foe: {
            id: 'web-q-cut-strand-duel',
            court: 'web',
            name: 'Somebody Was Listening',
            foeName: 'Listener Gall',
            foeElement: 'subterfuge',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1090, y: 920 },
            look: { body: 0x9a9286, accent: 0x2c2238, hat: 'cowl', traits: ['mask', 'satchel'], size: 1.0, eye: 0xe2c25c },
            challenge: [
              'My trumpet went deaf in the middle of a sentence. A good sentence. I\'d have had a dose for it.',
              'Three trumpets, three lines, all cut clean. Somebody knew which ones. Somebody READ the Web.',
              'I don\'t need a trumpet to hear you, stranger. You breathe like a liar.',
            ],
            beaten: ['…I never liked Netty\'s tag anyway. She gave me soup once. I put that in the report too.'],
            coins: 100,
          },
        },
        hint: 'Deal with Listener Gall on the plaza before he finds new strands',
      },
    ],
    complete: [
      'Her tag fell off the Web on its own. I saw it go. Nobody can read a name that isn\'t there.',
      'Netty doesn\'t know. I\'ll never tell her. Here — my wages for the moon. Knotter\'s pay is good. And dirty.',
    ],
    reward: { orbs: 11, coins: 85 },
  },

  // ── 4. The Cut Bridge — talk + collect + defeat ──────────────────────
  {
    id: Q_BRIDGE,
    area: 'web',
    name: 'The Cut Bridge',
    giver: 'web-lacewing',
    offer: [
      'Widow Teasel\'s bridge. I cut it. Orders — her name went up on the Web and the grey can\'t reach the queue.',
      'She\'s been sitting on her step a month watching the queue she can\'t get to. I want to string it back.',
      'I\'ve rope stashed round the racks, three coils. But Snare wired the approach the day I cut it.',
      'Get the rope. And if Snare comes out to see who\'s at his wires — well. You look like you can fight.',
    ],
    accept: [
      'Go and tell Teasel first. I don\'t want her thinking we\'re coming to take the rest of her pod.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'web-teasel',
          lines: [
            'Hemp sent you? To put it BACK? The old fool. They\'ll cut his next.',
            '…Tell him yes. Tell him yes, please. Tell him I\'ve kept the end of it, here, tied to my step.',
          ],
        },
        hint: 'Tell Widow Teasel on the west pod that her bridge is coming back',
      },
      {
        objective: {
          kind: 'collect', area: 'web', label: 'Coil of bridge-rope', emoji: '🪢', color: 0xa48b62,
          spots: [{ x: 250, y: 1150 }, { x: 460, y: 1310 }, { x: 660, y: 1160 }],
        },
        hint: 'Gather Hemp Lacewing\'s 3 coils of bridge-rope round the drying racks',
      },
      {
        objective: { kind: 'defeat', encounter: 'web-tripwire' },
        hint: 'Clear the wires: beat Trapper Snare (Tripwire) on the Long Strand',
      },
    ],
    complete: [
      'Strung. New rope, new planks, and not a wire on it. Teasel walked it with her stick and wouldn\'t let me help.',
      'That\'s my bridging fee from the Loft for the last nine cuts. I don\'t want it. You have it.',
    ],
    reward: { orbs: 8, coins: 110 },
  },

  // ── 5. Up to the Loft — talk + talk + prince ─────────────────────────
  {
    id: Q_LOFT,
    area: 'web',
    name: 'Up to the Loft',
    giver: 'web-skein',
    requires: { courtReady: 'web' },
    offer: [
      'All five of his champions. His Highness felt each one fall along his threads, one by one.',
      'He will see you. Before you go up — ask Madam Twill what he was like as a boy. She made his first coat.',
      'And that informer by the plaza, Noll. Ask him what he sold this morning. You should know what you walk into.',
    ],
    accept: [
      'Twill, then Noll. Then the Loft. Come up the main ladder. He will know which rung you are on.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'web-bobbin',
          lines: [
            'Weft? I made his first coat. Grey. He wouldn\'t wear any colour — said colour was loud.',
            'Runt of her clutch. She gave the others courts. She gave him a thread and said tell me what it says.',
            'He held it every hour of every day until he was grown. Never let go. I don\'t think he knows how.',
          ],
        },
        hint: 'Ask Madam Bobbin Twill what Prince Weft was like as a boy',
      },
      {
        objective: {
          kind: 'talk', npc: 'web-noll',
          lines: [
            'Me? Sold? Nothing. Well. One little tag. Yours. Where you\'d been, who you\'d talked to. Price of a dose.',
            'Don\'t look at me like that. He\'d have heard it anyway. He hears everything. I just heard it first.',
          ],
        },
        hint: 'Ask Eavesdrop Noll on the plaza what he sold the Loft this morning',
      },
      {
        objective: { kind: 'prince', prince: 'weft' },
        hint: 'Face Prince Weft at the Loft',
      },
    ],
    complete: [
      'He has come down to the gallery floor and he is cutting threads. One by one. I count them as they go.',
      'He said to give you the Loft\'s purse. He said: tell them I heard every word, and that I am sorry.',
    ],
    reward: { orbs: 12, coins: 160 },
  },
];
