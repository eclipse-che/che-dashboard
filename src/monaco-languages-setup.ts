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

const LANGUAGE_ID = 'yaml';
const MODEL_URI = 'inmemory://model.yaml';
const yamlService = (window as any).yamlService;
const m2p = new (window as any).monacoConversion.MonacoToProtocolConverter();
const p2m = new (window as any).monacoConversion.ProtocolToMonacoConverter();

function createDocument(model) {
  return (window as any).yamlLanguageServer.TextDocument.create(
    MODEL_URI,
    model.getModeId(),
    model.getVersionId(),
    model.getValue()
  );
}

function registerYAMLCompletion() {
  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    provideCompletionItems(model, position, context) {
      const document = createDocument(model);
      return yamlService
        .doComplete(document, m2p.asPosition(position.lineNumber, position.column), true)
        .then(list => {
          const completionResult = p2m.asCompletionResult(list);
          if (!completionResult || !completionResult.suggestions) {
            return completionResult;
          }
          // convert completionResult into suggestions
          const defaultInsertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
          const suggestions = completionResult.suggestions.map(suggestion => {
            return Object.assign(suggestion, {
              insertTextRules: suggestion.insertTextRules ? suggestion.insertTextRules : defaultInsertTextRules,
              sortText: createSortText(suggestion.insertText)
            });
          });
          return { suggestions };
        });
    },

    resolveCompletionItem(model, position, item) {
      return yamlService
        .doResolve(m2p.asCompletionItem(item))
        .then(result => p2m.asCompletionItem(result));
    },
  });

  const sortTextCache = {};
  function createSortText(pluginId: string): string {
    if (sortTextCache[pluginId]) {
      return sortTextCache[pluginId];
    }

    const [publisher, name, version] = pluginId.split('/');
    const semverRE = /^\d+?\.\d+?\.\d+?/;

    let versionText: string;
    if (semverRE.test(version)) {
      let [major, minor, rest] = version.split('.');
      // align version numbers length with leading zeros
      major = addLeadingZeros(major);
      minor = addLeadingZeros(minor);
      const patch = rest.replace(/^(\d+)/, addLeadingZeros);

      versionText = `${major}.${minor}.${patch}`;
    } else {
      // prefix version with '-' to move `latest`, `next` and other on the top of the list
      let prefix = '-';

      // sort common version names
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
  }

  function addLeadingZeros(number: string): string {
    while (number.length < 4) {
      number = '0' + number;
    }
    return number;
  }
}

function registerYAMLDocumentSymbols() {
  monaco.languages.registerDocumentSymbolProvider(LANGUAGE_ID, {
    provideDocumentSymbols(model) {
      const document = createDocument(model);
      return p2m.asSymbolInformations(yamlService.findDocumentSymbols(document));
    },
  });
}

function registerYAMLHover() {
  monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(model, position) {
      const doc = createDocument(model);
      return yamlService
        .doHover(doc, m2p.asPosition(position.lineNumber, position.column))
        .then((hover) => p2m.asHover(hover));
    },
  });
}

registerYAMLCompletion();
registerYAMLDocumentSymbols();
registerYAMLHover();
