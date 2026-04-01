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

import fs from 'fs';

const mockIsLocalRun = jest.fn();
jest.mock('@/localRun', () => ({
  isLocalRun: mockIsLocalRun,
}));
jest.mock('@/utils/logger');

import {
  getServiceAccountToken,
  SERVICE_ACCOUNT_TOKEN_PATH,
} from '@/routes/api/helpers/getServiceAccountToken';
import { logger } from '@/utils/logger';

describe('getServiceAccountToken', () => {
  const originalEnv = process.env;
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called');
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it('should return SERVICE_ACCOUNT_TOKEN env variable when running locally', () => {
    mockIsLocalRun.mockReturnValue(true);
    process.env = { ...originalEnv, SERVICE_ACCOUNT_TOKEN: 'local-token' };

    const result = getServiceAccountToken();

    expect(result).toBe('local-token');
  });

  it('should return token from file when not running locally and file exists', () => {
    mockIsLocalRun.mockReturnValue(false);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('file-token'));

    const result = getServiceAccountToken();

    expect(result).toBe('file-token');
    expect(fs.existsSync).toHaveBeenCalledWith(SERVICE_ACCOUNT_TOKEN_PATH);
    expect(fs.readFileSync).toHaveBeenCalledWith(SERVICE_ACCOUNT_TOKEN_PATH);
  });

  it('should log fatal and exit when not running locally and file does not exist', () => {
    mockIsLocalRun.mockReturnValue(false);
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(() => getServiceAccountToken()).toThrow('process.exit called');
    expect(logger.fatal).toHaveBeenCalledWith('SERVICE_ACCOUNT_TOKEN is required');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
