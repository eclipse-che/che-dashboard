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
  Dropdown,
  DropdownItem,
  DropdownList,
  FormGroup,
  MenuToggle,
} from '@patternfly/react-core';
import React from 'react';

import { DEFAULT_GIT_PROVIDER, GIT_PROVIDERS } from '@/pages/UserPreferences/const';

export type Props = {
  provider: api.GitProvider | undefined;
  onSelect: (provider: api.GitProvider) => void;
};
export type State = {
  isOpen: boolean;
  provider: api.GitProvider | undefined;
};

export class GitProviderSelector extends React.PureComponent<Props, State> {
  private toggleElementId = 'toggle-initial-selection';

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      provider: props.provider,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    const { provider } = this.props;
    if (prevProps.provider !== provider) {
      this.setState({ provider });
    }
  }

  private onToggle(): void {
    this.setState(prevState => ({ isOpen: !prevState.isOpen }));
  }

  private onSelect(provider: api.GitProvider): void {
    this.setState({
      isOpen: false,
      provider,
    });
    this.props.onSelect(provider);
  }

  private buildDropdownItems(): React.ReactElement[] {
    return Object.entries(GIT_PROVIDERS)
      .sort((providerEntryA, providerEntryB) => {
        // compare by values
        const providerNameA = providerEntryA[1];
        const providerNameB = providerEntryB[1];
        return providerNameA.localeCompare(providerNameB);
      })
      .filter(providerEntry => {
        // Exclude Bitbucket from the list as it does not provide PAT.
        return providerEntry[0] !== 'bitbucket';
      })
      .map(providerEntry => {
        const [provider, providerName] = providerEntry as [api.GitProvider, string];
        return (
          <DropdownItem key={provider} onClick={() => this.onSelect(provider)}>
            {providerName}
          </DropdownItem>
        );
      });
  }

  public render(): React.ReactElement {
    const { isOpen, provider = DEFAULT_GIT_PROVIDER } = this.state;
    const providerName = GIT_PROVIDERS[provider];

    const dropdownItems = this.buildDropdownItems();

    return (
      <FormGroup label="Provider Name" fieldId="provider-name">
        <Dropdown
          onOpenChange={isOpen => this.setState({ isOpen })}
          toggle={toggleRef => (
            <MenuToggle
              ref={toggleRef}
              id={this.toggleElementId}
              onClick={() => this.onToggle()}
              isExpanded={isOpen}
            >
              {providerName}
            </MenuToggle>
          )}
          isOpen={isOpen}
        >
          <DropdownList>{dropdownItems}</DropdownList>
        </Dropdown>
      </FormGroup>
    );
  }
}
