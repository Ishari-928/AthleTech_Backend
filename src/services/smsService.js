let twilioClient;
if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
  twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
}

const sendSms = async ({ to, body }) => {
  if (!twilioClient) {
    console.log('[DEV] SMS not configured. Would send:', { to, body });
    return;
  }
  await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE,
    to,
    body,
  });
};

module.exports = { sendSms };
