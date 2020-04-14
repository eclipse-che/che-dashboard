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

import { IChePfButtonDirectiveScope } from './che-pf-button';

/**
 * @ngdoc directive
 *
 * @description defines a link type button.
 * Documentation: https://www.patternfly.org/v4/documentation/core/components/button#documentation
 *
 * @usage
 * <che-pf-link-button
 *   title="{{$ctrl.linkButton.title}}"
 *   on-click="$ctrl.linkButton.onClick()">
 * </che-pf-link-button>
 *
 * @author Oleksii Kurinnyi
 */
export class ChePfLinkButtonDirective implements ng.IDirective, IChePfButtonDirectiveScope {

  restrict = 'E';
  replace = true;
  templateUrl = 'components/che-pf-widget/button/che-pf-link-button.html';

  scope = {
    title: '@',
    onClick: '&'
  };

}
