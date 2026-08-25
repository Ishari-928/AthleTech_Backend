const Coach = require("../models/Coach");
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const cloudinary = require("../config/cloudinary");
const { ValidationFailureError } = require("../utils/ErrorHandling/CustomErrors");

exports.getCoaches = catchAsync(async (req, res) => {
  const data = await Coach.findAll();
  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, message: "No coaches found" });
  }
  res.status(200).json({ success: true, message: "All coaches retrieved", data });
});

exports.getActiveCoaches = catchAsync(async (req, res) => {
  const data = await Coach.findAll({ where: { status: "active" } });
  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, message: "No active coaches found" });
  }
  res.status(200).json({ success: true, message: "Active coaches retrieved", data });
});

exports.getCoachByID = catchAsync(async (req, res) => {
  const { id } = req.params;
  const data = await Coach.findByPk(id);
  if (!data) {
    return res.status(404).json({ success: false, message: "Coach not found" });
  }
  res.status(200).json({ success: true, coach: data });
});

exports.createCoach = catchAsync(async (req, res) => {
  const { name, contact_no, whatsapp, facebook, description } = req.body;
  
  if (!name || !contact_no || !description) {
    throw new ValidationFailureError("Please provide all required fields");
  }

  let profileImageUrl = null;
  
  if (req.file) {
    try {
      const base64Image = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;
      
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'coaches',
        resource_type: 'image',
        timeout: 30000 
      });
      
      profileImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new ValidationFailureError('Image upload failed: ' + error.message);
    }
  }

  const social_media = {};
  if (facebook) social_media.facebook = facebook;
  if (whatsapp) social_media.whatsapp = whatsapp;

  const newCoach = await Coach.create({
    name,
    contact_no,
    whatsapp,
    social_media,
    description,
    profile_image_url: profileImageUrl,
    status: "active",
  });

  res.status(201).json({ 
    success: true, 
    message: "Coach created successfully",
    data: newCoach 
  });
});

exports.updateCoach = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, contact_no, whatsapp, facebook, description, status } = req.body;

  const coach = await Coach.findByPk(id);
  if (!coach) {
    return res.status(404).json({ success: false, message: "Coach not found" });
  }

  let profileImageUrl = coach.profile_image_url;
  
  if (req.file) {
    try {
      if (coach.profile_image_url) {
        try {
          const publicId = coach.profile_image_url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`coaches/${publicId}`);
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }
      
      const base64Image = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;
      
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'coaches',
        resource_type: 'image',
        timeout: 30000
      });
      
      profileImageUrl = uploadResult.secure_url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new ValidationFailureError('Failed to upload image: ' + error.message);
    }
  }

  const social_media = { ...coach.social_media };
  if (facebook !== undefined) social_media.facebook = facebook;
  if (whatsapp !== undefined) social_media.whatsapp = whatsapp;

  await coach.update({
    name: name || coach.name,
    contact_no: contact_no || coach.contact_no,
    whatsapp: whatsapp || coach.whatsapp,
    social_media,
    description: description || coach.description,
    profile_image_url: profileImageUrl,
    status: status || coach.status,
  });

  res.status(200).json({ success: true, message: "Coach updated successfully" });
});

exports.deleteCoach = catchAsync(async (req, res) => {
  const { id } = req.params;
  const coach = await Coach.findByPk(id);
  if (!coach) {
    return res.status(404).json({ success: false, message: "Coach not found" });
  }
  
  if (coach.profile_image_url) {
    try {
      const publicId = coach.profile_image_url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`coaches/${publicId}`);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }
  }
  
  await coach.destroy();
  
  res.status(200).json({ 
    success: true, 
    message: "Coach deleted successfully",
    deletedCoachId: id 
  });
});

exports.hardDeleteCoach = catchAsync(async (req, res) => {
  const { id } = req.params;
  const coach = await Coach.findByPk(id);
  if (!coach) {
    return res.status(404).json({ success: false, message: "Coach not found" });
  }
  
  if (coach.profile_image_url) {
    try {
      const publicId = coach.profile_image_url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`coaches/${publicId}`);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }
  }
  
  await coach.destroy();
  res.status(200).json({ success: true, message: "Coach permanently deleted" });
});