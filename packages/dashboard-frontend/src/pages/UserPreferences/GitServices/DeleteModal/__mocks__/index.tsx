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

import React from 'react';

import { Props } from '@/pages/UserPreferences/GitServices/DeleteModal';

export class GitServicesDeleteModal extends React.PureComponent<Props> {
  render() {
    const { deleteItem, isOpen, onCloseModal, onDelete } = this.props;
    return (
      <div data-testid="git-services-delete-modal">
        <div>GitServicesDeleteModal</div>
        <div data-testid="delete-modal-is-open">{isOpen ? 'open' : 'closed'}</div>
        <div data-testid="delete-modal-item">{deleteItem?.name}</div>
        <button onClick={onDelete}>Delete</button>
        <button onClick={onCloseModal}>Cancel Delete</button>
      </div>
    );
  }
}
