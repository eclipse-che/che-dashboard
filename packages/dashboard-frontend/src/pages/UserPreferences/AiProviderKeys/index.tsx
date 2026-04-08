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
  selectAiProviders,
  selectAiTools,
} from '@/store/AiConfig';

export type Props = MappedProps;

export type State = {
  isAddEditOpen: boolean;
  isDeleteOpen: boolean;
  editingProvider: api.AiToolDefinition | undefined;
  deletingProviders: api.AiToolDefinition[];
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
      deletingProviders: [],
    };
  }

  public async componentDidMount(): Promise<void> {
    if (this.props.isLoading) {
      return;
    }
    try {
      await this.props.requestAiProviderKeyStatus();
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

  private handleShowDeleteModal(providers: api.AiToolDefinition[]): void {
    this.setState({ isDeleteOpen: true, deletingProviders: providers });
  }

  private handleCloseDeleteModal(): void {
    this.setState({ isDeleteOpen: false, deletingProviders: [] });
  }

  private async handleSave(toolId: string, apiKey: string): Promise<void> {
    const tool = this.props.tools.find(t => t.providerId === toolId);
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
    } finally {
      this.setState({ isAddEditOpen: false, editingProvider: undefined });
    }
  }

  private async handleDelete(providers: api.AiToolDefinition[]): Promise<void> {
    try {
      for (const provider of providers) {
        await this.props.deleteAiProviderKey(provider.providerId);
      }
      const names = providers.map(p => p.name).join(', ');
      this.appAlerts.showAlert({
        key: 'ai-provider-key-deleted',
        title:
          providers.length === 1
            ? `${names} API key deleted successfully.`
            : `${providers.length} API keys deleted successfully: ${names}.`,
        variant: AlertVariant.success,
      });
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'ai-provider-key-delete-failed',
        title: helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    } finally {
      this.setState({ isDeleteOpen: false, deletingProviders: [] });
    }
  }

  public render(): React.ReactElement {
    const { tools, providerKeyExists, isLoading } = this.props;
    const { isAddEditOpen, isDeleteOpen, editingProvider, deletingProviders } = this.state;

    // Only show tools that require an API key (have envVarName)
    const keyTools = tools.filter(t => !!t.envVarName);
    const canAddMore = keyTools.some(t => !providerKeyExists[t.providerId]);
    const availableTools = keyTools.filter(t => !providerKeyExists[t.providerId]);

    // List: only tools that require a key (tools without envVarName have nothing to manage here)
    const listTools = keyTools.filter(t => providerKeyExists[t.providerId]);

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
            providers={deletingProviders}
            onCloseModal={() => this.handleCloseDeleteModal()}
            onDelete={providers => this.handleDelete(providers)}
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
              aiProviders={this.props.aiProviders}
              providerKeyExists={providerKeyExists}
              canAddMore={canAddMore}
              onAddKey={() => this.handleShowAddModal()}
              onUpdateKey={provider => this.handleShowUpdateModal(provider)}
              onDeleteKey={providers => this.handleShowDeleteModal(providers)}
            />
          )}
        </PageSection>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  aiProviders: selectAiProviders(state),
  tools: selectAiTools(state),
  providerKeyExists: selectAiProviderKeyExists(state),
  isLoading: selectAiConfigIsLoading(state),
  error: selectAiConfigError(state),
});

const connector = connect(
  mapStateToProps,
  {
    requestAiProviderKeyStatus: aiConfigActionCreators.requestAiProviderKeyStatus,
    saveAiProviderKey: aiConfigActionCreators.saveAiProviderKey,
    deleteAiProviderKey: aiConfigActionCreators.deleteAiProviderKey,
  },
  null,
  { forwardRef: true },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(AiProviderKeys);
