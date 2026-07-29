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

import * as k8s from '@kubernetes/client-node';

import {
  cleanupExpiredAgentPods,
  createAgentPod,
  deleteAgentPod,
  getAgentPodStatus,
  getAgentServiceAccess,
  getAgentServiceUrl,
  heartbeatAgentPod,
  MAX_AGENT_PODS_PER_USER,
  startPeriodicAgentCleanup,
  stopPeriodicAgentCleanup,
} from '@/routes/api/helpers/agentPod';

jest.mock('@/localRun', () => ({
  isLocalRun: jest.fn(() => false),
}));

const mockListNamespacedPod = jest.fn();
const mockCreateNamespacedPod = jest.fn();
const mockDeleteNamespacedPod = jest.fn();
const mockPatchNamespacedPod = jest.fn();
const mockCreateNamespacedService = jest.fn();
const mockListNamespacedSecret = jest.fn();
const mockListNamespacedConfigMap = jest.fn();
const mockCreateNamespacedSecret = jest.fn();
const mockReplaceNamespacedSecret = jest.fn();
const mockDeleteNamespacedSecret = jest.fn();
const mockPatchNamespacedSecret = jest.fn();
const mockListPodForAllNamespaces = jest.fn();

jest.mock('@/routes/api/helpers/getDevWorkspaceClient', () => ({
  getKubeConfig: jest.fn(() => ({
    makeApiClient: jest.fn(() => ({
      listNamespacedPod: mockListNamespacedPod,
      createNamespacedPod: mockCreateNamespacedPod,
      deleteNamespacedPod: mockDeleteNamespacedPod,
      patchNamespacedPod: mockPatchNamespacedPod,
      createNamespacedService: mockCreateNamespacedService,
      listNamespacedSecret: mockListNamespacedSecret,
      listNamespacedConfigMap: mockListNamespacedConfigMap,
      createNamespacedSecret: mockCreateNamespacedSecret,
      replaceNamespacedSecret: mockReplaceNamespacedSecret,
      deleteNamespacedSecret: mockDeleteNamespacedSecret,
      patchNamespacedSecret: mockPatchNamespacedSecret,
      listPodForAllNamespaces: mockListPodForAllNamespaces,
    })),
    getCurrentCluster: jest.fn(() => ({ server: 'https://api.cluster.example.com' })),
  })),
}));

const NAMESPACE = 'test-namespace';
const TOKEN = 'test-token';
const AGENT_ID = 'anthropic/claude-code';

function makePod(
  overrides: Partial<{
    name: string;
    phase: string;
    ready: boolean;
    agentId: string;
    heartbeat: string;
    deletionTimestamp: string;
    uid: string;
  }> = {},
): k8s.V1Pod {
  return {
    metadata: {
      name: overrides.name || 'agent-anthropic-claude-code',
      namespace: NAMESPACE,
      uid: overrides.uid || 'pod-uid-123',
      labels: {
        'app.kubernetes.io/component': 'ai-agent',
        'app.kubernetes.io/part-of': 'che.eclipse.org',
        'che.eclipse.org/agent-id': 'anthropic-claude-code',
      },
      annotations: {
        'che.eclipse.org/ai-agent-id': overrides.agentId || AGENT_ID,
        'che.eclipse.org/last-heartbeat': overrides.heartbeat || new Date().toISOString(),
      },
      deletionTimestamp: overrides.deletionTimestamp
        ? new Date(overrides.deletionTimestamp)
        : undefined,
    },
    status: {
      phase: overrides.phase || 'Running',
      containerStatuses: [
        {
          name: 'agent',
          ready: overrides.ready !== undefined ? overrides.ready : true,
          restartCount: 0,
          image: 'test-image',
          imageID: 'test-image-id',
          started: true,
          state: {},
        },
      ],
    },
  };
}

describe('agentPod helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    stopPeriodicAgentCleanup();
  });

  describe('getAgentServiceUrl', () => {
    it('should construct a cluster-internal service URL', () => {
      const url = getAgentServiceUrl('my-ns', 'my-org/my-agent', 9090);
      expect(url).toBe('http://agent-my-org-my-agent-svc.my-ns.svc:9090');
    });

    it('should default to port 8080', () => {
      const url = getAgentServiceUrl('ns', 'agent-id');
      expect(url).toBe('http://agent-agent-id-svc.ns.svc:8080');
    });
  });

  describe('getAgentServiceAccess', () => {
    it('should return in-cluster URL when not local run', () => {
      const access = getAgentServiceAccess('ns', 'test/agent', 8080);
      expect(access.baseUrl).toBe('http://agent-test-agent-svc.ns.svc:8080');
      expect(access.httpsOptions).toBeUndefined();
    });
  });

  describe('getAgentPodStatus', () => {
    it('should return undefined when no pod exists', async () => {
      mockListNamespacedPod.mockResolvedValue({ items: [] });

      const result = await getAgentPodStatus(TOKEN, NAMESPACE, AGENT_ID);
      expect(result).toBeUndefined();
    });

    it('should return pod status when pod exists and is running', async () => {
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod({ phase: 'Running', ready: true })],
      });

      const result = await getAgentPodStatus(TOKEN, NAMESPACE, AGENT_ID);
      expect(result).toBeDefined();
      expect(result!.phase).toBe('Running');
      expect(result!.ready).toBe(true);
      expect(result!.agentId).toBe(AGENT_ID);
      expect(result!.serviceUrl).toContain('svc:8080');
    });

    it('should return not-ready status for pending pod', async () => {
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod({ phase: 'Pending', ready: false })],
      });

      const result = await getAgentPodStatus(TOKEN, NAMESPACE, AGENT_ID);
      expect(result).toBeDefined();
      expect(result!.phase).toBe('Pending');
      expect(result!.ready).toBe(false);
      expect(result!.serviceUrl).toBeUndefined();
    });

    it('should skip pods with deletionTimestamp', async () => {
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod({ deletionTimestamp: '2025-01-01T00:00:00Z' })],
      });

      const result = await getAgentPodStatus(TOKEN, NAMESPACE, AGENT_ID);
      expect(result).toBeUndefined();
    });
  });

  describe('createAgentPod', () => {
    const config = {
      image: 'quay.io/test/agent',
      tag: 'v1',
      memoryLimit: '2Gi',
      cpuLimit: '1',
      terminalPort: 8080,
      env: [{ name: 'MY_VAR', value: 'my-value' }],
    };

    it('should create a new pod and service', async () => {
      // No existing pod
      mockListNamespacedPod.mockResolvedValue({ items: [] });
      // No DW-mountable secrets/configmaps
      mockListNamespacedSecret.mockResolvedValue({ items: [] });
      mockListNamespacedConfigMap.mockResolvedValue({ items: [] });
      // Secret creation succeeds
      mockCreateNamespacedSecret.mockResolvedValue({});
      // Pod creation succeeds
      mockCreateNamespacedPod.mockResolvedValue(
        makePod({ phase: 'Pending', ready: false, uid: 'new-pod-uid' }),
      );
      // Secret owner ref patch
      mockPatchNamespacedSecret.mockResolvedValue({});
      // Service creation
      mockCreateNamespacedService.mockResolvedValue({});

      const result = await createAgentPod(TOKEN, NAMESPACE, AGENT_ID, config);

      expect(result.agentId).toBe(AGENT_ID);
      expect(mockCreateNamespacedPod).toHaveBeenCalled();
      expect(mockCreateNamespacedService).toHaveBeenCalled();
      expect(mockCreateNamespacedSecret).toHaveBeenCalled();
    });

    it('should return existing running pod without creating new one', async () => {
      mockListNamespacedPod
        .mockResolvedValueOnce({ items: [] }) // cleanup
        .mockResolvedValueOnce({
          items: [makePod({ phase: 'Running', ready: true })],
        });

      const result = await createAgentPod(TOKEN, NAMESPACE, AGENT_ID, config);

      expect(result.phase).toBe('Running');
      expect(mockCreateNamespacedPod).not.toHaveBeenCalled();
    });

    it('should delete failed pod and create new one', async () => {
      mockListNamespacedPod
        .mockResolvedValueOnce({ items: [] }) // cleanup
        .mockResolvedValueOnce({
          items: [makePod({ phase: 'Failed', ready: false })],
        }) // find existing (failed)
        .mockResolvedValueOnce({ items: [] }); // count active pods

      mockDeleteNamespacedPod.mockResolvedValue({});
      mockListNamespacedSecret.mockResolvedValue({ items: [] });
      mockListNamespacedConfigMap.mockResolvedValue({ items: [] });
      mockCreateNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedPod.mockResolvedValue(
        makePod({ phase: 'Pending', ready: false, uid: 'new-uid' }),
      );
      mockPatchNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedService.mockResolvedValue({});

      const result = await createAgentPod(TOKEN, NAMESPACE, AGENT_ID, config);
      expect(mockDeleteNamespacedPod).toHaveBeenCalled();
      expect(mockCreateNamespacedPod).toHaveBeenCalled();
      expect(result.agentId).toBe(AGENT_ID);
    });

    it('should throw 409 when max pod limit reached', async () => {
      const activePods = Array.from({ length: MAX_AGENT_PODS_PER_USER }, (_, i) =>
        makePod({ name: `agent-${i}`, agentId: `agent-${i}`, phase: 'Running' }),
      );

      mockListNamespacedPod
        .mockResolvedValueOnce({ items: [] }) // cleanup
        .mockResolvedValueOnce({ items: [] }) // find existing (none)
        .mockResolvedValueOnce({ items: activePods }); // count active

      await expect(createAgentPod(TOKEN, NAMESPACE, 'new-agent', config)).rejects.toThrow(
        /Maximum number of agent pods/,
      );
    });

    it('should filter blocked env var names', async () => {
      const configWithBlockedEnv = {
        ...config,
        env: [
          { name: 'MY_VAR', value: 'allowed' },
          { name: 'PATH', value: '/malicious' },
          { name: 'HOME', value: '/evil' },
          { name: 'LD_PRELOAD', value: '/lib/hook.so' },
          { name: 'KUBERNETES_API_URL', value: 'https://evil' },
          { name: 'SAFE_VAR', value: 'ok' },
        ],
      };

      mockListNamespacedPod.mockResolvedValue({ items: [] });
      mockListNamespacedSecret.mockResolvedValue({ items: [] });
      mockListNamespacedConfigMap.mockResolvedValue({ items: [] });
      mockCreateNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedPod.mockResolvedValue(
        makePod({ phase: 'Pending', ready: false, uid: 'uid-1' }),
      );
      mockPatchNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedService.mockResolvedValue({});

      await createAgentPod(TOKEN, NAMESPACE, 'test-agent', configWithBlockedEnv);

      const podBody = mockCreateNamespacedPod.mock.calls[0][0].body;
      const envNames = podBody.spec.containers[0].env.map((e: { name: string }) => e.name);
      expect(envNames).toContain('MY_VAR');
      expect(envNames).toContain('SAFE_VAR');
      expect(envNames).not.toContain('PATH');
      expect(envNames).not.toContain('HOME');
      expect(envNames).not.toContain('LD_PRELOAD');
      // KUBERNETES_API_URL is blocked from user input but added by the system
      expect(envNames.filter((n: string) => n === 'KUBERNETES_API_URL').length).toBe(1);
    });

    it('should include seccompProfile in securityContext', async () => {
      mockListNamespacedPod.mockResolvedValue({ items: [] });
      mockListNamespacedSecret.mockResolvedValue({ items: [] });
      mockListNamespacedConfigMap.mockResolvedValue({ items: [] });
      mockCreateNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedPod.mockResolvedValue(
        makePod({ phase: 'Pending', ready: false, uid: 'uid-2' }),
      );
      mockPatchNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedService.mockResolvedValue({});

      await createAgentPod(TOKEN, NAMESPACE, 'sec-agent', config);

      const podBody = mockCreateNamespacedPod.mock.calls[0][0].body;
      const secCtx = podBody.spec.containers[0].securityContext;
      expect(secCtx.seccompProfile).toEqual({ type: 'RuntimeDefault' });
      expect(secCtx.allowPrivilegeEscalation).toBe(false);
      expect(secCtx.runAsNonRoot).toBe(true);
      expect(secCtx.capabilities).toEqual({ drop: ['ALL'] });
    });

    it('should discover and mount DW secrets and configmaps', async () => {
      mockListNamespacedPod.mockResolvedValue({ items: [] });
      mockListNamespacedSecret.mockResolvedValue({
        items: [
          {
            metadata: {
              name: 'my-secret',
              annotations: {
                'controller.devfile.io/mount-as': 'file',
                'controller.devfile.io/mount-path': '/secrets/my-secret',
              },
            },
          },
          {
            metadata: {
              name: 'env-secret',
              annotations: {
                'controller.devfile.io/mount-as': 'env',
              },
            },
          },
        ],
      });
      mockListNamespacedConfigMap.mockResolvedValue({
        items: [
          {
            metadata: {
              name: 'env-cm',
              annotations: {
                'controller.devfile.io/mount-as': 'env',
              },
            },
          },
        ],
      });
      mockCreateNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedPod.mockResolvedValue(
        makePod({ phase: 'Pending', ready: false, uid: 'uid-3' }),
      );
      mockPatchNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedService.mockResolvedValue({});

      await createAgentPod(TOKEN, NAMESPACE, 'mount-agent', config);

      const podBody = mockCreateNamespacedPod.mock.calls[0][0].body;
      const volumes = podBody.spec.volumes;
      const volumeMounts = podBody.spec.containers[0].volumeMounts;
      const envFrom = podBody.spec.containers[0].envFrom;

      expect(volumes.some((v: k8s.V1Volume) => v.name === 'secret-my-secret')).toBe(true);
      expect(
        volumeMounts.some((vm: k8s.V1VolumeMount) => vm.mountPath === '/secrets/my-secret'),
      ).toBe(true);
      expect(envFrom).toBeDefined();
      expect(envFrom.length).toBe(2); // env-secret + env-cm
    });

    it('should handle secret already exists (409) by replacing', async () => {
      mockListNamespacedPod.mockResolvedValue({ items: [] });
      mockListNamespacedSecret.mockResolvedValue({ items: [] });
      mockListNamespacedConfigMap.mockResolvedValue({ items: [] });
      mockCreateNamespacedSecret.mockRejectedValue(
        Object.assign(new Error('conflict'), {
          statusCode: 409,
          code: 409,
          headers: {},
          body: { message: 'conflict' },
        }),
      );
      mockReplaceNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedPod.mockResolvedValue(
        makePod({ phase: 'Pending', ready: false, uid: 'uid-4' }),
      );
      mockPatchNamespacedSecret.mockResolvedValue({});
      mockCreateNamespacedService.mockResolvedValue({});

      await createAgentPod(TOKEN, NAMESPACE, 'replace-agent', config);
      expect(mockReplaceNamespacedSecret).toHaveBeenCalled();
    });
  });

  describe('deleteAgentPod', () => {
    it('should delete existing pod and secret', async () => {
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod()],
      });
      mockDeleteNamespacedPod.mockResolvedValue({});
      mockDeleteNamespacedSecret.mockResolvedValue({});

      await deleteAgentPod(TOKEN, NAMESPACE, AGENT_ID);

      expect(mockDeleteNamespacedPod).toHaveBeenCalled();
      expect(mockDeleteNamespacedSecret).toHaveBeenCalled();
    });

    it('should handle non-existent pod gracefully', async () => {
      mockListNamespacedPod.mockResolvedValue({ items: [] });
      mockDeleteNamespacedSecret.mockRejectedValue(
        Object.assign(new Error('not found'), {
          statusCode: 404,
          code: 404,
          headers: {},
          body: { message: 'not found' },
        }),
      );

      await expect(deleteAgentPod(TOKEN, NAMESPACE, AGENT_ID)).resolves.not.toThrow();
    });
  });

  describe('heartbeatAgentPod', () => {
    it('should update heartbeat annotation', async () => {
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod()],
      });
      mockPatchNamespacedPod.mockResolvedValue({});

      await heartbeatAgentPod(TOKEN, NAMESPACE, AGENT_ID);

      expect(mockPatchNamespacedPod).toHaveBeenCalled();
      const patchBody = mockPatchNamespacedPod.mock.calls[0][0].body;
      expect(patchBody.metadata.annotations['che.eclipse.org/last-heartbeat']).toBeDefined();
    });

    it('should do nothing when pod not found', async () => {
      mockListNamespacedPod.mockResolvedValue({ items: [] });

      await heartbeatAgentPod(TOKEN, NAMESPACE, AGENT_ID);

      expect(mockPatchNamespacedPod).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredAgentPods', () => {
    it('should delete pods with expired heartbeats', async () => {
      const expired = new Date(Date.now() - 25 * 60 * 1000).toISOString();
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod({ heartbeat: expired, name: 'expired-pod' })],
      });
      mockDeleteNamespacedPod.mockResolvedValue({});

      const deleted = await cleanupExpiredAgentPods(TOKEN, NAMESPACE);

      expect(deleted).toEqual(['expired-pod']);
      expect(mockDeleteNamespacedPod).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'expired-pod' }),
      );
    });

    it('should not delete pods with recent heartbeats', async () => {
      mockListNamespacedPod.mockResolvedValue({
        items: [makePod({ heartbeat: new Date().toISOString() })],
      });

      const deleted = await cleanupExpiredAgentPods(TOKEN, NAMESPACE);

      expect(deleted).toEqual([]);
      expect(mockDeleteNamespacedPod).not.toHaveBeenCalled();
    });

    it('should skip pods without heartbeat annotation', async () => {
      const pod = makePod();
      delete pod.metadata!.annotations!['che.eclipse.org/last-heartbeat'];
      mockListNamespacedPod.mockResolvedValue({ items: [pod] });

      const deleted = await cleanupExpiredAgentPods(TOKEN, NAMESPACE);

      expect(deleted).toEqual([]);
    });
  });

  describe('startPeriodicAgentCleanup', () => {
    it('should start periodic cleanup without error', () => {
      const getToken = jest.fn(() => TOKEN);

      expect(() => startPeriodicAgentCleanup(getToken)).not.toThrow();

      stopPeriodicAgentCleanup();
    });

    it('should not start multiple timers', () => {
      const getToken = jest.fn(() => TOKEN);

      startPeriodicAgentCleanup(getToken);
      startPeriodicAgentCleanup(getToken);

      stopPeriodicAgentCleanup();
    });
  });

  describe('normalizeAgentId via getAgentServiceUrl', () => {
    it('should handle mixed case agent IDs', () => {
      const url = getAgentServiceUrl('ns', 'MyOrg/MyAgent');
      expect(url).toBe('http://agent-myorg-myagent-svc.ns.svc:8080');
    });

    it('should strip special characters', () => {
      const url = getAgentServiceUrl('ns', 'org/agent_v2.1');
      expect(url).toBe('http://agent-org-agentv21-svc.ns.svc:8080');
    });
  });
});
