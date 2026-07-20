"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileApiService = void 0;
const common_1 = require("@nestjs/common");
const profileService = __importStar(require("./service"));
const service_1 = __importDefault(require("../recommendation/service"));
let ProfileApiService = class ProfileApiService {
    getProfile(userId) {
        return profileService.getProfile(userId);
    }
    updatePersonalInfo(userId, data, file) {
        return profileService.updatePersonalInfo(userId, data, file);
    }
    uploadDocument(userId, documentType, file) {
        return profileService.uploadDocument(userId, documentType, file);
    }
    getVerificationDoc(userId) {
        return profileService.getVerificationDoc(userId);
    }
    updateBankDetails(userId, data) {
        return profileService.updateBankDetails(userId, data);
    }
    updateNotificationPreferences(userId, data) {
        return profileService.updateNotificationPreferences(userId, data);
    }
    updateLanguagePreference(userId, data) {
        return profileService.updateLanguagePreference(userId, data);
    }
    changePassword(userId, data) {
        return profileService.changePassword(userId, data);
    }
    getPreferences(userId) {
        return service_1.default.getPreferences(userId);
    }
    savePreferences(userId, data) {
        return service_1.default.savePreferences(userId, data);
    }
    updatePreferences(userId, data) {
        return service_1.default.updatePreferences(userId, data);
    }
};
exports.ProfileApiService = ProfileApiService;
exports.ProfileApiService = ProfileApiService = __decorate([
    (0, common_1.Injectable)()
], ProfileApiService);
