/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import React from 'react';
import {
  Button,
  TextContent,
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  AlertGroup,
} from '@patternfly/react-core';
import DevfileEditor, { DevfileEditor as Editor } from '../../../components/DevfileEditor';
import EditorTools from './EditorTools';

import './DevfileTab.styl';

type Props = {
  onSave: (workspace: che.Workspace) => Promise<void>;
  workspace: che.Workspace;
};

type State = {
  devfile: che.WorkspaceDevfile;
  hasChanges: boolean;
  hasRequestErrors: boolean;
  currentRequestError: string;
  isDevfileValid: boolean;
  isExpanded: boolean;
  copied?: boolean;
};

export class EditorTab extends React.PureComponent<Props, State> {
  private originDevfile: che.WorkspaceDevfile | undefined;
  private readonly devfileEditorRef: React.RefObject<Editor>;

  cancelChanges: () => void;

  constructor(props: Props) {
    super(props);

    this.state = {
      devfile: Object.assign({}, this.props.workspace?.devfile),
      hasChanges: false,
      isDevfileValid: true,
      hasRequestErrors: false,
      currentRequestError: '',
      isExpanded: false,
    };

    this.cancelChanges = (): void => {
      this.updateEditor(this.props.workspace?.devfile);
      this.setState({
        hasChanges: false,
        hasRequestErrors: false,
        currentRequestError: '',
      });
    };

    this.devfileEditorRef = React.createRef<Editor>();
  }

  private init(): void {
    const devfile = Object.assign({}, this.props.workspace?.devfile as che.WorkspaceDevfile);
    if (devfile && (!this.originDevfile || !this.isEqualObject(devfile, this.originDevfile))) {
      this.originDevfile = devfile;
      this.updateEditor(devfile);
      this.setState({
        hasRequestErrors: false,
        currentRequestError: '',
        hasChanges: false,
      });
    }
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(): void {
    this.init();
  }

  public render(): React.ReactElement {
    const originDevfile = this.props.workspace?.devfile as che.WorkspaceDevfile;
    const { devfile } = this.state;

    return (
      <React.Fragment>
        <br />
        {(this.state.currentRequestError) && (
          <Alert
            variant={AlertVariant.danger} isInline title={this.state.currentRequestError}
            actionClose={<AlertActionCloseButton onClose={() => this.setState({ currentRequestError: '' })} />}
          />
        )}
        <TextContent
          className={`workspace-details${this.state.isExpanded ? '-expanded' : ''}`}>
          {(this.state.currentRequestError && this.state.isExpanded) && (
            <AlertGroup isToast>
              <Alert
                variant={AlertVariant.danger}
                title={this.state.currentRequestError}
                actionClose={<AlertActionCloseButton onClose={() => this.setState({ currentRequestError: '' })} />}
              />
            </AlertGroup>
          )}
          <EditorTools devfile={devfile as che.WorkspaceDevfile} handleExpand={isExpanded => {
            this.setState({ isExpanded });
          }} />
          <DevfileEditor
            ref={this.devfileEditorRef}
            devfile={originDevfile}
            decorationPattern="location[ \t]*(.*)[ \t]*$"
            onChange={(devfile, isValid) => {
              this.onDevfileChange(devfile, isValid);
            }}
          />
          <Button onClick={() => this.cancelChanges()} variant="secondary" className="cancle-button"
            isDisabled={!this.state.hasChanges && this.state.isDevfileValid}>
            Cancel
          </Button>
          <Button onClick={async () => await this.onSave()} variant="primary" className="save-button"
            isDisabled={!this.state.hasChanges || !this.state.isDevfileValid}>
            Save
          </Button>
        </TextContent>
      </React.Fragment>
    );
  }

  private updateEditor(devfile: che.WorkspaceDevfile | undefined): void {
    if (!devfile) {
      return;
    }
    this.devfileEditorRef.current?.updateContent(devfile);
    this.setState({ isDevfileValid: true });
  }

  private onDevfileChange(devfile: che.WorkspaceDevfile, isValid: boolean): void {
    this.setState({ isDevfileValid: isValid });
    if (!isValid) {
      this.setState({ hasChanges: false });
      return;
    }
    if (this.isEqualObject(this.props.workspace.devfile as che.WorkspaceDevfile, devfile)) {
      this.setState({ hasChanges: false });
      return;
    }
    this.setState({ devfile });
    this.setState({
      hasChanges: true,
      hasRequestErrors: false,
    });
  }

  private async onSave(): Promise<void> {
    const devfile = this.state.devfile;
    if (!devfile) {
      return;
    }
    const newWorkspaceObj = Object.assign({}, this.props.workspace);
    newWorkspaceObj.devfile = devfile;
    this.setState({ hasChanges: false });
    try {
      await this.props.onSave(newWorkspaceObj);
      this.setState({
        hasChanges: false,
        hasRequestErrors: false,
        currentRequestError: '',
      });
    } catch (e) {
      const errorMessage = e.toString().replace(/^Error: /gi, '');
      this.setState({
        hasChanges: true,
        hasRequestErrors: true,
        currentRequestError: errorMessage,
      });
    }
  }

  private sortObject(obj: che.WorkspaceDevfile): che.WorkspaceDevfile {
    return Object.keys(obj).sort().reduce((result: che.WorkspaceDevfile, key: string) => {
      result[key] = obj[key];
      return result;
    }, {} as che.WorkspaceDevfile);
  }

  private isEqualObject(a: che.WorkspaceDevfile, b: che.WorkspaceDevfile): boolean {
    return JSON.stringify(this.sortObject(a)) == JSON.stringify(this.sortObject(b as che.WorkspaceDevfile));
  }
}

export default EditorTab;
