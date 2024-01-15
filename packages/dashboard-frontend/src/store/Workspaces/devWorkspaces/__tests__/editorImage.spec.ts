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

import fs from 'fs';
import { dump, load } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { DevWorkspaceBuilder } from '@/store/__mocks__/devWorkspaceBuilder';
import {
  getEditorImage,
  updateDevWorkspaceTemplate,
  updateEditorDevfile,
} from '@/store/Workspaces/devWorkspaces/editorImage';

describe('Update editor image', () => {
  it('should return the editor image param', () => {
    const devWorkspace = new DevWorkspaceBuilder()
      .withTemplateAttributes({
        'dw.metadata.annotations': {
          'che.eclipse.org/devfile-source': dump({
            factory: {
              params:
                'editor-image=test-images/che-code:tag&url=https://github.com/eclipse-che/che-dashboard',
            },
          }),
        },
      })
      .build();

    const editorImageParam = getEditorImage(devWorkspace);

    expect(editorImageParam).toStrictEqual('test-images/che-code:tag');
  });

  it('should update the target image(editor devfile)', () => {
    const customEditorImage = 'test-images/che-code:tag';

    const editorContent = fs.readFileSync(
      __dirname + '/fixtures/test-editor-devfile.yaml',
      'utf-8',
    );

    const customEditorContent = updateEditorDevfile(editorContent, customEditorImage);

    const output = fs.readFileSync(
      __dirname + '/fixtures/test-editor-devfile-with-custom-image.yaml',
      'utf-8',
    );

    expect(customEditorContent).toStrictEqual(output);
  });

  it('should update the target image(devWorkspace template)', () => {
    const customEditorImage = 'test-images/che-code:tag';

    const devWorkspaceTemplate = load(
      fs.readFileSync(__dirname + '/fixtures/test-devworkspace-template.yaml', 'utf-8'),
    ) as devfileApi.DevWorkspaceTemplate;

    const customEditorContent = updateDevWorkspaceTemplate(devWorkspaceTemplate, customEditorImage);

    const output = load(
      fs.readFileSync(
        __dirname + '/fixtures/test-devworkspace-template-with-custom-image.yaml',
        'utf-8',
      ),
    );

    expect(customEditorContent).toStrictEqual(output);
  });
});
