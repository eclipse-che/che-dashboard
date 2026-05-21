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

import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { CopyIcon, DownloadIcon, EllipsisVIcon, TrashIcon } from '@patternfly/react-icons';
import React from 'react';

interface Props {
  onCopyLink: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

interface State {
  isOpen: boolean;
}

export class DropdownActions extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { isOpen: false };
  }

  private handleToggle = () => {
    this.setState(prev => ({ isOpen: !prev.isOpen }));
  };

  render(): React.ReactElement {
    const { onCopyLink, onDownload, onDelete } = this.props;
    const { isOpen } = this.state;

    return (
      <Dropdown
        isOpen={isOpen}
        onOpenChange={(open: boolean) => this.setState({ isOpen: open })}
        toggle={(toggleRef: React.Ref<HTMLButtonElement>) => (
          <MenuToggle
            ref={toggleRef}
            variant="plain"
            onClick={this.handleToggle}
            isExpanded={isOpen}
            aria-label="Devfile actions"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>
          <DropdownItem key="copylink" icon={<CopyIcon />} onClick={onCopyLink}>
            Copy Link
          </DropdownItem>
          <DropdownItem key="download" icon={<DownloadIcon />} onClick={onDownload}>
            Download
          </DropdownItem>
          <DropdownItem key="delete" icon={<TrashIcon />} onClick={onDelete} isDanger>
            Delete
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    );
  }
}
