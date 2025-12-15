/**
 * Gets the storage key for attempt ID based on quiz and participant.
 * For compare flows, includes token in the key.
 */
export function getAttemptStorageKey(
  quizId: string,
  participantId: string,
  compareToken?: string | null
): string {
  if (compareToken) {
    return `afran_compare_attempt_${compareToken}_${participantId}`;
  }
  return `afran_attempt_${quizId}_${participantId}`;
}

