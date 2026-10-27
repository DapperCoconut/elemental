import Phaser from 'phaser';
import { FONT_DISPLAY, FONT_UI } from '../../ui';
import { Music, Sfx } from '../../audio';
import * as Save from '../IslesSave';
import { getEncounter, getCourt, courtOfPrince, getIsle, getIsleItem, ISLES, getIslesBoss, ALL_ISLE_IDS } from '../IslesRegistry';
import * as Quests from '../systems/Quests';
import type { IslesFightPayload } from '../IslesTypes';

/**
 * After an Isles fight: pay out, push quest progress, then walk back into the world where you
 * stood. Rewards are settled in `create` (once) and only *shown* here, so a refresh or a fast key
 * press can never double-pay.
 */

interface Line { text: string; color: string; big?: boolean }

export class IslesResultScene extends Phaser.Scene {
  private payload!: IslesFightPayload;
  private won = false;
  private lines: Line[] = [];
  private canLeave = 0;

  constructor() { super({ key: 'IslesResultScene' }); }

  init(data: { payload: IslesFightPayload; won: boolean }): void {
    this.payload = data.payload;
    this.won = data.won;
    this.lines = [];
  }

  create(): void {
    const W = this.scale.width, H = this.scale.height;
    Music.play('campaign');
    this.settle();

    const g = this.add.graphics();
    g.fillStyle(0x07050a, 1); g.fillRect(0, 0, W, H);
    const accent = this.won ? 0xffb347 : 0x9a3b3b;
    for (let k = 10; k >= 1; k--) { g.fillStyle(accent, 0.018); g.fillCircle(W / 2, H * 0.32, 40 + k * 34); }
    // Drifting embers / ash behind the card.
    const motes = this.add.graphics();
    const tick = (_t: number, dt: number) => {
      motes.clear();
      const t = this.time.now / 1000;
      for (let i = 0; i < 60; i++) {
        const x = (i * 97.3 + Math.sin(t * 0.6 + i) * 30) % W;
        const y = H - ((t * (20 + (i % 7) * 9) + i * 53) % (H + 40));
        motes.fillStyle(this.won ? 0xffa040 : 0x7a7a88, 0.25 + (i % 5) * 0.08);
        motes.fillCircle(x, y, 1.2 + (i % 3));
      }
      void dt;
    };
    this.events.on('update', tick);
    this.events.once('shutdown', () => this.events.off('update', tick));

    const title = this.won ? (this.payload.kind === 'monarch' ? 'THE CROWN FALLS' : this.payload.kind === 'prince' ? 'PRINCE DEFEATED' : 'VICTORY') : 'DRIVEN BACK';
    this.add.text(W / 2, 92, title, {
      fontFamily: FONT_DISPLAY, fontSize: '46px', color: this.won ? '#ffd27a' : '#e07a7a',
      stroke: '#1a0a04', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(W / 2, 140, this.foeLabel(), {
      fontFamily: FONT_UI, fontSize: '18px', color: '#e8d8c0', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Card.
    const cw = 520, ch = 70 + this.lines.length * 30;
    const cy = 190;
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.5); card.fillRoundedRect(W / 2 - cw / 2 + 6, cy + 8, cw, ch, 14);
    card.fillStyle(0x1c120c, 0.96); card.fillRoundedRect(W / 2 - cw / 2, cy, cw, ch, 14);
    card.lineStyle(2, accent, 0.9); card.strokeRoundedRect(W / 2 - cw / 2, cy, cw, ch, 14);
    this.lines.forEach((l, i) => {
      const t = this.add.text(W / 2, cy + 40 + i * 30, l.text, {
        fontFamily: l.big ? FONT_DISPLAY : FONT_UI, fontSize: l.big ? '20px' : '17px', color: l.color,
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 4, delay: 300 + i * 160, duration: 260 });
      this.time.delayedCall(300 + i * 160, () => Sfx.play(i === 0 ? 'reward-big' : 'shard-gain'));
    });

    const hint = this.add.text(W / 2, H - 50, 'Press SPACE / E or click to return', {
      fontFamily: FONT_UI, fontSize: '15px', color: '#b8a890',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, delay: 900 + this.lines.length * 160, duration: 400 });
    this.canLeave = this.time.now + 700 + this.lines.length * 120;

    const go = () => { if (this.time.now >= this.canLeave) this.leave(); };
    this.input.keyboard?.on('keydown-SPACE', go);
    this.input.keyboard?.on('keydown-E', go);
    this.input.keyboard?.on('keydown-ENTER', go);
    this.input.on('pointerdown', go);
  }

  private foeLabel(): string {
    const p = this.payload;
    if (p.kind === 'encounter' || p.kind === 'warden') {
      const e = getEncounter(p.id);
      return e ? `${e.name} — ${e.foeName}` : p.id;
    }
    const def = getIslesBoss(`isle:${p.id}`);
    return def ? `${def.name}, ${def.title}` : p.id;
  }

  /** Apply everything this fight earned, exactly once. */
  private settle(): void {
    if (!Save.hasActive()) return;
    const p = this.payload;
    const s = Save.S();
    const push = (text: string, color = '#f2e6d0', big = false) => this.lines.push({ text, color, big });
    if (!this.won) {
      s.stats.losses += 1;
      Save.persist();
      push('You limp back to where you stood.', '#d8c8b0');
      push('Nothing was lost but pride.', '#a89880');
      if (s.meal) { /* the meal was eaten either way */ }
      return;
    }
    s.stats.wins += 1;
    const hardMult = p.hard ? 1.5 : 1;

    if (p.kind === 'encounter' || p.kind === 'warden') {
      const e = getEncounter(p.id);
      const first = !s.encounters.includes(p.id);
      const coins = Math.round((e?.coins ?? 30) * hardMult * (first ? 1 : 0.3));
      Save.markEncounter(p.id);
      Save.addCoins(coins);
      push(`+${coins} 🪙 coins${first ? '' : ' (rematch)'}`, '#ffd27a', true);
      if (first && e && !e.quest) {
        const court = getCourt(e.court);
        if (court && Save.courtReady(court.id)) {
          push(`${court.name}: the prince's gate is open!`, '#ff9d5c', true);
        } else if (court) {
          const n = court.encounters.filter((x) => Save.S().encounters.includes(x.id)).length;
          push(`${court.name}: ${n}/${court.encounters.length} champions beaten`, '#e8c8a0');
        }
      }
      for (const l of Quests.notify({ kind: 'defeat', encounter: p.id })) push(l, '#9dd8ff');
    } else if (p.kind === 'prince') {
      const court = courtOfPrince(p.id);
      const first = !s.princes.includes(p.id);
      const tier = court?.tier ?? 1;
      const coins = Math.round((first ? 150 + 60 * tier : 60) * hardMult);
      Save.markPrince(p.id);
      Save.addCoins(coins);
      push(`+${coins} 🪙 coins`, '#ffd27a', true);
      if (first) {
        Save.addKeys(1);
        Save.addOrbs(4 + tier);
        push('+1 🗝️ key', '#ffe9a8');
        push(`+${4 + tier} 🔮 orbs`, '#d0a8ff');
        if (court) {
          const art = getIsleItem(court.prince.artifact);
          if (art && Save.count(art.id) === 0) {
            Save.give(art.id, 1);
            push(`Artifact: ${art.emoji} ${art.name}`, '#ff9d5c', true);
          }
          Save.setFlag(`freed-${court.id}`);
          push(`${court.name} is free.`, '#9dffb0');
        }
      }
      for (const l of Quests.notify({ kind: 'prince', prince: p.id })) push(l, '#9dd8ff');
    } else if (p.kind === 'monarch') {
      const first = !s.monarchs.includes(p.id);
      const coins = Math.round((first ? 900 : 200) * hardMult);
      Save.markMonarch(p.id);
      Save.addCoins(coins);
      push(`+${coins} 🪙 coins`, '#ffd27a', true);
      if (first) {
        Save.addKeys(3);
        Save.addOrbs(15);
        push('+3 🗝️ keys', '#ffe9a8');
        push('+15 🔮 orbs', '#d0a8ff');
        const isle = ISLES.find((i) => i.monarch.id === p.id);
        if (isle) {
          const art = getIsleItem(isle.monarch.artifact);
          if (art && Save.count(art.id) === 0) {
            Save.give(art.id, 1);
            push(`Artifact: ${art.emoji} ${art.name}`, '#ff9d5c', true);
          }
          push(`${getIsle(isle.id)?.name ?? isle.name} is free. The sea is calling.`, '#9dffb0', true);
          const next = getIsle(ALL_ISLE_IDS[ALL_ISLE_IDS.indexOf(isle.id) + 1] ?? '');
          if (next) push(`The docks can chart a course for ${next.name} now.`, '#9dd8ff');
          Save.setFlag(`freed-isle-${isle.id}`);
        }
      }
    }
    Save.persist();
  }

  private leave(): void {
    this.input.removeAllListeners();
    this.scene.start('IsleWorldScene', { area: this.payload.area, pos: this.payload.pos, after: this.won ? this.payload : undefined });
  }
}
