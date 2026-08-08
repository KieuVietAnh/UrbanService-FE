import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('https://urbanservice.me/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'xbg4623@gmail.com');
    await page.fill('input[type="password"]', '123456789');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    console.log('Logged in, current URL:', page.url());
    await page.goto('https://urbanservice.me/manager/approvals', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('On approvals page:', page.url());
    const rowCount = await page.locator('table tbody tr').count();
    console.log('rowCount =', rowCount);
    if (rowCount > 0) {
      const html = await page.locator('table tbody tr').first().innerHTML();
      console.log('first row html:', html);
      const btnCount = await page.locator('table tbody tr').first().locator('button').count();
      console.log('first row button count =', btnCount);
      const btnText = await page.locator('table tbody tr').first().locator('button').allTextContents();
      console.log('first row button texts =', JSON.stringify(btnText));
      const btnRoleCount = await page.locator('table tbody tr').first().locator('button:has-text("Xem hồ sơ")').count();
      console.log('btn:has-text("Xem hồ sơ") count =', btnRoleCount);
      const actionButtonHtml = await page.locator('table tbody tr').first().locator('button, a').first().innerHTML();
      console.log('first action element html:', actionButtonHtml);

      await page.locator('table tbody tr').first().locator('button:has-text("Xem hồ sơ"), button:has-text("View"), button:has-text("Open")').first().click();
      await page.waitForURL(/\/manager\/approvals\/[A-Za-z0-9_-]+/, { timeout: 30000 });
      console.log('After click URL:', page.url());
      await page.waitForTimeout(2000);
      const headingTexts = await page.evaluate(() => Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]')).map((node) => node.textContent?.trim()).filter(Boolean));
      console.log('headings:', JSON.stringify(headingTexts));
      const ariaLabels = await page.evaluate(() => Array.from(document.querySelectorAll('[aria-label]')).map((node) => node.getAttribute('aria-label')).filter(Boolean));
      console.log('aria-labels:', JSON.stringify(ariaLabels));
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
      console.log('bodyText snippet:', JSON.stringify(bodyText));
    }
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await browser.close();
  }
})();
