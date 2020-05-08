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
import { TemporaryStorageRowComponent } from './temporary-storage-row/temporary-storage-row.component';
import { WorkspaceNameRowComponent } from './workspace-name-row/workspace-name-row.component';
import { DevfileEditorRowComponent } from './devfile-editor-row/devfile-editor-row.component';

export class CustomWorkspaceTabConfig {

  constructor(register: che.IRegisterService) {
    register.component('devfileSelectRow', DevfileSelectRowComponent);
    register.component('infrastructureNamespaceRow', InfrastructureNamespaceRowComponent);
    register.component('temporaryStorageRow', TemporaryStorageRowComponent);
    register.component('workspaceNameRow', WorkspaceNameRowComponent);
    register.component('devfileEditorRow', DevfileEditorRowComponent);
    register.controller('CustomWorkspaceTabController', CustomWorkspaceTabController);
    register.directive('customWorkspaceTab', CustomWorkspaceTabDirective);
  }

}
