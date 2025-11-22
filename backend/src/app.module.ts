import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FamiliesModule } from './families/families.module';
import { VariantsModule } from './variants/variants.module';
import { FieldsModule } from './fields/fields.module';
import { ProductsModule } from './products/products.module';
import { ProductGeneratedInfoModule } from './product-generated-info/product-generated-info.module';
import { ProductTypesModule } from './product-types/product-types.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    FamiliesModule,
    VariantsModule,
    FieldsModule,
    ProductsModule,
    ProductGeneratedInfoModule,
    ProductTypesModule,
  ],
})
export class AppModule {}

