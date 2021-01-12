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

import * as fs from 'fs';
import { injectable, inject } from 'inversify';
import { CLASSES } from '../inversify.types';
import { DriverHelper } from './DriverHelper';
import { TestConstants } from '../TestConstants';

@injectable()
export class ScreenCatcher {
    constructor(@inject(CLASSES.DriverHelper) private readonly driverHelper: DriverHelper) { }

    async catchMethodScreen(methodName: string, methodIndex: number, screenshotIndex: number) {
        const executionScreenCastDir = `${TestConstants.TEST_REPORT_FOLDER}/executionScreencast`;
        const executionScreenCastErrorsDir = `${TestConstants.TEST_REPORT_FOLDER}/executionScreencastErrors`;
        const formattedMethodIndex: string = new Intl.NumberFormat('en-us', { minimumIntegerDigits: 3 }).format(methodIndex);
        const formattedScreenshotIndex: string = new Intl.NumberFormat('en-us', { minimumIntegerDigits: 5 }).format(screenshotIndex).replace(/,/g, '');

        if (!fs.existsSync(TestConstants.TEST_REPORT_FOLDER)) {
            fs.mkdirSync(TestConstants.TEST_REPORT_FOLDER);
        }

        if (!fs.existsSync(executionScreenCastDir)) {
            fs.mkdirSync(executionScreenCastDir);
        }

        const date: Date = new Date();
        const timeStr: string = date.toLocaleTimeString('en-us', { hour12: false }) + '.' + new Intl.NumberFormat('en-us', { minimumIntegerDigits: 3 }).format(date.getMilliseconds());

        const screenshotPath: string = `${executionScreenCastDir}/${formattedMethodIndex}${formattedScreenshotIndex}--(${timeStr}): ${methodName}.png`;

        try {
            await this.catchScreen(screenshotPath);
        } catch (err) {
            if (!fs.existsSync(executionScreenCastErrorsDir)) {
                fs.mkdirSync(executionScreenCastErrorsDir);
            }

            let errorLogFilePath: string = screenshotPath.replace('.png', '.txt');
            errorLogFilePath = errorLogFilePath.replace(executionScreenCastDir, executionScreenCastErrorsDir);
            await this.writeErrorLog(errorLogFilePath, err);
        }
    }

    async catchScreen(screenshotPath: string) {
        const screenshot: string = await this.driverHelper.getDriver().takeScreenshot();
        const screenshotStream = fs.createWriteStream(screenshotPath);
        screenshotStream.write(new Buffer(screenshot, 'base64'));
        screenshotStream.end();
    }

    async writeErrorLog(errorLogPath: string, err: Error) {
        console.log(`Failed to save screenshot, additional information in the ${errorLogPath}`);

        if (err.stack) {
            const screenshotStream = fs.createWriteStream(errorLogPath);
            screenshotStream.write(new Buffer(err.stack, 'utf8'));
            screenshotStream.end();
        }
    }

}
