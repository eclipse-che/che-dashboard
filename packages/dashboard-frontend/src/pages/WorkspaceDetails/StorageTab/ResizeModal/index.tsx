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

import {
  helpers,
  QuotaCheckEntry,
  WorkspaceStorageInfo,
  WorkspaceStorageQuotaCheck,
} from '@eclipse-che/common';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Spinner,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, InfoCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import {
  formatQuantity,
  getCurrentBytes,
  getDefaultResizeGi,
  getMinResizeGi,
  toGi,
} from '@/pages/WorkspaceDetails/StorageTab/helpers';
import styles from '@/pages/WorkspaceDetails/StorageTab/ResizeModal/index.module.css';
import {
  checkWorkspaceStorageQuota,
  resizeWorkspaceStorage,
} from '@/services/backend-client/workspaceStorageApi';

export const QUOTA_CHECK_DEBOUNCE_MS = 300;

const UNAVAILABLE_QUOTA: WorkspaceStorageQuotaCheck = { status: 'unavailable', entries: [] };

export type Props = {
  namespace: string;
  workspaceName: string;
  info: WorkspaceStorageInfo;
  onClose: () => void;
  onResized: (info: WorkspaceStorageInfo) => void;
};

export type State = {
  sizeGi: number | '';
  isConfirmed: boolean;
  quota: WorkspaceStorageQuotaCheck | undefined;
  isCheckingQuota: boolean;
  isSubmitting: boolean;
  submitError: string | undefined;
};

export class ResizeModal extends React.PureComponent<Props, State> {
  private quotaTimer: ReturnType<typeof setTimeout> | undefined;
  private quotaRequestId = 0;
  private isUnmounted = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      sizeGi: getDefaultResizeGi(props.info),
      isConfirmed: false,
      quota: undefined,
      isCheckingQuota: true,
      isSubmitting: false,
      submitError: undefined,
    };
  }

  public componentDidMount(): void {
    this.scheduleQuotaCheck();
  }

  public componentWillUnmount(): void {
    this.isUnmounted = true;
    if (this.quotaTimer !== undefined) {
      clearTimeout(this.quotaTimer);
    }
  }

  private get minGi(): number {
    return getMinResizeGi(this.props.info);
  }

  private isSizeValid(sizeGi: number | ''): sizeGi is number {
    return sizeGi !== '' && sizeGi >= this.minGi;
  }

  private setSize(sizeGi: number | ''): void {
    this.setState({ sizeGi, submitError: undefined });
    this.scheduleQuotaCheck(sizeGi);
  }

  private scheduleQuotaCheck(sizeGi = this.state.sizeGi): void {
    if (this.quotaTimer !== undefined) {
      clearTimeout(this.quotaTimer);
    }
    // invalidate any response of a previous size
    const requestId = ++this.quotaRequestId;
    if (!this.isSizeValid(sizeGi)) {
      this.setState({ quota: undefined, isCheckingQuota: false });
      return;
    }
    this.setState({ isCheckingQuota: true });
    this.quotaTimer = setTimeout(() => this.checkQuota(sizeGi, requestId), QUOTA_CHECK_DEBOUNCE_MS);
  }

  private async checkQuota(sizeGi: number, requestId: number): Promise<void> {
    const { namespace, workspaceName } = this.props;
    let quota: WorkspaceStorageQuotaCheck;
    try {
      quota = await checkWorkspaceStorageQuota(namespace, workspaceName, `${sizeGi}Gi`);
    } catch {
      // the API server validates the request on submit anyway
      quota = UNAVAILABLE_QUOTA;
    }
    if (this.isUnmounted || requestId !== this.quotaRequestId) {
      return;
    }
    this.setState({ quota, isCheckingQuota: false });
  }

  private handleChange(event: React.FormEvent<HTMLInputElement>): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.setSize(Number.isNaN(value) ? '' : value);
  }

  private handleBlur(): void {
    const { sizeGi } = this.state;
    if (!this.isSizeValid(sizeGi)) {
      this.setSize(this.minGi);
    }
  }

  private handleMinus(): void {
    const { sizeGi } = this.state;
    this.setSize(Math.max(this.minGi, Number(sizeGi) - 1));
  }

  private handlePlus(): void {
    const { sizeGi } = this.state;
    this.setSize(Math.max(this.minGi, Number(sizeGi) + 1));
  }

  private async handleResize(): Promise<void> {
    const { namespace, workspaceName, onResized } = this.props;
    // [Resize] is disabled while the size is invalid
    const { sizeGi } = this.state;
    this.setState({ isSubmitting: true, submitError: undefined });
    try {
      const info = await resizeWorkspaceStorage(namespace, workspaceName, `${sizeGi}Gi`);
      onResized(info);
    } catch (e) {
      if (!this.isUnmounted) {
        this.setState({ isSubmitting: false, submitError: helpers.errors.getMessage(e) });
      }
    }
  }

  private renderQuotaEntry(entry: QuotaCheckEntry, index: number): React.ReactElement {
    const projected = toGi(entry.projected);
    const hard = toGi(entry.hard);
    const icon = entry.ok ? (
      <CheckCircleIcon className={styles.ok} aria-label="Within quota" />
    ) : (
      <ExclamationCircleIcon className={styles.exceeded} aria-label="Quota exceeded" />
    );

    let usage: string;
    if (entry.used !== undefined) {
      const used = toGi(entry.used);
      const delta = parseFloat((projected - used).toFixed(1));
      usage = `${used} + ${delta} = ${projected} Gi / ${hard} Gi`;
    } else {
      usage = `${projected} Gi / ${hard} Gi`;
    }

    // `ok` is computed on exact bytes, the values are rounded to 0.1 Gi
    const excessGi = parseFloat((projected - hard).toFixed(1));
    const excess = excessGi > 0 ? `${excessGi} Gi` : 'less than 0.1 Gi';
    const excessMessage =
      entry.source === 'LimitRange'
        ? `Exceeds the maximum volume size by ${excess}.`
        : `Exceeds namespace quota by ${excess}.`;

    return (
      <div key={`${entry.source}-${entry.name}-${entry.key}-${index}`} data-testid="quota-entry">
        <div className={styles.quotaEntry}>
          {icon}
          <span className={styles.quotaKey}>{entry.key}</span>
          <span>{usage}</span>
        </div>
        {!entry.ok && <div className={styles.quotaDetails}>{excessMessage}</div>}
      </div>
    );
  }

  private renderQuota(): React.ReactElement {
    const { quota, isCheckingQuota } = this.state;

    let content: React.ReactNode;
    if (isCheckingQuota) {
      content = <Spinner size="md" aria-label="Checking the quota" />;
    } else if (quota === undefined) {
      content = null;
    } else if (quota.status === 'unavailable') {
      content = (
        <div className={styles.quotaEntry} data-testid="quota-unavailable">
          <InfoCircleIcon className={styles.info} />
          <span>
            Namespace quota could not be read. The request will be validated by the cluster on
            submit.
          </span>
        </div>
      );
    } else if (quota.entries.length === 0) {
      content = (
        <div className={styles.quotaEntry} data-testid="quota-none">
          <CheckCircleIcon className={styles.ok} />
          <span>No storage quota applies to this namespace.</span>
        </div>
      );
    } else {
      content = (
        <>
          {quota.entries.map((entry, index) => this.renderQuotaEntry(entry, index))}
          {quota.status === 'exceeded' && quota.maxAllowedSize && (
            <div className={styles.quotaDetails} data-testid="quota-max-size">
              Maximum new size: {formatQuantity(quota.maxAllowedSize)}
            </div>
          )}
        </>
      );
    }

    return (
      <div className={styles.quota} aria-live="polite">
        <div className={styles.quotaTitle}>Quota check</div>
        {content}
      </div>
    );
  }

  public render(): React.ReactElement {
    const { info, onClose } = this.props;
    const { sizeGi, isConfirmed, quota, isCheckingQuota, isSubmitting, submitError } = this.state;
    const title = 'Resize storage';

    const isResizeEnabled =
      isConfirmed &&
      this.isSizeValid(sizeGi) &&
      sizeGi * helpers.quantity.GI > getCurrentBytes(info) &&
      !isCheckingQuota &&
      quota?.status !== 'exceeded' &&
      !isSubmitting;

    return (
      <Modal
        aria-label={title}
        variant={ModalVariant.small}
        isOpen={true}
        onClose={() => onClose()}
      >
        <ModalHeader title={title} />
        <ModalBody>
          {submitError && (
            <Alert
              variant={AlertVariant.danger}
              title="Failed to resize the storage"
              isInline
              className={styles.alert}
              data-testid="resize-error"
            >
              {submitError}
            </Alert>
          )}

          <DescriptionList isHorizontal isCompact className={styles.details}>
            <DescriptionListGroup>
              <DescriptionListTerm>PVC</DescriptionListTerm>
              <DescriptionListDescription>
                {info.pvcName}{' '}
                {info.shared && (
                  <Label isCompact color="blue">
                    Shared
                  </Label>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Current</DescriptionListTerm>
              <DescriptionListDescription>
                {formatQuantity(info.capacity ?? info.requested)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>New size</DescriptionListTerm>
              <DescriptionListDescription>
                <NumberInput
                  className={styles.sizeInput}
                  value={sizeGi}
                  min={this.minGi}
                  unit="Gi"
                  inputName="storage-size"
                  inputAriaLabel="New size"
                  minusBtnAriaLabel="Decrease size"
                  plusBtnAriaLabel="Increase size"
                  onMinus={() => this.handleMinus()}
                  onPlus={() => this.handlePlus()}
                  onChange={event => this.handleChange(event)}
                  onBlur={() => this.handleBlur()}
                  isDisabled={isSubmitting}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>

          <Alert
            variant={AlertVariant.warning}
            title="This action cannot be undone."
            isInline
            isPlain
            className={styles.alert}
            data-testid="irreversible-warning"
          >
            Kubernetes does not support shrinking volumes: once expanded, the size can never be
            reduced.
          </Alert>

          {info.shared && (
            <Alert
              variant={AlertVariant.info}
              title="Shared by all workspaces in this namespace."
              isInline
              isPlain
              className={styles.alert}
              data-testid="shared-notice"
            />
          )}

          {this.renderQuota()}

          <Checkbox
            id="storage-resize-confirm"
            label="I understand the storage cannot be reduced"
            isChecked={isConfirmed}
            onChange={(_event, checked) => this.setState({ isConfirmed: checked })}
            isDisabled={isSubmitting}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant={ButtonVariant.link} onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            variant={ButtonVariant.primary}
            isDisabled={!isResizeEnabled}
            isLoading={isSubmitting}
            onClick={() => this.handleResize()}
          >
            Resize
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
