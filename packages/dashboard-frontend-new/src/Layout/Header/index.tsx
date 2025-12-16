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

import {
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  PageToggleButton,
} from '@patternfly/react-core';
import { History } from 'history';
import React from 'react';

import HeaderTools from '@/Layout/Header/Tools';

export type Props = {
  history: History;
  isVisible: boolean;
  logo: React.ReactNode;
  logout: () => void;
};
type State = {
  isVisible: boolean;
};

export class Header extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isVisible: this.props.isVisible,
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.isVisible !== this.props.isVisible) {
      this.setState({
        isVisible: this.props.isVisible,
      });
    }
  }

  public render(): React.ReactElement {
    const className = this.state.isVisible ? 'show-header' : 'hide-header';

    return (
      <Masthead className={className}>
        <MastheadMain>
          <MastheadToggle>
            <PageToggleButton isHamburgerButton aria-label="Global navigation" />
          </MastheadToggle>
          <MastheadBrand>
            <MastheadLogo>{this.props.logo}</MastheadLogo>
          </MastheadBrand>
        </MastheadMain>
        <MastheadContent>
          <HeaderTools history={this.props.history} logout={() => this.props.logout()} />
        </MastheadContent>
      </Masthead>
    );
  }
}
