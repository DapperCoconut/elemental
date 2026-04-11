import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { MenuScene } from './scenes/MenuScene';
import { ShopScene } from './scenes/ShopScene';
import { LabScene } from './scenes/LabScene';
import { ArenaScene } from './scenes/ArenaScene';
import { GameOverScene } from './scenes/GameOverScene';
import { NetworkScene } from './scenes/NetworkScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, MenuScene, ShopScene, LabScene, ArenaScene, GameOverScene, NetworkScene],
};

const game = new Phaser.Game(config);

// Keep the game loop running when the tab loses focus.
// Required for networked PvP: both tabs must keep ticking to send/receive inputs
// even when one is in the background.
game.events.on(Phaser.Core.Events.HIDDEN, () => {
  game.loop.wake();
});
