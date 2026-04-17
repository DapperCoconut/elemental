import { CorruptedType } from '../entities/corrupted/CorruptedBase';

export interface SpawnEntry {
  type: CorruptedType;
  baseHp: number;
  baseSpeed: number;
  /** Delay in ms from wave start before this enemy spawns */
  delayMs: number;
}

export interface WaveDefinition {
  waveNumber: number;
  spawns: SpawnEntry[];
  isBossWave: boolean;
  shardReward: number;
}

const HP_SCALE = (wave: number) => 1 + 0.15 * wave;

function basicSpawns(count: number, startDelayMs = 0): SpawnEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    type: CorruptedType.Basic,
    baseHp: 40,
    baseSpeed: 120,
    delayMs: startDelayMs + i * 1200,
  }));
}

function buildWave(wave: number): WaveDefinition {
  const isBossWave = wave % 5 === 0;
  const shardReward = Math.floor(5 + wave * 1.5) * (isBossWave ? 2 : 1);

  const spawns: SpawnEntry[] = [];
  const scale = HP_SCALE(wave);
  void scale; // used in caller when instantiating enemies

  if (isBossWave) {
    // Boss wave: Titan + supporting Basics
    spawns.push({
      type: CorruptedType.Titan,
      baseHp: Math.round(500 * HP_SCALE(wave)),
      baseSpeed: 50,
      delayMs: 1000,
    });
    const supportCount = Math.min(6, 2 + Math.floor(wave / 5));
    for (let i = 0; i < supportCount; i++) {
      spawns.push({
        type: CorruptedType.Basic,
        baseHp: Math.round(40 * HP_SCALE(wave)),
        baseSpeed: 120,
        delayMs: 2000 + i * 1000,
      });
    }
  } else if (wave <= 3) {
    // Waves 1–3: Basics only
    const count = 3 + (wave - 1) * 2;
    for (let i = 0; i < count; i++) {
      spawns.push({
        type: CorruptedType.Basic,
        baseHp: Math.round(40 * HP_SCALE(wave)),
        baseSpeed: 120,
        delayMs: i * 1300,
      });
    }
  } else if (wave <= 5) {
    // Waves 4–5: Add Overcharged
    const count = 5 + wave;
    for (let i = 0; i < count; i++) {
      const isOvercharged = i < Math.floor(count * 0.25);
      spawns.push({
        type: isOvercharged ? CorruptedType.Overcharged : CorruptedType.Basic,
        baseHp: Math.round((isOvercharged ? 60 : 40) * HP_SCALE(wave)),
        baseSpeed: isOvercharged ? 100 : 120,
        delayMs: i * 1200,
      });
    }
  } else if (wave <= 8) {
    // Waves 6–8: Add Rushers
    const count = 6 + wave;
    for (let i = 0; i < count; i++) {
      let type: CorruptedType;
      let baseHp: number;
      let baseSpeed: number;
      const r = Math.random();
      if (r < 0.3) {
        type = CorruptedType.Rusher; baseHp = 30; baseSpeed = 80;
      } else if (r < 0.5) {
        type = CorruptedType.Overcharged; baseHp = 60; baseSpeed = 100;
      } else {
        type = CorruptedType.Basic; baseHp = 40; baseSpeed = 120;
      }
      spawns.push({
        type,
        baseHp: Math.round(baseHp * HP_SCALE(wave)),
        baseSpeed,
        delayMs: i * 1100,
      });
    }
  } else {
    // Wave 9+: Full variety including Protected and Architects
    const count = 8 + Math.floor(wave * 0.6);
    for (let i = 0; i < count; i++) {
      let type: CorruptedType;
      let baseHp: number;
      let baseSpeed: number;
      const r = Math.random();
      if (r < 0.1) {
        type = CorruptedType.Protected; baseHp = 80; baseSpeed = 80;
      } else if (r < 0.2) {
        type = CorruptedType.Architect; baseHp = 70; baseSpeed = 60;
      } else if (r < 0.35) {
        type = CorruptedType.Rusher; baseHp = 30; baseSpeed = 80;
      } else if (r < 0.5) {
        type = CorruptedType.Overcharged; baseHp = 60; baseSpeed = 100;
      } else {
        type = CorruptedType.Basic; baseHp = 40; baseSpeed = 120;
      }
      spawns.push({
        type,
        baseHp: Math.round(baseHp * HP_SCALE(wave)),
        baseSpeed,
        delayMs: i * 1000,
      });
    }
  }

  return { waveNumber: wave, spawns, isBossWave, shardReward };
}

export class WaveManager {
  private currentWave = 0;
  private pendingSpawns: Array<{ entry: SpawnEntry; spawnAt: number }> = [];
  private waveStartTime = 0;
  private activeEnemyCount = 0;
  private _waveActive = false;

  get wave(): number { return this.currentWave; }
  get waveActive(): boolean { return this._waveActive; }

  /** Start the next wave. Returns the WaveDefinition so the caller can track rewards. */
  startNextWave(nowMs: number): WaveDefinition {
    this.currentWave++;
    const def = buildWave(this.currentWave);
    this.pendingSpawns = def.spawns.map(s => ({
      entry: s,
      spawnAt: nowMs + s.delayMs,
    }));
    this.waveStartTime = nowMs;
    this.activeEnemyCount = def.spawns.length;
    this._waveActive = true;
    return def;
  }

  /**
   * Called each frame. Returns spawns whose time has arrived.
   * Also decrements the pending count so we don't spawn multiple times.
   */
  collectDueSpawns(nowMs: number): SpawnEntry[] {
    const due: SpawnEntry[] = [];
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      if (nowMs >= this.pendingSpawns[i].spawnAt) {
        due.push(this.pendingSpawns[i].entry);
        this.pendingSpawns.splice(i, 1);
      }
    }
    return due;
  }

  onEnemyDefeated(): void {
    this.activeEnemyCount = Math.max(0, this.activeEnemyCount - 1);
    if (this.activeEnemyCount === 0 && this.pendingSpawns.length === 0) {
      this._waveActive = false;
    }
  }

  isWaveComplete(): boolean {
    return this._waveActive === false && this.currentWave > 0;
  }
}
