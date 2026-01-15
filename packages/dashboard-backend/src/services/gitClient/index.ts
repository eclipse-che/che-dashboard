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
  '((git|ssh|http(s)?)|(git@[\\w.]+))(:(\\/\\/)?)([\\w.@:/\\-~\\[\\]]+)(\\.git)?(\\/)?',
);
export async function getBranches(url: string): Promise<api.IGitBranches | undefined> {
  if (!urlRegexp.test(url)) {
    throw new Error('Invalid repository url');
  }

  /**
   * -c credential.helper=: This is the most critical defense against modern Credential Smuggling (e.g., CVE-2024-50338).
   * By passing an empty value to credential.helper, you force Git to ignore any configured helpers (like Git Credential Manager).
   * This ensures that even if the URL is malicious (e.g., https://remote.com\rhost=attacker.com),
   * Git has no credentials to leak to the attacker.
   *
   * -c protocol.ext.allow=never: Explicitly disables the ext:: protocol for this command.
   * The ext:: protocol allows the execution of arbitrary commands (like ext::sh -c...)
   * and is a frequent vector for Remote Code Execution (RCE).
   *
   * --rfs: Do not show peeled tags or pseudorefs like HEAD in the output.
   *
   *  -- (Double Dash): Forces Git to treat all subsequent arguments as operands (URLs) rather than options.
   * This defends against Argument Injection, where a malicious URL might start with a dash (e.g., -oProxyCommand)
   * to trick the underlying system shell.
   *
   * GIT_TERMINAL_PROMPT=0: Prevents Git from hanging by asking for a username/password on the terminal if the remote
   * requires authentication.This is crucial for automation to prevent DoS (Denial of Service) due to hanging processes.
   */
  const result = await run(
    'git',
    [
      '-c',
      'credential.helper=',
      '-c',
      'protocol.ext.allow=never',
      'ls-remote',
      '--refs',
      '--',
      url,
    ],
    { env: { GIT_TERMINAL_PROMPT: '0' } },
  );
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
