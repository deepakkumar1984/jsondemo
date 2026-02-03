/**
 * Schema Differ
 *
 * Compares JSON schema configs to detect changes and generate migration hints.
 * Helps with schema evolution by identifying what changed between versions.
 */

import type { TableConfig, ColumnConfig } from './generator';

export interface SchemaDiff {
  tablesAdded: string[];
  tablesRemoved: string[];
  tablesModified: TableDiff[];
}

export interface TableDiff {
  table: string;
  columnsAdded: ColumnConfig[];
  columnsRemoved: string[];
  columnsModified: ColumnModification[];
}

export interface ColumnModification {
  name: string;
  changes: string[];
}

/**
 * Compare two schema configurations and detect changes.
 */
export function diffSchemas(oldConfigs: TableConfig[], newConfigs: TableConfig[]): SchemaDiff {
  const oldTableMap = new Map(oldConfigs.map(c => [c.table, c]));
  const newTableMap = new Map(newConfigs.map(c => [c.table, c]));

  // Find added and removed tables
  const tablesAdded = newConfigs
    .filter(c => !oldTableMap.has(c.table))
    .map(c => c.table);

  const tablesRemoved = oldConfigs
    .filter(c => !newTableMap.has(c.table))
    .map(c => c.table);

  // Find modified tables
  const tablesModified: TableDiff[] = [];

  for (const newConfig of newConfigs) {
    const oldConfig = oldTableMap.get(newConfig.table);
    if (!oldConfig) continue; // New table, already counted

    const tableDiff = diffTable(oldConfig, newConfig);
    if (
      tableDiff.columnsAdded.length > 0 ||
      tableDiff.columnsRemoved.length > 0 ||
      tableDiff.columnsModified.length > 0
    ) {
      tablesModified.push(tableDiff);
    }
  }

  return {
    tablesAdded,
    tablesRemoved,
    tablesModified,
  };
}

/**
 * Compare two table configs and detect column changes.
 */
function diffTable(oldConfig: TableConfig, newConfig: TableConfig): TableDiff {
  const oldColumnMap = new Map(oldConfig.columns.map(c => [c.name, c]));
  const newColumnMap = new Map(newConfig.columns.map(c => [c.name, c]));

  const columnsAdded = newConfig.columns.filter(c => !oldColumnMap.has(c.name));
  const columnsRemoved = oldConfig.columns
    .filter(c => !newColumnMap.has(c.name))
    .map(c => c.name);

  const columnsModified: ColumnModification[] = [];

  for (const newCol of newConfig.columns) {
    const oldCol = oldColumnMap.get(newCol.name);
    if (!oldCol) continue; // New column, already counted

    const changes = diffColumn(oldCol, newCol);
    if (changes.length > 0) {
      columnsModified.push({ name: newCol.name, changes });
    }
  }

  return {
    table: newConfig.table,
    columnsAdded,
    columnsRemoved,
    columnsModified,
  };
}

/**
 * Compare two column configs and list differences.
 */
function diffColumn(oldCol: ColumnConfig, newCol: ColumnConfig): string[] {
  const changes: string[] = [];

  if (oldCol.type !== newCol.type) {
    changes.push(`Type changed from ${oldCol.type} to ${newCol.type}`);
  }

  if (oldCol.notNull !== newCol.notNull) {
    changes.push(`NOT NULL changed from ${oldCol.notNull} to ${newCol.notNull}`);
  }

  if (oldCol.unique !== newCol.unique) {
    changes.push(`UNIQUE changed from ${oldCol.unique} to ${newCol.unique}`);
  }

  if (oldCol.primaryKey !== newCol.primaryKey) {
    changes.push(`PRIMARY KEY changed from ${oldCol.primaryKey} to ${newCol.primaryKey}`);
  }

  if (JSON.stringify(oldCol.enum) !== JSON.stringify(newCol.enum)) {
    changes.push(`ENUM values changed`);
  }

  if (JSON.stringify(oldCol.default) !== JSON.stringify(newCol.default)) {
    changes.push(`Default value changed from ${oldCol.default} to ${newCol.default}`);
  }

  if (JSON.stringify(oldCol.references) !== JSON.stringify(newCol.references)) {
    changes.push(`Foreign key reference changed`);
  }

  return changes;
}

/**
 * Generate a human-readable diff report.
 */
export function generateDiffReport(diff: SchemaDiff): string {
  let report = '='.repeat(80) + '\n';
  report += 'SCHEMA DIFF REPORT\n';
  report += '='.repeat(80) + '\n\n';

  if (
    diff.tablesAdded.length === 0 &&
    diff.tablesRemoved.length === 0 &&
    diff.tablesModified.length === 0
  ) {
    report += 'No changes detected.\n';
    return report;
  }

  // Tables added
  if (diff.tablesAdded.length > 0) {
    report += `\n📦 TABLES ADDED (${diff.tablesAdded.length}):\n`;
    report += '-'.repeat(80) + '\n';
    for (const table of diff.tablesAdded) {
      report += `  + ${table}\n`;
    }
  }

  // Tables removed
  if (diff.tablesRemoved.length > 0) {
    report += `\n🗑️  TABLES REMOVED (${diff.tablesRemoved.length}):\n`;
    report += '-'.repeat(80) + '\n';
    for (const table of diff.tablesRemoved) {
      report += `  - ${table}\n`;
    }
  }

  // Tables modified
  if (diff.tablesModified.length > 0) {
    report += `\n🔧 TABLES MODIFIED (${diff.tablesModified.length}):\n`;
    report += '-'.repeat(80) + '\n';

    for (const tableDiff of diff.tablesModified) {
      report += `\n  Table: ${tableDiff.table}\n`;

      if (tableDiff.columnsAdded.length > 0) {
        report += `    Columns Added:\n`;
        for (const col of tableDiff.columnsAdded) {
          report += `      + ${col.name} (${col.type})\n`;
        }
      }

      if (tableDiff.columnsRemoved.length > 0) {
        report += `    Columns Removed:\n`;
        for (const colName of tableDiff.columnsRemoved) {
          report += `      - ${colName}\n`;
        }
      }

      if (tableDiff.columnsModified.length > 0) {
        report += `    Columns Modified:\n`;
        for (const mod of tableDiff.columnsModified) {
          report += `      ~ ${mod.name}:\n`;
          for (const change of mod.changes) {
            report += `          ${change}\n`;
          }
        }
      }
    }
  }

  report += '\n' + '='.repeat(80) + '\n';
  return report;
}

/**
 * Generate SQL migration hints based on diff.
 * Note: This generates hints, not production-ready migrations.
 */
export function generateMigrationHints(diff: SchemaDiff): string {
  let sql = '-- Auto-generated migration hints\n';
  sql += '-- Review and modify before applying to production\n\n';

  // Add new tables
  for (const table of diff.tablesAdded) {
    sql += `-- TODO: Add CREATE TABLE statement for ${table}\n`;
    sql += `-- See config/schema/${table}.json for table definition\n\n`;
  }

  // Remove tables
  for (const table of diff.tablesRemoved) {
    sql += `-- DROP TABLE ${table};\n\n`;
  }

  // Modify tables
  for (const tableDiff of diff.tablesModified) {
    sql += `-- Modifications for table: ${tableDiff.table}\n`;

    for (const col of tableDiff.columnsAdded) {
      sql += `-- ALTER TABLE ${tableDiff.table} ADD COLUMN ${col.name} ${col.type.toUpperCase()};\n`;
    }

    for (const colName of tableDiff.columnsRemoved) {
      sql += `-- ALTER TABLE ${tableDiff.table} DROP COLUMN ${colName};\n`;
    }

    for (const mod of tableDiff.columnsModified) {
      sql += `-- ALTER TABLE ${tableDiff.table} -- Modify column ${mod.name}\n`;
      sql += `--   Changes: ${mod.changes.join(', ')}\n`;
    }

    sql += '\n';
  }

  return sql;
}
