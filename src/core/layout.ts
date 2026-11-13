import { CONFIG } from '../config/gameConfig';
import type { Vec } from './types';

// 渲染、预览和触控共用同一变换，防止战场缩放后落种位置偏移。
export function worldToScreen(point: Vec): Vec {
  return { x: CONFIG.VIEW.fieldX + point.x * CONFIG.VIEW.fieldScale, y: CONFIG.VIEW.fieldY + point.y * CONFIG.VIEW.fieldScale };
}
export function screenToWorld(point: Vec): Vec {
  return { x: (point.x - CONFIG.VIEW.fieldX) / CONFIG.VIEW.fieldScale, y: (point.y - CONFIG.VIEW.fieldY) / CONFIG.VIEW.fieldScale };
}
export function insideBattlefield(point: Vec): boolean {
  const p = screenToWorld(point);
  return p.x >= 0 && p.y >= 0 && p.x <= CONFIG.WORLD.width && p.y <= CONFIG.WORLD.height;
}
