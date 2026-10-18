import Phaser from 'phaser';
import type { Fighter } from '../../entities/Fighter';
import { ItemsKit } from '../../elements/kits/ItemsKit';
import { ArtifactsKit, FoeShot } from '../../elements/kits/ArtifactsKit';
import { ITEMS, ItemEffect, getItem } from '../../data/Items';
import { ARTIFACTS, ArtifactPowerId, getArtifact } from '../../data/Artifacts';

/**
 * Campaign items and Vault artifacts as City draft cards — the late-run table, once every
 * ability is unlocked.
 *
 * The rules themselves are not re-implemented here. Items run through `ItemsKit` and artifacts
 * through `ArtifactsKit`, the same kits a campaign match uses, in their *run mode*: the kits
 * aim at the crowd of husks in the player's street instead of a single npc, and pick up a
 * relic mid-run rather than only at the bell.
 *
 * What an item does splits two ways (see `itemRefreshParts`):
 *  - permanent — max HP, regen, lifesteal, every multiplier, crit, speed, cooldowns, sabotage,
 *    triggered behaviors: applied once when the card is taken and kept for the whole run.
 *    Nothing in a City run resets fighter stats (a downed player is stood back up with HP
 *    only), so these simply stay.
 *  - per wave — the "consumed" parts: shield charges, shield HP, dodge chance (it wears down
 *    on every dodge), the once-per-match revive and once-per-match triggers. These are put
 *    back at the end of every wave held. Opening invincibility fires at the start of each wave.
 * Artifacts are rule changes and simply stay on; the Kingmaker Crown ticks once per wave held.
 *
 * Shared by the host (`CityDirector`) and the co-op guest (`CityGuest`): each side runs its
 * own player's relics on its own sim, exactly like its own perks and upgrades. The guest's
 * husks are replicas, so its damage goes through the replicas' relay and it never touches
 * their stats (`authoritative: false`).
 */

export interface CityRelicsWorld {
  readonly scene: Phaser.Scene;
  readonly player: Fighter;
  /** Living husks the local player can hit right now (their own street). */
  foes(): Fighter[];
  /** The husk shots flying in the local player's street. */
  foeShots(): FoeShot[];
  /** The arena's projectile group (player shots), for the projectile artifacts. */
  readonly projectiles: Phaser.Physics.Arcade.Group | null;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** False on a co-op guest — its husks are replicas of the host's. */
  readonly authoritative: boolean;
  /** A two-human run. */
  readonly coop: boolean;
}

/**
 * Artifacts the City cannot run honestly, by side:
 *  - Molasses Lens in co-op: the guest draws husk shots from the host's launch message, so a
 *    shot slowed on one sim would fly at full speed on the other.
 *  - On the guest, Gravity Snare (moves a husk) and Bullet Ballet (reads husk shots) would act
 *    on replicas the host overwrites every snapshot — they would do nothing.
 */
export function artifactAllowedInCity(power: ArtifactPowerId, authoritative: boolean, coop: boolean): boolean {
  if (power === 'molasses' && coop) return false;
  if (!authoritative && (power === 'gravitySnare' || power === 'bulletBallet' || power === 'molasses')) return false;
  return true;
}

/** The parts of an item that come back every wave. Empty → the item is wholly permanent. */
export function itemRefreshParts(e: ItemEffect): string[] {
  const out: string[] = [];
  if (e.shieldCharges) out.push('shield charges');
  if (e.shieldHp) out.push('shield');
  if (e.dodgeChance) out.push('dodge');
  if (e.reviveHpFrac) out.push('revive');
  if ((e.behaviors ?? []).some((b) => b.oncePerMatch ?? b.trigger === 'onLowHp')) out.push('once-per-match triggers');
  return out;
}

/** The card's footer tag: "permanent", plus what refills every wave. */
export function itemCardTag(e: ItemEffect): string {
  const refresh = itemRefreshParts(e);
  if (e.invincibleMs) refresh.push('opening invincibility');
  return refresh.length ? `PERMANENT · every wave: ${refresh.join(', ')}` : 'PERMANENT';
}

/** Hand-written run-mode read-outs, where the City runs an artifact differently from a duel. */
const CITY_ARTIFACT_TEXT: Partial<Record<ArtifactPowerId, string>> = {
  staticBraid: 'Every 4th hit you land calls lightning down on that husk: 45 damage to everything in a 170px ring, and a 0.35s stun',
  leechHalo: 'A 180px halo drains 7 HP per second from every husk inside it, and heals you for all of it',
  rimeBrand: 'Your hits stack Rime; at 6 stacks the husk you hit freezes solid for 1.4s and takes +40% damage',
  grudgeLedger: 'All damage you take is written down; every 12s, 45% of it lands on the nearest husk',
  gravitySnare: 'Every 9s the nearest husk is yanked halfway to you and rooted for 1.1s',
  mirrorBulwark: 'A mirror shell regrows every 10s: it cancels the next hit, sends it back at the nearest husk, and knocks 2.5s off your cooldowns',
  homing: 'Your projectiles steer toward the nearest husk for their whole flight',
  molasses: 'Every husk shot crosses the street at 40% speed',
  bulletBallet: 'A husk shot that passes within 30px grants Grace: +10% speed and +9% damage for 4s, up to 5 stacks',
  emberTrail: 'You leave a burning wake; every husk standing in it takes 16 damage per second',
  kingmaker: 'Every wave you hold, for the rest of the run: +8% damage, +5% move speed, +30 max HP',
};

export function artifactCardDesc(id: string): string {
  const def = getArtifact(id);
  if (!def) return '';
  return CITY_ARTIFACT_TEXT[def.power] ?? def.lines.join('. ');
}

export class CityRelics {
  private items: ItemsKit;
  private artifacts: ArtifactsKit;
  private artifactIds: string[] = [];
  /** Walk speed from items and artifacts, pulled with the mutations' through the director. */
  private speed = 1;

  constructor(private world: CityRelicsWorld) {
    const rel = this;
    this.items = new ItemsKit({
      get scene() { return world.scene; },
      get player() { return world.player; },
      applySelfDamage: (n) => world.player.applySelfDamage(n),
      applyPlayerSpeedMult: (f) => { rel.speed *= f; },
      showFloatingText: (x, y, t, c) => world.showFloatingText(x, y, t, c),
      foes: () => world.foes(),
      get foeAuthority() { return world.authoritative; },
    });
    this.artifacts = new ArtifactsKit({
      get scene() { return world.scene; },
      get player() { return world.player; },
      get projectiles() { return world.projectiles; },
      applyPlayerSpeedMult: (f) => { rel.speed *= f; },
      showFloatingText: (x, y, t, c) => world.showFloatingText(x, y, t, c),
      foes: () => world.foes(),
      foeShots: () => world.foeShots(),
    });
  }

  reset(): void {
    this.items.reset();
    this.artifacts.reset();
    this.artifactIds = [];
    this.speed = 1;
  }

  get speedMult(): number { return this.speed; }
  hasItem(id: string): boolean { return this.items.itemIds.includes(id); }
  hasArtifact(id: string): boolean { return this.artifactIds.includes(id); }

  artifactAllowed(id: string): boolean {
    const def = getArtifact(id);
    return !!def && artifactAllowedInCity(def.power, this.world.authoritative, this.world.coop);
  }

  /** Item ids the draft may offer: this element's own first, then a handful from everywhere else. */
  itemCandidates(elementId: string, others = 5): string[] {
    const free = ITEMS.filter((i) => !this.hasItem(i.id));
    const own = free.filter((i) => i.elementId === elementId).map((i) => i.id);
    const rest = Phaser.Utils.Array.Shuffle(free.filter((i) => i.elementId !== elementId)).slice(0, others).map((i) => i.id);
    return [...own, ...rest];
  }

  artifactCandidates(): string[] {
    return ARTIFACTS.filter((a) => !this.hasArtifact(a.id) && this.artifactAllowed(a.id)).map((a) => a.id);
  }

  takeItem(id: string): boolean {
    const def = getItem(id);
    return !!def && this.items.addItem(id);
  }

  takeArtifact(id: string): boolean {
    const def = getArtifact(id);
    if (!def || !this.artifactAllowed(id) || !this.artifacts.activate(id)) return false;
    this.artifactIds.push(id);
    return true;
  }

  /** The wave is held: refill what the items spend, tick the Crown, and say so. */
  onWaveCleared(): void {
    const p = this.world.player;
    const lines = this.items.refreshForWave();
    lines.forEach((l, i) => {
      this.world.scene.time.delayedCall(250 + i * 260, () => {
        if (!p.active) return;
        this.world.showFloatingText(p.x, p.y - 72 - (i % 3) * 14, `${l.emoji} ${l.text} (${l.name})`, '#9ff0d0');
      });
    });
    this.artifacts.onWaveCleared();
  }

  onWaveBegan(): void {
    this.items.onWaveBegan();
  }

  /** The local player's hit landed (bot and relayed hits are filtered out by the caller). */
  onHitDealt(victim: Fighter, amount: number): void {
    if (amount <= 0) return;
    this.items.onHitDealt(amount);
    this.artifacts.onHitDealt(amount, victim);
  }

  update(delta: number): void {
    this.items.update(delta);
    this.artifacts.update(delta);
  }

  destroy(): void {
    this.reset();
  }
}
