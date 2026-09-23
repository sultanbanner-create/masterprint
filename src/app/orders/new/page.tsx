import { prisma } from "@/lib/db";
import { OrderCalculator } from "@/components/OrderCalculator";

export const revalidate = 0;

export default async function NewOrderPage() {
  const employees = await prisma.employee.findMany();

  return <OrderCalculator employees={employees} />;
}
