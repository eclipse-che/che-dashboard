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
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AiToolInfoModal } from '@/pages/WorkspaceDetails/OverviewTab/AiTool/InfoModal';
import { AiToolSelectorModal } from '@/pages/WorkspaceDetails/OverviewTab/AiTool/SelectorModal';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import {
  addAiToolToWorkspace,
  getInjectedAiToolIds,
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
};

class AiToolFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isSelectorOpen: false,
      isInfoOpen: false,
      selected: getInjectedAiToolIds(props.workspace, props.aiTools),
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    const { aiTools, workspace } = this.props;
    const newToolIds = getInjectedAiToolIds(workspace, aiTools);
    const prevToolIds = getInjectedAiToolIds(prevProps.workspace, prevProps.aiTools);
    if (newToolIds.join(',') !== prevToolIds.join(',')) {
      this.setState({ selected: newToolIds });
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
    this.setState({
      selected: getInjectedAiToolIds(workspace, aiTools),
      isSelectorOpen: false,
    });
  }

  private async handleConfirmChanges(): Promise<void> {
    const { workspace, aiTools, onSave } = this.props;
    const currentToolIds = getInjectedAiToolIds(workspace, aiTools);
    const { selected } = this.state;

    if (selected.join(',') === currentToolIds.join(',')) {
      this.setState({ isSelectorOpen: false });
      return;
    }

    let updatedDw = cloneDeep(workspace.ref);

    // Remove tools that are no longer selected
    for (const toolId of currentToolIds) {
      if (!selected.includes(toolId)) {
        updatedDw = removeAiToolFromWorkspace(constructWorkspace(updatedDw), toolId, aiTools);
      }
    }

    // Add tools that are newly selected
    for (const toolId of selected) {
      if (!currentToolIds.includes(toolId)) {
        updatedDw = addAiToolToWorkspace(constructWorkspace(updatedDw), toolId, aiTools);
      }
    }

    this.setState({ isSelectorOpen: false });
    await onSave(constructWorkspace(updatedDw));
  }

  public render(): React.ReactNode {
    const { aiTools, readonly, workspace } = this.props;

    if (aiTools.length === 0) {
      return null;
    }

    const { selected, isSelectorOpen, isInfoOpen } = this.state;

    const displayName = this.getDisplayName(selected);
    const originSelection = getInjectedAiToolIds(workspace, aiTools);

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
          originSelection={originSelection}
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
          onConfirm={() => this.handleConfirmChanges()}
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
