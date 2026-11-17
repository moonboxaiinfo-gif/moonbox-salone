import React, { useMemo } from 'react';
import { StorageService } from '../../services/storageService';
import { isLocalDemoMode } from '../../services/storageService';
import { WebsiteConfig, WebsiteReview } from '../../types/website';
import { WebsiteRendererProps, WhatsAppFloat } from './WebsiteShared';
import { LuxeElegance } from './themes/LuxeElegance';
import { ModernMinimal } from './themes/ModernMinimal';
import { GlamStudio } from './themes/GlamStudio';
import { ensureFontsLoaded } from '../../lib/websiteDefaults';

const THEME_COMPONENTS = {
  luxe_elegance: LuxeElegance,
  modern_minimal: ModernMinimal,
  glam_studio: GlamStudio,
} as const;

/**
 * Renders a salon website using the given configuration and theme.
 * Shared by the public portfolio page and the workspace live preview.
 */
export const WebsiteRenderer: React.FC<WebsiteRendererProps> = (props) => {
  const { config, tenant } = props;

  const services = useMemo(
    () => (props.services ?? (isLocalDemoMode ? StorageService.getServices(tenant.id) : [])).filter(s => s.isActive),
    [props.services, tenant.id]
  );
  const categories = useMemo(
    () => props.categories ?? (isLocalDemoMode ? StorageService.getCategories(tenant.id) : []),
    [props.categories, tenant.id]
  );
  const reviews: WebsiteReview[] = useMemo(
    () => config.sections.find(s => s.id === 'reviews')?.enabled
      ? props.reviews
      : [],
    [props.reviews, config.sections]
  );

  // Load the configured Google font on mount / change
  React.useEffect(() => {
    ensureFontsLoaded([config.typography.fontId]);
  }, [config.typography.fontId]);

  const ThemeComponent = THEME_COMPONENTS[config.themeId] || THEME_COMPONENTS.modern_minimal;
  return (
    <>
      <ThemeComponent {...props} services={services} categories={categories} reviews={reviews} />
      <WhatsAppFloat config={config} />
    </>
  );
};
