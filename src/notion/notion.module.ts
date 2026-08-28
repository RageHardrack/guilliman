import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Client } from '@notionhq/client';

export const NOTION_CLIENT = 'NOTION_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NOTION_CLIENT,
      useFactory: (configService: ConfigService) => {
        const auth = configService.get<string>('NOTION_API_KEY');
        return new Client({ auth });
      },
      inject: [ConfigService],
    },
  ],
  exports: [NOTION_CLIENT],
})
export class NotionModule {}
