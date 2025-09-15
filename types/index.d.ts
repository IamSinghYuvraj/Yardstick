// types/index.ts
import { Document, Types } from 'mongoose';

export interface ITenant extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  plan: 'Free' | 'Pro';
  maxNotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: 'Admin' | 'Member';
  tenant: Types.ObjectId | ITenant;
  createdAt: Date;
  updatedAt: Date;
}

export interface INote extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  tenant: Types.ObjectId | ITenant;
  author: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvite extends Document {
  _id: Types.ObjectId;
  email: string;
  tenant: Types.ObjectId | ITenant;
  token: string;
  expires: Date;
  status: 'Pending' | 'Accepted' | 'Expired';
  createdAt: Date;
  updatedAt: Date;
}