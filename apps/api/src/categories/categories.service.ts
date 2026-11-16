import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CategoryDto } from '@voxzin/shared';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel('Category') private readonly categories: Model<Record<string, unknown>>) {}

  async list(): Promise<CategoryDto[]> {
    const rows = await this.categories
      .find({ isActive: true })
      .sort({ order: 1 })
      .lean<{ slug: string; name: string; description?: string }[]>();
    return rows.map((c) => ({ slug: c.slug, name: c.name, description: c.description ?? '' }));
  }
}
