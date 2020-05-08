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

import { IInfrastructureNamespaceRowComponentBindings } from './infrastructure-namespace-row.component';
import { CheKubernetesNamespace } from '../../../../components/api/che-kubernetes-namespace.factory';
import { IChePfTextInputProperties } from '../../../../components/che-pf-widget/text-input/che-pf-text-input.directive';
import { IChePfSelectProperties } from '../../../../components/che-pf-widget/select/che-pf-select-typeahead.directive';

export class InfrastructureNamespaceRowController implements IInfrastructureNamespaceRowComponentBindings {

  static $inject = [
    'cheKubernetesNamespace',
  ];

  // component bindings
  onSelect: (eventObj: { $name: string }) => void;

  // template fields
  namespacesNumber: number = 0;
  namespaceInput: IChePfTextInputProperties;
  namespaceSelect: IChePfSelectProperties<string>;
  infrastructureNamespaceHint: string;

  // injected services
  private cheKubernetesNamespace: CheKubernetesNamespace;

  constructor(
    cheKubernetesNamespace: CheKubernetesNamespace,
  ) {
    this.cheKubernetesNamespace = cheKubernetesNamespace;

    this.namespaceInput = {
      config: {
        name: 'namespace',
      },
      value: '',
      onChange: name => { },
    };
    this.namespaceSelect = {
      config: {
        items: [],
        placeholder: 'Select a namespace',
        default: '',
      },
      onSelect: name => this.onSelected(name),
    };
  }

  $onInit(): void {
    this.cheKubernetesNamespace.fetchKubernetesNamespace().then(namespaces => this.initNamespaceSelect(namespaces));
  }

  private initNamespaceSelect(kubernetesNamespaces: che.IKubernetesNamespace[]): void {
    const namespaces = [];
    let defaultNamespace = undefined;

    kubernetesNamespaces.forEach(namespace => {
      const displayName = this.getNamespaceName(namespace);
      namespaces.push(displayName);
      if (defaultNamespace === undefined || namespace.attributes.default) {
        defaultNamespace = displayName;
      }
    });
    namespaces.sort();
    if (!defaultNamespace) {
      defaultNamespace = namespaces[0];
    }

    if (namespaces.length === 1) {
      this.namespaceInput.value = defaultNamespace;
    } else {
      this.namespaceSelect.config.items = namespaces;
      this.namespaceSelect.config.default = defaultNamespace;
    }

    this.namespacesNumber = kubernetesNamespaces.length;

    this.infrastructureNamespaceHint = this.cheKubernetesNamespace.getHintDescription();

    this.onSelected(defaultNamespace);
  }

  private getNamespaceName(namespace: che.IKubernetesNamespace): string {
    return namespace.attributes.displayName || namespace.name;
  }

  private onSelected(name: string): void {
    this.onSelect({ '$name': name });
  }

}
