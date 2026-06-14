import { Page } from '@playwright/test';
import { BasePage } from '../utils/basePage';

export class MapPage extends BasePage {
  readonly leafletContainer;
  readonly markerLayer;
  readonly mapContainer;
  readonly spinner;
  readonly emptyStateCard;

  constructor(page: Page) {
    super(page);
    this.leafletContainer = page.locator('.leaflet-container');
    this.markerLayer = page.locator('.leaflet-marker-pane .leaflet-marker-icon');
    this.mapContainer = page.locator('.card .overflow-hidden.rounded-3xl.border.border-slate-200.shadow-sm.h-[550px]');
    this.spinner = page.locator('.loading-spinner, .loading.loading-spinner');
    this.emptyStateCard = page.locator('.card .flex.h-[550px]');
  }

  async expectMapLoaded() {
    await this.page.waitForLoadState('networkidle');
    await Promise.any([
      this.leafletContainer.waitFor({ state: 'attached', timeout: 20000 }),
      this.mapContainer.waitFor({ state: 'attached', timeout: 20000 }),
    ]);
    await this.spinner.waitFor({ state: 'detached', timeout: 20000 });
    await Promise.any([
      this.markerLayer.first().waitFor({ state: 'visible', timeout: 20000 }),
      this.emptyStateCard.waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  }

  async hasMarkers() {
    return (await this.markerLayer.count()) > 0;
  }

  async clickFirstMarker() {
    const marker = this.markerLayer.first();
    await marker.waitFor({ state: 'visible', timeout: 20000 });
    await marker.scrollIntoViewIfNeeded();
    await marker.click();
  }
}
