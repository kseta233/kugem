export const getResultGrade = (accuracy: number): string => {
  if (accuracy >= 99) {
    return 'Perfect Cut'
  }

  if (accuracy >= 95) {
    return 'Samurai Level'
  }

  if (accuracy >= 90) {
    return 'Great Cut'
  }

  if (accuracy >= 80) {
    return 'Just some noob-rai'
  }

  return 'You are a disgrace to the samurai code'
}
