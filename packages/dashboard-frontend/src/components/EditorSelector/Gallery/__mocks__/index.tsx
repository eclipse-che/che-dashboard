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

import React from 'react';

import { Props } from '@/components/EditorSelector/Gallery';

export class EditorGallery extends React.PureComponent<Props> {
  public render() {
    const { onSelect } = this.props;

    return (
      <div data-testid="editor-gallery">
        Editor Gallery
        <button onClick={() => onSelect('che-incubator/che-code/latest')}>Select Editor</button>
      </div>
    );
  }
}
