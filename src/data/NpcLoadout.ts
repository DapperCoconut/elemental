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
  fire: { enhId: 'heatwave', slot: 'f' },
  water: { enhId: 'siphon', slot: 'f' },
  air: { enhId: 'winds-of-change', slot: 'f' },
  oil: { enhId: 'turret', slot: 'f' },
  life: { enhId: 'reap', slot: 'f' },
  earth: { enhId: 'dust-screen', slot: 'f' },
  shadow: { enhId: 'shadow-beacon', slot: 'f' },
  ice: { enhId: 'curling-stone', slot: 'r' },
  crystal: { enhId: 'crystal-shredder', slot: 'f' },
  electricity: { enhId: 'kinetic-bomb', slot: 'f' },
  gravity: { enhId: 'starfall', slot: 'f' },
  sand: { enhId: 'time-bomb', slot: 'f' },
  // Magnet has no mastery since its 2026-10-15 scrap rework, so nothing to bind.
  growth: { enhId: 'syringe-shot', slot: 'f' },
  slime: { enhId: 'breakdown', slot: 'f' },
  metal: { enhId: 'steel-shield', slot: 'f' },
  magic: { enhId: 'transmogrify', slot: 'f' },
  creation: { enhId: 'mortar-command', slot: 'f' },
  rubber: { enhId: 'atom-nhilego', slot: 'f' },
  technology: { enhId: 'byte-bomb', slot: 'f' },
  gunpowder: { enhId: 'overload', slot: 'f' },
  light: { enhId: 'killer-kebab', slot: 'f' },
  echo: { enhId: 'echo-bloom', slot: 'r' },
  subterfuge: { enhId: 'smoke-break', slot: 'f' },
  plasma: { enhId: 'unstable-orbital', slot: 'f' },
  hunt: { enhId: 'beastling', slot: 'f' },
  // Illusion, Chalk and Radiation used to give up their E. E is never replaceable now
  // (2026-10-15), so each binds over F instead — except Illusion, whose F is Guise (its best
  // escape and its whole decoy game), so it gives up Relocate, the escape Guise replaces.
  illusion: { enhId: 'masquerade', slot: 'r' },
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
  chalk: { enhId: 'living-chalk', slot: 'f' },
  // Psychic gives up the Knight. Pre-move is a read on the player, which is the one thing a bot
  // psychic can do better than its pieces: it has been watching every key they pressed.
  psychic: { enhId: 'pre-move', slot: 'r' },
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
  // Cloth gives up R. The bot's whole safety-line play is a two-press combo it already runs
  // well, and Bleed Stop is a better bail-out for a body that cannot plan one — and E is the
  // reel, which every other branch of its rotation is built around.
  cloth: { enhId: 'bleed-stop', slot: 'r' },
  // Clay gives up Slink. The wall run is the one ability a movement state machine plays worst —
  // its whole value is choosing when to drop off, which a bot does on a timer — while the
  // creature Give Life wakes is a summon the bot plays perfectly by standing still. The golem,
  // the shield and the fuse all survive.
  clay: { enhId: 'give-life', slot: 'f' },
  // Slime gives up Oozorbtion. The slab is the same trade made continuous — one swallowed shot
  // versus a pane that keeps five of them out of the air — and it does not ask the bot to guess
  // *when* it is about to be shot at, which is the whole skill of the F. It also hands the
  // rotation a real reason to press Solidify up close, which it otherwise never has. Q is refused
  // by `excludeSlots`, and the balls and the gum barrage are the two the bot already wins with.
  gum: { enhId: 'oobleck', slot: 'f' },
  // Harvest (id `gluttony`) gives up Feeding Frenzy. The crows are the one ability whose value is
  // all in where a cursor steers them, and a bot's drifting orbit centre plays them worst; the
  // shotgun is the same corruption-feeding pressure at range, aimed in one press. The bite and the
  // execute — the two the rotation's synergies are built on — both survive.
  gluttony: { enhId: 'corrupt-predation', slot: 'r' },
  // Marrow gives up Mastacre. The mast cells' value is a fever bar the Cellular Defense wall
  // already feeds every time a brick dies, and Brainstem — fired by the kit when the bot is losing
  // and has a macrophage or killer worth riding — turns the board it builds into an invincible
  // stall. Macrosma, Neutralize and Dendricles, the T-cell synergy included, all survive.
  marrow: { enhId: 'marrow-brainstem', slot: 'q' },
  // Wax gives up Hive Hearth. The hive is a long economy — fill it, walk back, cash it in — that
  // the bot only half plays; Smoke-out is fired by the kit for its two synergies (cover for a bot
  // wearing Rule Beetanica, a hiding place for a losing one) and the seek walks it back in. The
  // candle and the bombs, and the bomb-banks-the-candle combo, all survive.
  wax: { enhId: 'wax-smoke-out', slot: 'f' },
  // Tempest gives up Summon Front. The front's two synergies (the slam, and Float with R+) are
  // the airborne half of a kit the bot already plays from the current; Gale Uppercut, thrown by
  // the kit and juggled by the rotation's Click, is a second way to get a foe off the floor that
  // pays out in the same height. The current, the kick, the grapple and the wall all survive.
  tempest: { enhId: 'tempest-gale-uppercut', slot: 'r' },
  // Dream gives up Sleep Tight. The dagger is the finisher that tips a drowsy foe over, and the
  // music box — wound and thrown by the kit — does the same job slowly and, over a sleeper, holds
  // them under for as long as it plays. The pillow, Delve and Nightmare — the bedtime-then-dream
  // rhythm the rotation is built on — all survive.
  dream: { enhId: 'dream-music-box', slot: 'f' },
  // Myth gives up the Beast of Myth. The beast's flip is a walk the bot half makes; the Wormhole,
  // thrown by the kit, takes the target out of the fight for eight seconds while the realm feeds
  // the crowd, and the portal point walks the bot to the exit with Excalibur ready. The parry,
  // its riposte, the slash and Final Destiny all survive.
  myth: { enhId: 'myth-wormhole', slot: 'f' },
  // Gold (id `fortune`) gives up Midas Curse. The curse's value is a long chase across the floor it
  // lays, which the bot only half plays; Rags to Riches turns the purse the rest of its rotation
  // already fills into permanent damage, fired by the kit the moment it can be afforded. The heart
  // and the plume — the synergy the rotation is built on — both survive.
  fortune: { enhId: 'rags-to-riches', slot: 'q' },
  // Magnet gives up Steel Spike (and its zip). The spike's value is a cursor dragged over a moving
  // target and a ride timed to it, which the bot plays loosely; Mag-Lev is fired by the kit at a
  // target the bot has already nailed or magnetised — the track slows exactly the bodies the rest of
  // the rotation marks — and doubles as its escape, kicked off by a Repulse. Nails, Repulse and the
  // mech, which the rotation's synergies are built on, all survive.
  magnet: { enhId: 'mag-lev', slot: 'f' },
  // Sound gives up Hum. Autotune (the mastery passive) picks the soul song the moment calls for —
  // which is all the bot's Hum was ever pressed for — so the F key is free for the piano. The kit
  // fires it at a target the bot has already put out of tune with a slam, for the Dissonance
  // double stack. Fermata, the solo and the dance, which the rotation's synergies are built on,
  // all survive.
  sound: { enhId: 'forte-piano', slot: 'f' },
  // Devotion (id `passion`) gives up Mount Crucifix. At range the crucifix is a wall planted between
  // them so the shots fired across it pay faith; the Ark does that job with the player's own aim —
  // set on their sightline every shot they line up at the bot is a stare, and past half faith it is
  // set off the line so the pull drags their aim off the bot. Holy water, the grenade and the
  // chariot, which the rotation's synergies are built on, all survive.
  passion: { enhId: 'ark-of-the-covenant', slot: 'f' },
  // Radiation gives up Fallout Bunker. The bunker is cover the bot has to stand still inside; the
  // Test Dummy is the same "nothing can hurt me" trade that it can keep walking with, it takes the
  // airdrop's self-hit exactly as the bunker did (the kit throws it as the drop falls), and it pulls
  // fire off the bot while the flare gun is out. The rod and the flares, which the rotation's
  // synergies are built on, both survive.
  radiation: { enhId: 'test-dummy', slot: 'r' },
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
