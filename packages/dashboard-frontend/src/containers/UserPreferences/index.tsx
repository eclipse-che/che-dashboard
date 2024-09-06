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

import { createHashHistory, History } from 'history';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import UserPreferences from '@/pages/UserPreferences';

// todo tests
export default function UserPreferencesContainer(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  // Create a history-like object
  // todo - this is a workaround for the fact that we can't pass a history object to the component
  // todo get rid of this when we have a better solution
  const history: History = {
    ...createHashHistory(),
    push: navigate,
    replace: path => navigate(path, { replace: true }),
    location,
  };

  return <UserPreferences history={history} />;
}
