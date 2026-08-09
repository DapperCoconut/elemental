import { ElementCodex } from '../AbilityCodex';

/**
 * Bind — the element where every ability is a favour, and the favours are itemised.
 *
 * Verified against `src/elements/bind.ts`, `kits/BindKit.ts` and the five shop upgrades in
 * `data/Upgrades.ts`. Bind has no perks and no mastery enhancements; every figure below is a
 * constant at the top of the kit.
 */
const bind: ElementCodex = {
  identity:
    'Something in chains that asked for help, and got an answer. The eye hanging in the hole in '
    + 'the top of the sky does all the fighting — it burns, it shatters, it swipes — and it keeps '
    + 'an account. Overheat its beam, starve the idol you raised, hide behind its hexes, and the '
    + 'anger bar under the eye climbs. Fill it and the eye turns around and spends five seconds '
    + 'using this exact same kit on you. Nothing else in the game asks you to manage somebody '
    + 'else\'s mood, and nothing else charges you a permanent debuff for pressing E or an entire '
    + 'ability slot for pressing Q. Bind is not a damage element; it is a bookkeeping element '
    + 'with a very large weapon attached, and the skill is knowing how much worse you can afford '
    + 'to make the next minute.',

  passives: [
    {
      emoji: '👁️',
      name: 'The Patron',
      magic:
        'A veil of cosmic dark hangs across the top of the arena with an eye the size of a car '
        + 'set into it, gold-lidded with a purple iris, and a bar slung under it like a jaw with '
        + 'five runs of chain swinging off it. The eye opens wider the angrier it gets. Every '
        + 'attack in the kit comes out of it, which is why the bar is not a resource you spend — '
        + 'it is a record of how much of its patience you have.',
      effects: [
        { tag: 'resource', label: 'The bar', detail: '0 to 100 anger, marked in quarters. It is drawn once per arena: yours if you are the Bind player, the bot\'s if it is, never both.' },
        { tag: 'resource', label: 'What fills it', detail: 'Overheating the beam is a flat 20. A starved idol is 5 every second. Every hit the ward eats hands over half of the raw figure. Winding up Eviscerate is 4 a second and holding Over-rage is 7 a second.' },
        { tag: 'resource', label: 'What empties it', detail: '2 a second, always, and nothing else in the element lowers it faster. There is no dump, no cleanse and no way to trade damage for patience.' },
        { tag: 'buff', label: 'The cult discount', detail: 'Each convert takes 12% off anger as it is gained — 36% at three. It is applied to the bill, never to the bar, so a debt already run up stays run up.' },
        { tag: 'utility', label: 'The tell', detail: 'The eye\'s lid opens from about a quarter to nearly two-thirds as the bar climbs, and the bar itself goes gold, then orange past 70, then a strobing red the frame it turns.' },
      ],
      notes: [
        'The single fastest way to top the bar out is the ward. A 300-point ultimate eaten by one hex is 150 anger in one frame — half the bar and a bit, from one blocked hit.',
        'Anger does not accumulate at all during the five seconds the patron is turned; the bar is zeroed the frame it turns and is not touched again until it calms.',
      ],
    },
    {
      emoji: '⛓️',
      name: 'The Turning',
      magic:
        'At 100 the screen shakes, flashes red, and the eye swings round. For five seconds it '
        + 'runs the same routine the ultimate runs — shard volleys out of the sky, claw swipes, '
        + 'three-line laser sprays, dark-light beams dropped on the floor — with one boolean '
        + 'flipped, so every single one of them is aimed at the person who summoned it. Nothing '
        + 'in the kit answers while it does. It is not a stun; you can still walk, and there is '
        + 'nowhere in the arena to walk to.',
      effects: [
        { tag: 'damage', label: 'What it throws at you', detail: 'A 7-shard volley every 1.2s at 10 each in a 67px scatter, a 24-damage claw swipe in a 96px circle every 2.1s, three 8-damage lasers every 0.62s, and a 38-damage dark blast in a 122px circle every 3s after a 0.9s warning ring.' },
        { tag: 'cost', label: 'Nothing answers', detail: 'All five abilities refuse for the whole 5 seconds — the abilities are the eye\'s, and it is busy. The cooldown of anything you press is handed straight back, so being ignored does not also cost you the button.' },
        { tag: 'utility', label: 'It goes through the normal damage path', detail: 'This is somebody else\'s weapon pointed at you, not self-damage, so shields, absorbers and a standing Prophet\'s Protection are all allowed to answer it. A ward held in reserve is the real counterplay.' },
        { tag: 'resource', label: 'The reset', detail: 'The bar is set to 0 the instant it turns, so surviving the five seconds hands you a completely clean sheet.' },
      ],
      notes: [
        'The ultimate ends by topping the bar out on purpose, so every God of Treachery is fifteen seconds of open sky followed immediately by five seconds of it aimed at you. That is not a bug in the ultimate — it is the price on the receipt.',
        'The awakened god and the turned god are literally the same routine with one flag flipped, which is why the punishment is always exactly the thing you just watched it do for you.',
      ],
    },
  ],

  abilities: {
    'bind-summon': {
      magic:
        'You point, and a column of gold light falls out of the eye and lands on your cursor. It '
        + 'is a line drawn from the hole in the sky down to wherever the mouse is, and it burns '
        + 'the whole length of that line, not just the far end of it. A small bar appears over '
        + 'your head and fills while it fires; the fuller it is the faster the light bites, and '
        + 'the top of the bar has a red tick on it for a reason.',
      cast: 'Click, held. Each cast keeps the beam alive for 420ms and the ability re-casts on a 260ms cooldown, so a held button is one continuous beam and a bot spamming it produces the identical one.',
      effects: [
        { tag: 'damage', label: 'The burn', detail: '7 per tick to everything within 26px of the beam line — a segment running from the eye at the top of the arena down to the clamped cursor position, so a body standing anywhere under it is hit, not only the body at the aim point.' },
        { tag: 'damage', label: 'Tick rate', detail: 'Every 460ms cold, ramping smoothly to every 120ms at full heat. That is roughly 15 damage a second cold and 58 a second hot.' },
        { tag: 'resource', label: 'Heat', detail: '3.2 seconds of continuous fire from empty to full, and 4.5 seconds of not firing to bleed it all off again. It only rises while the beam is actually firing.' },
        { tag: 'cost', label: 'Overheating', detail: 'Topping the bar out is 20 anger, prints 🔥 OVERHEATED, and cuts the beam. Click is refused for the entire 4.5 seconds it takes the heat to reach zero — not until it drops below a line, until there is none left.' },
        { tag: 'utility', label: 'The cool', detail: 'It says ✦ COOL the frame the last of the heat goes, which is the signal to start again.' },
      ],
      upgrade: {
        magic:
          'Over-rage removes the wall. Hold the button through the top of the bar and the beam '
          + 'simply does not stop — no gap in the light, no refusal, permanently pinned at its '
          + 'fastest bite. A ring of red boils around you while it runs and the price is charged '
          + 'in blood and patience, by the second, with no ceiling on either.',
        effects: [
          { tag: 'buff', label: 'It never stops', detail: 'Heat is pinned at maximum and the beam keeps its 120ms tick — 58 damage a second — for as long as the button is held.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Blood', detail: '2 HP a second, taken from you as self-damage in whole-point bites so it lands as a stream of small hits rather than a per-frame trickle.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Patience', detail: '7 anger a second, flat, for as long as it is held — unlike everything else in the kit this rate does not scale with anything, and it will happily walk the bar to 100 and turn the god.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'No overheat charge', detail: 'The one-off 20 for topping the bar out is still paid the first time heat reaches full. Over-rage removes the stop, not the fine.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Because the beam is a segment from the top of the screen, standing directly under your own aim point is not safe from an opponent\'s beam and moving sideways is worth more than moving back.',
        'Nine seconds of Over-rage is 18 HP and 63 anger. It is a burst tool, not a stance — and with three converts the anger half of that bill drops to about 40.',
        'The beam is refused outright while the patron is turned or while the chains are on, and both refunds hand the 260ms straight back.',
      ],
    },

    'bind-shards': {
      magic:
        'You throw a hand down and twenty-five wedges of gold come out of the eye in a stagger, '
        + 'each with a small purple eye set into its face, all of them falling towards a scatter '
        + 'of points around your cursor. They read as a downpour rather than a wall. Then the god '
        + 'sends the bill, and the bill is permanent.',
      cast: 'E, aimed at the cursor. 6.5s cooldown. The shards leave the eye fanned across 150px of its width, staggered 26ms apart, so the full barrage takes about 0.62s to launch and each shard lives at most 2.6s.',
      effects: [
        { tag: 'damage', label: 'The barrage', detail: '25 shards at 10 damage each, bursting in a 34px radius where they land.' },
        { tag: 'area', label: 'The footprint', detail: 'Landing points are scattered across a 96px-radius disc around the cursor, weighted evenly by area. A body standing in the middle of it realistically catches five or six of them — 50 to 60 damage, not 250.' },
        { tag: 'utility', label: 'Speed', detail: '720 px/s down from the eye. A shard whose 2.6 seconds runs out bursts wherever it happens to be.' },
        { tag: 'cost', label: 'The tithe', detail: 'Every cast permanently applies one of three, chosen at random by the god and never by you: ×0.9 move speed, ×1.1 damage taken, or ×0.9 damage dealt. They stack multiplicatively with themselves — four speed tithes is ×0.66 — and nothing in the game removes one.' },
        { tag: 'cost', label: 'Charged on the ask', detail: 'The tithe is rolled when the barrage is thrown, not when it lands, so a barrage that hits nothing at all costs exactly as much as one that kills.' },
      ],
      upgrade: {
        magic:
          'Eviscerate turns the key into a hold. A reticle appears on the floor under your cursor '
          + 'and closes as you wind up, from a wide dinner-plate of a scatter down to a footprint '
          + 'smaller than a single shard\'s blast — which puts all twenty-five of them into one '
          + 'body. The god charges for the time you spend asking.',
        effects: [
          { tag: 'buff', label: 'The squeeze', detail: 'The 96px scatter closes to 18px over a 1.5s hold. At 18px every shard is inside every other shard\'s 34px blast, so a full charge is the entire 250 damage on one target.', requiresUpgrade: 'e' },
          { tag: 'cost', label: 'Winding up costs anger', detail: '4 a second for the whole hold, billed as it accrues rather than on release — a charge you abandon halfway still cost 3.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'It fires on the release', detail: 'The barrage lands where you finished aiming, not where you started, and the wind-up only begins once the cooldown is already up.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'The readout', detail: 'The floor reticle is the real one — it is drawn at the exact radius the shards will scatter across. A partial charge announces ⛓ EVISCERATE with its percentage; a full one just says ⛓ EVISCERATE.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Eviscerate does not change the damage, the count or the cooldown. It changes one number — the scatter radius — and that number is worth about 200 damage.',
        'The wind-up is cancelled with no cast at all if the patron turns or the chains go on mid-hold; the anger already spent on it is not refunded.',
        'Three tithes of the same kind is a real possibility and a real problem: the roll is a flat one-in-three each time with no memory of what it took last.',
      ],
    },

    'bind-idol': {
      magic:
        'A gold statue with the patron\'s eye on its front is planted where you point, and a wide '
        + 'ring of ground lights up around it. It is not a turret — it is a contract. Stand in '
        + 'the ring and its bead of faith fills and it starts throwing shards at whoever you are '
        + 'fighting. Walk away and it drains, and when it hits empty it stops asking politely and '
        + 'starts billing the god for your absence.',
      cast: 'R, planted at the cursor and clamped 40px inside the arena walls. 20s cooldown. A second cast moves it, which is the only way to abandon one without paying.',
      effects: [
        { tag: 'summon', label: 'The idol', detail: 'Holds up to 10 faith. It ticks once a second: +1 while you stand within 118px of it, −1 while you do not.' },
        { tag: 'damage', label: 'The volleys', detail: 'Every tick on which it has at least 1 whole faith, it throws 5 shards at 6 damage each into a 58px scatter around a live target — 30 damage a second while it is fed.' },
        { tag: 'area', label: 'The ring', detail: '118px radius, drawn on the floor under everything, and it visibly starves — the ring reads emptier as the faith drops.' },
        { tag: 'cost', label: 'Starvation', detail: 'A tick where faith is exactly 0 charges the patron 5 anger. It keeps charging every second until you come back.' },
        { tag: 'cost', label: 'Crumbling', detail: '6 seconds of continuous empty and the idol shatters itself. Left alone from full that is 10 seconds of drain and then 6 more of billing — 30 anger, and then no idol.' },
      ],
      upgrade: {
        magic:
          'Cult of the Broken God changes what the key is for. With an idol already standing, R '
          + 'stops raising statues and starts finding people: a hooded figure walks in with the '
          + 'patron\'s eye stitched onto the hood and a run of chain linking it to you. They have '
          + 'one job, which is to stand in the ring so that you do not have to.',
        effects: [
          { tag: 'summon', label: 'The converts', detail: 'Up to 3, permanent. Nothing in the game damages, dispels or times one out — the only thing that ever removes one is the ultimate.', requiresUpgrade: 'r' },
          { tag: 'resource', label: 'Faith share', detail: 'Each convert inside the ring feeds exactly ⅓ of a faith per tick. Three of them cancel the −1 drain outright and the idol never needs you again; two leave it bleeding ⅓ a second; one leaves it bleeding ⅔.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'The discount', detail: '−12% on all anger gained per convert, so 36% at three. Applied to the gain, never to the bar.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'The pace', detail: '+10% move speed per convert, up to +30%, multiplied against the speed tithes rather than added to them.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'How they move', detail: '190 px/s, milling within about 52px of their post so three of them never stack into one shape. They arrive at the idol, not at you.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The idol neither fires nor bills while its faith is a fraction between 0 and 1 — which is exactly the band one or two converts hold it in. That gap is the "drains slower" the cult is really buying.',
        'With no idol standing, R plants one even with the upgrade owned. The cultist branch needs something to worship first.',
        'A volley while the patron is turned is aimed at you, like everything else it throws.',
      ],
    },

    'bind-protection': {
      magic:
        'Three gold hexagons close around you and hang there turning. They do not reduce damage '
        + 'and they do not have a pool — each one eats an entire incoming instance and vanishes, '
        + 'whether that instance was 4 points or 400. Nothing is destroyed by this, only moved: '
        + 'half of everything they swallow is handed straight to the patron.',
      cast: 'F. 16s cooldown. A second cast replaces the standing ward outright rather than stacking — three charges is the ability, not a ceiling.',
      effects: [
        { tag: 'shield', label: 'The hexes', detail: '3 charges. Each intercepts one full instance of damage before any shield charge, shield pool or clotted HP gets a look at it, and the whole instance is nullified however large it was.' },
        { tag: 'cost', label: 'The share', detail: '50% of the raw amount absorbed goes on the anger bar. Eating three 60-damage hits is 90 anger; eating one 300-damage ultimate is 150 in a single frame.' },
        { tag: 'utility', label: 'The readout', detail: 'It prints ✦ WARDED with the charges left on every block, and ✦ WARD SPENT when the last hex goes.' },
        { tag: 'utility', label: 'It gives the old absorber back', detail: 'Whatever absorber you were already wearing is stored and handed back when the ward ends, so nothing else on your body is deleted by casting it.' },
      ],
      upgrade: {
        magic:
          'Chosen Vessel makes the hexes work in both directions. A halo of rungs appears under '
          + 'them, one per hex still standing, and while they stand you are faster and you hit '
          + 'harder — and every hit they eat for you takes a rung back.',
        effects: [
          { tag: 'buff', label: 'The rungs', detail: '+15% move speed and +15% damage dealt per hex still standing: +45%/+45% on a fresh ward, +30% at two, +15% at one, nothing once it is spent.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'It shares a writer with the tithe', detail: 'The damage half rides the same outgoing multiplier the ⅹ0.9 damage tithes eat out of, written once per frame, so a vessel carrying two damage tithes lands on exactly the figure both agreed to (×0.81 × 1.45).', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Speed stacks multiplicatively', detail: 'With three converts and a fresh ward that is ×1.3 × ×1.45 on top of whatever the speed tithes have taken.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The ward is the fastest route to a turned god in the entire element. Against a big single hit it is spectacular defence and half a bar of anger at the same time.',
        'It is also the only thing in the kit that answers the turned god, because the patron\'s own attacks go through the ordinary damage path. Keeping F in reserve for the five seconds after the ultimate is the intended play.',
        'Chosen Vessel is at its strongest the moment before it does anything: a full ward that has blocked nothing is the biggest buff in the element, and using it as armour is what turns it off.',
      ],
    },

    'bind-treachery': {
      magic:
        'The eye opens all the way and the sky comes apart. For fifteen seconds it does everything '
        + 'it knows how to do at once — volleys of shards, claw swipes out of nowhere, three-line '
        + 'laser sprays, and slow beams of dark light dropped in circles across the floor. You do '
        + 'none of it. Four chains come out of the corners of the arena, drag you into the exact '
        + 'centre of the room and hold you there, and you cannot press a thing. The price is taken '
        + 'on the way in, and the bill for the fifteen seconds is presented on the way out.',
      cast: 'Q, ultimate. Instant. 60s cooldown. A banner comes up asking which of your other four slots the god may have — it stalls for 0.8s before it will accept an answer, and Click needs a full release and press after that, so holding the beam through the prompt cannot cost you the beam.',
      effects: [
        { tag: 'damage', label: 'Shard volleys', detail: '7 shards at 10 damage each in a 67px scatter, every 1.2s — about 12 volleys across the ultimate.' },
        { tag: 'damage', label: 'Claw swipes', detail: '24 damage to everything within 96px of the swipe, every 2.1s, at a random angle across a target.' },
        { tag: 'damage', label: 'Laser spray', detail: 'Every 0.62s, three lines from three of the eye\'s pupils, each dealing 8 to anything within 20px of it. Roughly 24 volleys of three lines across the fifteen seconds.' },
        { tag: 'damage', label: 'Dark light', detail: 'Every 3s a circle is marked on the floor and 0.9s later a 122px blast lands in it for 38 damage, with a camera shake.' },
        { tag: 'control', label: 'The chains', detail: 'You are dragged to the centre of the arena over about 130ms and pinned there with velocity zeroed every frame, for the full 15 seconds.' },
        { tag: 'cost', label: 'You cannot cast', detail: 'All four other slots are dead for the duration and every keypress is drained rather than queued, so the whole fifteen seconds does not come out at once when the chains fall off.' },
        { tag: 'cost', label: 'A limb', detail: 'One of Click, E, R or F is locked for the rest of the match — 15 minutes, which is longer than any match. You choose which by pressing it. A bot picks at random from what it has left.' },
        { tag: 'cost', label: 'The closing bill', detail: 'The frame the sky closes, the anger bar is taken straight to the top and the patron turns — so every ultimate is 15 seconds of open sky followed immediately by 5 seconds of it aimed at you.' },
      ],
      upgrade: {
        magic:
          'Awakening is what the converts were for. Every hood in your cult comes off at once and '
          + 'there is no head under any of them — a mass of open gold eyes. Awakened, they stop '
          + 'worshipping and start taking orders from your cursor, and when the sky closes each '
          + 'of them puts a shard of oblivion through its own chest for having been allowed to '
          + 'see.',
        effects: [
          { tag: 'damage', label: 'Their volleys', detail: 'Each awakened convert throws 3 shards at 9 damage every 1.6–2.2s, into a 130px scatter — deliberately wider than your own barrage, because they are converts and not marksmen.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Their charge', detail: 'Every 2.9–3.8s one runs at 780 px/s straight through a target for 18 damage, overshooting 120px past it. The run is swept rather than sampled, so it cannot skip a body at that speed, and each body is hit once per charge.', requiresUpgrade: 'q' },
          { tag: 'movement', label: 'They follow the cursor', detail: 'An awakened convert homes on your mouse rather than the faith ring, and moves at 1.5× its hooded pace.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'They all die', detail: 'Every convert that woke up stabs itself the frame the ultimate ends. A cult that was never awakened — because you had no Q+ — just keeps standing in the ring.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The god\'s attacks during the ultimate and the god\'s attacks during the wrath are the same code with one flag flipped, so the fifteen seconds are a preview of the five that follow.',
        'A second ultimate costs a second slot. There are four to give, and once all four are gone the ultimate is genuinely free — a 60s cooldown makes that a five-ultimate match, which is unlikely but not impossible.',
        'Awakening is a hard choice against Cult of the Broken God: the converts are permanent and unkillable right up until you press Q, at which point every one of them is spent.',
        'A starving idol topping the bar out mid-ultimate ends the ultimate early — the patron turning cancels everything it was doing on your behalf, including this, and the converts still pay for having been woken.',
      ],
    },
  },
};

export default bind;
