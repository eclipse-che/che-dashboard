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

import { api } from '@eclipse-che/common';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  ContentVariants,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  PageSection,
} from '@patternfly/react-core';
import { CheckCircleIcon, EllipsisVIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';

import { getFormattedDate } from '@/services/helpers/dates';

export type Props = {
  tokens: api.DeviceAuthToken[];
  isDisabled: boolean;
  onDeleteTokens: (tokens: api.DeviceAuthToken[]) => void;
};

type State = {
  openDropdown: string | undefined;
};

export class DeviceAuthTokensList extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { openDropdown: undefined };
  }

  render(): React.ReactElement {
    const { tokens, isDisabled, onDeleteTokens } = this.props;
    const { openDropdown } = this.state;

    const cards = tokens.map(token => {
      const added = getFormattedDate(
        token.creationTimestamp ? new Date(token.creationTimestamp) : undefined,
      );

      return (
        <Card key={token.name} data-testid="device-auth-token-row">
          <CardHeader
            actions={{
              actions: (
                <Dropdown
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      variant="plain"
                      isDisabled={isDisabled}
                      onClick={() =>
                        this.setState(prev => ({
                          openDropdown: prev.openDropdown === token.name ? undefined : token.name,
                        }))
                      }
                      isExpanded={openDropdown === token.name}
                      aria-label="Actions"
                      data-testid="token-actions-toggle"
                    >
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  isOpen={openDropdown === token.name}
                  onOpenChange={isOpen =>
                    this.setState({ openDropdown: isOpen ? token.name : undefined })
                  }
                  popperProps={{ position: 'right' }}
                >
                  <DropdownList>
                    <DropdownItem
                      key="delete"
                      isDanger
                      isDisabled={isDisabled}
                      onClick={() => {
                        this.setState({ openDropdown: undefined });
                        onDeleteTokens([token]);
                      }}
                      data-testid="delete-token-action"
                    >
                      Delete
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              ),
            }}
          >
            <CardTitle data-testid="token-provider">
              {token.provider ?? 'GitHub'}
              {token.valid === true && (
                <CheckCircleIcon
                  color="var(--pf-t--global--color--status--success--default)"
                  title="Token is valid"
                  style={{ marginLeft: '0.5rem' }}
                />
              )}
              {token.valid === false && (
                <ExclamationCircleIcon
                  color="var(--pf-t--global--color--status--danger--default)"
                  title="Token has been revoked or expired"
                  style={{ marginLeft: '0.5rem' }}
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            <Content>
              <Content component={ContentVariants.small} data-testid="token-name">
                {token.name}
              </Content>
              <Content component={ContentVariants.small} data-testid="token-added">
                Added: {added}
              </Content>
            </Content>
          </CardFooter>
        </Card>
      );
    });

    return <PageSection>{cards}</PageSection>;
  }
}
