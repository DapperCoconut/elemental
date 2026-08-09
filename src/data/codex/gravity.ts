import { ElementCodex } from '../AbilityCodex';

/**
 * Gravity — the element that never asks where you would like to be standing.
 *
 * Verified against `src/elements/gravity.ts`, `kits/GravityKit.ts`, the gravity block of
 * `data/Upgrades.ts`, the Quake perk in `data/Perks.ts` and Gravity Mastery in `data/Mastery.ts`.
 */
const gravity: ElementCodex = {
  identity:
    'Rocks from the sky and a hand on everybody\'s position. Gravity has no projectiles worth the '
    + 'name — its damage arrives as telegraphed circles on the ground you were supposed to walk out '
    + 'of — and it makes those circles land by teleporting, slamming, tethering and flinging the '
    + 'other fighter into them. The shop upgrades take it somewhere no other element goes: a fully '
    + 'upgraded Q takes you off the board entirely and hands you a night sky and a flying moon.',

  abilities: {
    'space-slash': {
      magic:
        'Space itself is opened along a line you draw. Drag the mouse and a violet seam tears across '
        + 'the ground where the cursor went, hangs open for half a second, and then snaps shut on '
        + 'whatever is standing in it — throwing them along the direction you drew rather than away '
        + 'from you. Click without dragging and you get the other half of the ability instead: a '
        + 'shadow on the floor with a rock already falling into it.',
      cast:
        'Click. A drag of 24px or more is the slash, drawn from where the button went down to where it '
        + 'came up; anything shorter is a tap and drops a meteor shadow at the cursor. One 0.5s '
        + 'cooldown covers both.',
      effects: [
        { tag: 'damage', label: 'Slash', detail: '18 damage to anything within 40px of the line you drew, resolved 500ms after the seam opens — they have the whole half second to leave.' },
        { tag: 'control', label: 'Directional throw', detail: '400 knockback along the drag direction. Which way they go is your choice, not a shove away from you.' },
        { tag: 'damage', label: 'Tap meteor', detail: 'A shadow marked on the ground, 1.5s fuse, then 14 damage in a 70px radius — 30 if they are within 28px of dead centre when it lands.' },
        { tag: 'utility', label: 'Availability', detail: '0.5s cooldown, and the two halves share it.' },
      ],
      upgrade: {
        magic:
          'Meteor Storm makes holding the button worth something. As long as Click is down, the sky '
          + 'keeps dropping rocks around wherever your cursor is — you stop aiming shots and start '
          + 'painting a region of floor nobody can stand in.',
        effects: [
          { tag: 'summon', label: 'Rolling barrage', detail: 'One extra meteor shadow every 1 second while the button is held, scattered up to 50px either side of the cursor.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Same rock', detail: 'Storm meteors are ordinary ones — 14 damage in 70px, 30 on a direct hit, 1.5s fuse each.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Riding the moon (Q+) rewrites both halves: the slash is redrawn across the entire arena for 36 damage and 620 knockback, and the tap drops a colossal meteor — 130px radius, 30 damage, 58 on a direct hit.',
        'From the moon the Storm interval drops from 1s to 150ms and spreads 95px either side. Those are still normal-sized rocks; the upgrade is how many, not how big.',
        'The Quake perk adds a small tsunami wave at every meteor impact.',
      ],
    },

    'meteor-rain': {
      magic:
        'A bombardment you compose before you fire it. Hold E and the ground under you gathers into a '
        + 'well that tightens with every mark you make; each click plants a frozen shadow that sits '
        + 'there with no fuse at all, waiting. Let go of E and every one of them starts falling at '
        + 'once. The pattern is remembered, so the same shape can be dropped again later with a '
        + 'single tap.',
      cast:
        'Hold E to open a recording session, click to place each shadow, release E to drop them all. '
        + 'A tap of E under 150ms with nothing placed replays the last pattern instead.',
      effects: [
        { tag: 'summon', label: 'Placement', detail: 'Up to 5 frozen shadows per session, placed anywhere with no cooldown and no cost. A sixth placement is simply refused.' },
        { tag: 'damage', label: 'The drop', detail: 'On release every frozen shadow gets a 1.5s fuse and lands for 14 damage in a 70px radius, 30 within 28px of centre.' },
        { tag: 'utility', label: 'Recorded pattern', detail: 'The layout is saved on release. Tapping E later re-drops the identical pattern at the identical spots.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown — and it is only ever paid by a replay. Placing and dropping a fresh pattern costs nothing.' },
      ],
      upgrade: {
        magic:
          'Meteor Swarm doubles what one session can hold and sets the ground on fire where the rocks '
          + 'land. The pattern stops being a burst and becomes terrain.',
        effects: [
          { tag: 'summon', label: 'Ten marks', detail: 'The per-session cap rises from 5 to 10 shadows.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Fire pools', detail: 'Every meteor you land — from any ability — has a 15% chance to leave a 35px magma pool for 8 seconds, ticking 4 damage every 0.3s (roughly 13 a second) to anyone standing in it.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The 15% fire pool applies to every meteor you own, not just Meteor Rain\'s — Space Slash taps and Meteor Storm rocks roll for it too.',
        'A frozen shadow is inert: it deals nothing and cannot be triggered by anything except releasing E.',
        'Riding the moon replaces the whole ability with a 30-meteor barrage seeded across the entire playfield, landing raggedly over about 1.5 seconds.',
      ],
    },

    'space-slam': {
      magic:
        'You point down and the other fighter\'s relationship with the floor is renegotiated. A column '
        + 'of bent space opens above them, and they are driven through it into the ground hard enough '
        + 'to shake the camera — then held there, face down, for long enough that whatever they were '
        + 'about to do does not happen.',
      cast: 'R. Instant, no aim, no range limit — it finds the other fighter wherever they are.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '25 damage, applied on the press.' },
        { tag: 'control', label: 'Driven to the floor', detail: 'Their position is set to the bottom of the arena (40px off the floor) and their velocity zeroed. This is a teleport, not a push — distance and speed are irrelevant.' },
        { tag: 'control', label: 'Pinned', detail: 'Held at the floor for 300ms afterwards, with any upward velocity clipped off.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        magic:
          'Gravity Anchor leaves something behind in the crater. A tether snaps between the slam point '
          + 'and the enemy, going visibly taut as they try to leave — and the harder they pull, the '
          + 'harder it hauls them back.',
        effects: [
          { tag: 'control', label: 'Tether', detail: 'An anchor at the slam point for 3 seconds. Past 150px from it they are dragged back, at a strength of 5 velocity per pixel of overreach — so 30px too far is a 150 pull, and 100px too far is a 500 one.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Readable', detail: 'The line is drawn slack when they are close and taut as they reach the limit, so the leash length is visible rather than guessed.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Damage dealt to a tethered enemy — from any ability — counts toward Gravity Mastery\'s Anchored Prey requirement (200 needed).',
        'Riding the moon turns one slam into four: a ragdoll chain that teleports them 200–360px in a random direction every 260ms for 8 damage a throw.',
      ],
    },

    'grav-bomb': {
      magic:
        'A well opened at the cursor. Tapped, it is a hand: whoever is near that point is simply moved '
        + 'to it. Held, it is a horizon — the circle deepens for two full seconds while everything '
        + 'inside it is dragged toward the middle, and then you let go and it collapses.',
      cast:
        'Hold F. The well follows the cursor for as long as you hold. Releasing under 2s is the snap; '
        + 'releasing at or past 2s is the detonation. Either way the cooldown is paid on release.',
      effects: [
        { tag: 'control', label: 'Snap (short press)', detail: 'If the enemy is within 120px of the cursor they are placed exactly on it and stopped dead. Outside 120px nothing happens at all.' },
        { tag: 'control', label: 'Drag while charging', detail: 'While the well is open, an enemy within 120px of the cursor is pulled toward it at +55 velocity every frame — the charge itself is a vacuum.' },
        { tag: 'damage', label: 'Detonation (2s hold)', detail: '40 damage if they are within 100px of the cursor point on release, plus a well collapse and a 240ms camera shake.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown. The ability bar shows the charge instead of the cooldown while you are holding.' },
      ],
      upgrade: {
        magic:
          'Anti-Grav points the fully charged well at yourself. Instead of collapsing on the enemy it '
          + 'throws you out of the fight — three seconds off the board with no body to shoot at, '
          + 'steering nothing but a growing shadow on the floor, and then you come back down on it.',
        effects: [
          { tag: 'movement', label: 'The launch', detail: 'Release a full 2s charge with the cursor within 70px of yourself. You go up for exactly 3 seconds.', requiresUpgrade: 'f' },
          { tag: 'shield', label: 'Off the board', detail: 'Invincible, invisible and with your health bar hidden for the whole flight. Nothing can reach you.', requiresUpgrade: 'f' },
          { tag: 'movement', label: 'Steering', detail: 'The landing point tracks your cursor for the whole flight, clamped 40px off each wall, marked by a shadow that tightens as you fall.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Touchdown', detail: '25 damage in a 120px radius, a 320ms camera shake, and a well collapse on the landing point.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'High Gravity', detail: 'Everyone caught in the slam is pinned for 8 seconds: no speed boosts, no dodge, and no movement abilities at all.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The launch aims the cursor at *you*, so it competes with the ordinary detonation for the same key — a full charge released anywhere further than 70px away is still the 40 damage bomb.',
        'Your body genuinely rides the landing point through the flight rather than teleporting on touchdown, so nothing — AI, projectiles, world bounds — ever sees you jump.',
        'Riding the moon replaces F entirely with the Crushing Field.',
      ],
    },

    'lunar-landing': {
      magic:
        'The shadow arrives first, and it covers nearly half the arena. For three seconds there is '
        + 'nothing to do but look at how much of the floor has gone dark and decide which edge to run '
        + 'for. Then the thing casting it lands, and what it leaves behind is a field of burning '
        + 'craters that outlasts the impact by eight seconds.',
      cast: 'Q. The shadow is centred on the arena, not on you or on the cursor. There is no aim and no way to cancel.',
      effects: [
        { tag: 'area', label: 'The shadow', detail: '3 second telegraph, centred on the arena, radius 44% of the arena\'s shorter side — comfortably the largest marked area in the game.' },
        { tag: 'damage', label: 'Impact', detail: '60 damage to everything inside the circle, with a 700ms camera shake.' },
        { tag: 'dot', label: 'Crater field', detail: '20 magma pools scattered evenly through the circle, each 35px across, lasting 8 seconds and dealing 4 damage every 0.3s to anything standing in one.' },
        { tag: 'utility', label: 'Availability', detail: '50 second cooldown — realistically one, maybe two, per fight.' },
      ],
      upgrade: {
        magic:
          'Moon Rider is not an upgrade to the ultimate, it is a replacement for the whole element. '
          + 'Hold Q for three seconds and you climb onto the moon: the arena turns to night, fireflies '
          + 'come out, and you spend the rest of the ride circling the walls on a hundred-hitpoint rock '
          + 'that kills anything it touches. Every one of your five keys does something bigger while '
          + 'you are up there, and the last of them brings the moon down.',
        effects: [
          { tag: 'summon', label: 'Mounting', detail: 'Hold Q for 3 seconds (a Mounting % readout counts it up). A shorter press casts the ordinary Lunar Landing instead. Mounting spends the same 50s cooldown.', requiresUpgrade: 'q' },
          { tag: 'shield', label: 'The moon takes your hits', detail: 'It has 100 HP and absorbs every point of damage aimed at you. At 0 it is destroyed and you are back on foot mid-arena.', requiresUpgrade: 'q' },
          { tag: 'movement', label: 'The orbit', detail: 'It flies the arena perimeter 78px off each wall at 300 px/s, carrying you on top of it. WASD pushed against the direction of travel reverses the loop; that is the whole of your movement.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Running people over', detail: '25 damage to anything within about 54px of it, once per target per 0.9s, flung off at 620 velocity plus 260 along the moon\'s heading.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Click', detail: 'Drag tears a slash across the entire arena for 36 damage and 620 knockback; tap drops a colossal meteor (130px, 30 damage, 58 dead centre); holding with Meteor Storm rains a rock every 150ms.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'E — barrage', detail: '30 meteors seeded over the whole playfield with staggered 0.7–2.2s fuses, so the sky comes apart in a wave rather than a single flash.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'R — ragdoll', detail: 'Four slams instead of one: the enemy is teleported 200–360px in a fresh random direction every 260ms for 8 damage each.', requiresUpgrade: 'q' },
          { tag: 'debuff', label: 'F — Crushing Field', detail: '8 seconds of the whole arena pulled down. Enemies are 1.6× wider, walk at 20% speed, are held under High Gravity throughout, and have their shields and weak health zeroed every frame.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'F — the health it strips', detail: 'Any max HP above 400 is permanently removed while the field holds, and current HP is pressed down to 400 with it. Size and footspeed are handed back when the field lifts; that health is not.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Q — the dismount', detail: 'Four beats: you drop into the arena centre (20 damage in 130px), the nearest enemy is hauled up to the moon, thrown through it (40 damage), and then the moon is collapsed on top of them (90 damage) and they come down with the debris. Each stage also applies 8s of High Gravity.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Q — once only', detail: 'The dismount spends the ultimate permanently. Q for the rest of the match answers "The moon is gone".', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The night is not decoration — it is a real light layer. The moon carries a pool of light with it and 34 fireflies drift through the dark, all of it fading in and out over 0.7s rather than cutting.',
        'The colossal meteors only exist while you are riding. The two volume attacks (Meteor Storm and the E barrage) deliberately keep normal-sized rocks.',
        'Rams count toward Gravity Mastery\'s Moon Rider requirement (5 needed); the ordinary Lunar Landing impact and the dismount hits count toward Lunar Impact (20 needed).',
      ],
    },
  },

  perks: {
    quake: {
      magic:
        'Every rock you land now hits water that is not there. A small tsunami rolls out of each '
        + 'meteor crater — Earth\'s wave, borrowed, and attached to the one element that puts more '
        + 'craters in the ground than anything else.',
      effects: [
        { tag: 'damage', label: 'The ridge', detail: '12 damage to anything within 40px of it. It is consumed on the first fighter it reaches.' },
        { tag: 'control', label: 'Knocked along it', detail: 'The victim is thrown at 80% of the ridge\'s own velocity and stunned for 0.5s.' },
        { tag: 'area', label: 'Travel', detail: 'Rolls at 300 px/s along one axis — horizontal or vertical, chosen at random per impact — for up to 3 seconds or until it leaves the arena.' },
        { tag: 'area', label: 'What counts as a meteor', detail: '5 sources: Space Slash taps, Meteor Rain drops and replays, Meteor Storm rocks, the Anti-Grav slam and the Lunar Landing impact. Every one of them rolls a ridge.' },
      ],
      notes: [
        'It scales with volume rather than power, so it is worth the most alongside Meteor Storm and Meteor Swarm.',
        'The ridge is Earth\'s tsunami slab repainted violet — and a perk wave hits for 12 where Earth\'s own hits for 35.',
      ],
    },
  },

  mastery: {
    'gravity-aura': {
      magic:
        'Space around a mastered gravity user does not let things through cleanly. Incoming shots are '
        + 'sometimes simply caught — held in a cage of bent space that circles you at arm\'s length — '
        + 'and ten seconds later the cage lets go and throws them back where you are looking.',
      effects: [
        { tag: 'shield', label: 'The catch', detail: '20% chance for an incoming projectile to be caught instead of hitting you. It keeps its own damage figure and its own sprite.' },
        { tag: 'summon', label: 'The orbit', detail: 'Caught shots circle you at 46px for 10 seconds, up to 4 at a time. Past four, nothing more is caught.' },
        { tag: 'shield', label: 'Mutual destruction', detail: 'Any enemy projectile that touches an orbiting one within 16px destroys both — the orbit is an active screen, not just storage.' },
        { tag: 'damage', label: 'Return fire', detail: 'An orbiter that survives its 10 seconds is launched at your cursor at 420 px/s, carrying the damage it was originally fired with.' },
      ],
      notes: [
        'It is entirely passive and needs no bind.',
        'Because a returned shot keeps the attacker\'s damage figure, the strongest catches are from whatever hits hardest — a caught ultimate is fired back as one.',
      ],
    },
    starfall: {
      magic:
        'Twenty small dark stars drop out of the top of the arena at once and fall the whole height of '
        + 'it, bursting on the floor. What they do to a body on the way past is almost incidental: '
        + 'anyone they touch is Grounded, pinned to the floor of the arena for ten seconds, able to '
        + 'walk left and right and nothing else.',
      cast: 'Bindable to E, R, F or Q, taking that slot over from Gravity\'s own ability.',
      effects: [
        { tag: 'damage', label: 'On the way down', detail: '20 stars falling at 480 px/s from random points across the width. 10 damage to each fighter a star passes within 20px of — once per star per target.' },
        { tag: 'damage', label: 'On the floor', detail: '15 more damage in a 45px radius where each one bursts.' },
        { tag: 'control', label: 'Grounded', detail: '10 seconds pinned to the arena floor. Vertical movement is taken away entirely; a grounded player can hop 34px for 420ms by pressing W, and bots hop by themselves every 2–3.5s.' },
        { tag: 'utility', label: 'Availability', detail: '18 second cooldown.' },
      ],
      notes: [
        'Grounded refreshes rather than stacking — a second star resets the 10 seconds.',
        'It is the only thing in the kit that reliably lands on somebody who is running, because 20 falling stars cover the whole width at once.',
      ],
    },
  },
};

export default gravity;
