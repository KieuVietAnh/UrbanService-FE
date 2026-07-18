import { Page } from '@playwright/test';
import { BasePage } from '../utils/basePage';

export class MapPage extends BasePage {
  readonly leafletContainer;
  readonly markerLayer;
  readonly mapContainer;
  readonly spinner;
  readonly loadingState;
  readonly emptyStateCard;

  constructor(page: Page) {
    super(page);
    this.leafletContainer = page.locator('.leaflet-container');
    this.markerLayer = page.locator('.leaflet-marker-pane .leaflet-marker-icon');
    this.mapContainer = page.locator('.leaflet-container');
    this.spinner = page.locator('.loading-spinner, .loading.loading-spinner');
    this.loadingState = page.getByTestId('community-map-loading');
    this.emptyStateCard = page.getByTestId('community-map-empty-state');
  }

  async expectMapLoaded() {
    await this.page.waitForLoadState('domcontentloaded');

    await this.page.waitForFunction(() => {
      const marker = document.querySelector(
        '.leaflet-marker-pane .leaflet-marker-icon'
      );
      const emptyState = document.querySelector(
        '[data-testid="community-map-empty-state"]'
      );

      return Boolean(marker || emptyState);
    }, undefined, { timeout: 60000 });

    await this.loadingState.waitFor({
      state: 'detached',
      timeout: 60000,
    }).catch(() => undefined);
  }

  async hasMarkers() {
    return (await this.markerLayer.count()) > 0;
  }

  async clickFirstMarker() {
    const marker = this.markerLayer.first();
    await marker.waitFor({ state: 'visible', timeout: 20000 });
    await marker.scrollIntoViewIfNeeded();

    // Leaflet markers can be flaky in CI while the map is settling or when a
    // tooltip is rendered during Playwright's hover step. Try a normal click
    // first, then fall back to a forced DOM click and a coordinate click.
    await marker.click({ force: true });

    if ((await this.page.locator('.leaflet-popup-content').count()) === 0) {
      await marker.dispatchEvent('click');
    }

    if ((await this.page.locator('.leaflet-popup-content').count()) === 0) {
      const box = await marker.boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  }
}
