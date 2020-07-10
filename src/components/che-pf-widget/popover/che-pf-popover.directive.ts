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

export interface IChePfPopoverProperties {
  onToggle: (eventObj: { isVisible: boolean }) => void;
}

interface IChePfPopoverBindings extends IChePfPopoverProperties { }

interface IChePfPopoverDirectiveScope {
  scope: { [key in keyof IChePfPopoverBindings]: string };
}

interface IChePfPopoverScope extends ng.IScope, IChePfPopoverBindings {
  visible: boolean;
  togglePopover: () => void;
}

/**
 * @ngdoc directive
 *
 * @description defines a popover
 * Documentation: https://www.patternfly.org/v4/documentation/core/components/popover
 *
 * @usage
 *
 * <che-pf-popover>
 *   <popover-button>
 *     <che-pf-button title="Toggle Popover"></che-pf-link-button>
 *   </popover-button>
 *   <popover-header>
 *     {{ctrl.popoverHeader}}
 *   </popover-header>
 *   <popover-body>
 *     {{ctrl.popoverBody}}
 *   </popover-body>
 *   <popover-footer>
 *     {{ctrl.popoverFooter}}
 *   </popover-footer>
 * </che-pf-popover>
 *
 */
export class ChePfPopoverDirective implements ng.IDirective<IChePfPopoverScope>, IChePfPopoverDirectiveScope {
  scope = {
    onToggle: '&',
  };

  transclude = {
    'button': 'popoverButton',
    'body': 'popoverBody',
    'header': '?popoverHeader',
    'footer': '?popoverFooter',
  };
  replace = true;
  templateUrl = 'components/che-pf-widget/popover/che-pf-popover.html';

  link($scope: IChePfPopoverScope, $element: ng.IRootElementService): void {
    const header = $element.find('#popover-header');
    if (header.children().length === 0) {
      header.hide();
    }
    const footer = $element.find('#popover-footer');
    if (footer.children().length === 0) {
      footer.hide();
    }

    $scope.visible = false;
    $scope.togglePopover = () => {
      $scope.visible = !$scope.visible;
      $scope.onToggle({ isVisible: $scope.visible });

      const toggler = $element.find('.che-pf-popover-toggler');
      const popover = $element.find('.pf-c-popover');

      if ($scope.visible === false) {
        popover.hide()
        return;
      }

      const shiftFromBottom = 1.5 * toggler.height();
      const shiftFromLeft = toggler.width() / 2 - popover.width() / 2;
      popover.css('bottom', `${shiftFromBottom}px`);
      popover.css('left', `${shiftFromLeft}px`);

      popover.show();
    };
  }

}
