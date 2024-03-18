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

import React from 'react';
import renderer from 'react-test-renderer';

import { GitServicesEmptyState } from '@/pages/UserPreferences/GitServices/EmptyState/index';

describe('No git services component for empty state', () => {
  it('should render title correctly', () => {
    const element = <GitServicesEmptyState text="No Git Services" />;

    expect(renderer.create(element).toJSON()).toMatchSnapshot();
  });
});
