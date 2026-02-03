import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const expenseAnalyticsRouter = new Hono<{ Bindings: Env }>();

expenseAnalyticsRouter.get('/budget-vs-actual', async (c) => {
  const client = createDataClient(c.env);
  const { date_from, date_to, currency } = c.req.query();

  // Validation
  if (!date_from || !date_to || !currency) {
    return c.json({
      success: false,
      error: { message: 'Missing required query parameters: date_from, date_to, currency', status: 400 }
    }, 400);
  }

  // Assume user ID is available in context (e.g., from auth middleware)
  const userId = c.get('userId'); // Adjust based on actual auth setup
  if (!userId) {
    return c.json({
      success: false,
      error: { message: 'Unauthorized', status: 401 }
    }, 401);
  }

  try {
    // Get active expense categories
    const categories = await client.getItems('expense_categories', {
      filter: { is_active: { _eq: true } },
      fields: ['id', 'name']
    });

    // Get budgets overlapping the date range for the user and currency
    const budgets = await client.getItems('budgets', {
      filter: {
        created_by: { _eq: userId },
        period_start: { _lte: date_to },
        period_end: { _gte: date_from },
        currency: { _eq: currency }
      },
      fields: ['category_id', 'amount']
    });

    // Get expenses in the date range for the user, currency, and posted status
    const expenses = await client.getItems('expenses', {
      filter: {
        created_by: { _eq: userId },
        expense_date: { _gte: date_from, _lte: date_to },
        currency: { _eq: currency },
        status: { _eq: 'posted' }
      },
      fields: ['category_id', 'amount']
    });

    // Sum budgets by category_id
    const budgetSums = new Map<string, number>();
    for (const budget of budgets.data) {
      if (budget.category_id) {
        const amount = parseFloat(budget.amount) || 0;
        budgetSums.set(budget.category_id, (budgetSums.get(budget.category_id) || 0) + amount);
      }
    }

    // Sum expenses by category_id
    const expenseSums = new Map<string, number>();
    for (const expense of expenses.data) {
      const amount = parseFloat(expense.amount) || 0;
      expenseSums.set(expense.category_id, (expenseSums.get(expense.category_id) || 0) + amount);
    }

    // Build result per category
    const result = categories.data.map((cat: any) => {
      const planned = budgetSums.get(cat.id) || 0;
      const actual = expenseSums.get(cat.id) || 0;
      const variance = actual - planned;
      return {
        category_id: cat.id,
        category_name: cat.name,
        planned,
        actual,
        variance
      };
    });

    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});