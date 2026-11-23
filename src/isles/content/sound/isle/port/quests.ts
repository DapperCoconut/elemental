import type { QuestDef } from '../../../../IslesTypes';

/**
 * Carillon Quay's five quests. The first is the isle's welcome in disguise — you are given a Part
 * at the customs house and shown what singing anything else costs. The second sends you out on the
 * east jetty to fish a supper. The rest are small stories about a town that may only sing one
 * note each: a bell cast in the wrong key, a song folded into a hymn sheet, and one wrong bell rung
 * from the tower in the middle of the Hour.
 *
 * Every quest ends in a fight with one of the Maestro's servants on the Quay. Their elements are
 * all different: sound, silence, metal, paper, Time.
 */
export const CARILLON_QUESTS: QuestDef[] = [
  // ── 1. Given a Part ───────────────────────────────────────────────
  {
    id: 'carillon-given-a-part', area: 'carillon', name: 'Given a Part', giver: 'carillon-dock',
    offer: [
      'Every sailor who lands gets a Part. One note on a brass reed. You sing it at the Hours, and nothing else.',
      'If you sing anything else, the Tuners take the voice. Up the hill, into the Organ. For good.',
      'Go to the customs house before they come and find you. Wren is at the counter. She is not the worst of them.',
    ],
    accept: [
      'The grey house with the red door, by the landing. There is a queue rail. Stand behind it. Do not hum.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: 'carillon-customs',
          lines: [
            'Name? Never mind. Your Part. — Here. Pin it at the collar. ...Look at it. Go on, look.',
            'It is blank. I did not stamp it. I have stamped four hundred and I did not stamp yours. My hand stopped.',
            'Vespers is soon. Stand on the singing-mark under the tower and sing what you like. Or do not. I am busy.',
          ],
        },
        hint: 'Collect your Part from Wren Quaver at the Tuners\' customs house',
      },
      {
        objective: { kind: 'visit', area: 'carillon', at: { x: 1560, y: 1130 }, r: 90, label: 'The singing-mark' },
        hint: 'Stand on the singing-mark under the carillon tower at the Hour',
      },
      {
        objective: {
          kind: 'duel', area: 'carillon',
          foe: {
            id: 'carillon-given-a-part-duel', court: 'carillon', name: 'Off the Score',
            foeName: 'Tuner Semitone', foeElement: 'sound', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 1400, y: 1180 }, coins: 90,
            look: { body: 0xb8a890, accent: 0x8a2a2e, hat: 'bandmaster', traits: ['tool', 'glasses'], size: 1.15, eye: 0xe0c070 },
            challenge: [
              'That was not a note. That was not any note. Where is your reed? — Blank. Blank! Who gave you a blank?',
              'Never mind. I have a fork. I strike it, I listen, and I take what is out of tune. Hold still.',
              'It does not hurt. You will hear it at Compline for ever. Everybody says it is quite beautiful.',
            ],
            beaten: ['My fork is bent. It hums flat. ...Keep your note, then. Sing it where I cannot hear it.'],
          },
        },
        hint: 'Tuner Semitone heard you sing off the Score — stand your ground',
      },
    ],
    complete: [
      'You sang on the mark at the Hour, and Semitone went up the hill with a bent fork. On your first day!',
      'Now you know what a note costs here. Six first chairs keep the Score, up those three roads. North is gentlest.',
      'Take this. It is the fine they would have charged me for listening. I would rather it went to you.',
    ],
    reward: { orbs: 10, coins: 60 },
  },

  // ── 2. Supper Between the Hours ───────────────────────────────────
  {
    id: 'carillon-supper', area: 'carillon', name: 'Supper Between the Hours', giver: 'carillon-tackle',
    offer: [
      'My mother has not eaten at a table with me in eleven years. Not since they took her voice.',
      'Eating together is talk, the wardens say. Talk is noise. The muted eat alone, at the window.',
      'Tonight, after Compline, I want to give her a Compline Pie at her own table. Will you fish it for me?',
    ],
    accept: [
      'Two chimefish and a bellmouth. Fish off the east jetty — press E at the water and wait for the ring.',
      'Marta at the Rising Loaf bakes the pie. Then take it to Mother. Her door is the one with the white ribbon.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-chimefish', count: 2 },
        hint: 'Catch 2 Chimefish off the east jetty or the landing',
      },
      {
        objective: { kind: 'fish', fish: 'fish-bellmouth', count: 1 },
        hint: 'Catch a Bellmouth (they boom in the deeper water)',
      },
      {
        objective: { kind: 'cook', recipe: 'recipe-carillon-compline-pie' },
        hint: 'Have the Rising Loaf bake a Compline Pie (2 Chimefish, 1 Bellmouth)',
      },
      {
        objective: {
          kind: 'deliver', npc: 'carillon-hester', item: 'meal-carillon-compline-pie', count: 1,
          lines: [
            '(She looks at the pie, then at you, and puts both hands flat on her heart.)',
            '(She signs: a table, two chairs, a son. She lays the plates very slowly so they do not clink.)',
            '(Then she stops, and points out of the window. A lantern, earmuffs, a book. A warden.)',
          ],
        },
        hint: 'Bring the Compline Pie to Hester Fathom, the house with the white ribbon',
      },
      {
        objective: {
          kind: 'duel', area: 'carillon',
          foe: {
            id: 'carillon-supper-duel', court: 'carillon', name: 'Noise After Compline',
            foeName: 'Warden Ambrose Lull', foeElement: 'silence', difficulty: 4, hpMult: 1,
            gimmick: '', at: { x: 2330, y: 1060 }, coins: 95,
            look: { body: 0xb0a8a0, accent: 0x5a5a6a, hat: 'earmuffs', traits: ['lantern', 'book'], size: 1.1, eye: 0xd8e0f0 },
            challenge: [
              'Two places laid. After Compline. At a muted woman\'s table. That is a gathering. A gathering is noise.',
              'I have the fine written already. Look. Ten silver, and the son to the Quiet House for a week.',
              'Do not raise your voice. Nobody raises their voice to me. Then again, nobody raises their voice at all.',
            ],
            beaten: ['...My lantern is out. Fine. Eat your pie. I heard nothing. I never hear anything. That is the job.'],
          },
        },
        hint: 'Warden Lull is outside Hester\'s door with his fine-book — send him off',
      },
    ],
    complete: [
      'We ate it all. At the table. She signed the whole time and I talked with my mouth full. Like when I was small.',
      'Fisher\'s pay, and more than that. Come to supper. Any night. We will be very, very quiet. Probably.',
    ],
    reward: { orbs: 11, coins: 70 },
  },

  // ── 3. The Note Not in the Score ──────────────────────────────────
  {
    id: 'carillon-wrong-note', area: 'carillon', name: 'The Note Not in the Score', giver: 'carillon-founder',
    requires: { questDone: 'carillon-given-a-part' },
    offer: [
      'Forty years I have cast bells in the Score\'s keys. And I have always wanted to cast one note that is not.',
      'Not a famous note. Just one between two others. The note my father whistled at the furnace.',
      'I cannot use Tuner metal — they count it. But old bells wash up on this Quay. Wrecked ships\' bells. Free.',
    ],
    accept: [
      'Along the quay and out on the west mole. Bits of bell. Green as a gull\'s egg. Four ought to do a handbell.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'carillon', label: 'wrecked bell-metal', emoji: '🔔', color: 0x5aa894,
          spots: [{ x: 240, y: 1220 }, { x: 345, y: 1380 }, { x: 1800, y: 1230 }, { x: 2480, y: 1230 }],
        },
        hint: 'Gather 4 pieces of wrecked bell-metal along the quay and the west mole',
      },
      {
        objective: {
          kind: 'talk', npc: 'carillon-founder',
          lines: [
            'Into the crucible — all four. Ship\'s bronze, sea-cured. It pours like honey. Into the pit. There.',
            'An hour to cool. — Now. Listen. — There. That note. It is not in the Score. It is my father\'s.',
            'And there he is: the Assayer, down from the Brass Court with his fork. He heard it from the road.',
          ],
        },
        hint: 'Bring the metal to Mother Clapperton at the casting pit',
      },
      {
        objective: {
          kind: 'duel', area: 'carillon',
          foe: {
            id: 'carillon-wrong-note-duel', court: 'carillon', name: 'Assay of the Bell',
            foeName: 'Assayer Ostin Forke', foeElement: 'metal', difficulty: 4, hpMult: 1.05,
            gimmick: '', at: { x: 830, y: 1010 }, coins: 100,
            look: { body: 0x9a8a78, accent: 0xd8b048, hat: 'helmet', traits: ['tool', 'apron', 'glasses'], size: 1.25, eye: 0xf8e090 },
            challenge: [
              'Clapperton. I strike my fork. I strike your bell. They do not agree. One of them is wrong. Not my fork.',
              'A bell off the Score is a lie told in bronze. I break lies. I have a hammer for it.',
              'Out of my way, visitor. Or I will strike you, and listen, and find out what key you are in.',
            ],
            beaten: ['My fork — in the pit. It is melting into her bell. ...Then it agrees with her now. Damn it.'],
          },
        },
        hint: 'Assayer Forke has come to smash the bell — stop him',
      },
    ],
    complete: [
      'He went up the north road holding his ear. And the bell is whole. A wrong bell, on Choirholm. Mine.',
      'I will hang it in the yard where the wind can find it. Take this for the metal. Founder\'s rates. Generous.',
    ],
    reward: { orbs: 12, coins: 90 },
  },

  // ── 4. Fair Copy ──────────────────────────────────────────────────
  {
    id: 'carillon-fair-copy', area: 'carillon', name: 'Fair Copy', giver: 'carillon-hymnal',
    requires: { questDone: 'carillon-given-a-part' },
    offer: [
      'There was a song they sang in the market here. Not the Score. Lark Halloway\'s song. You will have seen her.',
      'When the Tuners took her voice, they tore her songbook up on the quay. The wind took the pages.',
      'People kept them. Tucked in walls, under stones. If I had the pages I could set it. Fold it inside the Score.',
    ],
    accept: [
      'Five pages, all over the Quay and the terraces. Soft old paper, music on it. Bring them to the stall.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: 'carillon', label: 'page of the market song', emoji: '📜', color: 0xf2ead2,
          spots: [{ x: 620, y: 700 }, { x: 1180, y: 470 }, { x: 2300, y: 500 }, { x: 1780, y: 1010 }, { x: 150, y: 880 }],
        },
        hint: 'Find 5 torn pages of the market song hidden round the Quay and the upper terrace',
      },
      {
        objective: {
          kind: 'talk', npc: 'carillon-hymnal',
          lines: [
            'All five. Look at her hand — the notes lean forward, like they are running for a boat.',
            'Set in type, inked, pulled. One sheet of the Score, folded — and the market song inside it. There.',
            'And there is a black coat coming down the stair with a red pen. A Corrector. Somebody told.',
          ],
        },
        hint: 'Bring the pages to Pim Staveley at the hymn-sheet stall',
      },
      {
        objective: {
          kind: 'duel', area: 'carillon',
          foe: {
            id: 'carillon-fair-copy-duel', court: 'carillon', name: 'Erratum',
            foeName: 'Corrector Prudence Erratum', foeElement: 'paper', difficulty: 5, hpMult: 0.95,
            gimmick: '', at: { x: 1720, y: 900 }, coins: 105,
            look: { body: 0xd0c0a8, accent: 0x1c1a24, hat: 'tophat', traits: ['book', 'glasses', 'scarf'], size: 1.0, eye: 0xc83a3a },
            challenge: [
              'A hymn sheet. Licensed. And folded inside it — an erratum. Forty bars of erratum, in a muted woman\'s hand.',
              'I correct errata. With this. The red pen. One line, and the song is not wrong any more. It is gone.',
              'Hand me the sheets, printer. And you, visitor — stand aside, or be struck through yourself.',
            ],
            beaten: ['My pen is dry. ...Fine. Let it stand. It is only a song. ...It is a good song. I hate that.'],
          },
        },
        hint: 'Corrector Erratum is at the stall with her red pen — keep her off the sheets',
      },
    ],
    complete: [
      'She went off up the north road with a dry pen and a sheet of the market song in her pocket. I saw her take it.',
      'Every hymn sheet I sell has it folded inside now. The Score on the front. Lark\'s song on the back.',
      'Here. Printer\'s wages. And the first fair copy — give it to Lark, if you see her. She will want to hold it.',
    ],
    reward: { orbs: 12, coins: 80 },
  },

  // ── 5. Ring the Changes ───────────────────────────────────────────
  {
    id: 'carillon-ring-the-changes', area: 'carillon', name: 'Ring the Changes', giver: 'carillon-ringer',
    requires: { princesOfIsle: 'sound', count: 2 },
    offer: [
      'Fifty years I have rung the same peal at the same second. And for fifty years, one bell has rung wrong.',
      'The old buoy at the end of the east jetty. Cast before the Score. Its note is not in it. Nobody fixed it.',
      'I want to ring that note from the tower. Once. At Vespers, in the middle of the Score. Go and listen to it.',
    ],
    accept: [
      'Out to the end of the east jetty. Wait for a swell. Listen. Then come and hum it to me — quietly.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: 'carillon', at: { x: 2080, y: 1400 }, r: 70, label: 'The old bell-buoy' },
        hint: 'Listen to the old bell-buoy at the end of the east jetty',
      },
      {
        objective: {
          kind: 'talk', npc: 'carillon-ringer',
          lines: [
            'That? Hum it again. — Yes. Yes, that is it. Between the third bell and the fourth. Nobody\'s note.',
            'I can get it from the tower if I ring the third and fourth together, half a beat apart. Like this.',
            'And here comes Tempo. The Maestro\'s timekeeper. He counts every peal. He has counted that I am late.',
          ],
        },
        hint: 'Hum the buoy\'s note to Old Tobiah Peal at the tower foot',
      },
      {
        objective: {
          kind: 'duel', area: 'carillon',
          foe: {
            id: 'carillon-ring-the-changes-duel', court: 'carillon', name: 'Half a Beat Late',
            foeName: 'Timekeeper Strickland Tempo', foeElement: 'sand', difficulty: 5, hpMult: 1.05,
            gimmick: '', at: { x: 1560, y: 1160 }, coins: 120,
            look: { body: 0xa8a090, accent: 0x2a2a3a, hat: 'tophat', traits: ['cane', 'glasses'], size: 1.2, eye: 0xe0c070 },
            challenge: [
              'Peal. Vespers is at the seventeenth stroke of the sixth hour. Your third bell was half a beat late.',
              'Half a beat. Do you know what half a beat is? It is the start of every wrong note there has ever been.',
              'Stand aside, visitor. I am going to wind him back to time. I have a key for it. It is very large.',
            ],
            beaten: ['My metronome... it has stopped. On the off-beat. ...Ring it, then. I will not be counting.'],
          },
        },
        hint: 'Timekeeper Tempo has come to wind the ringer back to time — stop him',
      },
    ],
    complete: [
      'I rang it. In the middle of Vespers. One wrong note from the tower, and the whole Quay stopped to listen.',
      'A hundred people, mouths open, not singing. You could hear the sea. Then they sang on. But they heard it.',
      'Ada cast me a little bell in the same sort of note. I want you to have it. Ring it at the wrong moment.',
    ],
    reward: { orbs: 14, coins: 150, item: 'charm-carillon-wrong-bell' },
  },
];
