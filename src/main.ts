import Phaser from 'phaser';
import { CONFIG } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { LobbyScene } from './scenes/LobbyScene';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.VIEW.width,
  height: CONFIG.VIEW.height,
  backgroundColor: '#152d26',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3, touch: { capture: true }, windowEvents: true },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, LobbyScene, GameScene, ResultScene],
});
