import Phaser from 'phaser';
import {
  HuskVariantDef,
  HUSK_FAMILIES,
  ELEMENTAL_HUSK_VARIANTS,
  BASIC_HUSK,
  CORRUPT_KIN,
  BOSS_FAMILIES,
  BOSS_HUSK_VARIANTS,
  BOSS_MINIONS,
  huskTextureKey,
} from './HuskVariants';
import * as PlayerData from '../data/PlayerData';
import { Sfx } from '../audio';

/**
 * The Naturalist's Journal — the leather book on the table in the Study.
 *
 * It writes itself, and only in blood: a husk family appears in these pages the
 * first time *you* put one down. Kill a Fire Husk and page one fills in; you
 * will not learn what a Fire Husk III does until you have killed one of those
 * too, so the book doubles as a record of how far into the house you have been.
 *
 * The unlock list lives in the save (`PlayerData.huskJournal`), keyed by variant
 * id, so it carries across runs — the journal is the one thing you take with
 * you out of the mansion.
 */

/** What an element's brand actually does on the field, in the book's own voice. */
const HUSK_TRICKS: Record<string, string> = {
  fire: 'Its bite sets the wound alight. The burning outlasts the bite by some seconds.',
  water: 'Leaves a spreading pool wherever it stands. Standing in it costs blood.',
  life: 'Will not close with you. Pulses a green light that knits its neighbours back together.',
  air: 'Twice as fast as it has any right to be, and half as solid. Kill it before it reaches you.',
  earth: 'Slabbed over in stone. Takes a fifth less from every blow and hits like a falling wall.',
  oil: 'Trails a black slick behind it. Anything caught in it wades rather than walks.',
  shadow: 'Will not be closed with. Blinks the distance shut the moment you back away.',
  ice: 'Its bite leaves the limbs cold and slow for a good while after.',
  growth: 'Dies into two smaller copies of itself. The buds are hollow and pay nothing.',
  crystal: 'Bursts on death into a ring of shards. Do not be standing over it.',
  soul: 'Rises once more out of its own corpse, thinner and paler, and comes on again.',
  hunt: 'Marks a lane, holds a beat, then runs it down at four times its walking pace.',
  sand: 'Every few seconds it quickens every husk in the room. Kill the hourglass first.',
  gravity: 'Two dark stones orbit it. Being clipped by one hurts more than the bite.',
  creation: 'Forges a shield onto whichever of its neighbours is standing nearest.',
  electricity: 'Holds its distance and throws sparks. Closing on it is the whole answer.',
  slime: 'Bites acid into you, and dies into a caustic puddle that eats at the floor.',
  fate: 'Two bites in five land for far more than they should. There is no telling which.',
  sound: 'Stands well back and keeps up a shrilling. Harmless if you reach it.',
  light: 'Charges in a straight bright line. It commits the moment it starts.',
  magnet: 'Three iron beads run rings around it and take a toll off anything they touch.',
  metal: 'Plated. It shrugs off a third of everything and moves like a door.',
  plasma: 'Its bite burns cold, and it goes off like a bottle when it dies.',
  gunpowder: 'It is a bomb that walks. Killing it near its friends is how you use it.',
  rubber: 'Bites, then flings itself back out of your reach before you can answer.',
  magic: 'Kites, throws, and blinks away the instant you get inside its range.',
  technology: 'Stands the furthest back of anything in the house and never stops shooting.',
  silence: 'Nearly invisible until it is within two paces of you. Watch the floor.',
  echo: 'Splits on death into two half-real echoes of itself. They fade; they still bite.',
  subterfuge: 'Wears a plain husk\'s face until you are close. Then it is very fast indeed.',
  chalk: 'Hangs back and redraws its neighbours\' wounds closed.',
  magma: 'Lays burning ground behind it and cooks whatever it bites.',
  illusion: 'Arrives with two lookalikes. Only one of the three is worth a shard.',
  depths: 'Lobs pressure at you, and each shot bursts into a tidepool where it lands.',
  ruin: 'Hardens every second it survives. A ruin husk left alone becomes unkillable.',
  dune: 'Burrows under the floor and comes up beside you in a spray of grit.',
  conquest: 'Raises a banner. Every husk under it hits appreciably harder.',
  passion: 'Picks one of its fellows and makes it faster and angrier than it should be.',
  paper: 'Very fast, very thin, and always at range. One good hit ends it.',
  death: 'Drinks what it takes. Every bite it lands is a bite it heals.',
  fortune: 'Slips out of the way of about a third of your hits — and pays double when pinned.',
  marrow: 'Grows with every bite it lands. Do not let it eat.',
  psychic: 'Its orbs turn to follow you. Running is not an answer; cover is.',
  radiation: 'Everything inside a wide ring around it is being cooked, bite or no bite.',
  bind: 'Throws a chain and shackles you where you stand for a second or so.',
  gum: 'Trails a thick green mire. Crossing one costs you most of your speed.',
  gluttony: 'Eats any corpse that falls near it and grows off the meal.',
};

/** What the tenth wave sends, and how the book says you live through it. */
const BOSS_TRICKS: Record<string, string> = {
  arbiter: 'It has already decided, and it walks you down while it reads. Gavels drop on the floor you '
    + 'are standing on — later ones lead you, so stop moving in a straight line. The Verdict fills the '
    + 'room outward from where it stands: the answer is to be behind it, not away from it. '
    + 'It chains you in place for contempt, and at its worst it calls in bailiffs to hold you still.',
  dreamer: 'It never comes near you. Its orbs turn to follow, so cover beats running; its lullaby is a '
    + 'slow ring you can simply be outside of, and being caught costs your legs rather than your blood. '
    + 'The wisps it dreams up are fast and hollow and pay nothing — ignore them and stay on the singer. '
    + 'Late on it sleepwalks across the room and leaves the bed it was in burning.',
  paradox: 'Every outcome at once. It scatters orbs in every direction rather than at you, so the safe '
    + 'ground is the gap between them. It collapses onto you out of nowhere with a blast you get about '
    + 'half a second of warning for. It forks off echoes of decisions it did not take, and at its worst '
    + 'it superimposes itself onto one of its own — untouchable until you take that one apart.',
};

/** The three tier names the book uses, and what a tier means. */
const TIER_LABEL = ['I', 'II', 'III'];

export interface JournalEntry {
  key: string;
  name: string;
  emoji: string;
  color: number;
  /** Variant ids that fill this entry — one per tier for a family, one for singletons. */
  variants: HuskVariantDef[];
  /** Book chapter heading. */
  chapter: string;
  trick: string;
}

function buildEntries(): JournalEntry[] {
  const out: JournalEntry[] = [];
  out.push({
    key: 'basic', name: 'Husk', emoji: '🧟', color: BASIC_HUSK.color,
    variants: [BASIC_HUSK], chapter: 'THE COMMON DEAD',
    trick: 'Walks at you and bites. There is nothing else to it, and there are always more.',
  });
  for (const f of HUSK_FAMILIES) {
    out.push({
      key: f.elementId,
      name: f.name,
      emoji: f.emoji,
      color: f.color,
      variants: ELEMENTAL_HUSK_VARIANTS.filter((v) => v.elementId === f.elementId),
      chapter: f.category === 'normal' ? 'STRUCK BY ORDINARY LIGHTNING'
        : f.category === 'abstract' ? 'STRUCK BY ABSTRACT LIGHTNING'
          : 'STRUCK BY CORRUPT LIGHTNING',
      trick: HUSK_TRICKS[f.elementId] ?? 'Observed, but not yet understood.',
    });
  }
  for (const f of BOSS_FAMILIES) {
    out.push({
      key: `boss-${f.kind}`,
      name: f.name,
      emoji: f.emoji,
      color: f.color,
      variants: BOSS_HUSK_VARIANTS.filter((v) => v.bossKind === f.kind),
      chapter: 'THE TENTH WAVE',
      trick: BOSS_TRICKS[f.kind],
    });
  }
  // Only the bailiff can ever be written up: the Dreamer's wisps and the
  // Paradox's echoes pay nothing and record nothing, so listing them here would
  // put two specimens in the book that no kill can ever fill in.
  const bailiff = BOSS_MINIONS.find((v) => v.id === 'boss-bailiff');
  if (bailiff) {
    out.push({
      key: 'boss-court', name: bailiff.name, emoji: '⚖️', color: bailiff.color,
      variants: [bailiff], chapter: 'THE TENTH WAVE',
      trick: 'Called in by the Arbiter to hold you still for it. A real husk, and it dies like one. '
        + 'The other two bosses call for things that are not really there — the Dreamer\'s wisps and '
        + 'the Paradox\'s echoes leave no body to write up and no shard to collect.',
    });
  }
  out.push({
    key: 'corrupt-kin', name: CORRUPT_KIN.name, emoji: '👁️', color: 0x8a1030,
    variants: [CORRUPT_KIN], chapter: 'THE CORRUPTION',
    trick: 'Grown, not raised. It waits without moving in a corrupted room and mauls whatever walks in. '
      + 'Killing every one standing in a room is the only thing that puts the corruption back.',
  });
  return out;
}

export const JOURNAL_ENTRIES: JournalEntry[] = buildEntries();

/** Every id the book can ever hold — the denominator on the completion counter. */
const ALL_JOURNAL_IDS: string[] = JOURNAL_ENTRIES.flatMap((e) => e.variants.map((v) => v.id));

export function journalTotals(): { known: number; total: number } {
  const known = new Set(PlayerData.getHuskJournal());
  return {
    known: ALL_JOURNAL_IDS.filter((id) => known.has(id)).length,
    total: ALL_JOURNAL_IDS.length,
  };
}

const ROWS_PER_PAGE = 13;
const DEPTH = 62;

/**
 * The book itself, opened on the Study table. Built lazily on first open and
 * torn all the way down on close, so a run that never reads it pays nothing.
 */
export class JournalBook {
  private open = false;
  private page = 0;
  private selected = 0;
  /** Which tier of the selected family the right-hand page is showing. */
  private tierTab = 0;
  private objs: Phaser.GameObjects.GameObject[] = [];
  /** Rebuilt on every repaint; kept apart so the backdrop can persist. */
  private pageObjs: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene) {}

  get isOpen(): boolean { return this.open; }

  toggle(): void {
    if (this.open) this.close(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    Sfx.play('ui-open');
    const { width, height } = this.scene.scale;

    // Backdrop — also the click-eater, so nothing behind the book reacts.
    const dim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x05030a, 0.86)
      .setDepth(DEPTH).setInteractive();
    dim.on('pointerdown', () => { /* swallowed */ });
    this.objs.push(dim);

    // The open book: two leaves of foxed vellum in a cracked leather binding.
    const bw = width - 72, bh = height - 76;
    const bx = width / 2, by = height / 2;
    const g = this.scene.add.graphics().setDepth(DEPTH + 1);
    g.fillStyle(0x2a1a10, 1);
    g.fillRoundedRect(bx - bw / 2 - 10, by - bh / 2 - 10, bw + 20, bh + 20, 10);
    g.lineStyle(3, 0x120a06, 1);
    g.strokeRoundedRect(bx - bw / 2 - 10, by - bh / 2 - 10, bw + 20, bh + 20, 10);
    for (const side of [-1, 1] as const) {
      const px = bx + side * (bw / 4 + 4);
      g.fillStyle(0xe4d7b4, 1);
      g.fillRect(px - bw / 4, by - bh / 2, bw / 2 - 6, bh);
      g.fillStyle(0xd2c199, 0.5);
      g.fillRect(px - bw / 4, by + bh / 2 - 16, bw / 2 - 6, 16);
      g.lineStyle(1, 0xa89468, 0.8);
      g.strokeRect(px - bw / 4, by - bh / 2, bw / 2 - 6, bh);
    }
    // Foxing — age spots, deterministic so the book looks the same each time.
    let seed = 4242;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    g.fillStyle(0xb9a578, 0.28);
    for (let i = 0; i < 60; i++) {
      g.fillEllipse(bx - bw / 2 + rnd() * bw, by - bh / 2 + rnd() * bh, 4 + rnd() * 14, 3 + rnd() * 9);
    }
    // The spine and its stitching.
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(bx - 8, by - bh / 2, 16, bh);
    g.lineStyle(1, 0x6a4a2a, 1);
    for (let y = by - bh / 2 + 12; y < by + bh / 2; y += 22) g.lineBetween(bx - 5, y, bx + 5, y);
    this.objs.push(g);

    const totals = journalTotals();
    this.objs.push(this.scene.add.text(bx, by - bh / 2 + 16, '📓  A NATURALIST\'S JOURNAL OF THE DEAD', {
      fontSize: '17px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#3a2a16',
    }).setOrigin(0.5).setDepth(DEPTH + 2));
    this.objs.push(this.scene.add.text(bx, by - bh / 2 + 36,
      `${totals.known} of ${totals.total} specimens entered  —  a husk is written down the first time you kill one`, {
        fontSize: '11px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#6a5436',
      }).setOrigin(0.5).setDepth(DEPTH + 2));

    // Close button.
    const close = this.scene.add.text(bx + bw / 2 - 14, by - bh / 2 + 14, '✕', {
      fontSize: '20px', fontFamily: '"Arial Black", sans-serif', color: '#7a2a22',
    }).setOrigin(0.5).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setColor('#cc4433'));
    close.on('pointerout', () => close.setColor('#7a2a22'));
    close.on('pointerdown', () => this.close());
    this.objs.push(close);

    // Jump straight to the first specimen you actually have.
    const known = new Set(PlayerData.getHuskJournal());
    const first = JOURNAL_ENTRIES.findIndex((e) => e.variants.some((v) => known.has(v.id)));
    if (first >= 0) { this.selected = first; this.page = Math.floor(first / ROWS_PER_PAGE); }

    this.repaint();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    Sfx.play('ui-close');
    this.clearPage();
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  /** Scene teardown — no sound, no ceremony. */
  destroy(): void {
    this.open = false;
    this.clearPage();
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  private clearPage(): void {
    for (const o of this.pageObjs) o.destroy();
    this.pageObjs = [];
  }

  private repaint(): void {
    this.clearPage();
    const { width, height } = this.scene.scale;
    const bw = width - 72, bh = height - 76;
    const bx = width / 2, by = height / 2;
    const known = new Set(PlayerData.getHuskJournal());

    this.paintIndex(bx - bw / 4 - 4, by - bh / 2 + 60, bw / 2 - 34, known);
    this.paintDetail(bx + bw / 4 + 4, by - bh / 2 + 58, bw / 2 - 34, bh - 90, known);
  }

  // ── Left leaf: the index ──────────────────────────────────────────

  private paintIndex(cx: number, top: number, colW: number, known: Set<string>): void {
    const pages = Math.ceil(JOURNAL_ENTRIES.length / ROWS_PER_PAGE);
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    const start = this.page * ROWS_PER_PAGE;
    const slice = JOURNAL_ENTRIES.slice(start, start + ROWS_PER_PAGE);

    let lastChapter = '';
    let y = top;
    for (let i = 0; i < slice.length; i++) {
      const entry = slice[i];
      const idx = start + i;
      const anyKnown = entry.variants.some((v) => known.has(v.id));
      if (entry.chapter !== lastChapter) {
        lastChapter = entry.chapter;
        this.pageObjs.push(this.scene.add.text(cx - colW / 2 + 6, y - 11, entry.chapter, {
          fontSize: '9px', fontFamily: '"Arial Black", sans-serif', color: '#8a6a3a',
        }).setDepth(DEPTH + 2));
      }

      const row = this.scene.add.rectangle(cx, y + 8, colW, 26,
        idx === this.selected ? 0xc9b485 : 0x000000, idx === this.selected ? 0.6 : 0.001)
        .setDepth(DEPTH + 2).setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        if (this.selected === idx) return;
        this.selected = idx;
        this.tierTab = 0;
        Sfx.play('ui-page');
        this.repaint();
      });
      this.pageObjs.push(row);

      const label = anyKnown ? `${entry.emoji}  ${entry.name}` : '❔  ? ? ?';
      this.pageObjs.push(this.scene.add.text(cx - colW / 2 + 10, y + 8, label, {
        fontSize: '13px', fontFamily: 'Georgia, "Times New Roman", serif',
        color: anyKnown ? '#2e2013' : '#9a8a6c',
      }).setOrigin(0, 0.5).setDepth(DEPTH + 3));

      // Tier pips — a filled square per tier already entered.
      if (entry.variants.length > 1) {
        for (let t = 0; t < entry.variants.length; t++) {
          const got = known.has(entry.variants[t].id);
          this.pageObjs.push(this.scene.add.text(cx + colW / 2 - 46 + t * 15, y + 8, got ? '◼' : '◻', {
            fontSize: '11px', fontFamily: 'monospace', color: got ? '#6a3a1a' : '#b3a17c',
          }).setOrigin(0.5).setDepth(DEPTH + 3));
        }
      }
      y += 27;
    }

    // Pager.
    const py = top + ROWS_PER_PAGE * 27 + 16;
    const mkArrow = (dx: number, glyph: string, delta: number): void => {
      const a = this.scene.add.text(cx + dx, py, glyph, {
        fontSize: '18px', fontFamily: '"Arial Black", sans-serif', color: '#6a4a2a',
      }).setOrigin(0.5).setDepth(DEPTH + 3).setInteractive({ useHandCursor: true });
      a.on('pointerover', () => a.setColor('#a06a2a'));
      a.on('pointerout', () => a.setColor('#6a4a2a'));
      a.on('pointerdown', () => {
        this.page = Phaser.Math.Clamp(this.page + delta, 0, pages - 1);
        Sfx.play('ui-page');
        this.repaint();
      });
      this.pageObjs.push(a);
    };
    mkArrow(-60, '◀', -1);
    mkArrow(60, '▶', 1);
    this.pageObjs.push(this.scene.add.text(cx, py, `${this.page + 1} / ${pages}`, {
      fontSize: '12px', fontFamily: 'Georgia, serif', color: '#5a4630',
    }).setOrigin(0.5).setDepth(DEPTH + 3));
  }

  // ── Right leaf: the specimen ──────────────────────────────────────

  private paintDetail(cx: number, top: number, colW: number, colH: number, known: Set<string>): void {
    const entry = JOURNAL_ENTRIES[this.selected];
    if (!entry) return;
    const tiers = entry.variants;
    this.tierTab = Phaser.Math.Clamp(this.tierTab, 0, tiers.length - 1);
    const variant = tiers[this.tierTab];
    const seen = known.has(variant.id);
    const anySeen = tiers.some((v) => known.has(v.id));

    // Portrait plate: a ruled box with the specimen pinned in the middle.
    const plateY = top + 70;
    const plate = this.scene.add.graphics().setDepth(DEPTH + 2);
    plate.fillStyle(0x1a1208, seen ? 0.5 : 0.72);
    plate.fillRoundedRect(cx - 74, plateY - 62, 148, 124, 6);
    plate.lineStyle(2, 0x6a4a2a, 1);
    plate.strokeRoundedRect(cx - 74, plateY - 62, 148, 124, 6);
    this.pageObjs.push(plate);

    if (seen) {
      const img = this.scene.add.image(cx, plateY, huskTextureKey(variant))
        .setDepth(DEPTH + 3).setScale(1.9 * variant.sizeMult);
      this.pageObjs.push(img);
      this.scene.tweens.add({ targets: img, y: plateY - 5, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.pageObjs.push(this.scene.add.text(cx, plateY, '?', {
        fontSize: '64px', fontFamily: '"Arial Black", sans-serif', color: '#4a3a24',
      }).setOrigin(0.5).setDepth(DEPTH + 3));
    }

    // Name + chapter.
    this.pageObjs.push(this.scene.add.text(cx, top + 146, anySeen ? variant.name : 'UNRECORDED SPECIMEN', {
      fontSize: '19px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: anySeen ? '#3a2410' : '#7a6a50',
    }).setOrigin(0.5).setDepth(DEPTH + 3));
    this.pageObjs.push(this.scene.add.text(cx, top + 166, entry.chapter, {
      fontSize: '10px', fontFamily: '"Arial Black", sans-serif', color: '#8a6a3a',
    }).setOrigin(0.5).setDepth(DEPTH + 3));

    // Tier tabs.
    if (tiers.length > 1) {
      for (let t = 0; t < tiers.length; t++) {
        const tx = cx - 46 + t * 46;
        const got = known.has(tiers[t].id);
        const tab = this.scene.add.rectangle(tx, top + 192, 40, 22,
          t === this.tierTab ? 0x6a4a2a : 0x000000, t === this.tierTab ? 0.75 : 0.12)
          .setDepth(DEPTH + 3).setStrokeStyle(1, 0x6a4a2a).setInteractive({ useHandCursor: true });
        tab.on('pointerdown', () => { this.tierTab = t; Sfx.play('ui-tab'); this.repaint(); });
        this.pageObjs.push(tab);
        this.pageObjs.push(this.scene.add.text(tx, top + 192, got ? TIER_LABEL[t] : '—', {
          fontSize: '12px', fontFamily: '"Arial Black", sans-serif',
          color: t === this.tierTab ? '#f0e2c0' : got ? '#4a3418' : '#a09070',
        }).setOrigin(0.5).setDepth(DEPTH + 4));
      }
    }

    // Field notes.
    let y = top + 226;
    if (!seen) {
      this.pageObjs.push(this.scene.add.text(cx, y + 40,
        anySeen
          ? 'You have met this family, but never one of this size.\nKill one and the page will fill itself in.'
          : 'Nothing is written here.\nThe book records a husk the first time you kill it.', {
          fontSize: '13px', fontFamily: 'Georgia, serif', color: '#7a6a50', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5).setDepth(DEPTH + 3));
      return;
    }

    const stat = (label: string, value: string, bar: number, color: string): void => {
      this.pageObjs.push(this.scene.add.text(cx - colW / 2 + 14, y, label, {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#6a5436',
      }).setOrigin(0, 0.5).setDepth(DEPTH + 3));
      this.pageObjs.push(this.scene.add.text(cx + colW / 2 - 14, y, value, {
        fontSize: '11px', fontFamily: 'monospace', color: '#3a2a16',
      }).setOrigin(1, 0.5).setDepth(DEPTH + 3));
      const gb = this.scene.add.graphics().setDepth(DEPTH + 3);
      const bx0 = cx - colW / 2 + 108, bw0 = colW - 190;
      gb.fillStyle(0x000000, 0.14);
      gb.fillRect(bx0, y - 4, bw0, 8);
      gb.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 0.9);
      gb.fillRect(bx0, y - 4, bw0 * Phaser.Math.Clamp(bar, 0.04, 1), 8);
      this.pageObjs.push(gb);
      y += 22;
    };

    stat('HEALTH', `×${variant.hpMult.toFixed(2)}`, variant.hpMult / 12, '#88cc44');
    stat('SPEED', `×${variant.speedMult.toFixed(2)}`, variant.speedMult / 2.4, '#66ccff');
    stat('BITE', `×${variant.damageMult.toFixed(2)}`, variant.damageMult / 4, '#ff6644');
    stat('SIZE', `×${variant.sizeMult.toFixed(2)}`, variant.sizeMult / 2, '#cc88ff');

    y += 6;
    const behaviour: Record<string, string> = {
      melee: 'Walks in and bites.',
      ranged: `Holds ${variant.preferredRange ?? 270}px and shoots.`,
      medic: 'Hangs back and heals its fellows.',
      charger: 'Telegraphs a lane, then charges it.',
      titan: 'Wades in and summons its dead.',
      ranger: 'Alternates a shotgun fan and a burst.',
      demon: 'Possesses another husk and rides it.',
    };
    this.pageObjs.push(this.scene.add.text(cx - colW / 2 + 14, y, `HABIT — ${behaviour[variant.behavior] ?? ''}`, {
      fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#6a5436',
      wordWrap: { width: colW - 28 },
    }).setDepth(DEPTH + 3));
    y += 26;

    if (variant.explodes) {
      this.pageObjs.push(this.scene.add.text(cx - colW / 2 + 14, y, '⚠ DETONATES ON DEATH', {
        fontSize: '11px', fontFamily: '"Arial Black", sans-serif', color: '#a03018',
      }).setDepth(DEPTH + 3));
      y += 22;
    }

    this.pageObjs.push(this.scene.add.text(cx - colW / 2 + 14, y, entry.trick, {
      fontSize: '13px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#2e2013',
      wordWrap: { width: colW - 28 }, lineSpacing: 5,
    }).setDepth(DEPTH + 3));

    void colH;
  }
}
