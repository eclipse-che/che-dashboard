/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { V1alpha2DevWorkspace } from '@devfile/api';
import { DEVWORKSPACE_STORAGE_TYPE } from '../../../../../../../services/devfileApi/devWorkspace/spec';
import { generateWorkspaceName } from '../../../../../../../services/helpers/generateName';
import { DEVWORKSPACE_DEVFILE_SOURCE } from '../../../../../../../services/workspace-client/devworkspace/devWorkspaceClient';
import { DevWorkspaceResources } from '../../../../../../../store/DevfileRegistries';
import prepareResources from '../prepareResources';

const suffix = '-1234';
jest.mock('../../../../../../../services/helpers/generateName.ts');
(generateWorkspaceName as jest.Mock).mockImplementation(name => name + suffix);

describe('FactoryLoaderContainer/prepareResources', () => {
  const factoryId = 'url=https://factory-location';
  let resources: DevWorkspaceResources;
  const devWorkspaceName = 'project';
  const devWorkspaceTemplateName = 'editor-plugin';

  beforeEach(() => {
    resources = [
      {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspace',
        metadata: {
          name: devWorkspaceName,
          labels: {},
          namespace: 'user-che',
          uid: '',
        },
        spec: {
          started: false,
          template: {
            components: [
              {
                name: devWorkspaceTemplateName,
                plugin: {
                  kubernetes: {
                    name: devWorkspaceTemplateName,
                  },
                },
              },
            ],
          },
        },
      },
      {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspaceTemplate',
        metadata: {
          annotations: {},
          name: devWorkspaceTemplateName,
          namespace: 'user-che',
        },
      },
    ];
  });

  test('the DEVWORKSPACE_DEVFILE_SOURCE annotation', () => {
    const result = prepareResources(resources, factoryId, undefined, suffix);
    expect(result[0].metadata.annotations?.[DEVWORKSPACE_DEVFILE_SOURCE]).toBeDefined();
    expect(result[0].metadata.annotations?.[DEVWORKSPACE_DEVFILE_SOURCE]).toContain(factoryId);
  });

  test('custom DEVWORKSPACE_STORAGE_TYPE value', () => {
    const result = prepareResources(resources, factoryId, 'ephemeral', suffix);
    expect((result[0].spec.template.attributes as any)?.[DEVWORKSPACE_STORAGE_TYPE]).toEqual(
      'ephemeral',
    );
  });

  test('DevWorkspace has "generateName" field', () => {
    const generateName = 'my-proj';

    resources[0].metadata.generateName = generateName;
    delete (resources[0] as V1alpha2DevWorkspace).metadata?.name;

    const result = prepareResources(resources, factoryId, 'ephemeral', suffix);

    // DevWorkspaceTemplate
    expect(result[1].metadata.name).toEqual(devWorkspaceTemplateName + suffix);

    // DevWorkspace
    expect(result[0].metadata.generateName).toBeUndefined();
    expect(result[0].metadata.name).toEqual(generateName + suffix);
    expect(result[0].spec.template.components).toEqual(
      expect.arrayContaining([
        {
          name: devWorkspaceTemplateName + suffix,
          plugin: {
            kubernetes: {
              name: devWorkspaceTemplateName + suffix,
            },
          },
        },
      ]),
    );
  });

  test('DevWorkspace has "name" field', () => {
    const result = prepareResources(resources, factoryId, 'ephemeral', suffix);

    // DevWorkspaceTemplate
    expect(result[1].metadata.name).toEqual(devWorkspaceTemplateName + suffix);

    // DevWorkspace
    expect(result[0].metadata.generateName).toBeUndefined();
    expect(result[0].metadata.name).toEqual(devWorkspaceName + suffix);
    expect(result[0].spec.template.components).toEqual(
      expect.arrayContaining([
        {
          name: devWorkspaceTemplateName + suffix,
          plugin: {
            kubernetes: {
              name: devWorkspaceTemplateName + suffix,
            },
          },
        },
      ]),
    );
  });
});
