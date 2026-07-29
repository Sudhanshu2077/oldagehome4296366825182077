process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.MONGODB_URI = 'mongodb://localhost:27017/old_age_home_test';
process.env.SESSION_SIGNING_KEY = 'a'.repeat(72);
process.env.CLIENT_ORIGIN = 'http://localhost:8081';
process.env.ENABLE_DEV_LOGIN = 'true';
