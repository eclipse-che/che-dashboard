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
  Button,
  ButtonVariant,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  ActionsColumn,
  IAction,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import React from 'react';

import styles from '@/pages/UserPreferences/AiProviderKeys/List/index.module.css';

export type Props = {
  isDisabled: boolean;
  providers: api.AiToolDefinition[];
  providerKeyExists: Record<string, boolean>;
  canAddMore: boolean;
  onAddKey: () => void;
  onUpdateKey: (provider: api.AiToolDefinition) => void;
  onDeleteKey: (provider: api.AiToolDefinition) => void;
};

type State = {
  selectedItems: api.AiToolDefinition[];
};

export class AiProviderKeysList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { selectedItems: [] };
  }

  private handleSelectItem(isSelected: boolean, rowIndex: number): void {
    const { providers } = this.props;

    if (rowIndex === -1) {
      const selectedItems = isSelected && providers.length > 0 ? [...providers] : [];
      this.setState({ selectedItems });
      return;
    }

    const item = providers[rowIndex];
    this.setState((prev: State) => ({
      selectedItems: isSelected
        ? [...prev.selectedItems, item]
        : prev.selectedItems.filter(s => s !== item),
    }));
  }

  private deselectItems(items: api.AiToolDefinition[]): void {
    this.setState(prev => ({
      selectedItems: prev.selectedItems.filter(s => !items.includes(s)),
    }));
  }

  private handleDeleteSelected(): void {
    const { selectedItems } = this.state;
    selectedItems.forEach(p => this.props.onDeleteKey(p));
    this.deselectItems(selectedItems);
  }

  private buildActionItems(provider: api.AiToolDefinition): IAction[] {
    const { isDisabled, providerKeyExists } = this.props;
    const hasKey = !!providerKeyExists[provider.id];
    const requiresKey = !!provider.envVarName;
    const actions: IAction[] = [];

    if (requiresKey) {
      actions.push({
        title: 'Update',
        isDisabled,
        onClick: () => this.props.onUpdateKey(provider),
      });
    }
    if (hasKey) {
      actions.push({
        title: 'Delete',
        isDisabled,
        onClick: () => {
          this.props.onDeleteKey(provider);
          this.deselectItems([provider]);
        },
      });
    }
    return actions;
  }

  private buildBodyRow(provider: api.AiToolDefinition, rowIndex: number): React.ReactElement {
    const { isDisabled, providerKeyExists } = this.props;
    const { selectedItems } = this.state;

    const hasKey = !!providerKeyExists[provider.id];
    const requiresKey = !!provider.envVarName;
    const rowDisabled = isDisabled || !hasKey;
    const actionItems = this.buildActionItems(provider);

    return (
      <Tr key={provider.id} data-testid={provider.id}>
        <Td
          dataLabel="Select"
          style={rowDisabled ? { opacity: 0.5 } : undefined}
          select={{
            rowIndex,
            onSelect: (_event, isSelected) => this.handleSelectItem(isSelected, rowIndex),
            isSelected: selectedItems.includes(provider),
            isDisabled: rowDisabled,
          }}
        />
        <Td dataLabel="AI Provider">
          <strong>
            {provider.icon && (
              <img
                src={provider.icon}
                alt={`${provider.name} icon`}
                className={styles.providerIcon}
              />
            )}
            {provider.name}
          </strong>
        </Td>
        <Td dataLabel="Environment Variable">
          {requiresKey ? (
            <code>{provider.envVarName}</code>
          ) : (
            <span style={{ color: 'var(--pf-v6-global--Color--200)' }}>No API key required</span>
          )}
        </Td>
        <Td dataLabel="Actions" isActionCell>
          <ActionsColumn isDisabled={actionItems.length === 0 || isDisabled} items={actionItems} />
        </Td>
      </Tr>
    );
  }

  public render(): React.ReactElement {
    const { isDisabled, providers, canAddMore } = this.props;
    const { selectedItems } = this.state;

    const deleteDisabled = isDisabled || selectedItems.length === 0;

    return (
      <React.Fragment>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button
                variant={ButtonVariant.danger}
                isDisabled={deleteDisabled}
                onClick={() => this.handleDeleteSelected()}
                data-testid="bulk-delete-ai-key-button"
              >
                Delete
              </Button>
            </ToolbarItem>
            <ToolbarItem
              align={{ md: 'alignEnd', lg: 'alignEnd', xl: 'alignEnd', '2xl': 'alignEnd' }}
            >
              <Button
                variant={ButtonVariant.link}
                icon={<PlusCircleIcon />}
                iconPosition="left"
                isDisabled={isDisabled || !canAddMore}
                onClick={() => this.props.onAddKey()}
                data-testid="add-ai-provider-key-button"
              >
                Add AI Provider Key
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Table aria-label="AI Provider Keys" variant={TableVariant.compact}>
          <Thead>
            <Tr>
              <Th
                aria-label="Select all rows"
                style={{ position: 'relative', top: '2px' }}
                select={{
                  onSelect: (_event, isSelected) => this.handleSelectItem(isSelected, -1),
                  isSelected: providers.length > 0 && selectedItems.length === providers.length,
                }}
              />
              <Th dataLabel="AI Provider">AI Provider</Th>
              <Th dataLabel="Environment Variable">Environment Variable</Th>
              <Th dataLabel="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {providers.map((provider, rowIndex) => this.buildBodyRow(provider, rowIndex))}
          </Tbody>
        </Table>
      </React.Fragment>
    );
  }
}
