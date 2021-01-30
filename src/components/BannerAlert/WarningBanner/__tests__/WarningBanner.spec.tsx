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
import WarningBanner from '..';
import { Provider } from 'react-redux';
import { FakeStoreBuilder } from '../../../../store/__mocks__/storeBuilder';
import { BrandingData } from '../../../../services/bootstrap/branding.constant';
import { render, RenderResult } from '@testing-library/react';
import { Store } from 'redux';

const scheduledMaintenance = 'Scheduled maintenance';
const store = new FakeStoreBuilder().withBranding({
  header: {
    warning: scheduledMaintenance
  }
} as BrandingData).build();

describe('WarningBanner component', () => {
  it('should show header warning message when', () => {
    const component = renderComponent(<WarningBanner />, store);
    expect(component.queryAllByText(scheduledMaintenance, {
      exact: false
    }).length).toEqual(1);
  });

  it('should not show header warning message when no header was present', () => {
    const component = renderComponent(<WarningBanner />, new FakeStoreBuilder().build());
    expect(component.queryAllByText(scheduledMaintenance, {
      exact: false
    })).toEqual([]);
  });

});

function renderComponent(
  component: React.ReactElement,
  store: Store<any, any>
): RenderResult {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
}
