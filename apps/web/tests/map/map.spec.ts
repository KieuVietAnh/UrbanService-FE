import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

test.describe('Leaflet Map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
  });

  test('Community map renders and markers load from real API', async ({ page }) => {
    await page.goto('/community/map');
    const mapPage = new MapPage(page);
    await mapPage.expectMapLoaded();

    if (await mapPage.hasMarkers()) {
      await mapPage.clickFirstMarker();
      await expect(page.locator('.leaflet-popup-content')).toBeVisible();
    } else {
      await expect(mapPage.emptyStateMessage).toBeVisible();
    }
  });
});
