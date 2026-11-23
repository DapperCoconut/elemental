# The Meteor and the Fall — hard mode

After the ending a second star shivers loose and falls into the sea. That is the meteor. What is inside it
opens **the Fall**: the whole campaign heard again, harder. Code: `src/isles/content/meteor/` (Fallpoint, the
meteor, its cinematics), `<court>/fallen/` in every court folder (the Fallen Five), `content/pinnacle/king/fallen.ts`
(the Fallen King). Builder brief: `docs/ten-isles-fall-brief.md`.

## The truth of it (lore every builder writes toward)

- When the Obsidian King lost, the star "went out gently". It did not go out. What was left of it — a
  **cinder** the size of a man — fell back into the sea east of Brandmark and boiled a ring of glass out of the
  water: **Fallpoint**.
- The cinder lies in the crater, shelled over again in thin black glass, shut with **sixty locks** — one keyhole
  for every seat of the Council, each shaped like a mask's eye-slit. **The keys the player has carried all game
  fit them.** Every prince and monarch handed over a key and nobody ever said what to: they were the keys to
  their own sentences. Turning sixty of them at once opens the shell.
- Inside is **the Fallen King**: small, dim, courteous, a judge with no court. He does not want the throne back.
  He lodges an **appeal**. *"You won on the facts. I appeal on the law. Hear the case again — with everything I
  should have sent the first time."*
- **The Fall** is that retrial: the star dreams the isles as they stood the day the player landed — every crown
  back on its head, every court shut, the Shroud up, the Council seated — and this time it holds nothing back.
  It is a *telling*, not a time: nobody is really re-enslaved, and the player can wake whenever they like by
  speaking to the star again. People inside it speak as they did under the tyrants; that is the dream's doing.
- **The Fallen Five.** In the Fall every court fields ten champions: its own five, and five more — *the Fallen*,
  people of that court whom the King's version of events puts on the crown's side. A baker who informed. A hero
  who was bought. A tutor who taught the prince to be what he is. A rebel who, in this telling, never rebelled.
  They are **star-scarred** (a scorch-mark under their feet, ember-gold eyes) and fight with every upgrade of
  their element and its mastery. Beaten, the dream thins on them and they half-remember the true world —
  *"I… sold bread. I think I only ever sold bread."* That turn is the heart of every Fallen's `beaten` lines.
- Princes come back with their third form, monarchs with their last, the Sixty sit again — and at the top of
  the Pinnacle, behind the Star Unshelled, is a fourth act the first trial never saw: **the Fallen King
  himself**, man-sized, with no glass and no throne to hide in.
- Win there and the appeal is dismissed. The cinder goes dark for good; the sky keeps its stars; this time
  the narrator does not ask "or does it?".

## How it plays (engine — built)

- `cine-ending` already ends on the falling star. Beating the King sets `star-fell` for good; from then on every
  dock's SAIL tab has **☄ Fallpoint — THE FERRYMAN ROWS** (no boat needed, no fare).
- **Fallpoint** (`fallpoint`, 1800×1400, rides the Pinnacle bundle so the Ferryman is its wanderer): the skiff
  lands you on the south shore (900,1240); the star lies at the crater's heart (900,520) as a `meteor` POI; a
  waystone; a `door` POI back to Emberport's pier.
- **The meteor** (`Poi kind: 'meteor'`, words in `MeteorDef`): sealed, it asks for **60 keys** at once (a
  finished save holds 105: 60 princes + 30 from monarchs + 10 benches + 5 from the King) → `meteor-open`,
  plays `cine-meteor`. Open, in the waking world: the King's offer → **Step into the Fall** (first time plays
  `cine-fall`). Inside the Fall it is the way out: **Wake**.
- **Two worlds, one save** (`IslesSave.setFall`): `encounters`, `princes`, `monarchs` and the world flags
  (`freed-*`, `broken-*`, `shroud-broken`, `king-fallen`) always describe the world you stand in; the other
  world's wait on `shelf`. So every `Cond` in the game — dialogue states, gates, the prince's door, the Shroud,
  the throne door — works in the Fall with no content changes. Coins, keys, orbs, items, genes, quests, chests,
  waystones (so fast travel and every dock route) are the player's and carry across. `Cond { fall: true }` lets
  content tell the worlds apart.
- **In the Fall** (`save.hard`): every fight is hard (bot +1 difficulty, foe HP ×1.3, hazard damage ×1.25, coins
  ×1.5; bosses use their `hard` knobs and extra phase). A court's gate wants **ten** champions
  (`courtChampions`); a Fallen champion pays +2 orbs the first time. Princes and monarchs pay their keys and
  orbs again (they are "first" wins in this world). The HUD reads `☄ THE FALL`.
- Beating the King in the Fall: `fall-won`, the artifact `art-fallen-star`, `cine-fall-end`.

## The Fallen Five — rules for every court

- Five per court, three hundred in all. Each is a **new fight with its own named rule and its own art** — not a
  harder copy of one of the court's five, and not an idea another court already uses. They may be sharper than
  anything in the first trial: tighter windows, two things to watch at once, rules that turn mid-fight.
  They are always hard (`ctx.hard` is true) and the foe is mastered, so the *rule* must stay readable and
  exploitable — a clever player still turns it on the foe.
- Each belongs to its court: the rule comes out of the court's place, trade and tyranny (its section of the
  isle's bible), told from the crown's side.
- Elements: five that the court's own champions and quest foes do not use (the validator checks all of them
  together). Not all from the isle's own six — the Fall borrows freely.
- Difficulty 4 or 5 (tier 1–2 courts: 4,4,4,5,5 — tier 3–4: 4,4,5,5,5). Coins about double the court's own.
- They stand in the court's existing area, on open ground, well clear of everyone else.

## Fallpoint (the area)

A ring-reef of sea-glass a few hundred yards across, standing out of deep water at night under a sky with one
star missing. The glass is **amber and bottle-green** — sea boiled to glass, with sand, shells, a ship's
timbers and startled fish fused into it — *not* the Pinnacle's black. The only black glass here is the thin new
shell on the cinder itself. Steam still rises where the sea meets the rim. Inside the ring the water has gone,
and the crater floor is a shallow bowl of fused glass sloping to the cinder at its heart, with sixty keyholes
glowing round the shell. The south shore has the Ferryman's skiff drawn up on the glass and his lamp on a pole.
Three states (read `world.test`): **sealed** (cold, violet, quiet), **open** (`{ flag: 'meteor-open' }` — the
shell split, warm gold light, the sixty keys standing in their locks), **the Fall** (`{ fall: true }` — ember
red, the light beating like a pulse, the sky over the ring showing the isles' ten lit crowns on the horizon).
A handful of people have rowed out to look: write three or four, each with lines for all three states and for
`fall-won`.

## The Fallen King (act IV)

The Obsidian King's `hard.extraPhase`, after the Supernova. Everything the first three acts were, this is the
opposite of: no throne, no host, no glass, no sky full of rings — a **man-sized cinder in a judge's robe of
ash**, on a floor that is the Fall itself coming apart (pieces of all ten isles' ground showing through and
breaking away). Small, fast, personal: a duel at the player's own scale against someone who has read the whole
case. His attacks **cite the ten laws** — the Brand, the Undertow, the Pruning, the Breath-Tax, the Stone
Tithe, the Draw, the Mark, the Lot, the Part, the Endless Noon — each a signature that looks like its isle for
a moment. As his HP falls the dream thins: fewer isles on the floor, more plain night sea, until at the end he
is fighting on the glass at Fallpoint with nothing behind him. Last words, not a roar.

## Cinematics

- `cine-meteor` — the locks. Sixty keys leave the player's hands and turn themselves; the shell splits; a small
  figure sits up in the light and speaks, politely. The appeal is lodged.
- `cine-fall` — the first step in. The ten dawns of the ending run backwards: the sun pinned again over
  Solmara, the bell hung back over Choirholm… ten crowns relit one by one on a dark horizon; the Shroud closes
  round the spire; the Ferryman, who came too, looks at his own hands. *"Again, then."*
- `cine-fall-end` — the appeal dismissed. The cinder goes grey, then dark; the Fall lets go of the isles like
  a held breath; the Ferryman rows the player home under a whole sky; the narrator's last line; no stinger.
