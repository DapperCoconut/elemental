# Menu dioramas

<!-- Moved out of CLAUDE.md to keep it short; CLAUDE.md links here. -->

The workshop menus are drawn rooms with a character in them, not plates of text: the Shop (a goblin behind his counter, wares standing on shelves, hanging arrow signs to page, a floor vent down to the boss door), the Lab and the Disgraced Lab (an alchemist — the King's is his ghost — pouring vials into a flask that explodes on a bad mix), the Vault (a keeper at his lectern), the Entanglement Lab, the trophy hall and the campaign kit bag. They share:

- `src/ui/Woodwork.ts` — planks, shelves, hanging signs, price tags.
- `src/ui/SpeechBubble.ts` — the typewriter bubble (non-blocking; `place`, `offsetX/Y`) and `addHoverLabel`.
- `src/ui/ItemArt.ts` — procedural wares: `itemKindFor(slot, name)` picks a silhouette per ability slot, tinted by the element.
- `src/ui/Glassware.ts` + `src/ui/LabBench.ts` — ten vial shapes keyed by element (`VIAL_SHAPE_FOR`), the flask, and the pour → heat → succeed/explode flow both labs run on.
- `src/ui/characters/` — `MenuCharacter` (update loop, mood, talk flag, blink, pointer-look, `flip`) and the rigs: `Shopkeeper`, `Alchemist` (`spectral` for the ghost), `VaultKeeper`.

**Dialogue is business only.** A character states prices, what a thing does, asks whether to buy, and reports results ("Fire + Water → Oil. One nucleus spent, 3 left."). No banter, jokes or lore. `.shot-menu.mjs <Scene> '<init json>' <tag> [steps.json]` screenshots a menu with deterministic frames for checking layout.
