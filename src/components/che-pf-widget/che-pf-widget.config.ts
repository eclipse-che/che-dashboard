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

import { ChePfMastheadDirective } from './masthead/che-pf-masthead.directive';
import { ChePfPageMainAreaDirective } from './page-main-area/che-pf-page-main-area.directive';
import { ChePfPageMainSectionDirective } from './page-main-section/che-pf-page-main-section.directive';
import { ChePfLinkButtonDirective } from './button/che-pf-link-button.directive';
import { ChePfPrimaryButtonDirective } from './button/che-pf-primary-button.directive';
import { ChePfSecondaryButtonDirective } from './button/che-pf-secondary-button.directive';
import { ChePfSelectTypeahead } from './select/che-pf-select-typeahead.directive';
import { ChePfSelectSingle } from './select/che-pf-select-single.directive';
import { ChePfSelectController } from './select/che-pf-select.controller';
import { ChePfSwitchDirective } from './switch/che-pf-switch.directive';
import { ChePfTextInputDirective } from './text-input/che-pf-text-input.directive';
import { ChePfPopoverDirective } from './popover/che-pf-popover.directive';
import { ChePfModalService } from './modal/che-pf-modal.service';
import { ChePfModalController } from './modal/che-pf-modal.controller';

export class ChePfWidgetConfig {

  constructor(register: che.IRegisterService) {
    register.directive('chePfMasthead', ChePfMastheadDirective);
    register.directive('chePfPageMainArea', ChePfPageMainAreaDirective);
    register.directive('chePfPageMainSection', ChePfPageMainSectionDirective);
    register.directive('chePfLinkButton', ChePfLinkButtonDirective);
    register.directive('chePfPrimaryButton', ChePfPrimaryButtonDirective);
    register.directive('chePfSecondaryButton', ChePfSecondaryButtonDirective);
    register.directive('chePfSelectTypeahead', ChePfSelectTypeahead);
    register.directive('chePfSelectSingle', ChePfSelectSingle);
    register.controller('ChePfSelectController', ChePfSelectController);
    register.directive('chePfSwitch', ChePfSwitchDirective);
    register.directive('chePfTextInput', ChePfTextInputDirective);
    register.directive('chePfPopover', ChePfPopoverDirective);

    register.service('chePfModalService', ChePfModalService);
    register.controller('ChePfModalController', ChePfModalController);
  }

}
