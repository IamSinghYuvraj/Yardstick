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
  const password = await bcrypt.hash('password123', 12);

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

  const mikeGlobex = await User.create({ 
    email: 'user@globex.test', 
    role: 'Member', 
    tenant: globexTenant._id, 
    password 
  });

  console.log('✅ Users created.');
  console.log(`   • Admin for Acme: ${adminAcme.email}`);
  console.log(`   • Users under Acme admin: ${userAcme.email}, ${johnAcme.email}, ${sarahAcme.email}`);
  console.log(`   • Admin for Globex: ${adminGlobex.email}`);
  console.log(`   • Users under Globex admin: ${mikeGlobex.email}`);

  console.log('📝 Creating sample notes...');
  await Note.create([
    // Notes created by Acme members (not admin, since admins can't create notes)
    { 
      title: 'Welcome to Acme Corporation', 
      content: 'This is our first note in the new system. Welcome aboard!', 
      tenant: acmeTenant._id, 
      author: userAcme._id 
    },
    { 
      title: 'Project Planning Notes', 
      content: 'Key points for the upcoming project:\n1. Define requirements\n2. Set timeline\n3. Assign team members', 
      tenant: acmeTenant._id, 
      author: johnAcme._id 
    },
    { 
      title: 'Meeting Minutes - Q1 Review', 
      content: 'Quarterly review meeting notes:\n- Revenue exceeded targets\n- Team performance excellent\n- Next quarter objectives set', 
      tenant: acmeTenant._id, 
      author: sarahAcme._id 
    },
    
    // Globex notes (created by member, not admin)
    { 
      title: 'Globex Strategic Vision 2024', 
      content: 'Our strategic vision for 2024 includes expanding into new markets and developing innovative solutions.', 
      tenant: globexTenant._id, 
      author: mikeGlobex._id 
    },
    { 
      title: 'Technical Architecture Notes', 
      content: 'System architecture considerations:\n- Microservices approach\n- Cloud-native deployment\n- Scalability requirements', 
      tenant: globexTenant._id, 
      author: mikeGlobex._id 
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
  console.log('   Acme Corporation (Free Plan):');
  console.log('   • admin@acme.test / password123 (Admin - manages users, cannot create notes)');
  console.log('   • user@acme.test / password123 (Member - can create notes)');
  console.log('   • john@acme.test / password123 (Member - can create notes)');
  console.log('   • sarah@acme.test / password123 (Member - can create notes)');
  
  console.log('\n   Globex Industries (Pro Plan):');
  console.log('   • admin@globex.test / password123 (Admin - manages users, cannot create notes)');
  console.log('   • user@globex.test / password123 (Member - can create notes)');
  
  console.log('\n🔗 Invitation Links:');
  invitations.forEach((invite, index) => {
    const orgName = index === 0 ? 'Acme' : 'Globex';
    console.log(`   ${orgName}: http://localhost:3000/signup?inviteToken=${invite.token}`);
  });
  
  console.log('\n✨ Ready to test!');
  console.log('1. Login as admin@acme.test to manage users and generate invites');
  console.log('2. Login as user@acme.test to create and manage notes');

  await mongoose.connection.close();
  console.log('✅ Database connection closed.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});