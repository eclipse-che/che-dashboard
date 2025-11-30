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

import { Button, FormGroup } from '@patternfly/react-core';
import React from 'react';

import { CheCopyToClipboard } from '@/components/CheCopyToClipboard';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import devfileApi from '@/services/devfileApi';
import { FactoryLocationAdapter } from '@/services/factory-location-adapter';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';

export type Props = {
  workspace: Workspace;
};

class GitRepoFormGroup extends React.PureComponent<Props> {
  public getSource(devWorkspace: devfileApi.DevWorkspace): {
    isUrl: boolean;
    gitRepo: string;
    fieldName: string;
  } {
    const source = {
      isUrl: false,
      gitRepo: '',
      fieldName: '',
    };

    const workspace = constructWorkspace(devWorkspace);

    source.gitRepo = workspace.source || '';
    source.isUrl = FactoryLocationAdapter.isHttpLocation(source.gitRepo);
    source.fieldName = source.isUrl
      ? new URL(source.gitRepo).pathname.replace(/^\//, '')
      : source.gitRepo;
    if (source.fieldName.length > 50) {
      source.fieldName = source.fieldName.substring(0, 50) + '...';
    }

    return source;
  }

  public render(): React.ReactNode {
    const { workspace } = this.props;

    const { gitRepo, fieldName, isUrl } = this.getSource(workspace.ref);
    if (!gitRepo || !fieldName) {
      return <></>;
    }

    return (
      <FormGroup label="Git repo URL">
        {isUrl ? (
          <Button component="a" variant="link" href={gitRepo} target="_blank" isInline>
            {fieldName}
          </Button>
        ) : (
          <span className={overviewStyles.readonly}>{fieldName}</span>
        )}
        <CheCopyToClipboard text={gitRepo} />
      </FormGroup>
    );
  }
}

export default GitRepoFormGroup;
