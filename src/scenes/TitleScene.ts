import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as Cheats from '../data/Cheats';
import { createCheatSave, verifyCheatSave, applyKonamiCheat } from '../data/CheatSave';
import { GAUNTLET_COST } from '../data/GauntletData';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addChip, addIconButton, addToggle, showToast,
  addFeatureCard, drawIcon, fillDiamond, drawGlow, IconName,
} from '../ui';
import { Music } from '../audio';

/** Logo colours at 0 and 100 clicks — the title bleeds from ember to blood-red. */
const LOGO_COLD = 0xff8a2b;
const LOGO_HOT = 0xff1133;

/** The five base elements, set into the engraved rail under the menu. */
const SIGIL_ELEMENTS: Array<{ icon: IconName; color: number }> = [
  { icon: 'flame', color: 0xff4400 },
  { icon: 'droplet', color: 0x0088ff },
  { icon: 'leaf', color: 0x44cc44 },
  { icon: 'wind', color: 0xaaddff },
  { icon: 'rock', color: 0x887755 },
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

    // ── Navigation cards ────────────────────────────────────────────
    // A row of dossiers, the same shape the element roster uses: glyph in a lit well,
    // name, archetype line, one line of what it is, and the prompt. The old grid was six
    // wide plates whose only picture was an emoji nailed to the left edge.
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const tiles: Array<{
      label: string; kicker: string; blurb: string; icon: IconName; status: string;
      accent: number; action: (() => void) | null;
    }> = [
      {
        label: 'PLAY', kicker: 'Duel', icon: 'sword', accent: C.verdant,
        blurb: 'One element against another. Pick your rival and settle it.',
        status: '▶  FIGHT',
        // Explicit {} (not omitted) — Phaser only overwrites scene data when the
        // argument is truthy, so omitting it here would leak a stale
        // { mode: 'invasion' } from a previous visit to the INVASION button.
        action: () => this.scene.start('MenuScene', {}),
      },
      {
        label: 'CAMPAIGN', kicker: 'Journey', icon: 'map', accent: C.ember,
        blurb: 'Forty-seven Sovereigns across the worlds, and whatever waits past them.',
        status: '▶  TRAVEL',
        action: () => this.scene.start('CampaignSlotSelectScene'),
      },
      {
        label: 'INVASION', kicker: 'Siege', icon: 'husk', accent: C.corrupt,
        blurb: 'Hold the mansion. The husks keep coming and they keep learning.',
        status: '▶  HOLD',
        action: () => this.scene.start('MenuScene', { mode: 'invasion' }),
      },
      {
        label: 'SHOP', kicker: 'Trade', icon: 'shard', accent: C.frost,
        blurb: 'Turn shards into ability upgrades, one slot at a time.',
        status: '▶  BROWSE',
        action: () => this.scene.start('ShopScene'),
      },
      {
        label: 'LAB', kicker: 'Forge', icon: 'flask', accent: C.arcane,
        blurb: 'Fuse two elements into a third. Forge perks out of the rest.',
        status: '▶  ENTER',
        action: () => this.scene.start('LabScene'),
      },
      {
        label: 'GAUNTLETS', kicker: 'Trial', icon: gauntletUnlocked ? 'trophy' : 'lock',
        accent: C.gold,
        blurb: gauntletUnlocked
          ? 'Six fights, one life, no second chances between them.'
          : `Sealed until you buy the key in the Shop — ${GAUNTLET_COST} shards.`,
        status: gauntletUnlocked ? '▶  RUN IT' : 'LOCKED',
        action: gauntletUnlocked ? () => this.scene.start('GauntletSelectScene') : null,
      },
    ];

    const cardW = 148;
    const cardH = 186;
    const cardGap = 10;
    const gridW = tiles.length * cardW + (tiles.length - 1) * cardGap;
    const startX = cx - gridW / 2 + cardW / 2;
    const cardY = 344;

    tiles.forEach((tile, i) => {
      addFeatureCard(this, {
        x: startX + i * (cardW + cardGap),
        y: cardY, w: cardW, h: cardH,
        accent: tile.accent,
        icon: tile.icon,
        title: tile.label,
        kicker: tile.kicker,
        blurb: tile.blurb,
        status: tile.status,
        locked: !tile.action,
        depth: DEPTH.panel,
        onClick: () => tile.action?.(),
      });
    });

    // ── Online battle rail ──────────────────────────────────────────
    const onlineY = cardY + cardH / 2 + 40;
    addButton(this, {
      x: cx, y: onlineY, w: gridW, h: 50,
      label: 'ONLINE BATTLE',
      sublabel: 'Challenge a friend over a peer-to-peer link',
      iconArt: 'globe',
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
      x: 40, y: 44, iconArt: 'trophy', accent: C.gold, tooltip: 'Achievements',
      onClick: () => this.scene.start('AchievementsScene'),
    });

    addIconButton(this, {
      x: 92, y: 44, iconArt: 'speaker', accent: 0x2ee6c0, tooltip: 'Audio settings',
      onClick: () => {
        this.scene.pause();
        this.scene.launch('AudioSettingsScene', { parentSceneKey: this.scene.key });
      },
    });

    addChip(this, {
      x: width - 20, y: 30, iconArt: 'shard', value: `${PlayerData.getShards()}`,
      accent: C.gold, originX: 1,
    });

    if (Cheats.isCheatMode()) {
      // Clears the audio button that now sits beside the achievements one.
      const markG = this.add.graphics().setDepth(DEPTH.content);
      drawIcon(markG, 'skull', 138, 44, 8, C.blood);
      this.add.text(152, 44, 'CHEAT PROFILE', {
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
            ? 'ALL GAUNTLETS COMPLETE\n+9999 shards · corrupt · keys · essence (Slot 1)\nSlot 1 cheat-flagged'
            : 'ALL GAUNTLETS COMPLETE\n+9999 shards  ·  +9999 corrupt', { accent: C.gold });
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

      // The element's own mark, struck into the setting rather than stuck on top of it.
      const mark = this.add.graphics().setDepth(DEPTH.base + 3);
      drawIcon(mark, el.icon, gx, cy, 8.5, mix(el.color, 0xffffff, 0.35));

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

    showToast(this, 'CHEATS UNLOCKED\nUse the toggle in the bottom-right corner', { accent: C.blood, holdMs: 4000 });
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

    drawIcon(plate, on ? 'skull' : 'shield', bx - 90, by, 7,
      on ? mix(C.blood, 0xffffff, 0.4) : C.steel);
    this.add.text(bx - 78, by, on ? 'CHEATS' : 'NORMAL', {
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
        x: bx - 124, y: by, r: 16, iconArt: 'refresh', accent: C.steel, tooltip: 'Rebuild cheat save',
        onClick: () => {
          // A rebuild that cannot reach some content is the one moment anybody would ever
          // notice, so say so here rather than only in the console.
          const gaps = createCheatSave();
          if (gaps.length) {
            showToast(this, `CHEAT SAVE INCOMPLETE\n${gaps.length} gap${gaps.length === 1 ? '' : 's'} — see console`, { accent: C.blood, holdMs: 4000 });
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
