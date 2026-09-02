import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { McpSseController } from './mcp-sse.controller';
import { McpServerService } from '../mcp-server.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

describe('McpSseController', () => {
  let controller: McpSseController;
  let mcpServerService: McpServerService;
  let mockServerInstance: any;

  beforeEach(() => {
    mockServerInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
    };

    mcpServerService = {
      getServerInstance: vi.fn().mockReturnValue(mockServerInstance),
    } as unknown as McpServerService;

    controller = new McpSseController(mcpServerService);
  });

  it('inicia el transporte SSE conectando al McpServer', async () => {
    const mockRaw = {
      writeHead: vi.fn(),
      write: vi.fn(),
      flush: vi.fn(),
      on: vi.fn(),
    };

    const mockReply = {
      raw: mockRaw,
    } as unknown as FastifyReply;

    const mockReq = {} as unknown as FastifyRequest;

    await controller.handleSse(mockReq, mockReply);

    expect(mcpServerService.getServerInstance).toHaveBeenCalled();
    expect(mockServerInstance.connect).toHaveBeenCalled();
  });

  it('lanza NotFoundException si la sesión de mensajes no existe', async () => {
    const mockReply = {
      raw: {},
    } as unknown as FastifyReply;

    const mockReq = {
      query: { sessionId: 'invalid-session' },
      body: {},
    } as unknown as FastifyRequest;

    await expect(
      controller.handleMessages(mockReq, mockReply, 'invalid-session'),
    ).rejects.toThrow(NotFoundException);
  });
});
