import { createCatalog } from '@json-render/core';
import { z } from 'zod';

const ActionSchema = z.union([
  z.object({ type: z.literal('navigate'), to: z.string() }),
  z.object({ type: z.literal('api_call'), method: z.string(), url: z.string(), body: z.record(z.string(), z.any()).optional(), onSuccess: z.any().optional() }),
  z.object({ type: z.literal('submit_form'), url: z.string(), method: z.string().optional(), redirectTo: z.string().optional() }),
  z.object({ type: z.literal('delete_confirm'), url: z.string(), message: z.string().optional(), redirectTo: z.string().optional() }),
  z.object({ type: z.literal('refresh_data') }),
  z.object({ type: z.literal('export_csv'), dataPath: z.string() }),
]);

export const catalog = createCatalog({
  components: {
    PageHeader: {
      props: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        actions: z.array(z.object({
          label: z.string(),
          variant: z.string().optional(),
          action: ActionSchema,
          icon: z.string().optional(),
        })).optional(),
      }),
    },
    Card: {
      props: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        padding: z.boolean().optional(),
      }),
      hasChildren: true,
    },
    StatCard: {
      props: z.object({
        label: z.string(),
        value: z.union([z.string(), z.number()]),
        valuePath: z.string().optional(),
        change: z.string().optional(),
        changeType: z.enum(['positive', 'negative', 'neutral']).optional(),
        icon: z.string().optional(),
      }),
    },
    DataTable: {
      props: z.object({
        dataPath: z.string(),
        columns: z.array(z.object({
          key: z.string(),
          header: z.string(),
          format: z.string().optional(),
          render: z.string().optional(),
        })),
        searchable: z.boolean().optional(),
        searchPlaceholder: z.string().optional(),
        filterable: z.boolean().optional(),
        filters: z.array(z.object({
          key: z.string(),
          label: z.string(),
          optionsPath: z.string().optional(),
          options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
        })).optional(),
        paginated: z.boolean().optional(),
        rowClickAction: ActionSchema.optional(),
        emptyMessage: z.string().optional(),
      }),
    },
    Form: {
      props: z.object({
        action: ActionSchema,
        layout: z.string().optional(),
      }),
      hasChildren: true,
    },
    TextField: {
      props: z.object({
        label: z.string(),
        bindPath: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
        type: z.string().optional(),
        disabled: z.boolean().optional(),
      }),
    },
    TextArea: {
      props: z.object({
        label: z.string(),
        bindPath: z.string(),
        placeholder: z.string().optional(),
        rows: z.number().optional(),
        required: z.boolean().optional(),
      }),
    },
    SelectField: {
      props: z.object({
        label: z.string(),
        bindPath: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
        options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
        optionsPath: z.string().optional(),
      }),
    },
    DateField: {
      props: z.object({
        label: z.string(),
        bindPath: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
      }),
    },
    Grid: {
      props: z.object({
        columns: z.union([z.number(), z.string()]).optional(),
        gap: z.string().optional(),
      }),
      hasChildren: true,
    },
    Stack: {
      props: z.object({
        direction: z.enum(['horizontal', 'vertical']).optional(),
        gap: z.string().optional(),
        align: z.string().optional(),
        justify: z.string().optional(),
      }),
      hasChildren: true,
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.string().optional(),
        action: ActionSchema,
        icon: z.string().optional(),
        disabled: z.boolean().optional(),
      }),
    },
    Badge: {
      props: z.object({
        label: z.string().optional(),
        valuePath: z.string().optional(),
        variant: z.string().optional(),
        colorMap: z.record(z.string(), z.string()).optional(),
      }),
    },
    Alert: {
      props: z.object({
        title: z.string().optional(),
        message: z.string(),
        variant: z.enum(['default', 'destructive']).optional(),
      }),
    },
    Tabs: {
      props: z.object({
        defaultValue: z.string().optional(),
        tabs: z.array(z.object({
          label: z.string(),
          value: z.string(),
        })),
      }),
      hasChildren: true,
    },
    TabPanel: {
      props: z.object({
        value: z.string(),
      }),
      hasChildren: true,
    },
    Heading: {
      props: z.object({
        text: z.string().optional(),
        textPath: z.string().optional(),
        level: z.number().optional(),
      }),
    },
    Text: {
      props: z.object({
        content: z.string().optional(),
        contentPath: z.string().optional(),
        variant: z.enum(['default', 'muted', 'small']).optional(),
      }),
    },
    Divider: {
      props: z.object({}),
    },
    Avatar: {
      props: z.object({
        src: z.string().optional(),
        srcPath: z.string().optional(),
        name: z.string().optional(),
        namePath: z.string().optional(),
        size: z.enum(['sm', 'md', 'lg']).optional(),
      }),
    },
    DetailRow: {
      props: z.object({
        label: z.string(),
        valuePath: z.string().optional(),
        value: z.string().optional(),
        format: z.string().optional(),
      }),
    },
    DetailSection: {
      props: z.object({
        title: z.string(),
      }),
      hasChildren: true,
    },
  },
  actions: {
    navigate: { description: 'Navigate to a different page' },
    api_call: { description: 'Make an API call' },
    submit_form: { description: 'Submit form data' },
    delete_confirm: { description: 'Delete with confirmation' },
    refresh_data: { description: 'Refresh current data' },
    export_csv: { description: 'Export data to CSV' },
  },
});

export type CatalogType = typeof catalog;
export default catalog;
