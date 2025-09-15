// scripts/seed.ts
require('dotenv').config({ path: '.env.local' });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Tenant, Note, Invite } from '../models';
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
    Invite.deleteMany({})
  ]);
  console.log('✅ Existing data cleared.');

  console.log('🏢 Creating tenants...');
  const tenants = await Tenant.create([
    { 
      name: 'Acme Corporation', 
      slug: 'acme', 
      plan: 'Free',
      maxNotes: 3
    },
    { 
      name: 'Globex Industries', 
      slug: 'globex', 
      plan: 'Pro',
      maxNotes: 1000000
    },
  ]);
  
  const [acmeTenant, globexTenant] = tenants;
  console.log('✅ Tenants created.');

  console.log('👥 Creating users...');
  const password = await bcrypt.hash('password', 12); // Changed to 'password' as per requirements

  // Create admin@acme.test as the main admin
  const adminAcme = await User.create({ 
    email: 'admin@acme.test', 
    role: 'Admin', 
    tenant: acmeTenant._id, 
    password 
  });

  // Create user@acme.test as a regular member under admin@acme.test's tenant
  const userAcme = await User.create({ 
    email: 'user@acme.test', 
    role: 'Member', 
    tenant: acmeTenant._id, 
    password 
  });

  // Additional members for Acme
  const johnAcme = await User.create({ 
    email: 'john@acme.test', 
    role: 'Member', 
    tenant: acmeTenant._id, 
    password 
  });

  const sarahAcme = await User.create({ 
    email: 'sarah@acme.test', 
    role: 'Member', 
    tenant: acmeTenant._id, 
    password 
  });
  
  // Globex users  
  const adminGlobex = await User.create({ 
    email: 'admin@globex.test', 
    role: 'Admin', 
    tenant: globexTenant._id, 
    password 
  });

  const userGlobex = await User.create({ 
    email: 'user@globex.test', 
    role: 'Member', 
    tenant: globexTenant._id, 
    password 
  });

  console.log('✅ Users created.');
  console.log(`   • Admin for Acme: ${adminAcme.email}`);
  console.log(`   • Users under Acme admin: ${userAcme.email}, ${johnAcme.email}, ${sarahAcme.email}`);
  console.log(`   • Admin for Globex: ${adminGlobex.email}`);
  console.log(`   • Users under Globex admin: ${userGlobex.email}`);

  console.log('📝 Creating sample notes...');
  await Note.create([
    // Notes created by Acme members (not admin, since admins can't create notes)
    
    // Globex notes (created by member, not admin)
    { 
      title: 'Globex Strategic Vision 2024', 
      content: 'Our strategic vision for 2024 includes expanding into new markets and developing innovative solutions.', 
      tenant: globexTenant._id, 
      author: userGlobex._id 
    },
    { 
      title: 'Technical Architecture Notes', 
      content: 'System architecture considerations:\n- Microservices approach\n- Cloud-native deployment\n- Scalability requirements', 
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
  console.log('   Acme Corporation (Free Plan - 3 note limit):');
  console.log('   • admin@acme.test / password (Admin - manages users, cannot create notes)');
  console.log('   • user@acme.test / password (Member - can create notes)');
  console.log('   • john@acme.test / password (Member - can create notes)');
  console.log('   • sarah@acme.test / password (Member - can create notes)');
  
  console.log('\n   Globex Industries (Pro Plan - unlimited notes):');
  console.log('   • admin@globex.test / password (Admin - manages users, cannot create notes)');
  console.log('   • user@globex.test / password (Member - can create notes)');
  
  console.log('\n🔗 Test Invitation Links:');
  invitations.forEach((invite, index) => {
    const orgName = index === 0 ? 'Acme' : 'Globex';
    console.log(`   ${orgName}: http://localhost:3000/signup?inviteToken=${invite.token}`);
  });
  
  console.log('\n✨ Ready to test!');
  console.log('📋 Testing Workflow:');
  console.log('1. Login as admin@acme.test to manage users and tenant plan');
  console.log('2. Admin can downgrade to Free plan to test note limits');
  console.log('3. Create an invite for a new user (e.g., test@example.com)');
  console.log('4. Use the generated invite link to sign up the new user');
  console.log('5. Login as user@acme.test to create and manage notes');
  console.log('6. If on Free plan, try creating more than 3 notes to test limits');
  console.log('7. Admin can upgrade back to Pro plan for unlimited notes');

  await mongoose.connection.close();
  console.log('✅ Database connection closed.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});