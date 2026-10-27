import { ElementCodex } from '../AbilityCodex';

/**
 * String — the spider that weaves the arena shut.
 *
 * Verified against `src/elements/string.ts` and `kits/StringKit.ts`. Every number below is a
 * constant at the top of the kit. The five shop upgrades (2026-10-26) are constants in the kit's
 * "Shop upgrades" block. No passive, no mastery, no perks yet.
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
      upgrade: {
        basics:
          'Metal Spool: a click now throws one string, and holding it no longer keeps throwing — a steel '
          + 'spool winds up in your hand instead. After 2 seconds it fires a metal string at your cursor on '
          + 'its own, then starts winding the next. A metal string hooks and ties like any other, but it is '
          + 'braided steel: it lasts 20 seconds, stops 12 shots before it snaps, takes about four times the '
          + 'pushing or pulling to break and is never snapped by one hard shove. When it does go it lashes '
          + 'whoever broke it for 34. Plain strings are let go before it when you go over five.',
        effects: [
          { tag: 'utility', label: 'Spool', detail: 'Hold click 2s: a metal string fires on its own. Keep holding for another every 2s.', requiresUpgrade: 'click' },
          { tag: 'area', label: 'Metal string', detail: '20s. Stops 12 shots. 1040 strain to snap (a string: 260); no single shove snaps it.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Lash', detail: '34 damage to whoever finally breaks it.', requiresUpgrade: 'click' },
        ],
      },
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
      upgrade: {
        basics:
          'Bewitched Spiders: the spiders that land on your Hexing Strand come out bewitched — much smaller, '
          + 'ringed in purple, and they never bite. Instead, every 1.6 seconds or so each one spits a wad of '
          + 'web at the nearest enemy within 560px: 7 damage and a short slow. They last 20 seconds instead '
          + 'of 8. If the hex strand goes they hop onto another of your strings, or sit where they fell and '
          + 'keep spitting.',
        effects: [
          { tag: 'summon', label: 'Bewitched', detail: 'Spiders on the hex strand: small, no bite, 20s.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Web wad', detail: '7 damage, 480px/s, 560px range, every 1.6–2s per spider.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Webbed', detail: 'A wad slows to 60% for 1.2s.', requiresUpgrade: 'e' },
        ],
      },
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
      upgrade: {
        basics:
          'Spider Swing: pressing R again to snap the strand also swings you along it to its far end, on a '
          + 'dipping arc — to the wall it bit, or right up against the enemy it is tied to. The snap and '
          + 'its snare happen first, from where you stood. Use it to close in on a tied enemy or to get '
          + 'away across the arena. Only your own recast swings you — a strand shot through, or run out, does not.',
        effects: [
          { tag: 'movement', label: 'Swing', detail: 'To the strand\'s far end at ~1100px/s (0.22–0.56s). Stops just short of a tied body.', requiresUpgrade: 'r' },
        ],
      },
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
      upgrade: {
        basics:
          'Puppet Play: while someone is your puppet, every ability you use pulls their strings too — they '
          + 'use their own ability on the same key, for real, turned red and aimed at themselves. It is cast as '
          + 'yours from just in front of them, so it hits them and not you. Some abilities do not come out '
          + 'right: a heal or buff lands on you, a form or stance may do nothing, and effects that appear a '
          + 'moment later are not tinted. An ability driven entirely by its kit (nothing to cast) is a fixed '
          + 'hit instead. Linen Tomb ends the puppet, so a Q goes off as the silk closes.',
        effects: [
          { tag: 'damage', label: 'Their ability', detail: 'Their real ability on that key, cast at them as yours. Their cooldowns are untouched.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Stand-in', detail: 'For a kit-driven ability: Click 6, E/R/F 16, Q 30.', requiresUpgrade: 'f' },
        ],
      },
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
      upgrade: {
        basics:
          'Spinal Snap: Linen Tomb also hangs the whole arena in web — a faint wheel across the floor, thick '
          + 'webs in the corners and silk swags along every wall, with the grey, bloodless bodies of other '
          + 'elements hanging from the top of it. The web has 200 HP and every attack anyone makes tears at '
          + 'it, yours and theirs alike. When it breaks every enemy takes 35 damage and is Infested for 8 '
          + 'seconds: 70% speed, and every couple of seconds a spider crawls out of them. Brood spiders scuttle '
          + 'about erratically, climb onto any of your strings they cross and bite enemies they touch. In '
          + 'Invasion, where husks never cast, the damage they deal you tears the web instead.',
        effects: [
          { tag: 'area', label: 'Web', detail: '200 HP. Each attack tears it: Click 6, E/R/F 15, Q 30. Fades unbroken after 30s.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Snap', detail: '35 damage to every enemy when it breaks.', requiresUpgrade: 'q' },
          { tag: 'debuff', label: 'Infested', detail: '8s at 70% speed.', requiresUpgrade: 'q' },
          { tag: 'summon', label: 'Brood', detail: 'One every 1.8–2.7s from each host. 5s, 5 damage a bite (not on their host for 0.9s).', requiresUpgrade: 'q' },
        ],
      },
    },
  },
};

export default string;
