import Phaser from 'phaser';
import { CONFIG, MENU_LAYOUT, type Loadout } from '../config/gameConfig';
import { GameModel } from '../core/GameModel';
import type { RunSnapshot } from '../core/types';
import { InputSystem } from '../systems/InputSystem';
import { clearRun, saveRun, settleRun } from '../systems/SaveSystem';
import { WorldRenderer } from '../ui/WorldRenderer';
import { HUD } from '../ui/HUD';
import { RunModalView } from '../ui/RunModal';
import { COLORS, label, pill, tap } from '../ui/draw';

export class GameScene extends Phaser.Scene {
  model!: GameModel;
  controls!: InputSystem;
  paused = false;
  private world!: WorldRenderer;
  private hud!: HUD;
  private modalView!: RunModalView;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private overlay!: Phaser.GameObjects.Container;
  private accumulator = 0;
  private savedAt = 0;
  private onBlur = () => this.pause();
  private onVisibility = () => { if (document.hidden) this.pause(); };
  private onCancel = () => this.controls.cancel();
  private onPageHide = () => this.store();
  private onResize = () => { this.controls.cancel(); this.input.keyboard?.resetKeys(); this.accumulator = 0; };
  constructor() { super('Game'); }
  create(data: { snapshot?: RunSnapshot; loadout?: Loadout } = {}): void {
    document.getElementById('game')!.dataset.scene = 'battle';
    this.model = (data.snapshot && GameModel.fromSnapshot(data.snapshot)) || new GameModel(Date.now(), data.loadout);
    this.controls = new InputSystem(); this.paused = false; this.accumulator = 0; this.savedAt = this.model.time;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.world = new WorldRenderer(this); this.hud = new HUD(this);
    this.modalView = new RunModalView(this, this.model, () => { this.controls.cancel(); this.accumulator = 0; this.store(); });
    const { x, y, width, height } = MENU_LAYOUT.pause;
    const icon = this.add.graphics(); pill(icon, x - width / 2, y - height / 2, width, height, 0x35533c);
    label(this, x, y, 'Ⅱ', 36, '#dce6b9').setOrigin(0.5);
    tap(this, x, y, width, height, () => this.pause());
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!this.paused && !this.model.modal) this.controls.begin(p.id, p); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (!this.paused && !this.model.modal) this.controls.move(p.id, p); });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.controls.end(p.id));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.controls.cancel(p.id));
    this.makeOverlay();
    window.addEventListener('blur', this.onBlur); window.addEventListener('resize', this.onResize); window.addEventListener('pagehide', this.onPageHide);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.game.canvas.addEventListener('pointercancel', this.onCancel); this.game.canvas.addEventListener('touchcancel', this.onCancel);
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) window.__bloom = { model: this.model, scene: this };
    this.store();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', this.onBlur); window.removeEventListener('resize', this.onResize); window.removeEventListener('pagehide', this.onPageHide);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.game.canvas.removeEventListener('pointercancel', this.onCancel); this.game.canvas.removeEventListener('touchcancel', this.onCancel);
      this.controls.cancel(); this.input.removeAllListeners(); this.modalView.destroy(); this.world.destroy();
      this.input.keyboard?.resetKeys(); this.input.keyboard?.removeAllKeys(true);
      if (window.__bloom?.scene === this) delete window.__bloom;
    });
  }
  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) { if (this.paused) this.resume(); else this.pause(); }
    if (!this.paused && !this.model.modal) {
      const v = this.controls.vector();
      const move = { x: v.x + Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown), y: v.y + Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown) };
      this.accumulator += Math.min(delta / 1000, 0.1);
      while (this.accumulator >= 1 / 60 && !this.model.result && !this.model.modal) { this.model.step(1 / 60, move); this.accumulator -= 1 / 60; }
      if (this.model.modal) { this.controls.cancel(); this.input.keyboard?.resetKeys(); this.accumulator = 0; this.store(); }
      if (this.model.result) { clearRun(); settleRun(this.model.result); this.scene.start('Result', this.model.result); return; }
      if (this.model.time - this.savedAt >= 2) this.store();
    }
    if (this.model.modal) { this.controls.cancel(); this.input.keyboard?.resetKeys(); this.accumulator = 0; }
    this.world.draw(this.model); this.hud.draw(this.model, this.controls); this.modalView.sync(this.paused);
  }
  store(): void { if (!this.model.result) { saveRun(this.model.toSnapshot()); this.savedAt = this.model.time; } }
  pause(): void {
    if (this.paused || this.model.result) return;
    this.paused = true; this.accumulator = 0; this.controls.cancel(); this.input.keyboard?.resetKeys(); this.store(); this.overlay.setVisible(true);
  }
  resume(): void { this.paused = false; this.accumulator = 0; this.controls.cancel(); this.input.keyboard?.resetKeys(); this.overlay.setVisible(false); }
  private makeOverlay(): void {
    this.overlay = this.add.container(0, 0).setDepth(100).setVisible(false);
    const shade = this.add.rectangle(360, CONFIG.VIEW.height / 2, 720, CONFIG.VIEW.height, 0x0a1b16, 0.9).setInteractive();
    const g = this.add.graphics(); pill(g, 48, 470, 624, 570, 0x31523a);
    const title = label(this, 360, 536, '田野小憩', 39).setOrigin(0.5);
    const text = label(this, 360, 624, '本局进度已保存，随时回来继续。', 23, '#b5cba4').setOrigin(0.5);
    const { x, y, width, height } = MENU_LAYOUT.resume;
    pill(g, x - width / 2, y - height / 2, width, height, COLORS.lime);
    const caption = label(this, x, y, '继续守护', 29, '#284331').setOrigin(0.5);
    const resume = tap(this, x, y, width, height, () => this.resume());
    pill(g, 90, 925, 540, 76, 0x557249);
    const leaveText = label(this, 360, 963, '保存并返回田野', 27).setOrigin(0.5);
    const leave = tap(this, 360, 963, 540, 76, () => { this.store(); this.scene.start('Lobby'); });
    this.overlay.add([shade, g, title, text, caption, resume, leaveText, leave]);
  }
}
declare global { interface Window { __bloom?: { model: GameModel; scene: GameScene } } }
