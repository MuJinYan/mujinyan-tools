import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrizesService } from './prizes.service';
import { Prize, PrizeSchema } from './schemas/prize.schema';
// Import controller here if you create one for prize management

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Prize.name, schema: PrizeSchema }]),
  ],
  providers: [PrizesService],
  // controllers: [], // Add PrizeController if needed for CRUD operations
  exports: [PrizesService], // Export service for LotteryModule to use
})
export class PrizesModule {}
