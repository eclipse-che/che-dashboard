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

import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { dump } from 'js-yaml';

import devfileApi from '@/services/devfileApi';
import { RootState } from '@/store';
import { actionCreators } from '@/store/DevfileRegistries/actions';
import { EDITOR_DEVFILE_API_QUERY } from '@/store/DevfileRegistries/const';
import { getEditor } from '@/store/DevfileRegistries/getEditor';
import { State } from '@/store/DevfileRegistries/reducer';

jest.mock('js-yaml', () => ({
  dump: jest.fn(),
}));

jest.mock('@/store/DevfileRegistries/actions', () => ({
  actionCreators: {
    requestDevfile: jest.fn(),
  },
}));

describe('getEditor', () => {
  let dispatch: ThunkDispatch<RootState, unknown, UnknownAction>;
  let getState: () => RootState;

  beforeEach(() => {
    dispatch = jest.fn();
    getState = jest.fn();
    jest.clearAllMocks();
  });

  it('should return existing devfile content by URL', async () => {
    const mockState = {
      devfileRegistries: {
        devfiles: {
          'https://registry.com/devfile.yaml': {
            content: 'devfile content',
          },
        },
      } as Partial<State> as State,
    } as RootState;

    (getState as jest.Mock).mockReturnValue(mockState);

    const result = await getEditor('https://registry.com/devfile.yaml', dispatch, getState);

    expect(result).toEqual({
      content: 'devfile content',
      editorYamlUrl: 'https://registry.com/devfile.yaml',
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should fetch devfile content by URL if not in state', async () => {
    const mockState = {
      devfileRegistries: {
        devfiles: {},
      },
    } as RootState;

    const mockNextState = {
      devfileRegistries: {
        devfiles: {
          'https://registry.com/devfile.yaml': {
            content: 'fetched devfile content',
          },
        },
      } as Partial<State> as State,
    } as RootState;

    (getState as jest.Mock).mockReturnValueOnce(mockState).mockReturnValueOnce(mockNextState);

    const result = await getEditor('https://registry.com/devfile.yaml', dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith(
      actionCreators.requestDevfile('https://registry.com/devfile.yaml'),
    );
    expect(result).toEqual({
      content: 'fetched devfile content',
      editorYamlUrl: 'https://registry.com/devfile.yaml',
    });
  });

  it('should throw error if devfile content cannot be fetched by URL', async () => {
    const mockState = {
      devfileRegistries: {
        devfiles: {},
      },
    } as RootState;

    const mockNextState = {
      devfileRegistries: {
        devfiles: {},
      },
    } as RootState;

    (getState as jest.Mock).mockReturnValueOnce(mockState).mockReturnValueOnce(mockNextState);

    await expect(
      getEditor('https://registry.com/devfile.yaml', dispatch, getState),
    ).rejects.toThrow('Failed to fetch editor yaml by URL: https://registry.com/devfile.yaml.');

    expect(dispatch).toHaveBeenCalledWith(
      actionCreators.requestDevfile('https://registry.com/devfile.yaml'),
    );
  });

  it('should return existing devfile content by editor ID', async () => {
    const mockEditor = {
      schemaVersion: '2.1.0',
      metadata: {
        name: 'che-idea',
        attributes: {
          publisher: 'che-incubator',
          version: 'next',
        },
      },
    } as devfileApi.Devfile;

    const mockState = {
      dwPlugins: {
        cmEditors: [mockEditor],
      },
    } as RootState;

    (getState as jest.Mock).mockReturnValue(mockState);
    (dump as jest.Mock).mockReturnValue('dumped devfile content');

    const result = await getEditor('che-incubator/che-idea/next', dispatch, getState);

    expect(result).toEqual({
      content: 'dumped devfile content',
      editorYamlUrl: `${EDITOR_DEVFILE_API_QUERY}che-incubator/che-idea/next`,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should throw error if devfile content cannot be fetched by editor ID', async () => {
    const mockState = {
      dwPlugins: {
        cmEditors: [],
      } as Partial<State>,
    } as RootState;

    (getState as jest.Mock).mockReturnValue(mockState);

    await expect(getEditor('che-incubator/che-idea/next', dispatch, getState)).rejects.toThrow(
      'Failed to fetch editor yaml by id: che-incubator/che-idea/next.',
    );

    expect(dispatch).not.toHaveBeenCalled();
  });
});
