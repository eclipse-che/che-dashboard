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
  Button,
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
  Tooltip,
} from '@patternfly/react-core';
import { CopyIcon, EllipsisVIcon } from '@patternfly/react-icons';
import React from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { getFormattedDate } from '@/services/helpers/dates';

export type Props = {
  sshKey: api.SshKey;
  onDeleteSshKey: (sshKey: api.SshKey) => void;
};
export type State = {
  timerId: number | undefined;
  isOpenDropdown: boolean;
};

export class SshKeysListEntry extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      timerId: undefined,
      isOpenDropdown: false,
    };
  }

  private handleToggleDropdown(): void {
    this.setState(prevState => ({ isOpenDropdown: !prevState.isOpenDropdown }));
  }

  private handleDeleteEntry(sskKey: api.SshKey): void {
    this.props.onDeleteSshKey(sskKey);
  }

  private handleCopyToClipboard(): void {
    let { timerId } = this.state;
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }
    timerId = window.setTimeout(() => {
      this.setState({
        timerId: undefined,
      });
    }, 3000);
    this.setState({ timerId });
  }

  render(): React.ReactNode {
    const { sshKey } = this.props;
    const { timerId, isOpenDropdown } = this.state;

    const publicKey = atob(sshKey.keyPub);
    const addedOn = getFormattedDate(sshKey.creationTimestamp);

    return (
      <Card key={sshKey.name}>
        <CardHeader
          actions={{
            actions: (
              <>
                <Tooltip content={timerId ? 'Copied!' : 'Copy to clipboard'}>
                  <CopyToClipboard text={publicKey} onCopy={() => this.handleCopyToClipboard()}>
                    <Button
                      variant="plain"
                      icon={<CopyIcon />}
                      aria-label="Copy to Clipboard"
                      data-testid="copy-to-clipboard"
                    />
                  </CopyToClipboard>
                </Tooltip>
                <Dropdown
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle
                      ref={toggleRef}
                      variant="plain"
                      onClick={() => this.handleToggleDropdown()}
                      isExpanded={isOpenDropdown}
                      aria-label="Actions"
                    >
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  isOpen={isOpenDropdown}
                  onOpenChange={isOpen => this.setState({ isOpenDropdown: isOpen })}
                  popperProps={{ position: 'right' }}
                >
                  <DropdownList>
                    <DropdownItem key="action" onClick={() => this.handleDeleteEntry(sshKey)}>
                      Delete
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </>
            ),
          }}
        >
          <CardTitle data-testid="title">{sshKey.name}</CardTitle>
        </CardHeader>
        <CardFooter>
          <Content>
            <Content component={ContentVariants.small} data-testid="added-on">
              Added: {addedOn}
            </Content>
          </Content>
        </CardFooter>
      </Card>
    );
  }
}
