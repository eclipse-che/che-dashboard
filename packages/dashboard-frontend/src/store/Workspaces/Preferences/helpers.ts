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

export const gitProviderPatterns = {
  github: {
    https: /^https:\/\/github\.com\/([^\\/]+\/[^\\/]+)(?:\/.*)?$/,
    ssh: /^(?:(?:git\+)?ssh:\/\/)?git@github\.com:([^\\/]+\/[^\\/]+?)(?:\.git)?$/,
  },
  gitlab: {
    https: /^https:\/\/gitlab\.com\/([^\\/]+\/[^\\/]+)(?:\/.*)?$/,
    ssh: /^(?:(?:git\+)?ssh:\/\/)?git@gitlab\.com:([^\\/]+\/[^\\/]+?)(?:\.git)?$/,
  },
  bitbucket: {
    https: /^https:\/\/bitbucket\.org\/([^\\/]+\/[^\\/]+)(?:\/.*)?$/,
    ssh: /^(?:(?:git\+)?ssh:\/\/)?git@bitbucket\.org:([^\\/]+\/[^\\/]+?)(?:\.git)?$/,
  },
  azureDevOps: {
    // https: /^https:\/\/dev\.azure\.com\/([^\\/]+\/[^\\/]+\/_git\/[^\\/]+)(?:\/.*)?$/,
    // ssh: /^(?:(?:git\+)?ssh:\/\/)?git@ssh\.dev\.azure\.com:v3\/([^\\/]+\/[^\\/]+\/[^\\/]+)(?:\.git)?$/,
    https: /^https:\/\/(?:\w+@)?dev\.azure\.com\/([^\\/]+\/[^\\/]+\/_git\/[^\\/]+?)(?:\?.*)?$/,
    ssh: /^(?:ssh:\/\/)?git@ssh\.dev\.azure\.com:v3\/([^\\/]+\/[^\\/]+\/[^\\/]+)(?:\/[^\\/]+)?$/,
  },
};

/**
 * Checks if an URL is a GitHub repository.
 */
export function isGitHubRepo(url: string): boolean {
  const githubPatterns = gitProviderPatterns.github;
  return githubPatterns.https.test(url) || githubPatterns.ssh.test(url);
}

/**
 * Checks if an URL is a GitLab repository.
 */
export function isGitLabRepo(url: string): boolean {
  const gitlabPatterns = gitProviderPatterns.gitlab;
  return gitlabPatterns.https.test(url) || gitlabPatterns.ssh.test(url);
}

/**
 * Checks if an URL is a Bitbucket repository.
 */
export function isBitbucketRepo(url: string): boolean {
  const bitbucketPatterns = gitProviderPatterns.bitbucket;
  return bitbucketPatterns.https.test(url) || bitbucketPatterns.ssh.test(url);
}

/**
 * Checks if an URL is an Azure DevOps repository.
 */
export function isAzureDevOpsRepo(url: string): boolean {
  const azureDevOpsPatterns = gitProviderPatterns.azureDevOps;
  return azureDevOpsPatterns.https.test(url) || azureDevOpsPatterns.ssh.test(url);
}

/**
 * Extracts the repository name from a URL using a regular expression pattern.
 */
export function extractRepo(url: string, pattern: RegExp): string | null {
  const match = url.match(pattern);

  if (!match) {
    return null;
  }

  return isAzureDevOpsRepo(url) ? match[1].replace('/_git', '') : match[1];
}

export function isTrustedRepo(trustedRepoURLs: string[], url: string | URL): boolean {
  const urlString = url.toString();

  // Check if the URL matches any of the trusted repositories
  return trustedRepoURLs.some(repoURL => {
    let repoPattern: RegExp | null = null;

    if (repoURL.startsWith('https://github.com/')) {
      repoPattern = gitProviderPatterns.github.https;
    } else if (repoURL.startsWith('https://gitlab.com/')) {
      repoPattern = gitProviderPatterns.gitlab.https;
    } else if (repoURL.startsWith('https://bitbucket.org/')) {
      repoPattern = gitProviderPatterns.bitbucket.https;
    } else if (repoURL.startsWith('https://dev.azure.com/')) {
      repoPattern = gitProviderPatterns.azureDevOps.https;
    } else if (repoURL.startsWith('git@github.com:')) {
      repoPattern = gitProviderPatterns.github.ssh;
    } else if (repoURL.startsWith('git@gitlab.com:')) {
      repoPattern = gitProviderPatterns.gitlab.ssh;
    } else if (repoURL.startsWith('git@bitbucket.org:')) {
      repoPattern = gitProviderPatterns.bitbucket.ssh;
    } else if (repoURL.startsWith('git@ssh.dev.azure.com:')) {
      repoPattern = gitProviderPatterns.azureDevOps.ssh;
    } else {
      // For generic URLs, match the base URL directly
      return urlString.startsWith(repoURL);
    }

    if (repoPattern) {
      const trustedRepo = extractRepo(repoURL, repoPattern);
      const testRepo = extractRepo(urlString, repoPattern);

      return trustedRepo && testRepo && trustedRepo === testRepo;
    }

    return false;
  });
}
