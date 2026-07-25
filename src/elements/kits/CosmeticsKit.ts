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
 * Water, Life, Air, Earth, Oil and Shadow have no colour-slot cosmetic yet, so every remap
 * table here is empty and all six mappers are the identity. Their visuals still route through
 * them, which keeps adding one later to a table edit rather than a sweep through the element's
 * visuals and kit.
 */
const WATER_PALETTES: Record<string, Record<number, number>> = {};
const LIFE_PALETTES: Record<string, Record<number, number>> = {};
const AIR_PALETTES: Record<string, Record<number, number>> = {};
const EARTH_PALETTES: Record<string, Record<number, number>> = {};
const OIL_PALETTES: Record<string, Record<number, number>> = {};
const SHADOW_PALETTES: Record<string, Record<number, number>> = {};
const ICE_PALETTES: Record<string, Record<number, number>> = {};
const GROWTH_PALETTES: Record<string, Record<number, number>> = {};
const CRYSTAL_PALETTES: Record<string, Record<number, number>> = {};
const SOUL_PALETTES: Record<string, Record<number, number>> = {};
const HUNT_PALETTES: Record<string, Record<number, number>> = {};
const SAND_PALETTES: Record<string, Record<number, number>> = {};
const GRAVITY_PALETTES: Record<string, Record<number, number>> = {};
const CREATION_PALETTES: Record<string, Record<number, number>> = {};
const ELECTRICITY_PALETTES: Record<string, Record<number, number>> = {};
const FATE_PALETTES: Record<string, Record<number, number>> = {};
const ACID_PALETTES: Record<string, Record<number, number>> = {};
const SOUND_PALETTES: Record<string, Record<number, number>> = {};
const LIGHT_PALETTES: Record<string, Record<number, number>> = {};
const MAGNET_PALETTES: Record<string, Record<number, number>> = {};
const METAL_PALETTES: Record<string, Record<number, number>> = {};
const PLASMA_PALETTES: Record<string, Record<number, number>> = {};
const GUNPOWDER_PALETTES: Record<string, Record<number, number>> = {};

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

  /**
   * Maps a life visual color through the owner's color cosmetic. Identity until a life
   * colour cosmetic exists — see LIFE_PALETTES.
   */
  lifeColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = LIFE_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps an air visual color through the owner's color cosmetic. Identity until an air
   * colour cosmetic exists — see AIR_PALETTES.
   */
  airColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = AIR_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps an earth visual color through the owner's color cosmetic. Identity until an earth
   * colour cosmetic exists — see EARTH_PALETTES.
   */
  earthColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = EARTH_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps an oil visual color through the owner's color cosmetic. Identity until an oil colour
   * cosmetic exists — see OIL_PALETTES.
   */
  oilColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = OIL_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a shadow visual color through the owner's color cosmetic. Identity until a shadow
   * colour cosmetic exists — see SHADOW_PALETTES.
   */
  shadowColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = SHADOW_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps an ice visual color through the owner's color cosmetic. Identity until an ice colour
   * cosmetic exists — see ICE_PALETTES.
   */
  iceColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = ICE_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a growth visual color through the owner's color cosmetic. Identity until a growth
   * colour cosmetic exists — see GROWTH_PALETTES.
   */
  growthColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = GROWTH_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a crystal visual color through the owner's color cosmetic. Identity until a crystal
   * colour cosmetic exists — see CRYSTAL_PALETTES.
   */
  crystalColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = CRYSTAL_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a soul visual color through the owner's color cosmetic. Identity until a soul colour
   * cosmetic exists — see SOUL_PALETTES.
   */
  soulColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = SOUL_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a hunt visual color through the owner's color cosmetic. Identity until a hunt colour
   * cosmetic exists — see HUNT_PALETTES.
   */
  huntColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = HUNT_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a time visual color through the owner's color cosmetic. Identity until a time colour
   * cosmetic exists — see SAND_PALETTES. (Time's element id is `sand`.)
   */
  sandColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = SAND_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a gravity visual color through the owner's color cosmetic. Identity until a gravity
   * colour cosmetic exists — see GRAVITY_PALETTES.
   */
  gravityColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = GRAVITY_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a creation visual color through the owner's color cosmetic. Identity until a creation
   * colour cosmetic exists — see CREATION_PALETTES.
   */
  creationColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = CREATION_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps an electric visual color through the owner's color cosmetic. Identity until an
   * electricity colour cosmetic exists — see ELECTRICITY_PALETTES.
   */
  electricityColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = ELECTRICITY_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a fate visual color through the owner's color cosmetic. Identity until a fate colour
   * cosmetic exists — see FATE_PALETTES.
   */
  fateColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = FATE_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps an acid visual color through the owner's color cosmetic. Identity until an acid colour
   * cosmetic exists — see ACID_PALETTES. (Acid's element id in code is still `slime`.)
   */
  acidColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = ACID_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a sound visual color through the owner's color cosmetic. Identity until a sound colour
   * cosmetic exists — see SOUND_PALETTES.
   */
  soundColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = SOUND_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a light visual color through the owner's color cosmetic. Identity until a light colour
   * cosmetic exists — see LIGHT_PALETTES.
   */
  lightColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = LIGHT_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a magnet visual color through the owner's color cosmetic. Identity until a magnet
   * colour cosmetic exists — see MAGNET_PALETTES.
   */
  magnetColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = MAGNET_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a metal visual color through the owner's color cosmetic. Identity until a metal colour
   * cosmetic exists — see METAL_PALETTES.
   */
  metalColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = METAL_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a plasma visual color through the owner's color cosmetic. Identity until a plasma
   * colour cosmetic exists — see PLASMA_PALETTES.
   */
  plasmaColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = PLASMA_PALETTES[loadout['color'] ?? ''];
    return palette ? (palette[base] ?? base) : base;
  }

  /**
   * Maps a gunpowder visual color through the owner's color cosmetic. Identity until a gunpowder
   * colour cosmetic exists — see GUNPOWDER_PALETTES.
   */
  gunpowderColor(owner: Owner, base: number): number {
    const loadout = owner === 'player' ? this.playerCosmetics : this.npcCosmetics;
    const palette = GUNPOWDER_PALETTES[loadout['color'] ?? ''];
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
