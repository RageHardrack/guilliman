import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Client } from '@notionhq/client';

import { LanguagesService } from './languages.service';
import { NOTION_CLIENT } from './notion.constants';

export { NOTION_CLIENT } from './notion.constants';

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
    LanguagesService,
  ],
  exports: [NOTION_CLIENT, LanguagesService],
})
export class NotionModule {}
