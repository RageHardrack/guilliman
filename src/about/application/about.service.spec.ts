import { Test, TestingModule } from '@nestjs/testing';

import { AboutService } from './about.service';
import { AboutRepositoryPort } from '../domain/about-repository.port';

describe('AboutService', () => {
  let service: AboutService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      getAboutContent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AboutService,
        {
          provide: AboutRepositoryPort,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AboutService>(AboutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAboutContent', () => {
    it('should return about content blocks', async () => {
      const mockContent = [
        {
          object: 'block',
          id: '1',
          type: 'paragraph',
          body: 'About me content',
          caption: '',
          emoji: null,
        },
      ];
      mockRepository.getAboutContent.mockResolvedValue(mockContent);

      const result = await service.getAboutContent();
      expect(result).toEqual(mockContent);
      expect(mockRepository.getAboutContent).toHaveBeenCalledTimes(1);
    });
  });
});
