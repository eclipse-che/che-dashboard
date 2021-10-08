/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
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
import { ApplicationLauncher, ApplicationLauncherGroup, ApplicationLauncherItem } from '@patternfly/react-core';
import { ApplicationInfo } from '../../../../store/ExternalApplications';

type Props = {
  applications: ApplicationInfo[];
};
type State = {
  isOpen: boolean;
};

export class ApplicationsMenu extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  private onToggle(isOpen: boolean): void {
    this.setState({
      isOpen: isOpen,
    });
  }

  render(): React.ReactElement {
    const items = this.props.applications.map(app => (
      <ApplicationLauncherItem
        key={app.url}
        isExternal={true}
        icon={<img src={app.icon} />}
        href={app.url}
        target="_blank"
      >
        {app.title}
      </ApplicationLauncherItem>
    ));

    const groups = [(
      <ApplicationLauncherGroup
        key="group"
        label="Red Hat Applications"
      >
        {items}
      </ApplicationLauncherGroup>
    )];

    return (
      <ApplicationLauncher
        aria-label='External Applications'
        isOpen={this.state.isOpen}
        onToggle={isOpen => this.onToggle(isOpen)}
        items={groups}
      />
    );
  }

}
