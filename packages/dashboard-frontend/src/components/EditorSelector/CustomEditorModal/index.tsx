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
  ButtonVariant,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, InfoIcon } from '@patternfly/react-icons';
import React from 'react';

import {
  isValidEditorName,
  MAX_EDITOR_NAME_LENGTH,
  parseEditorDefinition,
} from '@/components/EditorSelector/CustomEditorModal/helpers';

export type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (editorName: string, editorDefinition: string | undefined, editorImage: string) => void;
};

export type State = {
  editorName: string;
  editorDefinition: string;
  /** Whether the definition parses as an editor devfile or a reference to one. */
  isDefinitionValid: boolean;
  containerImage: string;
};

const EMPTY_STATE: State = {
  editorName: '',
  editorDefinition: '',
  isDefinitionValid: false,
  containerImage: '',
};

export class CustomEditorModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = EMPTY_STATE;
  }

  public componentDidUpdate(prevProps: Readonly<Props>): void {
    // the modal stays mounted, so the fields are cleared every time it opens
    if (this.props.isOpen && !prevProps.isOpen) {
      this.setState(EMPTY_STATE);
    }
  }

  /**
   * The editor name is the `metadata.name` of the editor devfile, so a
   * definition that carries one wins over whatever was typed before.
   */
  private handleDefinitionChange(editorDefinition: string): void {
    // parsed once here rather than on every render
    const { isValid, name } = parseEditorDefinition(editorDefinition);

    this.setState({
      editorDefinition,
      isDefinitionValid: isValid,
      editorName: name !== undefined ? name : this.state.editorName,
    });
  }

  private getNameValidated(): ValidatedOptions {
    const { editorName } = this.state;
    if (editorName.length === 0) {
      return ValidatedOptions.default;
    }
    return isValidEditorName(editorName) ? ValidatedOptions.success : ValidatedOptions.error;
  }

  private getDefinitionValidated(): ValidatedOptions {
    if (!this.hasDefinition()) {
      return ValidatedOptions.default;
    }
    return this.state.isDefinitionValid ? ValidatedOptions.success : ValidatedOptions.error;
  }

  private hasDefinition(): boolean {
    return this.state.editorDefinition.trim().length > 0;
  }

  private isValid(): boolean {
    const { editorName, containerImage } = this.state;

    if (!isValidEditorName(editorName)) {
      return false;
    }
    if (this.getDefinitionValidated() === ValidatedOptions.error) {
      return false;
    }
    // without a definition the default editor is used, and the only thing left
    // to describe the editor is the image
    return this.hasDefinition() || containerImage.trim().length > 0;
  }

  private handleSave(): void {
    const { editorName, editorDefinition, containerImage } = this.state;

    this.props.onSave(
      editorName.trim(),
      editorDefinition.trim() || undefined,
      containerImage.trim(),
    );
  }

  render(): React.ReactElement {
    const { isOpen } = this.props;
    const { editorName, editorDefinition, containerImage } = this.state;

    const nameValidated = this.getNameValidated();
    const definitionValidated = this.getDefinitionValidated();

    return (
      <Modal
        isOpen={isOpen}
        onClose={() => this.props.onClose()}
        aria-labelledby="custom-editor-title"
        aria-describedby="custom-editor-body"
        data-testid="custom-editor-modal"
      >
        <ModalHeader title="Custom Editor" labelId="custom-editor-title" />
        <ModalBody id="custom-editor-body">
          <Form onSubmit={e => e.preventDefault()}>
            <FormGroup label="Editor Name" isRequired fieldId="editor-name">
              <TextInput
                type="text"
                id="editor-name"
                value={editorName}
                validated={nameValidated}
                onChange={(_event, value) => this.setState({ editorName: value })}
                placeholder="Enter editor name"
                data-testid="custom-editor-name-input"
              />
              {nameValidated === ValidatedOptions.error && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      variant="error"
                      icon={<ExclamationCircleIcon />}
                      data-testid="custom-editor-name-error"
                    >
                      {`The name has to be a valid DevWorkspace template name: lowercase letters, digits, '-' and '.', starting and ending with a letter or a digit, up to ${MAX_EDITOR_NAME_LENGTH} characters.`}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>

            <FormGroup label="Editor Definition" fieldId="editor-definition">
              <TextArea
                id="editor-definition"
                value={editorDefinition}
                validated={definitionValidated}
                onChange={(_event, value) => this.handleDefinitionChange(value)}
                placeholder={
                  'An editor devfile, or a reference to one:\n\nreference: https://.../devfile.yaml\noverride:\n  containers:\n    - name: che-code-injector\n      memoryLimit: 2048Mi'
                }
                rows={10}
                data-testid="custom-editor-definition-textarea"
              />
              <FormHelperText>
                <HelperText>
                  {definitionValidated === ValidatedOptions.error ? (
                    <HelperTextItem
                      variant="error"
                      icon={<ExclamationCircleIcon />}
                      data-testid="custom-editor-definition-error"
                    >
                      The definition has to be a YAML document: an editor devfile, or a reference to
                      one with optional overrides.
                    </HelperTextItem>
                  ) : (
                    <HelperTextItem icon={<InfoIcon />} data-testid="custom-editor-definition-hint">
                      Default editor will be used if no definition is provided.
                    </HelperTextItem>
                  )}
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <FormGroup
              label="Container Image"
              isRequired={!this.hasDefinition()}
              fieldId="container-image"
            >
              <TextInput
                type="text"
                id="container-image"
                value={containerImage}
                onChange={(_event, value) => this.setState({ containerImage: value })}
                placeholder="e.g., quay.io/example/editor:latest"
                data-testid="custom-editor-image-input"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.primary}
            onClick={() => this.handleSave()}
            isDisabled={!this.isValid()}
            data-testid="custom-editor-save-button"
          >
            Save Configuration
          </Button>
          <Button
            variant={ButtonVariant.secondary}
            onClick={() => this.props.onClose()}
            data-testid="custom-editor-cancel-button"
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}
