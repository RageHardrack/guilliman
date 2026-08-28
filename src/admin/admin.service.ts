import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { CreateAdminUserDto } from './dtos/create-user.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateAdminUserDto } from './dtos/update-user.dto';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        taxProfileEnabled: true,
        taxCountry: true,
        taxRuc: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accounts: true,
            transactions: true,
            subscriptions: true,
            loans: true,
            savingsGoals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createUser(dto: CreateAdminUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role ?? Role.USER,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        taxProfileEnabled: dto.taxProfileEnabled !== undefined ? dto.taxProfileEnabled : false,
        taxCountry: dto.taxCountry || 'PE',
        taxRuc: dto.taxRuc || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        taxProfileEnabled: true,
        taxCountry: true,
        taxRuc: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accounts: true,
            transactions: true,
            subscriptions: true,
            loans: true,
            savingsGoals: true,
          },
        },
      },
    });

    return user;
  }

  async updateUser(
    currentAdminId: string,
    userId: string,
    dto: UpdateAdminUserDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (currentAdminId === userId && dto.isActive === false) {
      throw new BadRequestException(
        'No puedes desactivar tu propia cuenta de administrador.',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name !== undefined ? dto.name : user.name,
        role: dto.role !== undefined ? dto.role : user.role,
        isActive: dto.isActive !== undefined ? dto.isActive : user.isActive,
        taxProfileEnabled:
          dto.taxProfileEnabled !== undefined
            ? dto.taxProfileEnabled
            : user.taxProfileEnabled,
        taxCountry: dto.taxCountry !== undefined ? dto.taxCountry : user.taxCountry,
        taxRuc: dto.taxRuc !== undefined ? dto.taxRuc : user.taxRuc,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        taxProfileEnabled: true,
        taxCountry: true,
        taxRuc: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            accounts: true,
            transactions: true,
            subscriptions: true,
            loans: true,
            savingsGoals: true,
          },
        },
      },
    });
  }

  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente.',
    };
  }

  async deleteUser(currentAdminId: string, userIdToDelete: string) {
    if (currentAdminId === userIdToDelete) {
      throw new BadRequestException(
        'No puedes eliminar tu propia cuenta de administrador.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userIdToDelete },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    await this.prisma.user.delete({
      where: { id: userIdToDelete },
    });

    return {
      success: true,
      message: 'Usuario eliminado exitosamente.',
    };
  }
}
