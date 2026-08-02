import { WorldBossDef } from '../framework/BossDefs';
import { FIRE_BOSS } from './FireBoss';
import { WATER_BOSS } from './WaterBoss';
import { LIFE_BOSS } from './LifeBoss';
import { AIR_BOSS } from './AirBoss';
import { EARTH_BOSS } from './EarthBoss';
import { OIL_BOSS } from './OilBoss';
import { ICE_BOSS } from './IceBoss';
import { GROWTH_BOSS } from './GrowthBoss';
import { CRYSTAL_BOSS } from './CrystalBoss';
import { HUNT_BOSS } from './HuntBoss';
import { SOUL_BOSS } from './SoulBoss';
import { SHADOW_BOSS } from './ShadowBoss';
import { CREATION_BOSS } from './CreationBoss';
import { GRAVITY_BOSS } from './GravityBoss';
import { TIME_BOSS } from './TimeBoss';
import { ELECTRICITY_BOSS } from './ElectricityBoss';
import { ACID_BOSS } from './AcidBoss';
import { FATE_BOSS } from './FateBoss';
import { SOUND_BOSS } from './SoundBoss';
import { LIGHT_BOSS } from './LightBoss';
import { MAGNET_BOSS } from './MagnetBoss';
import { METAL_BOSS } from './MetalBoss';
import { PLASMA_BOSS } from './PlasmaBoss';
import { RUBBER_BOSS } from './RubberBoss';
import { GUNPOWDER_BOSS } from './GunpowderBoss';
import { ECHO_BOSS } from './EchoBoss';
import { SILENCE_BOSS } from './SilenceBoss';
import { MAGIC_BOSS } from './MagicBoss';
import { TECHNOLOGY_BOSS } from './TechnologyBoss';
import { SUBTERFUGE_BOSS } from './SubterfugeBoss';
import { RUIN_BOSS } from './RuinBoss';
import { DEATH_BOSS } from './DeathBoss';
import { ILLUSION_BOSS } from './IllusionBoss';
import { CONQUEST_BOSS } from './ConquestBoss';
import { GLUTTONY_BOSS } from './GluttonyBoss';
import { AMBER_BOSS } from './AmberBoss';
import { BIND_BOSS } from './BindBoss';
import { PAPER_BOSS } from './PaperBoss';
import { CHALK_BOSS } from './ChalkBoss';
import { PSYCHIC_BOSS } from './PsychicBoss';
import { PASSION_BOSS } from './PassionBoss';
import { GLASS_BOSS } from './GlassBoss';
import { FORTUNE_BOSS } from './FortuneBoss';
import { MAGMA_BOSS } from './MagmaBoss';
import { RADIATION_BOSS } from './RadiationBoss';
import { DEPTHS_BOSS } from './DepthsBoss';
import { GUM_BOSS } from './GumBoss';
import { AMALGAM_BOSS } from './AmalgamBoss';

/**
 * Every Sovereign, keyed by world id. A world whose id is missing here keeps
 * its old mutation-based challenge — that fallback is what lets the bosses
 * land in batches without ever leaving a world uncappable.
 *
 * The Amalgam reads this table whole: its stolen moveset is every def's
 * `signatures`, replayed through its own toolkit.
 */
const WORLD_BOSSES: Record<string, WorldBossDef> = {
  fire: FIRE_BOSS,
  water: WATER_BOSS,
  life: LIFE_BOSS,
  air: AIR_BOSS,
  earth: EARTH_BOSS,
  oil: OIL_BOSS,
  ice: ICE_BOSS,
  growth: GROWTH_BOSS,
  crystal: CRYSTAL_BOSS,
  hunt: HUNT_BOSS,
  soul: SOUL_BOSS,
  shadow: SHADOW_BOSS,
  creation: CREATION_BOSS,
  gravity: GRAVITY_BOSS,
  sand: TIME_BOSS,
  electricity: ELECTRICITY_BOSS,
  slime: ACID_BOSS,
  fate: FATE_BOSS,
  sound: SOUND_BOSS,
  light: LIGHT_BOSS,
  magnet: MAGNET_BOSS,
  metal: METAL_BOSS,
  plasma: PLASMA_BOSS,
  rubber: RUBBER_BOSS,
  gunpowder: GUNPOWDER_BOSS,
  echo: ECHO_BOSS,
  silence: SILENCE_BOSS,
  magic: MAGIC_BOSS,
  technology: TECHNOLOGY_BOSS,
  subterfuge: SUBTERFUGE_BOSS,

  // ── The Corrupt Realm ────────────────────────────────────────────
  ruin: RUIN_BOSS,
  death: DEATH_BOSS,
  illusion: ILLUSION_BOSS,
  conquest: CONQUEST_BOSS,
  gluttony: GLUTTONY_BOSS,
  amber: AMBER_BOSS,
  bind: BIND_BOSS,
  paper: PAPER_BOSS,
  chalk: CHALK_BOSS,
  psychic: PSYCHIC_BOSS,
  passion: PASSION_BOSS,
  glass: GLASS_BOSS,
  fortune: FORTUNE_BOSS,
  magma: MAGMA_BOSS,
  radiation: RADIATION_BOSS,
  depths: DEPTHS_BOSS,
  gum: GUM_BOSS,
};

export function getWorldBossDef(worldId: string): WorldBossDef | undefined {
  if (worldId === AMALGAM_WORLD_ID) return AMALGAM_BOSS;
  return WORLD_BOSSES[worldId];
}

/**
 * Every Sovereign, for the Amalgam to steal from. Deliberately excludes the
 * Amalgam: it is looked up by id but never registered, or its own signatures
 * would end up in its own stolen pool.
 */
export function getAllWorldBossDefs(): WorldBossDef[] {
  return Object.values(WORLD_BOSSES);
}

/** The pseudo-world the finale lives under — not a real campaign world. */
export const AMALGAM_WORLD_ID = 'amalgam';
export const AMALGAM_NODE_ID = 'amalgam-challenge';
