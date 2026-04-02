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

import { Alert, AlertVariant } from '@patternfly/react-core';
import React, { ErrorInfo, PropsWithChildren } from 'react';

type State = {
  hasError: boolean;
  errorMessage: string | undefined;
};

export class AiSelectorErrorBoundary extends React.PureComponent<PropsWithChildren, State> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, errorMessage: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AiSelector rendering error:', error, errorInfo);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Alert isInline variant={AlertVariant.warning} title="AI Provider Selector unavailable">
          The AI provider selector failed to load. You can still create a workspace without
          selecting an AI provider.
        </Alert>
      );
    }
    return this.props.children;
  }
}
