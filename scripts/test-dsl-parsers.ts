/**
 * DSL Parser Test Suite
 *
 * Tests all DSL parsers (Schema, API, Page, Apps) by:
 * 1. Parsing DSL examples to JSON
 * 2. Validating JSON against format schemas
 * 3. Reporting results
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import { parseDSL } from './dsl';
import {
  DSL_SCHEMA_EXAMPLES,
  DSL_API_EXAMPLES,
  DSL_PAGE_EXAMPLES,
  DSL_APPS_EXAMPLES
} from './dsl-examples';

interface TestResult {
  type: string;
  example: string;
  parseSuccess: boolean;
  parseError?: string;
  validateSuccess: boolean;
  validateErrors?: any[];
  json?: any;
}

function loadFormatSchema(type: string): any {
  const fileName = type === 'app' ? 'apps-format.json' : `${type}-format.json`;
  const schemaPath = join(process.cwd(), 'config', fileName);
  const content = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content);
}

function testParser(type: 'schema' | 'api' | 'page' | 'app', examples: Array<{ description: string; dsl: string }>): TestResult[] {
  const results: TestResult[] = [];

  // Load format schema
  const formatSchema = loadFormatSchema(type);
  const ajv = new Ajv({
    strict: false,
    allowUnionTypes: true,
    allErrors: true,
    verbose: true
  });
  const validate = ajv.compile(formatSchema);

  for (const example of examples) {
    const result: TestResult = {
      type,
      example: example.description,
      parseSuccess: false,
      validateSuccess: false
    };

    try {
      // Step 1: Parse DSL → JSON
      const json = parseDSL(type, example.dsl);
      result.parseSuccess = true;
      result.json = json;

      // Step 2: Validate JSON against schema
      const isValid = validate(json);
      result.validateSuccess = isValid;

      if (!isValid) {
        result.validateErrors = validate.errors || [];
      }
    } catch (error) {
      result.parseError = error instanceof Error ? error.message : String(error);
    }

    results.push(result);
  }

  return results;
}

function printResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log(`DSL PARSER TEST RESULTS`);
  console.log('='.repeat(80) + '\n');

  const byType = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, TestResult[]>);

  for (const [type, typeResults] of Object.entries(byType)) {
    console.log(`\n📋 ${type.toUpperCase()} Parser`);
    console.log('-'.repeat(80));

    for (const result of typeResults) {
      const parseIcon = result.parseSuccess ? '✅' : '❌';
      const validateIcon = result.validateSuccess ? '✅' : '❌';

      console.log(`\n${parseIcon} Parse  ${validateIcon} Validate  ${result.example}`);

      if (result.parseError) {
        console.log(`   ❌ Parse Error: ${result.parseError.split('\n')[0]}`);
      }

      if (!result.validateSuccess && result.validateErrors) {
        console.log(`   ❌ Validation Errors:`);
        for (const err of result.validateErrors.slice(0, 3)) {
          console.log(`      - ${err.instancePath || 'root'}: ${err.message}`);
        }
        if (result.validateErrors.length > 3) {
          console.log(`      ... and ${result.validateErrors.length - 3} more errors`);
        }
      }

      if (result.parseSuccess && result.validateSuccess) {
        console.log(`   ✅ Success! Generated valid ${type} JSON`);
      }
    }
  }

  // Summary
  const totalTests = results.length;
  const passedParse = results.filter(r => r.parseSuccess).length;
  const passedValidate = results.filter(r => r.validateSuccess).length;
  const fullyPassed = results.filter(r => r.parseSuccess && r.validateSuccess).length;

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests:        ${totalTests}`);
  console.log(`Parse Success:      ${passedParse}/${totalTests} (${Math.round(passedParse/totalTests*100)}%)`);
  console.log(`Validation Success: ${passedValidate}/${totalTests} (${Math.round(passedValidate/totalTests*100)}%)`);
  console.log(`Fully Passed:       ${fullyPassed}/${totalTests} (${Math.round(fullyPassed/totalTests*100)}%)`);
  console.log('='.repeat(80) + '\n');

  return { totalTests, passedParse, passedValidate, fullyPassed };
}

async function main() {
  console.log('🧪 Testing DSL Parsers...\n');

  const allResults: TestResult[] = [];

  // Test Schema parser
  console.log('Testing Schema parser...');
  const schemaResults = testParser('schema', DSL_SCHEMA_EXAMPLES);
  allResults.push(...schemaResults);

  // Test API parser
  console.log('Testing API parser...');
  const apiResults = testParser('api', DSL_API_EXAMPLES);
  allResults.push(...apiResults);

  // Test Page parser
  console.log('Testing Page parser...');
  const pageResults = testParser('page', DSL_PAGE_EXAMPLES);
  allResults.push(...pageResults);

  // Test Apps parser
  console.log('Testing Apps parser...');
  const appsResults = testParser('app', DSL_APPS_EXAMPLES);
  allResults.push(...appsResults);

  // Print results
  const summary = printResults(allResults);

  // Exit with error if any tests failed
  if (summary.fullyPassed < summary.totalTests) {
    console.error(`\n⚠️  ${summary.totalTests - summary.fullyPassed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Test suite error:', error);
  process.exit(1);
});
