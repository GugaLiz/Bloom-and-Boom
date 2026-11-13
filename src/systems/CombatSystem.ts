import { CONFIG } from '../config/gameConfig';
import { distance, type Enemy, type Vec } from '../core/types';

export function burstHit(enemy: Enemy, center: Vec): boolean {
  if (distance(enemy, center) > CONFIG.INSTANT_BURST.radius + CONFIG.MIASMA_UNITS[enemy.kind].radius) return false;
  if (enemy.kind === 'normal') enemy.hp -= CONFIG.INSTANT_BURST.damage;
  const dx = enemy.x - center.x, dy = enemy.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  enemy.knockback = { x: dx / len * CONFIG.INSTANT_BURST.knockback, y: (len === 1 && dx === 0 && dy === 0 ? -1 : dy / len) * CONFIG.INSTANT_BURST.knockback };
  enemy.knockTime = CONFIG.INSTANT_BURST.knockbackTime;
  enemy.flash = 0.15;
  return true;
}
