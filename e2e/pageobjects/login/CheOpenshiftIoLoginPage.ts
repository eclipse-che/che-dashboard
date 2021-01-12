/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { injectable, inject } from 'inversify';
import { CLASSES } from '../../inversify.types';
import { DriverHelper } from '../../utils/DriverHelper';
import { TestConstants } from '../../TestConstants';
import { By } from 'selenium-webdriver';
import { ILoginPage } from './ILoginPage';
import { Logger } from '../../utils/Logger';

@injectable()
export class CheOpenshiftIoLoginPage implements ILoginPage {
  private static readonly USERNAME_FIELD_XPATH_LOCATOR = '//input[@id=\'username\']'
  private static readonly PASSWORD_FIELD_XPATH_LOCATOR = '//input[@id=\'password\']'
  private static readonly NEXT_BUTTON_XPATH_LOCATOR = '//button[text()=\'Next\']'
  private static readonly LOGIN_BUTTON_XPATH_LOCATOR = '//input[@name=\'login\']'

  constructor(@inject(CLASSES.DriverHelper) private readonly driverHelper: DriverHelper) { }

  async login() {
    Logger.debug('CheOpenshiftIoLoginPage.login');

    await this.openLoginPage();
    await this.writeUsername();
    await this.clickNextButton();
    await this.writePassword();
    await this.clickLoginButton();
  }

  private async openLoginPage(timeout: number = TestConstants.TEST_LOAD_PAGE_TIMEOUT) {
    Logger.debug('CheOpenshiftIoLoginPage.openLoginPage');

    // Expected that test user not yet logged in and after going
    // to the "TEST_BASE_URL" will be redirected to the login page.
    await this.driverHelper.navigateToUrl(TestConstants.TEST_BASE_URL);

    await this.driverHelper.waitVisibility(By.xpath(CheOpenshiftIoLoginPage.USERNAME_FIELD_XPATH_LOCATOR), timeout);
    await this.driverHelper.waitVisibility(By.xpath(CheOpenshiftIoLoginPage.NEXT_BUTTON_XPATH_LOCATOR), timeout);
  }

  private async writeUsername(timeout: number = TestConstants.TEST_DEFAULT_TIMEOUT) {
    await this.driverHelper
      .enterValue(By.xpath(CheOpenshiftIoLoginPage.USERNAME_FIELD_XPATH_LOCATOR), TestConstants.TEST_USERNAME, timeout);
  }

  private async writePassword(timeout: number = TestConstants.TEST_LOAD_PAGE_TIMEOUT) {
    await this.driverHelper
      .enterValue(By.xpath(CheOpenshiftIoLoginPage.PASSWORD_FIELD_XPATH_LOCATOR), TestConstants.TEST_PASSWORD, timeout);
  }

  private async clickNextButton(timeout: number = TestConstants.TEST_DEFAULT_TIMEOUT) {
    await this.driverHelper
      .waitAndClick(By.xpath(CheOpenshiftIoLoginPage.NEXT_BUTTON_XPATH_LOCATOR), timeout);
  }

  private async clickLoginButton(timeout: number = TestConstants.TEST_DEFAULT_TIMEOUT) {
    await this.driverHelper
      .waitAndClick(By.xpath(CheOpenshiftIoLoginPage.LOGIN_BUTTON_XPATH_LOCATOR), timeout);
  }

}
