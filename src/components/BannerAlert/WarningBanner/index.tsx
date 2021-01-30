/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { Banner } from '@patternfly/react-core';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { AppState } from '../../../store';

type Props = MappedProps & {};

type State = {};

class WarningBannerAlert extends React.PureComponent<Props, State> {

  render() {
    const warningMessage = this.props.brandingStore.data.header?.warning;
    if (!warningMessage) {
      return null;
    }

    return (
      <Banner className="pf-u-text-align-center" variant="warning">
        {warningMessage}
      </Banner>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  brandingStore: state.branding,
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;
export default connector(WarningBannerAlert);
