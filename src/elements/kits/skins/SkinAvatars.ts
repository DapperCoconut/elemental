import Phaser from 'phaser';
import { BaseAvatar } from '../ElementVisuals';
import { getSkinDef } from '../../../data/Skins';
import { CandleAvatar } from './CandleAvatar';
import { CoralAvatar } from './CoralAvatar';
import { SandAvatar } from './SandAvatar';
import { WitherAvatar } from './WitherAvatar';
import { RoaringAvatar } from './RoaringAvatar';
import { AngelicAvatar } from './AngelicAvatar';

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
