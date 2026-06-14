import { Locator, Page } from '@playwright/test';
import { BasePage } from '../utils/basePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly quickLoginButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="text"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.alert.alert-error, .text-red-600');
    this.quickLoginButtons = page.locator('button', { hasText: /Administrator|System Staff|Interaction Manager|Service Operator/ });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async fillInvalidCredentials() {
    await this.emailInput.fill('invalid@example.com');
    await this.passwordInput.fill('wrongpassword');
    await this.submitButton.click();
  }
}
