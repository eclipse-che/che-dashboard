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

import { FactoryLocationAdapter } from '@/services/factory-location-adapter';

/**
 * Securely checks if a hostname belongs to an Azure DevOps instance.
 * Uses an allowlist approach to prevent URL spoofing attacks.
 *
 * @param hostname - The hostname to check
 * @returns true if the hostname is a valid Azure DevOps host
 */
function isAzureDevOpsHost(hostname: string): boolean {
  if (hostname === 'dev.azure.com') {
    return true;
  }

  return hostname.endsWith('.azure.com') && hostname.split('.').length >= 3;
}

/**
 * Extracts the clean repository URL without branch information and query parameters.
 * This is useful for comparing repositories and storing trusted sources.
 *
 * @param location - The URL string that may contain branch info and parameters
 * @returns The clean repository URL without branch paths or query parameters
 */
export function getRepoFromLocation(location: string): string {
  // Remove query parameters first
  const questionMarkIndex = location.indexOf('?');
  let cleanLocation =
    questionMarkIndex !== -1 ? location.substring(0, questionMarkIndex) : location;

  // Check if it's an HTTP/HTTPS location before parsing
  if (!FactoryLocationAdapter.isHttpLocation(cleanLocation)) {
    // Not an HTTP URL (e.g., SSH format like git@github.com:user/repo.git)
    return cleanLocation;
  }

  // Parse HTTP/HTTPS URL
  const url = new URL(cleanLocation);
  const pathname = url.pathname;

  // Check which Git provider and remove branch-specific path segments
  if (url.hostname === 'github.com') {
    // GitHub: remove /tree/*, /blob/*, /commits/*
    cleanLocation = cleanLocation.replace(/\/(tree|blob|commits)\/[^/]+.*$/, '');
  } else if (url.hostname === 'gitlab.com') {
    // GitLab: remove /-/tree/*, /-/blob/*, /-/commits/*
    cleanLocation = cleanLocation.replace(/\/-\/(tree|blob|commits)\/[^/]+.*$/, '');
  } else if (url.hostname === 'bitbucket.org') {
    // Bitbucket: remove /src/*
    cleanLocation = cleanLocation.replace(/\/src\/[^/]+.*$/, '');
  } else if (isAzureDevOpsHost(url.hostname)) {
    // Azure DevOps: URL already clean, just remove query params (already done above)
    // Pattern: https://dev.azure.com/org/project/_git/repo
    cleanLocation = `${url.origin}${pathname}`;
  } else {
    // Unknown provider, return origin + pathname (without query)
    cleanLocation = `${url.origin}${pathname}`;
  }

  // Remove trailing slashes
  cleanLocation = cleanLocation.replace(/\/+$/, '');

  return cleanLocation;
}
