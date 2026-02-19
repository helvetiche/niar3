export type UserRole = "super-admin" | "admin" | "user";

export type AccountUser = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  disabled: boolean;
  permissions?: string[];
};

export type CreateAccountRequest = {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  permissions?: string[];
};

export type UpdateAccountRequest = {
  displayName?: string;
  role?: UserRole;
  disabled?: boolean;
  permissions?: string[];
};
