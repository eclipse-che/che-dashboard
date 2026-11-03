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

import axios, { AxiosInstance } from 'axios';

import { buildWebSocketUrl, SocketFactory, watchSandboxes } from '@/services/client/sandboxWatch';
import {
  AgentSandboxClient,
  Sandbox,
  SandboxClientError,
  SandboxEvent,
  SandboxList,
  SandboxPatch,
  SandboxWatchListener,
  StopWatching,
} from '@/services/types';

/** Where the dashboard backend is mounted; see `baseApiPath` in the backend. */
const DASHBOARD_API_PATH = '/dashboard/api';

/** Che server endpoint listing the namespaces the current user may use. */
const CHE_NAMESPACES_PATH = '/api/kubernetes/namespace';

/** The backend's WebSocket endpoint, which carries the sandbox channel. */
const WEBSOCKET_PATH = `${DASHBOARD_API_PATH}/websocket`;

interface KubeStatus {
  message?: string;
  reason?: string;
  code?: number;
}

/**
 * An event as `/api/v1/namespaces/{ns}/events` serves it.
 *
 * The core API serves both generations of the resource through this one shape.
 * The original one - what the kubelet and the scheduler still emit - carries
 * `firstTimestamp`/`lastTimestamp`/`count`; the `events.k8s.io/v1` one that
 * newer controllers such as the sandbox controller emit leaves those unset and
 * carries `eventTime` and `series` instead.
 */
interface CoreV1Event {
  metadata?: { uid?: string; name?: string; creationTimestamp?: string };
  involvedObject?: { name?: string };
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  lastTimestamp?: string;
  firstTimestamp?: string;
  eventTime?: string;
  series?: { count?: number; lastObservedTime?: string };
  source?: { component?: string };
  reportingComponent?: string;
}

interface CoreV1EventList {
  items?: CoreV1Event[];
}

interface SandboxApiAvailability {
  available?: boolean;
}

function isKubeStatus(payload: unknown): payload is KubeStatus {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const { message, reason, code } = payload as KubeStatus;
  return message !== undefined || reason !== undefined || code !== undefined;
}

/**
 * Turns an axios failure into a {@link SandboxClientError}, preferring the
 * `Status` object the API server returns over the generic axios message.
 */
export function toSandboxClientError(error: unknown, fallbackMessage: string): SandboxClientError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;
    if (isKubeStatus(payload)) {
      return new SandboxClientError(
        payload.code ?? status,
        payload.message ?? error.message ?? fallbackMessage,
        payload.reason,
      );
    }
    return new SandboxClientError(status, error.message || fallbackMessage);
  }
  if (error instanceof Error) {
    return new SandboxClientError(0, error.message);
  }
  return new SandboxClientError(0, fallbackMessage);
}

/**
 * Talks to Sandboxes through the dashboard backend.
 *
 * The Che gateway routes `/api` to the Che server, and that rule also catches
 * `/apis/...`, so the Kubernetes API is not reachable from the browser - a
 * create ends up as a 404 from the Che server instead. The dashboard backend is
 * routed to, and it relays each call with the caller's own token, so the RBAC
 * the operator provisions still decides what the user may see and change.
 */
export class KubeSandboxClient implements AgentSandboxClient {
  public readonly mode = 'cluster' as const;

  private readonly http: AxiosInstance;
  private readonly createSocket: SocketFactory | undefined;

  constructor(baseUrl = '', http?: AxiosInstance, createSocket?: SocketFactory) {
    this.http =
      http ??
      axios.create({
        baseURL: baseUrl || undefined,
        headers: { Accept: 'application/json' },
      });
    this.createSocket = createSocket;
  }

  private sandboxesUrl(namespace: string): string {
    return `${DASHBOARD_API_PATH}/namespace/${encodeURIComponent(namespace)}/sandboxes`;
  }

  private sandboxUrl(namespace: string, name: string): string {
    return `${this.sandboxesUrl(namespace)}/${encodeURIComponent(name)}`;
  }

  /**
   * Asks the backend whether the cluster serves the Sandbox API group, so the
   * bootstrap code can decide between the cluster client and the mock one
   * without failing the whole page load.
   *
   * Only an explicit `available: true` counts: an HTML page served by a
   * misrouted request parses as a 200 too, and that must not be read as a
   * working API.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const response = await this.http.get<SandboxApiAvailability>(
        `${DASHBOARD_API_PATH}/sandboxes/available`,
      );
      return response.data?.available === true;
    } catch {
      return false;
    }
  }

  public async listSandboxes(namespace: string): Promise<SandboxList> {
    try {
      const response = await this.http.get<SandboxList>(this.sandboxesUrl(namespace));
      const list = response.data;
      return { ...list, items: list?.items ?? [] };
    } catch (error) {
      throw toSandboxClientError(error, `Failed to list sandboxes in '${namespace}'.`);
    }
  }

  /**
   * Subscribes to the backend's sandbox channel. The backend holds the
   * Kubernetes watch and relays it, for the same reason the REST calls are
   * relayed: the API server is not reachable from the browser.
   */
  public watchSandboxes(
    namespace: string,
    resourceVersion: string,
    listener: SandboxWatchListener,
  ): StopWatching {
    return watchSandboxes(
      buildWebSocketUrl(WEBSOCKET_PATH),
      namespace,
      resourceVersion,
      listener,
      this.createSocket,
    );
  }

  public async getSandbox(namespace: string, name: string): Promise<Sandbox> {
    try {
      const response = await this.http.get<Sandbox>(this.sandboxUrl(namespace, name));
      return response.data;
    } catch (error) {
      throw toSandboxClientError(error, `Failed to read sandbox '${name}'.`);
    }
  }

  public async createSandbox(namespace: string, sandbox: Sandbox): Promise<Sandbox> {
    try {
      const response = await this.http.post<Sandbox>(this.sandboxesUrl(namespace), sandbox, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      throw toSandboxClientError(error, `Failed to create sandbox '${sandbox.metadata.name}'.`);
    }
  }

  public async deleteSandbox(namespace: string, name: string): Promise<void> {
    try {
      await this.http.delete(this.sandboxUrl(namespace, name));
    } catch (error) {
      throw toSandboxClientError(error, `Failed to delete sandbox '${name}'.`);
    }
  }

  public async patchSandbox(
    namespace: string,
    name: string,
    patch: SandboxPatch,
  ): Promise<Sandbox> {
    try {
      const response = await this.http.patch<Sandbox>(this.sandboxUrl(namespace, name), patch, {
        headers: { 'Content-Type': 'application/merge-patch+json' },
      });
      return response.data;
    } catch (error) {
      throw toSandboxClientError(error, `Failed to update sandbox '${name}'.`);
    }
  }

  /**
   * Asks the backend for this sandbox's events only - the Events tab refreshes
   * on a timer, and the whole namespace event stream every few seconds is a
   * lot of payload for a handful of rows. The client-side filter stays as a
   * guard for a backend that does not honour the parameter.
   */
  public async listEvents(namespace: string, name: string): Promise<SandboxEvent[]> {
    try {
      const response = await this.http.get<CoreV1EventList>(
        `${DASHBOARD_API_PATH}/namespace/${encodeURIComponent(namespace)}/events`,
        { params: { involvedObjectName: name } },
      );
      return (response.data?.items ?? [])
        .filter(event => event.involvedObject?.name === name)
        .map((event, index) => ({
          uid: event.metadata?.uid ?? event.metadata?.name ?? `event-${index}`,
          type: event.type,
          reason: event.reason,
          message: event.message,
          count: event.count ?? event.series?.count,
          lastTimestamp:
            event.lastTimestamp ??
            event.series?.lastObservedTime ??
            event.eventTime ??
            event.metadata?.creationTimestamp,
          firstTimestamp: event.firstTimestamp ?? event.eventTime,
          reportingComponent: event.reportingComponent || event.source?.component,
        }));
    } catch (error) {
      throw toSandboxClientError(error, `Failed to read events of '${name}'.`);
    }
  }

  public async listNamespaces(): Promise<string[]> {
    try {
      const response = await this.http.get<{ name?: string }[]>(CHE_NAMESPACES_PATH);
      return (Array.isArray(response.data) ? response.data : [])
        .map(item => item?.name)
        .filter((name): name is string => typeof name === 'string');
    } catch {
      // A standalone deployment has no Che server next to it; the UI then falls
      // back to the configured namespace and lets the user type another one.
      return [];
    }
  }
}
