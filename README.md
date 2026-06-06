# TI Assistant

## Running Locally

1. Clone the repository.

2. Make sure you have npm installed and run `npm install`.

## Local Game Night

Use this when one laptop is hosting the game and everyone else is on the same Wi-Fi.

1. Start the app:

```bash
npm run game-night
```

Or double-click [Start Game Night.command](/Users/josephcascarelli/Documents/Meal%20Planner/ti-assistant/Start%20Game%20Night.command) on this Mac.

2. The command prints two links and a QR code:

```bash
This Mac:
  http://127.0.0.1:3000/en

Share this with friends on the same Wi-Fi:
  http://YOUR_WIFI_IP:3000/en
```

Friends can scan the QR code from your terminal window to join from a phone.

3. Keep the terminal window open while playing.

4. If macOS asks whether to allow incoming connections for Node.js, allow it.

5. Game data is stored locally in:

```bash
server/local-dev-db.json
```

The app uses the local file database in this mode, so Firebase does not need to be running.

3. Install the [Firebase CLI](https://firebase.google.com/docs/cli) - `curl -sL https://firebase.tools | bash`.

4. Follow the [instructions](https://firebase.google.com/docs/emulator-suite/connect_and_prototype) to install the Firestore Emulator - `firebase init`. When prompted, choose to install the Emulator Suite and Firestore Emulator, and select port 8020.

5. Start the emulators - `firebase emulators:start`.

6. Run `export FIRESTORE_EMULATOR_HOST="127.0.0.1:8020"` to tell the app where to find the emulator.

7. Run `export NEXT_PUBLIC_TI_PROJECT=<project-id>`. If you didn't connect Firebase to a project, this will be `demo-no-project`.

7. Start the app using `npm run dev`.

8. The app will be available on `localhost:3000`.

## Building

1. Run `npm run build`.

## Hosting For A Game Night

The simplest low-cost way to host this app is Google App Engine Standard with Firestore.

Why this route:

1. This repo already includes an [app.yaml](/Users/josephcascarelli/Documents/Meal%20Planner/ti-assistant/app.yaml) deployment file.
2. The app already uses Firebase / Firestore.
3. For a small group and light usage, App Engine Standard and Firestore can often stay within their free quotas, though Google still requires billing to be enabled on the project before deployment.

### One-time setup

1. Create a Firebase project and a linked Google Cloud project.
2. In that project, enable Firestore Database.
3. Install the Google Cloud CLI: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
4. Sign in:

```bash
gcloud auth login
gcloud auth application-default login
```

5. Pick your project:

```bash
gcloud config set project YOUR_PROJECT_ID
```

### First deploy

1. Set the public project id in the shell:

```bash
export NEXT_PUBLIC_TI_PROJECT=YOUR_PROJECT_ID
```

2. Deploy:

```bash
gcloud app deploy app.yaml
```

3. Open the site:

```bash
gcloud app browse
```

### Notes

1. The server now works both with the local JSON key file and with Google Cloud's built-in application credentials, so you do not need to upload a secret key file to deploy.
2. If you want the app URL to be easier to share, you can later attach a custom domain in Google Cloud or Firebase Hosting.
3. Before game day, create one test game and make sure everyone can open it from phones plus desktop browsers.

### Cost

1. App Engine Standard has a free tier.
2. Firestore has a free quota.
3. Google may still require billing to be turned on before you can deploy.
4. If usage stays light, the cost is often $0, but it is not a hard guarantee.

## Localization

#### Adding a new string

1. Add string using `<FormattedMessage />` or `intl.formatMessage(...)`.

2. Run `npm run extract` to generate `/server/lang/en.json`

3. Add generated IDs from `/server/lang/en.json` to new locations.

4. Copy new sections from `/server/lang/en.json` to other language files and translate string.

5. Run `npm run compile` to generate `/server/compiled-lang/<language>.json` files.

6. Create a PR with the changes.

#### Adding a new language

1. Copy `/server/lang/en.json` to `/server/lang/<language>.json`.

2. Translate strings in new language file.

3. Run `npm run compile` to generate `/server/compiled-lang/<language>.json` files.

5. Update `/app/layout.tsx` to include the new locale.

6. Create a PR with the changes.

## Testing

Coming soon.
