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

import { V230Devfile, V230DevfileComponents } from '@devfile/api';

import { FactoryResolver } from '@/services/helpers/types';
import { che } from '@/services/models';
import { buildDevfileV2, normalizeDevfile } from '@/store/FactoryResolver/helpers';

describe('buildDevfileV2', () => {
  let devfileV1: che.api.workspace.devfile.Devfile;

  beforeEach(() => {
    devfileV1 = {
      apiVersion: '1.0.0',
      metadata: {
        generateName: 'empty',
      },
      projects: [
        {
          name: 'my-project',
          source: {
            location: 'https://github.com/my/project.git',
            type: 'github',
          },
        },
      ],
    };
  });

  it('should return a devfile with the correct schemaVersion', () => {
    const devfile = buildDevfileV2(devfileV1);

    expect(devfile.schemaVersion).toEqual('2.2.2');
  });

  it('should return a devfile with the correct metadata', () => {
    const devfile = buildDevfileV2(devfileV1);

    expect(devfile.metadata).toStrictEqual(devfile.metadata);
  });

  it('should return a devfile with the correct projects', () => {
    const devfile = buildDevfileV2(devfileV1);

    expect(devfile.projects).toStrictEqual([
      {
        attributes: {},
        git: {
          remotes: {
            origin: 'https://github.com/my/project.git',
          },
        },
        name: 'my-project',
      },
    ]);
  });
});

describe('Normalize Devfile V2', () => {
  let defaultComponents: V230DevfileComponents[];

  beforeEach(() => {
    defaultComponents = [
      {
        container: {
          image: 'quay.io/devfile/universal-developer-image:latest',
        },
        name: 'universal-developer-image',
      },
    ];
  });

  it('should not apply defaultComponents if components exist', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
      components: [
        {
          container: {
            image: 'quay.io/devfile/custom-developer-image:custom',
          },
          name: 'custom-image',
        },
      ],
    } as V230Devfile;

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      {},
    );

    expect(targetDevfile).not.toEqual(
      expect.objectContaining({
        components: defaultComponents,
      }),
    );
    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: devfile.components,
      }),
    );
  });

  it('should not apply defaultComponents if parent exist', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
      parent: {
        id: 'java-maven',
        registryUrl: 'https://registry.devfile.io/',
        version: '1.2.0',
      },
      components: [],
    } as V230Devfile;

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      {},
    );

    expect(targetDevfile).not.toEqual(
      expect.objectContaining({
        components: defaultComponents,
      }),
    );
    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: devfile.components,
      }),
    );
  });

  it('should apply metadata name', () => {
    const devfile = {
      schemaVersion: '2.2.2',
    } as V230Devfile;

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      [],
      {},
    );

    expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('empty-yaml'));
  });

  it('should apply defaultComponents', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
      components: [],
    } as V230Devfile;

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      {},
    );

    expect(targetDevfile).not.toEqual(
      expect.objectContaining({
        components: devfile.components,
      }),
    );
    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: defaultComponents,
      }),
    );
  });

  it('should apply the custom memoryLimit from factory params', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
      components: [
        {
          container: {
            image: 'quay.io/devfile/custom-developer-image:custom',
          },
          name: 'developer-image',
        },
      ],
    } as V230Devfile;
    const factoryParams = {
      memoryLimit: '4Gi',
    };

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      factoryParams,
    );

    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: [
          {
            container: {
              image: 'quay.io/devfile/custom-developer-image:custom',
              memoryLimit: '4Gi',
            },
            name: 'developer-image',
          },
        ],
      }),
    );
  });

  it('should apply the custom cpuLimit from factory params', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
      components: [
        {
          container: {
            image: 'quay.io/devfile/custom-developer-image:custom',
          },
          name: 'developer-image',
        },
      ],
    } as V230Devfile;
    const factoryParams = {
      cpuLimit: '2',
    };

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      factoryParams,
    );

    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: [
          {
            container: {
              image: 'quay.io/devfile/custom-developer-image:custom',
              cpuLimit: '2',
            },
            name: 'developer-image',
          },
        ],
      }),
    );
  });

  it('should apply the custom image from factory params', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
      components: [
        {
          container: {
            image: 'quay.io/devfile/custom-developer-image:custom',
          },
          name: 'developer-image',
        },
      ],
    } as V230Devfile;
    const factoryParams = {
      image: 'quay.io/devfile/universal-developer-image:test',
    };

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      factoryParams,
    );

    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: [
          {
            container: {
              image: 'quay.io/devfile/universal-developer-image:test',
            },
            name: 'developer-image',
          },
        ],
      }),
    );
  });

  it('should apply defaultComponents and then the custom image from factory params', () => {
    const devfile = {
      schemaVersion: '2.2.2',
      metadata: {
        generateName: 'empty',
      },
    } as V230Devfile;
    const factoryParams = {
      image: 'quay.io/devfile/universal-developer-image:test',
    };

    const targetDevfile = normalizeDevfile(
      {
        devfile,
      } as FactoryResolver,
      'http://dummy-registry/devfiles/empty.yaml',
      defaultComponents,
      factoryParams,
    );

    expect(targetDevfile).toEqual(
      expect.objectContaining({
        components: [
          {
            container: {
              image: 'quay.io/devfile/universal-developer-image:test',
            },
            name: 'universal-developer-image',
          },
        ],
      }),
    );
  });

  describe('location URL with query parameters', () => {
    it('should strip query parameters from location when generating workspace name', () => {
      const devfile = {
        schemaVersion: '2.2.2',
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
        } as FactoryResolver,
        'git@github.com:svor/python-hello-world.git?revision=my-branch',
        defaultComponents,
        {},
      );

      // The workspace name should be based on 'python-hello-world', not include 'revision-my-branch'
      expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('python-hello-world'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('revision'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('my-branch'));
    });

    it('should handle HTTPS URL with revision query parameter', () => {
      const devfile = {
        schemaVersion: '2.2.2',
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
        } as FactoryResolver,
        'https://github.com/user/test-repo.git?revision=feature-branch',
        defaultComponents,
        {},
      );

      expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('test-repo'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('revision'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('feature-branch'));
    });

    it('should handle SSH URL with multiple query parameters', () => {
      const devfile = {
        schemaVersion: '2.2.2',
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
        } as FactoryResolver,
        'git@github.com:eclipse-che/che-dashboard.git?revision=main&che-editor=che-code',
        defaultComponents,
        {},
      );

      expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('che-dashboard'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('revision'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('che-editor'));
    });

    it('should prioritize scm_info clone_url over location with query params', () => {
      const devfile = {
        schemaVersion: '2.2.2',
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
          scm_info: {
            clone_url: 'https://github.com/user/actual-repo.git',
            scm_provider: 'github',
          },
        } as FactoryResolver,
        'https://github.com/user/factory-url-repo.git?revision=branch',
        defaultComponents,
        {},
      );

      // Should use scm_info.clone_url (actual-repo), not location (factory-url-repo)
      expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('actual-repo'));
      expect(targetDevfile.metadata.name).not.toEqual(expect.stringContaining('factory-url-repo'));
    });

    it('should handle URL without query parameters correctly', () => {
      const devfile = {
        schemaVersion: '2.2.2',
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
        } as FactoryResolver,
        'https://github.com/user/simple-repo.git',
        defaultComponents,
        {},
      );

      expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('simple-repo'));
    });

    it('should handle devfile with generateName and location with query params', () => {
      const devfile = {
        schemaVersion: '2.2.2',
        metadata: {
          generateName: 'custom-prefix-',
        },
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
        } as FactoryResolver,
        'git@github.com:user/repo.git?revision=test',
        defaultComponents,
        {},
      );

      // Should use generateName prefix, not project name
      expect(targetDevfile.metadata.name).toEqual(expect.stringContaining('custom-prefix-'));
      expect(targetDevfile.metadata.generateName).toBeUndefined();
    });

    it('should preserve existing devfile metadata name even with query params in location', () => {
      const devfile = {
        schemaVersion: '2.2.2',
        metadata: {
          name: 'predefined-workspace-name',
        },
      } as V230Devfile;

      const targetDevfile = normalizeDevfile(
        {
          devfile,
        } as FactoryResolver,
        'git@github.com:user/repo.git?revision=branch&new',
        defaultComponents,
        {},
      );

      expect(targetDevfile.metadata.name).toEqual('predefined-workspace-name');
    });
  });
});
