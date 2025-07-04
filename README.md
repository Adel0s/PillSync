# Welcome to Pill Sync reminder app 👋

Link to repository: https://github.com/Adel0s/PillSync.git
Pill Sync is a React Native mobile application (built with Expo SDK 52) designed to help patients with chronic conditions manage and adhere to their treatment schedules.  
**Deliverables:**  
- Full source code (no compiled binaries)  
- `.env` file for environment variables  
- Documentation: this README  

---

## Technologies & Prerequisites

- **Node.js** ≥ 16  
- **npm** ≥ 8 or **Yarn** ≥ 1.22  
- **Expo CLI** ≥ 6 (install with `npm install -g expo-cli`)  
- **Expo SDK** 52  
- **Supabase** project (Postgres + Auth + Storage)  

## Get started

1. Clone this repo

   ```bash
   git clone https://github.com/Adel0s/PillSync.git
   cd PillSync
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Install Expo CLI (if not already installed)

   ```bash
   npm install -g expo-cli
   ```

4. Configure enviroment: obtain the .env file from the project maintainer and place it in the root folder.

5. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Quick Start with Expo Go

The simplest and easiest way to run PillSync is to:

1. Install [Expo Go](https://expo.dev/go) (version: SDK 52) on your Android device.  
2. Run the app server:

   ```bash
   npx expo start
3. Scan the QR code displayed in your terminal or browser using the Expo Go app.
The application will load immediately in the Expo Go sandbox—no additional steps required.