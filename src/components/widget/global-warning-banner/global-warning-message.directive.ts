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

/**
 * Defines a directive for displaying a warning message within a banner at the top of the page.
 * @author Oleksii Kurinnyi
 */
export class GlobalWarningMessageDirective implements ng.IDirective {

  replace: boolean = false;
  restrict: string = 'E';
  templateUrl: string = 'components/widget/global-warning-banner/global-warning-message.html';

  scope = {
    'message': '@',
    'onClose': '&'
  };

}
