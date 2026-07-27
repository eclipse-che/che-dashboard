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
import { spawn } from 'child_process';
import { stringify } from 'querystring';
import WebSocket from 'ws';

export type ServerConfig = {
  opts: { [key: string]: any };
  server: string;
};

const PROTOCOLS = ['base64.channel.k8s.io'];

enum CHANNELS {
  STD_OUT = 1,
  STD_ERROR,
  ERROR,
}

/**
 * Execute the given command inside of a given container in a pod with a name and namespace and return the
 * stdout and stderr responses
 * @param pod The name of the pod
 * @param namespace The namespace where the pod lives
 * @param container The name of the container
 * @param command The command to return
 * @param serverConfig The current cluster configuration
 * @returns The object containing the stdOut and stdErr of running the command in the container
 */
export async function exec(
  pod: string,
  namespace: string,
  container: string,
  command: string[],
  serverConfig: ServerConfig,
): Promise<{ stdOut: string; stdError: string }> {
  // Wait until the exec request is done and reject if the final status is a failure, otherwise
  // everything went OK and stdOutStream contains the response
  let stdOut = '';
  let stdError = '';
  const MAX_OUTPUT_BYTES = 1 * 1024 * 1024; // 1 MiB per stream — guards against runaway output
  const { server, opts } = serverConfig;
  try {
    await new Promise<void>((resolve, reject) => {
      const k8sServer = server.replace(/^http/, 'ws');
      if (!k8sServer) {
        reject('Failed to get kubernetes client server.');
        return; // prevent fall-through to WebSocket construction with empty URL
      }
      const queryStr = stringify({ stdout: true, stderr: true, command, container });
      const url = `${k8sServer}/api/v1/namespaces/${namespace}/pods/${pod}/exec?${queryStr}`;

      const client = new WebSocket(url, PROTOCOLS, opts);
      let openTimeoutObj: NodeJS.Timeout | undefined;
      let timedOut = false;

      client.onopen = () => {
        openTimeoutObj = setTimeout(() => {
          timedOut = true;
          if (client.readyState === WebSocket.OPEN) {
            client.close();
          }
        }, 30000);
      };

      client.onclose = () => {
        if (openTimeoutObj) {
          clearTimeout(openTimeoutObj);
        }
        if (timedOut) {
          reject(new Error('exec timed out after 30 seconds'));
        } else {
          resolve();
        }
      };

      client.onerror = (err: WebSocket.ErrorEvent) => {
        const message = helpers.errors.getMessage(err);
        stdError += message;
        reject(message);
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      };

      client.onmessage = (event: WebSocket.MessageEvent) => {
        if (typeof event.data !== 'string') {
          return;
        }
        const channel = CHANNELS[parseInt(event.data[0], 8)];

        // Empty STDOUT frames signal exec readiness; skip them.
        if (channel === CHANNELS[CHANNELS.STD_OUT] && event.data.length === 1) {
          return;
        }

        const message = Buffer.from(event.data.substr(1), 'base64').toString('utf-8').trim();

        if (channel === CHANNELS[CHANNELS.STD_OUT]) {
          if (stdOut.length + message.length <= MAX_OUTPUT_BYTES) {
            stdOut += message;
          }
        } else if (channel === CHANNELS[CHANNELS.STD_ERROR]) {
          if (stdError.length + message.length <= MAX_OUTPUT_BYTES) {
            stdError += message;
          }
        } else if (channel === CHANNELS[CHANNELS.ERROR]) {
          // Kubernetes sends process exit status as JSON on the ERROR channel,
          // e.g. {"status":"Success"} or {"status":"Failure","message":"..."}.
          // Close the socket on any terminal status so the promise settles
          // promptly instead of waiting for the 30-second timeout.
          try {
            const status = JSON.parse(message) as { status?: string; message?: string };
            if (status.status === 'Failure' && status.message) {
              stdError += status.message;
            }
            if (status.status === 'Success' || status.status === 'Failure') {
              if (client.readyState === WebSocket.OPEN) {
                client.close();
              }
            }
          } catch {
            if (stdError.length + message.length <= MAX_OUTPUT_BYTES) {
              stdError += message;
            }
          }
        }
      };
    });
  } catch (e) {
    throw helpers.errors.getMessage(e);
  }
  return { stdOut, stdError };
}

export function run(cmd: string, args?: string[], options?: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = spawn(cmd, args, options);
    let result = '';
    command.stdout.on('data', data => {
      result += data.toString();
    });
    command.on('close', () => {
      resolve(result.replace(/\n/g, ' ').trim());
    });
    command.on('error', err => {
      reject(err);
    });
  });
}
