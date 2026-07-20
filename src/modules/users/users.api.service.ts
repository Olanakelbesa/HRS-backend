import { Injectable } from '@nestjs/common';
import * as usersService from './service';
import type { UpdateProfileInput, ChangePasswordInput } from './schema';

@Injectable()
export class UsersApiService {
  getProfile(userId: string) {
    return usersService.getProfile(userId);
  }

  getOwnerProfile(ownerId: string) {
    return usersService.getOwnerProfile(ownerId);
  }

  updateProfile(userId: string, input: UpdateProfileInput) {
    return usersService.updateProfile(userId, input);
  }

  changePassword(userId: string, data: ChangePasswordInput) {
    return usersService.changePassword(userId, data);
  }

  getAllUsers() {
    return usersService.getAllUsers();
  }

  updateUserRole(userId: string, role: 'renter' | 'owner' | 'admin') {
    return usersService.updateUserRole(userId, role);
  }

  updateUserStatus(userId: string, isActive: boolean) {
    return usersService.updateUserStatus(userId, isActive);
  }
}
