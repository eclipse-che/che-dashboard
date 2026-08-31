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

import { helpers } from '@eclipse-che/common';
import { AxiosResponse } from 'axios';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { baseApiPath } from '@/constants/config';
import { dataResolverSchema } from '@/constants/schemas';
import { restParams } from '@/models';
import { axiosInstance, axiosInstanceNoCert } from '@/routes/api/helpers/getCertificateAuthority';
import { getDevWorkspaceClient } from '@/routes/api/helpers/getDevWorkspaceClient';
import { getServiceAccountToken } from '@/routes/api/helpers/getServiceAccountToken';
import { getSchema } from '@/services/helpers';

const tags = ['Data Resolver'];

const config = {
  headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
  maxRedirects: 0,
};

function isPrivateOctets(a: number, b: number): boolean {
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isPrivateHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]') {
    return true;
  }

  // IPv4-mapped IPv6: [::ffff:XXXX:YYYY] where each group is a 16-bit hex word.
  // e.g. [::ffff:a9fe:a9fe] maps to 169.254.169.254.
  const ipv4Mapped = hostname.match(/^\[::ffff:([0-9a-f]+):([0-9a-f]+)\]$/i);
  if (ipv4Mapped) {
    const w1 = parseInt(ipv4Mapped[1], 16);
    return isPrivateOctets((w1 >> 8) & 0xff, w1 & 0xff);
  }

  const parts = hostname.split('.');
  if (parts.length === 4) {
    const octets = parts.map(Number);
    if (octets.every(o => Number.isInteger(o) && o >= 0 && o <= 255)) {
      return isPrivateOctets(octets[0], octets[1]);
    }
  }
  return false;
}

function isUrlAllowed(url: string, allowedSourceUrls: string[]): boolean {
  if (allowedSourceUrls.length === 0) {
    return true;
  }
  for (const allowedUrl of allowedSourceUrls) {
    if (allowedUrl.includes('*')) {
      let pattern = allowedUrl.trim();
      if (!pattern.startsWith('*')) {
        pattern = `^${pattern}`;
      }
      if (!pattern.endsWith('*')) {
        pattern = `${pattern}$`;
      }
      // Intentionally mirrors the frontend isSourceAllowed() pattern logic:
      // non-wildcard URL chars (including '.') are not regex-escaped.
      // Allowlist entries come from the operator (trusted input).
      pattern = pattern.replace(/\*/g, '.*');
      if (new RegExp(pattern).test(url)) {
        return true;
      }
    } else {
      if (allowedUrl.trim() === url) {
        return true;
      }
    }
  }
  return false;
}

export function registerDataResolverRoute(instance: FastifyInstance) {
  instance.register(async server => {
    server.post(
      `${baseApiPath}/data/resolver`,
      getSchema({ tags, body: dataResolverSchema }),
      async function (request: FastifyRequest, reply: FastifyReply): Promise<string | void> {
        const { url } = request.body as restParams.IYamlResolverParams;

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch {
          reply.code(400).send('Invalid URL');
          return;
        }

        if (isPrivateHostname(parsedUrl.hostname)) {
          reply.code(403).send('Requests to private addresses are not allowed');
          return;
        }

        const token = getServiceAccountToken();
        const { serverConfigApi } = getDevWorkspaceClient(token);
        const cheCustomResource = await serverConfigApi.fetchCheCustomResource();
        const allowedSourceUrls = serverConfigApi.getAllowedSourceUrls(cheCustomResource);
        if (!isUrlAllowed(url, allowedSourceUrls)) {
          reply.code(403).send('URL is not in the allowed sources list');
          return;
        }

        try {
          let response: AxiosResponse;
          try {
            response = await axiosInstanceNoCert.get(url, config);
          } catch (error) {
            if (helpers.errors.includesAxiosResponse(error) && error.response.status === 404) {
              throw error;
            }
            response = await axiosInstance.get(url, config);
          }
          return response.data;
        } catch (error) {
          if (!helpers.errors.includesAxiosResponse(error)) {
            throw error;
          }
          reply.code(error.response.status).send(error.response.data);
        }
      },
    );
  });
}
