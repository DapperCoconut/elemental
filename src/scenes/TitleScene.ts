import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as Cheats from '../data/Cheats';
import { createCheatSave, verifyCheatSave, applyKonamiCheat } from '../data/CheatSave';
import { GAUNTLET_COST } from '../data/GauntletData';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addChip, addIconButton, addToggle, showToast,
  fillDiamond, drawGlow,
} from '../ui';
import { Music } from '../audio';

/** Logo colours at 0 and 100 clicks — the title bleeds from ember to blood-red. */
const LOGO_COLD = 0xff8a2b;
const LOGO_HOT = 0xff1133;

/** The five base elements, orbiting the sigil ring behind the wordmark. */
const SIGIL_ELEMENTS: Array<{ emoji: string; color: number }> = [
  { emoji: '🔥', color: 0xff4400 },
  { emoji: '💧', color: 0x0088ff },
  { emoji: '🌿', color: 0x44cc44 },
  { emoji: '💨', color: 0xaaddff },
  { emoji: '🪨', color: 0x887755 },
];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    Music.play('title');
    const { width, height } = this.scale;
    const cx = width / 2;

    addBackdrop(this, { accent: C.ember, variant: 'rays', motes: 26 });

    // ── Wordmark ────────────────────────────────────────────────────
    const titleY = 112;
    this.buildFlourishes(cx, titleY);

    const title = this.add.text(cx, titleY, 'ELEMENTAL', {
      fontSize: '66px',
      fontFamily: FONT_DISPLAY,
      letterSpacing: 8,
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    this.tintLogo(title);
    this.wireLogoClicks(title);

    this.add.text(cx, titleY + 50, 'F O R G E   Y O U R   E L E M E N T', {
      fontSize: '12px', fontFamily: FONT_UI, color: T.dim, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // ── Navigation grid ─────────────────────────────────────────────
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const tiles: Array<{
      label: string; sub: string; icon: string; accent: number; action: (() => void) | null;
    }> = [
      {
        label: 'PLAY', sub: 'Duel a rival element', icon: '⚔', accent: C.verdant,
        // Explicit {} (not omitted) — Phaser only overwrites scene data when the
        // argument is truthy, so omitting it here would leak a stale
        // { mode: 'invasion' } from a previous visit to the INVASION button.
        action: () => this.scene.start('MenuScene', {}),
      },
      {
        label: 'CAMPAIGN', sub: 'Journey the worlds', icon: '🗺', accent: C.ember,
        action: () => this.scene.start('CampaignSlotSelectScene'),
      },
      {
        label: 'INVASION', sub: 'Hold back the husks', icon: '👾', accent: C.corrupt,
        action: () => this.scene.start('MenuScene', { mode: 'invasion' }),
      },
      {
        label: 'SHOP', sub: 'Spend your shards', icon: '💎', accent: C.frost,
        action: () => this.scene.start('ShopScene'),
      },
      {
        label: 'LAB', sub: 'Fuse and forge', icon: '⚗', accent: C.arcane,
        action: () => this.scene.start('LabScene'),
      },
      {
        label: 'GAUNTLETS',
        sub: gauntletUnlocked ? 'Six fights, one life' : `Locked — 💎${GAUNTLET_COST} in Shop`,
        icon: gauntletUnlocked ? '🏆' : '🔒',
        accent: C.gold,
        action: gauntletUnlocked ? () => this.scene.start('GauntletSelectScene') : null,
      },
    ];

    const tileW = 236;
    const tileH = 88;
    const gapX = 18;
    const gapY = 16;
    const cols = 3;
    const gridW = cols * tileW + (cols - 1) * gapX;
    const startX = cx - gridW / 2 + tileW / 2;
    const startY = 262;

    tiles.forEach((tile, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      addButton(this, {
        x: startX + col * (tileW + gapX),
        y: startY + row * (tileH + gapY),
        w: tileW, h: tileH,
        label: tile.label,
        sublabel: tile.sub,
        icon: tile.icon,
        accent: tile.accent,
        variant: tile.action ? 'ghost' : 'quiet',
        fontSize: 21,
        align: 'left',
        cut: 14,
        disabled: !tile.action,
        onClick: () => tile.action?.(),
      });
    });

    // ── Online battle rail ──────────────────────────────────────────
    const onlineY = startY + 2 * (tileH + gapY) + 22;
    addButton(this, {
      x: cx, y: onlineY, w: gridW, h: 54,
      label: 'ONLINE BATTLE',
      sublabel: 'Challenge a friend over a peer-to-peer link',
      icon: '🌐',
      accent: 0x2ee6c0,
      variant: 'solid',
      fontSize: 19,
      align: 'left',
      cut: 12,
      onClick: () => this.scene.start('OnlineLobbyScene'),
    });

    // ── Rune bar ────────────────────────────────────────────────────
    // The five base elements set into an engraved rail. Fills the space under
    // the menu and quietly states what the game is about.
    this.buildRuneBar(cx, 552);

    // ── Corner chrome ───────────────────────────────────────────────
    addIconButton(this, {
      x: 40, y: 44, icon: '🏆', accent: C.gold, tooltip: 'Achievements',
      onClick: () => this.scene.start('AchievementsScene'),
    });

    addIconButton(this, {
      x: 92, y: 44, icon: '🔊', accent: 0x2ee6c0, tooltip: 'Audio settings',
      onClick: () => {
        this.scene.pause();
        this.scene.launch('AudioSettingsScene', { parentSceneKey: this.scene.key });
      },
    });

    addChip(this, {
      x: width - 20, y: 30, icon: '💎', value: `${PlayerData.getShards()}`,
      accent: C.gold, originX: 1,
    });

    if (Cheats.isCheatMode()) {
      // Clears the audio button that now sits beside the achievements one.
      this.add.text(130, 44, '😈 CHEAT PROFILE', {
        fontSize: '13px', fontFamily: FONT_DISPLAY, color: hex(C.blood), letterSpacing: 1,
      }).setOrigin(0, 0.5).setDepth(DEPTH.content);
    }

    this.add.text(cx, height - 22, 'Copyright © 2025 Isaac Butikofer. All rights reserved.', {
      fontSize: '11px', fontFamily: FONT_UI, color: T.ghost, letterSpacing: 1,
    }).setOrigin(0.5).setDepth(DEPTH.content);

    // Konami code: WWSSADADBA → currencies + gauntlets + secret unlocks
    const KONAMI = ['W', 'W', 'S', 'S', 'A', 'D', 'A', 'D', 'B', 'A'];
    let konamiIdx = 0;

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();

      if (key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          const { campaignSlot } = applyKonamiCheat();
          showToast(this, campaignSlot
            ? '🏆 All Gauntlets Complete!\n+9999 💎  +9999 🩸  +9999 🗝️  +9999 ✨ (Slot 1)\n🌀 Slot 1 cheat-flagged'
            : '🏆 All Gauntlets Complete!\n+9999 💎  +9999 🩸', { accent: C.gold });
        }
      } else {
        konamiIdx = key === KONAMI[0] ? 1 : 0;
      }
    });

    // Cheat-mode toggle, bottom right — only once the logo has been unlocked
    if (Cheats.isUnlocked()) this.buildCheatToggle(width, height);
  }

  // ── Emblem ──────────────────────────────────────────────────────────

  /**
   * Etched wings flanking the wordmark: tapering rules with diamond finials and
   * a pair of angled feathers. Keeps the title from floating unanchored without
   * putting anything on top of the letterforms.
   */
  private buildFlourishes(cx: number, cy: number): void {
    const g = this.add.graphics().setDepth(DEPTH.base + 1);
    const inner = 240;
    const outer = 356;

    for (const side of [-1, 1]) {
      const x0 = cx + side * inner;
      const x1 = cx + side * outer;

      g.lineStyle(2, C.ember, 0.6);
      g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.strokePath();
      g.lineStyle(1, C.ember, 0.28);
      g.beginPath(); g.moveTo(x0 + side * 16, cy - 6); g.lineTo(x1 - side * 22, cy - 6); g.strokePath();
      g.beginPath(); g.moveTo(x0 + side * 16, cy + 6); g.lineTo(x1 - side * 22, cy + 6); g.strokePath();

      // Angled feathers fanning back from the inner tip.
      for (let i = 0; i < 4; i++) {
        const fx = x0 + side * (26 + i * 26);
        g.lineStyle(1, C.ember, 0.34 - i * 0.06);
        g.beginPath(); g.moveTo(fx, cy - 2); g.lineTo(fx + side * 16, cy - 16 - i * 4); g.strokePath();
        g.beginPath(); g.moveTo(fx, cy + 2); g.lineTo(fx + side * 16, cy + 16 + i * 4); g.strokePath();
      }

      fillDiamond(g, x0, cy, 6, mix(C.ember, 0xffffff, 0.4), 0.95);
      fillDiamond(g, x1, cy, 4, C.ember, 0.7);
    }
  }

  /**
   * Engraved rail carrying the five base elements as set gems. Each gem holds
   * its own breathing tween, so the row shimmers rather than blinking in unison.
   */
  private buildRuneBar(cx: number, cy: number): void {
    const g = this.add.graphics().setDepth(DEPTH.base + 1);
    const span = 232;
    const step = (span * 2) / (SIGIL_ELEMENTS.length - 1);

    // Rail: a bright centre line with a dim shadow line beneath it.
    g.lineStyle(1, C.ember, 0.3);
    g.beginPath(); g.moveTo(cx - span - 46, cy); g.lineTo(cx + span + 46, cy); g.strokePath();
    g.lineStyle(1, C.ember, 0.12);
    g.beginPath(); g.moveTo(cx - span - 30, cy + 4); g.lineTo(cx + span + 30, cy + 4); g.strokePath();
    fillDiamond(g, cx - span - 46, cy, 4, C.ember, 0.6);
    fillDiamond(g, cx + span + 46, cy, 4, C.ember, 0.6);

    SIGIL_ELEMENTS.forEach((el, i) => {
      const gx = cx - span + step * i;

      const gem = this.add.graphics().setDepth(DEPTH.base + 2);
      for (let k = 5; k >= 1; k--) {
        gem.fillStyle(el.color, 0.05);
        gem.fillCircle(gx, cy, 9 + k * 3.5);
      }
      fillDiamond(gem, gx, cy, 15, mix(el.color, 0x000000, 0.62), 0.95);
      gem.lineStyle(1.5, el.color, 0.8);
      gem.strokeCircle(gx, cy, 15);
      gem.lineStyle(1, el.color, 0.25);
      gem.strokeCircle(gx, cy, 19);

      this.add.text(gx, cy, el.emoji, { fontSize: '15px' })
        .setOrigin(0.5).setAlpha(0.9).setDepth(DEPTH.base + 3);

      this.tweens.add({
        targets: gem, alpha: { from: 0.45, to: 1 },
        duration: 1800 + i * 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  // ── Logo cheat unlock ────────────────────────────────────────────────

  /**
   * Ember→red gradient tracking click progress. Once unlocked the logo only
   * stays red while the cheat profile is loaded — in normal mode it reverts to
   * ember, so the title screen gives nothing away.
   */
  private tintLogo(title: Phaser.GameObjects.Text): void {
    const t = Cheats.isUnlocked()
      ? (Cheats.isCheatMode() ? 1 : 0)
      : Cheats.getLogoProgress();

    const body = mix(LOGO_COLD, LOGO_HOT, t);
    title.setColor(hex(mix(body, 0xffffff, 0.35)));
    title.setStroke(hex(mix(body, 0x000000, 0.72)), 6);
    title.setShadow(0, 5, hex(mix(body, 0x000000, 0.85)), 14, false, true);
  }

  private wireLogoClicks(title: Phaser.GameObjects.Text): void {
    // No counter, by design — the reddening is the only tell.
    title.on('pointerdown', () => {
      if (Cheats.isUnlocked()) return;

      const clicks = Cheats.bumpLogoClicks();
      this.tintLogo(title);

      // Squash-and-recover so each click registers physically
      this.tweens.killTweensOf(title);
      title.setScale(1);
      this.tweens.add({ targets: title, scaleX: 1.07, scaleY: 0.93, duration: 60, yoyo: true });

      if (clicks >= Cheats.LOGO_CLICK_TARGET) this.onCheatsUnlocked();
    });
  }

  private onCheatsUnlocked(): void {
    Cheats.unlock();
    const { width, height } = this.scale;

    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff0022, 0.55).setDepth(DEPTH.toast - 1);
    this.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });

    showToast(this, '😈 CHEATS UNLOCKED\nUse the toggle in the bottom-right corner', { accent: C.blood, holdMs: 4000 });
    this.buildCheatToggle(width, height);
  }

  // ── Cheat mode toggle ────────────────────────────────────────────────

  private buildCheatToggle(width: number, height: number): void {
    const on = Cheats.isCheatMode();
    const bx = width - 132;
    const by = height - 34;

    // The label is baked into a small plate so the toggle reads as a control,
    // not a stray switch floating over the footer.
    const plate = this.add.graphics().setDepth(DEPTH.content);
    const accent = on ? C.blood : C.steel;
    drawGlow(plate, bx - 96, by - 18, 192, 36, accent, on ? 0.4 : 0.15, 3, 2.5, 8);

    this.add.text(bx - 84, by, on ? '😈 CHEATS' : '🎮 NORMAL', {
      fontSize: '12px', fontFamily: FONT_DISPLAY,
      color: on ? hex(mix(C.blood, 0xffffff, 0.5)) : T.faint,
      letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content + 1);

    addToggle(this, {
      x: bx + 42, y: by, value: on, accent: C.blood,
      onChange: () => this.toggleCheatMode(),
    });

    // Rebuild button — re-maxes the cheat profile after new content is added
    if (on) {
      addIconButton(this, {
        x: bx - 122, y: by, r: 16, icon: '↻', accent: C.steel, tooltip: 'Rebuild cheat save',
        onClick: () => {
          // A rebuild that cannot reach some content is the one moment anybody would ever
          // notice, so say so here rather than only in the console.
          const gaps = createCheatSave();
          if (gaps.length) {
            showToast(this, `⚠ Cheat save incomplete\n${gaps.length} gap${gaps.length === 1 ? '' : 's'} — see console`, { accent: C.blood, holdMs: 4000 });
          } else {
            this.scene.restart();
          }
        },
      });
    }
  }

  private toggleCheatMode(): void {
    const goingCheat = !Cheats.isCheatMode();

    // First entry mints the fully-unlocked profile. Later entries reuse it, but a profile
    // minted before some content existed is short of it — so audit and top it up rather
    // than leaving whole realms locked until somebody finds the rebuild button.
    if (goingCheat) {
      if (!Cheats.cheatSaveExists()) createCheatSave();
      else if (verifyCheatSave().length > 0) createCheatSave();
    }

    Cheats.setCheatMode(goingCheat);
    this.scene.restart();
  }
}
