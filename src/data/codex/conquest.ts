import { ElementCodex } from '../AbilityCodex';

/**
 * Emotion — the commander with the flag (element id `conquest`; it replaced Conquest 2026-11-25).
 *
 * Verified against `src/elements/conquest.ts` and `kits/EmotionKit.ts`. Every number below is a
 * constant at the top of the kit. No upgrades, perks or mastery yet.
 */
const conquest: ElementCodex = {
  identity:
    'A commander with a pike and a flag, and an army that feels what he tells it to. Rile knights '
    + 'out of the floor and drag them where you want them, make the enemy cry, and charge past your '
    + 'own soldiers to send them ecstatic.',

  passives: [
    {
      emoji: '⚔️',
      name: 'Soldiers',
      basics:
        'Your troops are real bodies: anything that can hit you can hit them. Each holds a post and '
        + 'attacks any enemy that comes near it. Click a soldier and drag to give it a new post, or '
        + 'drop it on an enemy to send it after them until one of the two is dead.',
      effects: [
        { tag: 'summon', label: 'Knight', detail: '30 HP, 105 speed. Slashes every enemy in front of it for 4 every 0.8s. Guards 190px round its post.' },
        { tag: 'summon', label: 'Archer', detail: '8 HP, 62 speed. Looses a 5 damage arrow every 1.5s from up to 290px, after a 0.45s draw it stands still for.' },
        { tag: 'summon', label: 'Barbarian', detail: '60 HP, 48 speed. Swings for 8 every 0.55s. Every buff it is given is doubled.' },
        { tag: 'buff', label: 'Rage potion', detail: 'At 25% HP (15) the Barbarian stops for 0.6s to drink: 60% faster swings and 3 HP a second from then on.' },
        { tag: 'utility', label: 'Orders', detail: 'Hold the click on a soldier and drag. Released within 20px of an enemy: it chases that enemy anywhere. Released on open floor: that is its new post.' },
        { tag: 'utility', label: 'Squads', detail: 'Soldiers within 70px of one another, chained down the rank, take the order together. Moved to open floor they keep their formation; dropped on an enemy they all chase it.' },
        { tag: 'utility', label: 'Cap', detail: '12 soldiers at once. A thirteenth retires your oldest knight.' },
      ],
      notes: [
        'A soldier chasing somebody ignores everyone else on the way. One guarding a post gives up the chase 50px past its 190px.',
        'Soldiers fall with their commander.',
      ],
    },
  ],

  abilities: {
    'emotion-stab': {
      basics:
        'Thrust your pike — a red flag with golden swords on it — toward the cursor. It deals 14 '
        + 'damage to everything on the line, soldiers included. The same button picks up your own '
        + 'soldiers: press on one and drag to give it an order.',
      cast: 'Click or hold, aimed with the cursor. 0.6s cooldown. A press that lands on one of your soldiers drags it instead of stabbing.',
      effects: [
        { tag: 'damage', label: 'Thrust', detail: '14 damage to every enemy within 9px of a 210px line.' },
        { tag: 'utility', label: 'Pierces', detail: 'Does not stop at the first body: 1 thrust can hit any number of enemies.' },
      ],
    },

    'emotion-rile': {
      basics:
        'Raise the flag and wave it. Three knights climb out of the floor in front of you — red '
        + 'eyes, steel armour, swords, 30 HP each — and slash any enemy that comes near them.',
      cast: 'E. The knights rise 0.45s after the wave, on the side your enemy is on, and take 0.5s to stand up. 9.4s cooldown.',
      effects: [
        { tag: 'summon', label: 'Knights', detail: '3 knights, 52px from you. 30 HP each; 4 damage a slash, every 0.8s.' },
        { tag: 'utility', label: 'They stay', detail: 'No timer: a knight lasts until it is killed. Up to 12 soldiers at once.' },
      ],
      notes: ['Everything else in the kit is worth more with knights standing: Euphoria and Maximum Nationalism both buff them.'],
    },

    'emotion-depress': {
      basics:
        'Throw your cape forward and a cone of cold goes with it. Enemies it catches take 8 damage '
        + 'and are Depressed for 8 seconds: they cry, move slower, their shots give up early, and '
        + 'they take more damage the more health you have than they do.',
      cast: 'R, aimed with the cursor. 10s cooldown.',
      effects: [
        { tag: 'damage', label: 'Cold', detail: '8 damage to every enemy in the cone.' },
        { tag: 'area', label: 'Cone', detail: '250px long, about 60° wide.' },
        { tag: 'debuff', label: 'Depressed', detail: '8s. A second cast restarts the 8s.' },
        { tag: 'control', label: 'Slower', detail: '25% slower movement.' },
        { tag: 'debuff', label: 'Short shots', detail: 'Their projectiles fizzle out 0.65s after they are fired.' },
        { tag: 'debuff', label: 'Outclassed', detail: 'Takes +0.5% damage for every 1% of health bar you have over them: +50% at your full bar against their empty one, nothing at all when they are the healthier.' },
      ],
      notes: [
        'The bonus damage is on everything that hits them — your pike, your soldiers, your slam.',
        'Short shots only reach ordinary projectiles. Beams, melee and things an ability places are not shortened.',
      ],
    },

    'emotion-euphoria': {
      basics:
        'Wind up for a second, then charge with the pike out in front of you, through everything in '
        + 'the way for 38 damage. Your soldiers near you when you go turn ecstatic for 4 seconds: a '
        + 'yellow outline, health above their maximum, and much faster movement and attacks.',
      cast: 'F. 1s wind-up at 15% speed — the aim follows the cursor until you go — then a 0.24s charge. Nothing else can be cast until it ends. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Run through', detail: '38 damage to every enemy within 24px of the charge, once each.' },
        { tag: 'movement', label: 'Charge', detail: '320px in 0.24s.' },
        { tag: 'buff', label: 'Ecstatic', detail: 'Soldiers within 220px of you as the charge starts, for 4s.' },
        { tag: 'heal', label: 'Borrowed health', detail: '+10 HP that can go over the maximum. Whatever is still over the maximum after the 4s is lost.' },
        { tag: 'buff', label: 'Faster', detail: '80% faster movement and 80% faster attacks.' },
        { tag: 'buff', label: 'Barbarian', detail: 'Doubled: +20 HP, 160% faster movement and attacks.' },
      ],
      notes: ['A soldier still climbing out of the floor is not caught by it.'],
    },

    'emotion-nationalism': {
      basics:
        'Pull out the grand standard and hold it over your head. While you hold it you cannot '
        + 'attack, but you take less damage and move faster, and soldiers near you deal more and '
        + 'take less. Press Q again to slam it into the floor for a large blast; it stays there and '
        + 'calls six more soldiers over six seconds.',
      cast: 'Q to raise it (ultimate: paid for with charge). Q again, after 0.35s, to slam. It slams by itself after 10s.',
      effects: [
        { tag: 'buff', label: 'Standard-bearer', detail: 'You take 35% less damage and move 30% faster while holding it. No Stab, Rile, Depress or Euphoria.' },
        { tag: 'buff', label: 'Rallied', detail: 'Soldiers within 230px of you deal 50% more damage and take 35% less.' },
        { tag: 'buff', label: 'Barbarian', detail: 'Doubled: 100% more damage, 70% less taken.' },
        { tag: 'damage', label: 'Slam', detail: '45 damage to every enemy within 170px.' },
        { tag: 'summon', label: 'Muster', detail: 'One soldier a second for 6s at the planted standard: 3 knights, then 2 archers, then the Barbarian.' },
      ],
      notes: [
        'You can still drag soldiers while holding the standard.',
        'Slamming a second standard while the first is still calling makes the first hand over everyone it still owed at once.',
      ],
    },
  },
};

export default conquest;
