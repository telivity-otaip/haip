import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PropertyService } from './property.service';

@ApiTags('properties')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all properties' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllProperties() {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getPropertyById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post()
  @ApiOperation({ summary: 'Create new property' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createProperty(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update property' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  updateProperty(@Param('id') id: string, @Body() body: any) {
    return { message: 'Not implemented' };
  }
}
