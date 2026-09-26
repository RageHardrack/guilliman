import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreateLeonRosterDto, UpdateLeonRosterDto } from './dtos/leon-roster.dto';

@Injectable()
export class LeonRostersService {
  constructor(private readonly prisma: PrismaService) {}

  async listRosters(userId: string) {
    return this.prisma.leonRoster.findMany({
      where: { leonUserId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getRoster(userId: string, rosterId: string) {
    const roster = await this.prisma.leonRoster.findFirst({
      where: { id: rosterId, leonUserId: userId },
    });

    if (!roster) {
      throw new NotFoundException(`Roster ${rosterId} not found`);
    }

    return roster;
  }

  async createRoster(userId: string, dto: CreateLeonRosterDto) {
    return this.prisma.leonRoster.create({
      data: {
        leonUserId: userId,
        name: dto.name,
        gameSystem: dto.gameSystem || '40k-10e',
        faction: dto.faction,
        detachment: dto.detachment,
        pointsLimit: dto.pointsLimit ?? 2000,
        pointsTotal: dto.pointsTotal ?? 0,
        content: dto.content || {},
      },
    });
  }

  async updateRoster(userId: string, rosterId: string, dto: UpdateLeonRosterDto) {
    await this.getRoster(userId, rosterId);

    return this.prisma.leonRoster.update({
      where: { id: rosterId },
      data: {
        name: dto.name,
        faction: dto.faction,
        detachment: dto.detachment,
        pointsLimit: dto.pointsLimit,
        pointsTotal: dto.pointsTotal,
        content: dto.content,
      },
    });
  }

  async deleteRoster(userId: string, rosterId: string) {
    await this.getRoster(userId, rosterId);

    await this.prisma.leonRoster.delete({
      where: { id: rosterId },
    });

    return { message: `Roster ${rosterId} deleted successfully` };
  }
}
