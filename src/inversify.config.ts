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

import { Container } from 'inversify';
import { KeycloakSetupService } from './services/keycloak/setup';
import { KeycloakAuthService } from './services/keycloak/auth';
import { Debounce } from './services/helpers/debounce';
import { CheWorkspaceClient } from './services/cheWorkspaceClient';
import { AppAlerts } from './services/alerts/appAlerts';
import { IssuesReporterService } from './services/bootstrap/issuesReporter';

const container = new Container();

container.bind(IssuesReporterService).toSelf().inSingletonScope();
container.bind(KeycloakSetupService).toSelf().inSingletonScope();
container.bind(KeycloakAuthService).toSelf().inSingletonScope();
container.bind(Debounce).toSelf();
container.bind(CheWorkspaceClient).toSelf().inSingletonScope();
container.bind(AppAlerts).toSelf().inSingletonScope();

export { container };
