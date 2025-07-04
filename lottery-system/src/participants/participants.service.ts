import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Participant, ParticipantDocument } from './schemas/participant.schema';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(Participant.name) private participantModel: Model<ParticipantDocument>,
  ) {}

  async findOneByParticipantId(participantId: string): Promise<ParticipantDocument | null> {
    return this.participantModel.findOne({ participantId }).exec();
  }

  async createOrUpdate(participantId: string, name?: string): Promise<ParticipantDocument> {
    const existingParticipant = await this.findOneByParticipantId(participantId);
    if (existingParticipant) {
      if (name && existingParticipant.name !== name) {
        existingParticipant.name = name;
        return existingParticipant.save();
      }
      return existingParticipant;
    }
    const newParticipant = new this.participantModel({ participantId, name });
    return newParticipant.save();
  }

  async markAsWinner(participantId: string, prizeName: string): Promise<ParticipantDocument> {
    const participant = await this.findOneByParticipantId(participantId);
    if (!participant) {
      throw new NotFoundException(`Participant with ID ${participantId} not found.`);
    }
    participant.hasWonPrize = true;
    participant.prizeWon = prizeName;
    return participant.save();
  }

  async resetWinningStatus(participantId: string): Promise<ParticipantDocument> {
    const participant = await this.findOneByParticipantId(participantId);
    if (!participant) {
      throw new NotFoundException(`Participant with ID ${participantId} not found.`);
    }
    participant.hasWonPrize = false;
    participant.prizeWon = undefined; // Clear the prize won
    return participant.save();
  }

  async checkHasWon(participantId: string): Promise<boolean> {
    const participant = await this.findOneByParticipantId(participantId);
    return participant?.hasWonPrize || false;
  }
}
