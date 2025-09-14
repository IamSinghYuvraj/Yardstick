
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Tenant } from '../lib/models';

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
    { name: 'Acme Corp', slug: 'acme', color: '#3B82F6', plan: 'Free', maxNotes: 3 },
    { name: 'Globex Corporation', slug: 'globex', color: '#10B981', plan: 'Pro', maxNotes: -1 },
  ]);
  console.log('Tenants seeded.');

  const acmeTenant = tenants[0];
  const globexTenant = tenants[1];

  console.log('Seeding users...');
  const password = await bcrypt.hash('password123', 10);

  await User.create([
    { email: 'admin@acme.com', name: 'John Admin', role: 'Admin', tenant: acmeTenant._id, password },
    { email: 'member@acme.com', name: 'Jane Member', role: 'Member', tenant: acmeTenant._id, password },
    { email: 'admin@globex.com', name: 'Bob Admin', role: 'Admin', tenant: globexTenant._id, password },
    { email: 'member@globex.com', name: 'Alice Member', role: 'Member', tenant: globexTenant._id, password },
  ]);
  console.log('Users seeded.');

  await mongoose.connection.close();
  console.log('Database connection closed.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
