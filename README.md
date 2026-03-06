# NightLight

A lightweight behavioral safety layer for nights out.

---

## The Problem

When people go out at night, three things happen:

1. **Impulse decisions** — drunk texts, emotional calls, risky messages sent in the moment.
2. **Passive worry** — friends care but don't want to hover or micromanage.
3. **Chaotic escalation** — if something actually goes wrong, there's no clear path for help.

Existing solutions fall short. Location sharing is passive and ignored. "Safety apps" feel like surveillance. iOS Screen Time doesn't address impulse behavior. Nobody wants to send a manual "I'm alive" check-in every hour.

---

## What NightLight Does

Before going out, activate **Night Mode**. That's it. NightLight becomes a quiet layer running in the background — watching out for you without getting in your way.

---

## Features

### Night Mode Setup
- Set an **end time** (e.g., 2:30 AM)
- Add **1–3 Safe Circle contacts** — the people who should know if something's wrong
- Optionally configure an **Impulse Firewall** for specific contacts

### Check-In at End Time
At your set end time, NightLight checks your location against your home (or a default safe location).

- **If you're home:** No notification. You're good.
- **If you're not home:** A notification prompts you to choose:
  - **A. Extend by 1 hour** — still out, still safe
  - **B. Contact friends** — something may be wrong
  - **C. Extend indefinitely** — you'll handle it when you're ready
  - **No response:** defaults to contacting your Safe Circle

### Impulse Firewall
For contacts you tend to message impulsively, NightLight adds friction before the message goes out:

- **Send delay** — messages queue for a set amount of time before sending
- **Retype-to-send** — must manually retype the message to confirm
- **"Send tomorrow?" queue** — hold a message until morning with one tap
- **Gentle nudge** — a soft reminder: *"This may feel different in the morning."*

### Morning Summary (Night Wrapped)
Wake up to a recap of your night:

- Where you went and when
- Messages that were delayed or never sent
- A clear, calm view of the night before

---

## Tech Stack

- React Native (Expo)
- iOS-first

---

## Getting Started

```bash
cd NightLight
npm install
npx expo start
```

---

## Status

Early development. Core architecture in progress.
