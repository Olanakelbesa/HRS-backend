-- Add CANCELLED to AppointmentStatus enum
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
