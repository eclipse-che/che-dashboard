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

import { isAlreadyExistsError, SandboxClientError, toSandboxError } from '@/services/types';

describe('toSandboxError', () => {
  it('keeps the status code and the reason a client error carries', () => {
    expect(toSandboxError(new SandboxClientError(409, 'taken', 'AlreadyExists'))).toEqual({
      message: 'taken',
      statusCode: 409,
      reason: 'AlreadyExists',
    });
  });

  it('takes the message off any other error', () => {
    expect(toSandboxError(new TypeError('network down'))).toEqual({ message: 'network down' });
  });

  it('stringifies whatever else was thrown', () => {
    expect(toSandboxError('nope')).toEqual({ message: 'nope' });
  });
});

describe('isAlreadyExistsError', () => {
  it('recognises the reason the API server sends', () => {
    expect(isAlreadyExistsError(new SandboxClientError(409, 'taken', 'AlreadyExists'))).toBe(true);
  });

  it('tells a conflicting update apart from an existing object', () => {
    // Both are 409; only the reason says which.
    expect(isAlreadyExistsError(new SandboxClientError(409, 'stale', 'Conflict'))).toBe(false);
  });

  it('falls back to the status code when no reason came back', () => {
    expect(isAlreadyExistsError(new SandboxClientError(409, 'taken'))).toBe(true);
    expect(isAlreadyExistsError(new SandboxClientError(403, 'forbidden'))).toBe(false);
  });

  it('is not fooled by an error from somewhere else', () => {
    expect(isAlreadyExistsError(new Error('409'))).toBe(false);
  });
});
