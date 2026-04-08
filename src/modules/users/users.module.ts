/**
 * UsersModule - Encapsulates user management.
 *
 * Exports UsersService so the auth module can use it
 * for login validation and registration.
 */
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
