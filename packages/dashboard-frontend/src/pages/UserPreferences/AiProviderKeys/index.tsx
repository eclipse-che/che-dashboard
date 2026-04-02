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

import { api, helpers } from '@eclipse-che/common';
import { AlertVariant, PageSection } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import ProgressIndicator from '@/components/Progress';
import { lazyInject } from '@/inversify.config';
import { AiProviderKeysAddEditModal } from '@/pages/UserPreferences/AiProviderKeys/AddEditModal';
import { AiProviderKeysDeleteModal } from '@/pages/UserPreferences/AiProviderKeys/DeleteModal';
import { AiProviderKeysEmptyState } from '@/pages/UserPreferences/AiProviderKeys/EmptyState';
import { AiProviderKeysList } from '@/pages/UserPreferences/AiProviderKeys/List';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { RootState } from '@/store';
import {
  aiConfigActionCreators,
  selectAiConfigError,
  selectAiConfigIsLoading,
  selectAiProviderKeyExists,
  selectAiTools,
} from '@/store/AiConfig';

export type Props = MappedProps;

export type State = {
  isAddEditOpen: boolean;
  isDeleteOpen: boolean;
  editingProvider: api.AiToolDefinition | undefined;
  deletingProvider: api.AiToolDefinition | undefined;
};

class AiProviderKeys extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);
    this.state = {
      isAddEditOpen: false,
      isDeleteOpen: false,
      editingProvider: undefined,
      deletingProvider: undefined,
    };
  }

  public async componentDidMount(): Promise<void> {
    if (this.props.isLoading) {
      return;
    }
    try {
      await this.props.requestAiConfig();
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'request-ai-config-failed',
        variant: AlertVariant.danger,
        title: helpers.errors.getMessage(e),
      });
    }
  }

  public componentDidUpdate(prevProps: Props): void {
    const { error } = this.props;
    if (error && error !== prevProps.error) {
      this.appAlerts.showAlert({
        key: 'ai-provider-key-error',
        title: helpers.errors.getMessage(error),
        variant: AlertVariant.danger,
      });
    }
  }

  private handleShowAddModal(): void {
    this.setState({ isAddEditOpen: true, editingProvider: undefined });
  }

  private handleShowUpdateModal(provider: api.AiToolDefinition): void {
    this.setState({ isAddEditOpen: true, editingProvider: provider });
  }

  private handleCloseAddEditModal(): void {
    this.setState({ isAddEditOpen: false, editingProvider: undefined });
  }

  private handleShowDeleteModal(provider: api.AiToolDefinition): void {
    this.setState({ isDeleteOpen: true, deletingProvider: provider });
  }

  private handleCloseDeleteModal(): void {
    this.setState({ isDeleteOpen: false, deletingProvider: undefined });
  }

  private async handleSave(toolId: string, apiKey: string): Promise<void> {
    this.setState({ isAddEditOpen: false, editingProvider: undefined });

    const tool = this.props.tools.find(t => t.id === toolId);
    const name = tool?.name ?? toolId;

    try {
      await this.props.saveAiProviderKey(toolId, apiKey);
      this.appAlerts.showAlert({
        key: 'ai-provider-key-saved',
        title: `${name} API key saved successfully.`,
        variant: AlertVariant.success,
      });
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'ai-provider-key-save-failed',
        title: helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    }
  }

  private async handleDelete(provider: api.AiToolDefinition): Promise<void> {
    this.setState({ isDeleteOpen: false, deletingProvider: undefined });

    try {
      await this.props.deleteAiProviderKey(provider.id);
      this.appAlerts.showAlert({
        key: 'ai-provider-key-deleted',
        title: `${provider.name} API key deleted successfully.`,
        variant: AlertVariant.success,
      });
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'ai-provider-key-delete-failed',
        title: helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    }
  }

  public render(): React.ReactElement {
    const { tools, providerKeyExists, isLoading } = this.props;
    const { isAddEditOpen, isDeleteOpen, editingProvider, deletingProvider } = this.state;

    // Only show tools that require an API key (have envVarName)
    const keyTools = tools.filter(t => !!t.envVarName);
    const canAddMore = keyTools.some(t => !providerKeyExists[t.id]);
    const availableTools = keyTools.filter(t => !providerKeyExists[t.id]);

    // List: only tools that require a key (tools without envVarName have nothing to manage here)
    const listTools = keyTools.filter(t => providerKeyExists[t.id]);

    return (
      <React.Fragment>
        <ProgressIndicator isLoading={isLoading} />
        <PageSection>
          <AiProviderKeysAddEditModal
            isOpen={isAddEditOpen}
            availableProviders={editingProvider ? [editingProvider] : availableTools}
            fixedProvider={editingProvider}
            onSave={(...args) => this.handleSave(...args)}
            onCloseModal={() => this.handleCloseAddEditModal()}
          />

          <AiProviderKeysDeleteModal
            isOpen={isDeleteOpen}
            provider={deletingProvider}
            onCloseModal={() => this.handleCloseDeleteModal()}
            onDelete={provider => this.handleDelete(provider)}
          />

          {listTools.length === 0 ? (
            <AiProviderKeysEmptyState
              isDisabled={isLoading}
              hasProviders={keyTools.length > 0}
              onAddKey={() => this.handleShowAddModal()}
            />
          ) : (
            <AiProviderKeysList
              isDisabled={isLoading}
              providers={listTools}
              providerKeyExists={providerKeyExists}
              canAddMore={canAddMore}
              onAddKey={() => this.handleShowAddModal()}
              onUpdateKey={provider => this.handleShowUpdateModal(provider)}
              onDeleteKey={provider => this.handleShowDeleteModal(provider)}
            />
          )}
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  tools: selectAiTools(state),
  providerKeyExists: selectAiProviderKeyExists(state),
  isLoading: selectAiConfigIsLoading(state),
  error: selectAiConfigError(state),
});

const connector = connect(
  mapStateToProps,
  {
    requestAiConfig: aiConfigActionCreators.requestAiConfig,
    saveAiProviderKey: aiConfigActionCreators.saveAiProviderKey,
    deleteAiProviderKey: aiConfigActionCreators.deleteAiProviderKey,
  },
  null,
  { forwardRef: true },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(AiProviderKeys);
