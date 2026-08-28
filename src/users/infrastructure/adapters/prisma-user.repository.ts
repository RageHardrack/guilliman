import { Injectable } from '@nestjs/common';

import { User as PrismaUser } from '@prisma/client';

import { User } from '../../domain/user.entity';
import { UserRepositoryPort } from '../../application/ports/user.repository.port';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<User> {
    const data = {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      taxProfileEnabled: user.taxProfileEnabled,
      taxCountry: user.taxCountry,
      taxRuc: user.taxRuc,
      updatedAt: user.updatedAt,
    };

    const saved = await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        ...data,
        createdAt: user.createdAt,
      },
      update: data,
    });

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: { id },
    });
    return found ? this.toDomain(found) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: { email },
    });
    return found ? this.toDomain(found) : null;
  }

  async findAll(): Promise<User[]> {
    const list = await this.prisma.user.findMany();
    return list.map((item) => this.toDomain(item));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toDomain(raw: PrismaUser): User {
    return new User({
      id: raw.id,
      email: raw.email,
      password: raw.password,
      name: raw.name,
      taxProfileEnabled: raw.taxProfileEnabled,
      taxCountry: raw.taxCountry,
      taxRuc: raw.taxRuc,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
