import { client, db, matches } from "@beefurca/database";
import { eq } from "drizzle-orm";

export interface SSEClient {
  id: string;
  send: (data: string) => void;
  close: () => void;
}

/**
 * Внутрипроцессный реестр SSE-подписчиков на каждый турнир. Сами события
 * приходят из PostgreSQL (LISTEN/NOTIFY), поэтому при нескольких инстансах API
 * каждый инстанс рассылает обновление только своим локальным подписчикам.
 */
class SSEManager {
  private tournamentClients = new Map<string, SSEClient[]>();

  public registerClient(tournamentId: string, client: SSEClient): void {
    if (!this.tournamentClients.has(tournamentId)) {
      this.tournamentClients.set(tournamentId, []);
    }
    this.tournamentClients.get(tournamentId)!.push(client);
    console.log(
      `SSE Client ${client.id} registered for tournament ${tournamentId}. Total: ${this.getClientCount(tournamentId)}`
    );
  }

  public removeClient(tournamentId: string, clientId: string): void {
    const clients = this.tournamentClients.get(tournamentId);
    if (clients) {
      const filtered = clients.filter((c) => c.id !== clientId);
      if (filtered.length === 0) {
        this.tournamentClients.delete(tournamentId);
      } else {
        this.tournamentClients.set(tournamentId, filtered);
      }
      console.log(
        `SSE Client ${clientId} disconnected from tournament ${tournamentId}. Remaining: ${filtered.length}`
      );
    }
  }

  public broadcastUpdate(tournamentId: string, data: any): void {
    const clients = this.tournamentClients.get(tournamentId);
    if (!clients || clients.length === 0) return;

    const payload = JSON.stringify(data);
    const sseMessage = `event: update\ndata: ${payload}\n\n`;

    clients.forEach((c) => {
      try {
        c.send(sseMessage);
      } catch (err) {
        console.error(`Failed to send SSE to client ${c.id}:`, err);
      }
    });
  }

  private getClientCount(tournamentId: string): number {
    return this.tournamentClients.get(tournamentId)?.length || 0;
  }
}

export const sseManager = new SSEManager();

// Канал PostgreSQL для оповещения об изменениях сетки турнира
const SSE_CHANNEL = "tournament_update";

/**
 * Публикует событие обновления турнира во ВСЕ инстансы API через PostgreSQL
 * NOTIFY. Полезная нагрузка - id турнира; сами данные сетки каждый инстанс
 * подтягивает у себя в обработчике LISTEN.
 */
export async function publishTournamentUpdate(tournamentId: string): Promise<void> {
  try {
    await client.notify(SSE_CHANNEL, tournamentId);
  } catch (err) {
    console.error("SSE publish (pg NOTIFY) failed:", err);
  }
}

let listenerStarted = false;

/**
 * Подписывается на PostgreSQL LISTEN. При получении уведомления подтягивает
 * актуальные матчи турнира и рассылает локальным SSE-подписчикам.
 * Вызывается один раз при старте сервера.
 */
export async function startSseListener(): Promise<void> {
  if (listenerStarted) return;
  listenerStarted = true;

  await client.listen(SSE_CHANNEL, async (payload: string) => {
    const tournamentId = payload;
    if (!tournamentId) return;
    try {
      const updated = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, tournamentId));
      sseManager.broadcastUpdate(tournamentId, updated);
    } catch (err) {
      console.error("SSE listener broadcast failed:", err);
    }
  });

  console.log(`SSE: subscribed to PostgreSQL LISTEN channel "${SSE_CHANNEL}"`);
}
