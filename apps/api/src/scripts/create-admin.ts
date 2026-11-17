/* Creates (or updates) the admin account.  ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm create-admin
 * The API also does this on every start when ADMIN_EMAIL and ADMIN_PASSWORD are in the env file. */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { ensureAdmin } from '../auth/admin-bootstrap';
import { AuthorSchema, SessionSchema, UserSchema } from '../schemas';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const result = await ensureAdmin(
    {
      users: mongoose.model('User', UserSchema) as never,
      authors: mongoose.model('Author', AuthorSchema) as never,
      sessions: mongoose.model('Session', SessionSchema) as never,
    },
    { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME, role: env.ADMIN_ROLE },
  );
  await mongoose.disconnect();
  if (result.status === 'skipped') throw new Error(result.reason);
  console.log(`${result.role.replace('_', ' ')} ${result.status}: ${result.email}. MFA setup is asked at first login if not done yet.`);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
