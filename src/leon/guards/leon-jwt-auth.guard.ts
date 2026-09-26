import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LeonJwtAuthGuard extends AuthGuard('leon-jwt') {}
