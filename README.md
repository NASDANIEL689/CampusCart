# CampusCart

This app is configured to deploy to GitHub Pages with GitHub Actions.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example`
3. Add your Gemini key to either `VITE_GEMINI_API_KEY` or `GEMINI_API_KEY`
4. Run the app:
   `npm run dev`

## Deploy To GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open `Settings > Secrets and variables > Actions`.
3. Add a repository secret named `GEMINI_API_KEY` with your Gemini API key.
4. Open `Settings > Pages`.
5. Under `Build and deployment`, set `Source` to `GitHub Actions`.
6. Push to the `main` branch, or run the `Deploy to GitHub Pages` workflow manually.

The workflow automatically uses:

- `/` for a user or organization site such as `username.github.io`
- `/<repo-name>/` for a project site such as `username.github.io/CampusCart`

After the workflow finishes, your app will be available on the GitHub Pages URL shown in the repository Pages settings.
