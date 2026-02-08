@echo off
REM Edge Functions Deployment Script for Windows
REM Run this after: supabase login && supabase link

echo 🚀 Deploying Supabase Edge Functions...
echo.

REM Set secrets
echo 📝 Setting secrets...
supabase secrets set WAVESPEED_API_KEY=0368c0122a8def21e2e7db3e324bcdf16f35126471ec130db4dfbf820fa01b20

echo.
echo 🚀 Deploying functions...

REM Deploy all functions
supabase functions deploy generate-image
supabase functions deploy train-lora
supabase functions deploy check-training-status
supabase functions deploy training-signed-url
supabase functions deploy stripe-webhook
supabase functions deploy stripe-prices
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-invoices

echo.
echo ✅ Deployment complete!
echo.
echo 📋 Function URLs:
echo   - generate-image: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/generate-image
echo   - train-lora: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/train-lora
echo   - check-training-status: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/check-training-status
echo   - training-signed-url: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/training-signed-url
echo   - stripe-webhook: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-webhook
echo   - stripe-prices: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-prices
echo   - stripe-checkout: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-checkout
echo   - stripe-portal: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-portal
echo   - stripe-invoices: https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-invoices
echo.
echo 🔍 View logs with: supabase functions logs --follow
pause
