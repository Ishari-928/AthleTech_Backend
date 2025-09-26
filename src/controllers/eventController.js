const Event = require("../models/Event");
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");

exports.requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.user_role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super admin privileges required.",
    });
  }
  next();
};

exports.getAllActiveEvents = catchAsync(async (req, res) => {
  const events = await Event.findAll({ 
    where: { status: "active" },
    order: [['createdAt', 'DESC']]
  });

  if (!events || events.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No active events found",
    });
  }

  res.status(200).json({
    success: true,
    data: events,
  });
});

exports.getAllEvents = catchAsync(async (req, res) => {
  const events = await Event.findAll({
    order: [['createdAt', 'DESC']]
  });

  if (!events || events.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No events found",
    });
  }

  res.status(200).json({
    success: true,
    data: events,
  });
});

exports.getEventById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findByPk(id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  res.status(200).json({
    success: true,
    data: event,
  });
});

exports.createEvent = catchAsync(async (req, res) => {
  console.log('=== BACKEND: Create event called ===');
  console.log('Request body:', req.body);
  console.log('Request user:', req.user);
  
  try {
    const { event_name } = req.body;

    if (!event_name || event_name.trim() === '') {
      console.log('Event name validation failed');
      return res.status(400).json({
        success: false,
        message: "Event name is required",
      });
    }

    const existingEvent = await Event.findOne({ 
      where: { event_name: event_name.trim() } 
    });

    if (existingEvent) {
      console.log('Duplicate event found:', existingEvent);
      return res.status(409).json({
        success: false,
        message: "Event with this name already exists",
      });
    }

    console.log('Creating new event...');
    const newEvent = await Event.create({
      event_name: event_name.trim(),
      status: "active",
    });

    console.log('Event created successfully:', newEvent);
    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: newEvent
    });
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

exports.toggleEventStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findByPk(id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  const newStatus = event.status === "active" ? "inactive" : "active";
  await event.update({ status: newStatus });

  res.status(200).json({
    success: true,
    message: `Event status updated to ${newStatus}`,
    data: event
  });
});

exports.updateEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { event_name } = req.body;
  const event = await Event.findByPk(id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (!event_name || event_name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: "Event name is required",
    });
  }

  const existingEvent = await Event.findOne({ 
    where: { 
      event_name: event_name.trim(),
      event_id: { [Op.ne]: id } 
    } 
  });

  if (existingEvent) {
    return res.status(409).json({
      success: false,
      message: "Another event with this name already exists",
    });
  }

  await event.update({ event_name: event_name.trim() });

  res.status(200).json({
    success: true,
    message: "Event updated successfully",
    data: event
  });
});

exports.deleteEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findByPk(id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  await event.update({ status: "inactive" });

  res.status(200).json({
    success: true,
    message: "Event marked as inactive",
  });
});

exports.hardDeleteEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const event = await Event.findByPk(id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  await event.destroy();

  res.status(200).json({
    success: true,
    message: "Event permanently deleted",
  });
});