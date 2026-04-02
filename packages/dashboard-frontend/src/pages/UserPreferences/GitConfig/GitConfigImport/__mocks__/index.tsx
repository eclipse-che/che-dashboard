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

import React from 'react';

import { Props } from '@/pages/UserPreferences/GitConfig/GitConfigImport';

export class GitConfigImport extends React.PureComponent<Props> {
  render() {
    const { content, onChange } = this.props;

    return (
      <div>
        <input
          data-testid="submit-invalid-git-config"
          type="button"
          value={content}
          onClick={() => onChange('[user]\n\tname = User One\n', false)}
        />
        <input
          data-testid="submit-valid-git-config"
          type="button"
          onClick={() =>
            onChange('[user]\n\tname = User One\n\temail = user-1@chetest.com\n', true)
          }
        />
        <input
          data-testid="submit-invalid-email-git-config"
          type="button"
          onClick={() => onChange('[user]\n\tname = User One\n\temail = invalid-email\n', false)}
        />
        <input
          data-testid="submit-empty-name-git-config"
          type="button"
          onClick={() => onChange('[user]\n\tname = \n\temail = user@test.com\n', false)}
        />
        <input
          data-testid="submit-long-name-git-config"
          type="button"
          onClick={() => {
            const longName = 'a'.repeat(129);
            onChange(`[user]\n\tname = ${longName}\n\temail = user@test.com\n`, false);
          }}
        />
      </div>
    );
  }
}
