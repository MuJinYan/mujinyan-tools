import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ParticipantsService } from '../participants/participants.service';
import { PrizesService } from '../prizes/prizes.service';
import { PrizeDocument } from '../prizes/schemas/prize.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LotteryService {
  private readonly logger = new Logger(LotteryService.name);

  constructor(
    private readonly participantsService: ParticipantsService,
    private readonly prizesService: PrizesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async drawPrize(participantId: string, participantName?: string): Promise<{ message: string; prize?: PrizeDocument }> {
    this.logger.log(`Attempting to draw prize for participant ID: ${participantId}`);

    let participant = await this.participantsService.findOneByParticipantId(participantId);

    if (!participant) {
      this.logger.log(`Participant ${participantId} not found, creating new participant.`);
      participant = await this.participantsService.createOrUpdate(participantId, participantName);
    } else if (participant.hasWonPrize) {
      this.logger.warn(`Participant ${participantId} has already won a prize: ${participant.prizeWon}.`);
      throw new ConflictException(`Participant ${participantId} has already won a prize.`);
    }

    const availablePrizes = await this.prizesService.findAllAvailable();
    if (!availablePrizes || availablePrizes.length === 0) {
      this.logger.warn('No prizes available for drawing.');
      return { message: 'Sorry, no prizes are available at the moment.' };
    }

    // Weighted random selection logic
    let totalWeight = 0;
    for (const prize of availablePrizes) {
      totalWeight += prize.weight;
    }

    if (totalWeight <= 0) {
        this.logger.warn('Total weight of available prizes is zero or negative. Cannot draw.');
        return { message: 'Sorry, prize draw is currently unavailable due to configuration.' };
    }

    let randomNum = Math.random() * totalWeight;
    let selectedPrize: PrizeDocument | null = null;

    for (const prize of availablePrizes) {
      if (randomNum < prize.weight) {
        selectedPrize = prize;
        break;
      }
      randomNum -= prize.weight;
    }

    // Fallback if something went wrong with weights (e.g. all weights zero, though checked above)
    if (!selectedPrize && availablePrizes.length > 0) {
        this.logger.warn('Weighted selection did not pick a prize, falling back to first available (should not happen if weights are positive).');
        selectedPrize = availablePrizes[0];
    }


    if (selectedPrize) {
      this.logger.log(`Participant ${participantId} won prize: ${selectedPrize.name}`);
      const updatedPrize = await this.prizesService.decrementQuantity(selectedPrize._id.toString());
      if (!updatedPrize) {
        // This might happen in a high concurrency scenario if prize ran out between selection and decrement
        this.logger.error(`Failed to decrement quantity for prize ${selectedPrize.name}. It might have run out.`);
        // Potentially retry draw or return a "better luck next time"
        return { message: 'Sorry, the selected prize just ran out! Please try again.'};
      }

      await this.participantsService.markAsWinner(participantId, selectedPrize.name);

      await this.notificationsService.sendPush(participantId, selectedPrize.name);

      return { message: `Congratulations! You won: ${selectedPrize.name}`, prize: selectedPrize };
    } else {
      this.logger.log(`Participant ${participantId} did not win a prize this time.`);
      // Optionally, you could mark the participant as "drew_blank" to prevent immediate re-draws if desired.
      return { message: 'Sorry, better luck next time!' };
    }
  }
}
