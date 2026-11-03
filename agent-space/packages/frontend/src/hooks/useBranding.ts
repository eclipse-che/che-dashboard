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

import React from 'react';

import {
  Branding,
  BrandingLink,
  buildLogoSrc,
  DEFAULT_BRANDING,
  fetchBranding,
  fetchDashboardLogo,
  fetchProductVersion,
} from '@/services/branding';

export interface BrandingState {
  title: string;
  name: string;
  links: BrandingLink[];
  productVersion?: string;
  logoSrc: string;
}

/**
 * Resolves the masthead branding once, then re-themes the logo whenever the
 * dashboard theme changes. The logo starts out empty so the masthead never
 * flashes a wrongly-themed image before the real one is ready.
 */
export function useBranding(isDarkTheme: boolean): BrandingState {
  const [branding, setBranding] = React.useState<Branding>(DEFAULT_BRANDING);
  const [logoSrc, setLogoSrc] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const resolve = async () => {
      const [product, dashboardLogo] = await Promise.all([fetchBranding(), fetchDashboardLogo()]);
      if (!active) {
        return;
      }
      setBranding(product);

      const src = await buildLogoSrc(dashboardLogo, product.logoFile, isDarkTheme);
      if (active) {
        setLogoSrc(src);
      }

      // Only a product that does not pin its own version asks the server.
      if (product.productVersion === undefined) {
        const productVersion = await fetchProductVersion();
        if (active && productVersion !== undefined) {
          setBranding(current => ({ ...current, productVersion }));
        }
      }
    };

    resolve();

    return () => {
      active = false;
    };
  }, [isDarkTheme]);

  return {
    title: branding.title,
    name: branding.name,
    links: branding.links,
    productVersion: branding.productVersion,
    logoSrc,
  };
}
