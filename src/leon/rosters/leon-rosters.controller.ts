import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { LeonRostersService } from './leon-rosters.service';
import { CreateLeonRosterDto, UpdateLeonRosterDto } from './dtos/leon-roster.dto';
import { LeonJwtAuthGuard } from '../guards/leon-jwt-auth.guard';
import { CurrentLeonUser, CurrentLeonUserData } from '../auth/current-leon-user.decorator';

@ApiTags('Leon Rosters')
@ApiBearerAuth()
@UseGuards(LeonJwtAuthGuard)
@Controller('leon/rosters')
export class LeonRostersController {
  constructor(private readonly rostersService: LeonRostersService) {}

  @Get()
  @ApiOperation({ summary: 'List all rosters for the authenticated Leon user' })
  async listRosters(@CurrentLeonUser() user: CurrentLeonUserData) {
    return this.rostersService.listRosters(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific roster by ID' })
  async getRoster(
    @Param('id') id: string,
    @CurrentLeonUser() user: CurrentLeonUserData,
  ) {
    return this.rostersService.getRoster(user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new army roster' })
  async createRoster(
    @Body() dto: CreateLeonRosterDto,
    @CurrentLeonUser() user: CurrentLeonUserData,
  ) {
    return this.rostersService.createRoster(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing army roster' })
  async updateRoster(
    @Param('id') id: string,
    @Body() dto: UpdateLeonRosterDto,
    @CurrentLeonUser() user: CurrentLeonUserData,
  ) {
    return this.rostersService.updateRoster(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an army roster' })
  async deleteRoster(
    @Param('id') id: string,
    @CurrentLeonUser() user: CurrentLeonUserData,
  ) {
    return this.rostersService.deleteRoster(user.userId, id);
  }
}
