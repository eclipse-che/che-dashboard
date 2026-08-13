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

import { api } from '@eclipse-che/common';
import { Gallery } from '@patternfly/react-core';
import React from 'react';

import { AiProviderEntry } from '@/components/AiSelector/Gallery/Entry';
import { groupToolsByProvider } from '@/services/helpers/aiTools';

export type Props = {
  providers: api.AiToolDefinition[];
  aiProviders: api.AiProviderDefinition[];
  selectedProviderIds: string[];
  providerKeyExists: Record<string, boolean>;
  onToggle: (providerId: string) => void;
  onVersionChange?: (providerId: string, tag: string) => void;
};

export class AiProviderGallery extends React.PureComponent<Props> {
  private getProviderDef(providerId: string): api.AiProviderDefinition | undefined {
    return this.props.aiProviders.find(p => p.id === providerId);
  }

  private groupByProviderId(): ReturnType<typeof groupToolsByProvider> {
    return groupToolsByProvider(this.props.providers);
  }

  public render(): React.ReactElement {
    const { selectedProviderIds, providerKeyExists, onToggle, onVersionChange } = this.props;

    const groups = this.groupByProviderId();

    return (
      <Gallery hasGutter={true} minWidths={{ default: '210px' }} maxWidths={{ default: '280px' }}>
        {groups.map(toolGroup => {
          const providerId = toolGroup[0].providerId;
          const providerDef = this.getProviderDef(providerId);
          return (
            <AiProviderEntry
              key={providerId}
              toolGroup={toolGroup}
              icon={providerDef?.icon}
              description={providerDef?.description}
              tags={providerDef?.tags}
              isSelected={selectedProviderIds.includes(providerId)}
              hasExistingKey={!!providerKeyExists[providerId]}
              onToggle={onToggle}
              onVersionChange={onVersionChange}
            />
          );
        })}
      </Gallery>
    );
  }
}
