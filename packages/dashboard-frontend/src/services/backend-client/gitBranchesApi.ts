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

import common, { api } from '@eclipse-che/common';

import { AxiosWrapper } from '@/services/axios-wrapper/axiosWrapper';
import { dashboardBackendPrefix } from '@/services/backend-client/const';
import SessionStorageService, { SessionStorageKey } from '@/services/session-storage';

const EXPIRATION_TIME_FOR_STORED_BRANCHES = 60 * 60 * 1000; // expiration time in milliseconds

/**
 * Returns object with git branches list.
 */
export async function fetchGitBranches(url: string): Promise<api.IGitBranches> {
  const requestUrl = `${dashboardBackendPrefix}/gitbranches/${encodeURIComponent(encodeURIComponent(url))}`;
  try {
    const branchesFromStorage = getBranchesFromStorage(url);
    if (branchesFromStorage) {
      return { branches: branchesFromStorage } as api.IGitBranches;
    }
    const response =
      await AxiosWrapper.createToRetryMissedBearerTokenError().get<api.IGitBranches>(requestUrl);
    const data = response.data;
    setGitBranchesToStorage(url, data.branches);
    return data;
  } catch (e) {
    throw new Error(`Failed to fetch git branches. ${common.helpers.errors.getMessage(e)}`);
  }
}

function getBranchesFromStorage(url: string): string[] | undefined {
  const branches = SessionStorageService.get(SessionStorageKey.GIT_BRANCHES);
  if (typeof branches !== 'string') {
    return undefined;
  }
  try {
    const branchesObj = JSON.parse(branches);
    if (!branchesObj[url]?.lastFetched || !branchesObj[url]?.branches) {
      return undefined;
    }
    const timeElapsed = Date.now() - branchesObj[url]?.lastFetched;
    if (timeElapsed > EXPIRATION_TIME_FOR_STORED_BRANCHES) {
      return undefined;
    }
    return branchesObj[url]?.branches;
  } catch (e) {
    return undefined;
  }
}

function setGitBranchesToStorage(url: string, branches: string[]): void {
  const gitBranches = SessionStorageService.get(SessionStorageKey.GIT_BRANCHES);
  let gitBranchesObj: {
    [url: string]: {
      branches: string[];
      lastFetched: number;
    };
  };
  if (typeof gitBranches === 'string') {
    try {
      gitBranchesObj = JSON.parse(gitBranches);
    } catch (e) {
      gitBranchesObj = {};
    }
  } else {
    gitBranchesObj = {};
  }
  gitBranchesObj[url] = {
    branches,
    lastFetched: Date.now(),
  };
  try {
    SessionStorageService.update(SessionStorageKey.GIT_BRANCHES, JSON.stringify(gitBranchesObj));
  } catch (e) {
    // noop
  }
}
