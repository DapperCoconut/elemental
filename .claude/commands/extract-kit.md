Extract the `$ARGUMENTS` element from `src/scenes/ArenaScene.ts` into `src/elements/kits/$ARGUMENTSKit.ts` using the ElementKit pattern established by `MagnetKit` and `LightKit`.

Steps:
1. Read `src/elements/kits/MagnetKit.ts` and `LightKit.ts` to understand the pattern — `[Element]ArenaApi` interface + `[Element]Kit` class with `reset()`, `update()`, `handleInput()`, and public accessors for any fields read outside the kit.
2. Read ArenaScene to find all `[element]*` and `npc[Element]*` private fields, the `create()` reset block, the input dispatch call, the per-frame update call, the player speed recalc block (if applicable), and any references in `doVoidReturnStripBuffs()` or similar cross-cutting methods.
3. Create the kit file. The `ArenaApi` interface needs a getter for every ArenaScene private member the kit reads, a setter callback for every private member it writes, and method delegates for `spawnHitFlash`, `spawnDamageNumber`, `showFloatingText`, `buildPlayerContext`. Include `npcCastId` if the NPC reacts to cast IDs inline rather than through `buildNpcContext`.
4. Modify ArenaScene: add the import, replace all fields with `private [element]Kit!: [Element]Kit`, replace the create() reset block with an adapter object construction (use property getters so references stay live across restarts), update all call sites to go through the kit.
5. Run `npm run build` and fix all TypeScript errors before finishing.
