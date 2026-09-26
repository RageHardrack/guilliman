import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LeonRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import {
  CreateLeonUserDto,
  ResetLeonPasswordDto,
  UpdateLeonUserDto,
} from './dtos/leon-admin-user.dto';

@Injectable()
export class LeonAdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.leonUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: CreateLeonUserDto) {
    const existing = await this.prisma.leonUser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.leonUser.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        name: dto.name,
        role: dto.role || LeonRole.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateUser(adminUserId: string, targetUserId: string, dto: UpdateLeonUserDto) {
    const user = await this.prisma.leonUser.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    if (adminUserId === targetUserId && dto.isActive === false) {
      throw new BadRequestException('Administrators cannot deactivate their own account');
    }

    if (adminUserId === targetUserId && dto.role && dto.role !== LeonRole.ADMIN) {
      throw new BadRequestException('Administrators cannot demote their own account');
    }

    return this.prisma.leonUser.update({
      where: { id: targetUserId },
      data: {
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async resetPassword(targetUserId: string, dto: ResetLeonPasswordDto) {
    const user = await this.prisma.leonUser.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.leonUser.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });

    return { message: `Password reset successfully for user ${targetUserId}` };
  }

  async deleteUser(adminUserId: string, targetUserId: string) {
    if (adminUserId === targetUserId) {
      throw new BadRequestException('Administrators cannot delete their own account');
    }

    const user = await this.prisma.leonUser.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found`);
    }

    await this.prisma.leonUser.delete({
      where: { id: targetUserId },
    });

    return { message: `User ${targetUserId} deleted successfully` };
  }
}
