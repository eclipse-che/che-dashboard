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

interface ICheSuccessNotificationAttributes extends ng.IAttributes {
  cheSuccessText: string;
}

interface ICheSuccessNotificationScope extends ng.IScope {
  hideNotification: () => void;
}

/**
 * Defines a directive for success notification.
 * @author Oleksii Orel
 */
export class CheSuccessNotification implements ng.IDirective {

  restrict = 'E';
  replace = true;

  scope = {};

  /**
   * Template for the success notification.
   * @param $element
   * @param $attrs
   * @returns {string} the template
   */
  template($element: ng.IAugmentedJQuery, $attrs: ICheSuccessNotificationAttributes): string {
    let successText = $attrs.cheSuccessText || '';
    return '<md-toast class="che-notification-info" layout="row" flex layout-align="start start">' +
      '<i class="che-notification-success-icon fa fa-check fa-2x"></i>' +
      '<div flex="90" layout="column" layout-align="start start">' +
      '<span flex class="che-notification-success-title"><b>Success</b></span>' +
      '<span flex class="che-notification-message">' + successText + '</span>' +
      '</div>' +
      '<i class="che-notification-close-icon fa fa-times" ng-click="hideNotification()"/>' +
      '</md-toast>';
  }

  link($scope: ICheSuccessNotificationScope, $element: ng.IAugmentedJQuery) {
    $scope.hideNotification = () => {
      $element.addClass('hide-notification');
    };
  }
}
