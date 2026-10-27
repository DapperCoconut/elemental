import type { QuestDef } from '../../../../IslesTypes';

/**
 * Mossgate's five quests. The first is the isle's welcome in disguise — you are weighed on the
 * tithe-scales and shown what a pound short costs. The second sends you out on the Crook to fish a
 * wedding. The rest are small stories about a town that weighs everything: a shoot, two children,
 * and finally the weights themselves.
 *
 * Every quest ends in a fight with one of the Empress's servants in the port. Their elements are all
 * different: metal, venom, wax, paper, justice.
 */
export const MOSSGATE_QUESTS: QuestDef[] = [
  // ── 1. Short Weight ───────────────────────────────────────────────
  {
    id: 'mossgate-short-weight', area: 'mossgate', name: 'Short Weight', giver: 'mossgate-dock',
    offer: [
      'Weighing Day, and you walk off a boat into the middle of it. Every house carries its tithe to the scales.',
      'Visitors get weighed too. Against an acorn. It is a joke the Empress likes; nobody else laughs at it.',
      'Go and be weighed before Plumb\'s men weigh you for me. Agnes reads the beam. Then go and see the Hollins.',
    ],
    accept: [
      'The scales are on the quay, east of the Taproot — you cannot miss them, they are the size of a house.',
      'Stand in front of the pan, not on it. People do. It goes very badly for them.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'mossgate-weigher',
          lines: [
            'One visitor. Against one acorn. — Even. You are even. That is the whole of your tithe; you may go.',
            'Not everyone was even this morning. The Hollins tipped short. A pound and a quarter. Honey and turnips.',
            'The pruning cart goes up to their log at the second bell. West, out of the Westknot. I only read the beam.',
          ],
        },
        hint: 'Be weighed by Agnes Tare at the tithe-scales on the quay',
      },
      {
        objective: { kind: 'visit', area: 'mossgate', at: { x: 300, y: 640 }, r: 120, label: 'The Hollin log' },
        hint: 'Go out through the Westknot to the Hollin log in the Leaflitter',
      },
      {
        objective: {
          kind: 'talk', npc: 'mossgate-hollin',
          lines: [
            'You have come from the scales. Then you know. A pound and a quarter, and it was a wet spring.',
            'Tobias went last spring for the same. Now it is Fennel. He is nine. He is hiding in the turnip clamp.',
            'And there — that is Hask, with the cart and the long shears. He has come to prune my house.',
          ],
        },
        hint: 'Speak to Maud Hollin at her door',
      },
      {
        objective: {
          kind: 'duel', area: 'mossgate',
          foe: {
            id: 'mossgate-short-weight-duel', court: 'mossgate', name: 'The Pruning Cart',
            foeName: 'Pruner Hask', foeElement: 'metal', difficulty: 2, hpMult: 0.95,
            gimmick: '', at: { x: 470, y: 704 }, coins: 50,
            look: { body: 0x8a7a68, accent: 0x24602a, hat: 'helmet', traits: ['tool', 'apron', 'mask'], size: 1.3, eye: 0xc8f0a8 },
            challenge: [
              'Hollin. A pound and a quarter short. One cutting from the house, by the Empress\'s leave.',
              'It is a clean cut. They do not feel it. They go up the road and they flower. It is an honour, really.',
              'The visitor. Weighed even this morning. Be even somewhere else, or I will see what you are short of.',
            ],
            beaten: ['My shear-arm. You have — fine. The cart goes back empty. Let the Glasshouse wait for its cutting.'],
          },
        },
        hint: 'Pruner Hask has brought the cart for the Hollin boy — stop him',
      },
    ],
    complete: [
      'The cart went back up the north road EMPTY? On your first day? Ha! I heard Hask swearing from the slip.',
      'That is the Bloom Tithe, then. Now you know what a pound costs. Six princes keep it up those three roads.',
      'North through the trunk to the Bloom Court is gentlest. Here — for the acorn you were weighed against.',
    ],
    reward: { orbs: 4, coins: 50 },
  },

  // ── 2. The Sweetest Tenth ─────────────────────────────────────────
  {
    id: 'mossgate-wedding', area: 'mossgate', name: 'The Sweetest Tenth', giver: 'mossgate-tackle',
    offer: [
      'My Elspeth is to be wed under the root-arches. And I have nothing to bake her bride-pie with.',
      'The fish are running under the Crook, but I am stuck behind this counter on Weighing Day, selling hooks.',
      'Two mossback mullet and a rootreef snapper, and Dorcas will do the rest. The first slice goes to the bride.',
    ],
    accept: [
      'Fish off the Crook — the bent root running out under the last arch. Press E at the water and wait for the tug.',
      'Mullet are lazy. Snapper live in the root-reef and bite like a debt collector. Mind your fingers.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-mossback-mullet', count: 2 },
        hint: 'Catch 2 Mossback Mullet off the Crook or the Taproot',
      },
      {
        objective: { kind: 'fish', fish: 'fish-rootreef-snapper', count: 1 },
        hint: 'Catch a Rootreef Snapper (they lurk in the root-reef under the arches)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-mossgate-bride-pie' },
        hint: 'Have the Crumb & Thistle bake a Bride-Pie (2 Mossback Mullet, 1 Rootreef Snapper)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'mossgate-tackle', item: 'meal-mossgate-bride-pie', count: 1,
          lines: [
            'Look at that crust. Thistle-crimped, like a moss roof. Elspeth will cry. I am crying. Ignore me.',
            '...Oh no. Footsteps on the quay. Silver fork on a chain. That is Taster Vetch.',
            'The Empress takes the first tenth of every feast. The sweetest tenth, she calls it. Vetch carries it up.',
          ],
        },
        hint: 'Bring the Bride-Pie to Ezra Reedbottom at the Hook & Bramble',
      },
      {
        objective: {
          kind: 'duel', area: 'mossgate',
          foe: {
            id: 'mossgate-wedding-duel', court: 'mossgate', name: 'The First Slice',
            foeName: 'Taster Vetch', foeElement: 'slime', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 2120, y: 1236 }, coins: 55,
            look: { body: 0xa8b088, accent: 0x5a2a5a, hat: 'tophat', traits: ['glasses', 'satchel'], size: 0.95, eye: 0xd8f070 },
            challenge: [
              'A wedding! And a bride-pie, still warm. The first tenth is the Empress\'s. I carry it to her table.',
              'I taste everything first, of course. For poison. Nothing has ever poisoned me. I am mostly poison.',
              'Cut me my slice. The middle. The middle is always sweetest. Or stand in my way and be tasted yourself.',
            ],
            beaten: ['My fork! — Keep your pie. I have tasted enough of Mossgate. It is bitter all the way down.'],
          },
        },
        hint: 'Taster Vetch is on the quay to claim the first slice — keep her off the pie',
      },
    ],
    complete: [
      'She went off up the north road with no fork and no pie! The first slice went to my girl. As it should.',
      'Fisher\'s pay, and a father\'s thanks. Come to the wedding. Everybody is. Even the scales are invited.',
    ],
    reward: { orbs: 4, coins: 45 },
  },

  // ── 3. The Last Green Shoot ───────────────────────────────────────
  {
    id: 'mossgate-green-shoot', area: 'mossgate', name: 'The Last Green Shoot', giver: 'mossgate-sorrel',
    requires: { questDone: 'mossgate-short-weight' },
    offer: [
      'The Elder has been dead a hundred years. All but this. One shoot, out of the heartwood. Still green.',
      'The Empress\'s grafter has written. He is coming to take it as a cutting for her hedges. A "rare stock".',
      'And it is thirsty. No rain in the trunk for a month. The moss roofs hold dew. My knees do not climb.',
    ],
    accept: [
      'Five beads of moss-dew, from the moss round the town. Shake it off gently; it is the best water on Thornwild.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'mossgate', label: 'moss-dew', emoji: '💧', color: 0xbfe8d0,
          spots: [{ x: 520, y: 480 }, { x: 880, y: 420 }, { x: 1730, y: 380 }, { x: 2380, y: 880 }, { x: 1020, y: 800 }],
        },
        hint: 'Shake 5 beads of moss-dew from the moss around Mossgate',
      },
      {
        objective: {
          kind: 'talk', npc: 'mossgate-sorrel',
          lines: [
            'Drip it on the root — slowly — there. Look. Look at it lift its leaf. Like a child putting up its hand.',
            'A hundred years and it still wants to grow. Do you know how rare that is on this isle? Wanting to?',
            'And here he is. Grafter Cerewick, with his wax pot warm and his little hooked knife. He has seen it lift.',
          ],
        },
        hint: 'Bring the moss-dew to Old Mother Sorrel at the Green Shoot',
      },
      {
        objective: {
          kind: 'duel', area: 'mossgate',
          foe: {
            id: 'mossgate-green-shoot-duel', court: 'mossgate', name: 'Rare Stock',
            foeName: 'Grafter Cerewick', foeElement: 'wax', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 1210, y: 336 }, coins: 55,
            look: { body: 0xc0a88a, accent: 0x6a4a1e, hat: 'wizard', traits: ['tool', 'lantern', 'apron'], size: 1.0, eye: 0xffd88a },
            challenge: [
              'Elder-stock! A living shoot off a hundred-year corpse. The Empress has nothing like it in all her hedges.',
              'One clean cut, a dab of wax, a bandage of bast, and it grows on her wall for ever. Grafting is a kindness.',
              'Out of the way, visitor. Or I will wax you to the floor and graft the shoot through your hat.',
            ],
            beaten: ['My wax has gone cold. ...Keep your shoot. It would not have taken. Elder-stock never does. It is too stubborn.'],
          },
        },
        hint: 'Grafter Cerewick has come for the shoot — drive him off',
      },
    ],
    complete: [
      'He went off up the north road dripping wax and muttering about stubborn stock. Stubborn! Ha! Good.',
      'While it is green, Mossgate is its own. I said it to my mother and she said it to hers. Now I say it to you.',
      'Take this — the last of my mother\'s tithe purse. She would want it spent on the one who watered it.',
    ],
    reward: { orbs: 5, coins: 40 },
  },

  // ── 4. Seedlings ──────────────────────────────────────────────────
  {
    id: 'mossgate-seedlings', area: 'mossgate', name: 'Seedlings', giver: 'mossgate-linnet',
    requires: { questDone: 'mossgate-short-weight' },
    offer: [
      'My twins are seedlings in the Seed Ledger. Every season Registrar Quire measures them at the notch-post.',
      'A seedling that has not grown a finger since last season is "stunted", and a stunted child is owed for.',
      'It was a hungry winter. They have not grown a hair. Tansy Knott says she has an idea. Tansy always does.',
    ],
    accept: [
      'Tansy keeps the Knothole Emporium, inside the trunk on the east side. She will want paying in something.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'mossgate-store',
          lines: [
            'Ah, the Ashby twins. Quire measures the head, never the feet. Never once looked at a child\'s feet.',
            'Cork insoles. A finger thick. The corkbark grows on the Elder\'s outer flank, outside the trunk walls.',
            'Bring me three slabs and I will cut them to fit. Free. Do not tell anyone it was free. It ruins me.',
          ],
        },
        hint: 'Ask Tansy Knott at the Knothole Emporium for help',
      },
      {
        objective: {
          kind: 'collect', area: 'mossgate', label: 'corkbark slab', emoji: '🪵', color: 0xc8a070,
          spots: [{ x: 1998, y: 360 }, { x: 588, y: 980 }, { x: 1998, y: 960 }],
        },
        hint: 'Peel 3 slabs of corkbark from the Elder\'s outer flank, outside the trunk walls',
      },
      {
        objective: {
          kind: 'talk', npc: 'mossgate-linnet',
          lines: [
            'Tansy cut them to their feet. Look — Burdock, stand up. Bryony, stand up. They are a finger taller!',
            'They walk like ducks on a deck. Never mind. Ducks on a deck pass the notch.',
            'There is Quire now, at the notch-post, with his tape and his ledger. He measures everyone twice.',
          ],
        },
        hint: 'Bring the corkbark insoles back to Linnet Ashby',
      },
      {
        objective: {
          kind: 'duel', area: 'mossgate',
          foe: {
            id: 'mossgate-seedlings-duel', court: 'mossgate', name: 'The Seed Ledger',
            foeName: 'Registrar Pellam Quire', foeElement: 'paper', difficulty: 3, hpMult: 1,
            gimmick: '', at: { x: 1430, y: 800 }, coins: 55,
            look: { body: 0xb8a48c, accent: 0x3a4a2a, hat: 'tophat', traits: ['book', 'glasses', 'scarf'], size: 1.05, eye: 0xc8f0a8 },
            challenge: [
              'Ashby, B. and Ashby, B. Twins. Seedlings, third season. Grown a finger, the both of them, overnight.',
              'Children do not grow a finger overnight. Weeds do. I should know; I have a column for weeds.',
              'Stand aside, visitor. I am going to measure them again. Properly. From the floor up. With their shoes off.',
            ],
            beaten: ['My ledger — my pages! ...Fine. "Ashby, twins. Thriving." There. I have written it. Go away.'],
          },
        },
        hint: 'Registrar Quire is at the notch-post by the Knot Well — keep him from re-measuring the twins',
      },
    ],
    complete: [
      'He wrote THRIVING. In ink. In the Empress\'s own ledger. I watched him do it. Then I stole the page.',
      'They can take off the cork at home. They can be exactly as tall as they are. That is all I ever wanted.',
      'Take this. It was put by for the stunted-fee. We will not be needing a stunted-fee.',
    ],
    reward: { orbs: 5, coins: 45 },
  },

  // ── 5. A Thumb on the Scale ───────────────────────────────────────
  {
    id: 'mossgate-thumb-on-the-scale', area: 'mossgate', name: 'A Thumb on the Scale', giver: 'mossgate-weigher',
    requires: { princesOfIsle: 'life', count: 2 },
    offer: [
      'Twenty years I have read the beam. And for five of them, it has tipped short for more houses every season.',
      'Last night I weighed my own bread against the Empress\'s acorns. My bread. I came up short. I baked it.',
      'Before the acorns, Mossgate weighed with pound-stones. The old folk hid them in the Great Root. Find them.',
    ],
    accept: [
      'Under the root-arches, along the quay. Pushed into the crooks where the root goes into the mud. Four stones.',
      'If the acorns are heavier than the pound-stones... then I have been reading a lie for five years.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'mossgate', label: 'pound-stone', emoji: '🪨', color: 0xb8b0a0,
          spots: [{ x: 720, y: 1250 }, { x: 1010, y: 1254 }, { x: 1920, y: 1254 }, { x: 2470, y: 1250 }],
        },
        hint: 'Find 4 old pound-stones hidden under the Great Root\'s arches along the quay',
      },
      {
        objective: {
          kind: 'talk', npc: 'mossgate-weigher',
          lines: [
            'One stone in this pan. One brass acorn in that. — Look at the beam. Look at it go.',
            'Heavier. Every acorn is heavier than the pound it says it is. Hollow brass, full of lead. Five years.',
            'Every house I read short. Every cart. — And there is Master Plumb, coming down the quay to see why I stopped.',
          ],
        },
        hint: 'Bring the pound-stones to Agnes Tare at the scales',
      },
      {
        objective: {
          kind: 'duel', area: 'mossgate',
          foe: {
            id: 'mossgate-thumb-on-the-scale-duel', court: 'mossgate', name: 'Weighed and Found Wanting',
            foeName: 'Master of Scales Brannock Plumb', foeElement: 'justice', difficulty: 4, coins: 70,
            gimmick: '', at: { x: 1770, y: 1150 },
            look: { body: 0x9a8670, accent: 0xc9a44a, hat: 'mitre', traits: ['book', 'cane', 'beard'], size: 1.25, eye: 0xd8f070 },
            challenge: [
              'Mistress Tare. Your beam has stopped. And there are stones in my pan. Old stones. Illegal stones.',
              'The Empress\'s pound is what the Empress says a pound is. The garden needs more cuttings. The acorns grew.',
              'That is not a lie, visitor. That is the law, weighed. Step off my quay, or be weighed against it.',
            ],
            beaten: ['The beam is level. ...It was never level. I know. I always knew. I only brought the weights.'],
          },
        },
        hint: 'Master of Scales Brannock Plumb is on the quay — make him answer for the false weights',
      },
    ],
    complete: [
      'His acorns are at the bottom of the harbour and the pound-stones are back in the pan. I read them myself.',
      'Half of Mossgate weighed true this morning. Half. I counted the carts that did not go. I will always count.',
      'Take my own pound — the one my mother read with. It has never once told a lie. Let it keep you honest.',
    ],
    reward: { orbs: 7, coins: 120, item: 'charm-mossgate-honest-pound' },
  },
];
