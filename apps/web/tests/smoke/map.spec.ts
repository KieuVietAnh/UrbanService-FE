import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';

const validEmail = 'nguyengiauzxc@gmail.com';
const validPassword = 'nguyenhuugiau';

test.setTimeout(120000);
test.describe('Map view', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth endpoint so tests don't depend on the backend
    await page.route('**/api/auth/login', async (route) => {
      const req = route.request();
      const post = (await req.postData()) || '';
      if (post.includes(validEmail) && post.includes(validPassword)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { token: 'fake-token', user: { userId: 1, email: validEmail, fullName: 'Test User', role: 'service-user', isVerified: true } } }),
        });
      } else {
        await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
      }
    });


    await page.route('**/api/user/feedbacks**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              feedbackId: 'feedback-map-smoke-1',
              userId: 1,
              title: 'Phản ánh kiểm thử bản đồ',
              categoryName: 'Street Lighting',
              status: 'Verified',
              priority: 'Medium',
              latitude: 10.77653,
              longitude: 106.700981,
            },
          ],
        }),
      });
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const loginPage = new LoginPage(page);
    await loginPage.login(validEmail, validPassword);
    await page.waitForURL('**/dashboard');
  });

  test('Map loads and markers are clickable', async ({ page }) => {
    await page.goto('/community/map');
    const mapPage = new MapPage(page);
    await mapPage.expectMapLoaded();

    await expect(mapPage.markerLayer.first()).toBeVisible({ timeout: 10000 });
    // click first marker and ensure popup appears
    await mapPage.clickFirstMarker();
    await expect(page.locator('.leaflet-popup-content')).toBeVisible();
  });
});
