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

import common from '@eclipse-che/common';
import { AxiosError } from 'axios';
import mockAxios from 'axios';

import {
  deleteAiProviderKey,
  fetchAiProviderKeyStatus,
  saveAiProviderKey,
} from '@/services/backend-client/aiConfigApi';

const mockGet = mockAxios.get as jest.Mock;
const mockPost = mockAxios.post as jest.Mock;
const mockDelete = mockAxios.delete as jest.Mock;

describe('AiConfig API client', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAiProviderKeyStatus', () => {
    it('should fetch provider key status', async () => {
      mockGet.mockResolvedValueOnce({ data: ['google/gemini/latest'] });

      const result = await fetchAiProviderKeyStatus('test-namespace');
      expect(result).toEqual(['google/gemini/latest']);
    });

    it('should throw error when fetch fails', async () => {
      mockGet.mockRejectedValueOnce({
        code: '500',
        message: 'error message',
      } as AxiosError);

      let errorMessage: string | undefined;
      try {
        await fetchAiProviderKeyStatus('test-namespace');
      } catch (err) {
        errorMessage = common.helpers.errors.getMessage(err);
      }

      expect(errorMessage).toEqual('Failed to fetch AI provider key status. error message');
    });
  });

  describe('saveAiProviderKey', () => {
    it('should save the provider key', async () => {
      mockPost.mockResolvedValueOnce({ data: undefined });

      await expect(
        saveAiProviderKey('test-namespace', 'gemini-cli', 'GEMINI_API_KEY', 'test-api-key'),
      ).resolves.not.toThrow();
    });

    it('should throw error when save fails', async () => {
      mockPost.mockRejectedValueOnce({
        code: '500',
        message: 'error message',
      } as AxiosError);

      let errorMessage: string | undefined;
      try {
        await saveAiProviderKey('test-namespace', 'gemini-cli', 'GEMINI_API_KEY', 'test-api-key');
      } catch (err) {
        errorMessage = common.helpers.errors.getMessage(err);
      }

      expect(errorMessage).toEqual('Failed to save AI provider key. error message');
    });
  });

  describe('deleteAiProviderKey', () => {
    it('should delete the provider key', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      await expect(deleteAiProviderKey('test-namespace', 'gemini-cli')).resolves.not.toThrow();
    });

    it('should throw error when delete fails', async () => {
      mockDelete.mockRejectedValueOnce({
        code: '500',
        message: 'error message',
      } as AxiosError);

      let errorMessage: string | undefined;
      try {
        await deleteAiProviderKey('test-namespace', 'gemini-cli');
      } catch (err) {
        errorMessage = common.helpers.errors.getMessage(err);
      }

      expect(errorMessage).toEqual('Failed to delete AI provider key. error message');
    });
  });
});
