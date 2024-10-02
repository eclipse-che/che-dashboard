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

import { helpers } from '@eclipse-che/common';

import { provisionKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { signIn } from '@/services/helpers/login';
import {
  getErrorMessage,
  hasLoginPage,
  isForbidden,
  isUnauthorized,
} from '@/services/workspace-client/helpers';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { SanityCheckState } from '@/store/SanityCheck';
import {
  actionCreators,
  backendCheckErrorAction,
  backendCheckReceiveAction,
  backendCheckRequestAction,
} from '@/store/SanityCheck/actions';

jest.mock('@/services/backend-client/kubernetesNamespaceApi');
jest.mock('@/services/helpers/deferred');
jest.mock('@/services/helpers/delay');
jest.mock('@/services/helpers/login');
jest.mock('@/services/workspace-client/helpers');
jest.mock('@eclipse-che/common');

describe('SanityCheck, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({
      sanityCheck: {
        lastFetched: 0,
      } as SanityCheckState,
    });

    (provisionKubernetesNamespace as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('testBackends', () => {
    it('should dispatch backendCheckRequestAction if timeElapsed is greater than timeToStale', async () => {
      store = createMockStore({
        sanityCheck: {
          lastFetched: 0,
        } as SanityCheckState,
      });

      await store.dispatch(actionCreators.testBackends());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(
        backendCheckRequestAction({
          lastFetched: expect.any(Number),
        }),
      );
      expect(actions[1]).toEqual(backendCheckReceiveAction());
    });

    it('should not dispatch backendCheckRequestAction if timeElapsed is less than timeToStale', async () => {
      store = createMockStore({
        sanityCheck: {
          lastFetched: Date.now(),
        } as SanityCheckState,
      });

      await store.dispatch(actionCreators.testBackends());

      const actions = store.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should dispatch backendCheckReceiveAction on successful provision', async () => {
      await store.dispatch(actionCreators.testBackends());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(
        backendCheckRequestAction({
          lastFetched: expect.any(Number),
        }),
      );
      expect(actions[1]).toEqual(backendCheckReceiveAction());
    });

    it('should dispatch backendCheckErrorAction on failed provision', async () => {
      const errorMessage = 'Network error';
      (provisionKubernetesNamespace as jest.Mock).mockRejectedValue({
        message: errorMessage,
        response: {
          data: {
            trace: ['Error 1', 'Error 2'],
          },
        },
      });
      (isUnauthorized as jest.Mock).mockReturnValueOnce(false);
      (isForbidden as jest.Mock).mockReturnValueOnce(false);
      (getErrorMessage as jest.Mock).mockReturnValueOnce(errorMessage);
      (helpers.errors.getMessage as jest.Mock).mockReturnValueOnce(errorMessage);
      jest.spyOn(helpers.errors, 'includesAxiosResponse').mockReturnValueOnce(true);
      console.error = jest.fn();

      await expect(store.dispatch(actionCreators.testBackends())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(
        backendCheckRequestAction({
          lastFetched: expect.any(Number),
        }),
      );
      expect(actions[1]).toEqual(backendCheckErrorAction(errorMessage));

      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenNthCalledWith(1, errorMessage);
      expect(console.error).toHaveBeenNthCalledWith(2, 'Error 1\nError 2');
    });

    it('should call signIn if unauthorized or forbidden with login page', async () => {
      const errorMessage = 'Unauthorized';
      const error = new Error(errorMessage);
      (provisionKubernetesNamespace as jest.Mock).mockRejectedValue(error);
      (isUnauthorized as jest.Mock).mockReturnValueOnce(true);
      (isForbidden as jest.Mock).mockReturnValueOnce(true);
      (hasLoginPage as jest.Mock).mockReturnValueOnce(true);
      (getErrorMessage as jest.Mock).mockReturnValueOnce(errorMessage);
      (helpers.errors.getMessage as jest.Mock).mockReturnValueOnce(errorMessage);
      console.error = jest.fn();

      await expect(store.dispatch(actionCreators.testBackends())).rejects.toThrow(errorMessage);

      expect(signIn).toHaveBeenCalled();

      expect(console.error).toHaveBeenCalledWith(errorMessage);
    });
  });
});
