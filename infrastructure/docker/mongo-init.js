// Runs once on first start. Creates a least-privilege user for the application.
const appDbName = process.env.MONGO_APP_DB;
const appDb = db.getSiblingDB(appDbName);
appDb.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: appDbName }],
});
