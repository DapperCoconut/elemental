/**
 * Campaign fight formats — the shapes a bout can take beyond a straight duel.
 *
 * A format changes the *rules* of a fight, not its opponent: tag-team chains
 * several opponents (and lets a fallen player tag in a fresh element), horde
 * feeds husks into the duel, survival makes the clock the win condition, and
 * flood takes the arena away until the kill lands.
 *
 * Formats are pure data on `CampaignFightDef`; the machinery lives in
 * `CampaignFormatKit` (horde/survival/flood) and in the tag-team scene loop
 * (ArenaScene ⇄ CampaignElementSelectScene).
 */

export type FightFormat =
  | {
      kind: 'tagteam';
      /** Every opponent, in order. The def's own enemyElementId is ignored. */
      enemies: string[];
    }
  | {
      kind: 'horde';
      /** Ms between waves. Default 9000. */
      intervalMs?: number;
      /** Husks per wave. Default 2. */
      perWave?: number;
    }
  | {
      kind: 'survival';
      /** Outlast this many seconds. The foe is nigh-unkillable. */
      seconds: number;
    }
  | {
      kind: 'flood';
      /** Seconds of clean arena before the corruption starts pouring in. */
      graceSeconds: number;
    }
  | {
      kind: 'pledge';
      /**
       * Times a freed Sovereign may stand in for you. One opponent, not a chain: you fall,
       * an element you have not burned this bout takes the floor, and the foe keeps every
       * wound — a phased boss keeps its phase too.
       */
      pledges: number;
    };

/**
 * Tag-team run state, carried between ArenaScene restarts and the element
 * re-select on death. The Amalgam's pledge system is the same machinery with a
 * one-entry `enemies` list and a fall counter — see `pledgesLeft`.
 */
export interface TagTeamState {
  enemies: string[];
  index: number;
  /** Carried HP for the current enemy after a player death — damage sticks. */
  enemyHp: number | null;
  /** Elements burned by deaths. Each element fights at most once per bout. */
  usedElements: string[];
  /**
   * Pledge fights only: falls still owed to you. Hits zero and the next death ends the
   * bout. Absent on an ordinary tag-team chain, where the enemy list is the limit.
   */
  pledgesLeft?: number;
  /**
   * Pledge fights against a phased Sovereign: the body the next element inherits. A boss's
   * HP lives in per-phase pools, so `enemyHp` alone would hand the Amalgam its first phase
   * back every time somebody died.
   *
   * `setPieceUsed` is the Disgraced King's addition: two of his bodies fire a once-per-fight
   * set piece off an HP threshold, and a body handed on below that threshold would open with
   * the set piece it had already spent.
   */
  bossResume?: { phaseIdx: number; hp: number; setPieceUsed?: boolean } | null;
}

/** True for the Amalgam's lives system — one foe, several elements. */
export function isPledgeFight(t: TagTeamState | null | undefined): boolean {
  return t?.pledgesLeft !== undefined;
}

/**
 * The Disgraced King and the Devourer behind him are fought as a tag team:
 * three elements, two switches. Mechanically that is the pledge system — one
 * foe, several elements, every wound sticks — rather than a chain of opponents,
 * so it travels in the same `TagTeamState` and the same `bossResume` slot.
 */
export const KING_TAG_SWITCHES = 2;

/** A fresh tag-team run at the sealed door. */
export function freshKingTagTeam(): TagTeamState {
  return {
    enemies: ['king'],
    index: 0,
    enemyHp: null,
    usedElements: [],
    pledgesLeft: KING_TAG_SWITCHES,
    bossResume: null,
  };
}

/** One line for briefings and scouting reports. */
export function describeFormat(f: FightFormat): string {
  switch (f.kind) {
    case 'tagteam':
      return `⚔ TAG TEAM — ${f.enemies.length} foes in a row. Fall, and you tag in another element; damage you dealt sticks.`;
    case 'horde':
      return '👾 HORDE — husks pour into the duel in waves.';
    case 'survival':
      return `⏳ SURVIVAL — outlast ${f.seconds}s. The foe barely bleeds; the clock is the kill.`;
    case 'flood':
      return `🔴 FLOOD — after ${f.graceSeconds}s the corruption starts swallowing the arena. Finish it fast.`;
    case 'pledge':
      return `🛡 PLEDGE — the Sovereigns you freed stand in for you. Fall ${f.pledges} time${f.pledges === 1 ? '' : 's'} and another element takes the floor; every wound you dealt stays dealt.`;
  }
}
