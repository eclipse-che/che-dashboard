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

import { InfrastructureNamespaceRowController } from './infrastructure-namespace-row.controller';

export interface IInfrastructureNamespaceRowBindingProperties {
  onSelect: ($name: string) => void;
}

export interface IInfrastructureNamespaceRowComponentBindings {
  onSelect: (eventObj: { $name: string }) => void;
}

interface IInfrastructureNamespaceRowComponentScopeBindings {
  bindings: { [key in keyof IInfrastructureNamespaceRowComponentBindings]: string };
}

export class InfrastructureNamespaceRowComponent implements ng.IComponentOptions, IInfrastructureNamespaceRowComponentScopeBindings {

  templateUrl = 'app/get-started/custom-workspace-tab/infrastructure-namespace-row/infrastructure-namespace-row.html';
  controller = InfrastructureNamespaceRowController;
  controllerAs = 'ctrl';

  bindings = {
    onSelect: '&',
  };

}
