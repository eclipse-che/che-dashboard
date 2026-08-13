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

import { Button, FormGroup, FormGroupLabelHelp } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AiToolInfoModal } from '@/pages/WorkspaceDetails/OverviewTab/AiTool/InfoModal';
import {
  AiToolSelectorModal,
  SelectedVersions,
} from '@/pages/WorkspaceDetails/OverviewTab/AiTool/SelectorModal';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import {
  addAiToolToWorkspace,
  getInjectedAiToolInfo,
  removeAiToolFromWorkspace,
} from '@/services/helpers/aiTools';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectAiProviders, selectAiTools } from '@/store/AiConfig/selectors';

export type Props = MappedProps & {
  readonly: boolean;
  workspace: Workspace;
  onSave: (workspace: Workspace) => Promise<void>;
};

export type State = {
  isSelectorOpen: boolean;
  isInfoOpen: boolean;
  selected: string[];
  selectedVersions: SelectedVersions;
};

class AiToolFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const { ids, versions } = getInjectedAiToolInfo(props.workspace, props.aiTools);
    this.state = {
      isSelectorOpen: false,
      isInfoOpen: false,
      selected: ids,
      selectedVersions: versions,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    const { aiTools, workspace } = this.props;
    const { ids: newToolIds, versions: newVersions } = getInjectedAiToolInfo(workspace, aiTools);
    const { ids: prevToolIds } = getInjectedAiToolInfo(prevProps.workspace, prevProps.aiTools);
    if (newToolIds.join(',') !== prevToolIds.join(',')) {
      this.setState({ selected: newToolIds, selectedVersions: newVersions });
    }
  }

  private getDisplayName(toolIds: string[]): string {
    const { aiTools } = this.props;
    if (toolIds.length === 0) {
      return 'None';
    }
    return toolIds.map(id => aiTools.find(t => t.providerId === id)?.name ?? id).join(', ');
  }

  private handleCancelChanges(): void {
    const { aiTools, workspace } = this.props;
    const { ids, versions } = getInjectedAiToolInfo(workspace, aiTools);
    this.setState({ selected: ids, selectedVersions: versions, isSelectorOpen: false });
  }

  private async handleConfirmChanges(newVersions: SelectedVersions): Promise<void> {
    const { workspace, aiTools, onSave } = this.props;
    const { ids: currentToolIds, versions: currentVersions } = getInjectedAiToolInfo(
      workspace,
      aiTools,
    );
    const { selected } = this.state;

    // Determine which tools need to be re-injected due to version change
    const versionChanged = (id: string): boolean => {
      const newTag = newVersions[id];
      const currentTag = currentVersions[id];
      return newTag !== undefined && currentTag !== undefined && newTag !== currentTag;
    };

    const noSelectionChange = selected.join(',') === currentToolIds.join(',');
    const noVersionChange = selected.every(id => !versionChanged(id));

    if (noSelectionChange && noVersionChange) {
      this.setState({ isSelectorOpen: false });
      return;
    }

    // removeAiToolFromWorkspace / addAiToolToWorkspace each clone internally,
    // so passing workspace.ref directly avoids a redundant up-front deep copy.
    let updatedDw = workspace.ref;

    // Remove tools no longer selected OR whose version changed
    for (const toolId of currentToolIds) {
      if (!selected.includes(toolId) || versionChanged(toolId)) {
        updatedDw = removeAiToolFromWorkspace(constructWorkspace(updatedDw), toolId, aiTools);
      }
    }

    // Add newly selected tools OR re-add those with a new version
    for (const toolId of selected) {
      if (!currentToolIds.includes(toolId) || versionChanged(toolId)) {
        const tag = newVersions[toolId];
        updatedDw = addAiToolToWorkspace(constructWorkspace(updatedDw), toolId, aiTools, tag);
      }
    }

    this.setState({ isSelectorOpen: false, selectedVersions: newVersions });
    await onSave(constructWorkspace(updatedDw));
  }

  public render(): React.ReactNode {
    const { aiTools, readonly, workspace } = this.props;

    if (aiTools.length === 0) {
      return null;
    }

    const { selected, selectedVersions, isSelectorOpen, isInfoOpen } = this.state;

    const displayName = this.getDisplayName(selected);
    const { ids: originSelection, versions: originVersions } = getInjectedAiToolInfo(
      workspace,
      aiTools,
    );

    return (
      <FormGroup
        label="AI Tool"
        fieldId="ai-tool"
        labelHelp={
          <FormGroupLabelHelp
            aria-label="More info for AI tool"
            onClick={() => this.setState(prev => ({ isInfoOpen: !prev.isInfoOpen }))}
          />
        }
      >
        {readonly && <span className={overviewStyles.readonly}>{displayName}</span>}
        {!readonly && (
          <span className={overviewStyles.editable}>
            {displayName}
            <Button
              data-testid="overview-ai-tool-edit-toggle"
              variant="plain"
              onClick={() => this.setState({ isSelectorOpen: true })}
              aria-label="Change AI Tool"
              title="Change AI Tool"
            >
              <PencilAltIcon />
            </Button>
          </span>
        )}
        <AiToolSelectorModal
          isOpen={isSelectorOpen}
          aiTools={aiTools}
          aiProviders={this.props.aiProviders}
          selected={selected}
          selectedVersions={selectedVersions}
          originSelection={originSelection}
          originVersions={originVersions}
          onToggle={toolId => {
            this.setState(prev => {
              const isSelected = prev.selected.includes(toolId);
              return {
                selected: isSelected
                  ? prev.selected.filter(id => id !== toolId)
                  : [...prev.selected, toolId],
              };
            });
          }}
          onConfirm={newVersions => this.handleConfirmChanges(newVersions)}
          onCancel={() => this.handleCancelChanges()}
        />
        <AiToolInfoModal
          isOpen={isInfoOpen}
          aiTools={aiTools}
          aiProviders={this.props.aiProviders}
          onClose={() => this.setState(prev => ({ isInfoOpen: !prev.isInfoOpen }))}
        />
      </FormGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  aiProviders: selectAiProviders(state),
  aiTools: selectAiTools(state),
});

const connector = connect(mapStateToProps);
type MappedProps = ConnectedProps<typeof connector>;
export { AiToolFormGroup };
export default connector(AiToolFormGroup);
