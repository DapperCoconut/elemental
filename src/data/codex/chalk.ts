import { ElementCodex } from '../AbilityCodex';

/**
 * Paint (element id `chalk`) — the element whose projectile, and whose enemy, are whatever you
 * painted.
 *
 * Verified against `src/elements/chalk.ts`, `kits/PaintKit.ts`, the five shop upgrades in
 * `data/Upgrades.ts` and the Paint Mastery enhancements in `data/Mastery.ts`. Paint has no
 * perks; every figure below is a constant at the top of the kit.
 */
const chalk: ElementCodex = {
  identity:
    'A messy painter with a very large brush. Two abilities hand you a canvas: what you paint for '
    + 'Splotch is what every shot you throw becomes, and what you paint for Still Life is what the '
    + 'enemy turns into — hitbox and all. The other three paint the floor under your cursor: an orange '
    + 'fuse that goes off end to end, congealed paint that sets into a wall, and the Masterpiece\'s '
    + 'huge brush. Red, blue and green mean the same on every ability that unlocks them: hurt, haste, '
    + 'heal.',

  passives: [
    {
      emoji: '🖼️',
      name: 'The Canvas',
      basics:
        'Right-click (or Still Life) puts a 220px sheet on an easel. Hold the mouse to paint: a blob '
        + 'every 6 canvas pixels, scaled into the world at 0.55×, so the sheet is about 120px of arena '
        + 'across. Ink is limited — 55 blobs for Splotch, 160 for Still Life — and shown under the '
        + 'sheet. The Splotch canvas is a menu: it holds you still and cuts damage taken to 5% while it '
        + 'is open. Still Life\'s is not: you can walk, it runs 5 seconds, and nothing protects you.',
      effects: [
        { tag: 'utility', label: 'Painting', detail: 'A blob every 6 canvas px of mouse travel; moving more than 40px between blobs lifts the brush. Canvas px × 0.55 = world px.' },
        { tag: 'resource', label: 'Ink', detail: '55 blobs on the Splotch canvas, 160 on Still Life. The colours share it.' },
        { tag: 'utility', label: 'Colours', detail: 'Q black always; E red, R blue and F green with the matching upgrade (Click+ for Splotch, F+ for Still Life). The swatches can be clicked too.' },
        { tag: 'shield', label: 'The Splotch easel', detail: 'Holds you still and cuts incoming damage to 5% while open, like every other in-match menu. Right-click or DONE to close.' },
        { tag: 'utility', label: 'Your brush is kept', detail: 'The Splotch you painted carries over into your next match until you paint another.' },
      ],
      notes: [
        'The bot has no mouse, so it paints from templates: a vertical bar (a wide sweep), a horizontal dart (long contact) or the plain splotch for Splotch, and a big hollow ring for Still Life.',
        'Online, the painting itself is sent to your opponent, so what flies at them is exactly what you drew.',
      ],
    },
    {
      emoji: '🖌️',
      name: 'Painting The Floor',
      basics:
        'E, R and Q open a window during which your cursor lays paint behind it: Volatile Orange for 2s, '
        + 'Congealed Paint for 1.5s (the Masterpiece is painted on a canvas instead). A window that is '
        + 'already open swallows every other key. 560 dabs may lie on the floor across both sides; past '
        + 'that the oldest Masterpiece paint goes first. Orange blasts are gated to one per victim every '
        + '180ms, and paint that burns takes the strongest single rate under you, never a sum.',
      effects: [
        { tag: 'utility', label: 'The brush', detail: 'Orange lays a dab every 16px (18px wide), walls every 8px (6px wide), the Masterpiece every 36px with a 78px brush. More than 96px between dabs lifts the brush.' },
        { tag: 'utility', label: 'One hand', detail: 'An open window swallows the other keys instead of being thrown away half-painted.' },
        { tag: 'utility', label: 'The blast gate', detail: '180ms of orange immunity per victim, so a dense line cannot chain-delete anyone.' },
        { tag: 'dot', label: 'Max, not sum', detail: 'A body standing on paint that burns takes the single highest rate under it: 18/s from red Masterpiece paint, 14/s from a red wall.' },
        { tag: 'utility', label: 'Stacking does nothing', detail: 'Paint over paint is just the top coat: only the top colour of a Masterpiece under you counts, two greens heal at the stronger rate (not both), two blues haste at the stronger rate, overlapping splotches hit a body once, and Yin-Yang, Splotch and Still Life measure the painted *area* — dabbing the same spot twice adds 0.' },
      ],
      notes: [
        'The bot paints with a phantom cursor: orange circled over your feet (all the way round when it owns the Paint Bucket), walls across the line between you, and its Masterpiece is painted on its easel — blue under itself, red round you, green when hurt — then projected round it.',
      ],
    },
  ],

  abilities: {
    'paint-splotch': {
      basics:
        'Throws your painted shape at 420px/s for 1.25s. It pierces everything and deals contact damage '
        + 'continuously to each body it overlaps — 3.5 every 16ms (≈219/s) for a 10-blob shape, scaled by 10 ÷ blobs '
        + '(between 0.3× and 1.6×), so a long line covers a big area for little and a tight blob hits '
        + 'hard. The shape faces where it flies: the right side of the canvas is the front. 0.5s cooldown.',
      cast: 'Click to throw toward the cursor. Right-click to repaint the shape. 0.5s cooldown.',
      effects: [
        { tag: 'damage', label: 'Contact', detail: '3.5 × (10 ÷ painted area in blobs, clamped 0.3–1.6) every 16ms of contact (≈219/s for a 10-blob shape), to each body touching any blob. Accrues every frame; fractions carry.' },
        { tag: 'area', label: 'The shape', detail: 'Whatever you painted, 5px blobs, recentred on its bounding box and turned to face the throw. The plain splotch is 8 blobs in a 6px ring.' },
        { tag: 'utility', label: 'Pierce', detail: 'Passes through every body for its whole 1.25s (≈525px) flight. Hostile Congealed Paint stops it.' },
        { tag: 'utility', label: 'Speed', detail: '420px/s. Up to 14 of yours in the air at once.' },
      ],
      upgrade: {
        basics:
          'The Splotch canvas gets red, blue and green, sharing the same ink. The share of each colour in '
          + 'the drawing sets its strength: red up to ×1.9 damage, blue up to a 50% slow for 1.4s, green '
          + 'up to 10 damage a second for 4s.',
        effects: [
          { tag: 'damage', label: 'Red', detail: '×(1 + 0.9 × red share) contact damage — up to ×1.9 for an all-red shape.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'Blue', detail: 'Contact slows by 50% × blue share for 1.4s. The strongest slow wins and is refreshed.', requiresUpgrade: 'click' },
          { tag: 'dot', label: 'Green', detail: '10 × green share damage a second for 4s, refreshed while in contact.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A line drawn along the throw (left to right) stays in contact for longer, which roughly makes up for its lower tick — a line drawn across it sweeps a lane.',
        'Still Life\'s red zones apply to splotch contact at the point it touches.',
      ],
    },

    'paint-orange': {
      basics:
        'Paint orange under your cursor for 2 seconds. 0.8s after the window closes the line goes off '
        + 'from the first dab to the last, 50ms apart: 10 damage within 38px per blast, once per victim '
        + 'every 180ms. 9s cooldown.',
      cast: 'E. A 2s painting window; the line starts going off 0.8s after it closes. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Each blast', detail: '10 damage within 38px of the dab.' },
        { tag: 'utility', label: 'The fuse', detail: '50ms between dabs in the order painted, starting 0.8s after the window closes. Dabs brighten as their turn comes.' },
        { tag: 'utility', label: 'The gate', detail: 'One blast per victim every 180ms — at most ~5.5 hits a second from standing on it.' },
      ],
      upgrade: {
        basics:
          'Every loop the line closes gets a paint bucket thrown into it (0.45s flight). The whole inside '
          + 'is painted orange on a 24px grid (up to 70 blobs across all loops) and explodes in a wave from '
          + 'the middle out — 10 damage within 30px per blob, starting 0.4s after the bucket lands.',
        effects: [
          { tag: 'area', label: 'A closed loop', detail: 'The line comes back within 40px of a dab at least 8 dabs earlier, enclosing at least 2500px². Each loop found in draw order gets its own bucket.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'The fill', detail: '10 damage within 30px per orange blob, the wave crossing the shape over 0.5s from the centre out.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'The limit', detail: 'Up to 70 fill blobs per line, shared between its loops.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The fill shares the line\'s blast gate, so someone caught inside is hit about every 180ms while the wave passes.',
        'Mastery: each enemy a line (or its buckets) damages counts once toward Volatile.',
      ],
    },

    'paint-congeal': {
      basics:
        'A fine brush for 1.5 seconds; the line sets into a wall that lasts 6 seconds from the end of the '
        + 'window. Hostile projectiles that touch it are destroyed, and enemies cannot walk through it. '
        + 'Only the other side is blocked. 8s cooldown.',
      cast: 'R. A 1.5s painting window. 8s cooldown.',
      effects: [
        { tag: 'shield', label: 'Blocks shots', detail: 'Any hostile projectile within 10px + half the brush of a wall dab is destroyed — arena projectiles, splotches and paint chip pellets alike.' },
        { tag: 'control', label: 'Blocks bodies', detail: 'Enemies are pushed back out to their radius + 8px from every dab, and lose the part of their velocity driving into it.' },
        { tag: 'area', label: 'The wall', detail: '6px brush, a dab every 8px, standing for 6s after the 1.5s window closes.' },
      ],
      upgrade: {
        basics:
          'E, R and F switch the brush to red, blue and green mid-wall (Q back to plain). Red burns enemies '
          + 'pressed against it for 14/s and deals 8 to whoever shot it. Blue makes you 35% faster while '
          + 'you touch it and for 2.5s after it eats a shot. Green heals you 8/s while you touch it and 6 '
          + 'per shot it eats.',
        effects: [
          { tag: 'dot', label: 'Red wall', detail: '14 damage a second to enemies touching it; 8 to the thrower of any shot it stops.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'Blue wall', detail: '×1.35 movement while within 24px of it (lingers 0.6s), and for 2.5s after it stops a shot.', requiresUpgrade: 'r' },
          { tag: 'heal', label: 'Green wall', detail: '8 HP a second while within 24px of it; 6 HP for every shot it stops.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Mastery: every shot a wall stops counts toward Set Like Stone.',
      ],
    },

    'paint-still-life': {
      basics:
        'Opens a canvas for up to 5 seconds (you can still move). When you finish — RMB, DONE, or the '
        + 'clock — the enemy nearest your cursor becomes the picture for 7 seconds: its sprite is hidden, '
        + 'the picture stands where it is, and its hitbox becomes a circle reaching the edge of what you '
        + 'drew (12–95px). Fewer than 3 blobs gives back all but 2s of the cooldown. 16s cooldown.',
      cast: 'F opens the canvas. RMB or DONE to finish early. 16s cooldown.',
      effects: [
        { tag: 'debuff', label: 'The hitbox', detail: 'A circle out to the furthest blob + 4px, between 12 and 95px — a big drawing makes a big target for everything, not just Paint.' },
        { tag: 'utility', label: 'Duration', detail: '7 seconds, flickering for the last 1.2s. A new Still Life from the same painter replaces the old.' },
        { tag: 'utility', label: 'Blank canvas', detail: 'Fewer than 3 blobs: no transformation, and the cooldown is cut to 2s.' },
      ],
      upgrade: {
        basics:
          'The Still Life canvas gets red, blue and green. Red parts of the picture take ×1.5 from shots '
          + 'that land on them (and the whole target takes up to 15% more); blue slows the whole target by '
          + 'up to 55%; green stops it healing and weakens its hits by up to 40%.',
        effects: [
          { tag: 'debuff', label: 'Red', detail: 'Projectiles, splotches and pellets landing within 13px of a red blob deal ×1.5. All damage taken ×(1 + 0.15 × red share).', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Blue', detail: 'Movement ×(1 − 0.55 × blue share) for the whole 7s.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Green', detail: 'Cannot heal; outgoing damage ×(1 − 0.4 × green share).', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Green\'s weakening rides the outgoing-damage multiplier, which bot projectiles honour fully; not every kit\'s damage reads it yet.',
        'Mastery: every successful transformation counts toward Life Drawing.',
      ],
    },

    'paint-masterpiece': {
      basics:
        'Invincible for 8 seconds while you paint on a canvas that is a map of the whole arena (you and '
        + 'every enemy are marked on it); E, R and F pick the colour. When you finish — RMB, DONE, or the 8s '
        + 'running out — every stroke lands on the floor exactly where you painted it on the map, with a 78px '
        + 'brush, and lasts 30s. Fill the sheet and you fill the arena. Red burns enemies on it for 18/s. Blue makes '
        + 'you 40% faster and your cooldowns run 60% quicker while you stand in it. Green heals you 10/s '
        + 'and cuts damage taken by 30% while you stand in it. 48s cooldown.',
      cast: 'Q opens the Masterpiece canvas (you can still move). E/R/F = red/blue/green; RMB or DONE unveils it early. 48s cooldown.',
      effects: [
        { tag: 'shield', label: 'Untouchable', detail: 'Invincible for the full 8 seconds.' },
        { tag: 'dot', label: 'Red', detail: '18 damage a second to enemies within 44px of a red dab.' },
        { tag: 'buff', label: 'Blue', detail: '×1.4 movement and +60% cooldown recovery while you stand on your own blue.' },
        { tag: 'heal', label: 'Green', detail: '10 HP a second and ×0.7 damage taken while you stand on your own green.' },
        { tag: 'area', label: 'The canvas', detail: 'A 330×220 sheet in the arena\'s own 3:2 shape — each canvas px is ≈2.9px of floor, edge to edge. 320 blobs of ink, enough to cover all of it.' },
        { tag: 'area', label: 'The work', detail: '78px brush on the floor, 340 dabs at most across your works, each lasting 30 seconds.' },
      ],
      upgrade: {
        basics:
          'For as long as any of your Masterpiece is on the floor, a paint chip crawls off it every 1.4s '
          + '(6 alive at most, 5s each), in the colour it came off. Red chips rush in at 200px/s and nip for 5 '
          + 'every 0.35s. Blue chips hold 200px off and fire a 10-damage pellet every 1.1s. Green chips run '
          + 'to you, latch on and heal 4 a second.',
        effects: [
          { tag: 'summon', label: 'Paint chips', detail: 'One every 1.4s from a random dab of your Masterpiece, up to 6 alive, 5s each.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Red chip', detail: '200px/s rusher, 5 damage every 0.35s in reach.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Blue chip', detail: '55px/s, keeps ~200px away, a 320px/s pellet for 10 every 1.1s.', requiresUpgrade: 'q' },
          { tag: 'heal', label: 'Green chip', detail: 'Runs to you at 170px/s, latches on and heals 4 HP a second.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Mastery: an enemy killed by red Masterpiece paint counts toward Gallery Opening.',
      ],
    },
  },

  mastery: {
    'paint-unfinished': {
      basics: 'Still on the easel — this passive is coming in a later update and does nothing yet.',
      effects: [
        { tag: 'utility', label: 'Not yet', detail: '0 effects for now. Paint Mastery\'s ability, Yin-Yang, is complete.' },
      ],
    },
    'yin-yang': {
      basics:
        'For 3.5 seconds, holding the mouse paints on ability bars instead of the floor: white on your '
        + 'own HUD bars, black on your opponent\'s, whose tray appears at the top of the screen. A fully '
        + 'white bar recharges twice as fast; a fully black one at half speed — partly painted, partly. '
        + 'Each dab flakes off 30s after it was laid. 40s cooldown.',
      cast: 'The bound key (R, F or Q — never E). A 3.5s window; hold the mouse over the bars.',
      effects: [
        { tag: 'buff', label: 'White', detail: 'A painted bar of yours recharges (1 + coverage)× as fast — up to twice as fast when fully covered.' },
        { tag: 'debuff', label: 'Black', detail: 'A painted bar of theirs recharges (1 − 0.5 × coverage)× as fast — down to half speed.' },
        { tag: 'area', label: 'Coverage', detail: '7px dabs every 7px of travel, up to 70 per bar; coverage is the painted share of the bar.' },
        { tag: 'utility', label: 'Duration', detail: 'Each dab lasts 30 seconds, fading over its last 3.' },
        { tag: 'control', label: 'Invasion', detail: 'No opponent tray — black goes on THE HORDE bar and lengthens every husk\'s attack interval by up to 60%.' },
      ],
      notes: [
        'Only the bars you painted are affected, so put white on the long cooldowns and black on theirs.',
        'Online, the paint itself is sent to your opponent, whose own sim slows their own bars.',
      ],
    },
  },
};

export default chalk;
