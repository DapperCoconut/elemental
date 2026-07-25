import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { getCosmeticDef } from '../../data/Cosmetics';

// ── CosmeticsArenaApi ─────────────────────────────────────────────────────

export interface CosmeticsArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
}

type Owner = 'player' | 'npc';

/** Burnt: orange fire palette → black hue. Unknown fire colors fall back to near-black. */
const BURNT_PALETTE: Record<number, number> = {
  0x991100: 0x0a0a0a,
  0xcc1100: 0x101010,
  0xff2200: 0x0d0d0d,
  0xff4400: 0x151515,
  0xff5500: 0x1a1a1a,
  0xff6600: 0x202020,
  0xff8800: 0x2a2a2a,
  0xff9900: 0x2f2f2f,
  0xffdd33: 0x333333,
  0xffff99: 0x444444,
  0xffffff: 0x555555,
};
const BURNT_FALLBACK = 0x1a1a1a;
const BURNT_PROJECTILE_TINT = 0x111111;

/**
 * Water has no colour-slot cosmetic yet, so every remap table here is empty and `waterColor`
 * is the identity. Water's visuals still route through it, which keeps adding one later to a
 * table edit rather than a sweep through WaterVisuals and WaterKit.
 */
const WATER_PALETTES: Record<string, Record<number, number>> = {};

/**
 * Renders equipped cosmetics on both fighters: the color-slot body tint (and the
 * fire-attack palette other code queries via fireColor) plus the sigil-slot emoji
 * floating above the fighter. The npc loadout arrives via the online lobby
 * handshake, so the remote player's (or co-op ally's) cosmetics show here too.
 */
export class CosmeticsKit {
  private playerCosmetics: Record<string, string> = {};
  private npcCosmetics: Record<string, string> = {};
  private playerSigil: Phaser.GameObjects.Text | null = null;
  private npcSigil: Phaser.GameObjects.Text | null = null;

  constructor(private arena: CosmeticsArenaApi) {}

  /** Called from ArenaScene.create() with each side's equipped slot→cosmeticId map. */
  setLoadouts(player: Record<string, string>, npc: Record<string, string>): void {
    this.playerCosmetics = player;
    this.npcCosmetics = npc;
  }

  reset(): void {
    if (this.playerSigil) { this.playerSigil.destroy(); this.playerSigil = null; }
    if (this.npcSigil) { this.npcSigil.destroy(); this.npcSigil = null; }
    this.playerCosmetics = {};
    this.npcCosmetics = {};
    if (this.arena.player?.active) this.arena.player.clearTint();
    if (this.arena.npc?.active) this.arena.npc.clearTint();
  }

  hasCosmetic(owner: Owner, id: string): boolean {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    return Object.values(loadout).includes(id);
  }

  /**
   * Maps a fire visual color through the owner's color cosmetic. Identity unless
   * that owner has Burnt equipped.
   */
  fireColor(owner: Owner, base: number): number {
    if (!this.hasCosmetic(owner, 'burnt')) return base;
    return BURNT_PALETTE[base] ?? BURNT_FALLBACK;
  }

  /**
   * Maps a water visual color through the owner's color cosmetic. Identity until a water
   * colour cosmetic exists — see WATER_PALETTES.
   */
  waterColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = WATER_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  update(): void {
    this.updateOwner('player', this.arena.player, this.playerCosmetics);
    this.updateOwner('npc', this.arena.npc, this.npcCosmetics);
    this.tintFireProjectiles();
  }

  private updateOwner(owner: Owner, fighter: Fighter, loadout: Record<string, string>): void {
    if (!fighter || !fighter.active) {
      this.setSigil(owner, null);
      return;
    }

    // Color slot: tintFill repaints the whole sprite flat — a multiplicative tint
    // would only darken the texture's orange, never reach actual black.
    const colorDef = getCosmeticDef(loadout['color'] ?? '');
    if (colorDef?.tint !== undefined) {
      fighter.setTintFill(colorDef.tint);
    }

    // Sigil slot: emoji stamped on the fighter's body, hidden while invisible.
    const sigilDef = getCosmeticDef(loadout['sigil'] ?? '');
    if (sigilDef?.sigilEmoji) {
      let sigil = owner === 'player' ? this.playerSigil : this.npcSigil;
      if (!sigil) {
        sigil = this.arena.scene.add.text(fighter.x, fighter.y, sigilDef.sigilEmoji, { fontSize: '20px' })
          .setOrigin(0.5).setDepth(6);
        if (owner === 'player') this.playerSigil = sigil; else this.npcSigil = sigil;
      }
      sigil.setPosition(fighter.x, fighter.y);
      sigil.setScale(fighter.sizeMult);
      sigil.setVisible(!fighter.forceInvisible && fighter.alpha > 0);
    } else {
      this.setSigil(owner, null);
    }
  }

  private setSigil(owner: Owner, sigil: Phaser.GameObjects.Text | null): void {
    const current = owner === 'player' ? this.playerSigil : this.npcSigil;
    if (current && current !== sigil) current.destroy();
    if (owner === 'player') this.playerSigil = sigil; else this.npcSigil = sigil;
  }

  /** Burnt: darken every live fireball belonging to a burnt-equipped owner. */
  private tintFireProjectiles(): void {
    const playerBurnt = this.hasCosmetic('player', 'burnt');
    const npcBurnt = this.hasCosmetic('npc', 'burnt');
    if (!playerBurnt && !npcBurnt) return;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-fire') continue;
      if (proj.isFromPlayer ? playerBurnt : npcBurnt) proj.setTintFill(BURNT_PROJECTILE_TINT);
    }
  }
}
