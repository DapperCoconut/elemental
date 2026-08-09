import { ElementCodex } from '../AbilityCodex';

/**
 * Passion — the element that wins without ever seriously touching the health bar.
 *
 * Verified against `src/elements/passion.ts`, `kits/PassionKit.ts` and the five shop upgrades
 * in `data/Upgrades.ts`. Passion has no perks and no mastery enhancements; every figure below
 * is a constant at the top of the kit.
 */
const passion: ElementCodex = {
  identity:
    'A duellist in a good suit with a heart-shaped pistol and absolutely no interest in your '
    + 'health bar. Passion fills a second meter over your head instead — one exactly as big as '
    + 'the health you had when it first laid eyes on you — and the frame that meter tops out '
    + 'you are charmed, and charmed means dead, through every shield and absorb and '
    + 'invincibility in the game. Nothing lowers it. There is no cleanse, no decay and no way '
    + 'to trade damage back into it. So a Passion player losing the health fight badly is still '
    + 'winning the only fight that ends the match, and the counterplay is not to out-heal them: '
    + 'it is to kill them first, or to stop looking at them while they pose.',

  passives: [
    {
      emoji: '💘',
      name: 'The Love Bar',
      magic:
        'A second meter appears above every enemy\'s health bar the moment Passion sees them — '
        + 'a wine-black slab with a hot pink fill that beats rather than sits still. It only '
        + 'ever goes up. There is no ability, item, heal, cleanse, shield or death in the game '
        + 'that takes a single point back off it, and when the fill reaches the end of the bar '
        + 'the fight is simply over for whoever was wearing it.',
      effects: [
        { tag: 'utility', label: 'How big it is', detail: 'The victim\'s maximum health at the instant Passion first sights them, latched there for the rest of the match. A 400-health player is a 400-point project; a world boss is an enormous one; a 40-health Invasion husk is two clicks.' },
        { tag: 'damage', label: 'Filling it', detail: 'Charms them on the spot and deals 100% of their remaining health as pierce damage marked already-net — the one combination that skips every mitigation multiplier, every shield charge, every clotted pool and every damage absorber in the game. A 400-point bar is 400 love, and the last point of it is lethal whatever they are standing behind.' },
        { tag: 'utility', label: 'It never falls', detail: 'Nothing lowers it. Healing to full does not touch it, and neither does killing the Passion player and being fought by somebody else — the meter is on the victim.' },
        { tag: 'utility', label: 'Sighting, not hitting', detail: 'The bar is created the first frame the enemy is a valid target, not on the first hit. A husk that has already been chipped by somebody else would otherwise get a cheaper bar than a fresh one.' },
      ],
      notes: [
        'The bar is the element\'s only win condition worth planning around. The 12-damage pistol is there to make the fight last long enough to finish the bar, not to end it.',
        'In Invasion the maths inverts completely: dozens of small bars mean the ultimate can charm half a wave at once.',
        'Everything Passion draws is drawn on the *victim* — the bar, the blush, the eyes. The caster\'s own screen shows nothing about their progress except what is over the other person\'s head.',
      ],
    },
    {
      emoji: '💗',
      name: 'The Three Stages',
      magic:
        'The bar has three marks on it — a quarter, a half, three quarters — and crossing one is '
        + 'announced on the body it happened to. A light blush appears on their cheeks at 25%. '
        + 'At 50% it deepens to wine and starts pulsing twice as fast. At 75% their eyes turn '
        + 'into hearts and beat like a real one, two thumps a cycle. It is a tell for both sides '
        + 'of the fight, and it is also a real mechanic: Flirt reads it.',
      effects: [
        { tag: 'buff', label: 'What a stage is worth', detail: 'Flirt gains +5 love for every stage the target has already passed — 30 at none, 35 past a quarter, 40 past half, 45 past three quarters.' },
        { tag: 'utility', label: 'The announcements', detail: '💗 BLUSHING at 25%, 💓 SMITTEN at 50%, 💞 LOVESTRUCK at 75%. Each fires exactly once per victim, with a burst of hearts that grows with the stage.' },
        { tag: 'utility', label: 'Read before the cast', detail: 'Flirt takes the stage the target walked in with, so the cone that crosses a threshold is paid at the old rate and the next one at the new.' },
        { tag: 'utility', label: 'Half is the gate', detail: 'The 50% mark is also Smooch\'s minimum: below it the kiss refuses to land at all.' },
      ],
      notes: [
        'The stages are why Passion snowballs. Every one of them makes the cone that fills the bar fill it faster, so a Passion player who has survived to half is very likely to reach the end.',
        'Heart eyes at 75% are the single loudest tell in the element — if an enemy has them, they are four Flirts from losing.',
      ],
    },
  ],

  abilities: {
    'passion-loveshot': {
      magic:
        'A gold-trimmed pistol comes up in the off hand and fires a heart — a bright pink one '
        + 'with three shrinking ghosts of itself strung out behind it and a soft glow around the '
        + 'body. It is the only thing in the entire kit that deals damage, and it is deliberately '
        + 'feeble until the meter has been doing its work: the gun is powered by how much they '
        + 'already love you.',
      cast: 'Click, one shot per press, fired from the pistol muzzle rather than the body centre. 0.55s cooldown.',
      effects: [
        { tag: 'damage', label: 'The shot', detail: '12 damage, plus 2 more for every full 80 love already on the target — so a 400-point bar that is full is worth +10, for 22.' },
        { tag: 'utility', label: 'The love', detail: '15 on a hit, added after the damage is worked out, so a shot never pays itself the bonus it just created.' },
        { tag: 'area', label: 'The bullet', detail: '720 px/s for 1.5 seconds — about 1080px, most of an arena — and it lands on anything within 38px of it.' },
        { tag: 'utility', label: 'The recoil', detail: 'The pistol rocks back on every shot and settles over about 130ms. Cosmetic, but it is the tell that the shot actually left.' },
      ],
      upgrade: {
        magic:
          'Show-off turns marksmanship into flattery. Three hearts in a row, all connecting, and '
          + 'whoever caught the third is Impressed: a gold frame snaps around their love bar with '
          + 'three hearts orbiting it, and for five seconds everything you put into that bar is '
          + 'worth half again as much. One shot into empty air and the count goes back to zero.',
        effects: [
          { tag: 'buff', label: 'Impressed', detail: '5 seconds in which all love landing on that target is ×1.5 — from any source, not just the pistol.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The run', detail: '3 consecutive Loveshots that each touch a body. The counter shows as 😏 1/3 and 😏 2/3 over the target.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'The reset', detail: 'A heart that expires or leaves the arena without touching anybody prints 💔 MISSED and zeroes the run. Nothing else breaks it — being hit, being stunned and swapping targets are all fine.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The third shot pays at 1×', detail: 'Its own 15 love is banked before the window opens. The reward is the five seconds afterwards, not the shot that bought them.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Three shots into three different bodies still completes the run, and the window lands on whoever caught the third — in an Invasion wave that is a real way to pick which husk gets the good five seconds.',
        'Impressed multiplies with Seduce rather than overriding it. A seduced Exhibition pouring into an Impressed target is ×2.25, which is the intended ceiling of the whole element.',
        'The damage bonus reads the raw love total, not the fraction. A big enemy with a big bar and a lot of love on it feeds the gun harder than a small enemy who is nearly charmed.',
      ],
    },

    'passion-flirt': {
      magic:
        'A wide sweep of the free hand and a cone of hearts opens up in front of you. There is '
        + 'no projectile and there is no damage — nothing in the cone takes a single point of '
        + 'health. It is the element\'s engine: the cheapest, widest and most reliable way to '
        + 'move a bar, and it gets better every time the bar it is aimed at gets fuller.',
      cast: 'E, aimed at the cursor, resolved instantly on everything in the cone. 8s cooldown. Cast into empty air it still says so — 😐 NOBODY THERE — and still spends the cooldown.',
      effects: [
        { tag: 'utility', label: 'The love', detail: '30 base, +5 for each of the three stages the target has already passed: 35 past a quarter, 40 past half, 45 past three quarters.' },
        { tag: 'area', label: 'The cone', detail: '200px of reach and about 38° either side of the aim — a ~76° wedge — landing on everybody inside it at once.' },
        { tag: 'utility', label: 'No damage at all', detail: 'Zero. It cannot finish anybody, cannot break a shield, and cannot proc anything that keys off being hit.' },
      ],
      upgrade: {
        magic:
          'Dating makes practice count. Every Flirt you have performed this match makes the next '
          + 'one land harder, permanently and without a ceiling — a running total announced over '
          + 'your head as 💌 DATING and carried in the status tray as a count.',
        effects: [
          { tag: 'buff', label: 'The step', detail: '+4 love per Flirt already cast this match. The tenth Flirt is worth its 30–45 plus 36.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'No cap', detail: 'Uncapped by design, and it never expires within a match. In a long fight this quietly becomes the largest number in the element.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Whiffs count', detail: 'The counter goes up on a Flirt that caught nobody. The practice is the point, so cones into empty air between engagements are a real way to build it.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'It pays forward', detail: 'The increment is applied after the cast that earned it, so the very first Flirt of a match is always worth its plain 30.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The stage bonus and Dating stack additively into one figure, and Impressed or Seduce then multiply the whole thing.',
        'This is the ability that makes Passion unraceable. Every point it lands makes the next cone land harder, and nothing the victim does takes any of it back.',
      ],
    },

    'passion-smooch': {
      magic:
        'A hard forward dash with a ring of hearts thrown off the launch, kiss prints stamped '
        + 'along the floor behind you, and a red mark left on anybody you catch. The dash always '
        + 'happens. Whether the kiss does is the ability: below half a bar they simply are not '
        + 'interested, and it prints 💔 NOT YET and gives you nothing.',
      cast: 'R, aimed at the cursor. The dash is applied after movement resolves, so WASD cannot cancel it mid-flight. 8s cooldown.',
      effects: [
        { tag: 'movement', label: 'The dash', detail: '820 px/s for 260ms — about 213px — in a straight line at the cursor.' },
        { tag: 'utility', label: 'The kiss', detail: '30 love plus 15% of the love already on them. At 200 love that is 60; on a target sitting at 90% of a 400 bar it is 84.' },
        { tag: 'cost', label: 'The gate', detail: 'Refused outright below 50% of the bar. No love, no damage, no consolation — only the dash and a 💔 NOT YET.' },
        { tag: 'area', label: 'Who it catches', detail: 'Anything within 36px of the swept path, once per body per cast — so a dash through a crowd kisses each of them exactly once.' },
        { tag: 'utility', label: 'The prints', detail: 'Kiss marks on the floor along the dash for 1.4s, and a bigger one under anybody kissed for 3s.' },
      ],
      upgrade: {
        magic:
          'Make-out is the finisher. Kiss somebody who is already at 90% and the ability stops '
          + 'being a kiss: the pair is dragged together and pinned either side of a point between '
          + 'them, a halo of hearts opens up around them, and five kiss prints land one at a time '
          + 'in an arc overhead. When the fifth is done their bar is filled outright.',
        effects: [
          { tag: 'control', label: 'The grab', detail: 'Both fighters are written to positions 15px either side of the midpoint, every frame, for 2.4 seconds. Not velocity — position — so neither of them can walk out of it.' },
          { tag: 'damage', label: 'The finish', detail: 'After the 5th kiss the bar is set to 100% and the charm fires: their entire remaining health, through any shield or absorb, from as much as 10% of a bar still to go.', requiresUpgrade: 'r' },
          { tag: 'shield', label: 'Untouchable while it runs', detail: 'The caster takes ×0 damage for the whole 2.4 seconds — the same field Spare uses. Nothing anybody does lands on you mid-animation.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'You are locked too', detail: 'No ability can be cast out of it, the dash is cancelled on the spot, and the five kisses land at 320ms and then every 416ms.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'The threshold', detail: '90% of the bar, checked at the moment the kiss connects. Between 50% and 90% it is an ordinary Smooch.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The immunity during Make-out is not on the shop card and is worth knowing: a Passion player at 20 health can commit to the finisher and cannot be killed out of it.',
        'If either fighter dies during the animation — the caster to a hazard, a husk cleaned up by a wave reset — it ends silently and pays nothing at all.',
        'An ordinary Smooch scales off love *already banked*, so it is worth far more late. Opening with it is throwing the cooldown away.',
      ],
    },

    'passion-manipulate': {
      magic:
        'A rose is taken between the teeth and held there, wilting visibly over fifteen seconds '
        + 'while petals shake loose every time anything reaches you. Holding it does not stop '
        + 'anybody hitting you — it makes hitting you progressively pointless, one permanent-'
        + 'feeling cut at a time. Press F again and the rose leaves your teeth end over end, and '
        + 'it is worth more the closer to death you are when you throw it.',
      cast: 'F to take the rose. F again at any point in the 15 seconds to throw it at the cursor — a recast, not a second cast, so it does not touch the cooldown. 10s cooldown.',
      effects: [
        { tag: 'shield', label: 'The thorns', detail: 'Every point of damage aimed at you while the rose is held buys another ×0.95 on everything you take, for 5 seconds. Multiplicative and uncapped, so ten stacks is 40% off and it approaches zero without reaching it.' },
        { tag: 'utility', label: 'What counts as a hit', detail: 'The raw damage aimed at you, so a hit your shield eats outright still buys a stack. Each stack is its own independent 5-second timer — they expire one by one rather than refreshing.' },
        { tag: 'utility', label: 'The hold', detail: '15 seconds, and the ability bar shows the rose\'s clock rather than the cooldown for all of it. It prints 🥀 WITHERED if it runs out unthrown.' },
        { tag: 'utility', label: 'The throw', detail: '20 love at full health, scaling linearly to 60 at 50 health or less. 620 px/s for 1.7 seconds, landing on anything within 42px.' },
        { tag: 'utility', label: 'The tell', detail: 'Whoever is hitting you sees 🥀 -X% DMG over their own head as the stacks go on, and carries a Weakened card in their tray for as long as it lasts.' },
      ],
      upgrade: {
        magic:
          'Spare is what happens when three things are true at once and nobody can go through '
          + 'with it. Rose in your teeth, everybody still alive at least half in love with you, '
          + 'and you inside the last tenth of your health — and every enemy on the field stops, '
          + 'a heart wells up over each of them, their weapon hands start shaking, and for five '
          + 'seconds nothing they do to you lands at all. Then the hearts crack and they get '
          + 'over it.',
        effects: [
          { tag: 'shield', label: 'Nothing lands', detail: '×0 incoming damage for 5 seconds. It is not a shield with a pool — it is a multiplier of zero, so there is nothing to break through.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'All three conditions', detail: 'Rose held, your health at or under 10% of maximum, and every living enemy at 50% love or more. Checked every frame while the rose is up; it fires the instant all three are true.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Once per rose', detail: 'One window per rose taken, cleared only when a fresh rose goes into your teeth — which means the rose has to be armed before the fight gets desperate, not as a reaction to it.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'The countdown', detail: 'Their hearts shake harder and crack across the middle over the second half of the window, and it ends with 🥀 THEY OVERCOME IT — the frame damage starts landing again.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The card says the thorns cost "the attacker" damage. Mechanically it is a defensive multiplier on the rose-holder, so it applies to everything hitting you from any source at once, including hazards.',
        'Throwing the rose ends the thorns immediately. The choice between 60 love and another few seconds of armour is the whole ability.',
        'A Passion bot has no recast key, so it milks the hold for 5.2 seconds and then throws at whoever is nearest.',
        'Spare and Make-out ride the same immunity field, and only one of them is ever written per frame — holding a rose through a finisher cannot double anything.',
      ],
    },

    'passion-exhibition': {
      magic:
        'One hand on the hip, the other thrown up behind the head, and the arena becomes a red '
        + 'carpet. Flashbulbs go off along alternating side walls five times a second, aimed '
        + 'inward, and a crowd noise comes up underneath it. Anybody who is looking at you is '
        + 'losing the fight while they do it — and the counterplay, uniquely in this element, '
        + 'costs them nothing but their aim.',
      cast: 'Q, ultimate. Instant, no aim. 5 seconds of posing, and the ability bar shows the pose\'s own clock draining rather than a cooldown. 45s cooldown.',
      effects: [
        { tag: 'utility', label: 'The love', detail: '15 a second, charged continuously, to every enemy who is looking at you. Nothing at all to anybody who is not.' },
        { tag: 'area', label: 'What counts as looking', detail: 'Within about 60° either side of dead-on — a 120° arc of attention. For a player that is where their cursor is; for a bot it is the direction it is walking, latched so that standing still does not reset them.' },
        { tag: 'cost', label: 'You stand still', detail: 'The stance is held for the full 5 seconds. You are not invulnerable, not faster and not shielded — you are a stationary target being photographed.' },
        { tag: 'utility', label: 'When nobody watches', detail: 'It says so, once a second: 👀 NOBODY IS LOOKING. The ultimate keeps running and pays nothing.' },
      ],
      upgrade: {
        magic:
          'Seduce widens the ultimate from a source of love into a window of it. While the pose '
          + 'is up, every point of love you land is worth half again as much — not just the '
          + 'pose\'s own drip, but bullets, cones, kisses and thrown roses alike.',
        effects: [
          { tag: 'buff', label: 'The multiplier', detail: '×1.5 on all love you deal for the 5 seconds the pose runs, from every source in the kit.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'The pose becomes 22.5/s', detail: 'And a Flirt landed during it is 45–67.5 instead of 30–45.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Stacks with Impressed', detail: 'The two multipliers are on different sides of the transaction — Seduce on you, Impressed on them — so they multiply out to ×2.25.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'A human opponent can beat the ultimate outright by pointing their mouse at a wall. A bot usually cannot, because its facing is its movement and it is normally walking at you.',
        'A bot that has never moved is assumed to be looking at whoever it is fighting, so a stationary turret-style enemy is always watching.',
        'The kit deliberately does not read the shared facing angle other elements maintain — that one is only kept up to date while Silence is in the match, and the ultimate would have quietly stopped working in every other matchup.',
        'Mature mode, the toggle unlocked on this element\'s info panel, changes only how the pose and an upgraded Make-out are drawn — five garments tumble off and lie where they land for the duration. No number anywhere changes.',
      ],
    },
  },
};

export default passion;
