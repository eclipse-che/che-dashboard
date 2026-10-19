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

import * as mockClient from '@kubernetes/client-node';
import { CoreV1Api, V1Pod, V1Status } from '@kubernetes/client-node';
import { Readable, Writable } from 'stream';
import WebSocket from 'ws';

import {
  SandboxTerminalApiService,
  TERMINAL_COMMAND,
} from '@/devworkspaceClient/services/sandboxTerminalApi';
import { ISandboxTerminalSession } from '@/devworkspaceClient/types';

jest.mock('@/utils/logger');

const namespace = 'user-che';
const name = 'hello-world';

function pod(overrides: Partial<V1Pod> = {}): V1Pod {
  return {
    metadata: { name, namespace },
    spec: { containers: [{ name: 'agent' }] },
    status: { phase: 'Running' },
    ...overrides,
  };
}

/** Enough of the exec socket for the session to drive, and to assert on. */
class FakeSocket {
  readonly OPEN = 1;
  readonly CLOSED = 3;

  readyState = 1;
  readonly sent: Buffer[] = [];
  closeCalls = 0;

  private readonly listeners = new Map<string, (arg: never) => void>();

  on(event: string, listener: (arg: never) => void): this {
    this.listeners.set(event, listener);
    return this;
  }

  send(data: Buffer): void {
    this.sent.push(data);
  }

  close(): void {
    this.closeCalls += 1;
  }

  emit(event: 'close'): void;
  emit(event: 'error', error: Error): void;
  emit(event: string, arg?: unknown): void {
    this.listeners.get(event)?.(arg as never);
  }
}

/** What the service handed to `exec`, so the test can act as the API server. */
interface ExecCall {
  namespace: string;
  podName: string;
  containerName: string;
  command: string[];
  stdout: Writable;
  stderr: Writable;
  stdin: Readable;
  tty: boolean;
  onStatus: (status: V1Status) => void;
  socket: FakeSocket;
}

/**
 * An error shaped the way the client library reports one. A 404 also keeps the
 * test quick: `retryableExec` retries anything else five times over.
 */
function apiError(message: string): Error {
  return Object.assign(new Error(message), { code: 404, headers: {}, body: { message } });
}

/** Waits for the streams to deliver what was just written to them. */
function flush(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

describe('Sandbox Terminal API Service', () => {
  let service: SandboxTerminalApiService;
  let execCall: ExecCall | undefined;

  const stubCoreV1Api = {
    listNamespacedPod: () => Promise.resolve({ items: [pod()] }),
    readNamespacedPod: () => Promise.resolve(pod()),
  } as unknown as CoreV1Api;

  const spyListPod = jest.spyOn(stubCoreV1Api, 'listNamespacedPod');
  const spyReadPod = jest.spyOn(stubCoreV1Api, 'readNamespacedPod');

  const spyExec = jest.spyOn(mockClient.Exec.prototype, 'exec');

  beforeEach(() => {
    const kubeConfig = new mockClient.KubeConfig();
    kubeConfig.makeApiClient = jest.fn().mockReturnValue(stubCoreV1Api);

    execCall = undefined;
    spyExec.mockImplementation(
      (
        execNamespace: string,
        podName: string,
        containerName: string,
        command: string | string[],
        stdout: Writable | null,
        stderr: Writable | null,
        stdin: Readable | null,
        tty: boolean,
        onStatus?: (status: V1Status) => void,
      ) => {
        const socket = new FakeSocket();
        execCall = {
          namespace: execNamespace,
          podName,
          containerName,
          command: Array.isArray(command) ? command : [command],
          stdout: stdout as Writable,
          stderr: stderr as Writable,
          stdin: stdin as Readable,
          tty,
          onStatus: onStatus ?? (() => undefined),
          socket,
        };
        return Promise.resolve(socket as unknown as WebSocket);
      },
    );

    service = new SandboxTerminalApiService(kubeConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveTarget', () => {
    it('finds the pod by the label the sandbox carries', async () => {
      const target = await service.resolveTarget(namespace, name);

      expect(spyListPod).toHaveBeenCalledWith({
        namespace,
        labelSelector: `che.eclipse.org/sandbox=${name}`,
      });
      expect(target).toEqual({ podName: name, containerName: 'agent' });
    });

    it('prefers the running pod over one left behind by a resume', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [
          pod({ metadata: { name: 'old' }, status: { phase: 'Succeeded' } }),
          pod({ metadata: { name: 'current' } }),
        ],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      const target = await service.resolveTarget(namespace, name);

      expect(target.podName).toEqual('current');
    });

    it('skips the pod a suspend is still tearing down', async () => {
      // The outgoing pod keeps its phase until the kubelet is done with it, so
      // it looks every bit as runnable as the one that replaced it.
      spyListPod.mockResolvedValueOnce({
        items: [
          pod({ metadata: { name: 'old', deletionTimestamp: new Date() } }),
          pod({ metadata: { name: 'current' } }),
        ],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      const target = await service.resolveTarget(namespace, name);

      expect(target.podName).toEqual('current');
    });

    it('says the pod is going away rather than opening a shell that is about to die', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ metadata: { name, deletionTimestamp: new Date() } })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `The pod of sandbox '${name}' is shutting down`,
      );
    });

    it('drops the user into the workload, not into the proxy beside it', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ spec: { containers: [{ name: 'editor-proxy' }, { name: 'agent' }] } })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      const target = await service.resolveTarget(namespace, name);

      expect(target.containerName).toEqual('agent');
    });

    it('settles for the proxy when it is all the pod has', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ spec: { containers: [{ name: 'editor-proxy' }] } })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      const target = await service.resolveTarget(namespace, name);

      expect(target.containerName).toEqual('editor-proxy');
    });

    it('falls back to the pod the controller named after the sandbox', async () => {
      // A sandbox created without an editor carries no label, and is exactly
      // the case with no terminal of its own.
      spyListPod.mockResolvedValueOnce({ items: [] } as unknown as Awaited<
        ReturnType<CoreV1Api['listNamespacedPod']>
      >);

      const target = await service.resolveTarget(namespace, name);

      expect(spyReadPod).toHaveBeenCalledWith({ namespace, name });
      expect(target.podName).toEqual(name);
    });

    it('refuses a pod that is not up yet, and says what it is doing', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ status: { phase: 'Pending' } })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `The pod of sandbox '${name}' is Pending`,
      );
    });

    it('refuses a pod with no phase at all', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ status: {} })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `The pod of sandbox '${name}' is not running`,
      );
    });

    it('refuses a pod it cannot name', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ metadata: {} })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `The pod of sandbox '${name}' has no name`,
      );
    });

    it('refuses a pod with nothing to exec into', async () => {
      spyListPod.mockResolvedValueOnce({
        items: [pod({ spec: { containers: [] } })],
      } as unknown as Awaited<ReturnType<CoreV1Api['listNamespacedPod']>>);

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `The pod of sandbox '${name}' has no container`,
      );
    });

    it('reports a listing the API server would not answer', async () => {
      spyListPod.mockRejectedValueOnce(apiError('namespaces "user-che" not found'));

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `Unable to find the pod of sandbox '${name}'`,
      );
      expect(spyReadPod).not.toHaveBeenCalled();
    });

    it('reports a sandbox with no pod under either name', async () => {
      spyListPod.mockResolvedValueOnce({ items: [] } as unknown as Awaited<
        ReturnType<CoreV1Api['listNamespacedPod']>
      >);
      spyReadPod.mockRejectedValueOnce(apiError('pods "hello-world" not found'));

      await expect(service.resolveTarget(namespace, name)).rejects.toThrow(
        `Unable to find the pod of sandbox '${name}'`,
      );
    });
  });

  describe('openSession', () => {
    const target = { podName: name, containerName: 'agent' };

    async function open(
      onData: (chunk: string) => void = () => undefined,
      onClose: (reason: string | undefined) => void = () => undefined,
    ): Promise<{ session: ISandboxTerminalSession; call: ExecCall }> {
      const session = await service.openSession(namespace, target, { onData, onClose });
      if (execCall === undefined) {
        throw new Error('exec was not called');
      }
      return { session, call: execCall };
    }

    it('asks for an interactive shell on a terminal', async () => {
      const { call } = await open();

      expect(call.namespace).toEqual(namespace);
      expect(call.podName).toEqual(name);
      expect(call.containerName).toEqual('agent');
      expect(call.command).toEqual(TERMINAL_COMMAND);
      expect(call.tty).toBe(true);
    });

    it('reports what the shell writes, on either stream', async () => {
      const chunks: string[] = [];
      const { call } = await open(chunk => chunks.push(chunk));

      call.stdout.write(Buffer.from('a prompt'));
      call.stderr.write(Buffer.from('a warning'));
      await flush();

      expect(chunks).toEqual(['a prompt', 'a warning']);
    });

    it('feeds keystrokes to the shell', async () => {
      const { session, call } = await open();
      const typed: string[] = [];
      call.stdin.on('data', (chunk: Buffer) => typed.push(chunk.toString()));

      session.write('ls\r');
      await flush();

      expect(typed).toEqual(['ls\r']);
    });

    it('sends a resize on the channel the protocol reserves for it', async () => {
      const { session, call } = await open();

      session.resize(120, 40);

      expect(call.socket.sent).toHaveLength(1);
      const frame = call.socket.sent[0];
      expect(frame[0]).toEqual(4);
      // The API server reads capitalised keys here, unlike the browser.
      expect(JSON.parse(frame.subarray(1).toString())).toEqual({ Width: 120, Height: 40 });
    });

    it('drops a resize that arrives after the socket went away', async () => {
      const { session, call } = await open();
      call.socket.readyState = call.socket.CLOSED;

      session.resize(120, 40);

      expect(call.socket.sent).toEqual([]);
    });

    it('ends the shell and the socket when the browser leaves', async () => {
      const { session, call } = await open();
      const ended = new Promise(resolve => call.stdin.on('end', resolve));
      call.stdin.resume();

      session.close();

      await expect(ended).resolves.toBeUndefined();
      expect(call.socket.closeCalls).toEqual(1);
    });

    it('does not close a socket that is already gone', async () => {
      const { session, call } = await open();
      call.socket.readyState = call.socket.CLOSED;

      session.close();

      expect(call.socket.closeCalls).toEqual(0);
    });

    it('passes on why a shell that failed ended', async () => {
      const reasons: (string | undefined)[] = [];
      const { call } = await open(undefined, reason => reasons.push(reason));

      call.onStatus({
        status: 'Failure',
        message: 'command terminated with exit code 137',
      });
      call.socket.emit('close');

      expect(reasons).toEqual(['command terminated with exit code 137']);
    });

    it('says nothing when the user simply typed exit', async () => {
      const reasons: (string | undefined)[] = [];
      const { call } = await open(undefined, reason => reasons.push(reason));

      call.onStatus({ status: 'Success', message: 'ok' });
      call.socket.emit('close');

      expect(reasons).toEqual([undefined]);
    });

    it('reports a socket that broke rather than closed', async () => {
      const reasons: (string | undefined)[] = [];
      const { call } = await open(undefined, reason => reasons.push(reason));

      call.socket.emit('error', new Error('socket hang up'));

      expect(reasons).toEqual(['socket hang up']);
    });
  });
});
