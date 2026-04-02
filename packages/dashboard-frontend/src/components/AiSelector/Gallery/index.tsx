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

export type Props = {
  providers: api.AiToolDefinition[];
  aiProviders: api.AiProviderDefinition[];
  selectedProviderIds: string[];
  providerKeyExists: Record<string, boolean>;
  onToggle: (providerId: string) => void;
};

export class AiProviderGallery extends React.PureComponent<Props> {
  private getProvider(tool: api.AiToolDefinition): api.AiProviderDefinition | undefined {
    return this.props.aiProviders.find(p => p.id === tool.providerId);
  }

  public render(): React.ReactElement {
    const { providers, selectedProviderIds, providerKeyExists, onToggle } = this.props;

    const sorted = [...providers].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <Gallery hasGutter={true} minWidths={{ default: '210px' }} maxWidths={{ default: '280px' }}>
        {sorted.map(provider => (
          <AiProviderEntry
            key={provider.providerId}
            provider={provider}
            icon={this.getProvider(provider)?.icon}
            description={this.getProvider(provider)?.description}
            isSelected={selectedProviderIds.includes(provider.providerId)}
            hasExistingKey={!!providerKeyExists[provider.providerId]}
            onToggle={onToggle}
          />
        ))}
      </Gallery>
    );
  }
}
