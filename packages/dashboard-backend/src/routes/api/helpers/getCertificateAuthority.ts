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

import axios from 'axios';
import * as fs from 'fs-extra';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import path from 'path';

const DEFAULT_CHE_SELF_SIGNED_MOUNT_PATH = '/public-certs';
const CHE_SELF_SIGNED_MOUNT_PATH = process.env.CHE_SELF_SIGNED_MOUNT_PATH;

const certificateAuthority = getCertificateAuthority(
  CHE_SELF_SIGNED_MOUNT_PATH ? CHE_SELF_SIGNED_MOUNT_PATH : DEFAULT_CHE_SELF_SIGNED_MOUNT_PATH,
);

// Use HTTP/HTTPS proxy for outbound requests when set (e.g. IPv6-only clusters reaching registry.devfile.io).
// Without this, axios fails with ENETUNREACH when the pod cannot reach IPv4 addresses directly.
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyAgentNoCert =
  proxyUrl !== undefined && proxyUrl !== '' ? new HttpsProxyAgent(proxyUrl) : undefined;
const proxyAgentWithCert =
  proxyUrl !== undefined && proxyUrl !== ''
    ? new HttpsProxyAgent(proxyUrl, { ca: certificateAuthority })
    : undefined;

const noCertAgent =
  proxyAgentNoCert ??
  (certificateAuthority ? new https.Agent({ ca: certificateAuthority }) : undefined);
const certAgent =
  proxyAgentWithCert ??
  (certificateAuthority ? new https.Agent({ ca: certificateAuthority }) : undefined);

// No-proxy instances for fallback when proxy is unreachable (e.g. IPv6-only pod, IPv4 proxy)
const noProxyNoCertAgent = certificateAuthority
  ? new https.Agent({ ca: certificateAuthority })
  : undefined;
const noProxyCertAgent = certificateAuthority
  ? new https.Agent({ ca: certificateAuthority })
  : undefined;

export const axiosInstanceNoCert = axios.create({
  ...(noCertAgent && { httpsAgent: noCertAgent, proxy: false }),
});

export const axiosInstance = axios.create({
  ...(certAgent && { httpsAgent: certAgent, proxy: false }),
});

// Always set proxy: false to bypass env HTTP_PROXY when proxy is unreachable
export const axiosInstanceNoProxyNoCert = axios.create({
  proxy: false,
  ...(noProxyNoCertAgent && { httpsAgent: noProxyNoCertAgent }),
});

export const axiosInstanceNoProxy = axios.create({
  proxy: false,
  ...(noProxyCertAgent && { httpsAgent: noProxyCertAgent }),
});

function searchCertificate(
  certPath: string,
  certificateAuthority: Buffer[],
  subdirLevel = 1,
): void {
  const maxSubdirQuantity = 10;
  const maxSubdirLevel = 5;

  const tmpPaths: string[] = [];
  try {
    const publicCertificates = fs.readdirSync(certPath);
    for (const publicCertificate of publicCertificates) {
      const newPath = path.join(certPath, publicCertificate);
      if (fs.lstatSync(newPath).isDirectory()) {
        if (tmpPaths.length < maxSubdirQuantity) {
          tmpPaths.push(newPath);
        }
      } else {
        const fullPath = path.join(certPath, publicCertificate);
        certificateAuthority.push(fs.readFileSync(fullPath));
      }
    }
  } catch (e) {
    // no-op
  }

  if (subdirLevel < maxSubdirLevel) {
    for (const path of tmpPaths) {
      searchCertificate(path, certificateAuthority, ++subdirLevel);
    }
  }
}

function getCertificateAuthority(certPath: string): Buffer[] | undefined {
  if (!fs.existsSync(certPath)) {
    return undefined;
  }

  const certificateAuthority: Buffer[] = [];
  searchCertificate(certPath, certificateAuthority);

  return certificateAuthority.length > 0 ? certificateAuthority : undefined;
}
