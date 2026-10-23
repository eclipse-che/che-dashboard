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

const base = require('../../../jest.config.base');

module.exports = {
  ...base,
  displayName: 'Agent Space Frontend',
  moduleDirectories: ['node_modules', '../../../node_modules', 'src'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss|styl)$': 'identity-obj-proxy',
    // mapping for absolute imports (see tsconfig.json)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jsdom',
  transform: {
    '^.*\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: true,
      },
    ],
  },
  setupFilesAfterEnv: ['./jest.setup.tsx'],
  collectCoverageFrom: [
    ...base.collectCoverageFrom,

    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/testUtils/**',
  ],
  coverageThreshold: {
    global: {
      statements: 92,
      branches: 85,
      functions: 90,
      lines: 92,
    },
  },
};
