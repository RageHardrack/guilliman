import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from '../application/blog.service';

describe('BlogController', () => {
  let controller: BlogController;
  let mockBlogService: any;

  beforeEach(async () => {
    mockBlogService = {
      findAll: vi.fn(),
      findBySlug: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        {
          provide: BlogService,
          useValue: mockBlogService,
        },
      ],
    }).compile();

    controller = module.get<BlogController>(BlogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call blogService.findAll with lang and return posts wrapped in object', async () => {
      mockBlogService.findAll.mockResolvedValue([{ id: '1', Post: 'Post 1' }]);

      const result = await controller.findAll('es');

      expect(mockBlogService.findAll).toHaveBeenCalledWith('es');
      expect(result).toEqual({ posts: [{ id: '1', Post: 'Post 1' }] });
    });
  });

  describe('findBySlug', () => {
    it('should call blogService.findBySlug with slug', async () => {
      mockBlogService.findBySlug.mockResolvedValue({ id: '1', Slug: 'my-slug' });

      const result = await controller.findBySlug('my-slug');

      expect(mockBlogService.findBySlug).toHaveBeenCalledWith('my-slug');
      expect(result).toEqual({ id: '1', Slug: 'my-slug' });
    });
  });
});
