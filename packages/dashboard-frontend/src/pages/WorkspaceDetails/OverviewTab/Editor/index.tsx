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

import common, { Architecture } from '@eclipse-che/common';
import {
  AlertVariant,
  Button,
  FormGroup,
  FormGroupLabelHelp,
  Popover,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { lazyInject } from '@/inversify.config';
import { EditorSelectorModal } from '@/pages/WorkspaceDetails/OverviewTab/Editor/SelectorModal';
import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';
import { AppAlerts } from '@/services/alerts/appAlerts';
import { getCurrentEditorId, getCurrentEditorLabel } from '@/services/helpers/editor';
import getRandomString from '@/services/helpers/random';
import { che } from '@/services/models';
import { Workspace } from '@/services/workspace-adapter';
import { RootState } from '@/store';
import { selectCurrentArchitecture } from '@/store/ClusterConfig/selectors';
import { selectEditors } from '@/store/Plugins/chePlugins/selectors';
import { changeWorkspaceEditor } from '@/store/Workspaces/devWorkspaces/actions/actionCreators/changeWorkspaceEditor';

export type Props = MappedProps & {
  readonly: boolean;
  workspace: Workspace;
};

type State = {
  isSelectorOpen: boolean;
};

export class EditorFormGroup extends React.PureComponent<Props, State> {
  @lazyInject(AppAlerts)
  private appAlerts: AppAlerts;

  state: State = { isSelectorOpen: false };

  private get filteredEditors(): che.Plugin[] {
    const { editors, currentArchitecture } = this.props;
    return editors.filter(
      e => !currentArchitecture || !e.arch || e.arch.includes(currentArchitecture as Architecture),
    );
  }

  private async handleConfirm(newEditorId: string): Promise<void> {
    const { workspace, changeEditor } = this.props;
    this.setState({ isSelectorOpen: false });
    try {
      await changeEditor(workspace, newEditorId);
      this.appAlerts.showAlert({
        key: 'editor-change-' + getRandomString(4),
        title: 'Workspace has been updated',
        variant: AlertVariant.success,
      });
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'editor-change-error-' + getRandomString(4),
        title: common.helpers.errors.getMessage(e),
        variant: AlertVariant.danger,
      });
    }
  }

  public render(): React.ReactNode {
    const { readonly, workspace } = this.props;
    const { isSelectorOpen } = this.state;
    const editors = this.filteredEditors;
    const label = getCurrentEditorLabel(workspace, editors);
    const currentEditorId = getCurrentEditorId(workspace);

    return (
      <FormGroup
        label="Editor"
        fieldId="editor"
        labelHelp={
          <Popover bodyContent="The IDE used to open this workspace. You can change it when the workspace is stopped.">
            <FormGroupLabelHelp aria-label="More info for Editor" />
          </Popover>
        }
      >
        {readonly && <span className={overviewStyles.readonly}>{label}</span>}
        {!readonly && (
          <span className={overviewStyles.editable}>
            {label}
            <Button
              data-testid="overview-editor-edit-toggle"
              variant="plain"
              onClick={() => this.setState({ isSelectorOpen: true })}
              aria-label="Change editor"
              title="Change editor"
            >
              <PencilAltIcon />
            </Button>
          </span>
        )}
        <EditorSelectorModal
          isOpen={isSelectorOpen}
          currentEditorId={currentEditorId}
          editors={editors}
          onConfirm={editorId => this.handleConfirm(editorId)}
          onClose={() => this.setState({ isSelectorOpen: false })}
        />
      </FormGroup>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  editors: selectEditors(state),
  currentArchitecture: selectCurrentArchitecture(state) as Architecture | undefined,
});

const mapDispatchToProps = {
  changeEditor: changeWorkspaceEditor,
};

const connector = connect(mapStateToProps, mapDispatchToProps);
type MappedProps = ConnectedProps<typeof connector>;
export default connector(EditorFormGroup);
