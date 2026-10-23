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

import { MockSandboxClient } from '@/services/client/mockClient';
import { buildActionPatch, getSandboxPhase } from '@/services/sandbox';
import {
  Sandbox,
  SANDBOX_KIND,
  SandboxClientError,
  SandboxPhase,
  SandboxWatchEvent,
} from '@/services/types';

const NAMESPACE = 'user-ns';

function newClient(): MockSandboxClient {
  // No ready delay: the tests assert on the settled state, not on the animation.
  return new MockSandboxClient(NAMESPACE, 0);
}

function newSandbox(name: string): Sandbox {
  return {
    kind: SANDBOX_KIND,
    metadata: { name },
    spec: { podTemplate: { spec: { containers: [{ name: 'agent', image: 'busybox' }] } } },
  };
}

describe('MockSandboxClient', () => {
  it('seeds one sandbox for each phase the list has to render', async () => {
    const { items } = await newClient().listSandboxes(NAMESPACE);

    expect(items.map(getSandboxPhase).sort()).toEqual(
      [
        SandboxPhase.BLOCKED,
        SandboxPhase.COMPLETED,
        SandboxPhase.RUNNING,
        SandboxPhase.SUSPENDED,
      ].sort(),
    );
  });

  it('reports a resource version the watch can start from', async () => {
    const { metadata } = await newClient().listSandboxes(NAMESPACE);

    expect(metadata?.resourceVersion).toBeTruthy();
  });

  it('does not leak the internal objects to the caller', async () => {
    const client = newClient();
    const [sandbox] = (await client.listSandboxes(NAMESPACE)).items;
    sandbox.metadata.name = 'tampered';

    const [again] = (await client.listSandboxes(NAMESPACE)).items;
    expect(again.metadata.name).not.toBe('tampered');
  });

  it('returns nothing for another namespace', async () => {
    expect((await newClient().listSandboxes('other-ns')).items).toEqual([]);
  });

  it('reads a sandbox back by name', async () => {
    expect((await newClient().getSandbox(NAMESPACE, 'hello-world')).metadata.name).toBe(
      'hello-world',
    );
  });

  it('reports 404 for an unknown sandbox', async () => {
    await expect(newClient().getSandbox(NAMESPACE, 'nope')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('creates a sandbox in the requested namespace', async () => {
    const client = newClient();
    const created = await client.createSandbox(NAMESPACE, newSandbox('fresh'));

    expect(created.metadata.namespace).toBe(NAMESPACE);
    expect(created.metadata.creationTimestamp).toBeDefined();
    expect(await client.getSandbox(NAMESPACE, 'fresh')).toBeDefined();
  });

  it('rejects a duplicate name with 409', async () => {
    const client = newClient();

    await expect(client.createSandbox(NAMESPACE, newSandbox('hello-world'))).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('settles a created sandbox into Running once the delay elapses', async () => {
    const client = newClient();
    await client.createSandbox(NAMESPACE, newSandbox('fresh'));

    expect(getSandboxPhase(await client.getSandbox(NAMESPACE, 'fresh'))).toBe(SandboxPhase.RUNNING);
  });

  it('reports a created sandbox as Pending while the delay is running', async () => {
    const client = new MockSandboxClient(NAMESPACE, 60_000);
    const created = await client.createSandbox(NAMESPACE, newSandbox('fresh'));

    expect(getSandboxPhase(created)).toBe(SandboxPhase.PENDING);
  });

  it('deletes a sandbox', async () => {
    const client = newClient();
    await client.deleteSandbox(NAMESPACE, 'hello-world');

    await expect(client.getSandbox(NAMESPACE, 'hello-world')).rejects.toThrow(SandboxClientError);
  });

  it('reports 404 when deleting an unknown sandbox', async () => {
    await expect(newClient().deleteSandbox(NAMESPACE, 'nope')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  describe('lifecycle patches', () => {
    it.each([
      ['suspend', 'hello-world', SandboxPhase.SUSPENDED],
      ['resume', 'openclaw-agent', SandboxPhase.RUNNING],
    ] as const)('%s moves %s to %s', async (action, name, expected) => {
      const client = newClient();
      const patched = await client.patchSandbox(NAMESPACE, name, buildActionPatch(action));

      expect(getSandboxPhase(patched)).toBe(expected);
      expect(getSandboxPhase(await client.getSandbox(NAMESPACE, name))).toBe(expected);
    });

    it('reports 404 when patching an unknown sandbox', async () => {
      await expect(
        newClient().patchSandbox(NAMESPACE, 'nope', buildActionPatch('suspend')),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('watchSandboxes', () => {
    function collect(client: MockSandboxClient): {
      events: SandboxWatchEvent[];
      stop: () => void;
    } {
      const events: SandboxWatchEvent[] = [];
      const stop = client.watchSandboxes(NAMESPACE, '', event => events.push(event));
      return { events, stop };
    }

    it('reports a created sandbox as ADDED and then MODIFIED', async () => {
      const client = newClient();
      const { events } = collect(client);

      await client.createSandbox(NAMESPACE, newSandbox('fresh'));

      expect(events.map(event => event.type)).toEqual(['ADDED', 'MODIFIED']);
    });

    it('reports a patched sandbox as MODIFIED', async () => {
      const client = newClient();
      const { events } = collect(client);

      await client.patchSandbox(NAMESPACE, 'hello-world', buildActionPatch('suspend'));

      expect(events).toEqual([
        { type: 'MODIFIED', sandbox: expect.objectContaining({ metadata: expect.anything() }) },
      ]);
    });

    it('reports a deleted sandbox as DELETED', async () => {
      const client = newClient();
      const { events } = collect(client);

      await client.deleteSandbox(NAMESPACE, 'hello-world');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('DELETED');
    });

    it('does not report changes in another namespace', async () => {
      const client = newClient();
      const events: SandboxWatchEvent[] = [];
      client.watchSandboxes('other-ns', '', event => events.push(event));

      await client.deleteSandbox(NAMESPACE, 'hello-world');

      expect(events).toEqual([]);
    });

    it('stops reporting once the watch is closed', async () => {
      const client = newClient();
      const { events, stop } = collect(client);

      stop();
      await client.deleteSandbox(NAMESPACE, 'hello-world');

      expect(events).toEqual([]);
    });
  });

  it('returns events for a seeded sandbox', async () => {
    const events = await newClient().listEvents(NAMESPACE, 'hello-world');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].uid).toBeDefined();
  });

  it('records a Created event for a new sandbox', async () => {
    const client = newClient();
    await client.createSandbox(NAMESPACE, newSandbox('fresh'));

    expect((await client.listEvents(NAMESPACE, 'fresh'))[0].reason).toBe('Created');
  });

  it('offers only the namespace it was seeded with', async () => {
    expect(await newClient().listNamespaces()).toEqual([NAMESPACE]);
  });
});
