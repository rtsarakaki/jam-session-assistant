export type RegisterFormState = {
  error: string | null;
  success: boolean;
  needsEmailConfirmation: boolean;
};

export const registerInitialState: RegisterFormState = {
  error: null,
  success: false,
  needsEmailConfirmation: false,
};
