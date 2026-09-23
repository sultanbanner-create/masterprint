const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const secret = "masterprint_advertising_agency_secret_2026_jwt_salt";

function hash(pwd) {
  return crypto.createHash("sha256").update(pwd + secret).digest("hex");
}

async function main() {
  await prisma.employee.updateMany({
    where: { name: "Тимур" },
    data: { login: "timur", passwordHash: hash("timur2026") },
  });

  await prisma.employee.updateMany({
    where: { name: "Жалгас" },
    data: { login: "zhalgas", passwordHash: hash("zhalgas2026") },
  });

  await prisma.employee.updateMany({
    where: { name: "Абзал" },
    data: { login: "abzal", passwordHash: hash("abzal2026") },
  });

  await prisma.employee.updateMany({
    where: { name: "Альберт" },
    data: { login: "albert", passwordHash: hash("albert2026") },
  });

  const all = await prisma.employee.findMany({
    select: { id: true, name: true, login: true, role: true, roleTitle: true },
  });

  console.log("Updated employees with login/password:", all);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
