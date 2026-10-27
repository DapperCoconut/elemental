import { ElementCodex } from '../AbilityCodex';

/**
 * String — the spider that weaves the arena shut.
 *
 * Verified against `src/elements/string.ts` and `kits/StringKit.ts`. Every number below is a
 * constant at the top of the kit. No passive, no upgrades, no mastery, no perks yet.
 */
const string: ElementCodex = {
  identity:
    'A big velvet-black spider. Its taut strings hook enemies (where they strike) and walls and stay '
    + 'tied to it — bodies cannot pass them, and a string that snaps lashes whoever broke it. Spiders '
    + 'walk the web, a purple strand slows and snares, a control bar puts the enemy on your arrow keys, '
    + 'and Linen Tomb wraps them in silk in the middle of the arena.',

  abilities: {
    'string-snag': {
      basics:
        'Throw a heavy string at your cursor. It hooks the first enemy it reaches and ties them on a rope, '
        + 'or bites the wall. Either way the other end stays tied to you as you move. Enemies cannot walk '
        + 'through a string: pushing against one, or pulling past the end of the rope they are tied to, '
        + 'builds strain until it snaps and lashes them. An enemy shot that crosses a string is caught by '
        + 'it — and snaps it, lashing whoever fired.',
      cast: 'Click (hold to keep throwing). 0.7s cooldown.',
      effects: [
        { tag: 'damage', label: 'Hook', detail: '6 damage to an enemy it ties. 1250px/s, flies to the wall.' },
        { tag: 'control', label: 'Tied', detail: 'Hooked into the spot it struck. Rope is the distance they were caught at +12px (90–560px) — taut; past it they are hauled back.' },
        { tag: 'area', label: 'Strings', detail: 'Up to 5 at once for 12s each; a sixth lets go of the oldest.' },
        { tag: 'damage', label: 'Snap', detail: '16 damage to whoever broke it: 260 strain (px/s spent pushing or pulling, over time), or any push faster than 640px/s.' },
        { tag: 'utility', label: 'Catch', detail: 'An enemy shot crossing a string is destroyed and snaps it.' },
      ],
      notes: ['Shots right at your end of a string, or right at the end tied to someone, pass it by.'],
    },

    'string-spider-dance': {
      basics:
        'Five huge spiders climb onto your strands — strings, the hex strand and the tomb\'s guy-lines — '
        + 'and walk them back and forth, biting enemies they touch. A string tied to an enemy walks the '
        + 'spiders straight into them. If a strand snaps with a spider on it, the spider runs off in an '
        + 'erratic frenzy, still biting.',
      cast: 'E. 10s cooldown. Needs at least one strand out (refunded if there is none).',
      effects: [
        { tag: 'summon', label: 'Spiders', detail: '5, shared out over your strands, for 8s. 150px/s.' },
        { tag: 'damage', label: 'Bite', detail: '8 damage on touch, at most once per 0.55s per enemy.' },
        { tag: 'summon', label: 'Frenzy', detail: 'A spider whose strand goes runs wild at ~230px/s for 3s.' },
      ],
    },

    'string-hexing-strand': {
      basics:
        'Throw a thick purple strand instead of a string. Like a string it hooks an enemy or the wall and '
        + 'stays tied to you, but bodies walk straight through it — and are slowed while they touch it. It '
        + 'eats shots like a string but takes three to snap. Press R again to snap it yourself: everyone '
        + 'caught in it takes damage and a heavy, longer slow.',
      cast: 'R, then R again to snap. 9s cooldown.',
      effects: [
        { tag: 'debuff', label: 'Hexed', detail: '60% speed while touching it, and 0.7s after.' },
        { tag: 'area', label: 'Strand', detail: 'One at a time, 10s. A tied enemy counts as touching it.' },
        { tag: 'damage', label: 'Snap', detail: '22 damage to everyone within 40px of it (or tied to it).' },
        { tag: 'debuff', label: 'Snared', detail: '30% speed for 3.5s.' },
        { tag: 'utility', label: 'Shots', detail: 'Catches enemy shots; the third one snaps it (with the same snare).' },
      ],
    },

    'string-marionette': {
      basics:
        'Throw a control bar forward. The enemy it hits becomes your puppet: the bar hangs over them on '
        + 'four strings. They keep moving on their own, but while you hold the arrow keys their feet are '
        + 'yours and they walk where you steer — into your strings, your spiders, your hex strand.',
      cast: 'F, then the arrow keys. 14s cooldown.',
      effects: [
        { tag: 'damage', label: 'Bar', detail: '8 damage. 760px/s, 560px range.' },
        { tag: 'control', label: 'Puppet', detail: '5s. Held arrow keys walk them at 290px/s.' },
      ],
      notes: ['The puppet can still attack. A bot walks its puppet onto its spiders, or through its strings.'],
    },

    'string-linen-tomb': {
      basics:
        'The enemy nearest your cursor is pulled to the middle of the arena and wrapped in a silk cocoon '
        + 'strung to all four corners. The tomb has 100 HP and only their own attacks cut it. Until it '
        + 'breaks they cannot move, their shots go into the silk, and none of their damage reaches you. '
        + 'Trying to move tears at them — the faster they try, the more it hurts.',
      cast: 'Q. An ultimate: paid for in charge.',
      effects: [
        { tag: 'control', label: 'Tomb', detail: '100 HP. Each of their casts cuts it: Click 10, E/R/F 20, Q 35. Lets go after 12s regardless.' },
        { tag: 'buff', label: 'Out of reach', detail: 'Their hits on you are blocked while it stands.' },
        { tag: 'damage', label: 'Struggle', detail: '0.05 damage per px/s of attempted movement per second — a walk is ~11/s, a dash far more.' },
        { tag: 'area', label: 'Guy-lines', detail: '4 strands, one to each corner. Spiders walk them into the cocoon.' },
      ],
      notes: ['Husks never cast, so in Invasion what they would have done to you, and their shots, cut the silk instead.'],
    },
  },
};

export default string;
