import { test, expect, type Page } from '@playwright/test';
import { CONFIG, MENU_LAYOUT } from '../../src/config/gameConfig';
import { SAVE_KEY, PROFILE_KEY } from '../../src/systems/SaveSystem';

async function lobby(page: Page): Promise<void> { await page.goto('/?debug=1'); await expect(page.locator('#game')).toHaveAttribute('data-scene', 'lobby'); }
async function start(page: Page): Promise<void> { await lobby(page); await page.keyboard.press('Enter'); await page.waitForFunction(() => !!window.__bloom); }
async function point(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('canvas').boundingBox(); if (!box) throw Error('canvas missing');
  return { x: box.x + x / CONFIG.VIEW.width * box.width, y: box.y + y / CONFIG.VIEW.height * box.height };
}
async function click(page: Page, x: number, y: number): Promise<void> { const p = await point(page, x, y); await page.mouse.click(p.x, p.y); }

test('竖屏出战与装备：切换武器、护符和鞋子，实际带入战斗并持久化', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await lobby(page); await page.screenshot({ path: 'test-results/lobby.png' });
  await click(page, 180, 1328); await click(page, 360, 956);
  await click(page, 360, 782); await click(page, 360, 956);
  await click(page, 590, 782); await click(page, 360, 956);
  await page.screenshot({ path: 'test-results/equipment.png' });
  await click(page, MENU_LAYOUT.start.x, MENU_LAYOUT.start.y); await page.waitForFunction(() => !!window.__bloom);
  expect(await page.evaluate(() => window.__bloom!.model.loadout)).toEqual({ weapon: 'seedScatter', charm: 'melonCharm', boots: 'wind' });
  expect(await page.evaluate(() => window.__bloom!.model.skills.burstMelon)).toBe(1);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).loadout, PROFILE_KEY)).toEqual({ weapon: 'seedScatter', charm: 'melonCharm', boots: 'wind' });
  expect(errors).toEqual([]);
});

test('随触移动、碰触种子、自动射击、暂停与继续', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page);
  const playerX = await page.evaluate(() => window.__bloom!.model.player.x);
  const a = await point(page, 230, 1080), b = await point(page, 308, 1080);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  expect(Math.abs(await page.evaluate(() => window.__bloom!.scene.controls.joystick!.center.x) - 230)).toBeLessThan(2.5);
  await page.mouse.move(b.x, b.y); await page.waitForTimeout(430); await page.mouse.up();
  expect(await page.evaluate(() => window.__bloom!.model.player.x)).toBeGreaterThan(playerX + 50);
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.skills.burstMelon)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__bloom!.scene.controls.joystick)).toBeNull();
  const second = await point(page, 520, 1120); await page.mouse.move(second.x, second.y); await page.mouse.down();
  expect(Math.abs(await page.evaluate(() => window.__bloom!.scene.controls.joystick!.center.x) - 520)).toBeLessThan(2.5); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.stats.kills), { timeout: 10000 }).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/gameplay.png' });
  await click(page, MENU_LAYOUT.pause.x, MENU_LAYOUT.pause.y);
  const time = await page.evaluate(() => window.__bloom!.model.time); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__bloom!.model.time)).toBe(time);
  await click(page, MENU_LAYOUT.resume.x, MENU_LAYOUT.resume.y);
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.time)).toBeGreaterThan(time);
  expect(errors).toEqual([]);
});

test('经验三选一：弹窗期间冻结战斗，点击一项技能后生效并继续', async ({ page }) => {
  await start(page);
  const held = await point(page, 128, 800); await page.mouse.move(held.x, held.y); await page.mouse.down();
  const chosen = await page.evaluate(() => {
    const m = window.__bloom!.model; m.gainXp(m.xpNeeded);
    if (m.modal?.kind !== 'upgrade') throw Error('no choices');
    return { id: m.modal.choices[0], before: m.skills[m.modal.choices[0]] };
  });
  await page.waitForTimeout(100); await page.mouse.up();
  expect(await page.evaluate(() => window.__bloom!.model.modal?.kind)).toBe('upgrade');
  expect(await page.evaluate(() => window.__bloom!.scene.controls.joystick)).toBeNull();
  const time = await page.evaluate(() => window.__bloom!.model.time);
  await page.waitForTimeout(300); expect(await page.evaluate(() => window.__bloom!.model.time)).toBe(time);
  await page.screenshot({ path: 'test-results/upgrade.png' });
  await click(page, 128, 800);
  await expect.poll(() => page.evaluate(id => window.__bloom!.model.skills[id], chosen.id)).toBe(chosen.before + 1);
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.time)).toBeGreaterThan(time);
});

test('宝匣动画、奖励确认及已揭晓宝匣刷新续玩不重复发放', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { const m = window.__bloom!.model; m.addDrop(m.player, 'chest'); });
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.modal?.kind)).toBe('chest');
  await page.screenshot({ path: 'test-results/chest-opening.png' });
  await click(page, 360, 800);
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.modal?.kind === 'chest' && window.__bloom!.model.modal.revealed)).toBe(true);
  await page.screenshot({ path: 'test-results/chest-reward.png' });
  const before = await page.evaluate(() => ({ skills: window.__bloom!.model.skills, coins: window.__bloom!.model.coins, modal: window.__bloom!.model.modal }));
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-scene', 'lobby');
  await page.screenshot({ path: 'test-results/continue.png' });
  await click(page, MENU_LAYOUT.continueRun.x, MENU_LAYOUT.continueRun.y); await page.waitForFunction(() => !!window.__bloom);
  expect(await page.evaluate(() => ({ skills: window.__bloom!.model.skills, coins: window.__bloom!.model.coins, modal: window.__bloom!.model.modal }))).toEqual(before);
  await click(page, 360, 1084);
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.modal)).toBeNull();
  await expect.poll(() => page.evaluate(() => window.__bloom!.model.time)).toBeGreaterThan(0.2);
});

test('退出保存、放弃旧局与损坏存档回退', async ({ page }) => {
  await start(page); await page.keyboard.down('w'); await page.waitForTimeout(200); await page.keyboard.up('w');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(snapshot.state.time).toBeGreaterThan(0);
  await click(page, 360, 963); await expect(page.locator('#game')).toHaveAttribute('data-scene', 'lobby');
  await click(page, MENU_LAYOUT.abandonRun.x, MENU_LAYOUT.abandonRun.y);
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.keyboard.press('Enter'); await page.waitForFunction(() => !!window.__bloom);
  expect(await page.evaluate(() => window.__bloom!.model.level)).toBe(1);
  await page.evaluate(key => { window.__bloom!.scene.scene.start('Lobby'); localStorage.setItem(key, '{broken'); }, SAVE_KEY);
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-scene', 'lobby');
  await page.keyboard.press('Enter'); await page.waitForFunction(() => !!window.__bloom);
  expect(await page.evaluate(() => window.__bloom!.model.time)).toBeLessThan(1);
});

test('移动端任意区域触摸、多触点所有权与取消、旋转后仍可玩', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await lobby(page);
  const begin = await point(page, MENU_LAYOUT.start.x, MENU_LAYOUT.start.y); await page.touchscreen.tap(begin.x, begin.y); await page.waitForFunction(() => !!window.__bloom);
  const cdp = await context.newCDPSession(page), p = await point(page, 210, 1000), moved = await point(page, 288, 1000), other = await point(page, 530, 900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...moved, id: 1 }] });
  const owner = await page.evaluate(() => window.__bloom!.scene.controls.joystick!.pointerId);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...other, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...other, id: 2 }] });
  expect(await page.evaluate(() => window.__bloom!.scene.controls.joystick!.pointerId)).toBe(owner);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.__bloom!.scene.controls.joystick)).toBeNull();
  await page.screenshot({ path: 'test-results/mobile.png' });
  await page.setViewportSize({ width: 844, height: 390 }); await expect(page.locator('canvas')).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 }); await expect(page.locator('canvas')).toBeVisible();
  const bounds = await page.locator('canvas').boundingBox(); expect(bounds!.height).toBeGreaterThan(bounds!.width); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(781);
  await context.close();
});

test('胜负结算清除续玩、结算灵韵，连续三局返回出战页', async ({ page }) => {
  await start(page);
  for (const reason of ['health', 'survived', 'health']) {
    await page.evaluate(r => { const m = window.__bloom!.model; m.modal = null; m.pendingLevels = 0; m.coins = 25; if (r === 'health') m.player.hp = 0; else m.time = 179.99; }, reason);
    await expect(page.locator('#game')).toHaveAttribute('data-scene', 'result');
    expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
    await page.screenshot({ path: `test-results/result-${reason}.png` });
    await click(page, MENU_LAYOUT.restart.x, MENU_LAYOUT.restart.y); await expect(page.locator('#game')).toHaveAttribute('data-scene', 'lobby');
    await page.keyboard.press('Enter'); await page.waitForFunction(() => !!window.__bloom);
    expect(await page.evaluate(() => window.__bloom!.model.level)).toBe(1);
  }
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).coins, PROFILE_KEY)).toBe(75);
});
