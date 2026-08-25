const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/db');
const app = express();
const AppError = require('./utils/ErrorHandling/AppError');

app.use(morgan('dev'));

app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_DASHBOARD_URL], 
  credentials: true, 
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const athletesRouter = require('./routes/athletes');
const authRouter = require('./routes/auth');
const adminsRouter = require('./routes/admins');
const newsUpdateRouter = require('./routes/newsUpdateRoutes');
const eventRouter = require('./routes/eventRoutes');
const coachRouter = require('./routes/coachRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const fieldEventsRouter = require('./routes/fieldEventsRoutes');
const trackEventsRouter = require('./routes/trackEventsRoutes');
const heatRoutes = require('./routes/heatRoutes');

app.use("/api/v1/athletes", athletesRouter);
app.use('/api/v1/auth', authRouter);
app.use("/api/v1/admins", adminsRouter);
app.use("/api/v1/news-updates", newsUpdateRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/coaches", coachRouter);
app.use("/api/v1/gallery", galleryRoutes);
app.use("/api/v1/field-events", fieldEventsRouter);
app.use("/api/v1/track-events", trackEventsRouter);
app.use("/api/v1/heats", heatRoutes);


// Example route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Error Handling
app.use((req, _res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

// Global Error Handler
const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.httpStatus || 500;
  const status = err.statusCode || '500';
  res.status(statusCode).json({
    success: false,
    message: err.message,
    code: status,
  });
};

app.use(globalErrorHandler);

module.exports = app;
