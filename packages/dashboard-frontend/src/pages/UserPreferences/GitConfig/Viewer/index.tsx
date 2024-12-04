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

import { api } from '@eclipse-che/common';
import { PageSection } from '@patternfly/react-core';
import * as ini from 'multi-ini';
import React from 'react';

import { BasicViewer } from '@/components/BasicViewer';
import { GitConfig } from '@/store/GitConfig';

export type Props = {
  config: GitConfig;
};

export class GitConfigViewer extends React.PureComponent<Props> {
  /**
   * @throws
   * Serializes `gitConfig` object.
   */
  private fromGitConfig(gitConfig: api.IGitConfig['gitconfig']): string {
    const serializer = new ini.Serializer();
    const gitconfigStr = serializer.serialize(gitConfig);
    return gitconfigStr;
  }

  render() {
    const { config } = this.props;

    const gitConfigStr = this.fromGitConfig(config);

    return (
      <PageSection>
        <BasicViewer value={gitConfigStr} id="gitconfig-editor-id" />
      </PageSection>
    );
  }
}
