import Phaser from 'phaser';
import { BaseAvatar } from '../ElementVisuals';
import { getSkinDef } from '../../../data/Skins';
import { CandleAvatar } from './CandleAvatar';
import { CoralAvatar } from './CoralAvatar';
import { SandAvatar } from './SandAvatar';
import { WitherAvatar } from './WitherAvatar';
import { RoaringAvatar } from './RoaringAvatar';
import { AngelicAvatar } from './AngelicAvatar';
import { AmberAvatar } from './AmberAvatar';
import { RageAvatar } from './RageAvatar';
import { CyborgAvatar } from './CyborgAvatar';
import { WarTwoAvatar } from './WarTwoAvatar';
import { RocketAvatar } from './RocketAvatar';
import { JasonAvatar } from './JasonAvatar';
import { DoomAvatar } from './DoomAvatar';
import { PassionAvatar } from './PassionAvatar';
import { SakuraAvatar } from './SakuraAvatar';
import { VampireAvatar } from './VampireAvatar';
import { RockstarAvatar } from './RockstarAvatar';
import { PirateAvatar } from './PirateAvatar';
import { SniperAvatar } from './SniperAvatar';
import { OrderAvatar } from './OrderAvatar';
import { WitchAvatar } from './WitchAvatar';
import { AnimatronicAvatar } from './AnimatronicAvatar';
import { CelebrationAvatar } from './CelebrationAvatar';
import { WardenAvatar } from './WardenAvatar';
import { HollowAvatar } from './HollowAvatar';
import { AnomalyAvatar } from './AnomalyAvatar';
import { ConductorAvatar } from './ConductorAvatar';
import { MonkeyAvatar } from './MonkeyAvatar';

/**
 * Registry of the replacement character rigs skins can install, keyed by `SkinDef.avatar`.
 *
 * Adding a skin that changes the character means writing one `BaseAvatar` subclass here and
 * one line in this table — nothing in the element's own kit or visuals changes, because the
 * kit asks for the rig by id and doesn't care which class comes back.
 */
type AvatarFactory = (scene: Phaser.Scene, depth: number | undefined) => BaseAvatar;

const SKIN_AVATARS: Record<string, AvatarFactory> = {
  candle: (scene, depth) => new CandleAvatar(scene, (c) => c, depth),
  coral: (scene, depth) => new CoralAvatar(scene, (c) => c, depth),
  sand: (scene, depth) => new SandAvatar(scene, (c) => c, depth),
  wither: (scene, depth) => new WitherAvatar(scene, (c) => c, depth),
  roaring: (scene, depth) => new RoaringAvatar(scene, (c) => c, depth),
  angelic: (scene, depth) => new AngelicAvatar(scene, (c) => c, depth),
  amber: (scene, depth) => new AmberAvatar(scene, (c) => c, depth),
  rage: (scene, depth) => new RageAvatar(scene, (c) => c, depth),
  cyborg: (scene, depth) => new CyborgAvatar(scene, (c) => c, depth),
  ww2: (scene, depth) => new WarTwoAvatar(scene, (c) => c, depth),
  rocket: (scene, depth) => new RocketAvatar(scene, (c) => c, depth),
  jason: (scene, depth) => new JasonAvatar(scene, (c) => c, depth),
  doom: (scene, depth) => new DoomAvatar(scene, (c) => c, depth),
  passion: (scene, depth) => new PassionAvatar(scene, (c) => c, depth),
  sakura: (scene, depth) => new SakuraAvatar(scene, (c) => c, depth),
  vampire: (scene, depth) => new VampireAvatar(scene, (c) => c, depth),
  rockstar: (scene, depth) => new RockstarAvatar(scene, (c) => c, depth),
  pirate: (scene, depth) => new PirateAvatar(scene, (c) => c, depth),
  sniper: (scene, depth) => new SniperAvatar(scene, (c) => c, depth),
  order: (scene, depth) => new OrderAvatar(scene, (c) => c, depth),
  witch: (scene, depth) => new WitchAvatar(scene, (c) => c, depth),
  animatronic: (scene, depth) => new AnimatronicAvatar(scene, (c) => c, depth),
  celebration: (scene, depth) => new CelebrationAvatar(scene, (c) => c, depth),
  warden: (scene, depth) => new WardenAvatar(scene, (c) => c, depth),
  hollow: (scene, depth) => new HollowAvatar(scene, (c) => c, depth),
  anomaly: (scene, depth) => new AnomalyAvatar(scene, (c) => c, depth),
  conductor: (scene, depth) => new ConductorAvatar(scene, (c) => c, depth),
  monkey: (scene, depth) => new MonkeyAvatar(scene, (c) => c, depth),
};

/**
 * The rig for whatever skin is equipped, or null to keep the element's own.
 *
 * Skin rigs are built with the identity colour mapper on purpose: a skin's palette is
 * already its final one, so routing it through the element's remap table (which exists to
 * turn that element's colours into the skin's) would map them a second time.
 */
export function makeSkinAvatar(
  skinId: string | null,
  scene: Phaser.Scene,
  depth?: number,
): BaseAvatar | null {
  const key = getSkinDef(skinId)?.avatar;
  const make = key ? SKIN_AVATARS[key] : undefined;
  return make ? make(scene, depth) : null;
}
