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
import { connect, ConnectedProps } from 'react-redux';
import { AppState } from '../../store';
import { DisposableCollection } from '../../services/helpers/disposable';
import { ProtocolToMonacoConverter, MonacoToProtocolConverter } from 'monaco-languageclient/lib/monaco-converter';
import { languages, IEditorConstructionOptions } from 'monaco-editor-core/esm/vs/editor/editor.main';
import { TextDocument, getLanguageService } from 'yaml-language-server';
import { initDefaultEditorTheme } from '../../services/monacoThemeRegister';
import { safeLoad } from 'js-yaml';
import stringify, { language, conf } from '../../services/helpers/editor';
import $ from 'jquery';

import './DevfileEditor.styl';

interface Editor {
  getValue(): string;

  getModel(): any;
}

const LANGUAGE_ID = 'yaml';
const YAML_SERVICE = 'yamlService';
const MONACO_CONFIG: IEditorConstructionOptions = {
  language: 'yaml',
  wordWrap: 'on',
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
};

type Props =
  MappedProps
  & {
    devfile: che.WorkspaceDevfile;
    decorationPattern?: string;
    onChange: (devfile: che.WorkspaceDevfile, isValid: boolean) => void;
    isReadonly?: boolean;
  };
type State = {
  errorMessage: string;
};

export class DevfileEditor extends React.PureComponent<Props, State> {
  public static EDITOR_THEME: string | undefined;
  private readonly toDispose = new DisposableCollection();
  private handleResize: () => void;
  private editor: any;
  private readonly yamlService: any;
  private m2p = new MonacoToProtocolConverter();
  private p2m = new ProtocolToMonacoConverter();
  private createDocument = (model): TextDocument => TextDocument.create(
    'inmemory://model.yaml',
    model.getModeId(),
    model.getVersionId(),
    model.getValue(),
  );
  private skipNextOnChange: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      errorMessage: '',
    };

    // lazy initialization
    if (!window[YAML_SERVICE]) {
      this.yamlService = getLanguageService(() => Promise.resolve(''), {} as any);
      window[YAML_SERVICE] = this.yamlService;
    } else {
      this.yamlService = window[YAML_SERVICE];
      return;
    }
    if (!DevfileEditor.EDITOR_THEME) {
      // define the default
      DevfileEditor.EDITOR_THEME = initDefaultEditorTheme();
    }
    if (languages) {
      // register the YAML language with Monaco
      languages.register({
        id: LANGUAGE_ID,
        extensions: ['.yaml', '.yml'],
        aliases: ['YAML'],
        mimetypes: ['application/json'],
      });
      languages.setMonarchTokensProvider(LANGUAGE_ID, language);
      languages.setLanguageConfiguration(LANGUAGE_ID, conf);
      // register language server providers
      this.registerLanguageServerProviders(languages);
    }
    const jsonSchema = this.props.devfileRegistries.schema || {};
    const items = this.props.plugins.plugins;
    const properties = jsonSchema?.oneOf && jsonSchema.oneOf[0] ? jsonSchema.oneOf[0].properties : jsonSchema.properties;
    const components = properties ? properties.components : undefined;
    if (components) {
      const mountSources = components.items.properties.mountSources;
      // mount sources is specific only for some of component types but always appears
      // patch schema and remove default value for boolean mount sources to avoid their appearing during the completion
      if (mountSources && mountSources.default === 'false') {
        delete mountSources.default;
      }
      jsonSchema.additionalProperties = true;
      if (!components.defaultSnippets) {
        components.defaultSnippets = [];
      }
      const pluginsId: string[] = [];
      items.forEach((item: che.Plugin) => {
        const id = `${item.publisher}/${item.name}/latest`;
        if (pluginsId.indexOf(id) === -1 && item.type !== 'Che Editor') {
          pluginsId.push(id);
          components.defaultSnippets.push({
            label: item.displayName,
            description: item.description,
            body: { id: id, type: 'chePlugin' },
          });
        } else {
          pluginsId.push(item.id);
        }
      });
      if (components.items && components.items.properties) {
        if (!components.items.properties.id) {
          components.items.properties.id = {
            type: 'string',
            description: 'Plugin\'s/Editor\'s id.',
          };
        }
        components.items.properties.id.examples = pluginsId;
      }
    }
    const schemas = [{ uri: 'inmemory:yaml', fileMatch: ['*'], schema: jsonSchema }];
    // add the devfile schema into yaml language server configuration
    this.yamlService.configure({ validate: true, schemas, hover: true, completion: true });
  }

  public updateContent(devfile: che.WorkspaceDevfile): void {
    if (!this.editor) {
      return;
    }
    this.skipNextOnChange = true;
    const doc = this.editor.getModel();
    doc.setValue(stringify(devfile));
  }

  public componentDidUpdate(): void {
    if (this.handleResize) {
      this.handleResize();
    }
  }

  // This method is called when the component is first added to the document
  public componentDidMount(): void {
    const element = $('.devfile-editor .monaco').get(0);
    if (element) {
      const value = stringify(this.props.devfile);
      MONACO_CONFIG.readOnly = this.props.isReadonly !== undefined ? this.props.isReadonly : false;
      this.editor = monaco.editor.create(element, Object.assign(
        { value },
        MONACO_CONFIG,
      ));
      const doc = this.editor.getModel();
      doc.updateOptions({ tabSize: 2 });

      const handleResize = (): void => {
        const layout = { height: element.offsetHeight, width: element.offsetWidth };
        // if the element is hidden
        if (layout.height === 0 || layout.width === 0) {
          return;
        }
        this.editor.layout(layout);
      };
      this.handleResize = handleResize;
      window.addEventListener('resize', handleResize);
      this.toDispose.push({
        dispose: () => {
          window.removeEventListener('resize', handleResize);
        },
      });

      let oldDecorationIds: string[] = []; // Array containing previous decorations identifiers.
      const updateDecorations = (): void => {
        if (this.props.decorationPattern) {
          oldDecorationIds = this.editor.deltaDecorations(oldDecorationIds, this.getDecorations());
        }
      };
      updateDecorations();
      doc.onDidChangeContent(() => {
        updateDecorations();
        this.onChange(this.editor.getValue(), true);
      });
      // init language server validation
      this.initLanguageServerValidation(this.editor);
    }

    const handleMessage = (event: MessageEvent): void => {
      if (typeof event.data !== 'string') {
        return;
      }
      const { data } = event;
      if ((data === 'show-navbar' || data === 'hide-navbar' || data === 'toggle-navbar') && this.handleResize) {
        this.handleResize();
      }
    };
    window.addEventListener('message', handleMessage, false);
    this.toDispose.push({
      dispose: () => {
        window.removeEventListener('message', handleMessage, false);
      },
    });
  }

  // This method is called when the component is removed from the document
  public componentWillUnmount(): void {
    this.toDispose.dispose();
  }

  public render(): React.ReactElement {
    const href = this.props.branding.data.docs.devfile;
    const { errorMessage } = this.state;

    let message = errorMessage;
    if (this.props.isReadonly !== undefined && this.props.isReadonly === true) {
      message = 'DevWorkspace editor support has not been enabled. Editor is in Readonly mode.';
    }

    return (
      <div className='devfile-editor'>
        <div className='monaco'>&nbsp;</div>
        <div className='error'>{message}</div>
        <a target='_blank' rel='noopener noreferrer' href={href}>Devfile Documentation</a>
      </div>
    );
  }

  private getDecorations(): monaco.editor.IModelDecoration[] {
    const decorations: monaco.editor.IModelDecoration[] = [];
    if (this.props.decorationPattern) {
      const decorationRegExp = new RegExp(this.props.decorationPattern, 'img');
      const model = this.editor.getModel();
      const value = this.editor.getValue();
      let match = decorationRegExp.exec(value);
      while (match) {
        const startPosition = model.getPositionAt(match.index);
        const endPosition = model.getPositionAt(match.index + match[0].length);
        decorations.push({
          range: {
            startLineNumber: startPosition.lineNumber,
            startColumn: startPosition.column,
            endLineNumber: endPosition.lineNumber,
            endColumn: endPosition.column,
          },
          options: {
            inlineClassName: 'devfile-editor-decoration',
          },
        } as monaco.editor.IModelDecoration);
        match = decorationRegExp.exec(value);
      }
    }
    return decorations;
  }

  private onChange(newValue: string, isValid: boolean): void {
    if (this.skipNextOnChange) {
      this.skipNextOnChange = false;
      return;
    }

    let devfile: che.WorkspaceDevfile;
    try {
      devfile = safeLoad(newValue);
    } catch (e) {
      console.error('DevfileEditor parse error', e);
      return;
    }
    this.props.onChange(devfile, isValid);
  }

  private registerLanguageServerProviders(languages: any): void {
    const createDocument = this.createDocument;
    const yamlService = this.yamlService;
    const m2p = this.m2p;
    const p2m = this.p2m;

    const sortTextCache = {};
    const createSortText = (pluginId: string): string => {
      if (sortTextCache[pluginId]) {
        return sortTextCache[pluginId];
      }
      const [publisher, name, version] = pluginId.split('/');
      const semverRE = /^\d+?\.\d+?\.\d+?/;
      let versionText: string;
      if (semverRE.test(version)) {
        let [major, minor, rest] = version.split('.');
        major = addLeadingZeros(major);
        minor = addLeadingZeros(minor);
        rest = rest.replace(/^(\d+)/, addLeadingZeros);
        versionText = `${major}.${minor}.${rest}`;
      } else {
        let prefix = '-';
        if (version === 'latest') {
          prefix += '0';
        } else if (version === 'next') {
          prefix += '1';
        } else if (version === 'nightly') {
          prefix += '2';
        }
        versionText = `${prefix}${version}`;
      }
      const sortText = `${publisher}/${name}/${versionText}`;
      sortTextCache[pluginId] = sortText;
      return sortText;
    };
    const addLeadingZeros = (number: string): string => {
      while (number.length < 4) {
        number = '0' + number;
      }
      return number;
    };

    languages.registerCompletionItemProvider(LANGUAGE_ID, {
      provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position) {
        const document = createDocument(model);
        return yamlService.doComplete(document, m2p.asPosition(position.lineNumber, position.column), true)
          .then(list => {
            const completionResult = p2m.asCompletionResult(list, {
              startColumn: position.column,
              startLineNumber: position.lineNumber,
              endColumn: position.column,
              endLineNumber: position.lineNumber
            } as monaco.IRange);
            if (!completionResult || !completionResult.suggestions) {
              return completionResult;
            }
            // convert completionResult into suggestions
            const defaultInsertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
            const suggestions = completionResult.suggestions.map(suggestion => {
              return Object.assign(suggestion, {
                insertTextRules: suggestion.insertTextRules ? suggestion.insertTextRules : defaultInsertTextRules,
                sortText: createSortText(suggestion.insertText),
              });
            });
            return { suggestions };
          });
      },
      async resolveCompletionItem(model: monaco.editor.ITextModel, range: monaco.IRange, item: monaco.languages.CompletionItem) {
        return yamlService.doResolve(m2p.asCompletionItem(item))
          .then(result => p2m.asCompletionItem(result, range));
      },
    } as any);
    languages.registerDocumentSymbolProvider(LANGUAGE_ID, {
      provideDocumentSymbols(model: any) {
        return p2m.asSymbolInformations(yamlService.findDocumentSymbols(createDocument(model)));
      },
    });
    languages.registerHoverProvider(LANGUAGE_ID, {
      provideHover(model: any, position: any) {
        return yamlService.doHover(createDocument(model), m2p.asPosition(position.lineNumber, position.column))
          .then(hover => p2m.asHover(hover));
      },
    });
  }

  private initLanguageServerValidation(editor: Editor): void {
    const model = editor.getModel();
    let validationTimer: number;

    model.onDidChangeContent(() => {
      const document = this.createDocument(model);
      this.setState({ errorMessage: '' });
      if (validationTimer) {
        clearTimeout(validationTimer);
      }
      validationTimer = setTimeout(() => {
        this.yamlService.doValidation(document, false).then(diagnostics => {
          const markers = this.p2m.asDiagnostics(diagnostics) as monaco.editor.IMarkerData[] | undefined;
          let errorMessage = '';
          if (markers !== undefined && markers.length > 0) {
            const { message, startLineNumber, startColumn } = markers[0];
            if (startLineNumber && startColumn) {
              errorMessage += `line[${startLineNumber}] column[${startColumn}]: `;
            }
            errorMessage += `Error. ${message}`;
          }
          if (errorMessage) {
            this.setState({ errorMessage: `Error. ${errorMessage}` });
            this.onChange(editor.getValue(), false);
          }
          monaco.editor.setModelMarkers(model, 'default', markers ? markers : []);
        });
      });
    });
  }
}

const mapStateToProps = (state: AppState) => ({
  branding: state.branding,
  devfileRegistries: state.devfileRegistries,
  plugins: state.plugins,
});

const connector = connect(
  mapStateToProps,
  null,
  null,
  { forwardRef: true },
);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(DevfileEditor);
