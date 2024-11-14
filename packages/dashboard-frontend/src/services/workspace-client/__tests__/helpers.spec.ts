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

import {
  getErrorMessage,
  hasLoginPage,
  isForbidden,
  isInternalServerError,
  isUnauthorized,
} from '@/services/workspace-client/helpers';

// mute console.error
console.error = jest.fn();

describe('Workspace-client helpers', () => {
  describe('get an error message', () => {
    it('should return the default error message', () => {
      expect(getErrorMessage(undefined)).toEqual('Check the browser logs message.');
    });

    it('should return the unknown error message', () => {
      expect(getErrorMessage({})).toEqual('Unexpected error type. Please report a bug.');
    });

    it('should return the error message', () => {
      const message = getErrorMessage({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
          data: 'Some error message',
        },
        request: {
          responseURL: 'http://dummyurl.com',
        },
      });
      expect(message).toEqual('Some error message');
    });

    it('should return the error details', () => {
      expect(
        getErrorMessage({
          response: {
            status: 500,
          },
          request: {
            responseURL: 'http://dummyurl.com',
          },
        }),
      ).toEqual(
        'HTTP Error code 500. Endpoint which throws an error http://dummyurl.com. Check the browser logs message.',
      );
    });

    it('should report the Unauthorized (or Forbidden) error', () => {
      const message = getErrorMessage({
        response: {
          status: 401,
          request: {
            responseURL: 'http://dummyurl.com',
          },
        },
      });
      expect(message).toContain('User session has expired. You need to re-login to the Dashboard.');
    });
  });

  describe('checks for HTML login page in response data', () => {
    it('should return false without  HTML login page', () => {
      expect(
        hasLoginPage({
          response: {
            status: 401,
            statusText: '...',
            headers: {},
            config: {},
            data: '<!DOCTYPE html><html><head></head><body>...</body></html>',
          },
        }),
      ).toBeFalsy();
    });

    it('should return true in the case with  HTML login page', () => {
      expect(
        hasLoginPage({
          response: {
            status: 401,
            statusText: '...',
            headers: {},
            config: {},
            data: '<!DOCTYPE html><html><head></head><body><span>Log In</span></body></html>',
          },
        }),
      ).toBeTruthy();
    });
  });

  describe('checks for HTTP 401 Unauthorized response status code', () => {
    it('should return false in the case with HTTP 400 Bad Request', () => {
      expect(isUnauthorized('...HTTP Status 400 ....')).toBeFalsy();
      expect(
        isUnauthorized({
          body: '...HTTP Status 400 ....',
        }),
      ).toBeFalsy();
      expect(
        isUnauthorized({
          statusCode: 400,
        }),
      ).toBeFalsy();
      expect(
        isUnauthorized({
          status: 400,
        }),
      ).toBeFalsy();
      expect(isUnauthorized(new Error('...Status code 400...'))).toBeFalsy();
      expect(
        isUnauthorized({
          body: '...Status code 400...',
        }),
      ).toBeFalsy();
    });

    it('should return true in the case with HTTP 401 Unauthorized', () => {
      expect(isUnauthorized('...HTTP Status 401 ....')).toBeTruthy();
      expect(
        isUnauthorized({
          body: '...HTTP Status 401 ....',
        }),
      ).toBeTruthy();
      expect(
        isUnauthorized({
          statusCode: 401,
        }),
      ).toBeTruthy();
      expect(
        isUnauthorized({
          status: 401,
        }),
      ).toBeTruthy();
      expect(isUnauthorized(new Error('...Status code 401...'))).toBeTruthy();
      expect(
        isUnauthorized({
          body: '...Status code 401...',
        }),
      ).toBeTruthy();
    });
  });

  describe('checks for HTTP 403 Forbidden response status code', () => {
    it('should return false in the case with HTTP 400 Bad Request', () => {
      expect(isForbidden('...HTTP Status 400 ....')).toBeFalsy();
      expect(
        isForbidden({
          body: '...HTTP Status 400 ....',
        }),
      ).toBeFalsy();
      expect(
        isForbidden({
          statusCode: 400,
        }),
      ).toBeFalsy();
      expect(
        isForbidden({
          status: 400,
        }),
      ).toBeFalsy();
      expect(isForbidden(new Error('...Status code 400...'))).toBeFalsy();
      expect(
        isForbidden({
          body: '...Status code 400...',
        }),
      ).toBeFalsy();
    });

    it('should return true in the case with HTTP 403 Forbidden', () => {
      expect(isForbidden('...HTTP Status 403 ....')).toBeTruthy();
      expect(
        isForbidden({
          body: '...HTTP Status 403 ....',
        }),
      ).toBeTruthy();
      expect(
        isForbidden({
          statusCode: 403,
        }),
      ).toBeTruthy();
      expect(
        isForbidden({
          status: 403,
        }),
      ).toBeTruthy();
      expect(isForbidden(new Error('...Status code 403...'))).toBeTruthy();
      expect(
        isForbidden({
          body: '...Status code 403...',
        }),
      ).toBeTruthy();
    });
  });

  describe('checks for HTTP 500 Internal Server Error response status code', () => {
    it('should return false in the case with HTTP 400 Bad Request', () => {
      expect(isInternalServerError('...HTTP Status 400 ....')).toBeFalsy();
      expect(
        isInternalServerError({
          body: '...HTTP Status 400 ....',
        }),
      ).toBeFalsy();
      expect(
        isInternalServerError({
          statusCode: 400,
        }),
      ).toBeFalsy();
      expect(
        isInternalServerError({
          status: 400,
        }),
      ).toBeFalsy();
      expect(isInternalServerError(new Error('...Status code 400...'))).toBeFalsy();
      expect(
        isInternalServerError({
          body: '...Status code 400...',
        }),
      ).toBeFalsy();
    });

    it('should return true in the case with HTTP 500 Internal Server Error', () => {
      expect(isInternalServerError('...HTTP Status 500 ....')).toBeTruthy();
      expect(
        isInternalServerError({
          body: '...HTTP Status 500 ....',
        }),
      ).toBeTruthy();
      expect(
        isInternalServerError({
          statusCode: 500,
        }),
      ).toBeTruthy();
      expect(
        isInternalServerError({
          status: 500,
        }),
      ).toBeTruthy();
      expect(isInternalServerError(new Error('...Status code 500...'))).toBeTruthy();
      expect(
        isInternalServerError({
          body: '...Status code 500...',
        }),
      ).toBeTruthy();
    });
  });
});
