# AI Gateway Setup Guide

This guide explains how to configure Cloudflare AI Gateway for the AI config generator to enable extended timeouts (up to 5 minutes) and avoid gateway timeout errors.

## Why AI Gateway?

By default, Cloudflare Workers have a maximum execution timeout of ~100 seconds on paid plans (less on free tier). This can cause 504 Gateway Timeout errors when generating complex configs.

**AI Gateway solves this by:**
- Supporting custom timeouts up to 5 minutes (300 seconds)
- Using the `cf-aig-request-timeout` header
- Bypassing standard Worker gateway timeouts
- Providing analytics and caching for AI requests

## Setup Steps

### 1. Get Your Cloudflare Account ID

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** > **Overview**
3. Your Account ID is displayed on the right side
4. Copy it for later

### 2. Create an AI Gateway

1. In the Cloudflare Dashboard, go to **AI** > **AI Gateway**
2. Click **Create Gateway**
3. Give it a name (e.g., `config-generator`)
4. Note the **Gateway ID/Slug** (shown in the URL or gateway settings)
5. Copy this ID for later

### 3. Create an API Token

1. Go to **My Profile** > **API Tokens**
2. Click **Create Token**
3. Choose **Create Custom Token**
4. Configure the token:
   - **Token name:** `AI Gateway Config Generator`
   - **Permissions:** Account > AI Gateway > Read
   - **Account Resources:** Include > Your Account
   - **Client IP Address Filtering:** Optional (leave empty for local dev)
5. Click **Continue to summary** then **Create Token**
6. **Copy the token immediately** - you won't be able to see it again!

### 4. Configure Local Development

1. Copy the example file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and fill in your credentials:
   ```bash
   CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   CLOUDFLARE_API_TOKEN=your_api_token_here
   AI_GATEWAY_ID=your_gateway_id_here
   ```

3. **Important:** Never commit `.dev.vars` to git - it's already in `.gitignore`

### 5. Test the Setup

1. Restart the AI worker:
   ```bash
   npm run ai:dev
   ```

2. Check the logs - you should see:
   ```
   Using AI Gateway (5min timeout)
   ```

3. Try generating a config:
   ```bash
   npm run generate api tasks
   ```

## Fallback Behavior

The worker automatically detects whether AI Gateway credentials are configured:

- **With credentials:** Uses AI Gateway with 5-minute timeout and higher token limits
- **Without credentials:** Falls back to direct Workers AI with reduced token limits

## Token Limits by Mode

| Config Type | AI Gateway | Direct Workers AI |
|-------------|------------|-------------------|
| API         | 16,384     | 8,192            |
| Pages       | 6,144      | 4,096            |
| Schema      | 8,192      | 4,096            |

Higher token limits = more comprehensive configs but longer generation time.

## Troubleshooting

### "AI Gateway credentials not configured"

Check that all three variables are set in `.dev.vars`:
```bash
cat .dev.vars
```

### "AI Gateway error: 401"

Your API token is invalid or expired. Create a new token with AI Gateway:Read permission.

### "AI Gateway error: 403"

Your API token doesn't have permission for this account. Make sure the token is scoped to the correct account.

### Still getting timeouts?

Even with AI Gateway's 5-minute timeout, extremely complex requests might fail:
1. Generate one entity at a time instead of multiple
2. Use simpler, more focused descriptions
3. Check AI Gateway logs in the Cloudflare dashboard

## Production Deployment

For production, set secrets using Wrangler:

```bash
# Set each secret
wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.ai.toml
wrangler secret put CLOUDFLARE_API_TOKEN --config wrangler.ai.toml
wrangler secret put AI_GATEWAY_ID --config wrangler.ai.toml
```

Then deploy:
```bash
wrangler deploy --config wrangler.ai.toml
```

## AI Gateway Benefits

Beyond timeout improvements, AI Gateway provides:

- **Analytics:** Track request volume, latency, and costs
- **Caching:** Cache responses to reduce costs and improve speed
- **Rate limiting:** Protect against abuse
- **Logging:** Detailed logs of all AI requests
- **Cost tracking:** Monitor AI usage and spending

Access these features in the Cloudflare Dashboard under AI > AI Gateway.

## References

- [Cloudflare AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [API Token Permissions](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
