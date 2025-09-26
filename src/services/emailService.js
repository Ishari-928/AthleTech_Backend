const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {

  try{
    if (!process.env.SMTP_HOST) {
    console.log('[DEV] Email not configured. Would send:', { to, subject, text });
    return;
    }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'athletech.test@gmail.com',
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent successfully to", to);
  } catch(err){
    console.error("Email sending failed:", err);
    throw err;
  }

};

module.exports = { sendEmail };
