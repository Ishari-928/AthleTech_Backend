const Admin = require('../models/Admin');
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { ValidationFailureError, DuplicateRecordsError } = require("../utils/ErrorHandling/CustomErrors");
const { hashPassword } = require("../utils/password");
const { sendEmail } = require('../services/emailService');


// create admin
exports.createAdmin = catchAsync(async (req, res, _next) => {
  const { name, email, contact_no, user_role } = req.body;

  if (!name || !email || !user_role) {
    throw new ValidationFailureError('name, email, role are required.');
  }
  if (!['superadmin', 'admin'].includes(user_role)) {
    throw new ValidationFailureError('Invalid role.');
  }

  const exists = await Admin.findOne({ where: { email } });
  if (exists) throw new DuplicateRecordsError('Email already exists.');

  // create default 4 digit pw
  const defaultPassword = Math.floor(1000 + Math.random() * 9000).toString();

  const password = await hashPassword(defaultPassword);


  const admin = await Admin.create({
    name,
    email,
    contact_no: contact_no || null,
    user_role,
    password,
    must_change_password: true,
    is_active: true,
  });

   // send email
  // await sendEmail({
  //   to: email,
  //   subject: 'Your Athletech Admin Account Created',
  //   text: `Hello ${name},\n\nYour Athletech admin account has been created.\n\nLogin credentials:\nUsername: ${email}\nPassword: ${defaultPassword}\n\nAfter logging in, please change your password immediately for security.\n\nThank you.`,
  // });

  try {
    await sendEmail({
      to: email,
      subject: "Your Athletech Admin Account Created",
      text: `Hello ${name}, your login is ${email} / ${defaultPassword}`,
    });
    console.log("Email sent successfully to", email);
  } catch (err) {
    console.error("Email sending failed:", err);
  }

  res.status(201).json({
    success: true,
    message: 'Admin created successfully.',
    data: { admin_id: admin.admin_id, email: admin.email, user_role: admin.user_role },
  });
});

// get all admins
exports.getAllAdmins = catchAsync(async (req, res, _next) => {
  const admins = await Admin.findAll({
    attributes: [
      "admin_id",
      "name",
      "email",
      "contact_no",
      "user_role",
      "is_active",
      "createdAt",
      "updatedAt",
    ],
    order: [["createdAt", "DESC"]],
  });

  res.status(200).json({
    success: true,
    data: admins,
  });
});

// cancel admin
exports.cancelAdmin = catchAsync(async (req, res, _next) => {
  const { id } = req.params;

  console.log("Cancel request for user:", id );

  const admin = await Admin.findByPk(id);
  if (!admin) {
    return res.status(404).json({ success: false, message: "Admin not found" });
  }

  admin.is_active = false;
  await admin.save();

  res.status(200).json({
    success: true,
    message: "User canceled successfully",
  });
});


