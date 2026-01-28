# Configuration Guide

This app is fully config-driven. Everything is controlled by JSON configuration files — no code changes needed to customize the app.

## Table of Contents

1. [App Configuration](#app-configuration)
2. [Branding](#branding)
3. [Layout Configuration](#layout-configuration)
4. [Theme System](#theme-system)
5. [Icons](#icons)
6. [Navigation](#navigation)
7. [Routes](#routes)
8. [Defaults](#defaults)
9. [Examples](#examples)

---

## App Configuration

All configuration is in `/config/apps.json`. Each app has the following structure:

```json
{
  "apps": [
    {
      "id": "hrm",
      "name": "HRM System",
      "subtitle": "Human Resources",
      "shortName": "HRM",
      "description": "Human Resource Management System",
      "prefix": "/",
      "branding": { ... },
      "layout": { ... },
      "theme": { ... },
      "icons": { ... },
      "navigation": { ... },
      "routes": [ ... ],
      "defaults": { ... },
      "demoCredentials": { ... }
    }
  ]
}
```

---

## Branding

Control your app's visual identity:

```json
"branding": {
  "logo": "👥",
  "logoUrl": null,
  "faviconUrl": null,
  "companyName": "Acme Corp",
  "tagline": "People First",
  "showPoweredBy": false
}
```

### Fields

- **`logo`** (string): Emoji or text shown in sidebar header
- **`logoUrl`** (string | null): URL to a logo image (overrides emoji logo)
- **`faviconUrl`** (string | null): URL to a custom favicon
- **`companyName`** (string): Company name shown in branding
- **`tagline`** (string): Short tagline shown under app name
- **`showPoweredBy`** (boolean): Show "Powered by" text in footer

---

## Layout Configuration

Customize the app layout structure:

```json
"layout": {
  "type": "sidebar",
  "sidebarPosition": "left",
  "sidebarWidth": "280px",
  "sidebarCollapsible": true,
  "sidebarDefaultCollapsed": false,
  "headerPosition": "top",
  "headerHeight": "56px",
  "showHeader": true,
  "showFooter": false,
  "footerText": "© 2026 Acme Corp. All rights reserved.",
  "contentMaxWidth": null,
  "contentPadding": "24px",
  "showBreadcrumbs": false
}
```

### Fields

- **`type`** (string): Layout type
  - `"sidebar"`: Sidebar navigation (default)
  - `"topnav"`: Top navigation bar (future)
  - `"hybrid"`: Top nav + sidebar (future)

- **`sidebarPosition`** (string): `"left"` or `"right"`
- **`sidebarWidth`** (string): Width of sidebar (e.g., `"280px"`, `"16rem"`)
- **`sidebarCollapsible`** (boolean): Allow sidebar to collapse
- **`sidebarDefaultCollapsed`** (boolean): Start with sidebar collapsed

- **`headerPosition`** (string): `"top"` or `"none"`
- **`headerHeight`** (string): Height of top header bar
- **`showHeader`** (boolean): Show the header bar

- **`showFooter`** (boolean): Show footer at bottom of pages
- **`footerText`** (string): Text to display in footer

- **`contentMaxWidth`** (string | null): Max width of page content (e.g., `"1400px"`, `null` for full width)
- **`contentPadding`** (string): Padding around page content

- **`showBreadcrumbs`** (boolean): Show breadcrumb navigation (future)

---

## Theme System

Fully customize colors, fonts, spacing, and more:

### Theme Structure

```json
"theme": {
  "mode": "light",
  "allowModeToggle": true,
  "colors": {
    "light": { ... },
    "dark": { ... }
  },
  "fonts": { ... },
  "fontSizes": { ... },
  "spacing": { ... },
  "radius": { ... },
  "shadows": { ... }
}
```

### Colors

Define color palettes for light and dark modes. Colors use HSL format: `"hue saturation% lightness%"`

```json
"colors": {
  "light": {
    "primary": "222.2 47.4% 11.2%",
    "primaryForeground": "210 40% 98%",
    "secondary": "210 40% 96.1%",
    "background": "0 0% 100%",
    "foreground": "222.2 84% 4.9%",
    "border": "214.3 31.8% 91.4%",
    "destructive": "0 84.2% 60.2%",
    "muted": "210 40% 96.1%",
    "mutedForeground": "215.4 16.3% 46.9%",
    "card": "0 0% 100%",
    "accent": "210 40% 96.1%"
  },
  "dark": {
    "primary": "210 40% 98%",
    "background": "222.2 84% 4.9%",
    ...
  }
}
```

**Available Color Variables:**
- `primary` / `primaryForeground` - Primary brand color
- `secondary` / `secondaryForeground` - Secondary color
- `accent` / `accentForeground` - Accent color for highlights
- `destructive` / `destructiveForeground` - Danger/delete actions
- `muted` / `mutedForeground` - Subtle backgrounds and text
- `card` / `cardForeground` - Card backgrounds
- `popover` / `popoverForeground` - Popover/dropdown backgrounds
- `background` / `foreground` - Page background and text
- `border` - Border color
- `input` - Input field borders
- `ring` - Focus ring color

### Fonts

```json
"fonts": {
  "heading": "Inter, system-ui, sans-serif",
  "body": "Inter, system-ui, sans-serif",
  "mono": "JetBrains Mono, Consolas, monospace"
}
```

### Font Sizes

```json
"fontSizes": {
  "xs": "0.75rem",
  "sm": "0.875rem",
  "base": "1rem",
  "lg": "1.125rem",
  "xl": "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem"
}
```

### Spacing Scale

```json
"spacing": {
  "scale": 1.0
}
```

Multiplier for spacing values (1.0 = default, 1.2 = 20% larger, 0.8 = 20% smaller)

### Border Radius

```json
"radius": {
  "sm": "0.25rem",
  "md": "0.5rem",
  "lg": "0.75rem",
  "xl": "1rem"
}
```

### Shadows

```json
"shadows": {
  "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)"
}
```

---

## Icons

Configure the icon system:

```json
"icons": {
  "library": "lucide",
  "size": "20px",
  "strokeWidth": 2
}
```

### Fields

- **`library`** (string): Icon library to use
  - `"lucide"` - Lucide React icons (default, 1000+ icons)
  - `"heroicons"` - Hero Icons (future)
  - `"fontawesome"` - Font Awesome (future)

- **`size`** (string): Default icon size
- **`strokeWidth`** (number): Default stroke width for Lucide icons

### Using Icons

Icons are referenced by name in navigation items:

```json
{
  "title": "Dashboard",
  "path": "/",
  "icon": "Home",
  "iconLibrary": "lucide"
}
```

**Available Lucide Icons** (1000+):
- Navigation: `Home`, `LayoutDashboard`, `Menu`, `ChevronRight`
- Data: `Users`, `User`, `Building2`, `Briefcase`, `FileText`
- Actions: `Plus`, `Edit`, `Trash2`, `Save`, `Download`, `Upload`
- Finance: `DollarSign`, `CreditCard`, `TrendingUp`, `BarChart`
- Time: `Calendar`, `Clock`, `Timer`
- Status: `CheckCircle`, `XCircle`, `AlertCircle`, `Info`
- And many more...

[Full Lucide Icon List](https://lucide.dev/icons/)

---

## Navigation

Define your sidebar navigation structure:

```json
"navigation": {
  "categories": [
    {
      "id": "overview",
      "title": "Overview",
      "icon": "LayoutDashboard",
      "iconLibrary": "lucide",
      "order": 1,
      "items": [
        {
          "title": "Dashboard",
          "path": "/",
          "page": "dashboard",
          "icon": "Home"
        }
      ]
    },
    {
      "id": "employee-data",
      "title": "Employee Data",
      "icon": "Users",
      "order": 2,
      "items": [
        {
          "title": "Employees",
          "path": "/employees",
          "page": "employees/list",
          "icon": "User"
        }
      ]
    }
  ]
}
```

### Category Fields

- **`id`** (string): Unique category ID
- **`title`** (string): Category name shown in sidebar
- **`icon`** (string): Icon name from icon library
- **`iconLibrary`** (string, optional): Override default icon library
- **`order`** (number): Sort order (lower = higher in sidebar)
- **`items`** (array): Navigation items in this category

### Navigation Item Fields

- **`title`** (string): Link text
- **`path`** (string): Route path
- **`page`** (string): Page config file (relative to `/config/pages/`)
- **`icon`** (string, optional): Item-specific icon
- **`iconLibrary`** (string, optional): Override icon library for this item

---

## Routes

Define additional routes not shown in navigation (create, edit, detail pages):

```json
"routes": [
  { "path": "/employees/new", "page": "employees/create" },
  { "path": "/employees/:id", "page": "employees/detail" },
  { "path": "/employees/:id/edit", "page": "employees/edit" }
]
```

### Route Fields

- **`path`** (string): URL path (supports params like `:id`)
- **`page`** (string): Page config file (relative to `/config/pages/`)

---

## Defaults

Set default behaviors for tables, forms, notifications, and more:

```json
"defaults": {
  "table": {
    "pageSize": 10,
    "pageSizes": [10, 25, 50, 100],
    "showPagination": true,
    "showSearch": true,
    "emptyMessage": "No records found"
  },
  "form": {
    "requiredIndicator": "*",
    "validationMode": "onBlur",
    "showCancelButton": true,
    "cancelButtonText": "Cancel",
    "submitButtonText": "Save"
  },
  "notifications": {
    "position": "top-right",
    "duration": 5000,
    "showCloseButton": true
  },
  "dateFormat": "MM/dd/yyyy",
  "timeFormat": "HH:mm",
  "currency": {
    "code": "USD",
    "symbol": "$",
    "position": "before"
  },
  "language": "en-US"
}
```

### Table Defaults

- **`pageSize`**: Default rows per page
- **`pageSizes`**: Available page size options
- **`showPagination`**: Show pagination controls
- **`showSearch`**: Show search bar
- **`emptyMessage`**: Message when no data

### Form Defaults

- **`requiredIndicator`**: Symbol for required fields
- **`validationMode`**: When to validate (`onChange`, `onBlur`, `onSubmit`)
- **`showCancelButton`**: Show cancel button on forms
- **`cancelButtonText`** / **`submitButtonText`**: Button labels

### Notifications

- **`position`**: Toast position (`top-left`, `top-right`, `bottom-left`, `bottom-right`)
- **`duration`**: Auto-dismiss time (ms)
- **`showCloseButton`**: Allow manual dismissal

### Localization

- **`dateFormat`**: Date format pattern
- **`timeFormat`**: Time format pattern
- **`currency`**: Currency settings
- **`language`**: Default language code

---

## Examples

### Example 1: Corporate Blue Theme

```json
{
  "theme": {
    "mode": "light",
    "colors": {
      "light": {
        "primary": "210 100% 40%",
        "primaryForeground": "0 0% 100%",
        "background": "0 0% 98%",
        "foreground": "210 20% 10%"
      }
    },
    "fonts": {
      "heading": "Montserrat, sans-serif",
      "body": "Open Sans, sans-serif"
    },
    "radius": {
      "md": "0.25rem"
    }
  }
}
```

### Example 2: Right Sidebar with Dark Mode

```json
{
  "layout": {
    "type": "sidebar",
    "sidebarPosition": "right",
    "sidebarWidth": "320px",
    "contentMaxWidth": "1200px"
  },
  "theme": {
    "mode": "dark",
    "allowModeToggle": true
  }
}
```

### Example 3: Compact Layout

```json
{
  "layout": {
    "sidebarWidth": "240px",
    "headerHeight": "48px",
    "contentPadding": "16px"
  },
  "theme": {
    "spacing": {
      "scale": 0.85
    }
  }
}
```

### Example 4: Custom Navigation with Custom Icons

```json
{
  "navigation": {
    "categories": [
      {
        "id": "sales",
        "title": "Sales",
        "icon": "ShoppingCart",
        "order": 1,
        "items": [
          {
            "title": "Orders",
            "path": "/orders",
            "page": "orders/list",
            "icon": "Package"
          },
          {
            "title": "Customers",
            "path": "/customers",
            "page": "customers/list",
            "icon": "Users"
          }
        ]
      }
    ]
  }
}
```

---

## Adding New Pages

1. Create a page config JSON file in `/config/pages/` (e.g., `orders/list.json`)
2. Add the route to `apps.json` navigation or routes array
3. The page will automatically be available - no code changes needed!

```json
{
  "navigation": {
    "categories": [
      {
        "items": [
          {
            "title": "Orders",
            "path": "/orders",
            "page": "orders/list"
          }
        ]
      }
    ]
  }
}
```

---

## Summary

**Everything is configurable:**
- ✅ Branding (logo, colors, company name)
- ✅ Layout (sidebar position, width, collapsible, header, footer)
- ✅ Theme (light/dark mode, colors, fonts, spacing, shadows)
- ✅ Icons (1000+ Lucide icons, extensible to other libraries)
- ✅ Navigation (categories, items, icons)
- ✅ Routes (pages, paths, parameters)
- ✅ Defaults (table behavior, forms, notifications, formats)
- ✅ Localization (date/time format, currency, language)

**No code changes needed** - just edit `/config/apps.json` and your pages will update automatically!
