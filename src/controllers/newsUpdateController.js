// controllers/newsUpdateController.js
const NewsUpdate = require("../models/NewsUpdate");
const cloudinary = require("../config/cloudinary");
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { ValidationFailureError } = require("../utils/ErrorHandling/CustomErrors");

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' 
        // folder: folder
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    // Convert buffer to stream
    const { Readable } = require('stream');
    const stream = Readable.from(fileBuffer);
    stream.pipe(uploadStream);
  });
};

// GET all news updates
exports.getNewsUpdates = catchAsync(async (req, res) => {
  const data = await NewsUpdate.findAll({
    order: [['createdAt', 'DESC']]
  });

  if (!data || data.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No news updates found",
    });
  }

  res.status(200).json({
    success: true,
    message: "All news updates retrieved",
    data,
  });
});

// GET only active news updates
exports.getActiveNewsUpdates = catchAsync(async (req, res) => {
  const data = await NewsUpdate.findAll({ 
    where: { status: "active" },
    order: [['createdAt', 'DESC']]
  });

  if (!data || data.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No active news updates found",
    });
  }

  res.status(200).json({
    success: true,
    message: "All active news updates retrieved",
    data,
  });
});

// GET single news update by ID
exports.getNewsUpdateByID = catchAsync(async (req, res) => {
  const { id } = req.params;
  const data = await NewsUpdate.findByPk(id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "News update not found",
    });
  }

  res.status(200).json({
    success: true,
    newsUpdateDetails: data,
  });
});

// CREATE news update
exports.createNewsUpdate = catchAsync(async (req, res) => {
  const { news_topic, news_description } = req.body;
  
  // Auto-generate date as current date
  const date = new Date().toISOString().split('T')[0];
  
  if (!news_topic || !news_description) {
    throw new ValidationFailureError("Please provide all required fields (topic, description)");
  }

  let imageUrl = null;
  
  // Upload image to Cloudinary if provided
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer); //(req.file.buffer, 'news');
      imageUrl = result.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new ValidationFailureError("Failed to upload image");
    }
  }

  const newsUpdate = await NewsUpdate.create({
    date,
    news_topic,
    news_description,
    image: imageUrl,
    status: "active",
  });

  res.status(201).json({
    success: true,
    message: "New news update created",
    data: newsUpdate,
  });
});

// UPDATE news update
exports.updateNewsUpdate = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { date, news_topic, news_description, status } = req.body;

  const newsUpdate = await NewsUpdate.findByPk(id);
  if (!newsUpdate) {
    return res.status(404).json({
      success: false,
      message: "News update not found",
    });
  }

  let imageUrl = newsUpdate.image;
  
  // Upload new image to Cloudinary if provided
  if (req.file) {
    try {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new ValidationFailureError("Failed to upload image");
    }
  }

  await newsUpdate.update({
    date: date || newsUpdate.date,
    news_topic: news_topic || newsUpdate.news_topic,
    news_description: news_description || newsUpdate.news_description,
    image: imageUrl,
    status: status || newsUpdate.status,
  });

  res.status(200).json({
    success: true,
    message: "News update updated successfully",
    data: newsUpdate,
  });
});

// Soft delete (mark inactive) - Super Admin only
exports.deleteNewsUpdate = catchAsync(async (req, res) => {
  const { id } = req.params;
  const newsUpdate = await NewsUpdate.findByPk(id);

  if (!newsUpdate) {
    return res.status(404).json({
      success: false,
      message: "News update not found",
    });
  }

  await newsUpdate.update({ status: "inactive" });

  res.status(200).json({
    success: true,
    message: "News update marked as inactive",
  });
});

// Hard delete (permanent remove)
exports.hardDeleteNewsUpdate = catchAsync(async (req, res) => {
  const { id } = req.params;
  const newsUpdate = await NewsUpdate.findByPk(id);

  if (!newsUpdate) {
    return res.status(404).json({
      success: false,
      message: "News update not found",
    });
  }

  await newsUpdate.destroy();

  res.status(200).json({
    success: true,
    message: "News update permanently deleted",
  });
});