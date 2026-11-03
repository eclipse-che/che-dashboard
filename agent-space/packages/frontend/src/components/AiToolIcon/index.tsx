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

import { Tooltip } from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/AiToolIcon/index.module.css';
import { AiProviderDefinition, AiToolDefinition } from '@/services/catalog';

export type Props = {
  /** Providers recorded on the sandbox, in the order they were selected. */
  providerIds: string[];
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
};

/**
 * The AI providers of one row, ported from `components/AiToolIcon` of the
 * dashboard so the sandbox list reads like the workspace list.
 *
 * The dashboard derives the providers from the workspace components; a sandbox
 * has none, so the ids come from its annotation and are passed in. A provider
 * the cluster no longer publishes is still named, just without its icon - the
 * sandbox did run it, and hiding that would be the bigger surprise.
 */
export function AiToolIcon({ providerIds, aiTools, aiProviders }: Props): React.ReactElement {
  if (providerIds.length === 0) {
    return <span>-</span>;
  }

  const entries = providerIds.map(providerId => ({
    providerId,
    name: aiTools.find(tool => tool.providerId === providerId)?.name ?? providerId,
    icon: aiProviders.find(provider => provider.id === providerId)?.icon,
  }));

  // One provider gets its name spelled out, as in the dashboard; several
  // would not fit the column, so there the tooltip carries the names.
  const isSingle = entries.length === 1;

  return (
    <Tooltip content={entries.map(entry => entry.name).join(', ')}>
      <span className={styles.container} data-testid="ai-tool-icon">
        {entries.map((entry, index) => (
          <React.Fragment key={entry.providerId}>
            {index > 0 && <span>, </span>}
            {entry.icon !== undefined && (
              <img
                src={entry.icon}
                alt={entry.name}
                className={styles.icon}
                style={isSingle ? undefined : { marginRight: '0' }}
                onError={event => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            )}
            {(isSingle || entry.icon === undefined) && (
              <span className={styles.name}>{entry.name}</span>
            )}
          </React.Fragment>
        ))}
      </span>
    </Tooltip>
  );
}
