import { Controller, Get, Header } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  list() {
    return this.service.list();
  }
}

@Controller('countries')
export class CountriesController {
  constructor(@InjectModel('Country') private readonly countries: Model<Record<string, unknown>>) {}

  @Get()
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  list() {
    return this.countries.find({ isActive: true }).select('code name order').sort({ order: 1, name: 1 }).lean();
  }
}
