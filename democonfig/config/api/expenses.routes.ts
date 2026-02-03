import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const expensesRouter = new Hono<{ Bindings: Env }>();

expensesRouter.post('/import', async (c) => {
  const client = createDataClient(c.env);

  try {
    // Parse multipart form data
    const formData = await c.req.parseBody();
    const csvFile = formData['csv'] as File;
    const dryRun = formData['dry_run'] === 'true';
    const createMissingVendors = formData['create_missing_vendors'] === 'true';
    const userId = formData['user_id'] as string;

    if (!csvFile || !userId) {
      return c.json({
        success: false,
        error: { message: 'Missing required fields: csv file and user_id', status: 400 }
      }, 400);
    }

    // Validate user exists
    const userCheck = await client.getItem('users', userId);
    if (!userCheck.data) {
      return c.json({
        success: false,
        error: { message: 'Invalid user_id', status: 400 }
      }, 400);
    }

    const csvText = await csvFile.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return c.json({
        success: false,
        error: { message: 'CSV must have at least a header and one data row', status: 400 }
      }, 400);
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['expense_date', 'amount', 'category_name'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return c.json({
        success: false,
        error: { message: `Missing required CSV headers: ${missingHeaders.join(', ')}`, status: 400 }
      }, 400);
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Invalid number of columns`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => row[h] = values[idx]);

      // Validate required fields
      if (!row.expense_date || !row.amount || !row.category_name) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      const expenseDate = new Date(row.expense_date);
      if (isNaN(expenseDate.getTime())) {
        errors.push(`Row ${i + 1}: Invalid expense_date`);
        continue;
      }

      const amount = parseFloat(row.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Row ${i + 1}: Invalid amount`);
        continue;
      }

      // Resolve category
      const categoryRes = await client.getItems('expense_categories', {
        filter: { name: { _eq: row.category_name } },
        limit: 1
      });
      if (!categoryRes.data || categoryRes.data.length === 0) {
        errors.push(`Row ${i + 1}: Category '${row.category_name}' not found`);
        continue;
      }
      const categoryId = categoryRes.data[0].id;

      // Resolve vendor
      let vendorId: string | null = null;
      if (row.vendor_name) {
        const vendorRes = await client.getItems('vendors', {
          filter: { name: { _eq: row.vendor_name } },
          limit: 1
        });
        if (vendorRes.data && vendorRes.data.length > 0) {
          vendorId = vendorRes.data[0].id;
        } else if (createMissingVendors && !dryRun) {
          const newVendor = await client.createItem('vendors', {
            id: crypto.randomUUID(),
            name: row.vendor_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          vendorId = newVendor.data.id;
        } else if (createMissingVendors && dryRun) {
          // In dry run, assume it would be created
          vendorId = 'would-create';
        } else {
          errors.push(`Row ${i + 1}: Vendor '${row.vendor_name}' not found and create_missing_vendors is false`);
          continue;
        }
      }

      // Resolve payment account
      let paymentAccountId: string | null = null;
      if (row.payment_account_name) {
        const paRes = await client.getItems('payment_accounts', {
          filter: { name: { _eq: row.payment_account_name } },
          limit: 1
        });
        if (!paRes.data || paRes.data.length === 0) {
          errors.push(`Row ${i + 1}: Payment account '${row.payment_account_name}' not found`);
          continue;
        }
        paymentAccountId = paRes.data[0].id;
      }

      const reimbursable = row.reimbursable ? row.reimbursable.toLowerCase() === 'true' : false;
      const status = row.status || 'posted';
      const currency = row.currency || 'USD';

      if (!dryRun) {
        try {
          await client.createItem('expenses', {
            id: crypto.randomUUID(),
            expense_date: expenseDate.toISOString().split('T')[0],
            amount,
            currency,
            description: row.description || null,
            category_id: categoryId,
            vendor_id: vendorId,
            payment_account_id: paymentAccountId,
            reimbursable,
            status,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          created++;
        } catch (err: any) {
          errors.push(`Row ${i + 1}: Failed to create expense - ${err.message}`);
        }
      } else {
        // In dry run, just count as would create
        created++;
      }
    }

    return c.json({
      success: true,
      data: { created, skipped, errors },
      message: dryRun ? 'Dry run completed' : 'Import completed'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});