import type { QuestDef } from '../../../../IslesTypes';
import { BELL_POSTS, CORWEN_GRAVE, LYCH_HOUSE } from './area';
import { FISH_ROACH } from './items';

/**
 * The Grave Court's five side quests.
 *
 * The last court up the Fang road, where the passed-over end up, so between them they show the
 * bottom of the Matriarch's rationing: a man entered in the Register before he has died (Corwen),
 * a grandmother buried with her bell muffled (Wick), a wake with nothing on the table (Nan), the
 * bootleg Draught hidden in hollow headstones and the digger who digs slow to buy it time (Tobit),
 * and at last the woman who has washed every greyed body for forty years sending you to ring
 * the Keeper down (Hessel). Every one of them is somebody refusing to be buried yet.
 */
export const GRAVE_QUESTS: QuestDef[] = [
  // ── 1. Not Yet — visit + talk + duel ─────────────────────────────────
  {
    id: 'grave-q-not-yet',
    area: 'grave',
    name: 'Not Yet',
    giver: 'grave-corwen',
    offer: [
      'They\'ve dug my grave. In Tobit\'s yard, west of the road. My name\'s on the cross already. In paint.',
      'And it\'s in the Register — Corwen Peat, passed over, and a space left for the day. They\'re only waiting.',
      'I\'m not asking for a cure. Nobody gets a cure. I\'m asking to be crossed out. Until I\'m actually done.',
      'Go and see the grave, would you? Then talk to the Verger. He keeps the book. He might listen to a stranger.',
    ],
    accept: ['Bless you. West along the Bier Road, into the digger\'s yard. You\'ll see the paint. It\'s very fresh.'],
    stages: [
      {
        objective: { kind: 'visit', area: 'grave', at: CORWEN_GRAVE, r: 70, label: 'Corwen\'s grave' },
        hint: 'See the grave dug for Corwen Peat in Tobit\'s yard, west on the Bier Road',
      },
      {
        objective: {
          kind: 'talk', npc: 'grave-quillon',
          lines: [
            'Corwen Peat. Yes. Page four hundred and nine. Passed over at the new moon, the house of Peat.',
            'Not dead? I know he isn\'t dead. I\'ve seen him on the Ward porch. He waves at me. I wave back.',
            'I can\'t strike a name. Only the Tally-Warden strikes names, and only upward. To the date. Never out.',
            '...Though if somebody were to take the pen off her, I suppose there\'d be nobody to stop me.',
          ],
        },
        hint: 'Ask Verger Quillon at the Register, inside the lych-gate',
      },
      {
        objective: {
          kind: 'duel', area: 'grave',
          foe: {
            id: 'grave-q-not-yet-duel',
            court: 'grave',
            name: 'Ruled Through',
            foeName: 'Tally-Warden Druce Vell',
            foeElement: 'ink',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1200, y: 1560 },
            look: { body: 0xb0a8b8, accent: 0x9ae04a, hat: 'tricorn', traits: ['book', 'glasses'], size: 1.05, eye: 0x9ae04a },
            challenge: [
              'A name in the Register is a promise to Her Grace. The Register does not break promises. Neither do I.',
              'Peat, Corwen. He\'ll be done by the dark of the moon. I\'ve already blotted the space.',
              'Hand me the pen, Verger. And you, stranger — stand still while I enter you.',
            ],
            beaten: ['...Strike it, then. One line. If he dies anyway I shall write it back in, very small.'],
            coins: 120,
          },
        },
        hint: 'Take the pen off Tally-Warden Druce Vell by the lych-gate',
      },
    ],
    complete: [
      'Ruled through! Quillon came up the field to tell me himself. One line, he said. His best line.',
      'I\'m going to sit on this porch and not be dead at everybody who goes past. Here. It\'s all I have.',
    ],
    reward: { orbs: 10, coins: 80 },
  },

  // ── 2. Muffled — collect + talk + duel ──────────────────────────────
  {
    id: 'grave-q-muffled',
    area: 'grave',
    name: 'Muffled',
    giver: 'grave-wick',
    offer: [
      'My Gammer\'s bell rang last night. Third post. I KNOW it did. I felt it in my teeth.',
      'But the Hush-Warden tied rag round every clapper in the field, by the Prince\'s order. So it rang quiet.',
      'If she\'s ringing she\'s pulling the cord. If she\'s pulling the cord she\'s — she isn\'t —',
      'Pull the rags off, please. All the posts. If they\'re open, everyone will hear, and they\'ll have to dig.',
    ],
    accept: ['Two rows of posts, east of the Carrying Road. Quick. The Hush-Warden walks the field at dusk.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'grave', label: 'A muffling rag', emoji: '🧻', color: 0xc9cfd3,
          spots: [0, 2, 4, 6, 8].map((i) => ({ x: BELL_POSTS[i].x + 16, y: BELL_POSTS[i].y + 30 })),
        },
        hint: 'Pull the muffling rags off 5 bell posts in the Sexton\'s field',
      },
      {
        objective: {
          kind: 'talk', npc: 'grave-tobit',
          lines: [
            'The third post rang? ...Right. Don\'t say another word. Stand there and look like a mourner.',
            'I\'ll dig. UP, mind. First time in thirty years I\'ve dug up. My arms don\'t know which way to go.',
            '...Wood. Elm. And — knocking. Lad! LAD! Get the Ward-nurse and a blanket. Oh, she\'s furious.',
            'Uh-oh. That\'s the Hush-Warden on the path. She\'ll have heard the bells. Everyone heard the bells.',
          ],
        },
        hint: 'Fetch Tobit Sump from his digger\'s yard, west on the Bier Road',
      },
      {
        objective: {
          kind: 'duel', area: 'grave',
          foe: {
            id: 'grave-q-muffled-duel',
            court: 'grave',
            name: 'Ring Quiet',
            foeName: 'Hush-Warden Lisle Muffet',
            foeElement: 'silence',
            difficulty: 5,
            hpMult: 0.95,
            gimmick: '',
            at: { x: 1820, y: 1395 },
            look: { body: 0xc4c0cc, accent: 0x17151b, hat: 'veil', traits: ['satchel', 'scarf'], size: 1, eye: 0xc9cfd3 },
            challenge: [
              'A bell in the night frightens the town, and a frightened town asks for more Draught. So I muffle them.',
              'Now every bell in the field is ringing and the Ward is awake and somebody is DIGGING. Stop that.',
              'Hush, now. Everything hushes for me, in the end.',
            ],
            beaten: ['...Let them ring. Let them ring. I\'m going to go and sit somewhere with my fingers in my ears.'],
            coins: 120,
          },
        },
        hint: 'Stand off Hush-Warden Lisle Muffet in the bell field',
      },
    ],
    complete: [
      'She\'s ALIVE. She\'s in the Ward with a blanket telling everybody off. She told ME off. For the rags!',
      'Sexton Toll says this is mine to give and nobody else\'s. It\'s from her grave-post. She wants you to have it.',
    ],
    reward: { orbs: 11, coins: 60 },
  },

  // ── 3. A Wake Without Bread — fish + deliver + duel ──────────────────
  {
    id: 'grave-q-wake-bread',
    area: 'grave',
    name: 'A Wake Without Bread',
    giver: 'grave-nan',
    offer: [
      'The Merrows hold their wake tonight. Passed-over house. There\'ll be nothing on the table but the coffin.',
      'Mother Hessel bakes for wakes when she has flour, but flour\'s on the Tithe. Fish isn\'t, if nobody sees.',
      'The roach in the Lych Pool, the grey ones. Catch me two and take them to Hessel. Nobody eats them. We will.',
    ],
    accept: ['You\'ll want an antivenin rod. The water here is black — it bites the line. Fish under the lamp-light.'],
    stages: [
      {
        objective: { kind: 'fish', fish: FISH_ROACH, count: 2 },
        hint: 'Catch 2 wraith roach in the Lych Pool (antivenin rod)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'grave-hessel', item: FISH_ROACH, count: 2,
          lines: [
            'Roach! From the pool? Nan sent you. Of course she did. Give them here, I\'ll bake them in a crust.',
            'Oh, bother. That\'s the cold-house keeper on the walk. He says the pool\'s fish feed the cold-house tithe.',
          ],
        },
        hint: 'Bring the 2 wraith roach to Mother Hessel at the laying-out house',
      },
      {
        objective: {
          kind: 'duel', area: 'grave',
          foe: {
            id: 'grave-q-wake-bread-duel',
            court: 'grave',
            name: 'Kept Cold',
            foeName: 'Coldhouse-Keeper Rime Gallow',
            foeElement: 'ice',
            difficulty: 5,
            hpMult: 0.9,
            gimmick: '',
            at: { x: 1460, y: 1040 },
            look: { body: 0xc8d4dc, accent: 0x6aa898, hat: 'hood', traits: ['apron', 'tool'], size: 1.15, eye: 0xc9eef8 },
            challenge: [
              'The Lych Pool is cold-house water. The cold-house keeps the greyed till the holes are dug. The fish are mine.',
              'A wake with fish on the table. Next you\'ll want the dead warm. It doesn\'t do. Hand over the roach.',
            ],
            beaten: ['Keep your roach. Keep your crust. ...Is there enough crust for one more at the Merrows\'?'],
            coins: 120,
          },
        },
        hint: 'See off Coldhouse-Keeper Rime Gallow by the Lych Pool',
      },
    ],
    complete: [
      'Fish and bread at a Merrow wake, and Rime Gallow at the end of the table asking for more. What a night.',
      'I keened. Then I ate. Then I keened again, but it came out more like a song. Take this.',
    ],
    reward: { orbs: 9, coins: 70 },
  },

  // ── 4. Dig Slow — collect + talk + duel ──────────────────────────────
  {
    id: 'grave-q-dig-slow',
    area: 'grave',
    name: 'Dig Slow',
    giver: 'grave-tobit',
    requires: { questDone: 'grave-q-not-yet' },
    offer: [
      'Here\'s a thing I\'ve never said aloud. Tansy Rue comes through the yard at night with her kettle.',
      'Bootleg Draught. Contraband. She leaves vials in the hollow headstones — four of them, about the court.',
      'Somebody has to fetch them to the Ward before the Quota-Master finds them, and it can\'t be me. He watches me.',
      'Will you? Then get them to Corwen on the Ward porch. He\'ll know who still has a chance.',
    ],
    accept: ['The hollow stones ring wrong if you tap them. One in the west rows, one east, one north, one by the pools.'],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'grave', label: 'A vial of bootleg Draught', emoji: '🧪', color: 0x9ae04a,
          spots: [{ x: 335, y: 1100 }, { x: 1757, y: 1100 }, { x: 1475, y: 335 }, { x: 668, y: 800 }],
        },
        hint: 'Find Tansy\'s 4 vials in the hollow headstones about the court',
      },
      {
        objective: {
          kind: 'talk', npc: 'grave-corwen',
          lines: [
            'Tansy\'s vials? Here — give them here, quick, before the Ward-nurse turns round.',
            'Four vials, nine doses if we\'re careful. Thirty cots. I\'ll see they go to the ones with colour left.',
            'Oh no. Oh, look down the field. That\'s Delve. That\'s the Quota-Master, and he\'s seen you.',
          ],
        },
        hint: 'Get the vials to Corwen Peat on the Quiet Ward porch',
      },
      {
        objective: {
          kind: 'duel', area: 'grave',
          foe: {
            id: 'grave-q-dig-slow-duel',
            court: 'grave',
            name: 'Twelve a Day',
            foeName: 'Quota-Master Spurge Delve',
            foeElement: 'earth',
            difficulty: 5,
            hpMult: 1,
            gimmick: '',
            at: { x: 400, y: 1240 },
            look: { body: 0x8a7c66, accent: 0x9ae04a, hat: 'helmet', traits: ['book', 'tool'], size: 1.25, eye: 0x9ae04a },
            challenge: [
              'Twelve holes a day. Sump digs four. I\'ve wondered why. Now I find vials in my stones. Contraband.',
              'Every dose that isn\'t Her Grace\'s is a theft from Her Grace. And every thief gets a hole. Dig your own.',
            ],
            beaten: ['...Four a day, then. Write it down as twelve. I can\'t count in this light anyway.'],
            coins: 120,
          },
        },
        hint: 'Face Quota-Master Spurge Delve on the Bier Road by the digger\'s yard',
      },
    ],
    complete: [
      'Nine doses down the Ward and Delve gone off rubbing his head. I\'ll dig slower than ever now. Watch me.',
      'Tansy left a little extra in the last stone. For whoever carried them, she says. That\'s you.',
    ],
    reward: { orbs: 10, coins: 90 },
  },

  // ── 5. The Last Bell — talk + visit + the Prince ─────────────────────
  {
    id: 'grave-q-last-bell',
    area: 'grave',
    name: 'The Last Bell',
    giver: 'grave-hessel',
    requires: { courtReady: 'grave' },
    offer: [
      'Forty years I\'ve laid out the greyed. I put two pennies on every pair of eyes. The Keeper pays for them.',
      'I\'ve never asked a thing of him. I\'m asking now, through you. Go up to the Lych House and ring him down.',
      'Talk to Quillon first. He\'s kept that Register thirty years. He\'ll want to give you something to carry.',
    ],
    accept: ['Go on. He\'s gentle, the Keeper. That\'s the worst of him. Don\'t let it fool you.'],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'grave-quillon',
          lines: [
            'Hessel sent you. Here. This is page one of the Register — the first name I ever wrote. My own mother.',
            'Show it to him. He thinks the book is gentle. Let him read who\'s in it. All of them, one at a time.',
          ],
        },
        hint: 'Talk to Verger Quillon at the Register',
      },
      {
        objective: { kind: 'visit', area: 'grave', at: { x: LYCH_HOUSE.x, y: LYCH_HOUSE.y + 60 }, r: 70, label: 'The Lych House' },
        hint: 'Go up the Lych Walk to the Lych House door',
      },
      {
        objective: { kind: 'prince', prince: 'mortis' },
        hint: 'Ring down Prince Mortis in the Lych House',
      },
    ],
    complete: [
      'He came out and asked Quillon to read him the names. All of them. He\'s still out there, listening.',
      'I\'ll put the pennies in a jar. Spend them on something warm. Take these too — they\'re yours by rights.',
    ],
    reward: { orbs: 12, coins: 150 },
  },
];
