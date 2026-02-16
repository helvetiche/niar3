export interface UserProfile {
  first: string
  middle: string
  last: string
  birthday: string
}

export const defaultProfile: UserProfile = {
  first: "",
  middle: "",
  last: "",
  birthday: "",
}
