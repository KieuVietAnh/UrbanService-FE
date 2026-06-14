import { Page } from '@playwright/test';
import { BasePage } from '../utils/basePage';

export class MapPage extends BasePage {
  readonly leafletContainer;
  readonly markerLayer;

  readonly emptyStateMessage;

  constructor(page: Page) {
    super(page);
    this.leafletContainer = page.locator('.leaflet-container');
    this.markerLayer = page.locator('.leaflet-marker-pane .leaflet-marker-icon');
      this.mapContainer = page.locator('.card .overflow-hidden.rounded-3xl.border.border-slate-200.shadow-sm.h-[550px]');
      this.spinner = page.locator('.loading-spinner, .loading.loading-spinner');
    this.emptyStateCard = page.locator('.card .flex.h-[550px]');
  }

  async expectMapLoaded() {
    await Promise.any([
      this.leafletContainer.waitFor({ state: 'attached', timeout: 10000 }),
      this.mapContainer.waitFor({ state: 'attached', timeout: 10000 }),
      this.emptyStateCard.waitFor({ state: 'visible', timeout: 10000 }),
      this.spinner.waitFor({ state: 'detached', timeout: 10000 }),
    ]);
  }

  async hasMarkers() {
    return (await this.markerLayer.count()) > 0;
  }

  async clickFirstMarker() {
    await this.markerLayer.first().waitFor({ state: 'visible', timeout: 5000 });
    await this.markerLayer.first().click({ force: true });
  }
}
