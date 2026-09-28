import { prisma } from "@/lib/db";
export { NUKUS_BOX_CATALOG, type NukusBoxModel } from "./nukus-boxes-catalog";


export const ULUGPEK_CLIENT_NAME = "Улугбек";
export const ULUGPEK_COMPANY_NAME = "Нукус гуллери";

/**
 * Находит или создает в базе контрагента Улугбек (Нукус гуллери)
 */
export async function getOrCreateUlugbekClient() {
  let client = await prisma.client.findFirst({
    where: {
      OR: [
        { name: ULUGPEK_CLIENT_NAME },
        { company: { contains: "Нукус гуллери" } },
      ],
    },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: ULUGPEK_CLIENT_NAME,
        company: ULUGPEK_COMPANY_NAME,
        phone: "+998 90 735-00-11",
        notes: "Постоянный заказчик подарочных и цветочных коробок цеха",
      },
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
