import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { IPost } from '../domain/blog.types';
import { BlogService } from './blog.service';
import { BlogRepositoryPort } from '../domain/blog-repository.port';

describe('BlogService', () => {
  let service: BlogService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getPostContent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: BlogRepositoryPort,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of posts', async () => {
      const mockPosts: IPost[] = [
        {
          id: '1',
          Tags: ['TypeScript'],
          Image_URL: 'http://img.url',
          Status: 'Publicado',
          Slug: 'hello-world',
          Fecha_Publicacion: '2026-01-01',
          Brief: 'Brief desc',
          Post: 'Hello World',
          Prevent_Index: false,
          Language: 'es',
          Stage: 'dev-stage',
        },
      ];
      mockRepository.findAll.mockResolvedValue(mockPosts);

      const result = await service.findAll();
      expect(result).toEqual(mockPosts);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findBySlug', () => {
    it('should return post with content if found by slug', async () => {
      const mockPosts: IPost[] = [
        {
          id: '1',
          Tags: ['TypeScript'],
          Image_URL: 'http://img.url',
          Status: 'Publicado',
          Slug: 'hello-world',
          Fecha_Publicacion: '2026-01-01',
          Brief: 'Brief desc',
          Post: 'Hello World',
          Prevent_Index: false,
          Language: 'es',
          Stage: 'dev-stage',
        },
      ];
      const mockPageContent: IPost = mockPosts[0];
      const mockContent = [
        {
          object: 'block',
          id: 'block-1',
          type: 'paragraph',
          body: 'text',
          caption: 'text',
          emoji: null,
        },
      ];

      mockRepository.findAll.mockResolvedValue(mockPosts);
      mockRepository.findOne.mockResolvedValue(mockPageContent);
      mockRepository.getPostContent.mockResolvedValue(mockContent);

      const result = await service.findBySlug('hello-world');

      expect(result).toEqual({ ...mockPageContent, content: mockContent });
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockRepository.findOne).toHaveBeenCalledWith('1');
      expect(mockRepository.getPostContent).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if post not found by slug', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
