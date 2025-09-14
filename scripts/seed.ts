require('dotenv').config({ path: '.env.local' });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Tenant, Note, Invite } from '../models'; // Import Invite model
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yardstick';

async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Database connected.');

  console.log('Clearing existing data...');
  await Tenant.deleteMany({});
  await User.deleteMany({});
  await Note.deleteMany({});
  await Invite.deleteMany({}); // Clear invites
  console.log('Existing data cleared.');

  console.log('Seeding tenants...');
  const tenants = await Tenant.create([
    { name: 'Acme', slug: 'acme', plan: 'Free' },
    { name: 'Globex', slug: 'globex', plan: 'Pro' },
  ]);
  console.log('Tenants seeded.');

  const acmeTenant = tenants[0];
  const globexTenant = tenants[1];

  console.log('Seeding users...');
  const password = await bcrypt.hash('password', 10);

  // Direct user creation
  const adminAcme = await User.create({ email: 'admin@acme.test', role: 'Admin', tenant: acmeTenant._id, password });
  const userAcme = await User.create({ email: 'user@acme.test', role: 'Member', tenant: acmeTenant._id, password });
  const adminGlobex = await User.create({ email: 'admin@globex.test', role: 'Admin', tenant: globexTenant._id, password });
  const userGlobex = await User.create({ email: 'user@globex.test', role: 'Member', tenant: globexTenant._id, password });
  console.log('Direct users seeded.');

  // Create some pending invites
  console.log('Seeding invites...');
  const inviteTokenAcme = crypto.randomBytes(32).toString('hex');
  const inviteTokenGlobex = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await Invite.create({
    email: 'invited.member@acme.test',
    tenant: acmeTenant._id,
    token: inviteTokenAcme,
    expires,
    status: 'Pending',
    role: 'Member',
  });

  await Invite.create({
    email: 'invited.admin@globex.test',
    tenant: globexTenant._id,
    token: inviteTokenGlobex,
    expires,
    status: 'Pending',
    role: 'Admin',
  });
  console.log('Invites seeded.');
  console.log(`Acme Invite Link: http://localhost:3000/signup?inviteToken=${inviteTokenAcme}`);
  console.log(`Globex Invite Link: http://localhost:3000/signup?inviteToken=${inviteTokenGlobex}`);

  console.log('Seeding notes...');
  await Note.create([
    { title: 'Acme Note 1', content: 'This is the first note for Acme.', tenant: acmeTenant._id, author: adminAcme._id },
    { title: 'Acme Note 2', content: 'This is the second note for Acme.', tenant: acmeTenant._id, author: userAcme._id },
    { title: 'Acme Note 3', content: 'This is the third note for Acme.', tenant: acmeTenant._id, author: adminAcme._id },
    { title: 'Globex Note 1', content: 'This is the first note for Globex.', tenant: globexTenant._id, author: adminGlobex._id },
    { title: 'Globex Note 2', content: 'This is the second note for Globex.', tenant: globexTenant._id, author: userGlobex._id },
  ]);
  console.log('Notes seeded.');

  await mongoose.connection.close();
  console.log('Database connection closed.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});