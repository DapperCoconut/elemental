import { ElementCodex } from '../AbilityCodex';

/**
 * Fear — the gentleman in the mask, and the slasher under the suit (element id `silence`; it
 * replaced Silence 2026-11-24).
 *
 * Verified against `src/elements/silence.ts`, `kits/FearKit.ts` and `kits/FearMazeRun.ts`. Every
 * number below is a constant at the top of the kit. No upgrades, perks or mastery yet: every key
 * is marked `noUpgrade` so the old Silence shop upgrades still sitting on these keys are not
 * offered as an UPGRADED tab for abilities they do not reach.
 */
const silence: ElementCodex = {
  identity:
    'A dapper gentleman behind a white mask who never throws a punch himself. He plants phobias, '
    + 'fills the enemy with fear and drinks it — then, with enough fear on the field, Manifests '
    + 'into an invincible slasher with five keys of his own.',

  passives: [
    {
      emoji: '👁️',
      name: 'Fear',
      basics:
        'Every enemy carries a fear meter, 0 to 100, shown over their head. It never drains by '
        + 'itself. It feeds Reassurance, makes Massacre hit harder and is what Manifest needs. An '
        + 'enemy at 100 fear who is near you turns and runs, out of control and taking more damage.',
      effects: [
        { tag: 'utility', label: 'Sources', detail: 'Fear\'s Grasp 10 per claw, Gaze 22 a second (+30 on a jumpscare), Claustrophobia 2.5 a second (+20 from a trapped statue), a catch in the maze +25.' },
        { tag: 'control', label: 'Flee', detail: 'At 100 fear and within 170px of you: runs straight away from you for 2.5s at 110% of their own speed, with no control and no dodge roll.' },
        { tag: 'debuff', label: 'Running scared', detail: 'Takes 33% more damage from everything for the 2.5s.' },
        { tag: 'utility', label: 'Afterwards', detail: 'Fear drops to 60 and they cannot be routed again for 5s. Somebody frozen by a jumpscare does not run until it wears off.' },
        { tag: 'debuff', label: 'Dread', detail: 'From 60 fear up, the victim\'s own screen darkens at the edges, further the fuller the meter.' },
      ],
    },
    {
      emoji: '🥀',
      name: 'Reassurance',
      basics:
        'Stand next to a frightened enemy — or leave a phobia next to one — and a grey line drains '
        + 'them: damage to them, the same as healing to you, harder the more afraid they are. It '
        + 'does not use the fear up.',
      effects: [
        { tag: 'dot', label: 'Drain', detail: 'Every 0.5s: 0.05 damage per point of fear, rounded — 5 a tick (10 a second) at 100 fear. Always at least 1 a tick.' },
        { tag: 'heal', label: 'Drink', detail: 'You are healed for 100% of each tick, whether you or a phobia did the drinking.' },
        { tag: 'area', label: 'Reach', detail: '120px from you or from any phobia (not a marble one). One line per enemy, from whichever is closest.' },
      ],
      notes: ['The slasher drains too: Reassurance does not care which form you are in.'],
    },
  ],

  abilities: {
    'fear-phobia': {
      basics:
        'Summon a phobia — a ghost of yourself — at your cursor. It cannot be hit and stays for the '
        + 'bout. It drains frightened enemies near it, and enemy shots that pass through it go grey: '
        + 'they hit softer and hurt whoever fired them. Your other keys all work through your phobias.',
      cast: 'Click at the cursor. 1.5s cooldown. Not while the slasher is out or Claustrophobia is running.',
      effects: [
        { tag: 'summon', label: 'Phobias', detail: 'Up to 4. A fifth replaces the oldest.' },
        { tag: 'debuff', label: 'Grey shots', detail: 'An enemy projectile passing within 28px of a phobia deals 55% of its damage from then on.' },
        { tag: 'damage', label: 'Backlash', detail: '3 damage to the shooter for each shot that goes grey.' },
        { tag: 'dot', label: 'Reassurance', detail: 'Each phobia drains frightened enemies within 120px for you (see Reassurance).' },
      ],
      notes: ['A phobia does nothing to an enemy with no fear on them. Grasp and Gaze are how the fear gets there.'],
      noUpgrade: true,
    },

    'fear-grasp': {
      basics:
        'Every phobia slashes a giant black claw in a cone toward your cursor. Each claw that '
        + 'catches an enemy deals 12 damage and adds 10 fear.',
      cast: 'E, aimed with the cursor — each phobia aims from where it stands. 5s cooldown. Needs at least one phobia.',
      effects: [
        { tag: 'damage', label: 'Claw', detail: '12 damage per phobia, landing 0.15s after the cast. Four phobias on one enemy: 48.' },
        { tag: 'debuff', label: 'Fear', detail: '+10 fear per claw that lands (up to 40).' },
        { tag: 'area', label: 'Cone', detail: '150px long and about 76° wide, from each phobia toward the cursor.' },
      ],
      noUpgrade: true,
    },

    'fear-gaze': {
      basics:
        'For 3s every phobia opens its mask and shines its eye straight at you. An enemy standing '
        + 'in a beam burns, gains fear fast, and the beam widens around them. Spend 2.5s in the light and it '
        + 'is a jumpscare: frozen for 3s and 30 more fear.',
      cast: 'R. 16s cooldown. Needs at least one phobia. The beams follow you as you move.',
      effects: [
        { tag: 'area', label: 'Beam', detail: 'From each phobia to you and 50px past (at least 230px long). Starts about 23° wide and opens by 18° a second while somebody is in it, up to about 69°.' },
        { tag: 'damage', label: 'Burn', detail: '10 damage a second while in any beam — 30 over the full 3s. Several beams do not stack.' },
        { tag: 'debuff', label: 'Fear', detail: '+22 fear a second while in any beam — 66 over the full 3s.' },
        { tag: 'control', label: 'Jumpscare', detail: '2.5s in the light in total (it need not be unbroken): frozen for 3s and +30 fear. Once per enemy per Gaze.' },
      ],
      notes: [
        'The beam runs from the phobia to you, so put the enemy between the two.',
        'A frozen enemy does not flee — but they will the moment it ends, if the meter is full and you are close.',
      ],
      noUpgrade: true,
    },

    'fear-manifest': {
      basics:
        'With 50 fear on the field, become the slasher: invincible, a third bigger, 67% slower, and '
        + 'your five keys become his. In a duel the enemy sees only by a flickering flashlight, and '
        + 'a rune appears on the arena\'s edge — breaking it is the only way they can end this.',
      cast: 'F. 20s cooldown. Needs 50 fear in total across your enemies; the card fills as the fear builds.',
      effects: [
        { tag: 'shield', label: 'Invincible', detail: 'Nothing damages the slasher. No dodge roll while he is out.' },
        { tag: 'cost', label: 'Heavy', detail: 'Moves at 25% speed and is 35% larger.' },
        { tag: 'debuff', label: 'Flashlight', detail: 'Duel only. The enemy\'s screen goes dark except a 34px pool around them and a 250px, 48°-wide beam where they aim. It flickers.' },
        { tag: 'summon', label: 'The rune', detail: 'Duel only. 25hp, at a random spot on the arena edge, bright enough to see in the dark. Enemy shots and blasts damage it; standing within 46px wears it down at 14 a second. Broken: you are the gentleman again.' },
        { tag: 'utility', label: 'Invasion', detail: 'Husks never hunt a rune, so there is none: the slasher lasts 20s.' },
        { tag: 'utility', label: 'Ending it', detail: 'The rune, the Invasion clock, or your own Shadowy Descent. In a duel it otherwise lasts until one of you is dead.' },
      ],
      notes: [
        'Phobias stay where they are and keep draining. Any Gaze in progress ends.',
        'A bot fighting by flashlight wanders, and only goes for the rune once it stumbles within 240px of it.',
      ],
      noUpgrade: true,
    },

    'fear-claustrophobia': {
      basics:
        'The arena walls close in over 22s and every phobia turns to a 100hp marble statue. Fear '
        + 'rises the whole time, and when the walls meet the enemy is crushed — dead, in a duel. '
        + 'Breaking any one statue stops it, but half the statues are trapped: break one of those '
        + 'and it is a jumpscare, 40 damage and 20 fear.',
      cast: 'Q. Ultimate (charged by damage dealt and taken). Needs at least one phobia. No new phobias while it runs.',
      effects: [
        { tag: 'area', label: 'The walls', detail: 'The room shrinks evenly on the arena\'s centre for 22s, down to a 116px square. Everybody — you included — and every statue is pushed inward with it.' },
        { tag: 'debuff', label: 'Fear', detail: '+2.5 fear a second on every enemy: 55 over the full 22s.' },
        { tag: 'damage', label: 'Crushed', detail: 'When the walls meet. Duel: 10 times the victim\'s maximum health, through shields — a kill. Invasion: 120 to every husk.' },
        { tag: 'summon', label: 'Statues', detail: '100hp each. Enemy shots and blasts damage them; standing within 48px wears one down at 28 a second. Marble phobias do not drain, claw or gaze.' },
        { tag: 'utility', label: 'Breaking one', detail: 'Ends the ultimate at once. That statue is destroyed; the others turn back into phobias.' },
        { tag: 'damage', label: 'Trapped', detail: 'Half the statues, rounded down, are occupied. Breaking one: 40 damage and +20 fear to every enemy, with a full-screen jumpscare.' },
        { tag: 'utility', label: 'The tell', detail: 'An occupied statue cannot keep still: stand within 95px of one for 3s and it starts to bleed from the eyes and breathe.' },
      ],
      notes: [
        'With one phobia nothing is trapped; with two or three, one is; with four, two are.',
        'Manifest can still be cast with the walls closing. It does not stop them.',
      ],
      noUpgrade: true,
    },

    'fear-massacre': {
      basics:
        'Slasher. Stab the machete at your cursor: 28 damage, plus more the more afraid the target '
        + 'is, up to 58 at full fear. The stab wounds the part of the body it lands on — the hands they '
        + 'wave are the arms, the very middle of the hitbox is the heart, the top of it the head and '
        + 'the bottom the legs. Your own phobias are in the way too: running one through destroys it '
        + 'and makes the slasher 30% faster until he turns back.',
      cast: 'Click, or hold to keep stabbing. 1.1s cooldown. Not while stalking with Haunt, swinging its hook or dragging somebody.',
      effects: [
        { tag: 'damage', label: 'Machete', detail: '28 damage + 0.3 per point of the target\'s fear: 43 at 50 fear, 58 at 100.' },
        { tag: 'area', label: 'Thrust', detail: 'A straight line to the cursor, 132px at most. A point that stops inside the body cuts exactly there; one that carries on through cuts where it went in.' },
        { tag: 'debuff', label: 'Wound', detail: 'Each part runs sound → damaged (pink) → severe (red). One stab damages an arm, a leg or the head and three make it severe. The heart takes two stabs to damage and five to make severe.' },
        { tag: 'debuff', label: 'Arms', detail: 'Per arm: every cooldown 12% longer damaged, 25% severe.' },
        { tag: 'debuff', label: 'Legs', detail: 'Per leg: 12% slower damaged, 22% severe.' },
        { tag: 'debuff', label: 'Head', detail: '6% slower and their vision swims for 1.7s about every 7s; severe, 12% slower and 2.6s about every 4s.' },
        { tag: 'debuff', label: 'Heart', detail: 'They take 15% more damage from everything; severe, 30%.' },
        { tag: 'dot', label: 'Bleeding', detail: 'Each severe part: 0.3% of max health a second through shields (0.9% for the heart), +10% for every other part that is at least damaged. Severe parts visibly bleed and leave puddles.' },
        { tag: 'utility', label: 'The chart', detail: 'While you are the slasher, the body you last cut is drawn bottom right of your screen: each part pink or red, with a bar filling toward severe.' },
        { tag: 'buff', label: 'Run through a phobia', detail: 'Every one of your phobias on the line is destroyed. Each is +30% of the slasher\'s speed, stacking, until the form ends.' },
      ],
      notes: [
        'Wounds last the rest of the bout — they do not heal when the slasher ends.',
        'Four phobias run through takes the slasher from 33% to 73% of normal speed.',
        'A bot has no cursor to place on a part: its stabs land somewhere on the body at random.',
      ],
      noUpgrade: true,
    },

    'fear-haunt': {
      basics:
        'Slasher. Go grey and stalk, 15% slower, charging faster the closer you are to the enemy. '
        + 'Press again — or get caught in their flashlight — and you swing a hook round yourself on a '
        + 'chain, for longer the more you had charged. Whoever it catches is dragged behind you for '
        + '5s, unable to fight back. When the time is up, or you press again, they are slammed down '
        + 'in front of you. Drag them onto one of the arena\'s butcher\'s hooks instead and they hang '
        + 'there for 3s: you cannot hurt them, but they bleed three times as fast.',
      cast: 'E to start stalking, E again to swing the hook, E again to slam whoever it caught. 12s cooldown from the first press. No Massacre, Signature Move or Descent while stalking, swinging or dragging.',
      effects: [
        { tag: 'cost', label: 'Stalking', detail: 'Another 15% slower while charging.' },
        { tag: 'resource', label: 'Charge', detail: 'Fills at 8% a second from 460px or further, up to 55% a second touching the enemy.' },
        { tag: 'utility', label: 'Caught', detail: 'After the first 0.7s, being inside an enemy\'s flashlight beam (250px, 48° wide) lets the hook go with whatever is banked.' },
        { tag: 'area', label: 'The hook', detail: 'Circles you at 96px, about one and a half turns a second, for 1.2s with no charge up to 4.2s when full. The chain catches as well as the hook.' },
        { tag: 'control', label: 'Dragged', detail: '5s on a 50px chain: disarmed, cannot walk or dodge. You move 50% faster while hauling.' },
        { tag: 'damage', label: 'Slam', detail: '22 damage, thrown down 56px toward your cursor, a 0.5s stun, and a light wound (a tenth of the way to severe) to every part.' },
        { tag: 'control', label: 'Butcher\'s hooks', detail: 'Six stand in the arena while a slasher is out. A dragged enemy within 34px of one is hung on it for 3s: held, untouchable by you, bleeding at three times the rate. No slam.' },
      ],
      notes: [
        'Hanging somebody only pays if they are already bleeding: it needs at least one severe part.',
        'A bot lets the hook go once it is charged and in reach (or after 9s), and hauls its catch toward the nearest butcher\'s hook.',
      ],
      noUpgrade: true,
    },

    'fear-signature': {
      basics:
        'Slasher. Vanish to a random spot on the arena edge and stand still. Three times, aim a '
        + 'thin red line only you can see and click to arm it (it arms itself after 2s); 1.5s later it '
        + 'goes live for 1s. It starts at your spot on the wall and crosses the whole arena. You '
        + 'slash through every enemy on a live line for 26, wounding whichever part touched it, '
        + 'then snap back to the wall, and the rounds carry on.',
      cast: 'R. 18s cooldown. The line runs from you through your cursor; click to lock it in, and it goes live 1.5s later. Nothing else can be cast until it ends.',
      effects: [
        { tag: 'movement', label: 'Vanish', detail: 'Teleport to a random point on the arena edge. You cannot walk while the move runs.' },
        { tag: 'area', label: 'Line', detail: 'A 1° cone from where you stand, long enough to cross the arena. Invisible to the enemy, armed or not.' },
        { tag: 'utility', label: 'Rounds', detail: '3, hit or miss. Each: up to 2s to aim, a 1.5s delay after the click (the angle is locked), then live for 1s.' },
        { tag: 'damage', label: 'The move', detail: '26 damage to every enemy on a live line, once each per round. You appear 52px past them, then return to your spot on the wall about 0.3s later.' },
        { tag: 'debuff', label: 'Wound', detail: 'The part that touched the cone first — a hand, the head or a leg — is wounded 60% of the way to severe: damaged at once, severe on the second.' },
      ],
      noUpgrade: true,
    },

    'fear-descent': {
      basics:
        'Slasher. Sink through the floor and end the form by choice. You come back up as the '
        + 'gentleman at a random spot on the arena edge — no longer invincible, back at full speed.',
      cast: 'F. 1s cooldown. Not during Haunt, its hook or a drag, Signature Move or while somebody is in the maze.',
      effects: [
        { tag: 'movement', label: 'Resurface', detail: 'At a random point on the arena edge.' },
        { tag: 'utility', label: 'Ends the slasher', detail: 'The rune, the hole and any speed from cut-down phobias go with it. Manifest keeps the 20s cooldown it started when you changed.' },
      ],
      noUpgrade: true,
    },

    'fear-fall': {
      basics:
        'Slasher. A hole opens in the middle of the arena and keeps growing for 26s. In a duel, an '
        + 'enemy who touches it falls into a maze and is hunted through it in first person for 45s — '
        + 'you are the hunter. Caught: 75 damage and every part of them severely wounded. Husks in an '
        + 'Invasion just take 60 and are stunned.',
      cast: 'Q. Ultimate (charged by damage dealt and taken). One hole at a time. It closes if the slasher ends.',
      effects: [
        { tag: 'area', label: 'The hole', detail: 'Centre of the arena. 34px radius, growing 9px a second to a 250px cap, for 26s.' },
        { tag: 'control', label: 'The maze', detail: 'Duel only. Both of you leave the arena, untouchable, for up to 45s. The prey walks faster than the hunter (1.9 against 1.25 tiles a second).' },
        { tag: 'damage', label: 'Caught', detail: 'The hunter reaching the prey with a clear line: 75 damage through shields and +25 fear, after 3s of something you are not shown. Every part comes back severe — head, heart, both arms, both legs — so they bleed 3.6% of max health a second.' },
        { tag: 'utility', label: 'Escaped', detail: 'Survive the 45s and nothing happens. Either way the prey returns somewhere inside the arena and the slasher on its edge.' },
        { tag: 'damage', label: 'Husks', detail: 'Invasion: 60 damage and a 1.5s stun to each husk in the hole, at most once every 3s each.' },
      ],
      notes: [
        'Falling ends any Haunt, hook, drag or Signature Move in progress, and the hole closes behind them.',
        'The slasher cannot be turned back while the hunt is on.',
      ],
      noUpgrade: true,
    },
  },
};

export default silence;
