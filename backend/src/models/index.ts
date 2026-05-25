import { Schema, model, Document, Types } from 'mongoose';

/* ============================================================
   Tipos compartilhados
============================================================ */

export type ProductCategory = 'Ração' | 'Acessórios' | 'Higiene' | 'Medicamentos';
export type OrderStatus     = 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled';
export type DeliveryType    = 'delivery' | 'pickup';
export type PaymentMethod   = 'Pix' | 'Cartão' | 'Dinheiro';
export type AdminRole       = 'admin' | 'super';

/* ============================================================
   Product
============================================================ */

export interface IProduct extends Document {
  name:          string;
  price:         number;
  originalPrice: number | null;
  category:      ProductCategory;
  rating:        number;
  reviews:       number;
  badge:         string | null;
  img:           string;
  desc:          string;
  stock:         number;
  active:        boolean;
  createdAt:     Date;
  updatedAt:     Date;
}

const productSchema = new Schema<IProduct>(
  {
    name:          { type: String, required: true, trim: true, maxlength: 120 },
    price:         { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
    category:      { type: String, required: true, enum: ['Ração', 'Acessórios', 'Higiene', 'Medicamentos'] },
    rating:        { type: Number, required: true, min: 0, max: 5 },
    reviews:       { type: Number, required: true, default: 0, min: 0 },
    badge:         { type: String, default: null, maxlength: 30 },
    img:           { type: String, required: true },
    desc:          { type: String, required: true, maxlength: 500 },
    stock:         { type: Number, required: true, default: 0, min: 0 },
    active:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, active: 1 });
productSchema.index({ name: 'text', desc: 'text' });

export const Product = model<IProduct>('Product', productSchema);

/* ============================================================
   Order
============================================================ */

export interface IOrderItem {
  productId: Types.ObjectId;
  name:      string;
  price:     number;
  qty:       number;
}

export interface IOrder extends Document {
  items:        IOrderItem[];
  total:        number;
  customer: {
    name:  string;
    phone: string;
  };
  deliveryType: DeliveryType;
  address:      string | null;
  payment:      PaymentMethod;
  status:       OrderStatus;
  whatsappSent: boolean;
  notes:        string | null;
  createdAt:    Date;
  updatedAt:    Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name:      { type: String, required: true },
    price:     { type: Number, required: true, min: 0 },
    qty:       { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    items:    { type: [orderItemSchema], required: true, validate: (v: IOrderItem[]) => v.length > 0 },
    total:    { type: Number, required: true, min: 0 },
    customer: {
      name:  { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    deliveryType: { type: String, required: true, enum: ['delivery', 'pickup'] },
    address:      { type: String, default: null },
    payment:      { type: String, required: true, enum: ['Pix', 'Cartão', 'Dinheiro'] },
    status:       { type: String, default: 'pending', enum: ['pending', 'confirmed', 'processing', 'delivered', 'cancelled'] },
    whatsappSent: { type: Boolean, default: false },
    notes:        { type: String, default: null, maxlength: 300 },
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', orderSchema);

/* ============================================================
   Contact
============================================================ */

export interface IContact extends Document {
  name:      string;
  email:     string;
  phone:     string | null;
  message:   string;
  replied:   boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name:    { type: String, required: true, trim: true, maxlength: 80 },
    email:   { type: String, required: true, lowercase: true, trim: true },
    phone:   { type: String, default: null, maxlength: 20 },
    message: { type: String, required: true, maxlength: 1000 },
    replied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Contact = model<IContact>('Contact', contactSchema);

/* ============================================================
   Newsletter
============================================================ */

export interface INewsletter extends Document {
  email:          string;
  active:         boolean;
  subscribedAt:   Date;
  unsubscribedAt: Date | null;
}

const newsletterSchema = new Schema<INewsletter>({
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  active:         { type: Boolean, default: true },
  subscribedAt:   { type: Date, default: () => new Date() },
  unsubscribedAt: { type: Date, default: null },
});

export const Newsletter = model<INewsletter>('Newsletter', newsletterSchema);

/* ============================================================
   Admin
============================================================ */

export interface IAdmin extends Document {
  email:     string;
  password:  string;
  role:      AdminRole;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role:     { type: String, default: 'admin', enum: ['admin', 'super'] },
  },
  { timestamps: true }
);

/* Nunca retorna o hash da senha em queries normais */
adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export const Admin = model<IAdmin>('Admin', adminSchema);
