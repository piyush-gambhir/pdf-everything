import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'API gateway liveness' })
  health() {
    return { status: 'ok', service: 'pdf-everything-api' };
  }
}
