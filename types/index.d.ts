// types/index.d.ts
import mongoose, { Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: 'Free' | 'Pro';
  maxNotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'Admin' | 'Member';
  tenant: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface INote extends Document {
  title: string;
  content: string;
  tenant: mongoose.Schema.Types.ObjectId;
  author: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvite extends Document {
  email: string;
  tenant: mongoose.Schema.Types.ObjectId;
  token: string;
  expires: Date;
  status: 'Pending' | 'Accepted' | 'Expired';
  createdAt: Date;
  updatedAt: Date;
}