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

import React, { ErrorInfo } from 'react';
import { Alert, AlertActionLink, AlertVariant } from '@patternfly/react-core';

type Props = {};
type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  expanded: boolean;
  activeItems: any;
};

export class ErrorBoundary extends React.PureComponent<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      expanded: false,
      activeItems: {},
    };
  }

  static getDerivedStateFromError(error: Error) {
    console.log('>>> getDerivedStateFromError error', error);
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // console.log('>>> error', error);
    // console.log('>>> errorInfo', errorInfo);
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  private handleOnClick() {
    const expanded = !this.state.expanded;
    this.setState({
      expanded,
    });
  }

  render(): React.ReactNode {
    const { hasError, error, errorInfo, expanded } = this.state;

    if (hasError) {
      const actionTitle = expanded ? 'Hide stacktrace' : 'View stacktrace';
      const errorMessage = error?.message;
      const errorStack = error?.stack;
      const errorName = error?.name;
      return (
        <Alert
          isInline
          variant={AlertVariant.danger}
          title="Error"
          actionLinks={
            <React.Fragment>
              <AlertActionLink onClick={() => this.handleOnClick()}>{actionTitle}</AlertActionLink>
            </React.Fragment>
          }
        >
          <pre>
            |name|{errorName}<br />
            |message|{errorMessage}<br />
            |stack|{errorStack}<br />
            {expanded && (errorInfo ? errorInfo.componentStack : '')}
          </pre>
        </Alert>
      );
    }

    return this.props.children;
  }

}
