import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from '../application/portfolio.service';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let mockPortfolioService: any;

  beforeEach(async () => {
    mockPortfolioService = {
      getPortfolio: vi.fn(),
      getProjectDetail: vi.fn(),
      getSkills: vi.fn(),
      getExperience: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        {
          provide: PortfolioService,
          useValue: mockPortfolioService,
        },
      ],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPortfolio', () => {
    it('should call portfolioService.getPortfolio with lang parameter', async () => {
      mockPortfolioService.getPortfolio.mockResolvedValue({
        content: [],
        projects: [],
      });

      await controller.getPortfolio('en');

      expect(mockPortfolioService.getPortfolio).toHaveBeenCalledWith('en');
    });
  });

  describe('getProjectDetail', () => {
    it('should call portfolioService.getProjectDetail with slug', async () => {
      mockPortfolioService.getProjectDetail.mockResolvedValue({
        project: {},
        content: [],
      });

      await controller.getProjectDetail('my-proj');

      expect(mockPortfolioService.getProjectDetail).toHaveBeenCalledWith('my-proj');
    });
  });
});
