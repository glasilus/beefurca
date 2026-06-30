export interface Participant {
  id: string; // The tournamentParticipant ID
  name: string; // nicknameSnapshot or teamSnapshot
}

export interface GeneratedMatch {
  round: number;
  position: number;
  participant1Id: string | null;
  participant2Id: string | null;
  nextMatchIndex: number | null; // Index of the target match in the generated list
  nextMatchIsP1: boolean | null; // Is the winner participant 1 or participant 2 of the next match?
  // Если матч разрешён автоматически как BYE (соперника не будет) - здесь
  // указан id участника-победителя, прошедшего без игры. Используется бэкендом,
  // чтобы сразу проставить winnerId/playedAt и продвинуть игрока по сетке.
  winnerParticipantId?: string | null;
}
