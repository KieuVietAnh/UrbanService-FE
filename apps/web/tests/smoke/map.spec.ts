import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

test.describe('Map view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
  });

  test('Map loads and markers are clickable', async ({ page }) => {
    await page.goto('/community/map');
    const mapPage = new MapPage(page);
    await mapPage.expectMapLoaded();
    const markerCount = await mapPage.markerLayer.count();
    await expect(markerCount).toBeGreaterThan(0);
    // click first marker and ensure popup appears
    await mapPage.clickFirstMarker();
    await expect(page.locator('.leaflet-popup-content')).toBeVisible();
  });
});
