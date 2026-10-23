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

import { Button } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';

import { AiToolSelectorModal } from '@/components/AiToolSelector/SelectorModal';
import styles from '@/components/AiToolSelector/SelectorModal.module.css';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';
import { SandboxCustomization } from '@/services/sandboxFactory';

export type Props = {
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  customization: SandboxCustomization;
  /** Drops the pencil: the selection is shown, but cannot be changed. */
  isDisabled?: boolean;
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
  customization,
  isDisabled = false,
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

  // A pencil that cannot be pressed is an invitation to press it. Where the
  // tools are fixed - a pod is running off them - the row is plain text.
  if (isDisabled) {
    return <span data-testid="ai-tool-selector">{displayName}</span>;
  }

  return (
    <span className={styles.editable} data-testid="ai-tool-selector">
      {displayName}
      <Button
        data-testid="ai-tool-edit-toggle"
        variant="plain"
        onClick={() => setIsOpen(true)}
        aria-label="Change AI Tools"
        title="Change AI Tools"
      >
        <PencilAltIcon />
      </Button>
      <AiToolSelectorModal
        isOpen={isOpen}
        aiTools={aiTools}
        aiProviders={aiProviders}
        originSelection={customization.aiProviderIds}
        originVersions={customization.aiVersions ?? {}}
        onConfirm={(aiProviderIds, aiVersions) => {
          setIsOpen(false);
          onChange({ aiProviderIds, aiVersions });
        }}
        onCancel={() => setIsOpen(false)}
      />
    </span>
  );
}
