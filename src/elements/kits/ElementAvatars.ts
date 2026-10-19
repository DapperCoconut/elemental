import Phaser from 'phaser';
import { BaseAvatar, ColorFn } from './ElementVisuals';

import { AcidAvatar } from './AcidVisuals';
import { AirAvatar } from './AirVisuals';
import { BindAvatar } from './BindVisuals';
import { PaintAvatar } from './PaintVisuals';
import { WaxAvatar } from './WaxVisuals';
import { ClayAvatar } from './ClayVisuals';
import { ConquestAvatar } from './ConquestVisuals';
import { CreationAvatar } from './CreationVisuals';
import { CrystalAvatar } from './CrystalVisuals';
import { DeathAvatar } from './DeathVisuals';
import { DepthsAvatar } from './DepthsVisuals';
import { DreamAvatar } from './DreamVisuals';
import { EarthAvatar } from './EarthVisuals';
import { EchoAvatar } from './EchoVisuals';
import { ElectricityAvatar } from './ElectricityVisuals';
import { FateAvatar } from './FateVisuals';
import { FireAvatar } from './FireVisuals';
import { FortuneAvatar } from './FortuneVisuals';
import { GluttonyAvatar } from './GluttonyVisuals';
import { GravityAvatar } from './GravityVisuals';
import { GrowthAvatar } from './GrowthVisuals';
import { GumAvatar } from './GumVisuals';
import { GunpowderAvatar } from './GunpowderVisuals';
import { HuntAvatar } from './HuntVisuals';
import { IceAvatar } from './IceVisuals';
import { IllusionAvatar } from './IllusionVisuals';
import { JusticeAvatar } from './JusticeVisuals';
import { LifeAvatar } from './LifeVisuals';
import { LightAvatar } from './LightVisuals';
import { MagicAvatar } from './MagicVisuals';
import { MagmaAvatar } from './MagmaVisuals';
import { MagnetAvatar } from './MagnetVisuals';
import { ClothAvatar } from './ClothVisuals';
import { MarrowAvatar } from './MarrowVisuals';
import { TempestAvatar } from './TempestVisuals';
import { MythAvatar } from './MythVisuals';
import { MetalAvatar } from './MetalVisuals';
import { OilAvatar } from './OilVisuals';
import { PaperAvatar } from './PaperVisuals';
import { PassionAvatar } from './PassionVisuals';
import { PlasmaAvatar } from './PlasmaVisuals';
import { PsychicAvatar } from './PsychicVisuals';
import { RadiationAvatar } from './RadiationVisuals';
import { RubberAvatar } from './RubberVisuals';
import { RuinAvatar } from './RuinVisuals';
import { SandAvatar } from './SandVisuals';
import { ShadowAvatar } from './ShadowVisuals';
import { SilenceAvatar } from './SilenceVisuals';
import { SoulAvatar } from './SoulVisuals';
import { SoundAvatar } from './SoundVisuals';
import { SubterfugeAvatar } from './SubterfugeVisuals';
import { TechnologyAvatar } from './TechnologyVisuals';
import { TimeAvatar } from './TimeVisuals';
import { QuantumAvatar } from './QuantumAvatar';
import { WaterAvatar } from './WaterVisuals';

/**
 * Element id → its character rig.
 *
 * Every element already owns an avatar class, but until now the only way to stand one up was
 * to import it by name — which is fine inside that element's own kit and useless anywhere
 * that has to build a rig for an id it does not know at author time. The element cards on the
 * selection screens are exactly that case: five portraits a page, chosen from fifty.
 *
 * Two ids are traps and both are load-bearing here:
 *   `sand` is **Time** (TimeAvatar); `dune` is the actual sand element (SandAvatar).
 *   `slime` is **Acid** (AcidAvatar); `gum` is the actual slime element (GumAvatar).
 *
 * Every avatar constructor is `(scene, tint, …defaulted extras)`, so a two-argument call
 * covers all of them. Quantum is deliberately absent: it has no character of its own — it is
 * whichever pair has been bonded to it — so callers must cope with `null`.
 */
export type ElementAvatarFactory = (scene: Phaser.Scene, tint: ColorFn) => BaseAvatar;

const ELEMENT_AVATARS: Record<string, ElementAvatarFactory> = {
  fire: (s, t) => new FireAvatar(s, t),
  water: (s, t) => new WaterAvatar(s, t),
  life: (s, t) => new LifeAvatar(s, t),
  air: (s, t) => new AirAvatar(s, t),
  earth: (s, t) => new EarthAvatar(s, t),

  oil: (s, t) => new OilAvatar(s, t),
  shadow: (s, t) => new ShadowAvatar(s, t),
  ice: (s, t) => new IceAvatar(s, t),
  growth: (s, t) => new GrowthAvatar(s, t),
  crystal: (s, t) => new CrystalAvatar(s, t),
  soul: (s, t) => new SoulAvatar(s, t),
  hunt: (s, t) => new HuntAvatar(s, t),
  sand: (s, t) => new TimeAvatar(s, t),
  gravity: (s, t) => new GravityAvatar(s, t),
  creation: (s, t) => new CreationAvatar(s, t),

  electricity: (s, t) => new ElectricityAvatar(s, t),
  slime: (s, t) => new AcidAvatar(s, t),
  fate: (s, t) => new FateAvatar(s, t),
  sound: (s, t) => new SoundAvatar(s, t),
  light: (s, t) => new LightAvatar(s, t),

  magnet: (s, t) => new MagnetAvatar(s, t),
  metal: (s, t) => new MetalAvatar(s, t),
  plasma: (s, t) => new PlasmaAvatar(s, t),
  gunpowder: (s, t) => new GunpowderAvatar(s, t),
  echo: (s, t) => new EchoAvatar(s, t),
  rubber: (s, t) => new RubberAvatar(s, t),
  magic: (s, t) => new MagicAvatar(s, t),
  technology: (s, t) => new TechnologyAvatar(s, t),
  silence: (s, t) => new SilenceAvatar(s, t),
  subterfuge: (s, t) => new SubterfugeAvatar(s, t),

  justice: (s, t) => new JusticeAvatar(s, t),
  dream: (s, t) => new DreamAvatar(s, t),

  radiation: (s, t) => new RadiationAvatar(s, t),
  depths: (s, t) => new DepthsAvatar(s, t),
  psychic: (s, t) => new PsychicAvatar(s, t),
  ruin: (s, t) => new RuinAvatar(s, t),
  cloth: (s, t) => new ClothAvatar(s, t),
  marrow: (s, t) => new MarrowAvatar(s, t),
  tempest: (s, t) => new TempestAvatar(s, t),
  myth: (s, t) => new MythAvatar(s, t),
  magma: (s, t) => new MagmaAvatar(s, t),
  chalk: (s, t) => new PaintAvatar(s, t),
  wax: (s, t) => new WaxAvatar(s, t),
  clay: (s, t) => new ClayAvatar(s, t),
  paper: (s, t) => new PaperAvatar(s, t),
  bind: (s, t) => new BindAvatar(s, t),
  dune: (s, t) => new SandAvatar(s, t),

  illusion: (s, t) => new IllusionAvatar(s, t),
  conquest: (s, t) => new ConquestAvatar(s, t),
  passion: (s, t) => new PassionAvatar(s, t),
  death: (s, t) => new DeathAvatar(s, t),
  fortune: (s, t) => new FortuneAvatar(s, t),
  gum: (s, t) => new GumAvatar(s, t),
  gluttony: (s, t) => new GluttonyAvatar(s, t),
  // Not in AVATAR_CLASSES below on purpose: Quantum's rig is never one of the carried rigs the
  // arena vetoes on a Quantum body — it is the one that draws in their place.
  quantum: (s, t) => new QuantumAvatar(s, t),
};

/** The element's character rig, or null for an element that has no rig of its own. */
/**
 * The same table by class, for going the other way: which element does a rig belong to?
 * Quantum needs it — a loadout can tick five kits at once, each standing its own player rig
 * up, and only the body element's may show (see `BaseAvatar.rigFilter`). Exact constructor
 * first, then `instanceof`, so a repainted subclass (a boss's FX rig) still resolves.
 */
const AVATAR_CLASSES: Record<string, abstract new (...args: never[]) => BaseAvatar> = {
  fire: FireAvatar,
  water: WaterAvatar,
  life: LifeAvatar,
  air: AirAvatar,
  earth: EarthAvatar,
  oil: OilAvatar,
  shadow: ShadowAvatar,
  ice: IceAvatar,
  growth: GrowthAvatar,
  crystal: CrystalAvatar,
  soul: SoulAvatar,
  hunt: HuntAvatar,
  sand: TimeAvatar,
  gravity: GravityAvatar,
  creation: CreationAvatar,
  electricity: ElectricityAvatar,
  slime: AcidAvatar,
  fate: FateAvatar,
  sound: SoundAvatar,
  light: LightAvatar,
  magnet: MagnetAvatar,
  metal: MetalAvatar,
  plasma: PlasmaAvatar,
  gunpowder: GunpowderAvatar,
  echo: EchoAvatar,
  rubber: RubberAvatar,
  magic: MagicAvatar,
  technology: TechnologyAvatar,
  silence: SilenceAvatar,
  subterfuge: SubterfugeAvatar,
  justice: JusticeAvatar,
  dream: DreamAvatar,
  radiation: RadiationAvatar,
  depths: DepthsAvatar,
  psychic: PsychicAvatar,
  ruin: RuinAvatar,
  cloth: ClothAvatar,
  marrow: MarrowAvatar,
  tempest: TempestAvatar,
  myth: MythAvatar,
  magma: MagmaAvatar,
  chalk: PaintAvatar,
  wax: WaxAvatar,
  clay: ClayAvatar,
  paper: PaperAvatar,
  bind: BindAvatar,
  dune: SandAvatar,
  illusion: IllusionAvatar,
  conquest: ConquestAvatar,
  passion: PassionAvatar,
  death: DeathAvatar,
  fortune: FortuneAvatar,
  gum: GumAvatar,
  gluttony: GluttonyAvatar,
};

export function avatarElementId(avatar: BaseAvatar): string | null {
  for (const [id, cls] of Object.entries(AVATAR_CLASSES)) {
    if (avatar.constructor === cls) return id;
  }
  for (const [id, cls] of Object.entries(AVATAR_CLASSES)) {
    if (avatar instanceof cls) return id;
  }
  return null;
}

export function makeElementAvatar(
  elementId: string, scene: Phaser.Scene, tint: ColorFn,
): BaseAvatar | null {
  return ELEMENT_AVATARS[elementId]?.(scene, tint) ?? null;
}

/**
 * The fighter body sprite that goes *under* the rig, or undefined when the element paints
 * its own torso instead.
 *
 * Magma, Cloth and Marrow are the ones that do — their avatars override `drawBody`, so BootScene
 * never generates an `elem-` texture for them and asking for one would draw nothing.
 */
export function elementBodyTexture(scene: Phaser.Scene, elementId: string): string | undefined {
  // Quantum's `elem-` texture is its menu icon (a Bohr atom); the fighter wears a plain orb.
  const key = elementId === 'quantum' ? 'quantum-body' : `elem-${elementId}`;
  return scene.textures.exists(key) ? key : undefined;
}
