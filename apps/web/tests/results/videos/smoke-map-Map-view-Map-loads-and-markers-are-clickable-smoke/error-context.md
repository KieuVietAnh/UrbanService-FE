# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\map.spec.ts >> Map view >> Map loads and markers are clickable
- Location: tests\smoke\map.spec.ts:16:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at http://152.42.177.174/login
Call log:
  - navigating to "http://152.42.177.174/login", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { LoginPage } from '../pages/LoginPage';
  3  | import { MapPage } from '../pages/MapPage';
  4  | 
  5  | const validEmail = 'nguyengiauzxc@gmail.com';
  6  | const validPassword = 'nguyenhuugiau';
  7  | 
  8  | test.describe('Map view', () => {
  9  |   test.beforeEach(async ({ page }) => {
> 10 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_TIMED_OUT at http://152.42.177.174/login
  11 |     const loginPage = new LoginPage(page);
  12 |     await loginPage.login(validEmail, validPassword);
  13 |     await page.waitForURL('**/dashboard');
  14 |   });
  15 | 
  16 |   test('Map loads and markers are clickable', async ({ page }) => {
  17 |     await page.goto('/community/map');
  18 |     const mapPage = new MapPage(page);
  19 |     await mapPage.expectMapLoaded();
  20 |     const markerCount = await mapPage.markerLayer.count();
  21 |     await expect(markerCount).toBeGreaterThan(0);
  22 |     // click first marker and ensure popup appears
  23 |     await mapPage.clickFirstMarker();
  24 |     await expect(page.locator('.leaflet-popup-content')).toBeVisible();
  25 |   });
  26 | });
  27 | 
```