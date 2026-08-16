import { getElementUpgrades } from './Upgrades';
import { MASTERY_DEFS, MasterySlot } from './Mastery';

/**
 * What a solo 1v1 bot brings into the arena beyond its base kit. Shaped exactly like the
 * online opponent's handshake payload, because it is consumed by the same ArenaScene
 * fields (`npcUpgrades` / `npcMasteryBinds` / `npcMasteryOn`) — a bot with a loadout is
 * mechanically indistinguishable from a remote player who owns the same things.
 */
export interface NpcLoadout {
  upgrades: string[];
  masteryOn: boolean;
  masteryBinds: Record<string, string>;
}

/**
 * The bindable mastery ability a Nightmare bot fights with, and the slot it gives up for
 * it. Curated by hand: the slot is one whose base ability a bot leans on least (or cannot
 * use at all — Technology's F opens a browser minigame), and every entry respects the
 * enhancement's `excludeSlots`. Elements missing from this table run passive-only —
 * their bindable needs player-only input: Fate's tarot enchants the card under the
 * mouse, Silence's Puppetmaster hand-steers a possessed body, and Soul's Grave Mistake
 * spawns a hostile Alpha the AI would have to out-fight.
 *
 * Sand (`dune`) is missing for a different reason: its course autopilot falls off pillars
 * on purpose — a bot that never missed would make the element's one real cost invisible —
 * and Tempered Temptation makes a fall lethal. Handing it to the AI would be handing it a
 * suicide button. Nightmare Sand still gets the mastered look and Unsatiable's chain.
 */
const NPC_MASTERY_BINDS: Record<string, { enhId: string; slot: MasterySlot }> = {
  fire: { enhId: 'heatwave', slot: 'e' },
  water: { enhId: 'siphon', slot: 'f' },
  air: { enhId: 'winds-of-change', slot: 'f' },
  oil: { enhId: 'turret', slot: 'f' },
  life: { enhId: 'reap', slot: 'f' },
  earth: { enhId: 'dust-screen', slot: 'f' },
  shadow: { enhId: 'shadow-beacon', slot: 'f' },
  ice: { enhId: 'icicle-impale', slot: 'r' },
  crystal: { enhId: 'crystal-shredder', slot: 'f' },
  electricity: { enhId: 'kinetic-bomb', slot: 'f' },
  gravity: { enhId: 'starfall', slot: 'f' },
  sand: { enhId: 'time-bomb', slot: 'e' },
  magnet: { enhId: 'mag-lev', slot: 'f' },
  growth: { enhId: 'syringe-shot', slot: 'f' },
  slime: { enhId: 'breakdown', slot: 'f' },
  metal: { enhId: 'steel-shield', slot: 'f' },
  magic: { enhId: 'transmogrify', slot: 'f' },
  creation: { enhId: 'mortar-command', slot: 'f' },
  rubber: { enhId: 'atom-nhilego', slot: 'f' },
  technology: { enhId: 'byte-bomb', slot: 'f' },
  gunpowder: { enhId: 'overload', slot: 'e' },
  light: { enhId: 'killer-kebab', slot: 'f' },
  echo: { enhId: 'echo-bloom', slot: 'r' },
  subterfuge: { enhId: 'smoke-break', slot: 'f' },
  plasma: { enhId: 'unstable-orbital', slot: 'f' },
  hunt: { enhId: 'beastling', slot: 'e' },
  // Illusion gives up the Veil: the pane bends the caster's own bullets too, and a bot has no
  // way to reason about that, so it is the one slot the AI is actively better off without.
  illusion: { enhId: 'masquerade', slot: 'e' },
  // Passion gives up Flirt: Perfume is the same job — pure meter, no damage — done over an area
  // and on a timer instead of in a cone the bot has to line up, and a bot held to the Attraction
  // ring is always standing near the cloud it sprayed anyway.
  passion: { enhId: 'perfume', slot: 'e' },
  // Magma gives up Bloat: it is the one slot that costs the pressure economy nothing (the block
  // charges 25, the saw charges 30 a second), and a bot holding a chainsaw is committed to being
  // in melee anyway — which is exactly where a saved block would have mattered least.
  magma: { enhId: 'magma-saw', slot: 'r' },
  // Bind gives up the idol. It is the one slot a movement state machine plays worst — the payout
  // is entirely "keep standing inside a 118px ring" and the penalty for walking away is 5 anger a
  // second — and the ward it keeps instead is both its survival tool and the biggest single source
  // of the anger Ritual Sacrifice exists to pay off, which is what makes the dagger worth a slot.
  bind: { enhId: 'ritual-sacrifice', slot: 'r' },
  // Death gives up Riposte. It is the one ability in the kit whose whole value is aiming a 70px
  // line at the shot that is actually coming, which is exactly what a state machine is worst at
  // — and the delay does the same job (half damage taken for eight seconds) without asking the
  // bot to guess. The two clock abilities and the permanent amputation all survive.
  death: { enhId: 'delay-the-inevitable', slot: 'r' },
  // Chalk gives up Explosive Chalk. Both are a three-second commitment that pays off somewhere
  // the target is going to be rather than where it is, so they are the same bet — but the fuse
  // needs the enemy to walk down a line the bot's phantom cursor drew blind, while the drawing
  // walks after them on its own. The Ward, the blue line and the shield all survive.
  chalk: { enhId: 'living-chalk', slot: 'e' },
  // Psychic gives up Dodge Destiny. The window it takes instead is the same trade made better:
  // 1.25 seconds of nothing landing versus five seconds of nothing landing *yet* — and the bot
  // was only ever pressing R because it could see a queue, which is exactly what Utter Focus
  // makes longer. The charge, the seizure and the payout all survive.
  psychic: { enhId: 'utter-focus', slot: 'r' },
  // Depths gives up Eutrophication. It is the one ability in the kit that helps the player as
  // much as the bot — twelve real heals scattered where either side can reach them — and a
  // state machine is bad at deciding when that trade is worth making. The kraken does the same
  // job the bloom was doing (buy time while hurt) without handing anything over, and every
  // other ability the bot actually plays well is left alone. F is refused by `excludeSlots`:
  // the Angler is the fish, and the fish are what grow the kraken's arms back.
  depths: { enhId: 'release-the-kraken', slot: 'r' },
  // Conquest gives up the barricade. It is the one placement whose whole value is standing next
  // to something else — a resistance aura and a regen tick the bot has no reason to route its
  // army through — while the market is a building that pays for itself with no positioning
  // decision at all, which is exactly the kind of trade a state machine plays well. The
  // barracks, the turret and the Expansion, the three the bot actually wins with, all survive.
  conquest: { enhId: 'market', slot: 'f' },
  // Radiation gives up the Rod Baton. It is the one ability in the kit that asks the bot to
  // decide *which* of two things a swing is for — a dose on a clean body or a stun on a dosed
  // one — and to be standing in melee to do it, which is the range this element's own mastery
  // passive is paying it not to be. The post does the baton's real job (stop them moving) from
  // a distance and hands the tracer chain a target that cannot dodge. R is refused by
  // `excludeSlots`, and the F and the Q are the two the bot already wins with.
  radiation: { enhId: 'gamma-tether', slot: 'e' },
  // Cloth gives up R. The bot's whole safety-line play is a two-press combo it already runs
  // well, but Wretched Scarf is the one button that rewards being caught out — and E is the
  // reel, which every other branch of its rotation is built around.
  cloth: { enhId: 'wretched-scarf', slot: 'r' },
  // Slime gives up Oozorbtion. The slab is the same trade made continuous — one swallowed shot
  // versus a pane that keeps five of them out of the air — and it does not ask the bot to guess
  // *when* it is about to be shot at, which is the whole skill of the F. It also hands the
  // rotation a real reason to press Solidify up close, which it otherwise never has. Q is refused
  // by `excludeSlots`, and the balls and the gum barrage are the two the bot already wins with.
  gum: { enhId: 'oobleck', slot: 'f' },
  // Fortune gives up Safe Investment. It is the one key in the kit whose whole value is
  // *deferred* — coins locked in a bank the bot has no plan for withdrawing from, and money not
  // in the purse is money the golden pistol and the ultimate cannot price themselves off. The
  // car is the opposite trade: three coins of nothing, thrown across the arena, and the bot's
  // one real synergy with it (climb on to reload, step off to fight) is a state check rather
  // than a judgement call. The market, the turnstiles and the beam all survive.
  fortune: { enhId: 'drive-by-flex', slot: 'e' },
};

/** Upgrade slots granted per difficulty level. Below Hard a bot fights bare. */
const UPGRADE_SLOTS_BY_LEVEL: Record<number, number> = { 3: 3, 4: 4, 5: Infinity };

/**
 * The loadout a solo 1v1 bot of `elementId` fights with at `difficultyLevel` (1–5).
 * Hard draws 3 of the element's upgrade slots at random, Expert 4, Nightmare all of
 * them — regardless of what the player owns. Nightmare additionally switches the
 * element's mastery on (mastered look + passive) and binds the curated enhancement.
 */
export function buildNpcLoadout(elementId: string, difficultyLevel: number): NpcLoadout {
  const grant = UPGRADE_SLOTS_BY_LEVEL[difficultyLevel] ?? 0;
  const slots = getElementUpgrades(elementId).map((u) => u.slot);
  let upgrades: string[] = [];
  if (grant >= slots.length) {
    upgrades = slots;
  } else if (grant > 0) {
    const pool = [...slots];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    upgrades = pool.slice(0, grant);
  }

  const masteryOn = difficultyLevel >= 5 && !!MASTERY_DEFS[elementId];
  const bind = masteryOn ? NPC_MASTERY_BINDS[elementId] : undefined;
  return {
    upgrades,
    masteryOn,
    masteryBinds: bind ? { [bind.slot]: bind.enhId } : {},
  };
}
