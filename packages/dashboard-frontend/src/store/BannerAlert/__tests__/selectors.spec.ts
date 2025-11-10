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

import { RootState } from '@/store';
import { selectBannerAlertMessages } from '@/store/BannerAlert/selectors';

describe('BannerAlert, selectors', () => {
  it('should select banner alert messages', () => {
    const mockState = {
      bannerAlert: {
        messages: ['Test message 1', 'Test message 2'],
      },
    } as Partial<RootState> as RootState;
    const selectedMessages = selectBannerAlertMessages(mockState);
    expect(selectedMessages).toEqual(['Test message 1', 'Test message 2']);
  });

  it('should return an empty array if there are no messages', () => {
    const mockState: RootState = {
      bannerAlert: {
        messages: [],
      },
    } as Partial<RootState> as RootState;

    const selectedMessages = selectBannerAlertMessages(mockState);
    expect(selectedMessages).toEqual([]);
  });
});
