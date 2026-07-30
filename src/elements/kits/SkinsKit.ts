import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import { getSkinDef, SkinDef } from '../../data/Skins';

// ── SkinsArenaApi ─────────────────────────────────────────────────────────

export interface SkinsArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
}

type Owner = 'player' | 'npc';

/**
 * Renders the equipped skin on both fighters: the body repaint, the projectile repaint, and
 * the palette remap every element's visuals query through the `*Color` mappers below. The
 * replacement character rig is *not* built here — each element kit asks `skinId()` and hands
 * it to `makeSkinAvatar`, because only the kit knows when its rig should exist.
 *
 * The npc's skin arrives over the online lobby handshake, so a remote player's (or co-op
 * ally's) skin renders here too.
 */
export class SkinsKit {
  private playerSkin: string | null = null;
  private npcSkin: string | null = null;

  constructor(private arena: SkinsArenaApi) {}

  /** Called from ArenaScene.create() with each side's equipped skin id (null = default look). */
  setLoadouts(player: string | null, npc: string | null): void {
    this.playerSkin = player;
    this.npcSkin = npc;
  }

  reset(): void {
    this.playerSkin = null;
    this.npcSkin = null;
    if (this.arena.player?.active) this.arena.player.clearTint();
    if (this.arena.npc?.active) this.arena.npc.clearTint();
  }

  /** Equipped skin id for that side, or null. Element kits use this to pick their rig. */
  skinId(owner: Owner): string | null {
    return owner === 'player' ? this.playerSkin : this.npcSkin;
  }

  hasSkin(owner: Owner, id: string): boolean {
    return this.skinId(owner) === id;
  }

  private def(owner: Owner): SkinDef | undefined {
    return getSkinDef(this.skinId(owner));
  }

  /**
   * Maps one drawn colour through the owner's skin. A skin belongs to exactly one element
   * and only ever sits in the loadout of a fighter playing that element, so a single table
   * serves every element's mapper — hence the identical one-liners below.
   */
  private remap(owner: Owner, base: number): number {
    const def = this.def(owner);
    if (!def?.palette) return base;
    return def.palette[base] ?? def.paletteFallback ?? base;
  }

  // ── Per-element colour mappers ──────────────────────────────────────────
  // One per element so each kit's arena API can name the mapper it cares about. All of them
  // are `remap` — see the note there.

  fireColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  waterColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  lifeColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  airColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  earthColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  oilColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  shadowColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  iceColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  growthColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  crystalColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  soulColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  huntColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  /** Time's element id is `sand`. */
  sandColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  gravityColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  creationColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  electricityColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  fateColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  /** Acid's element id in code is still `slime`. */
  acidColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  soundColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  lightColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  magnetColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  metalColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  plasmaColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  gunpowderColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  echoColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  rubberColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  magicColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  silenceColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  subterfugeColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  technologyColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  justiceColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  dreamColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  chalkColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  magmaColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  illusionColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  depthsColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  ruinColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  glassColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  conquestColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  passionColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  paperColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  deathColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  fortuneColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  amberColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  psychicColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  radiationColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  bindColor(owner: Owner, base: number): number { return this.remap(owner, base); }
  gumColor(owner: Owner, base: number): number { return this.remap(owner, base); }

  // ── Per-frame repaint ───────────────────────────────────────────────────

  update(): void {
    this.paintBody('player', this.arena.player);
    this.paintBody('npc', this.arena.npc);
    this.paintProjectiles();
  }

  /**
   * `tintFill` repaints the sprite flat — a multiplicative tint could only ever darken the
   * element's own colours, never move them onto a different hue. Passing the pair as
   * top/bottom corners keeps a little vertical shading so the body isn't a dead silhouette.
   */
  private paintBody(owner: Owner, fighter: Fighter): void {
    if (!fighter || !fighter.active) return;
    const tint = this.def(owner)?.bodyTint;
    if (tint) fighter.setTintFill(tint[0], tint[0], tint[1], tint[1]);
  }

  private paintProjectiles(): void {
    const pDef = this.def('player');
    const nDef = this.def('npc');
    if (!pDef?.projectileTint && !nDef?.projectileTint) return;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active) continue;
      const def = proj.isFromPlayer ? pDef : nDef;
      const tint = def?.projectileTint;
      if (!tint) continue;
      const only = def?.projectileTextures;
      if (only && only.length > 0 && !only.includes(proj.texture?.key ?? '')) continue;
      proj.setTintFill(tint[0], tint[0], tint[1], tint[1]);
    }
  }
}
