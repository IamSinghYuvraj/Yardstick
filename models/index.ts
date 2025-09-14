
import mongoose, { Schema, models } from 'mongoose';
import { ITenant, IUser, INote } from '../types';

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  plan: { type: String, enum: ['Free', 'Pro'], default: 'Free' },
  maxNotes: { type: Number, default: 3 },
});

export const Tenant = models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Member'], required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
});

export const User = models.User || mongoose.model<IUser>('User', UserSchema);

const NoteSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const Note = models.Note || mongoose.model<INote>('Note', NoteSchema);
