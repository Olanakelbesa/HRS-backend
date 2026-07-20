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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsApiService = void 0;
const common_1 = require("@nestjs/common");
const appointmentService = __importStar(require("./service"));
let AppointmentsApiService = class AppointmentsApiService {
    bookAppointment(userId, userRole, input) {
        return appointmentService.bookAppointment(userId, userRole, input);
    }
    listMyAppointmentsForRenter(userId, userRole, query) {
        return appointmentService.listMyAppointmentsForRenter(userId, userRole, query);
    }
    getRenterAppointmentById(userId, userRole, appointmentId) {
        return appointmentService.getRenterAppointmentById(userId, userRole, appointmentId);
    }
    getAppointmentById(userId, userRole, appointmentId) {
        return appointmentService.getAppointmentById(userId, userRole, appointmentId);
    }
    cancelRenterAppointment(userId, userRole, appointmentId) {
        return appointmentService.cancelRenterAppointment(userId, userRole, appointmentId);
    }
    listAppointments(userId, userRole, query) {
        return appointmentService.listAppointments(userId, userRole, query);
    }
    updateAppointmentStatus(userId, userRole, appointmentId, input) {
        return appointmentService.updateAppointmentStatus(userId, userRole, appointmentId, input);
    }
    deleteAppointment(userId, userRole, appointmentId) {
        return appointmentService.deleteAppointment(userId, userRole, appointmentId);
    }
    updateAppointmentNote(userId, userRole, appointmentId, input) {
        return appointmentService.updateAppointmentNote(userId, userRole, appointmentId, input);
    }
    getAvailability(options) {
        return appointmentService.getAvailability(options);
    }
};
exports.AppointmentsApiService = AppointmentsApiService;
exports.AppointmentsApiService = AppointmentsApiService = __decorate([
    (0, common_1.Injectable)()
], AppointmentsApiService);
