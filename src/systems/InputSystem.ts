import { CONFIG } from '../config/gameConfig';
import { insideBattlefield } from '../core/layout';
import type { Vec } from '../core/types';

// 任意战场落指点都是摇杆中心，触点只拥有移动，不再需要第二只手操作种子。
export class InputSystem {
  joystick: { pointerId: number; center: Vec; point: Vec } | null = null;
  begin(pointerId: number, point: Vec): void {
    if (!this.joystick && insideBattlefield(point)) this.joystick = { pointerId, center: { x: point.x, y: point.y }, point: { x: point.x, y: point.y } };
  }
  move(pointerId: number, point: Vec): void {
    if (this.joystick?.pointerId !== pointerId) return;
    this.joystick.point = { x: point.x, y: point.y };
    const dx = point.x - this.joystick.center.x, dy = point.y - this.joystick.center.y, d = Math.hypot(dx, dy);
    // 长拖动时底座跟随，手指换到哪里都能继续顺畅转向。
    if (d > CONFIG.INPUT.joystickRadius * 1.5) {
      this.joystick.center = { x: point.x - dx / d * CONFIG.INPUT.joystickRadius * 1.5, y: point.y - dy / d * CONFIG.INPUT.joystickRadius * 1.5 };
    }
  }
  end(pointerId: number): void { this.cancel(pointerId); }
  cancel(pointerId?: number): void { if (pointerId === undefined || this.joystick?.pointerId === pointerId) this.joystick = null; }
  vector(): Vec {
    if (!this.joystick) return { x: 0, y: 0 };
    const dx = this.joystick.point.x - this.joystick.center.x, dy = this.joystick.point.y - this.joystick.center.y;
    const scale = Math.max(CONFIG.INPUT.joystickRadius, Math.hypot(dx, dy));
    return { x: dx / scale, y: dy / scale };
  }
}
