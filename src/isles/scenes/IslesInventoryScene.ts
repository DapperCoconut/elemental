import { baseIdOf, darkIdOf } from '../content/unrest/darkMarket';
import Phaser from 'phaser';
import { Sfx } from '../../audio';
import { allSelectableElements } from '../../data/ElementRoster';
import * as Save from '../IslesSave';
import { MAX_CHARMS } from '../IslesSave';
import {
  getIsleItem, allCourts, allFish, getRod, ISLES, getGeneTree, PINNACLE, routeOpen, councilSeatCount, benchSeats, allAreas, getEncounter, courtChampions,
} from '../IslesRegistry';
import type { IsleItemDef } from '../IslesTypes';
import { LedgerPanel, Row, itemDetail } from '../world/Counters';

/**
 * The bag, over the paused world: charms (three worn), the artifact, the meal for the next fight,
 * rods, the catch, the fish log, the courts journal, and which element you are.
 */
export class IslesInventoryScene extends Phaser.Scene {
  private panel!: LedgerPanel;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private startElement = '';

  constructor() { super({ key: 'IslesInventoryScene' }); }

  create(): void {
    this.startElement = Save.S().element;
    this.panel = new LedgerPanel(this);
    this.keys = this.input.keyboard!.addKeys('W,S,A,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,ESC,TAB,Q,I') as Record<string, Phaser.Input.Keyboard.Key>;
    this.panel.open('YOUR BAG', [
      { label: 'CHARMS', rows: () => this.charmRows() },
      { label: 'ARTIFACTS', rows: () => this.artifactRows() },
      { label: 'PANTRY', rows: () => this.pantryRows() },
      { label: 'GEAR', rows: () => this.gearRows() },
      { label: 'FISH LOG', rows: () => this.logRows() },
      { label: 'JOURNAL', rows: () => this.journalRows() },
      { label: 'ELEMENT', rows: () => this.elementRows() },
    ], 0xffa050, () => this.close());
  }

  update(): void {
    const k = this.keys, JD = Phaser.Input.Keyboard.JustDown;
    if (JD(k.W) || JD(k.UP)) this.panel.key('up');
    if (JD(k.S) || JD(k.DOWN)) this.panel.key('down');
    if (JD(k.A) || JD(k.LEFT)) this.panel.key('left');
    if (JD(k.D) || JD(k.RIGHT) || JD(k.TAB)) this.panel.key('right');
    if (JD(k.E) || JD(k.SPACE) || JD(k.ENTER)) this.panel.key('act');
    if (JD(k.ESC) || JD(k.Q) || JD(k.I)) this.panel.key('back');
    this.panel.update();
  }

  private close(): void {
    const s = Save.S();
    if (s.element !== this.startElement) {
      this.scene.stop('IsleWorldScene');
      this.scene.start('IsleWorldScene', { area: s.area, pos: s.pos });
      return;
    }
    this.scene.resume('IsleWorldScene');
    this.scene.stop();
  }

  private owned(kind: IsleItemDef['kind']): IsleItemDef[] {
    return Object.keys(Save.S().inv).map((id) => getIsleItem(id)).filter((x): x is IsleItemDef => !!x && x.kind === kind && Save.count(x.id) > 0);
  }

  private charmRows(): Row[] {
    const s = Save.S();
    const rows = this.owned('charm').map((it): Row => {
      const on = s.charms.includes(it.id);
      return {
        icon: it.emoji, name: it.name, right: on ? 'WORN' : '', rightColor: '#9dffb0',
        detail: itemDetail(it), verb: on ? 'TAKE OFF' : s.charms.length >= MAX_CHARMS ? null : 'WEAR',
        act: () => {
          if (on) s.charms = s.charms.filter((c) => c !== it.id);
          else if (s.charms.length < MAX_CHARMS) {
            // A charm and its dark-market twin are the same thing twice: wearing one takes the other off.
            const twin = baseIdOf(it.id) ?? darkIdOf(it.id);
            s.charms = s.charms.filter((c) => c !== twin);
            s.charms.push(it.id);
          }
          Save.persist(); Sfx.play('ui-equip');
          return on ? `${it.name} put away.` : `${it.name} worn (${s.charms.length}/${MAX_CHARMS}).`;
        },
      };
    });
    if (!rows.length) rows.push({ icon: '🧿', name: 'No charms yet', right: '', detail: ['Court shops sell charms. Wear up to three; they work in every fight.'], verb: null, dim: true });
    return rows;
  }

  private artifactRows(): Row[] {
    const s = Save.S();
    const rows = this.owned('artifact').map((it): Row => {
      const on = s.artifact === it.id;
      return {
        icon: it.emoji, name: it.name, right: on ? 'EQUIPPED' : '', rightColor: '#ffb47a',
        detail: itemDetail(it), verb: on ? 'UNEQUIP' : 'EQUIP',
        act: () => { s.artifact = on ? null : it.id; Save.persist(); Sfx.play('ui-equip'); return on ? 'Unequipped.' : `${it.name} equipped.`; },
      };
    });
    if (!rows.length) rows.push({ icon: '🏺', name: 'No artifacts yet', right: '', detail: ['Every prince carries an artifact. Take it from them.'], verb: null, dim: true });
    return rows;
  }

  private pantryRows(): Row[] {
    const s = Save.S();
    const edible = [...this.owned('food'), ...this.owned('fish').filter((f) => f.effect || f.script)];
    const rows = edible.map((it): Row => {
      const on = s.meal === it.id;
      return {
        icon: it.emoji, name: `${it.name}  ×${Save.count(it.id)}`, right: on ? 'NEXT MEAL' : '', rightColor: '#ffe08a',
        detail: [...itemDetail(it), '', 'A meal is eaten at the start of your next fight and lasts that fight.'],
        verb: on ? 'NOT THIS ONE' : 'EAT BEFORE NEXT FIGHT',
        act: () => { s.meal = on ? null : it.id; Save.persist(); Sfx.play('ui-equip'); return on ? 'Meal cleared.' : `${it.name} will be your next meal.`; },
      };
    });
    if (!rows.length) rows.push({ icon: '🍞', name: 'The pantry is empty', right: '', detail: ['Catch fish and take them to a bakery — or eat them raw, if you must.'], verb: null, dim: true });
    return rows;
  }

  private gearRows(): Row[] {
    const s = Save.S();
    const rows: Row[] = this.owned('rod').map((it) => {
      const on = s.rod === it.id;
      return {
        icon: it.emoji, name: it.name, right: on ? 'IN HAND' : '', rightColor: '#9dffb0',
        detail: itemDetail(it), verb: on ? null : 'USE THIS ROD',
        act: () => { s.rod = it.id; Save.persist(); return `${getRod(it.id)?.name ?? it.name} in hand.`; },
      };
    });
    for (const kind of ['fish', 'material'] as const) {
      for (const it of this.owned(kind)) {
        rows.push({ icon: it.emoji, name: `${it.name}  ×${Save.count(it.id)}`, right: it.sell ? `${it.sell} 🪙` : '', detail: itemDetail(it), verb: null });
      }
    }
    if (!rows.length) rows.push({ icon: '🎒', name: 'Nothing but lint', right: '', detail: ['Rods come from the tackle stalls in the ports.'], verb: null, dim: true });
    return rows;
  }

  private logRows(): Row[] {
    const s = Save.S();
    return allFish().map((f): Row => {
      const it = getIsleItem(f.id);
      const e = s.fishLog[f.id];
      return {
        icon: e ? (it?.emoji ?? '🐟') : '❔', name: e ? (it?.name ?? f.id) : '??????', right: e ? `×${e.count}  best ${e.best}cm` : '',
        rightColor: '#9dd8ff',
        detail: e && it ? [`“${it.flavor}”`, '', `Caught ${e.count}, best ${e.best} cm (range ${f.size[0]}–${f.size[1]})`, `Fight: ${'●'.repeat(f.fight)}${'○'.repeat(5 - f.fight)}`] : ['Not caught yet.', `Fight: ${'●'.repeat(f.fight)}${'○'.repeat(5 - f.fight)}`],
        verb: null, dim: !e,
      };
    });
  }

  private journalRows(): Row[] {
    const s = Save.S();
    const rows: Row[] = [];
    for (const isle of ISLES) {
      const freed = s.monarchs.includes(isle.monarch.id);
      rows.push({
        icon: freed ? '👑' : '🏝️', name: isle.name, right: freed ? 'FREE' : `${isle.monarch.name}`, rightColor: freed ? '#9dffb0' : '#ff8a6a',
        detail: [`${isle.monarch.name}, ${isle.monarch.title}`, freed ? 'Fallen.' : 'Still on the throne.', '', s.hard ? '☄ You are inside the Fall.' : Save.hasFlag(Save.FLAG_METEOR_OPEN) ? 'The Fall waits at Fallpoint.' : ''],
        verb: null,
      });
      for (const c of allCourts().filter((x) => x.isle === isle.id)) {
        const all = courtChampions(c);
        const n = all.filter((e) => s.encounters.includes(e.id)).length;
        const free = s.princes.includes(c.prince.id);
        rows.push({
          icon: free ? '🏳️' : '⚔️', name: `   ${c.name}`, right: free ? 'FREED' : `${n}/${all.length}`, rightColor: free ? '#9dffb0' : '#ffd27a',
          detail: [`${c.prince.name}, ${c.prince.title}`, '', ...all.map((e) => `${s.encounters.includes(e.id) ? '✔' : '·'} ${e.fallen ? '☄ ' : ''}${e.name} — ${e.foeName}`)],
          verb: null,
        });
      }
    }
    // The Pinnacle: shown once the Shroud is down (or a foot has been set on it).
    if (routeOpen(PINNACLE.id)) {
      const kingDown = s.monarchs.includes(PINNACLE.monarch.id);
      rows.push({
        icon: kingDown ? '⭐' : '🗡️', name: PINNACLE.name, right: kingDown ? 'THE THRONE IS EMPTY' : `${Save.seatsWon()}/${councilSeatCount() || 60} seats`,
        rightColor: kingDown ? '#9dffb0' : '#c9b0ff',
        detail: [`${PINNACLE.monarch.name}, ${PINNACLE.monarch.title}`, kingDown ? 'Fallen. The star is out.' : 'Still on the throne.', '',
          'Sixty councilors on ten benches, one seat for every element.', 'Empty a bench and the stair above it opens.'],
        verb: null,
      });
      for (const a of allAreas().filter((x) => x.isle === PINNACLE.id && benchSeats(x.id).length > 0)) {
        const seats = benchSeats(a.id).map((id) => getEncounter(id)).filter((e): e is NonNullable<typeof e> => !!e);
        const n = seats.filter((e) => s.encounters.includes(e.id)).length;
        rows.push({
          icon: n >= seats.length ? '🏳️' : '⚔️', name: `   ${a.name}`, right: n >= seats.length ? 'BROKEN' : `${n}/${seats.length}`,
          rightColor: n >= seats.length ? '#9dffb0' : '#ffd27a',
          detail: [a.subtitle, '', ...seats.map((e) => `${s.encounters.includes(e.id) ? '✔' : '·'} ${e.foeName} — ${e.seat ?? ''} — “${e.name}”`)],
          verb: null,
        });
      }
    }
    return rows;
  }

  private elementRows(): Row[] {
    const s = Save.S();
    return allSelectableElements().filter((e) => e.id !== 'quantum').map((e): Row => {
      const on = s.element === e.id;
      return {
        icon: '●', name: e.name, right: on ? 'YOU' : getGeneTree(e.id) ? '🧬' : '', rightColor: on ? '#9dffb0' : '#d0a8ff',
        detail: [on ? 'This is who you are on the isles.' : `Walk and fight as ${e.name}.`, '', getGeneTree(e.id) ? 'Has a gene tree (G).' : 'Genome unsequenced — its gene tree arrives with its isle.'],
        verb: on ? null : 'BECOME',
        act: () => { s.element = e.id; Save.persist(); Sfx.play('unlock'); return `You are ${e.name} now.`; },
      };
    });
  }
}
