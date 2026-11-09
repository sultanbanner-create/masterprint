// Установка пароля сотруднику из командной строки (если забыли пароль директора).
// Пример:  node prisma/seed-auth.js timur "НовыйНадёжныйПароль"
// Пароли в этом файле больше не хранятся: раньше они были видны в открытом репозитории.

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function main() {
  const [login, password] = process.argv.slice(2);
  if (!login || !password || password.length < 8) {
    console.log('Использование: node prisma/seed-auth.js <логин> "<пароль от 8 символов>"');
    process.exit(1);
  }

  const result = await prisma.employee.updateMany({
    where: { login },
    data: { passwordHash: hashPassword(password) },
  });

  console.log(result.count ? `Пароль для «${login}» обновлён.` : `Сотрудник с логином «${login}» не найден.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
