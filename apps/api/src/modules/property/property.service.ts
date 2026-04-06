import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { properties } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertyService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(dto: CreatePropertyDto) {
    const [property] = await this.db
      .insert(properties)
      .values(dto)
      .returning();
    return property;
  }

  async findAll() {
    return this.db.select().from(properties).where(eq(properties.isActive, true));
  }

  async findById(id: string) {
    const [property] = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    if (!property) {
      throw new NotFoundException(`Property ${id} not found`);
    }
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto) {
    const [property] = await this.db
      .update(properties)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    if (!property) {
      throw new NotFoundException(`Property ${id} not found`);
    }
    return property;
  }
}
