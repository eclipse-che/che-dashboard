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

import axios from 'axios';

import { cheServerPrefix } from '@/services/backend-client/const';
import { getParentDevfile } from '@/services/backend-client/parentDevfileApi';
import { FactoryLocationAdapter } from '@/services/factory-location-adapter';
import { FactoryResolver } from '@/services/helpers/types';

export async function getFactoryResolver(
  url: string,
  overrideParams: { [params: string]: string } = {},
): Promise<FactoryResolver> {
  if (url.indexOf(' ') !== -1) {
    url = encodeURI(url);
  }
  // In the case of the Azure repository, the search parameters are encoded twice and need to be decoded.
  if (url.indexOf('?') !== -1) {
    const [path, search] = url.split('?');
    if (FactoryLocationAdapter.isHttpLocation(url)) {
      url = `${path}?${decodeURIComponent(search)}`;
    } else {
      // For SSH locations: extract ALL parameters to overrideParams and use only the path
      const searchParams = new URLSearchParams(decodeURIComponent(search));
      searchParams.forEach((value, key) => {
        overrideParams = { ...overrideParams, [key]: value };
      });
      // SSH URLs should not have query parameters - use only the path
      url = path;
    }
  }
  const response = await axios.post(
    `${cheServerPrefix}/factory/resolver`,
    Object.assign({}, overrideParams, { url }),
  );

  const factoryResolver: FactoryResolver = response.data;

  if (factoryResolver) {
    factoryResolver.parentDevfile = await getParentDevfile(factoryResolver.devfile);
  }

  return factoryResolver;
}

export async function refreshFactoryOauthToken(url: string): Promise<void> {
  await axios.post(`${cheServerPrefix}/factory/token/refresh?url=${url}`);

  return Promise.resolve();
}
