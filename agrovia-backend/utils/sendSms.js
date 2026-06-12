const sendSms = async ({ to, message }) => {
  // Development fallback: log to console, never expose OTP in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV SMS]\nTo:      ${to}\nMessage: ${message}\n`);
    return;
  }

  // Production: SMS provider must be configured
  // Integrate your provider here (e.g. Twilio, MessageBird, InfoBip)
  // Example Twilio:
  //   const twilio = require('twilio');
  //   const client = twilio(process.env.SMS_ACCOUNT_SID, process.env.SMS_AUTH_TOKEN);
  //   await client.messages.create({ body: message, from: process.env.SMS_FROM, to });

  if (!process.env.SMS_API_KEY) {
    throw new Error('SMS provider konfiqurasiya edilməyib (SMS_API_KEY tapılmadı)');
  }

  throw new Error('SMS provider inteqrasiyası tamamlanmayıb');
};

module.exports = sendSms;
