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
import { inject, injectable } from 'inversify';
import WorkspaceClient, { IWorkspaceMasterApi, IRemoteAPI } from '@eclipse-che/workspace-client';
import { KeycloakAuthService } from '../keycloak/auth';
import { EventEmitter } from 'events';
import { KeycloakSetupService } from '../keycloak/setup';

export type WebSocketsFailedCallback = () => void;

const VALIDITY_TIME = 5;

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
  constructor(
    @inject(KeycloakSetupService) private keycloakSetupService: KeycloakSetupService,
  ) {
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

    this.keycloakSetupService.ready.then(() => {
      if (!KeycloakAuthService.sso) {
        return;
      }

      this.axios.interceptors.request.use(async config => {
        await this.handleRefreshToken(VALIDITY_TIME, config);
        return config;
      });

      window.addEventListener('message', (event: MessageEvent) => {
        if (typeof event.data !== 'string') {
          return;
        }
        if (event.data.startsWith('update-token:')) {
          const receivedValue = parseInt(event.data.split(':')[1], 10);
          const validityTime = Number.isNaN(receivedValue) ? VALIDITY_TIME : Math.ceil(receivedValue / 1000);
          this.handleRefreshToken(validityTime);
        }
      }, false);
    });
  }

  private async handleRefreshToken(minValidity: number, config?: AxiosRequestConfig): Promise<void> {
    try {
      await this.refreshToken(minValidity, config);
    } catch (e) {
      console.error('Failed to refresh token.', e);
      this.redirectedToKeycloakLogin();
    }
  }

  private redirectedToKeycloakLogin(): void {
    const { sessionStorage, location: { href } } = window;
    const { keycloak } = KeycloakAuthService;

    sessionStorage.setItem('oidcDashboardRedirectUrl', href);
    if (keycloak && keycloak.login) {
      keycloak.login();
    }
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
    const tokenRefresher = () => this.refreshToken(VALIDITY_TIME);
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

  private async refreshToken(minValidity: number, config?: AxiosRequestConfig): Promise<string> {
    const { keycloak, sso } = KeycloakAuthService;
    if (!sso || !keycloak) {
      return '';
    }

    const token = await new Promise<string>((resolve, reject) => {
      keycloak.updateToken(minValidity).success((refreshed: boolean) => {
        if (refreshed && keycloak.token) {
          const header = 'Authorization';
          this.axios.defaults.headers.common[header] = `Bearer ${keycloak.token}`;
          if (config) {
            config.headers.common[header] = `Bearer ${keycloak.token}`;
          }
        }
        resolve(keycloak.token as string);
      }).error(error => {
        reject(error);
      });
    });

    return token;
  }
}
