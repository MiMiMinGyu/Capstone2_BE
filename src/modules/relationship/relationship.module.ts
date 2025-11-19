import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RelationshipController } from './relationship.controller';
import { RelationshipService } from './relationship.service';

@Module({
  imports: [PrismaModule],
  controllers: [RelationshipController],
  providers: [RelationshipService],
  exports: [RelationshipService],
})
export class RelationshipModule {}
