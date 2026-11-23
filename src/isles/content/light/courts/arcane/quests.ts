import type { QuestDef } from '../../../../IslesTypes';
import { ANCHOR, LECTERN, PYLONS } from './area';
import { FISH_EEL } from './items';

/**
 * The Arcane Court's five side quests.
 *
 * Between them they show what the mages' town has given up to keep the Noon: its astronomy
 * (Corvina's chart of the last night), its familiars (black cats are "a walking shadow"), its
 * curiosity (a student silenced for asking what night is) and its one discovery in twenty-two
 * years (Wren's backwards sigil that casts a real shadow) — and then the man who drew the circle.
 * Each ends in a fight with someone who would rather everything stayed seen.
 */
export const ARCANE_QUESTS: QuestDef[] = [
  // ── 1. A Chart of the Last Night — collect + talk + duel ─────────────
  {
    id: 'arcane-q-last-night',
    area: 'arcane',
    name: 'A Chart of the Last Night',
    giver: 'arcane-corvina',
    offer: [
      'The night before the Noon came, I charted the whole sky. Every star over Solmara, in starlight ink.',
      'The Bureau took it. A picture of darkness, they said. Contraband. The Astrologer Royal cut it in four.',
      'She pinned the pieces to the anchor-pylons, face up, to bleach in the sun. They\'re fading as we speak.',
      'Bring them back to me? Tamsin has never seen a star. Not even a drawing of one.',
    ],
    accept: [
      'Round the Anchor Circle, on the pylons. Don\'t look at them too long — starlight ink is shy of the light.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'arcane', label: 'A quarter of the star chart', emoji: '🗺️', color: 0x9ef0ff,
          spots: [
            { x: PYLONS[0].x + 10, y: PYLONS[0].y + 34 },
            { x: PYLONS[1].x + 6, y: PYLONS[1].y + 34 },
            { x: PYLONS[3].x - 10, y: PYLONS[3].y + 34 },
            { x: PYLONS[4].x + 6, y: PYLONS[4].y + 34 },
          ],
        },
        hint: 'Take down the 4 pieces of Corvina\'s star chart pinned to the anchor-pylons',
      },
      {
        objective: {
          kind: 'talk', npc: 'arcane-tamsin',
          lines: [
            'Is that — are those all stars? All those dots? There are so MANY. Corvina said there were a lot. I thought…',
            'I thought she meant twenty. This one\'s got a name written by it. "Corvus." Is that a star or a word?',
            'Oh. Oh no. That\'s the Astrologer Royal on the lawn. She\'s seen the chart. She\'s coming for it.',
          ],
        },
        hint: 'Show the chart to Tamsin on the stargazers\' lawn',
      },
      {
        objective: {
          kind: 'duel', area: 'arcane',
          foe: {
            id: 'arcane-q-last-night-duel',
            court: 'arcane',
            name: 'The Only Star',
            foeName: 'Astrologer Royal Meridia Holt',
            foeElement: 'astra',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'arcane-wild-magic',
            at: { x: 700, y: 540 },
            look: { body: 0xe8d8c8, accent: 0xe8c050, hat: 'crown', traits: ['book', 'glasses'], size: 1.1, eye: 0xfff0a8 },
            challenge: [
              'I am the Astrologer Royal. I cast the Despot\'s horoscope every noon. It is the same every noon.',
              'There is one star in the sky of Solmara, and it is overhead, and it is his. That chart is a lie in ink.',
              'Hand it over to be bleached. Or come out on the lawn and let us see whose stars are wilder.',
            ],
            beaten: ['…Keep it. Keep your lie in ink. I remember it too. I was there. I wish I wasn\'t.'],
            coins: 135,
          },
        },
        hint: 'Face Astrologer Royal Meridia Holt on the stargazers\' lawn',
      },
    ],
    complete: [
      'My chart. All four quarters, and only a little bleached at the edges. Corvus is still there. Look.',
      'Tamsin\'s copying it. By hand, by the window, in the glare. Take this. It\'s the Academy stipend I never spent.',
    ],
    reward: { orbs: 12, coins: 140 },
  },

  // ── 2. Walking Shadows — collect + duel ──────────────────────────────
  {
    id: 'arcane-q-black-cats',
    area: 'arcane',
    name: 'Walking Shadows',
    giver: 'arcane-pennyroyal',
    offer: [
      'The Familiar Licenser came by with his list. Black coats. A walking shadow, he says, and a cat can\'t help it.',
      'Four of mine are to be bleached white in the Glass tomorrow. Sootling, Ember, Inkpot and Grave.',
      'I opened the cages. Quietly. They\'ve scattered into the shade — such as there is. Find them before he does?',
    ],
    accept: [
      'Look under things. Behind things. A black cat always finds the only bit of shade going.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'arcane', label: 'A black cat in the shade', emoji: '🐈', color: 0x2a2630,
          spots: [{ x: 300, y: 1180 }, { x: 470, y: 425 }, { x: 1580, y: 428 }, { x: 2290, y: 1110 }],
        },
        hint: 'Coax 4 black cats out of the court\'s few patches of shade',
      },
      {
        objective: {
          kind: 'duel', area: 'arcane',
          foe: {
            id: 'arcane-q-black-cats-duel',
            court: 'arcane',
            name: 'Licensed and Stamped',
            foeName: 'Licenser Ocular Trine',
            foeElement: 'psychic',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: 'arcane-familiars',
            at: { x: 760, y: 1290 },
            look: { body: 0xd8d0c8, accent: 0x7a52c8, hat: 'tophat', traits: ['glasses', 'book', 'mask'], size: 1.05, eye: 0xf07ad0 },
            challenge: [
              'I can hear four small black thoughts in that basket. They are thinking about fish, and about darkness.',
              'Every familiar in this market is licensed and stamped. These are neither. They are a walking shadow.',
              'The cats to the Glass. And you, stranger, to the Tribunal, for harbouring shade.',
            ],
            beaten: ['…I can\'t hear them any more. They\'ve gone to sleep. In the dark of a basket. Go away.'],
            coins: 135,
          },
        },
        hint: 'See off Licenser Ocular Trine in the familiar market',
      },
    ],
    complete: [
      'Sootling! Ember! Inkpot! Grave! Every one, and every one cross. That\'s how I know they\'re mine.',
      'Here. And take this — it\'s the licensing fee I\'d saved to pay for them. I shan\'t be paying it now.',
    ],
    reward: { orbs: 11, coins: 110 },
  },

  // ── 3. Ink That Drinks the Light — fish + deliver + visit + duel ──────
  {
    id: 'arcane-q-dark-ink',
    area: 'arcane',
    name: 'Ink That Drinks the Light',
    giver: 'arcane-wren',
    offer: [
      'I chalked a sigil backwards by accident, at the edge of the Anchor Circle. It cast a shadow. Then it faded.',
      'Chalk isn\'t dark enough to hold a night. But a hex eel\'s ink is — the only dark thing in the Font.',
      'Catch me one? Then I\'ll draw it again, properly. A little night, on purpose. For everyone.',
    ],
    accept: [
      'The Font, with a prism rod. Hex eels coil by the spring-head and bite anything bright. Which is everything.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_EEL, count: 1 },
        hint: 'Catch a hex eel in the Mana Font (you\'ll need a prism rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'arcane-wren', item: FISH_EEL, count: 1,
          lines: [
            'A hex eel! Look at it coil — every coil is a rune. Hold still, little one. Just a drop. Two. There.',
            'Ink as black as the inside of a shut eye. I\'ll grind it into the chalk. Meet me at the Anchor Circle.',
          ],
        },
        hint: 'Bring the hex eel to Wren at her scribing table',
      },
      {
        objective: { kind: 'visit', area: 'arcane', at: { x: ANCHOR.x, y: ANCHOR.y - 150 }, r: 70, label: 'The north rim of the Anchor Circle' },
        hint: 'Stand guard at the north rim of the Anchor Circle while Wren chalks the backwards sigil',
      },
      {
        objective: {
          kind: 'duel', area: 'arcane',
          foe: {
            id: 'arcane-q-dark-ink-duel',
            court: 'arcane',
            name: 'Smudged',
            foeName: 'Proctor Vellum Strake',
            foeElement: 'ink',
            difficulty: 5,
            gimmick: 'arcane-counterspell',
            at: { x: 1060, y: 560 },
            look: { body: 0xd0c4b8, accent: 0x1c1c28, hat: 'mitre', traits: ['book', 'tool', 'glasses'], size: 1.1, eye: 0x9ef0ff },
            challenge: [
              'I am the Proctor of Inks. Every pot of ink in this Academy is measured. One is missing. I smell it.',
              'And there — on the rim of the Anchor — a SHADOW. Drawn on purpose. In the Prince\'s own circle.',
              'I will scrub it out with my own sleeve. After I have scrubbed out you.',
            ],
            beaten: ['…It\'s still there. I can\'t scrub it. It isn\'t on the stone. It\'s on the light. How did she…'],
            coins: 135,
          },
        },
        hint: 'Stop Proctor Vellum Strake scrubbing out Wren\'s shadow',
      },
    ],
    complete: [
      'It held. A shadow the size of a plate, on the rim of the Anchor, with nothing at all casting it.',
      'People are queueing to stand in it. One at a time. Nobody\'s timing them. Take everything in my purse.',
    ],
    reward: { orbs: 14, coins: 120 },
  },

  // ── 4. The Silenced Student — talk + collect + defeat ────────────────
  {
    id: 'arcane-q-silenced',
    area: 'arcane',
    name: 'The Silenced Student',
    giver: 'arcane-ambrose',
    offer: [
      '(Ambrose writes on his slate:) I ASKED WHAT A NIGHT IS. THE ABJURER WARDED MY VOICE. NINE DAYS NOW.',
      '(He rubs it out:) LECTOR PELL KNOWS HOW TO BREAK IT. SHE WON\'T SAY IT TO ME. SHE MIGHT TO YOU.',
      '(He holds the slate up, and underlines:) PLEASE.',
    ],
    accept: ['(The slate says:) THANK YOU. (Then, smaller:) SHE\'S ON THE ACADEMY STEPS.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'arcane-isadora',
          lines: [
            'A ward on the voice is held by three seals, chalked round the warded one\'s lectern. Scuff them, it breaks.',
            'I did not tell you that. A Lector does not tell strangers how to undo an Abjurer\'s work.',
            'And when the seals go, Null will feel it. He will come to the Sigil Gate to see who did it.',
          ],
        },
        hint: 'Ask Lector Isadora Pell on the Academy steps how a ward on the voice is broken',
      },
      {
        objective: {
          kind: 'collect', area: 'arcane', label: 'A ward-seal round Ambrose\'s lectern', emoji: '🔣', color: 0xf6f4ee,
          spots: [{ x: LECTERN.x - 30, y: LECTERN.y + 40 }, { x: LECTERN.x + 58, y: LECTERN.y + 14 }, { x: LECTERN.x + 10, y: LECTERN.y - 30 }],
        },
        hint: 'Scuff out the 3 chalk ward-seals round Ambrose\'s lectern',
      },
      {
        objective: { kind: 'defeat', encounter: 'arcane-counterspell' },
        hint: 'Face Abjurer Null (Counterspell) at the Sigil Gate when he feels his ward break',
      },
    ],
    complete: [
      'Ahem. Ah. AH. I can — I can hear myself! My voice is all scratchy. Nine days. Listen: "night".',
      'Night, night, night. Here — my scholarship purse. Every coin of it. I\'ve got a question to go and ask.',
    ],
    reward: { orbs: 13, coins: 130 },
  },

  // ── 5. The Anchor — talk + visit + prince ────────────────────────────
  {
    id: 'arcane-q-anchor',
    area: 'arcane',
    name: 'The Anchor',
    giver: 'arcane-grumbold',
    requires: { courtReady: 'arcane' },
    offer: [
      'All five masters. The Prince has had the dome cleared, and his chalk laid out. He means to receive you.',
      'Before you go in, find Cassius — the Clear by the Circle. He was a spellwright here. Ask him about Sigil.',
      'Then go and stand in the middle of the Anchor. Feel what it holds. Then come to the dome.',
    ],
    accept: ['Cassius, then the Anchor, then the door. I\'ll have it open. It\'s glass. It\'s always open, in a way.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'arcane-cassius',
          lines: [
            'Sigil? He was the best of us. He drew circles you could walk into and hear sing. I loved his lectures.',
            'He drew the Anchor Circle for the Despot in one sitting. Twenty-two years ago. It hasn\'t needed a line since.',
            'Then he drew the circle that bleached me. He never looked up. Go on. Look at him for me when you beat him.',
          ],
        },
        hint: 'Ask Cassius the Clear about Prince Sigil',
      },
      {
        objective: { kind: 'visit', area: 'arcane', at: { x: ANCHOR.x, y: ANCHOR.y }, r: 60, label: 'The heart of the Anchor Circle' },
        hint: 'Stand at the heart of the Anchor Circle, under the shaft of light',
      },
      {
        objective: { kind: 'prince', prince: 'sigil' },
        hint: 'Face Prince Sigil in the Academy\'s lecture dome',
      },
    ],
    complete: [
      'He\'s on the steps with my coat over his head. He asked me to tell you the Anchor is loose. Only one line.',
      'One line, out of the whole circle. He rubbed it out with his thumb on the way out. Take the Academy\'s purse.',
    ],
    reward: { orbs: 15, coins: 220 },
  },
];
