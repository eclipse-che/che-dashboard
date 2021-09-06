/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { getMessage } from '../errors';

let mockAxios = new AxiosMockAdapter(axios);

describe('Errors helper', () => {

  // mute the outputs
  console.error = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
    mockAxios.resetHandlers();
  });

  it('should return default message', () => {
    expect(getMessage(undefined)).toEqual('Unexpected error.');
  });

  it('should return error message', () => {
    const message = 'Expected error.';
    const error = new Error(message);
    expect(getMessage(error)).toEqual(message);
  });

  it('should return default message and dump the provided object', () => {
    const notError = { alert: 'Beware of bugs!' };

    const expectedMessage = 'Unexpected error. Check DevTools console and network tabs for more information.'
    expect(getMessage(notError)).toEqual(expectedMessage);

    const expectedOutput = ['Unexpected error:', {'alert': 'Beware of bugs!'}];
    expect(console.error).toBeCalledWith(...expectedOutput);
  })

  it('should return error message if server responds with error', async (done) => {
    const message = '500 Internal Server Error.';

    mockAxios.onGet('/location/not/found').replyOnce(() => {
      return [500, {}, {},]
    });

    try {
      const data = await axios.get('/location/not/found');
      done.fail();
    } catch (e) {
      const err = e as AxiosError;
      // provide `statusText` to the response because mocking library cannot do that
      (err.response as AxiosResponse<unknown>).statusText = 'Internal Server Error';

      expect(getMessage(err)).toEqual(message);
      done();
    }
  });

  it('should return error message if server responds with error', async (done) => {
    const message = 'The server failed to fulfill a request';

    mockAxios.onGet('/location/not/found').replyOnce(() => {
      return [500, {message}, {},]
    });

    try {
      const data = await axios.get('/location/not/found');
      done.fail();
    } catch (e) {
      const err = e as AxiosError;
      // provide `statusText` to the response because mocking library cannot do that
      (err.response as AxiosResponse<unknown>).statusText = 'Internal Server Error';

      expect(getMessage(err)).toEqual(message);
      done();
    }
  });

  it('should return error message if network error', async (done) => {
    const message = 'Network Error';

    mockAxios.onGet('/location/').networkErrorOnce();

    try {
      const data = await axios.get('/location/');
      done.fail();
    } catch (e) {
      expect(getMessage(e)).toEqual(message);
      done();
    }
  });

  it('should return error message if network timeout', async (done) => {
    const message = 'timeout of 0ms exceeded';

    mockAxios.onGet('/location/').timeoutOnce();

    try {
      const data = await axios.get('/location/');
      done.fail();
    } catch (e) {
      expect(getMessage(e)).toEqual(message);
      done();
    }
  });

  it('should return error message if request aborted', async (done) => {
    const message = 'Request aborted';

    mockAxios.onGet('/location/').abortRequestOnce();

    try {
      const data = await axios.get('/location/');
      done.fail();
    } catch (e) {
      expect(getMessage(e)).toEqual(message);
      done();
    }
  });

});

