# Course Questionnaire

A no-build student questionnaire and private teaching-team dashboard for *Economics of Sustainability and the Environment*.

## Views

- Student questionnaire: `/`
- Teaching-team dashboard: `/?view=dashboard`
- Dashboard demo with sample students: `/?view=dashboard&demo=1`
- Student form demo without database writes: `/?demo=1`

The dashboard includes aggregate views of year, prior coursework, learning preferences, and academic interests. Its student directory is grouped by discussion section, searchable, section-filterable, and opens a complete response for each student. It can also export all responses as CSV.

## Run locally

From this folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/?view=dashboard&demo=1` to see the populated dashboard. Firebase modules cannot load from a `file://` URL, so use a local server.

Demo mode does not need Firebase configuration. To test live submissions locally, copy `firebase-config.example.js` to `firebase-config.js` and add the Firebase web API key. The local config file is ignored by Git.

## Configure the course

At the top of `app.js`, edit:

- `CONFIG.discussionSections` to use the actual section numbers, times, or TA names.
- `CONFIG.databaseRoot` if you want a new response collection for another semester.
- `COURSES` or `LEARNING_OPTIONS` if the questionnaire choices change.

Each browser gets an anonymous Firebase identity. A student can revise their answers later from the same browser; a revision replaces that browser's prior submission rather than adding a second response.

## Protect identifiable responses

Unlike the anonymous first-day pulse, this app collects names and email addresses. The dashboard therefore uses Firebase Authentication and should **not** be deployed with public database reads.

1. In the Firebase console, enable **Authentication → Sign-in method → Email/Password** and **Google** for the teaching team, and **Anonymous** for student submissions.
2. Create each password-based teaching-team account under **Authentication → Users**, or have the person sign in once with Google.
3. Add every approved teaching-team account's Firebase UID below `courseQuestionnaire2026/authorizedUsers/` with the value `true`.
4. Merge the rules below into the project's existing Realtime Database rules. Do not replace rules belonging to other course apps.

The project must not have a broader parent-level rule such as `".read": true`; Firebase grants access when any applicable rule grants it, so a public rule above this namespace would defeat the dashboard restriction.

Suggested rules:

```json
{
  "rules": {
    "courseQuestionnaire2026": {
      "authorizedUsers": {
        ".read": "auth != null && data.child(auth.uid).val() === true",
        ".write": false
      },
      "responses": {
        ".read": "auth != null && root.child('courseQuestionnaire2026/authorizedUsers').child(auth.uid).val() === true",
        "$response": {
          ".write": "auth != null && $response === auth.uid && newData.exists()",
          ".validate": "newData.hasChildren(['firstName','lastName','email','hometown','section','year','learning','majorMinor']) && newData.child('firstName').isString() && newData.child('firstName').val().length <= 60 && newData.child('lastName').isString() && newData.child('lastName').val().length <= 60 && newData.child('email').isString() && newData.child('email').val().length <= 120 && newData.child('hometown').isString() && newData.child('hometown').val().length <= 100 && newData.child('majorMinor').isString() && newData.child('majorMinor').val().length <= 240 && newData.child('learning').hasChildren() && (!newData.child('otherLearning').exists() || (newData.child('otherLearning').isString() && newData.child('otherLearning').val().length <= 180))",
          "learning": {
            "$choice": {
              ".validate": "($choice === '0' || $choice === '1') && newData.isString() && newData.val().length <= 120"
            }
          }
        }
      }
    }
  }
}
```

The Firebase web configuration in `app.js` identifies the project and is not a password. Access to identifiable data is controlled by Authentication and the database rules. For production, also restrict the authorized domains in Firebase Authentication and the hosting provider's access settings where available.

## Deploy

The included GitHub Actions workflow deploys the site to GitHub Pages whenever `main` changes. Add the Firebase web API key as the repository Actions secret `FIREBASE_API_KEY`, set Pages to use **GitHub Actions**, and add `jonathancolmer.github.io` under **Firebase Authentication → Settings → Authorized domains** before using teaching-team sign-in.

The workflow keeps the key out of repository source and history, but a Firebase web API key is necessarily visible to browsers on the deployed site. Firebase documents these keys as project identifiers rather than authorization secrets. Protect response data with Authentication, Realtime Database rules, API restrictions, and optionally App Check.
