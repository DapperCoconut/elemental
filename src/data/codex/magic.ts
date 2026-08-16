import { ElementCodex } from '../AbilityCodex';

/**
 * Magic — two books, ten spells, and a meter that kills you.
 *
 * Verified against `src/elements/magic.ts`, `kits/MagicKit.ts`, the magic block of
 * `data/Upgrades.ts`, the Thunder perk in `data/Perks.ts`, the Decay divine perk in
 * `data/DivinePerks.ts` and Magic Mastery in `data/Mastery.ts`. Numbers here are the ones the
 * kit actually applies, including the several places where the spell wheel's own labels round
 * them off.
 */
const magic: ElementCodex = {
  identity:
    'A caster with no medium of its own. Magic borrows fire, water, thorns, wind and stone out of '
    + 'two books — five spells on E and five familiars on Q — and leaves the results lying around '
    + 'the arena. Nothing it conjures is meant to be used once: Dupe copies whatever of yours is '
    + 'standing in a field, the Crosshair pays out only if you keep hitting the same target, and '
    + 'buying a book\'s upgrade puts a Dark Magic button at the hub of that wheel, and a corrupted '
    + 'version of all five spells behind it — stronger in every case and charged in Darkness, which '
    + 'at 100 kills you outright.',

  passives: [
    {
      emoji: '📖',
      name: 'The Spell Wheel',
      basics:
        'Both books are cast off a radial menu. Hold E for the Grimoire\'s five spells or Q for the '
        + 'Necronomicon\'s five familiars: the wheel is 130px across, centred on you and follows you if '
        + 'you walk. Point the cursor at a wedge or step across them with ← and →, and the selected '
        + 'wedge grows 10px and brightens. A release under 150ms with no arrow key pressed re-casts '
        + 'your last pick from that book instead of whatever is highlighted, so a repeat cast costs one '
        + 'tap. Every wheel spell fires 2 seconds after release at the live cursor position, with both '
        + 'fighters free to move throughout, and the cooldown — 5s for the Grimoire, 30s for the '
        + 'Necronomicon — is stamped when the spell fires rather than when you released, so a Grimoire '
        + 'cast is about 7 seconds apart in practice.',
      effects: [
        { tag: 'utility', label: 'Opening it', detail: 'Hold E for the Grimoire\'s 5 spells or Q for the Necronomicon\'s 5 familiars. The wheel is 130px across and centred on you, and it follows you if you walk.' },
        { tag: 'utility', label: 'Choosing', detail: 'Point the cursor at a wedge, or step across them with ← and →. The selected wedge grows 10px and brightens.' },
        { tag: 'utility', label: 'The quick tap', detail: 'A release under 150ms with no arrow key pressed re-casts your last pick from that book instead of whatever is highlighted — a repeat cast costs one tap.' },
        { tag: 'cost', label: 'The two-second aim', detail: 'Every wheel spell fires 2 seconds after release, at the live cursor position. You keep moving and shooting through it; so does the other fighter.' },
        { tag: 'utility', label: 'When the cooldown starts', detail: 'The Grimoire\'s 5s and the Necronomicon\'s 30s are stamped when the spell fires, not when you released — so a Grimoire cast is 7 seconds apart in practice.' },
        { tag: 'utility', label: 'The Dark Magic button', detail: 'Buying the E or Q upgrade puts a button at the wheel\'s hub. Clicking it flips that wheel to its corrupted five in place — labels, colours and what release will cast — and the mode sticks between casts.' },
      ],
      notes: [
        'The wheel is drawn on top of everything, but the fight does not pause while it is open — you can be killed choosing a spell.',
      ],
    },
    {
      emoji: '☠',
      name: 'Darkness',
      basics:
        'A bar under the caster that only ever climbs, and it only exists once a corrupted book is '
        + 'bought and its Dark Magic button switched on. Every corrupted Grimoire spell charges 25 and '
        + 'every corrupted summon charges 50; the Decay divine perk '
        + 'charges 25 or 99 to buy a cooldown back. At 100 the corruption takes you and you die on the '
        + 'spot, at full health, with no save. The bar turns violet at 40 and red at 75, and the arena '
        + 'shakes once as it crosses 75. Only F+ Corrupted Data ever brings it back down.',
      effects: [
        { tag: 'resource', label: 'What charges it', detail: 'Every corrupted Grimoire spell charges 25 and every greater summon charges 50. The Decay divine perk charges 25 for a Grimoire reset and 99 for a Necronomicon one.' },
        { tag: 'cost', label: 'At 100', detail: 'You die on the spot, at full health, with no save and no shield check. The bar is a countdown, not a cost you can be too poor to pay.' },
        { tag: 'utility', label: 'Reading it', detail: 'The bar appears under the caster once the E or Q upgrade is owned, whether Dark Magic is on or not. Violet at 40, red at 75, and the camera shakes once as it crosses 75.' },
        { tag: 'resource', label: 'Coming back down', detail: 'Only F+ Corrupted Data sheds it — 20 per pickup. Dupe itself is free, so with F+ owned the F cooldown is the whole sustain loop. Without it, every point charged is permanent for the match.' },
      ],
      notes: [
        'Ruin\'s Combo Breaker halves every meter in the game, and Darkness is one of them — which is one of the few times having your bar cut is a favour.',
      ],
    },
  ],

  abilities: {
    'magic-sparkle-shot': {
      basics:
        'A star fired at the cursor at 450 px/s that stops after 180px and hangs there. One second '
        + 'later it bursts for 14 damage in a 55px radius; a direct hit on the way out is 6. The burst '
        + 'is also what feeds a Crosshair — every sparkle that goes off on the marked fighter adds a '
        + 'tally to it. 3s cooldown.',
      cast: 'Click, aimed at the cursor.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: '14 damage in a 55px radius, 1 second after the star comes to rest.' },
        { tag: 'damage', label: 'Direct hit', detail: '6 damage to anything the star runs into on its way out.' },
        { tag: 'utility', label: 'The flight', detail: '450 px/s, stopping after 180px — it will not reach across the arena.' },
        { tag: 'resource', label: 'It feeds the Crosshair', detail: 'A burst that catches the marked fighter adds one tally to the Crosshair, up to 5.' },
      ],
      upgrade: {
        basics:
          'Two more sparkles fly in a line 32px and 64px behind the leader, holding formation the whole '
          + 'way. They burst for 75% damage — about 11 each — and they burst when the leader does, so a '
          + 'clean shot is three overlapping bursts instead of one.',
        effects: [
          { tag: 'damage', label: 'Two trailers', detail: 'Extra sparkles 32px and 64px behind the leader, bursting for 75% damage — about 11 each.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'They follow', detail: 'The trailers hold formation behind the leader for the whole flight and burst when it does.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Trailer bursts feed the Crosshair too, so a Sparkle Trail shot on a marked enemy can add up to three tallies at once.',
      ],
    },

    'magic-grimoire': {
      basics:
        'The five-spell book. Flare crawls a burning orb to the cursor; Splash lays a slowing pool; '
        + 'Spur throws three burs; Gust dashes you forward and drags whatever it catches back to where '
        + 'you cast from; Ward hangs five stones on an orbit that eat projectiles. Every one of them '
        + 'leaves something on the field that Dupe can copy, which is the point of the book. 5s '
        + 'cooldown, stamped when the spell fires.',
      cast: 'Hold E to open the wheel, choose a wedge, release. The spell fires 2 seconds later at the live cursor.',
      effects: [
        { tag: 'dot', label: '🔥 Flare', detail: 'A burning orb crawling to the cursor at 110 px/s for 4.5s. 3 damage every 0.5s to anything within 34px of it, and a 3s burn on each tick.' },
        { tag: 'control', label: '🌊 Splash', detail: 'A 90px pool at the cursor for 6s: a 35% slow while you stand in it, and 3 damage a second.' },
        { tag: 'damage', label: '🌿 Spur', detail: 'Three burs in a 26° spread at 620 px/s, 5 damage each.' },
        { tag: 'movement', label: '💨 Gust', detail: 'You dash up to 240px at the cursor. Anything within 96px of that corridor takes 6 and is hauled back to the spot you cast from at 340 px/s for 1.3s.' },
        { tag: 'shield', label: '🪨 Ward', detail: 'Five stones orbiting you for 8s: 10 damage on contact, and they delete hostile projectiles that touch them.' },
      ],
      upgrade: {
        basics:
          'A Dark Magic button appears at the Grimoire\'s hub, and a corrupted version of each of the '
          + 'five behind it. Flare halves its speed again and burns inside '
          + 'a 70px dark aura that damages continuously, with a shadow burn worth 4 a tick instead of the '
          + 'ordinary one. Splash turns putrid: 130px, 6 damage a second, a 70% slow, and no dash, blink '
          + 'or dodge roll while you stand in it. Spur burs stick for 2 seconds and stack — five at once '
          + 'pins the victim for 3 seconds and then tears free for 12. Gust lays an 8-second electricity '
          + 'trail along the dash that shocks whatever it is hauling for 4 every 0.3s, and gives you 25% '
          + 'move speed to walk on. Ward lasts 25% longer and hangs a linked rock wall at 92px that stops '
          + 'enemies but not projectiles, shedding links that fly for 10 and a shove as it dies. Every '
          + 'one of the five charges 25 Darkness on cast — and none of it is forced, because the plain '
          + 'five are still one click away at the hub.',
        effects: [
          { tag: 'dot', label: 'Flare+ aura', detail: 'Half speed again — 55 px/s — inside a 70px dark aura dealing 3 damage every 0.4s to anything in it. The burn it applies becomes a shadow burn worth 4 a tick.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Splash+ is putrid', detail: '130px, 6 damage a second, and a 70% slow. Dashes, blinks and the Space dodge are all refused while you stand in it.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Spur+ sticks', detail: 'Burs stay in for 2 seconds and stack. Five at once pins the victim in place for 3 seconds, and tearing free costs them another 12.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Gust+ trail', detail: 'An 8-second electricity trail along the dash path. It deals 4 every 0.3s to anyone being hauled down it — and it is one of the things Dupe copies.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Gust+ road', detail: 'Standing on your own trail is +25% move speed.', requiresUpgrade: 'e' },
          { tag: 'shield', label: 'Ward+ wall', detail: '10s instead of 8, and a linked rock wall at 92px. It blocks enemy movement and lets projectiles straight through — the exact inverse of the stones inside it.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Ward+ shrapnel', detail: 'Over the last 3 seconds the links tear free one at a time and fly outward at 420 px/s for 10 damage and a hard shove. Whatever is left launches at once when the Ward dies.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'What each cast charges', detail: '25 Darkness per corrupted spell — four casts from empty is death. Switching Dark Magic back off at the hub costs nothing and stops the bleeding immediately.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Casting Ward again replaces the one you have — there is only ever one per side.',
        'With E+ alone and no F+, Dark Magic is a four-cast clock — which is exactly why it is a toggle. F+ Corrupted Data is what lets you leave it on.',
        'Gust moves you through the same gate every dash in the game uses, so High Gravity and a Splash+ pool both stop it dead while the rest of the spell still fires.',
        'Splash+ is the only thing in the kit that turns off the dodge roll, which is what makes Spur+ worth casting into it.',
      ],
    },

    'magic-anchor': {
      basics:
        'Paints a crosshair on the nearest enemy for 6 seconds. It does nothing by itself: every '
        + 'Sparkle Shot burst that catches them adds a tally, up to five, and right-click cashes the '
        + 'whole thing in for 8 damage a tally in a 110px burst — 40 at full. Let the 6 seconds lapse '
        + 'and you get nothing at all. 8s cooldown.',
      cast: 'R to place it on the nearest enemy. Right-click to fire it.',
      effects: [
        { tag: 'debuff', label: 'The mark', detail: 'Painted on the nearest enemy for 6 seconds. Re-casting R moves it rather than placing a second.' },
        { tag: 'resource', label: 'Tallies', detail: 'Every Sparkle Shot burst that catches the marked fighter adds one, up to 5. The reticle tightens and a pip fills for each.' },
        { tag: 'damage', label: 'Cashing in', detail: 'Right-click for 8 damage per tally in a 110px burst — 40 at five.' },
        { tag: 'cost', label: 'Letting it lapse', detail: 'Nothing. The tallies were never damage, only a promise of it.' },
      ],
      upgrade: {
        basics:
          'Right-clicking a crosshair with no tallies on it stops being a wasted mark. It fires one heavy '
          + 'magic missile at the target instead — 430 px/s, 15 damage in a 95px burst where it lands — '
          + 'and drops the crosshair on the spot, so the 8-second cooldown starts immediately.',
        effects: [
          { tag: 'damage', label: 'The shortcut round', detail: 'A missile at 430 px/s bursting for 15 in 95px on the first fighter it reaches.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'It clears the mark', detail: 'The crosshair is dropped the instant the missile launches, so the cooldown starts straight away rather than after the full 6 seconds.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'It marks the *nearest* enemy, not the one under your cursor — in a horde that is not always the one you wanted.',
        'An AI Magic has no right mouse button: it fires at four tallies, or in the last half-second before the mark lapses.',
      ],
    },

    'magic-meditate': {
      basics:
        'Opens a 140px duplication field at your cursor. Every one of your own conjurations standing '
        + 'inside it comes out twice — Flares, pools, storm clouds, funnels, Gust trails, burs, and the '
        + 'stones of a Ward you are standing in. Copies are the same tier as their originals and land '
        + 'with a small random offset. The cast is free: Darkness is charged by the corrupted spells, '
        + 'not by copying them. 6s cooldown.',
      cast: 'F, centred on the cursor. Instant.',
      effects: [
        { tag: 'summon', label: 'What it copies', detail: 'Anything of yours inside the 140px field: Flares, Splash pools, Gust trails, stuck burs, familiars and their leavings, and the stones of a Ward you are standing in.' },
        { tag: 'utility', label: 'The copies', detail: 'Same tier, same remaining lifetime, offset by up to 23px so a doubled object reads as two.' },
        { tag: 'control', label: 'It can finish a clutch', detail: 'Burs copy onto the same victim, so duping four Spur+ burs makes five — and five is the 3-second pin.' },
        { tag: 'resource', label: 'It is free', detail: 'No Darkness, no health, no resource of any kind — only the 6 second cooldown. Copying a corrupted spell does not charge you a second time for it.' },
      ],
      upgrade: {
        basics:
          'An enemy caught in the field is copied too, and comes out wrong. Each one sheds a glitching '
          + 'lookalike of you onto the floor for 14 seconds; walk over it and 20 Darkness comes off the '
          + 'bar. It is the only thing in the element that reduces Darkness at all, which turns the F '
          + 'cooldown into the kit\'s whole sustain loop — a free cast that pays 20 back off a bar only '
          + 'the corrupted spells ever fill.',
        effects: [
          { tag: 'resource', label: 'Corrupted data', detail: 'An enemy inside the field drops a glitched copy of you that lasts 14s. Walking over it sheds 20 Darkness.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The only way down', detail: 'Nothing else in the kit reduces Darkness. Without this upgrade every point charged is permanent for the match.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The field is centred on the cursor, not on you — you can copy a Flare halfway across the arena without walking to it.',
        'A corrupted spell charges its 25 or 50 Darkness once, on cast. The copy Dupe makes of it is free, which is the cheapest damage in the element.',
      ],
    },

    'magic-necronomicon': {
      basics:
        'Calls one base element up as a familiar for 18 seconds. It has health, it can be shot down, '
        + 'and it fights on its own — you only choose which one and when. It hangs off you until you '
        + 'are more than 150px apart, then drifts at whoever you are fighting. Fire and Water throw; '
        + 'Life, Wind and Earth have to close. 30s cooldown.',
      cast: 'Hold Q to open the wheel, choose a familiar, release. It arrives 2 seconds later.',
      effects: [
        { tag: 'summon', label: '🔥 Fire', detail: '45 HP. A fire bolt every 1.3s at up to 420px: 8 damage and a 2s burn.' },
        { tag: 'summon', label: '🌊 Water', detail: '50 HP. A dart every 1.5s at up to 420px: 6 damage and a 1.2s slow.' },
        { tag: 'summon', label: '🌿 Life', detail: '60 HP. A thorn lash every 1.2s within 96px for 7 — the warden has to come to you.' },
        { tag: 'summon', label: '💨 Wind', detail: '40 HP and the fastest of them. A shove every 1.1s within 110px: 5 damage and a hard knockback.' },
        { tag: 'summon', label: '🪨 Earth', detail: '80 HP and the slowest. A slam every 1.6s within 78px for 12 — the hardest ordinary hit of the five.' },
        { tag: 'cost', label: 'They can die', detail: 'A familiar is a body on the field. Hostile projectiles hit it for their full damage and it bursts when it runs out.' },
      ],
      upgrade: {
        basics:
          'A Dark Magic button appears at the Necronomicon\'s hub. With it on, familiars arrive '
          + 'corrupted: 40% more HP, a darker body under a rune halo, and a signature move '
          + 'on a long clock on top of the ordinary attack. Fire drops a bomb that detonates as a cross of '
          + 'four 200px fire pillars for 18. Water floods the whole arena for 4 seconds, slowing foes 20%. '
          + 'Life fires a barrage of 18 roots, 3 damage and a 1.5s root each. Wind raises an 8-second '
          + 'hurricane — and the eye of it is the best square on the board for its own caster. Earth opens '
          + 'five holes in the floor that swallow whoever steps in, including you. Every greater summon '
          + 'charges 50 Darkness on cast, and the plain five are still one click away at the hub.',
        effects: [
          { tag: 'damage', label: 'Fire+ cross bomb', detail: 'Every 7s: a bomb on the target that arms after 0.9s and detonates as a cross of four 200px pillars, 26px wide. 18 damage and a 3s burn. The diagonals are safe.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'Water+ flood', detail: 'Every 8s the whole arena goes under for 4 seconds: a 20% slow on foes with nowhere to stand it out.', requiresUpgrade: 'q' },
          { tag: 'control', label: 'Life+ root barrage', detail: 'Every 9s: 18 roots scattered within 150px of the target, each arming on its own timer for 3 damage and a 1.5s root.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Wind+ eye of the storm', detail: 'Every 10s an 8-second hurricane. Standing within 58px of its centre runs your cooldowns 70% faster and makes everything take 30% more damage.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Earth+ cracks', detail: 'Every 9s, five 34px holes open in the floor for 9 seconds. Stepping in one is 20 damage, a second underground, and a trip back to the centre of the arena — and it catches you exactly as readily as the enemy.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Tougher bodies', detail: 'Every upgraded familiar has 40% more HP: Fire 63, Water 70, Life 84, Wind 56, Earth 112.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'What each cast charges', detail: '50 Darkness a summon — half the bar. Two from empty is the limit before F+ has to pay some back, or before you switch the hub off and call a plain familiar instead.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Familiars are ordinary conjured objects, so Dupe copies them — including their tier and their signature clock.',
        'Levitate is the only thing that keeps a Magic caster out of their own Earth+ cracks.',
        'Ruin\'s Spikes of Ruin razes familiars along with Wards and funnels.',
      ],
    },
  },

  perks: {
    thunder: {
      basics:
        'The first press of E or Q calls lightning down and arms the book instead of opening the wheel, '
        + 'costing that press and stamping the cooldown. The next cast off that book comes out charged, '
        + 'and what "charged" means is different for each spell: a second Flare, a pool 35% wider doing '
        + 'double damage, a second volley of burs, a 1.2s stun on everyone a Gust is hauling, two extra '
        + 'stones on a Ward — and off the Necronomicon, a second familiar of the same kind.',
      cast: 'No key of its own. The first E or Q press of the fight arms; the next one casts.',
      effects: [
        { tag: 'utility', label: 'Arming', detail: 'The first press of E or Q calls a bolt down and arms that book. It costs the press and stamps the cooldown — nothing is cast.' },
        { tag: 'damage', label: 'Charged Flare', detail: 'A second Flare on the same line — 2 orbs, so 6 damage every 0.5s to anything caught between them.' },
        { tag: 'damage', label: 'Charged Splash', detail: 'The pool comes up 35% wider and ticks for double.' },
        { tag: 'damage', label: 'Charged Spur', detail: 'A second 3-bur volley — 6 burs for 30 damage, and with Spur+ that is a 5-bur clutch out of one cast.' },
        { tag: 'control', label: 'Charged Gust', detail: 'Everyone the gust caught is stunned for 1.2s on top of the haul.' },
        { tag: 'shield', label: 'Charged Ward', detail: 'Two extra stones bolted onto the orbit at 15 damage each.' },
        { tag: 'summon', label: 'Charged Necronomicon', detail: 'A second familiar of the same kind, and 15 seconds off the 30-second cooldown.' },
      ],
      notes: [
        'The charge is stored per book. Arming E does nothing for Q.',
      ],
    },
    decay: {
      basics:
        'A press on E or Q that lands while that book is still cooling hands the cooldown straight back, '
        + 'paid for in Darkness — 25 for the Grimoire, 99 for the Necronomicon. There is no affordability '
        + 'check at all: from 1 Darkness or higher, a Necronomicon reset takes you to 100 and kills you '
        + 'on the spot. The press that pays only refreshes the key; the next press is the one that opens '
        + 'the wheel.',
      cast: 'No key. Triggers on a press of E or Q that lands while that ability is on cooldown.',
      effects: [
        { tag: 'utility', label: 'Grimoire reset', detail: 'E while the Grimoire is cooling clears its cooldown outright, for 25 Darkness.' },
        { tag: 'utility', label: 'Necronomicon reset', detail: 'Q while the Necronomicon is cooling clears its 30-second cooldown, for 99 Darkness.' },
        { tag: 'cost', label: 'No affordability check', detail: 'The charge is applied unconditionally. From 1 Darkness or higher, a Necronomicon reset takes you to 100 and kills you on the spot.' },
        { tag: 'utility', label: 'It does not cast', detail: 'The press that pays only refreshes the key. The next press is the one that opens the wheel.' },
      ],
      notes: [
        'The reset is paid after the readout is drawn, so the "DECAY — READY" text lands before the corruption does — including on the press that kills you.',
        'Decay stacks on top of whatever the corrupted books are already charging, so a Decay caster has two taps on the same bar and only F+ to drain it.',
        'The perk\'s ingredients are life and acid.',
      ],
    },
  },
  mastery: {
    levitate: {
      basics:
        'Any damage whose source has not moved more than 1px in the last 3 seconds is refused outright '
        + '— no damage, no status, nothing — and every puddle effect in the arena skips you entirely, '
        + 'slow included. Projectiles, dashes, drags, orbiting stone and any hazard still travelling land '
        + 'normally, and the 3-second clock resets the instant a source moves. No key, no cooldown, no '
        + 'cost, applied every frame for as long as Magic Mastery is on.',
      effects: [
        { tag: 'shield', label: 'Stationary immunity', detail: 'Any damage whose source has not moved more than 1px in the last 3 seconds is refused outright — no damage, no status, nothing.' },
        { tag: 'shield', label: 'Puddles', detail: 'Every puddle effect in the arena skips a levitating fighter entirely, slow included.' },
        { tag: 'utility', label: 'What still hits', detail: 'Projectiles, dashes, drags, orbiting stone and any hazard that is still travelling all land normally — the 3-second clock resets the instant a source moves.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost. It is applied every frame for as long as Magic Mastery is switched on.' },
      ],
      notes: [
        'The rig says it: the floor circle shrinks by nearly half and the shadow moves out from under the caster\'s feet.',
        'Ruin\'s Unstoppable Decay strips buffs, and Levitate is one of the things it takes.',
      ],
    },
    transmogrify: {
      basics:
        'A bindable bolt travelling 130 px/s — slower than a walking fighter — connecting within 22px '
        + 'and expiring at the arena edge. Whoever it hits becomes a chicken for 8 seconds: unable to '
        + 'cast any ability at all, wandering at 60% speed in a direction that re-rolls every 0.4–0.9s, '
        + 'sprite swapped outright and restored when it ends, with a gold circle and feathers on the way '
        + 'in. The compensation is that their cooldowns run at half length throughout, so they come out '
        + 'of it with everything ready. Binding it costs that slot\'s base ability for the whole match — '
        + 'on Q, that means no Necronomicon at all. 12s cooldown.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Fired at the '
        + 'cursor, 12s cooldown.',
      effects: [
        { tag: 'utility', label: 'The bolt', detail: '130 px/s in a straight line — slower than a walking fighter — connecting within 22px. It expires at the arena edge.' },
        { tag: 'control', label: 'Chickened', detail: '8 seconds during which the target cannot cast any ability at all, and wanders at 60% of their speed in a direction that re-rolls every 0.4–0.9s.' },
        { tag: 'buff', label: 'The compensation', detail: 'Their cooldowns run at half length for the duration — cooldownMult ×0.5 — so they come out of it with everything ready.' },
        { tag: 'utility', label: 'The transformation', detail: 'Their sprite is swapped for the chicken outright and restored when the 8 seconds are up, with a gold circle and feathers on the way in.' },
        { tag: 'cost', label: 'What binding it costs', detail: 'The slot it is bound over loses its base ability for the whole match — binding it to Q means no Necronomicon at all.' },
      ],
      notes: [
        'The wander is applied after the AI has already decided where to go, so it beats every other movement the target had planned.',
        'It is the one thing in the kit with no aim delay — the 2-second wheel countdown does not apply, because it is not a wheel spell.',
      ],
    },
  },
};

export default magic;
