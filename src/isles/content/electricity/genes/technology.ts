import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Firmware — Technology's gene tree.
 *
 * Technology is a hacker: Addicting Cruncher from the hand (a triangle that gets faster and
 * deadlier on hits), Overt Advertisement (twelve popups for 3s — shelter for you, a virus for the
 * foe), Upload (a tethered cord that boxes the foe for 6s), Web Drag (6s of dragging the foe,
 * popups or the cord head around) and Admin Console (8s invincible at a typing test, then cash in
 * Admin Points). Three lines: **Adware** (the popups and the box — damage the foe walks into),
 * **Uplink** (the cord and the drag — cooldowns and moving data) and **Firewall** (backups,
 * checksums and the console's privileges).
 *
 * Addicting Cruncher fires on its own private cooldown (500ms down to 150ms on a streak) and
 * every shot counts as a Click cast, so the Click rule keeps its window short: at the slow end
 * one window stands at a time, and as the crunch speeds up the windows overlap and stack.
 */
export const TECHNOLOGY_GENE_TREE: GeneTree = {
  element: 'technology',
  name: 'Firmware',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: twelve popups, and every one of them is selling the foe something bad. */
    gene({
      id: 'gene-tech-clickbait', name: 'Clickbait', tier: 0, col: 0,
      text: 'Overt Advertisement casts make the foe take +3% damage for the 3s the popups stand',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'Malware Payload', cost: 18,
        text: 'Hits have a 10% chance to drop a worm in them: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Identity root: the cord goes out and the whole machine gets a faster handshake. */
    gene({
      id: 'gene-tech-fast-handshake', name: 'Fast Handshake', tier: 0, col: 1,
      text: 'Upload casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('r', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Packet Resend', cost: 18,
        text: 'Upload casts have a 12% chance to come straight back — the packet was sent twice',
        grant: onCast('r', { refundSelfChance: 0.12 }),
      },
    }),
    /** Defence root: definitions kept up to date, every night, without fail. */
    gene({
      id: 'gene-tech-antivirus', name: 'Antivirus', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Sandbox', cost: 18,
        text: 'The first 1.5s of every fight run in a sandbox: nothing can hurt you',
        grant: effect({ invincibleMs: 1500 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Cookie Tracking: a boxed foe is a foe whose every step is logged. */
    gene({
      id: 'gene-tech-cookie-tracking', name: 'Cookie Tracking', tier: 1, col: 0, needs: ['gene-tech-clickbait'],
      text: 'Upload casts make the foe take +4% damage for 6s — as long as the box holds',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 6000 })),
      mastery: {
        name: 'Pop-Up Storm', cost: 22,
        text: 'Overt Advertisement casts blast a wall of windows off you: 14 to everything within 110px',
        grant: onCast('e', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Drag & Drop: while the cursor is yours to drag with, so are your feet. */
    gene({
      id: 'gene-tech-drag-and-drop', name: 'Drag & Drop', tier: 1, col: 1, needs: ['gene-tech-fast-handshake'],
      text: 'Web Drag casts give +5% move speed for the 6s of dragging',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 6000 })),
      mastery: {
        name: 'Clipboard', cost: 22,
        text: 'Web Drag casts paste 1.5s off every other cooldown',
        grant: onCast('f', { refundOthers: 1500 }),
      },
    }),
    /** Patch Notes: each popup ships with a small fix for you. */
    gene({
      id: 'gene-tech-patch-notes', name: 'Patch Notes', tier: 1, col: 2, needs: ['gene-tech-antivirus'],
      text: 'Overt Advertisement casts give you 4 shield HP',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('e', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Scheduled Backup', cost: 22,
        text: 'Every 12s a backup finishes: a shield charge',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Overclocked: the cruncher running past its rating — the faster it fires, the more it piles on. */
    gene({
      id: 'gene-tech-overclocked', name: 'Overclocked', tier: 2, col: 0, needs: ['gene-tech-cookie-tracking'],
      text: 'Addicting Cruncher shots make the foe take +1.5% damage for 0.5s — overlapping as the crunch speeds up',
      maxLevel: 4, cost: linear(11, 3),
      grant: cast('click', (lv) => ({ damageMult: gain(0.015)(lv), ms: 500 })),
      mastery: {
        name: 'Zero-Day', cost: 26,
        text: '+5% crit chance — a hole in them nobody has patched',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Garbage Collection: freed memory, freed keys. */
    gene({
      id: 'gene-tech-garbage-collection', name: 'Garbage Collection', tier: 2, col: 1, needs: ['gene-tech-drag-and-drop'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Cron Job', cost: 26,
        text: 'Every 9s a scheduled task runs: −0.8s on every cooldown',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'cooldownRefund', amount: 800 }),
      },
    }),
    /** Checksum: more of you, verified intact. */
    gene({
      id: 'gene-tech-checksum', name: 'Checksum', tier: 2, col: 2, needs: ['gene-tech-patch-notes'],
      text: '+4 max HP',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ maxHp: flat(4)(lv) })),
      mastery: {
        name: 'Rollback', cost: 26,
        text: 'The first time you drop below 35% HP, roll back to a save: heal 25',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'healBurst', amount: 25 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Root Access: while the console runs, the foe's permissions are already being revoked. */
    gene({
      id: 'gene-tech-root-access', name: 'Root Access', tier: 3, col: 0, needs: ['gene-tech-overclocked'],
      text: 'Admin Console casts make the foe take +8% damage for 14s — the console and the cash-in after',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.08)(lv), ms: 14000 })),
      mastery: {
        name: 'Corrupted Records', cost: 32,
        text: 'The foe\'s records are corrupted before the bell: −5% foe max HP',
        grant: effect({ enemyMaxHpMult: 0.95 }),
      },
    }),
    /** Autosave: crosses Adware and Uplink — every drag writes a fresh copy of you to disk. */
    gene({
      id: 'gene-tech-autosave', name: 'Autosave', tier: 3, col: 1,
      needs: ['gene-tech-garbage-collection', 'gene-tech-overclocked'],
      text: 'Web Drag casts heal 3 HP',
      maxLevel: 4, cost: linear(13, 4),
      grant: cast('f', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Data Siphon', cost: 34,
        text: 'Heal 4% of all damage you deal — their bandwidth is your bandwidth',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Admin Privileges: when the invincibility runs out, the privileges do not. */
    gene({
      id: 'gene-tech-admin-privileges', name: 'Admin Privileges', tier: 3, col: 2, needs: ['gene-tech-checksum'],
      text: 'Admin Console casts give you 10 shield HP',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ shield: flat(10)(lv) })),
      mastery: {
        name: 'Hardened Kernel', cost: 32,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more core on the die. */
    enlightened({
      id: 'gene-tech-enl-core', name: 'Enlightened Core', col: 0, needs: ['gene-tech-root-access'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the clock ticks a little faster every version. */
    enlightened({
      id: 'gene-tech-enl-clock', name: 'Enlightened Clock', col: 1, needs: ['gene-tech-autosave'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: uptime, accumulating. */
    enlightened({
      id: 'gene-tech-enl-uptime', name: 'Enlightened Uptime', col: 2, needs: ['gene-tech-admin-privileges'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
