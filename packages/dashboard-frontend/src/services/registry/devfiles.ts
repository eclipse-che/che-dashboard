/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { fetchData } from './fetchData';
import SessionStorageService, { SessionStorageKey } from '../session-storage';

function createURL(url: string, baseUrl: string): URL {
  // Remove it after fixing all source links https://github.com/eclipse/che/issues/19140
  if (/^\/(\w+)/.test(url)) {
    return new URL(`.${url}`, baseUrl);
  }

  return new URL(url, baseUrl);
}

function resolveIconUrl(metadata: che.DevfileMetaData, baseUrl: string): string {
  if (!metadata.icon || metadata.icon.startsWith('http')) {
    return metadata.icon;
  }

  return createURL(metadata.icon, baseUrl).href;
}

export function resolveTags(
  metadata: che.DevfileMetaData,
  baseUrl: string,
  isExternal: boolean,
): string[] {
  const resolvedTags: string[] = [...metadata.tags];
  if (isExternal) {
    const resourceTag = new URL(baseUrl).host
      .replace(/^registry\./, '')
      .replace(/^\w/, char => char.toUpperCase());
    resolvedTags.push(resourceTag);
  }
  return resolvedTags;
}

export function resolveLinks(
  metadata: che.DevfileMetaData,
  baseUrl: string,
  isExternal: boolean,
): any {
  if (isExternal) {
    const self = metadata.links?.self;
    if (self && !metadata.links.v2) {
      const devfileCatalog = new URL('devfiles', baseUrl).toString();
      const v2 = self.startsWith('devfile-catalog')
        ? self.replace(':', '/').replace('devfile-catalog', devfileCatalog)
        : self;
      metadata.links.v2 = v2;
      delete metadata.links.self;
    }
  }
  const resolvedLinks = {};
  const linkNames = Object.keys(metadata.links);
  linkNames.map(linkName => {
    resolvedLinks[linkName] = updateObjectLinks(metadata.links[linkName], baseUrl);
  });
  return resolvedLinks;
}

export function updateObjectLinks(object: any, baseUrl): any {
  if (typeof object === 'string') {
    if (!object.startsWith('http')) {
      object = createURL(object, baseUrl).href;
    }
  } else {
    Object.keys(object).forEach(key => {
      object[key] = updateObjectLinks(object[key], baseUrl);
    });
  }
  return object;
}

export async function fetchRegistryMetadata(
  registryUrl: string,
  isExternal: boolean,
): Promise<che.DevfileMetaData[]> {
  registryUrl = registryUrl[registryUrl.length - 1] === '/' ? registryUrl : registryUrl + '/';

  try {
    const registryIndexUrl = isExternal
      ? new URL('/index', registryUrl)
      : new URL('devfiles/index.json', registryUrl);
    if (isExternal) {
      const devfileMetaData = getExternalRegistryMetadataFromStorage(registryIndexUrl.href);
      if (devfileMetaData !== undefined) {
        return devfileMetaData;
      }
    }
    const devfileMetaData = await fetchData<che.DevfileMetaData[]>(registryIndexUrl.href);

    const val = devfileMetaData.map(meta => {
      meta.icon = resolveIconUrl(meta, registryUrl);
      meta.links = resolveLinks(meta, registryUrl, isExternal);
      meta.tags = resolveTags(meta, registryUrl, isExternal);
      return meta;
    });
    if (isExternal) {
      setExternalRegistryMetadataToStorage(registryIndexUrl.href, val);
    }
    return val;
  } catch (error) {
    const errorMessage =
      `Failed to fetch devfiles metadata from registry URL: ${registryUrl}, reason: ` + error;
    console.error(errorMessage);
    throw errorMessage;
  }
}

function getExternalRegistryMetadataFromStorage(url: string): che.DevfileMetaData[] | undefined {
  const externalRegistries = SessionStorageService.get(SessionStorageKey.EXTERNAL_REGISTRIES);
  if (typeof externalRegistries !== 'string') {
    return undefined;
  }
  try {
    const externalRegistriesObj = JSON.parse(externalRegistries);
    return externalRegistriesObj[url]?.metadata;
  } catch (e) {
    return undefined;
  }
}

function setExternalRegistryMetadataToStorage(url: string, metadata: che.DevfileMetaData[]): void {
  const externalRegistries = SessionStorageService.get(SessionStorageKey.EXTERNAL_REGISTRIES);
  let externalRegistriesObj: { [url: string]: { metadata: che.DevfileMetaData[] } };
  if (typeof externalRegistries === 'string') {
    try {
      externalRegistriesObj = JSON.parse(externalRegistries);
    } catch (e) {
      externalRegistriesObj = {};
    }
  } else {
    externalRegistriesObj = {};
  }
  externalRegistriesObj[url] = {
    metadata,
  };
  try {
    SessionStorageService.update(
      SessionStorageKey.EXTERNAL_REGISTRIES,
      JSON.stringify(externalRegistriesObj),
    );
  } catch (e) {
    // noop
  }
}

export async function fetchDevfile(url: string): Promise<string> {
  try {
    const devfile = await fetchData<string>(url);
    return devfile;
  } catch (error) {
    const errorMessage = `Failed to fetch a devfile from URL: ${url}, reason: ` + error;
    console.error(errorMessage);
    throw errorMessage;
  }
}
