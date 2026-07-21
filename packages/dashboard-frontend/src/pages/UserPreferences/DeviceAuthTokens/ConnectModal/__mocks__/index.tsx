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

export const ConnectModal = ({
  isOpen,
  onCloseModal,
  onSuccess,
}: {
  isOpen: boolean;
  namespace: string;
  onCloseModal: () => void;
  onSuccess: (token: unknown) => void;
}): React.ReactElement => (
  <div data-testid="connect-modal" data-is-open={isOpen}>
    <button data-testid="mock-close-button" onClick={onCloseModal}>
      Cancel
    </button>
    <button
      data-testid="mock-success-button"
      onClick={() => onSuccess({ name: 'new-token', provider: 'github' })}
    >
      Success
    </button>
  </div>
);

export default ConnectModal;
