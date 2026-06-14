# Playwright E2E Testing Guide

## Overview
This guide explains how to run the Web app end-to-end tests located in `apps/web/tests` using Playwright.

The suite targets the deployed frontend at `http://152.42.177.174`.

## Test suite contents
- `apps/web/playwright.config.ts` - Playwright configuration for Chromium, Firefox, and WebKit
- `apps/web/tests/` - test specs and page objects
- `apps/web/tests/results` - generated artifacts, HTML report, screenshots, videos, and traces
- `apps/web/tests/fixtures/sample.png` - sample image fixture used for upload tests

## Available scripts
Use the repository root for all commands.

- `pnpm test:e2e` - run the full E2E suite in headless mode
- `pnpm test:e2e:ui` - open the Playwright test runner UI
- `pnpm test:e2e:report` - show the generated HTML report after a run

## Running tests locally
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Run all tests:
   ```bash
   pnpm test:e2e
   ```
3. Open the HTML report after the run:
   ```bash
   pnpm test:e2e:report
   ```

## Browser support
Playwright runs against:
- `chromium`
- `firefox`
- `webkit`

The workflow at `.github/workflows/playwright.yml` runs the suite on all three browsers.

## Failure artifacts
When tests fail, the following artifacts are retained automatically:
- screenshots
- videos
- trace files
- HTML report

The report is written to `apps/web/tests/results/html`.

## Tips for test stability
- Use the sample fixture from `apps/web/tests/fixtures/sample.png`
- Prefer page objects in `apps/web/tests/pages/`
- Avoid direct network mocks; this suite is designed for the deployed backend

## Notes
- The suite uses a real sample login account: `xbg4622@gmail.com` / `123456789`
- If the application UI changes, update the corresponding locator definitions in `apps/web/tests/pages/`
