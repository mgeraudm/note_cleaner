# AI Note Cleaner

AI Note Cleaner is a lightweight Express app that helps users clean up, organize, and summarize notes using Google Gemini.

## What the app does

- Accepts pasted or typed notes in a polished web interface
- Enforces a 10,000-character limit per submission
- Limits note transformations to 3 per 24 hours
- Sends the note to Gemini for:
  - typo and grammar correction
  - duplicate content removal
  - better organization and formatting
  - summary creation
  - extraction of key names, key dates, and key tasks
- Displays the cleaned output in the browser
- Saves the user’s original note and transformed output in browser local storage
- Lets users reopen previous note results from saved history

## Tech stack

- Node.js
- Express
- EJS templates
- Google Gemini API via the Google Generative AI SDK
- Upstash Redis for the 24-hour usage tracking
- Local browser storage for saved note history

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and add your environment variables, including the Gemini key and Upstash Redis credentials:

   ```env
   GEMINIKEY=your_gemini_api_key
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ```

3. Start the application:

   ```bash
   node server.js
   ```

4. Open the app in your browser at:

   ```text
   http://localhost:3000
   ```

## Important warning

> Warning: This app uses a personal Gemini account and may fail if the account does not have available AI credits or if the Gemini API is rate-limited or unavailable. The app is intended for prototyping and local development, not for production-scale AI usage.

## Notes on usage limits

- The app is configured to allow only 3 note transformations per 24-hour period.
- The app stores the recent usage list in Upstash Redis so the restriction is enforced across app usage.
- The limit is intentionally strict for prototype-level credit control.

## Local storage note history

The app stores saved note history in the browser using local storage. This allows users to revisit earlier original/transformed notes without needing a backend database.

## License

This project is for personal/prototype use.
