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
import {
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import { CheTooltip } from '@/components/CheTooltip';

export type Props = {
  providers: api.AiToolDefinition[];
  /** Pre-selected provider (update mode). When set the provider selector is hidden. */
  fixedProvider?: api.AiToolDefinition;
  onChange: (providerId: string, apiKey: string, isValid: boolean) => void;
};

export type State = {
  selectedProviderId: string;
  apiKey: string;
  isProviderSelectOpen: boolean;
};

export class AiProviderKeysAddEditForm extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedProviderId: props.fixedProvider?.providerId ?? (props.providers[0]?.providerId || ''),
      apiKey: '',
      isProviderSelectOpen: false,
    };
  }

  private get isValid(): boolean {
    return this.state.selectedProviderId.length > 0 && this.state.apiKey.trim().length > 0;
  }

  private handleProviderSelect(
    _event: React.MouseEvent | undefined,
    providerId: string | number,
  ): void {
    this.setState({ selectedProviderId: String(providerId), isProviderSelectOpen: false }, () => {
      this.props.onChange(this.state.selectedProviderId, this.state.apiKey, this.isValid);
    });
  }

  private handleApiKeyChange(value: string): void {
    this.setState({ apiKey: value }, () => {
      this.props.onChange(this.state.selectedProviderId, this.state.apiKey, this.isValid);
    });
  }

  public render(): React.ReactElement {
    const { providers, fixedProvider } = this.props;
    const { selectedProviderId, apiKey, isProviderSelectOpen } = this.state;

    const selectedProvider =
      fixedProvider ?? providers.find(p => p.providerId === selectedProviderId) ?? providers[0];

    const apiKeyValidated =
      apiKey.length === 0 ? ValidatedOptions.default : ValidatedOptions.success;

    return (
      <React.Fragment>
        {!fixedProvider && (
          <FormGroup label="AI Provider" isRequired fieldId="ai-provider-select">
            <Select
              id="ai-provider-select"
              isOpen={isProviderSelectOpen}
              selected={selectedProviderId}
              onSelect={(e, value) => this.handleProviderSelect(e, value)}
              onOpenChange={isOpen => this.setState({ isProviderSelectOpen: isOpen })}
              toggle={(ref: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={ref}
                  onClick={() =>
                    this.setState(prev => ({ isProviderSelectOpen: !prev.isProviderSelectOpen }))
                  }
                  isExpanded={isProviderSelectOpen}
                >
                  {selectedProvider?.name ?? 'Select a provider'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {providers.map(p => (
                  <SelectOption key={p.providerId} value={p.providerId}>
                    {p.name}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        )}

        <FormGroup
          label={
            <span>
              API Key{' '}
              {selectedProvider?.url && (
                <CheTooltip
                  content={
                    <>
                      Get your key at{' '}
                      <a href={selectedProvider.url} target="_blank" rel="noreferrer">
                        {selectedProvider.url}
                      </a>
                    </>
                  }
                >
                  <OutlinedQuestionCircleIcon
                    style={{ cursor: 'pointer', marginLeft: '4px', verticalAlign: 'middle' }}
                  />
                </CheTooltip>
              )}
            </span>
          }
          isRequired
          fieldId="ai-provider-api-key"
        >
          <TextInput
            id="ai-provider-api-key"
            type="password"
            value={apiKey}
            placeholder={fixedProvider ? `Enter new ${fixedProvider.envVarName}` : 'Enter API key'}
            validated={apiKeyValidated}
            onChange={(_event, val) => this.handleApiKeyChange(val)}
            aria-label="API key input"
          />
        </FormGroup>
      </React.Fragment>
    );
  }
}
