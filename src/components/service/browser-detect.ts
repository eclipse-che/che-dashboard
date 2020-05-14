/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

import { GlobalWarningBannerService } from './global-warning-banner.service';

const UNSUPPORTED_BROWSER_WARNING = `You're using a web browser we don't support. Please consider using Chrome or Firefox instead.`;

export class DetectSupportedBrowserService {

  static $inject = [
    'globalWarningBannerService',
  ];

  constructor(
    globalWarningBannerService: GlobalWarningBannerService,
  ) {
    if (this.isSupported === false) {
      globalWarningBannerService.addMessage(UNSUPPORTED_BROWSER_WARNING);
    }
  }

  get isOpera(): boolean {
    // @ts-ignore
    return (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
  }

  get isChrome(): boolean {
    // @ts-ignore
    return !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
  }

  get isFirefox(): boolean {
    // @ts-ignore
    return typeof InstallTrigger !== 'undefined';
  }

  get isSupported(): boolean {
    return (this.isChrome && !this.isOpera) || this.isFirefox;
  }

}
