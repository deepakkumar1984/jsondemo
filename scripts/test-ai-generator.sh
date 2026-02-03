#!/bin/bash

# Test script for example-driven AI config generation
# This tests that the generator works with the new approach

echo "🧪 Testing AI Config Generator with Example-Driven Approach"
echo "============================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env with:"
    echo "  CLOUDFLARE_AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/{account}/{gateway}"
    echo "  ANTHROPIC_API_KEY=sk-ant-..."
    exit 1
fi

# Check if required env vars are set
if ! grep -q "CLOUDFLARE_AI_GATEWAY_URL" .env; then
    echo "❌ Error: CLOUDFLARE_AI_GATEWAY_URL not set in .env"
    exit 1
fi

if ! grep -q "ANTHROPIC_API_KEY" .env; then
    echo "❌ Error: ANTHROPIC_API_KEY not set in .env"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Test 1: Generate a simple schema
echo "📋 Test 1: Generating simple schema config..."
echo "Feature: Simple task management table"
echo ""

tsx scripts/ai-config-generator.ts \
  --type schema \
  --feature "Task management" \
  --tasks "Simple task table with title, description, status, and due date" \
  --output /tmp/test-task-schema.json

if [ $? -eq 0 ]; then
    echo "✅ Schema generation successful"
    echo ""
    echo "Generated schema preview:"
    cat /tmp/test-task-schema.json | head -30
    echo ""
else
    echo "❌ Schema generation failed"
    exit 1
fi

# Test 2: Generate a simple API
echo ""
echo "📋 Test 2: Generating simple API config..."
echo "Feature: Task CRUD API"
echo ""

tsx scripts/ai-config-generator.ts \
  --type api \
  --feature "Task API" \
  --tasks "Basic CRUD operations for tasks: list, create, update, delete" \
  --output /tmp/test-task-api.json

if [ $? -eq 0 ]; then
    echo "✅ API generation successful"
    echo ""
    echo "Generated API preview:"
    cat /tmp/test-task-api.json | head -50
    echo ""
else
    echo "❌ API generation failed"
    exit 1
fi

# Test 3: Generate a page config (uses json-render catalog)
echo ""
echo "📋 Test 3: Generating page config with json-render catalog..."
echo "Feature: Task list page"
echo ""

tsx scripts/ai-config-generator.ts \
  --type page \
  --feature "Task list page" \
  --tasks "Display tasks in a table with search and filters" \
  --output /tmp/test-task-page.json

if [ $? -eq 0 ]; then
    echo "✅ Page generation successful"
    echo ""
    echo "Generated page preview:"
    cat /tmp/test-task-page.json | head -50
    echo ""
else
    echo "❌ Page generation failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "The json-render catalog-based approach is working correctly for pages."
echo "Generated files saved to:"
echo "  - /tmp/test-task-schema.json"
echo "  - /tmp/test-task-api.json"
echo "  - /tmp/test-task-page.json"
echo ""
echo "Next steps:"
echo "  1. Review the generated configs"
echo "  2. Use --debug flag for detailed output"
echo "  3. Page configs now use json-render catalog for component definitions"
echo "  4. Update catalog.ts to add new component types or actions"
