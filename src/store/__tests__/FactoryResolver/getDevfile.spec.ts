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

import { getDevfile } from '../../FactoryResolver/getDevfile';
import { FactoryResolverBuilder } from '../../__mocks__/factoryResolverBuilder';

describe('Get a devfile from factory resolver object', () => {

  it('should return a devfile V1 as is', () => {
    const devfile = {
      apiVersion: '1.0.0',
      metadata: {
        generateName: 'wksp-',
      },
    };
    const factoryResolver = new FactoryResolverBuilder().withDevfile(devfile).build();

    const targetDevfile = getDevfile(factoryResolver);

    expect(targetDevfile).toEqual(devfile);
  });

  it('should return a devfile V2 as is', () => {
    const devfile = getV2Devfile();
    const factoryResolver = new FactoryResolverBuilder().withDevfile(devfile).build();

    const targetDevfile = getDevfile(factoryResolver);

    expect(targetDevfile).toEqual(devfile);
  });

  it('should return a devfile V2 with a default project', () => {
    const devfile = getV2Devfile();
    const factoryResolver = new FactoryResolverBuilder()
      .withDevfile(devfile)
      .withScmInfo({
        'clone_url': 'http://dummy/test.com/project-demo',
        'scm_provider': 'github',
      })
      .build();

    const targetDevfile = getDevfile(factoryResolver);

    expect(targetDevfile).toEqual(expect.objectContaining({
      projects: [{
        git: {
          remotes: {
            origin: 'http://dummy/test.com/project-demo',
          },
        },
        name: 'project-demo',
      },
      ],
    }));
  });

});

function getV2Devfile(): api.che.workspace.devfile.Devfile {
  return {
    schemaVersion: '2.0.0',
    metadata: {
      name: 'spring-petclinic',
    },
    components: [
      {
        name: 'maven',
        container: {
          image: 'quay.io/eclipse/che-java8-maven:nightly',
          volumeMounts: [
            {
              name: 'mavenrepo',
              path: '/root/.m2',
            },
          ],
          env: [
            {
              name: 'ENV_VAR',
              value: 'value',
            },
          ],
          memoryLimit: '1536M',
        },
      },
      {
        name: 'mavenrepo',
        volume: {},
      },
    ],
  };
}
