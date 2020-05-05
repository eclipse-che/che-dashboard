/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

declare const require: Function;
require('regenerator-runtime');

const MODEL_URI = 'inmemory://model.yaml';
const MONACO_URI = (monaco.Uri as any).parse(MODEL_URI);

interface IEditor {
  render: Function;
  getValue: () => string;
  onDidBlurEditorWidget: Function;
  getModel(): any;
  getCursor(): ICursorPos;
  setCursor(cursorPos: ICursorPos): void;
}

interface ICursorPos {
  line: number;
  column: number;
}

interface IEditorState {
  isValid: boolean;
  errors: Array<string>;
}

/**
 * @ngdoc controller
 * @name components.directive:cheEditorController
 * @description This class is handling the controller for the editor.
 * @author Oleksii Orel
 */
export class CheEditorController {

  static $inject = ['$timeout'];

  $timeout: ng.ITimeoutService;

  setEditorValue: (content: string) => void;

  private editorForm: ng.IFormController;
  private editorState: IEditorState;
  private onContentChange: Function;
  private editorMode: string;
  private editorDecorationPattern: string;
  /**
   * Custom validator callback.
   */
  private validator: Function;
  /**
   * Is editor read only.
   */
  private editorReadOnly: boolean;
  /**
   * Editor options object.
   */
  private editorOptions: {
    mode?: string;
    readOnly?: boolean;
    wordWrap?: string;
    lineNumbers?: string;
    decorationPattern?: string;
    onLoad: Function;
  };

  /**
   * Default constructor that is using resource injection
   */
  constructor($timeout: ng.ITimeoutService) {
    this.$timeout = $timeout;
  }

  $onInit(): void {
    this.editorState = { isValid: true, errors: [] };
    this.editorOptions = {
      mode: angular.isString(this.editorMode) ? this.editorMode : 'application/json',
      readOnly: this.editorReadOnly ? this.editorReadOnly : false,
      lineNumbers: 'on',
      wordWrap: 'on',
      onLoad: (editor: IEditor) => {
        const doc = editor.getModel();
        this.setEditorValue = (content: string) => {
          doc.setValue(content);
        };
        doc.onDidChangeContent(() => {
          this.editorState.errors.length = 0;
          if (angular.isFunction(this.validator)) {
            try {
              const customValidatorState: IEditorState = this.validator();
              if (customValidatorState && angular.isArray(customValidatorState.errors)) {
                customValidatorState.errors.forEach((error: string) => {
                  this.editorState.errors.push(error);
                });
              }
            } catch (error) {
              this.editorState.errors.push(error.toString());
            }
          }
          this.updateState(editor.getValue());
          this.languageServerValidation(editor);
        });
      }
    };
    if (this.editorDecorationPattern) {
      this.editorOptions.decorationPattern = this.editorDecorationPattern;
    }
  }

  private updateState(value: string): void {
    this.editorState.isValid = this.editorState.errors.length === 0;
    this.editorForm.$setValidity('custom-validator', this.editorState.isValid, null);
    if (angular.isFunction(this.onContentChange)) {
      this.onContentChange({editorState: this.editorState, value});
    }
  }

  private languageServerValidation(editor: IEditor): void {
    const model = editor.getModel();
    const yamlService = (window as any).yamlService;
    const p2m = new (window as any).monacoConversion.ProtocolToMonacoConverter();
    const pendingValidationRequests = new Map();
    const cleanDiagnostics = () =>
      monaco.editor.setModelMarkers(monaco.editor.getModel(MONACO_URI), 'default', []);
    const createDocument = model => (window as any).yamlLanguageServer.TextDocument.create(
      MODEL_URI,
      model.getModeId(),
      model.getVersionId(),
      model.getValue()
    );
    const cleanPendingValidation = (document) => {
      const request = pendingValidationRequests.get(document.uri);
      if (request !== undefined) {
        clearTimeout(request);
        pendingValidationRequests.delete(document.uri);
      }
    };
    const doValidate = (document) => {
      if (document.getText().length === 0) {
        cleanDiagnostics();
        return;
      }
      return yamlService.doValidation(document, false).then((diagnostics) => {
        const markers = p2m.asDiagnostics(diagnostics);
        let errorMessage = '';
        if (markers && markers[0]) {
          const {message, startLineNumber, startColumn} = (markers[0] as any);
          if (startLineNumber && startColumn) {
            errorMessage += `line[${startLineNumber}] column[${startColumn}]: `
          }
          errorMessage += `Error. ${message}`;
        }
        if (errorMessage) {
          this.editorState.errors.push(errorMessage);
          if (this.editorState.isValid) {
            this.updateState(editor.getValue());
          }
        }
        monaco.editor.setModelMarkers(model, 'default', markers);
      });
    };

    const document = createDocument(model);
    cleanPendingValidation(document);
    doValidate(document);
  }
}
