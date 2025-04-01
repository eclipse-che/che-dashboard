/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { WantDelete } from '@/contexts/WorkspaceActions';
import { hasDeleteWarning } from '@/contexts/WorkspaceActions/helpers';
import { DEVWORKSPACE_STORAGE_TYPE_ATTR } from '@/services/devfileApi/devWorkspace/spec/template';
import { DevWorkspaceStatus } from '@/services/helpers/types';
import { constructWorkspace, Workspace } from '@/services/workspace-adapter';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';

// mute console.error
console.error = jest.fn();

describe('Workspace actions helpers', () => {
  describe('hasDeleteWarning', () => {
    let wantDelete: WantDelete;
    let allWorkspaces: Workspace[];

    beforeEach(() => {
      allWorkspaces = [
        constructWorkspace(
          new DevWorkspaceBuilder()
            .withName('dev-wksp-0')
            .withStatus({ phase: DevWorkspaceStatus.STOPPED })
            .withTemplateAttributes({ [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-user' })
            .build(),
        ),
        constructWorkspace(
          new DevWorkspaceBuilder()
            .withName('dev-wksp-1')
            .withStatus({ phase: DevWorkspaceStatus.RUNNING })
            .withTemplateAttributes({ [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-user' })
            .build(),
        ),
        constructWorkspace(
          new DevWorkspaceBuilder()
            .withName('dev-wksp-2')
            .withStatus({ phase: DevWorkspaceStatus.RUNNING })
            .withTemplateAttributes({ [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-workspace' })
            .build(),
        ),
        constructWorkspace(
          new DevWorkspaceBuilder()
            .withName('dev-wksp-3')
            .withStatus({ phase: DevWorkspaceStatus.RUNNING })
            .withTemplateAttributes({ [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'ephemeral' })
            .build(),
        ),
      ];
    });

    describe('Delete a workspaces with Per-user storage type', () => {
      it('should return false if other running workspaces does`t have Per-user storage type', () => {
        wantDelete = ['dev-wksp-1'];

        const _hasDeleteWarning = hasDeleteWarning(allWorkspaces, wantDelete);

        expect(_hasDeleteWarning).toBeFalsy();
      });

      it('should return true if other running workspaces have Per-user storage type', () => {
        wantDelete = ['dev-wksp-0'];

        const _hasDeleteWarning = hasDeleteWarning(allWorkspaces, wantDelete);

        expect(_hasDeleteWarning).toBeTruthy();
      });

      it('should return true if deleting several running workspaces with Per-user storage type', () => {
        wantDelete = ['dev-wksp-1', 'dev-wksp-4'];

        allWorkspaces.push(
          constructWorkspace(
            new DevWorkspaceBuilder()
              .withName('dev-wksp-4')
              .withStatus({ phase: DevWorkspaceStatus.RUNNING })
              .withTemplateAttributes({ [DEVWORKSPACE_STORAGE_TYPE_ATTR]: 'per-user' })
              .build(),
          ),
        );

        const _hasDeleteWarning = hasDeleteWarning(allWorkspaces, wantDelete);

        expect(_hasDeleteWarning).toBeFalsy();
      });
    });

    describe('Delete a workspaces with Per-workspace storage type', () => {
      it('should return false', () => {
        wantDelete = ['dev-wksp-2'];

        const _hasDeleteWarning = hasDeleteWarning(allWorkspaces, wantDelete);

        expect(_hasDeleteWarning).toBeFalsy();
      });
    });

    describe('Delete a workspaces with Ephemeral storage type', () => {
      it('should return false', () => {
        wantDelete = ['dev-wksp-3'];

        const _hasDeleteWarning = hasDeleteWarning(allWorkspaces, wantDelete);

        expect(_hasDeleteWarning).toBeFalsy();
      });
    });
  });
});
