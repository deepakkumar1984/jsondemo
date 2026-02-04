import { Hono } from 'hono';
import { createDataClient } from '../../src/db/data-client';

export const expenseAnalyticsRouter = new Hono<{ Bindings: Env }>();

expenseAnalyticsRouter.get('/summary', async (c) => {
  const { date_from, date_to, currency } = c.req.query();
  if (!date_from || !date_to) {
    return c.json({ success: false, error: { message: 'Missing required query parameters: date_from and date_to', status: 400 } }, 400);
  }
  const client = createDataClient(c.env);
  try {
    const filter: any = { created_at: { _gte: date_from, _lte: date_to } };
    if (currency) filter.currency = { _eq: currency };
    const expenses = await client.getItems('expenses', { filter });
    const data = expenses.data;
    const total_spend = data.reduce((sum, e) => sum + e.amount, 0);
    const transaction_count = data.length;
    const avg_transaction = transaction_count > 0 ? total_spend / transaction_count : 0;
    const categoryCounts: Record<string, number> = {};
    const vendorCounts: Record<string, number> = {};
    data.forEach(e => {
      if (e.category_id) categoryCounts[e.category_id] = (categoryCounts[e.category_id] || 0) + 1;
      if (e.vendor_id) vendorCounts[e.vendor_id] = (vendorCounts[e.vendor_id] || 0) + 1;
    });
    const top_category = Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b) : null;
    const top_vendor = Object.keys(vendorCounts).length > 0 ? Object.keys(vendorCounts).reduce((a, b) => vendorCounts[a] > vendorCounts[b] ? a : b) : null;
    return c.json({ success: true, data: { total_spend, transaction_count, avg_transaction, top_category, top_vendor } });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expenseAnalyticsRouter.get('/by-category', async (c) => {
  const { date_from, date_to } = c.req.query();
  if (!date_from || !date_to) {
    return c.json({ success: false, error: { message: 'Missing required query parameters: date_from and date_to', status: 400 } }, 400);
  }
  const client = createDataClient(c.env);
  try {
    const filter: any = { created_at: { _gte: date_from, _lte: date_to } };
    const expenses = await client.getItems('expenses', { filter });
    const data = expenses.data;
    const categoryMap: Record<string, { total: number; count: number }> = {};
    data.forEach(e => {
      if (!categoryMap[e.category_id]) categoryMap[e.category_id] = { total: 0, count: 0 };
      categoryMap[e.category_id].total += e.amount;
      categoryMap[e.category_id].count += 1;
    });
    const categoryIds = Object.keys(categoryMap);
    const categories = await client.getItems('categories', { filter: { id: { _in: categoryIds } } });
    const categoryNames: Record<string, string> = {};
    categories.data.forEach(cat => categoryNames[cat.id] = cat.name);
    const rows = categoryIds.map(id => ({
      category_id: id,
      category_name: categoryNames[id] || 'Unknown',
      total: categoryMap[id].total,
      count: categoryMap[id].count
    }));
    return c.json({ success: true, data: rows });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expenseAnalyticsRouter.get('/by-vendor', async (c) => {
  const { date_from, date_to } = c.req.query();
  if (!date_from || !date_to) {
    return c.json({ success: false, error: { message: 'Missing required query parameters: date_from and date_to', status: 400 } }, 400);
  }
  const client = createDataClient(c.env);
  try {
    const filter: any = { created_at: { _gte: date_from, _lte: date_to } };
    const expenses = await client.getItems('expenses', { filter });
    const data = expenses.data;
    const vendorMap: Record<string, { total: number; count: number }> = {};
    data.forEach(e => {
      if (!vendorMap[e.vendor_id]) vendorMap[e.vendor_id] = { total: 0, count: 0 };
      vendorMap[e.vendor_id].total += e.amount;
      vendorMap[e.vendor_id].count += 1;
    });
    const vendorIds = Object.keys(vendorMap);
    const vendors = await client.getItems('vendors', { filter: { id: { _in: vendorIds } } });
    const vendorNames: Record<string, string> = {};
    vendors.data.forEach(v => vendorNames[v.id] = v.name);
    const rows = vendorIds.map(id => ({
      vendor_id: id,
      vendor_name: vendorNames[id] || 'Unknown',
      total: vendorMap[id].total,
      count: vendorMap[id].count
    }));
    return c.json({ success: true, data: rows });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

expenseAnalyticsRouter.get('/timeseries', async (c) => {
  const { date_from, date_to, interval } = c.req.query();
  if (!date_from || !date_to || !interval) {
    return c.json({ success: false, error: { message: 'Missing required query parameters: date_from, date_to, and interval', status: 400 } }, 400);
  }
  if (!['day', 'week', 'month'].includes(interval)) {
    return c.json({ success: false, error: { message: 'Invalid interval: must be day, week, or month', status: 400 } }, 400);
  }
  const client = createDataClient(c.env);
  try {
    const filter: any = { created_at: { _gte: date_from, _lte: date_to } };
    const expenses = await client.getItems('expenses', { filter });
    const data = expenses.data;
    const periodMap: Record<string, { total: number; count: number }> = {};
    data.forEach(e => {
      const date = new Date(e.created_at);
      let period: string;
      if (interval === 'day') {
        period = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const year = date.getFullYear();
        const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
        period = `${year}-W${week}`;
      } else {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!periodMap[period]) periodMap[period] = { total: 0, count: 0 };
      periodMap[period].total += e.amount;
      periodMap[period].count += 1;
    });
    const rows = Object.keys(periodMap).map(period => ({
      period,
      total: periodMap[period].total,
      count: periodMap[period].count
    }));
    return c.json({ success: true, data: rows });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});