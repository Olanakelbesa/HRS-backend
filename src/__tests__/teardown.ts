import prisma from '../config/database';

export default async () => {
  await prisma.$disconnect();
};
