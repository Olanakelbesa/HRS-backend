import { Global, Module } from '@nestjs/common';
import { ChapaService } from './chapa.service';

@Global()
@Module({
  providers: [ChapaService],
  exports: [ChapaService],
})
export class PaymentsInfraModule {}
