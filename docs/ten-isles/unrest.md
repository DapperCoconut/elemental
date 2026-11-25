# The Unrest — revolts, anarchy and the dark market

What happens to a court after you free it and walk away. Code: `src/isles/systems/Unrest.ts` (the state
machine and who rises), `src/isles/world/UnrestWorld.ts` (what it looks like and what people say),
`src/isles/content/unrest/` (`riot.ts` six street-fight rules, `ringleader.ts` Mob Rule, `darkMarket.ts`,
`lines.ts`, `riotArt.ts`). Nothing here is per-court content: every one of the sixty courts gets all of it.

## How it plays

- **Time is fights.** Every fight fought anywhere (won or lost; voyages and the unrest's own fights do not
  count) is a day passing: `Unrest.tick` runs from `IslesResultScene`.
- **Revolt.** Once two courts are free, every 9–13 fights an agitator rises in a random freed court (never the
  one you freed in that very fight) and takes the prince's empty seat on a soapbox, a ring of listeners round
  them, pamphlets in the road. The townsfolk are uneasy (a worried line before their usual talk; the crowd's
  barks change) but everything still works. The agitator is **one fight**: a random element, under a random
  champion's rule borrowed from any isle you have landed on, with three upgrades, ×1.25 HP and ×1.1 damage.
  Win: the revolt is over (coins, 2 orbs). **Lose, or leave it for 7 fights, and the court falls.**
- **Anarchy.** The court is drawn ruined (scorch, rubble, torn paper, a struck-through crown painted on the
  road, boards across the doorways, burning carts and barrels, smoke and sparks across the view, a dark grade
  over everything). Townsfolk cower and say only frightened things; shops and bakeries are shut; nobody walks
  the streets; the court's own champions are gone. Quest steps still work. **Four insurgents** roam the
  champions' old posts — each a different element under a different street rule (four upgrades, ×1.15 HP).
  Beat all four and the **ringleader** comes out to hold the seat: difficulty 5, every upgrade, mastery, a
  perk, ×2 HP, fought under *Mob Rule*. Beat them and the court is free again (coins, 5 orbs, a key).
- **The dark market.** While a court is in anarchy one trader is open: a hooded dealer by the road in. They
  sell the **tainted twin** of every charm that court's own shops sell — same script, its plain stats pushed
  60% further, plus one strong boon and one strong price (ten taints: Bloodpriced, Feverish, Glass-Cored,
  Leaden, Leeching, Reckless, Usurer's, Hexed, Spiteful, Hollow). Twins are generated at boot
  (`darken`), ids `dark-<base id>`, shop `dark-<court>`; the counter's stat lines are generated from the
  applied effect, so the price is always printed. A charm and its twin cannot both be worn. Bought charms
  are kept when the court is reclaimed; the dealer leaves. (So anarchy is a temptation as well as a threat.)
- **After the King falls** (`king-fallen`): revolts every 4–6 fights, a fuse of 4, two revolts and four
  troubled courts at once (before: one and two), and everyone in them is **kingless** — full upgrades and
  mastery, heavier stats, five insurgents, the `-strong` version of every rule; lose to a ringleader and one
  beaten insurgent gets back up.
- **Two worlds.** Unrest belongs to the world you stand in: `setFall` shelves it with the rest of the world
  progress, so the Fall has its own.
- **Where you see it:** the result card (news lines), the world HUD (the area line, and troubled courts
  elsewhere head the quest tracker), the isle map (a smouldering / burning court node, the freed flag struck),
  the area banner. Cheat saves: **U** in a court cycles it peace → revolt → anarchy → peace.

## The street rules (`unrest-<id>`, and `unrest-<id>-strong`)

| Rule | What it is | The way through |
|---|---|---|
| **Firebombs** `molotov` | The crowd on the rails lobs bottles at where you stand; each leaves a fire for 6.5 s. | The fire burns *anyone* — a bottle landing on him hurts him, and so does standing in it. |
| **The Barricade** `barricade` | Four barricades; near a standing one he takes half damage, and he hugs the far side of the nearest. | They are strike targets: smash them (the street rebuilds each in 10 s). |
| **Looters** `looters` | Loot sacks fall; whoever holds fewer takes +10% damage per sack behind. Looters run off with sacks left lying. | Out-grab him; hard hits shake his sacks loose. |
| **Smoke** `smoke` | He throws smoke canisters and fights from inside: half damage, and you cannot see him. | Strike a canister to kick it out. |
| **The Loudhailer** `hailer` | The mob charges a lane across the floor at whoever the loudhailer names. | Strike the post to turn the crowd on him. He will go and strike it back. |
| **Tripwires** `tripwire` | Wires strung between posts: walk into one and you are rooted and cut. | Dash over them, or strike a post to drop the wire. |
| **Mob Rule** `leader` | A rally banner: while it stands he takes 40% less and the mob takes turns briskly (firebombs, a rush, thugs over the rail). Under a third HP the ring closes in. | Cut the banner down — a few seconds of +15% damage on him before they raise another across the floor. |

Every rule gives the bot its play through `npcSeek` (out of the fire, behind cover, to the sacks, into the
smoke, to the loudhailer, behind a wire, under the banner).

## For content

- `Cond { unrest: '<court>', state?: 'revolt' | 'anarchy' }` — any talk, exit, POI or painter piece may react.
  The engine already supplies generic lines (per-isle voices in `lines.ts`: what the agitators on that isle
  want back, what a frightened local says, what the wanderer says); a court that wants bespoke ones lists
  `Talk`s with this Cond first.
- `EncounterDef.power` (foe damage ×), `.loadout` (bot upgrade level 1–5), `.unrest` (set only by the system).
- Unrest fights ride the `isles` payload as `kind: 'unrest'`, id `unrest:<court>:revolt | i<n> | leader`,
  resolved from the save by `Unrest.encounterFor` (registered with `registerEncounterResolver`).
- `node .check-isles.mjs` smoke-runs all fourteen rules, checks every dark market, and simulates a full
  revolt → anarchy → reclaim cycle, calm and kingless.

## Not done

- No court has bespoke revolt / anarchy dialogue or a hand-painted ruined version; all sixty use the engine's.
- Dark twins of script-only charms differ from the honest one only by their taint (a script's own numbers
  are not scaled).
- Not runtime-tested.
