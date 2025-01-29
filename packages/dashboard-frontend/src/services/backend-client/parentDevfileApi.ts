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

import { load } from 'js-yaml';

import { getDataResolver } from '@/services/backend-client/dataResolverApi';
import devfileApi, { isDevfileV2 } from '@/services/devfileApi';

export async function getParentDevfile(devfile: unknown): Promise<devfileApi.Devfile | undefined> {
  if (isDevfileV2(devfile) && devfile.parent) {
    let uri: string | undefined;
    if (devfile.parent.uri) {
      uri = devfile.parent.uri;
    } else if (devfile.parent.id && devfile.parent.registryUrl) {
      uri = `${devfile.parent.registryUrl}/devfiles/${devfile.parent.id}`;
    }
    if (uri) {
      try {
        const data = await getDataResolver(uri);
        if (typeof data === 'string') {
          const parentDevfile = load(data);
          if (isDevfileV2(parentDevfile)) {
            return parentDevfile;
          }
        }
      } catch (e) {
        console.error('Failed to fetch parent devfile', e);
      }
    }
  }

  return undefined;
}
