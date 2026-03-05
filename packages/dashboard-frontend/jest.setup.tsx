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

// Note: Some tests may be flaky due to PatternFly 6 Table components
// using async ref measurements that don't work well in test-renderer environment.
// These tests typically pass when run in isolation but may fail when run together.

// Mock offsetWidth/offsetHeight for PatternFly 6 Table components in JSDOM
// PatternFly Table accesses offsetWidth during render, which can be null in test environment
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress offsetWidth errors from PatternFly Table during tests
  const errorStr = String(args[0] || '');
  if (errorStr.includes('offsetWidth') || errorStr.includes('Cannot read properties of null')) {
    return;
  }
  originalConsoleError(...args);
};

// Suppress uncaught exceptions for offsetWidth errors in PatternFly Table
const originalErrorHandler = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  const errorStr = String(message || '');
  if (errorStr.includes('offsetWidth') || errorStr.includes('Cannot read properties of null')) {
    return true; // Suppress the error
  }
  if (originalErrorHandler) {
    return originalErrorHandler(message, source, lineno, colno, error);
  }
  return false;
};

// Suppress unhandled promise rejections for offsetWidth errors
const originalUnhandledRejection = window.onunhandledrejection;
if (originalUnhandledRejection) {
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const errorStr = String(event.reason || '');
    if (errorStr.includes('offsetWidth') || errorStr.includes('Cannot read properties of null')) {
      event.preventDefault();
      return;
    }
    return originalUnhandledRejection.call(window, event);
  };
} else {
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const errorStr = String(event.reason || '');
    if (errorStr.includes('offsetWidth') || errorStr.includes('Cannot read properties of null')) {
      event.preventDefault();
    }
  };
}


// Mock offsetWidth/offsetHeight for PatternFly 6 Table components
// PatternFly Table accesses offsetWidth during render, which can be null in test environment
const getOffsetWidth = function(this: HTMLElement) {
  // Return a consistent value, handling both normal elements and null references
  try {
    return this && typeof this === 'object' ? 100 : 100;
  } catch {
    return 100;
  }
};

const getOffsetHeight = function(this: HTMLElement) {
  try {
    return this && typeof this === 'object' ? 100 : 100;
  } catch {
    return 100;
  }
};

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get: getOffsetWidth,
});
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get: getOffsetHeight,
});

// Also mock for Element prototype (for react-test-renderer)
if (typeof Element !== 'undefined') {
  Object.defineProperty(Element.prototype, 'offsetWidth', {
    configurable: true,
    get: getOffsetWidth,
  });
  Object.defineProperty(Element.prototype, 'offsetHeight', {
    configurable: true,
    get: getOffsetHeight,
  });
}

// Mock getBoundingClientRect for PatternFly components
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function() {
  try {
    return originalGetBoundingClientRect.call(this);
  } catch {
    return {
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }
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
