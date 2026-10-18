import Phaser from 'phaser';
import * as Ranked from '../data/RankedData';
import { findElementDef } from '../data/ElementRoster';
import { setProgressLocked } from '../data/ProgressLock';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addBackButton, addButton, addPanel, addSectionLabel, addStatTile,
  drawMeter, fillDiamond, showToast,
} from '../ui';
import { addRankBadge, rankMetal } from '../ui/RankBadges';
import { Music } from '../audio';

/**
 * The ranked lobby: your badge, your rank and RP, the whole six-tier ladder, your
 * record, what the bot at your rung fights like, and the PLAY RANKED button.
 *
 * Also the place an abandoned series is settled — see `RankedData.resolveAbandonedSeries`.
 */
export class RankedScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RankedScene' });
  }

  create(): void {
    Music.play('menu');
    setProgressLocked(false);
    const forfeit = Ranked.resolveAbandonedSeries();

    const { width, height } = this.scale;
    const p = Ranked.getProfile();
    const accent = p.tier.color;
    const metal = rankMetal(p.tierIndex);

    addBackdrop(this, { accent, variant: 'rays', motes: 30 });

    const back = () => this.scene.start('TitleScene');
    addBackButton(this, back);
    this.input.keyboard?.on('keydown-ESC', back);

    this.add.text(width / 2, 40, 'RANKED', {
      fontSize: '38px', fontFamily: FONT_DISPLAY, letterSpacing: 10,
      color: hex(mix(accent, 0xffffff, 0.7)), stroke: hex(mix(accent, 0x000000, 0.75)), strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(width / 2, 72, 'BEST OF THREE  ·  FIVE BANS EACH  ·  SIX TIERS', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // ── Left: your badge ──────────────────────────────────────────────
    const lx = 236;
    addPanel(this, { x: lx, y: 300, w: 380, h: 400, accent, glow: 0.25, brackets: true, depth: DEPTH.base + 1 });

    const badgeY = 210;
    const halo = this.add.graphics().setDepth(DEPTH.panel);
    for (let k = 8; k >= 1; k--) {
      halo.fillStyle(accent, 0.025);
      halo.fillCircle(lx, badgeY, 70 + k * 10);
    }
    this.tweens.add({ targets: halo, alpha: { from: 0.6, to: 1 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const badge = addRankBadge(this, { x: lx, y: badgeY, size: 88, step: p.step, depth: DEPTH.panel + 2 });
    this.tweens.add({ targets: badge, y: badgeY - 5, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(lx, 336, p.name.toUpperCase(), {
      fontSize: '28px', fontFamily: FONT_DISPLAY, letterSpacing: 3,
      color: hex(mix(accent, 0xffffff, 0.55)), stroke: hex(mix(accent, 0x000000, 0.8)), strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(lx, 362, p.tier.motto, {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const barW = 300;
    const barG = this.add.graphics().setDepth(DEPTH.content);
    const summit = p.step >= Ranked.EXCELSIUS_STEP;
    drawMeter(barG, lx - barW / 2, 382, barW, 14, summit ? 1 : p.rp / p.rpToClear, metal.light);
    this.add.text(lx, 410, summit ? `${p.rp.toLocaleString()} RP  ·  PEAK ${p.peakExcelsiusRp.toLocaleString()}` : `${p.rp} / ${p.rpToClear} RP`, {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.5)), letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const note = p.shield ? '🛡  PROMOTION SHIELD — your next loss cannot demote you'
      : summit ? 'The summit has no ceiling. Every win is flex.'
      : `${p.rpToClear - p.rp} RP to ${Ranked.rankName(p.step + 1)}`;
    this.add.text(lx, 430, note, {
      fontSize: '11px', fontFamily: FONT_UI, color: p.shield ? T.good : T.normal,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // Recent series as pills.
    const hist = p.history.slice(0, 6);
    const pillW = 52;
    const hx0 = lx - ((hist.length - 1) * (pillW + 6)) / 2;
    if (hist.length === 0) {
      this.add.text(lx, 470, 'No series played yet.', { fontSize: '11px', fontFamily: FONT_UI, color: T.faint }).setOrigin(0.5).setDepth(DEPTH.content);
    }
    hist.forEach((h, i) => {
      const x = hx0 + i * (pillW + 6);
      const col = h.won ? C.verdant : C.blood;
      const g = this.add.graphics().setDepth(DEPTH.content);
      g.fillStyle(mix(C.plate, col, 0.25), 1);
      g.fillRoundedRect(x - pillW / 2, 456, pillW, 30, 5);
      g.lineStyle(1, col, 0.8);
      g.strokeRoundedRect(x - pillW / 2, 456, pillW, 30, 5);
      const pe = findElementDef(h.player)?.emoji ?? '?';
      const ee = findElementDef(h.enemy)?.emoji ?? '?';
      this.add.text(x, 465, `${h.won ? 'W' : 'L'} ${h.score}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(col, 0xffffff, 0.5)),
      }).setOrigin(0.5).setDepth(DEPTH.content + 1);
      this.add.text(x, 478, `${pe}${ee} ${h.delta > 0 ? '+' : ''}${h.delta}`, {
        fontSize: '9px', fontFamily: FONT_UI, color: T.normal,
      }).setOrigin(0.5).setDepth(DEPTH.content + 1);
    });

    // ── Right: the ladder ────────────────────────────────────────────
    const rx = 690;
    addSectionLabel(this, { x: rx, y: 104, text: 'THE LADDER', accent, width: 400 });
    const rowH = 50;
    const peakTier = Ranked.tierIndexOf(p.peakStep);
    for (let ti = 5; ti >= 0; ti--) {
      const row = 5 - ti;
      const y = 136 + row * rowH;
      const tier = Ranked.RANK_TIERS[ti];
      const here = ti === p.tierIndex;
      const earned = ti <= peakTier;
      const g = this.add.graphics().setDepth(DEPTH.panel);
      const plateCol = here ? mix(C.plate, tier.color, 0.28) : mix(C.plate, tier.color, earned ? 0.1 : 0.03);
      g.fillStyle(plateCol, here ? 1 : 0.85);
      g.fillRect(rx - 200, y - rowH / 2 + 3, 400, rowH - 6);
      g.lineStyle(here ? 2 : 1, tier.color, here ? 0.95 : earned ? 0.45 : 0.18);
      g.strokeRect(rx - 200, y - rowH / 2 + 3, 400, rowH - 6);
      if (here) {
        fillDiamond(g, rx - 208, y, 5, tier.color, 1);
        this.tweens.add({ targets: g, alpha: { from: 0.8, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
      }
      // Each rung's badge at division I (Excelsius has none) — the flex wall.
      addRankBadge(this, {
        x: rx - 170, y, size: 19, step: ti === 5 ? Ranked.EXCELSIUS_STEP : ti * 3 + 2,
        depth: DEPTH.panel + 2, showDivision: false, locked: !earned, animate: earned,
      });
      this.add.text(rx - 140, y - 7, tier.name.toUpperCase(), {
        fontSize: '15px', fontFamily: FONT_DISPLAY, letterSpacing: 2,
        color: earned ? hex(mix(tier.color, 0xffffff, 0.45)) : T.ghost,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content);
      this.add.text(rx - 140, y + 10, ti === 5 ? 'Open-ended rating' : `III · II · I   —   ${tier.rpPerDivision} RP per division`, {
        fontSize: '10px', fontFamily: FONT_UI, color: earned ? T.dim : T.ghost,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content);
      const tag = here ? '◄ YOU' : earned ? 'REACHED' : 'LOCKED';
      this.add.text(rx + 188, y, tag, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, letterSpacing: 1.5,
        color: here ? hex(mix(tier.color, 0xffffff, 0.5)) : earned ? T.dim : T.ghost,
      }).setOrigin(1, 0.5).setDepth(DEPTH.content);
    }

    // ── Record tiles ────────────────────────────────────────────────
    const tileY = 448;
    const winRate = p.seriesWins + p.seriesLosses > 0
      ? Math.round((p.seriesWins / (p.seriesWins + p.seriesLosses)) * 100) : 0;
    const tiles: Array<Parameters<typeof addStatTile>[1]> = [
      { x: rx - 134, y: tileY, w: 128, accent: C.verdant, icon: 'trophy', value: `${p.seriesWins}–${p.seriesLosses}`, label: 'Series', caption: `${winRate}% won` },
      { x: rx, y: tileY, w: 128, accent: C.ember, icon: 'flame', value: `${p.streak}`, label: 'Streak', caption: `best ${p.bestStreak}` },
      { x: rx + 134, y: tileY, w: 128, accent: C.gold, icon: 'crown', value: Ranked.tierOf(p.peakStep).name, label: 'Peak', caption: p.peakName },
    ];
    for (const t of tiles) addStatTile(this, { ...t, depth: DEPTH.panel });

    // ── Bottom: the bot and the button ──────────────────────────────
    this.add.text(width / 2, 528, `BOT AT ${p.name.toUpperCase()}:  ${Ranked.describeBot(p.step)}`, {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: T.normal, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(width / 2, 546,
      `Win: +${p.tier.winRp} RP & 💎${p.tier.shards}   ·   Loss: −${p.tier.lossRp} RP   ·   Mutations are off in ranked`, {
        fontSize: '10px', fontFamily: FONT_UI, color: T.dim,
      }).setOrigin(0.5).setDepth(DEPTH.content);

    addButton(this, {
      x: width / 2, y: height - 52, w: 360, h: 56,
      label: 'PLAY RANKED', sublabel: 'Ban phase  →  pick  →  best of three',
      iconArt: 'sword', accent, variant: 'solid', fontSize: 20, cut: 14,
      onClick: () => this.scene.start('RankedBanScene'),
    }).pulse();

    if (forfeit) {
      showToast(this, `ABANDONED SERIES — FORFEIT\n${forfeit.delta} RP${forfeit.demoted ? '  ·  DEMOTED' : ''}`, { accent: C.blood, holdMs: 3600, y: 120 });
    }
  }
}
