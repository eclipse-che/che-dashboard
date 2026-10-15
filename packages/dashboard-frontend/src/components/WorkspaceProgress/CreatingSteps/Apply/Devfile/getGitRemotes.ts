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

import { V230DevfileProjects, V230DevfileProjectsItemsGit } from '@devfile/api';
import common from '@eclipse-che/common';

import { getProjectFromLocation } from '@/components/WorkspaceProgress/CreatingSteps/Apply/Devfile/getProjectFromLocation';
import devfileApi from '@/services/devfileApi';
import { getProjectName } from '@/services/helpers/getProjectName';
import { normalizeGitUrl } from '@/services/helpers/git-url';

export interface GitRemote {
  name: string;
  url: string;
}

/**
 * Returns parsed Git remotes given a string in one of the following
 * formats:
 *
 * 1. Explicit name and URL
 * {{origin,https://git...},{upstream,https://git...},...}
 *
 * 2. URLs only, name is implicit: first is origin, second is upstream, subsequent are fork1, fork2
 * {https://git...,https://git...,...}
 *
 * @param remotes input string to parse
 * @returns parsed array of Git remotes
 */
export function getGitRemotes(remotes: string | undefined): GitRemote[] {
  if (remotes === undefined || remotes.length === 0) {
    return [];
  }
  const remotesArray = parseRemotes(remotes);
  if (Array.isArray(remotesArray[0])) {
    return parseNameAndUrls(remotesArray, remotes);
  }
  return parseUrls(remotesArray, remotes);
}

export function gitRemotesToParam(remotes: GitRemote[]): string {
  if (remotes.length === 0) {
    return '';
  }
  const remotesStr = `{${(remotes || [])
    ?.filter(remote => remote.url !== '')
    .map(remote => {
      const sortedRemoteKeys = Object.keys(remote).sort();
      const sortedRemoteObject = sortedRemoteKeys.reduce((acc, key) => {
        acc[key] = remote[key];
        return acc;
      }, {});
      return JSON.stringify(sortedRemoteObject);
    })
    .join(',')
    .replace(/"name":/g, '')
    .replace(/"url":/g, '')
    .replace(/"/g, '')}}`;

  return remotesStr;
}

function parseRemotes(remotes: string): string[] {
  try {
    return JSON.parse(sanitizeValue(remotes));
  } catch (e) {
    throw `Unable to parse remotes '${remotes}'. ${common.helpers.errors.getMessage(e)}`;
  }
}

/**
 * Replaces braces ({}) with square brackets ([]) and adds
 * quotation marks (") around strings
 * @param str
 * @returns string representing an array
 */
export function sanitizeValue(str: string): string {
  return (
    str
      .replace(/\s/g, '')
      .replace(/{/g, '[')
      .replace(/}/g, ']')
      /* eslint-disable no-useless-escape */
      // replace '[<string>' with '["<char>'
      .replace(/(\[([^\["]))/g, '["$2')
      // replace '<string>]' with '<char>"]'
      .replace(/(([^\]"])\])/g, '$2"]')
      // replace '<string>,<string>' with '<char>","<char>'
      .replace(/(([^\]"]),([^\["]))/g, '$2","$3')
    /* eslint-enable no-useless-escape */
  );
}

function parseNameAndUrls(remotesArray, remotesString): GitRemote[] {
  const remotes: GitRemote[] = [];
  remotesArray.forEach(value => {
    if (!Array.isArray(value) || value.length !== 2) {
      throw `Malformed remotes provided: ${remotesString}`;
    }
    remotes.push({ name: value[0], url: value[1] });
  });
  return remotes;
}

function parseUrls(remotesArray: unknown[], remotesString: string): GitRemote[] {
  const remotes: GitRemote[] = [];

  remotesArray.forEach((value, i) => {
    if (typeof value !== 'string') {
      throw `Malformed remotes provided: ${remotesString}`;
    }

    let name;
    if (i === 0) {
      name = 'origin';
    } else if (i === 1) {
      name = 'upstream';
    } else {
      name = `fork${i - 1}`;
    }
    remotes.push({ name, url: value });
  });
  return remotes;
}

export function configureProjectRemotes(
  devfile: devfileApi.Devfile,
  remotes: string | undefined,
  isDefaultDevfile: boolean,
  revision: string,
  sourceUrl?: string,
): void {
  const parsedRemotes = getGitRemotes(remotes);

  // Find the Git project in the devfile to configure remotes for
  const projectMatch = getGitProjectForConfiguringRemotes(
    devfile.projects,
    sourceUrl,
    parsedRemotes.length > 0,
  );
  let gitProject = projectMatch?.git;

  // Determine the remote to set `checkoutFrom.remote` to
  let checkoutRemote: GitRemote | undefined =
    parsedRemotes.find(remote => remote.name === 'origin') || parsedRemotes[0];

  if (gitProject === undefined) {
    if (checkoutRemote === undefined) {
      // No project to configure and no remote to build one from. This happens when only
      // `revision` was given and the devfile declares no Git project at all.
      return;
    }
    if (!devfile.projects) {
      devfile.projects = [];
    }
    devfile.projects[0] = getProjectFromLocation(checkoutRemote.url, checkoutRemote.name);
    gitProject = devfile.projects[0].git;
  } else {
    const projectRemotes = gitProject.remotes || {};
    const matchedRemote = projectMatch?.remoteName;
    if (matchedRemote !== undefined && projectRemotes[matchedRemote] !== undefined) {
      // The factory URL points at this remote, so the revision has to be resolved
      // against it — `origin` may well be a different repository
      checkoutRemote = { name: matchedRemote, url: projectRemotes[matchedRemote] };
    } else if (projectRemotes.origin !== undefined) {
      checkoutRemote = { name: 'origin', url: projectRemotes.origin };
    } else if (checkoutRemote === undefined) {
      // The project has no `origin`; check out from whichever remote it does declare
      const [name, url] = Object.entries(projectRemotes)[0] || [];
      checkoutRemote = name && url ? { name, url } : undefined;
    }
  }

  if (gitProject === undefined || checkoutRemote === undefined) {
    console.warn('Failed to configure the project remotes.');
    return;
  }

  addRemotesToProject(gitProject, checkoutRemote, parsedRemotes, revision);

  if (isDefaultDevfile) {
    const projectName = getProjectName(checkoutRemote.url);
    devfile.metadata.name = projectName;
    devfile.metadata.generateName = projectName;
  }
}

interface GitProjectMatch {
  git: V230DevfileProjectsItemsGit;
  /**
   * The remote whose URL equals the factory URL. Only set when the project was picked by
   * matching, so that the caller can check out from that remote rather than from `origin`.
   */
  remoteName?: string;
}

/**
 * Returns the Git project to replace remotes for.
 *
 * The `remotes` and `revision` factory parameters describe the repository the factory URL
 * points at, not every project the devfile happens to clone alongside it. So when the
 * devfile declares several Git projects, the one whose remote matches the factory URL is
 * configured and the others are left untouched.
 *
 * @param projects the devfile projects
 * @param sourceUrl the factory source URL, used to pick a project among several
 * @param hasExplicitRemotes whether the user passed the `remotes` factory parameter
 */
function getGitProjectForConfiguringRemotes(
  projects: V230DevfileProjects[] | undefined,
  sourceUrl: string | undefined,
  hasExplicitRemotes: boolean,
): GitProjectMatch | undefined {
  const gitProjects = (projects || []).filter(
    (project): project is V230DevfileProjects & { git: V230DevfileProjectsItemsGit } =>
      project.git !== undefined,
  );
  if (gitProjects.length === 0) {
    return undefined;
  }
  if (gitProjects.length === 1) {
    return { git: gitProjects[0].git };
  }

  const targetUrl = normalizeGitUrl(sourceUrl);
  if (targetUrl) {
    for (const project of gitProjects) {
      const matchedRemote = Object.entries(project.git.remotes || {}).find(
        ([, remoteUrl]) => normalizeGitUrl(remoteUrl) === targetUrl,
      );
      if (matchedRemote) {
        return { git: project.git, remoteName: matchedRemote[0] };
      }
    }
  }

  // `sourceUrl` is optional and may be blank, so do not quote an empty value into the message
  const sourceUrlLabel = sourceUrl?.trim() ? `'${sourceUrl.trim()}'` : 'the factory URL';

  if (hasExplicitRemotes) {
    // The user asked for remotes we cannot place on any project — keep failing loudly
    throw new Error(
      `Unable to configure remotes: no project in the Devfile has a remote matching ${sourceUrlLabel}.`,
    );
  }

  // The revision was only inferred from the factory URL, so this is not worth
  // blocking the workspace creation over
  console.warn(
    `No Devfile project matches ${sourceUrlLabel}. Skipping the Git remotes configuration.`,
  );
  return undefined;
}

/**
 * Add the remotes specified in `newRemotes` to the `gitProject`.
 * @param gitProject The Git project to add the new remotes to
 * @param checkoutRemote The Git remote to set checkoutFrom.remote to
 * @param newRemotes The array of new Git remotes to add
 * @param revision Git branch or tag
 */
function addRemotesToProject(
  gitProject: V230DevfileProjectsItemsGit,
  checkoutRemote: GitRemote,
  newRemotes: GitRemote[],
  revision: string,
): void {
  const gitRemotes = newRemotes.reduce((map, remote) => {
    map[remote.name] = remote.url;
    return map;
  }, {});

  gitProject.remotes = Object.assign(gitProject.remotes || {}, gitRemotes);
  gitProject.checkoutFrom = Object.assign(gitProject.checkoutFrom || {}, {
    remote: checkoutRemote.name,
    revision,
  });
}
