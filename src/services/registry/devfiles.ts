/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
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

// create new instance of `axios` to avoid adding an authorization header
const axiosInstance = axios.create();

function resolveIconUrl(metadata: che.DevfileMetaData, url: string): string {
  if (!metadata.icon || metadata.icon.startsWith('http')) {
    return metadata.icon;
  }
  return new URL(metadata.icon, url).href;
}

function resolveLinkSelf(metadata: che.DevfileMetaData, url: string): string {
  if (metadata.links.self.startsWith('http')) {
    return metadata.links.self;
  }
  return new URL(metadata.links.self, url).href;
}

export async function fetchMetadata(registryUrl: string): Promise<che.DevfileMetaData[]> {

  try {
    const response = await axiosInstance.get<che.DevfileMetaData[]>(registryUrl);

    return response.data.map(meta => {
      meta.icon = resolveIconUrl(meta, registryUrl);
      meta.links.self = resolveLinkSelf(meta, registryUrl);
      return meta;
    });
  } catch (e) {
    throw new Error(`Failed to fetch devfiles metadata from registry URL: ${registryUrl},` + e);
  }
}

/**
 * Fetches devfiles metadata for given registry urls.
 * @param registryUrls space-separated list of urls
 */
export async function fetchRegistriesMetadata(registryUrls: string): Promise<che.DevfileMetaData[]> {
  const urls = registryUrls.split(/\s+/);

  try {
    const metadataPromises = urls.map(registryUrl => {
      registryUrl = registryUrl[registryUrl.length - 1] === '/' ? registryUrl : registryUrl + '/';
      const registryIndexUrl = new URL('devfiles/index.json', registryUrl);
      return registryIndexUrl.href;
    }).map(async url => {
      try {
        return await fetchMetadata(url);
      } catch (error) {
        console.error(error);
        return [];
      }
    });

    const allMetadata = await Promise.all(metadataPromises);
    return allMetadata.reduce((_allMetadata, registryMetadata) => {
      return _allMetadata.concat(registryMetadata);
    }, []);
  } catch (e) {
    throw new Error(e);
  }
}

export async function fetchDevfile(url: string): Promise<string> {
  try {
    const response = await axiosInstance.get<string>(url);
    return response.data;
  } catch (e) {
    throw new Error(`Failed to fetch a devfile from URL: ${url},` + e);
  }
}
