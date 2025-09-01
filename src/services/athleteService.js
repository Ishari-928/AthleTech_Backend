const sequelize = require('../config/db');

const getNextBibNo = async () => {
  try {
    const [rows] = await sequelize.query(
      "SELECT MAX(CAST(bib_no AS UNSIGNED)) AS maxBib FROM register_athletes"
    );
    return rows[0].maxBib ? parseInt(rows[0].maxBib) + 1 : 100;
  } catch (error) {
    console.error('Error getting next bib number:', error);
    return 100;
  }
};

module.exports = { getNextBibNo };