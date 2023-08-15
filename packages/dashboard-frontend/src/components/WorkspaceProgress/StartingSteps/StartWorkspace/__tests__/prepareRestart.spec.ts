/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  applyStartWorkspace,
  applyRestartDefaultLocation,
  applyRestartInDebugModeLocation,
  applyRestartInSafeModeLocation,
  resetRestartInSafeModeLocation,
} from '../prepareRestart';
import { Location } from 'history';
import { DevWorkspaceBuilder } from '../../../../../store/__mocks__/devWorkspaceBuilder';
import { constructWorkspace } from '../../../../../services/workspace-adapter';

describe('Prepare workspace start', () => {
  const startCallback = jest.fn();

  beforeEach(() => {
    startCallback.mockResolvedValueOnce(Promise.resolve());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('apply Safe Mode location', () => {
    const location = { search: '?tab=Progress' } as Location<unknown>;

    applyRestartInDebugModeLocation(location);

    expect(location).toEqual({ search: 'tab=Progress&debugWorkspaceStart=true' });
  });

  test('apply Safe Mode location', () => {
    const location = { search: '?tab=Progress' } as Location<unknown>;

    applyRestartInSafeModeLocation(location);

    expect(location).toEqual({ search: 'tab=Progress&useDefaultDevfile=true' });
  });

  test('apply default location', () => {
    const location = { search: '?debugWorkspaceStart=true&tab=Logs' } as Location<unknown>;

    applyRestartDefaultLocation(location);

    expect(location).toEqual({ search: 'tab=Logs' });
  });

  test('reset Safe Mode location', () => {
    const location = { search: '?tab=Logs&useDefaultDevfile=true' } as Location<unknown>;

    let hasChanged = resetRestartInSafeModeLocation(location);

    expect(hasChanged).toBeTruthy();
    expect(location).toEqual({ search: 'tab=Logs' });

    hasChanged = resetRestartInSafeModeLocation(location);

    expect(hasChanged).toBeFalsy();
    expect(location).toEqual({ search: 'tab=Logs' });
  });

  test('apply start workspace', async () => {
    const workspace = constructWorkspace(new DevWorkspaceBuilder().build());
    const location = { search: '' } as Location<unknown>;

    await applyStartWorkspace(startCallback, workspace, location);

    expect(startCallback).toBeCalledWith(workspace, undefined);
  });

  test('apply start workspace in Debug Mode', async () => {
    const workspace = constructWorkspace(new DevWorkspaceBuilder().build());
    const location = { search: '?debugWorkspaceStart=true' } as Location<unknown>;

    await applyStartWorkspace(startCallback, workspace, location);

    expect(startCallback).toBeCalledWith(workspace, {
      'debug-workspace-start': true,
    });
  });
});
