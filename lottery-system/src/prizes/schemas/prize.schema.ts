import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PrizeDocument = Prize & Document;

@Schema({ timestamps: true })
export class Prize {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 0, default: 1 })
  quantity: number; // Number of this prize available

  @Prop({ required: true, min: 0, default: 1 })
  weight: number; // Weight for lottery draw probability

  // timestamps will add createdAt and updatedAt
}

export const PrizeSchema = SchemaFactory.createForClass(Prize);
PrizeSchema.index({ name: 1 }); // Index on name for faster queries if needed.
