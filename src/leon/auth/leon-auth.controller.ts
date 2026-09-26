import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LeonAuthService } from './leon-auth.service';
import { LeonLoginDto } from './dtos/leon-login.dto';

@ApiTags('Leon Auth')
@Controller('leon/auth')
export class LeonAuthController {
  constructor(private readonly leonAuthService: LeonAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in to Leon wargaming app' })
  @ApiResponse({ status: 200, description: 'User authenticated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  async login(@Body() dto: LeonLoginDto) {
    return this.leonAuthService.login(dto);
  }
}
