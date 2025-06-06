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

import { FormGroup } from '@patternfly/react-core';
import React from 'react';

import overviewStyles from '@/pages/WorkspaceDetails/OverviewTab/index.module.css';

type Props = {
  projects: string[];
};

export class ProjectsFormGroup extends React.PureComponent<Props> {
  public render(): React.ReactElement {
    const projects = this.props.projects.join(', ');
    if (projects.length === 0) {
      return <></>;
    }
    return (
      <FormGroup label="Projects" fieldId="projects">
        <div className={overviewStyles.readonly}>{projects}</div>
      </FormGroup>
    );
  }
}
