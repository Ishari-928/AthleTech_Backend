const express = require('express');
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/images', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      folder: 'AthleTechImages', 
      resource_type: 'image',
      max_results: 100,
     
    });

    if (!result.resources || result.resources.length === 0) {
      return res.status(404).json({ error: 'No images found in the specified folder' });
    }
    
    const images = result.resources.map(image => ({
      public_id: image.public_id,
      url: image.secure_url,
      width: image.width,
      height: image.height,
      format: image.format
    }));
    
    console.log(images.length + ' images found');

    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

module.exports = router;