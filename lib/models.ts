
import mongoose, { Document, Model, models, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  role: 'Admin' | 'Member';
  tenant: mongoose.Schema.Types.ObjectId;
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  color: string;
  plan: 'Free' | 'Pro';
  maxNotes: number;
}

export interface INote extends Document {
  title: string;
  content: string;
  user: mongoose.Schema.Types.ObjectId;
  tenant: mongoose.Schema.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Member'], required: true },
  tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
}, { timestamps: true });

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  color: { type: String, required: true },
  plan: { type: String, enum: ['Free', 'Pro'], required: true },
  maxNotes: { type: Number, required: true },
}, { timestamps: true });

const NoteSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
}, { timestamps: true });

export const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);
export const Tenant: Model<ITenant> = models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);
export const Note: Model<INote> = models.Note || mongoose.model<INote>('Note', NoteSchema);
