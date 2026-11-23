import type { QuestDef } from '../../../../IslesTypes';

/**
 * Tosswater's five quests. The first is the isle's welcome in disguise — your berth is drawn by lot
 * like everyone's, and it comes up the one number nobody draws. The second sends you out on the
 * piers to fish a supper for a woman who may not take one. The rest are small stories about a town
 * where everything is a draw: a baby's number, a lighthouse somebody is betting against, and at last
 * the drum itself, which weighs light.
 *
 * Every quest ends in a fight with one of the House's people in the port. Their elements are all
 * different: water, bind, metal, subterfuge, illusion.
 */
export const TOSSWATER_QUESTS: QuestDef[] = [
  // ── 1. The Berth Lottery ──────────────────────────────────────────
  {
    id: 'tosswater-berth-lottery', area: 'tosswater', name: 'The Berth Lottery', giver: 'tosswater-dock',
    offer: [
      'You came in over the Outer Sea and tied up on my landing jetty. Bless you. You cannot stay there.',
      'Every hull in Tosswater has its berth drawn by lot, weekly, at the kiosk on the quay. Yours too.',
      'Go and draw with Lottie. Red is a quay berth, black is a pier. Then come back and I will tie you up.',
    ],
    accept: [
      'The striped kiosk east of the landing, with the little wheel on its roof. Lottie wears a green visor.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'tosswater-kiosk',
          lines: [
            'A visitor! Spin, love. Round she goes, round she goes... and she lands on — oh. Oh dear. Green.',
            'Green is nought. Nought is the House\'s berth. It sits empty for the King\'s yacht, which never comes.',
            'Nobody draws nought. It is not on the wheel, really. It is painted on. I have never seen it come up.',
            'They will want to know. Go and look at the board in the Draw Square. Your number goes up when you draw.',
          ],
        },
        hint: 'Draw your berth at Lottie Spindle\'s kiosk on the quay',
      },
      {
        objective: { kind: 'visit', area: 'tosswater', at: { x: 1480, y: 700 }, r: 110, label: 'The numbers board' },
        hint: 'Look at the weekly numbers board in the Draw Square',
      },
      {
        objective: {
          kind: 'talk', npc: 'tosswater-dock',
          lines: [
            'Nought. Up on the board in red, under BERTH, beside your boat\'s name. I heard the gasp from here.',
            'A hull in the House\'s berth is "presumed adrift". The berth-warden tows it out and sinks it. Law.',
            'And there he is. Capstan, with his chain and his hook. He has never once lost a tow.',
          ],
        },
        hint: 'Tell Barnaby Gunwale at the slip what the wheel said',
      },
      {
        objective: {
          kind: 'duel', area: 'tosswater',
          foe: {
            id: 'tosswater-berth-lottery-duel', court: 'tosswater', name: 'Presumed Adrift',
            foeName: 'Berth-Warden Capstan', foeElement: 'water', difficulty: 3, hpMult: 0.95,
            gimmick: '', at: { x: 760, y: 1232 }, coins: 60,
            look: { body: 0x7a8a96, accent: 0x1c1a22, hat: 'souwester', traits: ['tool', 'beard', 'eyepatch'], size: 1.3, eye: 0x9ae0e8 },
            challenge: [
              'Berth nought. The House\'s berth. A hull in it is adrift by law, and adrift hulls go to the bottom.',
              'I do not make the law. I tow it. Forty hulls I have towed out past the top and opened their seacocks.',
              'Stand off my hook, visitor. Or I will tow you out with your boat and see which of you floats.',
            ],
            beaten: ['My chain\'s slipped. ...Keep your berth. Let the King\'s yacht tie up in the sea when it comes.'],
          },
        },
        hint: 'Berth-Warden Capstan has come to tow your boat out and sink it — stop him',
      },
    ],
    complete: [
      'He went up the north road dripping and swearing! On your first day! The whole quay saw it. Ha!',
      'So now you know: the House draws everything. Berths, bread, children. Six princes keep the drum turning.',
      'North to the Card Court is gentlest. Here — the dockmaster\'s cut, and a better number than nought.',
    ],
    reward: { orbs: 9, coins: 60 },
  },

  // ── 2. A Supper for the Busted ────────────────────────────────────
  {
    id: 'tosswater-black-chip-supper', area: 'tosswater', name: 'A Supper for the Busted', giver: 'tosswater-baker',
    offer: [
      'You have seen her. On the Hall steps, sweeping. Four-Four-One-Seven. She was my apprentice, once.',
      'She wagered a re-draw at the House for her brother and lost. Lost everything. Even her name.',
      'The busted eat what the House gives them, which is gruel. I want to bake her a Wishbone Pie. Will you fish?',
    ],
    accept: [
      'Two lotfish and a dice dab. Off either pier, or the quay. Press E at the water and wait for the tug.',
      'Lotfish bite at anything shiny. Dabs lie on the sand showing their spots. Bring them to my counter.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-lotfish', count: 2 },
        hint: 'Catch 2 Lotfish off the quay or the piers',
      },
      {
        objective: { kind: 'fish', fish: 'fish-dice-dab', count: 1 },
        hint: 'Catch a Dice Dab (they lie flat on the sand under the piers)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-tosswater-wishbone-pie' },
        hint: 'Have the Lucky Loaf bake a Wishbone Pie (2 Lotfish, 1 Dice Dab)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'tosswater-busted', item: 'meal-tosswater-wishbone-pie', count: 1,
          lines: [
            'Four-Four-One-Seven may not take gifts. The busted belong to the House. So does what they hold.',
            '...It is still warm. Hetty always crimped it like that. With her thumb. Four-Four-One-Seven remembers.',
            'Four-Four-One-Seven will — she will eat it. Here. Now. — Oh. The chip-warden. He has seen.',
          ],
        },
        hint: 'Bring the Wishbone Pie to Four-Four-One-Seven on the Draw Hall steps',
      },
      {
        objective: {
          kind: 'duel', area: 'tosswater',
          foe: {
            id: 'tosswater-black-chip-supper-duel', court: 'tosswater', name: 'The Busted Eat Gruel',
            foeName: 'Chip-Warden Marrow', foeElement: 'bind', difficulty: 4, hpMult: 0.95,
            gimmick: '', at: { x: 1150, y: 770 }, coins: 65,
            look: { body: 0x8a8088, accent: 0x121016, hat: 'tophat', traits: ['book', 'cane', 'glasses'], size: 1.1, eye: 0xc8c0d8 },
            challenge: [
              'Four-Four-One-Seven. You are holding a pie. The busted hold nothing. That is the whole of the rule.',
              'Gifts are wagers, visitor. A gift to the busted is a stake against the House. The House takes stakes.',
              'Hand it over. Or be chained to the steps beside her and sweep them till the Draw calls your number.',
            ],
            beaten: ['My chains — slack. ...Let her eat it, then. She will be hungrier tomorrow. They always are.'],
          },
        },
        hint: 'Chip-Warden Marrow has come to take the pie — stand between them',
      },
    ],
    complete: [
      'She ate it. On the steps, in front of the Hall. Every crumb. She said "thank you, Hetty". My name. Not hers.',
      'One day she will have her own name back, and I will bake her a cake with it written on in icing.',
      'Take this. Fisher\'s pay, and a baker\'s thanks. And a button. Out of the loaf. You found it.',
    ],
    reward: { orbs: 10, coins: 60 },
  },

  // ── 3. A Lucky Number ─────────────────────────────────────────────
  {
    id: 'tosswater-lucky-number', area: 'tosswater', name: 'A Lucky Number', giver: 'tosswater-nell',
    requires: { questDone: 'tosswater-berth-lottery' },
    offer: [
      'Winnie gets her Lot tomorrow. The Lot-Smith stamps one for every baby at the Hall. A number for life.',
      'Everybody knows the favourites are never drawn. Everybody knows. And nobody can say how the drum knows them.',
      'The gulls fight over shiny things on the quay. Favourites drop Lots and buy new. Bring me some. I want to see.',
    ],
    accept: [
      'Favourites\' Lots have a gilt edge — they pay to have them gilded. Look where the gulls squabble.',
      'Four will do. Agatha at the pawnshop has a loupe. She will see what I cannot. If there is anything to see.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'tosswater', label: 'gilt-edged Lot', emoji: '🪙', color: 0xd8b04a,
          spots: [{ x: 880, y: 1236 }, { x: 1700, y: 1244 }, { x: 2015, y: 1360 }, { x: 1000, y: 420 }],
        },
        hint: 'Find 4 gilt-edged favourites\' Lots where the gulls squabble around Tosswater',
      },
      {
        objective: {
          kind: 'talk', npc: 'tosswater-pawn',
          lines: [
            'Gilt-edged. Favourites\' brass. Let me — loupe. Light. ...Hm. Hm! Look here, at the rim. See it?',
            'A notch. A hair-thin notch, cut into the edge, under the gilt. All four. Every one. Same place.',
            'A notched Lot would catch on something. A comb, say. A comb in a drum that lets the notched ones through.',
            'It is not proof. A notch is a notch. But I have been in this trade forty years. Tell Nell. Quickly.',
          ],
        },
        hint: 'Show the Lots to Agatha Pledge under the three gold balls',
      },
      {
        objective: {
          kind: 'talk', npc: 'tosswater-nell',
          lines: [
            'A notch. The favourites are notched. And Winnie will get a plain one, and drop through with the rest.',
            'Good. Do you hear me? Good. I do not want her bought. I want her drawn like everybody, until it stops.',
            'And there is the Lot-Smith now, with his punch and his little anvil. Early. He heard. They always hear.',
          ],
        },
        hint: 'Tell Nell Scrabble what Agatha found',
      },
      {
        objective: {
          kind: 'duel', area: 'tosswater',
          foe: {
            id: 'tosswater-lucky-number-duel', court: 'tosswater', name: 'Stamped for Life',
            foeName: 'Lot-Smith Brannick Punch', foeElement: 'metal', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 2000, y: 772 }, coins: 70,
            look: { body: 0x9a8070, accent: 0x7a5a1e, hat: 'coif', traits: ['tool', 'apron', 'beard'], size: 1.25, eye: 0xf0cc70 },
            challenge: [
              'Mistress Scrabble. Your girl\'s brass, as the law asks. And four favourites\' Lots, gone missing off the quay.',
              'A Lot is stamped once and worn for ever. What is cut into its rim is the smith\'s business. Only mine.',
              'Give back what you have found, visitor. Or I will stamp a number on you, and it will not be a lucky one.',
            ],
            beaten: ['My punch. ...Here. A plain Lot. No notch. Let her drop through the comb with the rest, then.'],
          },
        },
        hint: 'Lot-Smith Brannick Punch is on the east road — make him stamp Winnie an honest Lot',
      },
    ],
    complete: [
      'Plain brass, honest number. Six-Six-Oh-Two. Look at it. Nobody will ever buy her out of anything.',
      'Agatha has the notched ones in her safe. Nobody can prove a thing. But four people know. Then five. Then all.',
      'Take this. It was put by for a re-draw. We will not be wagering against the House. Not this family.',
    ],
    reward: { orbs: 11, coins: 70 },
  },

  // ── 4. The Wrecker's Light ────────────────────────────────────────
  {
    id: 'tosswater-wreckers-light', area: 'tosswater', name: 'The Wrecker\'s Light', giver: 'tosswater-keeper',
    requires: { questDone: 'tosswater-berth-lottery' },
    offer: [
      'Three boats on the Needle rocks this season, all on foggy nights, all when my top was spinning. I whipped it.',
      'And in the morning the whip-cord is frayed through. Cut, I would say, by someone who knows cord.',
      'I need new cord, tarred. Three coils. Folk leave it about on the quay. Then I will sit up and watch.',
    ],
    accept: [
      'Tarred whip-cord. Black, sticky, smells of pine. One by the slip, one by the landing, one up my end.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'tosswater', label: 'coil of tarred cord', emoji: '🧵', color: 0x3a2a1a,
          spots: [{ x: 300, y: 1240 }, { x: 1110, y: 1250 }, { x: 2270, y: 1206 }],
        },
        hint: 'Gather 3 coils of tarred whip-cord along the quay',
      },
      {
        objective: {
          kind: 'talk', npc: 'tosswater-keeper',
          lines: [
            'Lovely. Tarred properly. Now — whip! — and round she goes. Look at the beam swing. Good girl.',
            'Fog is coming in off the Outer Sea. It always comes in when there is a boat due. Funny, that.',
            'Look. Out on the end of the Kiosk Pier. A lantern. Somebody is showing a light where no light should be.',
          ],
        },
        hint: 'Bring the cord to Wynn Topsy at the spinning-top lighthouse',
      },
      {
        objective: { kind: 'visit', area: 'tosswater', at: { x: 765, y: 1410 }, r: 80, label: 'The false lantern' },
        hint: 'Go out to the false lantern at the end of the Kiosk Pier',
      },
      {
        objective: {
          kind: 'duel', area: 'tosswater',
          foe: {
            id: 'tosswater-wreckers-light-duel', court: 'tosswater', name: 'Odds on the Rocks',
            foeName: 'Bookmaker Wrackham Slate', foeElement: 'subterfuge', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 765, y: 1360 }, coins: 70,
            look: { body: 0x8a8a7a, accent: 0x2a2a30, hat: 'tophat', traits: ['book', 'lantern', 'scarf'], size: 1.05, eye: 0xe8d070 },
            challenge: [
              'Ah. You found my lantern. A light here, the top\'s light there, and a boat between them has to choose.',
              'I only make the book. Seven to one the Merrowmaid finds the Needle tonight. The House holds the stakes.',
              'Put out my lantern and you cost a lot of people their wager. Starting with me. Shall we lay odds on you?',
            ],
            beaten: ['My book! In the harbour! ...All bets off. All of them. The House will want that money back.'],
          },
        },
        hint: 'Bookmaker Wrackham Slate is on the Kiosk Pier with his false lantern — put it out',
      },
    ],
    complete: [
      'The Merrowmaid came in on the beam an hour ago. Eleven souls, a hold of salt, and not a scratch on her.',
      'Slate took bets on wrecks and cut my cord to make them come up. The House paid out. Of course it did.',
      'Take my whip-hand\'s glove — no, take coin, you will not want my glove. And my thanks. All night, she spins.',
    ],
    reward: { orbs: 11, coins: 75 },
  },

  // ── 5. The Drum Weighs Light ──────────────────────────────────────
  {
    id: 'tosswater-light-drum', area: 'tosswater', name: 'The Drum Weighs Light', giver: 'tosswater-caller',
    requires: { princesOfIsle: 'fate', count: 2 },
    offer: [
      'Twenty-two years I have turned that drum. I know its weight in my arm the way you know a child\'s.',
      'It weighs light. Four thousand souls in Tosswater, four thousand Lots in, and it turns as if it held fewer.',
      'The old numbers sheets blow about the town after every Draw. Find me five. I want to count what was called.',
    ],
    accept: [
      'Pasted to walls, caught in hedges, under benches. Old paper, numbers in red. Bring me five weeks of them.',
      'Quietly. The Drum-Keeper comes down from the House on Draw-eve. She watches me. She watches everybody.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'tosswater', label: 'old numbers sheet', emoji: '📜', color: 0xe8dcc0,
          spots: [{ x: 360, y: 772 }, { x: 900, y: 980 }, { x: 1600, y: 420 }, { x: 2420, y: 800 }, { x: 1300, y: 1110 }],
        },
        hint: 'Find 5 old numbers sheets blown about Tosswater',
      },
      {
        objective: {
          kind: 'talk', npc: 'tosswater-caller',
          lines: [
            'Five weeks. And my own tallies, under my hat, all twenty-two years. Let me lay them side by side.',
            'Not one. Not once. The Fitch-Vanes, the Goldwaters, the Pellingtons. Not one favourite called, ever.',
            'The House says chance is streaky. Chance is not that streaky. Go and ask Four-Four-One-Seven. She was inside.',
          ],
        },
        hint: 'Bring the sheets to Felix Tumble at the great drum',
      },
      {
        objective: {
          kind: 'talk', npc: 'tosswater-busted',
          lines: [
            'Four-Four-One-Seven was a croupier in the drum-room at the House before they sent her to sweep steps.',
            'She may not say what she saw. She may say what is under the drum, because it is furniture. A drawer.',
            'There is a drawer under the drum. That is all. Four-Four-One-Seven is sweeping now. The Keeper is coming.',
          ],
        },
        hint: 'Ask Four-Four-One-Seven what she saw inside the House',
      },
      {
        objective: {
          kind: 'duel', area: 'tosswater',
          foe: {
            id: 'tosswater-light-drum-duel', court: 'tosswater', name: 'The Drum Chooses',
            foeName: 'Drum-Keeper Vellum Spin', foeElement: 'illusion', difficulty: 5, hpMult: 1,
            gimmick: '', at: { x: 1420, y: 922 }, coins: 90,
            look: { body: 0xc8b8a8, accent: 0x1e5a32, hat: 'visor', traits: ['mask', 'cane', 'scarf'], size: 1.15, eye: 0x5ad07e },
            challenge: [
              'Caller. You have been counting. Callers do not count. Callers turn the handle and read the number.',
              'And you, visitor, have been asking a busted woman about furniture. The busted may not discuss furniture.',
              'The drum chooses. Say it. The drum chooses. Say it, or I will show you what the drum chooses for you.',
            ],
            beaten: ['...The drum chooses. It does. It is only that someone chooses the drum. Do not say I said so.'],
          },
        },
        hint: 'Drum-Keeper Vellum Spin has come down from the House — face her at the drum',
      },
    ],
    complete: [
      'She has gone back up to the House without her keys. Here — the key to the drum-room. I cannot use it yet.',
      'Not proof. A drawer, a notch, twenty-two years of tallies. But it is a shape, and the shape is a lie.',
      'Take my chalk. I counted with it every week. Count honestly with it. Somebody on this isle should.',
    ],
    reward: { orbs: 13, coins: 140, item: 'charm-tosswater-callers-chalk' },
  },
];

