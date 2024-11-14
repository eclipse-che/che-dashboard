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

import { che } from '@/services/models';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import {
  actionCreators,
  pluginsErrorAction,
  pluginsReceiveAction,
  pluginsRequestAction,
} from '@/store/Plugins/chePlugins/actions';
import { convertToEditorPlugin } from '@/store/Plugins/chePlugins/helpers';
import { devWorkspacePluginsActionCreators } from '@/store/Plugins/devWorkspacePlugins';
import { verifyAuthorized } from '@/store/SanityCheck';

jest.mock('@eclipse-che/common');
jest.mock('@/store/Plugins/chePlugins/helpers');
jest.mock('@/store/SanityCheck');

describe('ChePlugins, actions', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore({});
    jest.clearAllMocks();
  });

  describe('requestPlugins', () => {
    it('should dispatch receive action on successful fetch', async () => {
      const mockEditors = [{ id: 'editor1' }, { id: 'editor2' }];
      const mockPlugins = [{ id: 'plugin-editor1' }, { id: 'plugin-editor2' }] as che.Plugin[];

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(devWorkspacePluginsActionCreators, 'requestEditors')
        .mockImplementation(() => async () => {});
      (convertToEditorPlugin as jest.Mock).mockImplementation(editor => ({
        id: `plugin-${editor.id}`,
      }));

      const storeWithDwPlugins = createMockStore({
        dwPlugins: {
          cmEditors: mockEditors as any,
          plugins: {},
          defaultPlugins: {},
          editors: {},
          isLoading: false,
        },
      });

      await storeWithDwPlugins.dispatch(actionCreators.requestPlugins());

      const actions = storeWithDwPlugins.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(pluginsRequestAction());
      expect(actions[1]).toEqual(pluginsReceiveAction(mockPlugins));
    });

    it('should dispatch error action on failed fetch', async () => {
      const errorMessage = 'Network error';

      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(devWorkspacePluginsActionCreators, 'requestEditors')
        .mockImplementation(() => async () => {
          throw new Error(errorMessage);
        });
      (common.helpers.errors.getMessage as jest.Mock).mockReturnValue(errorMessage);

      await expect(store.dispatch(actionCreators.requestPlugins())).rejects.toThrow(errorMessage);

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(pluginsRequestAction());
      expect(actions[1]).toEqual(pluginsErrorAction(errorMessage));
    });
  });
});
