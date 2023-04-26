/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { FactoryLocation, FactoryLocationAdapter } from '../';
import { getMessage } from '@eclipse-che/common/lib/helpers/errors';

describe('FactoryLocationAdapter Service', () => {
  let factoryLocation: FactoryLocation;

  describe('supported location', () => {
    it('should determine the full path URL', () => {
      const location = 'https://git-test.com/dummy.git';

      factoryLocation = new FactoryLocationAdapter(location);

      expect(factoryLocation.isFullPathUrl).toBeTruthy();
      expect(factoryLocation.isSshLocation).toBeFalsy();
    });
    it('should determine the SSH location', () => {
      const location = 'git@git-test.com:git-test.com/dummy.git';

      factoryLocation = new FactoryLocationAdapter(location);

      expect(factoryLocation.isFullPathUrl).toBeFalsy();
      expect(factoryLocation.isSshLocation).toBeTruthy();
    });
    it('should determine unsupported factory location', () => {
      const location = 'dummy.git';

      let errorMessage: string | undefined;
      try {
        factoryLocation = new FactoryLocationAdapter(location);
      } catch (err) {
        errorMessage = getMessage(err);
      }

      expect(errorMessage).toEqual('Unsupported factory location: "dummy.git"');
    });
  });

  describe('SSH location', () => {
    it('should determine searchParams', () => {
      const sshLocation = 'git@github.com:eclipse-che/che-dashboard.git';
      const params = 'che-editor=che-incubator/checode/insiders';

      factoryLocation = new FactoryLocationAdapter(`${sshLocation}?${params}`);

      expect(factoryLocation.searchParams.toString()).toEqual(
        'che-editor=che-incubator%2Fchecode%2Finsiders',
      );
      expect(factoryLocation.toString()).toEqual(
        'git@github.com:eclipse-che/che-dashboard.git?che-editor=che-incubator%2Fchecode%2Finsiders',
      );

      factoryLocation = new FactoryLocationAdapter(`${sshLocation}&${params}`);

      expect(factoryLocation.searchParams.toString()).toEqual(
        'che-editor=che-incubator%2Fchecode%2Finsiders',
      );
      expect(factoryLocation.toString()).toEqual(
        'git@github.com:eclipse-che/che-dashboard.git?che-editor=che-incubator%2Fchecode%2Finsiders',
      );
    });
  });

  describe('full path URL', () => {
    it('should determine searchParams', () => {
      const fullPathUrl = 'https://github.com/eclipse-che/che-dashboard.git';
      const params = 'che-editor=che-incubator/checode/insiders';

      factoryLocation = new FactoryLocationAdapter(`${fullPathUrl}?${params}`);

      expect(factoryLocation.searchParams.toString()).toEqual(
        'che-editor=che-incubator%2Fchecode%2Finsiders',
      );
      expect(factoryLocation.toString()).toEqual(
        'https://github.com/eclipse-che/che-dashboard.git?che-editor=che-incubator%2Fchecode%2Finsiders',
      );

      factoryLocation = new FactoryLocationAdapter(`${fullPathUrl}&${params}`);

      expect(factoryLocation.searchParams.toString()).toEqual(
        'che-editor=che-incubator%2Fchecode%2Finsiders',
      );
      expect(factoryLocation.toString()).toEqual(
        'https://github.com/eclipse-che/che-dashboard.git?che-editor=che-incubator%2Fchecode%2Finsiders',
      );
    });
  });
});
