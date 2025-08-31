import { test, expect, _electron as electron } from '@playwright/test';

// This test assumes the dev flow (npm run dev) is already running in another terminal
// so that the renderer dev server at http://localhost:3000 is available.

test('app launches and renders main window', async () => {
  const electronApp = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'development' },
  });

  const window = await electronApp.firstWindow();

  // Mirror renderer console logs to the terminal for quick diagnosis
  window.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[renderer:${type}] ${text}`);
  });

  await window.waitForLoadState('domcontentloaded');

  await expect(window).toHaveTitle(/Teacher Course Assignment/i);

  const root = await window.$('#root');
  expect(root).not.toBeNull();

  await electronApp.close();
});
