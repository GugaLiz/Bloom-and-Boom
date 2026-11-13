import Phaser from 'phaser';
import { COLORS, label, pill, sprout } from '../ui/draw';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload(): void {
    document.getElementById('game')!.dataset.scene = 'loading';
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const art = this.add.graphics();
    art.fillStyle(0x355b3c).fillCircle(360, 610, 220);
    sprout(art, 360, 645, 105);
    label(this, 360, 280, '万物生', 100).setOrigin(0.5).setFontFamily('Georgia, "SimSun", serif');
    label(this, 360, 375, 'BLOOM & BOOM', 25, '#c4dd86').setOrigin(0.5);
    label(this, 360, 1010, '让每一发种子，都长出新的生机', 24, '#c4dd86').setOrigin(0.5);
    const bar = this.add.graphics(), percent = label(this, 360, 1120, '0%', 26).setOrigin(0.5);
    const drawProgress = (progress: number) => { bar.clear(); pill(bar, 70, 1070, 580, 24, 0x34503b); if (progress > 0) pill(bar, 70, 1070, 580 * progress, 24, COLORS.lime); percent.setText(`${Math.round(progress * 100)}%`); };
    drawProgress(0);
    this.load.on('progress', drawProgress);
    this.load.svg('granny', `${import.meta.env.BASE_URL}assets/granny.svg`, { width: 420, height: 480 });
    this.load.once('complete', () => drawProgress(1));
  }
  create(): void { this.scene.start('Lobby'); }
}
