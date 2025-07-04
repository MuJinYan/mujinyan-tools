import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ParticipantDocument = Participant & Document;

@Schema({ timestamps: true })
export class Participant {
  @Prop({ required: true, unique: true, index: true })
  participantId: string; // External ID provided by the user

  @Prop()
  name?: string;

  @Prop({ default: false })
  hasWonPrize?: boolean;

  @Prop()
  prizeWon?: string; // Stores the name or ID of the prize won

  // timestamps will add createdAt and updatedAt
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
