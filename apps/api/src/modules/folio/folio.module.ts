import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { FolioController } from './folio.controller';
import { FolioService } from './folio.service';
import { FolioRoutingService } from './folio-routing.service';

@Module({
  imports: [WebhookModule],
  controllers: [FolioController],
  providers: [FolioService, FolioRoutingService],
  exports: [FolioService, FolioRoutingService],
})
export class FolioModule {}
