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

import {
  formatGi,
  GI,
  isValidQuantity,
  KI,
  MI,
  parseQuantity,
  TI,
} from '../quantity';

describe('quantity helpers', () => {
  describe('parseQuantity', () => {
    it.each([
      ['1Ki', KI],
      ['512Mi', 512 * MI],
      ['10Gi', 10 * GI],
      ['2Ti', 2 * TI],
      ['1.5Gi', 1.5 * GI],
      ['1Ei', 1024 * 1024 * TI],
    ])('should parse binary suffix %s', (quantity, expected) => {
      expect(parseQuantity(quantity)).toEqual(expected);
    });

    it.each([
      ['1k', 1e3],
      ['500M', 500e6],
      ['10G', 10e9],
      ['1T', 1e12],
      ['1E', 1e18],
      ['1500m', 2],
    ])('should parse decimal suffix %s', (quantity, expected) => {
      expect(parseQuantity(quantity)).toEqual(expected);
    });

    it.each([
      ['0', 0],
      ['1073741824', GI],
    ])('should parse plain integer %s', (quantity, expected) => {
      expect(parseQuantity(quantity)).toEqual(expected);
    });

    it.each([
      ['5e9', 5e9],
      ['1E3', 1e3],
      ['12e+6', 12e6],
      ['15e-1', 2],
    ])('should parse decimal exponent %s', (quantity, expected) => {
      expect(parseQuantity(quantity)).toEqual(expected);
    });

    it('should round fractional bytes up', () => {
      expect(parseQuantity('1.5')).toEqual(2);
    });

    it('should accept a leading plus sign', () => {
      expect(parseQuantity('+5Gi')).toEqual(5 * GI);
    });

    it('should ignore surrounding whitespace', () => {
      expect(parseQuantity(' 5Gi ')).toEqual(5 * GI);
    });

    it.each([
      'abc',
      '-5Gi',
      '',
      '5 Gi',
      '5gi',
      '5Gb',
      'Gi',
      '1e',
      '1e3Gi',
      '++5Gi',
      '+',
    ])('should throw on invalid input "%s"', quantity => {
      expect(() => parseQuantity(quantity)).toThrow(
        `Invalid quantity: "${quantity}"`,
      );
    });

    it('should throw on undefined input', () => {
      expect(() => parseQuantity(undefined as unknown as string)).toThrow();
    });
  });

  describe('isValidQuantity', () => {
    it('should validate quantities', () => {
      expect(isValidQuantity('15Gi')).toBe(true);
      expect(isValidQuantity('15 GB')).toBe(false);
    });
  });

  describe('formatGi', () => {
    it.each([
      [10 * GI, '10Gi'],
      [GI / 2, '0.5Gi'],
      [0, '0Gi'],
      [4.73 * GI, '4.7Gi'],
    ])('should format %d bytes as %s', (bytes, expected) => {
      expect(formatGi(bytes)).toEqual(expected);
    });

    it('should honour fraction digits', () => {
      expect(formatGi(4.736 * GI, 2)).toEqual('4.74Gi');
      expect(formatGi(4.736 * GI, 0)).toEqual('5Gi');
    });

    it.each(['1Gi', '5Gi', '10Gi', '15Gi', '100Gi', '1Ti'])(
      'should round-trip %s',
      quantity => {
        expect(parseQuantity(formatGi(parseQuantity(quantity)))).toEqual(
          parseQuantity(quantity),
        );
      },
    );

    it('should throw on non-finite input', () => {
      expect(() => formatGi(NaN)).toThrow('Invalid number of bytes');
    });
  });
});
