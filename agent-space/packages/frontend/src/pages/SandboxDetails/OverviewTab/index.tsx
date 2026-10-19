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
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  FormGroupLabelHelp,
  PageSection,
} from '@patternfly/react-core';
import React from 'react';

import { AiToolSelector } from '@/components/AiToolSelector';
import { AiToolInfoModal } from '@/components/AiToolSelector/InfoModal';
import styles from '@/components/AiToolSelector/SelectorModal.module.css';
import { ErrorAlert } from '@/components/ErrorAlert';
import { formatTimestamp } from '@/services/format';
import {
  canEditAiTools,
  findBlockingCondition,
  formatResourceLimits,
  getAiToolsDisabledReason,
  getSandboxAiProviderIds,
  getSandboxAiVersions,
  getSandboxImages,
  getSandboxPhase,
  getSandboxRuntimeClass,
} from '@/services/sandbox';
import { SandboxCustomization } from '@/services/sandboxFactory';
import { Sandbox, SandboxError } from '@/services/types';
import { selectDashboardUrl } from '@/store/Bootstrap';
import { selectAiProviders, selectAiTools } from '@/store/Catalog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { sandboxDetailsActionCreators } from '@/store/SandboxDetails';

export type Props = {
  sandbox: Sandbox;
};

/**
 * What the sandbox is: its spec in human terms, and the conditions the
 * controller publishes about it.
 */
export function OverviewTab({ sandbox }: Props): React.ReactElement {
  const dispatch = useAppDispatch();

  const aiTools = useAppSelector(selectAiTools);
  const aiProviders = useAppSelector(selectAiProviders);
  const dashboardUrl = useAppSelector(selectDashboardUrl);

  const [isInfoOpen, setIsInfoOpen] = React.useState(false);

  const blocking = findBlockingCondition(sandbox);
  const phase = getSandboxPhase(sandbox);

  // Read off the sandbox rather than held in state, so the selector reopens on
  // what the object carries after a patch, not on what was last sent.
  const customization = React.useMemo<SandboxCustomization>(
    () => ({
      aiProviderIds: getSandboxAiProviderIds(sandbox),
      aiVersions: getSandboxAiVersions(sandbox),
    }),
    [sandbox],
  );

  const handleChange = React.useCallback(
    (next: SandboxCustomization) => {
      void dispatch(sandboxDetailsActionCreators.updateSandboxAiTools(next));
    },
    [dispatch],
  );

  return (
    <PageSection data-testid="overview-tab">
      {blocking && (
        <ErrorAlert
          title="This sandbox cannot start"
          error={
            {
              // No status code: this is what the controller said about the
              // sandbox, not the outcome of a request the browser made.
              message: blocking.message ?? 'The controller reported a blocking condition.',
              reason: blocking.reason,
            } satisfies SandboxError
          }
        />
      )}

      <DescriptionList isHorizontal columnModifier={{ default: '2Col' }}>
        <DescriptionListGroup>
          <DescriptionListTerm>Namespace</DescriptionListTerm>
          <DescriptionListDescription>
            {sandbox.metadata.namespace ?? '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Created</DescriptionListTerm>
          <DescriptionListDescription>
            {formatTimestamp(sandbox.metadata.creationTimestamp)}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Operating mode</DescriptionListTerm>
          <DescriptionListDescription>
            {sandbox.spec?.operatingMode ?? 'Running'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Runtime class</DescriptionListTerm>
          <DescriptionListDescription>
            {getSandboxRuntimeClass(sandbox) ?? 'Cluster default'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Resource limits</DescriptionListTerm>
          <DescriptionListDescription>{formatResourceLimits(sandbox)}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Images</DescriptionListTerm>
          <DescriptionListDescription>
            {getSandboxImages(sandbox).join(', ') || '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Service</DescriptionListTerm>
          <DescriptionListDescription>
            {sandbox.status?.serviceFQDN ?? sandbox.status?.service ?? '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Node</DescriptionListTerm>
          <DescriptionListDescription>{sandbox.status?.nodeName ?? '-'}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>
            {/* Worded and labelled as the workspace overview words it, down to
                the help button beside it: the two pages describe one feature. */}
            AI Tool&nbsp;&nbsp;
            <FormGroupLabelHelp
              className={styles.labelHelp}
              aria-label="More info for AI tool"
              data-testid="ai-tool-info-toggle"
              onClick={() => setIsInfoOpen(true)}
            />
          </DescriptionListTerm>
          <DescriptionListDescription>
            <AiToolSelector
              aiTools={aiTools}
              aiProviders={aiProviders}
              dashboardUrl={dashboardUrl}
              customization={customization}
              isDisabled={!canEditAiTools(phase)}
              disabledReason={getAiToolsDisabledReason(phase)}
              onChange={handleChange}
            />
            <AiToolInfoModal
              isOpen={isInfoOpen}
              aiTools={aiTools}
              aiProviders={aiProviders}
              onClose={() => setIsInfoOpen(false)}
            />
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </PageSection>
  );
}
