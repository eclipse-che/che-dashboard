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

export const TestConstants = {
  /**
   * Base URL of the application which should be checked
   */
  TEST_BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',

  /**
   * Run browser in "Headless" (hiden) mode, "false" by default.
   */
  TEST_HEADLESS: process.env.TEST_HEADLESS === 'true',

  /**
   * Run browser with an enabled or disabled W3C protocol (on Chrome  76 and upper, it is enabled by default), "true" by default.
   */
  TEST_W3C_CHROME_OPTION: process.env.TEST_W3C_CHROME_OPTION !== 'false',

  /**
   * Browser width resolution, "1920" by default.
   */
  TEST_RESOLUTION_WIDTH: Number(process.env.TEST_RESOLUTION_WIDTH) || 1920,

  /**
   * Browser height resolution, "1080" by default.
   */
  TEST_RESOLUTION_HEIGHT: Number(process.env.TEST_RESOLUTION_HEIGHT) || 1080,

  /**
   * Remote driver URL.
   */
  TEST_REMOTE_DRIVER_URL: process.env.TEST_REMOTE_DRIVER_URL || '',

  /**
   * Log level settings, possible variants: 'INFO' (by default), 'DEBUG', 'TRACE'.
   */
  TEST_LOG_LEVEL: process.env.TEST_LOG_LEVEL || 'INFO',

  /**
   * Default timeout for most of the waitings, "20 000" by default.
   */
  TEST_DEFAULT_TIMEOUT: Number(process.env.TEST_DEFAULT_TIMEOUT) || 20000,

  /**
   * Default ammount of tries, "5" by default.
   */
  TEST_DEFAULT_ATTEMPTS: Number(process.env.TEST_DEFAULT_ATTEMPTS) || 5,

  /**
   * Default delay in milliseconds between tries, "1000" by default.
   */
  TEST_DEFAULT_POLLING: Number(process.env.TEST_DEFAULT_POLLING) || 1000,

  /**
   * Timeout in milliseconds waiting for page load, "120 000" by default.
   */
  TEST_LOAD_PAGE_TIMEOUT: Number(process.env.TEST_LOAD_PAGE_TIMEOUT) || 120000,

  /**
   * Path to folder with tests execution report.
   */
  TEST_REPORT_FOLDER: process.env.TEST_REPORT_FOLDER || './report',

  /**
   * Enable or disable storing of execution screencast, "false" by default.
   */
  TEST_EXECUTION_SCREENCAST: process.env.TEST_EXECUTION_SCREENCAST === 'true',

  /**
   * Delay between screenshots catching in the milliseconds for the execution screencast.
   */
  TEST_DELAY_BETWEEN_SCREENSHOTS: Number(process.env.TEST_DELAY_BETWEEN_SCREENSHOTS) || 1000,

  /**
   * Delete screencast after execution if all tests passed, "true" by default.
   */
  TEST_DELETE_SCREENCAST_IF_TEST_PASS: process.env.DELETE_SCREENCAST_IF_TEST_PASS !== 'false',

  /**
   * Username used to log in che.openshift.io.
   */
  TEST_USERNAME: process.env.TEST_USERNAME || '',

  /**
   * Password used to log in che.openshift.io.
   */
  TEST_PASSWORD: process.env.TEST_PASSWORD || ''

};
