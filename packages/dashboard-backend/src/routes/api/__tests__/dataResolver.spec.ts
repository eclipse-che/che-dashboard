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

import { FastifyInstance } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { axiosInstance, axiosInstanceNoCert } from '@/routes/api/helpers/getCertificateAuthority';
import { createFastifyError } from '@/services/helpers';
import { setup, teardown } from '@/utils/appBuilder';

jest.mock('@/routes/api/helpers/getCertificateAuthority');
jest.mock('../helpers/getDevWorkspaceClient.ts');
jest.mock('../helpers/getServiceAccountToken.ts');

const { stubAllowedSourceUrls } = jest.requireMock(
  '../helpers/getDevWorkspaceClient.ts',
) as typeof import('@/routes/api/helpers/__mocks__/getDevWorkspaceClient');
const axiosInstanceMock = jest.fn();
(axiosInstance.get as jest.Mock).mockImplementation(axiosInstanceMock);
const defaultAxiosInstanceMock = jest.fn();
(axiosInstanceNoCert.get as jest.Mock).mockImplementation(defaultAxiosInstanceMock);

describe('Data Resolver Route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setup();
  });

  afterAll(() => {
    teardown(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
    stubAllowedSourceUrls.splice(0);
  });

  describe('POST ${baseApiPath}/data/resolver', () => {
    describe('with certificate authority', () => {
      beforeEach(() => {
        defaultAxiosInstanceMock.mockRejectedValueOnce({
          response: {
            headers: {},
            status: 500,
            config: {},
            statusText: '500 Internal Server Error',
            data: createFastifyError(
              'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
              'Internal Server Error',
              500,
            ),
          },
        });
      });

      test('file exists', async () => {
        axiosInstanceMock.mockResolvedValueOnce({
          status: 200,
          data: 'test content',
        });

        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://devfile.yaml' });

        expect(defaultAxiosInstanceMock).toHaveBeenCalledTimes(1);
        expect(axiosInstanceMock).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual('test content');
      });

      test('file not found', async () => {
        axiosInstanceMock.mockRejectedValueOnce({
          response: {
            headers: {},
            status: 404,
            config: {},
            statusText: '404 Not Found',
            data: createFastifyError('ERR_BAD_REQUEST', 'Not Found', 404),
          },
        });

        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://devfile.yaml' });

        expect(defaultAxiosInstanceMock).toHaveBeenCalledTimes(1);
        expect(axiosInstanceMock).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual(
          '{"statusCode":404,"code":"ERR_BAD_REQUEST","error":"Not Found","message":"Not Found"}',
        );
      });
    });
    describe('without certificate authority', () => {
      test('file exists', async () => {
        defaultAxiosInstanceMock.mockResolvedValueOnce({
          status: 200,
          data: 'test content',
        });

        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://devfile.yaml' });

        expect(defaultAxiosInstanceMock).toHaveBeenCalledTimes(1);
        expect(axiosInstanceMock).toHaveBeenCalledTimes(0);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual('test content');
      });

      test('file not found', async () => {
        const fastifyError = createFastifyError('ERR_BAD_REQUEST', 'Not Found', 404);
        defaultAxiosInstanceMock.mockRejectedValueOnce({
          response: {
            headers: {},
            status: 404,
            config: {},
            statusText: '404 Not Found',
            data: fastifyError,
          },
        });

        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://devfile.yaml' });

        expect(defaultAxiosInstanceMock).toHaveBeenCalledTimes(1);
        expect(axiosInstanceMock).toHaveBeenCalledTimes(0);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual(
          '{"statusCode":404,"code":"ERR_BAD_REQUEST","error":"Not Found","message":"Not Found"}',
        );
      });
    });
  });

  describe('SSRF protection', () => {
    describe('blocks requests to private addresses', () => {
      test.each([
        'http://127.0.0.1/secret',
        'http://localhost/secret',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/internal',
        'http://192.168.1.1/internal',
        // IPv4-mapped IPv6 — bypass attempt
        'http://[::ffff:169.254.169.254]/',
        'http://[::ffff:127.0.0.1]/',
        'http://[::ffff:10.0.0.1]/',
      ])('blocks %s', async url => {
        const res = await app.inject().post(`${baseApiPath}/data/resolver`).payload({ url });
        expect(res.statusCode).toEqual(403);
        expect(defaultAxiosInstanceMock).not.toHaveBeenCalled();
      });
    });

    describe('invalid URL', () => {
      test('returns 400 for malformed URL', async () => {
        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'http://' });
        expect(res.statusCode).toEqual(400);
        expect(defaultAxiosInstanceMock).not.toHaveBeenCalled();
      });
    });

    describe('allowlist enforcement', () => {
      beforeEach(() => {
        stubAllowedSourceUrls.push('https://allowed.example.com/*');
      });

      test('blocks URL not in allowlist', async () => {
        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://blocked.example.com/devfile.yaml' });
        expect(res.statusCode).toEqual(403);
        expect(defaultAxiosInstanceMock).not.toHaveBeenCalled();
      });

      test('allows URL matching allowlist wildcard', async () => {
        defaultAxiosInstanceMock.mockResolvedValueOnce({ status: 200, data: 'devfile content' });
        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://allowed.example.com/devfile.yaml' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual('devfile content');
      });
    });

    describe('empty allowlist', () => {
      test('allows any public URL when allowlist is not configured', async () => {
        defaultAxiosInstanceMock.mockResolvedValueOnce({ status: 200, data: 'devfile content' });
        const res = await app
          .inject()
          .post(`${baseApiPath}/data/resolver`)
          .payload({ url: 'https://github.com/devfile.yaml' });
        expect(res.statusCode).toEqual(200);
      });
    });
  });
});
