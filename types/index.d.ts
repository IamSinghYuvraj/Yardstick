// types/index.d.ts
import { Document, Types } from 'mongoose';

export interface ITenant extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: 'Admin' | 'Member';
  plan: 'Free' | 'Pro';
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

export interface IUpgradeRequest extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | IUser;
  tenant: Types.ObjectId | ITenant;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientUser {
  id: string;
  email: string;
  name?: string;
  role: 'Admin' | 'Member';
  tenant: {
    _id: string;
    name: string;
    slug: string;
    plan: 'Free' | 'Pro';
  };
}
