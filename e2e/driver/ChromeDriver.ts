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

import 'chromedriver';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { ThenableWebDriver, Builder } from 'selenium-webdriver';
import { IDriver } from './IDriver';
import { Options } from 'selenium-webdriver/chrome';
import { TestConstants } from '../TestConstants';

@injectable()
export class ChromeDriver implements IDriver {
    private readonly driver: ThenableWebDriver;

    constructor() {
        const options: Options = this.getDriverOptions();
        this.driver = this.getDriverBuilder(options).build();

        this.driver
            .manage()
            .window()
            .setSize(TestConstants.TEST_RESOLUTION_WIDTH, TestConstants.TEST_RESOLUTION_HEIGHT);
    }

    get(): ThenableWebDriver {
        return this.driver;
    }

    private getDriverOptions(): Options {
        let options: Options = new Options()
            .addArguments('--no-sandbox')
            .addArguments('--disable-web-security')
            .addArguments('--allow-running-insecure-content')
            .addArguments('--ignore-certificate-errors');
        // if 'true' run in 'headless' mode
        if (TestConstants.TEST_HEADLESS) {
            options = options.addArguments('headless');
        }

        return options;
    }

    private getDriverBuilder(options: Options): Builder {
        const disableW3copts = { 'goog:chromeOptions': { 'w3c': false } };
        let builder: Builder = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options);

        // if 'false' w3c protocl is disabled
        if (!TestConstants.TEST_W3C_CHROME_OPTION) {
            builder.withCapabilities(disableW3copts)
                .forBrowser('chrome')
                .setChromeOptions(options);
        }

        // if 'true' run with remote driver
        if (TestConstants.TEST_REMOTE_DRIVER_URL) {
            builder = builder.usingServer(TestConstants.TEST_REMOTE_DRIVER_URL);
        }

        return builder;

    }

}
