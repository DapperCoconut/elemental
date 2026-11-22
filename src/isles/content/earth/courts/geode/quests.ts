import type { QuestDef } from '../../../../IslesTypes';
import { CRACK_LEDGE, GRINDING_WHEEL, LAPIDARY_BENCHES, OLD_ROD } from './area';
import { FISH_PIKE, FISH_TETRA } from './items';

/**
 * The Geode Court's five side quests.
 *
 * Between them they show how the court grinds people down: the grading and the glass it is done
 * through (Agate), the light the Cutting-House tithes away at night (Corwen), the songs sung into
 * crystal before they were buried (Wren), the households split between courts with no letters
 * allowed (Tamsin), and finally the boy Facet was, at the Loupe Table, before you face the man
 * (Sard). Each is somebody refusing to be graded.
 */
export const GEODE_QUESTS: QuestDef[] = [
  // ── 1. A Scratched Loupe — talk + collect + duel ─────────────────────
  {
    id: 'geode-q-scratched-loupe',
    area: 'geode',
    name: 'A Scratched Loupe',
    giver: 'geode-agate',
    offer: [
      'Eleven stones this season, all graded flawed. Clean as water at the crack — but a line through the loupe.',
      'The same line, the same place, every stone. I think the flaw is in the glass, not the stones.',
      'Nobody listens to a cutter who says the grader\'s wrong. They\'d listen to three honest glasses.',
      'Will you look through Beryl\'s loupe, then fetch me the Row\'s bench-glasses to set beside it?',
    ],
    accept: [
      'Beryl first. She\'s honest; she\'ll let you look. Then the benches on the Row — every cutter keeps one.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'geode-beryl',
          lines: [
            'You want to look through the great loupe? Stand on the step. Hold this stone up. …There, the line.',
            'Now move the stone. Move it again. The line… stays where it is. It doesn\'t move with the stone.',
            'That is a scratch. On the glass. Oh, heavens. How long has that been there?',
            'I can\'t say it\'s scratched on my word. Bring me three honest bench-glasses and we\'ll compare.',
          ],
        },
        hint: 'Look through the great loupe with Assayer Beryl at the Loupe Table',
      },
      {
        objective: {
          kind: 'collect', area: 'geode', label: 'A cutter\'s bench-glass', emoji: '🔍', color: 0xc8a050,
          spots: LAPIDARY_BENCHES,
        },
        hint: 'Borrow 3 bench-glasses from the lapidaries\' benches along the Row',
      },
      {
        objective: {
          kind: 'duel', area: 'geode',
          foe: {
            id: 'geode-q-scratched-loupe-duel',
            court: 'geode',
            name: 'Graded as Found',
            foeName: 'Grading-Sergeant Corundum Vell',
            foeElement: 'justice',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 560, y: 790 },
            look: { body: 0xc8bcb0, accent: 0xc8a050, hat: 'helmet', traits: ['book', 'glasses'], size: 1.2, eye: 0xf0d8a0 },
            challenge: [
              'The great loupe is the Prince\'s glass. To say it is scratched is to say His Highness is wrong.',
              'Every stone graded through it is graded. Graded is graded. There is no un-grading.',
              'Put those bench-glasses down, and step away from the table.',
            ],
            beaten: ['…Three glasses, and not a line in any. I shall have to report a scratch. Up. To him.'],
            coins: 90,
          },
        },
        hint: 'Face Grading-Sergeant Corundum Vell at the Loupe Table',
      },
    ],
    complete: [
      'Beryl graded them again through an honest bench-glass. Eleven flawless. ELEVEN.',
      'We make weight. My boy stays out of the Sepulchre. Take this — it\'s the Tithe we don\'t have to pay.',
    ],
    reward: { orbs: 8, coins: 60 },
  },

  // ── 2. Lamplight — fish + deliver + duel ─────────────────────────────
  {
    id: 'geode-q-lamplight',
    area: 'geode',
    name: 'Lamplight',
    giver: 'geode-corwen',
    offer: [
      'The Cutting-House takes the lamp oil, for the chandeliers. After the crack goes dark, so does the Row.',
      'Little ones can\'t sleep in the dark in here. The walls creak and the points look like teeth.',
      'But a tetra glows. Violet, faint, all night in a jar. Catch me three and take them to Ilse.',
    ],
    accept: [
      'Off the lip. They\'re quick and small — keep them in the bar and they tire. Ilse is at the lamp-house.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_TETRA, count: 3 },
        hint: 'Catch 3 amethyst tetras in the crystal pool',
      },
      {
        objective: {
          kind: 'deliver', npc: 'geode-ilse', item: FISH_TETRA, count: 3,
          lines: [
            'Three! Glowing already, look. One to the Mullions, one to the Seams, one to the twins at the end.',
            'Oh. Don\'t turn round. The Light-Warden is at the gate. Light is tithed, she\'ll say. All light.',
          ],
        },
        hint: 'Bring the 3 tetras to Ilse at the lamp-house',
      },
      {
        objective: {
          kind: 'duel', area: 'geode',
          foe: {
            id: 'geode-q-lamplight-duel',
            court: 'geode',
            name: 'All Light Is Tithed',
            foeName: 'Light-Warden Halite Rime',
            foeElement: 'ice',
            difficulty: 4,
            hpMult: 0.95,
            gimmick: 'geode-refraction',
            at: { x: 1500, y: 1110 },
            look: { body: 0xd8e4ec, accent: 0x9aaabb, hat: 'veil', traits: ['lantern', 'book'], size: 1.05, eye: 0xc8f0ff },
            challenge: [
              'Oil, tallow, tetra. Anything that gives light in the Geode Court gives it first to the Cutting-House.',
              'A fish in a jar is a lamp. A lamp is tithed. These are three unpaid lamps.',
              'Come stand in the light, then. All of it. Let us see how you like it.',
            ],
            beaten: ['…Fish are not on the schedule. Strictly. I will have to write a schedule. Keep them dim.'],
            coins: 90,
          },
        },
        hint: 'See off Light-Warden Halite Rime at the lamp-house',
      },
    ],
    complete: [
      'Ilse says three windows on the Row are violet tonight. Three children asleep before the fourth bell.',
      'Here — a pike. I caught it last spring and never told the Cutting-House. It\'s clearer than a lie.',
    ],
    reward: { orbs: 7, coins: 50, item: FISH_PIKE, itemCount: 1 },
  },

  // ── 3. The Buried Song — talk + visit + duel ─────────────────────────
  {
    id: 'geode-q-buried-song',
    area: 'geode',
    name: 'The Buried Song',
    giver: 'geode-wren',
    offer: [
      'Grandad sang his song into one of the chime rods before they buried the songs. Crystal keeps things.',
      'He went down to the Sepulchre before he showed me which. I don\'t even know how it starts.',
      'Brother Ostrum might know which rod. Will you ask him, and strike it for me? I can\'t reach.',
    ],
    accept: [
      'He\'s by the big chimes. Be gentle with him. He jumps at loud notes.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'geode-ostrum',
          lines: [
            'Celestine\'s rod? We moved it when the grinder came. It stands at the end of the garden, alone.',
            'Strike it low, near the fork, and hold it still with your other hand. It will remember for you.',
            'Mind — the Cutting-House\'s grinder walks the garden at this hour. She listens for songs.',
          ],
        },
        hint: 'Ask Brother Ostrum which chime rod holds the Celestine song',
      },
      {
        objective: { kind: 'visit', area: 'geode', at: OLD_ROD, r: 70, label: 'Celestine\'s rod' },
        hint: 'Strike Celestine\'s rod at the far end of the Chime Garden',
      },
      {
        objective: {
          kind: 'duel', area: 'geode',
          foe: {
            id: 'geode-q-buried-song-duel',
            court: 'geode',
            name: 'A Song Heard',
            foeName: 'Hush-Cutter Nacre Sable',
            foeElement: 'shadow',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: 'geode-resonance',
            at: { x: 2120, y: 1250 },
            look: { body: 0xb8b0c0, accent: 0x2e1650, hat: 'hood', traits: ['tool', 'mask'], size: 1.05, eye: 0xd8c8ff },
            challenge: [
              'That rod is singing. I can hear the words from here. Words are buried, stranger. By decree.',
              'I grind the singing ones. A little dust, and the garden is quiet again. That is all I do.',
              'Step aside from it. Or I grind you both.',
            ],
            beaten: ['…Let it sing, then. I never heard the end of one before. It ends well. I didn\'t know.'],
            coins: 90,
          },
        },
        hint: 'Stop Hush-Cutter Nacre Sable from grinding the rod',
      },
    ],
    complete: [
      'It sang the whole song! Twice! I sang it back the second time. I know all the words now.',
      'Grandad left his savings tied to the rod\'s fork. Ostrum says it\'s for whoever struck it. That\'s you.',
    ],
    reward: { orbs: 8, coins: 70 },
  },

  // ── 4. A Signal Through the Crack — collect + visit + defeat ─────────
  {
    id: 'geode-q-signal',
    area: 'geode',
    name: 'A Signal Through the Crack',
    giver: 'geode-tamsin',
    offer: [
      'My brother\'s working off our debt at the Forge. Two years, no letters allowed in or out.',
      'But at noon the crack lets in the sun. A mirror up on the ledge can flash a message to the iron hills.',
      'I hid three mirror shards about the court. Fetch them, set them on the ledge — and I\'ll do the rest.',
    ],
    accept: [
      'One by the gardens, one by the square, one up the north road. They glint. Prism won\'t like this.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'geode', label: 'Mirror shard', emoji: '🪞', color: 0xdce8f0,
          spots: [{ x: 880, y: 560 }, { x: 1440, y: 680 }, { x: 1060, y: 330 }],
        },
        hint: 'Gather Tamsin\'s 3 hidden mirror shards',
      },
      {
        objective: { kind: 'visit', area: 'geode', at: CRACK_LEDGE, r: 70, label: 'The ledge under the crack' },
        hint: 'Set the mirror on the ledge under the crack in the roof',
      },
      {
        objective: { kind: 'defeat', encounter: 'geode-refraction' },
        hint: 'Lapidary Prism has seen the flash — face him (Refraction) in Prism Square',
      },
    ],
    complete: [
      'He flashed back! Three short and a long. That\'s "alive". He\'s alive. He\'s ALIVE.',
      'Here — what I\'d saved for a bribe. I don\'t need a bribe now. I need a mirror and noon.',
    ],
    reward: { orbs: 8, coins: 60 },
  },

  // ── 5. The Back of the Stone — talk + visit + prince ─────────────────
  {
    id: 'geode-q-back-of-the-stone',
    area: 'geode',
    name: 'The Back of the Stone',
    giver: 'geode-sard',
    requires: { courtReady: 'geode' },
    offer: [
      'All five of his craftsmen. His Highness has polished his crown stone twice in the hour.',
      'Before you go in, ask Assayer Beryl what she found when he was nine. She graded him, you see.',
      'Then stand at the Grinding Wheel. Everyone in this court has stood there once, waiting to hear.',
    ],
    accept: [
      'Beryl, then the Wheel. Then come up the steps. Do not walk behind him. He will not let you anyway.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'geode-beryl',
          lines: [
            'The Regent brought him to this table at nine. "Grade him," he said. "Let us see what I have made."',
            'I found it under the loupe. A hairline, down the back. The kind that never heals. I had to say it.',
            'The Regent said: "Flawed stones go to the Wheel." He was joking. I think he was joking.',
            'The boy has never let anyone stand behind him since. Not his steward. Not his mother. Nobody.',
          ],
        },
        hint: 'Ask Assayer Beryl what she found when she graded the Prince',
      },
      {
        objective: { kind: 'visit', area: 'geode', at: GRINDING_WHEEL, r: 80, label: 'The Grinding Wheel' },
        hint: 'Stand at the Grinding Wheel below the Cutting-House',
      },
      {
        objective: { kind: 'prince', prince: 'facet' },
        hint: 'Face Prince Facet at the Cutting-House',
      },
    ],
    complete: [
      'He has asked for a second mirror, to see his own back. He looked a long time.',
      'Then he said: "It is only a crack." Nineteen years I have served him. Take the steward\'s purse.',
    ],
    reward: { orbs: 10, coins: 160 },
  },
];
