import type { QuestDef } from '../../../../IslesTypes';
import { HORN_TOWER, PENS, ROYAL_STAND } from './areaArt';
import {
  NPC_BURDOCK, NPC_FEWTRELL, NPC_GRIMBLE, NPC_MAB, NPC_OTTILIE, NPC_PIP, NPC_SORREL,
  Q_HOUND, Q_LASTRUN, Q_PENS, Q_RING, Q_TRAPS,
} from './npcs';

/**
 * Five small stories from the Wildhunt: a grandmother's household got out of the Quarry Pens the
 * back way; a wedding ring a Reeve threw in the ford "as a pledge" and a pike swallowed; an old
 * hound who will not run people, and the Kennelmaster who means to put her down; the mantraps the
 * Verderer laid in the deer park for quarry who run too well; and the Last Run of the season,
 * stopped before the horn can call it — by going to Fangholt and facing the Prince.
 */

const AREA = 'wildhunt';

export const WILDHUNT_QUESTS: QuestDef[] = [
  {
    id: Q_PENS, area: AREA, name: 'The Open Pen', giver: NPC_BURDOCK,
    offer: [
      'My son\'s household is in that pen. Wren\'s in there. They run in the Last Run, when the season turns.',
      'The front gate\'s chained and the Pen-Warden has the key. But the pens were built cheap, years ago.',
      'Pip — the kennel boy — says the back stakes only stand because of the wedges. He sees everything, Pip.',
      'Will you ask him? I\'m too old to be seen asking.',
    ],
    accept: [
      'He\'s at the kennels, out past the cottages. Don\'t let the Warden see you talking to him.',
    ],
    stages: [
      {
        objective: {
          kind: 'talk', npc: NPC_PIP,
          lines: [
            'The back wedges? Three of them. Oak pegs holding the stake-rail. The Warden kicks them every night to check.',
            'If you knock them all out the back rail just leans. Somebody small could get through. Wren\'s small.',
            'Do it at dusk, when he\'s at the front counting. He counts slow. He likes it.',
          ],
        },
        hint: 'Ask Pip Larrow at the kennels how the Quarry Pens are built',
      },
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Stake-wedge', emoji: '🪵', color: 0x8a6a44,
          spots: [{ x: PENS.x + 20, y: PENS.y - 26 }, { x: PENS.x + PENS.w / 2 + 10, y: PENS.y - 26 }, { x: PENS.x + PENS.w - 16, y: PENS.y - 26 }],
        },
        hint: 'Knock out the 3 wedges behind the Quarry Pens',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'wildhunt-the-open-pen-duel', court: AREA, name: 'Count of a Hundred',
            foeName: 'Pen-Warden Gallowglass', foeElement: 'bind', difficulty: 3, gimmick: '',
            at: { x: PENS.x + PENS.w / 2 + 40, y: PENS.y + PENS.h + 70 },
            look: { body: 0xa89a8a, accent: 0x2a2a22, hat: 'helmet', traits: ['lantern', 'tool'], size: 1.2, eye: 0xd8d8a0 },
            challenge: [
              'The back rail is LEANING. Quarry are counted, stranger. Every head, every night. I am one short.',
              'Bring her back or take her place. I have a spare cap. I always have a spare cap.',
            ],
            beaten: ['Short in the count... Write it down as the hounds, then. Everyone always believes the hounds.'],
            coins: 60,
          },
        },
        hint: 'Stop Pen-Warden Gallowglass at the front of the Quarry Pens',
      },
    ],
    complete: [
      'They came out the back, one at a time, Wren first. She still had the cap on. She wouldn\'t take it off.',
      'She said: "If I take it off they\'ll know I\'m not brave." I told her she could keep it. Take this. Please.',
    ],
    reward: { orbs: 6, coins: 40 },
  },
  {
    id: Q_RING, area: AREA, name: 'The Ring in the Pike', giver: NPC_OTTILIE,
    offer: [
      'When we came up short, Reeve Gildersleeve took Tobin\'s wedding ring "as a pledge against the weight".',
      'Then he threw it in my ford. "The river will keep it till you make weight." He laughed.',
      'There\'s an old antler pike in the pool that takes anything bright. If he took the ring, it\'s still in him.',
      'Catch him for me? I can\'t — I\'d just sit on the bank and shake.',
    ],
    accept: [
      'Fish the pool below the stones. He lies deep and fights like a stag. Bring him to me whole.',
    ],
    stages: [
      {
        objective: { kind: 'fish', fish: 'fish-antler-pike', count: 1 },
        hint: 'Catch an Antler Pike in the Ford pool',
      },
      {
        objective: {
          kind: 'deliver', npc: NPC_OTTILIE, item: 'fish-antler-pike', count: 1,
          lines: [
            'Look at the size of him. Hold him still — there. There! Gold, in his belly. Tobin\'s ring.',
            'Oh, I could sing. I won\'t. Somebody\'d hear and tell Ambrose at the Larder, and he\'d tell the Reeve.',
          ],
        },
        hint: 'Bring the Antler Pike to Ottilie Wade at the Ford',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_FEWTRELL,
          lines: [
            'You have — the Wade pledge? Out of the river? That is... irregular. I must enter it. I am obliged.',
            'The Reeve will want it back. He comes to the Ford at the Larder\'s closing to wash his hands.',
            'I have told you that by accident. I am a very careless clerk. Please go away now.',
          ],
        },
        hint: 'See what Ambrose Fewtrell at the Game Larder will write down',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'wildhunt-ring-in-the-pike-duel', court: AREA, name: 'Pledge Forfeit',
            foeName: 'Reeve Gildersleeve', foeElement: 'fortune', difficulty: 3, gimmick: '',
            at: { x: 1600, y: 960 },
            look: { body: 0xd8b898, accent: 0x6a5a1a, hat: 'tophat', traits: ['book', 'satchel'], size: 1.15 },
            challenge: [
              'A pledge recovered before the weight is made is a pledge FORFEIT. To me. Hand over the ring.',
              'Gold does not belong on a hunter\'s finger. It belongs in a ledger. Mine has a lock.',
            ],
            beaten: ['My ledger... is wet. Strike the Wade household. Strike it all. I\'m going to lie down.'],
            coins: 60,
          },
        },
        hint: 'Face Reeve Gildersleeve at the Ford before he takes the ring',
      },
    ],
    complete: [
      'Tobin cried when I put it on his finger. Twenty-two years married and I\'ve never seen him cry.',
      'Then he fell in the ford trying to dance. I pulled him out. That\'s my job. Here — this is yours.',
    ],
    reward: { orbs: 5, coins: 45 },
  },
  {
    id: Q_HOUND, area: AREA, name: 'Bramble Won\'t Hunt', giver: NPC_PIP,
    offer: [
      'Bramble ran in the last hunt. She caught up with a little boy in a cap. And then she just lay down by him.',
      'She licked his face and wouldn\'t move. The hunters had to go round. The boy got away.',
      'The Kennelmaster says a hound that won\'t run people is put down at dawn. Tomorrow\'s dawn.',
      'Her paw\'s cut from the run. If she could walk on it I\'d take her somewhere. Will you help?',
    ],
    accept: [
      'Comfrey. Knitbone, Mab calls it. It grows in the shade round the cottages. Three bunches, please.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Comfrey', emoji: '🌿', color: 0x5a8a3e,
          spots: [{ x: 150, y: 1190 }, { x: 380, y: 1430 }, { x: 640, y: 1420 }],
        },
        hint: 'Gather 3 bunches of comfrey in the shade round the hunters\' cottages',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_MAB,
          lines: [
            'Comfrey for a hound? Give it here. Bruise it, wrap it, bind it with a strip of my apron. There.',
            'Tell the boy to keep her off it a day. And tell Ironsides, if he asks, that I\'ve never seen you.',
            'Here — a knuckle-bone for her. Don\'t look at me so. I liked that dog before I liked most people.',
          ],
        },
        hint: 'Ask Mab Cleaver at the Long Hall to make a comfrey poultice',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'wildhunt-bramble-wont-hunt-duel', court: AREA, name: 'At Dawn',
            foeName: 'Kennelmaster Ironsides', foeElement: 'metal', difficulty: 3, gimmick: '',
            at: { x: 560, y: 1140 },
            look: { body: 0x9a7a62, accent: 0x3a3e44, hat: 'cap', traits: ['tool', 'eyepatch'], size: 1.3, hand: 0x2a2a2a },
            challenge: [
              'Poultice on a cull. Lovely. Out of the way. A hound that won\'t run quarry is a hound that will run off.',
              'I\'ve a chain for her and a chain for you. Choose which end you want.',
            ],
            beaten: ['Keep the soft cur. Keep the lot of them. They never loved me anyway. I fed them every day.'],
            coins: 60,
          },
        },
        hint: 'Stand between Kennelmaster Ironsides and Bramble at the kennels',
      },
    ],
    complete: [
      'Bramble got up! She walked all the way to my cot on three legs and then flopped. She\'s a good girl.',
      'I don\'t know what I\'d have done. I do know. Nothing. Thank you. I\'ve only got this, but it\'s yours.',
    ],
    reward: { orbs: 5, coins: 30 },
  },
  {
    id: Q_TRAPS, area: AREA, name: 'Iron in the Grass', giver: NPC_GRIMBLE,
    offer: [
      'Verderer Flint\'s laid mantraps in the deer park. Iron jaws, under the grass, on the run the quarry take.',
      'Not for deer. For people who run too fast for the hounds. A family that gets far enough, he says, cheats.',
      'Each trap\'s got a pin. Pull the pin and it\'s just iron. Four of them. I\'d do it, but I\'m known.',
    ],
    accept: [
      'In through the gate by Sorrel. Watch the grass — where it\'s too green, there\'s iron under it.',
    ],
    stages: [
      {
        objective: {
          kind: 'collect', area: AREA, label: 'Trap-pin', emoji: '📌', color: 0x5a5a58,
          spots: [{ x: 920, y: 1250 }, { x: 1180, y: 1450 }, { x: 860, y: 1410 }, { x: 1150, y: 1240 }],
        },
        hint: 'Pull the pins from 4 mantraps inside the deer park',
      },
      {
        objective: {
          kind: 'talk', npc: NPC_SORREL,
          lines: [
            'You\'ve pulled Flint\'s pins? He\'ll know. He walks the run at dusk to see what\'s caught.',
            'He\'ll be coming in by the high seat. He always stops there to load. He likes them to hear him load.',
          ],
        },
        hint: 'Tell Sorrel Hartley at the park gate what you\'ve done',
      },
      {
        objective: {
          kind: 'duel', area: AREA,
          foe: {
            id: 'wildhunt-mantraps-duel', court: AREA, name: 'Load and Present',
            foeName: 'Verderer Flint', foeElement: 'gunpowder', difficulty: 4, gimmick: '',
            at: { x: 1180, y: 1360 },
            look: { body: 0xc8a486, accent: 0x2a4a2a, hat: 'tricorn', traits: ['pack', 'scarf'], size: 1.1 },
            challenge: [
              'My traps are EMPTY. Pins on the grass. Somebody\'s been helping the quarry cheat.',
              'Powder, ball, wadding. You\'ll do for the bag. The Prince pays by the head.',
            ],
            beaten: ['Misfire. Misfire. Every one... I\'m going home. I\'m taking the long way, round the traps.'],
            coins: 60,
          },
        },
        hint: 'Face Verderer Flint by the high seat in the deer park',
      },
    ],
    complete: [
      'Pins. Four of \'em. And Flint\'s powder horn, by the look. You\'re a better poacher than I ever was.',
      'Families run the park clean now, if they have to. That\'s not nothing. Take this, it\'s honest coin.',
    ],
    reward: { orbs: 6, coins: 40 },
  },
  {
    id: Q_LASTRUN, area: AREA, name: 'The Last Run', giver: NPC_SORREL,
    requires: { questDone: Q_PENS },
    offer: [
      'The Burdocks got out. Good. But the season turns in three days and the Last Run will still be called.',
      'New families. New caps. Halloo\'s horn calls it from the tower, and the Prince rides from Fangholt.',
      'If the horn can\'t sound, the hunt can\'t gather. If the hunt can\'t gather, the Prince has to come out himself.',
      'And then somebody has to be waiting. Will that be you?',
    ],
    accept: [
      'Cut the horn\'s lanyard at the top of the tower. Then go over the Ford and pull the Empress\'s pennant.',
      'After that, stranger, the Prince will come looking. He always does.',
    ],
    stages: [
      {
        objective: { kind: 'visit', area: AREA, at: { x: HORN_TOWER.x, y: HORN_TOWER.y + 40 }, r: 70, label: 'The horn\'s lanyard' },
        hint: 'Cut the great horn\'s lanyard at Halloo\'s tower on the north road',
      },
      {
        objective: { kind: 'visit', area: AREA, at: { x: ROYAL_STAND.x - 70, y: ROYAL_STAND.y + 60 }, r: 70, label: 'The Empress\'s pennant' },
        hint: 'Cross the Ford and pull down the pennant on the Empress\'s hunting stand',
      },
      {
        objective: { kind: 'prince', prince: 'fang' },
        hint: 'The horn is silent. Face Prince Fang at Fangholt',
      },
    ],
    complete: [
      'No horn. No hunt. No Last Run. I stood at the gate all night with nobody to count.',
      'I counted anyway. To a hundred. Then I opened the gate and left it open. Here — you earned more than this.',
    ],
    reward: { orbs: 8, coins: 100 },
  },
];
