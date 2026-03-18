# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

## SMS Messaging & Consent (Twilio)

NightLight uses Twilio to send SMS notifications to a user's Safe Circle contacts when a check-in is missed.

**Proof of Consent**

Safe Circle contacts are designated by the primary user but must independently opt in before receiving any NightLight SMS alerts. Each contact receives an invitation and completes a separate web-based consent form that clearly explains:

- **Who** is sending the messages (the NightLight service on behalf of the inviting user)
- **What** they are consenting to (transactional missed-check-in notifications only — no marketing or promotional messages)
- **How** to stop receiving messages at any time by replying **STOP** to any message

No SMS messages are sent to a contact until their explicit opt-in is recorded. Contacts may also reply **HELP** for assistance or reach out through the app's support channel. Message and data rates may apply.

This consent model complies with Twilio's messaging policy and applicable regulations (TCPA, CTIA guidelines).
