# 🤖 AI Chat Assistant - Telegram Web App

A premium ChatGPT-powered Telegram Web App with streaming responses, dark theme, and beautiful UI.

## Features

- ✨ Premium dark theme with glassmorphism
- 🔄 Streaming responses (real-time typing)
- 📱 Telegram WebApp SDK integration
- 🎨 Multiple GPT models (4o-mini, 4o, 4-turbo, 3.5-turbo)
- 💬 Chat history persistence
- 📋 Code block copy buttons
- 🌐 Markdown rendering
- 📱 Fully responsive & mobile-first

## Setup Guide

### Step 1: Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g., `ai-chat-bot`)
2. Upload all files (`index.html`, `style.css`, `script.js`) to the repo
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch and `/ (root)` folder
5. Click **Save**
6. Wait 1-2 minutes, your site will be live at: `https://YOUR_USERNAME.github.io/ai-chat-bot/`

### Step 2: Set Up Telegram Bot

1. Open Telegram and go to [@BotFather](https://t.me/BotFather)
2. Your bot token: `8986244844:AAF9nt3XDiCeHSMnGpw6NtLcuDsOD7bFAao`
3. Send this command to BotFather:
   ```
   /setmenubutton
   ```
4. Select your bot
5. Send the URL:
   ```
   https://YOUR_USERNAME.github.io/ai-chat-bot/
   ```
6. Send the button text:
   ```
   🤖 Open AI Chat
   ```

### Step 3: Test

1. Open your bot in Telegram
2. Click the **Menu Button** (bottom left) or the **🤖 Open AI Chat** button
3. Start chatting!

## ⚠️ Security Notice

The API key is embedded in the frontend JavaScript. This is fine for personal use but **NOT recommended for public/production use**. For production, use a backend proxy server to handle API calls.

## File Structure

```
telegram-chatgpt-bot/
├── index.html    # Main HTML structure
├── style.css     # Premium dark theme styles
├── script.js     # Chat logic & API integration
└── README.md     # This file
```
