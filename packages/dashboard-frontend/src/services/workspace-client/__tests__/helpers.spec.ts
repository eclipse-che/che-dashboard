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

import devfileApi from '@/services/devfileApi';
import {
  getErrorMessage,
  hasLoginPage,
  isCheEditorYamlPath,
  isForbidden,
  isInternalServerError,
  isUnauthorized,
  normaliseDevWorkspace,
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
  describe('checks normaliseDevWorkspace method', () => {
    it('should return an equal workspace object if it has "spec" and "template"', () => {
      const devWorkspace = {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspace',
        metadata: {
          name: 'hello-world',
        },
        spec: {
          started: true,
          template: {
            attributes: {
              'controller.devfile.io/storage-type': 'ephemeral',
            },
          },
        },
      } as devfileApi.DevWorkspace;

      const normalisedDevWorkspace = normaliseDevWorkspace(devWorkspace);

      expect(normalisedDevWorkspace).toEqual(devWorkspace);
    });

    it('should return the a workspace object with an empty value for "template"', () => {
      const devWorkspace = {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspace',
        metadata: {
          name: 'hello-world',
        },
        spec: {
          started: true,
          // template is missing
        },
      } as devfileApi.DevWorkspace;

      const normalisedDevWorkspace = normaliseDevWorkspace(devWorkspace);

      expect(normalisedDevWorkspace).not.toEqual(devWorkspace);
      // but "template" is added as an empty object
      expect(normalisedDevWorkspace).toEqual({
        ...devWorkspace,
        spec: { ...devWorkspace.spec, template: {} },
      });
    });

    it('should return the a workspace object with "spec" and "template"', () => {
      const devWorkspace = {
        apiVersion: 'workspace.devfile.io/v1alpha2',
        kind: 'DevWorkspace',
        metadata: {
          name: 'hello-world',
        },
        // spec is missing
      } as devfileApi.DevWorkspace;

      const normalisedDevWorkspace = normaliseDevWorkspace(devWorkspace);

      expect(normalisedDevWorkspace).not.toEqual(devWorkspace);
      // but "spec" is added with "started" as false and "template" as an empty object
      expect(normalisedDevWorkspace).toEqual({
        ...devWorkspace,
        spec: { started: false, template: {} },
      });
    });
  });

  describe('checks isCheEditorYamlPath method', () => {
    it('should return the false', () => {
      const editors = [
        'http://127.0.0.1:8080/dashboard/api/editors/devfile?che-editor=che-incubator/che-code/insider',
        'https://dummy-host/che-plugin-registry/main/v3/plugins/che-incubator/che-code/insiders/devfile.yaml',
      ];

      editors.forEach(editor => {
        const hasCheEditorYamlPath = isCheEditorYamlPath(editor);
        expect(hasCheEditorYamlPath).toBeFalsy();
      });
    });

    it('should return the true', () => {
      const editors = [
        'http://dummy-host/api/scm/resolve?repository=https%3A%2F%2Fdummy-repo%2Freference-editor.git&file=.che%2Fche-editor.yaml',
        'http://dummy-host/api/scm/resolve?repository=https://dummy-repo/dashboard&file=.che/che-editor.yaml',
      ];

      editors.forEach(editor => {
        const hasCheEditorYamlPath = isCheEditorYamlPath(editor);
        expect(hasCheEditorYamlPath).toBeTruthy();
      });
    });
  });
});
