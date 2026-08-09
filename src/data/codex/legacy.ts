import { PassiveCodexEntry } from '../AbilityCodex';

/**
 * Passive text that used to be hardcoded inside `ui/ElementPanels.ts`.
 *
 * The old info screen carried a stack of `if (elementId === 'dream')` blocks with the prose
 * inline, which is why only the elements somebody remembered to special-case had any passive
 * documentation at all. The screen now renders passives uniformly from the codex — this file was
 * the holding pen for the elements whose codex entry had not been written yet, so that nothing
 * already on the screen disappeared in the move.
 *
 * **It is empty, and that is the finished state.** Every element on the roster now has a real
 * `src/data/codex/<id>.ts`, so `getPassiveCodex` never falls through to here any more. The table
 * is kept rather than deleted because it is the one mechanism that lets a brand-new element ship
 * with passive text before its codex is written: add an entry, and delete it again the moment the
 * real file lands. `node .check-codex.mjs` warns for as long as anything is in here.
 */
export const LEGACY_PASSIVES: Record<string, PassiveCodexEntry[]> = {};
