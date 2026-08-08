# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke\system-staff\system-staff.spec.ts >> System Staff smoke tests >> Feedback detail and conversation panel
- Location: tests\smoke\system-staff\system-staff.spec.ts:91:3

# Error details

```
Error: page.goto: Page crashed
Call log:
  - navigating to "https://urbanservice.me/staff/feedbacks", waiting until "load"

```

# Test source

```ts
  1   | import { expect, Page, test } from '@playwright/test';
  2   | import { LoginPage } from '../../pages/LoginPage';
  3   | import { DashboardPage } from '../../pages/DashboardPage';
  4   | import ManagementFeedbackListPage from '../../../src/pages/staff/ManagementFeedbackListPage';
  5   | 
  6   | const staffEmail = 'kvietanh123@gmail.com';
  7   | const staffPassword = '123456789';
  8   | 
  9   | const queueRoute = '/staff/queue';
  10  | const feedbackListRoute = '/staff/feedbacks';
  11  | const duplicateDetectionRoute = '/staff/duplicates';
  12  | const assignmentHistoryRoute = '/staff/assignment-history';
  13  | const areaAlertsRoute = '/staff/area-alerts';
  14  | 
  15  | type PageMonitor = {
  16  |   pageErrors: string[];
  17  |   consoleErrors: string[];
  18  |   badResponses: string[];
  19  | };
  20  | 
  21  | const attachPageMonitoring = (page: Page): PageMonitor => {
  22  |   const monitor: PageMonitor = { pageErrors: [], consoleErrors: [], badResponses: [] };
  23  | 
  24  |   page.on('pageerror', (error) => monitor.pageErrors.push(error?.message || String(error)));
  25  |   page.on('console', (m) => { if (m.type() === 'error') monitor.consoleErrors.push(m.text()); });
  26  |   page.on('response', (response) => {
  27  |     const status = response.status();
  28  |     const url = response.url();
  29  |     if (status >= 400 && /\/api\//i.test(url)) monitor.badResponses.push(`${status} ${response.request().method()} ${url}`);
  30  |   });
  31  | 
  32  |   return monitor;
  33  | };
  34  | 
  35  | const assertNoErrors = async (monitor: PageMonitor, context: string) => {
  36  |   const relevant = monitor.pageErrors.filter((e) => !/Unexpected token '<'/.test(String(e)));
  37  |   expect(relevant, `${context}: unexpected page errors`).toEqual([]);
  38  |   // Filter known benign console messages (HTML responses or 405s returned from some endpoints)
  39  |   const consoleRelevant = monitor.consoleErrors.filter((e) => {
  40  |     if (!e) return false;
  41  |     if (/Unexpected token '<'/.test(e)) return false;
  42  |     if (/Failed to load resource: the server responded with a status of 405/.test(e)) return false;
  43  |     if (/\b405\b/.test(e) && /Method Not Allowed/i.test(e)) return false;
  44  |     return true;
  45  |   });
  46  |   expect(consoleRelevant, `${context}: unexpected console errors`).toEqual([]);
  47  |   // Ignore 405 responses from some management endpoints which are read-only in smoke runs
  48  |   const badRelevant = monitor.badResponses.filter((e) => {
  49  |     if (!e) return false;
  50  |     if (/\b405\b/.test(e)) return false;
  51  |     return true;
  52  |   });
  53  |   expect(badRelevant, `${context}: unexpected API failures`).toEqual([]);
  54  | };
  55  | 
  56  | const loginAsStaff = async (page: Page) => {
  57  |   await page.goto('/login');
  58  |   const loginPage = new LoginPage(page);
  59  |   await loginPage.login(staffEmail, staffPassword);
  60  |   await page.waitForLoadState('networkidle');
  61  |   await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 30000 });
  62  |   await page.waitForSelector('.admin-page-hero, .admin-hero-title, #staff-queue', { timeout: 30000 }).catch(() => undefined);
  63  | };
  64  | 
  65  | test.describe.serial('System Staff smoke tests', () => {
  66  |   test.setTimeout(120000);
  67  | 
  68  |   test('Login and queue loads', async ({ page }) => {
  69  |     const monitor = attachPageMonitoring(page);
  70  |     await loginAsStaff(page);
  71  |     await page.goto(queueRoute);
  72  |     await page.waitForLoadState('networkidle');
  73  | 
  74  |     // Check for the admin hero title or queue indicator (fall back to text if heading not found)
  75  |     // Check for expected queue headings; different deployments may show different titles
  76  |     await expect(page.getByRole('heading', { name: /Hàng Chờ Kiểm Duyệt AI|Quản Lý Hội Thoại|Hàng đợi trao đổi/i })).toBeVisible({ timeout: 15000 });
  77  | 
  78  |     await assertNoErrors(monitor, 'Queue');
  79  |   });
  80  | 
  81  |   test('Feedback list loads', async ({ page }) => {
  82  |     const monitor = attachPageMonitoring(page);
  83  |     await loginAsStaff(page);
  84  |     await page.goto(feedbackListRoute);
  85  |     await page.waitForLoadState('networkidle');
  86  | 
  87  |     await expect(page.locator('h1.admin-hero-title, .management-feedback-list')).toBeVisible({ timeout: 15000 });
  88  |     await assertNoErrors(monitor, 'Feedback list');
  89  |   });
  90  | 
  91  |   test('Feedback detail and conversation panel', async ({ page }) => {
  92  |     const monitor = attachPageMonitoring(page);
  93  |     await loginAsStaff(page);
  94  | 
  95  |     // Open first feedback from list if present
> 96  |     await page.goto(feedbackListRoute);
      |                ^ Error: page.goto: Page crashed
  97  |     await page.waitForLoadState('networkidle');
  98  | 
  99  |     const firstRow = page.locator('table tbody tr').first();
  100 |     const count = await page.locator('table tbody tr').count();
  101 |     if (count === 0) {
  102 |       console.log('No feedbacks available — skipping detail checks');
  103 |       return;
  104 |     }
  105 | 
  106 |     await expect(firstRow).toBeVisible({ timeout: 20000 });
  107 |     await firstRow.click();
  108 |     await page.waitForURL(/\/staff\/feedbacks\/[A-Za-z0-9_-]+/, { timeout: 30000 });
  109 | 
  110 |     // Check detail loaded
  111 |     await expect(page.locator('h1.admin-hero-title, .admin-section-title')).toBeVisible({ timeout: 15000 });
  112 | 
  113 |     // Open exchange tab
  114 |     try {
  115 |       await page.getByRole('button', { name: /Trao đổi|Exchange|Trao đổi phản ánh/i }).click();
  116 |     } catch {
  117 |       // if tab button not found, use selector
  118 |       await page.locator('button').filter({ hasText: /Trao đổi|Exchange/ }).first().click().catch(() => undefined);
  119 |     }
  120 | 
  121 |     await expect(page.locator('.chat-bubble, .exchange-list, .staff-communication-surface')).toBeVisible({ timeout: 15000 });
  122 | 
  123 |     // Verify existing messages or internal note badge if present
  124 |     const messages = await page.locator('.chat-bubble').count();
  125 |     if (messages > 0) await expect(page.locator('.chat-bubble').first()).toBeVisible();
  126 |     // internal note badge
  127 |     await expect(page.locator('.badge, .internal-note, .note-badge').first()).toBeVisible().catch(() => undefined);
  128 | 
  129 |     await assertNoErrors(monitor, 'Feedback detail');
  130 |   });
  131 | 
  132 |   test('Duplicate detection and detail', async ({ page }) => {
  133 |     const monitor = attachPageMonitoring(page);
  134 |     await loginAsStaff(page);
  135 |     await page.goto(duplicateDetectionRoute);
  136 |     await page.waitForLoadState('networkidle');
  137 | 
  138 |     await expect(page.locator('h2.admin-section-title, h1.admin-hero-title, .duplicate-list')).toBeVisible({ timeout: 15000 });
  139 | 
  140 |     // Open first candidate if present
  141 |     const count = await page.locator('.duplicate-candidate-row, table tbody tr').count();
  142 |     if (count > 0) {
  143 |       await page.locator('.duplicate-candidate-row, table tbody tr').first().click();
  144 |       await page.waitForURL(/\/staff\/duplicates\/[A-Za-z0-9_-]+/, { timeout: 30000 });
  145 |       await expect(page.locator('h2.admin-section-title, .duplicate-detail')).toBeVisible({ timeout: 15000 });
  146 |     }
  147 | 
  148 |     await assertNoErrors(monitor, 'Duplicate detection');
  149 |   });
  150 | 
  151 |   test('Assignment history loads', async ({ page }) => {
  152 |     const monitor = attachPageMonitoring(page);
  153 |     await loginAsStaff(page);
  154 |     await page.goto(assignmentHistoryRoute);
  155 |     await page.waitForLoadState('networkidle');
  156 | 
  157 |     await expect(page.locator('h1.admin-hero-title, .assignment-history')).toBeVisible({ timeout: 15000 });
  158 |     await assertNoErrors(monitor, 'Assignment history');
  159 |   });
  160 | 
  161 |   test('Area alert management loads', async ({ page }) => {
  162 |     const monitor = attachPageMonitoring(page);
  163 |     await loginAsStaff(page);
  164 |     await page.goto(areaAlertsRoute);
  165 |     await page.waitForLoadState('networkidle');
  166 | 
  167 |     await expect(page.locator('h1.admin-hero-title')).toBeVisible({ timeout: 15000 });
  168 |     await assertNoErrors(monitor, 'Area alerts');
  169 |   });
  170 | 
  171 | });
  172 | 
```