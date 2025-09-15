// scripts/seed.ts
require('dotenv').config({ path: '.env.local' });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Tenant, Note, Invite, UpgradeRequest } from '../models';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notesflow';

async function seed() {
  console.log('🌱 Starting database seed...');
  console.log('Connecting to database...');
  
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Database connected.');

  console.log('🧹 Clearing existing data...');
  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Note.deleteMany({}),
    Invite.deleteMany({}),
    UpgradeRequest.deleteMany({}),
  ]);
  console.log('✅ Existing data cleared.');

  console.log('🏢 Creating tenants...');
  const tenants = await Tenant.create([
    { name: 'Acme Corporation', slug: 'acme' },
    { name: 'Globex Industries', slug: 'globex' },
  ]);
  
  const [acmeTenant, globexTenant] = tenants;
  console.log('✅ Tenants created.');

  console.log('👥 Creating users...');
  const password = await bcrypt.hash('password', 12);

  // Acme Users
  const adminAcme = await User.create({
    email: 'admin@acme.test',
    role: 'Admin',
    tenant: acmeTenant._id,
    password,
    plan: 'Pro',
  });

  const userAcme = await User.create({
    email: 'user@acme.test',
    role: 'Member',
    tenant: acmeTenant._id,
    password,
    plan: 'Free',
  });

  const johnAcme = await User.create({
    email: 'john@acme.test',
    role: 'Member',
    tenant: acmeTenant._id,
    password,
    plan: 'Free',
  });

  const sarahAcme = await User.create({
    email: 'sarah@acme.test',
    role: 'Member',
    tenant: acmeTenant._id,
    password,
    plan: 'Pro',
  });
  
  // Globex Users
  const adminGlobex = await User.create({
    email: 'admin@globex.test',
    role: 'Admin',
    tenant: globexTenant._id,
    password,
    plan: 'Pro',
  });

  const userGlobex = await User.create({
    email: 'user@globex.test',
    role: 'Member',
    tenant: globexTenant._id,
    password,
    plan: 'Free',
  });

  console.log('✅ Users created.');
  console.log(`   • Admin for Acme: ${adminAcme.email} (Pro)`);
  console.log(`   • Users under Acme admin: ${userAcme.email} (Free), ${johnAcme.email} (Free), ${sarahAcme.email} (Pro)`);
  console.log(`   • Admin for Globex: ${adminGlobex.email} (Pro)`);
  console.log(`   • Users under Globex admin: ${userGlobex.email} (Free)`);

  console.log('📝 Creating sample notes...');
  await Note.create([
    {
      title: 'Acme Note 1 by user@acme.test',
      content: 'This is a note for Acme.',
      tenant: acmeTenant._id,
      author: userAcme._id
    },
    {
      title: 'Acme Note 2 by user@acme.test',
      content: 'This is another note for Acme.',
      tenant: acmeTenant._id,
      author: userAcme._id
    },
    {
      title: 'Acme Note 3 by user@acme.test',
      content: 'This is a third note for Acme.',
      tenant: acmeTenant._id,
      author: userAcme._id
    },
    {
      title: 'Globex Strategic Vision 2024',
      content: 'Our strategic vision for 2024 includes expanding into new markets and developing innovative solutions.',
      tenant: globexTenant._id,
      author: userGlobex._id
    },
  ]);
  console.log('✅ Sample notes created.');

  console.log('📧 Creating sample invitations...');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  
  const invitations = [
    {
      email: 'newuser@acme.test',
      tenant: acmeTenant._id,
      token: crypto.randomBytes(32).toString('hex'),
      expires,
      status: 'Pending'
    },
    {
      email: 'developer@globex.test',
      tenant: globexTenant._id,
      token: crypto.randomBytes(32).toString('hex'),
      expires,
      status: 'Pending'
    }
  ];
  
  await Invite.create(invitations);
  console.log('✅ Sample invitations created.');

  console.log('\n🎉 Database seeded successfully!\n');
  
  console.log('📊 Summary:');
  console.log(`   • ${tenants.length} tenants created`);
  console.log(`   • ${await User.countDocuments()} users created`);
  console.log(`   • ${await Note.countDocuments()} notes created`);
  console.log(`   • ${invitations.length} pending invitations created`);
  
  console.log('\n🔐 Test Accounts:');
  console.log('   Acme Corporation:');
  console.log('   • admin@acme.test / password (Admin, Pro)');
  console.log('   • user@acme.test / password (Member, Free, 3 note limit)');
  console.log('   • john@acme.test / password (Member, Free, 3 note limit)');
  console.log('   • sarah@acme.test / password (Member, Pro)');
  
  console.log('\n   Globex Industries:');
  console.log('   • admin@globex.test / password (Admin, Pro)');
  console.log('   • user@globex.test / password (Member, Free, 3 note limit)');
  
  console.log('\n🔗 Test Invitation Links:');
  invitations.forEach((invite, index) => {
    const orgName = index === 0 ? 'Acme' : 'Globex';
    console.log(`   ${orgName}: http://localhost:3000/signup?inviteToken=${invite.token}`);
  });
  
  console.log('\n✨ Ready to test!');
  console.log('📋 Testing Workflow:');
  console.log('1. Login as admin@acme.test to manage users.');
  console.log('2. Change plans for users in the Team Members section.');
  console.log('3. Login as a Free user (e.g., user@acme.test).');
  console.log('4. Try to create more than 3 notes to test the limit.');
  console.log('5. See the "Upgrade to Pro" message and request an upgrade.');
  console.log('6. Login as admin@acme.test to see the upgrade request and approve it.');

  await mongoose.connection.close();
  console.log('✅ Database connection closed.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
