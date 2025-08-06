/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import '@testing-library/jest-dom';

import React from 'react';

jest.mock('@patternfly/react-core', () => {
  return {
    ...jest.requireActual('@patternfly/react-core'),
    // mock the Tooltip component from @patternfly/react-core
    Tooltip: jest.fn(props => {
      const { content, children, ...rest } = props;
      return (
        <div data-testid="patternfly-tooltip">
          <span data-testid="tooltip-props">{JSON.stringify(rest)}</span>
          <div data-testid="tooltip-content">{content}</div>
          <div data-testid="tooltip-placed-to">{children}</div>
        </div>
      );
    }),
  };
});

jest.mock('@/components/BasicViewer', () => {
  return {
    BasicViewer: jest.fn(props => {
      return (
        <textarea
          id={props.id}
          data-testid={props['data-testid']}
          value={props.value}
          readOnly={true}
        />
      );
    }),
  };
});

jest.mock('gravatar-url', () => {
  return function () {
    return 'avatar/source/location';
  };
});
