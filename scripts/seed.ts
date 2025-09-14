
require('dotenv').config({ path: '.env.local' });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Tenant } from '../models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yardstick';

async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Database connected.');

  console.log('Clearing existing data...');
  await Tenant.deleteMany({});
  await User.deleteMany({});
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

  await User.create([
    { email: 'admin@acme.test', name: 'Acme Admin', role: 'Admin', tenant: acmeTenant._id, password },
    { email: 'user@acme.test', name: 'Acme User', role: 'Member', tenant: acmeTenant._id, password },
    { email: 'admin@globex.test', name: 'Globex Admin', role: 'Admin', tenant: globexTenant._id, password },
    { email: 'user@globex.test', name: 'Globex User', role: 'Member', tenant: globexTenant._id, password },
  ]);
  console.log('Users seeded.');

  await mongoose.connection.close();
  console.log('Database connection closed.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
