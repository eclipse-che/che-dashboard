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

export const PROJECT_NAME_MAX_LENGTH = 63;

/**
 * Extracts a logical, readable project name from various Git URL formats.
 * Handles GitHub, GitLab, Bitbucket URLs with tree/branch references, SSH URLs, and gist URLs.
 *
 * @param cloneUrl - The Git repository URL or devfile URL
 * @returns A normalized project name suitable for Kubernetes resources
 *
 * @example
 * getProjectName('git@github.com:eclipse-che/che-dashboard.git?revision=test-br')
 * // returns 'che-dashboard'
 *
 * @example
 * getProjectName('https://github.com/eclipse-che/che-dashboard.git/tree/my-br?storageType=ephemeral')
 * // returns 'che-dashboard'
 *
 * @example
 * getProjectName('https://gitlab.com/oorel1/test-project.git/-/tree/qwerty?storageType=ephemeral')
 * // returns 'test-project'
 */
export function getProjectName(cloneUrl: string): string {
  // Remove query parameters
  let url = cloneUrl.split('?')[0];

  // Normalize SSH URLs: convert git@host:path to git@host/path for easier processing
  // Handles: git@github.com:user/repo.git -> git@github.com/user/repo.git
  const isSshUrl = url.includes('@') && !url.includes('//');
  if (isSshUrl) {
    url = url.replace(/^([^:]+):([^:]+)$/, '$1/$2');
  }

  // Remove protocol for easier path extraction
  const hasProtocol = /^[a-z]+:\/\//i.test(url);
  if (hasProtocol) {
    url = url.replace(/^[a-z]+:\/\//i, '');
  }

  // Remove .git extension before processing (for URLs like repo.git/-/tree/)
  url = url.replace(/\.git(?=\/|$)/g, '');

  // Handle URLs with branch/tree references:
  // - GitHub: /tree/branch-name
  // - GitLab: /-/tree/branch-name or /tree/branch-name
  // - Bitbucket: /src/branch-name
  const branchPatterns = [
    '/-/tree/',
    '/-/blob/',
    '/-/commits/',
    '/tree/',
    '/src/',
    '/blob/',
    '/commits/',
  ];

  for (const pattern of branchPatterns) {
    const index = url.indexOf(pattern);
    if (index !== -1) {
      url = url.substring(0, index);
      break;
    }
  }

  // Split by '/' to get path segments
  const allSegments = url.split('/').filter(segment => segment.length > 0);

  // For HTTP(S) URLs, skip the domain/host part (first segment after protocol removal)
  // For SSH URLs (git@...), skip the host part
  let segments = allSegments;
  if (allSegments.length > 1) {
    // If first segment looks like a domain/host, skip it
    const firstSegment = allSegments[0];
    if (firstSegment.includes('.') || firstSegment.includes('@') || firstSegment === 'localhost') {
      segments = allSegments.slice(1);
    }
  }

  if (segments.length === 0) {
    return 'project';
  }

  // Get the last meaningful segment (repository name)
  let name = segments[segments.length - 1];

  // For URLs with file names (like devfile.yaml), handle file extensions
  if (name.includes('.')) {
    // Check if it's a file extension (yaml, json, etc)
    const parts = name.split('.');
    const extension = parts[parts.length - 1]?.toLowerCase();
    const fileExtensions = ['yaml', 'yml', 'json', 'txt', 'md'];

    if (extension && fileExtensions.includes(extension)) {
      // For simple URLs like "https://example.com/devfile.yaml", keep the filename without extension
      if (segments.length <= 2) {
        name = parts.slice(0, -1).join('.'); // Remove extension but keep filename
      } else {
        // Try to extract a meaningful name from earlier segments
        // For gist URLs, prioritize username or gist ID
        let foundBetter = false;
        for (let i = segments.length - 2; i >= 0; i--) {
          const segment = segments[i];
          // Skip generic segments
          const genericSegments = [
            'raw',
            'githubusercontent',
            'gist',
            'refs',
            'heads',
            'main',
            'master',
            'devfiles',
          ];

          // For gist URLs, prefer username (earlier) over hash IDs
          if (url.includes('gist')) {
            // Skip hash-like segments (long hex strings)
            if (segment.length > 20 && /^[a-f0-9]+$/.test(segment)) {
              continue;
            }
          }

          if (
            !genericSegments.includes(segment.toLowerCase()) &&
            segment.length > 2 &&
            !/^[a-f0-9]{32,}$/.test(segment) // Skip long hashes
          ) {
            name = segment;
            foundBetter = true;
            break;
          }
        }

        // If no better name found, use filename without extension
        if (!foundBetter) {
          name = parts.slice(0, -1).join('.');
        }
      }
    }
  }

  // Check if the name is a generic segment that should trigger fallback
  const genericNames = ['main', 'master', 'develop', 'refs', 'heads', 'raw', 'devfiles'];
  if (genericNames.includes(name.toLowerCase()) && segments.length > 1) {
    // Try to find a better segment
    for (let i = segments.length - 2; i >= 0; i--) {
      const segment = segments[i];
      if (!genericNames.includes(segment.toLowerCase()) && segment.length > 2) {
        name = segment;
        break;
      }
    }
    // If still generic, use default
    if (genericNames.includes(name.toLowerCase())) {
      name = 'project';
    }
  }

  // Normalize the name
  name = name.toLowerCase();
  name = name.replace(/([^-a-z0-9]+)/g, '-');
  name = name.replace(/(^[-]+)/, '');
  name = name.replace(/([-]+$)/, '');

  // Ensure we have a valid name
  if (name.length === 0) {
    name = 'project';
  }

  // Truncate if too long
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    name = name.substring(0, PROJECT_NAME_MAX_LENGTH - 1);
    // Remove trailing dash after truncation
    name = name.replace(/([-]+$)/, '');
  }

  return name;
}
