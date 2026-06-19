import { z } from "zod";

// User Schemas
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

// Team Schemas
export const CreateTeamInputSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(100),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInputSchema>;

export const AddTeamMemberInputSchema = z.object({
  nickname: z.string().min(2),
});
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberInputSchema>;

// Discipline Schemas
export const GameTypeSchema = z.enum(["SINGLE", "TEAM"]);
export type GameType = z.infer<typeof GameTypeSchema>;

export const CreateDisciplineInputSchema = z.object({
  name: z.string().min(2).max(100),
  gameType: GameTypeSchema,
  rules: z.string().optional(),
});
export type CreateDisciplineInput = z.infer<typeof CreateDisciplineInputSchema>;

// Custom Fields Schema configuration item
export const CustomFieldConfigSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9_]+$/, "Field name must be alphanumeric with underscores"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(["text", "number"]),
  required: z.boolean().default(false),
});
export type CustomFieldConfig = z.infer<typeof CustomFieldConfigSchema>;

export const CustomFieldsSchemaArray = z.array(CustomFieldConfigSchema);

// Tournament Schemas
export const TournamentTypeSchema = z.enum(["PRO", "AMATEUR", "SANDBOX"]);
export type TournamentType = z.infer<typeof TournamentTypeSchema>;

export const BracketTypeSchema = z.enum([
  "SINGLE_ELIM",
  "DOUBLE_ELIM",
  "ROUND_ROBIN",
  "SWISS",
]);
export type BracketType = z.infer<typeof BracketTypeSchema>;

export const CreateTournamentInputSchema = z.object({
  name: z.string().min(2).max(150),
  disciplineId: z.string().uuid("Invalid discipline ID"),
  tournamentType: TournamentTypeSchema,
  bracketType: BracketTypeSchema,
  prizePool: z.string().optional(),
  entryFee: z.number().int().nonnegative().default(0), // in cents / local currency
  customFieldsSchema: CustomFieldsSchemaArray.optional(),
  startDate: z.string().datetime("Invalid ISO date string"),
  endDate: z.string().datetime().optional(),
});
export type CreateTournamentInput = z.infer<typeof CreateTournamentInputSchema>;

export const JoinTournamentInputSchema = z.object({
  teamId: z.string().uuid().optional(), // only required for TEAM tournaments
  nicknameSnapshot: z.string().min(2).optional(), // snapshots of users
});
export type JoinTournamentInput = z.infer<typeof JoinTournamentInputSchema>;

// Match result input schema (validated dynamically by checking customFieldsData)
export const SubmitMatchScoreSchema = z.object({
  score1: z.number().int().nonnegative(),
  score2: z.number().int().nonnegative(),
  isTechDefeat: z.boolean().default(false),
  customFieldsData: z.record(z.any()).optional(), // validated dynamically
});
export type SubmitMatchScoreInput = z.infer<typeof SubmitMatchScoreSchema>;

// Dynamic validation builder function
export function buildDynamicZodSchema(fields: CustomFieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    let validator: z.ZodTypeAny =
      field.type === "number"
        ? z.coerce.number({ invalid_type_error: `${field.label} must be a number` })
        : z.string();
    if (!field.required) {
      validator = validator.optional();
    }
    shape[field.name] = validator;
  }
  return z.object(shape);
}
