import { Module } from '@nestjs/common';
import { LotteryService } from './lottery.service';
import { LotteryController } from './lottery.controller';
import { ParticipantsModule } from '../participants/participants.module';
import { PrizesModule } from '../prizes/prizes.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ParticipantsModule,
    PrizesModule,
    NotificationsModule,
  ],
  providers: [LotteryService],
  controllers: [LotteryController],
  exports: [LotteryService], // If other modules might need to trigger draws directly
})
export class LotteryModule {}
