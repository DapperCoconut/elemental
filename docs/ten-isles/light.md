<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Solmara — Light Isle

**The fifth and last isle beyond the Breakwater.** Solmara rises out of the Outer Sea far to the north-east: a
white limestone isle of terraced marble towns, glass roofs and gilded domes, crowned at its summit by **the
Heliostat** — a vast iron crown of tilting mirrors, each the size of a sail, turned on the sun. For twenty-two
years it has been noon on Solmara. The sun hangs straight overhead, pinned there by the mirrors; nothing casts
a shadow longer than a coin, the sea round the isle glitters white, and the whole place smells of hot stone,
lamp oil, turpentine and scorched linen. Nobody on Solmara under the age of twenty-two has seen a star.

**The tyranny — the Endless Noon.** Despot Auriel says darkness is where lies live, so he abolished it. The
law is **Clarity**: everything must be seen. Doors are glass, curtains are contraband, shutters are nailed open.
A shadow is a hiding place, so shade is **rationed**: each household is issued a **Dusk Ticket**, one hour of
shade a day in a licensed **Dusk-house** (long queues, a clerk with a stopwatch, a blackout room where people
sleep sitting up). Anyone caught in unlicensed shade — under a cart, behind a wall, in their own room with a
blanket over the window — is a **shade-thief**: tried at the Tribunal and **bleached**, held in the focus of the
Burning Glass until they fade translucent. The bleached are called **Clears**: you can see through them, they
cast no shadow, they can never hide again, and they are made to walk the streets as a warning (their colour
comes back, very slowly, only in darkness — which there is none of). The courts all serve the Noon: the Noon
Court keeps the Burning Glass, the Tribunal judges shade-thieves, the Lantern Court will not let even the dead
lie in the dark (every soul is caught in a lantern and hung up to glow), the Arcane Court's sigils hold the
Heliostat's mirrors to the sun, the Workshop grinds and builds its mirrors, and the Mural Court paints the
Despot over every wall — always in full noon light, and a painter who paints a shadow is bleached. His six
"Radiances" govern the courts.

**Reaching it.** Choirholm's docks chart Solmara once the Maestro falls. It is an **Outer Sea crossing**
(`IsleDef.outer`) and lands at Meridian Quay. Its sea beast is **the Lensback** — a sea turtle the size of a
harbour, its shell a dome of leaded glass panes; it tilts the dome to focus the endless noon into **burning
spots** on the sea (a glint telegraph swells on the water, then a white beam scorches the spot — a plank and a
scorch mark that burns a moment longer) and drops the **Burning Glass Prow** Uber-upgrade (`uber-burningglass`:
a lens on the prow gathers the sun and every seven seconds lances a beam ahead that burns away the two nearest
hazards in front of the boat).

**The wanderer.** *Sable Merrow*, a Clear: the old lighthouse-keeper of Meridian Quay, bleached for keeping a
shuttered room to sleep in. You can see the quay through her; she casts no shadow; she talks about night like
a story from before she was born. With her flies **Nocturne**, a big pale luna moth that rests on her shoulder
and is the only thing on the isle that seeks the dark — it flutters toward whatever shade there is and she
follows it. Tutorial nudges (the Noon and Clarity, Dusk Tickets, the Clears, sunpool and mana fishing, the
prism rod, the Outer Sea), gossip about every prince, reactions to each court freed, and a long arc after the
Despot falls (the Heliostat's mirrors are turned away one by one and the sun is let go; for the first time in
twenty-two years it sets — Solmara watches its first evening in total silence; then the first night: children
screaming at the stars; Sable lights the lighthouse lamp again, and with each night a little more of her
colour comes back).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `meridian` | Meridian Quay | a harbour of white stone and glare: mirror-buoys flashing off the moles, a tall lighthouse whose lamp has not been lit in twenty-two years, a glass-roofed fish market, the Customs of Clarity (bags emptied onto a sunlit table), a licensed Dusk-house with a long queue and a clerk with a stopwatch, sun-bleached sails, Clears drifting along the jetties | landfall, docks + boatwright, sea fishing, bakery *The Golden Crust*, general store, tackle (prism rod), waystone, roads to three courts |
| `noon` | The Noon Court | the sun-plaza on the central terrace: a vast white marble square with no shade at all, sundials whose shadows never move, gilded sun-temples, statues of Auriel with sunbursts for heads, the **Burning Glass** (a lens as big as a house on an iron gantry) where shade-thieves are bleached, Clears waiting in line, a reflecting pool too bright to look into | 5 encounters, Prince Lumen's Solarium, shop, quests, reflecting-pool fishing (sunpool, prism rod), bakery *The Sunrise Bun* |
| `tribunal` | The Tribunal Court | the summit terrace below the Heliostat: the glass Courthouse of Clarity (you can see every trial through its walls), jury galleries, cages of mirror where the accused wait in the sun, a great bronze scale on the steps, the Despot's Palace of Noon behind gilded railings, the Heliostat's iron legs rising over everything, and the Heliostat door (north) | ″ + fountain fishing (pond); the Heliostat door |
| `lantern` | The Lantern Court | the town of caught souls in a deep gorge: thousands of lanterns hung from wires across the gorge, each holding a soul glowing pale blue even in the noon glare, lantern-makers' shops, wick-keepers on ladders, a still lantern-lake where paper boats carry lanterns, a mourning house with its shutters nailed open | ″ + lantern-lake fishing (lethe) |
| `arcane` | The Arcane Court | the mages' town: observatory towers (useless — no night), sigil circles burned into the flagstones holding the Heliostat's mirrors to the sun, floating runestones, a spellwrights' academy with a lecture dome, potion stalls, a familiar market, the **Mana Font** — a spring of liquid light | ″ + font fishing (mana, prism rod) |
| `workshop` | The Workshop Court | the artificers' town: mirror-grinders and lens-polishers under glass roofs, glassblowers' furnaces, a crane yard hoisting new mirrors for the Heliostat, clockwork automata at the stalls, patent-office notice boards, drafting tables with blueprints pinned in the sun, a quench tank | ″ + quench-tank fishing (steam) |
| `mural` | The Mural Court | the painters' town: every wall one huge mural of Auriel in noon light, scaffolds and rope cradles, colour-mills grinding pigment, a river running in stripes of colour from the dye works, censors whitewashing any shadow they find, easels in the streets, the Shadowless Gallery | ″ + pigment-river fishing (ink) |
| `heliostat` | The Heliostat (dungeon) | the Despot's mirror-crown, climbed from its base (south) to the Crown (north): the Lens Gallery (great lenses on rails focusing burning spots that walk the floor), the Mirror Maze (a beam bouncing between angled mirrors; turn the mirrors), the Sun Chain (a gear-tower beside the giant chain and cogs that hold the sun) — then the Crown of Mirrors under the pinned sun | gated by all 6 princes; 3 halls + 3 warden fights → the Crown |

## Encounters (5 per court) — name · foe (element) · gimmick

**Noon Court**
1. *Burning Glass* · Lensman Kindler (fire) — a great lens on a gantry tracks the slower-moving fighter, its
   focus spot creeping after them and brightening from gold to white; at white it scorches. Strike the gantry's
   wheel to swing the lens onto the other fighter.
2. *High Noon* · Deputy Glint (metal) — every twelve seconds the noon bell strikes: both fighters are rooted for
   a beat, a "DRAW!" flashes, and the first to cast after it deals a heavy bonus hit; whoever casts before the
   call is stunned for jumping the gun.
3. *Awnings* · Shade-Warden Pale (shadow) — standing in the open sun builds sunburn (a meter that ticks damage);
   canvas awnings drift across the plaza on poles and their shade cools you; strike an awning's pole to bring it
   down on whoever is beneath.
4. *Heliograph* · Signaller Flash (electricity) — mirror-posts stand round the plaza and the foe flashes signals
   between them in a chain; crossing a live link dazzles you (a short stun); strike a mirror to turn it so its
   link points somewhere else.
5. *Sun Dogs* · Sun-Priest Parhelia (air) — two mock suns orbit the arena; each locks a ray onto the fighter it
   faces and fires down it after a beat; strike a sun dog to make it blink out for a while.

**Tribunal Court**
1. *Glass Cage* · Gaoler Lucent (crystal) — glass cages drop from above (their shadow shows first) round
   whoever is beneath: the caged can't leave, but shots pass in through the bars; strike a cage from either side
   to shatter it.
2. *Jury Box* · Foreman Twelve (psychic) — twelve jurors sit in a box; a hit landed with flair (from range, from
   behind, mid-cast) turns a juror to your colour; every fifteen seconds the verdict is read: the majority side is
   healed and empowered, the minority struck by a bolt from the bench.
3. *Objection!* · Advocate Rebuttal (echo) — when a fighter casts, the other has a short window ("OBJECTION?"
   over their head) to cast back: if they do, the first cast is overruled — its shots near them are reflected.
4. *Contempt of Court* · Marshal Banish (magnet) — a ring of law-stones marks the bounds of the court and
   shrinks and drifts; a fighter outside it is in contempt and silenced until they step back in.
5. *Sworn Oath* · Oath-Keeper Vow (passion) — each fighter is made to swear an oath shown above them ("I will
   not dash", "I will not cast my Q", "I will stand my ground" — stay in a ring); keep it ten seconds and you are
   absolved (a heal and a ward); break it and a bolt of judgement strikes you.

**Lantern Court**
1. *Lantern Lake* · Lantern-Diver Glimmer (water) — paper boats carry soul-lanterns across a lake floor; touch a
   lantern to free its soul, which orbits you and takes one hit for you (or flies at the foe when struck); the
   foe collects them too.
2. *Wick Trimming* · Chandler Snuff (wax) — lanterns stand on posts with their wicks burning down on a visible
   clock; when one gutters out, its soul escapes as a wailing wisp that hunts the nearest fighter; stand by a
   lantern to trim it and reset its clock.
3. *Astral Projection* · Medium Séance (dream) — the foe's soul leaves its body and roams invulnerable, striking
   from the air while its body stands empty; strike the empty body to drag the soul back, stunned.
4. *Soul-Thread* · Binder Tether (string) — a glowing thread binds the two fighters; stretched past its length it
   burns and drags whoever is pulling away, so the fight stays close; strike the knot at its middle to cut it for
   a while.
5. *Weighing of Hearts* · Psychopomp Feather (air) — a great feather-scale hangs over the gorge; each fighter's
   heart grows heavier with the damage they deal; when the scale tips (every twelve seconds) the heavier heart is
   punished (a jaw of light rises under them, telegraphed) and the lighter one is healed.

**Arcane Court**
1. *Counterspell* · Abjurer Null (silence) — a rune hovers over the foe naming one of its keys (E / R / F / Q) as
   warded; casting that key at it fizzles and silences you; the warded key turns every few seconds, and the
   foe's own rune over you does the same to it.
2. *Familiars* · Witch Grimalkin (hunt) — familiars wander the circle (a cat, an owl, a toad); touch one to bind
   it and it follows and acts for you (the owl marks the foe so your hits land harder, the cat pounces, the toad
   swallows one shot); the foe binds them too.
3. *Wild Magic* · Surge-Mage Fizzle (quantum) — every cast may surge (a coloured spark shows which): the caster
   blinks to a random spot, a ward sprouts round them, a bolt fires in a random direction, or the cast comes back
   off cooldown at once.
4. *Summoning Circle* · Conjurer Evoke (fire) — a five-pointed circle with a candle at each point; stand on a
   point to light its candle in your colour; when one fighter holds all five, an imp is summoned on their side.
5. *Mana Font* · Font-Keeper Wellspring (water) — fonts of liquid light spout across the floor; standing in one
   speeds your cooldowns, but its glow fills as you stand there and an overfull font bursts on whoever is in it.

**Workshop Court**
1. *Blueprint* · Draughtsman Plan (paper) — a blueprint is chalked on the floor in cyan lines; parts drop in and
   assemble along it into a lens-turret over ten seconds; strike a part to knock it off the plan, and a finished
   turret fires at whoever built least of it.
2. *Prototype* · Tinker Gizmo (technology) — a workbench turns out a prototype every eight seconds on a pedestal
   (spring boots, a lens-cannon, a bubble ward); first to grab it gets it, and one in three misfires.
3. *Glassblowing* · Gaffer Molten (magma) — the gaffer blows gathers of molten glass into bubbles that drift and
   harden into glass orbs; a hardened orb struck shatters in a ring of shards, and a soft one bursts in a splash
   of molten glass.
4. *Golem* · Sculptor Kiln (clay) — a clay golem stands half-made; every hit a fighter lands on it shapes it
   toward their side (a meter of colour); when it is finished it wakes and fights for whoever shaped it most.
5. *Kinetic Sculpture* · Artisan Mobile (gravity) — a giant mobile of brass weights turns overhead, their
   shadows sweeping the floor; a weight swinging low strikes; hit a weight to spin the whole mobile faster.

**Mural Court**
1. *Colour Wheel* · Pigmentist Prism (plasma) — the floor is a turning colour wheel; whoever stands on a colour
   takes its trait into their shots (red burns, blue slows, yellow quickens their step).
2. *Trompe-l'œil* · Illusionist Faux (illusion) — painted doorways on the walls: walk into one and come out of
   another; painted holes on the floor look like the real ones — the real ones drop you (a stun) and the fakes do
   nothing; the foe knows which is which.
3. *Whitewash* · Censor Limewash (death) — censors roll wide whitewash rollers across the floor; whoever is caught
   is painted white (slowed while wet) and marked — every hit on a whitewashed fighter lands harder.
4. *Paint by Numbers* · Apprentice Dab (fortune) — numbered regions on the floor light up in order; whoever stands
   in the current number paints it in their colour; your colour heals you, and burns the foe standing in it.
5. *Still Life* · Portraitist Likeness (sand) — the portraitist paints whichever fighter keeps stillest (progress
   shown on an easel); a finished portrait steps out of its frame as a painted copy that fights for the painter.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Lumen | Noon | *Prism* — splits his beam through a crystal prism into seven coloured rays that fan and sweep (red burns, violet slows) | *Afterimage* — moves at the speed of light, leaving afterimages along his path that each fire a beam when he stops | *Zenith* — the sun descends on its chain into the arena: a falling white orb whose light scorches a widening disc beneath it |
| Verdict | Tribunal | *Gavel* — slams a gavel the size of a door: each slam sends a square shockwave, and every third is "ORDER!" — a stunning ring | *Blind Justice* — ties on the blindfold: he cannot see you and strikes wherever you last cast or dashed; his scales drift toward you | *Capital Sentence* — guillotine blades of light fall in lines across the arena, each line chalked first |
| Wisp | Lantern | *Lantern Bearer* — swings a great lantern in pendulum arcs; souls stream out along the cone of its light | *Unbound* — sets the lantern down and becomes a ghost: he can only be struck while near the lantern, and drags the lost souls behind him | *Soulfire* — blue soul-flames creep across the floor from the edges and converge |
| Sigil | Arcane | *Runecraft* — traces sigils in the air, each shape its own spell (triangle a fire burst, circle a ward ring, spiral a vortex) | *Ritual* — the arena becomes a great magic circle: its rings turn and their segments flare in sequence | *Overload* — every spell is cast twice, mirrored, and mana fissures crack the floor |
| Artifex | Workshop | *Tinkerer* — throws wind-up contraptions: clockwork beetles that march and pop, spring-mines | *Magnum Opus* — climbs into his half-built walking armature of mirrors and brass: it stomps and sweeps a lens-beam | *Prototype Failure* — the armature malfunctions: parts fly off and burst, its beam spins wild |
| Hue | Mural | *Brushwork* — paints great strokes of colour across the floor: red burns, blue slows, yellow crackles | *Masterpiece* — paints creatures (wolves, birds) that step out of the canvas and fight | *Turpentine* — washes the arena: colour runs down in drips and stripes, the floor melting off in bands |

## The monarch — Despot Auriel of the Endless Noon

Dungeon **the Heliostat**: the iron crown of mirrors at the summit, climbed from its base (south) to the Crown
(north): three halls (the Lens Gallery — great lenses on rails overhead, each focusing a burning spot that walks
the floor in a pattern; the Mirror Maze — a beam of sunlight bouncing between angled mirrors, which you turn to
clear your way; the Sun Chain — a gear-tower beside the giant cogs and the chain that holds the sun, the cogs'
teeth sweeping the walkways) each ending in a warden fight, then the Crown of Mirrors, where Auriel stands under
the pinned sun. Phases: *Noonday* (the sun straight overhead: shafts of light hammer down in rings and lines;
no shadow anywhere — not even yours) → *Heliostat* (mirrors rise round the arena and he angles them: one beam
of sunlight is bounced from mirror to mirror across the arena, re-angled every few seconds; strike a mirror to
turn it yourself) → *Corona* (he draws the sun down onto himself and wears it: a blazing corona that whites the
arena out to the edges — only the space in his own shadow is cool, and it swings as he turns) → *Sunset* (the
chain breaks: the sun falls and the arena goes from noon to dusk to night as the phase runs on; his power wanes
with the light, but in the dark only he glows, and his last strikes come out of the night). Hard: *Second Sun* —
a twin sun rises opposite the first, so every shadow and every beam comes from two sides at once.
