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

import * as _ from 'lodash';
import {
  IBranding,
  IBrandingConfiguration,
  IBrandingDocs,
  IBrandingFooter,
  IBrandingWorkspace
} from './branding';
import { jsonBranding } from './branding.constant';

const BRANDING_SERVICE_SYMBOL = Symbol('CheBranding');
const ASSET_PREFIX = 'assets/branding/';

/**
 * This class is handling the branding data.
 * @author Oleksii Orel
 */
export class CheBranding {
  private branding: IBranding;
  private readonly readyPromise: Promise<void>;

  static get(): CheBranding {
    const global = window as any; // tslint:disable-line
    return global[BRANDING_SERVICE_SYMBOL] || new CheBranding();
  }

  protected constructor() {
    this.branding = JSON.parse(jsonBranding);

    const global = window as any; // tslint:disable-line
    global[BRANDING_SERVICE_SYMBOL] = this;

    this.readyPromise = this.updateData();
  }

  get ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Update branding data.
   */
  private updateData(): Promise<void> {
    return angular.element.getJSON(`${ASSET_PREFIX}product.json`).then(branding => {
      if (branding) {
        this.branding = _.merge(JSON.parse(jsonBranding), branding);
      }
    }).catch((resp: any) => {
      let message: string;
      if (resp.status === 200) {
        message = `"${ASSET_PREFIX}product.json" is not a JSON file.`
      } else {
        message = `Can't GET "${ASSET_PREFIX}product.json".`;
      }
      console.error(message, ' Response:', resp);
      return Promise.reject(message);
    });
  }

  get all(): { [key: string]: string | Object } {
    return {
      title: this.getProductName(),
      name: this.getName(),
      productVersion: this.getProductVersion(),
      logoURL: this.getProductLogo(),
      logoText: this.getProductLogoText(),
      favicon: this.getProductFavicon(),
      loaderURL: this.getLoaderUrl(),
      websocketContext: this.getWebsocketContext(),
      helpPath: this.getProductHelpPath(),
      helpTitle: this.getProductHelpTitle(),
      footer: this.getFooter(),
      supportEmail: this.getProductSupportEmail(),
      oauthDocs: this.getOauthDocs(),
      cli: this.getCLI(),
      docs: this.getDocs(),
      workspace: this.getWorkspace(),
      configuration: this.getConfiguration(),
    };
  }

  /**
   * Gets name.
   */
  getName(): string {
    return this.branding.name;
  }

  /**
   * Gets product name.
   */
  getProductName(): string {
    return this.branding.title;
  }

  /**
   * Gets product name.
   */
  getProductVersion(): string | undefined {
    return this.branding.productVersion;
  }

  /**
   * Gets product logo.
   */
  getProductLogo(): string {
    return ASSET_PREFIX + this.branding.logoFile;
  }

  /**
   * Gets product favicon.
   */
  getProductFavicon(): string {
    return ASSET_PREFIX + this.branding.favicon;
  }

  /**
   * Gets product loader.
   */
  getLoaderUrl(): string {
    return ASSET_PREFIX + this.branding.loader;
  }

  /**
   * Gets ide resources path.
   */
  getWebsocketContext(): string {
    return this.branding.websocketContext;
  }

  /**
   * Gets product help path.
   */
  getProductHelpPath(): string {
    return this.branding.helpPath;
  }

  /**
   * Gets product help title.
   */
  getProductHelpTitle(): string {
    return this.branding.helpTitle;
  }

  /**
   * Gets product logo text.
   */
  getProductLogoText(): string {
    return ASSET_PREFIX + this.branding.logoTextFile;
  }

  /**
   * Gets oauth docs.
   */
  getOauthDocs(): string {
    return this.branding.oauthDocs;
  }

  /**
   * Gets product support email.
   */
  getProductSupportEmail(): string {
    return this.branding.supportEmail;
  }

  /**
   * Returns footer additional elements (email button, content, button links).
   */
  getFooter(): IBrandingFooter {
    return this.branding.footer;
  }

  /**
   * Returns object with configName and name.
   */
  getCLI(): { configName: string; name: string } {
    return this.branding.cli;
  }

  /**
   * Returns object with docs URLs.
   */
  getDocs(): IBrandingDocs {
    return this.branding.docs;
  }

  /**
   * Returns object with workspace dedicated data.
   */
  getWorkspace(): IBrandingWorkspace {
    return this.branding.workspace;
  }

  /**
   * Returns object with UD configuration options.
   */
  getConfiguration(): IBrandingConfiguration {
    return this.branding.configuration;
  }
}
