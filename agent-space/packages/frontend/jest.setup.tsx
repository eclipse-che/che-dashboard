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

// PatternFly 6 Table reads ref.current.offsetWidth from a useEffect. JSDOM reports 0
// for every layout property, which makes the Table crash on mount. Stubbing the two
// properties is enough to keep the component happy in tests.
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

// JSDOM has no fetch, and the branding code reaches for the dashboard assets on
// mount. Default to "nothing there"; tests that care override this.
Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn(() => Promise.resolve({ ok: false, status: 404 } as Response)),
});

// CodeMirror measures its own layout through Range, which JSDOM implements
// only partially. Without these the manifest viewer still renders, but every
// animation frame logs a TypeError and buries the real test output.
Range.prototype.getClientRects = () => {
  const list: DOMRect[] = [];
  return Object.assign(list, {
    item: (index: number) => list[index] ?? null,
  }) as unknown as DOMRectList;
};
Range.prototype.getBoundingClientRect = () => new DOMRect();

// JSDOM has no object URLs, and the manifest toolbar builds one to offer the
// YAML as a download. Tests that assert on the URL override these.
URL.createObjectURL = jest.fn(() => 'blob:agent-space/test');
URL.revokeObjectURL = jest.fn();

// JSDOM has no ResizeObserver, and the terminal watches its host element to
// know when to re-fit. Nothing resizes in a test, so observing is a no-op.
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  },
});

// JSDOM has no matchMedia, and the theme code asks it whether the OS prefers a
// dark colour scheme. Default to light; tests that care override this.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (media: string) =>
    ({
      matches: false,
      media,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }) as unknown as MediaQueryList,
});
