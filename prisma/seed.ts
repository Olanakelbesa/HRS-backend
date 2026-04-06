/// <reference types="node" />
import { PrismaClient, Role, PropertyType, PropertyStatus, UserStatus, VerificationState, AgreementStatus, PaymentStatus, ReportStatus, ReportTargetType, VerificationDocumentType, VerificationStatus, ReviewStatus, ReviewTargetType, AppointmentStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Clean up before seeding
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.verificationDocument.deleteMany();
  await prisma.report.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();
  
  // 1. Seed Users (Admin, Owners, Renters)
  const passwordHash = await bcrypt.hash('Password123!', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@smartrental.com',
      password: passwordHash,
      first_name: 'Super',
      last_name: 'Admin',
      phone: '+251 900 000 000',
      role: Role.admin,
      isVerified: true,
      verificationState: VerificationState.verified,
      status: UserStatus.active
    }
  });

  const owner1 = await prisma.user.create({
    data: {
      email: 'michael.c@example.com',
      password: passwordHash,
      first_name: 'Michael',
      last_name: 'Chen',
      phone: '+251 911 111 111',
      role: Role.owner,
      isVerified: true,
      verificationState: VerificationState.verified,
      status: UserStatus.active,
      image: 'https://i.pravatar.cc/150?u=michael'
    }
  });

  const owner2 = await prisma.user.create({
    data: {
      email: 'sarah.j@example.com',
      password: passwordHash,
      first_name: 'Sarah',
      last_name: 'Jenkins',
      phone: '+251 922 222 222',
      role: Role.owner,
      isVerified: false,
      verificationState: VerificationState.pending_documents,
      status: UserStatus.active,
      image: 'https://i.pravatar.cc/150?u=sarah'
    }
  });

  const owner3 = await prisma.user.create({
    data: {
      email: 'david.v@example.com',
      password: passwordHash,
      first_name: 'David',
      last_name: 'Vance',
      phone: '+251 933 333 333',
      role: Role.owner,
      isVerified: false,
      verificationState: VerificationState.rejected,
      status: UserStatus.suspended,
      image: 'https://i.pravatar.cc/150?u=david'
    }
  });

  const owner4 = await prisma.user.create({
    data: {
      email: 'mulugeta.a@example.com',
      password: passwordHash,
      first_name: 'Mulugeta',
      last_name: 'Abebe',
      phone: '+251 911 234 567',
      role: Role.owner,
      isVerified: false,
      verificationState: VerificationState.pending_documents,
      status: UserStatus.active
    }
  });

  const renter1 = await prisma.user.create({
    data: {
      email: 'dawit.g@example.com',
      password: passwordHash,
      first_name: 'Dawit',
      last_name: 'Gebre',
      phone: '+251 944 444 444',
      role: Role.renter,
      isVerified: true,
      status: UserStatus.active,
      image: 'https://i.pravatar.cc/150?u=dawit'
    }
  });

  const renter2 = await prisma.user.create({
    data: {
      email: 'hana.b@example.com',
      password: passwordHash,
      first_name: 'Hana',
      last_name: 'Bekele',
      phone: '+251 955 555 555',
      role: Role.renter,
      isVerified: true,
      status: UserStatus.active,
      image: 'https://i.pravatar.cc/150?u=hana'
    }
  });

  console.log('Created Users');

  // 2. Seed Verification Documents
  await prisma.verificationDocument.createMany({
    data: [
      { userId: owner2.id, documentType: VerificationDocumentType.national_id, documentUrl: 'https://example.com/id.jpg', status: VerificationStatus.pending },
      { userId: owner3.id, documentType: VerificationDocumentType.national_id, documentUrl: 'https://example.com/id2.jpg', status: VerificationStatus.rejected },
      { userId: owner4.id, documentType: VerificationDocumentType.national_id, documentUrl: 'https://example.com/id4.jpg', status: VerificationStatus.pending },
      { userId: owner4.id, documentType: VerificationDocumentType.passport, documentUrl: 'https://example.com/pass.jpg', status: VerificationStatus.pending }
    ]
  });

  console.log('Created Verification Docs');

  // 3. Seed Properties
  const prop1 = await prisma.property.create({
    data: {
      ownerId: owner1.id,
      title: "Horizon Peak Villa",
      description: "A beautiful villa overlooking the city.",
      location: "Bole, Addis Ababa",
      type: PropertyType.VILLA,
      status: PropertyStatus.PENDING,
      price: 45000,
      amenities: ["WiFi", "Parking", "CCTV", "Balcony"],
      images: ["https://example.com/horizon.jpg"],
      bedrooms: 4,
      bathrooms: 3,
      area: 250
    }
  });

  const prop2 = await prisma.property.create({
    data: {
      ownerId: owner2.id,
      title: "Urban Loft 42",
      description: "Modern loft in the heart of the city.",
      location: "Kazanchis, Addis Ababa",
      type: PropertyType.APARTMENT,
      status: PropertyStatus.AVAILABLE,
      price: 25000,
      amenities: ["WiFi", "Elevator"],
      images: ["https://example.com/loft.jpg"],
      bedrooms: 2,
      bathrooms: 1,
      area: 90
    }
  });

  const prop3 = await prisma.property.create({
    data: {
      ownerId: owner3.id,
      title: "Suspicious Listing",
      description: "Cheap house, call me directly.",
      location: "Megenagna, Addis Ababa",
      type: PropertyType.HOUSE,
      status: PropertyStatus.UNAVAILABLE,
      price: 5000,
      amenities: [],
      images: [],
      bedrooms: 1,
      bathrooms: 1,
      area: 50
    }
  });

  const prop4 = await prisma.property.create({
    data: {
      ownerId: owner1.id,
      title: "Cottage by the Lake",
      description: "Perfect family home.",
      location: "Hawassa",
      type: PropertyType.HOUSE,
      status: PropertyStatus.RENTED,
      price: 15000,
      amenities: ["Garden", "Water Tank"],
      images: ["https://example.com/cottage.jpg"],
      bedrooms: 3,
      bathrooms: 2,
      area: 120
    }
  });

  console.log('Created Properties');

  // 4. Seed Agreements
  const ag1 = await prisma.agreement.create({
    data: {
      propertyId: prop1.id,
      renterId: renter1.id,
      ownerId: owner1.id,
      monthlyRent: 45000,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-04-01'),
      status: AgreementStatus.active,
      paymentStatus: PaymentStatus.confirmed,
    }
  });

  const ag2 = await prisma.agreement.create({
    data: {
      propertyId: prop2.id,
      renterId: renter2.id,
      ownerId: owner2.id,
      monthlyRent: 25000,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2027-05-01'),
      status: AgreementStatus.pending_owner,
      paymentStatus: PaymentStatus.pending,
    }
  });

  console.log('Created Agreements');

  // 5. Seed Reports
  await prisma.report.createMany({
    data: [
      {
        reportedById: renter1.id,
        targetId: owner3.id,
        targetType: ReportTargetType.user,
        category: "fraud",
        description: "Owner tried to increase rent mid-lease and refused maintenance.",
        status: ReportStatus.in_review
      },
      {
        reportedById: renter2.id,
        targetId: prop3.id,
        targetType: ReportTargetType.property,
        category: "false_advertising",
        description: "Property does not exist at the location.",
        status: ReportStatus.open
      }
    ]
  });

  console.log('Created Reports');

  // 6. Seed Reviews
  await prisma.review.createMany({
    data: [
      { reviewerId: renter1.id, targetType: ReviewTargetType.property, targetId: prop1.id, rating: 5, comment: "Outstanding property! Exceeded all expectations.", status: ReviewStatus.published },
      { reviewerId: renter2.id, targetType: ReviewTargetType.property, targetId: prop2.id, rating: 4, comment: "Great location and reasonable price.", status: ReviewStatus.published },
      { reviewerId: renter1.id, targetType: ReviewTargetType.owner, targetId: owner1.id, rating: 5, comment: "Michael is very professional and responds quickly.", status: ReviewStatus.published },
      { reviewerId: renter2.id, targetType: ReviewTargetType.owner, targetId: owner3.id, rating: 1, comment: "Terrible experience with this owner.", status: ReviewStatus.flagged },
      { reviewerId: admin.id, targetType: ReviewTargetType.property, targetId: prop3.id, rating: 5, comment: "Best apartment ever!!! Contact me for WhatsApp.", status: ReviewStatus.removed },
    ]
  });

  console.log('Created Reviews');

  // 7. Seed Notifications
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: NotificationType.MESSAGE_NEW, title: "New Document Submission", body: "Mulugeta Abebe submitted documents for verification.", payload: {} },
      { userId: admin.id, type: NotificationType.MESSAGE_NEW, title: "Fraud Report Filed", body: "Report #RPT-7430 against property listing.", payload: {} },
      { userId: renter1.id, type: NotificationType.APPOINTMENT_BOOKED, title: "Agreement Activated", body: "Your agreement for Horizon Peak Villa is now active.", payload: {} }
    ]
  });

  console.log('Created Notifications');

  // 8. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, eventType: "USER_SUSPENDED", entityType: "User", entityId: owner3.id, metadata: { reason: "Multiple fraud reports" } },
      { actorId: admin.id, eventType: "PROPERTY_APPROVED", entityType: "Property", entityId: prop4.id, metadata: {} },
    ]
  });

  console.log('Created Audit Logs');
  console.log('Seeding Complete! 🎉');
}

main()
  .catch((e) => {
    console.error('Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
