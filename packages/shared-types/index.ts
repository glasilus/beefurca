import { z } from "zod";

// схемы пользователя
export const UserRoleSchema = z.enum(["Player", "Referee", "Organizer", "Admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RegisterInputSchema = z.object({
  nickname: z.string().min(2, "Nickname must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().max(150).optional(),
  phone: z.string().max(30).optional(),
  role: UserRoleSchema.default("Player"),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UpdateProfileInputSchema = z.object({
  nickname: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  fullName: z.string().max(150).optional(),
  phone: z.string().max(30).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

// схемы команды
export const CreateTeamInputSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInputSchema>;

export const AddTeamMemberInputSchema = z.object({
  nickname: z.string().min(2),
});
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberInputSchema>;

// схемы дисциплины
export const GameTypeSchema = z.enum(["SINGLE", "TEAM"]);
export type GameType = z.infer<typeof GameTypeSchema>;

export const CreateDisciplineInputSchema = z.object({
  name: z.string().min(2).max(100),
  gameType: GameTypeSchema,
  rules: z.string().optional(),
});
export type CreateDisciplineInput = z.infer<typeof CreateDisciplineInputSchema>;

// схемы турнира
// Два режима проведения (упрощённая версия):
//  STANDARD - участники зарегистрированы, влияет на ELO-рейтинг;
//  SANDBOX  - автономный учёт, имена вводятся текстом, ELO не затрагивается.
export const TournamentTypeSchema = z.enum(["STANDARD", "SANDBOX"]);
export type TournamentType = z.infer<typeof TournamentTypeSchema>;

// Две турнирные сетки: олимпийская (на вылет) и круговая (каждый с каждым).
export const BracketTypeSchema = z.enum(["SINGLE_ELIM", "ROUND_ROBIN"]);
export type BracketType = z.infer<typeof BracketTypeSchema>;

export const CreateTournamentInputSchema = z.object({
  name: z.string().min(2).max(150),
  disciplineId: z.string().uuid("Invalid discipline ID"),
  tournamentType: TournamentTypeSchema,
  bracketType: BracketTypeSchema,
  prizePool: z.string().optional(),
  entryFee: z.number().int().nonnegative().default(0), // in cents / local currency
  startDate: z.string().datetime("Invalid ISO date string"),
  endDate: z.string().datetime().optional(),
});
export type CreateTournamentInput = z.infer<typeof CreateTournamentInputSchema>;

export const JoinTournamentInputSchema = z.object({
  teamId: z.string().uuid().optional(), // only required for TEAM tournaments
  nicknameSnapshot: z.string().min(2).optional(), // snapshots of users
});
export type JoinTournamentInput = z.infer<typeof JoinTournamentInputSchema>;

// схема ввода результата матча
export const SubmitMatchScoreSchema = z.object({
  score1: z.number().int().nonnegative(),
  score2: z.number().int().nonnegative(),
  isTechDefeat: z.boolean().default(false),
});
export type SubmitMatchScoreInput = z.infer<typeof SubmitMatchScoreSchema>;
