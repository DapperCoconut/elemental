import Phaser from 'phaser';
import * as Ranked from '../data/RankedData';
import * as PlayerData from '../data/PlayerData';
import { findElementDef } from '../data/ElementRoster';
import { clearMutationSelection } from '../data/Mutations';
import { clearConsumedItems } from '../data/Items';
import { buildNpcLoadout } from '../data/NpcLoadout';
import { setProgressLocked } from '../data/ProgressLock';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, drawMeter, fillDiamond, drawIcon,
} from '../ui';
import { addRankBadge, rankMetal } from '../ui/RankBadges';
import { Music, Sfx } from '../audio';

/**
 * Launch one game of a ranked series. Every game of the series goes through here, so the
 * fair-play rules live in one place: no mutations, no consumed items, the rung's
 * interpolated bot, and the loadout/perk rolled once at series start. The series is
 * mirrored into the save first, so walking out of the arena is settled as a forfeit.
 */
export function startRankedGame(scene: Phaser.Scene, series: Ranked.RankedSeries): void {
  Ranked.setActiveSeries(series);
  clearMutationSelection();
  clearConsumedItems();
  const diff = Ranked.rankedDifficulty(series.step);
  scene.scene.start('ArenaScene', {
    elementId: series.playerElement,
    enemyElementId: series.enemyElement,
    difficulty: diff.level,
    npcDifficulty: diff,
    mutations: [],
    starredMutations: [],
    playerPerk: PlayerData.getEquippedPerk(series.playerElement),
    npcPerk: series.npcPerk,
    npcLoadout: series.npcLoadout ?? buildNpcLoadout(series.enemyElement, diff.level),
    ranked: series,
  });
}

/**
 * Between games of a ranked series, and its final result.
 *
 * ArenaScene hands back the series plus who won the game. Under two wins a side, this
 * shows the score and starts the next game with the same elements; at two, it settles
 * the series (`RankedData.applySeriesResult`) and animates the RP bar, promotion or
 * demotion, the badge swap, and the shard payout.
 */
export class RankedIntermissionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RankedIntermissionScene' });
  }

  create(data: { ranked: Ranked.RankedSeries; playerWon: boolean; forfeit?: boolean }): void {
    setProgressLocked(false);
    this.input.enabled = true;
    if (data.forfeit) {
      // Walked out from between games: the series as it stands, settled as a loss.
      this.showResult(data.ranked, true);
      return;
    }
    const series: Ranked.RankedSeries = {
      ...data.ranked,
      wins: data.ranked.wins + (data.playerWon ? 1 : 0),
      losses: data.ranked.losses + (data.playerWon ? 0 : 1),
    };
    if (series.wins >= 2 || series.losses >= 2) {
      this.showResult(series);
    } else {
      Ranked.setActiveSeries(series);
      this.showIntermission(series, data.playerWon);
    }
  }

  // ── Shared pieces ──────────────────────────────────────────────────

  /** Three game slots: lit green for a game won, red for a game lost, empty for unplayed. */
  private drawScorePips(cx: number, y: number, series: Ranked.RankedSeries): void {
    const g = this.add.graphics().setDepth(DEPTH.content);
    const results: Array<'w' | 'l' | null> = [];
    // Order is unknown beyond the counts, so wins are shown first — it is a tally.
    for (let i = 0; i < series.wins; i++) results.push('w');
    for (let i = 0; i < series.losses; i++) results.push('l');
    while (results.length < 3) results.push(null);
    results.forEach((r, i) => {
      const x = cx + (i - 1) * 46;
      const col = r === 'w' ? C.verdant : r === 'l' ? C.blood : C.line;
      if (r) {
        for (let k = 4; k >= 1; k--) { g.fillStyle(col, 0.06); g.fillCircle(x, y, 12 + k * 4); }
      }
      fillDiamond(g, x, y, 15, r ? mix(col, 0x000000, 0.35) : C.well, 1);
      g.lineStyle(2, r ? mix(col, 0xffffff, 0.3) : C.line, r ? 1 : 0.7);
      g.beginPath();
      g.moveTo(x, y - 15); g.lineTo(x + 15, y); g.lineTo(x, y + 15); g.lineTo(x - 15, y); g.closePath();
      g.strokePath();
      if (r) drawIcon(g, r === 'w' ? 'check' : 'cross', x, y, 7, mix(col, 0xffffff, 0.6));
    });
  }

  private matchupLine(cx: number, y: number, series: Ranked.RankedSeries): void {
    const you = findElementDef(series.playerElement);
    const foe = findElementDef(series.enemyElement);
    this.add.text(cx, y, `${you?.emoji ?? '?'}  ${(you?.name ?? '?').toUpperCase()}     VS     ${(foe?.name ?? '?').toUpperCase()}  ${foe?.emoji ?? '?'}`, {
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 2,
      backgroundColor: hex(C.void_), padding: { x: 12, y: 4 },
    }).setOrigin(0.5).setDepth(DEPTH.content);
  }

  // ── Between games ──────────────────────────────────────────────────

  private showIntermission(series: Ranked.RankedSeries, wonGame: boolean): void {
    Music.play('menu');
    const { width, height } = this.scale;
    const cx = width / 2;
    const gameNo = series.wins + series.losses;
    const accent = wonGame ? C.verdant : C.blood;
    const tier = Ranked.tierOf(series.step);

    addBackdrop(this, { accent, variant: wonGame ? 'rays' : 'void', motes: 20 });
    addRankBadge(this, { x: width - 56, y: 56, size: 34, step: series.step, depth: DEPTH.content });

    this.add.text(cx, 96, `GAME ${gameNo}`, {
      fontSize: '16px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    const title = this.add.text(cx, 146, wonGame ? 'VICTORY' : 'DEFEAT', {
      fontSize: '58px', fontFamily: FONT_DISPLAY, letterSpacing: 8,
      color: hex(mix(accent, 0xffffff, 0.6)), stroke: hex(mix(accent, 0x000000, 0.8)), strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTH.content).setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });

    this.add.text(cx, 236, `${series.wins}  –  ${series.losses}`, {
      fontSize: '72px', fontFamily: FONT_DISPLAY, color: T.bright, stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, 290, 'SERIES SCORE  ·  FIRST TO TWO', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.drawScorePips(cx, 336, series);
    this.matchupLine(cx, 392, series);

    const decider = series.wins === 1 && series.losses === 1;
    this.add.text(cx, 430, decider ? 'ONE GAME FOR EVERYTHING.' : wonGame ? 'One more and the series is yours.' : 'Win the next one or it is over.', {
      fontSize: decider ? '18px' : '13px', fontFamily: decider ? FONT_DISPLAY : FONT_UI,
      color: decider ? hex(tier.color) : T.normal, letterSpacing: decider ? 3 : 0,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    const next = () => {
      this.input.enabled = false;
      this.cameras.main.fadeOut(260, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => startRankedGame(this, series));
    };
    addButton(this, {
      x: cx, y: height - 118, w: 300, h: 56, label: `▶  GAME ${gameNo + 1}`, sublabel: 'same elements, same bot',
      accent: C.verdant, variant: 'solid', fontSize: 20, onClick: next,
    }).pulse();
    addButton(this, {
      x: cx, y: height - 56, w: 220, h: 38, label: 'FORFEIT SERIES', accent: C.blood, variant: 'quiet', fontSize: 12,
      onClick: () => this.scene.restart({ ranked: series, playerWon: false, forfeit: true }),
    });
    this.input.keyboard?.on('keydown-SPACE', next);
    this.input.keyboard?.on('keydown-ENTER', next);
  }

  // ── Series result ──────────────────────────────────────────────────

  private showResult(series: Ranked.RankedSeries, forfeit = false): void {
    const outcome = Ranked.applySeriesResult(series, forfeit);
    const { width, height } = this.scale;
    const cx = width / 2;
    const won = outcome.won;
    const accent = won ? C.gold : C.blood;
    const beforeTier = Ranked.tierOf(outcome.beforeStep);

    addBackdrop(this, { accent: won ? Ranked.tierOf(outcome.afterStep).color : C.blood, variant: won ? 'rays' : 'void', motes: won ? 36 : 10 });
    this.time.delayedCall(500, () => Sfx.play(won ? 'victory' : 'defeat'));

    this.add.text(cx, 52, won ? 'SERIES WON' : forfeit ? 'SERIES FORFEITED' : 'SERIES LOST', {
      fontSize: '44px', fontFamily: FONT_DISPLAY, letterSpacing: 7,
      color: hex(mix(accent, 0xffffff, 0.6)), stroke: hex(mix(accent, 0x000000, 0.8)), strokeThickness: 7,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    this.add.text(cx, 92, forfeit ? 'Walking out counts as a loss.' : `${series.wins} – ${series.losses}`, {
      fontSize: forfeit ? '13px' : '22px', fontFamily: forfeit ? FONT_UI : FONT_DISPLAY, color: T.normal, letterSpacing: 3,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // ── Badge, then the swap if the rung changed ─────────────────────
    const by = 218;
    const aura = this.add.graphics().setDepth(DEPTH.panel);
    const paintAura = (col: number) => {
      aura.clear();
      for (let k = 8; k >= 1; k--) { aura.fillStyle(col, 0.03); aura.fillCircle(cx, by, 60 + k * 9); }
    };
    paintAura(beforeTier.color);
    let badge = addRankBadge(this, { x: cx, y: by, size: 78, step: outcome.beforeStep, depth: DEPTH.panel + 2 });

    const nameText = this.add.text(cx, 326, Ranked.rankName(outcome.beforeStep).toUpperCase(), {
      fontSize: '26px', fontFamily: FONT_DISPLAY, letterSpacing: 3,
      color: hex(mix(beforeTier.color, 0xffffff, 0.5)), stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // ── RP bar ───────────────────────────────────────────────────────
    const barW = 380;
    const barX = cx - barW / 2;
    const barY = 352;
    const barG = this.add.graphics().setDepth(DEPTH.content);
    const rpText = this.add.text(cx, barY + 30, '', {
      fontSize: '14px', fontFamily: FONT_DISPLAY, color: T.bright, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);
    const paintBar = (step: number, rp: number) => {
      barG.clear();
      const summit = step >= Ranked.EXCELSIUS_STEP;
      const need = Ranked.rpToClear(step);
      drawMeter(barG, barX, barY, barW, 16, summit ? 1 : rp / need, rankMetal(Ranked.tierIndexOf(step)).light);
      rpText.setText(summit ? `${Math.round(rp).toLocaleString()} RP` : `${Math.round(rp)} / ${need} RP`);
    };
    paintBar(outcome.beforeStep, outcome.beforeRp);

    const deltaText = this.add.text(cx, 412, `${outcome.delta > 0 ? '+' : ''}${outcome.delta} RP`, {
      fontSize: '30px', fontFamily: FONT_DISPLAY,
      color: outcome.delta >= 0 ? T.good : T.bad, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(DEPTH.content).setAlpha(0);

    const banner = this.add.text(cx, 150, '', {
      fontSize: '22px', fontFamily: FONT_DISPLAY, letterSpacing: 5, color: T.gold, stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content + 5).setAlpha(0);

    // Bonus lines + shards.
    const lines = [...outcome.bonusLines];
    if (outcome.shards > 0) lines.push(`💎 +${outcome.shards} SHARDS`);
    if (outcome.newPeak && !outcome.demoted) lines.push('★ NEW PEAK');
    lines.forEach((l, i) => {
      const t = this.add.text(cx, 448 + i * 18, l, {
        fontSize: '12px', fontFamily: FONT_DISPLAY, letterSpacing: 2,
        color: l.startsWith('💎') ? T.gold : l.startsWith('★') ? hex(mix(C.gold, 0xffffff, 0.4)) : T.normal,
      }).setOrigin(0.5).setDepth(DEPTH.content).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 260, delay: 900 + i * 160 });
    });

    // ── The animation ────────────────────────────────────────────────
    const counter = { rp: outcome.beforeRp };
    const swapBadge = (toStep: number, up: boolean) => {
      const t = Ranked.tierOf(toStep);
      badge.destroy();
      badge = addRankBadge(this, { x: cx, y: by, size: 78, step: toStep, depth: DEPTH.panel + 2 });
      badge.setScale(up ? 0.2 : 1.4).setAlpha(up ? 1 : 0);
      this.tweens.add({ targets: badge, scale: 1, alpha: 1, duration: up ? 520 : 380, ease: up ? 'Back.easeOut' : 'Cubic.easeOut' });
      paintAura(t.color);
      nameText.setText(Ranked.rankName(toStep).toUpperCase()).setColor(hex(mix(t.color, 0xffffff, 0.5)));
      this.tweens.add({ targets: nameText, scale: { from: 1.3, to: 1 }, duration: 300 });
      const flash = this.add.rectangle(cx, height / 2, width, height, up ? t.color : C.blood, up ? 0.5 : 0.35).setDepth(DEPTH.toast - 1);
      this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
      if (up) this.burst(cx, by, t.color, outcome.newTier ? 46 : 24);
      this.cameras.main.shake(up ? 160 : 220, up ? 0.005 : 0.008);
      Sfx.play(up ? (outcome.newTier ? 'level-up' : 'unlock') : 'shield-break');
    };
    const showBanner = (text: string, col: number) => {
      banner.setText(text).setColor(hex(mix(col, 0xffffff, 0.45)));
      banner.setScale(1.6);
      this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });
    };

    this.time.delayedCall(700, () => {
      this.tweens.add({ targets: deltaText, alpha: 1, y: 406, duration: 300 });
      Sfx.play(outcome.delta >= 0 ? 'shard-gain' : 'ui-denied');

      if (outcome.promoted) {
        // Fill to the brim, swap, then carry the remainder into the new rung.
        this.tweens.add({
          targets: counter, rp: Ranked.rpToClear(outcome.beforeStep), duration: 800, ease: 'Cubic.easeIn',
          onUpdate: () => paintBar(outcome.beforeStep, counter.rp),
          onComplete: () => {
            swapBadge(outcome.afterStep, true);
            const t = Ranked.tierOf(outcome.afterStep);
            showBanner(outcome.newTier ? `TIER UP — ${t.name.toUpperCase()}!` : 'PROMOTED!', t.color);
            counter.rp = 0;
            paintBar(outcome.afterStep, 0);
            this.tweens.add({
              targets: counter, rp: outcome.afterRp, duration: 600, delay: 300,
              onUpdate: () => paintBar(outcome.afterStep, counter.rp),
            });
          },
        });
      } else if (outcome.demoted) {
        this.tweens.add({
          targets: counter, rp: 0, duration: 600, ease: 'Cubic.easeIn',
          onUpdate: () => paintBar(outcome.beforeStep, counter.rp),
          onComplete: () => {
            swapBadge(outcome.afterStep, false);
            showBanner('DEMOTED', C.blood);
            counter.rp = Ranked.rpToClear(outcome.afterStep);
            paintBar(outcome.afterStep, counter.rp);
            this.tweens.add({
              targets: counter, rp: outcome.afterRp, duration: 500, delay: 250,
              onUpdate: () => paintBar(outcome.afterStep, counter.rp),
            });
          },
        });
      } else {
        this.tweens.add({
          targets: counter, rp: outcome.afterRp, duration: 900, ease: 'Cubic.easeOut',
          onUpdate: () => paintBar(outcome.afterStep, counter.rp),
          onComplete: () => {
            if (outcome.shielded) {
              showBanner('🛡 SHIELD HELD', C.frost);
              Sfx.play('shield-block');
            } else if (won) {
              this.burst(cx, by, Ranked.tierOf(outcome.afterStep).color, 14);
            }
          },
        });
      }
    });

    // ── Exits ────────────────────────────────────────────────────────
    addButton(this, {
      x: cx - 130, y: height - 52, w: 230, h: 50, label: 'PLAY AGAIN', iconArt: 'sword',
      accent: won ? C.gold : C.verdant, variant: 'solid', fontSize: 16,
      onClick: () => this.scene.start('RankedBanScene'),
    });
    addButton(this, {
      x: cx + 130, y: height - 52, w: 230, h: 50, label: 'RANKED LOBBY', iconArt: 'crown',
      accent: C.steel, variant: 'ghost', fontSize: 15,
      onClick: () => this.scene.start('RankedScene'),
    });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('RankedScene'));
  }

  private burst(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const d = 90 + Math.random() * 90;
      const p = this.add.graphics().setDepth(DEPTH.content + 4).setPosition(x, y);
      const r = 2 + Math.random() * 3;
      p.fillStyle(mix(color, 0xffffff, Math.random() * 0.6), 1);
      p.fillPoints([
        new Phaser.Geom.Point(0, -r * 2), new Phaser.Geom.Point(r, 0),
        new Phaser.Geom.Point(0, r * 2), new Phaser.Geom.Point(-r, 0),
      ], true);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, angle: 180,
        duration: 700 + Math.random() * 400, ease: 'Cubic.easeOut', onComplete: () => p.destroy(),
      });
    }
  }
}
