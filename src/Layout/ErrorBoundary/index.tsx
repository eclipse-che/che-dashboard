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
import {
  Alert,
  AlertActionLink,
  AlertVariant,
  PageSection,
  PageSectionVariants,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';

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

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
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
      const actionTitle = expanded ? 'Hide stack' : 'View stack';
      const errorName = error?.name ? error.name : Error;
      const errorMessage = error?.message ? ': ' + error.message : '';
      return (
        <PageSection
          variant={PageSectionVariants.light}
          isFilled={true}
        >
          <Alert
            isInline
            variant={AlertVariant.danger}
            title={errorName + errorMessage}
            actionLinks={
              <React.Fragment>
                <AlertActionLink onClick={() => this.handleOnClick()}>
                  {actionTitle}
                </AlertActionLink>
              </React.Fragment>
            }
          >
            {expanded && errorInfo && <TextContent>
              <Text component={TextVariants.pre}>
                {errorInfo.componentStack}
              </Text>
            </TextContent>}
          </Alert>
        </PageSection>
      );
    }

    return this.props.children;
  }

}
