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

import { ApplicationId } from '@eclipse-che/common';
import { Button, FormGroup } from '@patternfly/react-core';
import { CopyIcon, ExternalLinkSquareAltIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { connect, ConnectedProps } from 'react-redux';

import { CheTooltip } from '@/components/CheTooltip';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import { Workspace, WorkspaceAdapter } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { bannerAlertActionCreators } from '@/store/BannerAlert';
import { selectApplications } from '@/store/ClusterInfo/selectors';

type Props = MappedProps & {
  workspace: Workspace;
};

type State = {
  timerId: number | undefined;
};

class WorkspaceNameFormGroup extends React.PureComponent<Props, State> {
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

  private buildOpenShiftConsoleLink(): React.ReactElement | undefined {
    const { applications, workspace } = this.props;
    const clusterConsole = applications.find(app => app.id === ApplicationId.CLUSTER_CONSOLE);

    if (!clusterConsole) {
      return;
    }

    const devWorkspaceOpenShiftConsoleUrl = WorkspaceAdapter.buildClusterConsoleUrl(
      workspace.ref,
      clusterConsole.url,
    );

    return (
      <Button
        component="a"
        variant="link"
        href={devWorkspaceOpenShiftConsoleUrl}
        target="_blank"
        icon={<ExternalLinkSquareAltIcon />}
        iconPosition="right"
        isInline
      >
        {workspace.name}
      </Button>
    );
  }

  public render(): React.ReactNode {
    const { workspace } = this.props;
    const { timerId } = this.state;
    const workspaceName = this.buildOpenShiftConsoleLink() || workspace.name;
    const metadataName = workspace.ref.metadata.name;
    if (workspace.name !== metadataName) {
      return (
        <>
          <FormGroup label="Workspace">{workspaceName}</FormGroup>
          <FormGroup label="Metadata Name">
            {metadataName}
            <CheTooltip content={timerId ? 'Copied!' : 'Copy to clipboard'}>
              <CopyToClipboard text={metadataName} onCopy={() => this.handleCopyToClipboard()}>
                <Button
                  variant="link"
                  icon={<CopyIcon />}
                  name="Copy to Clipboard"
                  data-testid="copy-to-clipboard"
                />
              </CopyToClipboard>
            </CheTooltip>
          </FormGroup>
        </>
      );
    }
    return (
      <FormGroup label="Workspace">
        <span className={overviewStyles.readonly}>{workspaceName}</span>
        <CheTooltip content={timerId ? 'Copied!' : 'Copy to clipboard'}>
          <CopyToClipboard text={metadataName} onCopy={() => this.handleCopyToClipboard()}>
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

const mapStateToProps = (state: RootState) => ({
  applications: selectApplications(state),
});

const connector = connect(mapStateToProps, bannerAlertActionCreators);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(WorkspaceNameFormGroup);
