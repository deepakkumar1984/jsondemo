import { z } from "zod";

export const appConfigSchema = z.object({
  apps: z.array(
    z.object({
      /* ---------------------------------- */
      /* Core */
      /* ---------------------------------- */

      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string(),
      subtitle: z.string().optional(),
      shortName: z.string().optional(),
      description: z.string().optional(),
      prefix: z.string().regex(/^\//).optional(),

      /* ---------------------------------- */
      /* Demo credentials */
      /* ---------------------------------- */

      demoCredentials: z.object({
        email: z.string().email(),
        password: z.string(),
      }).optional(),

      /* ---------------------------------- */
      /* Branding */
      /* ---------------------------------- */

      branding: z.object({
        logo: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
        faviconUrl: z.string().nullable().optional(),
        companyName: z.string().optional(),
        tagline: z.string().optional(),
        showPoweredBy: z.boolean().optional(),
      }).optional(),

      /* ---------------------------------- */
      /* Layout */
      /* ---------------------------------- */

      layout: z.object({
        type: z.enum(["sidebar", "topnav", "horizontal"]).optional(),
        sidebarPosition: z.enum(["left", "right"]).optional(),
        sidebarWidth: z.string().optional(),
        sidebarCollapsible: z.boolean().optional(),
        sidebarDefaultCollapsed: z.boolean().optional(),
        headerPosition: z.enum(["top", "bottom"]).optional(),
        headerHeight: z.string().optional(),
        showHeader: z.boolean().optional(),
        showFooter: z.boolean().optional(),
        footerText: z.string().optional(),
        contentMaxWidth: z.string().nullable().optional(),
        contentPadding: z.string().optional(),
        showBreadcrumbs: z.boolean().optional(),
      }).optional(),

      /* ---------------------------------- */
      /* Theme */
      /* ---------------------------------- */

      theme: z.object({
        mode: z.enum(["light", "dark"]).optional(),
        allowModeToggle: z.boolean().optional(),

        colors: z.object({
          light: z.record(z.string()),
          dark: z.record(z.string()),
        }).optional(),

        fonts: z.object({
          heading: z.string().optional(),
          body: z.string().optional(),
          mono: z.string().optional(),
        }).optional(),

        fontSizes: z.record(z.string()).optional(),

        spacing: z.object({
          scale: z.number().optional(),
        }).optional(),

        radius: z.record(z.string()).optional(),
        shadows: z.record(z.string()).optional(),
      }).optional(),

      /* ---------------------------------- */
      /* Icons */
      /* ---------------------------------- */

      icons: z.object({
        library: z.enum(["lucide", "feather", "heroicons"]).optional(),
        size: z.string().optional(),
        strokeWidth: z.number().optional(),
      }).optional(),

      /* ---------------------------------- */
      /* Navigation */
      /* ---------------------------------- */

      navigation: z.object({
        categories: z.array(
          z.object({
            id: z.string().regex(/^[a-z0-9-]+$/),
            title: z.string(),
            icon: z.string().optional(),
            iconLibrary: z.enum(["lucide", "feather", "heroicons"]).optional(),
            order: z.number().optional(),

            items: z.array(
              z.object({
                title: z.string(),
                path: z.string().regex(/^\//),
                page: z.string().optional(),
                icon: z.string().optional(),
              })
            ),
          })
        ),
      }),

      /* ---------------------------------- */
      /* Routes */
      /* ---------------------------------- */

      routes: z.array(
        z.object({
          path: z.string().regex(/^\//),
          page: z.string(),
        })
      ).optional(),

      /* ---------------------------------- */
      /* Defaults */
      /* ---------------------------------- */

      defaults: z.object({
        table: z.object({
          pageSize: z.number().optional(),
          pageSizes: z.array(z.number()).optional(),
          showPagination: z.boolean().optional(),
          showSearch: z.boolean().optional(),
          emptyMessage: z.string().optional(),
        }).optional(),

        form: z.object({
          requiredIndicator: z.string().optional(),
          validationMode: z.enum(["onBlur", "onChange", "onSubmit"]).optional(),
          showCancelButton: z.boolean().optional(),
          cancelButtonText: z.string().optional(),
          submitButtonText: z.string().optional(),
        }).optional(),

        notifications: z.object({
          position: z.enum([
            "top-right",
            "top-left",
            "bottom-right",
            "bottom-left",
          ]).optional(),
          duration: z.number().optional(),
          showCloseButton: z.boolean().optional(),
        }).optional(),

        dateFormat: z.string().optional(),
        timeFormat: z.string().optional(),

        currency: z.object({
          code: z.string().regex(/^[A-Z]{3}$/).optional(),
          symbol: z.string().optional(),
          position: z.enum(["before", "after"]).optional(),
        }).optional(),

        language: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
      }).optional(),

      /* ---------------------------------- */
      /* Paths */
      /* ---------------------------------- */

      schemaSource: z.string().optional(),
      apiConfigPath: z.string().optional(),
      pagesConfigPath: z.string().optional(),
    })
  ),
});

export const databaseConfigSchema  = z.object({
  table: z.string(),

  description: z.string().optional(),

  columns: z.array(
    z.object({
      name: z.string(),

      type: z.enum([
        "text", "varchar", "char",
        "integer", "smallint", "bigint", "serial", "bigserial",
        "real", "double precision", "numeric", "decimal",
        "boolean",
        "timestamp", "timestamptz", "date", "time", "timetz", "interval",
        "uuid",
        "json", "jsonb",
        "bytea", "blob"
      ]),

      primaryKey: z.boolean().optional(),
      notNull: z.boolean().optional(),
      unique: z.boolean().optional(),

      default: z.union([z.string(), z.number(), z.boolean()]).optional(),

      defaultFn: z.enum(["uuid"]).optional(),

      enum: z.array(z.string()).optional(),

      references: z.object({
        table: z.string(),
        column: z.string(),
        onDelete: z.enum([
          "cascade",
          "set null",
          "restrict",
          "no action"
        ]).optional()
      }).optional(),

      description: z.string().optional()
    })
  ),

  indexes: z.array(
    z.object({
      name: z.string(),
      columns: z.array(z.string()),
      unique: z.boolean().optional()
    })
  ).optional()
});
