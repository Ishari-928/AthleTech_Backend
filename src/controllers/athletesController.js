const Athlete = require('../models/Athlete');
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { RecordNotFoundError, ValidationFailureError } = require("../utils/ErrorHandling/CustomErrors");
const { getNextBibNo } = require('../services/athleteService');
const { sendEmail } = require('../services/emailService');

exports.createAthlete = catchAsync(async (req, res, _next) => {

  let athletes = req.body.athletes || [req.body];
  const files = req.files || [];
  const year = new Date().getFullYear();

  if (typeof athletes === "string") {
    try {
      athletes = JSON.parse(athletes);
    } catch (err) {
      throw new ValidationFailureError("Invalid athletes JSON format");
    }
  }

  if (!Array.isArray(athletes)) {
    athletes = [athletes];
  }

  if (!files.length) {
    throw new ValidationFailureError("Payment slip image(s) required");
  }

  let nextBib = await getNextBibNo();

  for (let i = 0; i < athletes.length; i++) {
    const a = athletes[i];

    console.log("Processing athlete:", a);

    let selected_events = a.selected_events;
    if (typeof selected_events === "string") {
      try {
        selected_events = JSON.parse(selected_events);
      } catch {}
    }

    const paymentSlip = files[0]?.buffer;

    const required = [
      a.name,
      a.email,
      a.contact_no,
      a.gender,
      a.school,
      a.dob,
      a.age_group,
      a.registrationfee,
      a.total_registrationfee,
      paymentSlip,
    ];
    if (required.some((v) => v === undefined || v === null || v === "")) {
      throw new ValidationFailureError("All fields including image required");
    }

    await Athlete.create({
      bib_no: nextBib++,
      name: a.name,
      email: a.email,
      contact_no: a.contact_no,
      gender: a.gender,
      school: a.school,
      dob: a.dob,
      age_group: a.age_group,
      selected_events,
      registrationfee: a.registrationfee ?? null,
      total_registrationfee: a.total_registrationfee,
      paymentSlip,
      year,
      approved: false,
      deleted: false,
    });
  }

  res.status(201).json({ success: true, message: "Athlete(s) created successfully" });
});

exports.getAllAthletes = catchAsync(async (req, res, _next) => {

const { search, school, gender, age_group, event, status, year } = req.query;

let whereClause = { deleted: false };
  
  // Add search filter
  if (search && search.length >= 2) {
    if (search.length > 50) {
      throw new ValidationFailureError("Search term too long");
    }

     whereClause = {
      ...whereClause,
      [Op.or]: [
        { name: { [Op.like]: `%${search}%` } },
        { bib_no: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { contact_no: { [Op.like]: `%${search}%` } }
      ]
    };
  }

  if( year && year !== 'all') {
    whereClause.year = year;
  }
  
  if (school && school !== 'all') {
    whereClause.school = school;
  }
  
  if (gender && gender !== 'all') {
    whereClause.gender = gender;
  }
  
  if (age_group && age_group !== 'all') {
    whereClause.age_group = age_group;
  }
  
  if (status && status !== 'all') {
    whereClause.approved = status === 'approved';
  }

  const athletes = await Athlete.findAll({ where: whereClause });
  
  let filteredAthletes = athletes;
  if (event && event !== 'all') {
    filteredAthletes = athletes.filter(athlete => 
      Array.isArray(athlete.selected_events)
        ? athlete.selected_events.includes(event)
        : athlete.selected_events === event
    );
  }

  res.status(200).json({
    success: true,
    message: "All registered athletes",
    data: filteredAthletes,
  });
});

exports.getAthleteById = catchAsync(async (req, res, _next) => {
  const athlete = await Athlete.findByPk(req.params.id);

  if (!athlete) throw new RecordNotFoundError("Athlete not found");

  const data = athlete.toJSON();
  data.paymentSlip = data.paymentSlip?.toString("base64");

  res.status(200).json({ success: true, data });
});

exports.updateAthlete = catchAsync(async (req, res, _next) => {
  const id = req.params.id;
  const {
    name,
    email,
    contact_no,
    gender,
    school,
    dob,
    age_group,
    selected_events,
    registrationfee,
    total_registrationfee,
    approved,
  } = req.body;
  const paymentSlip = req.file?.buffer;

  const required = [
    name,
    email,
    contact_no,
    gender,
    school,
    dob,
    age_group,
    selected_events,
    total_registrationfee,
  ];

  if (required.some((v) => v === undefined || v === null || v === "")) {
    throw new ValidationFailureError("All fields required");
  }

  const athlete = await Athlete.findByPk(id);
  if (!athlete) throw new RecordNotFoundError("Athlete not found");

  await athlete.update({
    name,
    email,
    contact_no,
    gender,
    school,
    dob,
    age_group,
    selected_events,
    registrationfee: registrationfee ?? null,
    total_registrationfee,
    approved,
    ...(paymentSlip && { paymentSlip }),
  });

  res.status(200).json({ success: true, message: "Updated successfully" });
});

exports.deleteAthlete = catchAsync(async (req, res) => {
  const id = req.params.id;

  const athlete = await Athlete.findByPk(id);
  if (!athlete) throw new RecordNotFoundError("Athlete not found");

  await athlete.update({ deleted: true });

  res.status(200).json({ success: true, message: "Athlete deleted successfully" });
});

exports.approveAthlete = catchAsync(async (req, res) => {
  const athlete = await Athlete.findByPk(req.params.id);
  if (!athlete) throw new RecordNotFoundError("Athlete not found");

  await athlete.update({ approved: true });

  try {
    const emailContent = `
      Dear ${athlete.name},

      Your registration for the athletics competition has been approved!

      Registration Details:
      - BIB Number: ${athlete.bib_no}
      - Name: ${athlete.name}
      - Events: ${Array.isArray(athlete.selected_events) ? athlete.selected_events.join(", ") : athlete.selected_events}
      - Age Category: ${athlete.age_group}
      - School: ${athlete.school}

      If you have any questions or concerns, please contact us at:
      Email: athletech.test@gmail.com
      Phone: 0701234567

      Best regards,
      Athletech Team
    `;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff5722;">Athlete Registration Approved</h2>
        <p>Dear ${athlete.name},</p>
        <p>Your registration for the athletics competition has been approved!</p>
        
        <h3 style="color: #05041D;">Registration Details:</h3>
        <ul>
          <li><strong>BIB Number:</strong> ${athlete.bib_no}</li>
          <li><strong>Name:</strong> ${athlete.name}</li>
          <li><strong>Events:</strong> ${Array.isArray(athlete.selected_events) ? athlete.selected_events.join(", ") : athlete.selected_events}</li>
          <li><strong>Age Category:</strong> ${athlete.age_group}</li>
          <li><strong>School:</strong> ${athlete.school}</li>
        </ul>
        
        <p>If you have any questions or concerns, please contact us at:</p>
        <p>
          <strong>Email:</strong> athletech.test@gmail.com<br>
          <strong>Phone:</strong> 0701234567
        </p>
        
        <p>Best regards,<br>Athletech Team</p>
      </div>
    `;

    await sendEmail({
      to: athlete.email,
      subject: 'Athlete Registration Approved',
      html: emailHtml,
      text: emailContent 
    });
    
    console.log("Approval email sent to:", athlete.email);
  } catch (emailError) {
    console.error("Failed to send approval email:", emailError);
  }

  res.status(200).json({ 
    success: true, 
    message: "Athlete approved and notification sent", 
    data: athlete 
  });
});

// Soft Delete Athlete
exports.softDeleteAthlete = catchAsync(async (req, res) => {
  const athlete = await Athlete.findByPk(req.params.id);
  if (!athlete) throw new RecordNotFoundError("Athlete not found");

  await athlete.update({ deleted: true });

  res.status(200).json({ success: true, message: "Athlete deleted (soft)" });
});


