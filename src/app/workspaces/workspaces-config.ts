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

import {ListWorkspacesCtrl} from './list-workspaces/list-workspaces.controller';
import {CheWorkspaceItem} from './list-workspaces/workspace-item/workspace-item.directive';
import {CheWorkspaceStatus} from './list-workspaces/workspace-status-action/workspace-status.directive';
import {WorkspaceStatusController} from './list-workspaces/workspace-status-action/workspace-status.controller';
import {WorkspaceItemCtrl} from './list-workspaces/workspace-item/workspace-item.controller';
import {WorkspaceEditModeOverlay} from './workspace-edit-mode/workspace-edit-mode-overlay.directive';
import {WorkspaceEditModeToolbarButton} from './workspace-edit-mode/workspace-edit-mode-toolbar-button.directive';
import {NamespaceSelectorSvc} from './create-workspace/ready-to-go-stacks/namespace-selector/namespace-selector.service';
import {ProjectSourceSelectorService} from './create-workspace/ready-to-go-stacks/project-source-selector/project-source-selector.service';
import {AddImportProjectController} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/add-import-project.controller';
import {AddImportProjectService} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/add-import-project.service';
import {AddImportProject} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/add-import-project.directive';
import {ImportBlankProjectService} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-blank-project/import-blank-project.service';
import {ImportGitProjectController} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-git-project/import-git-project.controller';
import {ImportGitProjectService} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-git-project/import-git-project.service';
import {ImportGitProject} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-git-project/import-git-project.directive';
import {ImportZipProjectService} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-zip-project/import-zip-project.service';
import {ImportGithubProjectController} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-github-project/import-github-project.controller';
import {ImportGithubProjectService} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-github-project/import-github-project.service';
import {ImportGithubProject} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-github-project/import-github-project.directive';
import {GithubRepositoryItem} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/import-github-project/github-repository-item/github-repository-item.directive';
import {TemplateSelectorController} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/template-selector/template-selector.controller';
import {TemplateSelectorSvc} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/template-selector/template-selector.service';
import {TemplateSelector} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/template-selector/template-selector.directive';
import {TemplateSelectorItem} from './create-workspace/ready-to-go-stacks/project-source-selector/add-import-project/template-selector/template-selector-item/template-selector-item.directive';
import {EditProjectService} from './create-workspace/ready-to-go-stacks/project-source-selector/edit-project/edit-project.service';
import {ProjectMetadataService} from './create-workspace/ready-to-go-stacks/project-source-selector/edit-project/project-metadata/project-metadata.service';
import {CheWorkspaceRamAllocationSliderController} from './workspace-ram-slider/che-workspace-ram-allocation-slider.controller';
import {CheWorkspaceRamAllocationSlider} from './workspace-ram-slider/che-workspace-ram-allocation-slider.directive';
import {WorkspaceStatus} from './workspace-status/workspace-status.directive';
import {WorkspaceStatusIndicator} from './workspace-status/workspace-status-indicator.directive';
import {CreateWorkspaceSvc} from './create-workspace/create-workspace.service';
import {ShareWorkspaceController} from './share-workspace/share-workspace.controller';
import {ShareWorkspace} from './share-workspace/share-workspace.directive';
import {AddDeveloperController} from './share-workspace/add-developers/add-developers.controller';
import {AddMemberController} from './share-workspace/add-members/add-members.controller';
import {UserItemController} from './share-workspace/user-item/user-item.controller';
import {UserItem} from './share-workspace/user-item/user-item.directive';
import {WorkspaceDetailsConfig} from './workspace-details/workspace-details-config';
import {WorkspaceWarnings} from './workspace-details/warnings/workspace-warnings.directive';
import {WorkspaceWarningsController} from './workspace-details/warnings/workspace-warnings.controller';
import {WorkspacesService} from './workspaces.service';
import {WorkspacePluginsConfig} from './workspace-details/workspace-plugins/workspace-plugins-config';
import {WorkspaceEditorsConfig} from './workspace-details/workspace-editors/workspace-editors-config';

/**
 * @ngdoc controller
 * @name workspaces:WorkspacesConfig
 * @description This class is used for configuring all workspaces stuff.
 * @author Ann Shumilova
 */
export class WorkspacesConfig {

  constructor(register: che.IRegisterService) {

    /* tslint:disable */
    new WorkspaceDetailsConfig(register);
    new WorkspacePluginsConfig(register);
    new WorkspaceEditorsConfig(register);
    /* tslint:enable */

    register.controller('ListWorkspacesCtrl', ListWorkspacesCtrl);
    register.directive('cheWorkspaceItem', CheWorkspaceItem);
    register.controller('WorkspaceItemCtrl', WorkspaceItemCtrl);
    register.directive('cheWorkspaceStatus', CheWorkspaceStatus);
    register.controller('WorkspaceStatusController', WorkspaceStatusController);
    register.directive('workspaceEditModeOverlay', WorkspaceEditModeOverlay);
    register.directive('workspaceEditModeToolbarButton', WorkspaceEditModeToolbarButton);
    register.controller('CheWorkspaceRamAllocationSliderController', CheWorkspaceRamAllocationSliderController);
    register.directive('cheWorkspaceRamAllocationSlider', CheWorkspaceRamAllocationSlider);
    register.directive('workspaceStatus', WorkspaceStatus);
    register.directive('workspaceStatusIndicator', WorkspaceStatusIndicator);
    register.directive('workspaceWarnings', WorkspaceWarnings);
    register.controller('WorkspaceWarningsController', WorkspaceWarningsController);
    register.service('namespaceSelectorSvc', NamespaceSelectorSvc);
    register.service('projectSourceSelectorService', ProjectSourceSelectorService);
    register.controller('AddImportProjectController', AddImportProjectController);
    register.service('addImportProjectService', AddImportProjectService);
    register.directive('addImportProject', AddImportProject);
    register.service('importBlankProjectService', ImportBlankProjectService);
    register.controller('ImportGitProjectController', ImportGitProjectController);
    register.service('importGitProjectService', ImportGitProjectService);
    register.directive('importGitProject', ImportGitProject);
    register.controller('ImportGithubProjectController', ImportGithubProjectController);
    register.service('importGithubProjectService', ImportGithubProjectService);
    register.directive('importGithubProject', ImportGithubProject);
    register.directive('githubRepositoryItem', GithubRepositoryItem);
    register.service('importZipProjectService', ImportZipProjectService);
    register.controller('TemplateSelectorController', TemplateSelectorController);
    register.service('templateSelectorSvc', TemplateSelectorSvc);
    register.directive('templateSelector', TemplateSelector);
    register.directive('templateSelectorItem', TemplateSelectorItem);
    register.service('editProjectService', EditProjectService);
    register.service('projectMetadataService', ProjectMetadataService);
    register.service('createWorkspaceSvc', CreateWorkspaceSvc);
    register.controller('ShareWorkspaceController', ShareWorkspaceController);
    register.directive('shareWorkspace', ShareWorkspace);
    register.controller('AddDeveloperController', AddDeveloperController);
    register.controller('AddMemberController', AddMemberController);
    register.controller('UserItemController', UserItemController);
    register.directive('userItem', UserItem);
    register.service('workspacesService', WorkspacesService);

    // config routes
    register.app.config(['$routeProvider', ($routeProvider: che.route.IRouteProvider) => {
      $routeProvider.accessWhen('/workspaces', {
        title: 'Workspaces',
        templateUrl: 'app/workspaces/list-workspaces/list-workspaces.html',
        controller: 'ListWorkspacesCtrl',
        controllerAs: 'listWorkspacesCtrl'
      });
    }]);
  }
}
