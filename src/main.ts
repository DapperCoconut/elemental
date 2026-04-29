import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { MenuScene } from './scenes/MenuScene';
import { ShopScene } from './scenes/ShopScene';
import { LabScene } from './scenes/LabScene';
import { ArenaScene } from './scenes/ArenaScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GauntletSelectScene } from './scenes/GauntletSelectScene';
import { GauntletIntermediaryScene } from './scenes/GauntletIntermediaryScene';
import { PauseMenuScene } from './scenes/PauseMenuScene';
import { CampaignSlotSelectScene } from './scenes/CampaignSlotSelectScene';
import { CampaignWorldMapScene } from './scenes/CampaignWorldMapScene';
import { CampaignWorldScene } from './scenes/CampaignWorldScene';
import { CampaignFightMenuScene } from './scenes/CampaignFightMenuScene';
import { CampaignShopScene } from './scenes/CampaignShopScene';
import { CampaignPortalScene } from './scenes/CampaignPortalScene';
import { CampaignElementSelectScene } from './scenes/CampaignElementSelectScene';
import { GauntletElementSelectScene } from './scenes/GauntletElementSelectScene';

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
  scene: [BootScene, TitleScene, MenuScene, ShopScene, LabScene, ArenaScene, GameOverScene, GauntletSelectScene, GauntletIntermediaryScene, PauseMenuScene, CampaignSlotSelectScene, CampaignWorldMapScene, CampaignWorldScene, CampaignFightMenuScene, CampaignShopScene, CampaignPortalScene, CampaignElementSelectScene, GauntletElementSelectScene],
};

const game = new Phaser.Game(config);

document.addEventListener('contextmenu', (e) => e.preventDefault());

