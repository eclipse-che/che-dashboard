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

import { Gallery } from '@patternfly/react-core';
import React from 'react';

import { AiProviderEntry } from '@/components/AiProviderSelector/Entry';
import { AiProviderDefinition, AiToolDefinition, groupToolsByProvider } from '@/services/catalog';
import { AiToolVersions } from '@/services/sandboxFactory';

export type Props = {
  aiTools: AiToolDefinition[];
  aiProviders: AiProviderDefinition[];
  selectedProviderIds: string[];
  versions: AiToolVersions;
  isDisabled?: boolean;
  onToggle: (providerId: string) => void;
  onVersionChange: (providerId: string, tag: string) => void;
};

/** One card per provider, every tag of a provider kept in the same card. */
export function AiProviderGallery({
  aiTools,
  aiProviders,
  selectedProviderIds,
  versions,
  isDisabled = false,
  onToggle,
  onVersionChange,
}: Props): React.ReactElement {
  const groups = React.useMemo(() => groupToolsByProvider(aiTools), [aiTools]);

  return (
    <Gallery hasGutter minWidths={{ default: '210px' }} maxWidths={{ default: '280px' }}>
      {groups.map(toolGroup => {
        const providerId = toolGroup[0].providerId;
        const provider = aiProviders.find(item => item.id === providerId);

        return (
          <AiProviderEntry
            key={providerId}
            toolGroup={toolGroup}
            icon={provider?.icon}
            description={provider?.description}
            tags={provider?.tags}
            activeTag={versions[providerId]}
            isSelected={selectedProviderIds.includes(providerId)}
            isDisabled={isDisabled}
            onToggle={onToggle}
            onVersionChange={onVersionChange}
          />
        );
      })}
    </Gallery>
  );
}
