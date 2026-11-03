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

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { KubeSandboxClient, toSandboxClientError } from '@/services/client/kubeClient';
import { WatchSocket } from '@/services/client/sandboxWatch';
import { buildActionPatch } from '@/services/sandbox';
import { Sandbox, SANDBOX_KIND, SandboxClientError, SandboxWatchEvent } from '@/services/types';

const NAMESPACE = 'user-ns';
const SANDBOXES_URL = `/dashboard/api/namespace/${NAMESPACE}/sandboxes`;

const SANDBOX: Sandbox = {
  kind: SANDBOX_KIND,
  metadata: { name: 'hello-world', namespace: NAMESPACE },
  spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
};

type StubReply = { status: number; data?: unknown };
type StubResponder = (config: InternalAxiosRequestConfig) => StubReply;

/**
 * Replaces the axios adapter rather than the whole instance, so the client is
 * tested through the real request pipeline (URL building, params, headers).
 */
function stubHttp(responder: StubResponder) {
  const requests: InternalAxiosRequestConfig[] = [];

  const http = axios.create({
    adapter: async config => {
      requests.push(config);
      const { status, data } = responder(config);
      const response: AxiosResponse = {
        status,
        statusText: '',
        data,
        headers: {},
        config,
      };
      if (status >= 400) {
        throw new AxiosError(
          `Request failed with status code ${status}`,
          String(status),
          config,
          {},
          response,
        );
      }
      return response;
    },
  });

  return { client: new KubeSandboxClient('', http), requests };
}

/** The adapter sees the request body already serialized by axios. */
function sentBody(config: InternalAxiosRequestConfig): unknown {
  return JSON.parse(String(config.data));
}

/** Replies with the same payload whatever is requested. */
function stubReply(status: number, data?: unknown) {
  return stubHttp(() => ({ status, data }));
}

describe('KubeSandboxClient', () => {
  it('reports itself as the cluster-backed client', () => {
    expect(new KubeSandboxClient().mode).toBe('cluster');
  });

  describe('isAvailable', () => {
    it('is true when the backend reports the API group as served', async () => {
      const { client, requests } = stubReply(200, { available: true });

      expect(await client.isAvailable()).toBe(true);
      expect(requests[0].url).toBe('/dashboard/api/sandboxes/available');
    });

    it('is false when the CRDs are not installed', async () => {
      expect(await stubReply(200, { available: false }).client.isAvailable()).toBe(false);
    });

    it('is false for a 200 that is not the expected payload', async () => {
      expect(await stubReply(200, '<html>login page</html>').client.isAvailable()).toBe(false);
    });

    it('is false when the probe itself fails', async () => {
      expect(await stubReply(404).client.isAvailable()).toBe(false);
    });
  });

  describe('listSandboxes', () => {
    it('requests the namespaced collection and returns its items', async () => {
      const { client, requests } = stubReply(200, { items: [SANDBOX] });

      expect((await client.listSandboxes(NAMESPACE)).items).toEqual([SANDBOX]);
      expect(requests[0].url).toBe(SANDBOXES_URL);
    });

    it('keeps the resource version the watch has to start from', async () => {
      const { client } = stubReply(200, { metadata: { resourceVersion: '4242' }, items: [] });

      expect((await client.listSandboxes(NAMESPACE)).metadata?.resourceVersion).toBe('4242');
    });

    it('returns nothing for a list without items', async () => {
      expect((await stubReply(200, {}).client.listSandboxes(NAMESPACE)).items).toEqual([]);
    });

    it('turns a 403 into a typed error carrying the API reason', async () => {
      const { client } = stubReply(403, {
        message: 'sandboxes is forbidden',
        reason: 'Forbidden',
        code: 403,
      });

      await expect(client.listSandboxes(NAMESPACE)).rejects.toMatchObject({
        statusCode: 403,
        message: 'sandboxes is forbidden',
        reason: 'Forbidden',
      });
    });

    it('falls back to the HTTP status when the body is not a Status object', async () => {
      const { client } = stubReply(500, '<html>gateway error</html>');

      await expect(client.listSandboxes(NAMESPACE)).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  it('reads a single sandbox', async () => {
    const { client, requests } = stubReply(200, SANDBOX);

    expect(await client.getSandbox(NAMESPACE, 'hello-world')).toEqual(SANDBOX);
    expect(requests[0].url).toBe(`${SANDBOXES_URL}/hello-world`);
  });

  it('posts a new sandbox as JSON', async () => {
    const { client, requests } = stubReply(201, SANDBOX);

    expect(await client.createSandbox(NAMESPACE, SANDBOX)).toEqual(SANDBOX);
    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe(SANDBOXES_URL);
    expect(requests[0].headers['Content-Type']).toBe('application/json');
    expect(sentBody(requests[0])).toEqual(SANDBOX);
  });

  it('reports a name collision as 409', async () => {
    const { client } = stubReply(409, { message: 'already exists', reason: 'AlreadyExists' });

    await expect(client.createSandbox(NAMESPACE, SANDBOX)).rejects.toMatchObject({
      statusCode: 409,
      reason: 'AlreadyExists',
    });
  });

  it('deletes a sandbox', async () => {
    const { client, requests } = stubReply(200, {});

    await expect(client.deleteSandbox(NAMESPACE, 'hello-world')).resolves.toBeUndefined();
    expect(requests[0].method).toBe('delete');
    expect(requests[0].url).toBe(`${SANDBOXES_URL}/hello-world`);
  });

  it('sends a lifecycle change as a merge patch', async () => {
    const { client, requests } = stubReply(200, SANDBOX);
    const patch = buildActionPatch('suspend');

    await client.patchSandbox(NAMESPACE, 'hello-world', patch);

    expect(requests[0].method).toBe('patch');
    expect(requests[0].headers['Content-Type']).toBe('application/merge-patch+json');
    expect(sentBody(requests[0])).toEqual(patch);
  });

  it('reports a failed patch', async () => {
    const { client } = stubReply(403, { message: 'forbidden', reason: 'Forbidden' });

    await expect(
      client.patchSandbox(NAMESPACE, 'hello-world', {} as Partial<Sandbox>),
    ).rejects.toBeInstanceOf(SandboxClientError);
  });

  it('escapes names and namespaces in the request path', async () => {
    const { client, requests } = stubReply(200, SANDBOX);

    await client.getSandbox('my/ns', 'a/b');

    expect(requests[0].url).toBe('/dashboard/api/namespace/my%2Fns/sandboxes/a%2Fb');
  });

  describe('watchSandboxes', () => {
    function fakeSocket(): WatchSocket {
      return {
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };
    }

    it('subscribes to the backend WebSocket on the page origin', () => {
      const socket = fakeSocket();
      const urls: string[] = [];
      const client = new KubeSandboxClient('', undefined, url => {
        urls.push(url);
        return socket;
      });

      const stop = client.watchSandboxes(NAMESPACE, '42', jest.fn());
      socket.onopen?.call(undefined, {});

      expect(urls).toEqual([`ws://${window.location.host}/dashboard/api/websocket`]);
      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          method: 'SUBSCRIBE',
          channel: 'sandbox',
          params: { namespace: NAMESPACE, resourceVersion: '42' },
        }),
      );

      stop();
      expect(socket.close).toHaveBeenCalled();
    });

    it('hands the sandbox changes it receives to the listener', () => {
      const socket = fakeSocket();
      const events: SandboxWatchEvent[] = [];
      const client = new KubeSandboxClient('', undefined, () => socket);

      client.watchSandboxes(NAMESPACE, '', event => events.push(event));
      socket.onmessage?.call(undefined, {
        data: JSON.stringify({
          channel: 'sandbox',
          message: { eventPhase: 'MODIFIED', sandbox: SANDBOX },
        }),
      });

      expect(events).toEqual([{ type: 'MODIFIED', sandbox: SANDBOX }]);
    });
  });

  describe('listEvents', () => {
    it('keeps only the events of the sandbox and flattens them', async () => {
      const { client, requests } = stubReply(200, {
        items: [
          {
            metadata: { uid: 'uid-1' },
            involvedObject: { name: 'hello-world' },
            type: 'Warning',
            reason: 'FailedScheduling',
            message: 'no nodes available',
            count: 3,
            lastTimestamp: '2025-06-01T10:00:00Z',
            reportingComponent: 'default-scheduler',
          },
          {
            metadata: { uid: 'uid-2' },
            involvedObject: { name: 'another-sandbox' },
            reason: 'Pulled',
          },
        ],
      });

      expect(await client.listEvents(NAMESPACE, 'hello-world')).toEqual([
        {
          uid: 'uid-1',
          type: 'Warning',
          reason: 'FailedScheduling',
          message: 'no nodes available',
          count: 3,
          lastTimestamp: '2025-06-01T10:00:00Z',
          firstTimestamp: undefined,
          reportingComponent: 'default-scheduler',
        },
      ]);
      expect(requests[0].url).toBe(`/dashboard/api/namespace/${NAMESPACE}/events`);
      // The tab refreshes on a timer, so the narrowing has to happen on the
      // server; the filter above is only a guard for a backend that ignores it.
      expect(requests[0].params).toEqual({ involvedObjectName: 'hello-world' });
    });

    it('dates an events.k8s.io event, which carries no lastTimestamp', async () => {
      // What the sandbox controller emits: eventTime and source instead of the
      // timestamps and reportingComponent the kubelet still sets.
      const { client } = stubReply(200, {
        items: [
          {
            metadata: { uid: 'uid-1' },
            involvedObject: { name: 'hello-world' },
            type: 'Normal',
            reason: 'SandboxPodCreated',
            message: 'Created Pod "hello-world"',
            eventTime: '2025-06-01T10:00:00.626329Z',
            source: { component: 'sandbox-controller' },
          },
        ],
      });

      expect(await client.listEvents(NAMESPACE, 'hello-world')).toEqual([
        {
          uid: 'uid-1',
          type: 'Normal',
          reason: 'SandboxPodCreated',
          message: 'Created Pod "hello-world"',
          count: undefined,
          lastTimestamp: '2025-06-01T10:00:00.626329Z',
          firstTimestamp: '2025-06-01T10:00:00.626329Z',
          reportingComponent: 'sandbox-controller',
        },
      ]);
    });

    it('dates a repeated event from its series', async () => {
      const { client } = stubReply(200, {
        items: [
          {
            metadata: { uid: 'uid-1', creationTimestamp: '2025-06-01T10:00:00Z' },
            involvedObject: { name: 'hello-world' },
            reason: 'BackOff',
            message: 'Back-off restarting failed container',
            eventTime: '2025-06-01T10:00:00Z',
            series: { count: 7, lastObservedTime: '2025-06-01T10:30:00Z' },
          },
        ],
      });

      expect(await client.listEvents(NAMESPACE, 'hello-world')).toEqual([
        expect.objectContaining({
          count: 7,
          lastTimestamp: '2025-06-01T10:30:00Z',
          firstTimestamp: '2025-06-01T10:00:00Z',
        }),
      ]);
    });

    it('dates an event that only has a creation timestamp', async () => {
      const { client } = stubReply(200, {
        items: [
          {
            metadata: { uid: 'uid-1', creationTimestamp: '2025-06-01T10:00:00Z' },
            involvedObject: { name: 'hello-world' },
            reason: 'Created',
            message: 'Created container agent',
          },
        ],
      });

      expect((await client.listEvents(NAMESPACE, 'hello-world'))[0].lastTimestamp).toBe(
        '2025-06-01T10:00:00Z',
      );
    });

    it('falls back to the name, then to a synthetic key, when an event has no uid', async () => {
      const { client } = stubReply(200, {
        items: [
          { metadata: { name: 'named-event' }, involvedObject: { name: 'hello-world' } },
          { involvedObject: { name: 'hello-world' }, reason: 'Pulled' },
        ],
      });

      expect((await client.listEvents(NAMESPACE, 'hello-world')).map(e => e.uid)).toEqual([
        'named-event',
        'event-1',
      ]);
    });

    it('propagates a failure so the caller can decide', async () => {
      const { client } = stubReply(403, { message: 'forbidden', reason: 'Forbidden' });

      await expect(client.listEvents(NAMESPACE, 'hello-world')).rejects.toBeInstanceOf(
        SandboxClientError,
      );
    });
  });

  describe('listNamespaces', () => {
    it('returns the namespace names Che reports for the user', async () => {
      const { client, requests } = stubReply(200, [{ name: 'a' }, {}]);

      expect(await client.listNamespaces()).toEqual(['a']);
      expect(requests[0].url).toBe('/api/kubernetes/namespace');
    });

    it('returns nothing rather than failing when there is no Che server', async () => {
      expect(await stubReply(404).client.listNamespaces()).toEqual([]);
    });

    it('returns nothing for a response that is not a list', async () => {
      expect(await stubReply(200, '<html>login page</html>').client.listNamespaces()).toEqual([]);
    });
  });
});

describe('toSandboxClientError', () => {
  it('reports a transport failure with no response as status 0', () => {
    const error = new AxiosError('Network Error', AxiosError.ERR_NETWORK);

    expect(toSandboxClientError(error, 'fallback')).toMatchObject({
      statusCode: 0,
      message: 'Network Error',
    });
  });

  it('keeps the message of a plain error', () => {
    expect(toSandboxClientError(new Error('boom'), 'fallback')).toMatchObject({
      statusCode: 0,
      message: 'boom',
    });
  });

  it('uses the fallback for something that is not an error at all', () => {
    expect(toSandboxClientError('nope', 'fallback')).toMatchObject({
      statusCode: 0,
      message: 'fallback',
    });
  });
});
