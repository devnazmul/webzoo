import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const lastMessage = await prisma.message.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log(lastMessage);
  if (lastMessage) {
    try {
      const parsed = JSON.parse(lastMessage.content);
      console.log('Parsed mentions:', parsed.mentions);
    } catch(e) {
      console.log('Could not parse content as JSON');
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
