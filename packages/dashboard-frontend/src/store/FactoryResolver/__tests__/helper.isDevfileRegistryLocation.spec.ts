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

import { api } from '@eclipse-che/common';

import { DEFAULT_REGISTRY } from '@/store/DevfileRegistries';
import { isDevfileRegistryLocation } from '@/store/FactoryResolver/helpers';

describe('isDevfileRegistryLocation', () => {
  const externalDevfileRegistryURL = 'https://external-devfile-registry.dev';
  const config = {
    devfileRegistry: {
      externalDevfileRegistries: [
        {
          url: externalDevfileRegistryURL,
        },
      ],
    },
  } as unknown as api.IServerConfig;

  test('default registry', () => {
    const location = `${window.location.origin}${DEFAULT_REGISTRY}devfiles/devfile.yaml`;
    expect(isDevfileRegistryLocation(location, config)).toBe(true);
  });

  test('external registry', () => {
    const location = `${externalDevfileRegistryURL}/devfiles/devfile.yaml`;
    expect(isDevfileRegistryLocation(location, config)).toBe(true);
  });

  test('non-registry devfile', () => {
    const location = 'https://my-host.dev/devfiles/devfile.yaml';
    expect(isDevfileRegistryLocation(location, config)).toBe(false);
  });
});
