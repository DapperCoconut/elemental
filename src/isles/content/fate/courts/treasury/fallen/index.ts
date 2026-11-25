import type { FallenBundle } from '../../../../../IslesTypes';
import { fallenId } from '../../../../meteor/spec';
import { FALLEN_CASH_RAILWAY } from './cashRailway';
import { FALLEN_CROWNS } from './crowns';
import { FALLEN_POUR } from './pour';
import { FALLEN_ROULEAU } from './rouleau';
import { FALLEN_TRIP_PLATE } from './tripPlate';

/**
 * The Treasury Court's Fallen Five — in the star's telling, the people of the mint and the banks who
 * kept the King's money moving and never asked whose it was: the head cashier of Counting-House
 * Row, the mint's founder, the teller who stood the tithe in rows, the chute-boy who rolled the
 * sovereigns down to the vault, and the warden of the strongroom floor where the Lot Register lies.
 * Tier 2: difficulty 4,4,5,5,5; coins double the court's 110. They stand where the court's own
 * five never do: the row's back street, the mint's west yard, the square's south-east lawn, the
 * vault's east step, and the far bank below the bridge.
 */

const EYE = 0xffa040;
const COINS = 220;

export const FALLEN: FallenBundle = {
  gimmicks: [FALLEN_CASH_RAILWAY, FALLEN_POUR, FALLEN_ROULEAU, FALLEN_CROWNS, FALLEN_TRIP_PLATE],
  encounters: [
    {
      id: fallenId('treasury', 'cash-railway'),
      court: 'treasury',
      name: 'The Cash Railway',
      foeName: 'Head Cashier Euphrasia Trundle',
      foeElement: 'technology',
      difficulty: 4,
      hpMult: 1.1,
      gimmick: fallenId('treasury', 'cash-railway'),
      at: { x: 760, y: 1420 },
      look: { body: 0xe0c4a8, accent: 0x2a5a3c, hat: 'visor', traits: ['glasses', 'book'], size: 0.95, eye: EYE },
      challenge: [
        'Every wage on the Row comes down my wires. I hear a light cup before it leaves the desk. I always have.',
        'Short again, the Pellows. Short again. Pull the cord, Euphrasia. The cup knows the way to the bailiff.',
        'Mind your head, dear. The wires run lower than you think, and they never once run your way.',
      ],
      beaten: [
        'The cups... we sent change in them. Change, back to the counter, for the children\'s sweets. Didn\'t we?',
        'I pulled a cord for a bailiff? I can\'t have. My wires only ever ran to the sweetshop and back.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('treasury', 'pour'),
      court: 'treasury',
      name: 'The Pour',
      foeName: 'Founder Hezekiah Crozzle',
      foeElement: 'fire',
      difficulty: 4,
      hpMult: 1.15,
      gimmick: fallenId('treasury', 'pour'),
      at: { x: 230, y: 620 },
      look: { body: 0xa88870, accent: 0x3a3434, hat: 'goggles', traits: ['apron', 'tool', 'beard'], size: 1.3, eye: EYE },
      challenge: [
        'Wedding rings. Thimbles. A christening cup with a name on. It all runs the same once it\'s hot enough.',
        'The crown wants bars, and bars don\'t remember who they were. That\'s the beauty of the melt, see.',
        'Stand in the moulds if you like. You\'d make a fine ingot. Nobody would ask whose.',
      ],
      beaten: [
        'Whose cup was that... I gave it back. I gave them all back, didn\'t I? Before the pour?',
        'My ladle\'s cold. It\'s been cold for years. I only ever cast the church bell. Once.',
      ],
      coins: COINS,
    },
    {
      id: fallenId('treasury', 'rouleau'),
      court: 'treasury',
      name: 'Stood on Edge',
      foeName: 'Teller Columbine Sixpenny',
      foeElement: 'magic',
      difficulty: 5,
      hpMult: 1.1,
      gimmick: fallenId('treasury', 'rouleau'),
      at: { x: 1700, y: 1060 },
      look: { body: 0xecd2b8, accent: 0x5a2a30, hat: 'beret', traits: ['glasses', 'satchel'], size: 0.9, eye: EYE },
      challenge: [
        'Forty to a row, on their rims, so the clerks can count the tithe with one look. I never drop a one.',
        'A family short by a coin leaves a gap in my row, and a gap is very easy to see. I make sure they see it.',
        'Do keep still. A row is ever so steady, right up until somebody touches it.',
      ],
      beaten: [
        'I stood coins on edge for the children, at the fair. One penny a go to knock the row down. Didn\'t I?',
        'There never was a gap. I only ever counted to make the little ones laugh. Why did I count for him?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('treasury', 'crowns'),
      court: 'treasury',
      name: 'Runaway Sovereigns',
      foeName: 'Chute-Hand Tobit Rimwell',
      foeElement: 'rubber',
      difficulty: 5,
      hpMult: 1.2,
      gimmick: fallenId('treasury', 'crowns'),
      at: { x: 2260, y: 1250 },
      look: { body: 0xd4b090, accent: 0x3a3f4a, hat: 'cap', traits: ['scarf', 'tool'], size: 0.8, eye: EYE },
      challenge: [
        'Give \'em a lean, and they\'ll curl round any corner in the mint, right down the chute to the vault.',
        'One rolled over a debtor\'s boy on the bridge once. Wasn\'t the sovereign\'s fault. Wasn\'t mine.',
        'Watch the chalk, if you can read it. Most folk can\'t. They just hear the ringing coming.',
      ],
      beaten: [
        'I raced hoops down Mint Hill with Tam and Ossie. Hoops, not coins. We had no coins at all.',
        'I never rolled a sovereign. I\'ve never held one. Why do my hands know the lean?',
      ],
      coins: COINS,
    },
    {
      id: fallenId('treasury', 'trip-plate'),
      court: 'treasury',
      name: 'Trip-Plate',
      foeName: 'Strongroom-Warden Leocadia Brassey',
      foeElement: 'electricity',
      difficulty: 5,
      hpMult: 1.25,
      gimmick: fallenId('treasury', 'trip-plate'),
      at: { x: 1850, y: 560 },
      look: { body: 0xc8b8a4, accent: 0x141218, hat: 'shako', traits: ['lantern', 'cane'], size: 1.1, eye: EYE },
      challenge: [
        'The Lot Register lies past my floor. Families come at night to look up their own numbers. I hear them.',
        'Every plate is wired to the walls. I know which by heart. You will learn which by the smell.',
        'Walk softly. Or don\'t. The bell is honest either way.',
      ],
      beaten: [
        'I let them in. The Hobsons, the widow Carse. I held the lantern so they could read their numbers.',
        'There was never any wiring. Only me, and a bell I never rang. Why does the floor remember it?',
      ],
      coins: COINS,
    },
  ],
};
