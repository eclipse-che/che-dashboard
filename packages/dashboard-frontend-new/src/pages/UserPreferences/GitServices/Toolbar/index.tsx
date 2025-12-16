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
  Button,
  ButtonVariant,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import React from 'react';

import { IGitOauth } from '@/store/GitOauthConfig';

export type Props = {
  isDisabled: boolean;
  selectedItems: IGitOauth[];
  onRevokeButton: () => void;
};

export class GitServicesToolbar extends React.PureComponent<Props> {
  public handleRevokeButtonClick(): void {
    this.props.onRevokeButton();
  }

  render(): React.ReactNode {
    const { isDisabled, selectedItems } = this.props;

    const buttonDisabled = isDisabled || selectedItems.length === 0;

    return (
      <React.Fragment>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button
                variant={ButtonVariant.danger}
                isDisabled={buttonDisabled}
                data-testid="bulk-revoke-button"
                onClick={() => this.handleRevokeButtonClick()}
              >
                Revoke
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </React.Fragment>
    );
  }
}
