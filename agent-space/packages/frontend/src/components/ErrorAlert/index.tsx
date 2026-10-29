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

import { Alert, AlertActionCloseButton, AlertVariant } from '@patternfly/react-core';
import React from 'react';

import { SandboxError } from '@/services/types';

export type Props = {
  title: string;
  error: SandboxError | undefined;
  onClose?: () => void;
};

/**
 * Turns a 403 into advice instead of a stack trace: the most common failure in
 * this UI is a user who may list workspaces but not sandboxes.
 */
function describe(error: SandboxError): string {
  switch (error.statusCode) {
    case 401:
      return `${error.message} Your session may have expired - reload the page to sign in again.`;
    case 403:
      return `${error.message} You do not have permission to perform this operation in this namespace.`;
    case 404:
      return `${error.message} It may have been deleted, or the Agent Sandbox CRDs may not be installed on this cluster.`;
    case 409:
      return `${error.message} Choose a different name.`;
    case 0:
      return `${error.message} The Kubernetes API could not be reached from the browser.`;
    default:
      return error.message;
  }
}

export function ErrorAlert({ title, error, onClose }: Props): React.ReactElement | null {
  if (error === undefined) {
    return null;
  }

  return (
    <Alert
      isInline
      variant={AlertVariant.danger}
      title={title}
      data-testid="error-alert"
      actionClose={onClose ? <AlertActionCloseButton onClose={onClose} /> : undefined}
    >
      <p>{describe(error)}</p>
      {error.reason && (
        <p>
          Reason: <code>{error.reason}</code>
        </p>
      )}
    </Alert>
  );
}
