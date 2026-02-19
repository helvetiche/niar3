export type UserRole = "super-admin" | "admin" | "user";

export type AccountUser = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  disabled: boolean;
};

export type CreateAccountRequest = {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
};

export type UpdateAccountRequest = {
  displayName?: string;
  role?: UserRole;
  disabled?: boolean;
};
