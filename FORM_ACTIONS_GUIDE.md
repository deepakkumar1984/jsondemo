# Form Actions - Config-Driven Form Buttons

## Overview

Forms now support a completely **config-driven actions** system. No more hardcoded default buttons! All form buttons are defined in the page configuration with full control over appearance, behavior, and layout.

## Why This Change?

**Before:** Forms had hardcoded "Save" and "Cancel" buttons that appeared even when custom buttons were defined, causing duplicates and confusion.

**After:** Forms render ONLY the buttons you configure. Clean, predictable, and fully controlled.

## Configuration Structure

### Basic Example

```json
{
  "type": "Form",
  "props": {
    "action": {
      "type": "submit_form",
      "url": "/api/projects/:id",
      "method": "PUT",
      "successMessage": "Updated successfully!",
      "redirectTo": "/projects/:id"
    },
    "actions": {
      "buttons": [
        {
          "label": "Cancel",
          "variant": "ghost",
          "action": {
            "type": "navigate",
            "to": "/projects"
          }
        },
        {
          "label": "Save Changes",
          "variant": "primary",
          "buttonType": "submit",
          "icon": "Check"
        }
      ],
      "align": "end",
      "gap": "md"
    }
  }
}
```

## Actions Configuration

### `actions` Object Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `buttons` | Array | Array of button configurations | Required |
| `align` | String | Horizontal alignment: `start`, `center`, `end`, `between`, `around` | `end` |
| `gap` | String | Spacing between buttons: `xs`, `sm`, `md`, `lg`, `xl` | `md` |

### Button Configuration

Each button in the `buttons` array supports:

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| `label` | String | Button text | Yes |
| `variant` | String | Style variant (see below) | No |
| `buttonType` | String | HTML button type: `submit`, `button`, `reset` | No (default: `button`) |
| `icon` | String | Icon name from icon registry | No |
| `action` | Object | Action to perform on click (not needed for submit buttons) | No |

### Button Variants

| Variant | Appearance | Use Case |
|---------|------------|----------|
| `primary` | Blue, filled | Main action (Save, Create, Submit) |
| `ghost` | Transparent, subtle | Cancel, secondary actions |
| `outline` | Border only | Alternative actions |
| `danger` | Red, destructive | Delete, remove actions |
| `secondary` | Gray, filled | Secondary actions |

### Alignment Options

| Value | Description | Visual |
|-------|-------------|--------|
| `start` | Align left | `[Cancel] [Save]                    ` |
| `center` | Align center | `          [Cancel] [Save]          ` |
| `end` | Align right | `                    [Cancel] [Save]` |
| `between` | Space between | `[Cancel]                    [Save]` |
| `around` | Space around | `  [Cancel]           [Save]  ` |

### Gap Sizes

| Value | Spacing | Pixels |
|-------|---------|--------|
| `xs` | Extra small | 4px |
| `sm` | Small | 8px |
| `md` | Medium | 12px |
| `lg` | Large | 16px |
| `xl` | Extra large | 24px |

## Button Types

### Submit Button

Triggers form submission and validation:

```json
{
  "label": "Save",
  "variant": "primary",
  "buttonType": "submit",
  "icon": "Check"
}
```

**Key Points:**
- `buttonType: "submit"` is required
- No `action` property needed (uses form's main action)
- Automatically triggers validation
- Disabled during submission

### Action Button

Performs custom action without submitting form:

```json
{
  "label": "Cancel",
  "variant": "ghost",
  "action": {
    "type": "navigate",
    "to": "/projects"
  }
}
```

**Available Actions:**
- `navigate` - Go to a different page
- `api_call` - Make an API request
- Custom actions defined in your system

### Reset Button

Clears form values:

```json
{
  "label": "Reset",
  "variant": "outline",
  "buttonType": "reset"
}
```

## Real-World Examples

### Create Form

```json
{
  "type": "Form",
  "props": {
    "action": {
      "type": "submit_form",
      "url": "/api/projects",
      "method": "POST",
      "redirectTo": "/projects/{{response.data.id}}"
    },
    "actions": {
      "buttons": [
        {
          "label": "Cancel",
          "variant": "ghost",
          "action": {
            "type": "navigate",
            "to": "/projects"
          }
        },
        {
          "label": "Create Project",
          "variant": "primary",
          "buttonType": "submit",
          "icon": "Plus"
        }
      ],
      "align": "end",
      "gap": "md"
    }
  }
}
```

### Edit Form

```json
{
  "type": "Form",
  "props": {
    "action": {
      "type": "submit_form",
      "url": "/api/projects/:id",
      "method": "PUT",
      "redirectTo": "/projects/:id"
    },
    "actions": {
      "buttons": [
        {
          "label": "Cancel",
          "variant": "ghost",
          "action": {
            "type": "navigate",
            "to": "/projects/:id"
          }
        },
        {
          "label": "Update",
          "variant": "primary",
          "buttonType": "submit",
          "icon": "Check"
        }
      ],
      "align": "end",
      "gap": "md"
    }
  }
}
```

### Multi-Action Form

Form with multiple actions (save draft, publish, etc.):

```json
{
  "type": "Form",
  "props": {
    "action": {
      "type": "submit_form",
      "url": "/api/articles",
      "method": "POST"
    },
    "actions": {
      "buttons": [
        {
          "label": "Cancel",
          "variant": "ghost",
          "action": {
            "type": "navigate",
            "to": "/articles"
          }
        },
        {
          "label": "Save Draft",
          "variant": "outline",
          "action": {
            "type": "api_call",
            "url": "/api/articles/draft",
            "method": "POST"
          }
        },
        {
          "label": "Publish",
          "variant": "primary",
          "buttonType": "submit",
          "icon": "Send"
        }
      ],
      "align": "between",
      "gap": "md"
    }
  }
}
```

### Destructive Action Form

Form with a delete action:

```json
{
  "actions": {
    "buttons": [
      {
        "label": "Cancel",
        "variant": "ghost",
        "action": {
          "type": "navigate",
          "to": "/back"
        }
      },
      {
        "label": "Delete",
        "variant": "danger",
        "buttonType": "submit",
        "icon": "Trash"
      }
    ],
    "align": "between",
    "gap": "lg"
  }
}
```

## Migration Guide

### Before (Old Approach)

```json
{
  "type": "Form",
  "props": {
    "action": { ... }
  },
  "children": [
    {
      "type": "Grid",
      "children": [
        ... form fields ...,
        {
          "type": "Stack",
          "props": { "direction": "horizontal" },
          "children": [
            {
              "type": "Button",
              "props": { "label": "Cancel", ... }
            },
            {
              "type": "Button",
              "props": { "label": "Save", "buttonType": "submit" }
            }
          ]
        }
      ]
    }
  ]
}
```

**Problems:**
- Buttons mixed with form fields in children
- Default "Save"/"Cancel" also appeared (duplicates!)
- Harder to maintain consistent button layouts

### After (New Approach)

```json
{
  "type": "Form",
  "props": {
    "action": { ... },
    "actions": {
      "buttons": [
        { "label": "Cancel", "variant": "ghost", "action": { ... } },
        { "label": "Save", "variant": "primary", "buttonType": "submit" }
      ],
      "align": "end",
      "gap": "md"
    }
  },
  "children": [
    {
      "type": "Grid",
      "children": [
        ... form fields only ...
      ]
    }
  ]
}
```

**Benefits:**
- ✅ Clean separation: fields in children, actions in props
- ✅ No default buttons (only what you configure)
- ✅ Consistent layout controls (align, gap)
- ✅ More maintainable and readable

## Best Practices

### 1. Order Matters

Put destructive actions first (left), primary actions last (right):

```json
{
  "buttons": [
    { "label": "Cancel", "variant": "ghost" },      // Left
    { "label": "Save", "variant": "primary" }       // Right
  ]
}
```

### 2. Always Include Cancel

Users should always have a way to exit the form:

```json
{
  "buttons": [
    {
      "label": "Cancel",
      "variant": "ghost",
      "action": { "type": "navigate", "to": "/back" }
    },
    ...
  ]
}
```

### 3. Use Icons for Recognition

Add icons to make buttons more recognizable:

- `Check` - Save, Submit, Confirm
- `X` - Cancel, Close
- `Plus` - Create, Add
- `Trash` - Delete
- `Edit` - Edit
- `Send` - Publish, Send

### 4. Choose Appropriate Variants

- **Primary** (blue) - Main action you want users to take
- **Ghost** - Cancel, dismiss, secondary navigation
- **Danger** (red) - Delete, remove, destructive actions
- **Outline** - Alternative actions, optional steps

## No Actions = No Buttons

If you don't define `actions`, **no buttons will be rendered**. This is intentional for maximum flexibility:

```json
{
  "type": "Form",
  "props": {
    "action": { ... }
  }
  // No actions defined = No buttons rendered
}
```

Use this when you want to handle form submission differently (e.g., auto-save, external triggers).

## Troubleshooting

### Buttons Not Showing

**Problem:** No buttons appear in the form.

**Solution:** Add `actions` to form props:

```json
{
  "type": "Form",
  "props": {
    "actions": {
      "buttons": [...]
    }
  }
}
```

### Submit Not Working

**Problem:** Submit button doesn't submit the form.

**Solution:** Ensure `buttonType: "submit"` is set:

```json
{
  "label": "Save",
  "buttonType": "submit",  // Required!
  "variant": "primary"
}
```

### Action Button Submits Form

**Problem:** Non-submit button triggers form submission.

**Solution:** Explicitly set `buttonType: "button"` or omit it (defaults to `"button"`):

```json
{
  "label": "Cancel",
  "buttonType": "button",  // Or omit this line
  "action": { ... }
}
```

## Summary

The new form actions system provides:

- ✅ **Full control** - Define exactly which buttons appear
- ✅ **No surprises** - No default buttons appearing unexpectedly
- ✅ **Config-driven** - Everything defined in JSON, nothing hardcoded
- ✅ **Flexible layout** - Control alignment and spacing
- ✅ **Consistent UX** - Standardized button placement across all forms

This is how **truly config-driven UIs** should work!
