import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prize, PrizeDocument } from './schemas/prize.schema';

@Injectable()
export class PrizesService implements OnModuleInit {
  private readonly logger = new Logger(PrizesService.name);

  constructor(
    @InjectModel(Prize.name) private prizeModel: Model<PrizeDocument>,
  ) {}

  async onModuleInit() {
    await this.seedPrizes();
  }

  async seedPrizes() {
    const count = await this.prizeModel.countDocuments().exec();
    if (count === 0) {
      this.logger.log('No prizes found in DB, seeding initial prizes...');
      const initialPrizes: Partial<Prize>[] = [
        { name: 'Grand Prize - A', description: 'A fantastic grand prize', quantity: 1, weight: 1 },
        { name: 'Grand Prize - B', description: 'Another amazing grand prize', quantity: 1, weight: 2 },
        { name: 'Consolation Prize - Type 1', description: 'A nice consolation prize', quantity: 5, weight: 10 },
        { name: 'Consolation Prize - Type 2', description: 'Another consolation prize', quantity: 10, weight: 15 },
        { name: 'Small Token - A', description: 'A small token of appreciation', quantity: 20, weight: 25 },
        { name: 'Small Token - B', description: 'Another small token', quantity: 20, weight: 25 },
        { name: 'Better Luck Next Time Coupon', description: 'Coupon for future events', quantity: 100, weight: 10 },
        { name: 'Mystery Box', description: 'Contains a surprise!', quantity: 3, weight: 5 },
      ];

      // Ensure we only seed up to 8 prizes if more are defined for some reason
      const prizesToSeed = initialPrizes.slice(0, 8);

      try {
        await this.prizeModel.insertMany(prizesToSeed);
        this.logger.log(`${prizesToSeed.length} initial prizes seeded successfully.`);
      } catch (error) {
        this.logger.error('Error seeding prizes:', error);
      }
    } else {
      this.logger.log(`${count} prizes found in DB. Skipping seeding.`);
    }
  }

  async create(prizeData: Partial<Prize>): Promise<PrizeDocument> {
    const newPrize = new this.prizeModel(prizeData);
    return newPrize.save();
  }

  async findAllAvailable(): Promise<PrizeDocument[]> {
    return this.prizeModel.find({ quantity: { $gt: 0 } }).exec();
  }

  async findOneByName(name: string): Promise<PrizeDocument | null> {
    return this.prizeModel.findOne({ name }).exec();
  }

  async decrementQuantity(prizeId: string): Promise<PrizeDocument | null> {
    return this.prizeModel.findByIdAndUpdate(
      prizeId,
      { $inc: { quantity: -1 } },
      { new: true }, // Returns the modified document
    ).exec();
  }

  // Weighted random selection can be complex.
  // This is a basic example and might need refinement based on specific requirements.
  // It's often better to pull all available prizes and do weighted selection in service logic.
  async pickRandomWeightedPrize(): Promise<PrizeDocument | null> {
    const availablePrizes = await this.findAllAvailable();
    if (!availablePrizes.length) {
      return null;
    }

    let totalWeight = 0;
    for (const prize of availablePrizes) {
      totalWeight += prize.weight;
    }

    let randomNum = Math.random() * totalWeight;

    for (const prize of availablePrizes) {
      if (randomNum < prize.weight) {
        return prize;
      }
      randomNum -= prize.weight;
    }
    // Fallback, should ideally not be reached if weights are positive and totalWeight > 0
    return availablePrizes[availablePrizes.length - 1];
  }
}
