import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ParticipantsModule } from './participants/participants.module';
import { PrizesModule } from './prizes/prizes.module';
import { LotteryModule } from './lottery/lottery.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/lottery_system_db_placeholder'),
    // TODO: Replace with your actual MongoDB connection string, potentially from environment variables
    ParticipantsModule,
    PrizesModule,
    LotteryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
