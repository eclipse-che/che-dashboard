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

import { testContainer } from '../inversify.config';
import { CLASSES, TYPES } from '../inversify.types';
import { Dashboard } from '../pageobjects/Dashboard';
import { ILoginPage } from '../pageobjects/login/ILoginPage';

const loginPage: ILoginPage = testContainer.get<ILoginPage>(TYPES.LoginPage);
const dashboard: Dashboard = testContainer.get(CLASSES.Dashboard);

suite('Suite', async () => {
  test('Test', async () => {

    await loginPage.login();
    await dashboard.waitPage();


  });
});
