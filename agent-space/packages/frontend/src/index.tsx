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

import '@patternfly/react-core/dist/styles/base.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { App } from '@/App';
import { applyStoredTheme } from '@/services/theme';
import { store } from '@/store';

// Before the first render, so arriving from a dark dashboard does not flash light.
applyStoredTheme();

const container = document.getElementById('ui-container');
if (container === null) {
  throw new Error("Could not find the '#ui-container' element to mount Agent Space into.");
}

createRoot(container).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
