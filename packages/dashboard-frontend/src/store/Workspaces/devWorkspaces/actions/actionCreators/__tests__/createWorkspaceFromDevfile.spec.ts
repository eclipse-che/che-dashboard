/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
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
import { dump } from 'js-yaml';

import { fetchResources } from '@/services/backend-client/devworkspaceResourcesApi';
import devfileApi from '@/services/devfileApi';
import { FactoryParams } from '@/services/helpers/factoryFlow/buildFactoryParams';
import { loadResourcesContent } from '@/services/registry/resources';
import { RootState } from '@/store';
import { createMockStore } from '@/store/__mocks__/mockActionsTestStore';
import { getEditor } from '@/store/DevfileRegistries/getEditor';
import { verifyAuthorized } from '@/store/SanityCheck';
import { actionCreators } from '@/store/Workspaces/devWorkspaces/actions/actionCreators';
import { createWorkspaceFromDevfile } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/createWorkspaceFromDevfile';
import { updateEditorDevfile } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage';
import { getCustomEditor } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/getCustomEditor';
import {
  devWorkspacesErrorAction,
  devWorkspacesRequestAction,
} from '@/store/Workspaces/devWorkspaces/actions/actions';

jest.mock('@eclipse-che/common');
jest.mock('js-yaml');
jest.mock('@/services/backend-client/devworkspaceResourcesApi');
jest.mock('@/services/registry/resources');
jest.mock('@/store/DevfileRegistries/getEditor');
jest.mock('@/store/SanityCheck');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/editorImage');
jest.mock('@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers/getCustomEditor');

describe('devWorkspaces, actions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspaceFromDevfile', () => {
    let store: ReturnType<typeof createMockStore>;
    const mockDevfile = {} as devfileApi.Devfile;
    const mockParams = {} as Partial<FactoryParams>;
    const mockOptionalFilesContent = {};

    beforeEach(() => {
      store = createMockStore({
        dwServerConfig: {
          config: {
            defaults: {
              editor: 'default-editor',
            },
          },
        },
        devWorkspaces: {
          workspaces: [],
        } as any,
      } as RootState);

      (getEditor as jest.Mock).mockResolvedValue({
        content: 'editor-content',
        editorYamlUrl: 'https://editor-url.com',
      });
      (getCustomEditor as jest.Mock).mockResolvedValue('custom-editor-content');
      (verifyAuthorized as jest.Mock).mockResolvedValue(true);
      (updateEditorDevfile as jest.Mock).mockReturnValue('updated-editor-content');
      (dump as jest.Mock).mockReturnValue('devfile-yaml');
      (fetchResources as jest.Mock).mockResolvedValue('resources-content');
      (loadResourcesContent as jest.Mock).mockReturnValue([
        {
          kind: 'DevWorkspace',
          metadata: { annotations: {} },
        },
        {
          kind: 'DevWorkspaceTemplate',
          metadata: { annotations: {} },
        },
      ]);
      (actionCreators.createWorkspaceFromResources as jest.Mock).mockImplementation(
        () => async () => {},
      );
      (common.helpers.errors.getMessage as jest.Mock).mockImplementation((e: Error) => e.message);
    });

    it('should create workspace with provided editor in params', async () => {
      const paramsWithEditor = { cheEditor: 'custom-editor' } as Partial<FactoryParams>;

      await store.dispatch(
        createWorkspaceFromDevfile(mockDevfile, paramsWithEditor, mockOptionalFilesContent),
      );

      const actions = store.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());

      expect(getEditor).toHaveBeenCalledWith(
        'custom-editor',
        expect.any(Function),
        expect.any(Function),
      );
      expect(getCustomEditor).not.toHaveBeenCalled();
      expect(verifyAuthorized).toHaveBeenCalled();
      expect(updateEditorDevfile).toHaveBeenCalledWith('editor-content', undefined);
      expect(fetchResources).toHaveBeenCalledWith({
        devfileContent: 'devfile-yaml',
        editorPath: undefined,
        editorContent: 'updated-editor-content',
      });
      expect(loadResourcesContent).toHaveBeenCalledWith('resources-content');
      expect(actionCreators.createWorkspaceFromResources).toHaveBeenCalled();
    });

    it('should create workspace with custom editor from optional files', async () => {
      (getCustomEditor as jest.Mock).mockResolvedValue('custom-editor-content');

      await store.dispatch(
        createWorkspaceFromDevfile(mockDevfile, mockParams, mockOptionalFilesContent),
      );

      expect(getEditor).not.toHaveBeenCalled();
      expect(getCustomEditor).toHaveBeenCalledWith(
        mockOptionalFilesContent,
        expect.any(Function),
        expect.any(Function),
      );
      expect(verifyAuthorized).toHaveBeenCalled();
      expect(updateEditorDevfile).toHaveBeenCalledWith('custom-editor-content', undefined);
      expect(fetchResources).toHaveBeenCalledWith({
        devfileContent: 'devfile-yaml',
        editorPath: undefined,
        editorContent: 'updated-editor-content',
      });
      expect(loadResourcesContent).toHaveBeenCalledWith('resources-content');
      expect(actionCreators.createWorkspaceFromResources).toHaveBeenCalled();
    });

    it('should create workspace with default editor when no editor is specified', async () => {
      (getCustomEditor as jest.Mock).mockResolvedValue(undefined);

      await store.dispatch(
        createWorkspaceFromDevfile(mockDevfile, mockParams, mockOptionalFilesContent),
      );

      expect(getCustomEditor).toHaveBeenCalled();
      expect(getEditor).toHaveBeenCalledWith(
        'default-editor',
        expect.any(Function),
        expect.any(Function),
      );
      expect(verifyAuthorized).toHaveBeenCalled();
      expect(updateEditorDevfile).toHaveBeenCalledWith('editor-content', undefined);
      expect(fetchResources).toHaveBeenCalledWith({
        devfileContent: 'devfile-yaml',
        editorPath: undefined,
        editorContent: 'updated-editor-content',
      });
      expect(loadResourcesContent).toHaveBeenCalledWith('resources-content');
      expect(actionCreators.createWorkspaceFromResources).toHaveBeenCalled();
    });

    it('should throw error if default editor is not defined', async () => {
      const storeWithNoDefaults = createMockStore({
        dwServerConfig: {
          config: {
            defaults: {
              editor: undefined,
            },
          },
        },
      } as RootState);
      (getCustomEditor as jest.Mock).mockResolvedValue(undefined);

      await expect(
        storeWithNoDefaults.dispatch(
          createWorkspaceFromDevfile(mockDevfile, mockParams, mockOptionalFilesContent),
        ),
      ).rejects.toThrow('Cannot define default editor');
    });

    it('should handle error and dispatch error action', async () => {
      const error = new Error('Test error');
      (fetchResources as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        store.dispatch(
          createWorkspaceFromDevfile(mockDevfile, mockParams, mockOptionalFilesContent),
        ),
      ).rejects.toThrow('Test error');

      const actions = store.getActions();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toEqual(devWorkspacesRequestAction());
      expect(actions[1]).toEqual(devWorkspacesErrorAction('Test error'));
    });
  });
});
