const Admin = require('../models/Admin');
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { ValidationFailureError, UnauthorizedError, RecordNotFoundError } = require("../utils/ErrorHandling/CustomErrors");
const { comparePassword, hashPassword } = require("../utils/password");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");
const { generateOtp, verifyOtp } = require("../utils/otp");
const { sendEmail } = require('../services/emailService');
const { sendSms } = require('../services/smsService');

const sanitizeUser = (u) => ({
  admin_id: u.admin_id,
  name: u.name,
  email: u.email,
  contact_no: u.contact_no,
  user_role: u.user_role,
  must_change_password: u.must_change_password,
  is_active: u.is_active,
  created_at: u.createdAt,
  updated_at: u.updatedAt,
});

// login
exports.login = catchAsync(async (req, res, _next) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ValidationFailureError('email and password are required.');

  const user = await Admin.findOne({ where: { email } });
  if (!user || !user.is_active) throw new UnauthorizedError('User not found.');

  const ok = await comparePassword(password, user.password);
  if (!ok) throw new UnauthorizedError('Invalid password.');

  const token = signToken({ id: user.admin_id, user_role: user.user_role });
  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    token,
    user_role: user.user_role,
    email: user.email,
    message: user.must_change_password
      ? 'Login success. You must change your password.'
      : 'Login success.',
    data: sanitizeUser(user),
  });
});

// logout
exports.logout = catchAsync(async (_req, res, _next) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: 'Logged out.' });
});

exports.requestOtp = catchAsync(async (req, res, _next) => {
  const { email, purpose, channel } = req.body;
  if (!email || !purpose) throw new ValidationFailureError('email and purpose required.');

  const user = await Admin.findOne({ where: { email } });
  if (!user) throw new RecordNotFoundError('User not found.');

  if (!user) {
    // For security, don't reveal if user exists for reset_password purpose
    if (purpose === 'reset_password') {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
        expires_at: new Date(Date.now() + (parseInt(process.env.OTP_TTL_MINUTES || '1', 10) * 60 * 1000)),
      });
    }
    throw new RecordNotFoundError('User not found.');
  }

  if (purpose === 'first_login_change' && !user.must_change_password) {
    throw new ValidationFailureError('Password already changed.');
  }

  if (purpose === 'change_password' && user.must_change_password) {
    throw new ValidationFailureError('Please use first login change process.');
  }

  const { code, hash, expires } = generateOtp();

  user.otp_hash = hash;
  user.otp_expires_at = expires;
  user.otp_channel = channel && ['email', 'sms'].includes(channel) ? channel : 'email';
  await user.save();

  let emailSubject, emailText;
  
  switch (purpose) {
    case 'reset_password':
      emailSubject = 'Password Reset OTP - AthleteTech';
      emailText = `Your password reset OTP is: ${code}. It expires in ${process.env.OTP_TTL_MINUTES || 1} minutes.`;
      break;
    case 'first_login_change':
      emailSubject = 'First Login Password Change - AthleteTech';
      emailText = `Your first login OTP is: ${code}. It expires in ${process.env.OTP_TTL_MINUTES || 1} minutes.`;
      break;
    default: // change_password
      emailSubject = 'Change Password OTP - AthleteTech';
      emailText = `Your change password OTP is: ${code}. It expires in ${process.env.OTP_TTL_MINUTES || 1} minutes.`;
  }

  // Deliver OTP - FIXED THE LOGIC
  if (user.otp_channel === 'sms' && user.contact_no) {
    await sendSms({ to: user.contact_no, body: `Your AthleTech OTP is: ${code}` });
  } else {
    await sendEmail({
      to: user.email,
      subject: emailSubject,
      text: emailText,
    });
  }

  // During development, return OTP for easy testing
  const includeOtp = process.env.NODE_ENV !== 'production';

  res.status(200).json({
    success: true,
    message: 'OTP sent.',
    expires_at: expires, // Make sure to include this for frontend timer
    ...(includeOtp ? { dev_otp: code } : {}),
  });
});

exports.changePasswordWithOtp = catchAsync(async (req, res, _next) => {
  const { otp, old_password, new_password, confirm_password } = req.body;
  const email = req.user.email;

 

  if ( !otp || !old_password || !new_password || !confirm_password) {
    console.log('Missing fields detected');
    throw new ValidationFailureError('All fields are required.');
  }

  const user = await Admin.findOne({ where: { email } });
  if (!user) {
    console.log('User not found:', email);
    throw new RecordNotFoundError('User not found.');
  }

  console.log('User found:', user.email);
  console.log('Stored OTP hash:', user.otp_hash);
  console.log('OTP expires at:', user.otp_expires_at);
  console.log('Current time:', new Date());

  // verify OTP
  const okOtp = verifyOtp(otp, user.otp_hash, user.otp_expires_at);
  console.log('OTP verification result:', okOtp);
  
  if (!okOtp) {
    console.log('OTP verification failed');
    throw new UnauthorizedError('Invalid or expired OTP.');
  }

  // verify old password
  const okOld = await comparePassword(old_password, user.password);
  console.log('Old password verification result:', okOld);
  
  if (!okOld) {
    console.log('Old password verification failed');
    throw new UnauthorizedError('Old password is incorrect.');
  }

  // update password
  user.password = await hashPassword(new_password);
  user.must_change_password = false;
  user.otp_hash = null;
  user.otp_expires_at = null;
  user.otp_channel = null;
  await user.save();

  console.log('Password changed successfully for user:', email);

  res.status(200).json({
    success: true,
    message: 'Password changed. Please log in again with the new password.',
  });
});

exports.resetPasswordWithOtp = catchAsync(async (req, res, _next) => {
  const { email, otp, new_password, confirm_password } = req.body;

  if (!email || !otp || !new_password || !confirm_password) {
    throw new ValidationFailureError('All fields are required.');
  }
  if (new_password !== confirm_password) {
    throw new ValidationFailureError('New password and confirm password do not match.');
  }
  if (new_password.length < 8) {
    throw new ValidationFailureError('New password must be at least 8 characters.');
  }

  const user = await Admin.findOne({ where: { email } });
  if (!user) throw new RecordNotFoundError('User not found.');

  const okOtp = verifyOtp(otp, user.otp_hash, user.otp_expires_at);
  if (!okOtp) throw new UnauthorizedError('Invalid or expired OTP.');

  user.password = await hashPassword(new_password);
  user.must_change_password = false; // after reset they no longer need to change
  user.otp_hash = null;
  user.otp_expires_at = null;
  user.otp_channel = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in with the new password.',
  });
});

// Add this function to your authController
exports.forgotPassword = catchAsync(async (req, res, _next) => {
  const { email } = req.body;
  
  if (!email) throw new ValidationFailureError('Email is required.');

  const user = await Admin.findOne({ where: { email } });
  
  // Return generic message regardless of whether email exists (for security)
  // But we'll handle validation differently for the frontend
  if (!user) {
    return res.status(200).json({
      success: false,
      message: 'If the email exists, a password reset OTP has been sent.',
      emailExists: false // Add this flag for frontend validation
    });
  }

  const { code, hash, expires } = generateOtp();

  user.otp_hash = hash;
  user.otp_expires_at = expires;
  user.otp_channel = 'email';
  await user.save();

  // Send OTP via email
  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request - AthleteTech',
    text: `Your password reset OTP is: ${code}. This code will expire in ${process.env.OTP_TTL_MINUTES || 1} minutes.`,
  });

  const includeOtp = process.env.NODE_ENV !== 'production';

  res.status(200).json({
    success: true,
    message: 'If the email exists, a password reset OTP has been sent.',
    expires_at: expires,
    emailExists: true, // Add this flag for frontend validation
    ...(includeOtp ? { dev_otp: code } : {}),
  });
});