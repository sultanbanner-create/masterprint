import { prisma } from "@/lib/db";
export { NUKUS_BOX_CATALOG, type NukusBoxModel } from "./nukus-boxes-catalog";


export const ULUGPEK_CLIENT_NAME = "Улугбек";
export const ULUGPEK_COMPANY_NAME = "Нукус гуллери";
export const ULUGPEK_PHONE = "+998934856006";
export const ULUGPEK_PHONE_FORMATTED = "+998 93 485-60-06";
export const ULUGPEK_TELEGRAM_LINK = "https://t.me/+998934856006";

/**
 * Находит или создает в базе контрагента Улугбек (Нукус гуллери)
 */
export async function getOrCreateUlugbekClient() {
  let client = await prisma.client.findFirst({
    where: {
      OR: [
        { name: ULUGPEK_CLIENT_NAME },
        { company: { contains: "Нукус гуллери" } },
        { phone: { contains: "934856006" } },
      ],
    },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: ULUGPEK_CLIENT_NAME,
        company: ULUGPEK_COMPANY_NAME,
        phone: ULUGPEK_PHONE_FORMATTED,
        notes: "Постоянный заказчик подарочных и цветочных коробок цеха Nukus Gulleri",
      },
    });
  } else if (!client.phone || client.phone.includes("735")) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { phone: ULUGPEK_PHONE_FORMATTED },
    });
  }

  return client;
}

/**
 * Находит сотрудника мастера Абзала
 */
export async function getAbzalEmployee() {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { login: "abzal" },
        { name: "Абзал" },
        { role: "WORKSHOP_ASSEMBLY" },
      ],
    },
  });

  return employee;
}
