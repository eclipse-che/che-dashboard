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
import * as mocha from 'mocha';
import { IDriver } from './IDriver';
import * as fs from 'fs';
import * as rm from 'rimraf';
import { TestConstants } from '../TestConstants';
import { logging } from 'selenium-webdriver';
import { DriverHelper } from '../utils/DriverHelper';
import { ScreenCatcher } from '../utils/ScreenCatcher';
import { testContainer } from '../inversify.config';
import { TYPES, CLASSES } from '../inversify.types';

const driver: IDriver = testContainer.get(TYPES.Driver);
const driverHelper: DriverHelper = testContainer.get(CLASSES.DriverHelper);
const screenCatcher: ScreenCatcher = testContainer.get(CLASSES.ScreenCatcher);
let methodIndex: number = 0;
let deleteScreencast: boolean = true;

class CheDashboardReporter extends mocha.reporters.Spec {
  constructor(runner: mocha.Runner, options: mocha.MochaOptions) {
    super(runner, options);

    runner.on('start', async (test: mocha.Test) => {
//       const launchInformation: string =
//         `################## Launch Information ##################

//       TS_SELENIUM_BASE_URL: ${TestConstants.TS_SELENIUM_BASE_URL}
//       TS_SELENIUM_HEADLESS: ${TestConstants.TS_SELENIUM_HEADLESS}

//       TS_SELENIUM_DEFAULT_ATTEMPTS: ${TestConstants.TS_SELENIUM_DEFAULT_ATTEMPTS}
//       TS_SELENIUM_DEFAULT_POLLING: ${TestConstants.TS_SELENIUM_DEFAULT_POLLING}
//       TS_SELENIUM_DEFAULT_TIMEOUT: ${TestConstants.TS_SELENIUM_DEFAULT_TIMEOUT}

//       TS_SELENIUM_LANGUAGE_SERVER_START_TIMEOUT: ${TestConstants.TS_SELENIUM_LANGUAGE_SERVER_START_TIMEOUT}
//       TS_SELENIUM_LOAD_PAGE_TIMEOUT: ${TestConstants.TS_SELENIUM_LOAD_PAGE_TIMEOUT}
//       TS_SELENIUM_START_WORKSPACE_TIMEOUT: ${TestConstants.TS_SELENIUM_START_WORKSPACE_TIMEOUT}
//       TS_SELENIUM_WORKSPACE_STATUS_ATTEMPTS: ${TestConstants.TS_SELENIUM_WORKSPACE_STATUS_ATTEMPTS}
//       TS_SELENIUM_WORKSPACE_STATUS_POLLING: ${TestConstants.TS_SELENIUM_WORKSPACE_STATUS_POLLING}
//       TS_SELENIUM_PLUGIN_PRECENCE_ATTEMPTS: ${TestConstants.TS_SELENIUM_PLUGIN_PRECENCE_ATTEMPTS}
//       TS_SELENIUM_PLUGIN_PRECENCE_POLLING: ${TestConstants.TS_SELENIUM_DEFAULT_POLLING}
//       TS_SELENIUM_HAPPY_PATH_WORKSPACE_NAME: ${TestConstants.TS_SELENIUM_HAPPY_PATH_WORKSPACE_NAME}
//       TS_SELENIUM_USERNAME: ${TestConstants.TS_SELENIUM_USERNAME}
//       TS_SELENIUM_PASSWORD: ${TestConstants.TS_SELENIUM_PASSWORD}
//       TS_SELENIUM_DELAY_BETWEEN_SCREENSHOTS: ${TestConstants.TS_SELENIUM_DELAY_BETWEEN_SCREENSHOTS}
//       TS_SELENIUM_REPORT_FOLDER: ${TestConstants.TS_SELENIUM_REPORT_FOLDER}
//       TS_SELENIUM_EXECUTION_SCREENCAST: ${TestConstants.TS_SELENIUM_EXECUTION_SCREENCAST}
//       DELETE_SCREENCAST_IF_TEST_PASS: ${TestConstants.DELETE_SCREENCAST_IF_TEST_PASS}
//       TS_SELENIUM_REMOTE_DRIVER_URL: ${TestConstants.TS_SELENIUM_REMOTE_DRIVER_URL}
//       DELETE_WORKSPACE_ON_FAILED_TEST: ${TestConstants.DELETE_WORKSPACE_ON_FAILED_TEST}
//       TS_SELENIUM_LOG_LEVEL: ${TestConstants.TS_SELENIUM_LOG_LEVEL}

// ########################################################
//       `;
//       console.log(launchInformation);

      rm.sync(TestConstants.TEST_REPORT_FOLDER);
    });

    runner.on('test', async function (test: mocha.Test) {
      if (!TestConstants.TEST_EXECUTION_SCREENCAST) {
        return;
      }

      methodIndex = methodIndex + 1;
      const currentMethodIndex: number = methodIndex;
      let iterationIndex: number = 1;

      while (!(test.state === 'passed' || test.state === 'failed')) {
        await screenCatcher.catchMethodScreen(test.title, currentMethodIndex, iterationIndex);
        iterationIndex = iterationIndex + 1;

        await driverHelper.wait(TestConstants.TEST_DELAY_BETWEEN_SCREENSHOTS);
      }
    });

    runner.on('end', async function (test: mocha.Test) {
      // ensure that fired events done
      await driver.get().sleep(5000);

      // close driver
      await driver.get().quit();

      // delete screencast folder if conditions matched
      if (deleteScreencast && TestConstants.TEST_DELETE_SCREENCAST_IF_TEST_PASS) {
        rm.sync(TestConstants.TEST_REPORT_FOLDER);
      }
    });

    runner.on('fail', async function (test: mocha.Test) {
      // raise flag for keeping the screencast
      deleteScreencast = false;

      const testFullTitle: string = test.fullTitle().replace(/\s/g, '_');
      const testTitle: string = test.title.replace(/\s/g, '_');

      const testReportDirPath: string = `${TestConstants.TEST_REPORT_FOLDER}/${testFullTitle}`;
      const screenshotFileName: string = `${testReportDirPath}/screenshot-${testTitle}.png`;
      const pageSourceFileName: string = `${testReportDirPath}/pagesource-${testTitle}.html`;
      const browserLogsFileName: string = `${testReportDirPath}/browserlogs-${testTitle}.txt`;


      // create reporter dir if not exist
      const reportDirExists: boolean = fs.existsSync(TestConstants.TEST_REPORT_FOLDER);

      if (!reportDirExists) {
        fs.mkdirSync(TestConstants.TEST_REPORT_FOLDER);
      }

      // create dir for failed test report if not exist
      const testReportDirExists: boolean = fs.existsSync(testReportDirPath);

      if (!testReportDirExists) {
        fs.mkdirSync(testReportDirPath);
      }

      // take screenshot and write to file
      const screenshot: string = await driver.get().takeScreenshot();
      const screenshotStream = fs.createWriteStream(screenshotFileName);
      screenshotStream.write(new Buffer(screenshot, 'base64'));
      screenshotStream.end();

      // take pagesource and write to file
      const pageSource: string = await driver.get().getPageSource();
      const pageSourceStream = fs.createWriteStream(pageSourceFileName);
      pageSourceStream.write(new Buffer(pageSource));
      pageSourceStream.end();

      // take browser console logs and write to file
      const browserLogsEntries: logging.Entry[] = await driverHelper.getDriver().manage().logs().get('browser');
      let browserLogs: string = '';

      browserLogsEntries.forEach(log => {
        browserLogs += `\"${log.level}\" \"${log.type}\" \"${log.message}\"\n`;
      });

      const browserLogsStream = fs.createWriteStream(browserLogsFileName);
      browserLogsStream.write(new Buffer(browserLogs));
      browserLogsStream.end();
    });
  }
}

export = CheDashboardReporter;
