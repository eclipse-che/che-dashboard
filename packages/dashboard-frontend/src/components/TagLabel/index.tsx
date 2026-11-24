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

import { Label } from '@patternfly/react-core';
import React from 'react';

import styles from '@/components/TagLabel/index.module.css';

export type Props = {
  text: string;
  type: 'version' | 'tag' | 'placeholder' | 'default';
};

export class TagLabel extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const { text, type } = this.props;

    // the filled badge shares the size of the outline ones so two of them can
    // sit side by side without looking like different components
    if (type === 'default') {
      return (
        <Label className={styles.label} variant="filled" color="blue" isCompact>
          {text}
        </Label>
      );
    }

    const className = `${styles.label} ${type === 'tag' ? styles.tag : styles.version}`;

    const color = type === 'tag' ? 'orange' : 'blue';

    return (
      <Label className={className} variant="outline" color={color}>
        {text}
      </Label>
    );
  }
}
