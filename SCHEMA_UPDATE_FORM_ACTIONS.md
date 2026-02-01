# Page Format Schema Update - Form Actions

## Summary

Updated `config/page-format.json` to include the new form actions configuration structure.

## Changes Made

### Added to `formProps` Definition

```json
{
  "formProps": {
    "type": "object",
    "required": ["action"],
    "properties": {
      "action": { ... },
      "actions": {
        "type": "object",
        "description": "Form action buttons configuration",
        "properties": {
          "buttons": {
            "type": "array",
            "description": "Array of button configurations",
            "items": {
              "type": "object",
              "required": ["label"],
              "properties": {
                "label": { "type": "string" },
                "variant": {
                  "type": "string",
                  "enum": ["primary", "secondary", "ghost", "outline", "danger"]
                },
                "buttonType": {
                  "type": "string",
                  "enum": ["submit", "button", "reset"]
                },
                "icon": { "type": "string" },
                "action": {
                  "type": "object",
                  "properties": {
                    "type": {
                      "type": "string",
                      "enum": ["navigate", "api_call", "delete_confirm"]
                    },
                    "to": { "type": "string" },
                    "url": { "type": "string" },
                    "method": {
                      "type": "string",
                      "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]
                    }
                  }
                }
              }
            }
          },
          "align": {
            "type": "string",
            "enum": ["start", "center", "end", "between", "around"],
            "default": "end"
          },
          "gap": {
            "type": "string",
            "enum": ["xs", "sm", "md", "lg", "xl"],
            "default": "md"
          }
        }
      }
    }
  }
}
```

## Schema Properties

### `actions` Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `buttons` | Array | No | Array of button configurations |
| `align` | String | No | Horizontal alignment (default: "end") |
| `gap` | String | No | Spacing between buttons (default: "md") |

### `buttons[]` Item

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `label` | String | **Yes** | Button label text |
| `variant` | Enum | No | Button style: primary, secondary, ghost, outline, danger |
| `buttonType` | Enum | No | HTML type: submit, button, reset |
| `icon` | String | No | Icon name from registry |
| `action` | Object | No | Action to perform (not needed for submit buttons) |

### `action` Object

| Property | Type | Description |
|----------|------|-------------|
| `type` | Enum | Action type: navigate, api_call, delete_confirm |
| `to` | String | Navigation target (for navigate) |
| `url` | String | API URL (for api_call) |
| `method` | Enum | HTTP method: GET, POST, PUT, DELETE, PATCH |

## Valid Enum Values

### Button Variants
- `primary` - Blue filled button (main action)
- `secondary` - Gray filled button
- `ghost` - Transparent button (subtle)
- `outline` - Bordered button
- `danger` - Red destructive button

### Button Types
- `submit` - Submits the form
- `button` - Regular button (default)
- `reset` - Resets form values

### Alignment Options
- `start` - Align left
- `center` - Align center
- `end` - Align right (default)
- `between` - Space between
- `around` - Space around

### Gap Sizes
- `xs` - Extra small (4px)
- `sm` - Small (8px)
- `md` - Medium (12px) - default
- `lg` - Large (16px)
- `xl` - Extra large (24px)

### Action Types
- `navigate` - Navigate to another page
- `api_call` - Make API request
- `delete_confirm` - Delete with confirmation

### HTTP Methods
- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`

## Example Validations

### ✅ Valid Configuration

```json
{
  "type": "Form",
  "props": {
    "action": {
      "type": "submit_form",
      "url": "/api/projects",
      "method": "POST"
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
          "label": "Save",
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

### ❌ Invalid - Missing Required `label`

```json
{
  "actions": {
    "buttons": [
      {
        "variant": "primary",
        "buttonType": "submit"
        // Missing required "label" property
      }
    ]
  }
}
```

### ❌ Invalid - Bad Enum Value

```json
{
  "actions": {
    "buttons": [
      {
        "label": "Save",
        "variant": "blue"  // Invalid! Must be: primary, secondary, ghost, outline, danger
      }
    ]
  }
}
```

## Backward Compatibility

The `actions` property is **optional**, so existing forms without the new actions configuration will continue to work (they just won't render any buttons).

Forms that had inline buttons as children will still work but should be migrated to use the new `actions` configuration for consistency.

## Migration Path

**Before (deprecated):**
```json
{
  "type": "Form",
  "props": { "action": {...} },
  "children": [
    {
      "type": "Grid",
      "children": [
        ... fields ...,
        {
          "type": "Stack",
          "children": [
            { "type": "Button", ... },
            { "type": "Button", ... }
          ]
        }
      ]
    }
  ]
}
```

**After (recommended):**
```json
{
  "type": "Form",
  "props": {
    "action": {...},
    "actions": {
      "buttons": [
        { "label": "Cancel", ... },
        { "label": "Save", ... }
      ],
      "align": "end",
      "gap": "md"
    }
  },
  "children": [
    {
      "type": "Grid",
      "children": [
        ... fields only ...
      ]
    }
  ]
}
```

## Validation Results

All existing page configurations validate successfully against the updated schema:

```
✅ Schema Valid: 21
❌ Schema Invalid: 0
```

## Benefits of Schema Update

1. **Documentation** - Schema serves as self-documenting API
2. **IDE Support** - Autocomplete and validation in editors with JSON schema support
3. **Type Safety** - Defines allowed values for enums
4. **Consistency** - Ensures all forms use the same action structure
5. **Future Proofing** - Easy to extend with new button types or actions

## Related Documentation

- See `FORM_ACTIONS_GUIDE.md` for complete usage guide
- See `config/page-format.json` for full schema definition
