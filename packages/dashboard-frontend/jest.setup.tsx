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

import '@testing-library/jest-dom';

import React from 'react';

// PatternFly 6 Table's Th.tsx reads ref.current.offsetWidth inside a useEffect.
// In JSDOM all layout properties are 0 and in react-test-renderer ref.current is
// null, so the access throws a TypeError deep inside the React scheduler's
// setTimeout callback — making the test process crash with an unhandled error.
//
// Two-layer fix:
//   1. Mock offsetWidth/Height on HTMLElement so JSDOM-rendered elements are safe.
//   2. Wrap scheduled callbacks to swallow the one specific TypeError that PF6
//      Table emits from react-test-renderer paths where there is no real DOM node.
//      Only that exact TypeError variant is silenced; all other exceptions propagate.

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() {
    return 100;
  },
});
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() {
    return 100;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _origSetTimeout = global.setTimeout as (...a: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).setTimeout = function patchedSetTimeout(
  callback: unknown,
  delay?: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (typeof callback !== 'function') {
    return _origSetTimeout(callback, delay);
  }
  const safe = (...cbArgs: unknown[]) => {
    try {
      return (callback as (...a: unknown[]) => unknown)(...cbArgs);
    } catch (e) {
      // Only swallow the specific PF6 Table / react-test-renderer null-ref error.
      if (e instanceof TypeError && String((e as Error).message).includes('offsetWidth')) {
        return;
      }
      throw e;
    }
  };
  return _origSetTimeout(safe, delay, ...args);
};

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
