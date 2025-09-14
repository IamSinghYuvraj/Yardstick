
import mongoose, { Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: 'Free' | 'Pro';
  maxNotes: number;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'Admin' | 'Member';
  tenant: mongoose.Schema.Types.ObjectId;
}

export interface INote extends Document {
  title: string;
  content: string;
  tenant: mongoose.Schema.Types.ObjectId;
  author: mongoose.Schema.Types.ObjectId;
}
