export type RoleId =
  | 'homeroom'
  | 'scheduler'
  | 'korean'
  | 'math'
  | 'english'
  | 'social'
  | 'science'
  | 'career'
  | 'diary'

declare module 'claude-code' {
  interface PluginState {
    'studyroom-board': { role: string; rev: number }
  }
}
