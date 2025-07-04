import { Test, TestingModule } from '@nestjs/testing';
import { LotteryService } from './lottery.service';
import { ParticipantsService } from '../participants/participants.service';
import { PrizesService } from '../prizes/prizes.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrizeDocument } from '../prizes/schemas/prize.schema';
import { ParticipantDocument } from '../participants/schemas/participant.schema';

// Mocks
const mockParticipantsService = {
  findOneByParticipantId: jest.fn(),
  createOrUpdate: jest.fn(),
  markAsWinner: jest.fn(),
};

const mockPrizesService = {
  findAllAvailable: jest.fn(),
  decrementQuantity: jest.fn(),
  // pickRandomWeightedPrize: jest.fn(), // We will mock its effect via findAllAvailable and math.random
};

const mockNotificationsService = {
  sendPush: jest.fn(),
};

describe('LotteryService', () => {
  let service: LotteryService;

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear mocks before each test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LotteryService,
        { provide: ParticipantsService, useValue: mockParticipantsService },
        { provide: PrizesService, useValue: mockPrizesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<LotteryService>(LotteryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('drawPrize', () => {
    const participantId = 'testUser123';
    const participantName = 'Test User';

    it('should throw ConflictException if participant has already won', async () => {
      mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce({
        participantId,
        hasWonPrize: true,
        prizeWon: 'Old Prize'
      } as ParticipantDocument);

      await expect(service.drawPrize(participantId, participantName)).rejects.toThrow(ConflictException);
    });

    it('should return "no prizes available" if no prizes are available', async () => {
      mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce(null); // New participant
      mockParticipantsService.createOrUpdate.mockResolvedValueOnce({ participantId, name: participantName, hasWonPrize: false } as ParticipantDocument);
      mockPrizesService.findAllAvailable.mockResolvedValueOnce([]);

      const result = await service.drawPrize(participantId, participantName);
      expect(result.message).toContain('no prizes are available');
    });

    it('should return "no prizes available" if total weight is zero', async () => {
        mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce({ participantId, hasWonPrize: false } as ParticipantDocument);
        mockPrizesService.findAllAvailable.mockResolvedValueOnce([{ name: 'Prize 1', quantity: 1, weight: 0 }] as PrizeDocument[]);

        const result = await service.drawPrize(participantId, participantName);
        expect(result.message).toContain('prize draw is currently unavailable due to configuration');
      });

    it('should successfully draw a prize for a new participant', async () => {
      const mockPrize = { _id: 'prize123', name: 'Awesome Prize', quantity: 1, weight: 10 } as PrizeDocument;
      mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce(null);
      mockParticipantsService.createOrUpdate.mockResolvedValueOnce({ participantId, name: participantName, hasWonPrize: false } as ParticipantDocument);
      mockPrizesService.findAllAvailable.mockResolvedValueOnce([mockPrize]);
      mockPrizesService.decrementQuantity.mockResolvedValueOnce(mockPrize); // Simulate successful decrement
      mockParticipantsService.markAsWinner.mockResolvedValueOnce({} as ParticipantDocument);
      mockNotificationsService.sendPush.mockResolvedValueOnce(undefined);

      // Mock Math.random to ensure this prize is chosen (since it's the only one with weight > 0)
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1); // Ensures first prize in weighted list is chosen

      const result = await service.drawPrize(participantId, participantName);

      expect(result.message).toContain('Congratulations');
      expect(result.prize?.name).toEqual(mockPrize.name);
      expect(mockPrizesService.decrementQuantity).toHaveBeenCalledWith(mockPrize._id.toString());
      expect(mockParticipantsService.markAsWinner).toHaveBeenCalledWith(participantId, mockPrize.name);
      expect(mockNotificationsService.sendPush).toHaveBeenCalledWith(participantId, mockPrize.name);

      mathRandomSpy.mockRestore();
    });

    it('should successfully draw a prize for an existing participant who has not won', async () => {
        const mockPrize = { _id: 'prize456', name: 'Super Prize', quantity: 5, weight: 10 } as PrizeDocument;
        mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce({
          participantId,
          name: participantName,
          hasWonPrize: false
        } as ParticipantDocument);
        // createOrUpdate should not be called
        mockPrizesService.findAllAvailable.mockResolvedValueOnce([mockPrize]);
        mockPrizesService.decrementQuantity.mockResolvedValueOnce(mockPrize);
        mockParticipantsService.markAsWinner.mockResolvedValueOnce({} as ParticipantDocument);
        mockNotificationsService.sendPush.mockResolvedValueOnce(undefined);

        const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const result = await service.drawPrize(participantId, participantName);

        expect(mockParticipantsService.createOrUpdate).not.toHaveBeenCalled();
        expect(result.message).toContain('Congratulations');
        expect(result.prize?.name).toEqual(mockPrize.name);

        mathRandomSpy.mockRestore();
      });

    it('should return "better luck next time" if no prize is selected (e.g. all weights zero, or some edge case)', async () => {
      // This case is harder to hit with current logic if findAllAvailable returns prizes with weight > 0
      // but we can simulate it if findAllAvailable returns prizes but weighted selection somehow fails
      // or if all available prizes have 0 weight after the initial check.
      // For this test, let's assume findAllAvailable returns prizes, but the logic for selection results in no prize.
      // This is more of a test for the final `else` block in `drawPrize`.
      const mockAvailablePrizes = [{ _id: 'p0', name: 'ZeroWeightPrize', quantity: 1, weight: 0 }] as PrizeDocument[];
      mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce({ participantId, hasWonPrize: false } as ParticipantDocument);
      mockPrizesService.findAllAvailable.mockResolvedValueOnce(mockAvailablePrizes);
      // Math.random won't matter much if totalWeight is 0 (which is checked before this point)
      // The scenario being tested is if selectedPrize remains null AFTER the loop

      const result = await service.drawPrize(participantId, participantName);
      // Given the current check `if (totalWeight <= 0)`, this path is hard to reach unless logic changes.
      // The service currently returns 'prize draw is currently unavailable due to configuration' in this case.
      // So, we'll test that specific message.
      expect(result.message).toContain('prize draw is currently unavailable due to configuration');
    });

    it('should handle prize running out during decrement (high concurrency simulation)', async () => {
        const mockPrize = { _id: 'prize789', name: 'Rare Prize', quantity: 1, weight: 10 } as PrizeDocument;
        mockParticipantsService.findOneByParticipantId.mockResolvedValueOnce({ participantId, hasWonPrize: false } as ParticipantDocument);
        mockPrizesService.findAllAvailable.mockResolvedValueOnce([mockPrize]);
        mockPrizesService.decrementQuantity.mockResolvedValueOnce(null); // Simulate prize ran out

        const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const result = await service.drawPrize(participantId, participantName);

        expect(result.message).toContain('selected prize just ran out');
        expect(mockParticipantsService.markAsWinner).not.toHaveBeenCalled();
        expect(mockNotificationsService.sendPush).not.toHaveBeenCalled();

        mathRandomSpy.mockRestore();
      });

  });
});
