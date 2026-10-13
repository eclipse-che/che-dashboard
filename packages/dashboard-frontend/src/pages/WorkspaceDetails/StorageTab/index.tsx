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

import { helpers, WorkspaceStorageInfo, WorkspaceStorageUsage } from '@eclipse-che/common';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  PageSection,
  PageSectionVariants,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import React from 'react';

import { lazyInject } from '@/inversify.config';
import {
  formatQuantity,
  isResizePending,
  RESIZE_STEP_GI,
} from '@/pages/WorkspaceDetails/StorageTab/helpers';
import styles from '@/pages/WorkspaceDetails/StorageTab/index.module.css';
import { ResizeModal } from '@/pages/WorkspaceDetails/StorageTab/ResizeModal';
import { UsageDonut, UsageState } from '@/pages/WorkspaceDetails/StorageTab/UsageDonut';
import { AppAlerts } from '@/services/alerts/appAlerts';
import {
  getWorkspaceStorage,
  getWorkspaceStorageUsage,
} from '@/services/backend-client/workspaceStorageApi';
import getRandomString from '@/services/helpers/random';
import { Workspace } from '@/services/workspace-adapter';

export const POLLING_INTERVAL_MS = 5000;

export type Props = {
  workspace: Workspace;
  isActive: boolean;
};

export type State = {
  info: WorkspaceStorageInfo | undefined;
  infoError: string | undefined;
  isLoadingInfo: boolean;
  usage: WorkspaceStorageUsage | undefined;
  usageState: UsageState;
  isModalOpen: boolean;
};

export class StorageTab extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  private pollTimer: ReturnType<typeof setTimeout> | undefined;
  private isUnmounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      info: undefined,
      infoError: undefined,
      isLoadingInfo: false,
      usage: undefined,
      usageState: 'loading',
      isModalOpen: false,
    };
  }

  public componentDidMount(): void {
    if (this.props.isActive) {
      this.load();
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    const { workspace, isActive } = this.props;
    if (!isActive) {
      if (prevProps.isActive) {
        this.stopPolling();
      }
      return;
    }
    if (
      !prevProps.isActive ||
      prevProps.workspace.uid !== workspace.uid ||
      prevProps.workspace.isRunning !== workspace.isRunning
    ) {
      this.load();
    }
  }

  public componentWillUnmount(): void {
    this.isUnmounted = true;
    this.stopPolling();
  }

  private load(): void {
    void this.fetchInfo();
    void this.fetchUsage();
  }

  private async fetchInfo(): Promise<void> {
    const { namespace, resourceName } = this.props.workspace;
    this.setState({ isLoadingInfo: true });
    try {
      const info = await getWorkspaceStorage(namespace, resourceName);
      this.setInfo(info);
    } catch (e) {
      if (!this.isUnmounted) {
        this.setState({ infoError: helpers.errors.getMessage(e), isLoadingInfo: false });
      }
    }
  }

  private setInfo(info: WorkspaceStorageInfo): void {
    if (this.isUnmounted) {
      return;
    }
    const wasPending = this.state.info !== undefined && isResizePending(this.state.info);
    this.setState({ info, infoError: undefined, isLoadingInfo: false });
    if (wasPending && !isResizePending(info)) {
      this.appAlerts.showAlert({
        key: 'storage-tab-resized-' + getRandomString(4),
        title: 'Storage resized',
        variant: AlertVariant.success,
        children: `The volume of ${this.props.workspace.name} is now ${formatQuantity(info.capacity ?? info.requested)}.`,
      });
    }
    if (isResizePending(info) && this.props.isActive) {
      this.schedulePoll();
    } else {
      this.stopPolling();
    }
  }

  private async fetchUsage(): Promise<void> {
    const { workspace } = this.props;
    if (!workspace.isRunning) {
      this.setState({ usage: undefined, usageState: 'stopped' });
      return;
    }
    this.setState({ usageState: 'loading' });
    try {
      const usage = await getWorkspaceStorageUsage(workspace.namespace, workspace.resourceName);
      if (!this.isUnmounted) {
        this.setState({ usage, usageState: 'loaded' });
      }
    } catch {
      // the usage is optional, the tab remains usable without it
      if (!this.isUnmounted) {
        this.setState({ usage: undefined, usageState: 'unavailable' });
      }
    }
  }

  private schedulePoll(): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = undefined;
      this.load();
    }, POLLING_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer !== undefined) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private handleResized(info: WorkspaceStorageInfo): void {
    this.setState({ isModalOpen: false });
    this.setInfo(info);
    this.load();
  }

  private renderResizeButton(info: WorkspaceStorageInfo): React.ReactElement {
    const isForbidden = info.expandability === 'forbidden';
    const button = (
      <Button
        variant={ButtonVariant.secondary}
        isAriaDisabled={isForbidden}
        onClick={() => this.setState({ isModalOpen: true })}
      >
        +{RESIZE_STEP_GI} Gi
      </Button>
    );
    return (
      <span className={styles.resizeButton}>
        {isForbidden ? (
          <Tooltip content="Storage class does not allow expansion">{button}</Tooltip>
        ) : (
          button
        )}
      </span>
    );
  }

  private renderCapacity(info: WorkspaceStorageInfo): React.ReactElement {
    const isPending = isResizePending(info);
    return (
      <>
        <div className={styles.capacity}>
          <span className={styles.capacityValue} data-testid="storage-capacity">
            {formatQuantity(info.capacity ?? info.requested)}
            {isPending && info.requested && <> → {formatQuantity(info.requested)}</>}
            {info.resizing && (
              <>
                <Spinner size="sm" aria-label="Resizing" /> Resizing
              </>
            )}
          </span>
          {this.renderResizeButton(info)}
        </div>
        {info.fsResizePending && (
          <div className={styles.restartMessage} data-testid="storage-restart-message">
            Restart the workspace to apply the new size.
          </div>
        )}
      </>
    );
  }

  private renderContent(): React.ReactNode {
    const { workspace } = this.props;
    const { info, infoError, isLoadingInfo, usage, usageState, isModalOpen } = this.state;

    if (infoError && !info) {
      return (
        <Alert
          variant={AlertVariant.danger}
          title="Failed to load storage information"
          isInline
          className={styles.alert}
        >
          {infoError}
        </Alert>
      );
    }

    if (!info) {
      return (
        isLoadingInfo && (
          <div className={styles.loading}>
            <Spinner size="lg" aria-label="Loading storage information" />
          </div>
        )
      );
    }

    if (info.strategy === 'ephemeral') {
      return (
        <Alert
          variant={AlertVariant.info}
          title="This workspace uses ephemeral storage."
          isInline
          data-testid="storage-ephemeral"
        >
          Data is lost when the workspace stops. There is no volume to manage.
        </Alert>
      );
    }

    return (
      <>
        {infoError && (
          <Alert
            variant={AlertVariant.warning}
            title="Failed to refresh storage information"
            isInline
            className={styles.alert}
          >
            {infoError}
          </Alert>
        )}
        <div className={styles.donut}>
          <UsageDonut state={usageState} usage={usage} />
        </div>
        <DescriptionList className={styles.details}>
          <DescriptionListGroup>
            <DescriptionListTerm>Name</DescriptionListTerm>
            <DescriptionListDescription data-testid="storage-pvc-name">
              {info.pvcName ?? '—'}{' '}
              {info.shared && (
                <Label isCompact color="blue">
                  Shared
                </Label>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Capacity</DescriptionListTerm>
            <DescriptionListDescription>{this.renderCapacity(info)}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
        {isModalOpen && (
          <ResizeModal
            namespace={workspace.namespace}
            workspaceName={workspace.resourceName}
            info={info}
            onClose={() => this.setState({ isModalOpen: false })}
            onResized={newInfo => this.handleResized(newInfo)}
          />
        )}
      </>
    );
  }

  public render(): React.ReactElement {
    return (
      <PageSection variant={PageSectionVariants.default}>
        <Title headingLevel="h3" className={styles.title}>
          Storage
        </Title>
        <div aria-live="polite">{this.renderContent()}</div>
      </PageSection>
    );
  }
}

export default StorageTab;
