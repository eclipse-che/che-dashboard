/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import mockAxios from 'axios';

import { container } from '@/inversify.config';
import { checkNamespaceProvisionWarnings } from '@/services/bootstrap/namespaceProvisionWarnings';
import { WarningsReporterService } from '@/services/bootstrap/warningsReporter';
import { FakeStoreBuilder } from '@/store/__mocks__/storeBuilder';

const warningsReporterService = container.get(WarningsReporterService);

describe('Check namespace provision warnings', () => {
  const testUser = {
    name: 'test-user',
    attributes: { default: true },
  };

  const mockGet = mockAxios.get as jest.Mock;

  beforeEach(() => {
    mockGet.mockResolvedValueOnce({
      data: [testUser],
    });
  });

  afterEach(() => {
    warningsReporterService.clearWarnings();
    jest.clearAllMocks();
  });

  it('should not register any warning', async () => {
    let store = new FakeStoreBuilder().build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).not.toBeCalled();
    expect(warningsReporterService.hasWarning).toBeFalsy();

    store = new FakeStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {},
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).not.toBeCalled();
    expect(warningsReporterService.hasWarning).toBeFalsy();
  });

  it('should register the autoProvision warning', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        defaultNamespace: {
          autoProvision: false,
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'autoProvisionWarning',
        title:
          'Automatic namespace provisioning is disabled. Namespace for test-user might not have been configured yet. Please, contact the administrator.',
      },
    ]);
  });

  it('should register the advanced authorization warning for allowGroups', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {
              allowGroups: ['test-group'],
            },
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'advancedAuthorizationGroupsWarning',
        title:
          'Advanced authorization is enabled. User test-user might not be allowed. Please, contact the administrator.',
      },
    ]);
  });

  it('should register the advanced authorization warning for denyGroups', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {
              denyGroups: ['test-group'],
            },
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'advancedAuthorizationGroupsWarning',
        title:
          'Advanced authorization is enabled. User test-user might not be allowed. Please, contact the administrator.',
      },
    ]);
  });

  it('should register the advanced authorization warning for allowGroups', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {
              allowGroups: ['test-group'],
            },
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'advancedAuthorizationGroupsWarning',
        title:
          'Advanced authorization is enabled. User test-user might not be allowed. Please, contact the administrator.',
      },
    ]);
  });

  it('should register the advanced authorization warning for allowUsers', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {
              allowUsers: ['user0'],
            },
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'advancedAuthorizationUsersWarning',
        title: 'Access for test-user is forbidden. Please contact the administrator.',
      },
    ]);
  });

  it('should register the advanced authorization warning for denyUsers', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        networking: {
          auth: {
            advancedAuthorization: {
              denyUsers: ['test-user'],
            },
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'advancedAuthorizationUsersWarning',
        title: 'Access for test-user is forbidden. Please contact the administrator.',
      },
    ]);
  });

  it('should register all possible warnings', async () => {
    const store = new FakeStoreBuilder()
      .withDwServerConfig({
        defaultNamespace: {
          autoProvision: false,
        },
        networking: {
          auth: {
            advancedAuthorization: {
              denyUsers: ['test-user'],
              denyGroups: ['test-group'],
            },
          },
        },
      })
      .build();

    await checkNamespaceProvisionWarnings(store.getState);

    expect(mockGet).toBeCalledWith('/api/kubernetes/namespace', undefined);
    expect(mockGet).toBeCalledTimes(1);
    expect(warningsReporterService.hasWarning).toBeTruthy();
    expect(warningsReporterService.reportAllWarnings()).toEqual([
      {
        key: 'autoProvisionWarning',
        title:
          'Automatic namespace provisioning is disabled. Namespace for test-user might not have been configured yet. Please, contact the administrator.',
      },
      {
        key: 'advancedAuthorizationGroupsWarning',
        title:
          'Advanced authorization is enabled. User test-user might not be allowed. Please, contact the administrator.',
      },
      {
        key: 'advancedAuthorizationUsersWarning',
        title: 'Access for test-user is forbidden. Please contact the administrator.',
      },
    ]);
  });
});
