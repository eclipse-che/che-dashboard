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

import { container } from '@/inversify.config';
import devfileApi, * as devfileApiService from '@/services/devfileApi';
import { devWorkspaceKind } from '@/services/devfileApi/devWorkspace';
import { compareStringsAsNumbers } from '@/services/helpers/resourceVersion';
import {
  COMPONENT_UPDATE_POLICY,
  DEVWORKSPACE_DEVFILE,
  DEVWORKSPACE_NEXT_START_ANNOTATION,
  DevWorkspaceClient,
  REGISTRY_URL,
} from '@/services/workspace-client/devworkspace/devWorkspaceClient';
import { RootState } from '@/store';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import { selectRunningWorkspacesLimit } from '@/store/ClusterConfig/selectors';
import { RunningWorkspacesExceededError } from '@/store/Workspaces/devWorkspaces';
import {
  checkDevWorkspaceNextStartAnnotation,
  checkRunningWorkspacesLimit,
  getDevWorkspaceClient,
  getDevWorkspaceFromResources,
  getDevWorkspaceTemplateFromResources,
  getWarningFromResponse,
  shouldUpdateDevWorkspace,
} from '@/store/Workspaces/devWorkspaces/actions/actionCreators/helpers';
import { selectRunningDevWorkspacesLimitExceeded } from '@/store/Workspaces/devWorkspaces/selectors';

jest.mock('@eclipse-che/common');
jest.mock('@/inversify.config');
jest.mock('@/services/devfileApi', () => ({
  ...jest.requireActual('@/services/devfileApi'),
  isDevWorkspace: jest.fn(),
}));
jest.mock('@/services/helpers/resourceVersion');
jest.mock('@/store/ClusterConfig/selectors');
jest.mock('@/store/Workspaces/devWorkspaces/selectors');

describe('devWorkspaces, helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWarningFromResponse', () => {
    it('should return undefined if error does not include Axios response', () => {
      const error = new Error('Test error');
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(false);

      const result = getWarningFromResponse(error);
      expect(result).toBeUndefined();
    });

    it('should return provider-specific warning if provider is GitHub', () => {
      const error = {
        response: {
          data: {
            attributes: {
              provider: 'github',
            },
            message: 'GitHub error message',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe(
        "GitHub might not be operational, please check the provider's status page.",
      );
    });

    it('should return provider-specific warning if provider is Gitlab', () => {
      const error = {
        response: {
          data: {
            attributes: {
              provider: 'gitlab',
            },
            message: 'Gitlab error message',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe(
        "Gitlab might not be operational, please check the provider's status page.",
      );
    });

    it('should return generic message if provider is unknown', () => {
      const error = {
        response: {
          data: {
            attributes: {
              provider: 'unknown',
            },
            message: 'Unknown provider error',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe('Unknown provider error');
    });

    it('should return message from response data if attributes are undefined', () => {
      const error = {
        response: {
          data: {
            message: 'Error message without attributes',
          },
        },
      };
      (helpers.errors.includesAxiosResponse as unknown as jest.Mock).mockReturnValue(true);

      const result = getWarningFromResponse(error);
      expect(result).toBe('Error message without attributes');
    });
  });

  describe('checkDevWorkspaceNextStartAnnotation', () => {
    let devWorkspaceClient: DevWorkspaceClient;
    let workspace: devfileApi.DevWorkspace;

    beforeEach(() => {
      devWorkspaceClient = {
        update: jest.fn().mockResolvedValue({}),
      } as unknown as DevWorkspaceClient;

      workspace = {
        metadata: {
          annotations: {},
        },
        spec: {
          template: {},
          started: false,
        },
      } as devfileApi.DevWorkspace;
    });

    it('should not update workspace if annotation is not present', async () => {
      await checkDevWorkspaceNextStartAnnotation(devWorkspaceClient, workspace);
      expect(devWorkspaceClient.update).not.toHaveBeenCalled();
    });

    it('should update workspace when annotation is present and valid', async () => {
      const storedDevWorkspace = {
        kind: devWorkspaceKind,
        spec: {
          template: { components: [] },
        },
      };
      workspace.metadata.annotations![DEVWORKSPACE_NEXT_START_ANNOTATION] =
        JSON.stringify(storedDevWorkspace);
      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(true);

      await checkDevWorkspaceNextStartAnnotation(devWorkspaceClient, workspace);

      expect(devWorkspaceClient.update).toHaveBeenCalledWith(workspace);
      expect(workspace.spec.template).toEqual(storedDevWorkspace.spec.template);
      expect(workspace.spec.started).toBe(false);
      expect(workspace.metadata.annotations![DEVWORKSPACE_NEXT_START_ANNOTATION]).toBeUndefined();
    });

    it('should throw error if storedDevWorkspace is invalid', async () => {
      const storedDevWorkspace = {};
      workspace.metadata.annotations![DEVWORKSPACE_NEXT_START_ANNOTATION] =
        JSON.stringify(storedDevWorkspace);
      jest.spyOn(devfileApiService, 'isDevWorkspace').mockReturnValueOnce(false);
      console.error = jest.fn();

      await expect(
        checkDevWorkspaceNextStartAnnotation(devWorkspaceClient, workspace),
      ).rejects.toThrow(
        'Unexpected error happened. Please check the Console tab of Developer tools.',
      );

      expect(devWorkspaceClient.update).not.toHaveBeenCalled();
    });
  });

  describe('checkRunningWorkspacesLimit', () => {
    it('should not throw error if running limit is not exceeded', () => {
      const state = {} as RootState;
      (selectRunningDevWorkspacesLimitExceeded as unknown as jest.Mock).mockReturnValue(false);

      expect(() => checkRunningWorkspacesLimit(state)).not.toThrow();
    });

    it('should throw RunningWorkspacesExceededError if running limit is exceeded', () => {
      const state = {} as RootState;
      (selectRunningDevWorkspacesLimitExceeded as unknown as jest.Mock).mockReturnValue(true);
      (selectRunningWorkspacesLimit as unknown as jest.Mock).mockReturnValue(2);

      expect(() => checkRunningWorkspacesLimit(state)).toThrow(RunningWorkspacesExceededError);
    });
  });

  describe('getDevWorkspaceClient', () => {
    it('should return DevWorkspaceClient instance from container', () => {
      const mockClient = {};
      (container.get as jest.Mock).mockReturnValue(mockClient);

      const result = getDevWorkspaceClient();

      expect(container.get).toHaveBeenCalledWith(DevWorkspaceClient);
      expect(result).toBe(mockClient);
    });
  });

  describe('shouldUpdateDevWorkspace', () => {
    it('should return false if resourceVersion is undefined', () => {
      const prevDevWorkspace = { metadata: {} } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: {} } as devfileApi.DevWorkspace;

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(false);
    });

    it('should return true if prevResourceVersion is undefined', () => {
      const prevDevWorkspace = { metadata: {} } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(true);
    });

    it('should compare resource versions and return true if newer', () => {
      const prevDevWorkspace = { metadata: { resourceVersion: '1' } } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;
      (compareStringsAsNumbers as jest.Mock).mockReturnValue(-1);

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(true);
      expect(compareStringsAsNumbers).toHaveBeenCalledWith('1', '2');
    });

    it('should compare resource versions and return false if older or equal', () => {
      const prevDevWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;
      const devWorkspace = { metadata: { resourceVersion: '2' } } as devfileApi.DevWorkspace;
      (compareStringsAsNumbers as jest.Mock).mockReturnValue(0);

      const result = shouldUpdateDevWorkspace(prevDevWorkspace, devWorkspace);
      expect(result).toBe(false);
      expect(compareStringsAsNumbers).toHaveBeenCalledWith('2', '2');
    });
  });

  describe('getDevWorkspaceFromResources', () => {
    it('should return DevWorkspace resource from resources', () => {
      const resources = [
        {
          kind: 'DevWorkspace',
          metadata: {
            name: 'test-workspace',
          },
        },
        {
          kind: 'OtherResource',
          metadata: { name: 'other-resource' },
        },
      ] as devfileApi.DevWorkspace[];

      const params = { sourceUrl: 'https://example.com/repo.git' };
      const result = getDevWorkspaceFromResources(resources, params);

      expect(result).toBeDefined();
      expect(result.kind).toBe('DevWorkspace');
      expect(result.metadata.name).toBe('test-workspace');
    });
    describe('Devfile resolution supported by che-server', () => {
      it('should return DevWorkspace with original devfile recourse for URL location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              'che.eclipse.org/devfile': `schemaVersion: 2.2.0\nmetadata:\n name: test-workspace\n`,
            },
          })
          .build();
        const resources = [
          devWorkspace,
          {
            kind: 'OtherResource',
            metadata: { name: 'other-resource' },
          },
        ] as devfileApi.DevWorkspace[];

        const params = { sourceUrl: 'http://example.com/repo.git' };
        const result = getDevWorkspaceFromResources(resources, params);

        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toBeDefined();
        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toContain(
          'schemaVersion: 2.2.0',
        );
      });

      it('should return DevWorkspace wit original devfile recourse for SSH location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              'che.eclipse.org/devfile': `schemaVersion: 2.2.0\nmetadata:\n name: test-workspace\n`,
            },
          })
          .build();
        const resources = [
          devWorkspace,
          {
            kind: 'OtherResource',
            metadata: { name: 'other-resource' },
          },
        ] as devfileApi.DevWorkspace[];

        const params = { sourceUrl: 'ssh://example.com/repo.git' };
        const result = getDevWorkspaceFromResources(resources, params);

        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toBeDefined();
        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toContain(
          'schemaVersion: 2.2.0',
        );
      });
    });
    describe('Devfile resolution is not supported by che-server', () => {
      it('should return DevWorkspace with original devfile recourse for URL location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              'che.eclipse.org/devfile': `schemaVersion: 2.2.0\nmetadata:\n name: test-workspace\n`,
            },
          })
          .withTemplateAttributes({
            'controller.devfile.io/bootstrap-devworkspace': true,
          })
          .build();
        const resources = [
          devWorkspace,
          {
            kind: 'OtherResource',
            metadata: { name: 'other-resource' },
          },
        ] as devfileApi.DevWorkspace[];

        const params = { sourceUrl: 'http://example.com/repo.git' };
        const result = getDevWorkspaceFromResources(resources, params);

        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toBeDefined();
        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toContain(
          'schemaVersion: 2.2.0',
        );
      });

      it('should return DevWorkspace without original devfile recourse for SSH location', () => {
        const devWorkspace = new DevWorkspaceBuilder()
          .withMetadata({
            name: 'test-workspace',
            annotations: {
              'che.eclipse.org/devfile': `schemaVersion: 2.2.0\nmetadata:\n name: test-workspace\n`,
            },
          })
          .withTemplateAttributes({
            'controller.devfile.io/bootstrap-devworkspace': true,
          })
          .build();
        const resources = [
          devWorkspace,
          {
            kind: 'OtherResource',
            metadata: { name: 'other-resource' },
          },
        ] as devfileApi.DevWorkspace[];

        const params = { sourceUrl: 'ssh://example.com/repo.git' };
        const result = getDevWorkspaceFromResources(resources, params);

        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toBeDefined();
        expect(result.metadata.annotations![DEVWORKSPACE_DEVFILE]).toEqual('');
      });
    });

    it('should throw error if no DevWorkspace resource found', () => {
      const resources = [
        {
          kind: 'OtherResource',
          metadata: { name: 'other-resource' },
        },
      ] as devfileApi.DevWorkspace[];

      expect(() => getDevWorkspaceFromResources(resources, {})).toThrow(
        'Failed to find a DevWorkspace in the fetched resources.',
      );
    });

    it('should throw error if fetched resource is not a valid DevWorkspace', () => {
      const resources = [
        {
          kind: 'DevWorkspace',
        },
      ] as devfileApi.DevWorkspace[]; // invalid DevWorkspace without metadata

      expect(() => getDevWorkspaceFromResources(resources, {})).toThrow(
        'Fetched resource includes not a valid DevWorkspace.',
      );
    });
  });

  describe('getDevWorkspaceTemplateFromResources', () => {
    describe('with EditorYamlUrl', () => {
      it('should return DevWorkspaceTemplate resource from resources', () => {
        const resources = [
          {
            kind: 'DevWorkspaceTemplate',
            metadata: {
              name: 'test-template',
            },
          },
          {
            kind: 'OtherResource',
            metadata: { name: 'other-resource' },
          },
        ] as devfileApi.DevWorkspaceTemplate[];

        const result = getDevWorkspaceTemplateFromResources(
          resources,
          'https://dummy-editor-url.com',
        );

        expect(result).toBeDefined();
        expect(result.kind).toBe('DevWorkspaceTemplate');
        expect(result.metadata.name).toBe('test-template');
        expect(result.metadata.annotations).toBeDefined();
        expect(result.metadata.annotations![COMPONENT_UPDATE_POLICY]).toBe('managed');
        expect(result.metadata.annotations![REGISTRY_URL]).toBe('https://dummy-editor-url.com');
      });
    });
    describe('without EditorYamlUrl', () => {
      it('should return DevWorkspaceTemplate resource from resources', () => {
        const resources = [
          {
            kind: 'DevWorkspaceTemplate',
            metadata: {
              name: 'test-template',
            },
          },
          {
            kind: 'OtherResource',
            metadata: { name: 'other-resource' },
          },
        ] as devfileApi.DevWorkspaceTemplate[];

        const result = getDevWorkspaceTemplateFromResources(resources, undefined);

        expect(result).toBeDefined();
        expect(result.kind).toBe('DevWorkspaceTemplate');
        expect(result.metadata.name).toBe('test-template');
        expect(result.metadata.annotations).toBeUndefined();
      });
    });

    it('should throw error if no DevWorkspaceTemplate resource found', () => {
      const resources = [
        {
          kind: 'OtherResource',
          metadata: { name: 'other-resource' },
        },
      ] as devfileApi.DevWorkspaceTemplate[];

      expect(() => getDevWorkspaceTemplateFromResources(resources, undefined)).toThrow(
        'Failed to find a DevWorkspaceTemplate in the fetched resources.',
      );
    });

    it('should throw error if fetched resource is not a valid DevWorkspaceTemplate', () => {
      const resources = [
        {
          kind: 'DevWorkspaceTemplate',
        },
      ] as devfileApi.DevWorkspaceTemplate[]; // invalid DevWorkspaceTemplate without metadata

      expect(() => getDevWorkspaceTemplateFromResources(resources, undefined)).toThrow(
        'Failed to find a DevWorkspaceTemplate in the fetched resources.',
      );
    });
  });
});
