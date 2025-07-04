import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsService } from './participants.service';
import { getModelToken } from '@nestjs/mongoose';
import { Participant, ParticipantDocument } from './schemas/participant.schema';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let model: Model<ParticipantDocument>;

  const mockParticipant = {
    participantId: 'testUser1',
    name: 'Test User 1',
    hasWonPrize: false,
    prizeWon: null,
    save: jest.fn().mockResolvedValue(this),
  };

  const mockParticipantModel = {
    findOne: jest.fn(),
    new: jest.fn().mockImplementation(dto => ({ ...dto, save: jest.fn().mockResolvedValue(dto) })),
    save: jest.fn(), // for existing documents
    // exec: jest.fn(), // Not needed directly if findOne().exec() is mocked on findOne
  };


  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        {
          provide: getModelToken(Participant.name),
          useValue: mockParticipantModel,
        },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
    model = module.get<Model<ParticipantDocument>>(getModelToken(Participant.name));

    // Reset mocks for each test
    jest.clearAllMocks();
    mockParticipant.save.mockClear(); // Clear save mock on the template object
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByParticipantId', () => {
    it('should return a participant if found', async () => {
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(mockParticipant) } as any);
      const result = await service.findOneByParticipantId('testUser1');
      expect(mockParticipantModel.findOne).toHaveBeenCalledWith({ participantId: 'testUser1' });
      expect(result).toEqual(mockParticipant);
    });

    it('should return null if participant not found', async () => {
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(null) } as any);
      const result = await service.findOneByParticipantId('unknownUser');
      expect(result).toBeNull();
    });
  });

  describe('createOrUpdate', () => {
    it('should create a new participant if not existing', async () => {
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(null) } as any);
      const newParticipantData = { participantId: 'newUser', name: 'New User' };
      // new this.participantModel() is called internally. We mock the constructor via 'new'
      const saveSpy = jest.fn().mockResolvedValue(newParticipantData);
      mockParticipantModel.new.mockImplementationOnce(() => ({ ...newParticipantData, save: saveSpy }));


      const result = await service.createOrUpdate('newUser', 'New User');

      expect(mockParticipantModel.findOne).toHaveBeenCalledWith({ participantId: 'newUser' });
      expect(mockParticipantModel.new).toHaveBeenCalledWith(newParticipantData);
      expect(saveSpy).toHaveBeenCalled();
      expect(result.participantId).toEqual('newUser');
    });

    it('should update participant name if existing and name is different', async () => {
      const existingParticipant = { ...mockParticipant, name: 'Old Name', save: jest.fn().mockResolvedValueOnce(this) };
      existingParticipant.save.mockImplementationOnce(function() { this.name = 'New Name'; return Promise.resolve(this); });

      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(existingParticipant) } as any);

      const result = await service.createOrUpdate('testUser1', 'New Name');

      expect(existingParticipant.save).toHaveBeenCalled();
      expect(result.name).toEqual('New Name');
    });

    it('should return existing participant if name is same or not provided for update', async () => {
      const existingParticipant = { ...mockParticipant, save: jest.fn() };
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(existingParticipant) } as any);

      const result1 = await service.createOrUpdate('testUser1', 'Test User 1'); // Same name
      const result2 = await service.createOrUpdate('testUser1'); // Name not provided

      expect(existingParticipant.save).not.toHaveBeenCalled();
      expect(result1).toEqual(existingParticipant);
      expect(result2).toEqual(existingParticipant);
    });
  });

  describe('markAsWinner', () => {
    it('should mark participant as winner and save prize name', async () => {
      const participantToUpdate = { ...mockParticipant, save: jest.fn() };
      participantToUpdate.save.mockImplementationOnce(function() {
        this.hasWonPrize = true;
        this.prizeWon = 'Awesome Prize';
        return Promise.resolve(this);
      });
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(participantToUpdate) } as any);

      const result = await service.markAsWinner('testUser1', 'Awesome Prize');

      expect(participantToUpdate.save).toHaveBeenCalled();
      expect(result.hasWonPrize).toBe(true);
      expect(result.prizeWon).toEqual('Awesome Prize');
    });

    it('should throw NotFoundException if participant not found', async () => {
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(null) } as any);
      await expect(service.markAsWinner('unknownUser', 'Some Prize')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetWinningStatus', () => {
    it('should reset participant winning status', async () => {
      const participantToUpdate = { ...mockParticipant, hasWonPrize: true, prizeWon: 'Old Prize', save: jest.fn() };
      participantToUpdate.save.mockImplementationOnce(function() {
        this.hasWonPrize = false;
        this.prizeWon = undefined;
        return Promise.resolve(this);
      });
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(participantToUpdate) } as any);

      const result = await service.resetWinningStatus('testUser1');

      expect(participantToUpdate.save).toHaveBeenCalled();
      expect(result.hasWonPrize).toBe(false);
      expect(result.prizeWon).toBeUndefined();
    });

    it('should throw NotFoundException if participant not found for reset', async () => {
      mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(null) } as any);
      await expect(service.resetWinningStatus('unknownUser')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkHasWon', () => {
    it('should return true if participant has won', async () => {
        mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce({ ...mockParticipant, hasWonPrize: true }) } as any);
        const result = await service.checkHasWon('testUser1');
        expect(result).toBe(true);
    });

    it('should return false if participant has not won', async () => {
        mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce({ ...mockParticipant, hasWonPrize: false }) } as any);
        const result = await service.checkHasWon('testUser1');
        expect(result).toBe(false);
    });

    it('should return false if participant not found', async () => {
        mockParticipantModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValueOnce(null) } as any);
        const result = await service.checkHasWon('unknownUser');
        expect(result).toBe(false);
    });
  });

});
