import { Controller, Post, Body, ValidationPipe, UsePipes, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { LotteryService } from './lottery.service';

// It's good practice to use DTOs (Data Transfer Objects) for request bodies
// For simplicity here, I'll define a basic interface, but for robust validation,
// class-validator and class-transformer should be used with a DTO class.
interface DrawRequestBody {
  participantId: string;
  participantName?: string; // Optional name
}

@Controller('lottery')
export class LotteryController {
  private readonly logger = new Logger(LotteryController.name);

  constructor(private readonly lotteryService: LotteryService) {}

  @Post('draw')
  @HttpCode(HttpStatus.OK) // Usually POST is 201, but here it's more like an action, OK is fine.
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) // Basic validation if using DTOs
  async drawPrize(@Body() body: DrawRequestBody) {
    this.logger.log(`Received draw request for participant ID: ${body.participantId}`);
    try {
      const result = await this.lotteryService.drawPrize(body.participantId, body.participantName);
      return result;
    } catch (error) {
      this.logger.error(`Error during draw for participant ${body.participantId}: ${error.message}`, error.stack);
      // NestJS will automatically handle known exceptions like ConflictException, NotFoundException
      // and return appropriate HTTP status codes.
      // For unhandled/unexpected errors, it will return a 500 Internal Server Error.
      throw error;
    }
  }
}
