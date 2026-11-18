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

import { Panel, PanelHeader, PanelMain, PanelMainBody, Title } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { CustomEditorModal } from '@/components/EditorSelector/CustomEditorModal';
import { EditorDropdown } from '@/components/EditorSelector/Dropdown';
import { RootState } from '@/store';
import { selectCurrentArchitecture } from '@/store/ClusterConfig/selectors';
import { selectEditors } from '@/store/Plugins/chePlugins/selectors';
import { selectEditorsVisibility } from '@/store/ServerConfig';

export type Props = MappedProps & {
  defaultEditorId: string;
  /**
   * Whether the consumer can act on a custom editor. Pass false where only an
   * editor id or definition is forwarded, so the option is not offered and
   * then silently ignored. Defaults to true.
   */
  canUseCustomEditor?: boolean;
  onSelect: (
    editorDefinition: string | undefined,
    editorImage: string | undefined,
    customEditorName?: string,
  ) => void;
};
export type State = {
  selectedEditorId: string;
  customEditorName: string | undefined;
  isCustomEditorModalOpen: boolean;
};

class EditorSelector extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedEditorId: '',
      customEditorName: undefined,
      isCustomEditorModalOpen: false,
    };
  }

  private handleDefaultEditorSelect(): void {
    this.setState({ selectedEditorId: '', customEditorName: undefined });
    this.props.onSelect(undefined, undefined);
  }

  private handleEditorSelect(editorId: string): void {
    this.setState({ selectedEditorId: editorId, customEditorName: undefined });
    this.props.onSelect(editorId, undefined);
  }

  private handleCustomEditorSelect(
    editorName: string,
    editorDefinition: string | undefined,
    editorImage: string,
  ): void {
    this.setState({
      customEditorName: editorName,
      isCustomEditorModalOpen: false,
    });
    this.props.onSelect(editorDefinition, editorImage || undefined, editorName);
  }

  render(): React.ReactElement {
    const { editorsVisibilityConfig, defaultEditorId, editors, currentArchitecture } = this.props;
    const { selectedEditorId, customEditorName, isCustomEditorModalOpen } = this.state;

    return (
      <Panel>
        <PanelHeader>
          <Title headingLevel="h3">Editor Selector</Title>
        </PanelHeader>
        <PanelMain>
          <PanelMainBody>
            <EditorDropdown
              editorsVisibilityConfig={editorsVisibilityConfig}
              defaultEditorId={defaultEditorId}
              editors={editors}
              currentArchitecture={currentArchitecture}
              selectedEditorId={selectedEditorId}
              customEditorName={customEditorName}
              canUseCustomEditor={this.props.canUseCustomEditor}
              onSelect={editorId => this.handleEditorSelect(editorId)}
              onDefaultEditorClick={() => this.handleDefaultEditorSelect()}
              onCustomEditorClick={() => this.setState({ isCustomEditorModalOpen: true })}
            />

            <CustomEditorModal
              isOpen={isCustomEditorModalOpen}
              onClose={() => this.setState({ isCustomEditorModalOpen: false })}
              onSave={(editorName, editorDefinition, editorImage) =>
                this.handleCustomEditorSelect(editorName, editorDefinition, editorImage)
              }
            />
          </PanelMainBody>
        </PanelMain>
      </Panel>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  editors: selectEditors(state),
  editorsVisibilityConfig: selectEditorsVisibility(state),
  currentArchitecture: selectCurrentArchitecture(state),
});

const connector = connect(mapStateToProps, null, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(EditorSelector);
