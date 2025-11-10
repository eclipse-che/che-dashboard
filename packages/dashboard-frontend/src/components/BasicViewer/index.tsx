/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import styles from '@/components/BasicViewer/index.module.css';

export type Props = {
  value: string;
  id: string;
};

export class BasicViewer extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    return (
      <div className={styles.basicViewer}>
        <CodeMirror
          id={this.props.id}
          readOnly={true}
          basicSetup={false}
          value={this.props.value}
        />
      </div>
    );
  }
}
