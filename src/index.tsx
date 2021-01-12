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

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createHashHistory } from 'history';

import './overrides.styl';
import '@patternfly/react-core/dist/styles/base.css';
import 'monaco-editor-core/esm/vs/base/browser/ui/codiconLabel/codicon/codicon.css';

import configureStore from './store/configureStore';
import App from './App';
import { PreloadData } from './services/bootstrap/PreloadData';

import '@patternfly/patternfly/patternfly-addons.css';

const history = createHashHistory();
// get the application-wide store instance, with state from the server where available
const store = configureStore(history);

const ROOT = document.querySelector('.ui-container');
// preload app data
new PreloadData(store).init()
  .then(() => console.log('UD: preload data complete successfully.'))
  .catch(error => console.log('UD: preload data failed.', error))
  .finally(() => {
    ReactDOM.render(<Provider store={store}><App history={history} /></Provider>, ROOT);
  });
