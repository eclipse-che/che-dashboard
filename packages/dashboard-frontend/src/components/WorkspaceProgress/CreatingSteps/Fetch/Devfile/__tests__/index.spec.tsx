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

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { FACTORY_LINK_ATTR } from '@eclipse-che/common';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';
import { Location } from 'react-router-dom';
import { Store } from 'redux';

import ExpandableWarning from '@/components/ExpandableWarning';
import { MIN_STEP_DURATION_MS, TIMEOUT_TO_RESOLVE_SEC } from '@/components/WorkspaceProgress/const';
import CreatingStepFetchDevfile from '@/components/WorkspaceProgress/CreatingSteps/Fetch/Devfile';
import getComponentRenderer from '@/services/__mocks__/getComponentRenderer';
import devfileApi from '@/services/devfileApi';
import { getDefer } from '@/services/helpers/deferred';
import {
  FACTORY_URL_ATTR,
  OVERRIDE_ATTR_PREFIX,
  REMOTES_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import { AlertItem } from '@/services/helpers/types';
import { AppThunk } from '@/store';
import { MockStoreBuilder } from '@/store/__mocks__/mockStore';
import { factoryResolverActionCreators, OAuthResponse } from '@/store/FactoryResolver';

jest.mock('@/components/WorkspaceProgress/TimeLimit');

const mockRequestFactoryResolver = jest.fn();
jest.mock('@/store/FactoryResolver', () => {
  return {
    ...jest.requireActual('@/store/FactoryResolver'),
    factoryResolverActionCreators: {
      requestFactoryResolver:
        (
          ...args: Parameters<(typeof factoryResolverActionCreators)['requestFactoryResolver']>
        ): AppThunk =>
        async () =>
          mockRequestFactoryResolver(...args),
    } as typeof factoryResolverActionCreators,
  };
});

const mockIsOAuthResponse = jest.fn().mockReturnValue(false);
const mockOpenOAuthPage = jest.fn();
jest.mock('@/services/oauth', () => {
  return {
    __esModule: true,
    OAuthService: {
      openOAuthPage: (..._args: unknown[]) => mockOpenOAuthPage(..._args),
      refreshTokenIfNeeded: () => jest.fn().mockResolvedValue(undefined),
    },
    isOAuthResponse: (..._args: unknown[]) => mockIsOAuthResponse(..._args),
  };
});

const { renderComponent } = getComponentRenderer(getComponent);

const mockOnNextStep = jest.fn();
const mockOnRestart = jest.fn();
const mockOnError = jest.fn();
const mockOnHideError = jest.fn();

const factoryUrl = 'https://factory-url';

describe('Creating steps, fetching a devfile', () => {
  let searchParams: URLSearchParams;
  let store: Store;
  let devfile: devfileApi.Devfile;
  let user: UserEvent;

  beforeEach(() => {
    devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        name: 'my-project',
        namespace: 'user-che',
        generateName: 'my-project-',
      },
    };
    store = new MockStoreBuilder()
      .withFactoryResolver({
        resolver: {
          devfile,
          location: factoryUrl,
        },
      })
      .build();

    searchParams = new URLSearchParams({
      [FACTORY_URL_ATTR]: factoryUrl,
    });

    jest.useFakeTimers();

    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('devfile is already resolved', async () => {
    renderComponent(store, searchParams);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  test('no project url, remotes exist', async () => {
    const store = new MockStoreBuilder().build();

    const remotesAttr =
      '{{test-1,http://git-test-1.git},{test-2,http://git-test-2.git},{test-3,http://git-test-3.git}}';
    searchParams.append(REMOTES_ATTR, remotesAttr);
    searchParams.delete(FACTORY_URL_ATTR);

    renderComponent(store, searchParams);

    await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

    await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
    expect(mockOnError).not.toHaveBeenCalled();
    expect(mockOnRestart).not.toHaveBeenCalled();
  });

  describe('invalid schema error', () => {
    let emptyStore: Store;
    const rejectReason = '... schema validation failed ...';

    beforeEach(() => {
      emptyStore = new MockStoreBuilder().build();
      mockRequestFactoryResolver.mockRejectedValueOnce(rejectReason);
    });

    test('notification alert', async () => {
      renderComponent(emptyStore, searchParams);
      await jest.runAllTimersAsync();

      const expectAlertItem = expect.objectContaining({
        title: 'Warning',
        children: (
          <ExpandableWarning
            errorMessage={rejectReason}
            textAfter="If you continue it will be ignored and a regular workspace will be created.
            You will have a chance to fix the Devfile from the IDE once it is started."
            textBefore="The Devfile in the git repository is invalid:"
          />
        ),
        actionCallbacks: [
          expect.objectContaining({
            title: 'Continue with default devfile',
            callback: expect.any(Function),
          }),
          expect.objectContaining({
            title: 'Reload',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('action callback to continue with default devfile"', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      const actionTitle = 'Continue with default devfile';
      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const action = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith(actionTitle),
        );
        expect(action).toBeDefined();

        if (action) {
          deferred.promise.then(action.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(emptyStore, searchParams);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      expect(mockOnRestart).not.toHaveBeenCalled();
      expect(mockOnNextStep).not.toHaveBeenCalled();

      mockOnError.mockClear();

      /* test the action */
      await jest.runOnlyPendingTimersAsync();

      // resolve deferred to trigger the callback
      deferred.resolve();

      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
      expect(mockOnRestart).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    test('action callback to reload the step', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      const reloadActionTitle = 'Reload';
      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const reloadAction = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith(reloadActionTitle),
        );
        expect(reloadAction).toBeDefined();

        if (reloadAction) {
          deferred.promise.then(reloadAction.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(emptyStore, searchParams);
      await jest.runAllTimersAsync();

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      expect(mockOnRestart).not.toHaveBeenCalled();
      expect(mockOnNextStep).not.toHaveBeenCalled();

      // first call resolves with error
      expect(mockRequestFactoryResolver).toHaveBeenCalledTimes(1);

      mockOnError.mockClear();

      /* test the action */
      await jest.runOnlyPendingTimersAsync();

      // resolve deferred to trigger the callback
      deferred.resolve();

      await waitFor(() => expect(mockOnRestart).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();

      // should request the factory resolver for the second time
      await waitFor(() => expect(mockRequestFactoryResolver).toHaveBeenCalledTimes(2));
    });
  });

  describe('step timeout reached', () => {
    let emptyStore: Store;

    beforeEach(() => {
      emptyStore = new MockStoreBuilder().build();
    });

    test('notification alert', async () => {
      renderComponent(emptyStore, searchParams);
      await jest.runAllTimersAsync();

      // trigger timeout
      const timeoutButton = screen.getByRole('button', {
        name: 'onTimeout',
      });
      await user.click(timeoutButton);

      const expectAlertItem = expect.objectContaining({
        title: 'Failed to create the workspace',
        children: `Devfile hasn't been resolved in the last ${TIMEOUT_TO_RESOLVE_SEC} seconds.`,
        actionCallbacks: [
          expect.objectContaining({
            title: 'Continue with default devfile',
            callback: expect.any(Function),
          }),
          expect.objectContaining({
            title: 'Click to try again',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnRestart).not.toHaveBeenCalled();
    });

    test('action callback to try again', async () => {
      // this deferred object will help run the callback at the right time
      const deferred = getDefer();

      const actionTitle = 'Click to try again';
      mockOnError.mockImplementationOnce((alertItem: AlertItem) => {
        const action = alertItem.actionCallbacks?.find(action =>
          action.title.startsWith(actionTitle),
        );
        expect(action).toBeDefined();

        if (action) {
          deferred.promise.then(action.callback);
        } else {
          throw new Error('Action not found');
        }
      });

      renderComponent(emptyStore, searchParams);
      await jest.runAllTimersAsync();

      // trigger timeout
      const timeoutButton = screen.getByRole('button', {
        name: 'onTimeout',
      });
      await user.click(timeoutButton);

      await waitFor(() => expect(mockOnError).toHaveBeenCalled());
      mockOnError.mockClear();
      expect(mockOnRestart).not.toHaveBeenCalled();
      expect(mockOnNextStep).not.toHaveBeenCalled();

      /* test the action */

      // resolve deferred to trigger the callback
      deferred.resolve();
      await jest.runOnlyPendingTimersAsync();

      await waitFor(() => expect(mockOnRestart).toHaveBeenCalled());
      expect(mockOnNextStep).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('unsupported git provider', () => {
    let emptyStore: Store;
    const rejectReason = 'Failed to fetch devfile';

    beforeEach(() => {
      emptyStore = new MockStoreBuilder().build();
      mockRequestFactoryResolver.mockRejectedValueOnce(rejectReason);
    });

    test('should continue with the default devfile', async () => {
      renderComponent(emptyStore, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockOnError).not.toHaveBeenCalled());
      expect(mockOnNextStep).toHaveBeenCalled();
    });
  });

  describe('public repo', () => {
    beforeEach(() => {
      mockRequestFactoryResolver.mockResolvedValueOnce(undefined);
    });

    test('request factory resolver', async () => {
      const emptyStore = new MockStoreBuilder().build();
      renderComponent(emptyStore, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockRequestFactoryResolver).toHaveBeenCalled());
    });

    test('request factory resolver with override attributes', async () => {
      const attrName = `${OVERRIDE_ATTR_PREFIX}metadata.generateName`;
      const attrValue = 'testPrefix';
      const expectedOverrideParams = { [attrName]: attrValue };
      // add override param
      searchParams.append(attrName, attrValue);
      const emptyStore = new MockStoreBuilder().build();

      renderComponent(emptyStore, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() =>
        expect(mockRequestFactoryResolver).toHaveBeenCalledWith(
          factoryUrl,
          expect.objectContaining({
            overrides: expectedOverrideParams,
          }),
        ),
      );
    });

    test('devfile resolved successfully', async () => {
      const emptyStore = new MockStoreBuilder().build();

      const { reRenderComponent } = renderComponent(emptyStore, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockRequestFactoryResolver).toHaveBeenCalled());
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnNextStep).not.toHaveBeenCalled();

      // wait a bit less than the devfile resolving timeout
      const time = (TIMEOUT_TO_RESOLVE_SEC - 1) * 1000;
      await jest.advanceTimersByTimeAsync(time);

      // build next store
      const nextStore = new MockStoreBuilder()
        .withFactoryResolver({
          resolver: {
            location: factoryUrl,
            devfile: {
              schemaVersion: '2.2.2',
              metadata: {
                name: 'my-project',
                namespace: 'user-che',
              },
            },
          },
        })
        .build();
      reRenderComponent(nextStore, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('private repo', () => {
    const oauthAuthenticationUrl = 'https://oauth_authentication_url';
    const host = 'che-host';
    const protocol = 'http://';
    let spyWindowLocation: jest.SpyInstance;
    let location: Location;

    beforeEach(() => {
      mockIsOAuthResponse.mockReturnValue(true);
      mockRequestFactoryResolver.mockRejectedValue({
        attributes: {
          oauth_provider: 'oauth_provider',
          oauth_authentication_url: oauthAuthenticationUrl,
        },
      } as OAuthResponse);

      spyWindowLocation = createWindowLocationSpy(host, protocol);

      location = {
        search: searchParams.toString(),
      } as Location;
    });

    afterEach(() => {
      sessionStorage.clear();
      spyWindowLocation.mockClear();
    });

    test('redirect to an authentication URL', async () => {
      const emptyStore = new MockStoreBuilder().build();

      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      const expectedRedirectUrl = `${protocol}${host}/f?${FACTORY_LINK_ATTR}=${encodeURIComponent(
        btoa('url=' + encodeURIComponent(factoryUrl)),
      )}`;

      await waitFor(() =>
        expect(mockOpenOAuthPage).toHaveBeenCalledWith(oauthAuthenticationUrl, expectedRedirectUrl),
      );

      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnNextStep).not.toHaveBeenCalled();
    });

    test('authentication fails', async () => {
      const emptyStore = new MockStoreBuilder().build();

      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      const expectedRedirectUrl = `${protocol}${host}/f?${FACTORY_LINK_ATTR}=${encodeURIComponent(
        btoa('url=' + encodeURIComponent(factoryUrl)),
      )}`;

      await waitFor(() =>
        expect(mockOpenOAuthPage).toHaveBeenCalledWith(oauthAuthenticationUrl, expectedRedirectUrl),
      );

      // cleanup previous render
      cleanup();

      // first unsuccessful try to resolve devfile after authentication
      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() =>
        expect(mockOpenOAuthPage).toHaveBeenCalledWith(oauthAuthenticationUrl, expectedRedirectUrl),
      );

      await waitFor(() => expect(mockOnError).not.toHaveBeenCalled());

      // cleanup previous render
      cleanup();

      // second unsuccessful try to resolve devfile after authentication
      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() =>
        expect(mockOpenOAuthPage).toHaveBeenCalledWith(oauthAuthenticationUrl, expectedRedirectUrl),
      );

      const expectAlertItem = expect.objectContaining({
        title: 'Failed to create the workspace',
        children:
          'The Dashboard reached a limit of reloads while trying to resolve a devfile in a private repo. Please contact admin to check if OAuth is configured correctly.',
        actionCallbacks: [
          expect.objectContaining({
            title: 'Continue with default devfile',
            callback: expect.any(Function),
          }),
          expect.objectContaining({
            title: 'Click to try again',
            callback: expect.any(Function),
          }),
        ],
      });
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(expectAlertItem));

      expect(mockOnNextStep).not.toHaveBeenCalled();
    });

    test('authentication passes', async () => {
      const emptyStore = new MockStoreBuilder().build();

      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockRequestFactoryResolver).toHaveBeenCalled());

      // cleanup previous render
      cleanup();

      // the devfile should be resolved now
      mockRequestFactoryResolver.mockResolvedValueOnce(undefined);

      // redirect after authentication
      const { reRenderComponent } = renderComponent(emptyStore, searchParams);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockRequestFactoryResolver).toHaveBeenCalled());

      // build next store
      const nextStore = new MockStoreBuilder()
        .withFactoryResolver({
          resolver: {
            location: factoryUrl,
            devfile: {
              metadata: {
                name: 'my-project',
                generateName: 'my-project-',
              },
            } as devfileApi.Devfile,
          },
        })
        .build();
      reRenderComponent(nextStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('private git+SSH URL repo', () => {
    const host = 'che-host';
    const protocol = 'http://';
    const factoryUrl = 'git@github.com:user/repository-name.git';
    const emptyStore = new MockStoreBuilder().build();

    let spyWindowLocation: jest.SpyInstance;
    let location: Location;

    beforeEach(() => {
      store = new MockStoreBuilder().build();

      searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: factoryUrl,
      });

      mockIsOAuthResponse.mockReturnValue(false);
      mockRequestFactoryResolver.mockRejectedValue('Could not reach devfile');

      spyWindowLocation = createWindowLocationSpy(host, protocol);

      location = {
        search: searchParams.toString(),
      } as Location;
    });

    afterEach(() => {
      sessionStorage.clear();
      spyWindowLocation.mockClear();
    });

    it('should go to next step', async () => {
      const nextStore = new MockStoreBuilder()
        .withFactoryResolver({
          resolver: {
            location: factoryUrl,
            devfile: {
              schemaVersion: '2.3.0',
              metadata: {
                name: 'my-project',
                namespace: 'user-che',
              },
            },
          },
        })
        .build();
      renderComponent(nextStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);

      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());

      expect(mockOpenOAuthPage).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should use default devfile on private SSH url', async () => {
      searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: 'git@github.com:user/repository.git',
      });

      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled());

      expect(mockOpenOAuthPage).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should use default devfile on bitbucket-server SSH url', async () => {
      searchParams = new URLSearchParams({
        [FACTORY_URL_ATTR]: 'ssh://git@bitbucket-server.com/~user/repository.git',
      });

      renderComponent(emptyStore, searchParams, location);

      await jest.advanceTimersByTimeAsync(MIN_STEP_DURATION_MS);
      await waitFor(() => expect(mockOnNextStep).toHaveBeenCalled);

      expect(mockOpenOAuthPage).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });
});

function createWindowLocationSpy(host: string, protocol: string): jest.SpyInstance {
  delete (window as any).location;
  (window.location as any) = {
    host,
    protocol,
    origin: protocol + host,
  };
  Object.defineProperty(window.location, 'href', {
    set: () => {
      // no-op
    },
    configurable: true,
  });
  return jest.spyOn(window.location, 'href', 'set');
}

function getComponent(
  store: Store,
  searchParams: URLSearchParams,
  location = {} as Location,
): React.ReactElement {
  return (
    <Provider store={store}>
      <CreatingStepFetchDevfile
        distance={0}
        hasChildren={false}
        location={location}
        navigate={jest.fn()}
        searchParams={searchParams}
        onNextStep={mockOnNextStep}
        onRestart={mockOnRestart}
        onError={mockOnError}
        onHideError={mockOnHideError}
      />
    </Provider>
  );
}
