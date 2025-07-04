import { Test, TestingModule } from '@nestjs/testing';
import { PrizesService } from './prizes.service';
import { getModelToken } from '@nestjs/mongoose';
import { Prize } from './schemas/prize.schema';
import { Model } from 'mongoose';

describe('PrizesService', () => {
  let service: PrizesService;
  let model: Model<Prize>;

  const mockPrizeModel = {
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrizesService,
        {
          provide: getModelToken(Prize.name),
          useValue: mockPrizeModel,
        },
      ],
    }).compile();

    service = module.get<PrizesService>(PrizesService);
    model = module.get<Model<Prize>>(getModelToken(Prize.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit (seedPrizes)', () => {
    it('should seed prizes if database is empty', async () => {
      mockPrizeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(0) } as any);
      mockPrizeModel.insertMany.mockResolvedValueOnce([] as any); // Simulate successful insert

      await service.onModuleInit(); // This calls seedPrizes

      expect(mockPrizeModel.countDocuments).toHaveBeenCalledTimes(1);
      expect(mockPrizeModel.insertMany).toHaveBeenCalledTimes(1);
      expect(mockPrizeModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Grand Prize - A' }),
          expect.objectContaining({ name: 'Mystery Box' }),
        ]),
      );
    });

    it('should not seed prizes if database is not empty', async () => {
      mockPrizeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(5) } as any);

      await service.onModuleInit(); // This calls seedPrizes

      expect(mockPrizeModel.countDocuments).toHaveBeenCalledTimes(1);
      expect(mockPrizeModel.insertMany).not.toHaveBeenCalled();
    });

    it('should log an error if insertMany fails', async () => {
        mockPrizeModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(0) } as any);
        const consoleErrorSpy = jest.spyOn(service['logger'], 'error');
        const testError = new Error('DB insert failed');
        mockPrizeModel.insertMany.mockRejectedValueOnce(testError);

        await service.onModuleInit();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error seeding prizes:', testError);
        consoleErrorSpy.mockRestore();
      });
  });

  describe('findAllAvailable', () => {
    it('should return all prizes with quantity > 0', async () => {
      const mockPrizes = [{ name: 'Prize 1', quantity: 1 }, { name: 'Prize 2', quantity: 0 }];
      mockPrizeModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(mockPrizes.filter(p => p.quantity > 0)) } as any);

      const result = await service.findAllAvailable();

      expect(mockPrizeModel.find).toHaveBeenCalledWith({ quantity: { $gt: 0 } });
      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Prize 1');
    });
  });

  describe('decrementQuantity', () => {
    it('should decrement prize quantity and return updated prize', async () => {
      const prizeId = 'some-id';
      const updatedPrize = { _id: prizeId, name: 'Test Prize', quantity: 4 };
      mockPrizeModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(updatedPrize) } as any);

      const result = await service.decrementQuantity(prizeId);

      expect(mockPrizeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        prizeId,
        { $inc: { quantity: -1 } },
        { new: true },
      );
      expect(result).toEqual(updatedPrize);
    });
  });

  // TODO: Add tests for pickRandomWeightedPrize (might be more complex to mock effectively)
  // TODO: Add tests for create and findOneByName
});
