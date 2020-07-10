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

import { CustomWorkspaceTabController } from './custom-workspace-tab.controller';
import { CustomWorkspaceTabDirective } from './custom-workspace-tab.directive';
import { DevfileSelectRowComponent } from './devfile-select-row/devfile-select-row.component';
import { InfrastructureNamespaceRowComponent } from './infrastructure-namespace-row/infrastructure-namespace-row.component';
import { StorageTypeRowComponent } from './storage-type-row/storage-type-row.component';
import { WorkspaceNameRowComponent } from './workspace-name-row/workspace-name-row.component';

export class CustomWorkspaceTabConfig {

  constructor(register: che.IRegisterService) {
    register.component('devfileSelectRow', DevfileSelectRowComponent);
    register.component('infrastructureNamespaceRow', InfrastructureNamespaceRowComponent);
    register.component('storageTypeRow', StorageTypeRowComponent);
    register.component('workspaceNameRow', WorkspaceNameRowComponent);
    register.controller('CustomWorkspaceTabController', CustomWorkspaceTabController);
    register.directive('customWorkspaceTab', CustomWorkspaceTabDirective);
  }

}
