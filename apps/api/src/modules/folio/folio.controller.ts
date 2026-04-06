import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FolioService } from './folio.service';

@ApiTags('folios')
@Controller('folios')
export class FolioController {
  constructor(private readonly folioService: FolioService) {}

  @Get()
  @ApiOperation({ summary: 'Get all folios' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllFolios() {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folio by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getFolioById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post(':id/charges')
  @ApiOperation({ summary: 'Add charge to folio' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  addChargeToFolio(@Param('id') id: string, @Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Get(':id/charges')
  @ApiOperation({ summary: 'Get folio charges' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getFolioCharges(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }
}
