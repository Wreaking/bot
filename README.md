# Discord Hello World Bot

A simple Discord bot built with Node.js and Discord.js that responds with "Hello World" when mentioned or triggered.

## Features

- ✅ Responds with "Hello World" when mentioned
- ✅ Responds to `!hello` command
- ✅ Responds to simple greetings (hello, hi, hey)
- ✅ Basic error handling and logging
- ✅ Graceful shutdown handling
- ✅ Environment variable configuration

## Prerequisites

- Node.js (version 16.9.0 or higher)
- A Discord bot token from the Discord Developer Portal

## Setup Instructions

### 1. Create a Discord Application and Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section in the left sidebar
4. Click "Add Bot"
5. Copy the bot token (keep this secret!)

### 2. Configure Bot Permissions

In the Discord Developer Portal:
1. Go to the "Bot" section
2. Enable the following bot permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Mention Everyone

### 3. Install Dependencies

```bash
npm install discord.js dotenv
