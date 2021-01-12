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

import { AlertVariant } from '@patternfly/react-core';
import React from 'react';
import { fireEvent, render, RenderResult, screen } from '@testing-library/react';
import AppAlertGroup from '../';
import { container } from '../../../inversify.config';
import { AppAlerts } from '../../../services/alerts/appAlerts';

const appAlerts = container.get(AppAlerts);

jest.useFakeTimers();

describe('AppAlertGroup component', () => {

  const showAlert = (title: string): void => {
    const key = 'wrks-delete';
    const variant = AlertVariant.success;
    appAlerts.showAlert({
      key,
      title,
      variant,
    });
  };

  beforeEach(() => {
    const component = (<AppAlertGroup />);
    renderComponent(component);
  });

  it('should show the alert and hide with a close button', () => {
    const title = 'test 1 message';
    showAlert(title);

    expect(screen.queryAllByText(title).length).toEqual(1);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(screen.queryAllByText(title).length).toEqual(0);
  });

  it('should show the alert and hide after timeout', () => {
    const title = 'test 2 message';
    showAlert(title);

    expect(screen.queryAllByText(title).length).toEqual(1);

    // Fast-forward until all timers have been executed
    jest.runAllTimers();

    expect(screen.queryAllByText(title).length).toEqual(0);
  });

});

function renderComponent(
  component: React.ReactElement
): RenderResult {
  return render(component);
}
