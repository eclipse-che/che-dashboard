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
import { ActionsColumn, IAction, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';

import styles from '@/plugins/ai-selector/pages/UserPreferences/AiProviderKeys/List/index.module.css';

export type Props = {
  isDisabled: boolean;
  providers: api.AiToolDefinition[];
  aiProviders: api.AiProviderDefinition[];
  providerKeyExists: Record<string, boolean>;
  canAddMore: boolean;
  onAddKey: () => void;
  onUpdateKey: (provider: api.AiToolDefinition) => void;
  onDeleteKey: (providers: api.AiToolDefinition[]) => void;
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
        : prev.selectedItems.filter(s => s.providerId !== item.providerId),
    }));
  }

  private deselectItems(items: api.AiToolDefinition[]): void {
    this.setState(prev => ({
      selectedItems: prev.selectedItems.filter(
        s => !items.some(i => i.providerId === s.providerId),
      ),
    }));
  }

  private handleDeleteSelected(): void {
    const { selectedItems } = this.state;
    this.props.onDeleteKey(selectedItems);
    this.deselectItems(selectedItems);
  }

  private buildActionItems(provider: api.AiToolDefinition): IAction[] {
    const { isDisabled, providerKeyExists } = this.props;
    const hasKey = providerKeyExists[provider.providerId];
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
          this.props.onDeleteKey([provider]);
          this.deselectItems([provider]);
        },
      });
    }
    return actions;
  }

  private getProviderIcon(tool: api.AiToolDefinition): string | undefined {
    return this.props.aiProviders.find(p => p.id === tool.providerId)?.icon;
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
            <ToolbarItem align={{ default: 'alignEnd' }}>
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

        <Table aria-label="AI Provider Keys" variant="compact">
          <Thead>
            <Tr>
              <Th
                screenReaderText="Select all rows"
                select={{
                  onSelect: (_event, isSelected) => this.handleSelectItem(isSelected, -1),
                  isSelected: providers.length > 0 && selectedItems.length === providers.length,
                }}
              />
              <Th>AI Provider</Th>
              <Th className={styles.envVarColumn}>Environment Variable</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {providers.map((provider, rowIndex) => {
              const hasKey = this.props.providerKeyExists[provider.providerId];
              const requiresKey = !!provider.envVarName;
              const rowDisabled = isDisabled || !hasKey;
              const actionItems = this.buildActionItems(provider);

              return (
                <Tr
                  key={provider.providerId}
                  data-testid={provider.providerId}
                  style={{ verticalAlign: 'middle' }}
                >
                  <Td
                    style={
                      rowDisabled
                        ? { opacity: 0.5, verticalAlign: 'inherit' }
                        : { verticalAlign: 'inherit' }
                    }
                    select={{
                      rowIndex,
                      onSelect: (_event, isSelected) => this.handleSelectItem(isSelected, rowIndex),
                      isSelected: selectedItems.includes(provider),
                      isDisabled: rowDisabled,
                    }}
                  />
                  <Td dataLabel="AI Provider">
                    <strong>
                      {this.getProviderIcon(provider) && (
                        <img
                          src={this.getProviderIcon(provider)}
                          alt={`${provider.name} icon`}
                          className={styles.providerIcon}
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      {provider.name}
                    </strong>
                  </Td>
                  <Td dataLabel="Environment Variable" className={styles.envVarCell}>
                    {requiresKey ? (
                      <code>{provider.envVarName}</code>
                    ) : (
                      <span className={styles.noKeyLabel}>No API key required</span>
                    )}
                  </Td>
                  <Td dataLabel="Actions" isActionCell className={styles.actionsCell}>
                    <ActionsColumn
                      isDisabled={actionItems.length === 0 || isDisabled}
                      items={actionItems}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </React.Fragment>
    );
  }
}
