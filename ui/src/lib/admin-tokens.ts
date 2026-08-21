/**
 * Admin UI token map — extracted from ui/index.css, tailwind.config.js, and member UI usage.
 * Do not introduce colors, radii, or type weights outside this map.
 */
export const adminTokens = {
  colors: {
    primary: 'hsl(42 54% 54%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(40 33% 98%)',
    accent: 'hsl(42 54% 54%)',
    background: 'hsl(40 33% 98%)',
    foreground: 'hsl(0 0% 9%)',
    card: 'hsl(0 0% 100%)',
    muted: 'hsl(40 10% 90%)',
    mutedForeground: 'hsl(0 0% 40%)',
    border: 'hsl(40 10% 85%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    /** Derived: primary at ~5% — table row hover, active nav tint */
    primaryTint: 'bg-primary/5',
    primaryTintStrong: 'bg-primary/10',
    /** Member-side semantic accents already in use */
    statusPositive: 'bg-green-100 text-green-700',
    statusPositiveBorder: 'border-green-200',
    statusNeutral: 'bg-muted text-muted-foreground',
    statusNegative: 'bg-destructive/10 text-destructive',
    statusNegativeBorder: 'border-destructive/20',
    statusArchived: 'bg-muted/80 text-muted-foreground',
  },
  radius: {
    /** --radius: 1rem */
    lg: '1rem',
    md: 'calc(1rem - 2px)',
    sm: 'calc(1rem - 4px)',
    full: '9999px',
  },
  typography: {
    h1: 'text-2xl font-serif font-medium tracking-tight',
    h2: 'text-lg font-semibold',
    h3: 'text-base font-medium',
    body: 'text-sm',
    small: 'text-xs text-muted-foreground',
    label: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
  },
  shadow: {
    card: 'shadow-sm',
  },
  spacing: {
    pagePadding: 'p-4 md:p-8',
    sectionGap: 'gap-4',
    gridGap: 'gap-4',
  },
} as const;

/** Tailwind class bundles for admin shell */
export const adminShell = {
  sidebarWidth: 'w-60',
  sidebarCollapsedWidth: 'w-16',
  topBarHeight: 'h-16',
  contentMaxWidth: 'max-w-6xl',
  navActive: 'border-l-2 border-primary bg-primary/10 text-primary',
  navInactive: 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  rowHover: 'hover:bg-primary/5 transition-colors',
  tableHeader: 'bg-[#FBF9F5] dark:bg-muted/25 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60',
} as const;
