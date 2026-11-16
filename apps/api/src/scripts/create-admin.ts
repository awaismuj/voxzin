/* Creates (or promotes) the first super admin.  ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm create-admin */
import * as argon2 from 'argon2';
import mongoose from 'mongoose';
import { ROLES, slugify } from '@voxzin/shared';
import { env } from '../config/env';
import { AuthorSchema, UserSchema } from '../schemas';

async function main() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name = 'Administrator' } = process.env;
  const requestedRole = process.env.ADMIN_ROLE?.trim().toLowerCase().replace(/\s+/g, '_') || 'super_admin';
  const role = ROLES.find((candidate) => candidate === requestedRole);
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 characters).');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  if (!role) throw new Error(`ADMIN_ROLE must be one of: ${ROLES.join(', ')}.`);
  await mongoose.connect(env.MONGODB_URI);
  const User = mongoose.model('User', UserSchema);
  const Author = mongoose.model('Author', AuthorSchema);
  const author = await Author.findOneAndUpdate(
    { slug: slugify(name) },
    { $setOnInsert: { name, slug: slugify(name), designation: 'Editor' } },
    { upsert: true, new: true },
  );
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { name, role, passwordHash, isActive: true, authorId: author._id } },
    { upsert: true },
  );
  console.log(`${role.replace('_', ' ')} ready: ${email.toLowerCase()}. You will be asked to set up MFA at first login.`);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
