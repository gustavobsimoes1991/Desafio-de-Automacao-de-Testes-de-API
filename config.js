require('dotenv').config();
module.exports = {
  baseURL: process.env.API_BASE_URL || 'https://serverest.dev',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  requestTimeout: 30000
};
