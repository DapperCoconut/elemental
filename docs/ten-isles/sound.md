<!-- One isle of the Ten Isles. Shared pillars, currencies, systems and status: docs/ten-isles.md -->
# Choirholm — Sound Isle

**The fourth isle beyond the Breakwater.** Choirholm rises out of the Outer Sea south-east of Lotterhaven: a
steep, snow-capped isle carved into terraces like the tiers of a concert hall, every terrace facing the
summit, where the Maestro's cathedral stands with the pipes of the Great Organ rising out of its roof like a
crown of silver spears. Bell-buoys clang in the swell, brass bands drill on the greens, caves along the
cliffs hum with the Score sung into them years ago, and three times a day the whole isle sings at once. In
between, nobody speaks above a whisper. The air smells of valve oil, candle smoke, snow and new paper.

**The tyranny.** Maestro Cadenza says an isle is a choir and every choir needs a conductor. Every child on
Choirholm is given a **Part** at birth — one note, stamped on a little brass **tuning-reed** pinned at the
collar — and must sing that note and no other. Three times a day, at **the Hours** (Matins, Vespers and
Compline, rung from the cathedral), the whole isle stands where it is and sings the Maestro's **Score**;
the Libretto Court writes its words, the Brass Court's heralds call it, the Masquerade Court's masks keep
the choir faceless, the Cavern Court's caves repeat it so it never quite stops, and the Hush Court's
wardens keep the silence between the Hours — speaking out of turn is "noise", and noise is fined. A voice
that falters, sings flat or sings its own tune is **muted**: the Tuners take the voice itself, and it is
piped up to the cathedral and sealed into one of the Great Organ's pipes, which plays it for the Maestro
for ever. The muted wear a white silk ribbon at the throat and talk with their hands. Everybody knows a
neighbour whose voice is in the Organ; at Compline you can hear them in it. His six "first chairs" govern
the courts.

**Reaching it.** Lotterhaven's docks chart Choirholm once the Croupier-King falls. It is an **Outer Sea
crossing** (`IsleDef.outer`) and lands at Carillon Quay. Its sea beast is **the Cantor** — a humpback whale
the size of a cathedral, barnacled with bronze bells, its throat-pleats ribbed like organ pipes; it sings
**sound-rings** across the sea (a ring of shoved, glittering water spreading from where it sounds, with
gaps — the rests in its song — to steer through; a ring that catches the boat costs a plank and shoves it
outward; the pipes on its back glow before each note) and drops the **Foghorn Bow** Uber-upgrade (a brass
horn on the prow sounds a long low blast every eight seconds: a widening ring that pushes drift and mines
aside and holds every hazard ahead still for two seconds).

**The wanderer.** *Lark Halloway*, a busker whose voice the Maestro took for the Organ because she sang her
own songs in the market. She still busks — a hurdy-gurdy on a strap, a coat sewn with bells she has stuffed
with wool so they cannot ring — and talks with her hands. Her mynah bird *Patter* learned her voice before it
was taken, and speaks for her in it (her lines are Patter's, in quotes, with her signing in between). Tutorial
nudges (the Part and the Hours, resonant and still fishing, the tuning rod, the Outer Sea), gossip about every
prince, reactions to each court freed, and a long arc after the Maestro falls (the Organ's pipes are opened one
by one and the voices go home; Lark gets hers back last, because she insists; the first thing she sings is
the market song he muted her for, and the whole isle — badly, out of tune, in a thousand keys — joins in).

## Areas

| id | Name | Biome / look | Holds |
|---|---|---|---|
| `carillon` | Carillon Quay | a harbour of bells: bell-buoys clanging off the moles, a bell-foundry with its casting pit and a cooling bell hung in the yard, the carillon tower on the quay that rings the Hours for the shipping, a ferry-horn on every jetty, a hymn-sheet stall, the Tuners' customs house where incoming sailors are given a Part | landfall, docks + boatwright, sea fishing, bakery *The Rising Loaf*, general store, tackle (tuning rod), waystone, roads to three courts |
| `brass` | The Brass Court | the bandsmen's town on a sunny green terrace: bandstands on every lawn, a horn-foundry where brass is spun on lathes, chimneys shaped like sousaphone bells, the Fanfare Gate flanked by herald trumpets as tall as towers, drill squares where bands march in step, a bandlake with a floating stage | 5 encounters, Prince Fanfare's Bandhall, shop, quests, bandlake fishing (pond), bakery *The Oompah Bun* |
| `cavern` | The Cavern Court | the Echo Caves: a town built inside a vast sea-cave and its grottos, where the Score was sung into the rock so it repeats for ever — stalactite chimes, a whispering gallery, cave-choirs in the side chambers, rope bridges, glowworm ceilings, a ringing cave pool | ″ + resonant-pool fishing (resonant, tuning rod) |
| `libretto` | The Libretto Court | the librettists' and copyists' town where the Score's words are written and every other word censored: scriptoria with tall windows, a paper mill with its water-wheel, presses printing hymn sheets, paper-lantern streets, origami cranes on strings, the Censor's Office with its giant red pen, an inkwell pond | ″ + inkwell fishing (ink) |
| `masque` | The Masquerade Court | a canal town of masked balls: palazzos on the water, gondolas, a ballroom under chandeliers seen through tall windows, mask-makers' workshops, a hall of mirrors, fireworks barges moored in the lagoon, everyone masked | ″ + canal fishing (sea) |
| `hush` | The Hush Court | the wardens' town of the silence, snowbound and muffled: felted roofs, padded streets, the Quiet House where the muted are taken, the clapperless Hush Bell in its frame, signing-posts with hand-shapes painted on them, lamplit wardens in earmuffs, a mirror-still mere | ″ + still-mere fishing (still, tuning rod) |
| `cathedral` | The Cathedral Court | the summit: the Maestro's cathedral of the Score with choir stalls, rose windows, forests of candles, pilgrims kneeling in the snow, cloisters round a frozen pond, the pipes of the Great Organ rising out of the roof, and the Organ door (north) | ″ + cloister-pond fishing (ice); the Organ door |
| `organ` | The Great Organ (dungeon) | the Maestro's instrument, built into the mountain behind the cathedral and climbed from the bellows (south) to the Console (north): the Bellows Hall (leather lungs the size of houses breathing in and out, the wind shoving you), the Pipe Forest (pipes rising like tree trunks, each sounding a column of sound when its key is struck), the Voice Loft (rows of sealed pipes with ghostly mouths singing the voices inside), then the Console under the Rose of Pipes | gated by all 6 princes; 3 halls + 3 warden fights → the Console |

## Encounters (5 per court) — name · foe (element) · gimmick

**Brass Court**
1. *Marching Band* · Drum-Major Strut (earth) — a column of bandsmen marches a looping route round the room;
   walking into the column sweeps you along with it, and every fourth beat the bass drum at its head booms a
   shockwave round it; knock the foe into the column's path.
2. *Sousaphone* · Tubist Oompah (air) — giant horns are mounted round the walls with a mouthpiece pad in
   front of each; step on a pad and its horn blasts a cone of sound out of its bell across the room — whoever
   is in the cone is hit and blown back; the foe uses the pads too.
3. *Herald Trumpets* · Herald Clarion (light) — trumpeters stand along the walls; each raises his trumpet at
   a fighter (a line is traced) and then blasts straight down it; strike a trumpeter to turn him round to
   face the other way.
4. *Tuning Forks* · Tuner Pitch (crystal) — tall forks stand in the floor in three pitches (colours); strike
   one and every fork of its pitch hums in sympathy, each throwing out a ring that hurts whoever is near it
   except the striker.
5. *Bandstand* · Bandleader Baton (fire) — a bandstand stands in the middle; whoever holds it conducts, and
   the band plays for them (each beat, a note-shot at the other fighter); the conductor takes more damage
   while up there.

**Cavern Court**
1. *Whispering Gallery* · Gallery-Keeper Murmur (shadow) — the room is an ellipse with two marked foci; a
   blow landed by a fighter standing on one focus arrives again a beat later on whoever stands near the
   other; the foci move round the rim.
2. *Stalactite Chimes* · Chimer Drip (ice) — stalactites hang overhead (their shadows show); every heavy blow
   shakes loose the ones nearest it, and they fall and shatter in a ring of chimes.
3. *Call and Answer* · Caller Halloo (water) — the cave answers whatever is thrown at its walls: any shot
   that reaches a wall comes back out of the wall two seconds later, aimed at whoever threw it — unless the
   thrower moved; the foe calls on purpose.
4. *Feedback* · Howler Squeal (electricity) — a squealing ring of sound bounces between two walls, growing
   wider and louder with each pass until it bursts; a fighter standing in its path takes the hit but damps
   it back to small.
5. *Sonar* · Batkeeper Chirrup (hunt) — the cave is dark; every cast sends out a ping ring that lights the
   caster for a moment, and the bat swarm flies to the last ping and bites whoever is there.

**Libretto Court**
1. *Redacted* · Censor Blackline (ink) — black redaction bars sweep across the floor in lines (a red pen
   marks them first); whoever is under a bar when it lands is silenced for a beat.
2. *Origami* · Folder Crease (air) — sheets of paper lie on the floor and fold themselves, crease by crease,
   into cranes that fly at the nearest fighter; strike a sheet before it is folded to crumple it.
3. *The Prompter* · Prompter Cue (dream) — the prompter's box calls cues: a line over each fighter names a
   thing to do ("stand in the spotlight", "strike from behind", "keep still"); whoever plays their cue gets
   an encore (a heal and a damage boon), and the foe reads its cues.
4. *Paper Lanterns* · Lamplighter Wick (fire) — paper lanterns drift through the room; strike one and it
   lights and hangs where it is, burning whoever comes near it until it burns out.
5. *Folio Storm* · Binder Spine (tempest) — a gale of loose pages blows across the room from a door that
   moves; pages stick to whoever they hit, slowing them more the more they carry; a dash shakes them off.

**Masquerade Court**
1. *Masked Ball* · Dancer Domino (fate) — masked dancers waltz in rings round the floor, and the foe, masked
   like them, dances in the ring; strike a dancer — a decoy pops in glitter, the foe staggers out.
2. *Hall of Mirrors* · Mirrorwright Silver (crystal) — tall mirrors stand round the room and send back any
   shot that strikes their face; a blow turns a mirror a quarter-turn.
3. *Fireworks Barge* · Pyrotechnist Gerbe (gunpowder) — rockets launch from the lagoon's edge and burst over
   the floor in mask-shaped patterns that are drawn on the floor first; a spent rocket's stick can be picked
   up and thrown.
4. *Commedia* · Harlequin Patch (rubber) — a little stage at the back; the stock characters take turns to
   enter and change the rule while they are on: Pierrot (everyone weeps — slowed), Harlequin (fighters swap
   places on his slapstick's crack), Columbine (hearts that heal whoever catches them).
5. *Gondola* · Gondolier Remo (water) — canals cross the floor with bridges over them; wading is slow, and
   gondolas glide down the canals on a schedule, knocking aside whoever is in the water.

**Hush Court**
1. *Quiet Zones* · Shusher Felt (wax) — circles of hush drift across the floor under warden lanterns;
   casting inside one silences the caster for a beat.
2. *Muffle* · Upholsterer Batting (cloth) — thick felt baffles drift through the room; shots that hit them
   die in the felt, and fighters behind them are hidden from homing.
3. *The Clapperless Bell* · Sexton Toll (metal) — the great silent bell swings over the room; its silent
   toll spreads a ring that silences whoever it passes; strike the bell to ring it for real — a true toll
   stuns whoever is nearest it but the striker.
4. *Creaking Boards* · Sneak Tiptoe (subterfuge) — loose boards are marked across the floor; running over
   one creaks, and the warden's lantern swings to the creak and strikes; walk slowly and it stays dark.
5. *Sign Language* · Signer Palm (psychic) — the foe signs a hand-shape before every attack; floor tiles
   carry the four shapes, and standing on the tile that matches the sign shields you from what follows.

**Cathedral Court**
1. *Rose Window* · Glazier Tracery (light) — the rose window throws coloured panes of light on the floor and
   turns slowly: red panes hit harder, blue panes heal, gold panes shield, and the dark leading between them
   burns.
2. *Candle Vigil* · Votary Taper (wax) — candle-forests stand about; lit candles heal whoever kneels among
   them, a blow nearby snuffs them, and the foe goes round relighting its own.
3. *Bell Choir* · Ringer Carol (metal) — handbells stand in a row across the floor; the choir shows a tune
   (bells lighting in order), then rings it — each bell bursts in turn; ring a bell early yourself to spoil
   the tune and stun the ringer.
4. *Procession* · Pilgrim Penitent (life) — a procession carries a reliquary slowly round the nave; whoever
   walks beside the reliquary is blessed (takes less damage); the pilgrims shove anyone in their way.
5. *Confessional* · Confessor Shrive (shadow) — two confession booths stand in the aisles; step inside and
   you vanish and slowly heal, but if the other fighter strikes the booth its door bursts open and you are
   thrown out stunned.

## Princes (2 phases; a 3rd on hard)

| Prince | Court | Phase 1 | Phase 2 | Hard phase 3 |
|---|---|---|---|---|
| Fanfare | Brass | *Herald* — raises a long herald trumpet and blasts fans of three sound-beams, each flaring out at the end like a bell | *Brass Section* — four horns rise at the corners and play: notes ride along five stave-lines strung across the arena, the gaps between the lines safe | *Sforzando* — sudden huge blasts: a ring that hurls you back, preceded by a beat of utter quiet, then a run of tiny quick ones |
| Reprise | Cavern | *Refrain* — every attack he makes comes again a beat and a half later from the mirrored side of the arena | *Resonance* — he hums one pitch and stone pillars round the cave ring louder and louder in rings; strike a ringing pillar to damp it | *Feedback Loop* — his echoes echo: each repeat comes back bigger and faster than the last until he resets |
| Folio | Libretto | *Quill* — writes lines of ink across the floor, letter by letter, that rise as blades when the line is finished | *Pop-Up Book* — the arena is an open book: pages turn over in a sweep from one side to the other, and pop-up scenery springs up out of the new page as walls | *Final Draft* — the red pen strikes out whole stripes of the arena, which are erased (lethal) after a beat |
| Facade | Masquerade | *Two Masks* — swaps masks: Comedy (a spray of confetti shots that curl) and Tragedy (falling tear-drops that pool) | *Masked Quartet* — splits into four dancers in identical masks who waltz round you; only one is him, and the decoys burst when struck | *Curtain Call* — the curtain falls in a sweep across the arena, leaving one bow-spot lit where you are safe |
| Mute | Hush | *Shush* — sends out rings of hush that silence what they catch, and moves without footfalls (no dust, no sound — watch his shadow) | *Dead Air* — the arena goes silent: his shots are invisible until they cross the snow on the floor, which shows their tracks | *Gag* — white silk gags fly out in long ribbons and root whoever they wrap |
| Vesper | Cathedral | *Litany* — a rosary of glowing beads orbits her and lashes out in strands, one bead at a time | *Stained Glass* — the floor is a window: panes light in a coloured sequence and smite in that order | *Rapture* — rises in light (cannot be struck except from beneath her shadow) while pillars of light fall from the rose window |

## The monarch — Maestro Cadenza

Dungeon **the Great Organ**: the Maestro's instrument, built into the mountain and climbed from the bellows
(south) to the Console (north): three halls (the Bellows Hall — leather lungs the size of houses breathing
on a slow beat, a wind that shoves you up and down the hall as they draw and blow; the Pipe Forest — pipes as
thick as trees, each sounding a column of sound straight up when its key lights on the floor; the Voice
Loft — sealed pipes in rows with ghostly mouths that sing the muted voices, the song washing along the rows)
each ending in a warden fight, then the Console under the Rose of Pipes, where Cadenza conducts.
Phases: *Overture* (his baton traces the conducting patterns of 2, 3 and 4 in the air — the shape glows,
then is struck along) → *Fugue* (a subject: one attack stated, then answered by a second voice from another
side a bar later, then a third, layered) → *Crescendo* (dynamics are written across the arena from *pp* to
*ff*: everything grows bigger and faster, until the climax — and then the General Pause: in the silence,
whoever moves is struck) → *Requiem of Voices* (he plays the Organ: its pipes ring the arena and each fires
columns of the voice sealed in it; strike a pipe to open it and the freed voice turns and sings against him —
his defences drop while it sings). Hard: *Da Capo* — "from the top": once a cycle a D.C. sign glows on the
score above him and his Overture plays again, laid over whatever he is doing now.
