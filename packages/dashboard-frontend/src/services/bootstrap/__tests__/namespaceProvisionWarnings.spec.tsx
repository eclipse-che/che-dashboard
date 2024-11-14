/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { container } from '@/inversify.config';
import { checkNamespaceProvisionWarnings } from '@/services/bootstrap/namespaceProvisionWarnings';
import { WarningsReporterService } from '@/services/bootstrap/warningsReporter';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';

const warningsReporterService = container.get(WarningsReporterService);

describe('Check namespace provision warnings', () => {
  afterEach(() => {
    warningsReporterService.clearWarnings();
    jest.clearAllMocks();
  });

  it('should not register any warning', () => {
    const store = new MockStoreBuilder().build();

    checkNamespaceProvisionWarnings(store.getState);

    expect(warningsReporterService.hasWarning).toBeFalsy();

    const nextStore = new MockStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {},
          },
        },
      })
      .build();

    checkNamespaceProvisionWarnings(nextStore.getState);

    expect(warningsReporterService.hasWarning).toBeFalsy();
  });

  it('should register the autoProvision warning', () => {
    const store = new MockStoreBuilder()
      .withDwServerConfig({
        defaultNamespace: {
          autoProvision: false,
        },
      })
      .build();

    checkNamespaceProvisionWarnings(store.getState);

    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'autoProvisionWarning',
        title:
          'Automatic namespace provisioning is disabled. Namespace might not have been configured yet. Please, contact the administrator.',
      },
    ]);
  });
});
