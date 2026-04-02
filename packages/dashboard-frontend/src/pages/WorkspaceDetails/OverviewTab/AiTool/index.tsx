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

import {
  Button,
  Content,
  ContentVariants,
  FormGroup,
  FormGroupLabelHelp,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import {
  addAiToolToWorkspace,
  getInjectedAiToolId,
  removeAiToolFromWorkspace,
} from '@/services/helpers/aiTools';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectAiTools } from '@/store/AiConfig/selectors';

export type Props = MappedProps & {
  readonly: boolean;
  workspace: Workspace;
  onSave: (workspace: Workspace) => Promise<void>;
};

export type State = {
  isSelectorOpen: boolean;
  isInfoOpen: boolean;
  selected: string | undefined;
};

class AiToolFormGroup extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isSelectorOpen: false,
      isInfoOpen: false,
      selected: getInjectedAiToolId(props.workspace, props.aiTools),
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    const { aiTools, workspace } = this.props;
    const newToolId = getInjectedAiToolId(workspace, aiTools);
    if (newToolId !== getInjectedAiToolId(prevProps.workspace, prevProps.aiTools)) {
      this.setState({ selected: newToolId });
    }
  }

  private getDisplayName(toolId: string | undefined): string {
    const { aiTools } = this.props;
    if (!toolId) {
      return 'None';
    }
    return aiTools.find(t => t.id === toolId)?.name ?? toolId;
  }

  private handleEditToggle(isSelectorOpen: boolean): void {
    this.setState({ isSelectorOpen });
  }

  private handleInfoToggle(): void {
    this.setState(({ isInfoOpen }) => ({ isInfoOpen: !isInfoOpen }));
  }

  private handleCancelChanges(): void {
    const { aiTools, workspace } = this.props;
    this.setState({ selected: getInjectedAiToolId(workspace, aiTools) });
    this.handleEditToggle(false);
  }

  private async handleConfirmChanges(): Promise<void> {
    const { workspace, aiTools, onSave } = this.props;
    const currentToolId = getInjectedAiToolId(workspace, aiTools);
    const { selected } = this.state;

    if (selected === currentToolId) {
      this.setState({ isSelectorOpen: false });
      return;
    }

    let updatedDw = cloneDeep(workspace.ref);

    if (currentToolId) {
      updatedDw = removeAiToolFromWorkspace(constructWorkspace(updatedDw), currentToolId);
    }
    if (selected) {
      updatedDw = addAiToolToWorkspace(constructWorkspace(updatedDw), selected, aiTools);
    }

    this.setState({ isSelectorOpen: false });
    await onSave(constructWorkspace(updatedDw));
  }

  private getInfoModalContent(): React.ReactNode {
    const { aiTools } = this.props;

    if (aiTools.length === 0) {
      return (
        <Content>
          <Content component="p">
            No AI tools are available. Ask your administrator to configure AI tools in the
            CheCluster custom resource.
          </Content>
        </Content>
      );
    }

    return (
      <Content>
        <Content component="p">
          AI coding tools are injected into workspace containers at start via init containers. The
          selected tool binary is copied to a shared volume and added to <code>PATH</code>.
        </Content>
        {aiTools.map(def => (
          <Content key={def.id} component="p">
            <b>
              <a href={def.url} target="_blank" rel="noreferrer">
                {def.name}
              </a>
            </b>{' '}
            — {def.description}
            {def.envVarName && (
              <>
                {' '}
                Requires <code>{def.envVarName}</code>.
              </>
            )}
          </Content>
        ))}
      </Content>
    );
  }

  private getSelectorModal(): React.ReactNode {
    const { aiTools, workspace } = this.props;
    const { isSelectorOpen, selected } = this.state;
    const originSelection = getInjectedAiToolId(workspace, aiTools);

    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isSelectorOpen}
        onClose={() => this.handleCancelChanges()}
        elementToFocus="[data-pf-initial-focus]"
      >
        <ModalHeader title="Change AI Tool" />
        <ModalBody>
          <Content data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
            {aiTools.length === 0 ? (
              <Content component="p">
                No AI tools are available. Ask your administrator to configure AI tools in the
                CheCluster custom resource.
              </Content>
            ) : (
              <>
                <Content component={ContentVariants.h6}>Select an AI coding tool</Content>
                <Content component={ContentVariants.h6}>
                  <Radio
                    label="None"
                    name="ai-tool-none"
                    id="ai-tool-none-radio"
                    description="No AI tool will be injected into the workspace."
                    isChecked={selected === undefined}
                    onChange={() => this.setState({ selected: undefined })}
                  />
                </Content>
                {aiTools.map(def => (
                  <Content key={def.id} component={ContentVariants.h6}>
                    <Radio
                      label={def.name}
                      name={`ai-tool-${def.id}`}
                      id={`ai-tool-${def.id}-radio`}
                      description={
                        def.envVarName
                          ? `${def.description} Requires ${def.envVarName} (set via User Preferences → AI Provider Keys).`
                          : def.description
                      }
                      isChecked={selected === def.id}
                      onChange={() => this.setState({ selected: def.id })}
                    />
                  </Content>
                ))}
              </>
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            key="confirm"
            variant="primary"
            isDisabled={selected === originSelection}
            onClick={() => this.handleConfirmChanges()}
          >
            Save
          </Button>
          <Button key="cancel" variant="secondary" onClick={() => this.handleCancelChanges()}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  public render(): React.ReactNode {
    const { readonly } = this.props;
    const { selected, isInfoOpen } = this.state;

    const displayName = this.getDisplayName(selected);

    return (
      <FormGroup
        label="AI Tool"
        fieldId="ai-tool"
        labelHelp={
          <FormGroupLabelHelp
            aria-label="More info for AI tool"
            onClick={() => this.handleInfoToggle()}
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
              onClick={() => this.handleEditToggle(true)}
              title="Change AI Tool"
            >
              <PencilAltIcon />
            </Button>
          </span>
        )}
        {this.getSelectorModal()}
        <Modal
          variant={ModalVariant.small}
          isOpen={isInfoOpen}
          onClose={() => this.handleInfoToggle()}
          elementToFocus="[data-pf-initial-focus]"
        >
          <ModalHeader title="AI Tool Info" />
          <ModalBody>
            <div data-pf-initial-focus tabIndex={-1} style={{ outline: 'none' }}>
              {this.getInfoModalContent()}
            </div>
          </ModalBody>
        </Modal>
      </FormGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  aiTools: selectAiTools(state),
});

const connector = connect(mapStateToProps);
type MappedProps = ConnectedProps<typeof connector>;
export { AiToolFormGroup };
export default connector(AiToolFormGroup);
