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

import { Button, ButtonVariant, Content, ContentVariants } from '@patternfly/react-core';
import { InfoIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import React from 'react';

import styles from '@/Layout/ErrorReporter/Issue/index.module.css';
import { BrandingData } from '@/services/bootstrap/branding.constant';
import { Issue, WorkspaceData } from '@/services/bootstrap/issuesReporter';
import { signIn } from '@/services/helpers/login';

type Props = {
  branding: BrandingData;
  issue: Issue;
};

export class IssueComponent extends React.PureComponent<Props> {
  public render(): React.ReactNode {
    const { issue } = this.props;

    switch (issue.type) {
      case 'sessionExpired':
        return this.renderSessionExpired(issue.error);
      case 'sso':
        return this.renderSsoError(issue.error);
      case 'workspaceInactive':
        return this.renderInactivityTimeoutError(issue.data);
      case 'workspaceRunTimeout':
        return this.renderRunTimeoutError(issue.data);
      case 'workspaceStoppedError':
        return this.renderWorkspaceStoppedWithError(issue.error, issue.data);
      case 'workspaceStopped':
        return this.renderWorkspaceStopped(issue.data);
      case 'namespaceProvisioningError':
        return this.renderNamespaceProvisionError(issue.error);
      default:
        return this.renderUnknownError(issue.error);
    }
  }

  private renderSessionExpired(error: Error): React.ReactNode {
    const errorTextbox = !error ? undefined : (
      <Content component={ContentVariants.pre} className={styles.errorMessage}>
        {error.message}
      </Content>
    );

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          Error
        </Content>
        {errorTextbox}
        <Content component="p">
          <Button onClick={() => signIn()} variant={ButtonVariant.link} isInline>
            Sign in
          </Button>
        </Content>
      </Content>
    );
  }

  private renderSsoError(error: Error): React.ReactNode {
    const messageTextbox = (
      <Content component="p">
        We are experiencing some technical difficulties from our SSO{error ? ':' : '.'}
      </Content>
    );
    const errorTextbox = !error ? undefined : (
      <Content component={ContentVariants.pre} className={styles.errorMessage}>
        {error.message}
      </Content>
    );

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          SSO Error
        </Content>
        {messageTextbox}
        {errorTextbox}
        <Content component="p">
          Please try <kbd className={styles.keybinding}>Shift</kbd>+
          <kbd className={styles.keybinding}>Refresh</kbd>
        </Content>
      </Content>
    );
  }

  private renderLinkWithHash(hash: string, text: string): React.ReactNode {
    return (
      <a
        onClick={() => {
          window.location.hash = hash;
          window.location.reload();
        }}
      >
        {text}
      </a>
    );
  }

  private renderInactivityTimeoutError(workspaceData: WorkspaceData | undefined): React.ReactNode {
    let ideLoader: React.ReactNode;
    let workspaceDetails: React.ReactNode;

    let reasonMessage: string;
    if (workspaceData?.timeout && workspaceData.timeout > -1) {
      reasonMessage = `Your workspace has stopped because there was no activity for ${this.renderTimeout(
        workspaceData.timeout,
      )}. `;
    } else {
      reasonMessage = 'Your workspace has stopped due to inactivity. ';
    }

    if (workspaceData) {
      ideLoader = this.renderLinkWithHash(workspaceData.ideLoaderPath, 'Restart your workspace');
      workspaceDetails = (
        <Content component="p">
          {this.renderLinkWithHash(workspaceData.workspaceDetailsPath, 'Return to dashboard')}
        </Content>
      );
    } else {
      ideLoader = 'Restart your workspace';
    }

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          Warning
        </Content>
        <Content component="p">
          {reasonMessage}
          {ideLoader} to continue using your workspace.
        </Content>
        {workspaceDetails}
      </Content>
    );
  }

  private renderRunTimeoutError(workspaceData: WorkspaceData | undefined): React.ReactNode {
    let ideLoader: React.ReactNode;
    let workspaceDetails: React.ReactNode;

    let reasonMessage: string;
    if (workspaceData?.timeout && workspaceData.timeout > -1) {
      reasonMessage = `Your workspace has stopped because it has reached the maximum run time of ${this.renderTimeout(
        workspaceData.timeout,
      )}. `;
    } else {
      reasonMessage = 'Your workspace has stopped because it has reached the maximum run time. ';
    }

    if (workspaceData) {
      ideLoader = this.renderLinkWithHash(workspaceData.ideLoaderPath, 'Restart your workspace');
      workspaceDetails = (
        <Content component="p">
          {this.renderLinkWithHash(workspaceData.workspaceDetailsPath, 'Return to dashboard')}
        </Content>
      );
    } else {
      ideLoader = 'Restart your workspace';
    }

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          Warning
        </Content>
        <Content component="p">
          {reasonMessage}
          {ideLoader} to continue using your workspace.
        </Content>
        {workspaceDetails}
      </Content>
    );
  }

  private renderWorkspaceStoppedWithError(error: Error, workspaceData: WorkspaceData | undefined) {
    let ideLoader: React.ReactNode;
    let workspaceDetails: React.ReactNode;

    if (workspaceData) {
      ideLoader = (
        <Content component="p">
          {this.renderLinkWithHash(workspaceData.ideLoaderPath, 'Restart your workspace')}
        </Content>
      );

      workspaceDetails = (
        <Content component="p">
          {this.renderLinkWithHash(workspaceData.workspaceDetailsPath, 'Return to dashboard')}
        </Content>
      );
    }

    const errorTextbox = !error ? undefined : (
      <Content component={ContentVariants.pre} className={styles.errorMessage}>
        {error.message}
      </Content>
    );

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          Workspace failed
        </Content>
        {errorTextbox}
        {ideLoader}
        {workspaceDetails}
      </Content>
    );
  }

  private renderWorkspaceStopped(workspaceData: WorkspaceData | undefined) {
    let ideLoader: React.ReactNode;
    let workspaceDetails: React.ReactNode;

    if (workspaceData) {
      ideLoader = this.renderLinkWithHash(workspaceData.ideLoaderPath, 'Start your workspace');
      workspaceDetails = (
        <Content component="p">
          {this.renderLinkWithHash(workspaceData.workspaceDetailsPath, 'Return to dashboard')}
        </Content>
      );
    } else {
      ideLoader = 'Start your workspace';
    }

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <InfoIcon className={styles.infoIcon} />
          Info
        </Content>
        <Content component="p">
          Your workspace is not running. {ideLoader} to continue using your workspace.
        </Content>
        {workspaceDetails}
      </Content>
    );
  }

  private renderNamespaceProvisionError(error: Error): React.ReactNode {
    const errorTextbox = !error ? undefined : (
      <Content component={ContentVariants.pre} className={styles.errorMessage}>
        {error.message}
      </Content>
    );

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          Error
        </Content>
        {errorTextbox}
      </Content>
    );
  }

  private renderUnknownError(error: Error): React.ReactNode {
    const errorTextbox = !error ? undefined : (
      <Content component={ContentVariants.pre} className={styles.errorMessage}>
        {error.message}
      </Content>
    );

    return (
      <Content className={styles.messageContainer}>
        <Content component="h1">
          <WarningTriangleIcon className={styles.warningIcon} />
          Error
        </Content>
        {errorTextbox}
        <Content component="p">
          Please try <kbd className={styles.keybinding}>Shift</kbd>+
          <kbd className={styles.keybinding}>Refresh</kbd>
        </Content>
      </Content>
    );
  }

  private renderTimeout(timeout: number) {
    const seconds = timeout % 60;
    const minutes = (timeout - seconds) / 60;
    if (minutes === 0) {
      return `${seconds} seconds`;
    }
    if (seconds === 0) {
      return `${minutes} minutes`;
    }
    return `${minutes} minutes and ${seconds} seconds`;
  }
}
