import { ApiProperty } from '@nestjs/swagger';

/**
 * Body of `POST /mcp/tokens`. The app registers no global ValidationPipe, so
 * `name` is validated by the McpToken domain entity (required, trimmed, at
 * most 60 characters); any other field in the body is ignored.
 */
export class CreateMcpTokenDto {
  @ApiProperty({
    description:
      'Nombre reconocible del token (obligatorio, hasta 60 caracteres)',
    example: 'Hermes laptop',
  })
  name: unknown;
}
