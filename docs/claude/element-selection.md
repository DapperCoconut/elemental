# Element selection screens

<!-- Moved out of CLAUDE.md to keep it short; CLAUDE.md links here. -->

Four screens pick an element for a fight: `MenuScene`, `CampaignElementSelectScene`, `GauntletElementSelectScene` and `OnlineLobbyScene`. They must never hand-copy the roster — that is what left the campaign and gauntlet years out of date. Instead:

- `src/data/ElementRoster.ts` — the roster tables plus `unlockedExtraElements()`, `allSelectableElements()` and `findElementDef()`.
- `src/ui/ElementSelectGrid.ts` — `renderElementGrid(scene, opts)` draws the paged card grid. Each card is a leaning plate carrying a complexity star rating, the name + archetype, a live character portrait, a one-line blurb, and the select prompt, with ℹ info / M mastery / CUSTOMIZE hanging off it. **No emoji on a card** — the portrait is the element's identity. Returns the objects it made; the caller destroys them on its next render.
- `src/data/ElementProfiles.ts` — the per-element `archetype`, `blurb` and 1–5 `complexity` rating the cards print. A new element needs an entry here or it falls back to an "unknown" dossier.
- `src/ui/ElementPortrait.ts` — the live portrait: the real `elem-<id>` body with the element's real rig standing on it (mastered silhouette and equipped skin included), inside a scaled, masked container. Not a GameObject — the grid hands it out on a Zone handle that destroys it.
- `src/elements/kits/ElementAvatars.ts` — element id → its `BaseAvatar` factory, for anything that must build a rig for an id it does not know at author time. Mind the id traps: `sand` is Time and `dune` is Sand; `slime` is Acid and `gum` is Slime; `chalk` is Paint.
- `src/ui/ElementPanels.ts` — the four full-screen overlays behind those buttons. Construct one per scene with a redraw callback: `new ElementPanels(this, () => this.renderElements())`.

The lobby draws its own compact tile grid (it lives inside a panel), but still reads `allSelectableElements()`.
