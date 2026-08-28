import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
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
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        taxProfileEnabled: user.taxProfileEnabled,
        taxCountry: user.taxCountry,
        taxRuc: user.taxRuc,
        createdAt: user.createdAt,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tu cuenta ha sido desactivada temporalmente. Contacta al administrador.',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        taxProfileEnabled: user.taxProfileEnabled,
        taxCountry: user.taxCountry,
        taxRuc: user.taxRuc,
        createdAt: user.createdAt,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      taxProfileEnabled: user.taxProfileEnabled,
      taxCountry: user.taxCountry,
      taxRuc: user.taxRuc,
      createdAt: user.createdAt,
    };
  }
}
