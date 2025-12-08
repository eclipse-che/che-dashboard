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

import { api } from '@eclipse-che/common';

import { run } from '@/devworkspaceClient/services/helpers/exec';

const urlRegexp = new RegExp(
  '((git|ssh|http(s)?)|(git@[\\w.]+))(:(\\/\\/)?)([\\w.@:/\\-~]+)(\\.git)?(\\/)?',
);
export async function getBranches(url: string): Promise<api.IGitBranches | undefined> {
  if (!urlRegexp.test(url)) {
    throw new Error('Invalid repository url');
  }
  const result = await run(`git`, ['ls-remote', '--refs', url], 1000);
  if (result) {
    return {
      branches: result
        .split(' ')
        .filter(b => b.indexOf('refs/heads/') > 0 || b.indexOf('refs/tags/') > 0)
        .map(b => b.replace(new RegExp('.*\\trefs/((heads)|(tags))/'), '')),
    };
  }
  return undefined;
}
