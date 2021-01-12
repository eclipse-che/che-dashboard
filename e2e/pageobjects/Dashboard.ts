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
import { CLASSES } from '../inversify.types';
import { DriverHelper } from '../utils/DriverHelper';
import { TestConstants } from '../TestConstants';
import { By } from 'selenium-webdriver';
import { Logger } from '../utils/Logger';


@injectable()
export class Dashboard {
  private static readonly GET_STARTED_BUTTON_TEXT = 'Get Started Page'
  private static readonly WORKSPACES_BUTTON_TEXT = 'Workspaces'
  private static readonly ADMINISTRATION_BUTTON_TEXT = 'Administration'
  private static readonly CREATE_WORKSPACE_BUTTON_TEXT = 'Create Workspace'

  constructor(@inject(CLASSES.DriverHelper) private readonly driverHelper: DriverHelper) { }

  async openDashboard(timeout: number = TestConstants.TEST_LOAD_PAGE_TIMEOUT) {
    Logger.debug('Dashboard.openDashboard');

    await this.driverHelper.navigateToUrl(TestConstants.TEST_BASE_URL);
    await this.waitPage(timeout);
  }

  async waitPage(timeout: number = TestConstants.TEST_DEFAULT_TIMEOUT) {
    Logger.debug('Dashboard.waitPage');

    await this.waitDashboardButton(Dashboard.GET_STARTED_BUTTON_TEXT, timeout);
    await this.waitDashboardButton(Dashboard.WORKSPACES_BUTTON_TEXT, timeout);
    await this.waitDashboardButton(Dashboard.ADMINISTRATION_BUTTON_TEXT, timeout);
    await this.waitDashboardButton(Dashboard.CREATE_WORKSPACE_BUTTON_TEXT, timeout);
  }

  private async clickDashboardButton(buttonText: string, timeout: number = TestConstants.TEST_DEFAULT_TIMEOUT) {
    const buttonLocator: By = this.getButtonLocator(buttonText);

    await this.driverHelper.waitAndClick(buttonLocator, timeout);
  }

  private async waitDashboardButton(buttonText: string, timeout: number = TestConstants.TEST_DEFAULT_TIMEOUT) {
    const buttonLocator: By = this.getButtonLocator(buttonText);

    await this.driverHelper.waitVisibility(buttonLocator, timeout);
  }

  private getButtonLocator(buttonText: string): By {
    const buttonXpathLocator = `//div[@id='page-sidebar']//a[text()='${buttonText}']`;

    return By.xpath(buttonXpathLocator);
  }
}


