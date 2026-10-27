import * as Save from '../IslesSave';
import { allQuests, getQuest, getIsleItem, getFish, getEncounter } from '../IslesRegistry';
import type { EncounterDef, QuestDef, QuestObjective } from '../IslesTypes';

/**
 * Quest progression. A quest is a list of stages; each stage has one objective. After the last
 * stage the quest is "ready" and the giver pays out on your next talk — unless the last stage was
 * itself a talk/deliver to the giver, which pays out on the spot.
 *
 * Events come in from the world (talk, deliver, visit, collect, fish) and the results screen
 * (defeat, duel, prince) and the bakery (cook). `notify` returns lines for the caller to toast.
 */

export type QuestEvent =
  | { kind: 'defeat'; encounter: string }
  | { kind: 'prince'; prince: string }
  | { kind: 'fish'; fish: string }
  | { kind: 'cook'; recipe: string }
  | { kind: 'visit'; area: string; x: number; y: number }
  | { kind: 'collect'; quest: string; spot: number };

export function state(id: string): Save.QuestState | undefined {
  return Save.hasActive() ? Save.S().quests[id] : undefined;
}

export function isDone(id: string): boolean { return !!state(id)?.done; }
export function isActive(id: string): boolean { const s = state(id); return !!s && !s.done; }

export function offerable(q: QuestDef): boolean {
  return !state(q.id) && Save.test(q.requires);
}

export function isReady(q: QuestDef): boolean {
  const s = state(q.id);
  return !!s && !s.done && s.stage >= q.stages.length;
}

export function objective(q: QuestDef): QuestObjective | null {
  const s = state(q.id);
  if (!s || s.done || s.stage >= q.stages.length) return null;
  return q.stages[s.stage].objective;
}

export function accept(id: string): void {
  const s = Save.S();
  if (s.quests[id]) return;
  s.quests[id] = { stage: 0, n: 0, took: [] };
  Save.persist();
}

/** Move a quest on one stage. Returns the toast line. */
function advance(q: QuestDef): string {
  const s = Save.S().quests[q.id];
  s.stage += 1;
  s.n = 0;
  s.took = [];
  Save.persist();
  if (s.stage >= q.stages.length) return `📜 ${q.name}: return to ${giverName(q)}`;
  return `📜 ${q.name}: ${q.stages[s.stage].hint}`;
}

let npcNames: (id: string) => string = (id) => id;
/** The world registers how to name an NPC id (areas own their NPC lists). */
export function bindNpcNames(fn: (id: string) => string): void { npcNames = fn; }
const giverName = (q: QuestDef): string => npcNames(q.giver);

/** Pay out and close. Returns toast lines. */
export function complete(q: QuestDef): string[] {
  const s = Save.S();
  const st = s.quests[q.id];
  if (!st || st.done) return [];
  st.done = true;
  const out = [`✅ ${q.name} complete`, `+${q.reward.orbs} 🔮`];
  Save.addOrbs(q.reward.orbs);
  if (q.reward.coins) { Save.addCoins(q.reward.coins); out.push(`+${q.reward.coins} 🪙`); }
  if (q.reward.item) {
    const n = q.reward.itemCount ?? 1;
    Save.give(q.reward.item, n);
    const it = getIsleItem(q.reward.item);
    out.push(`${it?.emoji ?? '🎁'} ${it?.name ?? q.reward.item}${n > 1 ? ` ×${n}` : ''}`);
  }
  Save.persist();
  return out;
}

/** Whether the giver should pay out right after the stage they themselves just closed. */
function closesAtGiver(q: QuestDef, o: QuestObjective): boolean {
  return (o.kind === 'talk' || o.kind === 'deliver') && o.npc === q.giver;
}

/**
 * A talk with `npcId`: if some live quest's objective is to talk to (or deliver to) them, return
 * it so the world can play its lines. `run()` applies it (taking delivered items).
 */
export function talkObjectiveFor(npcId: string): { q: QuestDef; o: QuestObjective; run: () => string[] } | null {
  if (!Save.hasActive()) return null;
  for (const q of allQuests()) {
    const o = objective(q);
    if (!o) continue;
    if (o.kind === 'talk' && o.npc === npcId) {
      return {
        q, o,
        run: () => {
          const out = [advance(q)];
          if (closesAtGiver(q, o) && isReady(q)) return complete(q);
          return out;
        },
      };
    }
    if (o.kind === 'deliver' && o.npc === npcId && Save.count(o.item) >= o.count) {
      return {
        q, o,
        run: () => {
          Save.take(o.item, o.count);
          const out = [advance(q)];
          if (closesAtGiver(q, o) && isReady(q)) return complete(q);
          return out;
        },
      };
    }
  }
  return null;
}

export function notify(ev: QuestEvent): string[] {
  if (!Save.hasActive()) return [];
  const out: string[] = [];
  for (const q of allQuests()) {
    const o = objective(q);
    if (!o) continue;
    const st = Save.S().quests[q.id];
    switch (ev.kind) {
      case 'defeat':
        if ((o.kind === 'defeat' && o.encounter === ev.encounter) || (o.kind === 'duel' && o.foe.id === ev.encounter)) out.push(advance(q));
        break;
      case 'prince':
        if (o.kind === 'prince' && o.prince === ev.prince) out.push(advance(q));
        break;
      case 'cook':
        if (o.kind === 'cook' && o.recipe === ev.recipe) out.push(advance(q));
        break;
      case 'fish':
        if (o.kind === 'fish' && o.fish === ev.fish) {
          st.n = (st.n ?? 0) + 1;
          Save.persist();
          if (st.n >= o.count) out.push(advance(q));
          else out.push(`📜 ${q.name}: ${st.n}/${o.count} ${getFish(o.fish) ? (getIsleItem(o.fish)?.name ?? o.fish) : o.fish}`);
        }
        break;
      case 'visit':
        if (o.kind === 'visit' && o.area === ev.area && Math.hypot(ev.x - o.at.x, ev.y - o.at.y) <= o.r) out.push(advance(q));
        break;
      case 'collect':
        if (o.kind === 'collect' && q.id === ev.quest) {
          st.took = [...(st.took ?? []), ev.spot];
          Save.persist();
          if (st.took.length >= o.spots.length) out.push(advance(q));
          else out.push(`📜 ${q.name}: ${st.took.length}/${o.spots.length} ${o.label}`);
        }
        break;
    }
  }
  return out;
}

/** Live collect pickups in an area: quest id, spot index, where, how it looks. */
export function pickupsIn(area: string): { quest: string; spot: number; x: number; y: number; label: string; emoji: string; color: number }[] {
  if (!Save.hasActive()) return [];
  const out: ReturnType<typeof pickupsIn> = [];
  for (const q of allQuests()) {
    const o = objective(q);
    if (!o || o.kind !== 'collect' || o.area !== area) continue;
    const took = state(q.id)?.took ?? [];
    o.spots.forEach((p, i) => {
      if (!took.includes(i)) out.push({ quest: q.id, spot: i, x: p.x, y: p.y, label: o.label, emoji: o.emoji, color: o.color });
    });
  }
  return out;
}

/** Quest foes waiting in an area for their fight (the live stage of some quest is their duel). */
export function duelsIn(area: string): EncounterDef[] {
  if (!Save.hasActive()) return [];
  const out: EncounterDef[] = [];
  for (const q of allQuests()) {
    const o = objective(q);
    if (o?.kind === 'duel' && o.area === area) out.push(getEncounter(o.foe.id) ?? o.foe);
  }
  return out;
}

/** Live visit targets in an area (drawn as a soft marker). */
export function visitsIn(area: string): { x: number; y: number; r: number; label: string }[] {
  if (!Save.hasActive()) return [];
  const out: { x: number; y: number; r: number; label: string }[] = [];
  for (const q of allQuests()) {
    const o = objective(q);
    if (o?.kind === 'visit' && o.area === area) out.push({ x: o.at.x, y: o.at.y, r: o.r, label: o.label });
  }
  return out;
}

/** Tracker rows: active quests, current hint and progress. Current area's first. */
export function tracker(area: string): { name: string; hint: string; here: boolean; ready: boolean }[] {
  if (!Save.hasActive()) return [];
  const rows: { name: string; hint: string; here: boolean; ready: boolean }[] = [];
  for (const q of allQuests()) {
    const st = state(q.id);
    if (!st || st.done) continue;
    const ready = st.stage >= q.stages.length;
    let hint = ready ? `Return to ${giverName(q)}` : q.stages[st.stage].hint;
    const o = objective(q);
    if (o?.kind === 'fish') hint += ` (${st.n ?? 0}/${o.count})`;
    if (o?.kind === 'collect') hint += ` (${st.took?.length ?? 0}/${o.spots.length})`;
    if (o?.kind === 'deliver') hint += ` (${Math.min(Save.count(o.item), o.count)}/${o.count})`;
    rows.push({ name: q.name, hint, here: q.area === area, ready });
  }
  rows.sort((a, b) => Number(b.here) - Number(a.here));
  return rows;
}

export { getQuest };
