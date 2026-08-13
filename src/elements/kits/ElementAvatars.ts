import Phaser from 'phaser';
import { BaseAvatar, ColorFn } from './ElementVisuals';

import { AcidAvatar } from './AcidVisuals';
import { AirAvatar } from './AirVisuals';
import { BindAvatar } from './BindVisuals';
import { ChalkAvatar } from './ChalkVisuals';
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
import { MarrowAvatar } from './MarrowVisuals';
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
  marrow: (s, t) => new MarrowAvatar(s, t),
  magma: (s, t) => new MagmaAvatar(s, t),
  chalk: (s, t) => new ChalkAvatar(s, t),
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
};

/** The element's character rig, or null for an element that has no rig of its own. */
export function makeElementAvatar(
  elementId: string, scene: Phaser.Scene, tint: ColorFn,
): BaseAvatar | null {
  return ELEMENT_AVATARS[elementId]?.(scene, tint) ?? null;
}

/**
 * The fighter body sprite that goes *under* the rig, or undefined when the element paints
 * its own torso instead.
 *
 * Magma and Marrow are the two that do — their avatars override `drawBody`, so BootScene
 * never generates an `elem-` texture for them and asking for one would draw nothing.
 */
export function elementBodyTexture(scene: Phaser.Scene, elementId: string): string | undefined {
  const key = `elem-${elementId}`;
  return scene.textures.exists(key) ? key : undefined;
}
