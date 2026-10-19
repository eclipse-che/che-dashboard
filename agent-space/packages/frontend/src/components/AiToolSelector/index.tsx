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

import { Button, HelperText, HelperTextItem } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';

import { buildManageKeysUrl } from '@/components/AiToolSelector/manageKeys';
import { AiToolSelectorModal } from '@/components/AiToolSelector/SelectorModal';
import styles from '@/components/AiToolSelector/SelectorModal.module.css';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';
import { SandboxCustomization } from '@/services/sandboxFactory';

export type Props = {
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  dashboardUrl: string;
  customization: SandboxCustomization;
  isDisabled?: boolean;
  /** Shown beside the pencil while it is disabled, so the reason is not a guess. */
  disabledReason?: string;
  onChange: (customization: SandboxCustomization) => void;
};

/**
 * The agents a sandbox runs, shown the way a workspace shows them: the current
 * selection as text, with a pencil that opens 'Change AI Tools'.
 *
 * The create wizard, the sample gallery and the details page all use this, so
 * changing the agents of a sandbox that already exists looks exactly like
 * choosing them before it does.
 *
 * Renders nothing when the cluster publishes no AI tools - an empty control
 * only raises the question of what is missing.
 */
export function AiToolSelector({
  aiTools,
  aiProviders,
  dashboardUrl,
  customization,
  isDisabled = false,
  disabledReason,
  onChange,
}: Props): React.ReactElement | null {
  const [isOpen, setIsOpen] = React.useState(false);

  const displayName = React.useMemo(() => {
    if (customization.aiProviderIds.length === 0) {
      return 'None';
    }
    return customization.aiProviderIds
      .map(id => aiProviders.find(provider => provider.id === id)?.name ?? id)
      .join(', ');
  }, [aiProviders, customization.aiProviderIds]);

  if (aiTools.length === 0) {
    return null;
  }

  const hint = isDisabled ? disabledReason : undefined;

  return (
    <span className={styles.editable} data-testid="ai-tool-selector">
      {displayName}
      <Button
        data-testid="ai-tool-edit-toggle"
        variant="plain"
        isDisabled={isDisabled}
        onClick={() => setIsOpen(true)}
        aria-label="Change AI Tools"
        title={hint ?? 'Change AI Tools'}
      >
        <PencilAltIcon />
      </Button>
      {hint !== undefined && (
        <HelperText>
          <HelperTextItem data-testid="ai-tool-disabled-reason">{hint}</HelperTextItem>
        </HelperText>
      )}
      <AiToolSelectorModal
        isOpen={isOpen}
        aiTools={aiTools}
        aiProviders={aiProviders}
        originSelection={customization.aiProviderIds}
        originVersions={customization.aiVersions ?? {}}
        manageKeysUrl={buildManageKeysUrl(dashboardUrl)}
        onConfirm={(aiProviderIds, aiVersions) => {
          setIsOpen(false);
          onChange({ aiProviderIds, aiVersions });
        }}
        onCancel={() => setIsOpen(false)}
      />
    </span>
  );
}
