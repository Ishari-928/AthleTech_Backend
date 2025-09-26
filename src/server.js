const dotenv =  require('dotenv')
dotenv.config();

const app = require('./app');
const sequelize = require('./config/db');

// db schemas
const Athlete = require('./models/Athlete');
const Admin = require('./models/Admin');
const NewsUpdate = require('./models/NewsUpdate');
const Event = require('./models/Event');
const Coach = require('./models/Coach');
const FieldEvents = require('./models/FieldEvents');
const TrackEventHeat = require('./models/TrackEventHeat');
const HeatAssignment = require('./models/HeatAssignment');

// New model imports
const TrackHeatAssignment = require('./models/TrackHeatAssignment');
const TrackEventHeatResult = require('./models/TrackEventHeatResult');
const TrackEventSemifinalResult = require('./models/TrackEventSemifinalResult');
const TrackEventFinalResult = require('./models/TrackEventFinalResult');
const { setupAssociations } = require('./models/associations');
setupAssociations();

const { hashPassword } = require('./utils/password');

const PORT = process.env.PORT || 5000;

const ensureRootAdmin = async () => {
  if (!process.env.SEED_SUPER_ADMIN_EMAIL || !process.env.SEED_SUPER_ADMIN_PASSWORD) return;

  const existing = await Admin.findOne({ where: { email: process.env.SEED_SUPER_ADMIN_EMAIL } });
  if (existing) return;

  const password = await hashPassword(process.env.SEED_SUPER_ADMIN_PASSWORD);
  await Admin.create({
    name: process.env.SEED_SUPER_ADMIN_NAME || 'Root',
    email: process.env.SEED_SUPER_ADMIN_EMAIL,
    contact_no: process.env.SEED_SUPER_ADMIN_CONTACT || null,
    role: 'superadmin',
    password,
    must_change_password: true, // will force change on first login
    is_active: true,
  });

  console.log('Seeded super admin:', process.env.SEED_SUPER_ADMIN_EMAIL);
};

// Test DB connection and sync models
sequelize.authenticate()
  .then(() => {
    console.log("Database connected successfully!");
    return sequelize.sync({ alter: true });
  })
  .then( async () => {
    console.log("All models were synchronized successfully!");
    await ensureRootAdmin();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Database connection failed:", err.message);
  });
