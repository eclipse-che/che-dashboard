/*
 * Copyright (c) 2018-2020 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { injectable } from 'inversify';
import WorkspaceClient, { IWorkspaceMasterApi, IRemoteAPI } from '@eclipse-che/workspace-client';
import { KeycloakAuthService } from '../keycloak/auth';
import { EventEmitter } from 'events';

export type WebSocketsFailedCallback = () => void;

/**
 * This class manages the api connection.
 */
@injectable()
export class CheWorkspaceClient {
  private readonly axios: AxiosInstance;
  private originLocation: string;
  private baseUrl: string;
  private _restApiClient: IRemoteAPI;
  private _jsonRpcMasterApi: IWorkspaceMasterApi;
  private _failingWebSockets: string[];
  private webSocketEventEmitter: EventEmitter;
  private webSocketEventName = 'websocketChanged';

  /**
   * Default constructor that is using resource.
   */
  constructor() {
    this.baseUrl = '/api';
    this._failingWebSockets = [];
    this.webSocketEventEmitter = new EventEmitter();

    this.originLocation = new URL(window.location.href).origin;

    // todo change this temporary solution after adding the proper method to workspace-client https://github.com/eclipse/che/issues/18311
    this.axios = (WorkspaceClient as any).createAxiosInstance({ loggingEnabled: false });
    if (this.axios.defaults.headers === undefined) {
      this.axios.defaults.headers = {};
    }
    if (this.axios.defaults.headers.common === undefined) {
      this.axios.defaults.headers.common = {};
    }
    let isUpdated: boolean;
    const updateTimer = () => {
      if (!isUpdated) {
        isUpdated = true;
        setTimeout(() => {
          isUpdated = false;
        }, 30000);
      }
    };
    updateTimer();
    this.axios.interceptors.request.use(async request => {
      const { keycloak } = KeycloakAuthService;
      if (keycloak && keycloak.updateToken && !isUpdated) {
        updateTimer();
        try {
          await this.refreshToken(request);
        } catch (e) {
          console.error('Failed to update token.', e);
          window.sessionStorage.setItem('oidcDashboardRedirectUrl', location.href);
          if (keycloak.login) {
            keycloak.login();
          }
        }
      }
      return request;
    });
  }

  private get token(): string | undefined {
    const { keycloak } = KeycloakAuthService;
    return keycloak ? keycloak.token : undefined;
  }

  get restApiClient(): IRemoteAPI {
    // Lazy initialization of restApiClient
    if (!this._restApiClient) {
      this.updateRestApiClient();
    }
    return this._restApiClient;
  }

  get jsonRpcMasterApi(): IWorkspaceMasterApi {
    // Lazy initialization of restApiClient
    if (!this._jsonRpcMasterApi) {
      this.updateJsonRpcMasterApi();
    }
    return this._jsonRpcMasterApi;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  updateRestApiClient(): void {
    const baseUrl = this.baseUrl;
    const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
    this._restApiClient = WorkspaceClient.getRestApi({ baseUrl, headers });
  }

  async updateJsonRpcMasterApi(): Promise<void> {
    const jsonRpcApiLocation = this.originLocation.replace('http', 'ws');
    const tokenRefresher = () => this.refreshToken();
    this._jsonRpcMasterApi = WorkspaceClient.getJsonRpcApi(jsonRpcApiLocation, tokenRefresher);
    this._jsonRpcMasterApi.onDidWebSocketStatusChange((websockets: string[]) => {
      this._failingWebSockets = [];
      for (const websocket of websockets) {
        const trimmedWebSocketId = websocket.substring(0, websocket.indexOf('?'));
        this._failingWebSockets.push(trimmedWebSocketId);
      }
      this.webSocketEventEmitter.emit(this.webSocketEventName);
    });
    await this._jsonRpcMasterApi.connect();
    const clientId = this._jsonRpcMasterApi.getClientId();
    console.log('WebSocket connection clientId', clientId);
  }

  onWebSocketFailed(callback: WebSocketsFailedCallback) {
    this.webSocketEventEmitter.on(this.webSocketEventName, callback);
  }

  removeWebSocketFailedListener() {
    this.webSocketEventEmitter.removeAllListeners(this.webSocketEventName);
  }

  get failingWebSockets(): string[] {
    return Array.from(this._failingWebSockets);
  }

  private refreshToken(request?: AxiosRequestConfig): Promise<string | Error> {
    const { keycloak } = KeycloakAuthService;
    if (keycloak) {
      return new Promise((resolve, reject) => {
        keycloak.updateToken(5).success((refreshed: boolean) => {
          if (refreshed && keycloak.token) {
            const header = 'Authorization';
            this.axios.defaults.headers.common[header] = `Bearer ${keycloak.token}`;
            if (request) {
              request.headers.common[header] = `Bearer ${keycloak.token}`;
            }
          }
          resolve(keycloak.token as string);
        }).error((error: any) => {
          reject(new Error(error));
        });
      });
    }
    if (!this.token) {
      return Promise.reject(new Error('Unable to resolve token'));
    }
    return Promise.resolve(this.token);
  }
}
