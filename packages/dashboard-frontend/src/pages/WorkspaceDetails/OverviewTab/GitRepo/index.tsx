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
import { CopyIcon } from '@patternfly/react-icons';
import { load } from 'js-yaml';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { CheTooltip } from '@/components/CheTooltip';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import devfileApi from '@/services/devfileApi';
import { Workspace } from '@/services/workspace-adapter';
import { DEVWORKSPACE_DEVFILE_SOURCE } from '@/services/workspace-client/devworkspace/devWorkspaceClient';

export type Props = {
  workspace: Workspace;
};

export type State = {
  timerId: number | undefined;
};

class GitRepoFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      timerId: undefined,
    };
  }

  private handleCopyToClipboard(): void {
    let { timerId } = this.state;
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }
    timerId = window.setTimeout(() => {
      this.setState({
        timerId: undefined,
      });
    }, 3000);
    this.setState({ timerId });
  }

  public getSource(workspace: devfileApi.DevWorkspace): {
    isUrl: boolean;
    gitRepo: string;
    fieldName: string;
  } {
    const source = {
      isUrl: false,
      gitRepo: '',
      fieldName: '',
    };

    const devfileSourceStr = workspace.metadata.annotations?.[DEVWORKSPACE_DEVFILE_SOURCE];
    if (devfileSourceStr === undefined) {
      return source;
    }

    const devfileSource = load(devfileSourceStr) as {
      scm?: { repo?: string; fileName?: string };
      factory?: { params?: string };
    };

    // Use URLSearchParams.get() to extract only the 'url' factory param.
    // The old approach (split('&') + split('=')[1]) had two bugs:
    //   1. It truncated URLs containing '=' in their query string (e.g. ?id=foo).
    //   2. It reconstructed gitRepo by appending ALL other factory params (che-editor,
    //      storageType, …), producing malformed URLs like "…download?id?che-editor=…".
    const rawFactoryParams = devfileSource?.factory?.params;
    if (rawFactoryParams) {
      const factoryParams = new URLSearchParams(rawFactoryParams);
      const url = factoryParams.get('url');
      if (url) {
        source.gitRepo = url;
        source.isUrl = /^https?:\/\//.test(url);
        source.fieldName = source.isUrl ? new URL(url).pathname.replace(/^\//, '') : url;
        if (source.fieldName.length > 50) {
          source.fieldName = source.fieldName.substring(0, 50) + '...';
        }
        return source;
      }
    }

    // Fall back to scm.repo (workspace created from a git URL directly)
    const repo = devfileSource?.scm?.repo;
    if (repo) {
      source.gitRepo = repo;
      source.isUrl = /^https?:\/\//.test(repo);
      source.fieldName = source.isUrl ? new URL(repo).pathname.replace(/^\//, '') : repo;
      if (source.fieldName.length > 50) {
        source.fieldName = source.fieldName.substring(0, 50) + '...';
      }
    }

    return source;
  }

  public render(): React.ReactNode {
    const { workspace } = this.props;
    const { timerId } = this.state;

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
        <CheTooltip content={timerId ? 'Copied!' : 'Copy to clipboard'}>
          <CopyToClipboard text={gitRepo} onCopy={() => this.handleCopyToClipboard()}>
            <Button
              variant="link"
              icon={<CopyIcon />}
              name="Copy to Clipboard"
              data-testid="copy-to-clipboard"
            />
          </CopyToClipboard>
        </CheTooltip>
      </FormGroup>
    );
  }
}

export default GitRepoFormGroup;
