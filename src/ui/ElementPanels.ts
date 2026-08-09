import Phaser from 'phaser';
import * as PlayerData from '../data/PlayerData';
import { getElementUpgrades } from '../data/Upgrades';
import { isCheatMode } from '../data/Cheats';
import { Element } from '../elements/Element';
import { getPerksForElement, getPerkById, ALL_PERKS } from '../data/Perks';
import { getSkinsForElement, isSkinUnlocked, skinUnlockHint } from '../data/Skins';
import { AbilityVariantSet, getAbilityVariants } from '../data/AbilityVariants';
import {
  getMasteryDef, isMasteryComplete, MasteryRequirement,
  getBindableEnhancements, getEnhancement, MASTERY_SLOTS, MasterySlot, MasteryEnhancement,
} from '../data/Mastery';
import { FATE_CARD_DEFS } from '../elements/kits/FateKit';
import {
  journalElementColor, journalElementEmoji, journalElementIds, journalElementName, journalEntries,
  journalProgress, journalTotalPossible, journalTotalUnlocked,
} from '../data/PaperJournal';
import {
  ELEMENT_DATA_MAP, ELEMENT_FORM_TABS, allSelectableElements, findElementDef,
} from '../data/ElementRoster';
import { C, hex, mix, FONT_DISPLAY, FONT_UI } from './Theme';
import { addButton } from './Button';
import { addCardPlate, addRowPlate } from './Panel';
import { fillDiamond } from './Shapes';
import { Sfx } from '../audio';
import { Ability } from '../elements/Ability';
import {
  CodexEffect, PassiveCodexEntry, SubjectCodexEntry, TAG_STYLE,
  codexCoverage, getAbilityCodex, getMasteryCodex, getPassiveCodex, getPerkCodex,
  passiveSlug, usesLegacyPassives,
} from '../data/AbilityCodex';
import { getPreview, getSubjectPreview } from '../data/codex/previews';
import {
  AbilityPreviewBox, addPreviewPlaceholder, equippedSkin, skinnedColorFn,
} from './AbilityPreview';

/** Which page of the info screen is showing. */
type InfoTab = 'abilities' | 'perks' | 'mastery' | 'build' | 'journal';

/** What the left rail currently has selected. */
type InfoSelection =
  | { kind: 'ability'; id: string }
  | { kind: 'passive'; index: number }
  | { kind: 'perk'; id: string }
  | { kind: 'mastery'; id: string };

function sameSelection(a: InfoSelection, b: InfoSelection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'passive') return a.index === (b as typeof a).index;
  return (a as { id: string }).id === (b as { id: string }).id;
}

/**
 * Total abilities across the roster, for the codex coverage footer. A constant rather than a
 * count of `ELEMENT_DATA_MAP` because Quantum carries no abilities of its own and Hunt carries
 * fifteen — `node .check-codex.mjs` prints the authoritative figure.
 */
const TOTAL_ABILITIES = 260;

/** What the current tab put in the rail. Empty arrays for the kinds that tab doesn't show. */
interface InfoSubjects {
  passives: PassiveCodexEntry[];
  abilities: Ability[];
  perks: ReturnType<typeof getPerksForElement>;
  enhancements: MasteryEnhancement[];
}

/**
 * The four full-screen overlays that hang off an element card: its ability info sheet, its
 * mastery loadout, its customization page (perk / upgrades / skin / bond) and the perk
 * dictionary.
 *
 * These were private to MenuScene, which is why the campaign and gauntlet pickers never had
 * them. They are a component now: any scene that shows element cards owns one of these,
 * hands it a redraw callback, and gets the identical screens.
 */
export class ElementPanels {
  private scene: Phaser.Scene;
  /** Redraw the host's element cards — mastery toggles and skins change what a card shows. */
  private onDirty: () => void;

  /** Quantum only: the half of the bond the customization page is currently loading out. */
  private customizeHalf: string | null = null;
  /** True while the customization page has been handed over to the bond builder. */
  private bondEditing = false;
  /** First half clicked in the bond builder, waiting for its partner. */
  private bondDraftFirst: string | null = null;
  // Preserves scroll position across showCustomizeScreen rebuilds triggered by toggles/equips.
  private customizeScrollY = 0;
  // Preserves scroll position across showMasteryScreen rebuilds triggered by bind/clear actions.
  private masteryScrollY = 0;
  private infoOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private infoScrollHandler: (...args: unknown[]) => void = () => {};
  private masteryDragMove: ((...args: unknown[]) => void) | null = null;
  private masteryDragUp: ((...args: unknown[]) => void) | null = null;
  private masteryDragGhost: Phaser.GameObjects.GameObject[] | null = null;
  private expandedJournal = new Set<string>();
  private elementInfoHuntForm: 0 | 1 | 2 = 0;
  /** Info screen: which page, which rail entry, and whether the dossier is in upgraded mode. */
  private infoTab: InfoTab = 'abilities';
  private infoSelected: InfoSelection | null = null;
  private infoUpgraded = false;
  /** The live ability showcase. Rebuilt on every selection change, so only one ever runs. */
  private infoPreview: AbilityPreviewBox | null = null;

  constructor(scene: Phaser.Scene, onDirty: () => void) {
    this.scene = scene;
    this.onDirty = onDirty;
    // A scene restart tears the display list down underneath us; drop the stale handles
    // so a reopened panel does not try to destroy objects that no longer exist.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off('wheel', this.infoScrollHandler);
      this.infoPreview?.destroy();
      this.infoPreview = null;
      this.infoOverlayObjects = [];
    });
  }

  /** True while any overlay is up — ESC and back buttons close the overlay first. */
  isOpen(): boolean {
    return this.infoOverlayObjects.length > 0;
  }

  /** Opens the mastery loadout from the top, as a fresh click on a card should. */
  openMastery(elementId: string, width: number, height: number, cx: number): void {
    this.masteryScrollY = 0;
    this.showMasteryScreen(elementId, width, height, cx);
  }

  /** Opens the customization page from the top, with any half-built bond discarded. */
  openCustomize(elementId: string, width: number, height: number, cx: number): void {
    this.customizeScrollY = 0;
    this.bondEditing = false;
    this.bondDraftFirst = null;
    this.showCustomizeScreen(elementId, width, height, cx);
  }

  private overlayRow(
    cx: number, y: number, w: number, h: number, accent: number, muted = false,
  ): { g: Phaser.GameObjects.Graphics; paint: (hover: boolean) => void } {
    return addRowPlate(this.scene, { x: cx, y, w, h, accent, muted });
  }

  /**
   * Transparent hit plate for a scrolling row. Lives in the same container as
   * the row art, so it scrolls with it; the plate itself is a Graphics and
   * cannot take input.
   */
  private overlayRowHit(
    cx: number, y: number, w: number, h: number,
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(cx, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
  }

  closeElementInfo(): void {
    this.endMasteryDrag();
    // Before the display list goes, so the box can stop driving avatars that are about to die.
    this.infoPreview?.destroy();
    this.infoPreview = null;
    this.scene.input.off('wheel', this.infoScrollHandler);
    for (const obj of this.infoOverlayObjects) {
      if (obj.active) (obj as Phaser.GameObjects.GameObject & { destroy(): void }).destroy();
    }
    this.infoOverlayObjects = [];
  }

  /**
   * The info (ℹ) screen: a master–detail dossier.
   *
   * The left rail lists the element's passives and its five keys; picking one fills the right
   * pane with a looping showcase of the real ability plus everything the codex knows about it.
   * This replaced a single flat scroll of one-line descriptions, which had no room to say what
   * an ability actually does and no room at all to show it.
   *
   * Nothing about an element is written here. Prose, effect rows, variants and passives all come
   * from `data/AbilityCodex`, and the showcase loops come from `data/codex/previews` — so adding
   * an element to this screen never means editing this file.
   */
  showElementInfo(elementId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[elementId];
    if (!element) return;
    if (this.infoTab === 'build' && elementId !== 'creation') this.infoTab = 'abilities';
    if (this.infoTab === 'journal' && elementId !== 'paper') this.infoTab = 'abilities';
    if (this.infoTab === 'mastery' && !getMasteryDef(elementId)) this.infoTab = 'abilities';

    const upgrades = getElementUpgrades(elementId);
    const formTabs = ELEMENT_FORM_TABS[elementId] ?? null;
    if (!formTabs || this.elementInfoHuntForm >= formTabs.length) this.elementInfoHuntForm = 0;
    const elemColor = '#' + element.color.toString(16).padStart(6, '0');

    const bg = this.scene.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.98).setDepth(50);
    bg.setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.scene.add.text(cx, 26, `${element.emoji}  ${element.name.toUpperCase()}`, {
      fontSize: '24px', fontFamily: FONT_DISPLAY, color: elemColor,
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    // ── Section tabs ──
    const tabs: Array<{ id: InfoTab; label: string; accent: number }> = [
      { id: 'abilities', label: '⚔ ABILITIES', accent: C.frost },
      { id: 'perks', label: '✦ PERKS', accent: C.arcane },
    ];
    if (getMasteryDef(elementId)) tabs.push({ id: 'mastery', label: '★ MASTERY', accent: C.gold });
    if (elementId === 'creation') tabs.push({ id: 'build', label: '🔨 BUILD', accent: 0xcc6622 });
    if (elementId === 'paper') tabs.push({ id: 'journal', label: '📖 JOURNAL', accent: 0xe8c65c });

    const tabW = 116, tabH = 24, tabGap = 5;
    const tabsW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    tabs.forEach((td, i) => {
      const tx = cx - tabsW / 2 + tabW / 2 + i * (tabW + tabGap);
      const on = this.infoTab === td.id;
      const plate = addCardPlate(this.scene, {
        x: tx, y: 56, w: tabW, h: tabH, accent: td.accent, cut: 7, depth: 55, muted: !on,
      });
      if (on) plate.paint('active');
      const btn = this.scene.add.rectangle(tx, 56, tabW, tabH, 0xffffff, 0)
        .setDepth(56).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => { if (!on) plate.paint('hover'); });
      btn.on('pointerout', () => plate.paint(on ? 'active' : 'idle'));
      btn.on('pointerdown', () => {
        if (this.infoTab === td.id) return;
        this.infoTab = td.id;
        this.showElementInfo(elementId, width, height, cx);
      });
      const lbl = this.scene.add.text(tx, 56, td.label, {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: on ? '#e6eeff' : '#55556a',
      }).setOrigin(0.5).setDepth(57);
      this.infoOverlayObjects.push(plate.g, btn, lbl);
    });

    const divY = 76;
    this.infoOverlayObjects.push(
      this.scene.add.line(cx, divY, -width / 2 + 20, 0, width / 2 - 20, 0, C.arcane, 0.4)
        .setDepth(51).setLineWidth(1),
    );

    this.infoOverlayObjects.push(addButton(this.scene, {
      x: 58, y: 26, w: 92, h: 28,
      label: 'BACK', icon: '◄', fontSize: 11, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 7,
      onClick: () => this.closeElementInfo(),
    }).container);

    if (this.infoTab === 'build') {
      this.renderScrollingSection(width, height, cx, divY + 10,
        (c, colX, colW, y) => this.renderCreationBuildInfo(c, cx, colX, colW, y));
      return;
    }
    if (this.infoTab === 'journal') {
      this.renderScrollingSection(width, height, cx, divY + 10,
        (c, colX, colW, y) => this.renderPaperJournal(c, cx, colX, colW, y, width, height));
      return;
    }
    // ── ABILITIES / PERKS / MASTERY: all master–detail ──────────────────
    const RAIL_X = 14, RAIL_W = 214;
    const PANE_X = RAIL_X + RAIL_W + 12;
    const PANE_W = width - PANE_X - 14;
    let railTop = divY + 12;

    // Hunt's three forms and Gluttony's two sit above the rail, since they change what is in it.
    if (formTabs) {
      const fw = (RAIL_W - (formTabs.length - 1) * 4) / formTabs.length;
      formTabs.forEach((fd, fi) => {
        const fx = RAIL_X + fw / 2 + fi * (fw + 4);
        const on = this.elementInfoHuntForm === fi;
        const plate = addCardPlate(this.scene, {
          x: fx, y: railTop + 11, w: fw, h: 22, accent: fd.accent, cut: 6, depth: 55, muted: !on,
        });
        if (on) plate.paint('active');
        const btn = this.scene.add.rectangle(fx, railTop + 11, fw, 22, 0xffffff, 0)
          .setDepth(56).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          if (this.elementInfoHuntForm === fi) return;
          this.elementInfoHuntForm = fi as 0 | 1 | 2;
          this.infoSelected = null;
          this.showElementInfo(elementId, width, height, cx);
        });
        const lbl = this.scene.add.text(fx, railTop + 11, fd.label, {
          fontSize: '9px', fontFamily: FONT_DISPLAY, color: on ? fd.text : '#4d4d5e',
        }).setOrigin(0.5).setDepth(57);
        this.infoOverlayObjects.push(plate.g, btn, lbl);
      });
      railTop += 28;
    }

    const form = this.elementInfoHuntForm;
    const passives = getPassiveCodex(elementId, form);
    const abilities = formTabs
      ? element.abilities.slice(form * 5, form * 5 + 5)
      : element.abilities;

    // Each tab fills the same rail with a different cast of subjects; everything downstream
    // — the cards, the dossier, the showcase — is shared.
    const perks = this.infoTab === 'perks' ? getPerksForElement(elementId) : [];
    const enhancements = this.infoTab === 'mastery' ? (getMasteryDef(elementId)?.enhancements ?? []) : [];
    const shownPassives = this.infoTab === 'abilities' ? passives : [];
    const shownAbilities = this.infoTab === 'abilities' ? abilities : [];

    const keys: InfoSelection[] = [
      ...shownPassives.map((_, i): InfoSelection => ({ kind: 'passive', index: i })),
      ...shownAbilities.map((a): InfoSelection => ({ kind: 'ability', id: a.id })),
      ...perks.map((pk): InfoSelection => ({ kind: 'perk', id: pk.id })),
      ...enhancements.map((e): InfoSelection => ({ kind: 'mastery', id: e.id })),
    ];
    if (keys.length === 0) {
      this.infoOverlayObjects.push(this.scene.add.text(cx, height / 2,
        this.infoTab === 'perks'
          ? 'No perks are craftable for this element yet.'
          : 'This element has nothing in this section yet.', {
          fontSize: '12px', fontFamily: FONT_UI, color: '#4d4d5e',
        }).setOrigin(0.5).setDepth(52));
      return;
    }
    // Selection survives a redraw (upgrade toggle, skin change) but not a tab or form change.
    const stillValid = this.infoSelected && keys.some((k) => sameSelection(k, this.infoSelected!));
    if (!stillValid) this.infoSelected = keys.find((k) => k.kind === 'ability') ?? keys[0];
    const sel = this.infoSelected!;

    const subjects = { passives: shownPassives, abilities: shownAbilities, perks, enhancements };

    this.renderInfoRail(elementId, RAIL_X, RAIL_W, railTop, height, subjects, upgrades,
      (next) => {
        this.infoSelected = next;
        Sfx.play('ui-click', { volume: 0.4 });
        this.showElementInfo(elementId, width, height, cx);
      });

    this.renderInfoDossier(elementId, element.color, PANE_X, PANE_W, divY + 12, height,
      sel, subjects, upgrades, width);
  }



  /** The left rail. Whichever of the four kinds the current tab supplied, as selectable cards. */
  private renderInfoRail(
    elementId: string, x: number, w: number, top: number, height: number,
    subjects: InfoSubjects, upgrades: ReturnType<typeof getElementUpgrades>,
    onPick: (sel: InfoSelection) => void,
  ): void {
    const { passives, abilities, perks, enhancements } = subjects;
    let y = top;
    const sel = this.infoSelected!;

    const sectionLabel = (text: string, color: string): void => {
      this.infoOverlayObjects.push(this.scene.add.text(x + 6, y, text, {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color,
      }).setDepth(52));
      y += 15;
    };

    const card = (
      opts: { badge: string; badgeColor: string; title: string; sub: string; accent: number; on: boolean; pick: () => void },
    ): void => {
      const h = 38;
      const plate = addCardPlate(this.scene, {
        x: x + w / 2, y: y + h / 2, w, h, accent: opts.accent, cut: 7, depth: 52, muted: !opts.on,
      });
      if (opts.on) plate.paint('active');
      const hit = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0)
        .setDepth(54).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { if (!opts.on) plate.paint('hover'); });
      hit.on('pointerout', () => plate.paint(opts.on ? 'active' : 'idle'));
      hit.on('pointerdown', () => opts.pick());
      const badge = this.scene.add.text(x + 20, y + h / 2, opts.badge, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: opts.badgeColor,
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(53);
      const title = this.scene.add.text(x + 40, y + 12, opts.title, {
        fontSize: '11px', fontFamily: FONT_DISPLAY, color: opts.on ? '#f0f4ff' : '#9aa0b8',
      }).setOrigin(0, 0.5).setDepth(53);
      const sub = this.scene.add.text(x + 40, y + 26, opts.sub, {
        fontSize: '8px', fontFamily: FONT_UI, color: opts.on ? '#8f9ab8' : '#54596e',
      }).setOrigin(0, 0.5).setDepth(53);
      this.infoOverlayObjects.push(plate.g, hit, badge, title, sub);
      y += h + 4;
    };

    if (passives.length) {
      sectionLabel('— ALWAYS ON —', '#6f7a9c');
      passives.forEach((p, i) => card({
        badge: p.emoji, badgeColor: '#ffffff', title: p.name,
        sub: `${p.effects.length} effect${p.effects.length === 1 ? '' : 's'}`,
        accent: C.steel, on: sel.kind === 'passive' && sel.index === i,
        pick: () => onPick({ kind: 'passive', index: i }),
      }));
      y += 6;
    }

    if (abilities.length) sectionLabel('— ABILITIES —', '#6f7a9c');
    if (perks.length) sectionLabel('— PERKS —', '#8f7ab8');
    if (enhancements.length) sectionLabel('— MASTERY —', '#a08a4a');
    for (const ab of abilities) {
      const upg = upgrades.find((u) => u.slot === ab.displayKey.toLowerCase());
      const owned = upg ? PlayerData.isUpgradeOwned(elementId, upg.slot) : false;
      const documented = !!getAbilityCodex(elementId, ab.id);
      const cd = ab.cooldown >= 1000 ? `${ab.cooldown / 1000}s CD` : 'no cooldown';
      card({
        badge: `[${ab.displayKey}]`, badgeColor: documented ? '#cfe4ff' : '#5a5a70',
        title: ab.name,
        sub: `${cd}${upg ? (owned ? '  ·  ▲ owned' : '  ·  ▲ available') : ''}`,
        accent: owned ? C.gold : C.frost,
        on: sel.kind === 'ability' && sel.id === ab.id,
        pick: () => onPick({ kind: 'ability', id: ab.id }),
      });
    }

    if (perks.length) {
      const equipped = PlayerData.getEquippedPerk(elementId);
      for (const pk of perks) {
        const unlocked = PlayerData.isPerkUnlocked(elementId, pk.id);
        card({
          badge: pk.emoji, badgeColor: '#ffffff', title: pk.name,
          sub: equipped === pk.id ? '✓ equipped' : unlocked ? 'crafted' : '🔒 not crafted',
          accent: C.arcane, on: sel.kind === 'perk' && sel.id === pk.id,
          pick: () => onPick({ kind: 'perk', id: pk.id }),
        });
      }
    }

    if (enhancements.length) {
      const on = PlayerData.isMasteryEnabled(elementId);
      const binds = PlayerData.getMasteryBinds(elementId);
      for (const enh of enhancements) {
        const slot = enh.bindable ? Object.keys(binds).find((sl) => binds[sl] === enh.id) : undefined;
        card({
          badge: enh.bindable ? (slot ? slot.toUpperCase() : '—') : '∞',
          badgeColor: on ? '#ffd479' : '#5a5a70',
          title: enh.name,
          sub: enh.bindable ? (slot ? `bound to ${slot.toUpperCase()}` : 'unbound') : 'always on',
          accent: C.gold, on: sel.kind === 'mastery' && sel.id === enh.id,
          pick: () => onPick({ kind: 'mastery', id: enh.id }),
        });
      }
    }

    // Coverage footer — an honest read on how much of the roster is written up.
    const cov = codexCoverage(TOTAL_ABILITIES);
    this.infoOverlayObjects.push(this.scene.add.text(x + w / 2, height - 14,
      `codex ${cov.done}/${cov.total} abilities documented`, {
        fontSize: '8px', fontFamily: FONT_UI, color: '#33384a',
      }).setOrigin(0.5).setDepth(52));
  }

  /** The right pane: showcase on top, scrolling dossier beneath it. */
  private renderInfoDossier(
    elementId: string, elemColorNum: number, x: number, w: number, top: number, height: number,
    sel: InfoSelection, subjects: InfoSubjects,
    upgrades: ReturnType<typeof getElementUpgrades>, width: number,
  ): void {
    const { passives, abilities, perks, enhancements } = subjects;
    const ability = sel.kind === 'ability' ? abilities.find((a) => a.id === sel.id) : undefined;
    const passive = sel.kind === 'passive' ? passives[sel.index] : undefined;
    const perk = sel.kind === 'perk' ? perks.find((pk) => pk.id === sel.id) : undefined;
    const enh = sel.kind === 'mastery' ? enhancements.find((e) => e.id === sel.id) : undefined;
    const upgrade = ability ? upgrades.find((u) => u.slot === ability.displayKey.toLowerCase()) : undefined;
    const entry = ability ? getAbilityCodex(elementId, ability.id) : undefined;
    const canUpgrade = !!entry?.upgrade || !!upgrade;
    const showUp = this.infoUpgraded && canUpgrade;

    let y = top;

    // ── Title row + BASE / UPGRADED toggle ──
    const title = ability ? `[${ability.displayKey}]  ${ability.name}`
      : passive ? `${passive.emoji}  ${passive.name}`
      : perk ? `${perk.emoji}  ${perk.name}`
      : enh ? `${enh.name}`
      : '';
    this.infoOverlayObjects.push(this.scene.add.text(x, y + 10, title, {
      fontSize: '15px', fontFamily: FONT_DISPLAY,
      color: '#' + elemColorNum.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(52));

    const subtitle = ability
      ? (ability.cooldown >= 1000 ? `${ability.cooldown / 1000}s cooldown` : 'no cooldown')
      : passive ? 'always on — not bound to a key'
      : perk ? (PlayerData.getEquippedPerk(elementId) === perk.id ? '✓ equipped'
        : PlayerData.isPerkUnlocked(elementId, perk.id) ? 'crafted — not equipped' : '🔒 not crafted yet')
      : enh ? (PlayerData.isMasteryEnabled(elementId)
        ? (enh.bindable ? 'mastery active — bindable to a key' : 'mastery active — passive')
        : '🔒 mastery switched off for this element')
      : '';
    if (subtitle) {
      this.infoOverlayObjects.push(this.scene.add.text(x, y + 26, subtitle, {
        fontSize: '9px', fontFamily: FONT_UI, color: '#6b7285',
      }).setOrigin(0, 0.5).setDepth(52));
    }

    if (canUpgrade) {
      const segW = 92, segH = 20;
      (['base', 'upgraded'] as const).forEach((mode, i) => {
        const on = (mode === 'upgraded') === showUp;
        const sx = x + w - segW * (2 - i) - 4 * (1 - i) - 2;
        const accent = mode === 'upgraded' ? C.gold : C.frost;
        const plate = addCardPlate(this.scene, {
          x: sx + segW / 2, y: y + 14, w: segW, h: segH, accent, cut: 5, depth: 52, muted: !on,
        });
        if (on) plate.paint('active');
        const hit = this.scene.add.rectangle(sx + segW / 2, y + 14, segW, segH, 0xffffff, 0)
          .setDepth(54).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          const next = mode === 'upgraded';
          if (this.infoUpgraded === next) return;
          this.infoUpgraded = next;
          Sfx.play('ui-toggle-on', { volume: 0.4 });
          this.showElementInfo(elementId, width, height, width / 2);
        });
        const lbl = this.scene.add.text(sx + segW / 2, y + 14,
          mode === 'upgraded' ? '▲ UPGRADED' : 'BASE', {
            fontSize: '9px', fontFamily: FONT_DISPLAY, color: on ? '#f0f4ff' : '#55556a',
          }).setOrigin(0.5).setDepth(55);
        this.infoOverlayObjects.push(plate.g, hit, lbl);
      });
    }

    y += 38;

    // ── The showcase ──
    const PREVIEW_H = 186;
    // Passives, perks and mastery enhancements get a showcase on the same terms as a key —
    // a perk that rewrites what E does is exactly the thing worth watching before you craft it.
    const subjectScript = passive ? getSubjectPreview(elementId, 'passive', passiveSlug(passive.name))
      : perk ? getSubjectPreview(elementId, 'perk', perk.id)
      : enh ? getSubjectPreview(elementId, 'mastery', enh.id)
      : null;
    const found = ability
      ? getPreview(elementId, ability.id, showUp)
      : subjectScript ? { script: subjectScript, isUpgradedStaging: false } : null;
    {
      if (found) {
        this.infoPreview = new AbilityPreviewBox(this.scene, found.script, {
          x, y, w, h: PREVIEW_H, depth: 52, accent: elemColorNum,
          // The equipped skin in full — replacement character, body repaint, projectile
          // repaint and palette — so the showcase stages what this player actually fights as.
          tint: skinnedColorFn(elementId),
          bodyTexture: `elem-${elementId}`,
          skin: equippedSkin(elementId),
          mastered: PlayerData.isMasteryEnabled(elementId),
        });
        const caption = found.isUpgradedStaging || !showUp
          ? (found.script.caption ?? '')
          : `${found.script.caption ?? ''}   ·   (base form — no upgraded loop recorded yet)`;
        this.infoOverlayObjects.push(this.scene.add.text(x + 4, y + PREVIEW_H + 5, caption, {
          fontSize: '9px', fontFamily: FONT_UI, color: '#6d7488',
          wordWrap: { width: w - 60 },
        }).setDepth(52));
      } else {
        this.infoOverlayObjects.push(...addPreviewPlaceholder(this.scene,
          { x, y, w, h: PREVIEW_H, depth: 52, accent: elemColorNum }));
      }
      y += PREVIEW_H + 22;
    }

    // ── Scrolling body ──
    const bodyTop = y;
    const bodyH = height - bodyTop - 12;
    const container = this.scene.add.container(0, bodyTop).setDepth(52);
    this.infoOverlayObjects.push(container);
    const maskGfx = this.scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(x - 6, bodyTop, w + 12, bodyH);
    maskGfx.setVisible(false);
    container.setMask(maskGfx.createGeometryMask());
    this.infoOverlayObjects.push(maskGfx);

    let iy = 0;
    const heading = (text: string, color: string): void => {
      iy += 4;
      container.add(this.scene.add.text(x, iy, text, {
        fontSize: '9px', fontFamily: FONT_DISPLAY, color,
      }));
      iy += 16;
    };
    const prose = (text: string, color = '#a8b0c8'): void => {
      const t = this.scene.add.text(x, iy, text, {
        fontSize: '11px', fontFamily: FONT_UI, color,
        wordWrap: { width: w - 8 }, lineSpacing: 4,
      });
      container.add(t);
      iy += t.height + 10;
    };
    const effectRow = (e: CodexEffect): void => {
      const style = TAG_STYLE[e.tag];
      const lockLabel = e.requiresUpgrade ? `${e.requiresUpgrade.toUpperCase()}+`
        : e.requiresPerk ? 'PERK'
        : e.requiresMastery ? 'MASTERY' : '';
      // Label sits on its own line above the detail. Measure the wrapped detail first, then
      // size the plate around both — laying them out from one cursor is what had the bold
      // label printing straight through the first line of body copy.
      const LABEL_H = 14;
      const PAD_TOP = 6;
      const PAD_BOT = 8;
      const label = this.scene.add.text(x + 62, iy + PAD_TOP, e.label + (lockLabel ? `   ·   ${lockLabel}` : ''), {
        fontSize: '10px', fontFamily: FONT_DISPLAY, color: '#' + style.color.toString(16).padStart(6, '0'),
      });
      const body = this.scene.add.text(x + 62, iy + PAD_TOP + LABEL_H, e.detail, {
        fontSize: '10px', fontFamily: FONT_UI, color: '#9ba3bd',
        wordWrap: { width: w - 78 }, lineSpacing: 3,
      });
      const rowH = PAD_TOP + LABEL_H + body.height + PAD_BOT;
      const plate = addRowPlate(this.scene, {
        x: x + w / 2, y: iy + rowH / 2, w, h: rowH - 3, accent: style.color, muted: true,
      });
      const chip = this.scene.add.text(x + 30, iy + rowH / 2, style.label, {
        fontSize: '8px', fontFamily: FONT_DISPLAY, color: style.text,
      }).setOrigin(0.5);
      container.add([plate.g, chip, label, body]);
      iy += rowH + 4;
    };

    /**
     * The "all possibilities" table. Shared by abilities, perks and mastery enhancements —
     * a subject with nine outcomes needs the same list a key with nine outcomes does, and
     * folding them into `effects` would claim they all happen at once.
     */
    const variantBlock = (set: AbilityVariantSet | undefined): void => {
      if (!set) return;
      heading(`— ALL POSSIBILITIES (${set.variants.length}) —`, '#7dd3fc');
      prose(set.label, '#6f8fa8');
      for (const v of set.variants) {
        const locked = (!!v.requiresUpgrade && !PlayerData.isUpgradeOwned(elementId, v.requiresUpgrade))
          || (!!v.requiresPerk && !PlayerData.isPerkUnlocked(elementId, v.requiresPerk));
        effectRow({
          tag: 'utility',
          label: `${v.emoji ? v.emoji + ' ' : ''}${v.name}${locked ? '   🔒' : ''}`,
          detail: v.description,
          requiresUpgrade: v.requiresUpgrade,
          requiresPerk: v.requiresPerk,
        });
      }
    };

    if (passive) {
      heading('— WHAT IT IS —', '#7f89ab');
      prose(passive.magic);
      heading('— EFFECTS —', '#7f89ab');
      for (const e of passive.effects) effectRow(e);
      if (passive.notes?.length) {
        heading('— WORTH KNOWING —', '#7f89ab');
        for (const n of passive.notes) prose(`•  ${n}`, '#7f879c');
      }
      if (usesLegacyPassives(elementId)) {
        prose('⚠  This element is still on the old short passive text. Its full codex entry has '
          + 'not been written yet.', '#5c5a3f');
      }
    } else if (ability && entry) {
      heading('— THE MAGIC —', '#7f89ab');
      prose(showUp && entry.upgrade?.magic ? entry.upgrade.magic : entry.magic,
        showUp && entry.upgrade?.magic ? '#d9c48a' : '#a8b0c8');
      if (showUp && entry.upgrade?.magic) {
        prose(entry.magic, '#7f879c');
      }

      heading('— HOW IT IS CAST —', '#7f89ab');
      prose(entry.cast, '#94a8c4');

      heading('— EFFECTS —', '#7f89ab');
      for (const e of entry.effects) effectRow(e);

      if (showUp) {
        const owned = upgrade ? PlayerData.isUpgradeOwned(elementId, upgrade.slot) : false;
        heading(`▲ ${upgrade ? upgrade.name.toUpperCase() : 'UPGRADE'}   ${owned ? '· OWNED' : '· NOT PURCHASED'}`,
          owned ? '#ffd479' : '#8a7a4a');
        if (entry.upgrade) {
          for (const e of entry.upgrade.effects) effectRow(e);
        } else if (upgrade) {
          prose(upgrade.description, '#ccbb88');
          prose('⚠  This upgrade has not been written up in the codex yet — the line above is the '
            + 'short shop description.', '#5c5a3f');
        }
      } else if (upgrade) {
        heading('— HAS AN UPGRADE —', '#8a7a4a');
        prose(`▲ ${upgrade.name} — switch to UPGRADED above to see what it changes and watch it run.`,
          '#8a7a4a');
      }

      variantBlock(entry.variants ?? getAbilityVariants(elementId, ability.displayKey));

      if (entry.notes?.length) {
        heading('— WORTH KNOWING —', '#7f89ab');
        for (const n of entry.notes) prose(`•  ${n}`, '#7f879c');
      }
    } else if (perk || enh) {
      // Perks and mastery enhancements share one shape — long-form entry if the codex has one,
      // otherwise the short loadout line with an honest note that it is the short line.
      const codexEntry: SubjectCodexEntry | undefined = perk
        ? getPerkCodex(elementId, perk.id)
        : getMasteryCodex(elementId, enh!.id);
      const shortLine = perk ? perk.description : enh!.description;

      if (perk) {
        const ELEM_EMOJI: Record<string, string> = {
          fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
          electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
        };
        heading('— FORGED FROM —', '#8f7ab8');
        prose(perk.ingredients.map((r) => `${ELEM_EMOJI[r] ?? ''} ${r}`).join('   +   '), '#a493c4');
      }

      if (codexEntry) {
        heading('— THE MAGIC —', '#7f89ab');
        prose(codexEntry.magic);
        if (codexEntry.cast) {
          heading('— HOW IT IS USED —', '#7f89ab');
          prose(codexEntry.cast, '#94a8c4');
        }
        heading('— EFFECTS —', '#7f89ab');
        for (const e of codexEntry.effects) effectRow(e);
        variantBlock(codexEntry.variants);
        if (codexEntry.notes?.length) {
          heading('— WORTH KNOWING —', '#7f89ab');
          for (const n of codexEntry.notes) prose(`•  ${n}`, '#7f879c');
        }
      } else {
        heading('— NOT YET DOCUMENTED —', '#8a7a4a');
        prose('No long-form entry yet, so this is the short line the loadout screen uses:', '#6f7488');
        prose(`“${shortLine}”`, '#a8b0c8');
        prose(`Add it under ${perk ? 'perks' : 'mastery'} in src/data/codex/${elementId}.ts — see `
          + 'src/data/AbilityCodex.ts, and run node .check-codex.mjs for coverage.', '#4a4f63');
      }
    } else if (ability) {
      heading('— NOT YET DOCUMENTED —', '#8a7a4a');
      prose(`${ability.name} has no codex entry yet, so all this screen can show is the one-line `
        + 'summary the in-match ability bar uses:', '#6f7488');
      prose(`“${ability.description}”`, '#a8b0c8');
      if (upgrade) prose(`▲ ${upgrade.name}: ${upgrade.description}`, '#8a7a4a');
      prose('Write src/data/codex/' + elementId + '.ts to replace this — see the header of '
        + 'src/data/AbilityCodex.ts, and run node .check-codex.mjs to check coverage.', '#4a4f63');
    }

    iy += 20;
    this.attachInfoScroll(container, bodyTop, bodyH, iy, width, height);
  }

  /** Wheel scrolling for a masked body container. Shared by every tab. */
  private attachInfoScroll(
    container: Phaser.GameObjects.Container, top: number, viewH: number, contentH: number,
    width: number, height: number,
  ): void {
    const maxScroll = Math.max(0, contentH - viewH);
    let scrollY = 0;
    this.infoScrollHandler = (_p: unknown, _o: unknown, _dx: unknown, deltaY: unknown) => {
      if (maxScroll <= 0) return;
      scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
      container.setY(top - scrollY);
    };
    this.scene.input.on('wheel', this.infoScrollHandler);
    if (maxScroll > 0) {
      this.infoOverlayObjects.push(this.scene.add.text(width - 10, height - 12, '▼ scroll', {
        fontSize: '8px', fontFamily: FONT_UI, color: '#3a3f52',
      }).setOrigin(1, 1).setDepth(55));
    }
  }



  /** Full-width scrolling page, for the tabs that are a single long list. */
  private renderScrollingSection(
    width: number, height: number, cx: number, top: number,
    build: (c: Phaser.GameObjects.Container, colX: number, colW: number, y: number) => number,
  ): void {
    const colX = 40, colW = width - 80;
    const viewH = height - top - 12;
    const container = this.scene.add.container(0, top).setDepth(51);
    this.infoOverlayObjects.push(container);
    const maskGfx = this.scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, top, width, viewH);
    maskGfx.setVisible(false);
    container.setMask(maskGfx.createGeometryMask());
    this.infoOverlayObjects.push(maskGfx);
    const contentH = build(container, colX, colW, 4);
    void cx;
    this.attachInfoScroll(container, top, viewH, contentH, width, height);
  }

  /**
   * Renders Paper's Journal tab. Returns the new innerY.
   *
   * One collapsed row per element — forty-odd of them — because six entries each expanded at once
   * is two hundred and fifty rows of text and nobody reads that. Every element is listed whether
   * or not it has been fought, so the tab reads as a book to fill in rather than a list of things
   * that have happened; locked entries are shown greyed with the result that would unlock them,
   * for the same reason.
   */
  private renderPaperJournal(
    container: Phaser.GameObjects.Container,
    cx: number, colX: number, colW: number, startY: number,
    width: number, height: number,
  ): number {
    let y = startY;

    const filled = journalTotalUnlocked();
    const total = journalTotalPossible();
    const hdr = this.scene.add.text(cx, y, `— THE JOURNAL · ${filled} / ${total} —`, {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#e8c65c',
    }).setOrigin(0.5);
    container.add(hdr);
    y += 22;

    const intro = this.scene.add.text(colX + 14, y,
      'Fight an element as Paper and the result is written up here. Three wins over it fill the '
      + 'right-hand page, three losses to it fill the left. Every entry is permanent, and every '
      + 'entry only applies in that matchup. Tap an element to read it.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#b8ac88',
        wordWrap: { width: colW - 28 }, lineSpacing: 3,
      });
    container.add(intro);
    y += intro.height + 14;

    for (const id of journalElementIds()) {
      const prog = journalProgress(id);
      const color = journalElementColor(id);
      const hex = '#' + color.toString(16).padStart(6, '0');
      const expanded = this.expandedJournal.has(id);
      const rowH = 30;

      const rowBg = this.overlayRow(cx, y + rowH / 2, colW, rowH - 4, color).g;
      const nameText = this.scene.add.text(colX + 16, y + rowH / 2,
        `${journalElementEmoji(id)}  ${journalElementName(id)}`, {
          fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: prog.unlocked > 0 ? hex : '#5a5a66',
        }).setOrigin(0, 0.5);

      // Six pips: three for the losses, three for the wins, so the shape of a matchup — beaten
      // it a lot, never lost to it — is readable without opening the entry.
      const pips = this.scene.add.text(colX + colW - 78, y + rowH / 2,
        `${'◆'.repeat(Math.min(3, prog.losses))}${'◇'.repeat(3 - Math.min(3, prog.losses))}`
        + ` ${'◆'.repeat(Math.min(3, prog.wins))}${'◇'.repeat(3 - Math.min(3, prog.wins))}`, {
          fontSize: '11px', color: prog.unlocked > 0 ? '#e8c65c' : '#44424a',
        }).setOrigin(1, 0.5);
      const tally = this.scene.add.text(colX + colW - 16, y + rowH / 2, `${prog.unlocked}/6`, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: prog.unlocked === 6 ? '#88ff88' : '#776f5a',
      }).setOrigin(1, 0.5);

      const hit = this.scene.add.rectangle(cx, y + rowH / 2, colW, rowH - 4, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        if (expanded) this.expandedJournal.delete(id); else this.expandedJournal.add(id);
        Sfx.play('ui-click');
        this.showElementInfo('paper', width, height, cx);
      });
      container.add([rowBg, nameText, pips, tally, hit]);
      y += rowH + 4;

      if (!expanded) continue;

      for (const entry of journalEntries(id)) {
        const lock = entry.source === 'loss'
          ? `LOSE ${entry.rank}×` : `WIN ${entry.rank}×`;
        const title = this.scene.add.text(colX + 30, y,
          `${entry.unlocked ? '📖' : '🔒'} ${entry.name}`, {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: entry.unlocked ? '#ffe9a8' : '#5a5648',
          });
        const badge = this.scene.add.text(colX + colW - 22, y, entry.unlocked ? '✓' : lock, {
          fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: entry.unlocked ? '#88ff88' : '#5a5648',
        }).setOrigin(1, 0);
        const body = this.scene.add.text(colX + 30, y + 15,
          `${entry.note}\n▸ ${entry.effectText}`, {
            fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
            color: entry.unlocked ? '#a89c7c' : '#4a4740',
            wordWrap: { width: colW - 62 }, lineSpacing: 2,
          });
        container.add([title, badge, body]);
        y += 15 + body.height + 8;
      }
      y += 6;
    }

    return y + 10;
  }

  /** Renders Creation's Build Mode tab — the Nexus potion recipes. Returns the new innerY. */
  private renderCreationBuildInfo(
    container: Phaser.GameObjects.Container,
    cx: number, colX: number, colW: number, startY: number,
  ): number {
    let y = startY;

    const hdr = this.scene.add.text(cx, y, '— BUILD MODE · NEXUS —', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffaa55',
    }).setOrigin(0.5);
    container.add(hdr);
    y += 22;

    const buildSet = getAbilityVariants('creation', 'e');
    const intro = this.scene.add.text(colX + 14, y,
      'Charge bolts with E — tap = Copper, hold ~0.5s = Silver, ~1s = Gold — then load 2 into the Nexus on the ground. The pair you feed it decides which potion it brews; the bottle sits on the Nexus until you walk over and drink it:',
      { fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ccbb99', wordWrap: { width: colW - 28 }, lineSpacing: 3 });
    container.add(intro);
    y += intro.height + 14;

    for (const v of buildSet?.variants ?? []) {
      const descText = this.scene.add.text(colX + 40, y + 22, v.description, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aab0c0',
        wordWrap: { width: colW - 54 }, lineSpacing: 3,
      });
      const rowH = 22 + descText.height + 12;
      const rowBg = this.overlayRow(cx, y + rowH / 2, colW, rowH - 6, C.ember).g;
      const nameText = this.scene.add.text(colX + 14, y + 13, `${v.emoji ? v.emoji + ' ' : ''}${v.name}`, {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc88',
      }).setOrigin(0, 0.5);
      container.add([rowBg, nameText, descText]);
      y += rowH + 6;
    }

    if (!buildSet || buildSet.variants.length === 0) {
      const none = this.scene.add.text(cx, y + 6, 'No nexus recipes are defined yet.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444455',
      }).setOrigin(0.5);
      container.add(none);
      y += 26;
    }

    return y + 16;
  }

  showMasteryScreen(elementId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[elementId];
    if (!element) return;
    const def = getMasteryDef(elementId);
    const elemColor = '#' + element.color.toString(16).padStart(6, '0');

    const SCROLL_TOP = 128;
    const SCROLL_BOT = height - 78;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.scene.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97).setDepth(50);
    bg.setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.scene.add.text(cx, 34, `${element.emoji}  ${element.name.toUpperCase()} MASTERY`, {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc00',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    const divLine = this.scene.add.line(cx, SCROLL_TOP - 12, -width / 2 + 40, 0, width / 2 - 40, 0, C.arcane, 0.45).setDepth(51).setLineWidth(1);
    this.infoOverlayObjects.push(divLine);

    // Back button (declared early so early-return paths can still use it)
    this.infoOverlayObjects.push(addButton(this.scene, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => this.closeElementInfo(),
    }).container);

    if (!def) {
      const soon = this.scene.add.text(cx, height / 2, 'Mastery for this element is coming soon.', {
        fontSize: '14px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5).setDepth(51);
      this.infoOverlayObjects.push(soon);
      return;
    }

    const scrollContainer = this.scene.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    const mask = maskGfx.createGeometryMask();
    scrollContainer.setMask(mask);
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    let innerY = 4;

    const sectionHdr = (text: string, color: string) => {
      const t = this.scene.add.text(cx, innerY, text, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color,
      }).setOrigin(0.5);
      scrollContainer.add(t);
      innerY += 20;
    };

    const complete = isMasteryComplete(elementId);

    sectionHdr('— CHALLENGES —', '#ffcc00');
    def.requirements.forEach((req: MasteryRequirement) => {
      const current = Math.min(req.target, PlayerData.getMasteryStat(elementId, req.key));
      const done = current >= req.target;

      const howToText = this.scene.add.text(COL_X + 14, innerY + 24, req.howTo, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#aaaacc',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });

      const barY = innerY + 24 + howToText.height + 14;
      const barW = COL_W - 28;
      const barBg = this.scene.add.rectangle(COL_X + 14 + barW / 2, barY, barW, 10, 0x1a1a2a, 0.9).setStrokeStyle(1, 0x333355);
      const fillW = Math.max(2, (current / req.target) * barW);
      const barFill = this.scene.add.rectangle(COL_X + 14, barY, fillW, 8, done ? 0x44ff88 : 0xffcc00, 0.9).setOrigin(0, 0.5);

      const rowH = 24 + howToText.height + 14 + 14;
      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6,
        done ? C.verdant : C.steel, !done).g;

      const nameText = this.scene.add.text(COL_X + 14, innerY + 13, req.label, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ddddee',
      }).setOrigin(0, 0.5);

      const countLabel = req.isBest
        ? `best ${current}/${req.target} in one${done ? '  ✓' : ''}`
        : `${current}/${req.target}${done ? '  ✓' : ''}`;
      const countText = this.scene.add.text(COL_X + COL_W - 14, innerY + 13, countLabel, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: done ? '#88ff88' : '#ccaa44',
      }).setOrigin(1, 0.5);

      scrollContainer.add([rowBg, nameText, countText, howToText, barBg, barFill]);
      innerY += rowH + 6;
    });

    innerY += 16;
    sectionHdr('— ENHANCEMENTS —', '#ff8844');
    def.enhancements.forEach((enh) => {
      const descText = this.scene.add.text(COL_X + 14, innerY + 24, enh.description, {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ffccaa',
        wordWrap: { width: COL_W - 28 }, lineSpacing: 3,
      });
      const rowH = 24 + descText.height + 12;
      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6, C.ember).g;
      const boundSlot = enh.bindable
        ? Object.keys(PlayerData.getMasteryBinds(elementId)).find((s) => PlayerData.getMasteryBinds(elementId)[s] === enh.id)
        : undefined;
      const title = enh.bindable
        ? `${enh.name}  [${boundSlot ? boundSlot.toUpperCase() : 'unbound'}]`
        : `${enh.name}  [Passive]`;
      const nameText = this.scene.add.text(COL_X + 14, innerY + 13, title, {
        fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffaa66',
      }).setOrigin(0, 0.5);
      scrollContainer.add([rowBg, nameText, descText]);
      innerY += rowH + 6;
    });

    innerY += 16;
    sectionHdr('— UNLOCKED APPEARANCE —', '#ffcc00');
    const previewY = innerY + 40;
    const previewCard = this.scene.add.rectangle(cx, previewY, 100, 108, def.enhancedColor, 0.8).setStrokeStyle(2, def.enhancedColor);
    const previewEmoji = this.scene.add.text(cx, previewY - 20, def.enhancedEmoji, { fontSize: '34px' }).setOrigin(0.5);
    const previewLbl = this.scene.add.text(cx, previewY + 34, `${element.name.toUpperCase()} MASTERED`, {
      fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffffff',
    }).setOrigin(0.5);
    scrollContainer.add([previewCard, previewEmoji, previewLbl]);
    innerY = previewY + 70;

    // ── Loadout (last section, scrolls with the rest) ──
    innerY = this.buildMasteryLoadout({
      elementId, element, container: scrollContainer, cx, innerY,
      width, height, scrollTop: SCROLL_TOP, scrollBot: SCROLL_BOT,
      masteryOn: PlayerData.isMasteryEnabled(elementId), emoji: def.enhancedEmoji,
    });

    // ── Scroll logic ──
    // Restores the scroll offset from before this rebuild (e.g. binding/clearing a mastery
    // ability) so those actions don't jerk the view back to the top.
    const totalContentH = innerY;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);
    let scrollY = Phaser.Math.Clamp(this.masteryScrollY, 0, maxScroll);
    scrollContainer.setY(SCROLL_TOP - scrollY);
    const doScroll = (delta: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + delta, 0, maxScroll);
      this.masteryScrollY = scrollY;
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };
    this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.scene.input.on('wheel', this.infoScrollHandler);
    if (maxScroll > 0) {
      const hint = this.scene.add.text(width - 12, SCROLL_BOT + 6, '▼ scroll for more', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 0).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }

    // ── Enable / Disable button ──
    const enabled = PlayerData.isMasteryEnabled(elementId);
    const btnY = height - 40;
    const btnW = 320, btnH = 44;
    const enableBtn = addButton(this.scene, {
      x: cx, y: btnY, w: btnW, h: btnH,
      label: !complete ? 'LOCKED'
        : enabled ? `${def.name.toUpperCase()} ENABLED`
        : `ENABLE ${def.name.toUpperCase()}`,
      sublabel: !complete ? 'Complete every challenge to unlock'
        : enabled ? 'Click to disable' : undefined,
      icon: !complete ? '🔒' : enabled ? '✓' : def.enhancedEmoji,
      accent: !complete ? C.steel : enabled ? C.verdant : C.gold,
      variant: !complete ? 'quiet' : 'solid',
      fontSize: 14,
      depth: 55,
      disabled: !complete,
      onClick: () => {
        PlayerData.setMasteryEnabled(elementId, !enabled);
        this.onDirty();
        this.showMasteryScreen(elementId, width, height, cx);
      },
    });
    this.infoOverlayObjects.push(enableBtn.container);
  }

  /**
   * Final section of the mastery scroll: drag a mastery ability chip onto one of the
   * element's E/R/F/Q slots to replace that ability with it. Click is not a valid target.
   *
   * Everything lives inside the scroll container, so drags are driven manually off scene
   * pointer events with a floating ghost rather than Phaser's `draggable` — container-local
   * drag coordinates would have to be unwound against the live scroll offset otherwise.
   * Returns the updated innerY so the caller can keep laying out below.
   */
  private buildMasteryLoadout(opts: {
    elementId: string; element: Element; container: Phaser.GameObjects.Container;
    cx: number; innerY: number; width: number; height: number;
    scrollTop: number; scrollBot: number; masteryOn: boolean; emoji: string;
  }): number {
    const { elementId, element, container, cx, width, height, scrollTop, scrollBot, masteryOn, emoji } = opts;
    let innerY = opts.innerY;

    const bindables = getBindableEnhancements(elementId);
    if (bindables.length === 0) return innerY;

    const unlocked = isMasteryComplete(elementId);
    const COL_X = 40;
    const COL_W = width - 80;

    innerY += 16;
    const hdr = this.scene.add.text(cx, innerY, '— LOADOUT —', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: unlocked ? '#ffcc00' : '#555566',
    }).setOrigin(0.5);
    container.add(hdr);
    innerY += 20;

    const sub = this.scene.add.text(cx, innerY, unlocked
      ? 'Drag a mastery ability onto a slot to replace that ability. Click cannot be replaced.'
      : 'Complete the challenges above to bind mastery abilities.', {
      fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
      color: unlocked ? '#aaaacc' : '#555566',
    }).setOrigin(0.5);
    container.add(sub);
    innerY += 24;

    const panel = this.scene.add.rectangle(cx, innerY + 54, COL_W, 116, 0x0b0b18, 0.85)
      .setStrokeStyle(1, unlocked ? 0x775522 : 0x222233, 0.7);
    container.add(panel);

    // ── Draggable mastery ability chips ──
    const chipY = innerY + 20;
    const chipW = 170, chipH = 24;
    const chipTotal = bindables.length * chipW + (bindables.length - 1) * 10;
    const chipFirstX = cx - chipTotal / 2 + chipW / 2;

    // ── Ability slots (drop targets) ──
    const binds = PlayerData.getMasteryBinds(elementId);
    const slotW = 150, slotGap = 8, slotH = 44;
    const slotY = innerY + 72;
    const baseAbilities = element.abilities.slice(0, 5);
    const totalW = baseAbilities.length * slotW + (baseAbilities.length - 1) * slotGap;
    const firstX = cx - totalW / 2 + slotW / 2;

    const dropTargets: { x: number; slot: MasterySlot }[] = [];

    baseAbilities.forEach((ab, i) => {
      const x = firstX + i * (slotW + slotGap);
      const key = ab.displayKey.toLowerCase();
      const slot = (MASTERY_SLOTS as string[]).includes(key) ? (key as MasterySlot) : null;
      const boundEnh = slot ? getEnhancement(elementId, binds[slot] ?? '') : undefined;

      const box = this.scene.add.rectangle(x, slotY, slotW, slotH,
        boundEnh ? 0x2a1a00 : slot ? 0x14142a : 0x0d0d16, 0.95)
        .setStrokeStyle(2, boundEnh ? 0xffaa00 : slot ? 0x334466 : 0x22222e, 0.9);

      const keyLbl = this.scene.add.text(x - slotW / 2 + 8, slotY - 12, `[${ab.displayKey}]`, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: slot ? '#8899cc' : '#444455',
      }).setOrigin(0, 0.5);

      const nameLbl = this.scene.add.text(x, slotY + 8, boundEnh ? boundEnh.name : ab.name, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: boundEnh ? '#ffcc00' : slot ? '#ccccdd' : '#555566',
      }).setOrigin(0.5);

      container.add([box, keyLbl, nameLbl]);

      if (!slot) {
        const lock = this.scene.add.text(x + slotW / 2 - 8, slotY - 12, '🔒', { fontSize: '10px' })
          .setOrigin(1, 0.5);
        container.add(lock);
        return;
      }

      dropTargets.push({ x, slot });

      if (boundEnh) {
        // ✕ unbinds, restoring the element's own ability to this slot.
        const clear = this.scene.add.text(x + slotW / 2 - 8, slotY - 12, '✕', {
          fontSize: '12px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ff8866',
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
        clear.on('pointerdown', () => {
          // Ignore clicks on rows scrolled out of the visible window.
          if (!this.isInScrollWindow(container, slotY, scrollTop, scrollBot)) return;
          PlayerData.clearMasteryBind(elementId, slot);
          this.showMasteryScreen(elementId, width, height, cx);
        });
        container.add(clear);
      }
    });

    bindables.forEach((enh, i) => {
      const homeX = chipFirstX + i * (chipW + 10);
      const chip = this.scene.add.rectangle(homeX, chipY, chipW, chipH, 0x552200, 0.95)
        .setStrokeStyle(2, 0xffaa00, 0.9);
      const chipLbl = this.scene.add.text(homeX, chipY, `${emoji} ${enh.name}`, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc00',
      }).setOrigin(0.5);
      container.add([chip, chipLbl]);

      if (!unlocked) {
        chip.setAlpha(0.4);
        chipLbl.setAlpha(0.4);
        return;
      }

      chip.setInteractive({ useHandCursor: true });
      chip.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isInScrollWindow(container, chipY, scrollTop, scrollBot)) return;
        this.beginMasteryDrag({
          enh, elementId, pointer, chip, chipLbl, emoji,
          // Some enhancements refuse particular slots (Creation's Mortar Command can't take E).
          dropTargets: dropTargets.filter((t) => !(enh.excludeSlots ?? []).includes(t.slot)),
          slotY, slotW, slotH, container,
          width, height, cx,
        });
      });
    });

    innerY += 116;

    if (unlocked && !masteryOn) {
      const note = this.scene.add.text(cx, innerY + 4, 'Mastery is disabled — bindings apply once enabled.', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#775544',
      }).setOrigin(0.5);
      container.add(note);
      innerY += 18;
    }

    return innerY + 10;
  }

  /** True when a scroll-container row at local y is inside the visible (unmasked) window. */
  private isInScrollWindow(
    container: Phaser.GameObjects.Container, localY: number, top: number, bottom: number,
  ): boolean {
    const worldY = container.y + localY;
    return worldY >= top && worldY <= bottom;
  }

  /**
   * Manual drag: the chip stays put and a top-level ghost follows the pointer, so the drag
   * is unaffected by the scroll container's transform and mask.
   */
  private beginMasteryDrag(args: {
    enh: MasteryEnhancement; elementId: string; pointer: Phaser.Input.Pointer;
    chip: Phaser.GameObjects.Rectangle; chipLbl: Phaser.GameObjects.Text; emoji: string;
    dropTargets: { x: number; slot: MasterySlot }[];
    slotY: number; slotW: number; slotH: number;
    container: Phaser.GameObjects.Container;
    width: number; height: number; cx: number;
  }): void {
    const {
      enh, elementId, pointer, chip, chipLbl, emoji, dropTargets,
      slotY, slotW, slotH, container, width, height, cx,
    } = args;

    this.endMasteryDrag(); // never allow two drags at once

    chip.setAlpha(0.35);
    chipLbl.setAlpha(0.35);

    const ghost = this.scene.add.rectangle(pointer.x, pointer.y, chip.width, chip.height, 0x552200, 0.95)
      .setStrokeStyle(2, 0xffcc44, 1).setDepth(70);
    const ghostLbl = this.scene.add.text(pointer.x, pointer.y, `${emoji} ${enh.name}`, {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffdd66',
    }).setOrigin(0.5).setDepth(71);
    this.masteryDragGhost = [ghost, ghostLbl];

    // Highlight whichever slot the pointer is currently over.
    const hitTest = (p: Phaser.Input.Pointer) => {
      const worldSlotY = container.y + slotY;
      return dropTargets.find((t) =>
        Math.abs(p.x - t.x) <= slotW / 2 && Math.abs(p.y - worldSlotY) <= slotH / 2) ?? null;
    };

    this.masteryDragMove = (...a: unknown[]) => {
      const p = a[0] as Phaser.Input.Pointer;
      ghost.setPosition(p.x, p.y);
      ghostLbl.setPosition(p.x, p.y);
      const over = hitTest(p);
      ghost.setStrokeStyle(2, over ? 0x66ff88 : 0xffcc44, 1);
    };

    this.masteryDragUp = (...a: unknown[]) => {
      const p = a[0] as Phaser.Input.Pointer;
      const hit = hitTest(p);
      this.endMasteryDrag();
      if (hit) {
        PlayerData.setMasteryBind(elementId, hit.slot, enh.id);
        this.showMasteryScreen(elementId, width, height, cx);
      } else {
        chip.setAlpha(1);
        chipLbl.setAlpha(1);
      }
    };

    this.scene.input.on('pointermove', this.masteryDragMove);
    this.scene.input.on('pointerup', this.masteryDragUp);
  }

  /** Tears down any in-flight mastery drag: removes handlers and destroys the ghost. */
  private endMasteryDrag(): void {
    if (this.masteryDragMove) {
      this.scene.input.off('pointermove', this.masteryDragMove);
      this.masteryDragMove = null;
    }
    if (this.masteryDragUp) {
      this.scene.input.off('pointerup', this.masteryDragUp);
      this.masteryDragUp = null;
    }
    if (this.masteryDragGhost) {
      for (const o of this.masteryDragGhost) o.destroy();
      this.masteryDragGhost = null;
    }
  }

  /**
   * Element customization screen — replaces the old per-card perk strip. One place to
   * toggle mastery, pick a perk, toggle owned upgrades on/off, and equip a skin.
   * Every action persists immediately via PlayerData and rebuilds the overlay in place
   * (scroll offset preserved via customizeScrollY, like the mastery screen does).
   */
  /**
   * `screenId` is the card that was clicked; `elementId` below is whose loadout is actually
   * being edited. They differ only for Quantum, which owns no mastery, perk, upgrade or skin
   * of its own — it fights as the two elements it carries, so its page is a pair of tabs over
   * those halves' loadouts rather than four empty sections.
   */
  showCustomizeScreen(screenId: string, width: number, height: number, cx: number): void {
    this.closeElementInfo();

    const element = ELEMENT_DATA_MAP[screenId];
    if (!element) return;

    // Falls back to the starter bond so the page still works on a save that has never
    // walked through the bond phase — that pair is granted, so it is always a real loadout.
    const bond = screenId === 'quantum'
      ? (PlayerData.getQuantumBond() ?? PlayerData.STARTER_BOND)
      : null;
    if (bond && (this.customizeHalf === null || !bond.includes(this.customizeHalf))) {
      this.customizeHalf = bond[0];
    }
    const elementId = bond ? this.customizeHalf as string : screenId;
    const dataElement = ELEMENT_DATA_MAP[elementId] ?? element;
    const elemColor = '#' + dataElement.color.toString(16).padStart(6, '0');

    const HDR_BOT = 84;
    const SCROLL_TOP = bond ? 130 : 96;
    const SCROLL_BOT = height - 44;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.scene.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97).setDepth(50);
    bg.setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.scene.add.text(cx, 34, `⚙  ${element.name.toUpperCase()} CUSTOMIZATION`, {
      fontSize: '26px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: '#' + element.color.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(header);

    const halfName = (id: string) => ELEMENT_DATA_MAP[id]?.name ?? id;
    const subHdr = this.scene.add.text(cx, 62, bond
      ? `— carrying ${halfName(bond[0])} + ${halfName(bond[1])} · load out each half —`
      : '— mastery · perk · upgrades · skin —', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(51);
    this.infoOverlayObjects.push(subHdr);

    const divLine = this.scene.add.line(cx, HDR_BOT, -width / 2 + 40, 0, width / 2 - 40, 0, C.arcane, 0.45).setDepth(51).setLineWidth(1);
    this.infoOverlayObjects.push(divLine);

    // Back button — closing re-renders the phase so card emoji/mastery state refresh.
    this.infoOverlayObjects.push(addButton(this.scene, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => {
        this.bondEditing = false;
        this.bondDraftFirst = null;
        this.closeElementInfo();
        this.onDirty();
      },
    }).container);

    // ── Bond half tabs (Quantum only) — fixed above the scroll window ───
    if (bond) {
      const tabW = 188, tabH = 28, tabGap = 10;
      const totalW = bond.length * tabW + (bond.length - 1) * tabGap;
      bond.forEach((halfId, hi) => {
        const tx = cx - totalW / 2 + tabW / 2 + hi * (tabW + tabGap);
        const ty = 106;
        const selected = halfId === elementId;
        const halfEl = ELEMENT_DATA_MAP[halfId];
        const accent = halfEl?.color ?? C.arcane;
        const plate = addCardPlate(this.scene, {
          x: tx, y: ty, w: tabW, h: tabH, accent, cut: 8, depth: 55, muted: !selected,
        });
        if (selected) plate.paint('active');
        const lbl = this.scene.add.text(tx, ty,
          `${halfEl?.emoji ?? '◆'}  ${halfName(halfId).toUpperCase()}${hi === 0 ? '  (start)' : ''}`, {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: selected ? hex(mix(accent, 0xffffff, 0.6)) : '#666677',
          }).setOrigin(0.5).setDepth(57);
        const hit = this.scene.add.rectangle(tx, ty, tabW, tabH, 0xffffff, 0)
          .setDepth(56).setInteractive({ useHandCursor: true });
        hit
          .on('pointerover', () => { if (!selected) plate.paint('hover'); })
          .on('pointerout', () => plate.paint(selected ? 'active' : 'idle'))
          .on('pointerdown', () => {
            if (selected) return;
            this.customizeHalf = halfId;
            this.customizeScrollY = 0;
            // Switching halves is a loadout action, so it leaves the bond builder.
            this.bondEditing = false;
            this.bondDraftFirst = null;
            this.showCustomizeScreen(screenId, width, height, cx);
          });
        this.infoOverlayObjects.push(plate.g, lbl, hit);
      });
    }

    const scrollContainer = this.scene.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    scrollContainer.setMask(maskGfx.createGeometryMask());
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    let innerY = 4;

    const rebuild = () => this.showCustomizeScreen(screenId, width, height, cx);
    const inView = (localY: number) => this.isInScrollWindow(scrollContainer, localY, SCROLL_TOP, SCROLL_BOT);

    const sectionHdr = (text: string, color: string) => {
      const t = this.scene.add.text(cx, innerY, text, {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color,
      }).setOrigin(0.5);
      scrollContainer.add(t);
      innerY += 20;
    };

    /**
     * Closes out the page: scroll extent, wheel handler and the overflow hint. Declared
     * rather than inlined at the bottom because the bond builder returns early — while it is
     * open it *is* the page, and the loadout sections below it would only be in the way.
     */
    const finishScroll = (): void => {
      const maxScroll = Math.max(0, innerY - SCROLL_H);
      let scrollY = Phaser.Math.Clamp(this.customizeScrollY, 0, maxScroll);
      this.customizeScrollY = scrollY;
      scrollContainer.setY(SCROLL_TOP - scrollY);
      this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
        scrollY = Phaser.Math.Clamp(scrollY + (deltaY as number) * 0.5, 0, maxScroll);
        this.customizeScrollY = scrollY;
        scrollContainer.setY(SCROLL_TOP - scrollY);
      };
      this.scene.input.on('wheel', this.infoScrollHandler);

      if (maxScroll > 0) {
        const hint = this.scene.add.text(width - 12, SCROLL_BOT + 6, '▼ scroll for more', {
          fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
        }).setOrigin(1, 0).setDepth(55);
        this.infoOverlayObjects.push(hint);
      }
    };

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    // ── BOND (Quantum only) ─────────────────────────────────────────
    // The pair Quantum carries is built here, not at the element roster: it is loadout, and
    // it belongs next to the mastery, perk and skin of the two halves it decides.
    if (bond) {
      sectionHdr('— BOND —', '#7df9ff');

      if (this.bondEditing) {
        innerY = this.renderBondBuilder(scrollContainer, cx, COL_X, COL_W, innerY, inView, rebuild);
        finishScroll();
        return;
      }

      const rowH = 46;
      const rowLocalY = innerY + rowH / 2;
      const rowBg = this.overlayRow(cx, rowLocalY, COL_W, rowH - 6, 0x7df9ff).g;
      const ea = ELEMENT_DATA_MAP[bond[0]];
      const eb = ELEMENT_DATA_MAP[bond[1]];
      const pairLbl = this.scene.add.text(COL_X + 14, rowLocalY,
        `${ea?.emoji ?? '◆'} ${halfName(bond[0]).toUpperCase()}   ⇄   ${eb?.emoji ?? '◆'} ${halfName(bond[1]).toUpperCase()}`, {
          fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#9fdde6',
        }).setOrigin(0, 0.5);
      scrollContainer.add([rowBg, pairLbl]);

      // Two buttons on the right of the carried row: flip which half you spawn as, or
      // throw the pair away and build another.
      const mkBtn = (label: string, xRight: number, w: number, onClick: () => void) => {
        const bx = COL_X + COL_W - xRight - w / 2;
        const b = this.scene.add.rectangle(bx, rowLocalY, w, 24, 0x11333a, 0.95)
          .setStrokeStyle(2, 0x3f8f9c, 0.9).setInteractive({ useHandCursor: true });
        const l = this.scene.add.text(bx, rowLocalY, label, {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#9fdde6',
        }).setOrigin(0.5);
        b.on('pointerover', () => b.setStrokeStyle(2, 0xffffff, 1))
          .on('pointerout',  () => b.setStrokeStyle(2, 0x3f8f9c, 0.9))
          .on('pointerdown', () => { if (inView(rowLocalY)) onClick(); });
        scrollContainer.add([b, l]);
      };
      mkBtn('⇄ SWAP START', 118, 104, () => {
        PlayerData.setQuantumBond(bond[1], bond[0]);
        this.customizeHalf = bond[1];
        rebuild();
      });
      mkBtn('CHANGE ▸', 14, 92, () => {
        this.bondEditing = true;
        this.bondDraftFirst = null;
        this.customizeScrollY = 0;
        rebuild();
      });
      innerY += rowH;

      const caption = this.scene.add.text(COL_X + 14, innerY + 2,
        `Fights start as ${halfName(bond[0])} — dodge collapses to ${halfName(bond[1])} and back. `
        + 'Each half keeps its own mastery, perk, upgrades and skin below.', {
          fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#556677',
          wordWrap: { width: COL_W - 28 }, lineSpacing: 2,
        });
      scrollContainer.add(caption);
      innerY += caption.height + 16;
    }

    // ── MASTERY ─────────────────────────────────────────────────────
    sectionHdr('— MASTERY —', '#ffcc00');
    const masteryDef = getMasteryDef(elementId);
    if (!masteryDef) {
      const soon = this.scene.add.text(cx, innerY + 8, 'Mastery for this element is coming soon.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(soon);
      innerY += 30;
    } else {
      const complete = isMasteryComplete(elementId);
      const enabled = PlayerData.isMasteryEnabled(elementId);
      const rowH = 44;
      const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 6, C.gold, !enabled).g;
      const nameText = this.scene.add.text(COL_X + 14, innerY + rowH / 2 - 3, `${masteryDef.enhancedEmoji} ${masteryDef.name}`, {
        fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: complete ? '#ffcc00' : '#777788',
      }).setOrigin(0, 0.5);
      scrollContainer.add([rowBg, nameText]);

      if (!complete) {
        const lockLbl = this.scene.add.text(COL_X + COL_W - 14, innerY + rowH / 2 - 3, '🔒 Complete challenges to unlock', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
        }).setOrigin(1, 0.5);
        scrollContainer.add(lockLbl);
      } else {
        const rowLocalY = innerY + rowH / 2;
        const tglW = 110, tglH = 26;
        const tglX = COL_X + COL_W - 14 - tglW / 2;
        const tglBg = this.scene.add.rectangle(tglX, rowLocalY - 3, tglW, tglH,
          enabled ? 0x225533 : 0x333344, 0.95)
          .setStrokeStyle(2, enabled ? 0x44cc66 : 0x555577, 0.9)
          .setInteractive({ useHandCursor: true });
        const tglLbl = this.scene.add.text(tglX, rowLocalY - 3, enabled ? '✓ ENABLED' : 'DISABLED', {
          fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: enabled ? '#88ff88' : '#8888aa',
        }).setOrigin(0.5);
        tglBg
          .on('pointerover', () => tglBg.setStrokeStyle(2, 0xffffff, 1))
          .on('pointerout',  () => tglBg.setStrokeStyle(2, enabled ? 0x44cc66 : 0x555577, 0.9))
          .on('pointerdown', () => {
            if (!inView(rowLocalY)) return;
            PlayerData.setMasteryEnabled(elementId, !enabled);
            rebuild();
          });
        scrollContainer.add([tglBg, tglLbl]);
      }
      innerY += rowH;

      const link = this.scene.add.text(COL_X + 14, innerY + 4, 'View challenges & mastery loadout ▸', {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#66ccff',
      }).setInteractive({ useHandCursor: true });
      const linkLocalY = innerY + 4;
      link.on('pointerover', () => link.setColor('#aaeeff'));
      link.on('pointerout',  () => link.setColor('#66ccff'));
      link.on('pointerdown', () => {
        if (!inView(linkLocalY)) return;
        this.masteryScrollY = 0;
        this.showMasteryScreen(elementId, width, height, cx);
      });
      scrollContainer.add(link);
      innerY += 26;
    }
    innerY += 12;

    // ── PERK ────────────────────────────────────────────────────────
    sectionHdr('— PERK —', '#cc88ff');
    const perks = getPerksForElement(elementId);
    if (perks.length === 0) {
      const noPerks = this.scene.add.text(cx, innerY + 8, 'No perks are craftable for this element yet.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(noPerks);
      innerY += 30;
    } else {
      const equippedId = PlayerData.getEquippedPerk(elementId);

      // "None" row
      {
        const rowH = 30;
        const isEquipped = equippedId === null;
        const rowLocalY = innerY + rowH / 2;
        const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          isEquipped ? C.verdant : C.steel, !isEquipped);
        const noneLbl = this.scene.add.text(COL_X + 14, rowLocalY, isEquipped ? '— no perk —  ✓' : '— no perk —', {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: isEquipped ? '#88ff88' : '#777788',
        }).setOrigin(0, 0.5);
        const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
        rowHit
          .on('pointerover', () => row.paint(true))
          .on('pointerout',  () => row.paint(false))
          .on('pointerdown', () => {
            if (!inView(rowLocalY)) return;
            PlayerData.equipPerk(elementId, null);
            rebuild();
          });
        scrollContainer.add([row.g, noneLbl, rowHit]);
        innerY += rowH + 2;
      }

      for (const perk of perks) {
        const unlocked = PlayerData.isPerkUnlocked(elementId, perk.id);
        const isEquipped = equippedId === perk.id;
        const alpha = unlocked ? 1 : 0.45;
        const rowH = 30;
        const rowLocalY = innerY + rowH / 2;

        const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          isEquipped ? C.verdant : C.arcane, !unlocked);
        const nameLbl = this.scene.add.text(COL_X + 14, rowLocalY,
          `${unlocked ? '' : '🔒 '}${perk.emoji} ${perk.name}${isEquipped ? '  ✓' : ''}`, {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: isEquipped ? '#88ff88' : (unlocked ? '#eecfff' : '#555566'),
          }).setOrigin(0, 0.5).setAlpha(alpha);
        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join(' + ');
        const recipeLbl = this.scene.add.text(COL_X + COL_W - 14, rowLocalY, recipeStr, {
          fontSize: '10px', color: unlocked ? '#886633' : '#332222',
        }).setOrigin(1, 0.5).setAlpha(alpha);
        scrollContainer.add([row.g, nameLbl, recipeLbl]);

        if (unlocked) {
          const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
          scrollContainer.add(rowHit);
          rowHit
            .on('pointerover', () => row.paint(true))
            .on('pointerout',  () => row.paint(false))
            .on('pointerdown', () => {
              if (!inView(rowLocalY)) return;
              PlayerData.equipPerk(elementId, isEquipped ? null : perk.id);
              rebuild();
            });
        }
        innerY += rowH + 2;
      }
    }
    innerY += 12;

    // ── UPGRADES ────────────────────────────────────────────────────
    sectionHdr('— UPGRADES —', '#66ccff');
    const upgrades = getElementUpgrades(elementId);
    if (upgrades.length === 0) {
      const noUpg = this.scene.add.text(cx, innerY + 8, 'This element has no shop upgrades.', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(noUpg);
      innerY += 30;
    } else {
      const ownedSlots = upgrades.filter((u) => PlayerData.isUpgradeOwned(elementId, u.slot));

      // All ON / All OFF quick buttons (only useful once something is owned)
      if (ownedSlots.length > 0) {
        const btnLocalY = innerY + 12;
        const mk = (label: string, x: number, turnOn: boolean) => {
          const b = this.scene.add.rectangle(x, btnLocalY, 84, 22, 0x222233, 0.95)
            .setStrokeStyle(1, 0x555577, 0.9).setInteractive({ useHandCursor: true });
          const l = this.scene.add.text(x, btnLocalY, label, {
            fontSize: '9px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#aaaacc',
          }).setOrigin(0.5);
          b.on('pointerover', () => b.setStrokeStyle(2, 0xffffff, 1))
            .on('pointerout',  () => b.setStrokeStyle(1, 0x555577, 0.9))
            .on('pointerdown', () => {
              if (!inView(btnLocalY)) return;
              for (const u of ownedSlots) {
                if (PlayerData.isUpgradeActive(elementId, u.slot) !== turnOn) {
                  PlayerData.toggleUpgrade(elementId, u.slot);
                }
              }
              rebuild();
            });
          scrollContainer.add([b, l]);
        };
        mk('ALL ON', COL_X + COL_W - 150, true);
        mk('ALL OFF', COL_X + COL_W - 56, false);
        innerY += 28;
      }

      for (const upg of upgrades) {
        const owned = PlayerData.isUpgradeOwned(elementId, upg.slot);
        const active = owned && PlayerData.isUpgradeActive(elementId, upg.slot);
        const rowH = 34;
        const rowLocalY = innerY + rowH / 2;

        const rowBg = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          active ? C.verdant : C.steel, !owned).g;
        const keyLbl = this.scene.add.text(COL_X + 14, rowLocalY, `[${upg.displayKey}+]`, {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: owned ? elemColor : '#444455',
        }).setOrigin(0, 0.5);
        const nameLbl = this.scene.add.text(COL_X + 78, rowLocalY, upg.name, {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: owned ? '#ddddee' : '#555566',
        }).setOrigin(0, 0.5);
        scrollContainer.add([rowBg, keyLbl, nameLbl]);

        if (!owned) {
          const buyLbl = this.scene.add.text(COL_X + COL_W - 14, rowLocalY, '🔒 Buy in Shop', {
            fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
          }).setOrigin(1, 0.5);
          scrollContainer.add(buyLbl);
        } else {
          const tglW = 70, tglH = 22;
          const tglX = COL_X + COL_W - 14 - tglW / 2;
          const tglBg = this.scene.add.rectangle(tglX, rowLocalY, tglW, tglH,
            active ? 0x225533 : 0x333344, 0.95)
            .setStrokeStyle(2, active ? 0x44cc66 : 0x555577, 0.9)
            .setInteractive({ useHandCursor: true });
          const tglLbl = this.scene.add.text(tglX, rowLocalY, active ? 'ON' : 'OFF', {
            fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: active ? '#88ff88' : '#8888aa',
          }).setOrigin(0.5);
          tglBg
            .on('pointerover', () => tglBg.setStrokeStyle(2, 0xffffff, 1))
            .on('pointerout',  () => tglBg.setStrokeStyle(2, active ? 0x44cc66 : 0x555577, 0.9))
            .on('pointerdown', () => {
              if (!inView(rowLocalY)) return;
              PlayerData.toggleUpgrade(elementId, upg.slot);
              rebuild();
            });
          scrollContainer.add([tglBg, tglLbl]);
        }
        innerY += rowH + 2;
      }
    }
    innerY += 12;

    // ── SKIN ────────────────────────────────────────────────────────
    sectionHdr('— SKIN —', '#ff88cc');
    const skins = getSkinsForElement(elementId);
    if (skins.length === 0) {
      const noSkins = this.scene.add.text(cx, innerY + 8, 'No skins for this element yet — earn them through achievements!', {
        fontSize: '10px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
      }).setOrigin(0.5);
      scrollContainer.add(noSkins);
      innerY += 30;
    } else {
      const equipped = PlayerData.getEquippedSkin(elementId);

      // "Default" row — the element's own character and colours.
      {
        const rowH = 28;
        const isEquipped = equipped === null;
        const rowLocalY = innerY + rowH / 2;
        const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          isEquipped ? C.verdant : C.steel, !isEquipped);
        const noneLbl = this.scene.add.text(COL_X + 14, rowLocalY, isEquipped ? '— default —  ✓' : '— default —', {
          fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: isEquipped ? '#88ff88' : '#777788',
        }).setOrigin(0, 0.5);
        const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
        rowHit
          .on('pointerover', () => row.paint(true))
          .on('pointerout',  () => row.paint(false))
          .on('pointerdown', () => {
            if (!inView(rowLocalY)) return;
            PlayerData.setEquippedSkin(elementId, null);
            rebuild();
          });
        scrollContainer.add([row.g, noneLbl, rowHit]);
        innerY += rowH + 2;
      }

      for (const skin of skins) {
        const unlocked = isSkinUnlocked(skin.id);
        const isEquipped = equipped === skin.id;
        const alpha = unlocked ? 1 : 0.45;

        const descText = this.scene.add.text(COL_X + 14, innerY + 22, skin.description, {
          fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: unlocked ? '#bbaacc' : '#555566',
          wordWrap: { width: COL_W - 28 },
        }).setAlpha(alpha);
        const rowH = 22 + descText.height + 10;
        const rowLocalY = innerY + rowH / 2;

        const row = this.overlayRow(cx, rowLocalY, COL_W, rowH - 4,
          isEquipped ? C.verdant : C.arcane, !unlocked);
        const nameLbl = this.scene.add.text(COL_X + 14, innerY + 11,
          `${unlocked ? '' : '🔒 '}${skin.name}${isEquipped ? '  ✓ EQUIPPED' : ''}`, {
            fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
            color: isEquipped ? '#88ff88' : (unlocked ? '#ffccee' : '#555566'),
          }).setOrigin(0, 0.5).setAlpha(alpha);
        scrollContainer.add([row.g, nameLbl, descText]);

        if (!unlocked) {
          const hintLbl = this.scene.add.text(COL_X + COL_W - 14, innerY + 11, `🏆 ${skinUnlockHint(skin.id)}`, {
            fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#665533',
          }).setOrigin(1, 0.5);
          scrollContainer.add(hintLbl);
        } else {
          const rowHit = this.overlayRowHit(cx, rowLocalY, COL_W, rowH - 4);
          scrollContainer.add(rowHit);
          rowHit
            .on('pointerover', () => row.paint(true))
            .on('pointerout',  () => row.paint(false))
            .on('pointerdown', () => {
              if (!inView(rowLocalY)) return;
              PlayerData.setEquippedSkin(elementId, isEquipped ? null : skin.id);
              rebuild();
            });
        }
        innerY += rowH + 2;
      }
      innerY += 8;
    }

    finishScroll();
  }

  /**
   * Quantum's bond builder, drawn into the customization page's scroll container.
   *
   * Two picks, one roster each time: the first half is anything that appears in a researched
   * pair, the second is filtered to that half's researched partners — so there is no way to
   * walk into a dead end. The first pick is the half you spawn as, which is why it is asked
   * for first rather than sorted out afterwards. Returns the new content height.
   */
  private renderBondBuilder(
    container: Phaser.GameObjects.Container,
    cx: number, colX: number, colW: number, startY: number,
    inView: (localY: number) => boolean,
    rebuild: () => void,
  ): number {
    let innerY = startY;
    const first = this.bondDraftFirst;
    const nameOf = (id: string) => ELEMENT_DATA_MAP[id]?.name ?? id;

    const prompt = this.scene.add.text(colX + 14, innerY, first
      ? `Pick the second half — paired with ${nameOf(first)}.`
      : 'Pick the first half. You start every fight as it; dodging collapses to the other.', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#9fdde6',
      wordWrap: { width: colW - 130 }, lineSpacing: 2,
    });
    container.add(prompt);

    // Cancel steps back one pick at a time — out of the second half to the first, out of the
    // first to the carried bond, which is never discarded until a new pair is complete.
    const cancelY = innerY + 10;
    const cancelBg = this.scene.add.rectangle(colX + colW - 14 - 46, cancelY, 92, 24, 0x2a1a1a, 0.95)
      .setStrokeStyle(2, 0x774444, 0.9).setInteractive({ useHandCursor: true });
    const cancelLbl = this.scene.add.text(colX + colW - 14 - 46, cancelY, first ? '◄ FIRST HALF' : '✕ CANCEL', {
      fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ddaaaa',
    }).setOrigin(0.5);
    cancelBg
      .on('pointerover', () => cancelBg.setStrokeStyle(2, 0xffffff, 1))
      .on('pointerout',  () => cancelBg.setStrokeStyle(2, 0x774444, 0.9))
      .on('pointerdown', () => {
        if (!inView(cancelY)) return;
        if (this.bondDraftFirst) this.bondDraftFirst = null;
        else this.bondEditing = false;
        rebuild();
      });
    container.add([cancelBg, cancelLbl]);
    innerY += Math.max(prompt.height, 24) + 14;

    const roster = allSelectableElements()
      .filter((e) => e.available && e.id !== 'quantum' && e.id !== 'dummy');

    const COLS = 4;
    const gap = 8;
    const chipW = (colW - (COLS - 1) * gap) / COLS;
    const chipH = 32;
    roster.forEach((el, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const bx = colX + col * (chipW + gap) + chipW / 2;
      const by = innerY + row * (chipH + gap) + chipH / 2;
      // Greyed rather than hidden: seeing which elements you cannot pair yet is the whole
      // reason to walk down to the Entanglement Lab.
      const allowed = this.isBondPartnerAllowed(el.id) && el.id !== first;

      const plate = this.scene.add.rectangle(bx, by, chipW, chipH, allowed ? 0x122029 : 0x15151c, 0.95)
        .setStrokeStyle(2, allowed ? el.color : 0x333344, allowed ? 0.8 : 0.6);
      const lbl = this.scene.add.text(bx, by, `${el.emoji} ${el.name.toUpperCase()}`, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: allowed ? '#ddeeff' : '#444455',
      }).setOrigin(0.5);
      container.add([plate, lbl]);

      if (!allowed) return;
      const hit = this.scene.add.rectangle(bx, by, chipW, chipH, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      hit
        .on('pointerover', () => plate.setStrokeStyle(2, 0xffffff, 1))
        .on('pointerout',  () => plate.setStrokeStyle(2, el.color, 0.8))
        .on('pointerdown', () => {
          if (!inView(by)) return;
          Sfx.play('ui-equip');
          if (!this.bondDraftFirst) {
            this.bondDraftFirst = el.id;
          } else {
            PlayerData.setQuantumBond(this.bondDraftFirst, el.id);
            this.customizeHalf = this.bondDraftFirst;
            this.bondDraftFirst = null;
            this.bondEditing = false;
            this.customizeScrollY = 0;
          }
          rebuild();
        });
      container.add(hit);
    });
    innerY += Math.ceil(roster.length / COLS) * (chipH + gap) + 6;

    const footer = this.scene.add.text(cx, innerY, 'Greyed-out elements have no researched pair yet — research bonds in the Lab ▸ Entanglement Lab.', {
      fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
    }).setOrigin(0.5, 0);
    container.add(footer);
    innerY += footer.height + 12;

    return innerY;
  }

  showPerkDictionary(width: number, height: number, cx: number): void {
    this.closeElementInfo(); // reuse the same overlay list

    const ELEM_EMOJI: Record<string, string> = {
      fire: '🔥', water: '💧', life: '🌿', air: '💨', earth: '🪨',
      electricity: '⚡', slime: '🟢', fate: '🃏', sound: '🔊', light: '✨',
    };

    const SCROLL_TOP = 104;
    const SCROLL_BOT = height - 52;
    const SCROLL_H = SCROLL_BOT - SCROLL_TOP;

    const bg = this.scene.add.rectangle(cx, height / 2, width, height, 0x04040c, 0.97)
      .setDepth(50).setInteractive();
    this.infoOverlayObjects.push(bg);

    const header = this.scene.add.text(cx, 36, '📖  PERK DICTIONARY', {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#cc88ff',
      stroke: '#440088', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(55);
    this.infoOverlayObjects.push(header);

    const subHdr = this.scene.add.text(cx, 70, '— craft perks in the Lab to equip them on your element —', {
      fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#555577',
    }).setOrigin(0.5).setDepth(55);
    this.infoOverlayObjects.push(subHdr);

    const divider = this.scene.add.graphics().setDepth(55);
    divider.lineStyle(2, C.arcane, 0.45);
    divider.beginPath(); divider.moveTo(40, 90); divider.lineTo(width - 40, 90); divider.strokePath();
    fillDiamond(divider, width / 2, 90, 4, mix(C.arcane, 0xffffff, 0.4), 0.9);
    this.infoOverlayObjects.push(divider);

    // ── Scrollable container ──
    const scrollContainer = this.scene.add.container(0, SCROLL_TOP).setDepth(51);
    this.infoOverlayObjects.push(scrollContainer);

    const maskGfx = this.scene.add.graphics();
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(0, SCROLL_TOP, width, SCROLL_H);
    const mask = maskGfx.createGeometryMask();
    scrollContainer.setMask(mask);
    this.infoOverlayObjects.push(maskGfx);

    const COL_X = 40;
    const COL_W = width - 80;
    const NAME_Y  = 10;
    const DESC_Y  = 28;
    const ROW_PAD = 10;
    let innerY = 8;

    const tiers: Array<'triple' | 'abstract-triple' | 'quad' | 'penta'> = ['triple', 'abstract-triple', 'quad', 'penta'];
    for (const tier of tiers) {
      const allTierPerks = ALL_PERKS.flatMap((ep) => ep.perks.filter((p) => p.tier === tier));
      if (allTierPerks.length === 0) continue;

      const tierLabel = tier === 'triple'
        ? '— TRIPLE PERKS  (Lab Level 2 · 2 ⚛️) —'
        : tier === 'abstract-triple'
          ? '— ABSTRACT PERKS  (Lab Level 2 · 4 ⚛️) —'
          : tier === 'quad'
            ? '— QUAD PERKS  (Lab Level 3 · 5 ⚛️) —'
            : '— PENTA PERKS  (Penta Synthesis · 10 ⚛️) —';
      const tierColor = tier === 'penta' ? '#cc88ff' : (tier === 'quad' ? '#ffaa44' : (tier === 'abstract-triple' ? '#cc66ff' : '#44aaff'));

      const tierHdr = this.scene.add.text(cx, innerY, tierLabel, {
        fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: tierColor,
      }).setOrigin(0.5);
      scrollContainer.add(tierHdr);
      innerY += 20;

      for (const perk of allTierPerks) {
        const unlocked = PlayerData.isPerkUnlocked(perk.elementId, perk.id);
        const equipped  = PlayerData.getEquippedPerk(perk.elementId) === perk.id;
        const alpha = unlocked ? 1.0 : 0.35;

        const rowBgFill = 0;
        const rowBgStroke = tier === 'penta' ? C.corrupt
          : tier === 'quad' ? C.gold
          : tier === 'abstract-triple' ? C.arcane
          : C.frost;

        const descText = this.scene.add.text(COL_X + 10, innerY + DESC_Y, perk.description, {
          fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
          color: unlocked ? '#888899' : '#444455',
          wordWrap: { width: COL_W - 20 },
        }).setAlpha(alpha);

        const rowH = DESC_Y + descText.height + ROW_PAD;

        const rowBg = this.overlayRow(cx, innerY + rowH / 2, COL_W, rowH - 2, rowBgStroke, !unlocked).g;
        void rowBgFill;

        const nameText = this.scene.add.text(COL_X + 10, innerY + NAME_Y, `${perk.emoji} ${perk.name}`, {
          fontSize: '13px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
          color: unlocked ? '#ffffff' : '#555566',
        }).setAlpha(alpha);

        const recipeStr = perk.ingredients.map((r) => ELEM_EMOJI[r] ?? r).join(' + ');
        const recipeText = this.scene.add.text(COL_X + COL_W - 8, innerY + NAME_Y, recipeStr, {
          fontSize: '11px', color: unlocked ? '#886633' : '#332222',
        }).setOrigin(1, 0).setAlpha(alpha);

        scrollContainer.add([rowBg, nameText, recipeText, descText]);

        if (equipped) {
          const eqLbl = this.scene.add.text(COL_X + 10 + nameText.width + 6, innerY + NAME_Y + 1, '✓', {
            fontSize: '11px', fontFamily: 'Arial', color: '#88ff88',
          });
          scrollContainer.add(eqLbl);
        } else if (!unlocked) {
          const lockLbl = this.scene.add.text(COL_X + 10 + nameText.width + 6, innerY + NAME_Y + 1, '🔒', {
            fontSize: '10px',
          });
          scrollContainer.add(lockLbl);
        }

        innerY += rowH + 3;
      }

      innerY += 14;
    }

    // ── Scroll logic ──
    const totalContentH = innerY;
    let scrollY = 0;
    const maxScroll = Math.max(0, totalContentH - SCROLL_H);

    const doScroll = (delta: number) => {
      scrollY = Phaser.Math.Clamp(scrollY + delta, 0, maxScroll);
      scrollContainer.setY(SCROLL_TOP - scrollY);
    };

    this.infoScrollHandler = (_ptr: unknown, _over: unknown, _dx: unknown, deltaY: unknown) => {
      doScroll((deltaY as number) * 0.5);
    };
    this.scene.input.on('wheel', this.infoScrollHandler);

    if (maxScroll > 0) {
      const hint = this.scene.add.text(width - 12, SCROLL_BOT - 4, '▼ scroll', {
        fontSize: '9px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#444466',
      }).setOrigin(1, 1).setDepth(55);
      this.infoOverlayObjects.push(hint);
    }

    // Back button
    this.infoOverlayObjects.push(addButton(this.scene, {
      x: 66, y: 32, w: 100, h: 32,
      label: 'BACK', icon: '◄', fontSize: 12, variant: 'quiet', accent: C.arcane,
      depth: 56, cut: 8,
      onClick: () => this.closeElementInfo(),
    }).container);
  }

  private isBondPartnerAllowed(id: string): boolean {
    if (id === 'quantum' || id === 'dummy') return false;
    if (this.bondDraftFirst) return PlayerData.isBondResearched(this.bondDraftFirst, id);
    // A cheat profile is granted every pair without any of them being stored (see
    // `PlayerData.isBondResearched`), so reading the saved list alone would leave it with two
    // pickable first halves and a wide-open second roster — ask the same question the second
    // pick asks. The carried bond is included for the same reason it is in `BondPicker`: a pair
    // equipped from a fuller roster must not become unpickable here.
    if (isCheatMode()) return true;
    const carried = PlayerData.getQuantumBond();
    const researched = [
      PlayerData.bondKey(PlayerData.STARTER_BOND[0], PlayerData.STARTER_BOND[1]),
      ...(carried ? [PlayerData.bondKey(carried[0], carried[1])] : []),
      ...PlayerData.getResearchedBonds(),
    ];
    return researched.some((key) => key.split('+').includes(id));
  }

}
