import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HousekeepingService } from './housekeeping.service';

@ApiTags('housekeeping')
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Get('/tasks')
  @ApiOperation({ summary: 'Get all housekeeping tasks' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllTasks() {
    return { message: 'Not implemented' };
  }

  @Get('/tasks/:id')
  @ApiOperation({ summary: 'Get housekeeping task by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getTaskById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post('/tasks')
  @ApiOperation({ summary: 'Create new housekeeping task' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createTask(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Post('/tasks/:id/assign')
  @ApiOperation({ summary: 'Assign housekeeping task' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  assignTask(@Param('id') id: string, @Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Post('/tasks/:id/complete')
  @ApiOperation({ summary: 'Mark housekeeping task as complete' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  completeTask(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }
}
