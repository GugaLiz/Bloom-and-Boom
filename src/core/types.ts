import type { Loadout, SkillId, SkillLevels } from '../config/gameConfig';
export interface Vec { x: number; y: number }
export interface Player extends Vec { hp: number; invincible: number; facing: Vec }
export interface Drop extends Vec { id: number; kind: 'xp' | 'seed' | 'heal' | 'chest'; value: number; skill?: SkillId; age: number }
export interface Plant extends Vec {
  id: number; state: 'growing' | 'mature' | 'dead'; hp: number;
  growth: number; empowered: boolean; guarded: boolean; attackTimer: number; flash: number; age: number;
}
export interface Enemy extends Vec {
  id: number; kind: 'normal' | 'elite'; hp: number; maxHp: number;
  knockback: Vec; knockTime: number; contactTimer: number; flash: number;
}
export interface Burst extends Vec { age: number; fired: boolean }
export interface Projectile extends Vec { targetId: number; damage: number; life: number; vx?: number; vy?: number }
export interface Pulse extends Vec { age: number; kind: 'mature' | 'hit' | 'pickup' | 'death' }
export interface DamageText extends Vec { value: number; age: number; critical: boolean }
export type Reward = { kind: 'skill'; skill: SkillId } | { kind: 'heal'; value: number } | { kind: 'coins'; value: number };
export type RunModal = { kind: 'upgrade'; choices: SkillId[] } | { kind: 'chest'; reward: Reward; revealed: boolean };
export type ResultReason = 'survived' | 'health';
export interface RunResult { runId: string; reason: ResultReason; time: number; kills: number; planted: number; matured: number; coins: number; level: number; floor: number }
export interface SavedState {
  runId: string; time: number; player: Player; loadout: Loadout; skills: SkillLevels;
  plants: Plant[]; enemies: Enemy[]; projectiles: Projectile[]; drops: Drop[]; burst: Burst | null;
  cooldown: number; xp: number; level: number; coins: number; pendingLevels: number; modal: RunModal | null;
  stats: { kills: number; planted: number; matured: number };
  rngState: number; nextId: number;
  timers: { normal: number; elite: number; shot: number; vine: number; aura: number; drop: number; chest: number };
}
export interface RunSnapshot { version: 2; state: SavedState }
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
