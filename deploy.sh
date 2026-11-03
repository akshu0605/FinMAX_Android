#!/bin/bash

# FinMax Static Deployment Script
# This app is STATIC ONLY - No Supabase, No Backend

echo "========================================="
echo "  FinMax - Static Site Deployment"
echo "========================================="
echo ""
echo "⚠️  WARNING: This app does NOT use Supabase"
echo "⚠️  Do not deploy edge functions"
echo "⚠️  This is a STATIC SITE ONLY"
echo ""
echo "Building static site..."

# Build the Vite app
npm run build

echo ""
echo "✅ Build complete!"
echo "📦 Deploy the 'dist/' folder to any static hosting"
echo ""
echo "Supported platforms:"
echo "  - Vercel (static)"
echo "  - Netlify (static)"
echo "  - GitHub Pages"
echo "  - Any static file hosting"
echo ""
echo "❌ DO NOT deploy Supabase functions"
echo "========================================="
