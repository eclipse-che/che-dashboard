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
import { formatQuantity, isResizePending } from '@/pages/WorkspaceDetails/StorageTab/helpers';
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

const INITIAL_STATE: State = {
  info: undefined,
  infoError: undefined,
  isLoadingInfo: false,
  usage: undefined,
  usageState: 'loading',
  isModalOpen: false,
};

export class StorageTab extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  private pollTimer: ReturnType<typeof setTimeout> | undefined;
  private isUnmounted = false;

  constructor(props: Props) {
    super(props);
    this.state = INITIAL_STATE;
  }

  public componentDidMount(): void {
    if (this.props.isActive) {
      void this.load();
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
    if (prevProps.workspace.uid !== workspace.uid) {
      // never show, nor resize, the volume of the previous workspace
      this.stopPolling();
      this.setState(INITIAL_STATE);
      void this.load();
    } else if (!prevProps.isActive || prevProps.workspace.isRunning !== workspace.isRunning) {
      void this.load();
    }
  }

  public componentWillUnmount(): void {
    this.isUnmounted = true;
    this.stopPolling();
  }

  /**
   * `false` once unmounted or switched to another workspace: the response is stale.
   */
  private isCurrent(uid: string): boolean {
    return !this.isUnmounted && uid === this.props.workspace.uid;
  }

  private async load(): Promise<void> {
    const info = await this.fetchInfo();
    // an ephemeral volume has no usage of its own, `df` would report the node filesystem
    if (info?.strategy !== 'ephemeral') {
      await this.fetchUsage();
    }
  }

  private async fetchInfo(): Promise<WorkspaceStorageInfo | undefined> {
    const { namespace, resourceName, uid } = this.props.workspace;
    this.setState({ isLoadingInfo: true });
    try {
      const info = await getWorkspaceStorage(namespace, resourceName);
      if (this.isCurrent(uid)) {
        this.setInfo(info);
      }
      return info;
    } catch (e) {
      if (this.isCurrent(uid)) {
        this.setState({ infoError: helpers.errors.getMessage(e), isLoadingInfo: false });
      }
      return undefined;
    }
  }

  private setInfo(info: WorkspaceStorageInfo): void {
    if (this.isUnmounted) {
      return;
    }
    const wasPending = this.state.info !== undefined && isResizePending(this.state.info);
    this.setState({ info, infoError: undefined, isLoadingInfo: false });
    if (wasPending && !isResizePending(info)) {
      this.showResizedAlert(info);
    }
    if (isResizePending(info) && this.props.isActive) {
      this.schedulePoll();
    } else {
      this.stopPolling();
    }
  }

  private showResizedAlert(info: WorkspaceStorageInfo): void {
    this.appAlerts.showAlert({
      key: 'storage-tab-resized-' + getRandomString(4),
      title: 'Storage resized',
      variant: AlertVariant.success,
      children: `The volume of ${this.props.workspace.name} is now ${formatQuantity(info.capacity ?? info.requested)}.`,
    });
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
      if (this.isCurrent(workspace.uid)) {
        this.setState({ usage, usageState: 'loaded' });
      }
    } catch {
      // the usage is optional, the tab remains usable without it
      if (this.isCurrent(workspace.uid)) {
        this.setState({ usage: undefined, usageState: 'unavailable' });
      }
    }
  }

  private schedulePoll(): void {
    this.stopPolling();
    this.pollTimer = setTimeout(() => {
      this.pollTimer = undefined;
      void this.load();
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
    // the expansion may be complete before the PATCH returns
    if (!isResizePending(info)) {
      this.showResizedAlert(info);
    }
    void this.fetchUsage();
  }

  private renderResizeButton(info: WorkspaceStorageInfo): React.ReactElement {
    const isForbidden = info.expandability === 'forbidden';
    const button = (
      <Button
        variant={ButtonVariant.secondary}
        isAriaDisabled={isForbidden}
        onClick={() => this.setState({ isModalOpen: true })}
      >
        Resize…
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
          <span className={styles.capacityValue} data-testid="storage-capacity" aria-live="polite">
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
            isLiveRegion
            className={styles.alert}
          >
            {infoError}
          </Alert>
        )}
        <div className={styles.donut}>
          <UsageDonut status={usageState} usage={usage} />
          {info.shared && (
            <div className={styles.donutCaption} data-testid="storage-usage-shared">
              Shared volume: the usage includes all workspaces in this namespace.
            </div>
          )}
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
        {this.renderContent()}
      </PageSection>
    );
  }
}

export default StorageTab;
