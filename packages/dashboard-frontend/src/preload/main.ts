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

import { helpers } from '@eclipse-che/common';

import { FactoryLocation, FactoryLocationAdapter } from '@/services/factory-location-adapter';
import {
  PROPAGATE_FACTORY_ATTRS,
  REMOTES_ATTR,
} from '@/services/helpers/factoryFlow/buildFactoryParams';
import SessionStorageService, { SessionStorageKey } from '@/services/session-storage';

declare global {
  interface Window {
    CHE_DASHBOARD_REDIRECT_URL?: string;
  }
}

export function isValidRedirectUrl(redirectUrl: unknown, currentOrigin: string): boolean {
  if (!redirectUrl || typeof redirectUrl !== 'string') {
    return false;
  }
  const trimmed = redirectUrl.trim();
  if (
    !/^https?:\/\/[^/?#]+/i.test(trimmed) ||
    /[\s\\]/.test(trimmed) ||
    Array.from(trimmed).some(character => {
      const code = character.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    })
  ) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    if (!url.host) {
      return false;
    }
    // Prevent navigation back to an entry point that runs the root preload script.
    if (url.origin === currentOrigin) {
      const normalizedPath = url.pathname.replace(/\/+$/, '');
      if (normalizedPath === '' || normalizedPath === '/index.html') {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function getRedirectUrl(): string | undefined {
  if (typeof window !== 'undefined' && window.CHE_DASHBOARD_REDIRECT_URL !== undefined) {
    return window.CHE_DASHBOARD_REDIRECT_URL;
  }
  if (typeof process !== 'undefined' && process.env?.CHE_DASHBOARD_REDIRECT_URL) {
    return process.env.CHE_DASHBOARD_REDIRECT_URL;
  }
  return undefined;
}

export function redirectToDashboard(): void {
  if (window.location.pathname.startsWith('/dashboard/')) {
    // known location, do nothing
    return;
  }

  storePathIfNeeded(window.location.pathname);

  // check if project url is provided (<che-host>#<repo-url>)
  const hash = window.location.hash.replace(/(\/?)#(\/?)/, '');
  if (FactoryLocationAdapter.isHttpLocation(hash) || FactoryLocationAdapter.isSshLocation(hash)) {
    // project url found, redirect to the workspaces creation page
    window.location.href = window.location.origin + '/dashboard' + buildFactoryLoaderPath(hash);
    return;
  }

  // check if remotes are provided without a project url
  if (
    window.location.search.startsWith(`?${REMOTES_ATTR}=`) ||
    window.location.search.includes(`&${REMOTES_ATTR}=`)
  ) {
    // allow starting workspaces when no project url, but remotes are provided
    window.location.href =
      window.location.origin + '/dashboard' + buildFactoryLoaderPath(window.location.href, false);
    return;
  }

  // check if alternative dashboard redirect URL is configured
  const redirectUrl = getRedirectUrl();
  if (
    ['/', '/index.html'].includes(window.location.pathname) &&
    redirectUrl &&
    isValidRedirectUrl(redirectUrl, window.location.origin)
  ) {
    window.location.replace(redirectUrl.trim());
    return;
  }

  // redirect to the dashboard home page
  window.location.href = window.location.origin + '/dashboard/';
}

export function storePathIfNeeded(path: string) {
  if (path !== '/') {
    SessionStorageService.update(SessionStorageKey.ORIGINAL_LOCATION_PATH, path);
  }
}

export function buildFactoryLoaderPath(location: string, appendUrl = true): string {
  let factory: FactoryLocation | URL;
  if (appendUrl) {
    try {
      factory = new FactoryLocationAdapter(location);
    } catch (e) {
      console.error(e);
      return '/';
    }
  } else {
    factory = helpers.sanitizeLocation<URL>(new window.URL(location));
  }

  const repoParams = new URLSearchParams(factory.searchParams.toString());
  // Extract and remove parameters that should be propagated to the factory loader URL
  const initParams = PROPAGATE_FACTORY_ATTRS.map(paramName => {
    const paramValue = extractUrlParam(repoParams, paramName);
    return [paramName, paramValue];
  }).filter(([, paramValue]) => paramValue);

  const devfilePath =
    extractUrlParam(repoParams, 'devfilePath') || extractUrlParam(repoParams, 'df');
  if (devfilePath) {
    initParams.push(['override.devfileFilename', devfilePath]);
  }
  const newWorkspace = extractUrlParam(repoParams, 'new');
  if (newWorkspace) {
    initParams.push(['policies.create', 'perclick']);
  }

  const searchParams = new URLSearchParams(initParams);

  if (appendUrl) {
    let url = factory.toString().split('?')[0];
    if (repoParams.toString()) {
      url += encodeURIComponent('?' + repoParams.toString());
    }
    searchParams.set('url', encodeURIComponent(url));
  }

  return '/f?' + searchParams.toString();
}

function extractUrlParam(params: URLSearchParams, paramName: string): string {
  const param = params.get(paramName);
  let value = '';
  if (param) {
    value = param.slice();
  } else if (params.has(paramName)) {
    value = 'true';
  }
  params.delete(paramName);
  return value;
}
