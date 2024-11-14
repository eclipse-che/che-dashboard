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

import common from '@eclipse-che/common';

import { getKubernetesNamespace } from '@/services/backend-client/kubernetesNamespaceApi';
import { che } from '@/services/models';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  namespaceErrorAction,
  namespaceReceiveAction,
  namespaceRequestAction,
} from '@/store/InfrastructureNamespaces/actions';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@/services/backend-client/kubernetesNamespaceApi');
jest.mock('@/store/SanityCheck');
jest.mock('@eclipse-che/common');

describe('InfrastructureNamespace, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestNamespaces', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockNamespaces = [
        { name: 'namespace1' },
        { name: 'namespace2' },
      ] as che.KubernetesNamespace[];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (getKubernetesNamespace as jest.Mock).mockResolvedValue(mockNamespaces);

      await store.dispatch(actionCreators.requestNamespaces());

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(namespaceRequestAction());
      expect(actions[1]).toEqual(namespaceReceiveAction(mockNamespaces));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (getKubernetesNamespace as jest.Mock).mockRejectedValue(new Error(errorMessage));
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestNamespaces())).rejects.toThrow(
        errorMessage,
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(namespaceRequestAction());
      expect(actions[1]).toEqual(
        namespaceErrorAction(
          `Failed to fetch list of available kubernetes namespaces, reason: ${errorMessage}`,
        ),
      );
    });
  });
});
