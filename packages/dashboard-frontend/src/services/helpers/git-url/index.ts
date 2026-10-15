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

/**
 * Cuts the browse suffix off a `<host>/<org>/<repo>/...` path, so that a browse URL
 * compares equal to the clone URL of the same repository:
 *
 *   github, GitHub Enterprise   <host>/<org>/<repo>/tree/<branch>
 *   gitlab                      <host>/<group>/[<subgroup>/…]<repo>/-/tree|blob/<branch>
 *   bitbucket                   <host>/<workspace>/<repo>/src/<branch>
 *
 * The marker is only honoured where the provider puts it, so a group, project or
 * repository genuinely named `src` or `tree` is left alone.
 */
function stripBrowseSuffix(hostAndPath: string): string {
  const segments = hostAndPath.split('/');

  // GitLab separates the browse part with `-`, after any number of subgroups
  const dashIndex = segments.indexOf('-');
  if (dashIndex >= 3 && ['tree', 'blob'].includes(segments[dashIndex + 1])) {
    return segments.slice(0, dashIndex).join('/');
  }

  if (segments.length <= 4) {
    return hostAndPath;
  }

  // GitHub paths are never deeper than <org>/<repo>, so `tree` in that position is
  // always the browse marker. The host is not checked, otherwise GitHub Enterprise,
  // which uses the same shape under an arbitrary host name, would be missed.
  if (segments[3] === 'tree') {
    return segments.slice(0, 3).join('/');
  }

  // Bitbucket's marker has to be gated on the host: paths of the other providers do go
  // deeper, and a GitLab subgroup or an Azure DevOps project may well be named `src`.
  if (segments[3] === 'src' && segments[0].includes('bitbucket')) {
    return segments.slice(0, 3).join('/');
  }

  return hostAndPath;
}

/**
 * Ports a scheme implies, and which therefore say nothing about which repository is
 * addressed. Any other port is part of the address and is kept.
 */
const DEFAULT_PORTS: Record<string, string> = {
  git: '9418',
  http: '80',
  https: '443',
  ssh: '22',
};

/**
 * Azure DevOps addresses one repository with two unrelated-looking layouts:
 *
 *   https://dev.azure.com/<org>/<project>/_git/<repo>
 *   git@ssh.dev.azure.com:v3/<org>/<project>/<repo>
 *
 * Reduce both to `dev.azure.com/<org>/<project>/<repo>` so that a devfile remote written
 * in one of them matches a factory URL written in the other.
 */
function canonicalizeAzureDevOps(hostAndPath: string): string {
  const https = hostAndPath.match(/^dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+)$/);
  if (https) {
    return `dev.azure.com/${https[1]}/${https[2]}/${https[3]}`;
  }
  const ssh = hostAndPath.match(/^ssh\.dev\.azure\.com\/v3\/([^/]+)\/([^/]+)\/(.+)$/);
  if (ssh) {
    return `dev.azure.com/${ssh[1]}/${ssh[2]}/${ssh[3]}`;
  }
  return hostAndPath;
}

/**
 * Reduces a Git URL to a comparable `host/path` form, so that the HTTPS, SSH and browse
 * URLs of the same repository compare equal:
 *
 *   https://github.com/org/repo.git
 *   https://github.com/org/repo/tree/some-branch
 *   git@github.com:org/repo.git
 *   ssh://git@github.com/org/repo/
 *
 * all normalize to `github.com/org/repo`.
 *
 * @returns the normalized URL, or `undefined` when there is nothing to compare
 */
export function normalizeGitUrl(url: string | undefined): string | undefined {
  if (!url || url.trim().length === 0) {
    return undefined;
  }

  let value = url.trim();
  // a query string is never part of the repository identity
  value = value.split('?')[0];
  // the scheme is dropped below, so remember it while it is still there
  const scheme = value.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1].toLowerCase();
  // scp-like syntax: git@host:org/repo.git -> host/org/repo.git
  value = value.replace(/^[^@/:]+@([^:/]+):/, '$1/');
  // scheme: https:// , ssh:// , git://
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  // credentials left over from ssh://git@host/...
  value = value.replace(/^[^@/]+@/, '');
  // `ssh://git@host:22/…` addresses the same repository as `ssh://git@host/…`. Only a
  // scheme-less scp-like URL is left alone, there `host:22/x` means the path `22/x`.
  const defaultPort = scheme ? DEFAULT_PORTS[scheme.replace(/^git\+/, '')] : undefined;
  if (defaultPort !== undefined) {
    value = value.replace(new RegExp(`^([^/:]+):${defaultPort}(/|$)`), '$1$2');
  }
  // only now is the host the first segment, so the browse marker can be located
  value = stripBrowseSuffix(value);
  value = value
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  return canonicalizeAzureDevOps(value) || undefined;
}
