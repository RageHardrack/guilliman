import { Test, TestingModule } from '@nestjs/testing';

import { LinksService } from './links.service';
import { LinksRepositoryPort } from '../domain/links-repository.port';

describe('LinksService', () => {
  let service: LinksService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findAll: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        {
          provide: LinksRepositoryPort,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of links', async () => {
      const mockLinks = [
        {
          id: '1',
          Title: 'Google',
          URL: 'https://google.com',
          Icon: 'google',
          Order: 1,
        },
      ];
      mockRepository.findAll.mockResolvedValue(mockLinks);

      const result = await service.findAll();
      expect(result).toEqual(mockLinks);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
