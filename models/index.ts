// models/index.ts
import mongoose, { Schema, models } from 'mongoose';
import { ITenant, IUser, INote, IInvite, IUpgradeRequest } from '../types/index';

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
}, { timestamps: true });

export const Tenant = models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Member'], required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  plan: { type: String, enum: ['Free', 'Pro'], default: 'Free' },
}, { timestamps: true });

export const User = models.User || mongoose.model<IUser>('User', UserSchema);

const NoteSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const Note = models.Note || mongoose.model<INote>('Note', NoteSchema);

const InviteSchema: Schema = new Schema({
  email: { type: String, required: true, lowercase: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  token: { type: String, required: true, unique: true },
  expires: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Expired'], default: 'Pending' },
}, { timestamps: true });

// Create compound index to ensure unique pending invites per email/tenant
InviteSchema.index({ email: 1, tenant: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'Pending' } 
});

export const Invite = models.Invite || mongoose.model<IInvite>('Invite', InviteSchema);

