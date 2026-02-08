# Kiara Gen - Telegram AI Image Bot

A Telegram bot for AI image generation using Seedream V4 and Fal.ai premium models.

## Features

- **Seedream V4** - Fast, high-quality image generation
- **Fal.ai Premium** - FLUX Pro Ultra, Imagen 4, Recraft V3, HiDream
- **Batch Generation** - Generate 2-10 images in parallel
- **Credit System** - Pay-per-use with crypto payments
- **Anti-Sharing** - Telegram ID = unique user, impossible to share

## Quick Start

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot`
3. Choose a name: `Kiara Gen`
4. Choose a username: `kiaragen_bot` (must end in `bot`)
5. Copy the token

### 2. Setup Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Paste and run `supabase-setup.sql`
4. Copy your URL and Service Role Key from Settings > API

### 3. Configure Environment

```bash
cd kiara-bot
cp .env.example .env
```

Edit `.env`:
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
WAVESPEED_API_KEY=your_wavespeed_key
FAL_API_KEY=your_fal_key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

### 4. Install & Run

```bash
npm install
npm run dev
```

## Commands

| Command | Description | Cost |
|---------|-------------|------|
| `/start` | Start bot, get 5 free credits | Free |
| `/generate <prompt>` | Generate 1 image | 1 credit |
| `/batch <count> <prompt>` | Generate 2-10 images | N credits |
| `/balance` | Check your credits | Free |
| `/buy` | Purchase more credits | - |
| `/settings` | View/change settings | Free |
| `/size <WxH>` | Change image size | Free |
| `/model <name>` | Switch AI model | Free |
| `/help` | Show all commands | Free |

## Models

### Seedream (Default - 1 credit)
- Fast generation (~5-8 seconds)
- Good quality
- Best for most use cases

### Fal.ai Premium (Coming Soon)
- FLUX Pro Ultra (3 credits) - Best quality
- Imagen 4 (2 credits) - Google's best
- Recraft V3 (2 credits) - Photorealistic
- HiDream (1 credit) - Fast & good

## Pricing

| Package | Credits | Price | Per Image |
|---------|---------|-------|-----------|
| Starter | 50 | $10 | $0.20 |
| Popular | 150 | $25 | $0.17 |
| Pro | 500 | $70 | $0.14 |
| Ultimate | 1500 | $180 | $0.12 |

## Deployment

### Railway (Recommended)
1. Push to GitHub
2. Connect to [Railway](https://railway.app)
3. Add environment variables
4. Deploy!

### VPS
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start src/index.js --name kiara-bot

# Auto-restart on reboot
pm2 startup
pm2 save
```

## API Keys

### Wavespeed (Seedream)
- Sign up at [wavespeed.ai](https://wavespeed.ai)
- Get API key from dashboard

### Fal.ai
- Sign up at [fal.ai](https://fal.ai)
- Get API key from dashboard

## Support

Questions? Issues? Contact [@YourHandle](https://t.me/YourHandle)

## License

MIT
