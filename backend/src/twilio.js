require('dotenv').config();
const twilio = require('twilio');

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

let client = null;

function getClient() {
  if (!client) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Send SMS alerts to all Safe Circle contacts.
 * @param {{ name: string, phone: string }[]} contacts
 * @param {string} userName
 * @param {Date} homeByTime
 * @returns {Promise<{ sent: number, failed: number }>}
 */
async function sendSafeCircleAlerts(contacts, userName, homeByTime) {
  const formattedTime = homeByTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York', // TODO: store timezone with session
  });

  const message =
    `🚨 NightLight Alert: ${userName} was supposed to check in by ${formattedTime} ` +
    `and hasn't responded to 3 check-in notifications. ` +
    `Please try to reach them or check on them. ` +
    `— Sent automatically by NightLight`;

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      await getClient().messages.create({
        body: message,
        from: TWILIO_FROM_NUMBER,
        to: contact.phone,
      });
      sent++;
      console.log(`[Twilio] SMS sent to ${contact.name} (${contact.phone})`);
    } catch (err) {
      failed++;
      console.error(`[Twilio] Failed to send to ${contact.name}: ${err.message}`);
    }
  }

  return { sent, failed };
}

module.exports = { sendSafeCircleAlerts };
