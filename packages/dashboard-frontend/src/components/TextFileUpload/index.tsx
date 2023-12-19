/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { FileUpload, FileUploadProps, ValidatedOptions } from '@patternfly/react-core';
import React from 'react';

export type Props = {
  fieldId: string;
  fileNamePlaceholder?: string;
  textAreaPlaceholder?: string;
  validated: ValidatedOptions;
  /**
   * @param content base64 encoded file content
   */
  onChange: (content: string) => void;
};

export type State = {
  content: string | undefined;
  filename: string | undefined;
  file: File | undefined;
  isLoading: boolean;
};

/**
 * A component that allows the user to upload a text file.
 */
export class TextFileUpload extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      content: undefined,
      filename: undefined,
      file: undefined,
      isLoading: false,
    };
  }

  private handleFileInputChange(_event: React.ChangeEvent | React.DragEvent, file: File): void {
    this.setState({
      file,
      filename: file.name,
    });
  }

  private handleClearClick(): void {
    this.setState({
      content: undefined,
      file: undefined,
      filename: undefined,
    });
    this.props.onChange('');
  }

  private handleDataChange(content: string): void {
    this.setState({ content });
    this.props.onChange(btoa(content));
  }

  private handleTextChange(content: string): void {
    this.setState({
      content,
      file: undefined,
      filename: undefined,
    });
    this.props.onChange(btoa(content));
  }

  public render(): React.ReactElement {
    const { fieldId, fileNamePlaceholder, textAreaPlaceholder, validated } = this.props;
    const { content, filename, isLoading } = this.state;

    const fileUploadValidated: FileUploadProps['validated'] =
      validated === ValidatedOptions.warning ? ValidatedOptions.success : validated;

    const isReadOnly = filename !== undefined;
    const allowEditingUploadedText = filename === undefined;

    return (
      <FileUpload
        id={fieldId}
        data-testid={fieldId}
        value={content}
        filename={filename}
        filenamePlaceholder={fileNamePlaceholder}
        onFileInputChange={(event, file) => this.handleFileInputChange(event, file)}
        onClearClick={() => this.handleClearClick()}
        onDataChange={data => this.handleDataChange(data)}
        onTextChange={text => this.handleTextChange(text)}
        browseButtonText="Upload"
        isLoading={isLoading}
        isRequired={true}
        isReadOnly={isReadOnly}
        validated={fileUploadValidated}
        type="text"
        onReadStarted={() => this.setState({ isLoading: true })}
        onReadFinished={() => this.setState({ isLoading: false })}
        onReadFailed={() => this.setState({ isLoading: false })}
        textAreaPlaceholder={textAreaPlaceholder}
        allowEditingUploadedText={allowEditingUploadedText}
      />
    );
  }
}
