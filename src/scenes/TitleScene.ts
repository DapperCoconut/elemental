import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import * as Cheats from '../data/Cheats';
import { anyAmalgamFelled } from '../data/CampaignProgress';
import { drawCrack } from '../reality/RealityArt';
import { REALITY_BLUE, CRACK_RED } from '../reality/RealityTypes';
import { createCheatSave, verifyCheatSave, applyKonamiCheat } from '../data/CheatSave';
import { GAUNTLET_COST } from '../data/GauntletData';
import {
  C, T, DEPTH, FONT_DISPLAY, FONT_UI, hex, mix,
  addBackdrop, addButton, addChip, addIconButton, addToggle, showToast,
  addFeatureCard, drawIcon, drawIconSocket, fillDiamond, drawGlow, IconName,
  addScrim, addPanel, drawMeter, fillNotchedGradient, strokeNotched, tintPlate,
} from '../ui';
import * as Ranked from '../data/RankedData';
import { addRankBadge, rankMetal } from '../ui/RankBadges';
import { Music, Sfx } from '../audio';

/** Logo colours at 0 and 100 clicks — the title bleeds from ember to blood-red. */
const LOGO_COLD = 0xff8a2b;
const LOGO_HOT = 0xff1133;

/** One mode inside a category sub-panel. */
interface HubMode {
  label: string; kicker: string; blurb: string; icon: IconName; status: string;
  accent: number; badge?: string; action: (() => void) | null;
}

/** One of the four doors on the title screen. */
interface HubCategory {
  label: string; kicker: string; blurb: string; icon: IconName; accent: number;
  modes: HubMode[];
}

/** The five base elements, set into the engraved rail under the menu. */
const SIGIL_ELEMENTS: Array<{ icon: IconName; color: number }> = [
  { icon: 'flame', color: 0xff4400 },
  { icon: 'droplet', color: 0x0088ff },
  { icon: 'leaf', color: 0x44cc44 },
  { icon: 'wind', color: 0xaaddff },
  { icon: 'rock', color: 0x887755 },
];

export class TitleScene extends Phaser.Scene {
  /** Everything the open category sub-panel owns; empty when no panel is up. */
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    Music.play('title');
    const { width, height } = this.scale;
    const cx = width / 2;
    // A ranked series walked out of mid-way (pause → quit, a reload) is settled here.
    const forfeit = Ranked.resolveAbandonedSeries();
    if (forfeit) {
      this.time.delayedCall(400, () => showToast(this,
        `RANKED SERIES ABANDONED — FORFEIT\n${forfeit.delta} RP${forfeit.demoted ? '  ·  DEMOTED' : ''}`,
        { accent: C.blood, holdMs: 3600 }));
    }

    addBackdrop(this, { accent: C.ember, variant: 'rays', motes: 26 });

    // ── Wordmark ────────────────────────────────────────────────────
    const titleY = 100;
    this.buildTitleHalo(cx, titleY);
    this.buildFlourishes(cx, titleY);
    this.buildElementWisps(width, height);

    const title = this.add.text(cx, titleY, 'ELEMENTAL', {
      fontSize: '66px',
      fontFamily: FONT_DISPLAY,
      letterSpacing: 8,
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.content + 2).setInteractive({ useHandCursor: true });
    this.tintLogo(title);
    this.wireLogoClicks(title);
    this.buildTitleEmbers(cx, titleY);

    const tagline = this.add.text(cx, titleY + 52, 'F O R G E   Y O U R   E L E M E N T', {
      fontSize: '12px', fontFamily: FONT_UI, color: hex(mix(C.ember, 0xffffff, 0.55)), letterSpacing: 4,
    }).setOrigin(0.5).setDepth(DEPTH.content).setAlpha(0.8);
    const tagG = this.add.graphics().setDepth(DEPTH.content);
    for (const side of [-1, 1]) {
      const tx = cx + side * (tagline.width / 2 + 18);
      fillDiamond(tagG, tx, titleY + 52, 3.5, C.ember, 0.8);
      tagG.lineStyle(1, C.ember, 0.35);
      tagG.beginPath(); tagG.moveTo(tx + side * 8, titleY + 52); tagG.lineTo(tx + side * 60, titleY + 52); tagG.strokePath();
    }

    // ── Category hub ────────────────────────────────────────────────
    // Four big doors instead of seven narrow plates and a rail: each opens a sub-panel of
    // its modes. The old rank was a tight fit at seven, and Ranked would have made eight.
    this.overlayObjects = [];
    this.buildCategoryHub(cx, 298);

    // ── Ranked flex ────────────────────────────────────────────────
    // Your badge, rank and RP, right on the title screen — and a door to the ladder.
    this.buildRankedFlex(cx, 462);

    // ── Rune bar ────────────────────────────────────────────────────
    // The five base elements set into an engraved rail. Fills the space under
    // the menu and quietly states what the game is about.
    this.buildRuneBar(cx, 556);

    this.input.keyboard!.on('keydown-ESC', () => this.closeCategory());

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

    this.buildRealityCrack(height);

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

  // ── Category hub ────────────────────────────────────────────────────

  private categories(): HubCategory[] {
    const gauntletUnlocked = PlayerData.isGauntletUnlocked();
    const rp = Ranked.getProfile();
    return [
      {
        label: 'BATTLE', kicker: 'Duel  ·  Ranked  ·  Online', icon: 'sword', accent: C.verdant,
        blurb: 'Element against element. Settle it.',
        modes: [
          {
            label: 'DUEL', kicker: 'Versus bot', icon: 'sword', accent: C.verdant,
            blurb: 'Pick both elements and a difficulty. One fight.',
            status: '▶  FIGHT',
            // Explicit {} (not omitted) — Phaser only overwrites scene data when the
            // argument is truthy, so omitting it here would leak a stale
            // { mode: 'invasion' } from a previous visit to the INVASION button.
            action: () => this.scene.start('MenuScene', {}),
          },
          {
            label: 'RANKED', kicker: 'Best of three', icon: 'crown', accent: rp.tier.color,
            blurb: 'Ban five, climb six tiers, Bronze to Excelsius.',
            status: '▶  CLIMB', badge: rp.name.toUpperCase(),
            action: () => this.scene.start('RankedScene'),
          },
          {
            label: 'ONLINE', kicker: 'Peer to peer', icon: 'globe', accent: 0x2ee6c0,
            blurb: 'Challenge a friend over a direct link.',
            status: '▶  CONNECT',
            action: () => this.scene.start('OnlineLobbyScene'),
          },
        ],
      },
      {
        label: 'ADVENTURE', kicker: 'Campaign  ·  Gauntlets', icon: 'map', accent: C.ember,
        blurb: 'Worlds to cross and trials to survive.',
        modes: [
          {
            label: 'CAMPAIGN', kicker: 'The Ten Isles', icon: 'map', accent: C.ember,
            blurb: 'Ten tyrants, sixty courts, one sea. Walk ashore at Emberport.',
            status: '▶  SET SAIL',
            action: () => this.scene.start('IslesSlotScene'),
          },
          {
            // Kept reachable until every isle of the new campaign is charted, then retired.
            label: 'CLASSIC', kicker: 'Old campaign', icon: 'map', accent: C.steel,
            blurb: 'Forty-seven Sovereigns, world by world.',
            status: '▶  TRAVEL',
            action: () => this.scene.start('CampaignSlotSelectScene'),
          },
          {
            label: 'GAUNTLETS', kicker: 'Trial', icon: gauntletUnlocked ? 'trophy' : 'lock',
            accent: C.gold,
            blurb: gauntletUnlocked
              ? 'Six fights, one life, no second chances.'
              : `Sealed until you buy the key — ${GAUNTLET_COST} shards.`,
            status: gauntletUnlocked ? '▶  RUN IT' : 'LOCKED',
            action: gauntletUnlocked ? () => this.scene.start('GauntletSelectScene') : null,
          },
        ],
      },
      {
        label: 'SIEGE', kicker: 'Invasion  ·  Stronghold', icon: 'castle', accent: C.corrupt,
        blurb: 'Hold the line against the tide.',
        modes: [
          {
            label: 'INVASION', kicker: 'Co-op siege', icon: 'husk', accent: C.corrupt,
            blurb: 'Hold the city against the husks.',
            status: '▶  HOLD',
            action: () => this.scene.start('MenuScene', { mode: 'invasion' }),
          },
          {
            label: 'STRONGHOLD', kicker: 'Defense', icon: 'castle', accent: 0x60a5fa,
            blurb: 'Your elements as towers. Hold the road.',
            status: '▶  BUILD',
            action: () => this.scene.start('StrongholdSetupScene'),
          },
        ],
      },
      {
        label: 'WORKSHOP', kicker: 'Shop  ·  Lab  ·  Trophies', icon: 'anvil', accent: C.arcane,
        blurb: 'Upgrade, fuse, forge and show off.',
        modes: [
          {
            label: 'SHOP', kicker: 'Trade', icon: 'shard', accent: C.frost,
            blurb: 'Turn shards into ability upgrades.',
            status: '▶  BROWSE',
            action: () => this.scene.start('ShopScene'),
          },
          {
            label: 'LAB', kicker: 'Forge', icon: 'flask', accent: C.arcane,
            blurb: 'Fuse elements. Forge perks.',
            status: '▶  ENTER',
            action: () => this.scene.start('LabScene'),
          },
          {
            label: 'TROPHIES', kicker: 'Achievements', icon: 'trophy', accent: C.gold,
            blurb: 'Every feat, and the skins they earned.',
            status: '▶  VIEW',
            action: () => this.scene.start('AchievementsScene'),
          },
        ],
      },
    ];
  }

  private buildCategoryHub(cx: number, cy: number): void {
    const cats = this.categories();
    const cardW = 196;
    const cardH = 214;
    const gap = 16;
    const total = cats.length * cardW + (cats.length - 1) * gap;
    const x0 = cx - total / 2 + cardW / 2;
    cats.forEach((cat, i) => {
      const x = x0 + i * (cardW + gap);
      const card = addFeatureCard(this, {
        x, y: cy, w: cardW, h: cardH,
        skew: 0,
        accent: cat.accent,
        icon: cat.icon,
        title: cat.label,
        kicker: cat.kicker,
        blurb: cat.blurb,
        status: `▶  ${cat.modes.length} MODES`,
        depth: DEPTH.panel,
        onClick: () => this.openCategory(cat),
      });

      // The empty floor of the card carries its modes as a row of lit sockets — the door
      // shows what is behind it without repeating the kicker's words.
      const row = this.add.graphics().setDepth(DEPTH.panel + 2);
      const sockR = 13;
      const sockGap = 38;
      const rowY = cy + 66;
      cat.modes.forEach((mode, m) => {
        const sx = x + (m - (cat.modes.length - 1) / 2) * sockGap;
        drawIconSocket(row, mode.icon, sx, rowY, sockR, mix(mode.accent, 0xffffff, 0.15), mode.action ? 0.95 : 0.45);
      });
      card.objects.push(row);
      const iconHome = card.iconGfx.y;

      // Entrance: each door rises into place a beat after the one before it.
      for (const o of card.objects) {
        const go = o as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha
          & Phaser.GameObjects.Components.Transform;
        if (typeof go.setAlpha !== 'function') continue;
        const homeY = go.y;
        go.setAlpha(0);
        go.y = homeY + 24;
        this.tweens.add({
          targets: go, alpha: 1, y: homeY, duration: 420, delay: 120 + i * 90, ease: 'Cubic.easeOut',
        });
      }

      // A slow idle bob on each glyph so the hub never sits perfectly still.
      this.tweens.add({
        targets: card.iconGfx, y: iconHome - 3, duration: 1600 + i * 180,
        delay: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  /** The category's sub-panel: a scrim, a titled plate, its modes as cards, and a way back. */
  private openCategory(cat: HubCategory): void {
    this.closeCategory();
    const { width } = this.scale;
    const cx = width / 2;
    const cardW = 200;
    const cardH = 244;
    const gap = 18;
    const n = cat.modes.length;
    const panelW = Math.max(560, n * cardW + (n - 1) * gap + 80);
    const panelH = 384;
    const panelY = 340;
    const out = this.overlayObjects;

    const scrim = addScrim(this, 0.8, DEPTH.overlay);
    scrim.on('pointerdown', () => this.closeCategory());
    out.push(scrim);

    const panel = addPanel(this, {
      x: cx, y: panelY, w: panelW, h: panelH, accent: cat.accent, depth: DEPTH.modal,
      title: cat.label, subtitle: cat.kicker.toUpperCase(), titleIcon: cat.icon, glow: 0.45, brackets: true,
    });
    out.push(panel.g, ...panel.objects);
    // Swallows clicks on the plate itself, so only the scrim outside it closes the panel.
    out.push(this.add.rectangle(cx, panelY, panelW, panelH, 0xffffff, 0)
      .setDepth(DEPTH.modal).setInteractive());

    const x0 = cx - ((n - 1) * (cardW + gap)) / 2;
    const cardY = panel.contentTop + 16 + cardH / 2;
    cat.modes.forEach((mode, i) => {
      const card = addFeatureCard(this, {
        x: x0 + i * (cardW + gap), y: cardY, w: cardW, h: cardH,
        accent: mode.accent,
        icon: mode.icon,
        title: mode.label,
        kicker: mode.kicker,
        blurb: mode.blurb,
        status: mode.status,
        badge: mode.badge,
        badgeAccent: mode.accent,
        locked: !mode.action,
        depth: DEPTH.modalContent,
        onClick: () => mode.action?.(),
      });
      out.push(...card.objects);
      // A little entrance: each card rises in after the one before it.
      for (const o of card.objects) {
        const go = o as Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject;
        if (typeof go.setAlpha === 'function') {
          go.setAlpha(0);
          this.tweens.add({ targets: go, alpha: 1, duration: 200, delay: 60 + i * 70 });
        }
      }
    });

    const backBtn = addButton(this, {
      x: cx, y: panel.bottom - 4, w: 170, h: 32, label: 'BACK', sublabel: undefined,
      iconArt: 'chevronLeft', accent: C.steel, variant: 'quiet', fontSize: 12,
      depth: DEPTH.modalContent + 2, cut: 8,
      onClick: () => this.closeCategory(),
    });
    out.push(backBtn.container);
    out.push(this.add.text(cx + 100, panel.bottom - 4, 'ESC', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.faint, letterSpacing: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.modalContent + 2));
  }

  private closeCategory(): void {
    for (const o of this.overlayObjects) {
      if (o.active) o.destroy();
    }
    this.overlayObjects = [];
  }

  // ── Ranked flex ─────────────────────────────────────────────────────

  /**
   * A wide plate under the hub: the player's live badge, rank name, RP bar and record.
   * Clicking it opens the ranked lobby.
   */
  private buildRankedFlex(cx: number, cy: number): void {
    const p = Ranked.getProfile();
    const accent = p.tier.color;
    const metal = rankMetal(p.tierIndex);
    const w = 452;
    const h = 80;
    const left = cx - w / 2;
    const top = cy - h / 2;

    const plate = this.add.graphics().setDepth(DEPTH.panel);
    const paint = (hot: boolean): void => {
      plate.clear();
      if (hot) drawGlow(plate, left, top, w, h, accent, 0.55, 5, 3, 12);
      fillNotchedGradient(plate, left, top, w, h,
        mix(tintPlate(accent, hot ? 0.34 : 0.22), 0xffffff, 0.04), mix(tintPlate(accent, 0.1), 0x000000, 0.5),
        1, 12);
      strokeNotched(plate, left, top, w, h, hot ? mix(accent, 0xffffff, 0.4) : accent, hot ? 1 : 0.75, hot ? 2.5 : 1.6, 12);
      strokeNotched(plate, left + 5, top + 5, w - 10, h - 10, accent, 0.16, 1, 9);
      // Badge well.
      plate.fillStyle(C.void_, 0.6);
      plate.fillCircle(left + 52, cy, 36);
      plate.lineStyle(1, accent, 0.35);
      plate.strokeCircle(left + 52, cy, 36);
    };
    paint(false);

    const badge = addRankBadge(this, { x: left + 52, y: cy - 2, size: 30, step: p.step, depth: DEPTH.panel + 2 });

    this.add.text(left + 102, cy - 24, p.seriesWins + p.seriesLosses === 0 ? 'RANKED  ·  UNPLAYED' : 'RANKED', {
      fontSize: '9px', fontFamily: FONT_DISPLAY, color: T.dim, letterSpacing: 3,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content);
    this.add.text(left + 102, cy - 5, p.name.toUpperCase(), {
      fontSize: '21px', fontFamily: FONT_DISPLAY, letterSpacing: 2,
      color: hex(mix(accent, 0xffffff, 0.5)), stroke: hex(mix(accent, 0x000000, 0.82)), strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content);

    const summit = p.step >= Ranked.EXCELSIUS_STEP;
    const bar = this.add.graphics().setDepth(DEPTH.content);
    drawMeter(bar, left + 102, cy + 15, 196, 9, summit ? 1 : p.rp / p.rpToClear, metal.light);
    this.add.text(left + 306, cy + 19, summit ? `${p.rp.toLocaleString()} RP` : `${p.rp}/${p.rpToClear} RP`, {
      fontSize: '10px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.4)), letterSpacing: 1,
    }).setOrigin(0, 0.5).setDepth(DEPTH.content);

    this.add.text(left + w - 18, cy - 14, `${p.seriesWins}W  ·  ${p.seriesLosses}L`, {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: T.normal, letterSpacing: 1,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content);
    const prompt = this.add.text(left + w - 18, cy + 8, 'CLIMB  ▶', {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: hex(mix(accent, 0xffffff, 0.5)), letterSpacing: 2,
    }).setOrigin(1, 0.5).setDepth(DEPTH.content);

    const hit = this.add.rectangle(cx, cy, w, h, 0xffffff, 0)
      .setDepth(DEPTH.content + 3).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      paint(true); prompt.setColor('#ffffff'); Sfx.hover();
      this.tweens.add({ targets: badge, scale: 1.12, duration: 160, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      paint(false); prompt.setColor(hex(mix(accent, 0xffffff, 0.5)));
      this.tweens.add({ targets: badge, scale: 1, duration: 160 });
    });
    hit.on('pointerdown', () => { Sfx.click(); this.scene.start('RankedScene'); });
  }

  // ── The crack in the world ──────────────────────────────────────────

  /**
   * Bottom-left: a fissure that appears once the Disgraced King is down, widens
   * as Dream and Justice come home, and opens outright when the campaign is
   * finished. What waits behind it lives in `src/reality/`. After the fight is
   * won it stays — small, and the wrong color — and clicking it fights again.
   */
  private buildRealityCrack(height: number): void {
    if (!PlayerData.isKingDefeated()) return;

    const ax = 26;
    const ay = height - 30;
    const defeated = PlayerData.isRealityDefeated();
    const open = !defeated && anyAmalgamFelled();
    const divines = (PlayerData.isElementUnlocked('dream') ? 1 : 0)
      + (PlayerData.isElementUnlocked('justice') ? 1 : 0);
    const size = defeated ? 20 : open ? 92 : 26 + divines * 16;
    const color = defeated ? CRACK_RED : REALITY_BLUE;

    const g = this.add.graphics().setDepth(DEPTH.content + 1);
    drawCrack(g, ax, ay, size, color);
    this.tweens.add({
      targets: g, alpha: { from: 0.75, to: 1 },
      duration: defeated ? 700 : 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    if (!open && !defeated) return;

    const reach = defeated ? 44 : size;
    const zone = this.add.zone(ax + reach * 0.35, ay - reach * 0.35, reach * 1.6, reach * 1.6)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      // Through the glass: white-out, then the dungeon (or the chapel, once
      // the fountain holds a place there). A finished fight can be refought.
      this.input.enabled = false;
      this.cameras.main.fadeOut(900, 255, 255, 255);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('CampaignElementSelectScene', {
          reality: { kind: PlayerData.isRealityFountainLit() ? 'boss' : 'trials' },
          worldId: 'fire', nodeId: 'reality', isChallenge: false, kind: 'fight',
          slotIdx: 0, hardMode: false, enemyElementId: 'reality', difficulty: 5,
        });
      });
    });
  }

  // ── Emblem ──────────────────────────────────────────────────────────

  /** A breathing furnace-glow behind the wordmark, so the title sits in light, not on paint. */
  private buildTitleHalo(cx: number, cy: number): void {
    const g = this.add.graphics().setDepth(DEPTH.base + 1).setPosition(cx, cy);
    for (let k = 16; k >= 1; k--) {
      g.fillStyle(mix(C.ember, 0xffcc66, k / 20), 0.022);
      g.fillEllipse(0, 0, 220 + k * 30, 40 + k * 8);
    }
    this.tweens.add({
      targets: g, alpha: { from: 0.7, to: 1 }, scaleX: { from: 0.97, to: 1.03 },
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /** Sparks lifting off the top of the letterforms, as if the wordmark were still cooling. */
  private buildTitleEmbers(cx: number, cy: number): void {
    const colors = [0xffd27a, 0xffa040, C.ember];
    for (let i = 0; i < 16; i++) {
      const spark = this.add.circle(0, 0, 1.6, colors[i % colors.length], 1).setDepth(DEPTH.content + 3);
      const launch = (): void => {
        const sx = cx + Phaser.Math.Between(-250, 250);
        spark.setPosition(sx, cy + Phaser.Math.Between(-18, 6));
        spark.setAlpha(Phaser.Math.FloatBetween(0.6, 1));
        spark.setScale(Phaser.Math.FloatBetween(0.6, 1.4));
        this.tweens.add({
          targets: spark,
          x: sx + Phaser.Math.Between(-24, 24),
          y: spark.y - Phaser.Math.Between(40, 90),
          alpha: 0, scale: 0.2,
          duration: Phaser.Math.Between(1300, 2600),
          ease: 'Sine.easeOut',
          onComplete: () => { if (spark.active) this.time.delayedCall(Phaser.Math.Between(0, 900), launch); },
        });
      };
      spark.setAlpha(0);
      this.time.delayedCall(Phaser.Math.Between(0, 2400), launch);
    }
  }

  /** Soft drifting lights in the five base colours — the elements loose in the room. */
  private buildElementWisps(width: number, height: number): void {
    SIGIL_ELEMENTS.forEach((el, i) => {
      for (let n = 0; n < 2; n++) {
        const wisp = this.add.graphics().setDepth(DEPTH.backdrop + 2);
        for (let k = 4; k >= 1; k--) {
          wisp.fillStyle(el.color, 0.05);
          wisp.fillCircle(0, 0, k * 7);
        }
        wisp.fillStyle(mix(el.color, 0xffffff, 0.5), 0.5);
        wisp.fillCircle(0, 0, 2.2);
        const x = 60 + ((i * 2 + n) / 9) * (width - 120) + Phaser.Math.Between(-30, 30);
        const y = Phaser.Math.Between(height * 0.3, height - 60);
        wisp.setPosition(x, y).setAlpha(0);
        this.tweens.add({
          targets: wisp, alpha: { from: 0, to: 0.9 }, duration: 2200, yoyo: true,
          delay: Phaser.Math.Between(0, 3000), repeat: -1, repeatDelay: Phaser.Math.Between(400, 2000),
        });
        this.tweens.add({
          targets: wisp, x: x + Phaser.Math.Between(-60, 60), y: y - Phaser.Math.Between(30, 90),
          duration: Phaser.Math.Between(5000, 8000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    });
  }

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

    // A spark runs the rail end to end, taking on each element's colour as it passes the gem.
    const x0 = cx - span - 46;
    const x1 = cx + span + 46;
    const spark = this.add.graphics().setDepth(DEPTH.base + 4);
    const paintSpark = (col: number): void => {
      spark.clear();
      for (let k = 4; k >= 1; k--) {
        spark.fillStyle(col, 0.1);
        spark.fillEllipse(-k * 4, 0, 10 + k * 9, 3 + k * 2);
      }
      spark.fillStyle(mix(col, 0xffffff, 0.6), 1);
      spark.fillCircle(0, 0, 2);
    };
    const run = { x: x0 };
    paintSpark(C.ember);
    spark.setPosition(x0, cy);
    this.tweens.add({
      targets: run, x: x1, duration: 4200, repeat: -1, repeatDelay: 1800, ease: 'Sine.easeInOut',
      onUpdate: () => {
        spark.x = run.x;
        const idx = Phaser.Math.Clamp(Math.round((run.x - (cx - span)) / step), 0, SIGIL_ELEMENTS.length - 1);
        const near = Math.abs(run.x - (cx - span + idx * step)) < step * 0.5;
        paintSpark(near ? SIGIL_ELEMENTS[idx].color : C.ember);
        spark.setAlpha(Math.min(1, (run.x - x0) / 40, (x1 - run.x) / 40));
      },
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
    title.setStroke(hex(mix(body, 0x000000, 0.72)), 6);
    title.setShadow(0, 5, hex(mix(body, 0x000000, 0.85)), 14, false, true);
    // Molten fill: white-hot crown, the body colour through the middle, cooling to a deep
    // glow at the feet. The canvas is drawn at logical scale, so stops use logical pixels.
    const grd = title.context.createLinearGradient(0, 0, 0, title.height);
    grd.addColorStop(0.18, hex(mix(body, 0xffffff, 0.82)));
    grd.addColorStop(0.5, hex(mix(body, 0xffffff, 0.28)));
    grd.addColorStop(0.82, hex(mix(body, 0x000000, 0.12)));
    title.setFill(grd);
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
