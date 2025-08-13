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

import { Switch, Text } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { CheTooltip } from '@/components/CheTooltip';
import { Navigation } from '@/Layout/Navigation';
import { RootState } from '@/store';
import { selectBranding } from '@/store/Branding/selectors';

export const TEMPORARY_STORAGE_SWITCH_ID = 'temporary-storage-switch';

export type Props = MappedProps & {
  isTemporary: boolean;
  onChange: (isTemporary: boolean) => void;
};
type State = {
  isChecked: boolean;
};

class TemporaryStorageSwitch extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    const { isChecked } = Navigation.pageState[TEMPORARY_STORAGE_SWITCH_ID];

    this.state = {
      isChecked: isChecked !== undefined ? isChecked : this.props.isTemporary,
    };
  }

  componentDidMount() {
    this.handleChange(this.state.isChecked);
  }

  private handleChange(isChecked: boolean): void {
    this.setState({ isChecked });
    this.props.onChange(isChecked);
  }

  render(): React.ReactElement {
    const { branding } = this.props;
    const { isChecked } = this.state;

    return (
      <Switch
        id={TEMPORARY_STORAGE_SWITCH_ID}
        label={
          <div style={{ minWidth: '170px' }}>
            Temporary Storage
            <CheTooltip
              content={
                <>
                  Temporary Storage allows for faster I/O but may have limited storage and is not
                  persistent.
                  <Text>
                    <a rel="noreferrer" target="_blank" href={branding.docs.storageTypes}>
                      Open documentation page
                    </a>
                  </Text>
                </>
              }
            >
              <OutlinedQuestionCircleIcon style={{ margin: '0 5px' }} />
            </CheTooltip>
          </div>
        }
        isChecked={isChecked}
        onChange={isChecked => {
          this.handleChange(isChecked);
          Navigation.pageState[TEMPORARY_STORAGE_SWITCH_ID] = { isChecked };
        }}
      />
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  branding: selectBranding(state),
});

const connector = connect(mapStateToProps);

type MappedProps = ConnectedProps<typeof connector>;

export default connector(TemporaryStorageSwitch);
