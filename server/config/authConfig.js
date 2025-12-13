module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'my_jwt_secret_key_default',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'my_jwt_refresh_secret_key_default',
  accessTokenExpiry: '15m', // 15 minutes
  refreshTokenExpiry: '30d' // 30 days
};