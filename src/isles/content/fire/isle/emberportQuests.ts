import type { QuestDef } from '../../../IslesTypes';

/**
 * Emberport's five quests. The first is the isle's tutorial in disguise (a shop, the plaza, the
 * road north); the second teaches fishing; the rest are small stories about a port that keeps
 * its Tithe Fire lit with as little love as it can get away with.
 */
export const EMBERPORT_QUESTS: QuestDef[] = [
  // ── 1. The Unbranded ──────────────────────────────────────────────
  {
    id: 'emberport-unbranded', area: 'emberport', name: 'The Unbranded', giver: 'emberport-harbourmaster',
    offer: [
      'Listen. Every soul on this isle is branded at birth. A bare wrist in the plaza is a march to the Kiln.',
      'Marrit at the store owes me. She will cover you up. Then walk past the Tithe Fire like you belong.',
      'And then — the north road. The Hearth Court. If you are here to make trouble, start where it starts.',
    ],
    accept: [
      'Good. Store is on the cross road, west of the plaza. Big window full of bells. Go.',
      'If anyone asks, you are my cousin from the Caldera. You have a burn. You do not talk about it.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'emberport-store',
          lines: [
            'Odile sent you? Hold out your wrist. — Oh, bare as a baby\'s. Here. A scarf. Wrap it twice.',
            'If anybody asks, it is a burn and you hate to talk about it. And buy something some day. Charms.',
          ],
        },
        hint: 'See Marrit Fenwick at the general store, on the cross road west of the plaza',
      },
      {
        objective: { kind: 'visit', area: 'emberport', at: { x: 1300, y: 760 }, r: 120, label: 'The Tithe Fire' },
        hint: 'Walk past the Tithe Fire in the plaza — calmly',
      },
      {
        objective: { kind: 'visit', area: 'hearth', at: { x: 1200, y: 1560 }, r: 200, label: 'The Hearth Court gate' },
        hint: 'Take the north road out of Emberport to the Hearth Court',
      },
      {
        objective: {
          kind: 'duel', area: 'emberport',
          foe: {
            id: 'emberport-unbranded-duel', court: 'kiln', name: 'Wrist Inspection',
            foeName: 'Brand-Clerk Quill', foeElement: 'justice', difficulty: 1, hpMult: 0.85,
            gimmick: '', at: { x: 1300, y: 230 }, coins: 30,
            look: { body: 0xb89a80, accent: 0x5a1410, hat: 'tophat', traits: ['book', 'glasses', 'brand'], size: 0.95 },
            challenge: [
              'You. Scarf. I saw you at the Hearth gate and I followed you all the way down. Wrist, please.',
              'A burn, is it? Burns heal. Brands do not. Unwrap it, or I write you into the Kiln ledger myself.',
            ],
            beaten: ['...I will write that it was a burn. A very nasty burn. I did not look closely. Nobody did.'],
          },
        },
        hint: 'Stop Brand-Clerk Quill on the north road before he unwraps your scarf',
      },
    ],
    complete: [
      'Quill followed you down from the Hearth gate? And you sent him off with his ledger shut. My cousin! Ha!',
      'That court is Prince Kindle\'s. Five champions stand between his door and the road. Break them.',
      'Here — coin for the road, and something for whatever those strange Orbs of yours are for.',
    ],
    reward: { orbs: 3, coins: 40 },
  },

  // ── 2. Something for the Pot ──────────────────────────────────────
  {
    id: 'emberport-first-catch', area: 'emberport', name: 'Something for the Pot', giver: 'emberport-fishwife',
    offer: [
      'Hands like yours, empty? On a pier? Shameful. Go to Sal\'s, get a rod. The driftwood one is cheap.',
      'Then off the end of the pier. Press E at the water, wait for the tug, keep the fish in the bar.',
      'Catch three cinder sprats and show me. That is not a favour; it is a lesson.',
    ],
    accept: [
      'Sal\'s tackle shop is just west of my stall. Do not let him sell you the obsidian one. You will cry.',
      'And if Gaff on the fishing pier asks for a "toll", the answer is no. Firmly. With your fists.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-cinder-sprat', count: 3 },
        hint: 'Buy a rod from Sal Gudgeon, then catch 3 Cinder Sprats off the pier',
      },
      {
        objective: {
          kind: 'duel', area: 'emberport',
          foe: {
            id: 'emberport-first-catch-duel', court: 'kiln', name: 'Pier Toll',
            foeName: 'Pier-Rat Gaff', foeElement: 'water', difficulty: 1, hpMult: 0.8,
            gimmick: '', at: { x: 720, y: 1250 }, coins: 25,
            look: { body: 0xa07e66, accent: 0x2a4a5a, hat: 'beanie', traits: ['rod', 'eyepatch'], size: 0.9 },
            challenge: [
              'Three sprats off MY pier and not one for the toll? Nella sends all her strays down here. I eat well.',
              'Hand them over, or I put you in the water to look for more.',
            ],
            beaten: ['Fine! Keep your sprats. It is a free pier. Mostly. On Tuesdays.'],
          },
        },
        hint: 'Pier-Rat Gaff wants your sprats as a "toll" — see him off the fishing pier',
      },
    ],
    complete: [
      'Three sprats, warm and wriggling — and Gaff sulking at the pier end. Not bad at all. The tide approves.',
      'Now you can eat on this isle without anyone\'s permission. That is worth more than you think.',
      'Keep the sprats. Take them to Bettany some day with a court crayfish — toast like no other.',
    ],
    reward: { orbs: 2, coins: 35 },
  },

  // ── 3. The Lamp That Won't Brand ──────────────────────────────────
  {
    id: 'emberport-lens', area: 'emberport', name: "The Lamp That Won't Brand", giver: 'emberport-keeper',
    offer: [
      'Forty years that lamp burned gold. Then a decree: the beam shall be the King\'s red. Red! At sea!',
      'They smashed my old lens to fit their glass. The shards went off the gallery onto the black sand.',
      'Five big pieces, glinting. Bring them back and I can make it whole. Then we see what colour it burns.',
    ],
    accept: [
      'Walk the waterline. Look for the glint — the sand is black, the glass is not.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'emberport', label: 'lens shard', emoji: '🔷', color: 0xbfe6ff,
          spots: [{ x: 420, y: 1200 }, { x: 830, y: 1236 }, { x: 1120, y: 1214 }, { x: 1480, y: 1232 }, { x: 1760, y: 1150 }],
        },
        hint: 'Find 5 lens shards along the black-sand beach',
      },
      {
        objective: {
          kind: 'talk', npc: 'emberport-boatwright',
          lines: [
            'Glass? You want to glue glass? Iven sent you. Of course he did.',
            'Fish-glue. Boiled from brand-eel skins. Holds a hull together in a gale; it will hold a lens.',
            'Tell him he owes me a lamp-lit night on the gallery and a bottle of something brown.',
            'And mind the beach on your way back. The Crown\'s glazier has been asking who is picking up glass.',
          ],
        },
        hint: 'Get fish-glue from Hobb Tarrow, the boatwright on the east beach',
      },
      {
        objective: {
          kind: 'duel', area: 'emberport',
          foe: {
            id: 'emberport-lens-duel', court: 'kiln', name: 'Crown Glass',
            foeName: 'Glazier Pane', foeElement: 'crystal', difficulty: 2, hpMult: 0.9,
            gimmick: '', at: { x: 1180, y: 1170 }, coins: 30,
            look: { body: 0xc0a48c, accent: 0x8a1e1e, hat: 'goggles', traits: ['apron', 'tool', 'brand'], eye: 0xbfe6ff },
            challenge: [
              'Those shards are Crown refuse. I broke that lens by decree, and I swept it off the gallery myself.',
              'A gold beam at sea is treason with a wick. Hand over the glass and I will grind it to sand.',
            ],
            beaten: ['Keep it. Glue it. I only ever cut what they told me to cut. ...It was a beautiful lens.'],
          },
        },
        hint: 'Glazier Pane wants the shards back — get past him on the beach by the main pier',
      },
    ],
    complete: [
      'All five, Hobb\'s glue, and the Crown\'s glazier sent packing. Hand me those — gently — there. Look at that.',
      'Tonight it burns red, because they are watching. But one night soon, it will burn gold.',
      'Take these. I have kept them forty years for a night like this.',
    ],
    reward: { orbs: 4, coins: 30 },
  },

  // ── 4. A Cold Hearth ──────────────────────────────────────────────
  {
    id: 'emberport-cold-hearth', area: 'emberport', name: 'A Cold Hearth', giver: 'emberport-agna',
    requires: { questDone: 'emberport-unbranded' },
    offer: [
      'My tithe fire went out. I sat up with Teo — his fever — and the coals died while I held his hand.',
      'A cold hearth is a march to the Kiln. The wardens walk Cinder Row at dusk. Dusk is close.',
      'Bettany\'s oven never goes out. If you could bring me one live coal... please.',
    ],
    accept: [
      'Thank you. Thank you. Do not run — wardens notice running. Walk like you are bringing bread.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'emberport-baker',
          lines: [
            'Agna\'s fire? Oh, the poor love. Here — a coal from the back of my oven. The hottest one.',
            'Do NOT hold it in your hand. Ruddock at the smokehouse keeps clay coal-pots. Go, go.',
          ],
        },
        hint: 'Ask Bettany at the Scorched Loaf for a live coal from her oven',
      },
      {
        objective: {
          kind: 'talk', npc: 'emberport-ruddock',
          lines: [
            'A live coal for the widow? Not in your fist, you lunatic. Here — a clay coal-pot. Lid, handle, done.',
            'Walk it, do not run it. And go round by the plaza; Cinder Row is crawling with ledgers at this hour.',
          ],
        },
        hint: 'Get a clay coal-pot from Ruddock at the smokehouse',
      },
      {
        objective: {
          kind: 'talk', npc: 'emberport-corrow',
          lines: [
            'Halt. What is in the pot? — Carrying fire between hearths is a tithe offence. Did you know that?',
            '...It is getting dark. My eyes are not what they were. I see a pot of soup. Do you see a pot of soup?',
            'Go on. Soup gets cold. ...But Hask is on Cinder Row tonight, and Hask does not have bad eyes.',
          ],
        },
        hint: 'Get past Brand-Sergeant Corrow at the Tithe Fire with the coal-pot',
      },
      {
        objective: {
          kind: 'duel', area: 'emberport',
          foe: {
            id: 'emberport-cold-hearth-duel', court: 'kiln', name: 'Dusk Round',
            foeName: 'Dusk-Warden Hask', foeElement: 'shadow', difficulty: 2, hpMult: 0.9,
            gimmick: '', at: { x: 700, y: 500 }, coins: 30,
            look: { body: 0x7a6458, accent: 0x2a2030, hat: 'hood', traits: ['lantern', 'book', 'brand'], size: 1.1, eye: 0xb88aff },
            challenge: [
              'Dusk on Cinder Row, and the widow Agna\'s chimney is cold. I have been waiting all day for this.',
              'And here you come with a pot that smokes. Soup, is it? Set it down. Then we settle the tithe.',
            ],
            beaten: ['...Her chimney is smoking. I see it. I will write that it never went out.'],
          },
        },
        hint: 'Dusk-Warden Hask is waiting outside Agna\'s door on Cinder Row — get the coal past him',
      },
    ],
    complete: [
      'It caught. Look — it caught. Teo, look, the fire is back.',
      'Corrow let you by, and Hask is limping home with his book shut? Nineteen years and I never thought... well.',
      'I have nothing worth much. Take this. My husband said it was for "the day somebody helps".',
    ],
    reward: { orbs: 4, coins: 25 },
  },

  // ── 5. The One That Got Away ──────────────────────────────────────
  {
    id: 'emberport-kingscale', area: 'emberport', name: 'The One That Got Away', giver: 'emberport-netmender',
    requires: { princesOfIsle: 'fire', count: 2 },
    offer: [
      'In \'38 I hooked a Kingscale. Gold, red-edged, longer than I am. It took the hook and the rod and my hat.',
      'By decree, a Kingscale belongs to the Crown. That is why I never told anyone I hooked one.',
      'Two princes down — the King is busy. Land one for me. I only want to hold it. Just once.',
    ],
    accept: [
      'Driftwood will snap like a breadstick. Sal sells iron-ringed rods. Tell him Pell sent you; he will sigh.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'emberport-tackle',
          lines: [
            'Pell sent you after the Kingscale. Of course he did. He has been sending people after it for years.',
            'Iron-ringed rod, nothing less. Deep water off the pier end. And patience — it bites when it likes.',
          ],
        },
        hint: 'Ask Sal Gudgeon at the tackle shop how to catch a Kingscale',
      },
      {
        objective: { kind: 'fish', fish: 'fish-kingscale', count: 1 },
        hint: 'Land a Kingscale off the pier (needs the Iron-Ringed Rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'emberport-netmender', item: 'fish-kingscale', count: 1,
          lines: [
            'Oh. Oh, look at you. Cold as a coin. Heavier than a grandchild.',
            'Oh no. The Crown\'s fish-reeve saw you land it. He is coming up the beach. He wants it for the King.',
          ],
        },
        hint: 'Bring the Kingscale to Old Pell at the net racks',
      },
      {
        objective: {
          kind: 'duel', area: 'emberport',
          foe: {
            id: 'emberport-kingscale-duel', court: 'kiln', name: 'By Decree',
            foeName: 'Fish-Reeve Gilder', foeElement: 'fortune', difficulty: 2, coins: 40,
            gimmick: '', at: { x: 430, y: 1130 },
            look: { body: 0xb08a6a, accent: 0xc8a030, hat: 'tricorn', traits: ['satchel', 'book', 'brand'], size: 1.05, eye: 0xffd86a },
            challenge: [
              'A Kingscale, landed off the King\'s pier, by a bare-wristed nobody. By decree, that fish is Crown gold.',
              'Old Pell kept quiet about \'38. I wrote it down anyway. Step aside, or pay its weight in coin.',
            ],
            beaten: ['Keep it, then. I will write that it slipped the net. They always believe that one.'],
          },
        },
        hint: 'Stop Fish-Reeve Gilder from taking the Kingscale for the Crown (beach by the lighthouse)',
      },
    ],
    complete: [
      'You sent the reeve off with his book in the surf! Fifty years. ...You know what, I am going to let it go.',
      'Some things should not be owned. Not by him, not by the King, not by me.',
      'There. Back it goes. Did you see? Did you see it turn gold under the water? That was worth a life.',
      'Here. Coin from a jar I was saving for a new hat. I do not need a hat. I have a story.',
    ],
    reward: { orbs: 6, coins: 200 },
  },
];
