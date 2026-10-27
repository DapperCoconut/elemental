import type { QuestDef } from '../../../../IslesTypes';
import { FISH_EEL, FOOD_TONIC, RECIPE_TONIC, ROCK_SALT } from './items';

/**
 * The Confection Court's five side stories — sweet on top, salt underneath. A junior weigh-clerk
 * who has found lead in the Sweet-Tax pans; a millwright looking for his pruned grandson among the
 * Prince's sugar-glass figures; the Saltcellar's grandmother taking back the salt the palace ice
 * house never paid for; an angler waking his daughter from the syrup the mill children are dosed
 * with; and — once Saccharo is down — a baker giving forty years of rotting tithe back to the
 * families it was weighed out of. Every one ends in a fight, and no element fights twice here.
 */

export const NPC = {
  marzipan: 'confection-marzipan',
  demerara: 'confection-demerara',
  fondant: 'confection-fondant',
  humbug: 'confection-humbug',
  candymae: 'confection-candymae',
  jack: 'confection-jack',
  saltash: 'confection-saltash',
  florentine: 'confection-florentine',
} as const;

export const Q_SCALE = 'confection-thumb-on-the-scale';
export const Q_GLASS = 'confection-glass-children';
export const Q_SALT = 'confection-salt-on-the-ice';
export const Q_LULLABY = 'confection-lullaby-syrup';
export const Q_CAVITY = 'confection-the-cavity';

/** Places the quests send you, shared with the area painter. */
export const GLASS_WALK = { x: 2240, y: 420 };
export const VAULT_DOOR = { x: 1000, y: 652 };

export const CONFECTION_QUESTS: QuestDef[] = [
  {
    id: Q_SCALE, area: 'confection', name: 'A Thumb on the Scale', giver: NPC.fondant,
    offer: [
      'I write down what the scales say. That\'s all I do. Forty families short this season. Forty.',
      'I baked a loaf at home and weighed it on Mam\'s kitchen scale: a full pound. On the Sweet-Tax pans? Fourteen ounces.',
      'There\'s lead in the pans. Little lozenges of it, iced to look like sweets. Weighmaster Troy tips them out at night.',
      'He drops them round the square on his way home. If I had four I\'d have proof. I can\'t be seen picking them up.',
    ],
    accept: [
      'Round the square — in the gutters, by the scales. They look like humbugs. Don\'t eat one. Please don\'t eat one.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'confection', label: 'lead lozenge', emoji: '⚖️', color: 0x9a9aa8,
          spots: [{ x: 1040, y: 700 }, { x: 1340, y: 684 }, { x: 1240, y: 876 }, { x: 1060, y: 864 }],
        },
        hint: 'Find 4 sugar-coated lead lozenges dropped round Sugarloaf Square',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.demerara, lines: [
            'Give it here. Hm. Too heavy for a humbug by half. Let\'s see — two ounces on my honest scale.',
            'Lead. Under a coat of fondant thick as my thumb. Four of them in a pan and every loaf in Confection is short.',
            'Troy will say the pans are the Empress\'s and the Empress\'s pans are true. Go and make him say it to you.',
          ],
        },
        hint: 'Have Dame Demerara weigh a lozenge at The Sugar Loaf',
      },
      {
        objective: {
          kind: 'duel', area: 'confection',
          foe: {
            id: 'confection-thumb-on-the-scale-duel', court: 'confection', name: 'Weighed and Found Wanting',
            foeName: 'Weighmaster Troy', foeElement: 'justice', difficulty: 3, gimmick: '',
            at: { x: 1172, y: 690 },
            look: { body: 0xd8c8b8, accent: 0x3f9a7c, hat: 'tophat', traits: ['glasses', 'book'], size: 1.15 },
            challenge: [
              'Those are the Empress\'s weights, stranger. Her pans, her pounds. A pound is whatever the Gardener says it is.',
              'Forty households short. Forty households pruned. The scales do not lie — and neither do I. Put those down.',
            ],
            beaten: ['...Fourteen ounces. It was always fourteen ounces. I only ever pressed with one thumb. I swear it was one.'],
            coins: 65,
          },
        },
        hint: 'Face Weighmaster Troy at the Sweet-Tax scales',
      },
    ],
    complete: [
      'He\'s re-weighing. All forty, out loud, in the square, with my Mam\'s scale next to his!',
      'Thirty-one of them were full weight all along. Thirty-one families who don\'t have to go up the hill. I wrote it down.',
    ],
    reward: { orbs: 5, coins: 60 },
  },

  {
    id: Q_GLASS, area: 'confection', name: 'The Glass Children', giver: NPC.humbug,
    offer: [
      'My grandson Barley went up to the Glasshouse last spring. Short half a loaf. Eleven years old.',
      'They say the Prince keeps a figure in sugar-glass of every child that goes. The Glass Walk, behind his palace.',
      '"To remember them sweetly," he says. Mill hands aren\'t let up the drive. I\'ve never seen it.',
      'If Barley\'s there — I\'ve only got him small in my head. I\'d like to know what he looked like at the end.',
    ],
    accept: [
      'Up Palace Drive and round the back of the Bonbonnière. Don\'t touch anything. Glass remembers fingers.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'confection', at: GLASS_WALK, r: 70, label: 'The Glass Walk' },
        hint: 'Find the Glass Walk behind the Bonbonnière',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.florentine, lines: [
            'You\'ve seen them. Barley Humbug is third from the fountain — the one with his sleeves rolled up.',
            'Glacé blows them. From life, before they go. The Prince won\'t send a child up without a likeness. He likes it complete.',
            'He\'s blowing one now. Candy Mae Cane. The Canes are short this season. If the figure isn\'t finished, she can\'t go.',
          ],
        },
        hint: 'Ask Florentine, the palace pastry cook, about the figures',
      },
      {
        objective: {
          kind: 'duel', area: 'confection',
          foe: {
            id: 'confection-glass-children-duel', court: 'confection', name: 'A Likeness',
            foeName: 'Sugarblower Glacé', foeElement: 'crystal', difficulty: 3, gimmick: '',
            at: { x: 2250, y: 486 },
            look: { body: 0xe8f0f8, accent: 0x9ad8f0, hat: 'goggles', traits: ['tool', 'apron'], size: 1.0, eye: 0xc8f0ff },
            challenge: [
              'Mind the walk. Two hundred and twelve children, every one blown from life. My best work is the ones who cried.',
              'The Cane girl is half done. Her nose is wrong. Stand aside and let me get her nose right.',
            ],
            beaten: ['You\'ve cracked my pipe. She\'ll have no nose at all now. Without a likeness... they can\'t send her. Oh.'],
            coins: 65,
          },
        },
        hint: 'Stop Sugarblower Glacé finishing Candy Mae\'s figure',
      },
    ],
    complete: [
      'Florentine brought me Barley down in her apron. He\'s taller than I remember. Sleeves rolled up. That\'s my lad.',
      'I\'ve stood him in the mill window. The sun comes through him in the mornings. I can bear it, like that.',
    ],
    reward: { orbs: 5, coins: 45 },
  },

  {
    id: Q_SALT, area: 'confection', name: 'Salt on the Ice', giver: NPC.saltash,
    offer: [
      'Under every sugar town there\'s salt, love. We dig it. The palace ice-house buys it. "Buys." Ha.',
      'Salt on ice makes cold colder. That\'s how the Prince gets his ices to freeze in August.',
      'This summer it\'s double, for the Empress\'s visit. Double, and paid in nothing, same as always.',
      'Five sacks are on the carts up Palace Drive. Bring them home down the Salt Steps. And when Frappé comes for them, stand by me.',
    ],
    accept: [
      'Grey sacks, tied with green — the Empress\'s string. Cut it. It\'s our salt.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'confection', label: 'sack of rock salt', emoji: '🧂', color: 0xb8b8b0,
          spots: [{ x: 1300, y: 426 }, { x: 1420, y: 432 }, { x: 1540, y: 442 }, { x: 1640, y: 486 }, { x: 1730, y: 540 }],
        },
        hint: 'Take back 5 sacks of rock salt from the carts on Palace Drive',
      },
      {
        objective: {
          kind: 'talk', npc: NPC.saltash, lines: [
            'Five. Into the cellar with them, quick. There\'s children down there who can carry a sack and keep their mouths shut.',
            'Here he comes. Feel that? The cold walks ahead of him. Frappé never comes down the Steps himself unless he\'s angry.',
          ],
        },
        hint: 'Bring the salt down to Granny Saltash in the Saltcellar',
      },
      {
        objective: {
          kind: 'duel', area: 'confection',
          foe: {
            id: 'confection-salt-on-the-ice-duel', court: 'confection', name: 'Cold Colder',
            foeName: 'Sorbetier Frappé', foeElement: 'ice', difficulty: 3, gimmick: '',
            at: { x: 960, y: 1432 },
            look: { body: 0xe0ecf4, accent: 0xa8d8f0, hat: 'chef', traits: ['scarf', 'apron'], size: 1.05, eye: 0xd0f4ff },
            challenge: [
              'Five sacks short at the ice-house. The Empress arrives in nine days and the sorbet will not set.',
              'Do you know what melts first in a hot room, salt-rat? Everything that isn\'t kept cold. Hand it over.',
            ],
            beaten: ['The salt... got damp. On the cart. That is what I will say. The Prince believes anything about the Saltcellar.'],
            coins: 65,
          },
        },
        hint: 'Stand with Granny Saltash against Sorbetier Frappé',
      },
    ],
    complete: [
      'Damp! He\'ll say it was damp. Bless the man\'s cowardice. Here — a fistful for you. Salt your soup with it, or your enemies.',
    ],
    reward: { orbs: 5, coins: 40, item: ROCK_SALT, itemCount: 3 },
  },

  {
    id: Q_LULLABY, area: 'confection', name: 'Lullaby Syrup', giver: NPC.jack,
    offer: [
      'My girl Candy Mae works the cube press. Twelve-hour shifts. And she comes home happy. That\'s the trouble.',
      'Nanny Sugarplum spoons her lullaby syrup into every mill child at the gate. They work, they smile, they forget.',
      'Old anglers\' cure for a sweet head: the gall of a caramel eel. Bitter as a tithe-bill. One spoon wakes the dead.',
      'Catch me an eel out of the Pool. Demerara knows the tonic. My hands shake too much now to land one.',
    ],
    accept: [
      'You\'ll want a briarwood rod for the syrup — Mossgate sells them. The eels lie deep, where it\'s darkest.',
    ],
    stages: [
      { objective: { kind: 'fish', fish: FISH_EEL, count: 1 }, hint: 'Land a caramel eel in the Treacle Pool (briarwood rod)' },
      { objective: { kind: 'cook', recipe: RECIPE_TONIC }, hint: 'Have The Sugar Loaf make an Eel-Gall Tonic' },
      {
        objective: {
          kind: 'deliver', npc: NPC.candymae, item: FOOD_TONIC, count: 1, lines: [
            'Bleh! That\'s — that\'s HORRIBLE! Why would you — oh. Oh. Where\'s Da? How long have I been on the press?',
            'My hands hurt. They\'ve been hurting for months, haven\'t they. Why didn\'t they hurt before?',
            'Nanny\'s coming. She always comes when one of us stops smiling.',
          ],
        },
        hint: 'Give Candy Mae the tonic in the mill yard',
      },
      {
        objective: {
          kind: 'duel', area: 'confection',
          foe: {
            id: 'confection-lullaby-syrup-duel', court: 'confection', name: 'Hush Now',
            foeName: 'Nanny Sugarplum', foeElement: 'dream', difficulty: 3, gimmick: '',
            at: { x: 640, y: 612 },
            look: { body: 0xe8d0e8, accent: 0x9a6ad0, hat: 'hood', traits: ['apron', 'satchel'], size: 1.1, eye: 0xd8b8ff },
            challenge: [
              'There, there. Who\'s woken my little cube-presser? Little girls who wake up start to count their hours.',
              'One spoon for her, and one for you, dearie. Visions of sugarplums. You won\'t remember a thing.',
            ],
            beaten: ['Wide awake... all of them, waking up, all at once. They\'ll cry for a week. They\'ll remember everything.'],
            coins: 65,
          },
        },
        hint: 'Drive off Nanny Sugarplum before she doses Candy Mae again',
      },
    ],
    complete: [
      'She slept last night. Properly. Cried half of it, mind. That\'s all right. Crying\'s awake.',
      'Twenty mill children went home sour-faced today. Best sight I\'ve seen in this town.',
    ],
    reward: { orbs: 6, coins: 50 },
  },

  {
    id: Q_CAVITY, area: 'confection', name: 'The Cavity', giver: NPC.demerara,
    requires: { prince: 'saccharo' },
    offer: [
      'With the Prince gone the Sweet-Tax House is shut. Forty years of tithe, locked in the vault underneath it.',
      'Sugar keeps, they say. Not that much of it. Not stacked to the rafters in the dark. It\'s going over. I smell it from my ovens.',
      'Every loaf in there was weighed out of a family, and every one has its tally stick, notched with a name.',
      'Find the tallies and we\'ll give it back, what\'s still good. And whatever\'s living off the rot down there — bring your fists.',
    ],
    accept: [
      'The vault door\'s on the west side of the Sweet-Tax House. The tallies will have spilled when the clerks ran.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'confection', at: VAULT_DOOR, r: 60, label: 'The Sweet-Tax Vault' },
        hint: 'Open the Sweet-Tax vault door',
      },
      {
        objective: {
          kind: 'collect', area: 'confection', label: 'tithe tally', emoji: '🪵', color: 0xb46a32,
          spots: [{ x: 1300, y: 610 }, { x: 1370, y: 864 }, { x: 1120, y: 892 }, { x: 1256, y: 664 }, { x: 1030, y: 800 }],
        },
        hint: 'Gather 5 notched tithe tallies spilled round Sugarloaf Square',
      },
      {
        objective: {
          kind: 'duel', area: 'confection',
          foe: {
            id: 'confection-the-cavity-duel', court: 'confection', name: 'The Cavity',
            foeName: 'Toothrot', foeElement: 'slime', difficulty: 4, gimmick: '',
            at: { x: 930, y: 664 },
            look: { body: 0x8a9a5a, accent: 0x3a3a22, hat: 'none', traits: ['mask'], size: 1.3, eye: 0xd8ff6a },
            challenge: [
              '...forty years of sweet... in the dark... nobody came to eat it but me...',
              'Mine now. Every loaf, every name. Sugar goes bad and bad things grow fat. Open wide.',
            ],
            beaten: ['...sour... so sour... take it then... it was always theirs...'],
            coins: 80,
          },
        },
        hint: 'Root out the thing growing in the Sweet-Tax vault',
      },
    ],
    complete: [
      'Two hundred and six families. Their sugar, back in their own cupboards, with their own names on it.',
      'What\'s rotten we\'re burning in the square tonight. The whole town will smell of toffee. Come and stand by the fire.',
    ],
    reward: { orbs: 7, coins: 80 },
  },
];
