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

// Universal stub for plugin modules that are only available via symlinks created by
// scripts/prepare-plugins.sh at build time.
//
// Uses a Proxy with a backing store so jest.spyOn() can replace properties:
//  - get: returns stored value, or a stub function for unknown keys
//  - set: stores the value (allows jest.spyOn to install its spy)
//  - getOwnPropertyDescriptor: advertises every key as writable+configurable
//    so Jest's internal Object.defineProperty calls succeed
//
// Special cases:
//  - *Reducer named exports → identity reducer (required by Redux)
//  - actionCreators / *ActionCreators → a spyable proxy-object
//  - default → React component stub

import React from 'react';

const stubThunk = () => () => Promise.resolve();
const stubReducer = (state = {}) => state;

function PluginStub(): React.ReactElement {
  return <></>;
}

function makeSpyableProxy(fallback: () => unknown) {
  const store: Record<string | symbol, unknown> = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return fallback();
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    getOwnPropertyDescriptor(target, prop) {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: prop in target ? target[prop] : fallback(),
      };
    },
    has() {
      return true;
    },
  });
}

const moduleStore: Record<string | symbol, unknown> = {};
const moduleProxy = new Proxy(moduleStore, {
  get(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return PluginStub;
    if (prop in target) return target[prop];
    if (prop === 'reducer' || (typeof prop === 'string' && /Reducer$/.test(prop))) {
      return stubReducer;
    }
    if (prop === 'actionCreators' || (typeof prop === 'string' && /ActionCreators$/.test(prop))) {
      const obj = makeSpyableProxy(stubThunk);
      target[prop] = obj;
      return obj;
    }
    return stubThunk;
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  getOwnPropertyDescriptor(target, prop) {
    return {
      configurable: true,
      enumerable: true,
      writable: true,
      value: target[prop],
    };
  },
  has() {
    return true;
  },
});

module.exports = moduleProxy;
