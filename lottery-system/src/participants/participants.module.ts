import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ParticipantsService } from './participants.service';
import { Participant, ParticipantSchema } from './schemas/participant.schema';
// Import controller here if you create one:
// import { ParticipantsController } from './participants.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Participant.name, schema: ParticipantSchema }]),
  ],
  providers: [ParticipantsService],
  // controllers: [ParticipantsController], // Uncomment if a controller is added
  exports: [ParticipantsService], // Export service for other modules to use
})
export class ParticipantsModule {}
