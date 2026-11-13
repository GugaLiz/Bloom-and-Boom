import { CHARMS, DEFAULT_LOADOUT, EMPTY_SKILLS, SKILLS, WEAPONS, type Loadout, type SkillId, type SkillLevels } from '../config/gameConfig';
import type { Reward } from '../core/types';

export function validLoadout(value: unknown): value is Loadout {
  if (!value || typeof value !== 'object') return false;
  const v = value as Loadout;
  return Object.hasOwn(WEAPONS, v.weapon) && Object.hasOwn(CHARMS, v.charm) && ['cloth', 'wind'].includes(v.boots);
}
export function initialSkills(loadout: Loadout = DEFAULT_LOADOUT): SkillLevels {
  const levels = EMPTY_SKILLS(); levels[CHARMS[loadout.charm].skill] = 1; return levels;
}
export function upgradeChoices(skills: SkillLevels, random: () => number): SkillId[] {
  const pool = (Object.keys(SKILLS) as SkillId[]).filter(id => skills[id] < SKILLS[id].max);
  const choices: SkillId[] = [];
  while (pool.length && choices.length < 3) choices.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return choices.length ? choices : ['vitality'];
}
export function chestReward(skills: SkillLevels, random: () => number): Reward {
  const roll = random();
  if (roll < 0.75) return { kind: 'skill', skill: upgradeChoices(skills, random)[0] };
  return roll < 0.9 ? { kind: 'heal', value: 35 } : { kind: 'coins', value: 50 };
}
