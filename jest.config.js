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

module.exports = {
  roots: ['src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '(/src/.+\\.(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: [
    'node_modules',
  ],
  moduleNameMapper: {
    '\\.(css|less|sass|scss|styl)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  globals: {
    'ts-jest': {
      'tsConfig': 'tsconfig.test.json'
    }
  },
  maxWorkers: 4,
  setupFilesAfterEnv: ['./jest.setup.ts'],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',

    '!src/**/*.d.{ts,tsx}',
    '!src/**/*.config.ts',
    '!src/**/*.enum.ts',
    '!src/index.tsx',
    '!src/App.tsx',
    '!src/Routes.tsx',
  ],
  coverageDirectory: './coverage',
  coverageReporters: [
    'html',
    'lcov',
    'text-summary',
  ],
  coverageThreshold: {
    global: {
      statements: 29,
      branches: 18,
      functions: 24,
      lines: 29,
    }
  },
}
