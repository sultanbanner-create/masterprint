import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "asc" } },
        movements: { include: { material: true } },
        expenses: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await req.json();
    const { 
      status, 
      priority, 
      assignedToId, 
      deadline, 
      notes, 
      installAddress,
      completedBy,
      completedAt,
      isCompletedToggle,
    } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (notes !== undefined) data.notes = notes;
    if (installAddress !== undefined) data.installAddress = installAddress;
    if (completedBy !== undefined) data.completedBy = completedBy;
    if (completedAt !== undefined) data.completedAt = completedAt ? new Date(completedAt) : null;

    // Специальная обработка галочки выполнения
    if (isCompletedToggle === true) {
      data.status = "READY";
      data.completedBy = completedBy || "Мастер цеха";
      data.completedAt = new Date();
    } else if (isCompletedToggle === false) {
      data.completedBy = null;
      data.completedAt = null;
      // Если снимаем отметку, возвращаем в производственный статус
      const currentOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });
      const hasPrint = currentOrder?.items?.some((i) => i.serviceType === "BANNER" || i.serviceType === "ORACAL");
      data.status = hasPrint ? "PRINTING" : "ASSEMBLY";
    }

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: {
        client: true,
        assignedTo: true,
        items: true,
        payments: true,
      },
    });

    if (isCompletedToggle === true || status === "READY") {
      const performer = updated.completedBy || updated.assignedTo?.name || "Мастер цеха";
      await prisma.orderComment.create({
        data: {
          orderId: updated.id,
          authorName: performer,
          text: `✅ ГАЛОЧКА ВЫПОЛНЕНИЯ ПОСТАВЛЕНА: ${performer}.\nЗаказ полностью изготовлен и готов к выдаче / монтажу.`,
        },
      }).catch((e) => console.error("Order ready comment error:", e));
    } else if (isCompletedToggle === false) {
      const author = body.cancelledBy || "Сотрудник";
      await prisma.orderComment.create({
        data: {
          orderId: updated.id,
          authorName: author,
          text: `↩️ Отметка выполнения снята сотрудником ${author}. Наряд возвращен в работу со статусом «${updated.status}».`,
        },
      }).catch((e) => console.error("Order unready comment error:", e));
    }

    if (status || isCompletedToggle !== undefined) {
      try {
        const tgSetting = await prisma.telegramSetting.findUnique({ where: { id: "default" } });
        if (tgSetting && tgSetting.botToken && tgSetting.chatId && tgSetting.notifyStatus) {
          const STATUS_LABELS: Record<string, string> = {
            NEW: "Новый наряд",
            DESIGN: "Макет / Согласование (Жалгас)",
            PRINTING: "Широкоформатная печать (Альберт)",
            ASSEMBLY: "Сборка букв & коробов (Абзал)",
            MOUNTING: "Монтаж на объекте (Абзал)",
            READY: "Готов к выдаче/монтажу",
            COMPLETED: "Завершен & Оплачен",
          };

          const statusText = STATUS_LABELS[updated.status] || updated.status;
          const isReady = updated.status === "READY";
          const masterName = updated.completedBy || updated.assignedTo?.name || "Мастер цеха";

          const msg = isReady
            ? `🎉 <b>НАРЯД ГОТОВ К ВЫДАЧЕ! [${updated.orderNumber}]</b>\n\n` +
              `🏷 <b>Изделие:</b> ${updated.title}\n` +
              `👷 <b>Выполнил мастер:</b> ${masterName} ✅\n` +
              `⚡ <b>Статус:</b> Готов к выдаче клиенту / передаче на монтаж\n` +
              `👤 <b>Заказчик:</b> ${updated.client?.name || ""} (${updated.client?.phone || ""})\n` +
              `💰 <b>Сумма наряда:</b> ${Math.round(updated.totalAmount).toLocaleString("ru-RU")} сум`
            : `🔄 <b>Статус изменен: ${updated.orderNumber}</b>\n\n` +
              `🏷 <b>Изделие:</b> ${updated.title}\n` +
              `⚡ <b>Новый этап:</b> ${statusText}\n` +
              `👤 <b>Заказчик:</b> ${updated.client?.name || ""}\n` +
              (updated.assignedTo ? `👷 <b>Ответственный:</b> ${updated.assignedTo.name}\n` : "");

          fetch(`https://api.telegram.org/bot${tgSetting.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: tgSetting.chatId,
              text: msg,
              parse_mode: "HTML",
            }),
          }).catch((e) => console.error("Async TG status error:", e));
        }
      } catch (tgErr) {
        console.error("TG update notification error:", tgErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

// ПОЛНОЕ РЕДАКТИРОВАНИЕ НАРЯДА (ТОЛЬКО ДЛЯ АДМИНИСТРАТОРА/ДИРЕКТОРА)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Проверка прав: ТОЛЬКО ДИРЕКТОР (АДМИН)
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || currentUser.role !== "DIRECTOR") {
      return NextResponse.json(
        { error: "Доступ запрещен. Редактирование заказа разрешено только Директору (Админу)." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      client,
      assignedToId,
      status,
      priority,
      deadline,
      installAddress,
      notes,
      totalAmount,
      paidAmount,
      debtAmount,
      items,
    } = body;

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { client: true, items: true },
    });
    if (!currentOrder) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });

    // 1. Обновляем данные клиента
    if (client && currentOrder.clientId) {
      await prisma.client.update({
        where: { id: currentOrder.clientId },
        data: {
          name: client.name || currentOrder.client.name,
          phone: client.phone !== undefined ? client.phone : currentOrder.client.phone,
          company: client.company !== undefined ? client.company : currentOrder.client.company,
        },
      });
    }

    // 2. Подготовка позиций сметы
    let calculatedTotal = 0;
    const itemsData = (items || []).map((it: any) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const unit = Number(it.unitPrice) || 0;
      const total = Number(it.totalPrice) || Math.round(q * unit);
      calculatedTotal += total;

      return {
        orderId: id,
        serviceType: it.serviceType || "CUSTOM",
        title: it.title || "Позиция заказа",
        width: it.width ? Number(it.width) : null,
        height: it.height ? Number(it.height) : null,
        area: it.area ? Number(it.area) : null,
        quantity: q,
        letterHeight: it.letterHeight ? Number(it.letterHeight) : null,
        letterCount: it.letterCount ? Number(it.letterCount) : null,
        letterText: it.letterText || null,
        options: it.options || null,
        unitPrice: unit,
        totalPrice: total,
      };
    });

    const finalTotal = totalAmount !== undefined ? Number(totalAmount) : calculatedTotal;
    const finalPaid = paidAmount !== undefined ? Number(paidAmount) : currentOrder.paidAmount;
    const finalDebt = debtAmount !== undefined ? Number(debtAmount) : Math.max(0, finalTotal - finalPaid);

    // 3. Выполняем транзакцию обновления заказа и замены позиций
    const updated = await prisma.$transaction(async (tx) => {
      if (items && Array.isArray(items)) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        if (itemsData.length > 0) {
          await tx.orderItem.createMany({ data: itemsData });
        }
      }

      return await tx.order.update({
        where: { id },
        data: {
          title: title !== undefined ? title : currentOrder.title,
          assignedToId: assignedToId !== undefined ? (assignedToId || null) : currentOrder.assignedToId,
          status: status || currentOrder.status,
          priority: priority || currentOrder.priority,
          deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : currentOrder.deadline,
          installAddress: installAddress !== undefined ? (installAddress || null) : currentOrder.installAddress,
          notes: notes !== undefined ? notes : currentOrder.notes,
          totalAmount: finalTotal,
          paidAmount: finalPaid,
          debtAmount: finalDebt,
        },
        include: {
          client: true,
          assignedTo: true,
          items: true,
          payments: { orderBy: { createdAt: "desc" } },
          comments: { orderBy: { createdAt: "asc" } },
          movements: { include: { material: true } },
        },
      });
    });

    // 4. Логируем аудит-комментарий
    await prisma.orderComment.create({
      data: {
        orderId: id,
        authorName: currentUser.name || "Директор",
        text: `✏️ Заказ отредактирован Администратором (${currentUser.name}). Новая сумма: ${Math.round(finalTotal).toLocaleString("ru-RU")} сум.`,
      },
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to edit order via admin:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка сервера при редактировании заказа" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Проверка прав: ТОЛЬКО ДИРЕКТОР (АДМИН)
    const cookieStore = cookies();
    const token = cookieStore.get("mp_auth_session")?.value;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || currentUser.role !== "DIRECTOR") {
      return NextResponse.json(
        { error: "Доступ запрещен. Удаление заказа разрешено только Директору (Админу)." },
        { status: 403 }
      );
    }

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}

