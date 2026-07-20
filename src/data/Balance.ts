/**
 * Global balance knobs.
 *
 * HP_SCALE multiplies the *base* health of every fighter — the player, 1v1 NPC
 * opponents at every difficulty, the online PvP replica, and invasion husks.
 * Multiplier-based scaling (gauntlet infinity `hpMult`, campaign `hpMult`,
 * mutations) stacks on top of the already-scaled base, so those modes follow
 * automatically. Raise it to lengthen fights, lower it to speed them up.
 */
export const HP_SCALE = 2;
