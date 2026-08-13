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
      basics:
        'One key with two attacks on a shared 0.5s cooldown. Drag 24px or more and it cuts a seam along '
        + 'your drag: 18 damage to anything within 40px of the line half a second after it opens — they '
        + 'have the whole window to leave — plus 400 of knockback along the drag direction, so you choose '
        + 'which way they go. A shorter press is a tap, dropping a meteor shadow at the cursor with a '
        + '1.5s fuse that lands for 14 damage in a 70px radius, or 30 within 28px of dead centre.',
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
        basics:
          'Holding the button rains one extra meteor shadow every second, scattered up to 50px either '
          + 'side of the cursor. Storm meteors are ordinary rocks: 14 damage in 70px, 30 on a direct hit, '
          + '1.5s fuse each.',
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
      basics:
        'Hold E to open a recording session and click to place up to 5 frozen shadows anywhere, with no '
        + 'cooldown and no cost — a sixth is refused. Releasing E gives every one a 1.5s fuse and lands '
        + 'them for 14 damage in a 70px radius, 30 within 28px of centre. The layout is saved, and a tap '
        + 'of E under 150ms with nothing placed re-drops the identical pattern at the identical spots. '
        + 'The 5s cooldown is only ever paid by a replay.',
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
        basics:
          'The session cap rises from 5 shadows to 10, and every meteor you land from any ability has a '
          + '15% chance to leave a 35px magma pool for 8 seconds, ticking 4 damage every 0.3s — roughly 13 '
          + 'a second — to anyone standing in it.',
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
      basics:
        'Finds the other fighter wherever they are with no aim and no range limit, deals 25 damage, and '
        + 'drives them to the floor: their position is set 40px off the bottom of the arena and their '
        + 'velocity zeroed. It is a teleport, not a push, so distance and speed are irrelevant, and they '
        + 'are pinned there for 300ms with any upward velocity clipped away. 5s cooldown.',
      cast: 'R. Instant, no aim, no range limit — it finds the other fighter wherever they are.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '25 damage, applied on the press.' },
        { tag: 'control', label: 'Driven to the floor', detail: 'Their position is set to the bottom of the arena (40px off the floor) and their velocity zeroed. This is a teleport, not a push — distance and speed are irrelevant.' },
        { tag: 'control', label: 'Pinned', detail: 'Held at the floor for 300ms afterwards, with any upward velocity clipped off.' },
        { tag: 'utility', label: 'Availability', detail: '5s cooldown.' },
      ],
      upgrade: {
        basics:
          'The slam point becomes an anchor for 3 seconds. Past 150px from it they are dragged back at 5 '
          + 'velocity per pixel of overreach — 30px too far is a 150 pull, 100px too far is a 500 one. The '
          + 'line is drawn slack when they are close and taut at the limit, so the leash length is visible '
          + 'rather than guessed.',
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
      basics:
        'Hold F and a gravity well follows your cursor, pulling any enemy within 120px toward it at +55 '
        + 'velocity a frame — the charge itself is a vacuum. Release under 2 seconds and it snaps: an '
        + 'enemy within 120px of the cursor is placed exactly on it and stopped dead, and outside that '
        + 'range nothing happens at all. Release at 2 seconds or later and it detonates for 40 damage if '
        + 'they are within 100px, with a well collapse and a 240ms shake. The 5s cooldown is paid on '
        + 'release either way, and the ability bar shows the charge while you hold.',
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
        basics:
          'Release a full 2-second charge with the cursor within 70px of yourself and you go up instead. '
          + 'For exactly 3 seconds you are invincible, invisible and off the board with your health bar '
          + 'hidden, steering the landing point with your cursor — clamped 40px off each wall and marked by '
          + 'a shadow that tightens as you fall. Touchdown is 25 damage in a 120px radius with a 320ms '
          + 'shake and a well collapse, and everyone caught is under High Gravity for 8 seconds: no speed '
          + 'boosts, no dodge and no movement abilities at all.',
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
      basics:
        'The ultimate. A 3-second shadow centred on the arena — not on you and not on the cursor — with '
        + 'a radius of 44% of the arena\'s shorter side, comfortably the largest marked area in the game. '
        + 'It lands for 60 damage to everything inside with a 700ms camera shake and leaves 20 magma '
        + 'pools scattered evenly through the circle, each 35px across, lasting 8 seconds and dealing 4 '
        + 'damage every 0.3s. No aim and no way to cancel. 50s cooldown.',
      cast: 'Q. The shadow is centred on the arena, not on you or on the cursor. There is no aim and no way to cancel.',
      effects: [
        { tag: 'area', label: 'The shadow', detail: '3 second telegraph, centred on the arena, radius 44% of the arena\'s shorter side — comfortably the largest marked area in the game.' },
        { tag: 'damage', label: 'Impact', detail: '60 damage to everything inside the circle, with a 700ms camera shake.' },
        { tag: 'dot', label: 'Crater field', detail: '20 magma pools scattered evenly through the circle, each 35px across, lasting 8 seconds and dealing 4 damage every 0.3s to anything standing in one.' },
        { tag: 'utility', label: 'Availability', detail: '50 second cooldown — realistically one, maybe two, per fight.' },
      ],
      upgrade: {
        basics:
          'Hold Q for 3 seconds — a Mounting % readout counts it up — and you ride the moon instead of '
          + 'dropping it; a shorter press casts the ordinary Lunar Landing, and both spend the same 50s '
          + 'cooldown. The moon has 100 HP and absorbs every point of damage aimed at you, and at 0 it is '
          + 'destroyed and you are back on foot mid-arena. It flies the arena perimeter 78px off each wall '
          + 'at 300 px/s carrying you, and pushing WASD against the direction of travel reverses the loop — '
          + 'that is the whole of your movement. Anything within about 54px is run over for 25 damage once '
          + 'per 0.9s and flung off at 620 velocity plus 260 along the moon\'s heading. The keys become a '
          + 'siege set: Click drags an arena-wide slash for 36 damage and 620 knockback, taps a colossal '
          + '130px meteor for 30 (58 dead centre), and with Meteor Storm rains a rock every 150ms. E seeds '
          + '30 meteors across the whole playfield on staggered 0.7–2.2s fuses. R ragdolls the enemy — four '
          + 'teleports of 200–360px in fresh random directions every 260ms for 8 damage each. F holds the '
          + 'whole arena down for 8 seconds: enemies 1.6× wider, walking at 20% speed, under High Gravity '
          + 'throughout, shields and weak health zeroed every frame, and any max HP above 400 permanently '
          + 'removed with current HP pressed down to match — size and footspeed come back when it lifts, '
          + 'that health does not. Q is the dismount, in four beats: you drop into the arena centre for 20 '
          + 'damage in 130px, the nearest enemy is hauled up, thrown through the moon for 40, and the moon '
          + 'is collapsed on them for 90 as they come down with the debris, each stage applying 8 seconds '
          + 'of High Gravity. The dismount spends the ultimate permanently — Q for the rest of the match '
          + 'answers "The moon is gone".',
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
      basics:
        'Every meteor impact also rolls a ridge: 12 damage to anything within 40px, consumed on the '
        + 'first fighter it reaches, throwing them at 80% of the ridge\'s own velocity and stunning them '
        + 'for 0.5 seconds. It rolls at 300 px/s along a randomly chosen horizontal or vertical axis for '
        + 'up to 3 seconds or until it leaves the arena. Five sources count as a meteor: Space Slash '
        + 'taps, Meteor Rain drops and replays, Meteor Storm rocks, the Anti-Grav slam and the Lunar '
        + 'Landing impact.',
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
      basics:
        'A 20% chance for any incoming projectile to be caught instead of hitting you, keeping its own '
        + 'damage figure and its own sprite. Caught shots circle you at 46px for 10 seconds, up to 4 at a '
        + 'time — past four nothing more is caught. Any enemy projectile that touches an orbiter within '
        + '16px destroys both, so the orbit is an active screen rather than storage, and an orbiter that '
        + 'survives its 10 seconds is launched at your cursor at 420 px/s carrying the damage it was '
        + 'originally fired with.',
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
      basics:
        'A bindable meteor shower that takes over its slot: 20 stars falling at 480 px/s from random '
        + 'points across the width, each dealing 10 damage to a fighter it passes within 20px of (once '
        + 'per star per target) and 15 more in a 45px radius where it bursts. Everything caught is '
        + 'grounded for 10 seconds, with vertical movement taken away entirely — a grounded player can '
        + 'hop 34px for 420ms by pressing W, and bots hop by themselves every 2–3.5 seconds. 18s '
        + 'cooldown.',
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
