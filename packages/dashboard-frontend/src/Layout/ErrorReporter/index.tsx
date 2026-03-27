/*
 * Copyright (c) 2018-2026 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Page, PageSection } from '@patternfly/react-core';
import React from 'react';

import styles from '@/Layout/ErrorReporter/index.module.css';

type Props = {
  children?: React.ReactElement;
};

export class ErrorReporter extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    return (
      <Page>
        <PageSection isFilled={true} className={styles.pageSection}>
          {this.props.children}
        </PageSection>
      </Page>
    );
  }
}
