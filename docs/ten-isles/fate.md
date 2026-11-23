<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Lotterhaven — Fate Isle

**The third isle beyond the Breakwater.** Lotterhaven lies east of Fangmire and Voltreach across the Outer
Sea: a terraced green isle laid out like a gaming table — lawns cut as smooth as baize, hedges trimmed into
the four suits, roads paved in black and red squares, gilt domes and clock-towers on every hill, and at the
summit the House, the Croupier-King's casino-palace, its great Wheel turning on the roof where the whole
isle can see it. Bells, rattling dice and the slap of cards carry on the wind; the air smells of cigar
smoke, brass polish and rain on felt.

**The tyranny.** The Croupier-King Lucan says that chance is the only fair ruler, and that he is merely its
dealer. Every child on Lotterhaven is given a **Lot** at birth — a brass token stamped with a number, worn
on a chain at the throat and never taken off. Each week, at **the Draw**, every Lot on the isle goes into
the great drum at the Draw Halls and numbers are called: the drawn are **conscripted** to the War Court, or
owe the **Wager-Tithe** (a stake the House always wins), or must **pawn a memory** at the Remembrance Court,
or **pay hours** into the Clockwork Court's clocks (the hours are taken: you lose an afternoon and wake
older). A household can buy a re-draw — by wagering, at the House, against the House. Nobody has ever been
seen to win. Those who lose everything are **busted**: their Lot is snapped, a black chip is hung on the
chain instead, and they serve the House as numbered croupiers who may not speak their names. Everyone knows
the drum is rigged — the King's favourites are never called — and nobody can prove it, and Lucan smiles and
says the house is only chance in a good suit. His six "lucky children" govern the courts.

**Reaching it.** Fangmire's docks chart Lotterhaven once Matriarch Nyxa falls. It is an **Outer Sea crossing**
(`IsleDef.outer`) and lands at Tosswater. Its sea beast is **the Wheelback** — a turtle the size of a reef
whose shell is carved and inlaid as a roulette wheel that spins as it swims, red and black wedges round a
gilt hub, barnacled with chips; it rolls **dice** onto the sea (a die the size of a boat tumbles across the
water in a line, lands showing pips that tick down, and at zero bursts in a ring of spray; it can be shot to
knock it on early) and drops the **Fortune Helm** Uber-upgrade (the boat's wheel is a tiny roulette wheel
that spins itself every seven seconds and lands on a boon: *gust* — a burst of speed; *ward* — shrug off
the next blow; *broadside* — a shot at the nearest hazard ahead).

**The wanderer.** *Marlo Fairshake*, a card-sharp who was cheated by the House out of everything, including
two years of hours, and now plays only honest games — on an upturned crate, for buttons. Long coat with
cards up both sleeves, a cracked monocle, a Lot on her chain that she claims is a forgery. Her magpie
*Tuppence* steals shiny things from informers and drops them at Marlo's feet. Tutorial nudges (the Lot and
the Draw, gilded and lethe fishing, the fortune rod, the Outer Sea), gossip about every prince, reactions to
each court freed, and a long arc after the King falls (the drum is broken open and found to have a false
bottom full of the favourites' Lots; Marlo runs the last Draw in the square — every number wins, and what
it wins is the citizen's own name, read aloud; the black chips are melted into a bell).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `tosswater` | Tosswater | a harbour where berths are drawn by lot: dice-shaped bollards, the Draw Hall with its great brass drum and the weekly numbers board, a pawnshop with three gold balls, lottery kiosks on every jetty, a lighthouse built like a spinning top, gulls fighting over dropped chips | landfall, docks + boatwright, sea fishing, bakery *The Lucky Loaf*, general store, tackle (fortune rod), waystone, roads to three courts |
| `card` | The Card Court | the card-sharps' town on baize lawns: houses built as giant houses of cards, held down with paperweights; the Dealing Hall under a green glass lamp; fortune-tellers' tents with tarot; a shuffling machine the size of a mill; suit-topiary hedges | 5 encounters, Prince Ante's Dealing Hall, shop, quests, baize-pond fishing (pond), bakery *The Fortune Cookie* |
| `treasury` | The Treasury Court | the King's mint and counting-houses: coin presses thumping in a row, gilt roofs, a vault door as tall as a house set into the hillside, the scales of tribute in the square, a toll bridge, bankers in top hats, a gilded pool where the mint's spill settles | ″ + gilded-pool fishing (gilded, fortune rod) |
| `clockwork` | The Clockwork Court | the clockmakers' town where the hours are paid: gear-towers, a great astronomical clock over the square, pendulum bridges, the Hour Office where queues hand over their afternoons, hourglasses big as wells, cuckoo houses, an oil sump under the works | ″ + oil-sump fishing (oil) |
| `remembrance` | The Remembrance Court | the memory-pawnbrokers' town: shelves of bottled memories glowing softly in shop windows, a portrait gallery, the Archive, fields of forget-me-nots, a sepia mist, and the pale Lethe pool where pawned memories are washed out | ″ + lethe fishing (lethe, fortune rod) |
| `mind` | The Mind Court | the mentalists' town, where bets are checked by mind-readers so nobody can bluff the House: séance parlours, the Thought Exchange, crystal balls in every window, a chessboard plaza with living pieces, a hypnotist's theatre | ″ + séance-well fishing (quantum) |
| `war` | The War Court | the war-lottery town on the summit slope: the Drafting Wheel where conscripts are drawn, a parade ground, barracks, siege engines, a tilt yard, banners everywhere, a muddy trench line, and the House's door (north) | ″ + trench fishing (bog); the House door |
| `house` | The House (dungeon) | the Croupier-King's casino-palace, climbed floor by floor from the cellar door (south) up to the High Table (north): the Roulette Floor (a hall-wide wheel with a ball the size of a boulder running its track), the Dice Stair (dice as tall as a man tumbling down the steps), the Card Gallery (a floor of face-down cards that flip), then the High Table under the Wheel | gated by all 6 princes; 3 halls + 3 warden fights → the High Table |

## Encounters (5 per court) — name · foe (element) · gimmick

**Card Court**
1. *Cut the Deck* · Dealer Shuffle (magic) — a giant deck lies in the middle; strike it to cut, and the
   card turned sets the next few seconds' rule for both (♥ hits heal the striker, ♠ hits cut deeper, ♦ speed,
   ♣ hits stun); the foe cuts when it suits it.
2. *House of Cards* · Builder Tier (earth) — tall card-houses stand about the room; a blow near one topples
   it in a fan of flying cards that cuts whoever is beside it; they are slowly rebuilt, storey by storey.
3. *Tarot* · Seer Arcana (death) — three face-down tarot cards lie on the floor; step on one to turn it:
   The Tower (rubble falls on your foe), The Hanged Man (you are held a beat), The Star (you heal); after a
   while they are dealt again, shuffled.
4. *Snap* · Gamesman Pip (electricity) — cards flip face-up across the floor one by one; when two cards of
   the same rank show, a bolt cracks between them; the first fighter to touch a matched card claims a snap
   (a burst at the foe).
5. *Fifty-Two Pickup* · Joker Jape (rubber) — the foe flings the deck: cards scatter face-down over the
   floor; walk over one to pick it up — most are a small boon, the jokers go off in your hand.

**Treasury Court**
1. *Coin Press* · Minter Stamp (metal) — great presses stamp down along a row on a beat (their shadows
   darken first), crushing whoever is under them and minting a coin; carry coins and spend them by
   striking the till for a gold shot at the foe.
2. *Interest* · Banker Compound (sand) — damage dealt is not paid at once: it is lent, and grows with
   interest on a ledger over each fighter, landing as a lump at the bell; strike the strongbox to call in
   your loans early.
3. *Gilded* · Miser Gilt (crystal) — wherever the foe walks the floor turns to gold leaf; gilded tiles weigh
   down whoever walks on them (slowed), but a blow shatters them into coins that heal the picker a little.
4. *Toll Bridge* · Tollman Levy (air) — turnstiles split the room into lanes; passing through one costs a
   toll of health unless you are carrying a token, and tokens drop from the toll-box when it is struck.
5. *Scales of Tribute* · Assayer Balance (justice) — a giant scale's two pans stand either side; a fighter's
   pan sinks, the empty pan rises and its weights are hurled at the one who is lower; both on — the
   heavier-hurt fighter's pan sinks.

**Clockwork Court**
1. *Pendulum* · Swinger Bob (gravity) — great pendulums swing across the room on their own beats (their arcs
   are traced on the floor); the bob launches whoever it meets, and a launched fighter flung into the
   other hits them too.
2. *Cogwork Floor* · Fitter Ratchet (technology) — the floor is interlocking gears turning slowly, carrying
   fighters round their rims; meshing teeth bite; strike a gear's axle to reverse it and its neighbours.
3. *Cuckoo* · Cuckoo-Keeper Chirp (gluttony) — a cuckoo clock on the wall: its hands point at a fighter, and
   on each hour the bird bursts out and dives at whoever the hour-hand points to; strike the hands to turn
   them.
4. *Hourglass* · Sandman Grain (dune) — a great hourglass stands in the room, its sand running into a
   pool on the floor; a fighter in the falling sand has their cooldowns run faster, the other's slower;
   when it empties it flips and the pool moves.
5. *Rewind* · Horologist Reprise (echo) — the clock strikes and the room rewinds: both fighters snap back to
   where they stood three seconds ago (ghost trails show where you will land), keeping their health.

**Remembrance Court**
1. *Pawned Memories* · Pawnbroker Hock (gum) — bottled memories sit on shelves round the room, each recording
   a blow from earlier in the fight; break a bottle and it plays the blow back at whoever it struck before.
2. *Forget-Me-Not* · Florist Myosotis (growth) — blue flower beds bloom across the floor; standing in them
   your cooldowns run faster, but trampled beds wilt; the foe tramples where you stand.
3. *Portrait Gallery* · Curator Likeness (chalk) — portraits hang round the walls; stand before one and it
   paints you, and the painted you steps out of the frame and repeats your last cast on its own.
4. *Déjà Vu* · Archivist Again (paper) — every so often the room has seen this before: faint replays of the
   foe's last few attacks play again from where they were first thrown, telegraphed in sepia.
5. *Lethe* · Ferryman Oblivion (water) — pale pools of Lethe water lie about; wade in and you heal, but you
   forget your last-used ability for a few seconds (silenced) — and the foe drinks when it is losing.

**Mind Court**
1. *Mind Reader* · Medium Ouija (soul) — a planchette glides over a spirit board on the floor; letters it
   stops on light up; each letter, when lit, fires at whoever stands nearest it; the foe reads where it
   will stop.
2. *Poker Face* · Bluffer Tell (shadow) — a card hangs over each fighter's head, face-down to themselves
   and face-up to the other; on the bell the higher card strikes the lower; strike your foe to swap cards.
3. *Telekinesis* · Lifter Levitas (magnet) — chairs, crystal balls and tables float up round the room and
   are flung at whoever the foe faces; you can turn them by facing them yourself.
4. *Hypnosis* · Mesmerist Swoon (dream) — a great spiral wheel turns on the wall; whoever faces it while it
   spins is held, swaying; look away from it, and turn the foe to face it.
5. *Mind Swap* · Switcher Doppel (quantum) — every so often a ripple joins the two fighters and their
   cooldown clocks swap: whatever the other had ready, you now have ready, and theirs is spent.

**War Court**
1. *Conscription* · Sergeant Draft (fire) — a lottery drum spins at the yard's edge and draws a numbered
   conscript, who marches in and fights for whichever fighter the number names; strike the drum to draw.
2. *Siege Line* · Engineer Trebuchet (gunpowder) — trebuchets at the yard's end lob stones at whoever stands
   farthest from them; a landing stone leaves a crater that blocks the way.
3. *The Standard* · Standard-Bearer Pennon (light) — a war banner stands in the yard; whoever holds the
   ground beside it rallies (hits harder); knock it down and it re-plants where it falls.
4. *Tilt Yard* · Jouster Lance (hunt) — a tilt rail runs through the yard; along it, charging horses thunder
   on a beat, lance-first; ride the rail yourself by dashing onto it.
5. *Fog of War* · Scout Feint (illusion) — a map table shows the yard; the room is fogged except round each
   fighter and the scouts' lanterns; the foe is only seen when a lantern finds it.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Ante | Card | *The Deal* — deals cards in fans that fly out and stick upright in the floor, then flip to show their suit and act (♠ blades, ♥ heal him, ♦ explode, ♣ root) | *High Roller* — rolls giant dice across the arena; each lands on a face and fires that many pips as shots | *Wild Card* — draws a joker each cycle that copies the last move the player hit him with and throws it back |
| Bullion | Treasury | *Coin Toss* — flips coins high (their shadows show); heads bursts, tails leaves a puddle of molten gold | *Gold Standard* — gilds himself (armoured from the front) and swings a gold bar; the gilt flakes where he is struck from behind | *Market Crash* — gold bars fall from above in a jagged market-chart line that rises and crashes across the arena |
| Tock | Clockwork | *Tick-Tock* — every attack lands exactly on the beat of a great metronome; clock-hand sweeps round the arena | *Mainspring* — rolls toothed gears across the floor that mesh where they cross, and winds up a spring that releases in a dash | *Stopped Clock* — stops time: the player freezes mid-step while he sets attacks round them; when time restarts they fire at once |
| Hindsight | Remembrance | *Recollection* — an echo of the player walks the path they took a few seconds ago and strikes where they were | *Forgotten* — the arena forgets itself: patches of floor fade to nothing (holes) and are remembered back, shifting | *Total Recall* — every attack he has made this fight rains back at once, faint then solid |
| Gambit | Mind | *Foresight* — reads the player: his shots are aimed where they are going, shown as faint arcs | *Checkmate* — the floor becomes a chessboard and pieces move by chess rules (rook lines, bishop diagonals, knight leaps), threatening their squares | *Sacrifice* — gives up his own pieces (and health) to double the next move's threat |
| Banneret | War | *Charge* — cavalry lanes: banner raised, he charges straight across the arena with riders beside him | *Muster* — draws lots: ranks of conscripts with pikes march across in lines with gaps | *Last Stand* — plants the war banner: inside its ring he cannot be pushed and hits harder; tear it down |

## The monarch — the Croupier-King Lucan

Dungeon **the House**: the Croupier-King's casino-palace, climbed from the cellar door (south) to the High
Table (north): three halls (the Roulette Floor — a hall-wide wheel turning under you, numbers lighting, a
boulder-sized ball running the rim track; the Dice Stair — a great stair down which dice as tall as a man
tumble on a beat, their faces deciding where they burst; the Card Gallery — a floor of face-down cards that
flip when stepped on, some blank, some aces that strike) each ending in a warden fight, then the High
Table under the Wheel, where Lucan deals.
Phases: *The Deal* (he deals the player a hand of rules — face-up cards along the arena's edge, each a rule
that holds until it is struck off) → *Roulette* (the arena is the wheel: it turns, red and black wedges
light, and the ball drops on a number — whoever stands on that wedge is hit) → *Loaded Dice* (giant dice
fall; their faces are his to choose, and he cheats — watch for the die that turns over after it lands) →
*All In* (he stakes his own health: a pot builds between you, every hit adds to it, and at the bell the
fighter who landed more takes the pot out of the other). Hard: *The House Always Wins* — he cheats openly:
once a cycle he rewrites the last thing that happened (the last hit you landed is undone, or the last hit
he took is dealt back), and the Wheel on the ceiling shows when.
