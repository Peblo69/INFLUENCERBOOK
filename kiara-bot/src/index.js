import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Mini App URL (update this when deployed permanently)
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://major-cases-drop.loca.lt';
const BOT_NAME = 'SEEDREAM PRO MAX';

// ==================== START COMMAND ====================
bot.start(async (ctx) => {
  const welcomeMessage = `
🎨 *Welcome to ${BOT_NAME}!*

Generate unlimited AI images with your own API key.

✨ *Features:*
• HiDream, FLUX Pro, FLUX Ultra, Recraft V3
• Multiple sizes and batch generation
• Gallery to save your creations
• 100% free - use your own Fal.ai key

👇 *Tap the button below to open the app:*
  `;

  await ctx.replyWithMarkdown(welcomeMessage, Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 Open SEEDREAM App', MINI_APP_URL)],
    [Markup.button.url('📖 Get Fal.ai API Key', 'https://fal.ai/dashboard/keys')],
  ]));
});

// ==================== HELP COMMAND ====================
bot.command('help', async (ctx) => {
  await ctx.replyWithMarkdown(`
📚 *How to use ${BOT_NAME}:*

1️⃣ Get your free Fal.ai API key from:
   https://fal.ai/dashboard/keys

2️⃣ Open the app and go to Settings

3️⃣ Paste your API key

4️⃣ Start generating!

*Available Models:*
• HiDream - Fast & uncensored
• FLUX Pro - Best quality
• FLUX Ultra - Ultimate quality
• Recraft V3 - Artistic style

*Need help?* Contact @seedreampromax
  `, Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 Open App', MINI_APP_URL)],
  ]));
});

// ==================== APP COMMAND ====================
bot.command('app', async (ctx) => {
  await ctx.reply('Tap to open the app:', Markup.inlineKeyboard([
    [Markup.button.webApp('🚀 Open SEEDREAM App', MINI_APP_URL)],
  ]));
});

// ==================== ERROR HANDLING ====================
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Something went wrong. Try /start to restart.').catch(() => {});
});

// ==================== LAUNCH ====================
console.log('🚀 Starting SEEDREAM PRO MAX Bot...');
console.log(`📱 Mini App URL: ${MINI_APP_URL}`);
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('✅ Bot running! https://t.me/SEEDREAMPROMAX_BOT');
