/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import common from '@eclipse-che/common';
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { getAxiosInstance } from '@/services/axios-wrapper/getAxiosInstance';
import { delay } from '@/services/helpers/delay';

type AxiosFunc = (url: string, config?: AxiosRequestConfig) => Promise<any>;
type AxiosFuncWithData = (url: string, data?: any, config?: AxiosRequestConfig) => Promise<any>;

export const bearerTokenAuthorizationIsRequiredErrorMsg = 'Bearer Token Authorization is required';
export const SSL_ERROR_MSG =
  'The required SSL certificate is missing or not trusted by the system. Please contact your administrator.';

export class AxiosWrapper {
  protected readonly retryCount = 3;
  protected readonly base = 2;
  protected readonly initialDelay = 500;
  protected readonly axiosInstance: AxiosInstance;
  protected readonly errorMessagesToRetry?: string;
  protected readonly errorMessagesNotToRetry?: string;

  constructor(
    axiosInstance: AxiosInstance,
    errorMessagesToRetry?: string,
    errorMessagesNotToRetry?: string,
  ) {
    this.axiosInstance = axiosInstance;
    this.errorMessagesToRetry = errorMessagesToRetry;
    this.errorMessagesNotToRetry = errorMessagesNotToRetry;
  }

  static createToRetryMissedBearerTokenError(): AxiosWrapper {
    return new AxiosWrapper(getAxiosInstance(), bearerTokenAuthorizationIsRequiredErrorMsg);
  }

  static createToRetryAnyErrors(): AxiosWrapper {
    return new AxiosWrapper(getAxiosInstance());
  }

  static createToRetryAnyErrorsButNotSSLError(): AxiosWrapper {
    return new AxiosWrapper(getAxiosInstance(), undefined, SSL_ERROR_MSG);
  }

  get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    return this.retryAxiosFunc(this.axiosInstance.get, url, config);
  }

  delete<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R> {
    return this.retryAxiosFunc(this.axiosInstance.delete, url, config);
  }

  post<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<R> {
    return this.retryAxiosFuncWithData(this.axiosInstance.post, url, data, config);
  }

  put<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<R> {
    return this.retryAxiosFuncWithData(this.axiosInstance.put, url, data, config);
  }

  patch<T = any, R = AxiosResponse<T>>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<R> {
    return this.retryAxiosFuncWithData(this.axiosInstance.patch, url, data, config);
  }

  private retryAxiosFunc<T = any, R = AxiosResponse<T>>(
    axiosFunc: AxiosFunc,
    url: string,
    config?: any,
  ): Promise<R> {
    return this.doRetryFunc(() => axiosFunc(url, config), url, this.retryCount);
  }

  private retryAxiosFuncWithData<T = any, R = AxiosResponse<T>>(
    axiosFunc: AxiosFuncWithData,
    url: string,
    data?: string,
    config?: any,
  ): Promise<R> {
    return this.doRetryFunc(() => axiosFunc(url, data, config), url, this.retryCount);
  }

  async doRetryFunc<T = any, R = AxiosResponse<T>>(
    fun: () => Promise<R>,
    url: string,
    retry: number,
  ): Promise<R> {
    try {
      return await fun();
    } catch (err) {
      const message = common.helpers.errors.getMessage(err);
      if (
        !retry ||
        (this.errorMessagesToRetry && !this.errorMessagesToRetry.includes(message)) ||
        (this.errorMessagesNotToRetry && this.errorMessagesNotToRetry.includes(message))
      ) {
        throw err;
      }

      // Retry the request after an exponential delay.
      const exp = this.retryCount - retry;
      const expDelay = this.initialDelay * this.base ** exp;
      console.warn(`Retrying request to ${url} in ${expDelay} ms, ${retry} left`);
      await delay(expDelay);

      return await this.doRetryFunc(fun, url, --retry);
    }
  }
}
