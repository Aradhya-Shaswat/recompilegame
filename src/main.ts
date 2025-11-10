import Phaser from 'phaser';
import { CONFIG } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { TutorialScene } from './scenes/TutorialScene';
import { PauseMenu } from './scenes/PauseMenu';
import { EndCreditsScene } from './scenes/EndCreditsScene';
import { WireMazeMinigame } from './scenes/WireMazeMinigame';
import { CardSwipeMinigame } from './scenes/CardSwipeMinigame';
import { AsteroidShooterMinigame } from './scenes/AsteroidShooterMinigame';
import { MiniGolfMinigame } from './scenes/MiniGolfMinigame';
import { DinoRunMinigame } from './scenes/DinoRunMinigame';
import { TelescopeAlignMinigame } from './scenes/TelescopeAlignMinigame';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  scene: [BootScene, PreloadScene, MenuScene, SettingsScene, GameScene, UIScene, TutorialScene, PauseMenu, EndCreditsScene, WireMazeMinigame, CardSwipeMinigame, AsteroidShooterMinigame, MiniGolfMinigame, DinoRunMinigame, TelescopeAlignMinigame],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    pixelArt: false,
    antialias: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

(window as any).game = game;
