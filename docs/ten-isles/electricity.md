<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Voltreach — Electricity Isle

**The first isle beyond the Breakwater.** Voltreach is the nearest of the five abstract isles, out past
the Breakwater where the charted sea ends and the Outer Sea begins: black water, a swell that never
lies down, and a storm that has not stopped in living memory. The isle is a crown of black rock under
that storm, and every peak on it wears a lightning rod.

**The tyranny.** Empress Ohmrine of the Grid caught the storm. Copper cable strung pylon to pylon — **the
Grid** — runs over every roof on the isle and up to the **Crown Coil**, her tower of copper rings on the
summit, which drinks the lightning and the isle with it. Every door has a brass meter, and every household
owes **the Draw**: a quota of current cranked by hand (treadwheels, crank-handles, dynamos in every
kitchen) and drawn off down the wires each night at the **Brownout Bell**. A house that falls short is
*switched off* — lights, heat and the electric locks on its own door cut until the debt is paid — and a
house switched off three times is *earthed*: its people taken up the Crown Coil to crank in the Treadmill
Galleries until the Grid is satisfied. Flame is contraband (a candle is a theft from the Grid); the old
lamplighters were the first to be earthed. Ohmrine says she is charging the Coil to light the whole sea
forever, the Endless Current; nobody has seen it lit. Her six children govern the courts, each drawing the
Draw in their own way.

**Reaching it.** Bedrock Hold's docks chart Voltreach once Regent Gravane falls. The crossing is an
**Outer Sea crossing** (`IsleDef.outer`): 3800 m instead of 2600, darker water in three bands (the Outer
Swell, the Breakers, the Black Rollers), a swell that heaves the boat side to side, storm flashes, and
*breakers* — walls of white water across the whole sea with one trough to thread. It lands at Terminus.
Its sea beast is **the Galvaneel** — an eel as long as a harbour wall, blue-black with rows of glowing
cells down its flanks and a lantern-lure on its brow — which lights its cells and strings *arcs* across
the water (two charged floats, a crackling line between them, live on a beat: slip through when it
gutters); it drops the **Stormglass Mast** Uber-upgrade (every six seconds the mast takes the storm and
forks a bolt to the three nearest hazards ahead — rocks, drift and mines smashed, a beast scorched).

**The wanderer.** *Wren Filament*, the last lamplighter, who was never earthed because nobody could catch
her. She carries a lit oil lantern quite openly (contraband — she is very proud of it), a lamplighter's
pole with a hook and a snuffer, and a hand-cranked radio on which she listens to the pirate broadcasts of
"Radio Candle". Tutorial nudges (the Brownout Bell, charged and coolant and quantum fishing, the insulated
rod, the Outer Sea), gossip about every prince, reactions to each court freed, and a long arc after the
Empress falls (the Grid is cut, the Brownout Bell is rung one last time and never again, and Wren lights
every street lamp on the isle by hand, one night, with the whole isle following her).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `terminus` | Terminus | the harbour where the great undersea cable comes ashore: a cable-ship moored, the cable climbing the quay on iron trestles, pylons humming, the Meter House where quotas are chalked, rows of crank-houses, a lightning-rod lighthouse | landfall, docks + boatwright, sea fishing, bakery *The Element*, general store, tackle (insulated rod), waystone, roads to three courts |
| `dynamo` | The Dynamo Court | a power-station town on a storm river: turbine halls, waterwheel dynamos in the mill race, a forest of lightning rods, the great treadwheels, Leyden-jar banks, cables sagging overhead | 5 encounters, Prince Volt's generator hall, shop, quests, charged mill-race fishing (insulated rod), bakery *The Ovenlight* |
| `circuit` | The Circuit Court | a town laid out like a circuit board: copper-trace streets, resistor-striped houses, capacitor towers, the Tabulator (a valve computer the size of a chapel that reckons every Draw), punch-card mills, wind-up automatons | ″ + sump fishing (oil) |
| `bounce` | The Bounce Court | a rubber town: tapped rubber trees in plantation rows, vulcanizing works, balloon makers, bouncing streets, a trampoline square, a toy works full of clockwork | ″ + latex-pool fishing (syrup) |
| `lodestar` | The Lodestar Court | an iron crag round a great lodestone: every compass points at it, iron filings combed into field lines, boulders hanging in the air, the aurora always overhead, the polar observatory | ″ + aurora-tarn fishing (skyline rod) |
| `halflife` | The Halflife Court | a glowing mining town: pitch-blende pits, lead-roofed houses, decay clocks on every corner, glowing fungus, the reactor dome, a green cooling pond, workers in lead aprons | ″ + coolant fishing (insulated rod) |
| `superposition` | The Superposition Court | a town that is two towns at once: buildings flickering between their states, a street that is only there when watched, sealed boxes stacked everywhere, the double-slit gate, the Crown Coil's door (north) | ″ + quantum-well fishing (insulated rod); the Crown Coil door |
| `crowncoil` | The Crown Coil (dungeon) | the Empress's tower, climbed upward: the Treadmill Galleries (the earthed cranking in rows), the Capacitor Banks (Leyden jars tall as houses), the Faraday Cages, the terminal at the crown | gated by all 6 princes; 3 halls + 3 warden fights → the throne at the top |

## Encounters (5 per court) — name · foe (element) · gimmick

**Dynamo Court**
1. *Treadwheel* · Wheelhand Dobbin (earth) — the yard is a great turning treadwheel track; walking with
   the turn charges your meter, against it drains it; a full meter fires a lightning lance from the dais.
2. *Lightning Rods* · Rodsman Ferris (metal) — the storm strikes every few seconds at whoever stands
   farthest from a lightning rod (a cloud shadow gathers first); strike a rod to bend it toward the foe.
3. *Brownout* · Switchman Gloam (shadow) — the yard's lamp circuits go dark section by section; a
   fighter in the dark takes more but can't be seen to aim at; throw a breaker to bring a section back.
4. *Overload* · Fusewright Amp (gunpowder) — fuseboxes on the walls fill as hits land near them; a full
   fuse blows in a burst across its wall; pull a fuse out and throw it.
5. *Mill Race* · Millwright Tessa (water) — the race runs through the yard carrying fighters downstream;
   beside a spinning turbine you are charged (faster cooldowns), but its blades bite.

**Circuit Court**
1. *Traces* · Etcher Solde (fire) — the floor is copper traces; pulses race along them and zap whoever
   stands on a trace as one passes; strike a junction to switch where the pulses go.
2. *Logic Gates* · Gatekeeper Nand (justice) — walls with AND / OR / NOT gates in them open and close by
   which switch plates are stood on; whoever is shut in a cell with the foe's turret is shot.
3. *Punch Cards* · Clerk Hollerith (paper) — punched cards slide across the floor in strips; the punched
   holes are safe; caught on card as it feeds, you are carried and cut.
4. *Automaton* · Tinker Gearlock (creation) — the works winds up an automaton every few seconds; it marches
   for whoever last struck it; three automatons at once and they link arms in a line.
5. *Memory Leak* · Archivist Rom (memory) — every cast leaves a ghost that replays it a few seconds
   later, for both sides; ghosts fade if their owner is struck.

**Bounce Court**
1. *Trampoline Square* · Acrobat Pippa (air) — trampolines launch whoever steps on them across the square
   and land with a shockwave; airborne, you can't be hit — or steer.
2. *Rubber Band* · Slinger Elastica (bind) — the fighters are tethered by a great rubber band; stretched
   far it pulls hard, and let go it snaps both together in a slam.
3. *Balloon Works* · Balloonist Puff (gum) — balloons inflate on their strings; pop one for a blast that
   shoves; some carry tacks that scatter when popped.
4. *Vulcanize* · Curer Sulph (magma) — hot latex trails left by walkers set into rubber walls that
   bounce shots back; the vat steams and spills on a timer.
5. *Superball* · Pitcher Ricochet (gravity) — a superball ricochets round the square faster with every
   wall it hits and bowls over whoever it meets; strike it to send it.

**Lodestar Court**
1. *Lodestone* · Prospector Magda (earth) — the lodestone at the centre pulls everyone in, then flips and
   flings them out; iron plates on the floor slide with it.
2. *Polarity* · Dr. Anode (electricity) — each fighter carries a pole (N or S, shown on them); unlike
   poles attract, like ones repel; step on a pad to flip your own.
3. *Iron Filings* · Smith Ferrite (metal) — filings stand up along field lines across the floor; crossing
   a line slows you; shots curve along them.
4. *Compass Rose* · Navigator Bearing (fate) — a great compass needle sweeps the floor and shoots at
   whoever it settles on; carry an iron ingot and it swings to you instead.
5. *Aurora* · Skywatcher Borea (light) — aurora curtains drift down; inside one you are charged (shield)
   but lit (marked for the foe's shots); curtains shift colour and change their rule.

**Halflife Court**
1. *Half-Life* · Decayer Curie (death) — glowing isotope rods fall; their aura burns and halves in reach
   every few seconds; pick one up to throw it, but it burns you while held.
2. *Geiger Counter* · Counter Click (sound) — hot spots hide in the floor; the clicking quickens as you
   near one; standing on one hurts; the foe's footsteps reveal them.
3. *Chain Reaction* · Fissioner Uran (plasma) — neutrons bounce round the room; a neutron striking a fuel
   pellet splits it into two more; enough at once and critical mass blows.
4. *Lead Shield* · Plumber Galena (crystal) — the reactor vents a sweeping beam round the room; lead
   screens stand about to hide behind; strike a screen and it slides.
5. *Mutation* · Botanist Glow (growth) — every few seconds both fighters mutate: a random trait for a
   while (huge, tiny, quick, slow, glass, iron) shown on them.

**Superposition Court**
1. *Schrödinger's Box* · Keeper Felis (illusion) — boxes stand about, each both a cat (heal) and a vial
   (poison) until opened; opened in the foe's sight, it is whichever is worse for you.
2. *Double Slit* · Experimenter Young (light) — a slitted wall crosses the room; shots fired through it
   interfere into bands of strikes on the far side; walk the bands.
3. *Observer Effect* · Watcher Heisen (psychic) — hazards exist only where nobody is looking: whatever
   is behind a fighter becomes real, whatever they face fades.
4. *Entanglement* · Twins Bell (echo) — tiles come in entangled pairs; step on one and you are on its twin;
   damage taken on one twin of a pair is shared by whoever stands on the other.
5. *Tunnelling* · Phase-Walker Wick (subterfuge) — the walls flicker; a fighter pushed into a wall may
   tunnel through it to the other side; the foe tunnels on purpose.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Volt | Dynamo | *Live Wire* — dashes round the room stringing live cable between pylons he plants | *Generator* — plants himself in the great dynamo and spins it up: rotating spokes of arc | *Blackout* — the hall goes dark; only his crackle and his telegraphs show |
| Byte | Circuit | *Compile* — the floor becomes a grid of bits; patterns of tiles flip and strike | *Overclock* — he runs faster and faster, spawning subroutine drones that copy him | *Kernel Panic* — the arena reboots region by region; whatever is in a region rebooting is struck |
| Sprocket | Bounce | *Wind-Up* — a clockwork toy-prince on a pogo spring, bouncing in arcs and stamping down | *Stretch* — rubber limbs reach across the room: whips, grabs, slingshot launches | *Snapback* — everything rebounds: shots bounce off walls, his and yours |
| Polar | Lodestar | *North* — everything is pulled to him: iron plates and shot slide inward | *South* — everything is pushed off him: repulse rings, iron flung outward | *Magnetic Storm* — the poles flip every few seconds and the aurora comes down to the floor |
| Isotope | Halflife | *Fallout* — lobs glowing canisters that leave hot puddles | *Meltdown* — his core goes critical: a heat ring swelling, a falling ceiling of slag | *Half-Life* — he splits into two halves with half each, and halves again |
| Both | Superposition | *Here and There* — stands in two places at once; only one is real at a time, and a look tells which | *Collapse* — every attack is a probability cloud that collapses into one strike | *Many Worlds* — the Both of other worlds step through to fight beside him |

## The monarch — Empress Ohmrine of the Grid

Dungeon **the Crown Coil**: the copper tower climbed upward (the opposite of the Sepulchre): three halls
(the Treadmill Galleries — belts and treadwheels carrying you, the earthed cranking in rows, overseers'
sparks on the beat; the Capacitor Banks — Leyden jars tall as houses charging up and discharging at
whoever is nearest; the Faraday Cages — cages dropping from the ceiling, arcs crawling the bars) each
ending in a warden fight, then the terminal at the crown, where the Empress sits enthroned in the Coil's
top ring with the storm overhead.
Phases: *The Draw* (she draws current out of fighters on visible wires — drained, slowed; break a wire by
striking its pylon) → *The Grid* (the floor is a grid of live squares switching in patterns) → *Tesla
Crown* (the Coil discharges in spiralling arcs and ball lightning) → *Blackout* (the power fails; she is
lit only by her own crackle, and so are you). Hard: *The Endless Current* — she plugs herself into the
Coil and becomes the storm: the whole crown is live, the sky strikes, and her body is lightning.
