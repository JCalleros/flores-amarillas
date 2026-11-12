import { defineConfig, type Project } from '@playwright/test';

const projects: Project[] = [];
for (const browserName of ['chromium', 'webkit'] as const) {
  const launchOptions = browserName === 'chromium'
    ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
    : undefined;
  projects.push(
    { name: `${browserName}-desktop`, use: { browserName, launchOptions, viewport: { width: 1366, height: 768 } } },
    { name: `${browserName}-mobile`, use: { browserName, launchOptions, viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true } },
    { name: `${browserName}-landscape`, use: { browserName, launchOptions, viewport: { width: 640, height: 320 }, hasTouch: true, isMobile: true } },
  );
}

export default defineConfig({
  testDir: './tests',
  workers: 2,
  projects,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
