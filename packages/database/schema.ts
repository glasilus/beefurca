import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nickname: text("nickname").notNull().unique(),
    email: text("email").notNull().unique(),
    // ФИО и телефон — опциональные контактные данные (требование ТЗ кафедры).
    fullName: text("full_name"),
    phone: text("phone"),
    // passwordHash допускает NULL: пользователи, вошедшие через Discord OAuth,
    // не имеют локального пароля.
    passwordHash: text("password_hash"),
    // Идентификатор аккаунта Discord (snowflake) для OAuth-входа. NULL для
    // обычных пользователей. UNIQUE, но допускает несколько NULL в PostgreSQL.
    discordId: text("discord_id").unique(),
    role: text("role", { enum: ["Player", "Organizer", "Admin"] })
      .default("Player")
      .notNull(),
    elo: integer("elo").default(1000).notNull(),
    isTrusted: boolean("is_trusted").default(false).notNull(),
    isBanned: boolean("is_banned").default(false).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nicknameIdx: uniqueIndex("users_nickname_idx").on(table.nickname),
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    discordIdx: uniqueIndex("users_discord_id_idx").on(table.discordId),
  })
);

// 2. Teams Table
export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    captainId: uuid("captain_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    // Софт-делит: распущенная команда скрыта из активных списков, но строка
    // сохраняется ради целостности истории турниров (FK на team_id).
    isDisbanded: boolean("is_disbanded").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("teams_name_idx").on(table.name),
  })
);

// 3. Team Members Table (Many-to-Many relation)
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    playerId: uuid("player_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    teamPlayerUnique: uniqueIndex("team_player_unique_idx").on(
      table.teamId,
      table.playerId
    ),
  })
);

// 4. Disciplines Table
export const disciplines = pgTable(
  "disciplines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    gameType: text("game_type", { enum: ["SINGLE", "TEAM"] }).notNull(),
    rules: text("rules"),
    isActive: boolean("is_active").default(true).notNull(),
    // Официальная (курируется администратором, влияет на «официальный» рейтинг)
    // или пользовательская дисциплина, заведённая обычным игроком на лету.
    // Ядро платформы: любой может создать дисциплину под любое соревнование.
    isOfficial: boolean("is_official").default(false).notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("disciplines_name_idx").on(table.name),
  })
);

// 5. Tournaments Table
export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    disciplineId: uuid("discipline_id")
      .references(() => disciplines.id, { onDelete: "restrict" })
      .notNull(),
    organizerId: uuid("organizer_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    tournamentType: text("tournament_type", {
      enum: ["PRO", "AMATEUR", "SANDBOX"],
    }).notNull(),
    bracketType: text("bracket_type", {
      enum: ["SINGLE_ELIM", "DOUBLE_ELIM", "ROUND_ROBIN", "SWISS"],
    }).notNull(),
    description: text("description"),
    prizePool: text("prize_pool"),
    entryFee: integer("entry_fee").default(0).notNull(), // in cents / local currency
    customFieldsSchema: jsonb("custom_fields_schema"), // JSON schema configurations
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    isStarted: boolean("is_started").default(false).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    // Приватный турнир не показывается в публичном каталоге — доступ только по
    // прямой ссылке (для AMATEUR и PRO). Организатор и админ видят его в каталоге.
    isPrivate: boolean("is_private").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    disciplineStartIdx: index("tournaments_discipline_start_idx").on(
      table.disciplineId,
      table.startDate
    ),
  })
);

// 6. Tournament Participants Table
export const tournamentParticipants = pgTable(
  "tournament_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id")
      .references(() => tournaments.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }), // null for Sandbox
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "restrict" }), // null for Sandbox
    nicknameSnapshot: text("nickname_snapshot").notNull(),
    teamSnapshot: text("team_snapshot"),
    status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] })
      .default("PENDING")
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    tournamentIdIdx: index("participants_tournament_id_idx").on(
      table.tournamentId
    ),
    userIdIdx: index("participants_user_id_idx").on(table.userId),
  })
);

// 7. Matches Table
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id")
      .references(() => tournaments.id, { onDelete: "cascade" })
      .notNull(),
    participant1Id: uuid("participant1_id").references(
      () => tournamentParticipants.id,
      { onDelete: "restrict" }
    ), // Null if waiting for previous round winner
    participant2Id: uuid("participant2_id").references(
      () => tournamentParticipants.id,
      { onDelete: "restrict" }
    ), // Null if waiting
    round: integer("round").notNull(),
    position: integer("position").notNull(), // index within the round
    // Секция сетки для визуализации double elimination:
    // winners | losers | grand_final | grand_final_reset. NULL для остальных форматов.
    bracketSection: text("bracket_section", {
      enum: ["winners", "losers", "grand_final", "grand_final_reset"],
    }),
    score1: integer("score1"),
    score2: integer("score2"),
    winnerId: uuid("winner_id").references(() => tournamentParticipants.id, {
      onDelete: "restrict",
    }),
    refereeId: uuid("referee_id").references(() => users.id, {
      onDelete: "set null",
    }), // null if referee deleted or sandbox creator
    isTechDefeat: boolean("is_tech_defeat").default(false).notNull(),
    customFieldsData: jsonb("custom_fields_data"), // actual fields matching schema
    nextMatchId: uuid("next_match_id"), // self-reference link
    nextMatchIsP1: boolean("next_match_is_p1"), // does winner go to participant1 (true) or participant2 (false) in next match?
    loserNextMatchId: uuid("loser_next_match_id"), // self-reference link for double elimination losers bracket
    loserNextMatchIsP1: boolean("loser_next_match_is_p1"), // does loser go to participant1 (true) or participant2 (false)?
    playedAt: timestamp("played_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tournamentIdIdx: index("matches_tournament_id_idx").on(table.tournamentId),
    playedAtIdx: index("matches_played_at_idx").on(table.playedAt),
  })
);

// 8. ELO History Table
export const eloHistory = pgTable(
  "elo_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    matchId: uuid("match_id")
      .references(() => matches.id, { onDelete: "cascade" })
      .notNull(),
    tournamentId: uuid("tournament_id")
      .references(() => tournaments.id, { onDelete: "cascade" })
      .notNull(),
    oldElo: integer("old_elo").notNull(),
    newElo: integer("new_elo").notNull(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => ({
    userRecordedIdx: index("elo_user_recorded_idx").on(
      table.userId,
      table.recordedAt
    ),
    tournamentIdIdx: index("elo_tournament_id_idx").on(table.tournamentId),
  })
);

// --- RELATIONS FOR ORM ---

export const usersRelations = relations(users, ({ many }) => ({
  captainOfTeams: many(teams),
  memberships: many(teamMembers),
  tournamentRegistrations: many(tournamentParticipants),
  refereedMatches: many(matches),
  eloRecords: many(eloHistory),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  captain: one(users, {
    fields: [teams.captainId],
    references: [users.id],
  }),
  members: many(teamMembers),
  tournamentRegistrations: many(tournamentParticipants),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  player: one(users, {
    fields: [teamMembers.playerId],
    references: [users.id],
  }),
}));

export const disciplinesRelations = relations(disciplines, ({ many }) => ({
  tournaments: many(tournaments),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  discipline: one(disciplines, {
    fields: [tournaments.disciplineId],
    references: [disciplines.id],
  }),
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id],
  }),
  participants: many(tournamentParticipants),
  matches: many(matches),
}));

export const tournamentParticipantsRelations = relations(
  tournamentParticipants,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [tournamentParticipants.tournamentId],
      references: [tournaments.id],
    }),
    user: one(users, {
      fields: [tournamentParticipants.userId],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [tournamentParticipants.teamId],
      references: [teams.id],
    }),
    matchesAsP1: many(matches, { relationName: "match_participant1" }),
    matchesAsP2: many(matches, { relationName: "match_participant2" }),
    wonMatches: many(matches, { relationName: "match_winner" }),
  })
);

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  participant1: one(tournamentParticipants, {
    fields: [matches.participant1Id],
    references: [tournamentParticipants.id],
    relationName: "match_participant1",
  }),
  participant2: one(tournamentParticipants, {
    fields: [matches.participant2Id],
    references: [tournamentParticipants.id],
    relationName: "match_participant2",
  }),
  winner: one(tournamentParticipants, {
    fields: [matches.winnerId],
    references: [tournamentParticipants.id],
    relationName: "match_winner",
  }),
  referee: one(users, {
    fields: [matches.refereeId],
    references: [users.id],
  }),
  nextMatch: one(matches, {
    fields: [matches.nextMatchId],
    references: [matches.id],
    relationName: "next_match_link",
  }),
  loserNextMatch: one(matches, {
    fields: [matches.loserNextMatchId],
    references: [matches.id],
    relationName: "loser_next_match_link",
  }),
  eloLogs: many(eloHistory),
}));

export const eloHistoryRelations = relations(eloHistory, ({ one }) => ({
  user: one(users, {
    fields: [eloHistory.userId],
    references: [users.id],
  }),
  match: one(matches, {
    fields: [eloHistory.matchId],
    references: [matches.id],
  }),
  tournament: one(tournaments, {
    fields: [eloHistory.tournamentId],
    references: [tournaments.id],
  }),
}));
